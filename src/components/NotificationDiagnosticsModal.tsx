import { useState, useEffect } from 'react';
import { 
  Bell, 
  Smartphone, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  Settings, 
  Send, 
  ShieldAlert, 
  X,
  Sliders,
  Info
} from 'lucide-react';
import { 
  isNativePlatform,
  loginOneSignalUser,
  getNotificationDiagnostics, 
  requestPushPermissionAgain, 
  sendTestPushToSelf,
  openNativeAppSettings,
  openNativeNotificationSettings,
  NotificationDiagnosticData 
} from '../lib/onesignal';
import { useAuthStore } from '../store/useAuthStore';
import toast from 'react-hot-toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationDiagnosticsModal = ({ isOpen, onClose }: Props) => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<NotificationDiagnosticData | null>(null);
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const runDiagnostics = async () => {
    setLoading(true);
    setTestResult(null);
    try {
      const result = await getNotificationDiagnostics();
      setData(result);
    } catch (err: any) {
      toast.error('حدث خطأ أثناء فحص الإشعارات: ' + (err?.message || ''));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (user?.id) {
        loginOneSignalUser(user.id).catch(() => {});
      }
      runDiagnostics();
    }
  }, [isOpen, user]);

  if (!isOpen || !isNativePlatform()) return null;

  const handleRequestPermission = async () => {
    try {
      const granted = await requestPushPermissionAgain();
      if (granted) {
        toast.success('تم منح إذن الإشعارات بنجاح!');
      } else {
        toast('لم يتم منح الإذن، يرجى التفعيل يدوياً من إعدادات الهاتف.', { icon: 'ℹ️' });
      }
      runDiagnostics();
    } catch {
      toast.error('تعذر طلب الإذن تلقائياً');
    }
  };

  const handleSendTestPush = async () => {
    if (!user?.id) {
      toast.error('يجب تسجيل الدخول أولاً لإرسال إشعار تجريبي لحسابك');
      return;
    }
    setSendingTest(true);
    setTestResult(null);
    try {
      if (isNativePlatform()) {
        try {
          await loginOneSignalUser(user.id);
        } catch {}
      }

      const res = await sendTestPushToSelf(user.id, data?.subscriptionId);
      if (res.success) {
        setTestResult({
          success: true,
          message: 'تم إرسال الإشعار بنجاح إلى هاتفك! تفقد شريط الإشعارات أعلى الشاشة.'
        });
        toast.success('تم إرسال إشعار تجريبي لهاتفك بنجاح!');
      } else {
        const errorText = res.error || 'تعذر إرسال الإشعار التجريبي';
        setTestResult({
          success: false,
          message: errorText
        });
        toast.error(errorText);
      }
    } catch (err: any) {
      const errorText = err?.message || 'خطأ غير متوقع أثناء الإرسال';
      setTestResult({
        success: false,
        message: errorText
      });
      toast.error(errorText);
    } finally {
      setSendingTest(false);
    }
  };

  const handleOpenSettings = () => {
    const opened = openNativeAppSettings();
    if (!opened) {
      toast('افتح إعدادات هاتفك > التطبيقات > إدارة التطبيقات > جيبها', { icon: '📱' });
    }
  };

  const handleOpenNotificationSettings = () => {
    const opened = openNativeNotificationSettings();
    if (!opened) {
      toast('افتح إعدادات هاتفك > التطبيقات > جيبها > الإشعارات', { icon: '🔔' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-xl w-full p-6 text-right font-['Tajawal'] my-8 border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-700 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-inner">
              <Bell size={24} className="animate-pulse" />
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white">تشخيص وحل مشكلات الإشعارات</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">فحص تلقائي لحالة وصول التنبيهات لهاتفك الذكي</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <RefreshCw size={32} className="text-indigo-600 animate-spin" />
            <p className="text-sm font-bold text-gray-600 dark:text-gray-300">جاري فحص نظام الإشعارات في جهازك...</p>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Status Grid */}
            <div className="grid grid-cols-2 gap-3">
              
              {/* Native App Status */}
              <div className="p-3.5 rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${data?.isNative ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400'}`}>
                  <Smartphone size={20} />
                </div>
                <div>
                  <div className="text-[11px] text-gray-400">نوع التطبيق</div>
                  <div className="text-xs font-black text-gray-800 dark:text-gray-200">
                    {data?.isNative ? 'تطبيق مثبت (Android)' : 'متصفح ويب (Web)'}
                  </div>
                </div>
              </div>

              {/* Push Permission */}
              <div className="p-3.5 rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${data?.hasPermission ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400'}`}>
                  {data?.hasPermission ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                </div>
                <div>
                  <div className="text-[11px] text-gray-400">إذن الإشعارات</div>
                  <div className="text-xs font-black text-gray-800 dark:text-gray-200">
                    {data?.hasPermission ? 'ممنوح ومفعل ✅' : 'معطل أو مرفوض ❌'}
                  </div>
                </div>
              </div>

              {/* Push Subscription */}
              <div className="p-3.5 rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${data?.optedIn ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400'}`}>
                  <Bell size={20} />
                </div>
                <div>
                  <div className="text-[11px] text-gray-400">الاشتراك الفوري</div>
                  <div className="text-xs font-black text-gray-800 dark:text-gray-200">
                    {data?.optedIn ? 'متصل بالخدمة ✅' : 'غير مشترك ⚠️'}
                  </div>
                </div>
              </div>

              {/* Account Link */}
              <div className="p-3.5 rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${data?.externalId ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700'}`}>
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <div className="text-[11px] text-gray-400">ربط الحساب</div>
                  <div className="text-xs font-black text-gray-800 dark:text-gray-200">
                    {data?.externalId ? 'مرتبط بحسابك ✅' : 'غير مرتبط'}
                  </div>
                </div>
              </div>

            </div>

            {/* Test Push Result Alert */}
            {testResult && (
              <div className={`p-4 rounded-2xl border text-sm ${testResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200' : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/40 dark:border-red-800 dark:text-red-200'}`}>
                <div className="flex items-start gap-3">
                  {testResult.success ? <CheckCircle2 size={20} className="shrink-0 text-emerald-600 mt-0.5" /> : <AlertTriangle size={20} className="shrink-0 text-red-600 mt-0.5" />}
                  <div>
                    <div className="font-bold mb-1">{testResult.success ? 'نتيجة الاختبار: ناجح' : 'فشل إرسال الإشعار التجريبي'}</div>
                    <div className="text-xs leading-relaxed">{testResult.message}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Crucial Instructions for Xiaomi / Redmi / POCO users */}
            <div className="p-4 rounded-2xl bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-sm mb-2">
                <ShieldAlert size={18} className="shrink-0 text-amber-600 dark:text-amber-400" />
                <span>إعدادات حاسمة لأجهزة شاومي وريدمي (Xiaomi / Redmi / POCO):</span>
              </div>
              <p className="text-xs text-amber-900/80 dark:text-amber-200/90 leading-relaxed mb-3">
                نظام MIUI يمنع ظهور الإشعارات العائمة أو التنبيهات والتطبيق مغلق تلقائياً. لحل المشكلة فوراً اضبط التالي من إعدادات الهاتف:
              </p>
              
              <div className="space-y-2 text-xs text-gray-700 dark:text-gray-300">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/80 dark:bg-gray-800/80 border border-amber-100 dark:border-amber-900/40">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    <span className="font-bold">عرض النوافذ المنبثقة أثناء التشغيل في الخلفية:</span>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                    غيّره إلى أخضر ✔️
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/80 dark:bg-gray-800/80 border border-amber-100 dark:border-amber-900/40">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    <span className="font-bold">العرض على شاشة القفل (Show on Lock screen):</span>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                    غيّره إلى أخضر ✔️
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/80 dark:bg-gray-800/80 border border-amber-100 dark:border-amber-900/40">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                    <span className="font-bold">التشغيل التلقائي (Autostart):</span>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                    تفعيل ✅
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/80 dark:bg-gray-800/80 border border-amber-100 dark:border-amber-900/40">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                    <span className="font-bold">موفر البطارية (Battery Saver):</span>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                    اختر "لا توجد قيود"
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                onClick={handleSendTestPush}
                disabled={sendingTest}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold py-3 px-4 rounded-xl text-xs sm:text-sm shadow-md transition disabled:opacity-50 active:scale-98"
              >
                {sendingTest ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                <span>إرسال إشعار تجريبي لهاتفي</span>
              </button>

              {!data?.hasPermission && (
                <button
                  onClick={handleRequestPermission}
                  className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl text-xs sm:text-sm shadow-md transition active:scale-98"
                >
                  <Bell size={16} />
                  <span>طلب الإذن</span>
                </button>
              )}

              <button
                onClick={handleOpenNotificationSettings}
                className="flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 font-bold py-3 px-4 rounded-xl text-xs sm:text-sm transition active:scale-98"
                title="فتح إعدادات الإشعارات في الهاتف مباشرة"
              >
                <Sliders size={16} />
                <span>إعدادات الإشعارات</span>
              </button>

              <button
                onClick={handleOpenSettings}
                className="flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 font-bold py-3 px-4 rounded-xl text-xs sm:text-sm transition active:scale-98"
                title="فتح إعدادات التطبيق الكاملة في الهاتف مباشرة"
              >
                <Settings size={16} />
                <span>إعدادات التطبيق</span>
              </button>
            </div>

            {/* Recheck Button & Channel info */}
            <div className="flex justify-between items-center text-xs text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-700">
              <span className="flex items-center gap-1.5">
                <Info size={14} className="text-indigo-500" />
                <span>قناة الإشعارات النشطة: <strong className="text-indigo-600 dark:text-indigo-400 font-mono">jibha_channel</strong></span>
              </span>
              <button
                onClick={runDiagnostics}
                className="inline-flex items-center gap-1 text-gray-500 hover:text-indigo-600 transition font-bold"
              >
                <RefreshCw size={14} />
                <span>إعادة الفحص الآن</span>
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};

export default NotificationDiagnosticsModal;
