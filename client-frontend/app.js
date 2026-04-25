/* ===== Configuration ===== */
const API_BASE = 'http://localhost:8000';
const WS_BASE = API_BASE.replace(/^http/i, 'ws');

/* ===== SVG Icons ===== */
const ICONS = {
  activity: '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/></svg>',
  ticket: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/></svg>',
  users: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  clock: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16.5 12"/></svg>',
  xCircle: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>',
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
  queues: [],
  queueId: '',
  name: '',
  mobileNumber: '',
  hasConsented: false,
  userId: localStorage.getItem('userId') || '',
  ticketNumber: localStorage.getItem('ticketNumber') || '',
  isInQueue: localStorage.getItem('isInQueue') === 'true',
  isConnected: false,
  position: 0,
  totalWaiting: 0,
  avgWaitTimeSeconds: 0,
  isLoading: false,
};

let ws = null;

/* ===== Session Persistence ===== */
function loadSession() {
  try {
    const raw = localStorage.getItem('quickq-client-session');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed.queueId || !parsed.name || !parsed.userId) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveSession() {
  localStorage.setItem('userId', state.userId);
  localStorage.setItem('ticketNumber', state.ticketNumber);
  localStorage.setItem('isInQueue', 'true');
  localStorage.setItem('queueId', state.queueId);
}

function clearSession() {
  localStorage.removeItem('userId');
  localStorage.removeItem('ticketNumber');
  localStorage.removeItem('isInQueue');
}

/* ===== Computed Values ===== */
function getSelectedQueue() {
  return state.queues.find(q => q.queue_id === state.queueId) || null;
}

function getEstimatedWaitMinutes() {
  return Math.max(
    1,
    Math.round((state.position || 1) * (state.avgWaitTimeSeconds > 0 ? state.avgWaitTimeSeconds / 60 : 3))
  );
}

/* ===== API Calls ===== */
async function fetchQueues() {
  try {
    const response = await fetch(`${API_BASE}/queues`);
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    state.queues = data;
    if (!data.some(q => q.queue_id === state.queueId)) {
      state.queueId = data[0]?.queue_id || '';
    }
    render();
  } catch (err) {
    console.error('Error fetching queues:', err);
    state.queues = [];
    state.queueId = '';
    render();
  }
}

async function fetchPosition() {
  try {
    const response = await fetch(`${API_BASE}/queue/${state.queueId}/position/${state.userId}`);
    if (response.ok) {
      const data = await response.json();
      if (data.position === null) {
        clearSession();
        state.isInQueue = false;
        state.userId = '';
        state.ticketNumber = '';
        state.position = null;
        state.totalWaiting = 0;
        alert("It's your turn! Please proceed to the counter.");
      } else {
        state.position = data.position;
      }
      render();
    }
  } catch (err) {
    console.error('Error fetching position:', err);
  }
}

async function fetchQueueStatus() {
  try {
    const response = await fetch(`${API_BASE}/queue/${state.queueId}/status`);
    if (response.ok) {
      const data = await response.json();
      state.totalWaiting = data.total_waiting || 0;
      state.avgWaitTimeSeconds = data.average_wait_time_seconds || 0;
      render();
    }
  } catch (err) {
    console.error('Error fetching queue status:', err);
  }
}

/* ===== WebSocket ===== */
let wsReconnectTimer = null;

function connectWebSocket() {
  if (ws) {
    ws.close();
    ws = null;
  }
  clearTimeout(wsReconnectTimer);

  if (!state.isInQueue || !state.userId) return;

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
      if (state.isInQueue && state.userId) {
        connectWebSocket();
        fetchQueueStatus();
        fetchPosition();
      }
    }, 3000);
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'QUEUE_UPDATE') {
        state.totalWaiting = data.total_waiting;
        if (data.average_wait_time_seconds !== undefined) {
          state.avgWaitTimeSeconds = data.average_wait_time_seconds;
        }
        fetchPosition();
      }
    } catch (e) {
      console.error('Error parsing WS data', e);
    }
  };
}

/* ===== Actions ===== */
async function handleJoinQueue() {
  if (!state.queueId || !state.name.trim() || !state.hasConsented) return;
  state.isLoading = true;
  render();

  try {
    let ticket = state.mobileNumber ? state.mobileNumber.trim() : `T-${Math.floor(1000 + Math.random() * 9000)}`;
    const joinData = {
      user_id: `u-${Date.now()}`,
      username: state.name.trim(),
      ticket_number: ticket,
    };
    const response = await fetch(`${API_BASE}/queue/${state.queueId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(joinData),
    });
    const data = await response.json();
    if (response.ok) {
      state.userId = joinData.user_id;
      state.ticketNumber = data.ticketNumber;
      state.position = data.position;
      state.isInQueue = true;
      saveSession();
      connectWebSocket();
      fetchQueueStatus();
    } else {
      alert(data.detail || 'Unknown error joining queue');
    }
  } catch {
    alert('Network Error: Could not connect to the server.');
  } finally {
    state.isLoading = false;
    render();
  }
}

async function handleLeaveQueue() {
  if (!confirm('Are you sure you want to give up your spot?')) return;
  state.isLoading = true;
  render();

  try {
    await fetch(`${API_BASE}/queue/${state.queueId}/leave/${state.userId}`, {
      method: 'POST',
    });
    clearSession();
    clearTimeout(wsReconnectTimer);
    if (ws) { ws.close(); ws = null; }
    state.isInQueue = false;
    state.userId = '';
    state.ticketNumber = '';
    state.position = null;
    state.totalWaiting = 0;
    state.isConnected = false;
  } catch (err) {
    console.error(err);
  } finally {
    state.isLoading = false;
    render();
  }
}

/* ===== Render ===== */
function render() {
  const app = document.getElementById('app');
  const selectedQueue = getSelectedQueue();
  const estimatedWaitMinutes = getEstimatedWaitMinutes();

  const statusText = state.isInQueue
    ? state.isConnected ? 'Updates active' : 'Syncing your ticket'
    : 'Ready to join';

  const statusDotClass = state.isConnected ? 'status-dot--connected' : 'status-dot--amber';

  const queueDisplayName = selectedQueue?.display_name || 'Choose a service';
  const queueDescription = selectedQueue?.client_description || 'Queue details are loading from staff controls.';
  const counterLabel = selectedQueue?.counter_label || '--';

  app.innerHTML = `
    <div class="client-app">
      <div class="client-app__container">
        <!-- Header -->
        <header class="client-header">
          <div class="client-header__brand">
            <div class="client-header__logo">${ICONS.activity}</div>
            <div>
              <p class="client-header__label">QuickQ Check-In</p>
              <h1 class="client-header__title display-text">Walk-in Queue</h1>
            </div>
          </div>
          <div class="client-header__status">
            <div class="client-header__status-label">Live Status</div>
            <div class="client-header__status-value">
              <span class="status-dot ${statusDotClass}"></span>
              ${statusText}
            </div>
          </div>
        </header>

        <!-- Main Layout -->
        <div class="client-app__layout">
          <!-- Queue Info -->
          <section class="queue-info">
            <div class="queue-info__header">
              <div class="queue-info__badge">
                ${ICONS.ticket}
                Visitor Ticketing
              </div>
              <h2 class="queue-info__heading display-text">
                ${state.isInQueue ? 'Your place is reserved.' : 'Check in without standing in line.'}
              </h2>
              <p class="queue-info__desc">
                ${state.isInQueue
                  ? 'Keep this screen open. The queue updates automatically, and you will be notified when it is your turn.'
                  : 'Choose the service counter, enter your name, and get a live ticket linked to the front-desk dashboard.'}
              </p>
            </div>

            <div class="queue-info__cards">
              <div class="queue-info__selected">
                <p class="label" style="color: #cabf99">Selected Queue</p>
                <div class="queue-info__selected-top" style="margin-top: 12px">
                  <div>
                    <div class="queue-info__selected-name">${state.queueId ? escapeHTML(queueDisplayName) : 'Choose a service'}</div>
                    <div class="queue-info__selected-desc">
                      ${state.queueId ? escapeHTML(queueDescription) : 'Available desks are managed live by staff.'}
                    </div>
                  </div>
                  <div class="queue-info__selected-desk">
                    <div class="queue-info__selected-desk-label">Desk</div>
                    <div class="queue-info__selected-desk-value">${state.queueId ? escapeHTML(counterLabel) : '--'}</div>
                  </div>
                </div>
              </div>

              <div class="queue-info__stats">
                <div class="queue-info__stat">
                  <div class="queue-info__stat-header">
                    ${ICONS.users}
                    <span class="queue-info__stat-label">People Waiting</span>
                  </div>
                  <div class="queue-info__stat-value">${state.totalWaiting}</div>
                  <p class="queue-info__stat-desc">Live count for the selected queue.</p>
                </div>
                <div class="queue-info__stat">
                  <div class="queue-info__stat-header">
                    ${ICONS.clock}
                    <span class="queue-info__stat-label">Estimated Wait</span>
                  </div>
                  <div class="queue-info__stat-value">~${estimatedWaitMinutes}m</div>
                  <p class="queue-info__stat-desc">Approximate and refreshed with queue movement.</p>
                </div>
              </div>
            </div>
          </section>

          <!-- Right Panel: Join Form or Ticket View -->
          ${state.isInQueue ? renderTicketView(selectedQueue, estimatedWaitMinutes) : renderJoinForm()}
        </div>
      </div>
    </div>
  `;

  bindEvents();
}

function renderJoinForm() {
  const queueOptions = state.queues.length === 0
    ? '<option value="">No service counters available</option>'
    : '<option value="" disabled>Choose a service counter</option>' +
      state.queues.map(q =>
        `<option value="${escapeHTML(q.queue_id)}" ${q.queue_id === state.queueId ? 'selected' : ''}>${escapeHTML(q.display_name)}</option>`
      ).join('');

  const isMobileValid = !state.mobileNumber.trim() || /^[0-9]{10}$/.test(state.mobileNumber.trim());
  const isDisabled = !state.name.trim() || !state.queueId.trim() || !state.hasConsented || !isMobileValid || state.isLoading || state.queues.length === 0;

  return `
    <div class="join-form">
      <div>
        <p class="label">Self Check-In</p>
        <h2 class="join-form__title display-text">Join the queue</h2>
        <p class="join-form__desc">
          Your ticket is created instantly and stays synced with the staff
          dashboard. You only need your name and the service counter you want to visit.
        </p>
      </div>

      <div class="join-form__fields">
        <label>
          <span class="join-form__field-label">Select Queue</span>
          <select id="queue-select" class="join-form__select" ${state.queues.length === 0 ? 'disabled' : ''}>
            ${queueOptions}
          </select>
        </label>

        <label>
          <span class="join-form__field-label">Your Name *</span>
          <input id="name-input" type="text" value="${escapeHTML(state.name)}" placeholder="Nikhil" class="join-form__input" />
        </label>
        
        <label>
          <span class="join-form__field-label">Mobile Number (+91) (Optional)</span>
          <input id="mobile-input" type="tel" value="${escapeHTML(state.mobileNumber)}" placeholder="9876543210" class="join-form__input" pattern="[0-9]{10}" />
          ${state.mobileNumber && !/^[0-9]{10}$/.test(state.mobileNumber.trim()) ? '<span style="color: #ef4444; font-size: 0.8rem;">Must be 10 digits</span>' : ''}
        </label>

        <label style="display: flex; align-items: flex-start; gap: 0.5rem; margin-top: 0.5rem; margin-bottom: 0.5rem;">
          <input id="consent-input" type="checkbox" ${state.hasConsented ? 'checked' : ''} style="margin-top: 0.25rem;" />
          <span style="font-size: 0.85rem; color: #64748b; line-height: 1.4;">I consent to the collection of my details for queue management purposes under the DPDP Act.</span>
        </label>

        <div class="join-form__note">
          Staff will call your name when it is your turn. Keep this page open if
          you want live position updates.
        </div>

        <button id="join-btn" class="join-form__submit" ${isDisabled ? 'disabled' : ''}>
          ${state.isLoading ? '<div class="spinner"></div>' : 'Get Ticket'}
        </button>
      </div>
    </div>
  `;
}

function renderTicketView(selectedQueue, estimatedWaitMinutes) {
  const queueName = selectedQueue?.display_name || 'Queue unavailable';
  const counter = selectedQueue?.counter_label || '--';

  return `
    <div class="ticket-view">
      <div class="ticket-view__top">
        <div>
          <p class="label">Live Ticket</p>
          <h2 class="ticket-view__title display-text">You are checked in</h2>
          <p class="ticket-view__desc">
            Stay nearby. Your ticket is active for
            <strong>${escapeHTML(queueName)}</strong>
            and updates automatically.
          </p>
        </div>
        <div class="ticket-view__live-badge">
          <span class="status-dot ${state.isConnected ? 'status-dot--connected' : 'status-dot--amber'}"></span>
          ${state.isConnected ? 'Live updates active' : 'Connecting'}
        </div>
      </div>

      <div class="ticket-view__card">
        <div class="ticket-view__card-grid">
          <div class="ticket-view__position">
            <div class="label" style="color: #cabf99">Position</div>
            <div class="ticket-view__position-value">${state.position || '-'}</div>
            <div class="ticket-view__position-ticket">
              Ticket <span>${escapeHTML(state.ticketNumber || state.userId)}</span>
            </div>
          </div>

          <div class="ticket-view__details">
            <div class="ticket-view__detail-card">
              <p class="label">Passenger</p>
              <div class="ticket-view__detail-name">${escapeHTML(state.name)}</div>
              <div class="ticket-view__detail-queue">${escapeHTML(queueName)} • ${escapeHTML(counter)}</div>
            </div>

            <div class="ticket-view__stats">
              <div class="ticket-view__stat-card">
                <p class="label">People Waiting</p>
                <div class="ticket-view__stat-value">${state.totalWaiting}</div>
              </div>
              <div class="ticket-view__stat-card">
                <p class="label">Estimated Wait</p>
                <div class="ticket-view__stat-value">~${estimatedWaitMinutes}m</div>
              </div>
            </div>

            <button id="leave-btn" class="ticket-view__leave" ${state.isLoading ? 'disabled' : ''}>
              ${ICONS.xCircle}
              Leave Queue
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

/* ===== Event Binding ===== */
function bindEvents() {
  const queueSelect = document.getElementById('queue-select');
  const nameInput = document.getElementById('name-input');
  const mobileInput = document.getElementById('mobile-input');
  const consentInput = document.getElementById('consent-input');
  const joinBtn = document.getElementById('join-btn');
  const leaveBtn = document.getElementById('leave-btn');

  if (queueSelect) {
    queueSelect.addEventListener('change', (e) => {
      state.queueId = e.target.value;
      render();
    });
  }

  if (nameInput) {
    nameInput.addEventListener('input', (e) => {
      state.name = e.target.value;
      render();
    });
  }

  if (mobileInput) {
    mobileInput.addEventListener('input', (e) => {
      state.mobileNumber = e.target.value;
      render();
    });
  }

  if (consentInput) {
    consentInput.addEventListener('change', (e) => {
      state.hasConsented = e.target.checked;
      render();
    });
  }

  if (joinBtn) joinBtn.addEventListener('click', handleJoinQueue);
  if (leaveBtn) leaveBtn.addEventListener('click', handleLeaveQueue);
}

/* ===== Initialize ===== */
function init() {
  const savedSession = loadSession();
  if (savedSession) {
    state.queueId = savedSession.queueId;
    state.name = savedSession.name;
    state.userId = savedSession.userId;
    state.ticketNumber = savedSession.ticketNumber || '';
    state.isInQueue = true;
  }

  render();
  fetchQueues().then(() => {
    if (state.isInQueue && state.userId) {
      connectWebSocket();
      fetchQueueStatus();
      fetchPosition();
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
