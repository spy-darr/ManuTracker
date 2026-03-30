import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, DEMO_MODE, getCurrentProfile } from '../lib/supabase'
import { localLoad, localSave } from '../lib/utils'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (DEMO_MODE) {
      // Load from localStorage in demo mode
      const savedProfile = localLoad('mt_demo_profile')
      if (savedProfile) { setProfile(savedProfile) }
      setLoading(false)
      return
    }

    // Real Supabase auth
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) loadProfile()
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) loadProfile()
      else { setProfile(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadProfile() {
    setLoading(true)
    const p = await getCurrentProfile()
    setProfile(p)
    setLoading(false)
  }

  // Demo mode login
  function demoLogin(role, dept = null) {
    const p = { id: 'demo-user', email: 'demo@manutrack.com', full_name: 'Demo User', role, dept_id: null, dept_name: dept }
    setProfile(p)
    localSave('mt_demo_profile', p)
  }

  function demoLogout() {
    setProfile(null)
    localStorage.removeItem('mt_demo_profile')
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, demoLogin, demoLogout, reloadProfile: loadProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
