import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { google } from 'googleapis';

const app = express();
const PORT = 3001;
const __dir = dirname(fileURLToPath(import.meta.url));

let API_KEY = "";
let gmailRefreshToken = null;

function loadConfig() {
  try {
    const config = JSON.parse(readFileSync(join(__dir, 'config.json'), 'utf8'));
    API_KEY = config.anthropicKey || "";
    gmailRefreshToken = config.gmailRefreshToken || null;
  } catch(e) {
    console.log("No config.json found.");
  }
}

function saveConfig(updates) {
  let current = {};
  try { current = JSON.parse(readFileSync(join(__dir, 'config.json'), 'utf8')); } catch(e) {}
  writeFileSync(join(__dir, 'config.json'), JSON.stringify({ ...current, ...updates }, null, 2));
}

loadConfig();

let gmailCreds = null;
try {
  gmailCreds = JSON.parse(readFileSync(join(__dir, 'credentials.json.json'), 'utf8')).web;
  console.log("✓  Gmail credentials loaded");
} catch(e) {
  console.log("⚠  No credentials.json.json found — Gmail features disabled");
}

function makeOAuth2Client() {
  if (!gmailCreds) return null;
  return new google.auth.OAuth2(
    gmailCreds.client_id,
    gmailCreds.client_secret,
    gmailCreds.redirect_uris[0]
  );
}

app.use(cors({ origin: ["http://localhost:5173","http://localhost:5174"] }));
app.use(express.json({ limit: "50mb" }));

app.get('/api/health', (req, res) => {
  res.json({ status: "ok", keyLoaded: API_KEY.length > 0 });
});

app.post('/api/claude', async (req, res) => {
  if (!API_KEY) return res.status(500).json({ error: "No API key in config.json" });
  res.setTimeout(610000);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 600000);
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify(req.body),
      signal: controller.signal
    });
    const data = await response.json();
    res.json(data);
  } catch(err) {
    res.status(500).json({ error: err.message });
  } finally {
    clearTimeout(timer);
  }
});

// --- Gmail OAuth ---

app.get('/api/gmail/auth', (req, res) => {
  const oauth2 = makeOAuth2Client();
  if (!oauth2) return res.status(500).send('Gmail credentials not configured');
  const url = oauth2.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/gmail.readonly'],
    prompt: 'consent',
  });
  res.redirect(url);
});

app.get('/api/gmail/callback', async (req, res) => {
  const { code, error } = req.query;
  if (error) return res.status(400).send(htmlPage('Auth Error', `<p style="color:#e74c3c">Error: ${error}</p>`));
  const oauth2 = makeOAuth2Client();
  if (!oauth2) return res.status(500).send(htmlPage('Error', '<p>Gmail credentials not configured</p>'));
  try {
    const { tokens } = await oauth2.getToken(code);
    if (tokens.refresh_token) {
      gmailRefreshToken = tokens.refresh_token;
      saveConfig({ gmailRefreshToken: tokens.refresh_token });
    } else if (!gmailRefreshToken) {
      return res.status(400).send(htmlPage('No Refresh Token',
        '<p>Google did not return a refresh token. Revoke TruPlans access in your Google Account security settings, then try connecting again.</p>'
      ));
    }
    res.send(htmlPage('Gmail Connected',
      '<p style="color:#52d68a;font-size:18px;font-weight:700">Gmail connected!</p><p>You can close this window and click Refresh in the TruPlans Inbox tab.</p>'
    ));
  } catch(err) {
    res.status(500).send(htmlPage('Error', `<p style="color:#e74c3c">${err.message}</p>`));
  }
});

app.get('/api/gmail/status', (req, res) => {
  res.json({ connected: !!gmailRefreshToken });
});

app.get('/api/gmail/list', async (req, res) => {
  if (!gmailRefreshToken) return res.status(401).json({ error: 'Not connected' });
  const oauth2 = makeOAuth2Client();
  if (!oauth2) return res.status(500).json({ error: 'Gmail credentials not configured' });
  oauth2.setCredentials({ refresh_token: gmailRefreshToken });
  try {
    const gmail = google.gmail({ version: 'v1', auth: oauth2 });
    const listRes = await gmail.users.threads.list({ userId: 'me', maxResults: 20 });
    const threads = listRes.data.threads || [];
    const detailed = await Promise.all(threads.map(async t => {
      const thread = await gmail.users.threads.get({
        userId: 'me', id: t.id, format: 'metadata',
        metadataHeaders: ['From', 'Subject', 'Date'],
      });
      const msg = thread.data.messages?.[0];
      const headers = msg?.payload?.headers || [];
      const h = name => headers.find(hdr => hdr.name === name)?.value || '';
      return { id: t.id, from: h('From'), subject: h('Subject') || '(no subject)', snippet: thread.data.snippet || '', date: h('Date') };
    }));
    res.json(detailed);
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/gmail/thread/:id', async (req, res) => {
  if (!gmailRefreshToken) return res.status(401).json({ error: 'Not connected' });
  const oauth2 = makeOAuth2Client();
  if (!oauth2) return res.status(500).json({ error: 'Gmail credentials not configured' });
  oauth2.setCredentials({ refresh_token: gmailRefreshToken });
  try {
    const gmail = google.gmail({ version: 'v1', auth: oauth2 });
    const thread = await gmail.users.threads.get({ userId: 'me', id: req.params.id, format: 'full' });
    const msg = thread.data.messages?.[thread.data.messages.length - 1];
    const headers = msg?.payload?.headers || [];
    const h = name => headers.find(hdr => hdr.name === name)?.value || '';

    function extractBody(payload) {
      if (!payload) return { html: '', text: '' };
      if (payload.mimeType === 'text/html' && payload.body?.data)
        return { html: Buffer.from(payload.body.data, 'base64').toString('utf8'), text: '' };
      if (payload.mimeType === 'text/plain' && payload.body?.data)
        return { html: '', text: Buffer.from(payload.body.data, 'base64').toString('utf8') };
      if (payload.parts) {
        let html = '', text = '';
        for (const part of payload.parts) {
          const r = extractBody(part);
          if (r.html) html = r.html;
          if (r.text) text = r.text;
        }
        return { html, text };
      }
      return { html: '', text: '' };
    }

    const { html, text } = extractBody(msg?.payload);
    res.json({ from: h('From'), subject: h('Subject') || '(no subject)', date: h('Date'), bodyHtml: html, bodyText: text });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

function htmlPage(title, body) {
  return `<!DOCTYPE html><html><head><title>${title}</title></head><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#1a1a2e;color:#f0f0f0"><div style="text-align:center;max-width:480px;padding:32px"><h2>${title}</h2>${body}</div></body></html>`;
}

app.listen(PORT, () => {
  console.log(`\n🚀 TruPlans API proxy running on http://localhost:${PORT}`);
  console.log(API_KEY ? "✓  API key loaded" : "⚠  No API key — add to config.json");
  console.log(gmailRefreshToken ? "✓  Gmail token present" : "ℹ  Gmail not yet connected");
  console.log(`\nDashboard: http://localhost:5173\n`);
});
