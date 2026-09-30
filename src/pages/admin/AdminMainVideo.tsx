import { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { supabase } from '../../lib/supabase';
import { useSettingsStore } from '../../store/useSettingsStore';
import { Video, LayoutDashboard, Users, ShoppingBag, MessageSquare, Ticket, FileText, HelpCircle, AlertTriangle, Lightbulb, Search, Package, Save } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminMainVideo() {
  const { mainVideoTitle, mainVideoUrl, mainVideoDescription, mainVideoActive, fetchSettings } = useSettingsStore();
  
  const [formData, setFormData] = useState({
    title: '',
    url: '',
    description: '',
    active: false
  });
  
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFormData({
      title: mainVideoTitle || '',
      url: mainVideoUrl || '',
      description: mainVideoDescription || '',
      active: mainVideoActive || false
    });
  }, [mainVideoTitle, mainVideoUrl, mainVideoDescription, mainVideoActive]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('platform_settings')
        .update({
          main_video_title: formData.title,
          main_video_url: formData.url,
          main_video_description: formData.description,
          main_video_active: formData.active
        })
        .eq('id', 1);

      if (error) throw error;
      toast.success('تم حفظ الإعدادات بنجاح');
      await fetchSettings();
    } catch (error) {
      console.error('Error saving main video settings:', error);
      toast.error('حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout
      title="إعدادات فيديو الرئيسية"
      sidebarLinks={[
        { label: 'الرئيسية', href: '/admin', icon: <LayoutDashboard size={20} /> },
        { label: 'المستخدمين', href: '/admin/users', icon: <Users size={20} /> },
        { label: 'الطلبات العامة', href: '/admin/orders', icon: <ShoppingBag size={20} /> },
        { label: 'سوق الطلبات', href: '/admin/requests', icon: <Package size={20} /> },
        { label: 'الكوبونات', href: '/admin/coupons', icon: <Ticket size={20} /> },
        { label: 'التنبيهات والإشعارات', href: '/admin/notifications', icon: <MessageSquare size={20} /> },
        { label: 'الصفحات', href: '/admin/pages', icon: <FileText size={20} /> },
        { label: 'الأسئلة الشائعة', href: '/admin/faqs', icon: <HelpCircle size={20} /> },
        { label: 'الشكاوى', href: '/admin/complaints', icon: <AlertTriangle size={20} /> },
        { label: 'الاقتراحات', href: '/admin/suggestions', icon: <Lightbulb size={20} /> },
        { label: 'الاستيراد الذكي', href: '/admin/smart-import', icon: <Search size={20} /> },
        { label: 'بحث علي بابا', href: '/admin/alibaba-search', icon: <Search size={20} /> },
        { label: 'فيديو الرئيسية', href: '/admin/main-video', icon: <Video size={20} /> },
      ]}
    >
      <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 max-w-3xl">
        <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-100 flex items-center gap-2">
          <Video className="text-[#4f46e5]" size={28} />
          إعدادات قسم الفيديو في الرئيسية
        </h2>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">عنوان القسم</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 focus:border-[#4f46e5] focus:ring-1 focus:ring-[#4f46e5] transition-colors bg-gray-50 dark:bg-gray-900"
              placeholder="مثال: فيديو تعريفي"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">رابط الفيديو (يوتيوب)</label>
            <input
              type="text"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 focus:border-[#4f46e5] focus:ring-1 focus:ring-[#4f46e5] transition-colors bg-gray-50 dark:bg-gray-900"
              placeholder="https://www.youtube.com/watch?v=..."
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">شرح أسفل الفيديو</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full h-32 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 focus:border-[#4f46e5] focus:ring-1 focus:ring-[#4f46e5] transition-colors bg-gray-50 dark:bg-gray-900 resize-none"
              placeholder="اكتب هنا الشرح الذي سيظهر أسفل الفيديو..."
            />
          </div>

          <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700">
            <input
              type="checkbox"
              id="activeVideo"
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              className="w-5 h-5 text-[#4f46e5] rounded focus:ring-[#4f46e5] cursor-pointer"
            />
            <label htmlFor="activeVideo" className="font-bold text-gray-700 dark:text-gray-200 cursor-pointer">
              تفعيل ظهور الفيديو في الصفحة الرئيسية
            </label>
          </div>

          <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-8 py-3 rounded-xl font-bold text-white bg-[#4f46e5] hover:bg-[#4338ca] transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Save size={20} />
              {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
