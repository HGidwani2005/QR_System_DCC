import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import toast from 'react-hot-toast';

export default function StudentDashboard() {
  const { profile, user, logout } = useAuth();
  const [data, setData] = useState({ records: [], attended: 0, totalMeetings: 0, percentage: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/attendance/my').then(res => {
      setData(res.data);
    }).catch(() => toast.error('Failed to load attendance.')).finally(() => setLoading(false));
  }, []);

  const statusColor = data.percentage >= 75 ? 'text-primary' : 'text-red-600';
  const barColor = data.percentage >= 75 ? 'bg-primary' : 'bg-red-500';
  const status = data.percentage >= 90 ? 'Excellent' : data.percentage >= 75 ? 'Good' : data.percentage >= 60 ? 'Average' : 'At Risk';

  return (
    <div className="font-display bg-background-light min-h-screen">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div className="flex items-center gap-3 text-primary">
          <div className="size-8 flex items-center justify-center bg-primary text-white rounded-lg">
            <span className="material-symbols-outlined text-xl">school</span>
          </div>
          <h2 className="text-slate-900 text-xl font-bold tracking-tight">Dean Career Cloud</h2>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-500 hidden sm:block">{user?.email}</span>
          <button onClick={logout} className="text-sm font-medium text-red-500 hover:text-red-700 transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-base">logout</span>
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 flex flex-col gap-8">
        {/* Welcome */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="size-20 rounded-full bg-primary flex items-center justify-center text-white text-3xl font-black ring-4 ring-primary/10">
            {profile?.name?.charAt(0) || '?'}
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-2xl font-black text-slate-900">{profile?.name}</h1>
            <p className="text-primary font-semibold text-sm">{profile?.position}</p>
            <p className="text-slate-500 text-sm">{profile?.enrollment} • Year {profile?.year}</p>
          </div>
        </div>

        {/* Attendance Summary Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col gap-5">
          <h2 className="text-lg font-bold text-slate-900">My Attendance Summary</h2>

          {loading ? (
            <div className="py-8 text-center text-slate-400">Loading...</div>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-sm font-medium text-slate-600">
                  <span>Overall Attendance</span>
                  <span className={`font-bold text-lg ${statusColor}`}>{data.percentage}%</span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${barColor} rounded-full transition-all duration-700`} style={{ width: `${data.percentage}%` }} />
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>{data.attended} meetings attended</span>
                  <span>out of {data.totalMeetings} total</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Attended', value: data.attended, color: 'text-primary', bg: 'bg-primary/5' },
                  { label: 'Missed', value: Math.max(0, data.totalMeetings - data.attended), color: 'text-red-600', bg: 'bg-red-50' },
                  { label: 'Status', value: status, color: data.percentage >= 75 ? 'text-emerald-700' : 'text-red-700', bg: data.percentage >= 75 ? 'bg-emerald-50' : 'bg-red-50' },
                ].map(({ label, value, color, bg }) => (
                  <div key={label} className={`${bg} rounded-xl p-4 text-center border border-slate-100`}>
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">{label}</p>
                    <p className={`text-xl font-black ${color}`}>{value}</p>
                  </div>
                ))}
              </div>

              {data.percentage < 75 && (
                <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
                  <span className="material-symbols-outlined text-red-500 mt-0.5">warning</span>
                  <div>
                    <p className="text-red-800 font-semibold text-sm">Attendance Below Threshold</p>
                    <p className="text-red-600 text-xs mt-0.5">Minimum 75% attendance is required. Please attend upcoming meetings.</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Recent Attendance */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col gap-4">
          <h2 className="text-lg font-bold text-slate-900">Recent Attendance</h2>
          {loading ? (
            <div className="py-4 text-center text-slate-400 text-sm">Loading...</div>
          ) : data.records.length === 0 ? (
            <div className="py-6 text-center text-slate-400 text-sm">
              No attendance records yet. Scan a QR code at your next meeting!
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-slate-100">
              {data.records.slice(0, 10).map((rec) => {
                const ts = rec.timestamp?._seconds
                  ? new Date(rec.timestamp._seconds * 1000)
                  : new Date(rec.timestamp);
                return (
                  <div key={rec.id} className="flex items-center gap-4 py-3">
                    <div className="size-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[18px]">check_circle</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{rec.meetingTitle}</p>
                      <p className="text-xs text-slate-500">{rec.meetingDate}</p>
                    </div>
                    <p className="text-xs text-slate-400 shrink-0">{ts.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
