import { useState, useEffect, useRef } from 'react';
import { Users, UserCheck, Activity, Play, Settings, BellRing, Lock } from 'lucide-react';
import type { QueueStatus, User, CallNextResponse } from './types';
import { API_BASE, WS_BASE } from './config';

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem("adminToken"));
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);

  const [queueId, setQueueId] = useState('main-clinic');
  const [status, setStatus] = useState<QueueStatus | null>(null);
  const [calledUser, setCalledUser] = useState<User | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [analytics, setAnalytics] = useState({ average_wait_time_seconds: 0, total_served: 0 });
  const wsRef = useRef<WebSocket | null>(null);

  const fetchAnalytics = async () => {
    if (!token) return;
    try {
      const resp = await fetch(`${API_BASE}/analytics/history`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
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

  // Initialize WebSocket connection & Analytics
  useEffect(() => {
    if (!token) return;

    fetchAnalytics(); // Fetch analytics on load

    const ws = new WebSocket(`${WS_BASE}/ws/queue/${queueId}`);

    ws.onopen = () => setIsConnected(true);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'QUEUE_UPDATE') {
        setStatus({
          queue_id: data.queue_id,
          active_users: data.active_users,
          total_waiting: data.total_waiting,
        });
        fetchAnalytics(); // Refresh analytics when queue changes
      }
    };

    ws.onclose = () => setIsConnected(false);
    wsRef.current = ws;

    // Initial fetch
    fetch(`${API_BASE}/queue/${queueId}/status`)
      .then(res => res.json())
      .then(data => setStatus(data))
      .catch(err => console.error("Error fetching status:", err));

    return () => {
      ws.close();
    };
  }, [queueId, token]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    try {
      if (isSignUp) {
        // Sign Up Flow
        const resp = await fetch(`${API_BASE}/admin/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });

        if (resp.ok) {
          const data = await resp.json();
          setToken(data.access_token);
          localStorage.setItem("adminToken", data.access_token);
        } else {
          const errData = await resp.json();
          setLoginError(errData.detail || "Signup failed");
        }
      } else {
        // Log In Flow
        const formData = new URLSearchParams();
        formData.append("username", username);
        formData.append("password", password);

        const resp = await fetch(`${API_BASE}/admin/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString()
        });

        if (resp.ok) {
          const data = await resp.json();
          setToken(data.access_token);
          localStorage.setItem("adminToken", data.access_token);
        } else {
          setLoginError("Invalid username or password");
        }
      }
    } catch (err) {
      setLoginError("Failed to connect to server");
    }
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem("adminToken");
  };

  const handleCallNext = async () => {
    try {
      const resp = await fetch(`${API_BASE}/queue/${queueId}/next`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (resp.status === 401) {
        handleLogout();
        return;
      }

      const data: CallNextResponse = await resp.json();
      if (data.called_user) {
        setCalledUser(data.called_user);
      } else {
        alert("Queue is empty!");
      }
    } catch (err) {
      console.error("Error calling next:", err);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-xl border border-gray-100">
          <div>
            <div className="mx-auto h-16 w-16 bg-indigo-100 rounded-full flex items-center justify-center">
              <Lock className="h-8 w-8 text-indigo-600" />
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              {isSignUp ? "Create Admin Account" : "Admin Login"}
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              {isSignUp ? "Register to manage queues" : "Enter your credentials to manage queues"}
            </p>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleAuth}>
            {loginError && (
              <div className="bg-red-50 text-red-500 p-3 rounded-lg text-sm text-center border border-red-200">
                {loginError}
              </div>
            )}
            <div className="rounded-md shadow-sm space-y-4">
              <div>
                <input
                  type="text"
                  required
                  className="appearance-none rounded-lg relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Username (e.g. admin)"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div>
                <input
                  type="password"
                  required
                  className="appearance-none rounded-lg relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Password (e.g. admin123)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-md transition-all active:scale-95"
              >
                {isSignUp ? "Sign Up" : "Sign In"}
              </button>
            </div>
          </form>
          <div className="text-center mt-4 text-sm text-gray-600">
            {isSignUp ? "Already have an account? " : "Don't have an account? "}
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setLoginError("");
                setUsername("");
                setPassword("");
              }}
              className="text-indigo-600 font-semibold hover:text-indigo-500"
            >
              {isSignUp ? "Sign in here" : "Sign up here"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">QuickQ Admin</h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'}`} />
              <span className="text-gray-600 font-medium">{isConnected ? 'Live' : 'Disconnected'}</span>
            </div>
            <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-red-600 font-medium ml-4 transition-colors">
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left Column - Controls & Currently Serving */}
        <div className="space-y-6 lg:col-span-1 border-r border-gray-200 lg:pr-8">

          {/* Queue Selector */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 transition-all hover:shadow-md">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center">
              <Settings className="w-4 h-4 mr-2" />
              Active Queue
            </h2>
            <select
              value={queueId}
              onChange={(e) => setQueueId(e.target.value)}
              className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-3 pr-10 hover:border-indigo-400 transition-colors cursor-pointer"
            >
              <option value="main-clinic">Main Clinic</option>
              <option value="pharmacy">Pharmacy</option>
              <option value="support-desk">Support Desk</option>
            </select>
          </div>

          {/* Currently Serving Panel */}
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl shadow-lg p-6 text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-white opacity-10 group-hover:scale-110 transition-transform duration-500" />
            <h2 className="text-indigo-100 font-medium flex items-center text-sm uppercase tracking-wider mb-2">
              <BellRing className="w-4 h-4 mr-2" />
              Currently Serving
            </h2>
            <div className="mt-4 flex flex-col items-center justify-center min-h-[120px] bg-white/10 rounded-xl backdrop-blur-sm border border-white/20 p-4">
              {calledUser ? (
                <>
                  <div className="text-sm text-indigo-200 mb-1">Ticket / User ID</div>
                  <div className="text-4xl font-black tracking-wider mb-2 drop-shadow-md">
                    {calledUser.user_id.substring(0, 6).toUpperCase()}
                  </div>
                  <div className="text-xl font-medium truncate w-full text-center">
                    {calledUser.name}
                  </div>
                </>
              ) : (
                <div className="text-indigo-200 text-lg">No one currently called</div>
              )}
            </div>

            <button
              onClick={handleCallNext}
              disabled={status?.total_waiting === 0}
              className="mt-6 w-full bg-white text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold py-4 px-6 rounded-xl shadow-md transition-all active:scale-95 flex justify-center items-center text-lg"
            >
              <Play className="w-5 h-5 mr-2" />
              Call Next Person
            </button>
          </div>

          {/* Stats Summary - Analytics */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center">
              <Activity className="w-4 h-4 mr-2" />
              System Analytics
            </h2>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Avg Wait Time</p>
                <p className="text-xl font-bold text-gray-900 mt-0.5">
                  {Math.round(analytics.average_wait_time_seconds / 60)} <span className="text-sm font-medium text-gray-500">mins</span>
                </p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-bold">⏱</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Total Served</p>
                <p className="text-xl font-bold text-gray-900 mt-0.5">
                  {analytics.total_served} <span className="text-sm font-medium text-gray-500">users</span>
                </p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-green-600" />
              </div>
            </div>

          </div>
        </div>

        {/* Right Column - Queue List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full min-h-[600px]">
            <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Users className="w-5 h-5 mr-2 text-indigo-500" />
                Waiting Line Queue
              </h2>
              <span className="bg-indigo-100 text-indigo-800 text-sm font-bold px-4 py-1.5 rounded-full flex items-center ring-1 ring-indigo-200">
                <span className="w-2 h-2 rounded-full bg-indigo-500 mr-2 animate-pulse" />
                {status?.total_waiting || 0} Waiting
              </span>
            </div>

            <div className="flex-1 overflow-y-auto w-full">
              {!status || status.active_users.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-gray-400">
                  <UserCheck className="w-16 h-16 mb-4 text-gray-300" />
                  <p className="text-lg font-medium">Queue is currently empty</p>
                  <p className="text-sm mt-1">Waiting for users to join...</p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-100 p-2">
                  {status.active_users.map((user, index) => (
                    <li key={user.user_id} className="group hover:bg-indigo-50/50 p-4 rounded-xl transition-all mb-1 border border-transparent hover:border-indigo-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center min-w-0">
                          <div className={`flex-shrink-0 h-14 w-14 rounded-full flex items-center justify-center text-xl font-bold shadow-sm ${index === 0 ? 'bg-gradient-to-br from-indigo-100 to-indigo-200 text-indigo-700 ring-2 ring-indigo-300 ring-offset-2' : 'bg-gray-100 text-gray-600'}`}>
                            {index + 1}
                          </div>
                          <div className="ml-5 truncate">
                            <p className="text-lg font-semibold text-gray-900 truncate group-hover:text-indigo-900 transition-colors">
                              {user.name}
                            </p>
                            <div className="flex items-center mt-1 space-x-3 text-sm text-gray-500">
                              <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-xs select-all"># {user.user_id}</span>
                              {index === 0 && <span className="text-indigo-600 font-medium flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mr-1.5 animate-pulse"></span>Next up</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
