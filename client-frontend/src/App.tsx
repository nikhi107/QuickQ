import { useState, useEffect, useRef } from 'react';
import { Activity, XCircle, Clock, Users } from 'lucide-react';
import { API_BASE, WS_BASE } from './config';

const SESSION_STORAGE_KEY = 'quickq-client-session';

type QueueSession = {
  queueId: string;
  name: string;
  userId: string;
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
  const [isInQueue, setIsInQueue] = useState(Boolean(initialSession));

  const [position, setPosition] = useState<number | null>(null);
  const [totalWaiting, setTotalWaiting] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);

  const clearSession = () => {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  };

  const persistSession = (session: QueueSession) => {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  };

  useEffect(() => {
    if (!isInQueue || !userId) return;

    const ws = new WebSocket(`${WS_BASE}/ws/queue/${queueId}`);

    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'QUEUE_UPDATE') {
          setTotalWaiting(data.total_waiting);
          fetchPosition();
        }
      } catch (e) {
        console.error("Error parsing WS data", e);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    wsRef.current = ws;

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
      .then((data) => setTotalWaiting(data.total_waiting ?? 0))
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
          setPosition(null);
          setTotalWaiting(0);
          alert("It's your turn! Please proceed to the counter.");
        } else {
          setPosition(data.position);
        }
      }
    } catch (err) {
      console.error("Error fetching position", err);
    }
  };

  const generateUserId = () => {
    return Math.random().toString(36).substring(2, 9);
  };

  const handleJoinQueue = async () => {
    if (!name.trim()) return alert("Please enter your name first.");
    if (!queueId.trim()) return alert("Please enter a queue ID.");

    setIsLoading(true);
    const newUserId = generateUserId();

    try {
      const response = await fetch(`${API_BASE}/queue/${queueId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: newUserId, name: name.trim() })
      });

      const data = await response.json();
      if (response.ok) {
        setUserId(newUserId);
        setPosition(data.position);
        setIsInQueue(true);
        persistSession({
          queueId: queueId.trim(),
          name: name.trim(),
          userId: newUserId,
        });
      } else {
        alert(data.detail || "Unknown error joining queue");
      }
    } catch (error) {
      alert("Network Error: Could not connect to the server.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeaveQueue = async () => {
    if (confirm("Are you sure you want to give up your spot?")) {
      try {
        setIsLoading(true);
        await fetch(`${API_BASE}/queue/${queueId}/leave/${userId}`, {
          method: 'POST'
        });
        clearSession();
        setIsInQueue(false);
        setUserId('');
        setPosition(null);
        setTotalWaiting(0);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans sm:px-6 lg:px-8 py-12 px-4">
      {/* Header */}
      <div className="max-w-md w-full mx-auto flex flex-col items-center mb-8">
        <div className="bg-indigo-600 p-3 rounded-2xl shadow-lg mb-4">
          <Activity className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-4xl font-black text-indigo-600 tracking-tight text-center">QuickQ</h1>
        <p className="text-gray-500 font-medium mt-1">Smart Queue Management</p>
      </div>

      <div className="max-w-md w-full mx-auto">
        {!isInQueue ? (
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">👋</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Join the Line</h2>
              <p className="text-gray-500 mt-2">Enter your details to get a virtual ticket.</p>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Queue ID</label>
                <input
                  type="text"
                  value={queueId}
                  onChange={(e) => setQueueId(e.target.value)}
                  placeholder="e.g. main-clinic"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Your Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow outline-none"
                />
              </div>

              <button
                onClick={handleJoinQueue}
                disabled={!name.trim() || !queueId.trim() || isLoading}
                className="w-full mt-4 bg-indigo-600 text-white font-bold py-4 px-4 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-md flex justify-center items-center h-14"
              >
                {isLoading ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  "Get Ticket"
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden border-2 border-indigo-100 p-8 relative">

            {/* Live Status Header */}
            <div className="flex items-center justify-center mb-8 bg-gray-50 py-2 px-4 rounded-full w-max mx-auto border border-gray-100">
              <div className={`w-2.5 h-2.5 rounded-full mr-2 ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                {isConnected ? 'Live Updates Active' : 'Connecting...'}
              </span>
            </div>

            <div className="text-center mb-8">
              <h2 className="text-2xl text-gray-900 font-medium">Hey <span className="font-extrabold text-indigo-600">{name}</span>!</h2>
              <p className="text-gray-500 mt-2">You are currently in queue: <span className="font-bold bg-gray-100 px-2 py-0.5 rounded text-gray-700">{queueId}</span></p>
              <p className="text-sm text-gray-500 mt-3">Your ticket ID: <span className="font-mono font-semibold text-gray-700">{userId}</span></p>
            </div>

            {/* Huge Position Indicator */}
            <div className="flex justify-center mb-10">
              <div className="w-48 h-48 rounded-full bg-indigo-50 flex items-center justify-center relative">
                <div className="w-40 h-40 rounded-full bg-indigo-600 shadow-[0_0_30px_rgba(79,70,229,0.4)] flex flex-col items-center justify-center text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-10 -mt-10"></div>
                  <span className="text-6xl font-black leading-none">{position || '-'}</span>
                  <span className="text-indigo-200 text-sm font-semibold mt-1 uppercase tracking-wider">Your Position</span>
                </div>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-100">
                <div className="flex justify-center mb-1"><Users className="w-5 h-5 text-gray-400" /></div>
                <div className="text-2xl font-bold text-gray-900">{totalWaiting}</div>
                <div className="text-xs font-bold text-gray-500 uppercase mt-1">Total Waiting</div>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-100">
                <div className="flex justify-center mb-1"><Clock className="w-5 h-5 text-gray-400" /></div>
                <div className="text-2xl font-bold text-gray-900">~{((position || 1) * 3)}m</div>
                <div className="text-xs font-bold text-gray-500 uppercase mt-1">Est. Wait</div>
              </div>
            </div>

            <button
              onClick={handleLeaveQueue}
              disabled={isLoading}
              className="w-full bg-white border-2 border-red-200 text-red-500 font-bold py-3 px-4 rounded-xl hover:bg-red-50 hover:border-red-300 transition-colors flex justify-center items-center disabled:opacity-50"
            >
              <XCircle className="w-5 h-5 mr-2" />
              Leave Queue
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
