import { useState, useEffect } from 'react';
import { tenderAppPromptService, TenderAppPromptConfig, defaultTenderPromptConfig } from '../../services/tenderAppPromptService';
import TenderAppPromptModal from '../TenderAppPromptModal';
import toast from 'react-hot-toast';
import { Smartphone, RefreshCw, Save, Eye, RotateCcw } from 'lucide-react';

export default function TenderAppPromptAdminTab() {
  const [config, setConfig] = useState<TenderAppPromptConfig>(defaultTenderPromptConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const data = await tenderAppPromptService.getConfig();
      setConfig(data);
    } catch (err) {
      console.error('Error loading tender app prompt config:', err);
      toast.error('حدث خطأ أثناء تحميل إعدادات نافذة المناقصات');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await tenderAppPromptService.saveConfig(config);
      if (res.success && res.data) {
        setConfig(res.data);
        toast.success('تم حفظ إعدادات نافذة حث تحميل التطبيق للمناقصات');
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

  const handleResetForEveryone = async () => {
    if (!window.confirm('هل تريد إعادة إظهار هذه النافذة لجميع المستخدمين مرة أخرى عند قيامهم بمناقصة؟')) {
      return;
    }

    setSaving(true);
    try {
      const newToken = `v_${Date.now()}`;
      const res = await tenderAppPromptService.saveConfig({
        ...config,
        versionToken: newToken,
      });

      if (res.success && res.data) {
        setConfig(res.data);
        tenderAppPromptService.resetSeenStatus();
        toast.success('تمت إعادة تعيين النافذة بنجاح! ستظهر مرة واحدة لكل مستخدم مجدداً عند المناقصة.');
      }
    } catch (err) {
      console.error(err);
      toast.error('حدث خطأ أثناء إعادة التعيين');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-gray-400">
        <RefreshCw size={24} className="animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Informative Header */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 dark:from-emerald-950/30 dark:via-teal-950/20 dark:to-indigo-950/20 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-md">
            <Smartphone size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">نافذة حث تحميل التطبيق عند المناقصات</h2>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
              نافذة تظهر مرة واحدة لمن أراد طرح أو المشاركة في مناقصة على الموقع، لحثه على تحميل التطبيق لتلقي الإشعارات الفورية.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setPreviewing(true)}
          className="flex items-center gap-2 bg-white dark:bg-gray-800 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 px-4 py-2 rounded-xl text-sm font-bold shadow-xs hover:bg-emerald-50 dark:hover:bg-gray-700 transition"
        >
          <Eye size={16} />
          <span>معاينة حية للنافذة</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-6">
        {/* Toggle Switch */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border bg-gray-50 dark:bg-gray-750 border-gray-200 dark:border-gray-700">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={config.isActive}
              onChange={(e) => setConfig({ ...config, isActive: e.target.checked })}
              className="w-5 h-5 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
            />
            <div>
              <span className="text-sm font-bold text-gray-800 dark:text-white block">تفعيل نافذة تنبيه التطبيق للمناقصات</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">تظهر مرة واحدة فقط لكل مستخدم في المتصفح عند بدء مناقصة</span>
            </div>
          </label>

          <button
            type="button"
            onClick={handleResetForEveryone}
            className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-3 py-2 rounded-xl hover:bg-amber-100 transition whitespace-nowrap"
            title="إعادة إظهار النافذة لمن شاهدوها سابقاً"
          >
            <RotateCcw size={14} />
            <span>إعادة إظهار للجميع مجدداً</span>
          </button>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              عنوان النافذة
            </label>
            <input
              type="text"
              required
              value={config.title}
              onChange={(e) => setConfig({ ...config, title: e.target.value })}
              placeholder="مثال: حمّل التطبيق لتصلك تنبيهات المناقصات فوراً!"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              نص زر التحميل
            </label>
            <input
              type="text"
              required
              value={config.buttonText}
              onChange={(e) => setConfig({ ...config, buttonText: e.target.value })}
              placeholder="مثال: تحميل وتثبيت التطبيق الآن"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
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
            placeholder="مثال: /jibha-app.apk"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
            نص الرسالة والتوضيح
          </label>
          <textarea
            rows={4}
            required
            value={config.message}
            onChange={(e) => setConfig({ ...config, message: e.target.value })}
            placeholder="اشرح للمستخدم أهمية تحميل التطبيق لاستلام إشعارات المناقصات..."
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-sm focus:outline-none focus:border-emerald-500 leading-relaxed"
          />
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-700">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-6 py-3 rounded-xl font-bold shadow-md shadow-emerald-500/20 active:scale-95 transition"
          >
            {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
            <span>{saving ? 'جاري الحفظ...' : 'حفظ إعدادات النافذة'}</span>
          </button>
        </div>
      </form>

      {/* Live Preview Modal */}
      {previewing && (
        <TenderAppPromptModal
          previewConfig={config}
          onClosePreview={() => setPreviewing(false)}
        />
      )}
    </div>
  );
}
