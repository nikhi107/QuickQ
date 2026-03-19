import { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';
import type { QueueDefinition, QueueStatus } from './types';
import { API_BASE, WS_BASE } from './config';

export function DisplayBoard() {
  const [queueId, setQueueId] = useState(() => {
    return new URLSearchParams(window.location.search).get('queue') || '';
  });
  const [queues, setQueues] = useState<QueueDefinition[]>([]);
  const [status, setStatus] = useState<QueueStatus | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/queues`)
      .then((res) => res.json())
      .then((data: QueueDefinition[]) => {
        setQueues(data);
        if (!queueId && data.length > 0) {
          setQueueId(data[0].queue_id);
        }
      })
      .catch((err) => console.error('Error fetching queues', err));
  }, []);

  useEffect(() => {
    if (!queueId) return;

    fetch(`${API_BASE}/queue/${queueId}/status`)
      .then((res) => res.json())
      .then((data: QueueStatus) => setStatus(data))
      .catch((err) => console.error(err));

    const ws = new WebSocket(`${WS_BASE}/ws/queue/${queueId}`);

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'QUEUE_UPDATE') {
          setStatus((prev) => ({
            ...(prev || { queue_id: queueId, active_users: [], total_waiting: 0 }),
            active_users: payload.active_users,
            total_waiting: payload.total_waiting,
            serving_user: payload.serving_user,
          }));
        }
      } catch (err) {
        console.error(err);
      }
    };

    return () => {
      ws.close();
    };
  }, [queueId]);

  const selectedQueue = queues.find((q) => q.queue_id === queueId);
  const nowServing = status?.serving_user;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(17,76,70,0.2),_transparent_40%),linear-gradient(180deg,_#1c1c1e_0%,_#121212_100%)] text-white font-sans overflow-hidden flex flex-col">
      <header className="flex items-center justify-between p-8 border-b border-white/10 bg-black/40 backdrop-blur-md">
        <div className="flex items-center gap-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[#143f39] text-[#f5eddf] shadow-2xl">
            <Activity className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-white/90">
              {selectedQueue?.display_name || 'Loading Queue...'}
            </h1>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#8d7652] mt-1">
              {selectedQueue?.counter_label || 'Standby'}
            </p>
          </div>
        </div>
        <div>
          {queues.length > 0 && (
            <select
              value={queueId}
              onChange={(e) => {
                setQueueId(e.target.value);
                const url = new URL(window.location.href);
                url.searchParams.set('queue', e.target.value);
                window.history.pushState({}, '', url.toString());
              }}
              className="bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white/80 outline-none focus:ring-2 focus:ring-[#8d7652]"
            >
              {queues.map((q) => (
                <option key={q.queue_id} value={q.queue_id} className="text-black">
                  {q.display_name}
                </option>
              ))}
            </select>
          )}
        </div>
      </header>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-8 p-8">
        <div className="flex flex-col justify-center items-center rounded-[3rem] bg-white/5 border border-white/10 backdrop-blur-xl p-12 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 to-[#143f39]"></div>
          
          <h2 className="text-2xl font-bold uppercase tracking-[0.3em] text-[#8d7652] mb-8">Now Serving</h2>
          
          {nowServing ? (
            <div className="animate-in zoom-in duration-500">
              <div className="text-[10rem] font-bold font-mono tracking-tighter leading-none text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                {nowServing.ticket_number || nowServing.user_id.substring(0, 6).toUpperCase()}
              </div>
              <div className="mt-8 text-5xl font-medium text-white/80">
                {nowServing.name}
              </div>
              <div className="mt-12 inline-block rounded-full bg-emerald-500/20 px-8 py-4 text-2xl font-semibold text-emerald-400 border border-emerald-500/30">
                Please proceed to {selectedQueue?.counter_label || 'the desk'}
              </div>
            </div>
          ) : (
            <div className="opacity-50">
              <div className="h-32"></div>
              <div className="text-4xl font-medium text-white/50">Counter Available</div>
              <p className="mt-4 text-xl text-white/30">Waiting for next patient...</p>
            </div>
          )}
        </div>

        <div className="flex flex-col bg-black/40 rounded-[3rem] border border-white/5 p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
            <h2 className="text-xl font-bold uppercase tracking-[0.2em] text-white/70">Next Up</h2>
            <div className="rounded-full bg-white/10 px-4 py-1 text-sm font-semibold tracking-widest text-[#8d7652]">
              {status?.total_waiting || 0} WAITING
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-4">
            {status?.active_users && status.active_users.length > 0 ? (
              status.active_users.slice(0, 7).map((user, index) => (
                <div 
                  key={user.user_id}
                  className="flex items-center justify-between bg-white/5 border border-white/5 rounded-2xl p-5"
                >
                  <div className="flex items-center gap-6">
                    <span className="text-2xl font-bold text-white/30 w-8">{index + 1}</span>
                    <span className="text-2xl font-medium text-white/90">{user.name}</span>
                  </div>
                  <div className="font-mono text-2xl font-bold text-[#8d7652]">
                    {user.ticket_number || user.user_id.substring(0, 6).toUpperCase()}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex-1 flex items-center justify-center text-white/30 text-xl flex-col gap-4">
                <div className="w-16 h-16 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center">
                  - 
                </div>
                Queue is empty
              </div>
            )}
            
            {(status?.active_users?.length || 0) > 7 && (
              <div className="text-center mt-4 text-white/40 text-sm font-medium tracking-widest uppercase">
                + {(status?.active_users?.length || 0) - 7} more waiting
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
