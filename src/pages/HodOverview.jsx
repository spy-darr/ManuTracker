import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { StatCard, ProgressBar, ProjectStatusBadge, DangerBanner } from '../components/UI'
import { DEPTS, DEPT_COLORS, fmtDate, isOverdue, calcProgress, calcProjectStatus, calcDeptProgress, getDaysLate } from '../lib/utils'

export default function HodOverview({ nav, projects }) {
  const [expanded, setExpanded] = useState({})
  const toggle = id => setExpanded(e => ({...e, [id]: !e[id]}))

  const total = projects.length
  const delayed = projects.filter(p => calcProjectStatus(p.steps||{}) === 'delayed').length
  const completed = projects.filter(p => calcProjectStatus(p.steps||{}) === 'completed').length
  const overdueCount = projects.reduce((acc, p) =>
    acc + DEPTS.flatMap(d => (p.steps?.[d]||[]).filter(s => isOverdue(s.current_date, s.status))).length, 0)

  return (
    <div>
      <div className="page-head">
        <div className="page-title">HOD OVERVIEW</div>
        <div className="page-sub">Head of Department · Complete visibility across all projects and departments</div>
      </div>

      {delayed > 0 && <DangerBanner>{delayed} project{delayed > 1 ? 's are' : ' is'} delayed · {overdueCount} overdue task{overdueCount > 1 ? 's' : ''}</DangerBanner>}

      <div className="stats-grid">
        <StatCard label="Total Projects" value={total} />
        <StatCard label="Delayed"        value={delayed}   color="var(--red)" />
        <StatCard label="Completed"      value={completed} color="var(--green)" />
        <StatCard label="Overdue Tasks"  value={overdueCount} color="var(--orange)" />
      </div>

      {!projects.length ? (
        <div className="empty-state"><div className="icon">📭</div><p>No projects yet</p></div>
      ) : projects.map(p => {
        const pid = p.id || p.project_code
        const st = calcProjectStatus(p.steps||{})
        const pct = calcProgress(p.steps||{})
        const isOpen = expanded[pid]
        const pOD = DEPTS.flatMap(d => (p.steps?.[d]||[]).filter(s => isOverdue(s.current_date, s.status))).length

        return (
          <div key={pid} className={`card${st==='delayed' ? ' flash-red' : ''}`} style={{ marginBottom:10, cursor:'pointer' }}>
            <div style={{ display:'flex', alignItems:'center', gap:14 }} onClick={() => toggle(pid)}>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:3 }}>
                  <span style={{ fontFamily:'var(--f-head)', fontSize:15, letterSpacing:0.5 }}>{p.name || p.project_code}</span>
                  <span style={{ fontFamily:'var(--f-mono)', fontSize:10, color:'var(--t3)' }}>{p.project_code}</span>
                  {p.project_engg && <span style={{ fontFamily:'var(--f-mono)', fontSize:10, color:'var(--t3)' }}>· {p.project_engg}</span>}
                </div>
                <div style={{ display:'flex', gap:10, fontSize:11, color:'var(--t3)' }}>
                  {p.cdd && <span>CDD: {fmtDate(p.cdd)}</span>}
                  {p.edd && <span>EDD: {fmtDate(p.edd)}</span>}
                </div>
              </div>
              <ProjectStatusBadge status={st} flash />
              {pOD > 0 && <span className="badge b-red" style={{ fontSize:9 }}>⚠ {pOD} overdue</span>}
              <div style={{ width:100 }}><ProgressBar pct={pct} /></div>
              <span style={{ fontFamily:'var(--f-mono)', fontSize:11, color:'var(--t2)', minWidth:30 }}>{pct}%</span>
              <ChevronRight size={14} style={{ color:'var(--t4)', transform: isOpen ? 'rotate(90deg)' : '', transition:'transform 0.2s' }} />
            </div>

            {isOpen && (
              <div style={{ marginTop:16, borderTop:'1px solid var(--b1)', paddingTop:14 }}>
                {/* Dept grid */}
                <div className="hod-grid" style={{ marginBottom:14 }}>
                  {DEPTS.map(d => {
                    const steps = p.steps?.[d] || []
                    const dp = calcDeptProgress(steps)
                    const dOD = steps.filter(s => isOverdue(s.current_date, s.status)).length
                    const clr = DEPT_COLORS[d]
                    return (
                      <div key={d} className={`hod-cell${dOD > 0 ? ' has-overdue' : ''}`}
                        style={{ borderColor: dOD > 0 ? 'rgba(255,61,87,0.4)' : dp === 100 ? 'rgba(0,224,154,0.3)' : '' }}>
                        <div className="hod-cell-label">{d}</div>
                        <div className="hod-cell-val" style={{ color: dp === 100 ? 'var(--green)' : dOD > 0 ? 'var(--red)' : clr?.text }}>{dp}%</div>
                        <div style={{ marginBottom:4 }}><ProgressBar pct={dp} color={dp===100 ? 'var(--green)' : dOD>0 ? 'var(--red)' : clr?.text} /></div>
                        <div className="hod-cell-sub">
                          {steps.filter(s=>s.status==='done').length}/{steps.length} done
                          {dOD > 0 && <span style={{ color:'var(--red)', marginLeft:4 }}>· ⚠{dOD}</span>}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Overdue steps for this project */}
                {pOD > 0 && (
                  <div style={{ background:'rgba(255,61,87,0.05)', border:'1px solid rgba(255,61,87,0.2)', borderRadius:'var(--r-md)', padding:'12px 16px', marginBottom:12 }}>
                    <div style={{ fontFamily:'var(--f-mono)', fontSize:10, color:'var(--red)', letterSpacing:1, marginBottom:8 }}>OVERDUE STEPS</div>
                    {DEPTS.flatMap(d =>
                      (p.steps?.[d]||[])
                        .filter(s => isOverdue(s.current_date, s.status))
                        .map((s, i) => (
                          <div key={`${d}-${i}`} style={{ display:'flex', alignItems:'center', gap:10, padding:'5px 0', borderBottom:'1px solid rgba(255,61,87,0.1)', fontSize:12 }}>
                            <span className="badge b-muted" style={{ fontSize:9 }}>{d}</span>
                            <span style={{ flex:1 }}>{s.name}</span>
                            {s.action_by && <span style={{ fontFamily:'var(--f-mono)', fontSize:10, color:'var(--t3)' }}>{s.action_by}</span>}
                            <span className="badge b-red" style={{ fontSize:9 }}>{getDaysLate(s.current_date)}d late</span>
                          </div>
                        ))
                    )}
                  </div>
                )}

                <button className="btn btn-sm" onClick={() => nav('project', { projectId: pid })}>
                  View Full Detail →
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
