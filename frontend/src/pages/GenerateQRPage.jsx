import { useState, useEffect, useRef, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../api';
import toast from 'react-hot-toast';

const SESSION_TYPES = [
  { value: 'lecture', label: 'Lecture' },
  { value: 'lab', label: 'Lab / Workshop' },
  { value: 'seminar', label: 'Seminar / Talk' },
  { value: 'exam', label: 'Examination' },
];

export default function GenerateQRPage() {
  const [form, setForm] = useState({
    title: '',
    type: 'seminar',
    date: new Date().toISOString().split('T')[0],
    startTime: '10:00',
    duration: '60',
  });
  const [meeting, setMeeting] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [liveCount, setLiveCount] = useState(0);
  const timerRef = useRef(null);
  const pollRef = useRef(null);

  function set(key, val) { setForm(p => ({ ...p, [key]: val })); }

  // Start countdown timer
  const startCountdown = useCallback((expiresAt) => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const exp = expiresAt?._seconds
        ? new Date(expiresAt._seconds * 1000)
        : new Date(expiresAt);
      const diff = Math.max(0, Math.floor((exp - Date.now()) / 1000));
      setCountdown(diff);
      if (diff === 0) clearInterval(timerRef.current);
    }, 1000);
  }, []);

  // Poll live attendee count
  const startPolling = useCallback((meetingId) => {
    clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await api.get(`/api/meetings/${meetingId}`);
        setLiveCount(res.data.meeting?.attendeeCount || 0);
      } catch (_) {}
    }, 5000);
  }, []);

  useEffect(() => () => {
    clearInterval(timerRef.current);
    clearInterval(pollRef.current);
  }, []);

  async function handleGenerate(e) {
    e.preventDefault();
    if (!form.title) return toast.error('Session title is required.');
    setGenerating(true);
    try {
      const res = await api.post('/api/meetings', form);
      const mtg = res.data.meeting;
      setMeeting(mtg);
      setLiveCount(mtg.attendeeCount || 0);
      startCountdown(mtg.qrExpiresAt);
      startPolling(mtg.id);
      toast.success('QR Code generated!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to generate QR.');
    } finally {
      setGenerating(false);
    }
  }

  async function handleRefresh() {
    if (!meeting) return;
    setRefreshing(true);
    try {
      const res = await api.post(`/api/meetings/${meeting.id}/refresh-qr`);
      setMeeting(prev => ({ ...prev, ...res.data }));
      startCountdown(res.data.qrExpiresAt);
      toast.success('QR refreshed!');
    } catch (err) {
      toast.error('Failed to refresh QR.');
    } finally {
      setRefreshing(false);
    }
  }

  const countdownStr = countdown != null
    ? `${Math.floor(countdown / 60)}:${String(countdown % 60).padStart(2, '0')}`
    : null;
  const isUrgent = countdown != null && countdown < 60;

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-row font-display text-slate-900 bg-background-light">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Nav */}
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 sticky top-0 z-50">
          <h2 className="text-lg font-bold leading-tight tracking-tight text-slate-900">Generate Attendance QR</h2>
        </header>

        <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col lg:flex-row gap-8">
          {/* Left: Form */}
          <div className="w-full lg:w-1/3 flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-black leading-tight tracking-tight">New Session</h1>
              <p className="text-slate-600 text-base leading-relaxed">
                Create a meeting and generate a secure QR code.
              </p>
            </div>

            <form onSubmit={handleGenerate} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col gap-5">
              <label className="flex flex-col gap-1.5">
                <span className="text-base font-semibold text-slate-800">Session Title *</span>
                <input
                  value={form.title}
                  onChange={e => set('title', e.target.value)}
                  placeholder="e.g., Weekly Tech Talk – Week 5"
                  className="rounded-lg border border-slate-300 bg-slate-50 h-12 px-4 text-base focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-base font-semibold text-slate-800">Session Type</span>
                <select
                  value={form.type}
                  onChange={e => set('type', e.target.value)}
                  className="rounded-lg border border-slate-300 bg-slate-50 h-12 px-4 text-base focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
                >
                  {SESSION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-base font-semibold text-slate-800">Session Date</span>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => set('date', e.target.value)}
                  className="rounded-lg border border-slate-300 bg-slate-50 h-12 px-4 text-base focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </label>

              <div className="grid grid-cols-2 gap-4">
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-slate-600">Start Time</span>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={e => set('startTime', e.target.value)}
                    className="rounded-lg border border-slate-300 bg-slate-50 h-10 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-slate-600">Duration (mins)</span>
                  <input
                    type="number"
                    value={form.duration}
                    onChange={e => set('duration', e.target.value)}
                    min="5"
                    className="rounded-lg border border-slate-300 bg-slate-50 h-10 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </label>
              </div>

              <div className="pt-3 border-t border-slate-200">
                <button
                  type="submit"
                  disabled={generating}
                  className="w-full flex cursor-pointer items-center justify-center rounded-lg h-12 px-5 bg-primary text-white text-base font-bold hover:bg-primary/90 transition-colors shadow-md shadow-primary/20 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined mr-2 text-xl">qr_code_scanner</span>
                  {generating ? 'Generating...' : 'Generate New QR'}
                </button>
              </div>
            </form>
          </div>

          {/* Right: QR Display */}
          <div className="w-full lg:w-2/3 flex flex-col">
            <div className="flex-1 min-h-[500px] relative bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 flex flex-col items-center justify-center p-8 shadow-2xl">
              {/* Background glow */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/20 via-slate-900 to-slate-900 opacity-60 pointer-events-none" />

              {meeting ? (
                <>
                  {/* Header pills */}
                  <div className="absolute top-6 left-6 right-6 flex justify-between items-start z-10">
                    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg px-4 py-2">
                      <span className="text-white/60 text-xs font-semibold uppercase tracking-wider block">Active Session</span>
                      <span className="text-white font-bold text-lg">{meeting.title}</span>
                    </div>
                    <div className="bg-emerald-500/20 backdrop-blur-md border border-emerald-500/30 rounded-full px-4 py-2 flex items-center gap-2">
                      <div className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-emerald-100 font-bold text-sm">
                        Live Count: <span className="text-emerald-400 text-lg ml-1">{liveCount}</span>
                      </span>
                    </div>
                  </div>

                  {/* QR Code */}
                  <div className="relative z-10 p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl flex flex-col items-center mt-12 hover:scale-[1.02] transition-transform duration-500">
                    {/* Corner markers */}
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-xl opacity-70" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-xl opacity-70" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-xl opacity-70" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-xl opacity-70" />

                    <div className="bg-white p-4 rounded-xl shadow-inner">
                      <img
                        src={meeting.qrDataUrl}
                        alt="Attendance QR Code"
                        className="w-64 h-64 object-contain"
                      />
                    </div>

                    {/* Countdown */}
                    <div className={`mt-6 flex items-center gap-2 text-white/70 bg-black/20 px-3 py-1.5 rounded-full text-sm font-medium border border-white/5 ${isUrgent ? 'countdown-urgent text-red-400' : ''}`}>
                      <span className="material-symbols-outlined text-[18px]">sync</span>
                      {countdown === 0
                        ? <span className="text-red-400 font-bold">Expired – regenerate QR</span>
                        : <span>Expires in <span className="text-white font-bold ml-1">{countdownStr}</span></span>}
                    </div>
                  </div>

                  {/* Refresh + share buttons */}
                  <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-4 z-10 px-6">
                    <button
                      onClick={handleRefresh}
                      disabled={refreshing}
                      className="flex items-center gap-2 rounded-xl h-11 px-5 bg-white/10 text-white border border-white/20 text-sm font-bold hover:bg-white/20 transition-colors backdrop-blur-sm disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-lg">refresh</span>
                      {refreshing ? 'Refreshing...' : 'Regenerate QR'}
                    </button>
                    <a
                      href={meeting.checkInUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 rounded-xl h-11 px-5 bg-white/10 text-white border border-white/20 text-sm font-bold hover:bg-white/20 transition-colors backdrop-blur-sm"
                    >
                      <span className="material-symbols-outlined text-lg">share</span>
                      Share Link
                    </a>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-4 text-white/50 z-10">
                  <span className="material-symbols-outlined text-6xl opacity-50">qr_code_2</span>
                  <p className="text-base font-medium">Fill the form and click "Generate New QR" to start</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
