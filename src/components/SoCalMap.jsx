import React, { useRef, useEffect, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getProjectCoords, getProjectCounty, getCountyStats, PIN_COLORS } from '../data/socalCities.js';

const TILE_URL  = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const STATUS_FILTERS = ['All', 'In Progress', 'Completed', 'On Hold'];

// ── MAP TEST DATA — set SHOW_TEST_DATA=false to remove after testing ──────
const SHOW_TEST_DATA = false;
const TEST_PROJECTS = [
  {id:'T01',name:'Test — Glendale Remodel',client:'Test Client',city:'Glendale',status:'In Progress'},
  {id:'T02',name:'Test — Burbank Addition',client:'Test Client',city:'Burbank',status:'Completed'},
  {id:'T03',name:'Test — Santa Monica ADU',client:'Test Client',city:'Santa Monica',status:'In Progress'},
  {id:'T04',name:'Test — Torrance Kitchen',client:'Test Client',city:'Torrance',status:'On Hold'},
  {id:'T05',name:'Test — Pasadena Master Suite',client:'Test Client',city:'Pasadena',status:'In Progress'},
  {id:'T06',name:'Test — El Monte Bathroom',client:'Test Client',city:'El Monte',status:'Completed'},
  {id:'T07',name:'Test — Inglewood Garage',client:'Test Client',city:'Inglewood',status:'In Progress'},
  {id:'T08',name:'Test — Downey Full Remodel',client:'Test Client',city:'Downey',status:'Not Started'},
  {id:'T09',name:'Test — West Covina Deck',client:'Test Client',city:'West Covina',status:'In Progress'},
  {id:'T10',name:'Test — Norwalk Addition',client:'Test Client',city:'Norwalk',status:'Completed'},
  {id:'T11',name:'Test — Carson ADU',client:'Test Client',city:'Carson',status:'In Progress'},
  {id:'T12',name:'Test — Hawthorne Remodel',client:'Test Client',city:'Hawthorne',status:'On Hold'},
  {id:'T13',name:'Test — Alhambra Kitchen',client:'Test Client',city:'Alhambra',status:'In Progress'},
  {id:'T14',name:'Test — Whittier Bath',client:'Test Client',city:'Whittier',status:'Completed'},
  {id:'T15',name:'Test — Pomona ADU',client:'Test Client',city:'Pomona',status:'In Progress'},
  {id:'T16',name:'Test — Baldwin Park Addition',client:'Test Client',city:'Baldwin Park',status:'Not Started'},
  {id:'T17',name:'Test — Lakewood Remodel',client:'Test Client',city:'Lakewood',status:'Completed'},
  {id:'T18',name:'Test — Bellflower Garage',client:'Test Client',city:'Bellflower',status:'In Progress'},
  {id:'T19',name:'Test — Pico Rivera Kitchen',client:'Test Client',city:'Pico Rivera',status:'On Hold'},
  {id:'T20',name:'Test — Montebello Addition',client:'Test Client',city:'Montebello',status:'In Progress'},
  {id:'T21',name:'Test — Rosemead Remodel',client:'Test Client',city:'Rosemead',status:'Completed'},
  {id:'T22',name:'Test — Santa Clarita ADU',client:'Test Client',city:'Santa Clarita',status:'In Progress'},
  {id:'T23',name:'Test — Lancaster Addition',client:'Test Client',city:'Lancaster',status:'On Hold'},
  {id:'T24',name:'Test — Palmdale Remodel',client:'Test Client',city:'Palmdale',status:'In Progress'},
  {id:'T25',name:'Test — Culver City Bath',client:'Test Client',city:'Culver City',status:'Completed'},
  {id:'T26',name:'Test — El Segundo ADU',client:'Test Client',city:'El Segundo',status:'In Progress'},
  {id:'T27',name:'Test — Manhattan Beach Kitchen',client:'Test Client',city:'Manhattan Beach',status:'In Progress'},
  {id:'T28',name:'Test — Redondo Beach Remodel',client:'Test Client',city:'Redondo Beach',status:'Not Started'},
  {id:'T29',name:'Test — Hermosa Beach Addition',client:'Test Client',city:'Hermosa Beach',status:'In Progress'},
  {id:'T30',name:'Test — Gardena ADU',client:'Test Client',city:'Gardena',status:'Completed'},
  {id:'T31',name:'Test — Lawndale Garage',client:'Test Client',city:'Lawndale',status:'In Progress'},
  {id:'T32',name:'Test — Paramount Remodel',client:'Test Client',city:'Paramount',status:'On Hold'},
  {id:'T33',name:'Test — Lynwood Addition',client:'Test Client',city:'Lynwood',status:'In Progress'},
  {id:'T34',name:'Test — Huntington Park Kitchen',client:'Test Client',city:'Huntington Park',status:'Completed'},
  {id:'T35',name:'Test — Maywood Bath',client:'Test Client',city:'Maywood',status:'In Progress'},
  {id:'T36',name:'Test — Bell ADU',client:'Test Client',city:'Bell',status:'On Hold'},
  {id:'T37',name:'Test — Bell Gardens Remodel',client:'Test Client',city:'Bell Gardens',status:'In Progress'},
  {id:'T38',name:'Test — Cudahy Addition',client:'Test Client',city:'Cudahy',status:'Not Started'},
  {id:'T39',name:'Test — Azusa Garage',client:'Test Client',city:'Azusa',status:'In Progress'},
  {id:'T40',name:'Test — Covina Kitchen',client:'Test Client',city:'Covina',status:'Completed'},
  {id:'T41',name:'Test — Arcadia Remodel',client:'Test Client',city:'Arcadia',status:'In Progress'},
  {id:'T42',name:'Test — Monrovia ADU',client:'Test Client',city:'Monrovia',status:'On Hold'},
  {id:'T43',name:'Test — Duarte Addition',client:'Test Client',city:'Duarte',status:'In Progress'},
  {id:'T44',name:'Test — Glendora Bath',client:'Test Client',city:'Glendora',status:'Completed'},
  {id:'T45',name:'Test — San Dimas Remodel',client:'Test Client',city:'San Dimas',status:'In Progress'},
  {id:'T46',name:'Test — La Verne Garage',client:'Test Client',city:'La Verne',status:'In Progress'},
  {id:'T47',name:'Test — Agoura Hills ADU',client:'Test Client',city:'Agoura Hills',status:'On Hold'},
  {id:'T48',name:'Test — Calabasas Kitchen',client:'Test Client',city:'Calabasas',status:'In Progress'},
  {id:'T49',name:'Test — Malibu Addition',client:'Test Client',city:'Malibu',status:'Completed'},
  {id:'T50',name:'Test — South Gate Remodel',client:'Test Client',city:'South Gate',status:'In Progress'},
];
// ─────────────────────────────────────────────────────────────────────────────

function buildPopup(p) {
  const color = PIN_COLORS[p.status] || '#888';
  const county = getProjectCounty(p);
  return `<div style="font-family:monospace;font-size:11px;min-width:170px;line-height:1.5">
    <div style="font-weight:700;color:#111;margin-bottom:3px">${p.name || p.id}</div>
    <div style="color:#555;margin-bottom:1px">${p.city || '—'} · ${county} Co.</div>
    <div style="color:#555;margin-bottom:5px">Client: ${p.client || '—'}</div>
    <span style="background:${color}22;color:${color};border:1px solid ${color}55;border-radius:3px;padding:1px 7px;font-size:10px">${p.status}</span>
  </div>`;
}

function useMap(containerRef, center, zoom) {
  const mapRef   = useRef(null);
  const layerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center, zoom,
      scrollWheelZoom: true,
      attributionControl: false,
      zoomControl: true,
    });
    L.tileLayer(TILE_URL, { maxZoom: 18 }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  return { mapRef, layerRef };
}

function updateMarkers(layerRef, projects, filter) {
  if (!layerRef.current) return;
  layerRef.current.clearLayers();

  const cityIdx = {};
  const visible = filter === 'All' ? projects : projects.filter(p => p.status === filter);

  for (const p of visible) {
    const k = (p.city || '').toLowerCase().trim();
    if (cityIdx[k] === undefined) cityIdx[k] = 0;
    const idx = cityIdx[k]++;
    const coords = getProjectCoords(p, idx);
    if (!coords) continue;

    const color = PIN_COLORS[p.status] || '#888888';
    L.circleMarker(coords, {
      radius: 5, fillColor: color, color: color,
      fillOpacity: 0.85, weight: 1.5, opacity: 0.9,
    }).bindPopup(buildPopup(p)).addTo(layerRef.current);
  }
}

function FilterBar({ filter, setFilter, projects }) {
  return (
    <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
      {STATUS_FILTERS.map(s => {
        const count = s === 'All' ? projects.length : projects.filter(p => p.status === s).length;
        const color = PIN_COLORS[s] || 'var(--accent)';
        const active = filter === s;
        return (
          <button key={s} onClick={() => setFilter(s)} style={{
            background: active ? color + '33' : 'none',
            border: `1px solid ${active ? color : 'var(--border-secondary)'}`,
            color: active ? color : 'var(--text-muted)',
            borderRadius: 3, padding: '2px 9px', fontSize: 9,
            cursor: 'pointer', fontFamily: 'monospace',
          }}>
            {s}
            {s !== 'All' && <span style={{ marginLeft: 4, opacity: 0.7 }}>{count}</span>}
          </button>
        );
      })}
    </div>
  );
}

function Legend() {
  return (
    <div style={{ display: 'flex', gap: 14, marginTop: 8, flexWrap: 'wrap' }}>
      {Object.entries(PIN_COLORS).filter(([s]) => s !== 'Offer').map(([status, color]) => (
        <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
          <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{status}</span>
        </div>
      ))}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: PIN_COLORS['Offer'], flexShrink: 0, opacity: 0.4 }} />
        <span style={{ fontSize: 9, color: 'var(--text-ghost)', fontFamily: 'monospace' }}>Offer (coming soon)</span>
      </div>
    </div>
  );
}

function CountyBreakdown({ projects }) {
  const stats = useMemo(() => getCountyStats(projects), [projects]);
  const mapped = useMemo(() => {
    const idx = {};
    return projects.filter(p => {
      const k = (p.city || '').toLowerCase().trim();
      if (idx[k] === undefined) idx[k] = 0;
      return getProjectCoords(p, idx[k]++) !== null;
    }).length;
  }, [projects]);

  return (
    <div>
      {stats.map(({ county, count, pct, color }) => (
        <div key={county} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
          <div style={{ flex: 1, fontSize: 10, color: 'var(--text-body)', fontFamily: 'monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {county === 'San Bernardino' ? 'San Bern.' : county} Co.
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace', minWidth: 22, textAlign: 'right' }}>{count}</div>
          <div style={{ width: 60, background: 'var(--bg-page)', borderRadius: 99, height: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: pct + '%', background: color, borderRadius: 99 }} />
          </div>
          <div style={{ fontSize: 10, color, fontFamily: 'monospace', minWidth: 28, textAlign: 'right' }}>{pct}%</div>
        </div>
      ))}
      {mapped < projects.length && (
        <div style={{ fontSize: 9, color: 'var(--text-ghost)', fontFamily: 'monospace', marginTop: 6 }}>
          {projects.length - mapped} city not yet in lookup
        </div>
      )}
    </div>
  );
}

// Greater LA map — replaces Phase Distribution in dashboard 2-col grid
export function LAMap({ projects }) {
  const [filter, setFilter] = useState('All');
  const containerRef = useRef(null);
  const { mapRef, layerRef } = useMap(containerRef, [34.05, -118.30], 10);
  const allProjects = SHOW_TEST_DATA ? [...projects, ...TEST_PROJECTS] : projects;

  useEffect(() => { updateMarkers(layerRef, allProjects, filter); }, [allProjects, filter]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <FilterBar filter={filter} setFilter={setFilter} projects={allProjects} />
      <div ref={containerRef} style={{ flex: 1, minHeight: 260, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border-secondary)' }} />
      <Legend />
    </div>
  );
}

// Southern California overview — full-width section below
export function SoCalOverview({ projects }) {
  const [filter, setFilter] = useState('All');
  const containerRef = useRef(null);
  const { mapRef, layerRef } = useMap(containerRef, [33.9, -117.7], 8);
  const allProjects = SHOW_TEST_DATA ? [...projects, ...TEST_PROJECTS] : projects;

  useEffect(() => { updateMarkers(layerRef, allProjects, filter); }, [allProjects, filter]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 16 }}>
      <div ref={containerRef} style={{ height: 320, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border-secondary)' }} />

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: '2px', textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: 10 }}>By County</div>
        <div style={{ marginBottom: 14 }}>
          <span style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 22, fontFamily: 'monospace' }}>{allProjects.length}</span>
          <span style={{ color: 'var(--text-muted)', marginLeft: 8, fontSize: 11 }}>total projects</span>
        </div>
        <CountyBreakdown projects={allProjects} />
        <div style={{ marginTop: 'auto', paddingTop: 14 }}>
          <div style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: '2px', textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: 6 }}>Filter Map</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {STATUS_FILTERS.map(s => {
              const color = PIN_COLORS[s] || 'var(--accent)';
              const active = filter === s;
              return (
                <button key={s} onClick={() => setFilter(s)} style={{
                  background: active ? color + '33' : 'none',
                  border: `1px solid ${active ? color : 'var(--border-secondary)'}`,
                  color: active ? color : 'var(--text-muted)',
                  borderRadius: 3, padding: '2px 7px', fontSize: 9,
                  cursor: 'pointer', fontFamily: 'monospace',
                }}>{s}</button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
