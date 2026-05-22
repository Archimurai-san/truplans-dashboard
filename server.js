import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

const app = express();
const PORT = 3001;
const __dir = dirname(fileURLToPath(import.meta.url));

let API_KEY = "";
let gmailRefreshToken = null;
let supabase = null;

function loadConfig() {
  try {
    const config = JSON.parse(readFileSync(join(__dir, 'config.json'), 'utf8'));
    API_KEY = config.anthropicKey || "";
    gmailRefreshToken = config.gmailRefreshToken || null;
    if (config.supabaseUrl && config.supabaseAnonKey) {
      supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);
      console.log("✓  Supabase client initialised — URL:", config.supabaseUrl);
    } else {
      console.log("ℹ  Supabase not configured — supabaseUrl:", config.supabaseUrl, "supabaseAnonKey:", config.supabaseAnonKey ? "present" : "MISSING");
    }
  } catch(e) {
    console.log("No config.json found.");
  }
}

function toDb(p) {
  return {
    id:            String(p.id),
    name:          p.name          || null,
    client:        p.client        || null,
    designer:      p.designer      || null,
    type:          p.type          || null,
    status:        p.status        || 'In Progress',
    phase:         p.phase         || null,
    city:          p.city          || null,
    contract:      Number(p.contract)  || 0,
    invoiced:      Number(p.invoiced)  || 0,
    pct:           Number(p.pct)       || 0,
    stamp:         p.stamp         || null,
    permit:        p.permit        || null,
    start_date:    p.start         || p.startDate || null,
    end_date:      p.end           || p.targetDate || null,
    notes:         p.notes         || null,
    scope_of_work: p.scopeOfWork   || [],
    workflow:      p.workflow       || [],
  };
}

function fromDb(row) {
  return {
    id:           row.id,
    name:         row.name         || '',
    client:       row.client       || '',
    designer:     row.designer     || '',
    type:         row.type         || '',
    status:       row.status       || 'In Progress',
    phase:        row.phase        || '',
    city:         row.city         || '',
    contract:     Number(row.contract)  || 0,
    invoiced:     Number(row.invoiced)  || 0,
    pct:          Number(row.pct)       || 0,
    stamp:        row.stamp        || '',
    permit:       row.permit       || '',
    start:        row.start_date   || null,
    end:          row.end_date     || null,
    notes:        row.notes        || '',
    scopeOfWork:  row.scope_of_work || [],
    workflow:     row.workflow      || [],
    team:         [],
    contracts:    [],
  };
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

// --- Supabase ---

app.get('/api/supabase/projects', async (req, res) => {
  console.log('[supabase] GET /api/supabase/projects — client ready:', !!supabase);
  if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });
  try {
    const { data, error } = await supabase.from('projects').select('*');
    if (error) {
      console.error('[supabase] SELECT error:', error.message, error.details);
      return res.status(500).json({ error: error.message });
    }
    console.log('[supabase] SELECT ok — rows returned:', data.length);
    res.json(data.map(fromDb));
  } catch(err) {
    console.error('[supabase] GET exception:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/supabase/projects', async (req, res) => {
  console.log('[supabase] POST /api/supabase/projects — project id:', req.body?.id);
  if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });
  try {
    const row = toDb(req.body);
    console.log('[supabase] upserting single row:', JSON.stringify(row).slice(0, 120));
    const { error } = await supabase.from('projects').upsert(row, { onConflict: 'id' });
    if (error) {
      console.error('[supabase] upsert error:', error.message, error.details);
      return res.status(500).json({ error: error.message });
    }
    console.log('[supabase] upsert ok');
    res.json({ ok: true });
  } catch(err) {
    console.error('[supabase] POST exception:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/supabase/sync', async (req, res) => {
  console.log('[supabase] POST /api/supabase/sync — client ready:', !!supabase, '— projects received:', Array.isArray(req.body?.projects) ? req.body.projects.length : 'NOT AN ARRAY');
  if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });
  const { projects } = req.body;
  if (!Array.isArray(projects)) return res.status(400).json({ error: 'projects must be an array' });
  try {
    const rows = projects.map(toDb);
    console.log('[supabase] mapped rows sample:', JSON.stringify(rows[0]).slice(0, 120));
    const { error } = await supabase.from('projects').upsert(rows, { onConflict: 'id' });
    if (error) {
      console.error('[supabase] bulk upsert error:', error.message, error.details, error.hint);
      return res.status(500).json({ error: error.message });
    }
    console.log('[supabase] bulk upsert ok — synced:', rows.length);
    res.json({ ok: true, synced: rows.length });
  } catch(err) {
    console.error('[supabase] sync exception:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// --- Gmail OAuth ---

app.get('/api/gmail/auth', (req, res) => {
  const oauth2 = makeOAuth2Client();
  if (!oauth2) return res.status(500).send('Gmail credentials not configured');
  const url = oauth2.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.send'],
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

app.post('/api/gmail/reply', async (req, res) => {
  if (!gmailRefreshToken) return res.status(401).json({ error: 'Not connected' });
  const oauth2 = makeOAuth2Client();
  if (!oauth2) return res.status(500).json({ error: 'Gmail credentials not configured' });
  oauth2.setCredentials({ refresh_token: gmailRefreshToken });
  const { threadId, to, subject, body } = req.body;
  if (!threadId || !to || !body) return res.status(400).json({ error: 'Missing threadId, to, or body' });
  try {
    const gmail = google.gmail({ version: 'v1', auth: oauth2 });
    const thread = await gmail.users.threads.get({ userId: 'me', id: threadId, format: 'metadata', metadataHeaders: ['Message-ID', 'References'] });
    const lastMsg = thread.data.messages?.[thread.data.messages.length - 1];
    const lastHeaders = lastMsg?.payload?.headers || [];
    const hdr = name => lastHeaders.find(h => h.name === name)?.value || '';
    const messageId = hdr('Message-ID');
    const references = [hdr('References'), messageId].filter(Boolean).join(' ');
    const reSubject = subject.startsWith('Re:') ? subject : `Re: ${subject}`;
    const mime = [
      `From: me`,
      `To: ${to}`,
      `Subject: ${reSubject}`,
      `In-Reply-To: ${messageId}`,
      `References: ${references}`,
      `Content-Type: text/plain; charset=utf-8`,
      ``,
      body,
    ].join('\r\n');
    const raw = Buffer.from(mime).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    await gmail.users.messages.send({ userId: 'me', requestBody: { raw, threadId } });
    res.json({ ok: true });
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
