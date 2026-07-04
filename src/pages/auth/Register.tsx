import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { PackageSearch, Mail, Lock, User, Phone, MapPin, Building2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Role } from '../../store/useAuthStore';
import { sendNotification } from '../../store/useNotificationStore';

export default function Register() {
  const [searchParams] = useSearchParams();
  const referredBy = searchParams.get('ref');

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
        // If email confirmation is off, they are logged in immediately.
        // We will wait 2 seconds and redirect to login or their dashboard.
        setTimeout(() => {
           navigate('/login');
        }, 3000);
      }
    } catch (error: any) {
      console.error('Registration error:', error.message);
      setErrorMsg(error.message || 'حدث خطأ أثناء التسجيل');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#f5f5f0] flex items-center justify-center p-4">
        <div className="bg-white p-12 rounded-2xl shadow-xl w-full max-w-md text-center border-t-4 border-[#4f46e5]">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <PackageSearch size={40} className="text-[#4f46e5]" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">تم التسجيل بنجاح!</h2>
          <p className="text-gray-500 mb-8">مرحباً بك في منصة جيبها-jiibha. جاري توجيهك لصفحة الدخول...</p>
          <Link to="/login" className="text-[#4f46e5] font-bold hover:underline">
            الذهاب لتسجيل الدخول يدوياً
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f0] flex items-center justify-center p-4 py-12">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-xl">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#4f46e5] bg-opacity-10 mb-4 hover:bg-opacity-20 transition">
            <PackageSearch size={32} className="text-[#4f46e5]" />
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">إنشاء حساب جديد</h1>
          <p className="text-gray-500 mt-2">انضم إلينا كتاجر إلكتروني أو مورد بالجملة</p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl text-sm font-medium border border-red-100">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-5">
          {/* Role Selection */}
          <div className="flex gap-4 mb-6">
            <label className={`flex-1 flex flex-col items-center justify-center p-4 border-2 rounded-xl cursor-pointer transition-all ${formData.role === 'merchant' ? 'border-[#4f46e5] bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
              <input type="radio" name="role" value="merchant" checked={formData.role === 'merchant'} onChange={handleChange} className="hidden" />
              <PackageSearch size={24} className={formData.role === 'merchant' ? 'text-[#4f46e5]' : 'text-gray-400'} />
              <span className={`mt-2 font-bold ${formData.role === 'merchant' ? 'text-[#4f46e5]' : 'text-gray-500'}`}>تاجر إلكتروني</span>
            </label>
            <label className={`flex-1 flex flex-col items-center justify-center p-4 border-2 rounded-xl cursor-pointer transition-all ${formData.role === 'supplier' ? 'border-[#4f46e5] bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
              <input type="radio" name="role" value="supplier" checked={formData.role === 'supplier'} onChange={handleChange} className="hidden" />
              <Building2 size={24} className={formData.role === 'supplier' ? 'text-[#4f46e5]' : 'text-gray-400'} />
              <span className={`mt-2 font-bold ${formData.role === 'supplier' ? 'text-[#4f46e5]' : 'text-gray-500'}`}>مورد بالجملة</span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">الاسم الكامل</label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input type="text" name="name" value={formData.name} onChange={handleChange} required
                  className="block w-full pr-10 pl-3 py-3 border border-gray-300 rounded-xl focus:ring-[#4f46e5] focus:border-[#4f46e5] sm:text-sm bg-gray-50 focus:bg-white"
                  placeholder="الاسم الأول والأخير" />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">رقم الهاتف</label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-gray-400" />
                </div>
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required
                  className="block w-full pr-10 pl-3 py-3 border border-gray-300 rounded-xl focus:ring-[#4f46e5] focus:border-[#4f46e5] sm:text-sm bg-gray-50 focus:bg-white"
                  placeholder="05XXXXXXXX" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Company Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">اسم المتجر / الشركة</label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Building2 className="h-5 w-5 text-gray-400" />
                </div>
                <input type="text" name="company_name" value={formData.company_name} onChange={handleChange} required
                  className="block w-full pr-10 pl-3 py-3 border border-gray-300 rounded-xl focus:ring-[#4f46e5] focus:border-[#4f46e5] sm:text-sm bg-gray-50 focus:bg-white"
                  placeholder="اسم نشاطك التجاري" />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">البريد الإلكتروني</label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input type="email" name="email" value={formData.email} onChange={handleChange} required
                  className="block w-full pr-10 pl-3 py-3 border border-gray-300 rounded-xl focus:ring-[#4f46e5] focus:border-[#4f46e5] sm:text-sm bg-gray-50 focus:bg-white"
                  placeholder="example@domain.com" />
              </div>
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">العنوان</label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <MapPin className="h-5 w-5 text-gray-400" />
              </div>
              <input type="text" name="address" value={formData.address} onChange={handleChange} required
                className="block w-full pr-10 pl-3 py-3 border border-gray-300 rounded-xl focus:ring-[#4f46e5] focus:border-[#4f46e5] sm:text-sm bg-gray-50 focus:bg-white"
                placeholder="المدينة، الحي، الشارع" />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">كلمة المرور</label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input type="password" name="password" value={formData.password} onChange={handleChange} required minLength={6}
                className="block w-full pr-10 pl-3 py-3 border border-gray-300 rounded-xl focus:ring-[#4f46e5] focus:border-[#4f46e5] sm:text-sm bg-gray-50 focus:bg-white"
                placeholder="6 أحرف على الأقل" autoComplete="new-password" />
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-[#4f46e5] hover:bg-[#4338ca] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4f46e5] transition-colors mt-6 disabled:opacity-70"
          >
            {loading ? 'جاري إنشاء الحساب...' : 'إنشاء حساب جديد'}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-gray-600 border-t border-gray-100 pt-6">
          لديك حساب بالفعل؟{' '}
          <Link to="/login" className="font-bold text-[#4f46e5] hover:underline">
            تسجيل الدخول
          </Link>
        </div>
      </div>
    </div>
  );
}
