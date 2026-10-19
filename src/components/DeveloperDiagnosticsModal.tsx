import { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  X, 
  Lock, 
  Bell, 
  Smartphone, 
  RefreshCw, 
  CheckCircle2, 
  Send,
  Wifi,
  Radio,
  Sliders,
  ExternalLink,
  HelpCircle,
  Activity
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/useAuthStore';
import { 
  ONESIGNAL_APP_ID, 
  loginOneSignal,
  requestNotificationPermission, 
  sendPushNotification,
  getPushSubscriptionId,
  getFcmToken,
  isNativePlatform,
  isXiaomiDevice,
  openXiaomiDataUsageSettings,
  openXiaomiBatterySaver,
  openXiaomiAutostart,
  openDataSaverSettings,
  openGooglePlayServicesSettings,
  openMobileNetworkSettings,
  openFcmDiagnostics,
  getNetworkDiagnosticInfo,
  NetworkDiagnosticInfo
} from '../lib/onesignal';

const AUTHORIZED_DEVELOPER_EMAIL = 'madaniameur26@gmail.com';

interface DeveloperDiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserEmail?: string;
  userId?: string;
  userRole?: string | null;
}

export default function DeveloperDiagnosticsModal({
  isOpen,
  onClose,
  currentUserEmail,
  userId,
  userRole
}: DeveloperDiagnosticsModalProps) {
  const authUser = useAuthStore((state) => state.user);
  const effectiveEmail = currentUserEmail || authUser?.email;
  const effectiveUserId = userId || authUser?.id;
  const effectiveRole = userRole || authUser?.role;

  // Principle 5: Enforce zero-leakage security. Non-developers receive null immediately!
  const isAuthorized = effectiveEmail?.trim().toLowerCase() === AUTHORIZED_DEVELOPER_EMAIL;
  if (!isOpen || !isAuthorized) {
    return null;
  }

  const [notificationState, setNotificationState] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unknown'
  );
  const [isTestingPush, setIsTestingPush] = useState(false);
  const [subId, setSubId] = useState<string | null>(null);
  const [fcmToken, setFcmToken] = useState<string>('');
  const [netInfo, setNetInfo] = useState<NetworkDiagnosticInfo | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  const refreshAll = () => {
    // Non-blocking async fetch
    setTimeout(async () => {
      try {
        const id = await getPushSubscriptionId();
        if (id) setSubId(id);
        const token = getFcmToken();
        if (token) setFcmToken(token);
        const info = getNetworkDiagnosticInfo();
        if (info) setNetInfo(info);
      } catch (e) {
        console.warn('Diagnostics refresh notice:', e);
      }
    }, 20);
  };

  useEffect(() => {
    if (isOpen) {
      const localSub = localStorage.getItem('onesignal_subscription_id');
      if (localSub) setSubId(localSub);
      refreshAll();
    }
  }, [isOpen]);

  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncDevice = async () => {
    setIsSyncing(true);
    const toastId = toast.loading('جاري طلب إذن النظام ومزامنة رمز الجهاز مع الحساب...');

    try {
      // 1. Request OS permission
      const permGranted = await requestNotificationPermission();
      setNotificationState(permGranted ? 'granted' : 'denied');

      // 2. Re-login to OneSignal to associate this device with current user ID
      if (effectiveUserId) {
        await loginOneSignal(effectiveUserId, effectiveRole || undefined, authUser?.name || undefined);
      }

      // 3. OptIn push subscription
      try {
        const OS = (window as any).OneSignal;
        if (OS?.User?.pushSubscription?.optIn) {
          await OS.User.pushSubscription.optIn();
        }
      } catch {}

      // 4. Read fresh IDs
      const freshSubId = await getPushSubscriptionId();
      if (freshSubId) {
        setSubId(freshSubId);
        localStorage.setItem('onesignal_subscription_id', freshSubId);
      }
      const token = getFcmToken();
      if (token) setFcmToken(token);

      toast.success(
        freshSubId 
          ? `✅ تم ربط جهازك بنجاح! Subscription: ${freshSubId.slice(0, 8)}...` 
          : 'تم تحديث أذونات الإشعارات بنجاح', 
        { id: toastId }
      );
    } catch (err: any) {
      toast.error(err?.message || 'فشلت عملية المزامنة', { id: toastId });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleTestPush = async () => {
    setIsTestingPush(true);
    const toastId = toast.loading('إرسال إشعار فحص عالي الأولوية (Priority: 10)...');

    try {
      const res = await sendPushNotification({
        title: '🧪 اختبار إشعار منصة جيبها',
        message: `وصول فوري بجودة FCM v1 على معرف العميل: ${effectiveUserId || 'عام'}`,
        targetUserId: effectiveUserId || null,
        targetRole: effectiveRole || null,
        targetSubscriptionId: subId || null,
        data: { test: true, timestamp: Date.now() }
      });

      if (res?.error) {
        toast.error(`فشل الإرسال: ${res.error.message || JSON.stringify(res.error)}`, { id: toastId });
      } else if (res?.recipients === 0) {
        toast.error('تم الإرسال ولكن لم يستقبله أي جهاز (0 مستلمين). اضغط زر "مزامنة وربط رمز الجهاز" أولاً.', { id: toastId, duration: 6000 });
      } else if (res?.errors && res.errors.length > 0) {
        toast.error(`OneSignal Notice: ${res.errors.join(', ')}`, { id: toastId });
      } else {
        toast.success(`تم إرسال الإشعار بنجاح! (الأجهزة المستهدفة: ${res?.recipients ?? 1})`, { id: toastId });
      }
    } catch (err: any) {
      toast.error(err?.message || 'خطأ غير متوقع في الاتصال بالخادم', { id: toastId });
    } finally {
      setIsTestingPush(false);
    }
  };

  const handleRequestPermission = async () => {
    const perm = await requestNotificationPermission();
    setNotificationState(perm ? 'granted' : 'denied');
    toast.success(perm ? 'تم منح الإذن بنجاح' : 'تم رفض الإذن');
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/75 backdrop-blur-md flex items-center justify-center p-4 font-mono text-xs" dir="ltr">
      <div className="bg-slate-950 border border-emerald-500/30 text-emerald-400 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-[0_20px_50px_rgba(16,185,129,0.15)] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-emerald-500/20 flex items-center justify-between bg-slate-900/60 sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} className="text-emerald-400 animate-pulse" />
            <span className="font-bold tracking-wider text-white">ENGINEERING DIAGNOSTICS BRIDGE</span>
            <span className="bg-emerald-950 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded text-[10px]">
              DEVELOPER ONLY
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={refreshAll} 
              title="تحديث البيانات"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <RefreshCw size={15} />
            </button>
            <button 
              onClick={onClose} 
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">

          {/* Cellular / SIM & Network Health */}
          <div className="bg-slate-900/90 rounded-xl p-4 border border-slate-800 space-y-3" dir="rtl">
            <div className="flex items-center justify-between text-slate-300 font-sans font-bold text-sm" dir="ltr">
              <span className="flex items-center gap-1.5">
                {netInfo?.networkType === 'CELLULAR' ? (
                  <Radio size={16} className="text-amber-400 animate-pulse" />
                ) : (
                  <Wifi size={16} className="text-cyan-400" />
                )}
                <span className="font-mono">Cellular & SIM Network Diagnostics</span>
              </span>
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-mono ${
                netInfo?.networkType === 'CELLULAR' 
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                  : netInfo?.networkType === 'WIFI' 
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                    : 'bg-slate-800 text-slate-400'
              }`}>
                {netInfo?.networkType === 'CELLULAR' ? 'شريحة الهاتف (Mobile Data)' : (netInfo?.networkType === 'WIFI' ? 'واي فاي (Wi-Fi)' : 'حالة الشبكة')}
              </span>
            </div>

            <div className="space-y-1 text-slate-300 font-sans text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">نوع الاتصال الحالي:</span>
                <span className="font-bold text-cyan-300 font-mono">
                  {netInfo?.networkType || (navigator.onLine ? 'متصل بالإنترنت' : 'غير متصل')}
                </span>
              </div>
              {netInfo?.carrierName && (
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">مشغل الشريحة (Carrier):</span>
                  <span className="font-bold text-amber-300">{netInfo.carrierName}</span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">موفّر البيانات (Data Saver):</span>
                <span className={`font-bold ${netInfo?.isDataSaverActive ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {netInfo?.isDataSaverActive ? 'مفعّل (قد يقيد اتصالات الخلفية على الشريحة)' : 'معطّل (سليم)'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">استخدام بيانات الخلفية للتطبيق:</span>
                <span className={`font-bold ${netInfo?.isAppRestricted ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {netInfo?.isAppRestricted ? 'مقيد (ممنوع من الوصول في الخلفية)' : 'غير مقيد (مصرّح بالكامل)'}
                </span>
              </div>
            </div>

            {/* Quick Fix Action Buttons for Mobile SIM */}
            <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 font-sans">
              <button
                onClick={() => {
                  openDataSaverSettings();
                  toast.success('تم فتح إعدادات البيانات غير المقيدة للتطبيق');
                }}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 border border-slate-700"
              >
                <Sliders size={13} className="text-amber-400" />
                <span>السماح ببيانات غير مقيدة للتطبيق</span>
              </button>

              <button
                onClick={() => {
                  openGooglePlayServicesSettings();
                  toast.success('تم فتح إعدادات خدمات Google Play');
                }}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 border border-slate-700"
              >
                <ExternalLink size={13} className="text-cyan-400" />
                <span>فحص بيانات خدمات Google Play</span>
              </button>

              <button
                onClick={() => {
                  openMobileNetworkSettings();
                  toast.success('تم فتح إعدادات شبكة الهاتف والـ APN');
                }}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 border border-slate-700"
              >
                <Radio size={13} className="text-emerald-400" />
                <span>إعدادات الشريحة ونقطة الوصول (APN)</span>
              </button>

              <button
                onClick={() => {
                  openFcmDiagnostics();
                  toast.success('تم تشغيل أداة فحص قناة اتصال FCM (*#*#426#*#*)');
                }}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 border border-slate-700"
              >
                <Activity size={13} className="text-indigo-400" />
                <span>فحص قناة FCM الحية (*#*#426#*#*)</span>
              </button>
            </div>

            {/* Explanation Toggle */}
            <div className="pt-2 border-t border-slate-800/80">
              <button
                onClick={() => setShowExplanation(!showExplanation)}
                className="w-full text-left text-xs text-amber-300/90 hover:text-amber-200 flex items-center justify-between py-1 transition"
              >
                <span className="flex items-center gap-1.5 font-bold">
                  <HelpCircle size={14} className="text-amber-400" />
                  لماذا لا تصل التنبيهات على نت الشريحة وتصل دفعة واحدة عند تشغيل الويفي؟
                </span>
                <span className="font-mono text-[10px] text-slate-400">{showExplanation ? 'إخفاء' : 'عرض التفاصيل'}</span>
              </button>

              {showExplanation && (
                <div className="mt-2.5 p-3.5 bg-slate-950/90 rounded-xl border border-amber-500/20 text-slate-300 text-[11px] leading-relaxed space-y-2">
                  <p className="text-amber-300 font-bold">
                    وصول الإشعارات متأخرة دفعة واحدة عند فتح الويفي يثبت أن السيرفر أرسلها بنجاح، ولكن قناة الاتصال (Socket) كانت معلقة على شبكة الهاتف للأسباب التالية:
                  </p>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-300 pr-1">
                    <li>
                      <strong className="text-white">مهلة جدول الـ NAT لمشغل الهاتف (Carrier NAT Timeout):</strong> تقوم شركات الاتصالات بقطع قناة TCP بين الهاتف وخوادم Google Play بعد 1-3 دقائق من الخمول لتوفير الـ IP، بينما يرسل أندرويد نبضة التحقق كل 28 دقيقة على الشريحة، فيظن الهاتف أنه متصل بينما الاتصال مقطوع فعلياً!
                    </li>
                    <li>
                      <strong className="text-white">تقييد بيانات الخلفية (Data Saver):</strong> يمنع أندرويد تلقائياً خدمات Google Play أو التطبيق من الاتصال في الخلفية لتوفير رصيد الشريحة، وعند التحويل للواي فاي تُرفع القيود فوراً فتصل الإشعارات.
                    </li>
                    <li>
                      <strong className="text-white">بروتوكول IPv6 في إعدادات نقطة الوصول (APN):</strong> بعض الشرائح تفقد حزم خوادم Google عبر IPv6. الحل ضبط بروتوكول APN على <span className="font-mono text-cyan-300">IPv4/IPv6</span> أو <span className="font-mono text-cyan-300">IPv4</span>.
                    </li>
                    <li>
                      <strong className="text-white">وضع سكون مودم الشريحة (Doze Mode):</strong> يقوم النظام بتعليق راديو الشريحة لتوفير البطارية، ويجب تفعيل "الاستخدام غير المقيد للبيانات" للتطبيق لتفادي ذلك.
                    </li>
                  </ol>
                </div>
              )}
            </div>
          </div>

          {/* Xiaomi / Redmi Specific Fixes */}
          {isXiaomiDevice() && (
            <div className="bg-amber-950/30 border border-amber-500/40 rounded-xl p-3.5 space-y-2.5" dir="rtl">
              <div className="flex items-center justify-between text-amber-300 font-bold text-xs" dir="ltr">
                <span className="flex items-center gap-1.5">
                  <Smartphone size={15} className="text-amber-400" />
                  <span>Xiaomi / Redmi MIUI 4G Settings</span>
                </span>
                <span className="text-[10px] bg-amber-500/20 px-2 py-0.5 rounded text-amber-300 font-mono">
                  MIUI DETECTED
                </span>
              </div>
              <p className="text-[11px] text-amber-200/90 leading-relaxed font-sans">
                هواتف شاومي وريدمي تقوم افتراضياً بحجب الإنترنت عن التطبيقات في الـ 4G عند إغلاق الشاشة لتوفير الرصيد والبطارية. اضغط الأزرار التالية لضبطها:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-sans pt-1">
                <button
                  onClick={() => {
                    openXiaomiDataUsageSettings();
                    toast.success('تأكد من تفعيل علامة الصح أمام "بيانات الهاتف" (Mobile data)');
                  }}
                  className="bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 py-2 px-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 border border-amber-500/40"
                >
                  <span>1. تقييد بيانات الشريحة</span>
                </button>
                <button
                  onClick={() => {
                    openXiaomiBatterySaver();
                    toast.success('اختر "لا توجد قيود" (No restrictions)');
                  }}
                  className="bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 py-2 px-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 border border-amber-500/40"
                >
                  <span>2. موفر البطارية (لا توجد قيود)</span>
                </button>
                <button
                  onClick={() => {
                    openXiaomiAutostart();
                    toast.success('قم بتفعيل "التشغيل التلقائي" للتطبيق');
                  }}
                  className="bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 py-2 px-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 border border-amber-500/40"
                >
                  <span>3. التشغيل التلقائي</span>
                </button>
              </div>
            </div>
          )}

          {/* Key Separation & Zero Trust Status */}
          <div className="bg-slate-900/90 rounded-xl p-4 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-slate-300 font-sans font-bold text-sm">
              <span className="flex items-center gap-1.5"><Lock size={15} className="text-amber-400" /> Key Separation & Zero-Trust Audit</span>
              <span className="text-[11px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full">PASSED</span>
            </div>
            <div className="space-y-1 text-slate-300">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">OneSignal App ID (Client-Safe):</span>
                <span className="text-emerald-300 font-bold select-all">{ONESIGNAL_APP_ID}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">REST API Key Location:</span>
                <span className="text-amber-300 font-bold">Supabase Secrets Only (Zero-Trust Backend)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Active Identity (external_id):</span>
                <span className="text-cyan-300 font-bold">{effectiveUserId || 'Unauthenticated'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Subscription ID:</span>
                <span className="text-cyan-300 font-mono text-[10px]">{subId || 'Loading/None'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">FCM v1 Token:</span>
                <span className="text-slate-400 font-mono text-[10px]">{fcmToken ? `${fcmToken.slice(0, 20)}...` : 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* FCM & Android Notification Status */}
          <div className="bg-slate-900/90 rounded-xl p-4 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-slate-300 font-sans font-bold text-sm">
              <span className="flex items-center gap-1.5"><Bell size={15} className="text-cyan-400" /> Push & Channels Health</span>
              <span className={`text-[11px] px-2 py-0.5 rounded-full ${notificationState === 'granted' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                {String(notificationState).toUpperCase()}
              </span>
            </div>
            <div className="space-y-1 text-slate-300">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Android Channel ID:</span>
                <span className="text-cyan-300">default_notification_channel (IMPORTANCE_HIGH)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Delivery Priority:</span>
                <span className="text-emerald-300">Priority 10 (FCM High / Instant Wake)</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Target Role:</span>
                <span className="text-slate-300">{effectiveRole || 'merchant'}</span>
              </div>
            </div>
            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <button
                onClick={handleSyncDevice}
                disabled={isSyncing}
                className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-sans font-bold py-2 px-3 rounded-lg transition flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50"
              >
                {isSyncing ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                <span>مزامنة وربط رمز الجهاز الجديد</span>
              </button>

              <button
                onClick={handleRequestPermission}
                className="bg-slate-800 hover:bg-slate-700 text-white font-sans font-bold py-2 px-3 rounded-lg transition flex items-center justify-center gap-1.5 border border-slate-700"
              >
                <CheckCircle2 size={14} className="text-emerald-400" />
                <span>إذن النظام</span>
              </button>

              <button
                onClick={handleTestPush}
                disabled={isTestingPush}
                className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-sans font-bold py-2 px-3 rounded-lg transition flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-md"
              >
                {isTestingPush ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                <span>إرسال فحص (Priority 10)</span>
              </button>
            </div>
          </div>

          {/* Environment & Hardware Metrics */}
          <div className="bg-slate-900/90 rounded-xl p-4 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-slate-300 font-sans font-bold text-sm">
              <span className="flex items-center gap-1.5"><Smartphone size={15} className="text-purple-400" /> Platform & Runtime</span>
              <span className="text-slate-400 text-[11px]">{isNativePlatform() ? 'Native Android (Capacitor/APK)' : 'Web / PWA'}</span>
            </div>
            <p className="text-[10px] text-slate-400 break-all bg-slate-950 p-2.5 rounded border border-slate-800/80">
              {typeof navigator !== 'undefined' ? navigator.userAgent : ''}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/40 text-center text-slate-500 text-[11px]">
          Strict Principle 5: Diagnostic endpoints and tokens are completely hidden from regular users.
        </div>
      </div>
    </div>
  );
}
