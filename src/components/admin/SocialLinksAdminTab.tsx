import { useState, useEffect } from 'react';
import { socialLinksAlertService, SocialLinksAlert } from '../../services/socialLinksAlertService';
import SocialLinksModal from '../SocialLinksModal';
import { Share2, Plus, Edit3, Trash2, Eye, Check, X, RefreshCw, Facebook, Send } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SocialLinksAdminTab() {
  const [currentAlert, setCurrentAlert] = useState<SocialLinksAlert | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [togglingActive, setTogglingActive] = useState(false);
  const [previewAlert, setPreviewAlert] = useState<SocialLinksAlert | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    message: '',
    facebookUrl: '',
    telegramUrl: '',
    targetRole: 'all' as 'all' | 'merchant' | 'supplier',
    isActive: true,
    resetSeenForEveryone: false,
  });

  useEffect(() => {
    fetchAlert();
  }, []);

  const fetchAlert = async () => {
    setLoading(true);
    try {
      const alert = await socialLinksAlertService.getAlert();
      setCurrentAlert(alert);
    } catch (err) {
      console.error('Error fetching social links alert:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = () => {
    if (currentAlert) {
      setFormData({
        title: currentAlert.title || '',
        message: currentAlert.message || '',
        facebookUrl: currentAlert.facebookUrl || '',
        telegramUrl: currentAlert.telegramUrl || '',
        targetRole: currentAlert.targetRole || 'all',
        isActive: currentAlert.isActive ?? true,
        resetSeenForEveryone: false,
      });
    } else {
      setFormData({
        title: 'تابعنا على منصات التواصل',
        message: 'اشترك في قنواتنا ليصلك كل جديد ولتستفيد من العروض الحصرية',
        facebookUrl: '',
        telegramUrl: '',
        targetRole: 'all',
        isActive: true,
        resetSeenForEveryone: true,
      });
    }
    setIsEditing(true);
  };

  const handleSaveAlert = async () => {
    if (!formData.title.trim()) {
      toast.error('يرجى كتابة عنوان للتنبيه');
      return;
    }
    if (!formData.facebookUrl.trim() && !formData.telegramUrl.trim()) {
      toast.error('يرجى إدخال رابط فيسبوك أو تلغرام على الأقل');
      return;
    }

    setSaving(true);
    try {
      const alertPayload: Partial<SocialLinksAlert> = {
        title: formData.title.trim(),
        message: formData.message.trim(),
        facebookUrl: formData.facebookUrl.trim(),
        telegramUrl: formData.telegramUrl.trim(),
        targetRole: formData.targetRole,
        isActive: formData.isActive,
      };

      if (formData.resetSeenForEveryone || !currentAlert) {
        alertPayload.id = `social_alert_${Date.now()}`;
      }

      const res = await socialLinksAlertService.saveAlert(alertPayload);
      if (res.success && res.data) {
        setCurrentAlert(res.data);
        setIsEditing(false);
        toast.success(currentAlert ? 'تم تحديث نافذة الاشتراك بنجاح' : 'تم إنشاء نافذة الاشتراك بنجاح');
      } else {
        toast.error('حدث خطأ أثناء حفظ النافذة');
      }
    } catch (err) {
      console.error('Error saving social links alert:', err);
      toast.error('حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async () => {
    if (!currentAlert) return;
    setTogglingActive(true);
    try {
      const newStatus = !currentAlert.isActive;
      const res = await socialLinksAlertService.toggleActive(newStatus);
      if (res.success && res.data) {
        setCurrentAlert(res.data);
        toast.success(newStatus ? 'تم تفعيل نافذة الاشتراك بنجاح' : 'تم تعطيل نافذة الاشتراك');
      } else {
        toast.error('فشل تغيير حالة النافذة');
      }
    } catch (err) {
      console.error('Error toggling alert status:', err);
      toast.error('حدث خطأ');
    } finally {
      setTogglingActive(false);
    }
  };

  const handleDeleteAlert = async () => {
    if (!window.confirm('هل أنت متأكد من حذف هذه النافذة؟ لن تظهر مجدداً.')) {
      return;
    }

    try {
      const res = await socialLinksAlertService.deleteAlert();
      if (res.success) {
        setCurrentAlert(null);
        setIsEditing(false);
        toast.success('تم الحذف بنجاح');
      } else {
        toast.error('حدث خطأ أثناء الحذف');
      }
    } catch (err) {
      toast.error('حدث خطأ أثناء الحذف');
    }
  };

  const handleResetForEveryone = async () => {
    if (!currentAlert) return;
    if (!window.confirm('هل أنت متأكد من إعادة إظهار النافذة لجميع المستخدمين المستهدفين؟')) {
      return;
    }

    try {
      const res = await socialLinksAlertService.resetAlertForEveryone();
      if (res.success && res.data) {
        setCurrentAlert(res.data);
        toast.success('تم تصفير المشاهدات وسيظهر التنبيه للجميع مرة أخرى');
      } else {
        toast.error('حدث خطأ أثناء العملية');
      }
    } catch (err) {
      toast.error('حدث خطأ');
    }
  };

  const handleOpenLivePreview = () => {
    const alertToPreview: SocialLinksAlert = isEditing ? {
      id: 'preview',
      title: formData.title,
      message: formData.message,
      facebookUrl: formData.facebookUrl,
      telegramUrl: formData.telegramUrl,
      targetRole: formData.targetRole,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } : (currentAlert || {
      id: 'preview',
      title: 'معاينة تجريبية',
      message: 'الرجاء إدخال الروابط',
      facebookUrl: '',
      telegramUrl: '',
      targetRole: 'all',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    setPreviewAlert(alertToPreview);
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-6">
      {previewAlert && (
        <SocialLinksModal 
          previewAlert={previewAlert} 
          onClosePreview={() => setPreviewAlert(null)} 
        />
      )}

      {/* Explanation Banner */}
      <div className="bg-gradient-to-l from-blue-500/10 via-indigo-500/5 to-transparent border border-blue-100 dark:border-blue-900/50 p-5 rounded-2xl flex items-start gap-4">
        <div className="p-3 bg-blue-600 text-white rounded-xl shadow-sm">
          <Share2 size={24} />
        </div>
        <div>
          <h3 className="font-bold text-gray-900 dark:text-white text-base">
            نافذة الاشتراك في قنوات التواصل
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
            هذه النافذة المنبثقة تظهر للمستخدم (تجار وموردين) لتشجيعهم على الانضمام لصفحة الفيسبوك أو قناة التلغرام. تتميز بأنيميشن عصري وتظهر مرة واحدة فقط إلا إذا قمت بإعادة تصفيرها.
          </p>
        </div>
      </div>

      {!isEditing ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
                <Share2 size={24} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  حالة نافذة التواصل
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {currentAlert ? 'النافذة مفعلة أو مجهزة' : 'لا توجد نافذة منشأة حالياً'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {currentAlert && (
                <button
                  onClick={handleToggleActive}
                  disabled={togglingActive}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition shadow-sm ${
                    currentAlert.isActive
                      ? 'bg-green-100 text-green-700 border border-green-300'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${currentAlert.isActive ? 'bg-green-600' : 'bg-gray-400'}`}></span>
                  {currentAlert.isActive ? 'النافذة مفعلة' : 'النافذة معطلة'}
                </button>
              )}

              <button
                onClick={handleStartEdit}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition shadow-sm"
              >
                {currentAlert ? <Edit3 size={16} /> : <Plus size={16} />}
                <span>{currentAlert ? 'تعديل النافذة' : 'إنشاء نافذة تواصل'}</span>
              </button>
            </div>
          </div>

          {currentAlert ? (
            <div className="p-6 space-y-6">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1 p-5 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-700/80">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{currentAlert.title}</h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{currentAlert.message}</p>
                </div>
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-xl">
                    <Facebook className="text-blue-600" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex-1 truncate" dir="ltr">
                      {currentAlert.facebookUrl || 'لا يوجد رابط'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-sky-50/50 dark:bg-sky-900/10 border border-sky-100 dark:border-sky-800 rounded-xl">
                    <Send className="text-sky-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex-1 truncate" dir="ltr">
                      {currentAlert.telegramUrl || 'لا يوجد رابط'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex flex-wrap justify-between gap-4">
                <div className="flex gap-3">
                  <button onClick={handleOpenLivePreview} className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-xl text-sm font-bold">
                    <Eye size={16} /> معاينة حية
                  </button>
                  <button onClick={handleResetForEveryone} className="flex items-center gap-2 px-4 py-2.5 bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 rounded-xl text-sm font-bold border border-purple-200 dark:border-purple-800">
                    <RefreshCw size={16} /> تصفير وإظهار للجميع
                  </button>
                </div>
                <button onClick={handleDeleteAlert} className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 rounded-xl text-sm font-bold border border-red-200">
                  <Trash2 size={16} /> حذف النافذة
                </button>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-gray-500">
              لا توجد نافذة اشتراك في منصات التواصل حالياً. اضغط على الزر لإنشاء واحدة.
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex justify-between items-center pb-4 border-b border-gray-100 dark:border-gray-700 mb-6">
            <h3 className="text-xl font-bold dark:text-white">تعديل نافذة الاشتراك</h3>
            <button onClick={() => setIsEditing(false)} className="p-2 text-gray-400 hover:text-gray-600"><X size={20} /></button>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">العنوان</label>
              <input type="text" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">النص</label>
              <textarea rows={3} value={formData.message} onChange={(e) => setFormData({...formData, message: e.target.value})} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white resize-none" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">رابط الفيسبوك (اختياري)</label>
                <div className="flex items-center gap-3">
                  <Facebook className="text-blue-600" />
                  <input type="text" dir="ltr" value={formData.facebookUrl} onChange={(e) => setFormData({...formData, facebookUrl: e.target.value})} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">رابط التلغرام (اختياري)</label>
                <div className="flex items-center gap-3">
                  <Send className="text-sky-500" />
                  <input type="text" dir="ltr" value={formData.telegramUrl} onChange={(e) => setFormData({...formData, telegramUrl: e.target.value})} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">الفئة المستهدفة</label>
              <select value={formData.targetRole} onChange={(e) => setFormData({...formData, targetRole: e.target.value as any})} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
                <option value="all">الجميع (التجار والموردين)</option>
                <option value="merchant">التجار فقط</option>
                <option value="supplier">الموردون فقط</option>
              </select>
            </div>

            <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-700">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={formData.isActive} onChange={(e) => setFormData({...formData, isActive: e.target.checked})} className="w-5 h-5" />
                <span className="font-bold dark:text-white">تفعيل النافذة فور الحفظ</span>
              </label>
              {currentAlert && (
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={formData.resetSeenForEveryone} onChange={(e) => setFormData({...formData, resetSeenForEveryone: e.target.checked})} className="w-5 h-5" />
                  <span className="font-bold text-purple-600 dark:text-purple-400">إعادة إظهار النافذة للجميع (تحديث المعرف)</span>
                </label>
              )}
            </div>

            <div className="flex justify-between gap-3 pt-6">
              <button type="button" onClick={handleOpenLivePreview} className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white rounded-xl font-bold"><Eye size={16} /> معاينة</button>
              <div className="flex gap-3">
                <button type="button" onClick={() => setIsEditing(false)} className="px-6 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl font-bold">إلغاء</button>
                <button type="button" onClick={handleSaveAlert} disabled={saving} className="flex items-center gap-2 px-8 py-2.5 bg-blue-600 text-white rounded-xl font-bold disabled:opacity-50"><Check size={18} /> حفظ</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
