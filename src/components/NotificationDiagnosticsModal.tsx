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
  Info,
  Key
} from 'lucide-react';
import { 
  isNativePlatform,
  loginOneSignalUser,
  getNotificationDiagnostics, 
  requestPushPermissionAgain, 
  forcePushSubscriptionOptIn,
  sendTestPushToSelf,
  openNativeAppSettings,
  openNativeNotificationSettings,
  openXiaomiAutostart,
  openXiaomiBatterySaver,
  openUniversalBatterySettings,
  openHuaweiLaunchSettings,
  openOppoLaunchSettings,
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
  const [activatingOptIn, setActivatingOptIn] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [customKey, setCustomKey] = useState(() => {
    return (typeof window !== 'undefined' ? localStorage.getItem('onesignal_custom_rest_key') : '') || '';
  });

  const handleSaveCustomKey = async () => {
    if (!customKey.trim()) {
      localStorage.removeItem('onesignal_custom_rest_key');
      toast.success('تمت إزالة المفتاح المخصص واستعادة الافتراضي');
    } else {
      localStorage.setItem('onesignal_custom_rest_key', customKey.trim());
      toast.success('تم حفظ المفتاح الجديد بنجاح!');
    }
    await handleSendTestPush();
  };

  const handleForceOptIn = async () => {
    setActivatingOptIn(true);
    try {
      if (user?.id) {
        await loginOneSignalUser(user.id);
      }
      const ok = await forcePushSubscriptionOptIn(user?.id);
      if (ok) {
        toast.success('تم تحديث ومزامنة خدمة الإشعارات بنجاح!');
      } else {
        toast.error('يرجى التأكد من تشغيل إذن الإشعارات من إعدادات الهاتف وإعادة المحاولة.');
      }
      await runDiagnostics();
    } catch (e: any) {
      toast.error('حدث خطأ أثناء التفعيل: ' + (e?.message || ''));
    } finally {
      setActivatingOptIn(false);
    }
  };

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
      // Re-run diagnostics to refresh live data
      runDiagnostics();
    } catch (err: any) {
      const errorText = err?.message || 'خطأ غير متوقع أثناء الإرسال';
      setTestResult({
        success: false,
        message: errorText
      });
      toast.error(errorText);
      if (errorText.includes('401') || errorText.includes('غير مصرح') || errorText.includes('Unauthorized')) {
        setShowKeyInput(true);
      }
      runDiagnostics();
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
              <div className="p-3.5 rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    data?.isFullyConnected 
                      ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400' 
                      : (data?.hasPermission ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400' : 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400')
                  }`}>
                    <Bell size={20} />
                  </div>
                  <div>
                    <div className="text-[11px] text-gray-400">الاشتراك الفوري</div>
                    <div className="text-xs font-black text-gray-800 dark:text-gray-200">
                      {data?.isFullyConnected 
                        ? 'متصل بالخدمة ✅' 
                        : (data?.hasPermission 
                            ? (data?.isRegisteredWithFCM ? 'قيد التسجيل والربط ⏳' : 'جاري المزامنة مع Google Play ⏳') 
                            : 'غير مشترك ⚠️')}
                    </div>
                  </div>
                </div>
                {!data?.isFullyConnected && (
                  <button
                    onClick={handleForceOptIn}
                    disabled={activatingOptIn}
                    className="px-2.5 py-1 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition active:scale-95 shadow-sm flex items-center gap-1 shrink-0"
                    title="الضغط لتفعيل الاشتراك وتحديث الرمز فوراً"
                  >
                    {activatingOptIn ? <RefreshCw size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                    <span>تحديث الرمز</span>
                  </button>
                )}
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

            {/* Technical Diagnostics Info */}
            <div className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800 text-xs space-y-1.5 font-mono">
              <div className="flex items-center justify-between text-gray-600 dark:text-gray-300">
                <span className="font-sans font-medium text-gray-500">معرف الجهاز (Subscription ID):</span>
                <span className={data?.subscriptionId ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-amber-600 dark:text-amber-400 font-sans'}>
                  {data?.subscriptionId ? `${data.subscriptionId.slice(0, 14)}...` : 'جاري الاستلام من OneSignal ⏳'}
                </span>
              </div>
              <div className="flex items-center justify-between text-gray-600 dark:text-gray-300">
                <span className="font-sans font-medium text-gray-500">رمز Google FCM:</span>
                <span className={data?.isRegisteredWithFCM ? 'text-emerald-600 dark:text-emerald-400 font-sans font-bold' : 'text-amber-600 dark:text-amber-400 font-sans'}>
                  {data?.isRegisteredWithFCM ? 'متصل ومسجل بنجاح ✅' : 'جاري المزامنة مع Google Play ⏳'}
                </span>
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

            {/* Direct REST API Key Quick Recovery Box */}
            <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-800/50 text-xs">
              <div className="flex items-center justify-between font-bold text-indigo-950 dark:text-indigo-200 mb-1">
                <span className="flex items-center gap-1.5">
                  <Key size={15} className="text-indigo-600 dark:text-indigo-400" />
                  <span>مفتاح OneSignal REST API:</span>
                </span>
                <button
                  onClick={() => setShowKeyInput(!showKeyInput)}
                  className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                >
                  {showKeyInput ? 'إخفاء ▲' : 'إدخال مفتاح جديد ▼'}
                </button>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed mb-2">
                إذا قمت بتجديد أو استخراج مفتاح REST API جديد من لوحة OneSignal، الصقه هنا لتجربته فوراً دون إعادة تثبيت التطبيق.
              </p>
              {showKeyInput && (
                <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-indigo-100 dark:border-indigo-900/40">
                  <input
                    type="text"
                    dir="ltr"
                    placeholder="os_v2_app_..."
                    value={customKey}
                    onChange={(e) => setCustomKey(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-gray-900 border-indigo-200 dark:border-indigo-800 text-xs font-mono text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveCustomKey}
                      disabled={sendingTest}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-3 rounded-xl text-xs transition active:scale-98 shadow-sm"
                    >
                      حفظ المفتاح وتجربة الإشعار فوراً
                    </button>
                    {customKey && (
                      <button
                        onClick={() => {
                          setCustomKey('');
                          localStorage.removeItem('onesignal_custom_rest_key');
                          toast.success('تمت استعادة المفتاح الافتراضي');
                        }}
                        className="px-3 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-bold rounded-xl text-xs transition"
                      >
                        مسح
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Multi-Brand Smart Background & Battery Optimization Guidance */}
            {(() => {
              const brand = data?.brandDetails?.brand || (data?.isXiaomi ? 'xiaomi' : 'general');
              const brandName = data?.brandDetails?.manufacturer ? data.brandDetails.manufacturer.toUpperCase() : '';

              if (brand === 'samsung') {
                return (
                  <div className="p-4 rounded-2xl bg-blue-50/90 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/50">
                    <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300 font-bold text-sm mb-2">
                      <ShieldAlert size={18} className="shrink-0 text-blue-600 dark:text-blue-400" />
                      <span>إعدادات حاسمة لهواتف سامسونج (Samsung Galaxy):</span>
                    </div>
                    <p className="text-xs text-blue-900/80 dark:text-blue-200/90 leading-relaxed mb-3">
                      نظام One UI قد يضع التطبيق في وضع السكون (Sleeping Apps) بعد فترة. اضغط بالأسفل لضبطه فوراً:
                    </p>
                    <div className="space-y-2 text-xs text-gray-700 dark:text-gray-300">
                      <div 
                        onClick={handleOpenSettings}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-white/80 dark:bg-gray-800/80 border border-blue-100 dark:border-blue-900/40 cursor-pointer hover:bg-blue-100/40 active:scale-98 transition"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                          <span className="font-bold">البطارية: اختر "غير مقيد" (Unrestricted):</span>
                        </div>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                          فتح ضبط البطارية ⚡
                        </span>
                      </div>
                      <div 
                        onClick={handleOpenNotificationSettings}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-white/80 dark:bg-gray-800/80 border border-blue-100 dark:border-blue-900/40 cursor-pointer hover:bg-blue-100/40 active:scale-98 transition"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          <span className="font-bold">شاشة القفل وموجز الإشعارات:</span>
                        </div>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                          السماح بالظهور 🔔
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }

              if (brand === 'oppo') {
                return (
                  <div className="p-4 rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/50">
                    <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm mb-2">
                      <ShieldAlert size={18} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <span>إعدادات حاسمة لأجهزة أوبو وريلمي (Oppo / Realme / OnePlus):</span>
                    </div>
                    <p className="text-xs text-emerald-900/80 dark:text-emerald-200/90 leading-relaxed mb-3">
                      واجهة ColorOS تتطلب تمكين التشغيل التلقائي في الخلفية لضمان وصول التنبيهات:
                    </p>
                    <div className="space-y-2 text-xs text-gray-700 dark:text-gray-300">
                      <div 
                        onClick={openOppoLaunchSettings}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-white/80 dark:bg-gray-800/80 border border-emerald-100 dark:border-emerald-900/40 cursor-pointer hover:bg-emerald-100/40 active:scale-98 transition"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          <span className="font-bold">التشغيل التلقائي في الخلفية (Auto-launch):</span>
                        </div>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                          فتح الإعداد 🚀
                        </span>
                      </div>
                      <div 
                        onClick={handleOpenSettings}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-white/80 dark:bg-gray-800/80 border border-emerald-100 dark:border-emerald-900/40 cursor-pointer hover:bg-emerald-100/40 active:scale-98 transition"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                          <span className="font-bold">نشاط الخلفية: السماح بنشاط الخلفية دائماً:</span>
                        </div>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                          ضبط البطارية ⚡
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }

              if (brand === 'huawei') {
                return (
                  <div className="p-4 rounded-2xl bg-red-50/90 dark:bg-red-950/30 border border-red-200/80 dark:border-red-800/50">
                    <div className="flex items-center gap-2 text-red-800 dark:text-red-300 font-bold text-sm mb-2">
                      <ShieldAlert size={18} className="shrink-0 text-red-600 dark:text-red-400" />
                      <span>إعدادات حاسمة لأجهزة هواوي وهونر (Huawei / Honor):</span>
                    </div>
                    <p className="text-xs text-red-900/80 dark:text-red-200/90 leading-relaxed mb-3">
                      واجهة EMUI تتطلب إدارة تشغيل التطبيق يدوياً لضمان عدم إيقافه:
                    </p>
                    <div className="space-y-2 text-xs text-gray-700 dark:text-gray-300">
                      <div 
                        onClick={openHuaweiLaunchSettings}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-white/80 dark:bg-gray-800/80 border border-red-100 dark:border-red-900/40 cursor-pointer hover:bg-red-100/40 active:scale-98 transition"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-red-500"></span>
                          <span className="font-bold">تشغيل التطبيقات (App Launch): اختر إدارة يدوية:</span>
                        </div>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
                          فتح الإعداد 🚀
                        </span>
                      </div>
                      <div 
                        onClick={handleOpenNotificationSettings}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-white/80 dark:bg-gray-800/80 border border-red-100 dark:border-red-900/40 cursor-pointer hover:bg-red-100/40 active:scale-98 transition"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                          <span className="font-bold">شاشة القفل والرايات المنبثقة (Banners):</span>
                        </div>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                          ضبط الإشعارات 🔔
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }

              // Default: Xiaomi / Redmi / POCO
              if (brand === 'xiaomi') {
                return (
                  <div className="p-4 rounded-2xl bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50">
                    <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-sm mb-2">
                      <ShieldAlert size={18} className="shrink-0 text-amber-600 dark:text-amber-400" />
                      <span>إعدادات حاسمة لأجهزة شاومي وريدمي (Xiaomi / Redmi / POCO):</span>
                    </div>
                    <p className="text-xs text-amber-900/80 dark:text-amber-200/90 leading-relaxed mb-3">
                      نظام HyperOS / MIUI يمنع ظهور الإشعارات أو التنبيهات في الخلفية تلقائياً. اضغط على أي بند بالأسفل لفتحه وضبطه فوراً:
                    </p>
                    
                    <div className="space-y-2 text-xs text-gray-700 dark:text-gray-300">
                      <div 
                        onClick={handleOpenSettings}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-white/80 dark:bg-gray-800/80 border border-amber-100 dark:border-amber-900/40 cursor-pointer hover:bg-amber-100/40 active:scale-98 transition"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-red-500"></span>
                          <span className="font-bold">عرض النوافذ المنبثقة أثناء التشغيل في الخلفية:</span>
                        </div>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                          اضغط للضبط ⚙️
                        </span>
                      </div>

                      <div 
                        onClick={handleOpenNotificationSettings}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-white/80 dark:bg-gray-800/80 border border-amber-100 dark:border-amber-900/40 cursor-pointer hover:bg-amber-100/40 active:scale-98 transition"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-red-500"></span>
                          <span className="font-bold">العرض على شاشة القفل (Show on Lock screen):</span>
                        </div>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                          اضغط للضبط ⚙️
                        </span>
                      </div>

                      <div 
                        onClick={openXiaomiAutostart}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-white/80 dark:bg-gray-800/80 border border-amber-100 dark:border-amber-900/40 cursor-pointer hover:bg-indigo-100/40 active:scale-98 transition"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                          <span className="font-bold">التشغيل التلقائي (Autostart):</span>
                        </div>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
                          فتح الإعداد 🚀
                        </span>
                      </div>

                      <div 
                        onClick={openXiaomiBatterySaver}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-white/80 dark:bg-gray-800/80 border border-amber-100 dark:border-amber-900/40 cursor-pointer hover:bg-blue-100/40 active:scale-98 transition"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                          <span className="font-bold">موفر البطارية (Battery Saver):</span>
                        </div>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                          ضبط "لا توجد قيود" ⚡
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }

              // General Android / Google Pixel / Motorola / etc.
              return (
                <div className="p-4 rounded-2xl bg-indigo-50/90 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/50">
                  <div className="flex items-center gap-2 text-indigo-800 dark:text-indigo-300 font-bold text-sm mb-2">
                    <ShieldAlert size={18} className="shrink-0 text-indigo-600 dark:text-indigo-400" />
                    <span>إعدادات تحسين وصول التنبيهات ({brandName || 'Android'}):</span>
                  </div>
                  <p className="text-xs text-indigo-900/80 dark:text-indigo-200/90 leading-relaxed mb-3">
                    لضمان وصول التنبيهات فوراً حتى عند قفل الشاشة أو في وضع السكون:
                  </p>
                  <div className="space-y-2 text-xs text-gray-700 dark:text-gray-300">
                    <div 
                      onClick={openUniversalBatterySettings}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-white/80 dark:bg-gray-800/80 border border-indigo-100 dark:border-indigo-900/40 cursor-pointer hover:bg-indigo-100/40 active:scale-98 transition"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                        <span className="font-bold">استثناء التطبيق من موفر البطارية (Unrestricted):</span>
                      </div>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
                        ضبط الاستثناء ⚡
                      </span>
                    </div>
                    <div 
                      onClick={handleOpenNotificationSettings}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-white/80 dark:bg-gray-800/80 border border-indigo-100 dark:border-indigo-900/40 cursor-pointer hover:bg-indigo-100/40 active:scale-98 transition"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span className="font-bold">أذونات الإشعارات وشاشة القفل:</span>
                      </div>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                        فتح الإعدادات 🔔
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Quick Action Buttons */}
            <div className="flex flex-col gap-2 pt-2">
              {!data?.isFullyConnected && (
                <button
                  onClick={handleForceOptIn}
                  disabled={activatingOptIn}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold py-3 px-4 rounded-xl text-xs sm:text-sm shadow-md transition active:scale-98"
                >
                  {activatingOptIn ? <RefreshCw size={16} className="animate-spin" /> : <Bell size={16} />}
                  <span>{data?.isRegisteredWithFCM ? 'تحديث ومزامنة الرمز الآن' : 'تفعيل ومزامنة رمز Google Play (FCM) الآن'}</span>
                </button>
              )}

              <div className="flex flex-col sm:flex-row gap-2">
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
