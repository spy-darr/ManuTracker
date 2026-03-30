import { StatCard, ProgressBar, ProjectStatusBadge, DangerBanner, SuccessBanner } from '../components/UI'
import { DEPTS, fmtDate, isOverdue, getDaysLate, calcProgress, calcProjectStatus } from '../lib/utils'

function getAllOverdue(projects) {
  const items = []
  for (const p of projects) for (const d of DEPTS) for (const s of (p.steps?.[d]||[]))
    if (isOverdue(s.current_date, s.status)) items.push({ p, d, s })
  return items
}

// ── Engineer Dashboard ────────────────────────────────────────
export function EngDashboard({ nav, projects }) {
  const ov = getAllOverdue(projects)
  const total = projects.length
  const delayed = projects.filter(p => calcProjectStatus(p.steps||{}) === 'delayed').length
  const ontrack = projects.filter(p => calcProjectStatus(p.steps||{}) === 'ontrack').length

  return (
    <div>
      <div className="page-head">
        <div className="page-title">ENGINEER DASHBOARD</div>
        <div className="page-sub">Project-wide visibility · Overdue tracking</div>
      </div>

      {ov.length > 0
        ? <DangerBanner>
            {ov.length} overdue task{ov.length > 1 ? 's' : ''} across{' '}
            {[...new Set(ov.map(i => i.p.project_code))].length} project{[...new Set(ov.map(i => i.p.project_code))].length !== 1 ? 's' : ''} — contact relevant departments
          </DangerBanner>
        : <SuccessBanner>All tasks on track — no overdue items</SuccessBanner>
      }

      <div className="stats-grid">
        <StatCard label="Projects"      value={total} />
        <StatCard label="Delayed"       value={delayed}   color="var(--red)" />
        <StatCard label="Overdue Tasks" value={ov.length} color="var(--orange)" />
        <StatCard label="On Track"      value={ontrack}   color="var(--green)" />
      </div>

      <div className="card">
        <div className="card-header"><div className="card-title">PROJECT STATUS SUMMARY</div></div>
        {!projects.length ? (
          <div className="empty-state"><div className="icon">📭</div><p>No projects</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>ID</th><th>Name</th><th>Engineer</th><th>CDD</th><th>Progress</th><th>Status</th><th>Overdue Steps</th></tr>
              </thead>
              <tbody>
                {projects.map(p => {
                  const pct = calcProgress(p.steps||{})
                  const st = calcProjectStatus(p.steps||{})
                  const pov = getAllOverdue([p]).length
                  return (
                    <tr key={p.id||p.project_code}>
                      <td className="mono">{p.project_code}</td>
                      <td><strong>{p.name||p.project_code}</strong></td>
                      <td className="mono">{p.project_engg||'—'}</td>
                      <td className="mono">{fmtDate(p.cdd)}</td>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div style={{ width:80 }}><ProgressBar pct={pct} /></div>
                          <span style={{ fontFamily:'var(--f-mono)', fontSize:11, color:'var(--t2)' }}>{pct}%</span>
                        </div>
                      </td>
                      <td><ProjectStatusBadge status={st} /></td>
                      <td>
                        {pov > 0
                          ? <span className="badge b-red flash-red" style={{ fontSize:9 }}>⚠ {pov} overdue</span>
                          : <span style={{ color:'var(--green)', fontSize:12 }}>✓ None</span>
                        }
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Engineer Alerts ───────────────────────────────────────────
export function EngAlerts({ projects }) {
  const items = getAllOverdue(projects)

  return (
    <div>
      <div className="page-head">
        <div className="page-title">OVERDUE ALERTS</div>
        <div className="page-sub">Steps that have missed their deadlines — requires immediate action</div>
      </div>

      {!items.length ? (
        <div className="empty-state">
          <div className="icon" style={{ fontSize:56 }}>✅</div>
          <p>No overdue tasks — all departments are on track</p>
        </div>
      ) : items.map((item, i) => {
        const dl = getDaysLate(item.s.current_date)
        return (
          <div key={i} className="card flash-red" style={{ borderColor:'rgba(255,61,87,0.5)', marginBottom:12 }}>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:20 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:'var(--f-head)', fontSize:18, letterSpacing:0.5, marginBottom:3 }}>{item.p.name || item.p.project_code}</div>
                <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:10 }}>
                  <span style={{ fontFamily:'var(--f-mono)', fontSize:11, color:'var(--t3)' }}>{item.p.project_code}</span>
                  <span className="badge b-muted" style={{ fontSize:9 }}>{item.d}</span>
                  {item.p.project_engg && <span className="badge b-muted" style={{ fontSize:9 }}>{item.p.project_engg}</span>}
                </div>
                <div style={{ fontSize:14, marginBottom:4 }}>
                  Step: <strong>{item.s.name}</strong>
                </div>
                {item.s.action_by && (
                  <div style={{ fontSize:11, color:'var(--t3)', fontFamily:'var(--f-mono)' }}>
                    Responsible: <strong style={{ color:'var(--t2)' }}>{item.s.action_by}</strong>
                  </div>
                )}
                {item.s.note && (
                  <div style={{ fontSize:11, color:'var(--t3)', marginTop:6, fontStyle:'italic', borderLeft:'2px solid var(--b2)', paddingLeft:8 }}>
                    {item.s.note}
                  </div>
                )}
              </div>
              <div style={{ textAlign:'right', flexShrink:0 }}>
                <div style={{ fontFamily:'var(--f-head)', fontSize:48, color:'var(--red)', lineHeight:1 }}>{dl}</div>
                <div style={{ fontFamily:'var(--f-mono)', fontSize:9, color:'var(--t3)', letterSpacing:1, marginTop:2 }}>DAYS OVERDUE</div>
                <div style={{ fontFamily:'var(--f-mono)', fontSize:10, color:'var(--t3)', marginTop:8 }}>
                  Due: {fmtDate(item.s.current_date)}
                </div>
                {item.s.original_date && item.s.original_date !== item.s.current_date && (
                  <div style={{ fontFamily:'var(--f-mono)', fontSize:9, color:'var(--t4)', marginTop:3 }}>
                    Orig: {fmtDate(item.s.original_date)}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default EngDashboard
