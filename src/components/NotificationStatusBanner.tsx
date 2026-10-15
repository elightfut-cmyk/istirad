import { useState, useEffect } from 'react';
import { Bell, ShieldAlert, X, Sliders } from 'lucide-react';
import { isNativePlatform, isXiaomiDevice } from '../lib/onesignal';
import NotificationDiagnosticsModal from './NotificationDiagnosticsModal';

export default function NotificationStatusBanner() {
  const [showModal, setShowModal] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const isNative = isNativePlatform();
  const isXiaomi = isXiaomiDevice();

  useEffect(() => {
    const dismissed = localStorage.getItem('dismissed_notification_banner_v1');
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('dismissed_notification_banner_v1', 'true');
  };

  // Only display inside the native mobile app, never on the website
  if (!isNative || isDismissed) return null;

  return (
    <>
      <div className="mb-6 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-blue-500/10 dark:from-indigo-950/40 dark:via-purple-950/30 dark:to-blue-950/40 border border-indigo-200/80 dark:border-indigo-800/60 rounded-2xl p-4 text-right font-['Tajawal'] relative transition-all shadow-sm">
        <div className="flex items-start justify-between gap-3">
          
          <div className="flex items-start gap-3 flex-1">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md">
              <Bell size={20} className="animate-bounce" />
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-black text-sm text-gray-900 dark:text-white">
                  تنبيهات وتحديثات الطلبات الفورية
                </span>
                {isXiaomi && (
                  <span className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                    <ShieldAlert size={12} />
                    جهاز شاومي / ريدمي
                  </span>
                )}
                {isNative && (
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                    تطبيق الأندرويد
                  </span>
                )}
              </div>

              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed mb-3">
                {isXiaomi 
                  ? 'لضمان وصول إشعارات العروض وتحديثات الشحن فوراً على هاتفك دون توقف في الخلفية، يرجى ضبط أذونات شاومي.'
                  : 'تأكد من ضبط إعدادات الإشعارات وتجربة إرسال إشعار فوري للتأكد من ربط هاتفك بالنظام.'
                }
              </p>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowModal(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5 active:scale-95"
                >
                  <Sliders size={14} />
                  <span>فحص الإشعارات وتجربتها الآن</span>
                </button>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition"
            title="إخفاء التنبيه"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <NotificationDiagnosticsModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </>
  );
}
