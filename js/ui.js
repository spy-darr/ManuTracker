// ============================================================
// ui.js - Shared UI helpers
// ============================================================

function showToast(message, type = 'success') {
  const existing = document.getElementById('toast-container');
  if (!existing) {
    const c = document.createElement('div');
    c.id = 'toast-container';
    c.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:8px;';
    document.body.appendChild(c);
  }
  
  const toast = document.createElement('div');
  const colors = { success:'#10b981', error:'#ef4444', warning:'#f59e0b', info:'#3b82f6' };
  toast.style.cssText = `
    background: ${colors[type] || colors.info};
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 240px;
    max-width: 380px;
    animation: slideIn 0.3s ease;
  `;
  toast.innerHTML = `<span>${message}</span>`;
  
  const style = document.createElement('style');
  style.textContent = `@keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}`;
  document.head.appendChild(style);
  
  document.getElementById('toast-container').appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

function showLoader(container) {
  if (container) {
    container.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;padding:40px;gap:12px;color:#6b7280;">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12a9 9 0 11-6.219-8.56" stroke-linecap="round">
            <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
          </path>
        </svg>
        <span>Loading...</span>
      </div>`;
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const target = new Date(dateStr);
  const diff = Math.ceil((target - today) / (1000*60*60*24));
  return diff;
}

function deadlineBadge(dateStr, status) {
  if (status === 'completed') return `<span class="badge badge-completed">Completed</span>`;
  const days = daysUntil(dateStr);
  if (days === null) return '';
  if (days < 0) return `<span class="badge badge-overdue">⚠ ${Math.abs(days)}d overdue</span>`;
  if (days === 0) return `<span class="badge badge-today">Due Today</span>`;
  if (days <= 3) return `<span class="badge badge-soon">${days}d left</span>`;
  return `<span class="badge badge-ok">${days}d left</span>`;
}

function statusBadge(status) {
  const labels = {
    pending: '⏳ Pending',
    in_progress: '🔄 In Progress',
    completed: '✅ Completed',
    delayed: '🚨 Delayed',
    on_hold: '⏸ On Hold'
  };
  return `<span class="status-badge status-${status}">${labels[status] || status}</span>`;
}

function deptBadge(deptId) {
  const dept = DEPARTMENTS.find(d => d.id === deptId);
  if (!dept) return deptId;
  return `<span class="dept-badge" style="background:${dept.color}20;color:${dept.color};border-color:${dept.color}40;">${dept.icon} ${dept.label}</span>`;
}

function openModal(id) {
  document.getElementById(id)?.classList.add('open');
}

function closeModal(id) {
  document.getElementById(id)?.classList.remove('open');
}

function confirmAction(message, onConfirm) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay open';
  modal.innerHTML = `
    <div class="modal" style="max-width:400px;">
      <div class="modal-header">
        <h3>⚠️ Confirm Action</h3>
      </div>
      <div class="modal-body">
        <p style="margin:0;color:#374151;">${message}</p>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
        <button class="btn btn-danger" id="confirm-yes">Confirm</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.querySelector('#confirm-yes').onclick = () => {
    modal.remove();
    onConfirm();
  };
}

// Auth guard - redirect to login if not authenticated
async function requireAuth(allowedRoles = []) {
  initSupabase();
  const session = await getSession();
  if (!session) {
    window.location.href = '../index.html';
    return null;
  }
  const profile = await getCurrentProfile();
  if (!profile) {
    window.location.href = '../index.html';
    return null;
  }
  if (allowedRoles.length > 0 && !allowedRoles.includes(profile.role)) {
    window.location.href = '../index.html';
    return null;
  }
  return profile;
}

// Render notifications bell
async function renderNotifBell(containerId) {
  const notifs = await getMyNotifications();
  const c = document.getElementById(containerId);
  if (!c) return;
  
  c.innerHTML = `
    <div class="notif-bell" onclick="toggleNotifPanel()" style="cursor:pointer;position:relative;">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
      ${notifs.length > 0 ? `<span class="notif-count">${notifs.length}</span>` : ''}
    </div>
    <div class="notif-panel" id="notif-panel" style="display:none;">
      <div class="notif-header">
        <span>Notifications</span>
        ${notifs.length > 0 ? `<button onclick="clearAllNotifs()" class="btn-link">Clear all</button>` : ''}
      </div>
      <div class="notif-list">
        ${notifs.length === 0 
          ? '<div style="padding:16px;color:#6b7280;text-align:center;">No new notifications</div>'
          : notifs.map(n => `
            <div class="notif-item ${n.type}" onclick="markNotifRead('${n.id}');this.remove();">
              <div class="notif-msg">${n.message}</div>
              <div class="notif-time">${formatDate(n.created_at)}</div>
            </div>`).join('')
        }
      </div>
    </div>`;
}

function toggleNotifPanel() {
  const p = document.getElementById('notif-panel');
  if (p) p.style.display = p.style.display === 'none' ? 'block' : 'none';
}

async function clearAllNotifs() {
  await markAllNotifsRead();
  await renderNotifBell('notif-container');
  showToast('All notifications cleared', 'info');
}

// Render top navigation bar
function renderNav(profile, activePage) {
  const isAdmin = profile.role === 'admin';
  const isHOD = profile.role === 'hod';
  
  const navPages = [
    { id: 'dashboard', label: 'Dashboard', href: isAdmin ? 'admin-dashboard.html' : isHOD ? 'hod-dashboard.html' : 'dept-dashboard.html', icon: '🏠' },
    ...(isAdmin ? [
      { id: 'projects', label: 'Projects', href: 'projects.html', icon: '📋' },
      { id: 'import',   label: 'Import',   href: 'import.html',   icon: '📥' },
      { id: 'users',    label: 'Users',    href: 'users.html',    icon: '👥' },
    ] : []),
    ...(isHOD ? [
      { id: 'projects', label: 'All Projects', href: 'hod-projects.html', icon: '📋' },
    ] : []),
  ];
  
  return `
    <nav class="top-nav">
      <div class="nav-brand">
        <span class="nav-logo">🏭</span>
        <span class="nav-title">Project Tracker</span>
      </div>
      <div class="nav-links">
        ${navPages.map(p => `
          <a href="${p.href}" class="nav-link ${activePage === p.id ? 'active' : ''}">
            ${p.icon} ${p.label}
          </a>`).join('')}
      </div>
      <div class="nav-right">
        <div id="notif-container" style="position:relative;"></div>
        <div class="nav-user" onclick="toggleUserMenu()">
          <div class="avatar">${profile.full_name.charAt(0).toUpperCase()}</div>
          <span class="user-name">${profile.full_name}</span>
          <span class="user-role">${ROLES[profile.role]?.label || profile.role}</span>
        </div>
        <div class="user-menu" id="user-menu" style="display:none;">
          <button onclick="signOut()" class="user-menu-item">🚪 Sign Out</button>
        </div>
      </div>
    </nav>`;
}

function toggleUserMenu() {
  const m = document.getElementById('user-menu');
  if (m) m.style.display = m.style.display === 'none' ? 'block' : 'none';
}

// Close dropdowns when clicking outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('.nav-user')) {
    const m = document.getElementById('user-menu');
    if (m) m.style.display = 'none';
  }
  if (!e.target.closest('.notif-bell') && !e.target.closest('#notif-panel')) {
    const p = document.getElementById('notif-panel');
    if (p) p.style.display = 'none';
  }
});
