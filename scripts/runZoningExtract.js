// runZoningExtract.js — Orchestrator: fetch → AI extract → Supabase upsert

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fetchMunicodeSection } from './fetchMunicode.js';
import { structureZoningSection } from './structureZoningSection.js';

const SUPABASE_URL = 'https://clskmcueoaoslacskjzj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_PKi4TSl3088C_1zT0boUdg_t2Mf4Jo5';

const TARGETS = [
  {
    jurisdiction: 'Irvine, CA',
    zone: '2.2 Low Density Residential',
    url: 'https://library.municode.com/ca/irvine/codes/zoning?nodeId=ZOOR_DIV3GEDESTLAUSRE_CH3-37ZODILAUSREDEST',
    rawTextFile: './scripts/raw/irvine-residential.txt',
    startAfter: 'Sec. 3-37-13. - 2.2 Low Density Residential',
  },
  // { jurisdiction: 'Carlsbad, CA', zone: 'R-1', url: '...', rawTextFile: './scripts/raw/carlsbad-r1.txt' },
];

async function loadAnthropicKey(sb) {
  const { data } = await sb.from('app_config').select('value').eq('key', 'anthropicKey').single();
  if (!data?.value) throw new Error('Anthropic API key not found in Supabase app_config');
  process.env.ANTHROPIC_API_KEY = data.value;
  console.log('✓  Anthropic key loaded');
}

async function run() {
  const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
  await loadAnthropicKey(sb);

  for (const target of TARGETS) {
    console.log(`\n▶  ${target.jurisdiction} — ${target.zone}`);
    try {
      let rawText, sourceUrl;
      if (target.rawTextFile) {
        let text = readFileSync(target.rawTextFile, 'utf8').trim();
        if (target.startAfter) {
          const idx = text.indexOf(target.startAfter);
          if (idx !== -1) { text = text.slice(idx); console.log(`   Skipped to "${target.startAfter}"`); }
        }
        rawText = text;
        sourceUrl = target.url;
        console.log(`   Read ${rawText.length} chars from file`);
      } else {
        console.log('   Fetching...');
        ({ rawText, sourceUrl } = await fetchMunicodeSection(target.url));
        console.log(`   Got ${rawText.length} chars`);
      }

      console.log('   Extracting via Claude...');
      const record = await structureZoningSection({ rawText, jurisdiction: target.jurisdiction, sourceUrl });
      console.log(`   Zone: ${record.zone}  Confidence: ${record.confidence}`);
      if (record.missing?.length) console.log(`   Missing: ${record.missing.join(', ')}`);

      const { error } = await sb.from('zoning_standards').upsert(
        {
          jurisdiction: record.jurisdiction,
          zone: record.zone,
          standards: record.standards,
          citation: record.citation,
          confidence: record.confidence,
          missing: record.missing,
          source_url: record.source_url,
          retrieved_at: record.retrieved_at,
        },
        { onConflict: 'jurisdiction,zone' }
      );

      if (error) throw error;
      console.log('   ✓  Saved to Supabase');
    } catch (err) {
      console.error(`   ✗  ${err.message}`);
    }
  }
  console.log('\nDone.');
}

run();
