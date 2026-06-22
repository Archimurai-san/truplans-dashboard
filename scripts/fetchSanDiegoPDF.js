// fetchSanDiegoPDF.js — Downloads SD Municipal Code PDF and extracts all zones via Claude

import https from 'https';

const SD_PDF_URL = 'https://docs.sandiego.gov/municode/MuniCodeChapter13/Ch13Art01Division04.pdf';

function makePrompt(zoneList) {
  return `You are a zoning code extraction engine reading San Diego Municipal Code Chapter 13, Article 1, Division 4.

Extract development standards ONLY for these zones: ${zoneList}

Return a JSON array — one object per zone:
[{"zone":"<e.g. RS-1-7>","standards":{"min_lot_area":{"value":"<number or null>","unit":"sf","notes":""},"density":{"value":"<e.g. 1 DU / 3000 sf or null>","unit":"","notes":""},"front_setback":{"value":"<number or null>","unit":"ft","notes":""},"side_setback":{"value":"<number or null>","unit":"ft","notes":""},"street_side_setback":{"value":"<number or null>","unit":"ft","notes":""},"rear_setback":{"value":"<number or null>","unit":"ft","notes":""},"max_height":{"value":"<number or null>","unit":"ft","notes":""},"max_far":{"value":"<number or null>","unit":"","notes":""}},"citation":"<table reference>","confidence":"high"}]

Rules: NEVER invent numbers. Use null if absent. Return ONLY valid JSON array, no preamble, no markdown.`;
}

async function claudeExtract(pdfBase64, apiKey, zoneList, label) {
  console.log(`   Extracting ${label}...`);
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'pdfs-2024-09-25',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
      messages: [{
        role: 'user',
        content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 } },
          { type: 'text', text: makePrompt(zoneList) }
        ]
      }]
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `Claude error ${res.status}`);
  const text = data.content.map(b => b.text || '').join('').trim();
  const zones = JSON.parse(text.replace(/^```json\s*|\s*```$/g, ''));
  console.log(`   Got ${zones.length} zones from ${label}`);
  return zones;
}

export async function fetchSanDiegoZones(apiKey) {
  console.log('   Downloading San Diego PDF...');

  const pdfBuffer = await new Promise((resolve, reject) => {
    https.get(SD_PDF_URL, { rejectUnauthorized: false }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });

  const pdfBase64 = pdfBuffer.toString('base64');
  console.log(`   PDF downloaded (${Math.round(pdfBuffer.byteLength / 1024)} KB) — sending to Claude in 2 batches...`);

  const batch1 = await claudeExtract(pdfBase64, apiKey,
    'RS-1-1, RS-1-2, RS-1-3, RS-1-4, RS-1-5, RS-1-6, RS-1-7, RS-1-8, RS-1-9, RS-1-10, RS-1-11, RS-1-12, RS-1-13, RS-1-14, RX-1-1, RX-1-2',
    'RS + RX zones');

  console.log('   Waiting 65s for rate limit reset...');
  await new Promise(r => setTimeout(r, 65000));

  const batch2 = await claudeExtract(pdfBase64, apiKey,
    'RT-1-1, RT-1-2, RT-1-3, RT-1-4, RT-1-5, RM-1-1, RM-1-2, RM-1-3, RM-2-4, RM-2-5, RM-2-6, RM-3-7, RM-3-8, RM-3-9, RM-4-10, RM-4-11, RM-5-12',
    'RT + RM zones');

  return [...batch1, ...batch2];
}
