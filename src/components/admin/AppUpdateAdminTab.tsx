import { useState, useEffect } from 'react';
import { appUpdateService, AppUpdateConfig, defaultUpdateConfig } from '../../services/appUpdateService';
import ForceUpdateModal from '../ForceUpdateModal';
import toast from 'react-hot-toast';
import { Download, RefreshCw, Save, Eye } from 'lucide-react';

export default function AppUpdateAdminTab() {
  const [config, setConfig] = useState<AppUpdateConfig>(defaultUpdateConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const data = await appUpdateService.getConfig();
      setConfig(data);
    } catch (err) {
      console.error('Error loading app update config:', err);
      toast.error('حدث خطأ أثناء تحميل إعدادات التحديث');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await appUpdateService.saveConfig(config);
      if (res.success && res.data) {
        setConfig(res.data);
        toast.success('تم حفظ إعدادات تحديث التطبيق بنجاح');
      } else {
        toast.error('فشل حفظ الإعدادات');
      }
    } catch (err) {
      console.error(err);
      toast.error('حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-gray-400">
        <RefreshCw size={24} className="animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Informative Header */}
      <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-blue-50 dark:from-indigo-950/30 dark:via-purple-950/20 dark:to-blue-950/20 p-5 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#4f46e5] text-white flex items-center justify-center shadow-md">
            <Download size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">نافذة تحديث التطبيق (إجباري / اختياري)</h2>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
              تظهر هذه النافذة لمن قام بتحميل التطبيق لتنبيهه بوجود إصدار جديد وإلزامه بالتحميل والتثبيت.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setPreviewing(true)}
          className="flex items-center gap-2 bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 px-4 py-2 rounded-xl text-sm font-bold shadow-xs hover:bg-indigo-50 dark:hover:bg-gray-700 transition"
        >
          <Eye size={16} />
          <span>معاينة النافذة الحالية</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-6">
        {/* Toggle Switches */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Active Switch */}
          <div className={`p-4 rounded-xl border transition ${config.isActive ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800' : 'bg-gray-50 dark:bg-gray-750 border-gray-200 dark:border-gray-700'}`}>
            <label className="flex items-center justify-between cursor-pointer">
              <div className="space-y-0.5">
                <span className="text-sm font-bold text-gray-800 dark:text-white block">تفعيل نافذة التحديث</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">إظهار النافذة لمستخدمي التطبيق</span>
              </div>
              <input
                type="checkbox"
                checked={config.isActive}
                onChange={(e) => setConfig({ ...config, isActive: e.target.checked })}
                className="w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
              />
            </label>
          </div>

          {/* Forced Update Switch */}
          <div className={`p-4 rounded-xl border transition ${config.isForced ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800' : 'bg-gray-50 dark:bg-gray-750 border-gray-200 dark:border-gray-700'}`}>
            <label className="flex items-center justify-between cursor-pointer">
              <div className="space-y-0.5">
                <span className="text-sm font-bold text-gray-800 dark:text-white block">تحديث إجباري</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">منع إغلاق النافذة بدون تحديث</span>
              </div>
              <input
                type="checkbox"
                checked={config.isForced}
                onChange={(e) => setConfig({ ...config, isForced: e.target.checked })}
                className="w-5 h-5 text-amber-600 rounded border-gray-300 focus:ring-amber-500"
              />
            </label>
          </div>

          {/* Show on Web for Testing */}
          <div className="p-4 rounded-xl border bg-gray-50 dark:bg-gray-750 border-gray-200 dark:border-gray-700">
            <label className="flex items-center justify-between cursor-pointer">
              <div className="space-y-0.5">
                <span className="text-sm font-bold text-gray-800 dark:text-white block">إظهار في المتصفح</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">للتجربة والاختبار على الكمبيوتر</span>
              </div>
              <input
                type="checkbox"
                checked={config.showOnWebForTesting}
                onChange={(e) => setConfig({ ...config, showOnWebForTesting: e.target.checked })}
                className="w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
              />
            </label>
          </div>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              رقم الإصدار الجديد (Version)
            </label>
            <input
              type="text"
              required
              value={config.version}
              onChange={(e) => setConfig({ ...config, version: e.target.value })}
              placeholder="مثال: 1.1.0 أو 2.0.0"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              رابط تحميل ملف التطبيق (APK URL)
            </label>
            <input
              type="text"
              required
              value={config.apkUrl}
              onChange={(e) => setConfig({ ...config, apkUrl: e.target.value })}
              placeholder="مثال: /jiibha-app.apk أو رابط مباشر"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
            عنوان نافذة التحديث
          </label>
          <input
            type="text"
            required
            value={config.title}
            onChange={(e) => setConfig({ ...config, title: e.target.value })}
            placeholder="مثال: تحديث إجباري جديد متاح للتطبيق"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-sm focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
            رسالة وتفاصيل التحديث (ما الجديد؟)
          </label>
          <textarea
            rows={4}
            required
            value={config.message}
            onChange={(e) => setConfig({ ...config, message: e.target.value })}
            placeholder="اكتب التغييرات وأهمية التحديث هنا..."
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-sm focus:outline-none focus:border-indigo-500 leading-relaxed"
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-700">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-[#4f46e5] hover:bg-[#4338ca] text-white px-6 py-3 rounded-xl font-bold shadow-md shadow-indigo-500/20 active:scale-95 transition"
          >
            {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
            <span>{saving ? 'جاري الحفظ...' : 'حفظ إعدادات التحديث'}</span>
          </button>
        </div>
      </form>

      {/* Live Preview Modal */}
      {previewing && (
        <ForceUpdateModal
          previewConfig={config}
          onClosePreview={() => setPreviewing(false)}
        />
      )}
    </div>
  );
}
