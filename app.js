// ============================================================
// ENPRO Project Tracking System — Main Application
// ============================================================

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let currentUser = null;
let userProfile = null;
let alertInterval = null;

// ============================================================
// INITIALIZATION
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    currentUser = session.user;
    await loadUserProfile();
    showApp();
  }
  setupEventListeners();
});

function setupEventListeners() {
  document.getElementById('login-form').addEventListener('submit', handleLogin);
  document.getElementById('logout-btn').addEventListener('click', handleLogout);
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(); });
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => navigateTo(item.dataset.page));
  });
  document.getElementById('project-search')?.addEventListener('input', debounce(renderProjects, 300));
  document.getElementById('project-filter')?.addEventListener('change', renderProjects);
  document.getElementById('btn-add-project')?.addEventListener('click', showProjectForm);
  document.getElementById('btn-add-user')?.addEventListener('click', showUserForm);
  document.getElementById('timeline-project')?.addEventListener('change', renderTimeline);
}

// ============================================================
// AUTH
// ============================================================
async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');
  const btn = document.getElementById('login-btn');
  btn.disabled = true; btn.textContent = 'Signing in...';
  errEl.textContent = '';

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    errEl.textContent = error.message;
    btn.disabled = false; btn.textContent = 'Sign In';
    return;
  }
  currentUser = data.user;
  await loadUserProfile();
  showApp();
  btn.disabled = false; btn.textContent = 'Sign In';
}

async function handleLogout() {
  await supabase.auth.signOut();
  currentUser = null; userProfile = null;
  if (alertInterval) clearInterval(alertInterval);
  document.getElementById('login-screen').classList.add('active');
  document.getElementById('main-app').classList.remove('active');
}

async function loadUserProfile() {
  const { data } = await supabase.from('profiles').select('*').eq('id', currentUser.id).single();
  userProfile = data || { role: 'project_engineer', full_name: currentUser.email, department: null };
}

// ============================================================
// APP INIT
// ============================================================
function showApp() {
  document.getElementById('login-screen').classList.remove('active');
  document.getElementById('main-app').classList.add('active');
  
  // Set user info
  document.getElementById('user-name').textContent = userProfile.full_name || currentUser.email;
  document.getElementById('user-role').textContent = ROLES[userProfile.role]?.label || userProfile.role;
  document.getElementById('user-avatar').textContent = (userProfile.full_name || currentUser.email).charAt(0).toUpperCase();

  // Show admin menu items
  const isAdmin = userProfile.role === 'admin';
  document.querySelectorAll('.admin-only').forEach(el => {
    el.style.display = isAdmin ? '' : 'none';
  });

  navigateTo('dashboard');
  
  // Start alert auto-refresh
  if (alertInterval) clearInterval(alertInterval);
  alertInterval = setInterval(loadAlerts, 30000);
  loadAlerts();
}

// ============================================================
// NAVIGATION
// ============================================================
function navigateTo(page) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelector(`.nav-item[data-page="${page}"]`)?.classList.add('active');
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(`page-${page}`)?.classList.add('active');

  switch(page) {
    case 'dashboard': loadDashboard(); break;
    case 'projects': loadProjects(); break;
    case 'alerts': loadAlerts(); break;
    case 'timeline': loadTimelineProjects(); break;
    case 'admin': renderAdminForm(); break;
    case 'users': loadUsers(); break;
  }
}

// ============================================================
// DASHBOARD
// ============================================================
async function loadDashboard() {
  const { data: projects } = await supabase.from('projects').select('*, project_steps(*)');
  if (!projects) return;

  const now = new Date();
  let total = projects.length, active = 0, delayed = 0, completed = 0;
  
  projects.forEach(p => {
    if (p.status === 'completed') completed++;
    else if (p.status === 'active') {
      active++;
      const hasDelayed = p.project_steps?.some(s => s.deadline && !s.actual_date && new Date(s.deadline) < now);
      if (hasDelayed) delayed++;
    }
  });

  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-active').textContent = active;
  document.getElementById('stat-delayed').textContent = delayed;
  document.getElementById('stat-completed').textContent = completed;

  // Department overview
  const deptDiv = document.getElementById('dept-overview');
  deptDiv.innerHTML = '';
  Object.entries(DEPARTMENTS).forEach(([key, dept]) => {
    let totalSteps = 0, doneSteps = 0;
    projects.forEach(p => {
      (p.project_steps || []).filter(s => s.department === key).forEach(s => {
        totalSteps++;
        if (s.actual_date || s.status === 'completed') doneSteps++;
      });
    });
    const pct = totalSteps ? Math.round((doneSteps / totalSteps) * 100) : 0;
    deptDiv.innerHTML += `
      <div class="dept-card" style="--dept-color:${dept.color}">
        <div style="position:absolute;top:0;left:0;width:4px;height:100%;background:${dept.color}"></div>
        <div class="dept-card-header">
          <span class="dept-card-name">${dept.name}</span>
          <span class="dept-card-count">${doneSteps}/${totalSteps}</span>
        </div>
        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:${dept.color}"></div></div>
        <div class="progress-label">${pct}% complete</div>
      </div>
    `;
  });

  // Recent activity
  const { data: logs } = await supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(10);
  const actDiv = document.getElementById('recent-activity');
  if (!logs || !logs.length) {
    actDiv.innerHTML = '<div class="empty-state">No recent activity</div>';
  } else {
    actDiv.innerHTML = logs.map(l => `
      <div class="activity-item">
        <div class="activity-dot" style="background:${DEPARTMENTS[l.department]?.color || 'var(--accent)'}"></div>
        <span>${escapeHtml(l.description)}</span>
        <span class="activity-time">${timeAgo(l.created_at)}</span>
      </div>
    `).join('');
  }
}

// ============================================================
// PROJECTS
// ============================================================
async function loadProjects() {
  const { data: projects } = await supabase.from('projects').select('*, project_steps(*)').order('created_at', { ascending: false });
  window._projects = projects || [];
  renderProjects();
  
  // Populate timeline select
  const sel = document.getElementById('timeline-project');
  sel.innerHTML = '<option value="">Select Project</option>';
  (projects || []).forEach(p => {
    sel.innerHTML += `<option value="${p.id}">${p.work_order} — ${p.customer || ''}</option>`;
  });
}

function renderProjects() {
  const projects = window._projects || [];
  const search = (document.getElementById('project-search')?.value || '').toLowerCase();
  const filter = document.getElementById('project-filter')?.value || 'all';
  const now = new Date();

  const filtered = projects.filter(p => {
    if (filter !== 'all') {
      if (filter === 'delayed') {
        const hasDelayed = p.project_steps?.some(s => s.deadline && !s.actual_date && s.status !== 'completed' && new Date(s.deadline) < now);
        if (!hasDelayed) return false;
      } else if (p.status !== filter) return false;
    }
    if (search) {
      const hay = `${p.work_order} ${p.customer} ${p.description}`.toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });

  const div = document.getElementById('projects-list');
  if (!filtered.length) {
    div.innerHTML = '<div class="empty-state">No projects found</div>';
    return;
  }

  div.innerHTML = filtered.map(p => {
    const steps = p.project_steps || [];
    const totalS = steps.length, doneS = steps.filter(s => s.actual_date || s.status === 'completed').length;
    const hasDelayed = steps.some(s => s.deadline && !s.actual_date && s.status !== 'completed' && new Date(s.deadline) < now);
    const displayStatus = hasDelayed ? 'delayed' : p.status;

    // Per-department progress
    let deptBars = '';
    Object.entries(DEPARTMENTS).forEach(([key, dept]) => {
      const ds = steps.filter(s => s.department === key);
      if (!ds.length) return;
      const done = ds.filter(s => s.actual_date || s.status === 'completed').length;
      const pct = Math.round((done / ds.length) * 100);
      deptBars += `<div class="dept-progress-row"><span class="dept-label">${dept.name}</span><div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:${dept.color}"></div></div><span class="pct">${pct}%</span></div>`;
    });

    return `
      <div class="project-card" onclick="openProject('${p.id}')">
        <div class="project-card-head">
          <div><div class="project-wo">${escapeHtml(p.work_order)}</div><div class="project-customer">${escapeHtml(p.customer || '')}</div></div>
          <span class="status-pill status-${displayStatus}">${displayStatus}</span>
        </div>
        <div class="project-dates">
          <span>CDD: <strong>${p.cdd ? formatDate(p.cdd) : '—'}</strong></span>
          <span>EDD: <strong>${p.edd ? formatDate(p.edd) : '—'}</strong></span>
        </div>
        <div class="project-progress">${deptBars}</div>
      </div>
    `;
  }).join('');
}

// ============================================================
// PROJECT DETAIL
// ============================================================
async function openProject(id) {
  const { data: project } = await supabase.from('projects').select('*, project_steps(*)').eq('id', id).single();
  if (!project) return;

  const isAdmin = userProfile.role === 'admin';
  const userDept = ROLES[userProfile.role]?.department;
  const steps = project.project_steps || [];
  const now = new Date();

  document.getElementById('modal-title').textContent = `${project.work_order} — ${project.customer || ''}`;
  
  // Build tabs per department
  const deptKeys = Object.keys(DEPARTMENTS);
  let tabsHtml = deptKeys.map((k, i) => `<div class="tab ${i === 0 ? 'active' : ''}" data-tab="${k}">${DEPARTMENTS[k].name}</div>`).join('');
  
  let contentHtml = deptKeys.map((k, i) => {
    const deptSteps = steps.filter(s => s.department === k).sort((a, b) => a.step_order - b.step_order);
    const canEdit = isAdmin || userDept === k;

    let stepsHtml = '';
    if (!deptSteps.length) {
      stepsHtml = '<div class="empty-state">No steps assigned for this department</div>';
    } else {
      stepsHtml = deptSteps.map(s => {
        const isOverdue = s.deadline && !s.actual_date && s.status !== 'completed' && new Date(s.deadline) < now;
        const statusClass = s.status === 'completed' ? 'completed' : isOverdue ? 'overdue' : 'active';
        
        return `
          <div class="step-row" style="border-left:3px solid ${isOverdue ? 'var(--red)' : s.status === 'completed' ? 'var(--green)' : 'var(--border)'}">
            <div>
              <div class="step-name">${escapeHtml(s.step_name)}</div>
              <div style="font-size:.75rem;color:var(--text3);margin-top:2px">
                Deadline: <strong style="color:${isOverdue ? 'var(--red)' : 'var(--text)'}">${s.deadline ? formatDate(s.deadline) : '—'}</strong>
                ${s.actual_date ? ` · Done: <strong style="color:var(--green)">${formatDate(s.actual_date)}</strong>` : ''}
                ${isOverdue ? ' · <span style="color:var(--red);font-weight:700">OVERDUE</span>' : ''}
              </div>
              ${s.remarks ? `<div style="font-size:.75rem;color:var(--text2);margin-top:2px">${escapeHtml(s.remarks)}</div>` : ''}
            </div>
            ${canEdit ? `
              <div style="display:flex;gap:6px;align-items:center">
                ${isAdmin ? `<input type="date" class="form-group" style="padding:4px 8px;font-size:.75rem;width:130px" value="${s.deadline || ''}" onchange="updateStepDeadline('${s.id}','${project.id}',this.value)">` : ''}
                ${s.status !== 'completed' ? `
                  <input type="date" style="padding:4px 8px;font-size:.75rem;background:var(--bg3);border:1px solid var(--border);border-radius:4px;color:var(--text);width:130px" value="${s.actual_date || ''}" onchange="updateStepActual('${s.id}','${project.id}',this.value,'${k}')">
                ` : '<span style="color:var(--green);font-size:.75rem;font-weight:700">✓ Done</span>'}
              </div>
            ` : `
              <div style="font-size:.75rem;color:${statusClass === 'completed' ? 'var(--green)' : statusClass === 'overdue' ? 'var(--red)' : 'var(--text2)'}">
                ${s.status === 'completed' ? '✓ Complete' : isOverdue ? '⚠ Overdue' : 'Pending'}
              </div>
            `}
          </div>
        `;
      }).join('');
    }

    return `<div class="tab-content ${i === 0 ? 'active' : ''}" data-tab="${k}">${stepsHtml}</div>`;
  }).join('');

  // Admin: deadline shift section
  let adminHtml = '';
  if (isAdmin) {
    adminHtml = `
      <div class="form-section">
        <h4>⚙ Admin: Shift All Deadlines</h4>
        <div style="display:flex;gap:10px;align-items:center">
          <input type="number" id="shift-days" placeholder="Days to shift (+/-)" style="padding:8px;background:var(--bg3);border:1px solid var(--border);border-radius:4px;color:var(--text);width:160px">
          <button class="btn btn-secondary btn-sm" onclick="shiftDeadlines('${project.id}')">Apply Shift</button>
          <select id="shift-dept" style="padding:8px;background:var(--bg3);border:1px solid var(--border);border-radius:4px;color:var(--text)">
            <option value="all">All Departments</option>
            ${Object.entries(DEPARTMENTS).map(([k,v]) => `<option value="${k}">${v.name}</option>`).join('')}
          </select>
        </div>
        <p style="font-size:.75rem;color:var(--text3);margin-top:6px">Positive = push forward, Negative = pull back. Only shifts incomplete steps.</p>
      </div>
    `;
  }

  document.getElementById('modal-body').innerHTML = `
    <div class="tabs">${tabsHtml}</div>
    ${contentHtml}
    ${adminHtml}
  `;

  // Tab switching
  document.querySelectorAll('.modal-body .tab, .modal .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.modal .tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.modal .tab-content').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelector(`.modal .tab-content[data-tab="${tab.dataset.tab}"]`)?.classList.add('active');
    });
  });

  openModal();
}

async function updateStepDeadline(stepId, projectId, value) {
  await supabase.from('project_steps').update({ deadline: value || null, updated_at: new Date().toISOString() }).eq('id', stepId);
  await logActivity(projectId, 'Deadline updated', '');
  showToast('Deadline updated', 'success');
  openProject(projectId);
}

async function updateStepActual(stepId, projectId, value, department) {
  const updates = { actual_date: value || null, updated_at: new Date().toISOString() };
  if (value) updates.status = 'completed';
  await supabase.from('project_steps').update(updates).eq('id', stepId);
  
  // Get step name for log
  const { data: step } = await supabase.from('project_steps').select('step_name').eq('id', stepId).single();
  await logActivity(projectId, `Step completed: ${step?.step_name || ''}`, department);
  
  // Check if this delay cascades
  await checkAndCascadeDelay(projectId);
  
  showToast('Step updated', 'success');
  openProject(projectId);
}

async function shiftDeadlines(projectId) {
  const days = parseInt(document.getElementById('shift-days').value);
  const dept = document.getElementById('shift-dept').value;
  if (!days || isNaN(days)) { showToast('Enter valid number of days', 'error'); return; }

  let query = supabase.from('project_steps').select('*').eq('project_id', projectId).is('actual_date', null).neq('status', 'completed');
  if (dept !== 'all') query = query.eq('department', dept);
  
  const { data: steps } = await query;
  if (!steps?.length) { showToast('No pending steps to shift', 'info'); return; }

  for (const s of steps) {
    if (s.deadline) {
      const d = new Date(s.deadline);
      d.setDate(d.getDate() + days);
      await supabase.from('project_steps').update({ deadline: d.toISOString().split('T')[0], updated_at: new Date().toISOString() }).eq('id', s.id);
    }
  }

  // Also shift project EDD
  const { data: proj } = await supabase.from('projects').select('edd').eq('id', projectId).single();
  if (proj?.edd) {
    const ed = new Date(proj.edd);
    ed.setDate(ed.getDate() + days);
    await supabase.from('projects').update({ edd: ed.toISOString().split('T')[0] }).eq('id', projectId);
  }

  await logActivity(projectId, `Admin shifted deadlines by ${days} days (${dept === 'all' ? 'all depts' : DEPARTMENTS[dept]?.name})`, '');
  showToast(`${steps.length} deadlines shifted by ${days} days`, 'success');
  openProject(projectId);
}

async function checkAndCascadeDelay(projectId) {
  const { data: steps } = await supabase.from('project_steps').select('*').eq('project_id', projectId);
  const now = new Date();
  const hasDelay = steps?.some(s => s.deadline && !s.actual_date && s.status !== 'completed' && new Date(s.deadline) < now);
  
  if (hasDelay) {
    await supabase.from('projects').update({ has_delay: true }).eq('id', projectId);
  } else {
    await supabase.from('projects').update({ has_delay: false }).eq('id', projectId);
  }
}

// ============================================================
// ALERTS
// ============================================================
async function loadAlerts() {
  const { data: steps } = await supabase.from('project_steps').select('*, projects(work_order, customer)').not('deadline', 'is', null).is('actual_date', null).neq('status', 'completed').order('deadline');
  
  const now = new Date();
  now.setHours(0,0,0,0);
  const soon = new Date(now); soon.setDate(soon.getDate() + 3);

  const userDept = ROLES[userProfile.role]?.department;
  let filtered = steps || [];
  
  // Filter by department for dept users
  if (userDept) {
    filtered = filtered.filter(s => s.department === userDept);
  }

  const overdue = filtered.filter(s => new Date(s.deadline) < now);
  const dueToday = filtered.filter(s => { const d = new Date(s.deadline); d.setHours(0,0,0,0); return d.getTime() === now.getTime(); });
  const dueSoon = filtered.filter(s => { const d = new Date(s.deadline); return d >= now && d <= soon && d.getTime() !== now.getTime(); });

  // Update badge
  const badge = document.getElementById('alert-badge');
  if (overdue.length > 0) {
    badge.style.display = '';
    badge.textContent = overdue.length;
  } else {
    badge.style.display = 'none';
  }

  const div = document.getElementById('alerts-list');
  const all = [
    ...overdue.map(s => ({ ...s, alertType: 'overdue' })),
    ...dueToday.map(s => ({ ...s, alertType: 'due-today' })),
    ...dueSoon.map(s => ({ ...s, alertType: 'due-soon' }))
  ];

  if (!all.length) {
    div.innerHTML = '<div class="empty-state">🎉 No deadline alerts! Everything is on track.</div>';
    return;
  }

  div.innerHTML = all.map(s => {
    const daysLate = Math.ceil((now - new Date(s.deadline)) / 86400000);
    const icon = s.alertType === 'overdue' ? '🔴' : s.alertType === 'due-today' ? '🟡' : '🔵';
    const label = s.alertType === 'overdue' ? `${daysLate} day${daysLate > 1 ? 's' : ''} overdue` : s.alertType === 'due-today' ? 'Due today' : `Due in ${Math.ceil((new Date(s.deadline) - now) / 86400000)} days`;
    
    return `
      <div class="alert-card ${s.alertType}">
        <div class="alert-icon">${icon}</div>
        <div class="alert-info">
          <div class="alert-title">${escapeHtml(s.step_name)}</div>
          <div class="alert-meta">
            <span>📁 ${escapeHtml(s.projects?.work_order || '')} — ${escapeHtml(s.projects?.customer || '')}</span>
            <span>🏢 ${DEPARTMENTS[s.department]?.name || s.department}</span>
            <span>📅 Deadline: ${formatDate(s.deadline)}</span>
            <span style="font-weight:700;color:${s.alertType === 'overdue' ? 'var(--red)' : s.alertType === 'due-today' ? 'var(--yellow)' : 'var(--blue)'}">${label}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ============================================================
// TIMELINE
// ============================================================
async function loadTimelineProjects() {
  await loadProjects();
}

async function renderTimeline() {
  const projectId = document.getElementById('timeline-project').value;
  const div = document.getElementById('timeline-view');
  if (!projectId) { div.innerHTML = '<div class="empty-state">Select a project to view its timeline</div>'; return; }

  const { data: steps } = await supabase.from('project_steps').select('*').eq('project_id', projectId).order('department').order('step_order');
  if (!steps?.length) { div.innerHTML = '<div class="empty-state">No steps found</div>'; return; }

  const now = new Date();
  let html = '';
  let lastDept = '';

  steps.forEach(s => {
    if (s.department !== lastDept) {
      html += `<div style="margin:20px 0 10px;padding-left:24px"><span style="font-size:.8rem;font-weight:700;color:${DEPARTMENTS[s.department]?.color || 'var(--accent)'};text-transform:uppercase;letter-spacing:1px">${DEPARTMENTS[s.department]?.name || s.department}</span></div>`;
      lastDept = s.department;
    }
    const isDone = s.actual_date || s.status === 'completed';
    const isOverdue = s.deadline && !isDone && new Date(s.deadline) < now;
    const dotClass = isDone ? 'completed' : isOverdue ? 'overdue' : 'pending';

    html += `
      <div class="timeline-item">
        <div class="timeline-dot ${dotClass}"></div>
        <div class="timeline-card">
          <h4>${escapeHtml(s.step_name)}</h4>
          <div class="timeline-dates">
            <span>Deadline: <strong>${s.deadline ? formatDate(s.deadline) : '—'}</strong></span>
            ${isDone ? `<span>Completed: <strong style="color:var(--green)">${formatDate(s.actual_date)}</strong></span>` : ''}
            ${isOverdue ? '<span style="color:var(--red);font-weight:700">⚠ OVERDUE</span>' : ''}
          </div>
        </div>
      </div>
    `;
  });

  div.innerHTML = html;
}

// ============================================================
// ADMIN — PROJECT ONBOARDING
// ============================================================
function renderAdminForm() {
  const div = document.getElementById('admin-content');
  div.innerHTML = `
    <form class="admin-form" id="new-project-form" onsubmit="createProject(event)">
      <h3 style="margin-bottom:20px">Onboard New Project</h3>
      <div class="form-row">
        <div class="form-group"><label>Work Order (WO)</label><input type="text" id="np-wo" required placeholder="P-222040"></div>
        <div class="form-group"><label>Customer</label><input type="text" id="np-customer" placeholder="Customer Name"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>CDD (Contractual Delivery Date)</label><input type="date" id="np-cdd" required></div>
        <div class="form-group"><label>EDD (Expected Delivery Date)</label><input type="date" id="np-edd" required></div>
      </div>
      <div class="form-group"><label>Project Description</label><textarea id="np-desc" rows="2" placeholder="Brief project description..."></textarea></div>
      <div class="form-group"><label>Project Engineer</label><input type="text" id="np-engineer" placeholder="Engineer Name/Initials"></div>

      <div class="form-section">
        <h4>📅 Set Department Deadlines</h4>
        <p style="font-size:.8rem;color:var(--text3);margin-bottom:16px">Set a start and end deadline for each department. Individual step deadlines will be auto-distributed within the range.</p>
        ${Object.entries(DEPARTMENTS).map(([key, dept]) => `
          <div style="margin-bottom:16px;padding:14px;background:var(--bg3);border-radius:var(--radius-sm);border-left:3px solid ${dept.color}">
            <div style="font-weight:700;font-size:.9rem;margin-bottom:10px;color:${dept.color}">${dept.name}</div>
            <div class="form-row">
              <div class="form-group"><label>Start Date</label><input type="date" id="np-${key}-start"></div>
              <div class="form-group"><label>End Date</label><input type="date" id="np-${key}-end"></div>
            </div>
          </div>
        `).join('')}
      </div>

      <button type="submit" class="btn btn-primary btn-full" id="create-project-btn">Create Project & Generate Steps</button>
    </form>
  `;
}

function showProjectForm() {
  navigateTo('admin');
}

async function createProject(e) {
  e.preventDefault();
  const btn = document.getElementById('create-project-btn');
  btn.disabled = true; btn.textContent = 'Creating...';

  const projectData = {
    work_order: document.getElementById('np-wo').value,
    customer: document.getElementById('np-customer').value,
    cdd: document.getElementById('np-cdd').value,
    edd: document.getElementById('np-edd').value,
    description: document.getElementById('np-desc').value,
    project_engineer: document.getElementById('np-engineer').value,
    status: 'active',
    created_by: currentUser.id
  };

  const { data: project, error } = await supabase.from('projects').insert(projectData).select().single();
  if (error) { showToast('Error: ' + error.message, 'error'); btn.disabled = false; btn.textContent = 'Create Project & Generate Steps'; return; }

  // Generate steps
  const stepsToInsert = [];
  Object.entries(DEPARTMENTS).forEach(([key, dept]) => {
    const startEl = document.getElementById(`np-${key}-start`);
    const endEl = document.getElementById(`np-${key}-end`);
    const startDate = startEl?.value ? new Date(startEl.value) : null;
    const endDate = endEl?.value ? new Date(endEl.value) : null;

    dept.steps.forEach((stepName, idx) => {
      let deadline = null;
      if (startDate && endDate && dept.steps.length > 1) {
        const range = endDate - startDate;
        const offset = (range / (dept.steps.length - 1)) * idx;
        const d = new Date(startDate.getTime() + offset);
        deadline = d.toISOString().split('T')[0];
      } else if (startDate) {
        deadline = startDate.toISOString().split('T')[0];
      }

      stepsToInsert.push({
        project_id: project.id,
        department: key,
        step_name: stepName,
        step_order: idx + 1,
        deadline: deadline,
        status: 'pending'
      });
    });
  });

  await supabase.from('project_steps').insert(stepsToInsert);
  await logActivity(project.id, `Project ${projectData.work_order} created`, '');

  showToast('Project created with all department steps!', 'success');
  btn.disabled = false; btn.textContent = 'Create Project & Generate Steps';
  e.target.reset();
  navigateTo('projects');
}

// ============================================================
// USER MANAGEMENT
// ============================================================
async function loadUsers() {
  const { data: users } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
  const div = document.getElementById('users-list');
  if (!users?.length) {
    div.innerHTML = '<div class="empty-state">No users found. Add your first user.</div>';
    return;
  }

  div.innerHTML = `
    <table>
      <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Department</th><th>Created</th></tr></thead>
      <tbody>
        ${users.map(u => `
          <tr>
            <td style="font-weight:600">${escapeHtml(u.full_name || '—')}</td>
            <td style="color:var(--text2)">${escapeHtml(u.email || '—')}</td>
            <td><span class="role-tag">${ROLES[u.role]?.label || u.role}</span></td>
            <td>${u.department ? DEPARTMENTS[u.department]?.name || u.department : '—'}</td>
            <td style="color:var(--text3);font-family:var(--mono);font-size:.8rem">${u.created_at ? formatDate(u.created_at) : '—'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function showUserForm() {
  document.getElementById('modal-title').textContent = 'Add New User';
  document.getElementById('modal-body').innerHTML = `
    <form onsubmit="createUser(event)">
      <div class="form-group"><label>Full Name</label><input type="text" id="nu-name" required></div>
      <div class="form-group"><label>Email</label><input type="email" id="nu-email" required></div>
      <div class="form-group"><label>Password</label><input type="password" id="nu-password" required minlength="6"></div>
      <div class="form-group">
        <label>Role</label>
        <select id="nu-role" required onchange="toggleDeptField()">
          ${Object.entries(ROLES).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('')}
        </select>
      </div>
      <div class="form-group" id="nu-dept-wrap">
        <label>Department</label>
        <select id="nu-dept">
          <option value="">— Auto from role —</option>
          ${Object.entries(DEPARTMENTS).map(([k, v]) => `<option value="${k}">${v.name}</option>`).join('')}
        </select>
      </div>
      <button type="submit" class="btn btn-primary btn-full" id="create-user-btn">Create User</button>
      <div id="user-error" class="error-msg"></div>
    </form>
  `;
  openModal();
}

async function createUser(e) {
  e.preventDefault();
  const btn = document.getElementById('create-user-btn');
  btn.disabled = true; btn.textContent = 'Creating...';
  const errEl = document.getElementById('user-error');

  const email = document.getElementById('nu-email').value;
  const password = document.getElementById('nu-password').value;
  const fullName = document.getElementById('nu-name').value;
  const role = document.getElementById('nu-role').value;
  const dept = document.getElementById('nu-dept').value || ROLES[role]?.department || null;

  // Sign up user via Supabase auth
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
  if (error) {
    errEl.textContent = error.message;
    btn.disabled = false; btn.textContent = 'Create User';
    return;
  }

  // Insert profile
  if (data.user) {
    await supabase.from('profiles').upsert({
      id: data.user.id,
      email: email,
      full_name: fullName,
      role: role,
      department: dept,
      created_at: new Date().toISOString()
    });
  }

  showToast('User created successfully!', 'success');
  closeModal();
  loadUsers();
  btn.disabled = false; btn.textContent = 'Create User';
}

function toggleDeptField() {
  const role = document.getElementById('nu-role').value;
  const dept = ROLES[role]?.department;
  if (dept) document.getElementById('nu-dept').value = dept;
}

// ============================================================
// ACTIVITY LOG
// ============================================================
async function logActivity(projectId, description, department) {
  await supabase.from('activity_log').insert({
    project_id: projectId,
    user_id: currentUser.id,
    user_name: userProfile.full_name || currentUser.email,
    description: description,
    department: department || userProfile.department || '',
    created_at: new Date().toISOString()
  });
}

// ============================================================
// MODAL
// ============================================================
function openModal() { document.getElementById('modal-overlay').classList.add('active'); }
function closeModal() { document.getElementById('modal-overlay').classList.remove('active'); }

// ============================================================
// UTILITIES
// ============================================================
function formatDate(d) {
  if (!d) return '—';
  const date = new Date(d);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function timeAgo(d) {
  const now = new Date(); const date = new Date(d);
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function debounce(fn, ms) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

function showToast(msg, type = 'info') {
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}
