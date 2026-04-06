// ============================================================
// supabase.js - All Supabase API calls
// ============================================================

// Initialize Supabase client (loaded via CDN in HTML)
let _supabase;

function initSupabase() {
  _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  supabase = _supabase;
  return _supabase;
}

// ---- AUTH ----
async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  localStorage.removeItem('currentProfile');
  window.location.href = 'index.html';
}

async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

async function getCurrentProfile() {
  const cached = localStorage.getItem('currentProfile');
  if (cached) return JSON.parse(cached);
  
  const session = await getSession();
  if (!session) return null;
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();
  
  if (error || !data) return null;
  localStorage.setItem('currentProfile', JSON.stringify(data));
  return data;
}

// ---- USERS MANAGEMENT (Admin only) ----
async function createUser(email, password, fullName, role) {
  // Create auth user via admin - requires service role in production
  // For GitHub Pages, we use signUp then update profile
  const { data: authData, error: authErr } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } }
  });
  if (authErr) throw authErr;
  
  // Insert profile
  const { data, error } = await supabase.from('profiles').insert({
    id: authData.user.id,
    full_name: fullName,
    email: email,
    role: role
  }).select().single();
  
  if (error) throw error;
  return data;
}

async function getAllUsers() {
  const { data, error } = await supabase.from('profiles').select('*').order('full_name');
  if (error) throw error;
  return data || [];
}

async function getUsersByRole(role) {
  const { data, error } = await supabase.from('profiles').select('*').eq('role', role);
  if (error) throw error;
  return data || [];
}

// ---- PROJECTS ----
async function getAllProjects() {
  const { data, error } = await supabase
    .from('projects')
    .select('*, created_by_profile:profiles!created_by(full_name)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

async function getProjectById(id) {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

async function createProject(projectData) {
  const profile = await getCurrentProfile();
  const { data, error } = await supabase.from('projects').insert({
    ...projectData,
    created_by: profile.id
  }).select().single();
  if (error) throw error;
  return data;
}

async function updateProject(id, updates) {
  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', id)
    .select().single();
  if (error) throw error;
  return data;
}

async function deleteProject(id) {
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) throw error;
}

// ---- DEPARTMENT TASKS ----
async function getTasksByProject(projectId) {
  const { data, error } = await supabase
    .from('department_tasks')
    .select('*, assigned_profile:profiles!assigned_to(full_name, role), updates:task_updates(count)')
    .eq('project_id', projectId)
    .order('department')
    .order('deadline');
  if (error) throw error;
  return data || [];
}

async function getTasksByDept(department, userId) {
  const { data, error } = await supabase
    .from('department_tasks')
    .select('*, project:projects(project_code, project_name, status, is_delayed)')
    .eq('department', department)
    .eq('assigned_to', userId)
    .order('deadline');
  if (error) throw error;
  return data || [];
}

async function createTask(taskData) {
  const profile = await getCurrentProfile();
  const { data, error } = await supabase.from('department_tasks').insert({
    ...taskData,
    created_by: profile.id
  }).select().single();
  if (error) throw error;
  return data;
}

async function updateTask(id, updates) {
  const { data, error } = await supabase
    .from('department_tasks')
    .update(updates)
    .eq('id', id)
    .select().single();
  if (error) throw error;
  
  // After update, check if project should be marked delayed
  await checkAndUpdateProjectDelay(data.project_id);
  return data;
}

async function deleteTask(id) {
  const { error } = await supabase.from('department_tasks').delete().eq('id', id);
  if (error) throw error;
}

async function checkAndUpdateProjectDelay(projectId) {
  // Check if any task is delayed/overdue
  const today = new Date().toISOString().split('T')[0];
  const { data: overdueTask } = await supabase
    .from('department_tasks')
    .select('id')
    .eq('project_id', projectId)
    .in('status', ['pending', 'in_progress'])
    .lt('deadline', today)
    .limit(1);
  
  const isDelayed = overdueTask && overdueTask.length > 0;
  
  await supabase.from('projects').update({
    is_delayed: isDelayed,
    status: isDelayed ? 'delayed' : 'active'
  }).eq('id', projectId).eq('status', isDelayed ? 'active' : 'delayed');
}

// ---- TASK UPDATES ----
async function addTaskUpdate(taskId, projectId, department, updateText) {
  const profile = await getCurrentProfile();
  const { data, error } = await supabase.from('task_updates').insert({
    task_id: taskId,
    project_id: projectId,
    department: department,
    update_text: updateText,
    updated_by: profile.id
  }).select().single();
  if (error) throw error;
  return data;
}

async function getTaskUpdates(taskId) {
  const { data, error } = await supabase
    .from('task_updates')
    .select('*, updater:profiles!updated_by(full_name)')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// ---- DELAY LOG ----
async function logDelay(projectId, oldEdd, newEdd, reason, department) {
  const profile = await getCurrentProfile();
  const { data, error } = await supabase.from('project_delay_log').insert({
    project_id: projectId,
    old_edd: oldEdd,
    new_edd: newEdd,
    reason: reason,
    delayed_by_department: department,
    changed_by: profile.id
  }).select().single();
  if (error) throw error;
  return data;
}

async function getDelayLog(projectId) {
  const { data, error } = await supabase
    .from('project_delay_log')
    .select('*, changer:profiles!changed_by(full_name)')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// ---- NOTIFICATIONS ----
async function getMyNotifications() {
  const profile = await getCurrentProfile();
  if (!profile) return [];
  
  const { data, error } = await supabase
    .from('notifications')
    .select('*, project:projects(project_code, project_name)')
    .eq('user_id', profile.id)
    .eq('is_read', false)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) return [];
  return data || [];
}

async function markNotifRead(id) {
  await supabase.from('notifications').update({ is_read: true }).eq('id', id);
}

async function markAllNotifsRead() {
  const profile = await getCurrentProfile();
  await supabase.from('notifications').update({ is_read: true }).eq('user_id', profile.id);
}

// ---- DASHBOARD STATS ----
async function getDashboardStats() {
  const [projects, tasks] = await Promise.all([
    supabase.from('projects').select('status, is_delayed'),
    supabase.from('department_tasks').select('status, department, deadline')
  ]);
  
  const today = new Date().toISOString().split('T')[0];
  const ps = projects.data || [];
  const ts = tasks.data || [];
  
  return {
    totalProjects: ps.length,
    activeProjects: ps.filter(p => p.status === 'active').length,
    delayedProjects: ps.filter(p => p.is_delayed).length,
    completedProjects: ps.filter(p => p.status === 'completed').length,
    totalTasks: ts.length,
    overdueTasks: ts.filter(t => t.status !== 'completed' && t.deadline < today).length,
    completedTasks: ts.filter(t => t.status === 'completed').length,
    deptStats: DEPARTMENTS.map(d => ({
      ...d,
      total: ts.filter(t => t.department === d.id).length,
      completed: ts.filter(t => t.department === d.id && t.status === 'completed').length,
      overdue: ts.filter(t => t.department === d.id && t.status !== 'completed' && t.deadline < today).length,
    }))
  };
}

// Realtime subscription helper
function subscribeToProjectUpdates(projectId, callback) {
  return supabase
    .channel(`project-${projectId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'department_tasks',
      filter: `project_id=eq.${projectId}`
    }, callback)
    .subscribe();
}
