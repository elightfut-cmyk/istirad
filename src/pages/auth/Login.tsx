import { useState } from 'react';
import { useAuthStore, User } from '../../store/useAuthStore';
import { useNavigate, Link } from 'react-router-dom';
import { PackageSearch, Mail, Lock } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { setUser } = useAuthStore();
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
      setErrorMsg(error.message === 'Invalid login credentials' ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة' : 'حدث خطأ أثناء تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f0] flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#4f46e5] bg-opacity-10 mb-4 hover:bg-opacity-20 transition">
            <PackageSearch size={32} className="text-[#4f46e5]" />
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">تسجيل الدخول</h1>
          <p className="text-gray-500 mt-2">مرحباً بعودتك إلى منصة جيبها-jiibha</p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl text-sm font-medium border border-red-100">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">البريد الإلكتروني</label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full pr-10 pl-3 py-3 border border-gray-300 rounded-xl focus:ring-[#4f46e5] focus:border-[#4f46e5] sm:text-sm transition-colors bg-gray-50 focus:bg-white"
                placeholder="أدخل بريدك الإلكتروني"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">كلمة المرور</label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pr-10 pl-3 py-3 border border-gray-300 rounded-xl focus:ring-[#4f46e5] focus:border-[#4f46e5] sm:text-sm transition-colors bg-gray-50 focus:bg-white"
                placeholder="أدخل كلمة المرور"
                required
                autoComplete="current-password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-[#4f46e5] hover:bg-[#4338ca] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4f46e5] transition-colors disabled:opacity-70"
          >
            {loading ? 'جاري التحقق...' : 'تسجيل الدخول'}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-gray-600">
          ليس لديك حساب بعد؟{' '}
          <Link to="/register" className="font-bold text-[#4f46e5] hover:underline">
            سجل الآن مجاناً
          </Link>
        </div>
      </div>
    </div>
  );
}
