const API_BASE = 'https://ai-meeting-notes-generator.onrender.com';

const audioInput       = document.getElementById('audioInput');
const uploadZone       = document.getElementById('uploadZone');
const filePreview      = document.getElementById('filePreview');
const fileName         = document.getElementById('fileName');
const fileSize         = document.getElementById('fileSize');
const audioPlayer      = document.getElementById('audioPlayer');
const removeFileBtn    = document.getElementById('removeFile');
const generateBtn      = document.getElementById('generateBtn');
const uploadCard       = document.getElementById('uploadCard');
const loadingCard      = document.getElementById('loadingCard');
const resultsEl        = document.getElementById('results');
const errorCard        = document.getElementById('errorCard');
const errorMessage     = document.getElementById('errorMessage');
const retryBtn         = document.getElementById('retryBtn');
const newMeetingBtn    = document.getElementById('newMeetingBtn');
const copyBtn          = document.getElementById('copyBtn');
const downloadTxtBtn   = document.getElementById('downloadTxtBtn');
const downloadPdfBtn   = document.getElementById('downloadPdfBtn');
const transcriptToggle = document.getElementById('transcriptToggle');
const transcriptBody   = document.getElementById('transcriptBody');
const meetingTitle     = document.getElementById('meetingTitle');
const meetingDate      = document.getElementById('meetingDate');
const toast            = document.getElementById('toast');
const historyBtn       = document.getElementById('historyBtn');
const historyCount     = document.getElementById('historyCount');
const mobileHistoryBtn = document.getElementById('mobileHistoryBtn');
const mobileHistoryCount = document.getElementById('mobileHistoryCount');
const mobileNewBtn     = document.getElementById('mobileNewBtn');
const sidebar          = document.getElementById('sidebar');
const sidebarOverlay   = document.getElementById('sidebarOverlay');
const sidebarClose     = document.getElementById('sidebarClose');
const historyList      = document.getElementById('historyList');
const clearAllBtn      = document.getElementById('clearAllBtn');

let selectedFile = null;
let notesData    = null;

meetingDate.value = new Date().toISOString().split('T')[0];

// ── File handling ─────────────────────────────────────────
audioInput.addEventListener('change', e => { if (e.target.files[0]) handleFile(e.target.files[0]); });
uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
uploadZone.addEventListener('drop', e => {
  e.preventDefault(); uploadZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file && /\.(mp3|wav)$/i.test(file.name)) handleFile(file);
  else showToast('Please drop an MP3 or WAV file');
});

function handleFile(file) {
  if (file.size > 25 * 1024 * 1024) { showToast('File too large. Max 25MB.'); return; }
  selectedFile = file;
  fileName.textContent = file.name;
  fileSize.textContent = formatBytes(file.size) + ' · Ready to process';
  audioPlayer.src = URL.createObjectURL(file);
  uploadZone.style.display = 'none';
  filePreview.style.display = 'flex';
  generateBtn.disabled = false;
}

removeFileBtn.addEventListener('click', () => {
  selectedFile = null; audioInput.value = '';
  audioPlayer.src = '';
  uploadZone.style.display = 'block';
  filePreview.style.display = 'none';
  generateBtn.disabled = true;
});

// ── Generate ──────────────────────────────────────────────
generateBtn.addEventListener('click', async () => {
  if (!selectedFile) return;
  showSection('loading');
  await runLoadingSteps();

  const formData = new FormData();
  formData.append('audio', selectedFile);
  formData.append('title', meetingTitle.value || 'Team Meeting');
  formData.append('date', meetingDate.value || new Date().toISOString().split('T')[0]);
  formData.append('language', document.getElementById('meetingLanguage').value);
  formData.append('notesLanguage', document.getElementById('notesLanguage').value);

  try {
    const response = await fetch(`${API_BASE}/upload`, { method: 'POST', body: formData });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Server error' }));
      throw new Error(err.error || `HTTP ${response.status}`);
    }
    const data = await response.json();
    notesData = data;
    saveMeeting(data);
    renderResults(data);
    showSection('results');
  } catch (err) {
    errorMessage.textContent = err.message || 'Something went wrong.';
    showSection('error');
  }
});

// ── Loading steps ─────────────────────────────────────────
const stepIds = ['step1','step2','step3','step4'];

async function runLoadingSteps() {
  stepIds.forEach(id => {
    const el = document.getElementById(id);
    el.classList.remove('active','done');
    el.querySelector('.step-dot').className = 'step-dot';
  });
  for (let i = 0; i < stepIds.length - 1; i++) {
    const el = document.getElementById(stepIds[i]);
    el.classList.add('active');
    el.querySelector('.step-dot').classList.add('active');
    await delay([800, 2000, 3000][i]);
    el.classList.remove('active'); el.classList.add('done');
    el.querySelector('.step-dot').classList.remove('active');
    el.querySelector('.step-dot').classList.add('done');
  }
  const last = document.getElementById(stepIds[stepIds.length - 1]);
  last.classList.add('active');
  last.querySelector('.step-dot').classList.add('active');
}

function finishLastStep() {
  const last = document.getElementById(stepIds[stepIds.length - 1]);
  last.classList.remove('active'); last.classList.add('done');
  last.querySelector('.step-dot').classList.remove('active');
  last.querySelector('.step-dot').classList.add('done');
}

// ── Render results ────────────────────────────────────────
function renderResults(data) {
  finishLastStep();
  document.getElementById('resultTitle').textContent = data.title || meetingTitle.value || 'Meeting Notes';
  const d = (data.date) ? new Date(data.date + 'T00:00:00') : new Date();
  document.getElementById('resultDate').textContent = d.toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

  if (data.transcript) {
    document.getElementById('transcriptText').textContent = data.transcript;
    document.getElementById('transcriptToggle').style.display = 'flex';
  }

  document.getElementById('summaryText').textContent = data.summary || 'No summary available.';

  const kpList = document.getElementById('keyPointsList');
  kpList.innerHTML = '';
  (data.key_points || []).forEach((point, i) => {
    const li = document.createElement('li');
    li.style.animationDelay = `${i * 0.06}s`;
    li.style.animation = 'revealCard 0.35s ease both';
    li.textContent = point;
    kpList.appendChild(li);
  });

  const aiList = document.getElementById('actionItemsList');
  aiList.innerHTML = '';
  (data.action_items || []).forEach((item, i) => {
    const li = document.createElement('li');
    li.style.animationDelay = `${i * 0.06}s`;
    li.style.animation = 'revealCard 0.35s ease both';
    const span = document.createElement('span');
    span.textContent = item;
    li.appendChild(span);
    li.addEventListener('click', () => li.classList.toggle('checked'));
    aiList.appendChild(li);
  });
}

// ── Transcript toggle ─────────────────────────────────────
transcriptToggle.addEventListener('click', () => {
  const collapsed = transcriptBody.classList.contains('collapsed');
  transcriptBody.classList.toggle('collapsed', !collapsed);
  transcriptToggle.querySelector('.toggle-icon').classList.toggle('open', collapsed);
});

// ── Copy ──────────────────────────────────────────────────
copyBtn.addEventListener('click', () => {
  if (!notesData) return;
  navigator.clipboard.writeText(formatNotesText(notesData)).then(() => showToast('Notes copied to clipboard'));
});

// ── Download TXT ──────────────────────────────────────────
downloadTxtBtn.addEventListener('click', () => {
  if (!notesData) return;
  downloadBlob(new Blob([formatNotesText(notesData)], { type:'text/plain' }), `meeting-notes-${Date.now()}.txt`);
});

// ── Download PDF ──────────────────────────────────────────
downloadPdfBtn.addEventListener('click', () => { if (notesData) generatePDF(notesData); });

function generatePDF(data) {
  const title   = data.title || 'Meeting Notes';
  const dateStr = data.date ? new Date(data.date+'T00:00:00').toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'}) : new Date().toLocaleDateString();
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:'Segoe UI',Arial,sans-serif;max-width:700px;margin:40px auto;padding:0 32px;color:#1a1a2e}h1{font-size:2em;margin-bottom:4px}.date{color:#888;font-size:.9em;margin-bottom:32px}h2{font-size:1em;text-transform:uppercase;letter-spacing:.1em;color:#3b82f6;margin:28px 0 10px;border-bottom:2px solid #eff6ff;padding-bottom:6px}p{line-height:1.7}ul{padding-left:20px}li{margin-bottom:6px;line-height:1.6}.footer{margin-top:48px;font-size:.8em;color:#bbb;border-top:1px solid #eee;padding-top:16px}</style></head><body><h1>${title}</h1><p class="date">${dateStr}</p><h2>Meeting Summary</h2><p>${data.summary||'N/A'}</p><h2>Key Discussion Points</h2><ul>${(data.key_points||[]).map(k=>`<li>${k}</li>`).join('')}</ul><h2>Action Items</h2><ul>${(data.action_items||[]).map(a=>`<li>${a}</li>`).join('')}</ul>${data.transcript?`<h2>Full Transcript</h2><p style="font-size:.85em;color:#555">${data.transcript}</p>`:''}<p class="footer">Generated by MeetingAI</p></body></html>`;
  const win = window.open('','_blank');
  win.document.write(html); win.document.close(); win.focus();
  setTimeout(() => { win.print(); win.close(); }, 600);
}

// ── Reset ─────────────────────────────────────────────────
newMeetingBtn.addEventListener('click', resetUI);
retryBtn.addEventListener('click', resetUI);
mobileNewBtn.addEventListener('click', resetUI);

function resetUI() {
  selectedFile = null; notesData = null;
  audioInput.value = ''; audioPlayer.src = '';
  uploadZone.style.display = 'block';
  filePreview.style.display = 'none';
  generateBtn.disabled = true;
  meetingTitle.value = '';
  meetingDate.value = new Date().toISOString().split('T')[0];
  showSection('upload');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showSection(name) {
  uploadCard.style.display  = name === 'upload'  ? 'flex'  : 'none';
  loadingCard.style.display = name === 'loading' ? 'block' : 'none';
  resultsEl.style.display   = name === 'results' ? 'flex'  : 'none';
  errorCard.style.display   = name === 'error'   ? 'block' : 'none';
}

// ── History ───────────────────────────────────────────────
const STORAGE_KEY = 'meetingHistory_v2';

function saveMeeting(data) {
  const history = getHistory();
  history.unshift({ id:Date.now(), title:data.title||'Untitled Meeting', date:data.date||new Date().toISOString().split('T')[0], summary:data.summary, key_points:data.key_points, action_items:data.action_items, transcript:data.transcript, savedAt:new Date().toISOString() });
  if (history.length > 50) history.pop();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  renderHistory();
  showToast('Meeting saved to history');
}

function getHistory() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}

function deleteEntry(id) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(getHistory().filter(e => e.id !== id)));
  renderHistory();
  showToast('Meeting removed');
}

function clearAll() {
  if (!confirm('Delete all meeting history?')) return;
  localStorage.removeItem(STORAGE_KEY);
  renderHistory();
  showToast('History cleared');
}

function renderHistory() {
  const history = getHistory();
  const count = history.length;

  [historyCount, mobileHistoryCount].forEach(el => {
    el.textContent = count;
    el.style.display = count > 0 ? 'inline-flex' : 'none';
  });

  if (count === 0) {
    historyList.innerHTML = `<div class="sidebar-empty"><div class="empty-icon">🗂️</div><p>No meetings saved yet</p><span>Generate your first notes to see them here</span></div>`;
    return;
  }

  historyList.innerHTML = '';
  history.forEach(entry => {
    const item = document.createElement('div');
    item.className = 'history-item';
    const d = new Date(entry.date + 'T00:00:00');
    const dateStr = d.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
    item.innerHTML = `
      <div class="history-item-main">
        <div class="history-item-row">
          <div>
            <p class="history-item-title">${entry.title}</p>
            <p class="history-item-date">${dateStr}</p>
          </div>
          <button class="history-delete" title="Delete">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
          </button>
        </div>
        <p class="history-item-preview">${entry.summary ? entry.summary.slice(0,100)+'...' : 'No summary'}</p>
        <div class="history-item-meta">
          <span class="history-tag">💡 ${(entry.key_points||[]).length} points</span>
          <span class="history-tag">✅ ${(entry.action_items||[]).length} actions</span>
        </div>
      </div>`;
    item.querySelector('.history-item-main').addEventListener('click', e => {
      if (e.target.closest('.history-delete')) return;
      notesData = entry;
      meetingTitle.value = entry.title;
      meetingDate.value  = entry.date;
      renderResults(entry);
      showSection('results');
      closeSidebar();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    item.querySelector('.history-delete').addEventListener('click', e => {
      e.stopPropagation();
      deleteEntry(entry.id);
    });
    historyList.appendChild(item);
  });
}

// ── Sidebar ───────────────────────────────────────────────
[historyBtn, mobileHistoryBtn].forEach(btn => btn.addEventListener('click', openSidebar));
sidebarClose.addEventListener('click', closeSidebar);
sidebarOverlay.addEventListener('click', closeSidebar);
clearAllBtn.addEventListener('click', clearAll);

function openSidebar()  { sidebar.classList.add('open');    sidebarOverlay.classList.add('show'); }
function closeSidebar() { sidebar.classList.remove('open'); sidebarOverlay.classList.remove('show'); }

// ── Toast ─────────────────────────────────────────────────
let toastTimeout;
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 2500);
}

// ── Helpers ───────────────────────────────────────────────
function formatBytes(b) { if(b<1024)return b+' B'; if(b<1048576)return (b/1024).toFixed(1)+' KB'; return (b/1048576).toFixed(1)+' MB'; }
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }
function downloadBlob(blob, filename) { const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=filename; a.click(); URL.revokeObjectURL(a.href); }
function formatNotesText(data) {
  const kp=(data.key_points||[]).map((k,i)=>`  ${i+1}. ${k}`).join('\n');
  const ai=(data.action_items||[]).map((a,i)=>`  ${i+1}. ${a}`).join('\n');
  return [`${data.title||'Meeting Notes'}`,`Date: ${data.date||''}`,`${'─'.repeat(50)}`,'','MEETING SUMMARY',data.summary||'N/A','','KEY DISCUSSION POINTS',kp||'  None','','ACTION ITEMS',ai||'  None',data.transcript?`\nFULL TRANSCRIPT\n${data.transcript}`:'','','─ Generated by MeetingAI'].join('\n');
}

// ── Init ──────────────────────────────────────────────────
renderHistory();