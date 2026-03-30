// ── NewProject ────────────────────────────────────────────────
import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { DEPTS } from '../lib/utils'

export function NewProject({ nav, projects, saveProjects }) {
  const [form, setForm] = useState({
    project_code:'', name:'', client:'', project_engg:'', cdd:'', edd:'', description:''
  })
  const set = (k,v) => setForm(f => ({...f,[k]:v}))

  function submit() {
    if (!form.project_code.trim() || !form.name.trim()) {
      toast.error('Project Code and Name are required')
      return
    }
    if (projects.find(p => p.project_code === form.project_code.trim())) {
      toast.error('Project code already exists')
      return
    }
    const steps = {}
    DEPTS.forEach(d => { steps[d] = [] })
    const p = {
      id: form.project_code + '_' + Date.now(),
      ...form,
      project_code: form.project_code.trim(),
      name: form.name.trim(),
      steps,
      status: 'ontrack',
      createdAt: new Date().toISOString(),
    }
    saveProjects([...projects, p])
    toast.success('Project created!')
    nav('project', { projectId: p.id })
  }

  return (
    <div>
      <div className="page-head">
        <div className="page-title">NEW PROJECT</div>
        <div className="page-sub">Create a project manually and add steps per department</div>
      </div>
      <div className="card" style={{ maxWidth:640 }}>
        <div className="form-row" style={{ marginBottom:14 }}>
          <div className="fg"><label>Project Code *</label><input value={form.project_code} onChange={e=>set('project_code',e.target.value)} placeholder="e.g. P-242001" /></div>
          <div className="fg"><label>Project Name *</label><input value={form.name} onChange={e=>set('name',e.target.value)} placeholder="e.g. Heat Exchanger Unit A" /></div>
        </div>
        <div className="form-row" style={{ marginBottom:14 }}>
          <div className="fg"><label>Client</label><input value={form.client} onChange={e=>set('client',e.target.value)} placeholder="e.g. Air Liquide" /></div>
          <div className="fg"><label>Project Engineer</label><input value={form.project_engg} onChange={e=>set('project_engg',e.target.value)} placeholder="e.g. JSU" /></div>
        </div>
        <div className="form-row" style={{ marginBottom:14 }}>
          <div className="fg"><label>CDD (Customer Due Date)</label><input type="date" value={form.cdd} onChange={e=>set('cdd',e.target.value)} /></div>
          <div className="fg"><label>EDD (Expected Dispatch)</label><input type="date" value={form.edd} onChange={e=>set('edd',e.target.value)} /></div>
        </div>
        <div className="fg" style={{ marginBottom:18 }}>
          <label>Description</label>
          <textarea value={form.description} onChange={e=>set('description',e.target.value)} placeholder="Scope, notes, equipment type…" rows={3} />
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button className="btn" onClick={submit}>Create Project →</button>
          <button className="btn-ghost" onClick={() => nav('all_projects')}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

export default NewProject
