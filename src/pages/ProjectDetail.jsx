import { useState, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import { ChevronRight, Plus, Clock, Edit2, Trash2, History, Calendar } from 'lucide-react'
import { Modal, ProgressBar, ProjectStatusBadge, StatusBadge, OverdueTag, DangerBanner, InfoBanner } from '../components/UI'
import {
  DEPTS, DEPT_COLORS, fmtDate, toInputDate, isOverdue, getDaysLate, getDaysLeft,
  addDaysToDate, calcProgress, calcProjectStatus, calcDeptProgress, getOverdueSteps
} from '../lib/utils'
import { localSave } from '../lib/utils'

// ── Step History Modal ──────────────────────────────────────
function HistoryModal({ step, onClose }) {
  const all = [
    { date: step.original_date, label: 'Original Planned', revision: 0 },
    ...(step.history || []),
    ...(step.current_date !== step.original_date && !(step.history || []).find(h => h.date === step.current_date)
      ? [{ date: step.current_date, label: 'Current', revision: 99 }]
      : []),
  ].filter(h => h.date)

  return (
    <Modal title="DEADLINE HISTORY" subtitle={`${step.name}`} onClose={onClose}>
      {all.length <= 1 ? (
        <div style={{ color:'var(--t3)', fontSize:13, textAlign:'center', padding:20 }}>No revision history — deadline unchanged</div>
      ) : all.map((h, i) => {
        const prev = i > 0 ? all[i - 1]?.date : null
        const drift = prev && h.date && h.date !== 'TBC'
          ? Math.ceil((new Date(h.date) - new Date(prev + 'T00:00:00')) / 86400000)
          : 0
        return (
          <div key={i} className="history-line">
            <div className="hist-label">{h.label}</div>
            <div className="hist-date" style={{ color: i === all.length - 1 ? 'var(--a)' : 'var(--t1)' }}>
              {fmtDate(h.date)}
            </div>
            {drift !== 0 ? (
              <div className="hist-drift" style={{ color: drift > 0 ? 'var(--red)' : 'var(--green)' }}>
                {drift > 0 ? '+' : ''}{drift}d
              </div>
            ) : <div className="hist-drift" />}
          </div>
        )
      })}
    </Modal>
  )
}

// ── Postpone + Cascade Modal ────────────────────────────────
function PostponeModal({ project, dept, stepIndex, onClose, onApply }) {
  const step = project.steps[dept][stepIndex]
  const [newDate, setNewDate] = useState(toInputDate(step.current_date) || '')
  const [reason, setReason] = useState('')
  const [preview, setPreview] = useState(null)

  function calcCascade(nd) {
    if (!nd || !step.current_date) return []
    const delta = Math.ceil((new Date(nd) - new Date(step.current_date + 'T00:00:00')) / 86400000)
    if (delta <= 0) return []
    const affected = []
    const deptIdx = DEPTS.indexOf(dept)
    const sameDept = project.steps[dept] || []
    for (let j = stepIndex + 1; j < sameDept.length; j++) {
      const s = sameDept[j]
      if (s.status !== 'done' && s.current_date) {
        affected.push({ dept, idx: j, step: s, oldDate: s.current_date, newDate: addDaysToDate(s.current_date, delta) })
      }
    }
    for (let di = deptIdx + 1; di < DEPTS.length; di++) {
      const d = DEPTS[di];
      (project.steps[d] || []).forEach((s, j) => {
        if (s.status !== 'done' && s.current_date) {
          affected.push({ dept: d, idx: j, step: s, oldDate: s.current_date, newDate: addDaysToDate(s.current_date, delta) })
        }
      })
    }
    return affected
  }

  const affected = newDate ? calcCascade(newDate) : []

  function handleApply() {
    if (!newDate) { toast.error('Please select a new date'); return }
    onApply(dept, stepIndex, newDate, reason, affected)
    onClose()
  }

  return (
    <Modal title="POSTPONE STEP + CASCADE" subtitle={step.name} onClose={onClose}>
      <div className="banner-info" style={{ marginBottom:16 }}>
        Current deadline: <strong>{fmtDate(step.current_date)}</strong>
        &nbsp;· All downstream steps will auto-shift by the same number of days.
      </div>

      <div className="form-row" style={{ marginBottom:14 }}>
        <div className="fg">
          <label>New Deadline *</label>
          <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} />
        </div>
        <div className="fg">
          <label>Reason / Note</label>
          <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Why is this being rescheduled?" />
        </div>
      </div>

      {affected.length > 0 && (
        <>
          <div className="banner-danger" style={{ marginBottom:12 }}>
            ⚠ {affected.length} downstream step{affected.length > 1 ? 's' : ''} will be auto-rescheduled
          </div>
          <div className="inner-scroll" style={{ maxHeight:240 }}>
            {/* Trigger step */}
            <div className="cascade-item" style={{ background:'rgba(255,150,64,0.08)', border:'1px solid rgba(255,150,64,0.25)', marginBottom:5 }}>
              <div className="cascade-step"><strong>{step.name}</strong> ({dept}) — trigger</div>
              <div className="cascade-old">{fmtDate(step.current_date)}</div>
              <div className="cascade-arrow">→</div>
              <div className="cascade-new">{fmtDate(newDate)}</div>
            </div>
            {affected.map((c, i) => (
              <div key={i} className="cascade-item">
                <div className="cascade-step">{c.step.name} <span style={{ color:'var(--t3)' }}>({c.dept})</span></div>
                <div className="cascade-old">{fmtDate(c.oldDate)}</div>
                <div className="cascade-arrow">→</div>
                <div className="cascade-new">{fmtDate(c.newDate)}</div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="modal-footer">
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-success" onClick={handleApply}>
          ✓ Apply {affected.length > 0 ? `All ${affected.length + 1} Changes` : 'Change'}
        </button>
      </div>
    </Modal>
  )
}

// ── Edit Step Modal ─────────────────────────────────────────
function EditStepModal({ project, dept, stepIndex, onClose, onSave, onDelete }) {
  const step = project.steps[dept][stepIndex]
  const [form, setForm] = useState({
    name: step.name,
    action_by: step.action_by || '',
    status: step.status,
    original_date: toInputDate(step.original_date) || '',
    current_date: toInputDate(step.current_date) || '',
    note: step.note || '',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <Modal title="EDIT STEP" subtitle={`${project.project_code} · ${dept}`} onClose={onClose}>
      <div className="fg" style={{ marginBottom:14 }}>
        <label>Step Name *</label>
        <input value={form.name} onChange={e => set('name', e.target.value)} />
      </div>
      <div className="form-row" style={{ marginBottom:14 }}>
        <div className="fg">
          <label>Action By</label>
          <input value={form.action_by} onChange={e => set('action_by', e.target.value)} placeholder="e.g. MDR" />
        </div>
        <div className="fg">
          <label>Status</label>
          <select value={form.status} onChange={e => set('status', e.target.value)}>
            <option value="pending">Pending</option>
            <option value="inprogress">In Progress</option>
            <option value="done">Done</option>
            <option value="hold">Hold</option>
          </select>
        </div>
      </div>
      <div className="form-row" style={{ marginBottom:14 }}>
        <div className="fg">
          <label>Original Planned Date</label>
          <input type="date" value={form.original_date} onChange={e => set('original_date', e.target.value)} />
        </div>
        <div className="fg">
          <label>Current Deadline</label>
          <input type="date" value={form.current_date} onChange={e => set('current_date', e.target.value)} />
        </div>
      </div>
      <div className="fg" style={{ marginBottom:14 }}>
        <label>Note / Remark</label>
        <textarea value={form.note} onChange={e => set('note', e.target.value)} rows={3} />
      </div>
      <div className="modal-footer">
        <button className="btn-ghost" style={{ color:'var(--red)', borderColor:'rgba(255,61,87,0.4)', marginRight:'auto' }}
          onClick={() => { if (window.confirm('Delete this step?')) { onDelete(); onClose() } }}>
          <Trash2 size={12} /> Delete
        </button>
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn" onClick={() => { onSave(form); onClose() }}>Save Changes</button>
      </div>
    </Modal>
  )
}

// ── Add Step Modal ──────────────────────────────────────────
function AddStepModal({ project, defaultDept, onClose, onAdd }) {
  const [form, setForm] = useState({
    dept: defaultDept || 'Engineering',
    name: '',
    action_by: '',
    original_date: '',
    current_date: '',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <Modal title="ADD STEP" onClose={onClose}>
      <div className="form-row" style={{ marginBottom:14 }}>
        <div className="fg">
          <label>Department</label>
          <select value={form.dept} onChange={e => set('dept', e.target.value)}>
            {DEPTS.map(d => <option key={d}>{d}</option>)}
          </select>
        </div>
        <div className="fg">
          <label>Action By</label>
          <input value={form.action_by} onChange={e => set('action_by', e.target.value)} placeholder="e.g. MDR" />
        </div>
      </div>
      <div className="fg" style={{ marginBottom:14 }}>
        <label>Step Name *</label>
        <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. GA Drawing Submission to Customer" />
      </div>
      <div className="form-row" style={{ marginBottom:14 }}>
        <div className="fg">
          <label>Original Planned Date</label>
          <input type="date" value={form.original_date} onChange={e => set('original_date', e.target.value)} />
        </div>
        <div className="fg">
          <label>Current Deadline</label>
          <input type="date" value={form.current_date} onChange={e => set('current_date', e.target.value || form.original_date)} />
        </div>
      </div>
      <div className="modal-footer">
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn" onClick={() => {
          if (!form.name.trim()) { toast.error('Step name required'); return }
          onAdd(form); onClose()
        }}>Add Step</button>
      </div>
    </Modal>
  )
}

// ── Dept Block ──────────────────────────────────────────────
function DeptBlock({ project, dept, isAdmin, onStatusChange, onPostpone, onEdit, onAdd, onDelete }) {
  const [open, setOpen] = useState(false)
  const steps = project.steps?.[dept] || []
  const pct = calcDeptProgress(steps)
  const hasOverdue = steps.some(s => isOverdue(s.current_date, s.status))
  const clr = DEPT_COLORS[dept] || {}

  return (
    <div className={`dept-block${hasOverdue ? ' has-overdue flash-red' : ''}`}>
      <div className="dept-header" onClick={() => setOpen(o => !o)}>
        <div className="dept-color-dot" style={{ background: clr.text }} />
        <div className="dept-name-label">{dept.toUpperCase()}</div>

        {hasOverdue && <span className="badge b-red" style={{ fontSize:9 }}>⚠ OVERDUE</span>}
        <span className="badge" style={{ background: clr.bg, color: clr.text, border:`1px solid ${clr.border}`, fontSize:10 }}>
          {pct}%
        </span>
        <div style={{ width:80 }}>
          <ProgressBar pct={pct} color={clr.text} />
        </div>
        <span style={{ fontSize:11, color:'var(--t3)', fontFamily:'var(--f-mono)' }}>{steps.length}</span>
        <ChevronRight size={14} className={`dept-chevron${open ? ' open' : ''}`} />
      </div>

      {open && (
        <div className="dept-body">
          {steps.length === 0 ? (
            <div style={{ padding:'16px 18px', color:'var(--t3)', fontSize:13 }}>
              No steps defined.
              {isAdmin && (
                <button className="btn-ghost btn-ghost-xs" style={{ marginLeft:10 }} onClick={() => onAdd(dept)}>
                  <Plus size={10} /> Add
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="step-table-head">
                <span>Step / Action</span>
                <span>Original</span>
                <span>Current</span>
                <span>Revised</span>
                <span>Status</span>
                <span style={{ textAlign:'right' }}>Actions</span>
              </div>
              {steps.map((s, i) => {
                const od = isOverdue(s.current_date, s.status)
                const drift = s.original_date && s.current_date && s.original_date !== s.current_date
                const histLen = (s.history || []).length
                const dl = getDaysLeft(s.current_date)

                return (
                  <div key={i} className={`step-row${od ? ' is-overdue' : ''}`}>
                    {/* Name */}
                    <div>
                      <div className="step-name">{s.name}</div>
                      {s.action_by && <div className="step-by">by {s.action_by}</div>}
                      {od && <OverdueTag date={s.current_date} status={s.status} />}
                    </div>

                    {/* Original date */}
                    <div className={`step-date${drift ? ' original' : ''}`}>
                      {fmtDate(s.original_date)}
                    </div>

                    {/* Current date */}
                    <div className={`step-date${od ? ' overdue' : s.status === 'done' ? ' ok' : ''}`}>
                      {fmtDate(s.current_date)}
                      {!od && s.status !== 'done' && dl !== null && dl >= 0 && (
                        <div style={{ fontSize:9, color:'var(--t3)', marginTop:2 }}>{dl}d left</div>
                      )}
                    </div>

                    {/* History revisions */}
                    <div>
                      {histLen > 0 ? (
                        <button className="btn-ghost btn-ghost-xs" onClick={() => onEdit(dept, i, 'history')}
                          data-tooltip={`${histLen} revision${histLen > 1 ? 's' : ''}`}>
                          <History size={10} /> {histLen}
                        </button>
                      ) : drift ? (
                        <span className="badge b-orange" style={{ fontSize:9 }}>MOVED</span>
                      ) : (
                        <span style={{ color:'var(--t4)', fontSize:10 }}>—</span>
                      )}
                    </div>

                    {/* Status */}
                    <div>
                      {isAdmin ? (
                        <select className="status-sel" value={s.status}
                          onChange={e => onStatusChange(dept, i, e.target.value)}>
                          <option value="pending">Pending</option>
                          <option value="inprogress">In Progress</option>
                          <option value="done">✓ Done</option>
                          <option value="hold">Hold</option>
                        </select>
                      ) : <StatusBadge status={s.status} />}
                    </div>

                    {/* Actions */}
                    <div className="step-actions">
                      {isAdmin && s.current_date && s.current_date !== 'TBC' && (
                        <button className="btn-ghost btn-ghost-xs" style={{ color:'var(--orange)', borderColor:'rgba(255,150,64,0.4)' }}
                          onClick={() => onPostpone(dept, i)} data-tooltip="Postpone + cascade">
                          <Calendar size={10} />
                        </button>
                      )}
                      {isAdmin && (
                        <button className="btn-ghost btn-ghost-xs" onClick={() => onEdit(dept, i, 'edit')}
                          data-tooltip="Edit step">
                          <Edit2 size={10} />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}

              {isAdmin && (
                <div style={{ padding:'10px 18px', borderTop:'1px solid var(--b1)' }}>
                  <button className="btn-ghost btn-ghost-xs" onClick={() => onAdd(dept)}>
                    <Plus size={10} /> Add Step
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main ProjectDetail page ─────────────────────────────────
export default function ProjectDetail({ nav, projects, saveProjects, projectId, profile, readonly }) {
  const isAdmin = !readonly && (profile?.role === 'admin')

  const [modal, setModal] = useState(null) // { type, dept, stepIndex }

  const project = projects.find(p => (p.id || p.project_code) === projectId)

  const updateProjects = useCallback((updFn) => {
    const updated = projects.map(p => (p.id || p.project_code) === projectId ? updFn(p) : p)
    saveProjects(updated)
  }, [projects, projectId, saveProjects])

  if (!project) return (
    <div style={{ textAlign:'center', padding:60, color:'var(--t3)' }}>
      <div style={{ fontSize:40, marginBottom:12 }}>❓</div>
      <p>Project not found</p>
      <button className="btn" style={{ marginTop:16 }} onClick={() => nav('all_projects')}>← Back</button>
    </div>
  )

  const pct = calcProgress(project.steps || {})
  const st  = calcProjectStatus(project.steps || {})
  const overdueSteps = getOverdueSteps(project.steps || {})
  const backPage = profile?.role === 'admin' ? 'all_projects' : 'hod_all'

  // ── handlers ───────────────────────────────────────────────
  function handleStatusChange(dept, idx, val) {
    updateProjects(p => {
      const steps = { ...p.steps }
      steps[dept] = steps[dept].map((s, i) => i === idx
        ? { ...s, status: val, actual_date: val === 'done' ? new Date().toISOString().split('T')[0] : s.actual_date }
        : s
      )
      return { ...p, steps }
    })
    toast.success('Status updated')
  }

  function handlePostpone(dept, idx, newDate, reason, affected) {
    updateProjects(p => {
      const steps = JSON.parse(JSON.stringify(p.steps))
      const s = steps[dept][idx]
      // Record history
      const history = [...(s.history || []), {
        date: s.current_date,
        label: `Rev ${(s.history || []).length + 1}`,
        revision: (s.history || []).length + 1,
      }]
      steps[dept][idx] = { ...s, current_date: newDate, history, note: reason ? `${s.note ? s.note + ' | ' : ''}${reason}` : s.note }

      // Apply cascade
      for (const c of affected) {
        const cs = steps[c.dept][c.idx]
        const cHistory = [...(cs.history || []), {
          date: cs.current_date,
          label: `Cascade Rev ${(cs.history || []).length + 1}`,
          revision: (cs.history || []).length + 1,
        }]
        steps[c.dept][c.idx] = { ...cs, current_date: c.newDate, history: cHistory }
      }
      return { ...p, steps, delayed: true }
    })
    toast.success(`Updated + ${affected.length} step${affected.length !== 1 ? 's' : ''} cascaded`)
  }

  function handleEditSave(dept, idx, form) {
    updateProjects(p => {
      const steps = { ...p.steps }
      const s = steps[dept][idx]
      const newDate = form.current_date
      const history = newDate && newDate !== s.current_date
        ? [...(s.history || []), { date: s.current_date, label: `Rev ${(s.history || []).length + 1}`, revision: (s.history || []).length + 1 }]
        : s.history || []
      steps[dept] = steps[dept].map((step, i) => i === idx
        ? { ...step, ...form, history }
        : step
      )
      return { ...p, steps }
    })
    toast.success('Step saved')
  }

  function handleDelete(dept, idx) {
    updateProjects(p => {
      const steps = { ...p.steps }
      steps[dept] = steps[dept].filter((_, i) => i !== idx)
      return { ...p, steps }
    })
    toast.success('Step deleted')
  }

  function handleAdd(dept, form) {
    updateProjects(p => {
      const steps = { ...p.steps }
      if (!steps[form.dept]) steps[form.dept] = []
      steps[form.dept].push({
        id: Date.now() + Math.random(),
        name: form.name,
        action_by: form.action_by,
        status: 'pending',
        original_date: form.original_date || null,
        current_date: form.current_date || form.original_date || null,
        actual_date: null,
        history: [],
        note: '',
      })
      return { ...p, steps }
    })
    toast.success('Step added')
  }

  function handleMetaUpdate(field, val) {
    updateProjects(p => ({ ...p, [field]: val }))
    toast.success('Updated')
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:4 }}>
        <button className="btn-ghost btn-ghost-sm" onClick={() => nav(backPage)}>← Back</button>
        <div className="page-title" style={{ margin:0 }}>{project.name || project.project_code}</div>
        <ProjectStatusBadge status={st} flash />
      </div>
      <div className="page-sub" style={{ marginBottom:22 }}>
        {project.project_code}
        {project.client && ` · ${project.client}`}
        {project.project_engg && ` · Engg: ${project.project_engg}`}
      </div>

      {overdueSteps.length > 0 && (
        <DangerBanner>
          {overdueSteps.length} overdue step{overdueSteps.length > 1 ? 's' : ''} — project is DELAYED
        </DangerBanner>
      )}

      {/* Progress + Meta */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 260px', gap:14, marginBottom:18 }}>
        <div className="card" style={{ margin:0 }}>
          <div className="card-header"><div className="card-title">📊 OVERALL PROGRESS</div></div>
          <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:18 }}>
            <div style={{ flex:1 }}><ProgressBar pct={pct} thick /></div>
            <div style={{ fontFamily:'var(--f-head)', fontSize:28, letterSpacing:1 }}>{pct}%</div>
          </div>
          <div className="form-row">
            <div>
              <div style={{ fontFamily:'var(--f-mono)', fontSize:9, color:'var(--t3)', letterSpacing:1, marginBottom:5 }}>CDD</div>
              {isAdmin ? (
                <input type="date" className="inline-input" style={{ width:'100%' }}
                  defaultValue={toInputDate(project.cdd) || ''}
                  onBlur={e => handleMetaUpdate('cdd', e.target.value)} />
              ) : <div style={{ fontFamily:'var(--f-mono)', fontSize:13 }}>{fmtDate(project.cdd)}</div>}
            </div>
            <div>
              <div style={{ fontFamily:'var(--f-mono)', fontSize:9, color:'var(--t3)', letterSpacing:1, marginBottom:5 }}>EDD</div>
              {isAdmin ? (
                <input type="date" className="inline-input" style={{ width:'100%' }}
                  defaultValue={toInputDate(project.edd) || ''}
                  onBlur={e => handleMetaUpdate('edd', e.target.value)} />
              ) : <div style={{ fontFamily:'var(--f-mono)', fontSize:13 }}>{fmtDate(project.edd)}</div>}
            </div>
          </div>
        </div>

        {/* Dept mini bars */}
        <div className="card" style={{ margin:0 }}>
          <div className="card-header"><div className="card-title" style={{ fontSize:12 }}>BY DEPARTMENT</div></div>
          {DEPTS.map(d => {
            const dp = calcDeptProgress(project.steps?.[d] || [])
            const dOD = (project.steps?.[d] || []).some(s => isOverdue(s.current_date, s.status))
            const clr = DEPT_COLORS[d]
            return (
              <div key={d} style={{ marginBottom:8 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:3 }}>
                  <span style={{ color: dOD ? 'var(--red)' : 'var(--t2)' }}>{d}{dOD ? ' ⚠' : ''}</span>
                  <span style={{ fontFamily:'var(--f-mono)', color: dp === 100 ? 'var(--green)' : clr?.text }}>{dp}%</span>
                </div>
                <ProgressBar pct={dp} color={dp === 100 ? 'var(--green)' : clr?.text} />
              </div>
            )
          })}
        </div>
      </div>

      {/* Dept Steps */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">📋 DEPARTMENT STEPS</div>
          {isAdmin && (
            <button className="btn-ghost btn-ghost-sm" style={{ marginLeft:'auto' }} onClick={() => setModal({ type:'add' })}>
              <Plus size={12} /> Add Step
            </button>
          )}
        </div>

        {DEPTS.map(dept => (
          <DeptBlock
            key={dept}
            project={project}
            dept={dept}
            isAdmin={isAdmin}
            onStatusChange={handleStatusChange}
            onPostpone={(d, i) => setModal({ type:'postpone', dept:d, stepIndex:i })}
            onEdit={(d, i, t) => setModal({ type: t, dept:d, stepIndex:i })}
            onAdd={(d) => setModal({ type:'add', dept:d })}
            onDelete={(d, i) => { handleDelete(d, i) }}
          />
        ))}
      </div>

      {isAdmin && (
        <div style={{ display:'flex', gap:8, marginTop:4 }}>
          <button className="btn-ghost btn-ghost-sm" style={{ color:'var(--red)', borderColor:'rgba(255,61,87,0.4)' }}
            onClick={() => {
              if (window.confirm('Delete this project? This cannot be undone.')) {
                saveProjects(projects.filter(p => (p.id || p.project_code) !== projectId))
                nav('all_projects')
                toast.success('Project deleted')
              }
            }}>
            <Trash2 size={12} /> Delete Project
          </button>
        </div>
      )}

      {/* Modals */}
      {modal?.type === 'history' && (
        <HistoryModal step={project.steps[modal.dept][modal.stepIndex]} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'postpone' && (
        <PostponeModal project={project} dept={modal.dept} stepIndex={modal.stepIndex}
          onClose={() => setModal(null)}
          onApply={handlePostpone} />
      )}
      {modal?.type === 'edit' && (
        <EditStepModal project={project} dept={modal.dept} stepIndex={modal.stepIndex}
          onClose={() => setModal(null)}
          onSave={(form) => handleEditSave(modal.dept, modal.stepIndex, form)}
          onDelete={() => handleDelete(modal.dept, modal.stepIndex)} />
      )}
      {modal?.type === 'add' && (
        <AddStepModal project={project} defaultDept={modal.dept}
          onClose={() => setModal(null)}
          onAdd={handleAdd} />
      )}
    </div>
  )
}
