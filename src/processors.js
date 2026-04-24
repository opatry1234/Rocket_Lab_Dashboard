// ─── Status normalisation ────────────────────────────────────────────────────

export const STATUS = {
  SUCCESS: 'Success',
  FAILURE: 'Failure',
  PARTIAL: 'Partial Failure',
};

export function statusOf(launch) {
  return launch?.status?.abbrev ?? 'Unknown';
}

export function isFlown(launch) {
  const s = statusOf(launch);
  return s === STATUS.SUCCESS || s === STATUS.FAILURE || s === STATUS.PARTIAL;
}

function shortFailureReason(launch) {
  const status = statusOf(launch);
  if (status === STATUS.PARTIAL) return 'Partial mission success';
  if (status !== STATUS.FAILURE) return 'Mission successful';

  const text = String(
    launch?.failreason || launch?.failure_reason || launch?.status?.description || 'Launch vehicle failure'
  )
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return text.split(/\s+/).slice(0, 5).join(' ');
}

// ─── Cadence ─────────────────────────────────────────────────────────────────

/**
 * Launches per calendar year, only counting flown missions.
 * @returns {{ labels: string[], counts: number[], byYear: Record<string, Launch[]> }}
 */
export function cadenceByYear(launches) {
  const byYear = {};
  for (const l of launches) {
    if (!isFlown(l) || !l.net) continue;
    const year = new Date(l.net).getFullYear().toString();
    (byYear[year] ??= []).push(l);
  }
  const labels = Object.keys(byYear).sort();
  return { labels, counts: labels.map((y) => byYear[y].length), byYear };
}

/**
 * Launches per calendar month (YYYY-MM), only counting flown missions.
 * Useful for a bar chart showing tempo over the full programme history.
 * @returns {{ labels: string[], counts: number[] }}
 */
export function cadenceByMonth(launches) {
  const counts = {};
  for (const l of launches) {
    if (!isFlown(l) || !l.net) continue;
    const d = new Date(l.net);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  const labels = Object.keys(counts).sort();
  return { labels, counts: labels.map((k) => counts[k]) };
}

/**
 * Cumulative launch count over time (all flown missions, chronological).
 * @returns {{ dates: string[], cumulative: number[] }}
 */
export function cumulativeCadence(launches) {
  const flown = launches
    .filter((l) => isFlown(l) && l.net)
    .sort((a, b) => new Date(a.net) - new Date(b.net));

  const dates = [];
  const cumulative = [];
  let count = 0;
  for (const l of flown) {
    count++;
    dates.push(l.net.slice(0, 10)); // ISO date only
    cumulative.push(count);
  }
  return { dates, cumulative };
}

// ─── Success rates ────────────────────────────────────────────────────────────

/**
 * Overall success / failure / partial breakdown for flown missions.
 * @returns {{ labels: string[], counts: number[], rates: Record<string, number> }}
 */
export function overallSuccessRate(launches) {
  const tally = { [STATUS.SUCCESS]: 0, [STATUS.FAILURE]: 0, [STATUS.PARTIAL]: 0 };
  for (const l of launches) {
    const s = statusOf(l);
    if (s in tally) tally[s]++;
  }
  const total = Object.values(tally).reduce((a, b) => a + b, 0);
  const labels = Object.keys(tally);
  const counts = labels.map((k) => tally[k]);
  const rates = {};
  for (const k of labels) rates[k] = total ? +(tally[k] / total * 100).toFixed(1) : 0;
  return { labels, counts, rates };
}

/**
 * Yearly success rate (%) — only years with at least one flown launch.
 * @returns {{ labels: string[], rates: number[], totals: number[], successes: number[], failures: number[] }}
 */
export function successRateByYear(launches) {
  const { labels, byYear } = cadenceByYear(launches);
  const rates = labels.map((y) => {
    const group = byYear[y];
    const successes = group.filter((l) => statusOf(l) === STATUS.SUCCESS).length;
    return +((successes / group.length) * 100).toFixed(1);
  });
  const totals = labels.map((y) => byYear[y].length);
  const successes = labels.map((y) => byYear[y].filter((l) => statusOf(l) === STATUS.SUCCESS).length);
  const failures = labels.map((y) => byYear[y].filter((l) => statusOf(l) !== STATUS.SUCCESS).length);
  return { labels, rates, totals, successes, failures };
}

/**
 * Running (trailing) success rate after each launch.
 * Good for a line chart showing reliability trend over time.
 * @returns {{ labels: string[], runningRate: number[], statuses: string[], failureReasons: string[], missionNames: string[] }}
 */
export function runningSuccessRate(launches) {
  const flown = launches
    .filter((l) => isFlown(l) && l.net)
    .sort((a, b) => new Date(a.net) - new Date(b.net));

  const labels = [];
  const runningRate = [];
  const statuses = [];
  const failureReasons = [];
  const missionNames = [];
  let successes = 0;

  for (let i = 0; i < flown.length; i++) {
    if (statusOf(flown[i]) === STATUS.SUCCESS) successes++;
    labels.push(`#${i + 1} ${flown[i].net.slice(0, 10)}`);
    runningRate.push(+((successes / (i + 1)) * 100).toFixed(1));
    statuses.push(statusOf(flown[i]));
    failureReasons.push(shortFailureReason(flown[i]));
    missionNames.push(flown[i]?.name ?? `Flight #${i + 1}`);
  }
  return { labels, runningRate, statuses, failureReasons, missionNames };
}

// ─── Payload categories ───────────────────────────────────────────────────────

/**
 * Count of launches per mission type (e.g. "Earth Science", "Dedicated Rideshare").
 * Unknown / null types are grouped as "Other".
 * @returns {{ labels: string[], counts: number[] }}
 */
export function payloadCategories(launches) {
  const tally = {};
  for (const l of launches) {
    if (!isFlown(l)) continue;
    const type = l.mission?.type || 'Other';
    tally[type] = (tally[type] ?? 0) + 1;
  }
  const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1]);
  return { labels: sorted.map(([k]) => k), counts: sorted.map(([, v]) => v) };
}

/**
 * Orbit breakdown for flown launches.
 * @returns {{ labels: string[], counts: number[] }}
 */
export function orbitBreakdown(launches) {
  const tally = {};
  for (const l of launches) {
    if (!isFlown(l)) continue;
    const orbit = l.mission?.orbit?.abbrev || 'Unknown';
    tally[orbit] = (tally[orbit] ?? 0) + 1;
  }
  const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1]);
  return { labels: sorted.map(([k]) => k), counts: sorted.map(([, v]) => v) };
}

// ─── Top customers ────────────────────────────────────────────────────────────

/**
 * Agencies that have flown on Electron, ranked by launch count.
 * A launch with multiple agencies counts once toward each agency.
 *
 * @param {Launch[]} launches
 * @param {number} [topN=10]
 * @returns {{ labels: string[], counts: number[], details: CustomerDetail[] }}
 */
export function topCustomers(launches, topN = 10) {
  const tally = {};
  for (const l of launches) {
    if (!isFlown(l)) continue;
    const agencies = l.mission?.agencies ?? [];
    // Skip Rocket Lab itself appearing as the operator on test flights
    const customers = agencies.filter(
      (a) => a.name && a.name.toLowerCase() !== 'rocket lab'
    );
    // If no external customer recorded, treat as internal/Rocket Lab
    const names = customers.length ? customers.map((a) => a.name) : ['Rocket Lab (Internal)'];
    for (const name of names) {
      tally[name] = (tally[name] ?? 0) + 1;
    }
  }

  const sorted = Object.entries(tally)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN);

  const details = sorted.map(([name, count]) => {
    // Find the most recent launch with this customer for country info
    const sample = launches.find(
      (l) => isFlown(l) && (l.mission?.agencies ?? []).some((a) => a.name === name)
    );
    const agency = sample?.mission?.agencies?.find((a) => a.name === name);
    return {
      name,
      count,
      country: agency?.country?.[0]?.alpha_2 ?? null,
      type: agency?.type?.name ?? null,
    };
  });

  return {
    labels: sorted.map(([k]) => k),
    counts: sorted.map(([, v]) => v),
    details,
  };
}

// ─── Launch pad utilisation ───────────────────────────────────────────────────

/**
 * Count of flown launches per launch pad.
 * @returns {{ labels: string[], counts: number[] }}
 */
export function launchPadBreakdown(launches) {
  const tally = {};
  for (const l of launches) {
    if (!isFlown(l)) continue;
    const pad = l.pad?.name ?? 'Unknown';
    tally[pad] = (tally[pad] ?? 0) + 1;
  }
  const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1]);
  return { labels: sorted.map(([k]) => k), counts: sorted.map(([, v]) => v) };
}

// ─── Convenience: all chart data in one shot ─────────────────────────────────

/**
 * Run all processors and return a single object ready for the dashboard.
 * @param {Launch[]} launches
 * @returns {DashboardData}
 */
export function buildDashboardData(launches) {
  return {
    cadenceYear:      cadenceByYear(launches),
    cadenceMonth:     cadenceByMonth(launches),
    cumulative:       cumulativeCadence(launches),
    successOverall:   overallSuccessRate(launches),
    successByYear:    successRateByYear(launches),
    successRunning:   runningSuccessRate(launches),
    payloadCategories: payloadCategories(launches),
    orbits:           orbitBreakdown(launches),
    topCustomers:     topCustomers(launches),
    launchPads:       launchPadBreakdown(launches),
    meta: {
      totalLaunches:   launches.filter(isFlown).length,
      upcomingLaunches: launches.filter((l) => !isFlown(l)).length,
      generatedAt:     new Date().toISOString(),
    },
  };
}
