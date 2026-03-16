import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import toast from 'react-hot-toast';

export default function CheckInPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const { user, profile, loading: authLoading, loginWithGoogle } = useAuth();

  const [meeting, setMeeting] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | loading | success | error | expired | already
  const [errorMsg, setErrorMsg] = useState('');

  // Validate the QR token on mount
  useEffect(() => {
    if (!token) { setStatus('error'); setErrorMsg('Invalid QR link.'); return; }
    if (authLoading) return;
    if (!user) return; // wait for login
    validateToken();
  }, [token, user, authLoading]);

  async function validateToken() {
    setStatus('loading');
    try {
      const res = await api.get(`/api/meetings/by-token/${token}`);
      setMeeting(res.data.meeting);
      setStatus('idle');
    } catch (err) {
      const code = err.response?.data?.code;
      if (code === 'QR_EXPIRED') { setStatus('expired'); }
      else { setStatus('error'); setErrorMsg(err.response?.data?.error || 'Invalid or expired QR.'); }
    }
  }

  async function handleConfirm() {
    setStatus('loading');
    try {
      await api.post('/api/attendance/mark', { qrToken: token });
      setStatus('success');
      toast.success('Attendance marked! ✓');
    } catch (err) {
      const code = err.response?.data?.code;
      if (code === 'DUPLICATE_ATTENDANCE') { setStatus('already'); }
      else if (code === 'QR_EXPIRED') { setStatus('expired'); }
      else if (code === 'PROFILE_INCOMPLETE') { setStatus('error'); setErrorMsg('Please complete your profile first.'); }
      else { setStatus('error'); setErrorMsg(err.response?.data?.error || 'Failed to mark attendance.'); }
    }
  }

  // ── Loading ──
  if (authLoading) return <FullLoader />;

  // ── Not logged in ──
  if (!user) return (
    <PageWrapper>
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="size-20 bg-primary/10 text-primary rounded-full flex items-center justify-center">
          <span className="material-symbols-outlined text-5xl">lock</span>
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 mb-2">Login Required</h1>
          <p className="text-slate-500 text-sm">Sign in with your Bennett email to mark attendance.</p>
        </div>
        <button
          onClick={loginWithGoogle}
          className="flex items-center gap-3 rounded-xl h-14 px-8 bg-primary text-white text-base font-bold shadow-lg shadow-primary/30 hover:bg-primary/90 transition-all"
        >
          <span className="material-symbols-outlined">account_circle</span>
          Login with Bennett Email
        </button>
      </div>
    </PageWrapper>
  );

  // ── States ──
  if (status === 'loading') return <FullLoader />;

  if (status === 'expired') return (
    <PageWrapper>
      <StatusBadge icon="timer_off" iconBg="bg-red-100 text-red-500" title="QR Code Expired" sub="This QR code is no longer valid. Please ask the admin to generate a new one." />
    </PageWrapper>
  );

  if (status === 'already') return (
    <PageWrapper>
      <StatusBadge icon="check_circle" iconBg="bg-emerald-100 text-emerald-500" title="Already Marked!" sub="Your attendance for this session was already recorded." />
    </PageWrapper>
  );

  if (status === 'success') return (
    <PageWrapper>
      <StatusBadge
        icon="check_circle"
        iconBg="bg-emerald-100 text-emerald-500"
        title="Attendance Confirmed!"
        sub={`You have been marked present for "${meeting?.title}".`}
        animate
      />
    </PageWrapper>
  );

  if (status === 'error') return (
    <PageWrapper>
      <StatusBadge icon="error" iconBg="bg-red-100 text-red-500" title="Error" sub={errorMsg || 'Something went wrong.'} />
    </PageWrapper>
  );

  if (!meeting) return <FullLoader />;

  // ── Main Check-in UI ──
  const formatDate = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <div className="font-display bg-gradient-to-br from-blue-50 via-white to-red-50 text-slate-900 min-h-screen antialiased flex items-center justify-center p-4 sm:p-6">
      <div className="relative flex flex-col w-full max-w-md min-h-[650px] bg-white/70 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/50 overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-center pt-8 pb-4 px-6">
          <div className="flex items-center gap-2">
            <div className="bg-primary text-white p-2 rounded-xl shadow-md shadow-primary/20">
              <span className="material-symbols-outlined text-2xl">school</span>
            </div>
            <h2 className="text-slate-900 text-xl font-black tracking-tight">Dean Career Cloud</h2>
          </div>
        </header>

        <main className="flex-1 flex flex-col justify-center px-6 py-4 gap-8">
          <div className="flex flex-col items-center text-center gap-4">
            <span className="inline-block px-3 py-1 bg-blue-100 text-primary text-xs font-bold uppercase tracking-wider rounded-full">
              Attendance Check-in
            </span>
            <h1 className="text-2xl font-black text-slate-900 leading-tight">{meeting.title}</h1>
            <p className="text-slate-500 text-sm font-medium">
              {formatDate(meeting.date)}{meeting.startTime ? ` • ${meeting.startTime}` : ''}
            </p>
          </div>

          {/* Profile card */}
          <div className="mt-2 bg-white/60 backdrop-blur-md border border-white/60 rounded-3xl p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Member Profile</p>
            <div className="flex items-center gap-4">
              <div className="size-16 rounded-full bg-primary text-white flex items-center justify-center text-2xl font-bold ring-2 ring-primary/20">
                {profile?.name?.charAt(0) || user?.displayName?.charAt(0) || '?'}
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 leading-tight">{profile?.name || user?.displayName}</h2>
                <p className="text-accent-red font-semibold text-sm">{profile?.enrollment || '—'}</p>
                <p className="text-slate-500 text-xs font-medium">{profile?.position} • Year {profile?.year}</p>
              </div>
            </div>
          </div>
        </main>

        <div className="p-6 pb-10">
          <button
            onClick={handleConfirm}
            className="w-full h-16 bg-primary hover:bg-blue-700 active:scale-[0.98] text-white rounded-2xl text-xl font-bold tracking-wide shadow-xl shadow-primary/40 transition-all flex items-center justify-center gap-3"
          >
            <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>how_to_reg</span>
            Confirm Attendance
          </button>
        </div>

        <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-blue-100/50 to-transparent pointer-events-none" />
      </div>
    </div>
  );
}

function PageWrapper({ children }) {
  return (
    <div className="font-display bg-gradient-to-br from-blue-50 via-white to-red-50 min-h-screen flex items-center justify-center p-4">
      <div className="flex flex-col w-full max-w-md bg-white/70 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/50 overflow-hidden p-10 items-center gap-6">
        <div className="flex items-center gap-2 mb-2">
          <div className="bg-primary text-white p-2 rounded-xl shadow-md">
            <span className="material-symbols-outlined text-xl">school</span>
          </div>
          <span className="text-xl font-black tracking-tight">Dean Career Cloud</span>
        </div>
        {children}
      </div>
    </div>
  );
}

function StatusBadge({ icon, iconBg, title, sub, animate }) {
  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <div className={`size-24 rounded-full flex items-center justify-center ${iconBg} ${animate ? 'animate-success' : ''} border-4 border-white`}>
        <span className="material-symbols-outlined text-6xl" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
      </div>
      <div>
        <h1 className="text-2xl font-black text-slate-900 mb-2">{title}</h1>
        <p className="text-slate-500 text-sm">{sub}</p>
      </div>
    </div>
  );
}

function FullLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 font-display">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
