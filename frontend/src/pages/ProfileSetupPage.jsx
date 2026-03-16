import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const POSITIONS = [
  'President', 'Vice President', 'General Secretary',
  'Lead', 'Coordinator', 'Core Member', 'Volunteer',
];

export default function ProfileSetupPage() {
  const { user, saveProfile, logout } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: user?.displayName || '',
    enrollment: '',
    year: '',
    position: '',
  });

  function set(key, val) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name || !form.enrollment || !form.year || !form.position) {
      return toast.error('Please fill all required fields.');
    }
    setLoading(true);
    try {
      await saveProfile(form);
      toast.success('Profile saved! Welcome to DCC.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save profile.');
    } finally {
      setLoading(false);
    }
  }

  const stepPercent = step === 1 ? 33 : step === 2 ? 66 : 100;

  return (
    <div className="bg-background-light font-display min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 sm:px-10 py-4 shadow-sm">
        <div className="flex items-center gap-3 text-primary">
          <div className="size-8 flex items-center justify-center bg-primary text-white rounded-lg">
            <span className="material-symbols-outlined text-xl">school</span>
          </div>
          <h2 className="text-slate-900 text-xl font-bold leading-tight tracking-tight">Dean Career Cloud</h2>
        </div>
        <button onClick={logout} className="text-slate-400 hover:text-red-500 transition-colors text-sm font-medium">
          Sign out
        </button>
      </header>

      <div className="flex flex-1 justify-center py-10 px-4 sm:px-10">
        <div className="flex flex-col w-full max-w-[800px]">
          <div className="flex flex-col gap-3 mb-8 text-center sm:text-left">
            <h1 className="text-slate-900 tracking-tight text-3xl sm:text-4xl font-bold leading-tight">Welcome to DCC</h1>
            <p className="text-slate-500 text-base leading-normal">Let's set up your member profile to get started.</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8 mb-8">
            {/* Progress Header */}
            <div className="flex flex-col gap-4 mb-8">
              <div className="flex gap-6 justify-between items-end">
                <div>
                  <p className="text-slate-900 text-lg font-semibold leading-normal">Profile Setup</p>
                  <p className="text-slate-500 text-sm leading-normal">
                    {step === 1 ? 'Basic Information' : step === 2 ? 'Academic Details' : 'Review & Submit'}
                  </p>
                </div>
                <p className="text-primary font-medium text-sm bg-primary/10 px-3 py-1 rounded-full">
                  Step {step} of 3
                </p>
              </div>
              <div className="rounded-full bg-slate-100 overflow-hidden h-2.5 w-full">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-accent-red transition-all duration-500"
                  style={{ width: `${stepPercent}%` }}
                />
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-8">
              {/* ── Step 1: Basic Info ── */}
              {step === 1 && (
                <>
                  <div className="flex flex-col gap-2">
                    <label className="text-slate-900 text-base font-medium flex items-center gap-2" htmlFor="fullName">
                      <span className="material-symbols-outlined text-slate-400 text-sm">person</span>
                      Full Name <span className="text-accent-red">*</span>
                    </label>
                    <input
                      id="fullName"
                      type="text"
                      value={form.name}
                      onChange={(e) => set('name', e.target.value)}
                      placeholder="Enter your full name as per university records"
                      required
                      className="flex w-full rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/50 border border-slate-300 bg-white h-12 placeholder:text-slate-400 px-4 text-base transition-all shadow-sm"
                    />
                  </div>

                  <div className="flex flex-col gap-4">
                    <h2 className="text-slate-900 text-base font-medium flex items-center gap-2">
                      <span className="material-symbols-outlined text-slate-400 text-sm">calendar_month</span>
                      Year of Study <span className="text-accent-red">*</span>
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {[
                        { val: '1', label: '1st', sub: 'Freshman' },
                        { val: '2', label: '2nd', sub: 'Sophomore' },
                        { val: '3', label: '3rd', sub: 'Junior' },
                        { val: '4', label: '4th', sub: 'Senior' },
                      ].map(({ val, label, sub }) => (
                        <label key={val} className="relative cursor-pointer group">
                          <input
                            type="radio"
                            name="year"
                            value={val}
                            checked={form.year === val}
                            onChange={() => set('year', val)}
                            className="sr-only peer"
                          />
                          <div className="rounded-lg border-2 border-slate-200 bg-white p-4 text-center hover:border-primary/50 peer-checked:border-primary peer-checked:bg-primary/5 peer-checked:text-primary transition-all">
                            <span className="block text-xl font-bold mb-1">{label}</span>
                            <span className="block text-xs text-slate-500 group-hover:text-slate-700">{sub}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* ── Step 2: Academic Details ── */}
              {step === 2 && (
                <>
                  <div className="flex flex-col gap-2">
                    <label className="text-slate-900 text-base font-medium flex items-center gap-2" htmlFor="enrollment">
                      <span className="material-symbols-outlined text-slate-400 text-sm">badge</span>
                      Enrollment Number <span className="text-accent-red">*</span>
                    </label>
                    <input
                      id="enrollment"
                      type="text"
                      value={form.enrollment}
                      onChange={(e) => set('enrollment', e.target.value)}
                      placeholder="e.g. E21CSE123"
                      required
                      className="flex w-full rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/50 border border-slate-300 bg-white h-12 placeholder:text-slate-400 px-4 text-base transition-all shadow-sm"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-slate-900 text-base font-medium flex items-center gap-2" htmlFor="position">
                      <span className="material-symbols-outlined text-slate-400 text-sm">work</span>
                      Position in DCC <span className="text-accent-red">*</span>
                    </label>
                    <div className="relative">
                      <select
                        id="position"
                        required
                        value={form.position}
                        onChange={(e) => set('position', e.target.value)}
                        className="w-full rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/50 border border-slate-300 bg-white h-12 px-4 pr-10 text-base appearance-none transition-all shadow-sm cursor-pointer"
                      >
                        <option value="" disabled>Select your role</option>
                        {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                        <span className="material-symbols-outlined">expand_more</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* ── Step 3: Review ── */}
              {step === 3 && (
                <div className="flex flex-col gap-4">
                  <h3 className="text-slate-900 font-semibold text-lg">Review Your Information</h3>
                  <div className="bg-slate-50 rounded-xl p-6 flex flex-col gap-4 border border-slate-200">
                    <div className="flex items-center gap-4 pb-4 border-b border-slate-200">
                      <div className="size-14 rounded-full bg-primary flex items-center justify-center text-white text-2xl font-bold">
                        {form.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-lg">{form.name}</p>
                        <p className="text-slate-500 text-sm">{user?.email}</p>
                      </div>
                    </div>
                    {[
                      { label: 'Enrollment', value: form.enrollment },
                      { label: 'Year', value: form.year ? `${form.year}${['st','nd','rd','th'][form.year-1]} Year` : '' },
                      { label: 'Position', value: form.position },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between items-center">
                        <span className="text-slate-500 text-sm font-medium">{label}</span>
                        <span className="text-slate-900 font-semibold">{value || '—'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center pb-8">
            <button
              type="button"
              onClick={() => step > 1 ? setStep(s => s - 1) : null}
              className="px-6 py-3 rounded-lg font-medium text-slate-600 hover:bg-slate-200 transition-colors flex items-center gap-2 disabled:opacity-50"
              disabled={step === 1}
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              Back
            </button>

            {step < 3 ? (
              <button
                type="button"
                onClick={() => {
                  if (step === 1 && (!form.name || !form.year))
                    return toast.error('Please fill your name and year.');
                  if (step === 2 && (!form.enrollment || !form.position))
                    return toast.error('Please fill enrollment and position.');
                  setStep(s => s + 1);
                }}
                className="px-8 py-3 rounded-lg font-medium text-white bg-primary hover:bg-primary/90 shadow-md shadow-primary/30 transition-all flex items-center gap-2"
              >
                Next Step
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={loading}
                onClick={handleSubmit}
                className="px-8 py-3 rounded-lg font-medium text-white bg-primary hover:bg-primary/90 shadow-md shadow-primary/30 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Complete Setup'}
                <span className="material-symbols-outlined text-sm">check_circle</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
