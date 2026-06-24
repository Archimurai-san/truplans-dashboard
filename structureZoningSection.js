// structureZoningSection.js
// ---------------------------------------------------------------------------
// Stage 2 of the zoning extractor: takes the RAW TEXT of one code section and
// returns normalized, structured zoning data.
//
// This stage is PLATFORM-AGNOSTIC. The same function works whether the text
// came from eCode360, Municode, American Legal, Code Publishing, or a San
// Diego PDF. Only the upstream fetch adapter differs per host; this does not.
//
// Pipeline position:  fetch (per-host)  ->  [THIS FILE]  ->  store (Supabase)
// ---------------------------------------------------------------------------

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

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
  "citation": "<exact section number cited in the text, e.g. §131.0431 / Table 131-04G>",
  "confidence": "<high | medium | low>",
  "missing": ["<field names for any standard NOT found in the text>"]
}

Rules:
- Preserve conditional values EXACTLY. If front setback is "15 or 20 depending on number of stories", set value "15/20" and explain the condition in notes.
- NEVER invent a number. If a standard is absent from the text, set value to null and add the field name to "missing".
- Quote the citation exactly as it appears in the source text.`;

/**
 * @param {Object}  args
 * @param {string}  args.rawText       Raw text of ONE code section (from the fetch adapter)
 * @param {string}  args.jurisdiction  e.g. "San Diego, CA"
 * @param {string}  args.sourceUrl     The exact source URL the text came from
 * @returns {Promise<Object>}          Normalized record ready for Supabase
 */
async function structureZoningSection({ rawText, jurisdiction, sourceUrl }) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",          // good cost/quality for extraction; swap if you like
      max_tokens: 1500,
      messages: [
        { role: "user", content: `${EXTRACTION_PROMPT}\n\n--- SECTION TEXT ---\n${rawText}` }
      ]
    })
  });

  const data = await res.json();
  const text = data.content.map(b => b.text || "").join("").trim();

  // strip accidental code fences, then parse
  const json = JSON.parse(text.replace(/^```json\s*|\s*```$/g, ""));

  return {
    jurisdiction,
    ...json,
    source_url: sourceUrl,
    retrieved_at: new Date().toISOString()
  };
}

module.exports = { structureZoningSection };
