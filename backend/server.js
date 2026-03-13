require('dotenv').config();
const express      = require('express');
const cors         = require('cors');
const multer       = require('multer');
const fs           = require('fs');
const path         = require('path');
const helmet       = require('helmet');
const rateLimit    = require('express-rate-limit');
const morgan       = require('morgan');
const Groq         = require('groq-sdk');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Lazy Groq initialization (fixes Render env var issue) ─
let _groq;
function getGroq() {
  if (!_groq) {
    if (!process.env.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY environment variable is missing.');
    }
    _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return _groq;
}

// ── Logger ────────────────────────────────────────────────
morgan.token('timestamp', () => new Date().toISOString());
const logFormat = '[:timestamp] :method :url :status :response-time ms - :res[content-length]';
app.use(morgan(logFormat));

// ── Security: Helmet ──────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// ── Security: CORS ────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '*').split(',');

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes('*')) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: Origin ${origin} not allowed`));
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '1mb' }));

// ── Security: Rate Limiting ───────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { error: 'Upload limit reached. Maximum 20 uploads per hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(globalLimiter);

// ── File Upload: Multer ───────────────────────────────────
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ['audio/mpeg','audio/wav','audio/x-wav','audio/mp3','audio/mp4','audio/ogg','audio/webm'];
    const allowedExts  = /\.(mp3|wav|mp4|m4a|ogg|webm|flac)$/i;
    const ok = allowedMimes.includes(file.mimetype) || allowedExts.test(file.originalname);
    cb(ok ? null : new Error('Unsupported audio format. Use MP3 or WAV.'), ok);
  },
});

// ── Input Validation ──────────────────────────────────────
function validateInput(title, date, language) {
  const errors = [];
  if (title && title.length > 200)
    errors.push('Meeting title must be under 200 characters.');
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date))
    errors.push('Invalid date format. Use YYYY-MM-DD.');
  const validLangs = ['auto','en','ar','hi','fr','es','de','zh','ja','ko','pt','ru','it','tr','ml','ta','te','ur'];
  if (language && !validLangs.includes(language))
    errors.push('Invalid language code.');
  return errors;
}

// ═══════════════════════════════════════════════════════════
//  POST /upload
// ═══════════════════════════════════════════════════════════
app.post('/upload', uploadLimiter, upload.single('audio'), async (req, res) => {
  const tmpPath   = req.file?.path;
  let   namedPath = null;
  const startTime = Date.now();

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded.' });
    }

    const meetingTitle  = (req.body.title  || 'Team Meeting').trim().slice(0, 200);
    const meetingDate   = req.body.date    || new Date().toISOString().split('T')[0];
    const audioLanguage = req.body.language      || 'auto';
    const notesLanguage = req.body.notesLanguage || 'same';

    // Validate inputs
    const validationErrors = validateInput(meetingTitle, meetingDate, audioLanguage);
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: validationErrors.join(' ') });
    }

    // Rename temp file with correct extension
    const ext  = path.extname(req.file.originalname) || '.mp3';
    namedPath  = tmpPath + ext;
    fs.renameSync(tmpPath, namedPath);

    // ── Step 1: Transcribe ────────────────────────────────
    console.log(`[TRANSCRIBE] Starting: ${req.file.originalname} (${(req.file.size/1024/1024).toFixed(2)} MB)`);

    const transcriptionOptions = {
      file:            fs.createReadStream(namedPath),
      model:           'whisper-large-v3-turbo',
      response_format: 'json',
    };
    if (audioLanguage !== 'auto') transcriptionOptions.language = audioLanguage;

    const transcription = await getGroq().audio.transcriptions.create(transcriptionOptions);
    const transcript    = transcription.text.trim();
    console.log(`[TRANSCRIBE] Done. ${transcript.length} chars in ${Date.now()-startTime}ms`);

    // ── Step 2: Generate Notes ────────────────────────────
    console.log(`[AI] Generating notes...`);

    const languageInstruction = notesLanguage !== 'same'
      ? `IMPORTANT: Generate the summary, key_points, and action_items in ${notesLanguage} language.`
      : 'Generate notes in the same language as the transcript.';

    const chat = await getGroq().chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are an expert meeting analyst. Respond ONLY with a valid JSON object — no markdown, no code fences, no explanation.',
        },
        {
          role: 'user',
          content: `Meeting title: ${meetingTitle}
Meeting date: ${meetingDate}

Transcript:
"""
${transcript}
"""

Return JSON with keys:
- summary: 2-4 sentence overview
- key_points: array of 4-8 strings
- action_items: array of strings (format: Person — Task by Deadline)

${languageInstruction}

Return ONLY the JSON object.`,
        },
      ],
      temperature: 0.3,
      max_tokens:  1024,
    });

    const rawText = chat.choices[0]?.message?.content || '{}';
    let notes;
    try {
      notes = JSON.parse(rawText.replace(/```json|```/g, '').trim());
    } catch {
      notes = {
        summary:      'Could not parse AI response. Please review the transcript.',
        key_points:   ['See transcript for details.'],
        action_items: ['Review transcript and assign action items manually.'],
      };
    }

    const totalTime = Date.now() - startTime;
    console.log(`[AI] Done. Total: ${totalTime}ms`);

    return res.json({
      transcript,
      summary:      notes.summary      || '',
      key_points:   Array.isArray(notes.key_points)   ? notes.key_points   : [],
      action_items: Array.isArray(notes.action_items) ? notes.action_items : [],
      title:        meetingTitle,
      date:         meetingDate,
      processingMs: totalTime,
    });

  } catch (err) {
    console.error(`[ERROR] ${err.message}`);

    if (err.message.includes('rate_limit'))
      return res.status(429).json({ error: 'AI rate limit reached. Please wait a few minutes and try again.' });
    if (err.message.includes('ENOENT'))
      return res.status(500).json({ error: 'File processing error. Please try again.' });

    return res.status(500).json({ error: err.message || 'Internal server error.' });

  } finally {
    if (namedPath) fs.unlink(namedPath, () => {});
    else if (tmpPath) fs.unlink(tmpPath, () => {});
  }
});

// ═══════════════════════════════════════════════════════════
//  GET /health
// ═══════════════════════════════════════════════════════════
app.get('/health', (_req, res) => {
  res.json({
    status:    'ok',
    timestamp: new Date().toISOString(),
    uptime:    Math.floor(process.uptime()),
    env:       process.env.NODE_ENV || 'development',
    groq:      !!process.env.GROQ_API_KEY,
  });
});

// ── 404 Handler ───────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

// ── Global Error Handler ──────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(`[UNHANDLED] ${err.message}`);
  res.status(500).json({ error: 'An unexpected error occurred.' });
});

// ── Start ─────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀  MeetingAI backend running on http://localhost:${PORT}`);
  console.log(`   NODE_ENV      : ${process.env.NODE_ENV || 'development'}`);
  console.log(`   GROQ_API_KEY  : ${process.env.GROQ_API_KEY ? '✅ set' : '❌ missing'}`);
  console.log(`   ALLOWED_ORIGINS: ${process.env.ALLOWED_ORIGINS || '* (all)'}\n`);
});