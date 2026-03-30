import { useMemo } from 'react'
import { Plus, UploadCloud, TrendingUp } from 'lucide-react'
import { StatCard, ProgressBar, ProjectStatusBadge, DangerBanner, SuccessBanner } from '../components/UI'
import { DEPTS, fmtDate, isOverdue, calcProgress, calcProjectStatus, getDaysLate } from '../lib/utils'

function getOverdue(projects) {
  const items = []
  for (const p of projects) for (const d of DEPTS) for (const s of (p.steps?.[d] || []))
    if (isOverdue(s.current_date, s.status)) items.push({ p, d, s })
  return items
}

export default function AdminDashboard({ nav, projects }) {
  const overdueItems = useMemo(() => getOverdue(projects), [projects])
  const total = projects.length
  const delayed   = projects.filter(p => calcProjectStatus(p.steps || {}) === 'delayed').length
  const ontrack   = projects.filter(p => calcProjectStatus(p.steps || {}) === 'ontrack').length
  const completed = projects.filter(p => calcProjectStatus(p.steps || {}) === 'completed').length

  return (
    <div>
      <div className="page-head" style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
        <div>
          <div className="page-title">DASHBOARD</div>
          <div className="page-sub">
            {new Date().toLocaleDateString('en-IN', { weekday:'long', day:'2-digit', month:'long', year:'numeric' })}
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn-ghost" onClick={() => nav('import')}>
            <UploadCloud size={13} /> Import Excel
          </button>
          <button className="btn" onClick={() => nav('new_project')}>
            <Plus size={13} /> New Project
          </button>
        </div>
      </div>

      {overdueItems.length > 0
        ? <DangerBanner>
            {overdueItems.length} overdue task{overdueItems.length > 1 ? 's' : ''} across{' '}
            {[...new Set(overdueItems.map(i => i.p.project_code || i.p.id))].length} project(s) require immediate attention
          </DangerBanner>
        : <SuccessBanner>All tasks are currently on track — no overdue items</SuccessBanner>
      }

      <div className="stats-grid">
        <StatCard label="Total Projects" value={total}     color="var(--a)"     />
        <StatCard label="On Track"       value={ontrack}   color="var(--green)" />
        <StatCard label="Delayed"        value={delayed}   color="var(--red)"   />
        <StatCard label="Completed"      value={completed} color="var(--purple)"/>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">📁 RECENT PROJECTS</div>
          <button className="btn-ghost btn-ghost-sm" onClick={() => nav('all_projects')}>View All →</button>
        </div>

        {!projects.length ? (
          <div className="empty-state">
            <div className="icon">📭</div>
            <p>No projects yet.</p>
            <button className="btn" onClick={() => nav('import')}>
              <UploadCloud size={13} /> Import from Excel
            </button>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Project ID</th>
                  <th>Name</th>
                  <th>Engineer</th>
                  <th>CDD</th>
                  <th>EDD</th>
                  <th>Progress</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {projects.slice(-10).reverse().map(p => {
                  const pct = calcProgress(p.steps || {})
                  const st  = calcProjectStatus(p.steps || {})
                  const ov  = getOverdue([p]).length
                  return (
                    <tr key={p.id || p.project_code}>
                      <td className="mono">{p.project_code}</td>
                      <td>
                        <strong>{p.name || p.project_code}</strong>
                        {p.client && <div style={{ fontSize:11, color:'var(--t3)' }}>{p.client}</div>}
                      </td>
                      <td className="mono">{p.project_engg || '—'}</td>
                      <td className="mono">{fmtDate(p.cdd)}</td>
                      <td className="mono">{fmtDate(p.edd)}</td>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          <div style={{ width:80 }}><ProgressBar pct={pct} /></div>
                          <span style={{ fontSize:11, fontFamily:'var(--f-mono)', color:'var(--t2)' }}>{pct}%</span>
                        </div>
                      </td>
                      <td>
                        <ProjectStatusBadge status={st} flash />
                        {ov > 0 && <span className="badge b-red" style={{ marginLeft:4, fontSize:9 }}>⚠ {ov}</span>}
                      </td>
                      <td>
                        <button className="btn btn-sm" onClick={() => nav('project', { projectId: p.id || p.project_code })}>
                          Open
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {overdueItems.length > 0 && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">⚠ OVERDUE STEPS</div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Project</th><th>Department</th><th>Step</th><th>Responsible</th><th>Due</th><th>Overdue By</th></tr>
              </thead>
              <tbody>
                {overdueItems.slice(0, 8).map((item, i) => (
                  <tr key={i}>
                    <td className="mono">{item.p.project_code}</td>
                    <td><span className="badge b-muted" style={{ fontSize:9 }}>{item.d}</span></td>
                    <td style={{ fontWeight:500 }}>{item.s.name}</td>
                    <td className="mono">{item.s.action_by || '—'}</td>
                    <td className="mono" style={{ color:'var(--red)' }}>{fmtDate(item.s.current_date)}</td>
                    <td><span className="badge b-red">{getDaysLate(item.s.current_date)}d</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
