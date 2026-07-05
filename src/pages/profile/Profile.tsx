import { useState } from 'react';
import { UserCircle, MapPin, Phone, Mail, Building, ShieldCheck, Check, MessageSquare } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import DashboardLayout from '../../layouts/DashboardLayout';
import { LayoutDashboard } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

export default function Profile() {
  const { user, setUser } = useAuthStore();

  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    address: user?.address || '',
    company_name: user?.company_name || '',
    telegram_chat_id: user?.telegram_chat_id || ''
  });

  const defaultDashboardLink = user?.role === 'admin' 
    ? '/admin' 
    : user?.role === 'merchant' 
      ? '/merchant' 
      : '/supplier';

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: formData.name,
          phone: formData.phone,
          address: formData.address,
          company_name: formData.company_name,
          telegram_chat_id: formData.telegram_chat_id || null
        })
        .eq('id', user.id);

      if (error) throw error;

      setUser({
        ...user,
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
        company_name: formData.company_name,
        telegram_chat_id: formData.telegram_chat_id || undefined
      });
      
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('حدث خطأ أثناء تحديث البيانات');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout
      title="الملف الشخصي"
      sidebarLinks={[
        { label: 'الرئيسية', href: defaultDashboardLink, icon: <LayoutDashboard size={20} /> },
      ]}
    >
      <div className="max-w-3xl mx-auto mt-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Cover Header */}
          <div className="h-32 bg-gradient-to-r from-[#4f46e5] to-[#4338ca]"></div>
          
          <div className="px-8 pb-8 relative">
            {/* Avatar */}
            <div className="absolute -top-12 bg-white p-2 rounded-full shadow-md">
              <UserCircle size={80} className="text-gray-400" />
            </div>
            
            {/* User Info */}
            <div className="pt-16">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">الاسم الكامل</label>
                <input 
                  type="text" 
                  value={formData.name} 
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent"
                />
              </div>
              
              <div className="flex items-center text-sm font-medium mt-1">
                <span className="bg-[#4f46e5]/10 text-[#4f46e5] px-3 py-1 rounded-full flex items-center gap-1">
                  <ShieldCheck size={16} />
                  {user?.role === 'admin' ? 'مدير النظام' : user?.role === 'merchant' ? 'تاجر' : 'مورد'}
                </span>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Phone */}
              <div className="flex items-start gap-4">
                <div className="p-3 bg-gray-50 rounded-xl text-gray-500">
                  <Phone size={24} />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500 font-medium mb-1">رقم الهاتف</p>
                  <input 
                    type="tel" 
                    value={formData.phone} 
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent text-right"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Address */}
              <div className="flex items-start gap-4">
                <div className="p-3 bg-gray-50 rounded-xl text-gray-500">
                  <MapPin size={24} />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500 font-medium mb-1">العنوان</p>
                  <input 
                    type="text" 
                    value={formData.address} 
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="flex items-start gap-4">
                <div className="p-3 bg-gray-50 rounded-xl text-gray-500">
                  <Mail size={24} />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500 font-medium mb-1">البريد الإلكتروني</p>
                  <p className="text-gray-900 font-semibold" dir="ltr">{user?.email}</p>
                </div>
              </div>

              {/* Company Name */}
              <div className="flex items-start gap-4">
                <div className="p-3 bg-gray-50 rounded-xl text-gray-500">
                  <Building size={24} />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500 font-medium mb-1">اسم الشركة / المتجر</p>
                  <input 
                    type="text" 
                    value={formData.company_name} 
                    onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Telegram Integration */}
              <div className="flex items-start gap-4 md:col-span-2 mt-4 pt-4 border-t border-gray-100">
                <div className="p-3 bg-blue-50 rounded-xl text-blue-500">
                  <MessageSquare size={24} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-bold text-gray-800">تنبيهات تلغرام (Telegram Alerts)</p>
                    {user?.telegram_chat_id && (
                      <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold">متصل</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mb-3 max-w-lg leading-relaxed">
                    للحصول على إشعارات سريعة ومهمة عبر تلغرام، يرجى اتباع الخطوتين: <br />
                    1- الدخول إلى البوت <a href="https://t.me/userinfobot" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-bold" dir="ltr">@userinfobot</a> ونسخ رقم الـ <span className="font-mono text-gray-800 font-bold bg-gray-100 px-1 rounded">Id</span> ولصقه في الخانة أدناه. <br />
                    2- الدخول إلى بوت التنبيهات الخاص بنا <a href="https://t.me/Istirad_new_bot" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-bold" dir="ltr">@Istirad_new_bot</a> والضغط على "Start" (أو البدء) لتفعيل استقبال الرسائل.
                  </p>
                  
                  <input 
                    type="text" 
                    placeholder="ضع معرف تلغرام هنا (مثال: 123456789)"
                    value={formData.telegram_chat_id} 
                    onChange={(e) => setFormData({...formData, telegram_chat_id: e.target.value})}
                    className="w-full max-w-sm px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-left"
                    dir="ltr"
                  />
                </div>
              </div>
            </div>
            
            {/* Actions */}
            <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end gap-3">
              <button 
                onClick={handleSave}
                className="flex items-center gap-2 bg-[#4f46e5] text-white px-6 py-2 rounded-xl font-bold hover:bg-[#4338ca] transition-colors"
                disabled={isSaving}
              >
                <Check size={20} />
                {isSaving ? 'جاري الحفظ...' : 'حفظ البيانات'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
