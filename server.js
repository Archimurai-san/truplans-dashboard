import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const app = express();
const PORT = 3001;
const __dir = dirname(fileURLToPath(import.meta.url));
let API_KEY = "";
try {
  const config = JSON.parse(readFileSync(join(__dir, 'config.json'), 'utf8'));
  API_KEY = config.anthropicKey || "";
} catch(e) {
  console.log("No config.json found.");
}

app.use(cors({ origin: ["http://localhost:5173","http://localhost:5174"] }));
app.use(express.json({ limit: "50mb" }));

app.get('/api/health', (req, res) => {
  res.json({ status:"ok", keyLoaded:API_KEY.length>0 });
});

app.post('/api/claude', async (req, res) => {
  if (!API_KEY) return res.status(500).json({ error: "No API key in config.json" });
  res.setTimeout(310000);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 300000);
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type":"application/json", "x-api-key":API_KEY, "anthropic-version":"2023-06-01" },
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

app.listen(PORT, () => {
  console.log(`\n🚀 TruPlans API proxy running on http://localhost:${PORT}`);
  console.log(API_KEY ? "✓  API key loaded" : "⚠  No API key — add to config.json");
  console.log(`\nDashboard: http://localhost:5173\n`);
});
