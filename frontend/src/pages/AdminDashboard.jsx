import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const [summaryRes, meetingsRes] = await Promise.all([
          api.get('/api/analytics/summary'),
          api.get('/api/meetings'),
        ]);
        setStats(summaryRes.data);
        // Build activity from recent meetings
        const meetings = meetingsRes.data.meetings || [];
        const activity = meetings.slice(0, 5).map((m) => ({
          icon: 'qr_code',
          color: 'purple',
          text: `QR Code session: <strong>${m.title}</strong>`,
          time: new Date(m.createdAt?._seconds ? m.createdAt._seconds * 1000 : m.createdAt).toLocaleString('en-IN'),
        }));
        setRecentActivity(activity);
      } catch (err) {
        toast.error('Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleExport() {
    try {
      const res = await api.get('/api/export/attendance', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `DCC_Attendance_${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      toast.success('Export downloaded!');
    } catch (err) {
      toast.error('Export failed.');
    }
  }

  const statCards = [
    {
      label: 'Total Members',
      value: loading ? '—' : stats?.totalMembers ?? '—',
      icon: 'groups',
      badge: null,
    },
    {
      label: "Today's Attendance",
      value: loading ? '—' : stats?.todayAttendancePercent != null ? `${stats.todayAttendancePercent}%` : 'N/A',
      icon: 'how_to_reg',
      badge: stats?.todayAttendancePercent != null ? { text: 'Today', color: 'emerald' } : null,
    },
    {
      label: 'Upcoming Meetings',
      value: loading ? '—' : stats?.upcomingMeetingsCount ?? 0,
      icon: 'event',
      badge: { text: 'This Week', color: 'slate' },
    },
  ];

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-row font-display text-slate-900 bg-background-light">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between p-6 bg-white border-b border-slate-200 sticky top-0 z-10">
          <div>
            <h2 className="text-slate-900 text-2xl font-bold leading-tight">Admin Dashboard</h2>
            <p className="text-slate-500 text-sm">Overview of DCC attendance and activities.</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 rounded-lg h-9 px-4 bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200 transition-colors border border-slate-200"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              Export to Excel
            </button>
            <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm shadow-sm">
              {profile?.name?.charAt(0) || 'A'}
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">
          {/* Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {statCards.map(({ label, value, icon, badge }) => (
              <div key={label} className="flex flex-col gap-2 rounded-xl p-6 bg-white border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 text-primary">
                  <span className="material-symbols-outlined text-6xl">{icon}</span>
                </div>
                <p className="text-slate-500 text-sm font-medium uppercase tracking-wider">{label}</p>
                <div className="flex items-baseline gap-3">
                  <p className="text-slate-900 text-3xl font-bold leading-tight">{value}</p>
                  {badge && (
                    <span className={`text-${badge.color}-600 text-sm font-medium bg-${badge.color}-50 px-2 py-0.5 rounded-full`}>
                      {badge.text}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Low Attendance Alert */}
          {!loading && stats?.lowAttendanceCount > 0 && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex items-center gap-4">
              <span className="material-symbols-outlined text-red-500 text-2xl">warning</span>
              <div>
                <p className="text-red-800 font-semibold text-sm">
                  {stats.lowAttendanceCount} student{stats.lowAttendanceCount > 1 ? 's' : ''} below 75% attendance
                </p>
                <Link to="/analytics" className="text-red-600 text-xs hover:underline">View in Analytics →</Link>
              </div>
            </div>
          )}

          {/* Quick QR Action */}
          <div className="rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 p-6 flex items-center justify-between gap-6 shadow-sm">
            <div className="flex flex-col gap-2 flex-1">
              <h3 className="text-slate-900 text-xl font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">qr_code_scanner</span>
                Quick Action: Generate Meeting QR
              </h3>
              <p className="text-slate-600 text-sm">
                Create a secure, auto-refreshing QR code for today's meeting. Expires in 10 minutes.
              </p>
            </div>
            <Link
              to="/generate-qr"
              className="flex items-center gap-2 rounded-lg h-12 px-6 bg-primary text-white text-base font-medium hover:bg-primary/90 transition-all shadow-md hover:shadow-lg whitespace-nowrap"
            >
              <span className="material-symbols-outlined">add_circle</span>
              Generate Now
            </Link>
          </div>

          {/* Recent Activity */}
          <div className="flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm flex-1">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-slate-900 text-lg font-semibold">Recent Sessions</h3>
              <Link to="/analytics" className="text-primary text-sm font-medium hover:underline">View All</Link>
            </div>
            <div className="flex flex-col divide-y divide-slate-100">
              {loading ? (
                <div className="p-8 text-center text-slate-400 text-sm">Loading...</div>
              ) : recentActivity.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">No sessions yet. Generate a QR to get started!</div>
              ) : (
                recentActivity.map((activity, i) => (
                  <div key={i} className="flex items-start gap-4 px-6 py-4 hover:bg-slate-50 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                      <span className="material-symbols-outlined text-[20px]">{activity.icon}</span>
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                      <p className="text-slate-800 text-sm" dangerouslySetInnerHTML={{ __html: activity.text }} />
                      <p className="text-slate-500 text-xs mt-1">{activity.time}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
