import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { Modal } from '../components/UI'
import { StatCard, ProgressBar, StatusBadge, DangerBanner, SuccessBanner } from '../components/UI'
import { DEPTS, fmtDate, isOverdue, getDaysLate, getDaysLeft, calcDeptProgress } from '../lib/utils'

// ── DeptDashboard ────────────────────────────────────────────
export function DeptDashboard({ projects, profile }) {
  const dept = profile?.dept_name || 'Engineering'

  const myProjects = projects.filter(p => (p.steps?.[dept]?.length || 0) > 0)
  const allSteps = myProjects.flatMap(p => p.steps?.[dept] || [])
  const overdueSteps = allSteps.filter(s => isOverdue(s.current_date, s.status))
  const doneCount = allSteps.filter(s => s.status === 'done').length
  const pendingCount = allSteps.filter(s => s.status !== 'done').length

  return (
    <div>
      <div className="page-head">
        <div className="page-title">{dept.toUpperCase()}</div>
        <div className="page-sub">Department overview across all active projects</div>
      </div>

      {overdueSteps.length > 0
        ? <DangerBanner>{overdueSteps.length} overdue step{overdueSteps.length > 1 ? 's' : ''} in {dept} — immediate action required</DangerBanner>
        : <SuccessBanner>No overdue items in {dept}</SuccessBanner>
      }

      <div className="stats-grid">
        <StatCard label="Projects"  value={myProjects.length} />
        <StatCard label="Overdue"   value={overdueSteps.length} color="var(--red)" />
        <StatCard label="Done"      value={doneCount}  color="var(--green)" />
        <StatCard label="Pending"   value={pendingCount} color="var(--orange)" />
      </div>

      {!myProjects.length ? (
        <div className="empty-state"><div className="icon">📭</div><p>No projects assigned to {dept} yet</p></div>
      ) : myProjects.map(p => {
        const steps = p.steps?.[dept] || []
        const dp = calcDeptProgress(steps)
        const hasOD = steps.some(s => isOverdue(s.current_date, s.status))
        return (
          <div key={p.id || p.project_code} className={`card${hasOD ? ' flash-red' : ''}`}>
            <div className="card-header">
              <div className="card-title">{p.name || p.project_code}
                <span style={{ fontFamily:'var(--f-mono)', fontSize:11, color:'var(--t3)', fontWeight:400, marginLeft:8 }}>{p.project_code}</span>
              </div>
              <span className="badge b-muted" style={{ marginLeft:'auto', fontFamily:'var(--f-mono)' }}>{dp}% complete</span>
            </div>
            <div style={{ marginBottom:10 }}><ProgressBar pct={dp} thick /></div>
            {steps.map((s, i) => {
              const od = isOverdue(s.current_date, s.status)
              const dl = getDaysLeft(s.current_date)
              return (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'8px 0', borderBottom:'1px solid var(--b1)' }}>
                  <div style={{ flex:1, fontSize:13, fontWeight: od ? 600 : 400, color: od ? 'var(--red)' : 'var(--t1)' }}>
                    {s.name}
                    {s.action_by && <span style={{ fontSize:10, color:'var(--t3)', marginLeft:8, fontFamily:'var(--f-mono)' }}>by {s.action_by}</span>}
                  </div>
                  <div style={{ fontFamily:'var(--f-mono)', fontSize:10, color: od ? 'var(--red)' : 'var(--t2)', textAlign:'right' }}>
                    {fmtDate(s.current_date)}
                    {od && <div style={{ fontSize:9 }}>⚠ {getDaysLate(s.current_date)}d late</div>}
                    {!od && dl !== null && s.status !== 'done' && <div style={{ fontSize:9, color:'var(--t3)' }}>{dl >= 0 ? `${dl}d left` : 'overdue'}</div>}
                  </div>
                  <StatusBadge status={s.status} />
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

// ── DeptUpdate ───────────────────────────────────────────────
export function DeptUpdate({ projects, saveProjects, profile }) {
  const dept = profile?.dept_name || 'Engineering'
  const [noteModal, setNoteModal] = useState(null) // { projId, idx, current }

  const myProjects = projects.filter(p => (p.steps?.[dept]?.length || 0) > 0)

  function changeStatus(projId, idx, val) {
    const updated = projects.map(p => {
      if ((p.id || p.project_code) !== projId) return p
      const steps = { ...p.steps }
      steps[dept] = steps[dept].map((s, i) => i === idx
        ? { ...s, status: val, actual_date: val === 'done' ? new Date().toISOString().split('T')[0] : s.actual_date }
        : s
      )
      return { ...p, steps }
    })
    saveProjects(updated)
    toast.success('Status updated')
  }

  function saveNote(projId, idx, note) {
    const updated = projects.map(p => {
      if ((p.id || p.project_code) !== projId) return p
      const steps = { ...p.steps }
      steps[dept] = steps[dept].map((s, i) => i === idx ? { ...s, note } : s)
      return { ...p, steps }
    })
    saveProjects(updated)
    setNoteModal(null)
    toast.success('Note saved')
  }

  return (
    <div>
      <div className="page-head">
        <div className="page-title">UPDATE STEPS</div>
        <div className="page-sub">{dept} · Mark steps complete and add notes</div>
      </div>

      {!myProjects.length ? (
        <div className="empty-state"><div className="icon">📭</div><p>No projects assigned to {dept}</p></div>
      ) : myProjects.map(p => {
        const steps = p.steps?.[dept] || []
        const pid = p.id || p.project_code
        return (
          <div key={pid} className="card">
            <div className="card-header">
              <div className="card-title">{p.name || p.project_code}
                <span style={{ fontFamily:'var(--f-mono)', fontSize:11, color:'var(--t3)', fontWeight:400, marginLeft:8 }}>{p.project_code}</span>
              </div>
            </div>
            {steps.map((s, i) => {
              const od = isOverdue(s.current_date, s.status)
              const dl = getDaysLeft(s.current_date)
              return (
                <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 150px 120px 56px', gap:12, alignItems:'center', padding:'11px 0', borderBottom:'1px solid var(--b1)' }}>
                  <div>
                    <div style={{ fontWeight:500, fontSize:13 }}>{s.name}</div>
                    {s.note && <div style={{ fontSize:11, color:'var(--t3)', marginTop:2, fontStyle:'italic' }}>{s.note}</div>}
                  </div>
                  <div style={{ fontFamily:'var(--f-mono)', fontSize:10, color: od ? 'var(--red)' : 'var(--t2)' }}>
                    {fmtDate(s.current_date) || 'No deadline'}
                    {od && <div style={{ fontSize:9 }}>⚠ {getDaysLate(s.current_date)}d late</div>}
                    {!od && dl !== null && s.status !== 'done' && <div style={{ fontSize:9, color:'var(--t3)' }}>{dl >= 0 ? `${dl}d left` : ''}</div>}
                  </div>
                  <select className="status-sel" value={s.status} onChange={e => changeStatus(pid, i, e.target.value)}>
                    <option value="pending">Pending</option>
                    <option value="inprogress">In Progress</option>
                    <option value="done">✓ Done</option>
                    <option value="hold">Hold</option>
                  </select>
                  <button className="btn-ghost btn-ghost-xs" onClick={() => setNoteModal({ projId:pid, idx:i, current:s.note||'' })}>
                    Note
                  </button>
                </div>
              )
            })}
          </div>
        )
      })}

      {noteModal && (
        <NoteModal
          current={noteModal.current}
          onClose={() => setNoteModal(null)}
          onSave={note => saveNote(noteModal.projId, noteModal.idx, note)}
        />
      )}
    </div>
  )
}

function NoteModal({ current, onClose, onSave }) {
  const [note, setNote] = useState(current)
  return (
    <Modal title="ADD NOTE" onClose={onClose}>
      <div className="fg" style={{ marginBottom:14 }}>
        <label>Note / Remark</label>
        <textarea value={note} onChange={e => setNote(e.target.value)} rows={4} placeholder="Enter update, issue, or remark…" />
      </div>
      <div className="modal-footer">
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn" onClick={() => onSave(note)}>Save Note</button>
      </div>
    </Modal>
  )
}

export default DeptDashboard
