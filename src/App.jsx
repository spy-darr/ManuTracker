import { useState, useEffect, useCallback } from 'react'
import { Toaster, toast } from 'react-hot-toast'
import Login from './pages/Login'
import Layout from './components/Layout'
import AdminDashboard from './pages/AdminDashboard'
import AllProjects from './pages/AllProjects'
import ImportProject from './pages/ImportProject'
import NewProject from './pages/NewProject'
import ProjectDetail from './pages/ProjectDetail'
import DeptDashboard from './pages/DeptDashboard'
import DeptUpdate from './pages/DeptUpdate'
import HodOverview from './pages/HodOverview'
import EngDashboard from './pages/EngDashboard'
import EngAlerts from './pages/EngAlerts'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { DEMO_MODE } from './lib/supabase'
import { localLoad, localSave } from './lib/utils'

function AppInner() {
  const { profile, loading } = useAuth()
  const [page, setPage] = useState(null)
  const [pageProps, setPageProps] = useState({})
  const [alertPanelOpen, setAlertPanelOpen] = useState(false)
  const [projects, setProjects] = useState(() => localLoad('mt_projects', []))
  const [refreshKey, setRefreshKey] = useState(0)

  const nav = useCallback((p, props = {}) => {
    setPage(p)
    setPageProps(props)
    setAlertPanelOpen(false)
  }, [])

  useEffect(() => {
    if (!profile) return
    const defaults = {
      admin: 'dashboard',
      hod: 'hod_overview',
      engineer: 'eng_dashboard',
      dept: 'dept_dashboard',
    }
    setPage(prev => prev || defaults[profile.role] || 'dashboard')
  }, [profile])

  const refresh = useCallback(() => setRefreshKey(k => k + 1), [])

  const saveProjects = useCallback((ps) => {
    setProjects(ps)
    localSave('mt_projects', ps)
  }, [])

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', flexDirection:'column', gap:12 }}>
      <div style={{ width:32, height:32, border:'3px solid var(--b2)', borderTopColor:'var(--a)', borderRadius:'50%' }} className="spinner" />
      <div style={{ fontFamily:'var(--f-mono)', fontSize:11, color:'var(--t3)', letterSpacing:2 }}>LOADING</div>
    </div>
  )

  if (!profile) return <Login />

  const ctx = { nav, projects, saveProjects, refresh, refreshKey, profile, DEMO_MODE }

  const renderPage = () => {
    const p = { ...ctx, ...pageProps }
    switch (page) {
      case 'dashboard':     return <AdminDashboard {...p} />
      case 'all_projects':  return <AllProjects {...p} />
      case 'import':        return <ImportProject {...p} />
      case 'new_project':   return <NewProject {...p} />
      case 'project':       return <ProjectDetail {...p} />
      case 'dept_dashboard':return <DeptDashboard {...p} />
      case 'dept_update':   return <DeptUpdate {...p} />
      case 'hod_overview':  return <HodOverview {...p} />
      case 'hod_all':       return <AllProjects {...p} readonly />
      case 'eng_dashboard': return <EngDashboard {...p} />
      case 'eng_alerts':    return <EngAlerts {...p} />
      default:              return <AdminDashboard {...p} />
    }
  }

  return (
    <Layout
      page={page}
      nav={nav}
      profile={profile}
      projects={projects}
      alertPanelOpen={alertPanelOpen}
      setAlertPanelOpen={setAlertPanelOpen}
    >
      {renderPage()}
    </Layout>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: { background: 'var(--s2)', color: 'var(--t1)', border: '1px solid var(--b2)', fontFamily: 'var(--f-body)', fontSize: 13 },
          success: { iconTheme: { primary: 'var(--green)', secondary: '#000' } },
          error:   { iconTheme: { primary: 'var(--red)',   secondary: '#fff' } },
        }}
      />
    </AuthProvider>
  )
}
