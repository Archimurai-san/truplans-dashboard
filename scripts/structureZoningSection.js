// structureZoningSection.js — Stage 2: AI extraction

const EXTRACTION_PROMPT = `You are a zoning code extraction engine. You will be given the raw text of one section of a municipal zoning code. Extract the residential development standards into JSON.

Return ONLY valid JSON — no preamble, no markdown fences — matching exactly this shape:

{
  "zone": "<zone designation, e.g. RM-1-1>",
  "standards": {
    "min_lot_area":        { "value": "<number or range or null>", "unit": "sf", "notes": "" },
    "density":             { "value": "<e.g. 1 DU / 3000 sf>",     "unit": "",   "notes": "" },
    "front_setback":       { "value": "<number or range or null>", "unit": "ft", "notes": "" },
    "side_setback":        { "value": "<number or range or null>", "unit": "ft", "notes": "" },
    "street_side_setback": { "value": "<number or range or null>", "unit": "ft", "notes": "" },
    "rear_setback":        { "value": "<number or range or null>", "unit": "ft", "notes": "" },
    "max_height":          { "value": "<number or null>",          "unit": "ft", "notes": "" },
    "max_far":             { "value": "<number or null>",          "unit": "",   "notes": "" }
  },
  "citation": "<exact section number cited in the text>",
  "confidence": "<high | medium | low>",
  "missing": ["<field names for any standard NOT found in the text>"]
}

Rules:
- NEVER invent a number. If a standard is absent, set value to null and add to missing.
- Preserve conditional values exactly with notes explaining conditions.
- Quote the citation exactly as it appears in the source text.`;

const MAX_CHARS = 20000;

export async function structureZoningSection({ rawText, jurisdiction, sourceUrl }) {
  const trimmed = rawText.length > MAX_CHARS ? rawText.slice(0, MAX_CHARS) : rawText;
  if (rawText.length > MAX_CHARS) console.log(`   Trimmed to ${MAX_CHARS} chars`);

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 3000,
      messages: [{ role: "user", content: `${EXTRACTION_PROMPT}\n\n--- SECTION TEXT ---\n${trimmed}` }]
    })
  });

  const data = await res.json();
  const text = data.content.map(b => b.text || "").join("").trim();
  try {
    let json = JSON.parse(text.replace(/^```json\s*|\s*```$/g, ""));
    if (Array.isArray(json)) json = json[0]; // take first zone if array returned
    return { jurisdiction, ...json, source_url: sourceUrl, retrieved_at: new Date().toISOString() };
  } catch(e) {
    console.error('   Claude raw response:', text.slice(0, 500));
    throw e;
  }
}
