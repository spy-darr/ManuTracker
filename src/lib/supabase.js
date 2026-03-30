import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️  Missing Supabase env vars. Running in demo mode with localStorage.')
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
)

export const DEMO_MODE = !supabaseUrl || supabaseUrl.includes('placeholder')

// ── Auth helpers ─────────────────────────────────────────────
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  return { data, error }
}

export async function signOut() {
  return supabase.auth.signOut()
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export async function getCurrentProfile() {
  const session = await getSession()
  if (!session) return null
  const { data } = await supabase
    .from('user_profiles')
    .select('*, departments(name, seq)')
    .eq('id', session.user.id)
    .single()
  return data
}

// ── Projects ─────────────────────────────────────────────────
export async function fetchProjects() {
  const { data, error } = await supabase
    .from('project_summary')
    .select('*')
    .order('created_at', { ascending: false })
  return { data, error }
}

export async function fetchProject(id) {
  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      project_steps (
        *,
        departments (id, name, seq),
        step_deadline_history (*)
      )
    `)
    .eq('id', id)
    .eq('is_deleted', false)
    .single()
  return { data, error }
}

export async function createProject(payload) {
  const { data, error } = await supabase.from('projects').insert(payload).select().single()
  return { data, error }
}

export async function updateProject(id, payload) {
  const { data, error } = await supabase.from('projects').update(payload).eq('id', id).select().single()
  return { data, error }
}

export async function deleteProject(id) {
  const { error } = await supabase.from('projects').update({ is_deleted: true }).eq('id', id)
  return { error }
}

// ── Steps ─────────────────────────────────────────────────────
export async function createStep(payload) {
  const { data, error } = await supabase.from('project_steps').insert(payload).select().single()
  return { data, error }
}

export async function updateStep(id, payload) {
  const { data, error } = await supabase.from('project_steps').update(payload).eq('id', id).select().single()
  return { data, error }
}

export async function deleteStep(id) {
  const { error } = await supabase.from('project_steps').delete().eq('id', id)
  return { error }
}

export async function bulkInsertSteps(steps) {
  const { data, error } = await supabase.from('project_steps').insert(steps).select()
  return { data, error }
}

// ── Postpone + Cascade (calls DB function) ────────────────────
export async function postponeAndCascade(stepId, newDate, reason, userId) {
  const { data, error } = await supabase.rpc('postpone_step_cascade', {
    p_step_id: stepId,
    p_new_date: newDate,
    p_reason: reason,
    p_user_id: userId,
  })
  return { data, error }
}

// ── History ───────────────────────────────────────────────────
export async function fetchStepHistory(stepId) {
  const { data, error } = await supabase
    .from('step_deadline_history')
    .select('*')
    .eq('step_id', stepId)
    .order('revision', { ascending: true })
  return { data, error }
}

// ── Audit log ─────────────────────────────────────────────────
export async function logAction(projectId, stepId, action, details, userId) {
  await supabase.from('audit_log').insert({
    project_id: projectId,
    step_id: stepId,
    action,
    details,
    user_id: userId,
  })
}

// ── Users ─────────────────────────────────────────────────────
export async function fetchAllUsers() {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*, departments(name)')
    .order('created_at')
  return { data, error }
}

export async function upsertUserProfile(payload) {
  const { data, error } = await supabase
    .from('user_profiles')
    .upsert(payload)
    .select()
    .single()
  return { data, error }
}

// ── Realtime subscription ─────────────────────────────────────
export function subscribeToProject(projectId, onUpdate) {
  return supabase
    .channel(`project:${projectId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'project_steps',
      filter: `project_id=eq.${projectId}`,
    }, onUpdate)
    .subscribe()
}
