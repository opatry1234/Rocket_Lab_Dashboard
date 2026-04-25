export const DOMAINS = [
  {
    id: 'media',
    label: 'Media Attention',
    short: 'Media',
    desc: 'News coverage volume relative to historical baseline',
  },
  {
    id: 'investment',
    label: 'Investment Momentum',
    short: 'Investment',
    desc: 'Capital activity signals vs. company funding history',
  },
  {
    id: 'hiring',
    label: 'Hiring Expansion',
    short: 'Hiring',
    desc: 'Headcount growth rate relative to company size baseline',
  },
  {
    id: 'buzz',
    label: 'Industry Buzz',
    short: 'Buzz',
    desc: 'Social and conference engagement relative to baseline',
  },
  {
    id: 'operations',
    label: 'Operational Cadence',
    short: 'Ops',
    desc: 'Mission and program activity relative to prior periods',
  },
];

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
  },
];

// Three snapshots enabling the Sequential Refresh animation.
// Scores are size-normalized: growth relative to each company's own history.
export const SNAPSHOTS = [
  {
    label: 'Apr 20, 2025 · 06:00 UTC',
    data: {
      'spacex':      { media: 96, investment: 88, hiring: 82, buzz: 98, operations: 99 },
      'rocket-lab':  { media: 74, investment: 71, hiring: 68, buzz: 73, operations: 88 },
      'blue-origin': { media: 82, investment: 75, hiring: 70, buzz: 79, operations: 71 },
      'firefly':     { media: 68, investment: 72, hiring: 65, buzz: 64, operations: 62 },
      'vast':        { media: 62, investment: 78, hiring: 85, buzz: 65, operations: 35 },
      'relativity':  { media: 45, investment: 52, hiring: 38, buzz: 42, operations: 28 },
    },
  },
  {
    label: 'Apr 22, 2025 · 18:00 UTC',
    data: {
      'spacex':      { media: 97, investment: 88, hiring: 83, buzz: 99, operations: 99 },
      'rocket-lab':  { media: 77, investment: 73, hiring: 70, buzz: 76, operations: 88 },
      'blue-origin': { media: 83, investment: 76, hiring: 71, buzz: 80, operations: 72 },
      'firefly':     { media: 72, investment: 75, hiring: 68, buzz: 68, operations: 65 },
      'vast':        { media: 68, investment: 83, hiring: 90, buzz: 71, operations: 38 },
      'relativity':  { media: 44, investment: 50, hiring: 36, buzz: 40, operations: 27 },
    },
  },
  {
    label: 'Apr 25, 2025 · 09:00 UTC',
    data: {
      'spacex':      { media: 99, investment: 90, hiring: 85, buzz: 99, operations: 99 },
      'rocket-lab':  { media: 76, investment: 74, hiring: 71, buzz: 75, operations: 90 },
      'blue-origin': { media: 84, investment: 77, hiring: 71, buzz: 81, operations: 73 },
      'firefly':     { media: 74, investment: 76, hiring: 70, buzz: 69, operations: 67 },
      'vast':        { media: 74, investment: 86, hiring: 92, buzz: 76, operations: 42 },
      'relativity':  { media: 43, investment: 49, hiring: 35, buzz: 39, operations: 26 },
    },
  },
];

export function overallScore(domainData) {
  const vals = Object.values(domainData);
  return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
}

export function rankCompanies(snapshot) {
  return COMPANIES
    .map(c => ({
      ...c,
      scores: snapshot.data[c.id],
      overall: overallScore(snapshot.data[c.id]),
    }))
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

export function scoreColor(score) {
  if (score >= 85) return '#00D2A0';
  if (score >= 70) return '#7EE8A2';
  if (score >= 55) return '#FFB800';
  if (score >= 40) return '#FF8A60';
  return '#FF4B4B';
}

export const NARRATIVES = {
  'rocket-lab': [
    {
      domain: 'operations',
      title: 'Neutron Advances on Schedule',
      body: 'Neutron development is accelerating across all fronts. Structural test article delivery confirms the program remains on schedule for first flight in late 2025, with engine testing driving cadence toward ignition milestones.',
    },
    {
      domain: 'investment',
      title: 'NSSL Phase 2 Opens Government Market',
      body: 'NSSL Phase 2 certification advances Rocket Lab\'s government launch strategy, opening a multi-billion dollar addressable market previously exclusive to ULA and SpaceX. This contract structure provides revenue visibility through the decade.',
    },
    {
      domain: 'media',
      title: 'Recovery Program Reaches Inflection',
      body: 'Electron\'s first-stage recovery and reuse program is validating reuse economics. Each successful retrieval reduces per-launch cost trajectory and builds the operational playbook for Neutron-class reusability at medium-lift scale.',
    },
    {
      domain: 'hiring',
      title: 'Space Systems Revenue Diversifies',
      body: 'The Space Systems segment — spacecraft manufacturing, satellite buses, and mission services — now represents a growing share of total revenue. These contracts provide diversified cash flow that reduces launch-only revenue exposure.',
    },
  ],
  'spacex': [
    {
      domain: 'operations',
      title: 'Starship Approaching Operational Threshold',
      body: 'Starship\'s flight test cadence is accelerating with each successive IFT. The vehicle is rapidly approaching the reliability threshold required for Artemis HLS commitments and commercial point-to-point transport demonstration.',
    },
    {
      domain: 'buzz',
      title: 'Starlink Funds Deep Space Ambition',
      body: 'Starlink now serves millions of subscribers globally, generating recurring revenue that funds deep space programs. The network continues expanding Gen2 satellite deployment with a clear path to global maritime and aviation coverage.',
    },
    {
      domain: 'media',
      title: 'Falcon 9 Sets Turnaround Records',
      body: 'Falcon 9\'s 24-hour turnaround capability is being validated in practice, establishing new benchmarks for launch infrastructure efficiency. This operational tempo is structurally inaccessible to most competitors through the decade.',
    },
    {
      domain: 'investment',
      title: 'Crew Program Locks Critical NASA Revenue',
      body: 'The Polaris program and ISS Commercial Crew operations maintain SpaceX\'s lock on NASA\'s critical human spaceflight requirements through this decade, with recurring mission-by-mission contracts building a stable revenue base.',
    },
  ],
  'blue-origin': [
    {
      domain: 'operations',
      title: 'New Glenn Achieves Orbital Milestone',
      body: 'New Glenn\'s successful first orbital flight marks the culmination of years of development and validates Blue Origin\'s large-diameter composite manufacturing capability at the scale required for heavy-lift applications.',
    },
    {
      domain: 'investment',
      title: 'BE-4 Supply Chain Creates Strategic Leverage',
      body: 'BE-4 engine production for ULA\'s Vulcan Centaur creates a strategic supply chain relationship and establishes Blue Origin as a critical aerospace supplier beyond launch operations, with recurring production revenue.',
    },
    {
      domain: 'media',
      title: 'Bezos Focus Accelerates New Glenn Cadence',
      body: 'Jeff Bezos\'s renewed personal focus on the orbital program is reflected in accelerated investment commitments. New Glenn is targeting monthly cadence this year, with customer manifest filling on government and commercial contracts.',
    },
    {
      domain: 'hiring',
      title: 'Suborbital Program Generates Operational Experience',
      body: 'New Shepard\'s commercial suborbital program continues with strong customer demand for crew and payload flights. This generates revenue and critical operational experience for crew systems teams ahead of orbital applications.',
    },
  ],
  'firefly': [
    {
      domain: 'operations',
      title: 'Alpha Reliability Compounds Mission Heritage',
      body: 'Alpha launch reliability has improved substantially with back-to-back successful flights, establishing mission heritage required for DoD and civil launch contracts. Each successful flight expands the addressable contract base.',
    },
    {
      domain: 'buzz',
      title: 'Blue Ghost Validates Deep Space Capability',
      body: 'Blue Ghost lunar lander\'s CLPS mission successfully delivered NASA science payloads to the lunar surface, establishing Firefly\'s credibility in the deep space market and positioning for follow-on CLPS task order awards.',
    },
    {
      domain: 'investment',
      title: 'Government Contract Pipeline Provides Visibility',
      body: 'Government contract pipeline — including AFRL and NRO relationships — provides multi-year revenue visibility that supports operational expansion and headcount growth toward Alpha cadence targets.',
    },
    {
      domain: 'media',
      title: 'Northrop Partnership Validates Propulsion Scale',
      body: 'The Northrop Grumman partnership on Antares propulsion provides near-term revenue and validates Firefly\'s propulsion technology at medium-lift scale, opening a development pathway beyond Alpha launch operations.',
    },
  ],
  'vast': [
    {
      domain: 'operations',
      title: 'Haven-1 Secures Launch Arrangement',
      body: 'Haven-1 commercial space station development is proceeding with a confirmed SpaceX Falcon 9 launch arrangement. Vast is positioned as the first private station operator, targeting crew arrival in 2025 on a Dragon mission.',
    },
    {
      domain: 'hiring',
      title: 'Talent Scaling Signals Station Operations Prep',
      body: 'Rapid headcount scaling reflects aggressive talent acquisition ahead of station operations. The hiring profile mirrors early-phase commercial station development timelines and is among the strongest relative growth signals in the dataset.',
    },
    {
      domain: 'investment',
      title: 'NASA Administrator Dynamics Favor Haven-1',
      body: 'Jared Isaacman\'s appointment as NASA Administrator creates favorable policy dynamics for commercial space station transition funding. Haven-1 is positioned to benefit from accelerated ISS retirement planning timelines.',
    },
    {
      domain: 'media',
      title: 'Institutional Capital Prices Early-Mover Advantage',
      body: 'Investment momentum signals growing institutional confidence in the commercial station market. Vast\'s early-mover position on Haven-1 is being priced into venture capital allocations as the station transition timeline firms.',
    },
  ],
  'relativity': [
    {
      domain: 'media',
      title: 'Strategic Pivot Reframes Market Positioning',
      body: 'The strategic pivot from launch vehicles to space infrastructure reflects a recalibration of addressable market focus following the Terran 1 anomaly. Coverage is shifting from launch tracking to manufacturing technology profiles.',
    },
    {
      domain: 'operations',
      title: 'Factory Technology Remains Core Asset',
      body: 'Large-format metal additive manufacturing remains Relativity\'s primary commercial asset. The Stargate printing system\'s capability is the basis for active partnership discussions with aerospace primes and defense contractors.',
    },
    {
      domain: 'hiring',
      title: 'Headcount Reflects Leaner Post-Pivot Posture',
      body: 'Hiring activity has stabilized after the organizational restructuring. Current headcount trajectory suggests a leaner operational posture focused on B2B technology licensing rather than vertically integrated launch operations.',
    },
    {
      domain: 'investment',
      title: 'Funding Runway Supports Infrastructure R&D',
      body: 'Prior investment rounds provide runway for continued R&D on manufacturing technology. Current capital deployment prioritizes partnership development over program scaling, reflecting the repositioned commercial strategy.',
    },
  ],
};
