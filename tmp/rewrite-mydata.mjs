import fs from 'fs';
const filePath = 'src/app/dashboard/mydata/MyDataClient.tsx';
const data = fs.readFileSync(filePath, 'utf8');

const SPLIT = 'return (\n    <div className="flex flex-col gap-6 font-[family-name:var(--font-headline)]">';
const splitIdx = data.indexOf(SPLIT);
if (splitIdx === -1) { console.error('split point not found'); process.exit(1); }

const logicPart = data.slice(0, splitIdx);

const newJSX = `return (
    <div className="flex flex-col gap-6">
      {error && <div className="px-4 py-2 text-sm bg-[var(--critical)]/10 border border-[var(--critical)]/40 text-[var(--critical)] rounded-md">{error}</div>}

      {/* \u2500\u2500 HEADER \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
      <header className="flex flex-col gap-4">
        {/* Title row */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-end border-b border-[var(--border)] pb-4 gap-3">
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="material-symbols-outlined text-[var(--text-tertiary)] text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>storage</span>
              <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--text-tertiary)]">My Data</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Data Hub</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              System Overview &amp; Metric Aggregation \u00b7{' '}
              <span className="text-[var(--text-primary)]">{city.name}</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {/* Mini stats bar */}
            <div className="flex items-center gap-px border border-[var(--border-strong)] bg-[var(--bg-surface)] rounded-md overflow-hidden">
              {avgTemp != null && (
                <>
                  <div className="flex flex-col px-4 py-2">
                    <span className="text-[9px] uppercase tracking-widest text-[var(--text-tertiary)]">Avg Temp</span>
                    <span className="text-sm text-[var(--green-400)]">{avgTemp.toFixed(1)}\u00b0C</span>
                  </div>
                  <div className="w-px h-8 bg-[var(--border-strong)]" />
                </>
              )}
              <div className="flex flex-col px-4 py-2">
                <span className="text-[9px] uppercase tracking-widest text-[var(--text-tertiary)]">Places</span>
                <span className="text-sm text-[var(--text-primary)]">{stats.totalPlaces}</span>
              </div>
              <div className="w-px h-8 bg-[var(--border-strong)]" />
              <div className="flex flex-col px-4 py-2">
                <span className="text-[9px] uppercase tracking-widest text-[var(--text-tertiary)]">Country</span>
                <span className="text-sm text-[var(--text-primary)]">{city.country}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-[var(--green-400)]" />
              <span className="text-[11px] text-[var(--green-400)] uppercase tracking-wider font-medium">System Active</span>
            </div>
          </div>
        </div>

        {/* Telemetry cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-4 flex flex-col gap-2">
            <span className="text-[10px] uppercase tracking-widest text-[var(--text-tertiary)]">Total Monitored Area</span>
            <span className="text-xl font-semibold text-[var(--text-primary)]">
              {totalArea > 0 ? \`\${totalArea.toLocaleString()} km\u00b2\` : \`\${stats.totalPlaces} places\`}
            </span>
          </div>
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-4 flex flex-col gap-2">
            <span className="text-[10px] uppercase tracking-widest text-[var(--text-tertiary)]">Avg Temp Delta</span>
            <span className="text-xl font-semibold text-[var(--critical)]">{avgTemp != null ? \`+\${avgTemp.toFixed(1)}\u00b0C\` : '\u2014'}</span>
          </div>
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-4 flex flex-col gap-2">
            <span className="text-[10px] uppercase tracking-widest text-[var(--text-tertiary)]">Vulnerable Pop.</span>
            <span className="text-xl font-semibold text-[var(--moderate)]">{vulnerablePop > 0 ? vulnerablePop.toLocaleString() : '\u2014'}</span>
          </div>
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-4 flex flex-col gap-2">
            <span className="text-[10px] uppercase tracking-widest text-[var(--text-tertiary)]">Active Sensors</span>
            <span className="text-xl font-semibold text-[var(--green-400)]">{activePlacesCount} / {stats.totalPlaces}</span>
          </div>
        </div>

        {/* Place Array Health */}
        {places.length > 0 && (
          <div className="border border-[var(--border)] bg-[var(--bg-surface)] rounded-lg p-4 flex flex-col gap-3">
            <div className="flex justify-between items-center border-b border-[var(--border)] pb-2">
              <h2 className="text-[11px] uppercase tracking-widest text-[var(--text-primary)] font-semibold">Place Array Health</h2>
              <span className="text-xs text-[var(--green-400)]">
                ACTIVE: {activePlacesCount} | UNMEASURED: {stats.totalPlaces - activePlacesCount}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2">
              {places.slice(0, 16).map(p => {
                const st = statusBadge(p.vulnerabilityLevel);
                const active = p.heatMeasurements.length > 0;
                return (
                  <div
                    key={p.id}
                    className={\`min-w-0 flex items-center gap-2 border rounded p-1.5 \${active ? st.border + '/40' : 'border-[var(--border-strong)]'}\`}
                    title={p.name}
                  >
                    <span className={\`h-1.5 w-1.5 shrink-0 rounded-full \${p.vulnerabilityLevel === 'CRITICAL' ? 'bg-[var(--critical)]' : active ? 'bg-[var(--green-400)]' : 'bg-[var(--border-strong)]'}\`} />
                    <span className="min-w-0 flex-1 text-[10px] text-[var(--text-primary)] leading-tight wrap-break-word">
                      {p.name.toUpperCase().replace(/\\s+/g, '-')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* \u2500\u2500 MAIN GRID \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left 8 cols \u2014 My Places Directory */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="flex justify-between items-center border-b border-[var(--border)] pb-2">
            <h2 className="text-[11px] uppercase tracking-widest text-[var(--text-primary)] font-semibold">My Places Directory</h2>
            <button
              onClick={() => setShowAddPlace(!showAddPlace)}
              className="text-[11px] text-[var(--green-400)] hover:text-[var(--text-primary)] uppercase border border-[var(--border-strong)] px-3 py-1 rounded hover:border-[var(--border-strong)] transition-colors"
            >
              + Add Place
            </button>
          </div>

          {/* Add Place Form */}
          {showAddPlace && (
            <form
              onSubmit={handleAddPlace}
              className="p-4 border border-[var(--border-strong)] bg-[var(--bg-base)] rounded-lg grid grid-cols-2 md:grid-cols-3 gap-3"
            >
              <input name="name" required placeholder="Place name *"
                className="col-span-2 md:col-span-3 px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] rounded focus:outline-none focus:border-[var(--border-strong)]" />
              <input name="population" type="number" placeholder="Population"
                className="px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] rounded focus:outline-none" />
              <input name="areaSqkm" type="number" step="0.01" placeholder="Area km\u00b2"
                className="px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] rounded focus:outline-none" />
              <input name="medianIncome" type="number" placeholder="Median Income"
                className="px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] rounded focus:outline-none" />
              <div className="col-span-2 md:col-span-3 flex gap-2 justify-end">
                <button type="button" onClick={() => setShowAddPlace(false)}
                  className="px-3 py-1.5 text-xs text-[var(--text-secondary)] border border-[var(--border)] rounded hover:border-[var(--border-strong)]">Cancel</button>
                <button type="submit" disabled={isPending}
                  className="px-4 py-1.5 text-xs bg-[var(--green-500)] text-white rounded hover:bg-[var(--green-400)] disabled:opacity-50 transition-colors">Save Place</button>
              </div>
            </form>
          )}

          {/* Places table */}
          <div className="border border-[var(--border)] bg-[var(--bg-surface)] rounded-lg overflow-hidden">
            {places.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-sm text-[var(--text-secondary)] mb-4">No places added yet.</p>
                <button onClick={() => setShowAddPlace(true)}
                  className="text-xs bg-[var(--green-500)] text-white px-4 py-2 rounded hover:bg-[var(--green-400)] transition-colors">Add Place</button>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[var(--bg-base)] border-b border-[var(--border)]">
                    <th className="text-[10px] text-[var(--text-tertiary)] font-normal py-2 px-4 uppercase">Location</th>
                    <th className="text-[10px] text-[var(--text-tertiary)] font-normal py-2 px-4 uppercase">Status</th>
                    <th className="text-[10px] text-[var(--text-tertiary)] font-normal py-2 px-4 uppercase text-center">Trend 24H</th>
                    <th className="text-[10px] text-[var(--text-tertiary)] font-normal py-2 px-4 uppercase text-right">Avg Temp</th>
                    <th className="text-[10px] text-[var(--text-tertiary)] font-normal py-2 px-4 uppercase text-right hidden md:table-cell">Canopy %</th>
                    <th className="text-[10px] text-[var(--text-tertiary)] font-normal py-2 px-4 uppercase text-right hidden md:table-cell">Population</th>
                    <th className="text-[10px] text-[var(--text-tertiary)] font-normal py-2 px-4 uppercase text-center">Map</th>
                  </tr>
                </thead>
                <tbody>
                  {places.map(p => {
                    const st = statusBadge(p.vulnerabilityLevel);
                    const latest = p.heatMeasurements[0];
                    const isExp = expandedPlace === p.id;
                    return (
                      <>
                        <tr
                          key={p.id}
                          className="border-b border-[var(--border)] hover:bg-[var(--bg-elevated)] cursor-pointer h-9"
                          onClick={() => setExpandedPlace(isExp ? null : p.id)}
                        >
                          <td className="py-1 px-4 text-[var(--text-primary)]">{p.name}</td>
                          <td className="py-1 px-4">
                            <span className={\`inline-block \${st.bg} border \${st.border} \${st.text} px-2 py-0.5 text-[9px] uppercase font-bold tracking-widest rounded\`}>
                              {statusLabel(p.vulnerabilityLevel)}
                            </span>
                          </td>
                          <td className="py-1 px-4 text-center">
                            <TrendLine measurements={p.heatMeasurements} level={p.vulnerabilityLevel} />
                          </td>
                          <td className={\`py-1 px-4 text-right \${tempColor(p.vulnerabilityLevel)}\`}>
                            {latest ? \`\${latest.avgTemp.toFixed(1)}\u00b0C\` : '\u2014'}
                          </td>
                          <td className="py-1 px-4 text-right text-[var(--text-primary)] hidden md:table-cell">
                            {latest?.treeCanopyPct != null ? \`\${latest.treeCanopyPct.toFixed(0)}%\` : '\u2014'}
                          </td>
                          <td className="py-1 px-4 text-right text-[var(--text-primary)] hidden md:table-cell">
                            {p.population?.toLocaleString() ?? '\u2014'}
                          </td>
                          <td className="py-1 px-4 text-center">
                            <Link
                              href={\`/dashboard/map?placeId=\${p.id}\`}
                              className="text-[var(--text-tertiary)] hover:text-[var(--green-400)] transition-colors"
                              onClick={e => e.stopPropagation()}
                            >
                              <span className="material-symbols-outlined text-sm">open_in_new</span>
                            </Link>
                          </td>
                        </tr>
                        {isExp && (
                          <tr key={\`\${p.id}-exp\`}>
                            <td colSpan={7} className="px-4 py-3 bg-[var(--bg-base)] border-b border-[var(--border)]">
                              {showAddMeasurement === p.id && (
                                <form
                                  onSubmit={e => handleAddMeasurement(e, p.id)}
                                  className="mb-3 p-3 border border-[var(--border-strong)] bg-[var(--bg-surface)] rounded grid grid-cols-2 md:grid-cols-4 gap-2"
                                >
                                  <input name="date" type="date" required
                                    className="px-2 py-1.5 bg-[var(--bg-elevated)] border border-[var(--border)] text-xs text-[var(--text-primary)] rounded focus:outline-none" />
                                  <input name="avgTemp" type="number" step="0.1" required placeholder="Avg Temp \u00b0C *"
                                    className="px-2 py-1.5 bg-[var(--bg-elevated)] border border-[var(--border)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] rounded focus:outline-none" />
                                  <input name="maxTemp" type="number" step="0.1" required placeholder="Max Temp \u00b0C *"
                                    className="px-2 py-1.5 bg-[var(--bg-elevated)] border border-[var(--border)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] rounded focus:outline-none" />
                                  <input name="minTemp" type="number" step="0.1" placeholder="Min Temp \u00b0C"
                                    className="px-2 py-1.5 bg-[var(--bg-elevated)] border border-[var(--border)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] rounded focus:outline-none" />
                                  <input name="treeCanopyPct" type="number" step="0.1" placeholder="Tree Canopy %"
                                    className="px-2 py-1.5 bg-[var(--bg-elevated)] border border-[var(--border)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] rounded focus:outline-none" />
                                  <input name="imperviousSurfacePct" type="number" step="0.1" placeholder="Impervious Sfc %"
                                    className="px-2 py-1.5 bg-[var(--bg-elevated)] border border-[var(--border)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] rounded focus:outline-none" />
                                  <input name="dataSource" placeholder="Source"
                                    className="px-2 py-1.5 bg-[var(--bg-elevated)] border border-[var(--border)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] rounded focus:outline-none" />
                                  <div className="flex gap-2 items-center">
                                    <button type="submit" disabled={isPending}
                                      className="px-3 py-1.5 text-xs bg-[var(--green-500)] text-white rounded hover:bg-[var(--green-400)] disabled:opacity-50 transition-colors">Save</button>
                                    <button type="button" onClick={() => setShowAddMeasurement(null)}
                                      className="px-3 py-1.5 text-xs text-[var(--text-secondary)]">Cancel</button>
                                  </div>
                                </form>
                              )}
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-[10px] text-[var(--text-tertiary)] uppercase">
                                  {p.heatMeasurements.length} measurements \u00b7 {p.interventions.length} interventions
                                </span>
                                <button
                                  onClick={() => setShowAddMeasurement(showAddMeasurement === p.id ? null : p.id)}
                                  className="text-[10px] text-[var(--green-400)] hover:text-[var(--text-primary)] border border-[var(--border)] px-2 py-0.5 rounded transition-colors"
                                >
                                  + Add Data
                                </button>
                              </div>
                              {p.heatMeasurements.length > 0 ? (
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="border-b border-[var(--border)]">
                                      <th className="py-1 text-left text-[var(--text-tertiary)] font-normal">Date</th>
                                      <th className="py-1 text-right text-[var(--text-tertiary)] font-normal">Avg \u00b0C</th>
                                      <th className="py-1 text-right text-[var(--text-tertiary)] font-normal">Max \u00b0C</th>
                                      <th className="py-1 text-right text-[var(--text-tertiary)] font-normal hidden md:table-cell">Canopy</th>
                                      <th className="py-1 text-left text-[var(--text-tertiary)] font-normal">Source</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {p.heatMeasurements.slice(0, 8).map(m => (
                                      <tr key={m.id} className="border-b border-[var(--border)]/50">
                                        <td className="py-1 text-[var(--text-primary)]">{new Date(m.date).toLocaleDateString()}</td>
                                        <td className="py-1 text-right text-[var(--text-primary)]">{m.avgTemp.toFixed(1)}</td>
                                        <td className="py-1 text-right text-[var(--text-primary)]">{m.maxTemp?.toFixed(1) ?? '\u2014'}</td>
                                        <td className="py-1 text-right text-[var(--text-primary)] hidden md:table-cell">
                                          {m.treeCanopyPct != null ? \`\${m.treeCanopyPct.toFixed(0)}%\` : '\u2014'}
                                        </td>
                                        <td className="py-1">
                                          <span className="px-1.5 py-0.5 bg-[var(--bg-elevated)] text-[var(--text-tertiary)] text-[10px] rounded">{m.dataSource}</span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              ) : (
                                <p className="text-[11px] text-[var(--text-tertiary)]">No measurements yet.</p>
                              )}
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right 4 cols \u2014 Metrics + Completeness */}
        <div className="lg:col-span-4 flex flex-col gap-6">

          {/* Intervention Metrics */}
          <div className="flex flex-col gap-4">
            <h2 className="text-[11px] uppercase tracking-widest text-[var(--text-primary)] font-semibold border-b border-[var(--border)] pb-2">
              Intervention Metrics
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-4 flex flex-col gap-1 border-t-2 border-t-[var(--green-500)]">
                <span className="text-[10px] text-[var(--text-tertiary)] uppercase">Active Projects</span>
                <span className="text-2xl font-semibold text-[var(--green-400)]">{stats.activeInterventions}</span>
              </div>
              <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-4 flex flex-col gap-1">
                <span className="text-[10px] text-[var(--text-tertiary)] uppercase">Completed YTD</span>
                <span className="text-2xl font-semibold text-[var(--text-primary)]">{stats.completedInterventions}</span>
              </div>
              <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-4 flex flex-col gap-1 col-span-2">
                <span className="text-[10px] text-[var(--text-tertiary)] uppercase">Projected Temp Reduction</span>
                <div className="flex items-end gap-2 mt-1">
                  <span className="text-3xl font-bold text-[var(--green-400)]">
                    {stats.totalProjectedReduction > 0 ? \`-\${stats.totalProjectedReduction.toFixed(1)}\u00b0C\` : '\u2014'}
                  </span>
                  <span className="text-sm text-[var(--text-tertiary)] mb-1">if implemented</span>
                </div>
              </div>

              {/* Scenarios bar chart */}
              <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-4 flex flex-col gap-2 col-span-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-[var(--text-tertiary)] uppercase">Scenarios by Status</span>
                  <div className="flex gap-3">
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-[var(--border-strong)] rounded-sm inline-block" />
                      <span className="text-[8px] text-[var(--text-tertiary)]">Draft</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-[var(--green-400)] rounded-sm inline-block" />
                      <span className="text-[8px] text-[var(--text-tertiary)]">Active</span>
                    </div>
                  </div>
                </div>
                <div className="flex h-14 items-end gap-2 mt-2">
                  {scenarios.length > 0 ? (
                    (['DRAFT', 'APPROVED', 'PENDING_REVIEW', 'REJECTED'] as const).map((s, idx) => {
                      const count = scenarios.filter(sc => sc.status === s).length;
                      const pct = scenarios.length > 0 ? count / scenarios.length : 0;
                      const colors = ['bg-[var(--border-strong)]', 'bg-[var(--green-400)]', 'bg-[var(--moderate)]', 'bg-[var(--critical)]'] as const;
                      return (
                        <div key={s} className="flex items-end h-full flex-1" title={\`\${s}: \${count}\`}>
                          <div className={\`w-full \${colors[idx]} min-h-[2px] rounded-t\`} style={{ height: \`\${Math.max(pct * 100, 4)}%\` }} />
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex w-full items-center justify-center">
                      <span className="text-[10px] text-[var(--text-tertiary)]">No scenarios yet</span>
                    </div>
                  )}
                </div>
                {scenarios.length > 0 && (
                  <div className="flex justify-around text-[9px] text-[var(--text-tertiary)]">
                    {['DRAFT', 'APRVD', 'REVW', 'RJCT'].map(s => <span key={s}>{s}</span>)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Data Completeness */}
          <div className="flex flex-col gap-4">
            <h2 className="text-[11px] uppercase tracking-widest text-[var(--text-primary)] font-semibold border-b border-[var(--border)] pb-2">
              Data Completeness
            </h2>
            <div className="flex flex-col gap-4 border border-[var(--border)] bg-[var(--bg-surface)] rounded-lg p-4">
              {([
                { label: 'Surface Temp Layer',       pct: tempLayerPct,          color: 'var(--green-400)' },
                { label: 'Tree Canopy Inventory',    pct: treeCanopyPct2,         color: 'var(--low)' },
                { label: 'Social Vulnerability Idx', pct: completeness.overall,  color: 'var(--moderate)' },
                { label: 'Building Footprints',      pct: boundaryPct,           color: 'var(--high)' },
              ] as const).map(item => (
                <div key={item.label} className="flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-[var(--text-primary)] uppercase">{item.label}</span>
                    <span className="text-xs font-semibold" style={{ color: \`var(\${item.color.replace('var(','').replace(')','')})\` }}>{item.pct}%</span>
                  </div>
                  <div className="w-full h-1 bg-[var(--border)] rounded-full">
                    <div className="h-full rounded-full" style={{ width: \`\${item.pct}%\`, backgroundColor: \`var(\${item.color.replace('var(','').replace(')','')})\` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Reports */}
          {reports.length > 0 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-[11px] uppercase tracking-widest text-[var(--text-primary)] font-semibold border-b border-[var(--border)] pb-2">
                Recent Reports
              </h2>
              <div className="flex flex-col gap-1">
                {reports.slice(0, 4).map(r => (
                  <div key={r.id} className="flex justify-between items-center px-3 py-2 border border-[var(--border)] bg-[var(--bg-surface)] rounded-md">
                    <span className="text-[11px] text-[var(--text-primary)] truncate max-w-[60%]">{r.title}</span>
                    <span className="text-[10px] text-[var(--text-tertiary)]">{new Date(r.generatedAt).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Scenarios */}
          {scenarios.length > 0 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-[11px] uppercase tracking-widest text-[var(--text-primary)] font-semibold border-b border-[var(--border)] pb-2">
                Recent Scenarios
              </h2>
              <div className="flex flex-col gap-1">
                {scenarios.slice(0, 4).map(s => (
                  <Link
                    key={s.id}
                    href={\`/dashboard/scenarios/\${s.id}\`}
                    className="flex justify-between items-center px-3 py-2 border border-[var(--border)] bg-[var(--bg-surface)] rounded-md hover:border-[var(--border-strong)] hover:bg-[var(--bg-elevated)] transition-colors"
                  >
                    <span className="text-[11px] text-[var(--text-primary)] truncate max-w-[60%]">{s.name}</span>
                    <span className="text-[10px] text-[var(--text-tertiary)]">{s.status}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* \u2500\u2500 QUICK ACTIONS FOOTER \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
      <footer className="border-t border-[var(--border)] pt-4 flex flex-wrap gap-3">
        <Link
          href="/dashboard/map"
          className="bg-[var(--green-500)] text-white text-[11px] px-6 py-2 uppercase tracking-widest hover:bg-[var(--green-400)] transition-colors flex items-center gap-2 rounded-md"
        >
          <span className="material-symbols-outlined text-sm">map</span>Go to Map
        </Link>
        <Link
          href="/dashboard/reports"
          className="bg-transparent border border-[var(--border-strong)] text-[var(--text-primary)] text-[11px] px-6 py-2 uppercase tracking-widest hover:border-[var(--green-400)] hover:text-[var(--green-400)] transition-colors flex items-center gap-2 rounded-md"
        >
          <span className="material-symbols-outlined text-sm">summarize</span>Reports
        </Link>
        <Link
          href="/dashboard/data"
          className="bg-transparent border border-[var(--border-strong)] text-[var(--text-primary)] text-[11px] px-6 py-2 uppercase tracking-widest hover:border-[var(--green-400)] hover:text-[var(--green-400)] transition-colors flex items-center gap-2 rounded-md"
        >
          <span className="material-symbols-outlined text-sm">upload_file</span>Import Data
        </Link>
        <Link
          href="/dashboard/scenarios"
          className="ml-auto bg-transparent border border-[var(--border-strong)] text-[var(--text-primary)] text-[11px] px-6 py-2 uppercase tracking-widest hover:border-[var(--green-400)] hover:text-[var(--green-400)] transition-colors flex items-center gap-2 rounded-md"
        >
          <span className="material-symbols-outlined text-sm">science</span>View Scenarios
        </Link>
      </footer>
    </div>
  );
}
`;

const newData = logicPart + newJSX;
fs.writeFileSync(filePath, newData, 'utf8');
console.log('Done! Written', newData.length, 'chars');
