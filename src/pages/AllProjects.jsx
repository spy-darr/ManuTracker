import { useState } from 'react'
import { Plus, UploadCloud, Search } from 'lucide-react'
import { ProgressBar, ProjectStatusBadge, EmptyState } from '../components/UI'
import { fmtDate, calcProgress, calcProjectStatus, isOverdue, DEPTS } from '../lib/utils'

export default function AllProjects({ nav, projects, saveProjects, readonly, profile }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  const filtered = projects.filter(p => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      (p.project_code || '').toLowerCase().includes(q) ||
      (p.name || '').toLowerCase().includes(q) ||
      (p.client || '').toLowerCase().includes(q) ||
      (p.project_engg || '').toLowerCase().includes(q)
    const st = calcProjectStatus(p.steps || {})
    const matchFilter = filter === 'all' || st === filter
    return matchSearch && matchFilter
  })

  function handleDelete(id) {
    if (!window.confirm('Delete this project?')) return
    saveProjects(projects.filter(p => (p.id || p.project_code) !== id))
  }

  const canEdit = !readonly && profile?.role === 'admin'

  return (
    <div>
      <div className="page-head" style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
        <div>
          <div className="page-title">{readonly ? 'ALL PROJECTS' : 'ALL PROJECTS'}</div>
          <div className="page-sub">{projects.length} project{projects.length !== 1 ? 's' : ''} in registry</div>
        </div>
        {canEdit && (
          <div style={{ display:'flex', gap:8 }}>
            <button className="btn-ghost" onClick={() => nav('import')}><UploadCloud size={13} /> Import</button>
            <button className="btn" onClick={() => nav('new_project')}><Plus size={13} /> New</button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:10, marginBottom:18, alignItems:'center' }}>
        <div style={{ position:'relative', flex:'0 0 260px' }}>
          <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--t3)' }} />
          <input
            className="inline-input"
            style={{ width:'100%', paddingLeft:30 }}
            placeholder="Search projects…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {['all','ontrack','delayed','completed'].map(f => (
          <button
            key={f}
            className={filter === f ? 'btn btn-sm' : 'btn-ghost btn-ghost-sm'}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {!filtered.length ? (
        <EmptyState
          icon="📭"
          message={search ? 'No projects match your search' : 'No projects yet'}
          action={canEdit ? '+ Import from Excel' : undefined}
          onAction={() => nav('import')}
        />
      ) : (
        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Project ID</th>
                  <th>Name</th>
                  <th>Client</th>
                  <th>Engineer</th>
                  <th>CDD</th>
                  <th>EDD</th>
                  <th>Progress</th>
                  <th>Status</th>
                  <th>Overdue</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const pct = calcProgress(p.steps || {})
                  const st  = calcProjectStatus(p.steps || {})
                  const ov  = DEPTS.flatMap(d => (p.steps?.[d] || []).filter(s => isOverdue(s.current_date, s.status))).length
                  const pid = p.id || p.project_code

                  return (
                    <tr key={pid} style={{ cursor:'pointer' }} onClick={() => nav('project', { projectId: pid })}>
                      <td className="mono">{p.project_code}</td>
                      <td>
                        <strong>{p.name || p.project_code}</strong>
                        {p.description && <div style={{ fontSize:11, color:'var(--t3)', marginTop:1 }}>{p.description.slice(0,50)}</div>}
                      </td>
                      <td>{p.client || '—'}</td>
                      <td className="mono">{p.project_engg || '—'}</td>
                      <td className="mono">{fmtDate(p.cdd)}</td>
                      <td className="mono">{fmtDate(p.edd)}</td>
                      <td onClick={e => e.stopPropagation()}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div style={{ width:70 }}><ProgressBar pct={pct} /></div>
                          <span style={{ fontFamily:'var(--f-mono)', fontSize:11, color:'var(--t2)', minWidth:28 }}>{pct}%</span>
                        </div>
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <ProjectStatusBadge status={st} flash />
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        {ov > 0
                          ? <span className="badge b-red flash-red" style={{ fontSize:9 }}>⚠ {ov}</span>
                          : <span style={{ color:'var(--green)', fontSize:11 }}>✓</span>
                        }
                      </td>
                      <td onClick={e => e.stopPropagation()} style={{ whiteSpace:'nowrap' }}>
                        <button className="btn btn-sm" style={{ marginRight:4 }} onClick={e => { e.stopPropagation(); nav('project', { projectId: pid }) }}>
                          Open
                        </button>
                        {canEdit && (
                          <button
                            className="btn-ghost btn-ghost-sm"
                            style={{ color:'var(--red)', borderColor:'rgba(255,61,87,0.3)' }}
                            onClick={e => { e.stopPropagation(); handleDelete(pid) }}
                          >✕</button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
