import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { DEMO_MODE, signIn } from '../lib/supabase'
import { DEPTS, ROLES } from '../lib/utils'

export default function Login() {
  const { demoLogin } = useAuth()
  const [role, setRole] = useState('admin')
  const [dept, setDept] = useState('Engineering')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e?.preventDefault()
    setError('')
    setLoading(true)

    if (DEMO_MODE) {
      if (password !== ROLES[role]?.pw) {
        setError('Incorrect password')
        setLoading(false)
        return
      }
      demoLogin(role, role === 'dept' ? dept : null)
    } else {
      const { error: err } = await signIn(email, password)
      if (err) setError(err.message)
    }
    setLoading(false)
  }

  return (
    <div className="login-page">
      <div className="login-bg" />
      <div className="login-grid" />
      <div className="login-card">
        <div className="login-logo">Manu<em>Track</em></div>
        <div className="login-tagline">Manufacturing Project Intelligence · v2.0</div>

        {DEMO_MODE ? (
          <>
            <div className="role-grid">
              {Object.entries(ROLES).map(([key, r]) => (
                <div
                  key={key}
                  className={`role-btn${role === key ? ' selected' : ''}`}
                  onClick={() => setRole(key)}
                >
                  <span className="role-icon">{r.icon}</span>
                  {r.label}
                </div>
              ))}
            </div>

            {role === 'dept' && (
              <div className="fg" style={{ marginBottom:14 }}>
                <label>Department</label>
                <select value={dept} onChange={e => setDept(e.target.value)}>
                  {DEPTS.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
            )}

            <div className="fg" style={{ marginBottom:14 }}>
              <label>Password</label>
              <input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              />
            </div>

            <button
              className="btn"
              style={{ width:'100%', justifyContent:'center', padding:12 }}
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? 'Signing in…' : 'SIGN IN →'}
            </button>
            <div className="login-err">{error}</div>

            <div className="demo-hint">
              DEMO PASSWORDS<br />
              admin → admin123 &nbsp;·&nbsp; dept → dept123<br />
              hod → hod123 &nbsp;·&nbsp; engineer → eng123
            </div>
          </>
        ) : (
          /* Real Supabase login */
          <form onSubmit={handleSubmit}>
            <div className="fg" style={{ marginBottom:14 }}>
              <label>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="fg" style={{ marginBottom:14 }}>
              <label>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <button className="btn" style={{ width:'100%', justifyContent:'center', padding:12 }} disabled={loading}>
              {loading ? 'Signing in…' : 'SIGN IN →'}
            </button>
            <div className="login-err">{error}</div>
          </form>
        )}
      </div>
    </div>
  )
}
