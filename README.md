# 🎙️ AI Meeting Notes Generator

> **Upload a meeting audio file → get a clean summary, key points, and action items in seconds.**

Powered by **OpenAI Whisper** (speech-to-text) and **Anthropic Claude** (AI analysis).

---

live link :https://ai-meeting-notes-generator.vercel.app

## ✨ Features

| Feature | Details |
|---|---|
| 🎧 Audio Upload | Drag & drop or browse — MP3 / WAV, up to 25 MB |
| 🗣️ Auto Transcription | OpenAI Whisper converts speech to text |
| 🤖 AI Analysis | Claude generates summary, key points, action items |
| 📋 One-click Copy | Copy all notes to clipboard |
| 📄 Download TXT | Save notes as a plain-text file |
| 🖨️ Download PDF | Print-ready PDF via browser |
| 📱 Responsive | Works on mobile and desktop |
| ✅ Interactive Actions | Click action items to mark them done |

---

## 🛠️ Tech Stack

**Frontend**
- HTML5, CSS3 (custom properties, CSS animations)
- Vanilla JavaScript (Fetch API, FileReader)
- Fonts: Syne + DM Sans (Google Fonts)

**Backend**
- Node.js 18+
- Express 4
- Multer (file uploads)
- node-fetch (HTTP requests)

**AI / APIs**
- [OpenAI Whisper API](https://platform.openai.com/docs/guides/speech-to-text) — speech-to-text
- [Anthropic Claude API](https://docs.anthropic.com) — meeting analysis

---

## 📂 Project Structure

```
ai-meeting-notes-generator/
├── frontend/
│   ├── index.html     # Main UI
│   ├── style.css      # Dark-theme design system
│   └── script.js      # Upload, API calls, rendering
│
├── backend/
│   ├── server.js      # Express API server
│   ├── package.json   # Node dependencies
│   └── .env.example   # Environment variable template
│
└── README.md
```

---

---

## 🌐 Deployment

### Frontend → Vercel

1. Push your repo to GitHub
2. Go to [vercel.com](https://vercel.com) → **New Project** → import your repo
3. Set **Root Directory** to `frontend`
4. Set **Framework Preset** to `Other`
5. Click **Deploy**

After deployment, update the `API_BASE` constant in `frontend/script.js` to your backend URL:
```js
const API_BASE = 'https://your-backend.onrender.com';
```

### Backend → Render

1. Go to [render.com](https://render.com) → **New Web Service**
2. Connect your GitHub repo
3. Set:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
4. Add Environment Variables under **Environment**:
   - `ANTHROPIC_API_KEY`
   - `OPENAI_API_KEY`
5. Click **Create Web Service**

### Backend → Railway

1. Go to [railway.app](https://railway.app) → **New Project** → Deploy from GitHub
2. Select your repo → click **Deploy Now**
3. Navigate to **Variables** and add:
   - `ANTHROPIC_API_KEY`
   - `OPENAI_API_KEY`
4. Railway will auto-detect Node.js and start the server

---

## 🔌 API Reference

### `POST /upload`

Accepts a multipart form upload and returns structured meeting notes.

**Request (multipart/form-data)**

| Field | Type   | Required | Description |
|-------|--------|----------|-------------|
| audio | File   | ✅       | MP3 or WAV, max 25 MB |
| title | string | ❌       | Meeting title (default: "Team Meeting") |
| date  | string | ❌       | ISO date YYYY-MM-DD |

**Response (JSON)**

```json
{
  "transcript":    "Full meeting transcript text...",
  "summary":       "The team discussed the new product launch timeline.",
  "key_points": [
    "Marketing campaign starts next week",
    "Development team will finish testing by Friday"
  ],
  "action_items": [
    "Arun — Finalize UI design by Friday",
    "Rahul — Prepare marketing materials"
  ],
  "title": "Q3 Product Review",
  "date":  "2024-11-15"
}
```

### `GET /health`

Returns server status.

---

## ⚙️ Configuration

| Variable           | Required | Description |
|--------------------|----------|-------------|
| `ANTHROPIC_API_KEY`| ✅       | Claude API key |
| `OPENAI_API_KEY`   | ✅       | Whisper (speech-to-text) |
| `PORT`             | ❌       | Server port, default `3001` |

---

## 📝 License

MIT © 2024 — Free to use and modify.
