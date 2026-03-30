import { X } from 'lucide-react'
import { STATUS_CONFIG, PROJECT_STATUS, fmtDate, getDaysLate } from '../lib/utils'

// ── Modal ──────────────────────────────────────────────────
export function Modal({ title, subtitle, children, onClose, wide }) {
  return (
    <div className="overlay" onClick={e => { if (e.target === e.currentTarget) onClose?.() }}>
      <div className="modal" style={wide ? { width:820 } : {}}>
        <button className="modal-close" onClick={onClose}><X size={14} /></button>
        <div className="modal-title">{title}</div>
        {subtitle && <div className="modal-sub">{subtitle}</div>}
        {children}
      </div>
    </div>
  )
}

// ── Progress Bar ───────────────────────────────────────────
export function ProgressBar({ pct, thick, color }) {
  const fillColor = color || (pct === 100 ? 'var(--green)' : pct > 60 ? 'var(--a)' : pct > 30 ? 'var(--orange)' : 'var(--red)')
  return (
    <div className={`pbar${thick ? ' pbar-thick' : ''}`}>
      <div className="pfill" style={{ width:`${pct}%`, background:fillColor }} />
    </div>
  )
}

// ── Status badge ───────────────────────────────────────────
export function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending
  return (
    <span className="badge" style={{ background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.border}` }}>
      {cfg.label}
    </span>
  )
}

// ── Project status badge ───────────────────────────────────
export function ProjectStatusBadge({ status, flash }) {
  const cfg = PROJECT_STATUS[status] || PROJECT_STATUS.ontrack
  const cls = `badge ${status==='delayed'?'b-red':status==='completed'?'b-green':status==='hold'?'b-purple':'b-cyan'}${flash && status==='delayed' ? ' flash-red' : ''}`
  return <span className={cls}>{cfg.label}</span>
}

// ── Overdue tag ────────────────────────────────────────────
export function OverdueTag({ date, status }) {
  const days = getDaysLate(date)
  if (!days || status === 'done') return null
  return (
    <span className="badge b-red" style={{ fontSize:9 }}>⚠ {days}d late</span>
  )
}

// ── Stat card ──────────────────────────────────────────────
export function StatCard({ label, value, sub, color }) {
  return (
    <div className="stat-card" style={{ '--accent-color': color }}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}

// ── Empty state ────────────────────────────────────────────
export function EmptyState({ icon = '📭', message, action, onAction }) {
  return (
    <div className="empty-state">
      <div className="icon">{icon}</div>
      <p>{message}</p>
      {action && <button className="btn" onClick={onAction}>{action}</button>}
    </div>
  )
}

// ── Loading spinner ────────────────────────────────────────
export function Spinner({ size = 24 }) {
  return (
    <div style={{ width:size, height:size, border:'2px solid var(--b2)', borderTopColor:'var(--a)', borderRadius:'50%', display:'inline-block' }} className="spinner" />
  )
}

// ── Delay / Info banners ───────────────────────────────────
export function DangerBanner({ children }) {
  return <div className="banner-danger flash-red">⚠ {children}</div>
}
export function InfoBanner({ children }) {
  return <div className="banner-info">ℹ {children}</div>
}
export function SuccessBanner({ children }) {
  return <div className="banner-success">✓ {children}</div>
}

// ── Confirm dialog (uses window.confirm fallback) ──────────
export function useConfirm() {
  return (msg) => window.confirm(msg)
}
