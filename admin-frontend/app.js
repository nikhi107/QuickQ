/* ===== Configuration ===== */
const API_BASE = 'http://localhost:8000';
const WS_BASE = API_BASE.replace(/^http/i, 'ws');

/* ===== SVG Icons ===== */
const ICONS = {
  activity: '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/></svg>',
  lock: '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  shieldCheck: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>',
  settings: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/></svg>',
  bellRing: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/><path d="M4 2C2.8 3.7 2 5.7 2 8"/><path d="M22 8c0-2.3-.8-4.3-2-6"/></svg>',
  play: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="6 3 20 12 6 21 6 3"/></svg>',
  clock: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16.5 12"/></svg>',
  users: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  userCheck: '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>',
};

/* ===== Utility ===== */
function escapeHTML(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag])
  );
}

/* ===== State ===== */
let state = {
  token: localStorage.getItem('adminToken'),
  loginError: '',
  isSignUp: false,
  captchaNum1: 0,
  captchaNum2: 0,
  queues: [],
  queueId: '',
  status: null,
  calledUser: null,
  isConnected: false,
  analytics: {
    all_time: { average_wait_time_seconds: 0, total_served: 0 },
    today: { average_wait_time_seconds: 0, total_served: 0 },
  },
  isManagingQueues: false,
  isCreatingQueue: false,
};

let ws = null;

/* ===== Computed Values ===== */
function getSelectedQueue() {
  return state.queues.find(q => q.queue_id === state.queueId) || null;
}

function getTodayLabel() {
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date());
}

/* ===== API Calls ===== */
async function fetchQueues() {
  if (!state.token) return;
  try {
    const response = await fetch(`${API_BASE}/queues`);
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    state.queues = data;
    if (!data.some(q => q.queue_id === state.queueId)) {
      state.queueId = data[0]?.queue_id || '';
    }
    render();
    connectWebSocket();
  } catch (err) {
    console.error('Error fetching queues:', err);
    state.queues = [];
    state.queueId = '';
    render();
  }
}

async function fetchAnalytics() {
  if (!state.token || !state.queueId) return;
  try {
    const resp = await fetch(`${API_BASE}/analytics/queue/${state.queueId}`, {
      headers: { Authorization: `Bearer ${state.token}` },
    });
    if (resp.ok) {
      state.analytics = await resp.json();
      render();
    } else if (resp.status === 401) {
      handleLogout();
    }
  } catch (err) {
    console.error(err);
  }
}

async function fetchQueueStatus() {
  if (!state.queueId) return;
  try {
    const resp = await fetch(`${API_BASE}/queue/${state.queueId}/status`);
    if (resp.ok) {
      const data = await resp.json();
      state.status = data;
      if (data.serving_user !== undefined) state.calledUser = data.serving_user;
      render();
    }
  } catch (err) {
    console.error('Error fetching status:', err);
  }
}

/* ===== WebSocket ===== */
let wsReconnectTimer = null;

function connectWebSocket() {
  if (ws) { ws.close(); ws = null; }
  clearTimeout(wsReconnectTimer);

  if (!state.token || !state.queueId) {
    state.status = null;
    state.isConnected = false;
    render();
    return;
  }

  fetchAnalytics();
  fetchQueueStatus();

  ws = new WebSocket(`${WS_BASE}/ws/queue/${state.queueId}`);

  ws.onopen = () => {
    state.isConnected = true;
    render();
  };

  ws.onclose = () => {
    state.isConnected = false;
    render();
    
    // Auto-reconnect after 3 seconds
    wsReconnectTimer = setTimeout(() => {
      if (state.token && state.queueId) connectWebSocket();
    }, 3000);
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'QUEUE_UPDATE') {
      state.status = {
        queue_id: data.queue_id,
        active_users: data.active_users,
        total_waiting: data.total_waiting,
      };
      if (data.serving_user !== undefined) {
        state.calledUser = data.serving_user;
      }
      fetchAnalytics();
      render();
    }
  };
}

/* ===== Auth ===== */
async function handleLogin(username, password, isSignUp) {
  state.loginError = '';
  try {
    if (isSignUp) {
      const resp = await fetch(`${API_BASE}/admin/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (resp.ok) {
        const data = await resp.json();
        state.token = data.access_token;
        localStorage.setItem('adminToken', data.access_token);
        render();
        fetchQueues();
      } else {
        const errData = await resp.json();
        state.loginError = errData.detail || 'Signup failed';
        render();
      }
    } else {
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);
      const resp = await fetch(`${API_BASE}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
      });
      if (resp.ok) {
        const data = await resp.json();
        state.token = data.access_token;
        localStorage.setItem('adminToken', data.access_token);
        render();
        fetchQueues();
      } else {
        state.loginError = 'Invalid username or password';
        render();
      }
    }
  } catch {
    state.loginError = 'Failed to connect to server';
    render();
  }
}

function handleLogout() {
  state.token = null;
  localStorage.removeItem('adminToken');
  state.queues = [];
  state.queueId = '';
  state.status = null;
  state.calledUser = null;
  state.isConnected = false;
  clearTimeout(wsReconnectTimer);
  if (ws) { ws.close(); ws = null; }
  render();
}

/* ===== Queue Actions ===== */
async function handleCallNext() {
  if (!state.queueId) return;
  try {
    const resp = await fetch(`${API_BASE}/queue/${state.queueId}/next`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${state.token}` },
    });
    if (resp.status === 401) { handleLogout(); return; }
    const data = await resp.json();
    if (data.called_user) {
      state.calledUser = data.called_user;
      render();
    } else {
      alert('Queue is empty!');
    }
  } catch (err) {
    console.error('Error calling next:', err);
  }
}

async function handleRemoveUser(userId) {
  if (!state.token || !state.queueId) return;
  if (!confirm('Are you sure you want to remove this user?')) return;
  try {
    await fetch(`${API_BASE}/queue/${state.queueId}/leave/${userId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${state.token}` },
    });
  } catch (err) {
    console.error('Error removing user:', err);
  }
}

async function handleRequeueUser(userId) {
  if (!state.token || !state.queueId) return;
  try {
    await fetch(`${API_BASE}/admin/queue/${state.queueId}/requeue/${userId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${state.token}` },
    });
  } catch (err) {
    console.error('Error requeuing user:', err);
  }
}

async function handleNoShow() {
  if (!state.token || !state.queueId || !state.calledUser) return;
  if (!confirm('Mark this user as no-show and clear the desk?')) return;
  try {
    const resp = await fetch(`${API_BASE}/admin/queue/${state.queueId}/clear-serving`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${state.token}` },
    });
    if (resp.ok) {
      state.calledUser = null;
      render();
    }
  } catch (err) {
    console.error('Error marking no show:', err);
  }
}

async function handleCreateQueue(formData) {
  if (!state.token) return;
  state.isCreatingQueue = true;
  render();
  try {
    const resp = await fetch(`${API_BASE}/admin/queues`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${state.token}`,
      },
      body: JSON.stringify({
        queueId: formData.queue_id,
        displayName: formData.display_name,
        adminSubtitle: formData.admin_subtitle,
        clientDescription: formData.client_description,
        counterLabel: formData.counter_label,
        accentFrom: formData.accent_from,
        accentTo: formData.accent_to,
      }),
    });
    if (resp.ok) {
      const data = await resp.json();
      state.queues = [...state.queues, data];
      state.queueId = data.queue_id;
      state.isManagingQueues = false;
      connectWebSocket();
    } else {
      const errData = await resp.json();
      alert(errData.detail || errData.message || 'Failed to create queue');
    }
  } catch {
    alert('Network error while creating queue.');
  } finally {
    state.isCreatingQueue = false;
    render();
  }
}

/* ===== Render ===== */
function render() {
  const app = document.getElementById('app');

  if (!state.token) {
    app.innerHTML = renderLoginPage();
    bindLoginEvents();
    return;
  }

  const selectedQueue = getSelectedQueue();
  const totalWaiting = state.status?.total_waiting ?? 0;
  const allTimeAvgWaitMinutes = Math.max(0, Math.round(state.analytics.all_time.average_wait_time_seconds / 60));
  const todayAvgWaitMinutes = Math.max(0, Math.round(state.analytics.today.average_wait_time_seconds / 60));
  const todayLabel = getTodayLabel();

  const gradient = `linear-gradient(135deg, ${selectedQueue?.accent_from ?? '#475569'} 0%, ${selectedQueue?.accent_to ?? '#334155'} 100%)`;

  const queueOptions = state.queues.length === 0
    ? '<option value="">No queues available</option>'
    : state.queues.map(q =>
        `<option value="${q.queue_id}" ${q.queue_id === state.queueId ? 'selected' : ''}>${q.display_name}</option>`
      ).join('');

  app.innerHTML = `
    <div class="admin-app">
      <div class="admin-app__container">
        <!-- Header -->
        <header class="admin-header">
          <div class="admin-header__brand">
            <div class="admin-header__logo">${ICONS.activity}</div>
            <div>
              <p class="admin-header__label">QuickQ Operations</p>
              <h1 class="admin-header__title display-text">Front Desk Control</h1>
            </div>
          </div>
          <div class="admin-header__actions">
            <div class="admin-header__info-card">
              <div class="admin-header__info-label">Today</div>
              <div class="admin-header__info-value">${todayLabel}</div>
            </div>
            <div class="admin-header__info-card">
              <div class="admin-header__info-label">Live Status</div>
              <div class="admin-header__info-value">
                <span class="status-dot ${state.isConnected ? 'status-dot--connected' : 'status-dot--disconnected'}"></span>
                ${state.isConnected ? 'Synced with queue server' : 'Reconnecting'}
              </div>
            </div>
            <button id="logout-btn" class="admin-header__logout">Logout</button>
          </div>
        </header>

        <!-- Main Layout -->
        <main class="admin-app__layout">
          <aside class="admin-app__sidebar">
            <!-- Queue Selector -->
            <section class="queue-selector">
              <div class="queue-selector__top">
                <div>
                  <p class="label">Active Queue</p>
                  <h2 class="queue-selector__name display-text">${selectedQueue?.display_name ? escapeHTML(selectedQueue.display_name) : 'No Queue Configured'}</h2>
                </div>
                <button id="manage-queues-btn" class="queue-selector__settings-btn">${ICONS.settings}</button>
              </div>
              <p class="queue-selector__subtitle">
                ${selectedQueue?.admin_subtitle ? escapeHTML(selectedQueue.admin_subtitle) : 'Add queue records in the backend to activate the admin board.'}
              </p>
              <select id="queue-select" class="queue-selector__select" ${state.queues.length === 0 ? 'disabled' : ''}>
                ${queueOptions}
              </select>
            </section>

            <!-- Call Desk -->
            <section class="call-desk" style="background-image: ${gradient}">
              <div class="call-desk__top">
                <div>
                  <p class="label" style="color: rgba(255,255,255,0.7)">Currently Serving</p>
                  <h2 class="call-desk__title display-text">Call Desk</h2>
                </div>
                <div class="call-desk__bell">${ICONS.bellRing}</div>
              </div>
              <div class="call-desk__ticket">
                <div class="call-desk__ticket-label">Current Ticket</div>
                ${state.calledUser ? `
                  <div class="call-desk__ticket-number">${escapeHTML(state.calledUser.ticket_number || state.calledUser.user_id.substring(0, 6).toUpperCase())}</div>
                  <div class="call-desk__ticket-name">${escapeHTML(state.calledUser.name)}</div>
                  <div class="call-desk__noshow">
                    <button id="noshow-btn" class="call-desk__noshow-btn">Dismiss (No-Show)</button>
                  </div>
                ` : `
                  <div class="call-desk__ticket-empty">No active call yet.</div>
                  <div class="call-desk__ticket-hint">Use the action below when the counter is ready for the next patient.</div>
                `}
              </div>
              <button id="call-next-btn" class="call-desk__action" ${totalWaiting === 0 || !state.queueId ? 'disabled' : ''}>
                ${ICONS.play}
                Call Next Person
              </button>
            </section>

            <!-- Analytics -->
            <section class="analytics">
              <div>
                <p class="label">Service Snapshot</p>
                <h2 class="analytics__title display-text">Analytics</h2>
              </div>
              <div class="analytics__cards">
                <div class="analytics__metric">
                  <div class="analytics__metric-header">
                    <div class="analytics__metric-icon analytics__metric-icon--time">${ICONS.clock}</div>
                    <span class="analytics__metric-label">Average Wait Time</span>
                  </div>
                  <div class="analytics__grid">
                    <div class="analytics__cell">
                      <p class="analytics__cell-label">Today</p>
                      <span class="analytics__cell-value">${todayAvgWaitMinutes}</span>
                      <span class="analytics__cell-unit">min</span>
                    </div>
                    <div class="analytics__cell">
                      <p class="analytics__cell-label">All-time</p>
                      <span class="analytics__cell-value analytics__cell-value--secondary">${allTimeAvgWaitMinutes}</span>
                      <span class="analytics__cell-unit">min</span>
                    </div>
                  </div>
                </div>
                <div class="analytics__metric">
                  <div class="analytics__metric-header">
                    <div class="analytics__metric-icon analytics__metric-icon--served">${ICONS.users}</div>
                    <span class="analytics__metric-label">Total Served</span>
                  </div>
                  <div class="analytics__grid">
                    <div class="analytics__cell">
                      <p class="analytics__cell-label">Today</p>
                      <span class="analytics__cell-value">${state.analytics.today.total_served}</span>
                    </div>
                    <div class="analytics__cell">
                      <p class="analytics__cell-label">All-time</p>
                      <span class="analytics__cell-value analytics__cell-value--secondary">${state.analytics.all_time.total_served}</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </aside>

          <!-- Queue Board -->
          ${renderQueueBoard(selectedQueue, totalWaiting, todayAvgWaitMinutes)}
        </main>
      </div>

      ${state.isManagingQueues ? renderManageQueuesModal() : ''}
    </div>
  `;

  bindDashboardEvents();
}

function renderLoginPage() {
  return `
    <div class="login-page">
      <div class="login-container">
        <section class="login-hero">
          <div class="login-hero__gradient"></div>
          <div class="login-hero__content">
            <div class="login-hero__badge">
              ${ICONS.shieldCheck}
              Queue Operations Console
            </div>
            <h1 class="login-hero__title display-text">
              Designed for the front desk, not for a demo video.
            </h1>
            <p class="login-hero__subtitle">
              Track walk-ins, serve the next patient, and keep the floor
              informed in real time. This panel is built like an operations
              surface rather than a template card stack.
            </p>
          </div>
        </section>

        <section class="login-form-panel">
          <div class="login-card">
            <div class="login-card__header">
              <div class="login-card__icon">${ICONS.lock}</div>
              <div>
                <p class="login-card__label">Staff Access</p>
                <h2 class="login-card__title display-text">
                  ${state.isSignUp ? 'Create Admin Account' : 'Admin Login'}
                </h2>
              </div>
            </div>

            <p class="login-card__desc">
              ${state.isSignUp
                ? 'Register a staff account to manage queues and analytics.'
                : 'Sign in to access the live queue board, call the next ticket, and monitor service flow.'}
            </p>

            <form id="login-form" class="login-form">
              ${state.loginError ? `<div class="login-form__error">${state.loginError}</div>` : ''}
              <label>
                <span class="login-form__field-label">Username</span>
                <input id="login-username" type="text" required class="login-form__input" placeholder="admin" />
              </label>
              <label>
                <span class="login-form__field-label">Password</span>
                <input id="login-password" type="password" required class="login-form__input" placeholder="Enter password" />
              </label>
              ${state.isSignUp ? `
              <label>
                <span class="login-form__field-label">Verification: What is ${state.captchaNum1} + ${state.captchaNum2}?</span>
                <input id="login-captcha" type="number" required class="login-form__input" placeholder="Answer" />
              </label>
              ` : ''}
              <button type="submit" class="login-form__submit">
                ${state.isSignUp ? 'Create Account' : 'Enter Console'}
              </button>
            </form>

            ${!state.isSignUp ? `
            <div style="margin-top: 1rem;">
              <button type="button" id="guest-login-btn" class="login-form__submit" style="background: #475569; color: white;">
                Login as Guest
              </button>
            </div>
            ` : ''}

            <div class="login-toggle">
              ${state.isSignUp ? 'Already have access?' : 'Need a staff account?'}
              <button id="toggle-signup" class="login-toggle__btn">
                ${state.isSignUp ? 'Sign in instead' : 'Create one'}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  `;
}

function renderQueueBoard(selectedQueue, totalWaiting, todayAvgWaitMinutes) {
  const activeUsers = state.status?.active_users || [];

  if (activeUsers.length === 0) {
    return `
      <section class="queue-board">
        <div class="queue-board__header">
          <div>
            <p class="label">Live Queue Board</p>
            <h2 class="queue-board__title display-text">${selectedQueue?.display_name ? escapeHTML(selectedQueue.display_name) : 'Queue Offline'}</h2>
            <p class="queue-board__desc">
              Staff can monitor arrivals, identify the next patient at a glance,
              and keep service moving without refreshing the page.
            </p>
          </div>
          <div class="queue-board__counter">
            <span class="queue-board__counter-badge">${totalWaiting}</span>
            people waiting
          </div>
        </div>
        <div class="queue-board__empty">
          <div class="queue-board__empty-icon">${ICONS.userCheck}</div>
          <h3 class="queue-board__empty-title display-text">No one in line right now</h3>
          <p class="queue-board__empty-desc">
            As soon as a client checks in, the queue board will populate here
            with live updates and the next-up indicator.
          </p>
        </div>
      </section>
    `;
  }

  const userCards = activeUsers.map((user, index) => {
    const serviceNote = index === 0
      ? 'Keep counter ready for the next walk-in.'
      : `Estimated turn after ${index * (todayAvgWaitMinutes || 3)} min.`;

    return `
      <article class="queue-board__user ${index === 0 ? 'queue-board__user--next' : ''}">
        <div class="queue-board__user-main">
          <div class="queue-board__user-info">
            <div class="queue-board__user-rank ${index === 0 ? 'queue-board__user-rank--next' : ''}">${index + 1}</div>
            <div>
              <div class="queue-board__user-name">
                <h3>${escapeHTML(user.name)}</h3>
                ${index === 0 ? '<span class="queue-board__user-badge">Next up</span>' : ''}
              </div>
              <p class="queue-board__user-ticket">Ticket ${escapeHTML(user.ticket_number || '#' + user.user_id.substring(0, 6))}</p>
            </div>
          </div>
          <div class="queue-board__user-side">
            <div class="queue-board__user-note">
              <div class="queue-board__user-note-label">Service note</div>
              <div class="queue-board__user-note-value">${serviceNote}</div>
            </div>
            <div class="queue-board__user-actions">
              <button class="queue-board__requeue-btn" data-userid="${user.user_id}">Requeue</button>
              <span>|</span>
              <button class="queue-board__remove-btn" data-userid="${user.user_id}">Remove</button>
            </div>
          </div>
        </div>
      </article>
    `;
  }).join('');

  return `
    <section class="queue-board">
      <div class="queue-board__header">
        <div>
          <p class="label">Live Queue Board</p>
          <h2 class="queue-board__title display-text">${selectedQueue?.display_name ? escapeHTML(selectedQueue.display_name) : 'Queue Offline'}</h2>
          <p class="queue-board__desc">
            Staff can monitor arrivals, identify the next patient at a glance,
            and keep service moving without refreshing the page.
          </p>
        </div>
        <div class="queue-board__counter">
          <span class="queue-board__counter-badge">${totalWaiting}</span>
          people waiting
        </div>
      </div>
      <div class="queue-board__list">${userCards}</div>
    </section>
  `;
}

function renderManageQueuesModal() {
  return `
    <div class="manage-queues__overlay" id="manage-overlay">
      <div class="manage-queues__dialog">
        <div class="manage-queues__header">
          <h3 class="manage-queues__title display-text">Manage Queues</h3>
          <p class="manage-queues__subtitle">Create a new service desk queue</p>
        </div>
        <form id="create-queue-form" class="manage-queues__form">
          <div class="manage-queues__grid">
            <label class="manage-queues__field--full">
              <span class="manage-queues__field-label">Queue ID</span>
              <input type="text" required name="queue_id" placeholder="e.g. pharmacy" class="manage-queues__input" />
            </label>
            <label class="manage-queues__field--full">
              <span class="manage-queues__field-label">Display Name</span>
              <input type="text" required name="display_name" placeholder="e.g. Pharmacy Desk" class="manage-queues__input" />
            </label>
            <label>
              <span class="manage-queues__field-label">Label</span>
              <input type="text" required name="counter_label" placeholder="e.g. Counter 3" class="manage-queues__input" />
            </label>
            <label>
              <span class="manage-queues__field-label">Subtitle</span>
              <input type="text" required name="admin_subtitle" placeholder="e.g. Prescription pickup" class="manage-queues__input" />
            </label>
            <label class="manage-queues__field--full">
              <span class="manage-queues__field-label">Description</span>
              <input type="text" required name="client_description" placeholder="e.g. For picking up ready prescriptions." class="manage-queues__input" />
            </label>
          </div>
          <div class="manage-queues__actions">
            <button type="button" id="cancel-manage" class="manage-queues__cancel">Cancel</button>
            <button type="submit" class="manage-queues__submit" ${state.isCreatingQueue ? 'disabled' : ''}>
              ${state.isCreatingQueue ? 'Creating...' : 'Create Queue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
}

/* ===== Event Binding ===== */
function bindLoginEvents() {
  const form = document.getElementById('login-form');
  const toggleBtn = document.getElementById('toggle-signup');
  const guestBtn = document.getElementById('guest-login-btn');

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      
      if (state.isSignUp) {
        const captchaAnswer = parseInt(document.getElementById('login-captcha').value, 10);
        if (captchaAnswer !== state.captchaNum1 + state.captchaNum2) {
          state.loginError = 'Incorrect verification answer.';
          state.captchaNum1 = Math.floor(Math.random() * 10) + 1;
          state.captchaNum2 = Math.floor(Math.random() * 10) + 1;
          render();
          return;
        }
      }

      const username = document.getElementById('login-username').value;
      const password = document.getElementById('login-password').value;
      handleLogin(username, password, state.isSignUp);
    });
  }

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      state.isSignUp = !state.isSignUp;
      state.loginError = '';
      if (state.isSignUp) {
        state.captchaNum1 = Math.floor(Math.random() * 10) + 1;
        state.captchaNum2 = Math.floor(Math.random() * 10) + 1;
      }
      render();
    });
  }

  if (guestBtn) {
    guestBtn.addEventListener('click', () => {
      handleLogin('admin', 'admin123', false);
    });
  }
}

function bindDashboardEvents() {
  const logoutBtn = document.getElementById('logout-btn');
  const queueSelect = document.getElementById('queue-select');
  const callNextBtn = document.getElementById('call-next-btn');
  const noshowBtn = document.getElementById('noshow-btn');
  const manageBtn = document.getElementById('manage-queues-btn');
  const cancelManage = document.getElementById('cancel-manage');
  const createForm = document.getElementById('create-queue-form');
  const overlay = document.getElementById('manage-overlay');

  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

  if (queueSelect) {
    queueSelect.addEventListener('change', (e) => {
      state.queueId = e.target.value;
      state.calledUser = null;
      connectWebSocket();
    });
  }

  if (callNextBtn) callNextBtn.addEventListener('click', handleCallNext);
  if (noshowBtn) noshowBtn.addEventListener('click', handleNoShow);

  if (manageBtn) {
    manageBtn.addEventListener('click', () => {
      state.isManagingQueues = true;
      render();
    });
  }

  if (cancelManage) {
    cancelManage.addEventListener('click', () => {
      state.isManagingQueues = false;
      render();
    });
  }

  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        state.isManagingQueues = false;
        render();
      }
    });
  }

  if (createForm) {
    createForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(createForm);
      handleCreateQueue({
        queue_id: fd.get('queue_id'),
        display_name: fd.get('display_name'),
        admin_subtitle: fd.get('admin_subtitle'),
        client_description: fd.get('client_description'),
        counter_label: fd.get('counter_label'),
        accent_from: '#475569',
        accent_to: '#334155',
      });
    });
  }

  // Requeue and Remove buttons
  document.querySelectorAll('.queue-board__requeue-btn').forEach(btn => {
    btn.addEventListener('click', () => handleRequeueUser(btn.dataset.userid));
  });

  document.querySelectorAll('.queue-board__remove-btn').forEach(btn => {
    btn.addEventListener('click', () => handleRemoveUser(btn.dataset.userid));
  });
}

/* ===== Initialize ===== */
function init() {
  render();
  if (state.token) {
    fetchQueues();
  }
}

document.addEventListener('DOMContentLoaded', init);
