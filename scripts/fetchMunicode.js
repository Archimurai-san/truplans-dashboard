// fetchMunicode.js — Stage 1 adapter for Municode-hosted city codes

export async function fetchMunicodeSection(sectionUrl) {
  const res = await fetch(sectionUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    }
  });

  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${sectionUrl}`);

  const html = await res.text();

  const clean = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&sect;/g, '§')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (clean.length < 200) {
    throw new Error(`Content too short (${clean.length} chars) — page may be JS-rendered.`);
  }

  return { rawText: clean, sourceUrl: sectionUrl };
}
