import { useState } from 'react';
import { useAuthStore, User } from '../../store/useAuthStore';
import { useLanguageStore } from '../../store/useLanguageStore';
import { useNavigate, Link } from 'react-router-dom';
import { PackageSearch, Mail, Lock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Forgot password state
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [forgotError, setForgotError] = useState('');
  
  const { setUser } = useAuthStore();
  const { t } = useLanguageStore();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        // Fetch user profile
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profileError) throw profileError;

        if (profile) {
          setUser(profile as User);
          navigate(`/${profile.role}`);
        }
      }
    } catch (error: any) {
      console.error('Login error:', error.message);
      setErrorMsg(error.message === 'Invalid login credentials' ? t('auth.invalid_creds') : t('auth.login_error'));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');
    setForgotLoading(true);

    try {
      const redirectUrl = window.location.origin.includes('localhost')
        ? `${window.location.origin}/reset-password`
        : 'https://jiibha.com/reset-password';

      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: redirectUrl,
      });

      if (error) throw error;
      setForgotSuccess(t('auth.reset_success'));
    } catch (err: any) {
      setForgotError(err.message || t('auth.login_error'));
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f0] dark:bg-[#121212] flex flex-col items-center justify-center p-4 transition-colors">
      <div className="w-full max-w-md mb-4 flex justify-between items-center px-1">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition">
          <ArrowRight size={16} />
          <span>{t('nav.home')}</span>
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100 dark:border-gray-700">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#4f46e5]/10 dark:bg-[#4f46e5]/20 mb-4 hover:opacity-80 transition">
            <PackageSearch size={32} className="text-[#4f46e5] dark:text-indigo-400" />
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {showForgot ? t('auth.reset_password') : t('auth.login_title')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">
            {showForgot ? t('auth.reset_instructions') : t('auth.login_welcome')}
          </p>
        </div>

        {errorMsg && !showForgot && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-xl text-sm font-medium border border-red-100 dark:border-red-800">
            {errorMsg}
          </div>
        )}

        {forgotError && showForgot && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-xl text-sm font-medium border border-red-100 dark:border-red-800">
            {forgotError}
          </div>
        )}

        {forgotSuccess && showForgot && (
          <div className="mb-6 p-4 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-xl text-sm font-medium border border-emerald-100 dark:border-emerald-800 flex items-start gap-2">
            <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
            <span>{forgotSuccess}</span>
          </div>
        )}

        {!showForgot ? (
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">{t('auth.email')}</label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none rtl:right-0 rtl:pr-3 ltr:right-auto ltr:left-0 ltr:pl-3">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rtl:pr-10 rtl:pl-3 ltr:pl-10 ltr:pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-[#4f46e5] focus:border-[#4f46e5] sm:text-sm transition-colors bg-gray-50 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 dark:text-white"
                  placeholder={t('auth.email_placeholder')}
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">{t('auth.password')}</label>
                <button
                  type="button"
                  onClick={() => setShowForgot(true)}
                  className="text-xs font-semibold text-[#4f46e5] dark:text-indigo-400 hover:underline"
                >
                  {t('auth.forgot_password')}
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none rtl:right-0 rtl:pr-3 ltr:right-auto ltr:left-0 ltr:pl-3">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rtl:pr-10 rtl:pl-3 ltr:pl-10 ltr:pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-[#4f46e5] focus:border-[#4f46e5] sm:text-sm transition-colors bg-gray-50 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 dark:text-white"
                  placeholder={t('auth.password_placeholder')}
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-[#4f46e5] hover:bg-[#4338ca] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4f46e5] transition-colors disabled:opacity-70"
            >
              {loading ? t('auth.signing_in') : t('auth.sign_in')}
            </button>
          </form>
        ) : (
          <form onSubmit={handleForgotPassword} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">{t('auth.email')}</label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none rtl:right-0 rtl:pr-3 ltr:right-auto ltr:left-0 ltr:pl-3">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="block w-full rtl:pr-10 rtl:pl-3 ltr:pl-10 ltr:pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-[#4f46e5] focus:border-[#4f46e5] sm:text-sm transition-colors bg-gray-50 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 dark:text-white"
                  placeholder={t('auth.email_placeholder')}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={forgotLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-[#4f46e5] hover:bg-[#4338ca] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4f46e5] transition-colors disabled:opacity-70"
            >
              {forgotLoading ? t('auth.sending') : t('auth.send_reset_link')}
            </button>

            <button
              type="button"
              onClick={() => {
                setShowForgot(false);
                setForgotSuccess('');
                setForgotError('');
              }}
              className="w-full text-center text-sm font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 pt-2 transition"
            >
              {t('auth.back_to_login')}
            </button>
          </form>
        )}

        <div className="mt-8 text-center text-sm text-gray-600 dark:text-gray-300 border-t border-gray-100 dark:border-gray-700 pt-6">
          {t('auth.no_account')}{' '}
          <Link to="/register" className="font-bold text-[#4f46e5] dark:text-indigo-400 hover:underline">
            {t('auth.register_now')}
          </Link>
        </div>
      </div>
    </div>
  );
}

