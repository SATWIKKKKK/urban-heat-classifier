const fs = require('fs');
const f = 'src/app/dashboard/map/DashboardMapClient.tsx';
let lines = fs.readFileSync(f, 'utf8').split('\n');

// 1. Remove selectedIntervention state (line 143, 0-indexed)
const stateIdx = lines.findIndex(l => l.includes('const [selectedIntervention, setSelectedIntervention]'));
if (stateIdx >= 0) lines.splice(stateIdx, 1);

// 2. Fix hasInspector - remove selectedIntervention
const hasInspIdx = lines.findIndex(l => l.includes('searchedPlace || selectedIntervention || inspectorPlace'));
if (hasInspIdx >= 0) {
  lines[hasInspIdx] = lines[hasInspIdx].replace('searchedPlace || selectedIntervention || inspectorPlace', 'searchedPlace || inspectorPlace');
}

// 3. Fix useEffect that opens inspector
const effectIdx = lines.findIndex(l => l.includes('searchedPlace || selectedIntervention || selectedPlace) setRightPanel'));
if (effectIdx >= 0) {
  lines[effectIdx] = lines[effectIdx].replace('searchedPlace || selectedIntervention || selectedPlace', 'searchedPlace || selectedPlace');
}
const depIdx = lines.findIndex(l => l.includes('[searchedPlace, selectedIntervention, selectedPlace]'));
if (depIdx >= 0) {
  lines[depIdx] = lines[depIdx].replace('[searchedPlace, selectedIntervention, selectedPlace]', '[searchedPlace, selectedPlace]');
}

// 4. Remove setSelectedIntervention(null) calls (just remove the call, keep rest)
for (let i = 0; i < lines.length; i++) {
  lines[i] = lines[i].replace(/setSelectedIntervention\(null\); ?/g, '');
  // Handle the setSelectedIntervention(iv) replacement—may be on its own line
  if (/setSelectedIntervention\(iv\)/.test(lines[i])) {
    lines[i] = lines[i].replace(
      /setSelectedIntervention\(iv\)[^;]*;/,
      'setSelectedPlace(payload.places.find(n => n.id === iv.placeId) ?? null);'
    );
  }
  // On the line that has setSearchedMarkerPos(null), also insert setSearchedPlace(null) before it
  // but only if the previous line already has setSelectedPlace (i.e. we just replaced it)
  if (/setSearchedMarkerPos\(null\)/.test(lines[i]) && i > 0 && /setSelectedPlace/.test(lines[i - 1])) {
    lines[i] = lines[i].replace('setSearchedMarkerPos(null)', 'setSearchedPlace(null); setSearchedMarkerPos(null)');
  }
}

// 5. Remove intervention markers block (the map(iv => <Marker ...>) block)
const intMapIdx = lines.findIndex(l => l.includes("payload?.interventions.map(iv =>"));
if (intMapIdx >= 0) {
  // Find the closing line using paren depth.
  // Start depth at 0; increment for '(', decrement for ')'. Stop only when i > intMapIdx AND depth <= 0.
  let depth = 0;
  let endIdx = intMapIdx;
  for (let i = intMapIdx; i < lines.length; i++) {
    const line = lines[i];
    for (const ch of line) {
      if (ch === '(') depth++;
      if (ch === ')') depth--;
    }
    if (i > intMapIdx && depth <= 0) { endIdx = i; break; }
  lines.splice(intMapIdx, endIdx - intMapIdx + 1);
}

// 6. Fix mobile stats - remove activeInterventions stat and replace with scenarios count
const mobileStatIdx = lines.findIndex(l => l.includes('activeInterventions') && l.includes('Interventions</div>'));
if (mobileStatIdx >= 0) {
  lines.splice(mobileStatIdx, 1);
}

// 7. Fix mobile action buttons - replace intervention link with Build Scenario
const mobileIntLinkIdx = lines.findIndex(l => l.includes('href="/dashboard/interventions"') && l.includes('Intervention'));
if (mobileIntLinkIdx >= 0) {
  // Replace 2-line block (link + span)
  const nextLine = lines[mobileIntLinkIdx + 1];
  if (nextLine && nextLine.includes('Intervention')) {
    lines.splice(mobileIntLinkIdx, 2,
      '                <Link href="/dashboard/scenarios/new" className="flex items-center justify-center gap-1 h-9 text-xs font-medium bg-[#22c55e] text-white rounded-lg col-span-2">',
      '              Build Scenario'
    );
  } else {
    lines[mobileIntLinkIdx] = lines[mobileIntLinkIdx]
      .replace('href="/dashboard/interventions"', 'href="/dashboard/scenarios/new"');
  }
}

// Remove the old "Scenario" button since we made Build Scenario full-width
const oldScenarioIdx = lines.findIndex(l => l.includes('font-medium text-neutral-300 border border-white/[0.08] rounded-lg">Scenario</Link>'));
if (oldScenarioIdx >= 0) {
  lines.splice(oldScenarioIdx, 1);
}

// 8. Fix activeInterventions in stats interface and displayStats
// Leave the data fetching but rename for internal use only

fs.writeFileSync(f, lines.join('\n'), 'utf8');
console.log('Done! Cleaned all intervention references from DashboardMapClient.tsx');

// Verify no user-facing "intervention" text remains
const result = fs.readFileSync(f, 'utf8');
const remaining = result.split('\n')
  .map((l, i) => ({ line: i + 1, text: l }))
  .filter(x => /intervention/i.test(x.text));
console.log(`Remaining "intervention" references: ${remaining.length}`);
remaining.forEach(r => console.log(`  L${r.line}: ${r.text.trim().substring(0, 100)}`));
