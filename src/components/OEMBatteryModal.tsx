import { BatteryCharging, Zap, ShieldCheck, X, Settings } from 'lucide-react';
import toast from 'react-hot-toast';

interface OEMBatteryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function OEMBatteryModal({ isOpen, onClose }: OEMBatteryModalProps) {
  if (!isOpen) return null;

  const handleOpenBatteryOptimization = () => {
    if (typeof window !== 'undefined' && window.NativeBridge?.requestIgnoreBatteryOptimizations) {
      window.NativeBridge.requestIgnoreBatteryOptimizations();
      toast.success('تم فتح شاشة تحسين البطارية - اختر "بدون قيود" لضمان وصول التنبيهات دائماً ⚡');
    } else if (typeof window !== 'undefined' && window.NativeDeviceBridge?.requestIgnoreBatteryOptimizations) {
      window.NativeDeviceBridge.requestIgnoreBatteryOptimizations();
      toast.success('تم فتح شاشة تحسين البطارية');
    } else {
      toast('يرجى الدخول إلى ضبط هاتفك ⬅️ التطبيقات ⬅️ جيبها ⬅️ البطارية ⬅️ اختر (غير مقيّد / Unrestricted)', {
        duration: 6000,
        icon: '⚡'
      });
    }
  };

  const handleOpenAutoStart = () => {
    if (typeof window !== 'undefined' && window.NativeBridge?.openAutoStartSettings) {
      window.NativeBridge.openAutoStartSettings();
      toast.success('تم فتح إعدادات التشغيل التلقائي');
    } else if (typeof window !== 'undefined' && window.NativeDeviceBridge?.openAutoStartSettings) {
      window.NativeDeviceBridge.openAutoStartSettings();
      toast.success('تم فتح إعدادات التشغيل التلقائي');
    } else {
      toast('لمستخدمي شاومي وهواوي وأوبو: فعّل خيار (التشغيل التلقائي / AutoStart) لضمان وصول التنبيهات والطلبات فورياً', {
        duration: 6000,
        icon: '📱'
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-indigo-100 dark:border-gray-700 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <button 
          onClick={onClose}
          className="absolute top-4 left-4 p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-[#4f46e5] text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <BatteryCharging size={26} />
          </div>
          <div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white">ضمان استلام التنبيهات والطلبات فورياً</h3>
            <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold">إعدادات البطارية للأجهزة الذكية (شاومي، سامسونج، هواوي، أوبو)</p>
          </div>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
          تقوم بعض أنظمة أندرويد (مثل HyperOS / MIUI و ColorOS) بإيقاف عمل التطبيقات بالخلفية لتوفير البطارية، مما قد يؤخر رنين تنبيهات الطلبات الجديدة عند قفل الشاشة.
        </p>

        <div className="space-y-3 mb-6">
          <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 rounded-2xl p-4 flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 font-bold text-gray-900 dark:text-white text-sm mb-1">
                <Zap size={16} className="text-indigo-600 dark:text-indigo-400" />
                <span>1. إيقاف قيود البطارية (بدون قيود)</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                يسمح للتطبيق بإيقاظ الهاتف ورنين التنبيه بمجرد وصول طلب أو تحديث لحسابك.
              </p>
            </div>
            <button
              onClick={handleOpenBatteryOptimization}
              className="bg-white dark:bg-gray-800 hover:bg-[#4f46e5] hover:text-white text-[#4f46e5] dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700 px-3 py-1.5 rounded-xl text-xs font-black transition whitespace-nowrap shadow-xs"
            >
              ضبط البطارية
            </button>
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/80 rounded-2xl p-4 flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 font-bold text-gray-900 dark:text-white text-sm mb-1">
                <Settings size={16} className="text-amber-600 dark:text-amber-400" />
                <span>2. تفعيل التشغيل التلقائي (AutoStart)</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                ضروري جداً لهواتف Xiaomi و Redmi و Huawei للعمل بعد إغلاق التطبيق.
              </p>
            </div>
            <button
              onClick={handleOpenAutoStart}
              className="bg-white dark:bg-gray-800 hover:bg-amber-600 hover:text-white text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700 px-3 py-1.5 rounded-xl text-xs font-black transition whitespace-nowrap shadow-xs"
            >
              التشغيل التلقائي
            </button>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-gradient-to-r from-indigo-600 to-[#4f46e5] text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-indigo-600/20 hover:opacity-95 transition text-sm flex items-center justify-center gap-2"
          >
            <ShieldCheck size={18} />
            تم، تطبيق الإعدادات
          </button>
        </div>
      </div>
    </div>
  );
}
