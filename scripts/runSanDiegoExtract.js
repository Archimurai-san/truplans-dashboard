// runSanDiegoExtract.js — Extract ALL San Diego residential zones from PDF

import { createClient } from '@supabase/supabase-js';
import { fetchSanDiegoZones } from './fetchSanDiegoPDF.js';

const SUPABASE_URL = 'https://clskmcueoaoslacskjzj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_PKi4TSl3088C_1zT0boUdg_t2Mf4Jo5';
const SOURCE_URL = 'https://docs.sandiego.gov/municode/MuniCodeChapter13/Ch13Art01Division04.pdf';

async function run() {
  const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

  // Load Anthropic key from Supabase
  const { data: cfg } = await sb.from('app_config').select('value').eq('key', 'anthropicKey').single();
  if (!cfg?.value) { console.error('❌  Anthropic key not found'); process.exit(1); }
  console.log('✓  Anthropic key loaded');

  const zones = await fetchSanDiegoZones(cfg.value);

  let saved = 0, failed = 0;
  for (const zone of zones) {
    try {
      const { error } = await sb.from('zoning_standards').upsert(
        {
          jurisdiction: 'San Diego, CA',
          zone: zone.zone,
          standards: zone.standards,
          citation: zone.citation || '§131.0431',
          confidence: zone.confidence || 'high',
          missing: zone.missing || [],
          source_url: SOURCE_URL,
          source_effective_date: '2025-04-24',
          retrieved_at: new Date().toISOString(),
        },
        { onConflict: 'jurisdiction,zone' }
      );
      if (error) throw error;
      console.log(`   ✓  ${zone.zone}`);
      saved++;
    } catch(err) {
      console.error(`   ✗  ${zone.zone}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone. ${saved} zones saved, ${failed} failed.`);
}

run();
