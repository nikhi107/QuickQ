import { useEffect, useState } from 'react';
import {
  Activity,
  BellRing,
  Clock3,
  Lock,
  Play,
  Settings2,
  ShieldCheck,
  UserCheck,
  Users,
} from 'lucide-react';
import type { AnalyticsSplitResponse, CallNextResponse, QueueDefinition, QueueStatus, User } from './types';
import { API_BASE, WS_BASE } from './config';

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('adminToken'));
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const [queues, setQueues] = useState<QueueDefinition[]>([]);
  const [queueId, setQueueId] = useState('');
  const [status, setStatus] = useState<QueueStatus | null>(null);
  const [calledUser, setCalledUser] = useState<User | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [analytics, setAnalytics] = useState<AnalyticsSplitResponse>({
    all_time: { average_wait_time_seconds: 0, total_served: 0 },
    today: { average_wait_time_seconds: 0, total_served: 0 },
  });
  const [isManagingQueues, setIsManagingQueues] = useState(false);
  const [newQueue, setNewQueue] = useState({
    queue_id: '',
    display_name: '',
    admin_subtitle: '',
    client_description: '',
    counter_label: '',
    accent_from: '#475569',
    accent_to: '#334155'
  });
  const [isCreatingQueue, setIsCreatingQueue] = useState(false);

  const selectedQueue = queues.find((queue) => queue.queue_id === queueId) ?? null;
  const totalWaiting = status?.total_waiting ?? 0;
  const allTimeAvgWaitMinutes = Math.max(0, Math.round(analytics.all_time.average_wait_time_seconds / 60));
  const todayAvgWaitMinutes = Math.max(0, Math.round(analytics.today.average_wait_time_seconds / 60));
  const todayLabel = new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

  useEffect(() => {
    if (!token) {
      return;
    }

    let isCancelled = false;

    const fetchQueues = async () => {
      try {
        const response = await fetch(`${API_BASE}/queues`);
        if (!response.ok) {
          throw new Error(`Failed to load queues: ${response.status}`);
        }

        const data: QueueDefinition[] = await response.json();
        if (isCancelled) {
          return;
        }

        setQueues(data);
        setQueueId((currentQueueId) =>
          data.some((queue) => queue.queue_id === currentQueueId) ? currentQueueId : (data[0]?.queue_id ?? '')
        );
      } catch (error) {
        if (!isCancelled) {
          console.error('Error fetching queues:', error);
          setQueues([]);
          setQueueId('');
        }
      }
    };

    fetchQueues();

    return () => {
      isCancelled = true;
    };
  }, [token]);

  const fetchAnalytics = async () => {
    if (!token || !queueId) {
      return;
    }

    try {
      const resp = await fetch(`${API_BASE}/analytics/queue/${queueId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (resp.ok) {
        const data = await resp.json();
        setAnalytics(data);
      } else if (resp.status === 401) {
        handleLogout();
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!token) {
      return;
    }

    fetchAnalytics();

    if (!queueId) {
      setStatus(null);
      setIsConnected(false);
      return;
    }

    const ws = new WebSocket(`${WS_BASE}/ws/queue/${queueId}`);

    ws.onopen = () => setIsConnected(true);
    ws.onclose = () => setIsConnected(false);
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'QUEUE_UPDATE') {
        setStatus({
          queue_id: data.queue_id,
          active_users: data.active_users,
          total_waiting: data.total_waiting,
        });
        if (data.serving_user !== undefined) {
          setCalledUser(data.serving_user);
        }
        fetchAnalytics();
      }
    };

    fetch(`${API_BASE}/queue/${queueId}/status`)
      .then((res) => res.json())
      .then((data) => {
        setStatus(data);
        if (data.serving_user !== undefined) {
          setCalledUser(data.serving_user);
        }
      })
      .catch((err) => console.error('Error fetching status:', err));

    return () => {
      ws.close();
    };
  }, [queueId, token]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    try {
      if (isSignUp) {
        const resp = await fetch(`${API_BASE}/admin/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });

        if (resp.ok) {
          const data = await resp.json();
          setToken(data.access_token);
          localStorage.setItem('adminToken', data.access_token);
        } else {
          const errData = await resp.json();
          setLoginError(errData.detail || 'Signup failed');
        }
      } else {
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);

        const resp = await fetch(`${API_BASE}/admin/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString(),
        });

        if (resp.ok) {
          const data = await resp.json();
          setToken(data.access_token);
          localStorage.setItem('adminToken', data.access_token);
        } else {
          setLoginError('Invalid username or password');
        }
      }
    } catch (err) {
      setLoginError('Failed to connect to server');
    }
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('adminToken');
    setQueues([]);
    setQueueId('');
    setStatus(null);
    setCalledUser(null);
    setIsConnected(false);
  };

  const handleCallNext = async () => {
    if (!queueId) {
      return;
    }

    try {
      const resp = await fetch(`${API_BASE}/queue/${queueId}/next`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (resp.status === 401) {
        handleLogout();
        return;
      }

      const data: CallNextResponse = await resp.json();
      if (data.called_user) {
        setCalledUser(data.called_user);
      } else {
        alert('Queue is empty!');
      }
    } catch (err) {
      console.error('Error calling next:', err);
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!token || !queueId) return;
    if (!confirm('Are you sure you want to remove this user?')) return;
    try {
      await fetch(`${API_BASE}/queue/${queueId}/leave/${userId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.error('Error removing user:', err);
    }
  };

  const handleRequeueUser = async (userId: string) => {
    if (!token || !queueId) return;
    try {
      await fetch(`${API_BASE}/admin/queue/${queueId}/requeue/${userId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.error('Error requeuing user:', err);
    }
  };

  const handleNoShow = async () => {
    if (!token || !queueId || !calledUser) return;
    if (!confirm('Mark this user as no-show and clear the desk?')) return;
    try {
      const resp = await fetch(`${API_BASE}/admin/queue/${queueId}/clear-serving`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (resp.ok) {
        setCalledUser(null);
      }
    } catch (err) {
      console.error('Error marking no show:', err);
    }
  };

  const handleCreateQueue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setIsCreatingQueue(true);
    try {
      const resp = await fetch(`${API_BASE}/admin/queues`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          queueId: newQueue.queue_id,
          displayName: newQueue.display_name,
          adminSubtitle: newQueue.admin_subtitle,
          clientDescription: newQueue.client_description,
          counterLabel: newQueue.counter_label,
          accentFrom: newQueue.accent_from,
          accentTo: newQueue.accent_to
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setQueues([...queues, data]);
        setQueueId(data.queue_id);
        setIsManagingQueues(false);
        setNewQueue({
          queue_id: '', display_name: '', admin_subtitle: '',
          client_description: '', counter_label: '',
          accent_from: '#475569', accent_to: '#334155'
        });
      } else {
        const errData = await resp.json();
        alert(errData.detail || errData.message || 'Failed to create queue');
      }
    } catch (err) {
      alert('Network error while creating queue.');
    } finally {
      setIsCreatingQueue(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(18,84,78,0.18),_transparent_30%),linear-gradient(180deg,_#f5efe3_0%,_#efe7d8_100%)] px-4 py-10 text-slate-900 sm:px-6 lg:px-8">
        <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl overflow-hidden rounded-[32px] border border-white/70 bg-white/65 shadow-[0_30px_80px_rgba(77,58,28,0.12)] backdrop-blur xl:grid-cols-[1.15fr_0.85fr]">
          <section className="relative flex flex-col justify-between overflow-hidden bg-[#16322f] px-8 py-10 text-[#f3ead8] sm:px-12">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(216,180,92,0.34),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(38,166,154,0.24),_transparent_28%)]" />
            <div className="relative">
              <div className="mb-10 inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-[#f6eede]">
                <ShieldCheck className="h-4 w-4 text-[#efc15b]" />
                Queue Operations Console
              </div>
              <h1 className="admin-display max-w-lg text-5xl leading-tight sm:text-6xl">
                Designed for the front desk, not for a demo video.
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-[#d7ccb7] sm:text-lg">
                Track walk-ins, serve the next patient, and keep the floor informed in real time.
                This panel is built like an operations surface rather than a template card stack.
              </p>
            </div>

            <div className="relative grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl border border-white/10 bg-white/10 p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-[#cabf99]">Flow</p>
                <p className="mt-3 text-3xl font-semibold text-white">Live</p>
                <p className="mt-2 text-sm text-[#d7ccb7]">WebSocket queue updates for every active desk.</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/10 p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-[#cabf99]">Security</p>
                <p className="mt-3 text-3xl font-semibold text-white">JWT</p>
                <p className="mt-2 text-sm text-[#d7ccb7]">Protected admin actions with auditable sessions.</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/10 p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-[#cabf99]">Store</p>
                <p className="mt-3 text-3xl font-semibold text-white">Redis</p>
                <p className="mt-2 text-sm text-[#d7ccb7]">Fast queue state backed by persistent history.</p>
              </div>
            </div>
          </section>

          <section className="flex items-center px-6 py-10 sm:px-10">
            <div className="w-full rounded-[28px] border border-[#ddd2bf] bg-[#fffdf8] p-8 shadow-[0_24px_60px_rgba(76,61,33,0.08)]">
              <div className="mb-8 flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1c4c46] text-[#f3ead8] shadow-lg">
                  <Lock className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-[#8b7653]">
                    Staff Access
                  </p>
                  <h2 className="admin-display mt-1 text-4xl text-slate-900">
                    {isSignUp ? 'Create Admin Account' : 'Admin Login'}
                  </h2>
                </div>
              </div>

              <p className="mb-6 text-sm leading-6 text-slate-600">
                {isSignUp
                  ? 'Register a staff account to manage queues and analytics.'
                  : 'Sign in to access the live queue board, call the next ticket, and monitor service flow.'}
              </p>

              <form className="space-y-5" onSubmit={handleAuth}>
                {loginError && (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {loginError}
                  </div>
                )}

                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-[#8b7653]">
                    Username
                  </span>
                  <input
                    type="text"
                    required
                    className="w-full rounded-2xl border border-[#d8cbb4] bg-white px-4 py-3.5 text-slate-900 outline-none transition focus:border-[#1c4c46] focus:ring-4 focus:ring-[#1c4c46]/10"
                    placeholder="admin"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-[#8b7653]">
                    Password
                  </span>
                  <input
                    type="password"
                    required
                    className="w-full rounded-2xl border border-[#d8cbb4] bg-white px-4 py-3.5 text-slate-900 outline-none transition focus:border-[#1c4c46] focus:ring-4 focus:ring-[#1c4c46]/10"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </label>

                <button
                  type="submit"
                  className="flex h-14 w-full items-center justify-center rounded-2xl bg-[#1c4c46] px-5 text-sm font-semibold uppercase tracking-[0.18em] text-[#f7f2e8] transition hover:bg-[#143d38] active:scale-[0.99]"
                >
                  {isSignUp ? 'Create Account' : 'Enter Console'}
                </button>
              </form>

              <div className="mt-6 text-sm text-slate-600">
                {isSignUp ? 'Already have access?' : "Need a staff account?"}{' '}
                <button
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setLoginError('');
                    setUsername('');
                    setPassword('');
                  }}
                  className="font-semibold text-[#1c4c46] transition hover:text-[#143d38]"
                >
                  {isSignUp ? 'Sign in instead' : 'Create one'}
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(17,76,70,0.16),_transparent_26%),linear-gradient(180deg,_#f5efe3_0%,_#efe8db_52%,_#f8f4ec_100%)] px-4 py-5 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-col gap-4 rounded-[28px] border border-white/70 bg-white/70 px-5 py-5 shadow-[0_18px_50px_rgba(77,58,28,0.1)] backdrop-blur sm:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#153f3a] text-[#f1e9d8] shadow-lg">
              <Activity className="h-7 w-7" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.26em] text-[#8d7652]">QuickQ Operations</p>
              <h1 className="admin-display text-4xl text-slate-900">Front Desk Control</h1>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="rounded-2xl border border-[#ddcfb7] bg-[#fbf8f1] px-4 py-3 text-sm text-slate-600">
              <div className="text-[11px] uppercase tracking-[0.22em] text-[#8d7652]">Today</div>
              <div className="mt-1 font-medium text-slate-900">{todayLabel}</div>
            </div>
            <div className="rounded-2xl border border-[#ddcfb7] bg-[#fbf8f1] px-4 py-3 text-sm text-slate-600">
              <div className="text-[11px] uppercase tracking-[0.22em] text-[#8d7652]">Live Status</div>
              <div className="mt-1 flex items-center gap-2 font-medium text-slate-900">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    isConnected ? 'bg-emerald-500 shadow-[0_0_14px_rgba(16,185,129,0.7)]' : 'bg-rose-500'
                  }`}
                />
                {isConnected ? 'Synced with queue server' : 'Reconnecting'}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-2xl border border-[#d9c9af] bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-rose-300 hover:text-rose-700"
            >
              Logout
            </button>
          </div>
        </header>

        <main className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="space-y-6">
            <section className="rounded-[28px] border border-white/70 bg-white/75 p-6 shadow-[0_18px_50px_rgba(77,58,28,0.08)] backdrop-blur">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-[#8d7652]">Active Queue</p>
                  <h2 className="admin-display mt-2 text-3xl text-slate-900">
                    {selectedQueue?.display_name ?? 'No Queue Configured'}
                  </h2>
                </div>
                <button onClick={() => setIsManagingQueues(true)} className="rounded-full bg-[#fbf8f1] p-2 hover:bg-[#f3eedd] transition">
                  <Settings2 className="h-5 w-5 text-[#8d7652]" />
                </button>
              </div>

              <p className="mb-5 text-sm leading-6 text-slate-600">
                {selectedQueue?.admin_subtitle ?? 'Add queue records in the backend to activate the admin board.'}
              </p>

              <select
                value={queueId}
                onChange={(e) => setQueueId(e.target.value)}
                disabled={queues.length === 0}
                className="w-full rounded-2xl border border-[#d6c7af] bg-[#fbf8f1] px-4 py-3.5 text-slate-900 outline-none transition focus:border-[#153f3a] focus:ring-4 focus:ring-[#153f3a]/10"
              >
                {queues.length === 0 ? (
                  <option value="">No queues available</option>
                ) : (
                  queues.map((queue) => (
                    <option key={queue.queue_id} value={queue.queue_id}>
                      {queue.display_name}
                    </option>
                  ))
                )}
              </select>
            </section>

            <section
              className="overflow-hidden rounded-[30px] p-6 text-white shadow-[0_28px_60px_rgba(17,24,39,0.22)]"
              style={{
                backgroundImage: `linear-gradient(135deg, ${selectedQueue?.accent_from ?? '#475569'} 0%, ${selectedQueue?.accent_to ?? '#334155'} 100%)`,
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-white/70">Currently Serving</p>
                  <h2 className="admin-display mt-2 text-3xl text-white">Call Desk</h2>
                </div>
                <BellRing className="h-5 w-5 text-white/80" />
              </div>

              <div className="mt-6 rounded-[24px] border border-white/15 bg-black/10 p-5 backdrop-blur-sm">
                {calledUser ? (
                  <>
                    <div className="text-[11px] uppercase tracking-[0.24em] text-white/60">Current Ticket</div>
                    <div className="mt-3 font-mono text-4xl font-semibold tracking-[0.18em]">
                      {calledUser.ticket_number || calledUser.user_id.substring(0, 6).toUpperCase()}
                    </div>
                    <div className="mt-3 text-xl font-medium text-white">{calledUser.name}</div>
                    <div className="mt-4 flex justify-end">
                      <button onClick={handleNoShow} className="text-xs font-semibold uppercase tracking-wider text-rose-300 hover:text-rose-100 transition">
                        Dismiss (No-Show)
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-[11px] uppercase tracking-[0.24em] text-white/60">Current Ticket</div>
                    <div className="mt-6 text-lg text-white/85">No active call yet.</div>
                    <div className="mt-2 text-sm text-white/60">
                      Use the action below when the counter is ready for the next patient.
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={handleCallNext}
                disabled={totalWaiting === 0 || !queueId}
                className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#f6edda] px-5 text-sm font-semibold uppercase tracking-[0.18em] text-[#173734] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Play className="h-4 w-4" />
                Call Next Person
              </button>
            </section>

            <section className="rounded-[28px] border border-white/70 bg-white/75 p-6 shadow-[0_18px_50px_rgba(77,58,28,0.08)] backdrop-blur">
              <div className="mb-5">
                <p className="text-xs uppercase tracking-[0.22em] text-[#8d7652]">Service Snapshot</p>
                <h2 className="admin-display mt-2 text-3xl text-slate-900">Analytics</h2>
              </div>

              <div className="space-y-4">
                <div className="rounded-3xl border border-[#e3d8c5] bg-[#fbf8f1] p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#ddece8] text-[#16524b]">
                      <Clock3 className="h-5 w-5" />
                    </div>
                    <span className="text-[11px] uppercase tracking-[0.2em] font-bold text-[#8d7652]">Average Wait Time</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white/60 p-3 rounded-2xl border border-[#efe9dc]">
                      <p className="text-[10px] uppercase tracking-wider text-[#a08f72] mb-1">Today</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-slate-900">{todayAvgWaitMinutes}</span>
                        <span className="text-xs text-slate-500 font-medium">min</span>
                      </div>
                    </div>
                    <div className="bg-white/60 p-3 rounded-2xl border border-[#efe9dc]">
                      <p className="text-[10px] uppercase tracking-wider text-[#a08f72] mb-1">All-time</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-semibold text-slate-700">{allTimeAvgWaitMinutes}</span>
                        <span className="text-xs text-slate-500 font-medium">min</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-[#e3d8c5] bg-[#fbf8f1] p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#efe7d3] text-[#9a6b14]">
                      <Users className="h-5 w-5" />
                    </div>
                    <span className="text-[11px] uppercase tracking-[0.2em] font-bold text-[#8d7652]">Total Served</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white/60 p-3 rounded-2xl border border-[#efe9dc]">
                      <p className="text-[10px] uppercase tracking-wider text-[#a08f72] mb-1">Today</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-slate-900">{analytics.today.total_served}</span>
                      </div>
                    </div>
                    <div className="bg-white/60 p-3 rounded-2xl border border-[#efe9dc]">
                      <p className="text-[10px] uppercase tracking-wider text-[#a08f72] mb-1">All-time</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-semibold text-slate-700">{analytics.all_time.total_served}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </aside>

          <section className="rounded-[30px] border border-white/70 bg-white/80 shadow-[0_22px_60px_rgba(77,58,28,0.08)] backdrop-blur">
            <div className="flex flex-col gap-5 border-b border-[#e6dcc9] px-6 py-6 sm:flex-row sm:items-end sm:justify-between sm:px-8">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-[#8d7652]">Live Queue Board</p>
                <h2 className="admin-display mt-2 text-4xl text-slate-900">
                  {selectedQueue?.display_name ?? 'Queue Offline'}
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-slate-600">
                  Staff can monitor arrivals, identify the next patient at a glance, and keep service moving without refreshing the page.
                </p>
              </div>

              <div className="flex items-center gap-3 self-start rounded-full border border-[#d9ccb8] bg-[#fbf8f1] px-4 py-2.5 text-sm font-medium text-slate-700">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#163f39] text-[#f3ead8]">
                  {totalWaiting}
                </span>
                people waiting
              </div>
            </div>

            {!status || status.active_users.length === 0 ? (
              <div className="flex min-h-[560px] flex-col items-center justify-center px-6 text-center">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#eef4f2] text-[#1b5b54]">
                  <UserCheck className="h-10 w-10" />
                </div>
                <h3 className="admin-display mt-8 text-4xl text-slate-900">No one in line right now</h3>
                <p className="mt-3 max-w-md text-sm leading-6 text-slate-600">
                  As soon as a client checks in, the queue board will populate here with live updates and the next-up indicator.
                </p>
              </div>
            ) : (
              <div className="px-4 py-4 sm:px-6 sm:py-6">
                <div className="grid gap-4">
                  {status.active_users.map((user, index) => (
                    <article
                      key={user.user_id}
                      className={`rounded-[26px] border px-5 py-5 transition sm:px-6 ${
                        index === 0
                          ? 'border-[#c9ddda] bg-[#eef5f3] shadow-[0_16px_30px_rgba(22,63,57,0.08)]'
                          : 'border-[#eadfcd] bg-[#fdfaf4]'
                      }`}
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-4">
                          <div
                            className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl text-2xl font-semibold ${
                              index === 0 ? 'bg-[#153f3a] text-[#f4ebdb]' : 'bg-white text-slate-700'
                            }`}
                          >
                            {index + 1}
                          </div>
                          <div>
                            <div className="flex items-center gap-3">
                              <h3 className="text-2xl font-semibold text-slate-900">{user.name}</h3>
                              {index === 0 && (
                                <span className="rounded-full bg-[#d9ebe8] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#174d47]">
                                  Next up
                                </span>
                              )}
                            </div>
                            <p className="mt-2 font-mono text-sm font-semibold tracking-wide text-slate-500">Ticket {user.ticket_number || `#${user.user_id.substring(0, 6)}`}</p>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 shrink-0">
                          <div className="rounded-2xl border border-[#e7dcc7] bg-white/80 px-4 py-3 text-sm text-slate-600">
                            <div className="text-[11px] uppercase tracking-[0.18em] text-[#8d7652]">Service note</div>
                            <div className="mt-1">
                              {index === 0
                                ? 'Keep counter ready for the next walk-in.'
                                : `Estimated turn after ${Math.max(index * 3, 3)} min.`}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 justify-end mt-1">
                            <button onClick={() => handleRequeueUser(user.user_id)} className="text-xs font-semibold uppercase tracking-wider text-[#153f3a] hover:underline">Requeue</button>
                            <span className="text-slate-300">|</span>
                            <button onClick={() => handleRemoveUser(user.user_id)} className="text-xs font-semibold uppercase tracking-wider text-rose-600 hover:underline">Remove</button>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </section>
        </main>
      </div>

      {isManagingQueues && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-[32px] bg-white shadow-2xl">
            <div className="border-b border-slate-100 bg-slate-50 px-6 py-5">
              <h3 className="admin-display text-2xl text-slate-900">Manage Queues</h3>
              <p className="mt-1 text-sm text-slate-500">Create a new service desk queue</p>
            </div>
            <form onSubmit={handleCreateQueue} className="p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Queue ID</span>
                  <input type="text" required value={newQueue.queue_id} onChange={(e) => setNewQueue({ ...newQueue, queue_id: e.target.value })} placeholder="e.g. pharmacy" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#153f3a] focus:ring-2 focus:ring-[#153f3a]/20" />
                </label>
                <label className="block sm:col-span-2">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Display Name</span>
                  <input type="text" required value={newQueue.display_name} onChange={(e) => setNewQueue({ ...newQueue, display_name: e.target.value })} placeholder="e.g. Pharmacy Desk" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#153f3a] focus:ring-2 focus:ring-[#153f3a]/20" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Label</span>
                  <input type="text" required value={newQueue.counter_label} onChange={(e) => setNewQueue({ ...newQueue, counter_label: e.target.value })} placeholder="e.g. Counter 3" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#153f3a] focus:ring-2 focus:ring-[#153f3a]/20" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Subtitle</span>
                  <input type="text" required value={newQueue.admin_subtitle} onChange={(e) => setNewQueue({ ...newQueue, admin_subtitle: e.target.value })} placeholder="e.g. Prescription pickup" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#153f3a] focus:ring-2 focus:ring-[#153f3a]/20" />
                </label>
                <label className="block sm:col-span-2">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Description</span>
                  <input type="text" required value={newQueue.client_description} onChange={(e) => setNewQueue({ ...newQueue, client_description: e.target.value })} placeholder="e.g. For picking up ready prescriptions." className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#153f3a] focus:ring-2 focus:ring-[#153f3a]/20" />
                </label>
              </div>
              <div className="mt-8 flex justify-end gap-3">
                <button type="button" onClick={() => setIsManagingQueues(false)} className="rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
                <button type="submit" disabled={isCreatingQueue} className="rounded-xl bg-[#153f3a] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0f2d29] disabled:opacity-50">
                  {isCreatingQueue ? 'Creating...' : 'Create Queue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
