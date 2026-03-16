import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../api';
import toast from 'react-hot-toast';

function StatusBadge({ status, pct }) {
  const map = {
    excellent: 'bg-primary/10 text-primary border border-primary/20',
    good: 'bg-green-100 text-green-800',
    average: 'bg-slate-100 text-slate-800',
    alert: 'bg-red-100 text-red-800',
  };
  const label = { excellent: 'Excellent', good: 'Good', average: 'Average', alert: 'Alert' };
  return (
    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full items-center gap-0.5 ${map[status] || 'bg-slate-100 text-slate-600'}`}>
      {status === 'alert' && <span className="material-symbols-outlined text-[12px]">warning</span>}
      {label[status] || status}
    </span>
  );
}

function BarChart({ meetings }) {
  if (!meetings || meetings.length === 0) return (
    <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No meeting data yet</div>
  );
  const max = Math.max(...meetings.map(m => m.percentage), 1);
  const colors = ['bg-primary/20', 'bg-primary/40', 'bg-red-400', 'bg-primary/60', 'bg-primary', 'bg-primary/80'];

  return (
    <div className="h-48 flex items-end justify-between gap-2 mt-4 relative">
      <div className="absolute w-full border-t border-slate-200 bottom-[50%] z-0" />
      <div className="absolute w-full border-t border-slate-200 bottom-[75%] z-0" />
      {meetings.slice(0, 8).map((m, i) => {
        const heightPct = Math.round((m.percentage / max) * 100);
        const isLow = m.percentage < 75;
        return (
          <div key={m.id || i} className="w-full flex flex-col items-center gap-1 z-10 group">
            <div
              className={`w-full ${isLow ? 'bg-red-400 group-hover:bg-red-500' : `${colors[i % colors.length]} group-hover:opacity-80`} rounded-t-sm relative transition-colors`}
              style={{ height: `${heightPct}%` }}
            >
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {m.percentage}%
              </div>
            </div>
            <span className="text-xs text-slate-500 font-medium truncate w-full text-center">{`M${i + 1}`}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function AnalyticsPage() {
  const [students, setStudents] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [summary, setSummary] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const [studRes, mtgRes, sumRes] = await Promise.all([
        api.get('/api/analytics/students'),
        api.get('/api/analytics/meetings'),
        api.get('/api/analytics/summary'),
      ]);
      setStudents(studRes.data.students || []);
      setMeetings(mtgRes.data.meetings || []);
      setSummary(sumRes.data);
    } catch {
      toast.error('Failed to load analytics.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(e) {
    const q = e.target.value;
    setSearch(q);
    try {
      const res = await api.get(`/api/analytics/students?search=${encodeURIComponent(q)}`);
      setStudents(res.data.students || []);
    } catch {}
  }

  async function handleExport() {
    setExporting(true);
    try {
      const res = await api.get('/api/export/attendance', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `DCC_Attendance_${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      toast.success('Report downloaded!');
    } catch {
      toast.error('Export failed.');
    } finally {
      setExporting(false);
    }
  }

  const avgPct = meetings.length > 0
    ? Math.round(meetings.reduce((sum, m) => sum + m.percentage, 0) / meetings.length)
    : 0;

  const filteredStudents = students.filter(s =>
    !search ||
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.enrollment?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-row font-display text-slate-900 bg-background-light">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 sticky top-0 z-10">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Attendance Analytics & Records</h1>
            <p className="text-slate-500 text-sm">Meeting-wise and per-student attendance overview.</p>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-lg">download</span>
            {exporting ? 'Exporting...' : 'Download Report'}
          </button>
        </header>

        <div className="flex-1 p-4 md:p-6 flex flex-col gap-4">
          {/* Search */}
          <div className="relative max-w-2xl">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="material-symbols-outlined text-slate-400">search</span>
            </div>
            <input
              value={search}
              onChange={handleSearch}
              placeholder="Search student by Name or Enrollment ID..."
              className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Charts & Quick Stats */}
            <div className="lg:col-span-1 flex flex-col gap-4">
              {/* Bar Chart */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-slate-900 text-lg font-bold mb-1">Meeting-wise Attendance</h3>
                <p className="text-slate-500 text-sm mb-2">Average attendance across sessions.</p>
                <div className="flex items-baseline gap-3 mb-4">
                  <p className="text-4xl font-black text-slate-900">{avgPct}%</p>
                  <span className="text-xs font-medium bg-green-100 text-green-800 px-2 py-0.5 rounded">
                    avg
                  </span>
                </div>
                <BarChart meetings={[...meetings].reverse()} />
              </div>

              {/* Quick Stats */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-slate-900 text-lg font-bold mb-4">Quick Stats</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                    <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Total Members</p>
                    <p className="text-2xl font-bold text-slate-900">{summary?.totalMembers ?? '—'}</p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                    <p className="text-red-600 text-xs font-semibold uppercase tracking-wider mb-1">Below 75%</p>
                    <p className="text-2xl font-bold text-red-700">{summary?.lowAttendanceCount ?? '—'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Student Table */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                <h3 className="text-lg font-bold text-slate-900">Student Records</h3>
                <span className="text-sm text-slate-500">
                  {loading ? 'Loading...' : `${filteredStudents.length} records`}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      {['Student Name', 'ID Number', 'Meetings Attended', 'Overall %', 'Status', ''].map(h => (
                        <th key={h} className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {loading ? (
                      <tr><td colSpan={6} className="text-center py-8 text-slate-400 text-sm">Loading...</td></tr>
                    ) : filteredStudents.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-8 text-slate-400 text-sm">No students found.</td></tr>
                    ) : (
                      filteredStudents.map((s) => {
                        const isAlert = s.status === 'alert';
                        const barColor = s.percentage >= 75 ? 'bg-primary' : 'bg-red-500';
                        return (
                          <tr
                            key={s.id}
                            className={`hover:bg-slate-50 transition-colors ${isAlert ? 'bg-red-50/50' : ''}`}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className={`h-8 w-8 rounded-full ${s.percentage >= 75 ? 'bg-primary/20 text-primary' : 'bg-slate-200 text-slate-600'} flex items-center justify-center font-bold text-sm mr-3`}>
                                  {s.name?.split(' ').map(w => w[0]).slice(0, 2).join('')}
                                </div>
                                <div className="text-sm font-medium text-slate-900">{s.name}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{s.enrollment}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                              {s.attended} / {s.totalMeetings}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-bold ${isAlert ? 'text-red-600' : 'text-primary'}`}>{s.percentage}%</span>
                                <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                  <div className={`h-full ${barColor} rounded-full`} style={{ width: `${s.percentage}%` }} />
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <StatusBadge status={s.status} pct={s.percentage} />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button className="text-slate-400 hover:text-primary transition-colors">
                                <span className="material-symbols-outlined">more_vert</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
