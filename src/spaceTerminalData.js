// ─── Domains ──────────────────────────────────────────────────────────────────

export const DOMAINS = [
  {
    id: 'media',
    label: 'Media Attention',
    short: 'Media',
    desc: 'News articles published in the past 30 days (Spaceflight News API)',
  },
  {
    id: 'hiring',
    label: 'Hiring Expansion',
    short: 'Hiring',
    desc: "Open job postings on the company's public jobs board",
  },
  {
    id: 'buzz',
    label: 'Industry Buzz',
    short: 'Buzz',
    desc: 'Hacker News story mentions in the past 30 days',
  },
  {
    id: 'investment',
    label: 'Web Interest',
    short: 'Interest',
    desc: 'Wikipedia page views in the past 30 days',
  },
  {
    id: 'operations',
    label: 'Operational Cadence',
    short: 'Ops',
    desc: 'Launches completed in the past 12 months (Launch Library 2)',
  },
];

// ─── Companies ────────────────────────────────────────────────────────────────

export const COMPANIES = [
  {
    id: 'spacex',
    name: 'SpaceX',
    shortName: 'SpX',
    color: '#00AAFF',
    founded: 2002,
    hq: 'Hawthorne, CA',
    size: 'Mega',
    ticker: 'Private',
    tagline: 'Falcon, Starship, Starlink',
    // Job board
    greenhouse: 'spacex',
    lever: null,
    // Signal API config
    headcount: 13000,
    usaSpendingQuery: 'Space Exploration Technologies',
    redditQuery: 'SpaceX',
    wikiTitle: 'SpaceX',
    hnQuery: 'SpaceX',
    ll2Rockets: ['Falcon 9', 'Falcon Heavy', 'Starship'],
  },
  {
    id: 'rocket-lab',
    name: 'Rocket Lab',
    shortName: 'RKLB',
    color: '#FF4B12',
    founded: 2006,
    hq: 'Long Beach, CA',
    size: 'Large',
    ticker: 'RKLB',
    tagline: 'Electron, Neutron, Space Systems',
    greenhouse: 'rocketlab',
    lever: null,
    headcount: 2000,
    usaSpendingQuery: 'Rocket Lab USA',
    redditQuery: 'Rocket Lab',
    wikiTitle: 'Rocket_Lab',
    hnQuery: 'Rocket Lab',
    ll2Rockets: ['Electron'],
  },
  {
    id: 'blue-origin',
    name: 'Blue Origin',
    shortName: 'BO',
    color: '#60D0FF',
    founded: 2000,
    hq: 'Kent, WA',
    size: 'Large',
    ticker: 'Private',
    tagline: 'New Glenn, New Shepard, BE-4',
    greenhouse: null,
    lever: 'blueorigin',
    headcount: 11000,
    usaSpendingQuery: 'Blue Origin',
    redditQuery: 'Blue Origin',
    wikiTitle: 'Blue_Origin',
    hnQuery: 'Blue Origin',
    ll2Rockets: ['New Glenn', 'New Shepard'],
  },
  {
    id: 'firefly',
    name: 'Firefly Aerospace',
    shortName: 'FFL',
    color: '#00D2A0',
    founded: 2014,
    hq: 'Cedar Park, TX',
    size: 'Mid',
    ticker: 'Private',
    tagline: 'Alpha, Blue Ghost, Elytra',
    greenhouse: null,
    lever: null,
    smartrecruiters: 'FireflyAerospace',
    headcount: 300,
    usaSpendingQuery: 'Firefly Aerospace',
    redditQuery: 'Firefly Aerospace',
    wikiTitle: 'Firefly_Aerospace',
    hnQuery: 'Firefly Aerospace',
    ll2Rockets: ['Alpha'],
  },
  {
    id: 'vast',
    name: 'Vast',
    shortName: 'VAST',
    color: '#7B61FF',
    founded: 2021,
    hq: 'Long Beach, CA',
    size: 'Small',
    ticker: 'Private',
    tagline: 'Haven-1 Commercial Space Station',
    greenhouse: 'vast',
    lever: null,
    headcount: 150,
    usaSpendingQuery: 'Vast, Inc.',
    redditQuery: 'Vast Space',
    wikiTitle: 'Vast_(company)',
    hnQuery: 'Vast Space',
    ll2Rockets: [],
  },
  {
    id: 'relativity',
    name: 'Relativity Space',
    shortName: 'REL',
    color: '#FFB800',
    founded: 2015,
    hq: 'Long Beach, CA',
    size: 'Small',
    ticker: 'Private',
    tagline: 'Space Infrastructure, Additive Mfg.',
    greenhouse: 'relativity',
    lever: null,
    headcount: 500,
    usaSpendingQuery: 'Relativity Space',
    redditQuery: 'Relativity Space',
    wikiTitle: 'Relativity_Space',
    hnQuery: 'Relativity Space',
    ll2Rockets: ['Terran R'],
  },
];

// ─── Vehicles ─────────────────────────────────────────────────────────────────
// type: 'usable'       → has LL2 launch history, use generic usable vehicle page
//       'in-production'→ in development, show milestone timeline
// special: 'electron' / 'neutron' → route to the custom existing pages

export const VEHICLES = {
  'spacex': [
    {
      slug: 'falcon-9',
      name: 'Falcon 9',
      type: 'usable',
      ll2Name: 'Falcon 9',
      tagline: 'The world\'s most frequently flown orbital rocket',
      specs: { height: '70 m', diameter: '3.7 m', payload_leo: '22,800 kg', payload_gto: '8,300 kg', reusable: 'Yes (booster)' },
    },
    {
      slug: 'falcon-heavy',
      name: 'Falcon Heavy',
      type: 'usable',
      ll2Name: 'Falcon Heavy',
      tagline: 'Most powerful operational rocket in the world',
      specs: { height: '70 m', diameter: '12.2 m (3 cores)', payload_leo: '63,800 kg', payload_gto: '26,700 kg', reusable: 'Yes (boosters)' },
    },
    {
      slug: 'starship',
      name: 'Starship',
      type: 'in-production',
      ll2Name: 'Starship',
      tagline: 'Fully reusable super-heavy-lift launch system',
      specs: { height: '121 m', diameter: '9 m', payload_leo: '150,000 kg (fully reusable)', payload_gto: 'TBD', reusable: 'Full stack' },
      milestones: [
        { title: 'IFT-1 — First Integrated Flight', pct: 100, status: 'Complete', detail: 'April 2023. Vehicle destroyed at max-q during ascent. Critical data gathered for vehicle design.' },
        { title: 'IFT-2 — Stage Separation Achieved', pct: 100, status: 'Complete', detail: 'November 2023. Hot-stage separation demonstrated. Both vehicles lost during flight.' },
        { title: 'IFT-3 — Reached Space', pct: 100, status: 'Complete', detail: 'March 2024. Both vehicles reached space. First controlled reentries demonstrated.' },
        { title: 'IFT-4 — First Controlled Splashdowns', pct: 100, status: 'Complete', detail: 'June 2024. Both Super Heavy and Ship executed precision splashdowns. Major reliability milestone.' },
        { title: 'IFT-5 — Booster Catch', pct: 100, status: 'Complete', detail: 'October 2024. Super Heavy booster caught by Mechazilla arms at launch site — first in history.' },
        { title: 'IFT-6 — Repeat Booster Catch', pct: 100, status: 'Complete', detail: 'November 2024. Second booster catch confirmed operational chopstick recovery. Ship ocean landing.' },
        { title: 'IFT-7 / IFT-8 — Full Vehicle Recovery', pct: 100, status: 'Complete', detail: 'Early 2025. Multiple flights demonstrating full stack recovery and rapid turnaround.' },
        { title: 'Commercial Payload Missions', pct: 55, status: 'In Progress', detail: 'Preparing for commercial and government missions. NASA Artemis HLS contract execution pending.' },
        { title: 'Point-to-Point Transport Demonstration', pct: 15, status: 'Planned', detail: 'Earth-to-Earth commercial service planned post-operational certification.' },
      ],
      overallPct: 72,
    },
  ],
  'rocket-lab': [
    {
      slug: 'electron',
      name: 'Electron',
      type: 'special-electron',   // routes to existing rich Electron page
      ll2Name: 'Electron',
      tagline: 'The world\'s most frequently launched small orbital rocket',
      specs: { height: '18 m', diameter: '1.2 m', payload_leo: '300 kg', payload_sso: '200 kg', reusable: 'Booster recovery (in progress)' },
    },
    {
      slug: 'neutron',
      name: 'Neutron',
      type: 'special-neutron',    // routes to existing rich Neutron page
      ll2Name: 'Neutron',
      tagline: 'Medium-lift reusable rocket for mega-constellations',
      specs: { height: '40 m', diameter: '7 m', payload_leo: '13,000 kg', payload_reuse: '8,000 kg', reusable: 'Yes (first stage)' },
    },
  ],
  'blue-origin': [
    {
      slug: 'new-shepard',
      name: 'New Shepard',
      type: 'usable',
      ll2Name: 'New Shepard',
      tagline: 'Suborbital crew and payload vehicle for space tourism',
      specs: { height: '18 m', diameter: '3.7 m', payload_leo: 'Suborbital only', reusable: 'Yes (full stack)', apogee: '107 km' },
    },
    {
      slug: 'new-glenn',
      name: 'New Glenn',
      type: 'usable',
      ll2Name: 'New Glenn',
      tagline: 'Heavy-lift orbital rocket with reusable first stage',
      specs: { height: '98 m', diameter: '7 m', payload_leo: '45,000 kg', payload_gto: '13,000 kg', reusable: 'Yes (first stage)' },
    },
  ],
  'firefly': [
    {
      slug: 'alpha',
      name: 'Alpha',
      type: 'usable',
      ll2Name: 'Alpha',
      tagline: 'Small orbital launch vehicle for dedicated small satellite missions',
      specs: { height: '29 m', diameter: '1.8 m', payload_leo: '1,030 kg', payload_sso: '630 kg', reusable: 'No' },
    },
    {
      slug: 'elytra',
      name: 'Elytra',
      type: 'in-production',
      ll2Name: null,
      tagline: 'Reusable orbital transfer and hosting vehicle',
      specs: { payload: 'In-space propulsion / hosted payload', reusable: 'Yes', power: 'Solar' },
      milestones: [
        { title: 'Blue Ghost CLPS Mission', pct: 100, status: 'Complete', detail: 'Lunar surface delivery demonstration completed in early 2025, validating deep space capability.' },
        { title: 'Elytra Concept Development', pct: 70, status: 'In Progress', detail: 'Reusable orbital transfer vehicle in development, building on Blue Ghost technology heritage.' },
        { title: 'Northrop Antares Partnership', pct: 85, status: 'Active', detail: 'Propulsion and manufacturing partnership with Northrop Grumman supports medium-lift expansion.' },
        { title: 'Commercial Orbital Services', pct: 30, status: 'Planned', detail: 'Hosted payload and in-space transportation services targeting 2026–2027 initial operations.' },
      ],
      overallPct: 45,
    },
  ],
  'vast': [
    {
      slug: 'haven-1',
      name: 'Haven-1',
      type: 'in-production',
      ll2Name: null,
      tagline: 'First private commercial space station',
      specs: { length: '~10 m', crew: '4 (visiting)', launch_vehicle: 'Falcon 9', pressurized_volume: '~90 m³' },
      milestones: [
        { title: 'Haven-1 Design & Engineering', pct: 85, status: 'Near Complete', detail: 'Station module design is substantially complete. Manufacturing tooling and qualification hardware in production.' },
        { title: 'Commercial Crew Interface', pct: 75, status: 'In Progress', detail: 'Dragon capsule docking interface qualified with SpaceX. Crew systems and life support being integrated.' },
        { title: 'SpaceX Launch Agreement', pct: 100, status: 'Secured', detail: 'Falcon 9 launch arrangement confirmed. Haven-1 station launch and crew Dragon mission agreements in place.' },
        { title: 'Launch & Initial Operations', pct: 40, status: 'Upcoming', detail: 'Station launch and crew arrival targeting 2025–2026. ISS transition funding being pursued for follow-on.' },
        { title: 'Haven-2 Station Planning', pct: 15, status: 'Planned', detail: 'Second generation, larger station architecture under study as successor to Haven-1 demonstration.' },
      ],
      overallPct: 62,
    },
  ],
  'relativity': [
    {
      slug: 'terran-r',
      name: 'Terran R',
      type: 'in-production',
      ll2Name: 'Terran R',
      tagline: 'Fully reusable medium-lift rocket built by additive manufacturing',
      specs: { height: '~66 m', diameter: '5 m', payload_leo: '20,000 kg (expendable)', payload_reuse: '~14,000 kg', reusable: 'Yes (full stack)' },
      milestones: [
        { title: 'Aeon R Engine Development', pct: 60, status: 'In Progress', detail: 'LOX/methane engine test campaigns progressing. Full-duration qualification tests planned for 2025.' },
        { title: 'Stargate Printing System', pct: 90, status: 'Operational', detail: 'Large-format metal 3D printing platform fully operational, demonstrating Terran R structure manufacturing.' },
        { title: 'Vehicle Structure Manufacturing', pct: 40, status: 'In Progress', detail: 'Terran R primary structure manufacturing underway using Stargate printing. Key structure test articles being produced.' },
        { title: 'Reusability Architecture', pct: 35, status: 'In Development', detail: 'Booster and ship reusability systems in development. Recovery architecture defined; hardware testing planned.' },
        { title: 'Launch Site — Cape Canaveral', pct: 30, status: 'In Progress', detail: 'LC-16 lease at Cape Canaveral secured. Ground systems design and construction progressing.' },
        { title: 'First Flight', pct: 5, status: 'Planned', detail: 'First flight targeting 2026 timeframe, pending engine qualification and vehicle assembly milestones.' },
      ],
      overallPct: 35,
    },
  ],
};

// ─── Narratives ───────────────────────────────────────────────────────────────

export const NARRATIVES = {
  'rocket-lab': [
    {
      domain: 'operations',
      title: 'Neutron Advances on Schedule',
      body: 'Neutron development is accelerating across all fronts. Structural test article delivery confirms the program remains on schedule for first flight, with engine testing driving cadence toward ignition milestones.',
    },
    {
      domain: 'investment',
      title: 'NSSL Phase 2 Opens Government Market',
      body: 'NSSL Phase 2 certification advances Rocket Lab\'s government launch strategy, opening a multi-billion dollar addressable market previously exclusive to ULA and SpaceX.',
    },
    {
      domain: 'media',
      title: 'Recovery Program Reaches Inflection',
      body: 'Electron\'s first-stage recovery and reuse program is validating reuse economics. Each successful retrieval reduces per-launch cost trajectory and builds the operational playbook for Neutron-class reusability.',
    },
    {
      domain: 'hiring',
      title: 'Space Systems Revenue Diversifies',
      body: 'The Space Systems segment — spacecraft manufacturing, satellite buses, and mission services — now represents a growing share of total revenue, reducing launch-only revenue exposure.',
    },
  ],
  'spacex': [
    {
      domain: 'operations',
      title: 'Starship Approaching Operational Threshold',
      body: 'Starship\'s flight test cadence is accelerating with each successive IFT. The vehicle is rapidly approaching the reliability threshold required for Artemis HLS commitments.',
    },
    {
      domain: 'buzz',
      title: 'Starlink Funds Deep Space Ambition',
      body: 'Starlink now serves millions of subscribers globally, generating recurring revenue that funds deep space programs and continues expanding Gen2 satellite deployment.',
    },
    {
      domain: 'media',
      title: 'Falcon 9 Sets Turnaround Records',
      body: 'Falcon 9\'s 24-hour turnaround capability is being validated in practice, establishing new benchmarks for launch infrastructure efficiency inaccessible to most competitors.',
    },
    {
      domain: 'investment',
      title: 'Crew Program Locks Critical NASA Revenue',
      body: 'The Polaris program and ISS Commercial Crew operations maintain SpaceX\'s lock on NASA\'s critical human spaceflight requirements through this decade.',
    },
  ],
  'blue-origin': [
    {
      domain: 'operations',
      title: 'New Glenn Achieves Orbital Milestone',
      body: 'New Glenn\'s successful first orbital flight marks the culmination of years of development and validates Blue Origin\'s large-diameter composite manufacturing capability.',
    },
    {
      domain: 'investment',
      title: 'BE-4 Supply Chain Creates Strategic Leverage',
      body: 'BE-4 engine production for ULA\'s Vulcan Centaur creates a strategic supply chain relationship and establishes Blue Origin as a critical aerospace supplier beyond launch operations.',
    },
    {
      domain: 'media',
      title: 'Bezos Focus Accelerates New Glenn Cadence',
      body: 'Jeff Bezos\'s renewed personal focus on the orbital program is reflected in accelerated investment commitments. New Glenn is targeting increased cadence with a growing customer manifest.',
    },
    {
      domain: 'hiring',
      title: 'Suborbital Program Generates Operational Experience',
      body: 'New Shepard\'s commercial suborbital program continues with strong customer demand for crew and payload flights, generating revenue and operational experience for crew systems teams.',
    },
  ],
  'firefly': [
    {
      domain: 'operations',
      title: 'Alpha Reliability Compounds Mission Heritage',
      body: 'Alpha launch reliability has improved substantially with back-to-back successful flights, establishing mission heritage required for DoD and civil launch contracts.',
    },
    {
      domain: 'buzz',
      title: 'Blue Ghost Validates Deep Space Capability',
      body: 'Blue Ghost lunar lander\'s CLPS mission successfully delivered NASA science payloads to the lunar surface, establishing Firefly\'s credibility in the deep space market.',
    },
    {
      domain: 'investment',
      title: 'Government Contract Pipeline Provides Visibility',
      body: 'Government contract pipeline — including AFRL and NRO relationships — provides multi-year revenue visibility that supports operational expansion and headcount growth.',
    },
    {
      domain: 'media',
      title: 'Northrop Partnership Validates Propulsion Scale',
      body: 'The Northrop Grumman partnership on Antares propulsion provides near-term revenue and validates Firefly\'s propulsion technology at medium-lift scale.',
    },
  ],
  'vast': [
    {
      domain: 'operations',
      title: 'Haven-1 Launch Preparation Underway',
      body: 'Haven-1 commercial space station development is proceeding with a confirmed SpaceX Falcon 9 launch arrangement. Vast is positioned as the first private station operator.',
    },
    {
      domain: 'hiring',
      title: 'Talent Scaling Signals Station Operations Prep',
      body: 'Rapid headcount scaling reflects aggressive talent acquisition ahead of station operations. The hiring profile mirrors early-phase commercial station development timelines.',
    },
    {
      domain: 'investment',
      title: 'NASA Administrator Dynamics Favor Haven-1',
      body: 'Jared Isaacman\'s appointment as NASA Administrator creates favorable policy dynamics for commercial space station transition funding.',
    },
    {
      domain: 'media',
      title: 'Institutional Capital Prices Early-Mover Advantage',
      body: 'Investment momentum signals growing institutional confidence in the commercial station market. Vast\'s early-mover position is being priced into venture capital allocations.',
    },
  ],
  'relativity': [
    {
      domain: 'media',
      title: 'Strategic Pivot Reframes Market Positioning',
      body: 'The strategic pivot from launch vehicles to space infrastructure reflects a recalibration of addressable market focus. Coverage is shifting to manufacturing technology profiles.',
    },
    {
      domain: 'operations',
      title: 'Factory Technology Remains Core Asset',
      body: 'Large-format metal additive manufacturing remains Relativity\'s primary commercial asset. The Stargate printing system is the basis for active partnership discussions with aerospace primes.',
    },
    {
      domain: 'hiring',
      title: 'Headcount Reflects Leaner Post-Pivot Posture',
      body: 'Hiring activity has stabilized after organizational restructuring. Current trajectory suggests a leaner operational posture focused on B2B technology licensing.',
    },
    {
      domain: 'investment',
      title: 'Funding Runway Supports Infrastructure R&D',
      body: 'Prior investment rounds provide runway for continued R&D on manufacturing technology. Current capital deployment prioritizes partnership development over program scaling.',
    },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function overallScore(domainData) {
  // Use only the canonical domain IDs — ignores _raw and other metadata fields
  const vals = DOMAINS.map(d => domainData[d.id]).filter(v => typeof v === 'number' && !isNaN(v));
  if (!vals.length) return 0;
  return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
}

export function rankCompanies(snapshot) {
  return COMPANIES
    .map(c => {
      const raw = snapshot[c.id] ?? {};
      // Extract only the 5 domain scores (exclude _raw and other metadata)
      const scores = Object.fromEntries(DOMAINS.map(d => [d.id, raw[d.id] ?? 0]));
      return {
        ...c,
        scores,
        overall: overallScore(raw),
      };
    })
    .sort((a, b) => b.overall - a.overall)
    .map((c, i) => ({ ...c, rank: i + 1 }));
}

export function velocityLabel(score, prevScore) {
  const delta = score - prevScore;
  if (delta >= 8) return 'Accelerating';
  if (delta >= 3) return 'Rising';
  if (delta >= -2) return 'Stable';
  if (delta >= -7) return 'Declining';
  return 'Contracting';
}

export function velocityColor(label) {
  switch (label) {
    case 'Accelerating': return '#00D2A0';
    case 'Rising': return '#7EE8A2';
    case 'Stable': return '#8B9BC0';
    case 'Declining': return '#FF8A60';
    case 'Contracting': return '#FF4B4B';
    default: return '#8B9BC0';
  }
}

// Returns a hex color string from HSL components.
// Callers can append alpha bytes (e.g. `${color}1A`).
function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = n => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * c).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// Continuous red→yellow→green gradient for overall / leaderboard scores (0–100 scale).
export function scoreColor(score) {
  const clamped = Math.max(0, Math.min(100, score));
  return hslToHex(clamped * 1.2, 80, 52);
}

// Fixed 6-stop palette for rank-based cell coloring within a domain column.
// rank 1 = best (green), rank 6 = worst (red).
const RANK_HUES = [120, 90, 60, 30, 12, 0];

export function rankColor(rank) {
  const idx = Math.min(Math.max(rank - 1, 0), RANK_HUES.length - 1);
  return hslToHex(RANK_HUES[idx], 80, 52);
}

export function getCompany(id) {
  return COMPANIES.find(c => c.id === id) ?? null;
}

export function getVehicle(companyId, vehicleSlug) {
  return (VEHICLES[companyId] ?? []).find(v => v.slug === vehicleSlug) ?? null;
}
