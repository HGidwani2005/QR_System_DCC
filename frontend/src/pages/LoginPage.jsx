import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom'; // Added useNavigate import
import { useState } from 'react'; // Added useState import

export default function LoginPage() {
  const { loginWithMicrosoft } = useAuth(); // Changed loginWithGoogle to loginWithMicrosoft
  const navigate = useNavigate(); // Added navigate hook
  const [isLoading, setIsLoading] = useState(false); // Added isLoading state

  const handleLogin = async () => { // Modified handleLogin to an arrow function and added isLoading logic
    setIsLoading(true);
    try {
      await loginWithMicrosoft();
      // Optionally navigate on successful login, though AuthContext might handle this
    } catch (e) {
      toast.error('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="font-display bg-background-light min-h-screen flex items-center justify-center p-4 sm:p-8">
      {/* Background Gradient */}
      <div className="fixed inset-0 z-0 bg-gradient-to-br from-blue-50 to-white overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-1/2 h-1/2 bg-primary/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-1/2 h-1/2 bg-accent-red/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Login Card */}
        <div className="bg-white/80 backdrop-blur-xl shadow-2xl rounded-2xl p-8 sm:p-10 border border-white/20 flex flex-col gap-8">
          {/* Header */}
          <div className="flex flex-col items-center text-center gap-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/30">
                <span className="material-symbols-outlined text-3xl font-bold">school</span>
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Dean Career Cloud</h1>
              <p className="text-sm font-medium text-slate-500 mt-2 uppercase tracking-wider">
                Attendance Management System
              </p>
            </div>
          </div>

          <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

          {/* Login Action */}
          <div className="flex flex-col gap-4 items-center">
            <p className="text-slate-600 text-sm text-center">
              Please sign in with your university credentials to access the portal.
            </p>
            <button
              onClick={handleLogin}
              className="w-full flex cursor-pointer items-center justify-center overflow-hidden rounded-xl h-14 px-6 bg-primary hover:bg-primary/90 active:scale-[0.98] transition-all text-white shadow-lg shadow-primary/20 gap-3 text-base font-semibold leading-normal tracking-wide mt-2"
            >
              <span className="material-symbols-outlined">account_circle</span>
              <span className="truncate">Login with Bennett Email</span>
            </button>
            <p className="text-xs text-slate-400 text-center">
              Only <span className="font-semibold text-primary">@bennett.edu.in</span> email addresses are accepted.
            </p>
          </div>

          {/* Footer Links */}
          <div className="flex flex-col items-center gap-3">
            <a className="text-sm text-primary hover:text-primary/80 transition-colors font-medium" href="#">
              Need help logging in?
            </a>
          </div>
        </div>

        {/* External Footer */}
        <footer className="mt-8 text-center flex flex-col gap-3">
          <div className="flex items-center justify-center gap-6 text-sm">
            <a className="text-slate-500 hover:text-slate-800 transition-colors" href="#">Privacy Policy</a>
            <a className="text-slate-500 hover:text-slate-800 transition-colors" href="#">Terms of Service</a>
            <a className="text-slate-500 hover:text-slate-800 transition-colors" href="#">Contact IT Support</a>
          </div>
          <p className="text-slate-400 text-xs">© 2025 Bennett University · Dean Career Cloud</p>
        </footer>
      </div>
    </div>
  );
}
