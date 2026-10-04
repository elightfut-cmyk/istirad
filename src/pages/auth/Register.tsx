import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { PackageSearch, Mail, Lock, User, Phone, MapPin, Building2, ArrowRight, ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Role } from '../../store/useAuthStore';
import { sendNotification } from '../../store/useNotificationStore';
import { useLanguageStore } from '../../store/useLanguageStore';
import LanguageToggle from '../../components/LanguageToggle';

export default function Register() {
  const [searchParams] = useSearchParams();
  const referredBy = searchParams.get('ref');

  const { t, language } = useLanguageStore();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    company_name: '',
    address: '',
    role: 'merchant' as Role,
  });
  
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            phone: formData.phone,
            company_name: formData.company_name,
            address: formData.address,
            role: formData.role,
            referred_by: referredBy || null
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        let updateData: any = {};
        if (referredBy) updateData.referred_by = referredBy;
        if (formData.role === 'supplier') updateData.status = 'pending';
        
        if (Object.keys(updateData).length > 0) {
          await supabase.from('users').update(updateData).eq('id', data.user.id);
        }

        setSuccess(true);
        // Send notification to admins
        const roleAr = formData.role === 'merchant' ? 'تاجر' : 'مورد';
        await sendNotification('all_admins', 'مستخدم جديد', `تم تسجيل ${roleAr} جديد باسم ${formData.name}`, 'info');
        setTimeout(() => {
           navigate('/login');
        }, 3000);
      }
    } catch (error: any) {
      console.error('Registration error:', error.message);
      setErrorMsg(error.message || t('auth.login_error'));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#f5f5f0] dark:bg-[#121212] flex items-center justify-center p-4 transition-colors">
        <div className="bg-white dark:bg-gray-800 p-12 rounded-2xl shadow-xl w-full max-w-md text-center border-t-4 border-[#4f46e5]">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-950/60 rounded-full flex items-center justify-center mx-auto mb-6">
            <PackageSearch size={40} className="text-[#4f46e5] dark:text-indigo-400" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">{t('reg.success_title')}</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8">{t('reg.success_msg')}</p>
          <Link to="/login" className="text-[#4f46e5] dark:text-indigo-400 font-bold hover:underline">
            {t('reg.go_to_login')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f0] dark:bg-[#121212] flex flex-col items-center justify-center p-4 py-12 transition-colors">
      <div className="w-full max-w-xl mb-4 flex justify-between items-center px-1">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition">
          {language === 'ar' ? <ArrowRight size={16} /> : <ArrowLeft size={16} />}
          <span>{t('nav.home')}</span>
        </Link>
        <LanguageToggle />
      </div>

      <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl w-full max-w-xl border border-gray-100 dark:border-gray-700">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#4f46e5]/10 dark:bg-[#4f46e5]/20 mb-4 hover:opacity-80 transition">
            <PackageSearch size={32} className="text-[#4f46e5] dark:text-indigo-400" />
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('reg.title')}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">{t('reg.subtitle')}</p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-xl text-sm font-medium border border-red-100 dark:border-red-800">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-5">
          {/* Role Selection */}
          <div className="flex gap-4 mb-6">
            <label className={`flex-1 flex flex-col items-center justify-center p-4 border-2 rounded-xl cursor-pointer transition-all ${formData.role === 'merchant' ? 'border-[#4f46e5] bg-indigo-50/50 dark:bg-indigo-950/30' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}>
              <input type="radio" name="role" value="merchant" checked={formData.role === 'merchant'} onChange={handleChange} className="hidden" />
              <PackageSearch size={24} className={formData.role === 'merchant' ? 'text-[#4f46e5] dark:text-indigo-400' : 'text-gray-400'} />
              <span className={`mt-2 font-bold text-sm ${formData.role === 'merchant' ? 'text-[#4f46e5] dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}`}>{t('reg.role_merchant')}</span>
            </label>
            <label className={`flex-1 flex flex-col items-center justify-center p-4 border-2 rounded-xl cursor-pointer transition-all ${formData.role === 'supplier' ? 'border-[#4f46e5] bg-indigo-50/50 dark:bg-indigo-950/30' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}>
              <input type="radio" name="role" value="supplier" checked={formData.role === 'supplier'} onChange={handleChange} className="hidden" />
              <Building2 size={24} className={formData.role === 'supplier' ? 'text-[#4f46e5] dark:text-indigo-400' : 'text-gray-400'} />
              <span className={`mt-2 font-bold text-sm ${formData.role === 'supplier' ? 'text-[#4f46e5] dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}`}>{t('reg.role_supplier')}</span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">{t('reg.full_name')}</label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none rtl:right-0 rtl:pr-3 ltr:right-auto ltr:left-0 ltr:pl-3">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input type="text" name="name" value={formData.name} onChange={handleChange} required
                  className="block w-full rtl:pr-10 rtl:pl-3 ltr:pl-10 ltr:pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-[#4f46e5] focus:border-[#4f46e5] sm:text-sm bg-gray-50 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 dark:text-white"
                  placeholder={t('reg.full_name_placeholder')} />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">{t('reg.phone')}</label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none rtl:right-0 rtl:pr-3 ltr:right-auto ltr:left-0 ltr:pl-3">
                  <Phone className="h-5 w-5 text-gray-400" />
                </div>
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required
                  className="block w-full rtl:pr-10 rtl:pl-3 ltr:pl-10 ltr:pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-[#4f46e5] focus:border-[#4f46e5] sm:text-sm bg-gray-50 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 dark:text-white"
                  placeholder="05XXXXXXXX" />
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {t('reg.phone_hint')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Company Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">{t('reg.company')}</label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none rtl:right-0 rtl:pr-3 ltr:right-auto ltr:left-0 ltr:pl-3">
                  <Building2 className="h-5 w-5 text-gray-400" />
                </div>
                <input type="text" name="company_name" value={formData.company_name} onChange={handleChange} required
                  className="block w-full rtl:pr-10 rtl:pl-3 ltr:pl-10 ltr:pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-[#4f46e5] focus:border-[#4f46e5] sm:text-sm bg-gray-50 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 dark:text-white"
                  placeholder={t('reg.company_placeholder')} />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">{t('auth.email')}</label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none rtl:right-0 rtl:pr-3 ltr:right-auto ltr:left-0 ltr:pl-3">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input type="email" name="email" value={formData.email} onChange={handleChange} required
                  className="block w-full rtl:pr-10 rtl:pl-3 ltr:pl-10 ltr:pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-[#4f46e5] focus:border-[#4f46e5] sm:text-sm bg-gray-50 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 dark:text-white"
                  placeholder={t('auth.email_placeholder')} />
              </div>
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">{t('reg.address')}</label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none rtl:right-0 rtl:pr-3 ltr:right-auto ltr:left-0 ltr:pl-3">
                <MapPin className="h-5 w-5 text-gray-400" />
              </div>
              <input type="text" name="address" value={formData.address} onChange={handleChange} required
                className="block w-full rtl:pr-10 rtl:pl-3 ltr:pl-10 ltr:pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-[#4f46e5] focus:border-[#4f46e5] sm:text-sm bg-gray-50 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 dark:text-white"
                placeholder={t('reg.address_placeholder')} />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">{t('auth.password')}</label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none rtl:right-0 rtl:pr-3 ltr:right-auto ltr:left-0 ltr:pl-3">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input type="password" name="password" value={formData.password} onChange={handleChange} required minLength={6}
                className="block w-full rtl:pr-10 rtl:pl-3 ltr:pl-10 ltr:pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-[#4f46e5] focus:border-[#4f46e5] sm:text-sm bg-gray-50 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 dark:text-white"
                placeholder={t('reg.password_hint')} autoComplete="new-password" />
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-[#4f46e5] hover:bg-[#4338ca] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4f46e5] transition-colors mt-6 disabled:opacity-70"
          >
            {loading ? t('reg.submitting') : t('reg.submit')}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-gray-600 dark:text-gray-300 border-t border-gray-100 dark:border-gray-700 pt-6">
          {t('reg.has_account')}{' '}
          <Link to="/login" className="font-bold text-[#4f46e5] dark:text-indigo-400 hover:underline">
            {t('auth.sign_in')}
          </Link>
        </div>
      </div>
    </div>
  );
}

