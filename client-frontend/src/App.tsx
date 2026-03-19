import { useEffect, useState } from 'react';
import { Activity, Clock3, Ticket, Users, XCircle } from 'lucide-react';
import { API_BASE, WS_BASE } from './config';

const SESSION_STORAGE_KEY = 'quickq-client-session';

type QueueSession = {
  queueId: string;
  name: string;
  userId: string;
  ticketNumber?: string;
};

type QueueDefinition = {
  queue_id: string;
  display_name: string;
  admin_subtitle: string;
  client_description: string;
  counter_label: string;
  accent_from: string;
  accent_to: string;
};

const loadStoredSession = (): QueueSession | null => {
  const raw = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<QueueSession>;
    if (!parsed.queueId || !parsed.name || !parsed.userId) {
      return null;
    }

    return {
      queueId: parsed.queueId,
      name: parsed.name,
      userId: parsed.userId,
      ticketNumber: parsed.ticketNumber,
    };
  } catch {
    return null;
  }
};

function App() {
  const initialSession = loadStoredSession();
  const [queueId, setQueueId] = useState(initialSession?.queueId ?? '');
  const [name, setName] = useState(initialSession?.name ?? '');
  const [userId, setUserId] = useState(initialSession?.userId ?? '');
  const [ticketNumber, setTicketNumber] = useState(initialSession?.ticketNumber ?? '');
  const [isInQueue, setIsInQueue] = useState(Boolean(initialSession));
  const [queues, setQueues] = useState<QueueDefinition[]>([]);

  const [position, setPosition] = useState<number | null>(null);
  const [totalWaiting, setTotalWaiting] = useState(0);
  const [avgWaitTimeSeconds, setAvgWaitTimeSeconds] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const selectedQueue = queues.find((queue) => queue.queue_id === queueId) ?? null;
  const estimatedWaitMinutes = Math.max(1, Math.round((position || 1) * (avgWaitTimeSeconds > 0 ? avgWaitTimeSeconds / 60 : 3)));

  const clearSession = () => {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  };

  const persistSession = (session: QueueSession) => {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  };

  useEffect(() => {
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
        setQueueId((currentQueueId) => {
          if (data.some((queue) => queue.queue_id === currentQueueId)) {
            return currentQueueId;
          }

          return data[0]?.queue_id ?? '';
        });
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
  }, []);

  useEffect(() => {
    if (queueId && queues.some((queue) => queue.queue_id === queueId)) {
      return;
    }

    if (queues.length === 0) {
      return;
    }

    clearSession();
    setIsInQueue(false);
    setUserId('');
    setTicketNumber('');
    setPosition(null);
    setTotalWaiting(0);
    setQueueId(queues[0]?.queue_id ?? '');
  }, [queueId, queues]);

  useEffect(() => {
    if (!isInQueue || !userId) {
      return;
    }

    const ws = new WebSocket(`${WS_BASE}/ws/queue/${queueId}`);

    ws.onopen = () => setIsConnected(true);
    ws.onclose = () => setIsConnected(false);
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'QUEUE_UPDATE') {
          setTotalWaiting(data.total_waiting);
          if (data.average_wait_time_seconds !== undefined) {
            setAvgWaitTimeSeconds(data.average_wait_time_seconds);
          }
          fetchPosition();
        }
      } catch (e) {
        console.error('Error parsing WS data', e);
      }
    };

    return () => {
      ws.close();
    };
  }, [isInQueue, userId, queueId]);

  useEffect(() => {
    if (!isInQueue || !userId) {
      return;
    }

    fetch(`${API_BASE}/queue/${queueId}/status`)
      .then((response) => response.json())
      .then((data) => {
        setTotalWaiting(data.total_waiting ?? 0);
        setAvgWaitTimeSeconds(data.average_wait_time_seconds ?? 0);
      })
      .catch((err) => console.error('Error fetching queue status', err));

    fetchPosition();
  }, [isInQueue, userId, queueId]);

  const fetchPosition = async () => {
    try {
      const response = await fetch(`${API_BASE}/queue/${queueId}/position/${userId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.position === null) {
          clearSession();
          setIsInQueue(false);
          setUserId('');
          setTicketNumber('');
          setPosition(null);
          setTotalWaiting(0);
          alert("It's your turn! Please proceed to the counter.");
        } else {
          setPosition(data.position);
        }
      }
    } catch (err) {
      console.error('Error fetching position', err);
    }
  };

  const generateUserId = () => Math.random().toString(36).substring(2, 9);

  const handleJoinQueue = async () => {
    if (!name.trim()) {
      alert('Please enter your name first.');
      return;
    }

    if (!queueId.trim()) {
      alert('Please choose a queue.');
      return;
    }

    setIsLoading(true);
    const newUserId = generateUserId();

    try {
      const response = await fetch(`${API_BASE}/queue/${queueId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: newUserId, name: name.trim() }),
      });

      const data = await response.json();
      if (response.ok) {
        setUserId(newUserId);
        setTicketNumber(data.ticketNumber);
        setPosition(data.position);
        setIsInQueue(true);
        persistSession({
          queueId: queueId.trim(),
          name: name.trim(),
          userId: newUserId,
          ticketNumber: data.ticketNumber
        });
      } else {
        alert(data.detail || 'Unknown error joining queue');
      }
    } catch (error) {
      alert('Network Error: Could not connect to the server.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeaveQueue = async () => {
    if (!confirm('Are you sure you want to give up your spot?')) {
      return;
    }

    try {
      setIsLoading(true);
      await fetch(`${API_BASE}/queue/${queueId}/leave/${userId}`, {
        method: 'POST',
      });
      clearSession();
      setIsInQueue(false);
      setUserId('');
      setTicketNumber('');
      setPosition(null);
      setTotalWaiting(0);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(17,76,70,0.18),_transparent_24%),linear-gradient(180deg,_#f6efe1_0%,_#f1e8d7_40%,_#fbf8f1_100%)] px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-col gap-4 rounded-[28px] border border-white/70 bg-white/70 px-5 py-5 shadow-[0_18px_50px_rgba(77,58,28,0.08)] backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#143f39] text-[#f5eddf] shadow-lg">
              <Activity className="h-7 w-7" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[#8d7652]">QuickQ Check-In</p>
              <h1 className="client-display text-4xl text-slate-900">Walk-in Queue</h1>
            </div>
          </div>

          <div className="rounded-2xl border border-[#ddcfb7] bg-[#fbf8f1] px-4 py-3 text-sm text-slate-600">
            <div className="text-[11px] uppercase tracking-[0.2em] text-[#8d7652]">Live Status</div>
            <div className="mt-1 flex items-center gap-2 font-medium text-slate-900">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  isConnected ? 'bg-emerald-500 shadow-[0_0_14px_rgba(16,185,129,0.7)]' : 'bg-amber-500'
                }`}
              />
              {isInQueue ? (isConnected ? 'Updates active' : 'Syncing your ticket') : 'Ready to join'}
            </div>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <section className="overflow-hidden rounded-[32px] bg-[#173834] text-[#f4ebdb] shadow-[0_28px_60px_rgba(17,24,39,0.22)]">
            <div className="border-b border-white/10 px-6 py-6 sm:px-8">
              <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.22em] text-[#d9ccb5]">
                <Ticket className="h-4 w-4 text-[#efc15b]" />
                Visitor Ticketing
              </div>
              <h2 className="client-display mt-6 text-5xl leading-tight text-white">
                {isInQueue ? 'Your place is reserved.' : 'Check in without standing in line.'}
              </h2>
              <p className="mt-5 max-w-lg text-sm leading-7 text-[#d7ccb7] sm:text-base">
                {isInQueue
                  ? 'Keep this screen open. The queue updates automatically, and you will be notified when it is your turn.'
                  : 'Choose the service counter, enter your name, and get a live ticket linked to the front-desk dashboard.'}
              </p>
            </div>

            <div className="grid gap-4 px-6 py-6 sm:px-8">
              <div className="rounded-[26px] border border-white/10 bg-white/10 p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-[#cabf99]">
                  Selected Queue
                </p>
                <div className="mt-3 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-2xl font-semibold text-white">
                      {queueId ? (selectedQueue?.display_name ?? 'Choose a service') : 'Choose a service'}
                    </div>
                    <div className="mt-1 text-sm text-[#d7ccb7]">
                      {queueId
                        ? (selectedQueue?.client_description ?? 'Queue details are loading from staff controls.')
                        : 'Available desks are managed live by staff.'}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-black/15 px-4 py-3 text-right">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-[#cabf99]">Desk</div>
                    <div className="mt-1 text-sm font-medium text-white">
                      {queueId ? (selectedQueue?.counter_label ?? '--') : '--'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[24px] border border-white/10 bg-white/10 p-5">
                  <div className="flex items-center gap-3 text-[#cabf99]">
                    <Users className="h-4 w-4" />
                    <span className="text-xs uppercase tracking-[0.2em]">People Waiting</span>
                  </div>
                  <div className="mt-4 text-4xl font-semibold text-white">{totalWaiting}</div>
                  <p className="mt-2 text-sm text-[#d7ccb7]">Live count for the selected queue.</p>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-white/10 p-5">
                  <div className="flex items-center gap-3 text-[#cabf99]">
                    <Clock3 className="h-4 w-4" />
                    <span className="text-xs uppercase tracking-[0.2em]">Estimated Wait</span>
                  </div>
                  <div className="mt-4 text-4xl font-semibold text-white">~{estimatedWaitMinutes}m</div>
                  <p className="mt-2 text-sm text-[#d7ccb7]">Approximate and refreshed with queue movement.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[32px] border border-white/70 bg-white/80 p-6 shadow-[0_22px_60px_rgba(77,58,28,0.08)] backdrop-blur sm:p-8">
            {!isInQueue ? (
              <>
                <div className="mb-8">
                  <p className="text-xs uppercase tracking-[0.24em] text-[#8d7652]">Self Check-In</p>
                  <h2 className="client-display mt-2 text-4xl text-slate-900">Join the queue</h2>
                  <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600">
                    Your ticket is created instantly and stays synced with the staff dashboard. You only need your name and the service counter you want to visit.
                  </p>
                </div>

                <div className="space-y-5">
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-[#8d7652]">
                      Select Queue
                    </span>
                    <select
                      value={queueId}
                      onChange={(e) => setQueueId(e.target.value)}
                      disabled={queues.length === 0}
                      className="w-full rounded-2xl border border-[#d7c8b1] bg-[#fbf8f1] px-4 py-3.5 text-slate-900 outline-none transition focus:border-[#143f39] focus:ring-4 focus:ring-[#143f39]/10"
                    >
                      {queues.length === 0 ? (
                        <option value="">No service counters available</option>
                      ) : (
                        <>
                          <option value="" disabled>
                            Choose a service counter
                          </option>
                          {queues.map((queue) => (
                            <option key={queue.queue_id} value={queue.queue_id}>
                              {queue.display_name}
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-[#8d7652]">
                      Your Name
                    </span>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Nikhil"
                      className="w-full rounded-2xl border border-[#d7c8b1] bg-[#fbf8f1] px-4 py-3.5 text-slate-900 outline-none transition focus:border-[#143f39] focus:ring-4 focus:ring-[#143f39]/10"
                    />
                  </label>

                  <div className="rounded-[24px] border border-[#e6dcc9] bg-[#fcfaf5] px-5 py-4 text-sm leading-6 text-slate-600">
                    Staff will call your name when it is your turn. Keep this page open if you want live position updates.
                  </div>

                  <button
                    onClick={handleJoinQueue}
                    disabled={!name.trim() || !queueId.trim() || isLoading || queues.length === 0}
                    className="flex h-14 w-full items-center justify-center rounded-2xl bg-[#143f39] px-5 text-sm font-semibold uppercase tracking-[0.18em] text-[#f7f2e8] transition hover:bg-[#103530] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isLoading ? (
                      <div className="h-6 w-6 rounded-full border-2 border-[#f7f2e8] border-t-transparent animate-spin" />
                    ) : (
                      'Get Ticket'
                    )}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-[#8d7652]">Live Ticket</p>
                    <h2 className="client-display mt-2 text-4xl text-slate-900">You are checked in</h2>
                    <p className="mt-3 text-sm leading-7 text-slate-600">
                      Stay nearby. Your ticket is active for <span className="font-semibold text-slate-900">{selectedQueue?.display_name ?? 'the selected service'}</span> and updates automatically.
                    </p>
                  </div>

                  <div className="inline-flex items-center gap-2 rounded-full border border-[#d7ccb6] bg-[#fbf8f1] px-4 py-2 text-sm font-medium text-slate-700">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        isConnected ? 'bg-emerald-500 shadow-[0_0_14px_rgba(16,185,129,0.7)]' : 'bg-amber-500'
                      }`}
                    />
                    {isConnected ? 'Live updates active' : 'Connecting'}
                  </div>
                </div>

                <div className="rounded-[32px] border border-[#d9ccb6] bg-[#fcfaf5] p-5 sm:p-7">
                  <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                    <div className="rounded-[28px] bg-[#173834] p-6 text-[#f4ebdb] shadow-[0_20px_45px_rgba(17,24,39,0.18)]">
                      <div className="text-[11px] uppercase tracking-[0.24em] text-[#cabf99]">Position</div>
                      <div className="mt-4 text-7xl font-semibold leading-none text-white">
                        {position || '-'}
                      </div>
                      <div className="mt-5 text-sm leading-6 text-[#d7ccb7]">
                        Ticket <span className="font-mono text-white text-lg font-bold">{ticketNumber || userId}</span>
                      </div>
                    </div>

                    <div className="grid gap-4">
                      <div className="rounded-[24px] border border-[#e6dcc9] bg-white p-5">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-[#8d7652]">Passenger</p>
                        <div className="mt-2 text-2xl font-semibold text-slate-900">{name}</div>
                        <div className="mt-1 text-sm text-slate-600">
                          {selectedQueue?.display_name ?? 'Queue unavailable'} • {selectedQueue?.counter_label ?? '--'}
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="rounded-[24px] border border-[#e6dcc9] bg-white p-5">
                          <p className="text-[11px] uppercase tracking-[0.2em] text-[#8d7652]">People Waiting</p>
                          <div className="mt-2 text-3xl font-semibold text-slate-900">{totalWaiting}</div>
                        </div>
                        <div className="rounded-[24px] border border-[#e6dcc9] bg-white p-5">
                          <p className="text-[11px] uppercase tracking-[0.2em] text-[#8d7652]">Estimated Wait</p>
                          <div className="mt-2 text-3xl font-semibold text-slate-900">~{estimatedWaitMinutes}m</div>
                        </div>
                      </div>

                      <button
                        onClick={handleLeaveQueue}
                        disabled={isLoading}
                        className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-5 text-sm font-semibold uppercase tracking-[0.16em] text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <XCircle className="h-4 w-4" />
                        Leave Queue
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default App;
