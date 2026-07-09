import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

const app = express();
const PORT = process.env.PORT || 3001;
const __dir = dirname(fileURLToPath(import.meta.url));

const DEFAULT_SUPABASE_URL      = 'https://clskmcueoaoslacskjzj.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_PKi4TSl3088C_1zT0boUdg_t2Mf4Jo5';
const DEFAULT_GMAIL_EMAIL       = 'radovan.truplans@gmail.com';

let API_KEY = "";
let gmailRefreshToken = null;
let gmailEmail = DEFAULT_GMAIL_EMAIL;
let supabase = null;

function loadConfig() {
  let config = {};
  try {
    config = JSON.parse(readFileSync(join(__dir, 'config.json'), 'utf8'));
  } catch(e) {
    console.log("No config.json found — using built-in defaults.");
  }
  // anthropicKey is loaded from Supabase app_config, not config.json
  gmailRefreshToken = config.gmailRefreshToken || null;
  gmailEmail = config.gmailEmail || DEFAULT_GMAIL_EMAIL;
  const supabaseUrl      = config.supabaseUrl      || DEFAULT_SUPABASE_URL;
  const supabaseAnonKey  = config.supabaseAnonKey  || DEFAULT_SUPABASE_ANON_KEY;
  supabase = createClient(supabaseUrl, supabaseAnonKey);
  console.log("✓  Supabase client initialised — URL:", supabaseUrl);
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
    site_measurement_date: p.siteMeasurementDate || null,
    team:              Array.isArray(p.team) ? p.team : [],
    team_roles:        p.teamRoles      || {},
    assign_note:       p.assignNote     || null,
    payment_milestones: Array.isArray(p.paymentMilestones) ? p.paymentMilestones : [],
    contracts:          Array.isArray(p.contracts)         ? p.contracts          : [],
    client_phone:   p.clientPhone   || null,
    client_email:   p.clientEmail   || null,
    client_address: p.clientAddress || null,
    reminders: Array.isArray(p.reminders) ? p.reminders : [],
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
    siteMeasurementDate: row.site_measurement_date || null,
    team:         Array.isArray(row.team) ? row.team : [],
    teamRoles:        row.team_roles        || {},
    assignNote:       row.assign_note       || '',
    paymentMilestones: Array.isArray(row.payment_milestones) ? row.payment_milestones : [],
    contracts:         Array.isArray(row.contracts)          ? row.contracts         : [],
    clientPhone:   row.client_phone   || '',
    clientEmail:   row.client_email   || '',
    clientAddress: row.client_address || '',
    reminders: Array.isArray(row.reminders) ? row.reminders : [],
  };
}

function saveConfig(updates) {
  let current = {};
  try { current = JSON.parse(readFileSync(join(__dir, 'config.json'), 'utf8')); } catch(e) {}
  writeFileSync(join(__dir, 'config.json'), JSON.stringify({ ...current, ...updates }, null, 2));
}

loadConfig();

async function loadRemoteConfig() {
  if (!supabase) return;
  try {
    const { data, error } = await supabase.from('app_config').select('key, value');
    if (error) { console.error('[remote-config] Supabase error:', error.message); return; }
    for (const row of data || []) {
      if (row.key === 'anthropicKey' && row.value) {
        API_KEY = row.value;
        console.log('✓  Anthropic key loaded from Supabase app_config');
      }
    }
  } catch(err) {
    console.error('[remote-config] Failed to load remote config:', err.message);
  }
}

loadRemoteConfig();

let gmailCreds = null;
try {
  gmailCreds = JSON.parse(readFileSync(join(__dir, 'credentials.json'), 'utf8')).web;
  console.log("✓  Gmail credentials loaded");
} catch(e) {
  console.log("⚠  No credentials.json found — Gmail features disabled");
}

function makeOAuth2Client() {
  if (!gmailCreds) return null;
  return new google.auth.OAuth2(
    gmailCreds.client_id,
    gmailCreds.client_secret,
    gmailCreds.redirect_uris[0]
  );
}

async function getTokenForUser(userEmail) {
  if (!supabase || !userEmail) return null;
  const { data, error } = await supabase
    .from('gmail_tokens')
    .select('refresh_token, gmail_email')
    .eq('user_email', userEmail)
    .single();
  if (error || !data) return null;
  return data;
}

async function getOAuthForUser(userEmail) {
  const oauth2 = makeOAuth2Client();
  if (!oauth2) return null;
  if (userEmail) {
    const record = await getTokenForUser(userEmail);
    if (!record?.refresh_token) return null;
    oauth2.setCredentials({ refresh_token: record.refresh_token });
  } else {
    if (!gmailRefreshToken) return null;
    oauth2.setCredentials({ refresh_token: gmailRefreshToken });
  }
  return oauth2;
}

app.use(cors({ origin: ["http://localhost:5173","http://localhost:5174","http://localhost:5175","http://localhost:5176"] }));
app.use(express.json({ limit: "50mb" }));

app.get('/api/health', (req, res) => {
  res.json({ status: "ok", keyLoaded: API_KEY.length > 0 });
});

// --- Activity Log ---
app.post('/api/activity', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Supabase not available' });
  const { project_id, project_name, user_name, action, detail } = req.body;
  if (!user_name || !action) return res.status(400).json({ error: 'user_name and action required' });
  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: existing } = await supabase.from('activity_log')
    .select('id, count')
    .eq('user_name', user_name)
    .eq('action', action)
    .eq('project_id', project_id || '')
    .gte('created_at', tenMinAgo)
    .order('created_at', { ascending: false })
    .limit(1);
  if (existing && existing.length > 0) {
    await supabase.from('activity_log').update({ count: (existing[0].count || 1) + 1, detail }).eq('id', existing[0].id);
  } else {
    await supabase.from('activity_log').insert({ project_id, project_name, user_name, action, detail, count: 1 });
  }
  res.json({ ok: true });
});

app.get('/api/activity', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Supabase not available' });
  const { data, error } = await supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(200);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/claude', async (req, res) => {
  if (!API_KEY) return res.status(500).json({ error: "Anthropic API key not loaded — check Supabase app_config table" });
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
    if (!response.ok) {
      const errText = await response.text();
      console.error(`[claude] API error ${response.status}:`, errText.slice(0, 200));
      return res.status(response.status).json({ error: `Anthropic API returned ${response.status}`, detail: errText.slice(0, 200) });
    }
    const data = await response.json();
    res.json(data);
  } catch(err) {
    res.status(500).json({ error: err.message });
  } finally {
    clearTimeout(timer);
  }
});

// --- AI Assistant ---

app.post('/api/ai/ask', async (req, res) => {
  if (!API_KEY) return res.status(500).json({ error: 'Anthropic API key not loaded' });
  const { question, city, project } = req.body;
  if (!question) return res.status(400).json({ error: 'question required' });

  // Load relevant zoning standards from Supabase
  let zoningContext = '';
  if (supabase) {
    const { data: zones } = await supabase
      .from('zoning_standards')
      .select('jurisdiction,zone,standards,citation,source_url,source_effective_date')
      .order('jurisdiction');
    if (zones?.length) {
      zoningContext = '\n\nZONING KNOWLEDGE BASE (verified from official city codes):\n' +
        zones.map(z => {
          const s = z.standards;
          return `\n${z.jurisdiction} — Zone: ${z.zone}\n` +
            `  Density: ${s.density?.value || 'n/a'}\n` +
            `  Min Lot Area: ${s.min_lot_area?.value || 'n/a'} ${s.min_lot_area?.unit || ''}\n` +
            `  Front Setback: ${s.front_setback?.value || 'n/a'} ft ${s.front_setback?.notes ? '('+s.front_setback.notes+')' : ''}\n` +
            `  Side Setback: ${s.side_setback?.value || 'n/a'} ft ${s.side_setback?.notes ? '('+s.side_setback.notes+')' : ''}\n` +
            `  Rear Setback: ${s.rear_setback?.value || 'n/a'} ft\n` +
            `  Max Height: ${s.max_height?.value || 'n/a'} ft\n` +
            `  Max FAR: ${s.max_far?.value || 'n/a'}\n` +
            `  Citation: ${z.citation || 'n/a'}\n` +
            `  Source: ${z.source_url || 'n/a'}`;
        }).join('\n');
    }
  }

  // Build project context if provided
  let projectContext = '';
  if (project) {
    projectContext = `\n\nCURRENT PROJECT:\n` +
      `  Job #: ${project.id}\n` +
      `  Name: ${project.name}\n` +
      `  Client: ${project.client || 'n/a'}\n` +
      `  City: ${project.city || 'n/a'}\n` +
      `  Status: ${project.status || 'n/a'}\n` +
      `  Phase: ${project.phase || 'n/a'}\n` +
      `  Designer: ${project.designer || 'n/a'}\n` +
      `  Type: ${project.type || 'n/a'}\n` +
      `  Contract: $${project.contract || 0}\n` +
      `  Start: ${project.start || 'n/a'} · End: ${project.end || 'n/a'}`;
  }

  const systemPrompt = `You are TruPlans AI — a zoning and workflow assistant for TruPlans Inc, a residential architectural design firm in Southern California.

Your role: help designers and managers quickly find zoning rules, answer questions about projects, and assist with workflow decisions.

You have access to a verified zoning knowledge database. When answering zoning questions, cite the specific zone, jurisdiction, and standards. If a city is not in the database, say so clearly and suggest checking the city's municipal code directly.

Be concise and practical. Answer in plain language. Use bullet points for lists of standards. Always cite your source.${zoningContext}${projectContext}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: question }]
      })
    });
    const data = await response.json();
    if (!response.ok) return res.status(500).json({ error: data.error?.message || 'Claude error' });
    res.json({ answer: data.content?.[0]?.text || '' });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Config & Auth ---

app.get('/api/config', (req, res) => {
  const config = (() => { try { return JSON.parse(readFileSync(join(__dir, 'config.json'), 'utf8')); } catch { return {}; } })();
  res.json({ supabaseUrl: config.supabaseUrl || '', supabaseAnonKey: config.supabaseAnonKey || '' });
});

app.get('/api/auth/callback', (req, res) => {
  // Supabase redirects here after Google OAuth with tokens in the URL fragment.
  // Fragment is not sent to the server, so we serve a small page that bounces
  // the browser back to the frontend app with the fragment intact.
  res.send(`<!DOCTYPE html><html><body><script>
    var dest = 'http://localhost:3001' + window.location.hash;
    window.location.replace(dest);
  </script></body></html>`);
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

app.get('/api/supabase/task-instructions', async (req, res) => {
  console.log('[supabase] GET /api/supabase/task-instructions — client ready:', !!supabase);
  if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });
  try {
    const { data, error } = await supabase.from('task_instructions').select('*').order('workflow_step_id');
    if (error) {
      console.error('[supabase] SELECT error:', error.message, error.details);
      return res.status(500).json({ error: error.message });
    }
    console.log('[supabase] SELECT ok — rows returned:', data.length);
    res.json(data);
  } catch(err) {
    console.error('[supabase] GET exception:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/supabase/task-instructions/:id', async (req, res) => {
  console.log('[supabase] PUT /api/supabase/task-instructions/:id —', req.params.id);
  if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });
  const { body_text, checklist, links, last_updated_by } = req.body;
  try {
    const { data, error } = await supabase
      .from('task_instructions')
      .update({ body_text, checklist, links, last_updated_by })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) {
      console.error('[supabase] UPDATE error:', error.message, error.details);
      return res.status(500).json({ error: error.message });
    }
    console.log('[supabase] UPDATE ok — id:', req.params.id, 'version now:', data.version);
    res.json(data);
  } catch(err) {
    console.error('[supabase] PUT exception:', err.message);
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

const PATCH_ALLOWED = new Set(['reminders','client_phone','client_email','client_address']);
app.patch('/api/supabase/projects/:id', async (req, res) => {
  const { id } = req.params;
  if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });
  const updates = {};
  for (const [k, v] of Object.entries(req.body || {})) {
    if (PATCH_ALLOWED.has(k)) updates[k] = v;
  }
  if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No valid fields' });
  try {
    const { error } = await supabase.from('projects').update(updates).eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Gmail OAuth ---

app.delete('/api/supabase/projects/:id', async (req, res) => {
  const { id } = req.params;
  console.log('[supabase] DELETE /api/supabase/projects/' + id + ' — client ready:', !!supabase);
  if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });
  if (!id) return res.status(400).json({ error: 'id is required' });
  try {
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) {
      console.error('[supabase] delete error:', error.message, error.details, error.hint);
      return res.status(500).json({ error: error.message });
    }
    console.log('[supabase] delete ok — removed id:', id);
    res.json({ ok: true, deleted: id });
  } catch(err) {
    console.error('[supabase] delete exception:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/supabase/projects/rename', async (req, res) => {
  const { oldId, newId } = req.body || {};
  console.log('[supabase] POST /api/supabase/projects/rename — from:', oldId, 'to:', newId);
  if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });
  if (!oldId || !newId) return res.status(400).json({ error: 'oldId and newId are required' });
  if (String(oldId) === String(newId)) return res.status(400).json({ error: 'oldId and newId are the same' });
  try {
    // 1. Verify the new ID isn't already taken
    const { data: existing, error: checkErr } = await supabase.from('projects').select('id').eq('id', String(newId)).maybeSingle();
    if (checkErr) {
      console.error('[supabase] rename check error:', checkErr.message);
      return res.status(500).json({ error: 'Failed to check new ID: ' + checkErr.message });
    }
    if (existing) {
      return res.status(409).json({ error: `Job number "${newId}" is already in use by another project` });
    }
    // 2. Fetch the existing row
    const { data: oldRow, error: fetchErr } = await supabase.from('projects').select('*').eq('id', String(oldId)).maybeSingle();
    if (fetchErr) {
      console.error('[supabase] rename fetch error:', fetchErr.message);
      return res.status(500).json({ error: 'Failed to fetch old project: ' + fetchErr.message });
    }
    if (!oldRow) {
      return res.status(404).json({ error: `Project "${oldId}" not found in cloud` });
    }
    // 3. Insert a copy with the new ID
    const newRow = { ...oldRow, id: String(newId) };
    const { error: insertErr } = await supabase.from('projects').insert(newRow);
    if (insertErr) {
      console.error('[supabase] rename insert error:', insertErr.message);
      return res.status(500).json({ error: 'Failed to insert new project: ' + insertErr.message });
    }
    // 4. Delete the old row
    const { error: deleteErr } = await supabase.from('projects').delete().eq('id', String(oldId));
    if (deleteErr) {
      // Rollback: try to delete the new row we just created
      console.error('[supabase] rename delete error (rolling back):', deleteErr.message);
      await supabase.from('projects').delete().eq('id', String(newId));
      return res.status(500).json({ error: 'Failed to delete old project; new one rolled back: ' + deleteErr.message });
    }
    console.log('[supabase] rename ok:', oldId, '->', newId);
    res.json({ ok: true, oldId, newId });
  } catch (err) {
    console.error('[supabase] rename exception:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/storage/upload-contract', async (req, res) => {
  try {
    const { projectId, filename, base64 } = req.body;
    if (!projectId || !filename || !base64) return res.status(400).json({ error: 'Missing fields' });
    const buf = Buffer.from(base64, 'base64');
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${projectId}/${Date.now()}_${safeName}`;
    const { error } = await supabase.storage.from('contract-pdfs').upload(storagePath, buf, {
      contentType: 'application/pdf',
      upsert: false
    });
    if (error) return res.status(500).json({ error: error.message });
    const { data } = supabase.storage.from('contract-pdfs').getPublicUrl(storagePath);
    res.json({ ok: true, url: data.publicUrl });
  } catch (err) {
    console.error('[storage] upload-contract error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/gmail/auth', (req, res) => {
  const oauth2 = makeOAuth2Client();
  if (!oauth2) return res.status(500).send('Gmail credentials not configured');
  const url = oauth2.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.send'],
    prompt: 'consent',
    state: req.query.userEmail || '',
  });
  res.redirect(url);
});

app.get('/api/gmail/callback', async (req, res) => {
  const { code, error, state } = req.query;
  if (error) return res.status(400).send(htmlPage('Auth Error', `<p style="color:#e74c3c">Error: ${error}</p>`));
  const oauth2 = makeOAuth2Client();
  if (!oauth2) return res.status(500).send(htmlPage('Error', '<p>Gmail credentials not configured</p>'));
  try {
    const { tokens } = await oauth2.getToken(code);
    if (!tokens.refresh_token && !gmailRefreshToken) {
      return res.status(400).send(htmlPage('No Refresh Token',
        '<p>Google did not return a refresh token. Revoke TruPlans access in your Google Account security settings, then try connecting again.</p>'
      ));
    }
    if (tokens.refresh_token) {
      gmailRefreshToken = tokens.refresh_token;
      saveConfig({ gmailRefreshToken: tokens.refresh_token });
      if (state && supabase) {
        oauth2.setCredentials(tokens);
        let gEmail = '';
        try {
          const gmail = google.gmail({ version: 'v1', auth: oauth2 });
          const profile = await gmail.users.getProfile({ userId: 'me' });
          gEmail = profile.data.emailAddress || '';
        } catch(e) {}
        await supabase.from('gmail_tokens').upsert(
          { user_email: state, refresh_token: tokens.refresh_token, gmail_email: gEmail, updated_at: new Date().toISOString() },
          { onConflict: 'user_email' }
        );
      }
    }
    res.send(htmlPage('Gmail Connected',
      '<p style="color:#52d68a;font-size:18px;font-weight:700">Gmail connected!</p><p>You can close this window and click Refresh in the TruPlans Inbox tab.</p>'
    ));
  } catch(err) {
    res.status(500).send(htmlPage('Error', `<p style="color:#e74c3c">${err.message}</p>`));
  }
});

app.get('/api/gmail/status', (req, res) => {
  res.json({ connected: !!gmailRefreshToken, gmailEmail });
});

app.get('/api/gmail/token/:userEmail', async (req, res) => {
  const record = await getTokenForUser(req.params.userEmail);
  res.json({ connected: !!(record?.refresh_token), gmailEmail: record?.gmail_email || null });
});

app.post('/api/gmail/save-token', async (req, res) => {
  const { userEmail, refreshToken, gmailEmail: gEmail } = req.body;
  if (!userEmail || !refreshToken) return res.status(400).json({ error: 'Missing userEmail or refreshToken' });
  if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });
  const { error } = await supabase.from('gmail_tokens').upsert(
    { user_email: userEmail, refresh_token: refreshToken, gmail_email: gEmail || '', updated_at: new Date().toISOString() },
    { onConflict: 'user_email' }
  );
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

app.get('/api/gmail/list', async (req, res) => {
  const { userEmail } = req.query;
  const oauth2 = await getOAuthForUser(userEmail);
  if (!oauth2) return res.status(401).json({ error: 'Not connected' });
  try {
    const gmail = google.gmail({ version: 'v1', auth: oauth2 });
    const listRes = await gmail.users.threads.list({ userId: 'me', maxResults: 50 });
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

app.get('/api/gmail/list-planning', async (req, res) => {
  const oauth2 = makeOAuth2Client();
  if (!oauth2 || !gmailRefreshToken) return res.json([]);
  oauth2.setCredentials({ refresh_token: gmailRefreshToken });
  try {
    const gmail = google.gmail({ version: 'v1', auth: oauth2 });
    const listRes = await gmail.users.threads.list({ userId: 'me', maxResults: 50 });
    const threads = listRes.data.threads || [];
    const detailed = await Promise.all(threads.map(async t => {
      const thread = await gmail.users.threads.get({
        userId: 'me', id: t.id, format: 'metadata',
        metadataHeaders: ['From', 'Subject', 'Date'],
      });
      const msg = thread.data.messages?.[0];
      const headers = msg?.payload?.headers || [];
      const h = name => headers.find(hdr => hdr.name === name)?.value || '';
      return { id: t.id, from: h('From'), subject: h('Subject') || '(no subject)', snippet: thread.data.snippet || '', date: h('Date'), _account: 'planning' };
    }));
    res.json(detailed);
  } catch(err) {
    res.json([]);
  }
});

app.post('/api/gmail/reply', async (req, res) => {
  const { threadId, to, subject, body, userEmail } = req.body;
  const oauth2 = await getOAuthForUser(userEmail);
  if (!oauth2) return res.status(401).json({ error: 'Not connected' });
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
  const { userEmail } = req.query;
  const oauth2 = await getOAuthForUser(userEmail);
  if (!oauth2) return res.status(401).json({ error: 'Not connected' });
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

// Serve built frontend — dist sits alongside server.js in both dev and packaged app
const distPath = join(__dir, 'dist');
if (existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/')) res.sendFile(join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`\n🚀 TruPlans API proxy running on http://localhost:${PORT}`);
  console.log(API_KEY ? "✓  Anthropic key ready" : "ℹ  Anthropic key pending — loading from Supabase app_config");
  console.log(gmailRefreshToken ? "✓  Gmail token present" : "ℹ  Gmail not yet connected");
  console.log(existsSync(distPath) ? "✓  Serving frontend from dist/" : "ℹ  No dist/ found — frontend not served");
  console.log(`\nDashboard: http://localhost:3001\n`);
});
