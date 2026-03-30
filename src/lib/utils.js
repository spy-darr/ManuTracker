import { format, parseISO, isValid, differenceInDays, addDays } from 'date-fns'

export const DEPTS = ['Marketing','Engineering','Purchase','QAC','Welding','Production','Logistics','Finance']
export const DEPT_COLORS = {
  Marketing:   { bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.35)',  text: '#fbbf24' },
  Engineering: { bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.35)',  text: '#3b82f6' },
  Purchase:    { bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.35)', text: '#10b981' },
  QAC:         { bg: 'rgba(168,85,247,0.12)',  border: 'rgba(168,85,247,0.35)', text: '#a855f7' },
  Welding:     { bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.35)',  text: '#ef4444' },
  Production:  { bg: 'rgba(249,115,22,0.12)',  border: 'rgba(249,115,22,0.35)', text: '#f97316' },
  Logistics:   { bg: 'rgba(20,184,166,0.12)',  border: 'rgba(20,184,166,0.35)', text: '#14b8a6' },
  Finance:     { bg: 'rgba(236,72,153,0.12)',  border: 'rgba(236,72,153,0.35)', text: '#ec4899' },
}

export const STATUS_CONFIG = {
  pending:    { label: 'Pending',     color: '#64748b', bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.25)' },
  inprogress: { label: 'In Progress', color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)',  border: 'rgba(14,165,233,0.3)'  },
  done:       { label: 'Done',        color: '#10b981', bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.3)'  },
  hold:       { label: 'Hold',        color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.3)' },
}

export const PROJECT_STATUS = {
  ontrack:   { label: 'On Track',  color: '#0ea5e9' },
  delayed:   { label: 'Delayed',   color: '#ef4444' },
  completed: { label: 'Completed', color: '#10b981' },
  hold:      { label: 'Hold',      color: '#a78bfa' },
}

export const ROLES = {
  admin:    { label: 'Project Admin', icon: '🛡️',  pw: 'admin123' },
  dept:     { label: 'Department',    icon: '🏭',  pw: 'dept123'  },
  hod:      { label: 'HOD',           icon: '👔',  pw: 'hod123'   },
  engineer: { label: 'Proj. Engineer',icon: '⚙️',  pw: 'eng123'   },
}

// ── Date utilities ────────────────────────────────────────────
export function fmtDate(d) {
  if (!d) return '—'
  try {
    const dt = typeof d === 'string' ? parseISO(d) : d
    if (!isValid(dt)) return d
    return format(dt, 'dd MMM yy')
  } catch { return String(d) }
}

export function fmtDateFull(d) {
  if (!d) return '—'
  try {
    const dt = typeof d === 'string' ? parseISO(d) : d
    if (!isValid(dt)) return d
    return format(dt, 'dd MMM yyyy')
  } catch { return String(d) }
}

export function isOverdue(d, status) {
  if (!d || status === 'done') return false
  try {
    const dt = typeof d === 'string' ? parseISO(d) : d
    return isValid(dt) && dt < new Date()
  } catch { return false }
}

export function getDaysLate(d) {
  if (!d) return 0
  try {
    const dt = typeof d === 'string' ? parseISO(d) : d
    const diff = differenceInDays(new Date(), dt)
    return Math.max(0, diff)
  } catch { return 0 }
}

export function getDaysLeft(d) {
  if (!d) return null
  try {
    const dt = typeof d === 'string' ? parseISO(d) : d
    return differenceInDays(dt, new Date())
  } catch { return null }
}

export function addDaysToDate(d, n) {
  if (!d) return null
  try {
    const dt = typeof d === 'string' ? parseISO(d) : d
    return format(addDays(dt, n), 'yyyy-MM-dd')
  } catch { return null }
}

export function toInputDate(d) {
  if (!d) return ''
  try {
    const dt = typeof d === 'string' ? parseISO(d) : d
    if (!isValid(dt)) return ''
    return format(dt, 'yyyy-MM-dd')
  } catch { return '' }
}

// ── Project helpers ───────────────────────────────────────────
export function calcProjectStatus(steps) {
  const allSteps = DEPTS.flatMap(d => steps[d] || [])
  if (!allSteps.length) return 'ontrack'
  const allDone = allSteps.every(s => s.status === 'done')
  if (allDone) return 'completed'
  const anyOverdue = allSteps.some(s => isOverdue(s.current_date, s.status))
  return anyOverdue ? 'delayed' : 'ontrack'
}

export function calcProgress(steps) {
  const allSteps = DEPTS.flatMap(d => steps[d] || [])
  if (!allSteps.length) return 0
  return Math.round(allSteps.filter(s => s.status === 'done').length / allSteps.length * 100)
}

export function calcDeptProgress(deptSteps) {
  if (!deptSteps?.length) return 0
  return Math.round(deptSteps.filter(s => s.status === 'done').length / deptSteps.length * 100)
}

export function getOverdueSteps(steps) {
  return DEPTS.flatMap(d =>
    (steps[d] || []).filter(s => isOverdue(s.current_date, s.status))
      .map(s => ({ ...s, dept: d }))
  )
}

// ── Local storage helpers (demo mode) ────────────────────────
export function localLoad(key, fallback = null) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback }
}
export function localSave(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch {}
}
