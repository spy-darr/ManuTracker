import { Bell, LogOut, LayoutDashboard, FolderOpen, UploadCloud, Plus, Edit3, BarChart2, AlertTriangle, Eye, Users } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { DEMO_MODE, signOut } from '../lib/supabase'
import { DEPTS, isOverdue, getDaysLate, fmtDate } from '../lib/utils'

const NAV = {
  admin: [
    { id:'dashboard',    icon:LayoutDashboard, label:'Dashboard' },
    { id:'all_projects', icon:FolderOpen,       label:'All Projects' },
    { id:'import',       icon:UploadCloud,      label:'Import Excel' },
    { id:'new_project',  icon:Plus,             label:'New Project' },
  ],
  hod: [
    { id:'hod_overview', icon:BarChart2, label:'Overview' },
    { id:'hod_all',      icon:FolderOpen, label:'All Projects' },
  ],
  engineer: [
    { id:'eng_dashboard', icon:LayoutDashboard, label:'Dashboard' },
    { id:'eng_alerts',    icon:AlertTriangle,   label:'Overdue Alerts' },
  ],
  dept: [
    { id:'dept_dashboard', icon:LayoutDashboard, label:'My Dashboard' },
    { id:'dept_update',    icon:Edit3,           label:'Update Steps' },
  ],
}

function getOverdueItems(projects) {
  const items = []
  for (const p of projects) {
    for (const d of DEPTS) {
      for (const s of (p.steps?.[d] || [])) {
        if (isOverdue(s.current_date, s.status)) {
          items.push({ proj: p, dept: d, step: s })
        }
      }
    }
  }
  return items
}

export default function Layout({ children, page, nav, profile, projects, alertPanelOpen, setAlertPanelOpen }) {
  const { demoLogout } = useAuth()
  const overdueItems = getOverdueItems(projects)
  const navItems = NAV[profile?.role] || []

  async function handleLogout() {
    if (DEMO_MODE) demoLogout()
    else await signOut()
  }

  const roleLabel = {
    admin: 'PROJECT ADMIN',
    hod: 'HEAD OF DEPT',
    engineer: 'PROJ. ENGINEER',
    dept: (profile?.dept_name || 'DEPARTMENT').toUpperCase(),
  }[profile?.role] || 'USER'

  return (
    <div className="app-grid">
      {/* ── Topbar ── */}
      <header className="topbar">
        <div className="logo">Manu<em>Track</em></div>
        <div className="role-chip">{roleLabel}</div>
        {profile?.dept_name && <span style={{ color:'var(--t3)', fontSize:12 }}>·&nbsp;{profile.dept_name}</span>}
        <div className="tb-spacer" />

        {(profile?.role === 'admin' || profile?.role === 'engineer') && (
          <button
            className="bell-btn"
            onClick={() => setAlertPanelOpen(o => !o)}
            title="Overdue alerts"
          >
            <Bell size={18} />
            {overdueItems.length > 0 && (
              <span className="bell-count">{overdueItems.length}</span>
            )}
          </button>
        )}

        {DEMO_MODE && (
          <span style={{ fontFamily:'var(--f-mono)', fontSize:9, color:'var(--orange)', letterSpacing:1, padding:'3px 8px', border:'1px solid rgba(255,150,64,0.3)', borderRadius:3 }}>
            DEMO MODE
          </span>
        )}

        <button className="tb-btn" onClick={handleLogout}>
          <LogOut size={13} />
          Logout
        </button>
      </header>

      {/* ── Sidebar ── */}
      <aside className="sidebar" style={{ position:'relative' }}>
        <div className="nav-section">Navigation</div>
        {navItems.map(item => {
          const Icon = item.icon
          const isActive = page === item.id
          const count = item.id === 'eng_alerts' ? overdueItems.length : 0
          return (
            <div
              key={item.id}
              className={`nav-item${isActive ? ' active' : ''}`}
              onClick={() => nav(item.id)}
            >
              <Icon size={15} />
              {item.label}
              {count > 0 && <span className="nav-badge">{count}</span>}
            </div>
          )
        })}

        {/* Bottom info */}
        <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'16px 20px', borderTop:'1px solid var(--b1)', background:'var(--s1)' }}>
          <div style={{ fontFamily:'var(--f-mono)', fontSize:9, color:'var(--t4)', letterSpacing:1, marginBottom:3 }}>
            {DEMO_MODE ? 'DEMO MODE — localStorage' : 'SUPABASE CONNECTED'}
          </div>
          <div style={{ fontSize:11, color:'var(--t3)' }}>{profile?.email || profile?.full_name || 'User'}</div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="main-area" style={{ position:'relative', zIndex:1 }}>
        {children}
      </main>

      {/* ── Alert Panel ── */}
      <div className={`alert-panel${alertPanelOpen ? ' open' : ''}`}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <div style={{ fontFamily:'var(--f-head)', fontSize:16, letterSpacing:1 }}>
            ⚠ OVERDUE TASKS
          </div>
          <button onClick={() => setAlertPanelOpen(false)} className="btn-ghost btn-ghost-xs">✕</button>
        </div>

        {overdueItems.length === 0 ? (
          <div style={{ color:'var(--t3)', fontSize:13, textAlign:'center', padding:24 }}>
            ✓ No overdue items
          </div>
        ) : overdueItems.map((item, i) => (
          <div key={i} className="al-item" style={{ marginBottom:8 }}>
            <div className="al-proj">{item.proj.name || item.proj.project_code}</div>
            <div style={{ display:'flex', gap:6, alignItems:'center', margin:'3px 0' }}>
              <span className="badge b-muted" style={{ fontSize:9 }}>{item.dept}</span>
            </div>
            <div className="al-step">{item.step.name}</div>
            {item.step.action_by && (
              <div style={{ fontSize:10, color:'var(--t3)', marginTop:2, fontFamily:'var(--f-mono)' }}>by {item.step.action_by}</div>
            )}
            <div className="al-days">
              {getDaysLate(item.step.current_date)}d overdue · Due: {fmtDate(item.step.current_date)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
