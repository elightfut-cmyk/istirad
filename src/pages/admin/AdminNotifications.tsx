import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Users, 
  Send, 
  MessageSquare, 
  Ticket, 
  Bell, 
  Eye, 
  Edit3, 
  Trash2, 
  Plus, 
  RefreshCw, 
  Check, 
  X, 
  AlertTriangle, 
  AlertOctagon, 
  CheckCircle2, 
  FileText, 
  HelpCircle, 
  Lightbulb,
  ExternalLink,
  ShieldAlert,
  Share2,
  Video } from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { supabase } from '../../lib/supabase';
import { dashboardAlertService, DashboardAlert } from '../../services/dashboardAlertService';
import DashboardAlertModal from '../../components/DashboardAlertModal';
import SocialLinksAdminTab from '../../components/admin/SocialLinksAdminTab';
import PollAdminTab from '../../components/admin/PollAdminTab';
import toast from 'react-hot-toast';
import { sendPushNotification, getOneSignalRestApiKey, saveOneSignalRestApiKey } from '../../services/pushNotificationService';
import { sendNotification } from '../../store/useNotificationStore';
import { Key, ShieldCheck, EyeOff, CheckCircle } from 'lucide-react';
import { Smartphone } from 'lucide-react';
import { Vote } from 'lucide-react';
import NotificationDiagnosticsModal from '../../components/NotificationDiagnosticsModal';
import { Download } from 'lucide-react';
import AppUpdateAdminTab from '../../components/admin/AppUpdateAdminTab';
import TenderAppPromptAdminTab from '../../components/admin/TenderAppPromptAdminTab';
import AppUsersTrackerTab from '../../components/admin/AppUsersTrackerTab';
import { useAuthStore } from '../../store/useAuthStore';

export default function AdminNotifications() {
  const { user } = useAuthStore();
  const isAuthorized = user?.email?.trim().toLowerCase() === 'madaniameur26@gmail.com';
  const [activeTab, setActiveTab] = useState<'popup' | 'socialLinks' | 'poll' | 'telegram' | 'push' | 'appUpdate' | 'tenderAppModal' | 'appUsers'>('popup');

  // Push Broadcast States
  const [pushTitle, setPushTitle] = useState('');
  const [pushMessage, setPushMessage] = useState('');
  const [pushTarget, setPushTarget] = useState<'all' | 'merchant' | 'supplier'>('all');
  const [pushType, setPushType] = useState<'info' | 'success' | 'warning' | 'error'>('info');
  const [sendingPush, setSendingPush] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  // OneSignal REST API Key States
  const [oneSignalKeyInput, setOneSignalKeyInput] = useState('');
  const [showKeyText, setShowKeyText] = useState(false);
  const [savingKey, setSavingKey] = useState(false);
  const [testingMyDevice, setTestingMyDevice] = useState(false);

  // Popup Alert States
  const [currentAlert, setCurrentAlert] = useState<DashboardAlert | null>(null);
  const [loadingAlert, setLoadingAlert] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [savingAlert, setSavingAlert] = useState(false);
  const [togglingActive, setTogglingActive] = useState(false);
  const [previewAlert, setPreviewAlert] = useState<DashboardAlert | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    targetRole: 'all' as 'all' | 'merchant' | 'supplier',
    alertType: 'info' as 'info' | 'warning' | 'urgent' | 'success',
    buttonText: '',
    buttonUrl: '',
    isActive: true,
    resetSeenForEveryone: true,
  });

  // Telegram States
  const [telegramMessage, setTelegramMessage] = useState('');
  const [telegramTargetAudience, setTelegramTargetAudience] = useState<'all' | 'merchant' | 'supplier'>('all');
  const [sendingTelegram, setSendingTelegram] = useState(false);
  const [telegramSendResult, setTelegramSendResult] = useState<{ success: number; failed: number } | null>(null);

  useEffect(() => {
    fetchAlert();
  }, []);

  useEffect(() => {
    if (activeTab === 'push') {
      getOneSignalRestApiKey().then(k => {
        if (k) setOneSignalKeyInput(k);
      });
    }
  }, [activeTab]);

  const handleSaveOneSignalKey = async () => {
    const trimmed = oneSignalKeyInput.trim();
    if (!trimmed) {
      toast.error('يرجى إدخال مفتاح REST API');
      return;
    }
    setSavingKey(true);
    try {
      await saveOneSignalRestApiKey(trimmed);
      toast.success('تم حفظ المفتاح بنجاح وسيتم اعتماده أوتوماتيكياً في جميع التنبيهات!');
    } catch {
      toast.error('حدث خطأ أثناء الحفظ');
    } finally {
      setSavingKey(false);
    }
  };

  const handleTestMyDevicePush = async () => {
    if (!user?.id) {
      toast.error('لم يتم العثور على حساب المسؤول الحالي');
      return;
    }
    setTestingMyDevice(true);
    try {
      const res = await sendNotification(
        user.id,
        '🔔 تجربة إشعار الهاتف',
        `تنبيه تجريبي: تم إيقاظ هاتفك في الخلفية بنجاح في تمام الساعة ${new Date().toLocaleTimeString('ar-DZ')}`,
        'info'
      );
      if (res && res.pushSent) {
        toast.success('تم إرسال إشعار الهاتف بنجاح! تحقق من هاتفك الآن.');
      } else if (res && res.pushError) {
        toast.error(`فشل إرسال إشعار الهاتف: ${res.pushError}`);
      } else {
        toast.success('تم إرسال الإشعار بنجاح');
      }
    } catch (err: any) {
      toast.error('خطأ: ' + err.message);
    } finally {
      setTestingMyDevice(false);
    }
  };

  const fetchAlert = async () => {
    setLoadingAlert(true);
    try {
      const alert = await dashboardAlertService.getAlert();
      setCurrentAlert(alert);
      if (alert) {
        setFormData({
          title: alert.title || '',
          message: alert.message || '',
          targetRole: alert.targetRole || 'all',
          alertType: alert.alertType || 'info',
          buttonText: alert.buttonText || '',
          buttonUrl: alert.buttonUrl || '',
          isActive: alert.isActive ?? true,
          resetSeenForEveryone: false,
        });
      }
    } catch (err) {
      console.error('Error fetching alert:', err);
    } finally {
      setLoadingAlert(false);
    }
  };

  const handleStartEdit = () => {
    if (currentAlert) {
      setFormData({
        title: currentAlert.title || '',
        message: currentAlert.message || '',
        targetRole: currentAlert.targetRole || 'all',
        alertType: currentAlert.alertType || 'info',
        buttonText: currentAlert.buttonText || '',
        buttonUrl: currentAlert.buttonUrl || '',
        isActive: currentAlert.isActive ?? true,
        resetSeenForEveryone: false,
      });
    } else {
      setFormData({
        title: '',
        message: '',
        targetRole: 'all',
        alertType: 'info',
        buttonText: '',
        buttonUrl: '',
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
    if (!formData.message.trim()) {
      toast.error('يرجى كتابة نص التنبيه');
      return;
    }

    setSavingAlert(true);
    try {
      const alertPayload: Partial<DashboardAlert> = {
        title: formData.title.trim(),
        message: formData.message.trim(),
        targetRole: formData.targetRole,
        alertType: formData.alertType,
        buttonText: formData.buttonText.trim() || undefined,
        buttonUrl: formData.buttonUrl.trim() || undefined,
        isActive: formData.isActive,
      };

      // If user chose to reset seen status or creating new
      if (formData.resetSeenForEveryone || !currentAlert) {
        alertPayload.id = `alert_${Date.now()}`;
      }

      const res = await dashboardAlertService.saveAlert(alertPayload);
      if (res.success && res.data) {
        setCurrentAlert(res.data);
        setIsEditing(false);
        toast.success(currentAlert ? 'تم تحديث نافذة التنبيه بنجاح' : 'تم إنشاء نافذة التنبيه بنجاح');
      } else {
        toast.error('حدث خطأ أثناء حفظ نافذة التنبيه');
      }
    } catch (err) {
      console.error('Error saving alert:', err);
      toast.error('حدث خطأ أثناء الحفظ');
    } finally {
      setSavingAlert(false);
    }
  };

  const handleToggleActive = async () => {
    if (!currentAlert) return;
    setTogglingActive(true);
    try {
      const newStatus = !currentAlert.isActive;
      const res = await dashboardAlertService.toggleActive(newStatus);
      if (res.success && res.data) {
        setCurrentAlert(res.data);
        toast.success(newStatus ? 'تم تفعيل نافذة التنبيه بنجاح' : 'تم تعطيل نافذة التنبيه');
      } else {
        toast.error('فشل تغيير حالة التنبيه');
      }
    } catch (err) {
      console.error('Error toggling alert status:', err);
      toast.error('حدث خطأ');
    } finally {
      setTogglingActive(false);
    }
  };

  const handleDeleteAlert = async () => {
    if (!window.confirm('هل أنت متأكد من حذف نافذة التنبيه نهائياً؟ لن تظهر مجدداً لأي مستخدم.')) {
      return;
    }

    try {
      const res = await dashboardAlertService.deleteAlert();
      if (res.success) {
        setCurrentAlert(null);
        setIsEditing(false);
        setFormData({
          title: '',
          message: '',
          targetRole: 'all',
          alertType: 'info',
          buttonText: '',
          buttonUrl: '',
          isActive: true,
          resetSeenForEveryone: true,
        });
        toast.success('تم حذف نافذة التنبيه بنجاح');
      } else {
        toast.error('حدث خطأ أثناء الحذف');
      }
    } catch (err) {
      console.error('Error deleting alert:', err);
      toast.error('حدث خطأ أثناء الحذف');
    }
  };

  const handleResetForEveryone = async () => {
    if (!currentAlert) return;
    if (!window.confirm('هل أنت متأكد من إعادة إظهار التنبيه لجميع المستخدمين؟ سيظهر التنبيه مرة واحدة لجميع التجار والموردين حتى لو كانوا قد ضغطوا "فهمت" سابقاً.')) {
      return;
    }

    try {
      const res = await dashboardAlertService.resetAlertForEveryone();
      if (res.success && res.data) {
        setCurrentAlert(res.data);
        toast.success('تم تحديث التنبيه بنجاح وسيظهر الآن للجميع مرة أخرى');
      } else {
        toast.error('حدث خطأ أثناء العملية');
      }
    } catch (err) {
      console.error('Error resetting alert seen state:', err);
      toast.error('حدث خطأ');
    }
  };

  const handleOpenLivePreview = () => {
    const alertToPreview: DashboardAlert = isEditing ? {
      id: 'preview',
      title: formData.title || 'عنوان التنبيه التجريبي',
      message: formData.message || 'هنا يظهر نص الرسالة والتنبيه الذي سيتلقاه المستخدم فور دخوله للوحة التحكم.',
      targetRole: formData.targetRole,
      alertType: formData.alertType,
      buttonText: formData.buttonText || undefined,
      buttonUrl: formData.buttonUrl || undefined,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } : (currentAlert || {
      id: 'preview',
      title: 'معاينة التنبيه',
      message: 'لا يوجد تنبيه محفوظ حالياً.',
      targetRole: 'all',
      alertType: 'info',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    setPreviewAlert(alertToPreview);
  };

  // Telegram Send Handler

  const handleSendBroadcastPush = async () => {
    if (!pushTitle.trim() || !pushMessage.trim()) {
      toast.error('يرجى كتابة العنوان ونص الإشعار');
      return;
    }
    setSendingPush(true);
    try {
      let query = supabase.from('users').select('id');
      if (pushTarget === 'merchant') query = query.eq('role', 'merchant');
      else if (pushTarget === 'supplier') query = query.eq('role', 'supplier');
      const { data: users, error } = await query;
      if (error) throw error;
      if (users && users.length > 0) {
        const inserts = users.map((u: any) => ({
          user_id: u.id,
          title: pushTitle.trim(),
          message: pushMessage.trim(),
          type: pushType
        }));
        await supabase.from('notifications').insert(inserts);
        const userIds = users.map((u: any) => String(u.id));
        await sendPushNotification({
          userIds,
          title: pushTitle.trim(),
          message: pushMessage.trim(),
          data: { type: pushType, url: '/notifications' },
          sendToAll: pushTarget === 'all',
          targetRole: pushTarget !== 'all' ? pushTarget : undefined,
          skipDbInsert: true
        });
        toast.success(`تم إرسال الإشعار بنجاح إلى ${users.length} مستخدم (جرس + هاتف)!`);
        setPushTitle('');
        setPushMessage('');
      } else {
        toast.error('لم يتم العثور على مستخدمين في هذه الفئة');
      }
    } catch (err: any) {
      console.error('Error sending broadcast push:', err);
      toast.error('حدث خطأ أثناء إرسال الإشعار: ' + (err.message || ''));
    } finally {
      setSendingPush(false);
    }
  };

  const handleSendTelegram = async () => {
    if (!telegramMessage.trim()) {
      toast.error('الرجاء كتابة رسالة أولاً.');
      return;
    }

    if (!window.confirm('هل أنت متأكد من إرسال هذه الرسالة عبر تلغرام؟')) return;

    setSendingTelegram(true);
    setTelegramSendResult(null);

    try {
      let query = supabase
        .from('users')
        .select('telegram_chat_id, name')
        .not('telegram_chat_id', 'is', null)
        .neq('telegram_chat_id', '');

      if (telegramTargetAudience !== 'all') {
        query = query.eq('role', telegramTargetAudience);
      }

      const { data: users, error } = await query;
      if (error) throw error;

      if (!users || users.length === 0) {
        toast('لا يوجد مستخدمين لديهم معرف تلغرام (Chat ID) في هذه الفئة.', { icon: 'ℹ️' });
        setSendingTelegram(false);
        return;
      }

      let successCount = 0;
      let failCount = 0;

      const botToken = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
      if (!botToken) {
        toast.error('مفتاح بوت التلغرام غير موجود في ملف .env');
        setSendingTelegram(false);
        return;
      }

      for (const user of users) {
        try {
          const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: user.telegram_chat_id,
              text: telegramMessage,
              parse_mode: 'HTML'
            })
          });

          if (res.ok) {
            successCount++;
          } else {
            console.error('Failed to send to', user.name, await res.text());
            failCount++;
          }
        } catch (e) {
          console.error('Error sending to', user.name, e);
          failCount++;
        }
      }

      setTelegramSendResult({ success: successCount, failed: failCount });
      if (successCount > 0) setTelegramMessage('');
      toast.success(`تم الانتهاء من الإرسال: ${successCount} ناجح`);
    } catch (error) {
      console.error('Error in broadcasting:', error);
      toast.error('حدث خطأ أثناء جلب المستخدمين.');
    } finally {
      setSendingTelegram(false);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'merchant': return 'التجار فقط';
      case 'supplier': return 'الموردون فقط';
      case 'all': default: return 'الجميع (التجار والموردين)';
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'warning':
        return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"><AlertTriangle size={14} /> تحذيري</span>;
      case 'urgent':
        return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"><AlertOctagon size={14} /> عاجل</span>;
      case 'success':
        return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"><CheckCircle2 size={14} /> إيجابي</span>;
      case 'info':
      default:
        return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 dark:bg-indigo-950/60 text-[#4f46e5] dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"><Bell size={14} /> إرشادي</span>;
    }
  };

  return (
    <DashboardLayout
      title="مركز التنبيهات والإشعارات"
      sidebarLinks={[
        { label: 'الرئيسية', href: '/admin', icon: <LayoutDashboard size={20} /> },
        { label: 'المستخدمين', href: '/admin/users', icon: <Users size={20} /> },
        { label: 'الطلبات والمناقصات', href: '/admin/orders', icon: <ShoppingBag size={20} /> },
        { label: 'الكوبونات', href: '/admin/coupons', icon: <Ticket size={20} /> },
        { label: 'التنبيهات والإشعارات', href: '/admin/notifications', icon: <MessageSquare size={20} /> },
        { label: 'الصفحات', href: '/admin/pages', icon: <FileText size={20} /> },
        { label: 'الأسئلة الشائعة', href: '/admin/faqs', icon: <HelpCircle size={20} /> },
        { label: 'الشكاوى', href: '/admin/complaints', icon: <AlertTriangle size={20} /> },
        { label: 'الاقتراحات', href: '/admin/suggestions', icon: <Lightbulb size={20} /> },
        { label: 'فيديو الرئيسية', href: '/admin/main-video', icon: <Video size={20} /> },
      ]}
    >
      {/* Live Preview Modal Overlay */}
      {previewAlert && (
        <DashboardAlertModal 
          previewAlert={previewAlert} 
          onClosePreview={() => setPreviewAlert(null)} 
        />
      )}

      {/* Main Tabs Header (Scrollable on Mobile) */}
      <div className="relative mb-8">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth p-2 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/60 touch-pan-x">
          <button
            onClick={() => setActiveTab('popup')}
            className={`py-2.5 sm:py-3 px-3.5 sm:px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all whitespace-nowrap shrink-0 active:scale-95 ${
              activeTab === 'popup'
                ? 'bg-[#4f46e5] text-white shadow-md shadow-indigo-500/25'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60 bg-gray-50/80 dark:bg-gray-750'
            }`}
          >
            <Bell size={17} className="shrink-0" />
            <span>نافذة التنبيه (Popup Alert)</span>
            {currentAlert?.isActive && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping mr-0.5 shrink-0"></span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('socialLinks')}
            className={`py-2.5 sm:py-3 px-3.5 sm:px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all whitespace-nowrap shrink-0 active:scale-95 ${
              activeTab === 'socialLinks'
                ? 'bg-[#4f46e5] text-white shadow-md shadow-indigo-500/25'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60 bg-gray-50/80 dark:bg-gray-750'
            }`}
          >
            <Share2 size={17} className="shrink-0" />
            <span>نافذة الاشتراك (تواصل)</span>
          </button>

          <button
            onClick={() => setActiveTab('poll')}
            className={`py-2.5 sm:py-3 px-3.5 sm:px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all whitespace-nowrap shrink-0 active:scale-95 ${
              activeTab === 'poll'
                ? 'bg-[#4f46e5] text-white shadow-md shadow-indigo-500/25'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60 bg-gray-50/80 dark:bg-gray-750'
            }`}
          >
            <Vote size={17} className="shrink-0" />
            <span>سبر الآراء (Polls)</span>
          </button>

          <button
            onClick={() => setActiveTab('telegram')}
            className={`py-2.5 sm:py-3 px-3.5 sm:px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all whitespace-nowrap shrink-0 active:scale-95 ${
              activeTab === 'telegram'
                ? 'bg-[#4f46e5] text-white shadow-md shadow-indigo-500/25'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60 bg-gray-50/80 dark:bg-gray-750'
            }`}
          >
            <Send size={17} className="shrink-0" />
            <span>إشعارات تلغرام</span>
          </button>

          <button
            onClick={() => setActiveTab('appUpdate')}
            className={`py-2.5 sm:py-3 px-3.5 sm:px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all whitespace-nowrap shrink-0 active:scale-95 ${
              activeTab === 'appUpdate'
                ? 'bg-[#4f46e5] text-white shadow-md shadow-indigo-500/25'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60 bg-gray-50/80 dark:bg-gray-750'
            }`}
          >
            <Download size={17} className="shrink-0" />
            <span>تحديث التطبيق (إجباري)</span>
          </button>

            <button
            onClick={() => setActiveTab('tenderAppModal')}
            className={`py-2.5 sm:py-3 px-3.5 sm:px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all whitespace-nowrap shrink-0 active:scale-95 ${
              activeTab === 'tenderAppModal'
                ? 'bg-[#4f46e5] text-white shadow-md shadow-indigo-500/25'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60 bg-gray-50/80 dark:bg-gray-750'
            }`}
          >
            <Smartphone size={17} className="shrink-0" />
            <span>تنبيه مناقصات (تطبيق)</span>
          </button>

          <button
            onClick={() => setActiveTab('push')}
            className={`py-2.5 sm:py-3 px-3.5 sm:px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all whitespace-nowrap shrink-0 active:scale-95 ${
              activeTab === 'push'
                ? 'bg-[#4f46e5] text-white shadow-md shadow-indigo-500/25'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60 bg-gray-50/80 dark:bg-gray-750'
            }`}
          >
            <Smartphone size={17} className="shrink-0" />
            <span>إشعار فوري للجوال (Push)</span>
          </button>

          <button
            onClick={() => setActiveTab('appUsers')}
            className={`py-2.5 sm:py-3 px-3.5 sm:px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all whitespace-nowrap shrink-0 active:scale-95 ${
              activeTab === 'appUsers'
                ? 'bg-[#4f46e5] text-white shadow-md shadow-indigo-500/25'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60 bg-gray-50/80 dark:bg-gray-750'
            }`}
          >
            <Users size={17} className="shrink-0" />
            <span>مستخدمو التطبيق والإصدارات</span>
          </button>
        </div>
      </div>

      {/* TAB 1: POPUP MODAL ALERT */}
      {activeTab === 'popup' && (
        <div className="space-y-6">
          {/* Explanation Banner */}
          <div className="bg-gradient-to-l from-indigo-500/10 via-purple-500/5 to-transparent border border-indigo-100 dark:border-indigo-900/50 p-5 rounded-2xl flex items-start gap-4">
            <div className="p-3 bg-[#4f46e5] text-white rounded-xl shadow-sm">
              <ShieldAlert size={24} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-base">
                نظام التنبيهات المنبثقة للوحة التحكم
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
                تتيح لك هذه الميزة إظهار نافذة منبثقة مميزة وفورية للموردين والتجار فور دخولهم إلى لوحة التحكم الخاصة بهم. تظهر النافذة <strong>مرة واحدة فقط</strong> لكل مستخدم عند دخوله لتنبيهه بأي مستجدات هامة دون إزعاجه، مع إمكانية التعديل، والتعطيل، والتفعيل، والحذف في أي وقت.
              </p>
            </div>
          </div>

          {loadingAlert ? (
            <div className="bg-white dark:bg-gray-800 p-12 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 text-center text-gray-500">
              <div className="w-8 h-8 border-4 border-[#4f46e5] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              جاري تحميل إعدادات التنبيه...
            </div>
          ) : !isEditing ? (
            /* Current Alert Summary Card */
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-[#4f46e5] dark:text-indigo-400 rounded-xl">
                    <Bell size={24} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                      حالة نافذة التنبيه الحالية
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {currentAlert ? `آخر تحديث: ${new Date(currentAlert.updatedAt).toLocaleString('ar-DZ')}` : 'لا توجد نافذة منشأة حالياً'}
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
                          ? 'bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-800 hover:bg-green-200'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                      }`}
                      title={currentAlert.isActive ? 'انقر للتعطيل' : 'انقر للتفعيل'}
                    >
                      <span className={`w-2 h-2 rounded-full ${currentAlert.isActive ? 'bg-green-600 animate-pulse' : 'bg-gray-400'}`}></span>
                      {currentAlert.isActive ? 'النافذة مفعلة' : 'النافذة معطلة'}
                    </button>
                  )}

                  <button
                    onClick={handleStartEdit}
                    className="flex items-center gap-2 px-4 py-2 bg-[#4f46e5] text-white rounded-xl text-sm font-bold hover:bg-[#4338ca] transition shadow-sm"
                  >
                    {currentAlert ? <Edit3 size={16} /> : <Plus size={16} />}
                    <span>{currentAlert ? 'تعديل التنبيه' : 'إنشاء نافذة تنبيه جديدة'}</span>
                  </button>
                </div>
              </div>

              {currentAlert ? (
                <div className="p-6 space-y-6">
                  {/* Alert Meta Badges */}
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-bold">النوع:</span>
                    {getTypeBadge(currentAlert.alertType)}

                    <span className="mx-1 text-gray-300">|</span>

                    <span className="text-xs text-gray-500 dark:text-gray-400 font-bold">الفئة المستهدفة:</span>
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      <Users size={14} />
                      {getRoleLabel(currentAlert.targetRole)}
                    </span>
                  </div>

                  {/* Title and Message */}
                  <div className="p-5 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-700/80">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                      {currentAlert.title}
                    </h3>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                      {currentAlert.message}
                    </p>

                    {currentAlert.buttonText && currentAlert.buttonUrl && (
                      <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700/70 flex items-center gap-2">
                        <span className="text-xs text-gray-500 font-medium">زر الإجراء:</span>
                        <a 
                          href={currentAlert.buttonUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-gray-800 text-[#4f46e5] border border-gray-200 dark:border-gray-700 shadow-xs hover:underline"
                        >
                          <span>{currentAlert.buttonText}</span>
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Action Bar */}
                  <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleOpenLivePreview}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-xl text-sm font-bold transition"
                      >
                        <Eye size={16} />
                        <span>معاينة حية كما تظهر للمستخدم</span>
                      </button>

                      <button
                        onClick={handleResetForEveryone}
                        className="flex items-center gap-2 px-4 py-2.5 bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-xl text-sm font-bold transition border border-purple-200 dark:border-purple-800"
                        title="إعادة إظهار التنبيه لجميع المستخدمين الذين شاهدوه مسبقاً"
                      >
                        <RefreshCw size={16} />
                        <span>إعادة التنبيه للجميع (تصفير المشاهدات)</span>
                      </button>
                    </div>

                    <button
                      onClick={handleDeleteAlert}
                      className="flex items-center gap-2 px-4 py-2.5 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-xl text-sm font-bold transition border border-red-200 dark:border-red-800"
                    >
                      <Trash2 size={16} />
                      <span>حذف التنبيه</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Empty State */
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Bell size={28} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-1">
                    لا توجد نافذة تنبيه حالياً
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
                    يمكنك إنشاء نافذة منبثقة لتنبيه الموردين والتجار فور دخولهم إلى لوحة التحكم حول أحدث العروض، القوانين، أو الإعلانات الهامة.
                  </p>
                  <button
                    onClick={handleStartEdit}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#4f46e5] text-white rounded-xl font-bold shadow-md hover:bg-[#4338ca] transition"
                  >
                    <Plus size={18} />
                    <span>إنشاء نافذة تنبيه جديدة الآن</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Alert Form (Create / Edit) */
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-700 mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Edit3 className="text-[#4f46e5]" />
                  <span>{currentAlert ? 'تعديل نافذة التنبيه' : 'إنشاء نافذة تنبيه جديدة'}</span>
                </h3>
                <button
                  onClick={() => setIsEditing(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                {/* Title */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">
                    عنوان التنبيه <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="مثال: تنبيه هام بخصوص مواعيد الشحن وعطلة الأعياد"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-[#4f46e5] focus:border-[#4f46e5] bg-gray-50 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 font-medium text-gray-900 dark:text-white"
                  />
                </div>

                {/* Target Audience & Alert Type Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Target Audience */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">
                      الفئة المستهدفة <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'all', label: 'الجميع' },
                        { id: 'merchant', label: 'التجار فقط' },
                        { id: 'supplier', label: 'الموردون فقط' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setFormData({ ...formData, targetRole: item.id as any })}
                          className={`p-3 rounded-xl border text-xs sm:text-sm font-bold transition text-center ${
                            formData.targetRole === item.id
                              ? 'border-[#4f46e5] bg-indigo-50 dark:bg-indigo-950/60 text-[#4f46e5] dark:text-indigo-300 shadow-xs'
                              : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Alert Type */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">
                      نوع ومظهر التنبيه <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { id: 'info', label: 'إرشادي', color: 'border-blue-500 text-blue-600 bg-blue-50' },
                        { id: 'warning', label: 'تحذيري', color: 'border-amber-500 text-amber-600 bg-amber-50' },
                        { id: 'urgent', label: 'عاجل', color: 'border-rose-500 text-rose-600 bg-rose-50' },
                        { id: 'success', label: 'إيجابي', color: 'border-emerald-500 text-emerald-600 bg-emerald-50' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setFormData({ ...formData, alertType: item.id as any })}
                          className={`p-2.5 rounded-xl border text-xs font-bold transition text-center ${
                            formData.alertType === item.id
                              ? `${item.color} dark:bg-opacity-20 shadow-xs ring-2 ring-offset-1 ring-current`
                              : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">
                    نص التنبيه والرسالة <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={5}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="اكتب هنا التنبيه الموجه للتجار والموردين بالتفصيل..."
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-[#4f46e5] focus:border-[#4f46e5] bg-gray-50 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 font-medium text-gray-900 dark:text-white resize-y"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    يدعم فواصل الأسطر والفقرات. ستظهر هذه الرسالة بشكل واضح وأنيق داخل النافذة المنبثقة.
                  </p>
                </div>

                {/* Optional Call to Action Button */}
                <div className="bg-gray-50 dark:bg-gray-900/60 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/80">
                  <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                    <ExternalLink size={16} className="text-[#4f46e5]" />
                    <span>زر توجيه اختياري داخل النافذة (Call to Action)</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">
                        نص الزر (مثال: الانتقال للشروط، تصفح المنتجات)
                      </label>
                      <input
                        type="text"
                        value={formData.buttonText}
                        onChange={(e) => setFormData({ ...formData, buttonText: e.target.value })}
                        placeholder="اتركه فارغاً إذا لم ترغب بزر"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">
                        رابط الزر (URL داخلي أو خارجي)
                      </label>
                      <input
                        type="text"
                        value={formData.buttonUrl}
                        onChange={(e) => setFormData({ ...formData, buttonUrl: e.target.value })}
                        placeholder="مثال: /merchant/marketplace أو https://..."
                        dir="ltr"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800"
                      />
                    </div>
                  </div>
                </div>

                {/* Options: Active & Reset Seen */}
                <div className="space-y-3 pt-2">
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-5 h-5 text-[#4f46e5] rounded focus:ring-[#4f46e5]"
                    />
                    <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
                      تفعيل النافذة فور الحفظ (تظهر للمستخدمين عند دخولهم)
                    </span>
                  </label>

                  {currentAlert && (
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={formData.resetSeenForEveryone}
                        onChange={(e) => setFormData({ ...formData, resetSeenForEveryone: e.target.checked })}
                        className="w-5 h-5 text-[#4f46e5] rounded focus:ring-[#4f46e5]"
                      />
                      <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                        إعادة إظهار التنبيه للمستخدمين الذين شاهدوا النسخة السابقة (تحديث معرف التنبيه)
                      </span>
                    </label>
                  )}
                </div>

                {/* Form Buttons */}
                <div className="pt-6 border-t border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={handleOpenLivePreview}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-xl text-sm font-bold transition"
                  >
                    <Eye size={16} />
                    <span>معاينة تجريبية فورية</span>
                  </button>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-6 py-2.5 rounded-xl font-bold text-sm text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 transition"
                    >
                      إلغاء
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveAlert}
                      disabled={savingAlert}
                      className="flex items-center gap-2 px-8 py-2.5 bg-[#4f46e5] hover:bg-[#4338ca] text-white rounded-xl text-sm font-bold transition shadow-sm disabled:opacity-50"
                    >
                      <Check size={18} />
                      <span>{savingAlert ? 'جاري الحفظ...' : 'حفظ التغييرات'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SOCIAL LINKS ALERT */}
      {activeTab === 'socialLinks' && (
        <SocialLinksAdminTab />
      )}

      {/* TAB 3: USER POLLS */}
      {activeTab === 'poll' && (
        <PollAdminTab />
      )}

      
      {/* TAB 5: BROADCAST PUSH NOTIFICATION */}
      {activeTab === 'push' && (
        <div className="space-y-6 max-w-4xl">
          {/* Card 1: OneSignal Key Management (Clean & Instant) */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-[#4f46e5] dark:text-indigo-400 rounded-xl">
                  <Key size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    خدمة إشعارات الهاتف (OneSignal REST API)
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">
                      <CheckCircle size={12} /> تعمل أوتوماتيكياً
                    </span>
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    يتم استخدامه أوتوماتيكياً لإيقاظ هواتف الأعضاء وإرسال التنبيهات بالصوت في الخلفية.
                  </p>
                </div>
              </div>

              {user?.id && (
                <button
                  type="button"
                  onClick={handleTestMyDevicePush}
                  disabled={testingMyDevice}
                  className="px-3 py-2 text-xs font-bold text-[#4f46e5] bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-xl flex items-center gap-1.5 transition border border-indigo-200 dark:border-indigo-800"
                >
                  <Smartphone size={14} />
                  <span>{testingMyDevice ? 'جاري الإرسال...' : 'إرسال إشعار تجريبي لهاتفي'}</span>
                </button>
              )}
            </div>

            <div className="mt-4 space-y-2">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                مفتاح REST API Key (تلقائي / مخصص):
              </label>
              <div className="flex flex-wrap sm:flex-nowrap gap-2">
                <div className="relative flex-1 min-w-[260px]">
                  <input
                    type={showKeyText ? 'text' : 'password'}
                    value={oneSignalKeyInput}
                    onChange={(e) => setOneSignalKeyInput(e.target.value)}
                    placeholder="مفتاح REST API الافتراضي مفعل تلقائياً..."
                    className="w-full px-4 py-2.5 pl-10 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-sm font-mono focus:ring-2 focus:ring-[#4f46e5] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKeyText(!showKeyText)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showKeyText ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleSaveOneSignalKey}
                  disabled={savingKey || !oneSignalKeyInput.trim()}
                  className="px-5 py-2.5 bg-[#4f46e5] hover:bg-indigo-700 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-50 shrink-0 w-full sm:w-auto"
                >
                  <ShieldCheck size={16} />
                  <span>{savingKey ? 'جاري الحفظ...' : 'حفظ المفتاح'}</span>
                </button>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                ⚡ المفتاح الافتراضي يعمل أوتوماتيكياً عبر الخادم السحابي دون أي فحص متصفح معلق. إذا قمت بتحديث المفتاح، فقط الصقه هنا واضغط حفظ ليتم اعتماده فورياً.
              </p>
            </div>
          </div>

          {/* Card 2: Broadcast Form */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-6 flex items-center gap-2">
              <Smartphone className="text-[#4f46e5]" />
              إرسال إشعار جماعي مباشر لهواتف المستخدمين (Push Notification)
            </h2>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">الفئة المستهدفة</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="pushTarget" 
                    value="all" 
                    checked={pushTarget === 'all'} 
                    onChange={() => setPushTarget('all')}
                    className="w-4 h-4 text-[#4f46e5] focus:ring-[#4f46e5]"
                  />
                  <span>جميع المستخدمين</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="pushTarget" 
                    value="merchant" 
                    checked={pushTarget === 'merchant'} 
                    onChange={() => setPushTarget('merchant')}
                    className="w-4 h-4 text-[#4f46e5] focus:ring-[#4f46e5]"
                  />
                  <span>التجار فقط</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="pushTarget" 
                    value="supplier" 
                    checked={pushTarget === 'supplier'} 
                    onChange={() => setPushTarget('supplier')}
                    className="w-4 h-4 text-[#4f46e5] focus:ring-[#4f46e5]"
                  />
                  <span>الموردون فقط</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">نوع الإشعار</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="pushType" 
                    value="info" 
                    checked={pushType === 'info'} 
                    onChange={() => setPushType('info')}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span>معلوماتي (أزرق)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="pushType" 
                    value="success" 
                    checked={pushType === 'success'} 
                    onChange={() => setPushType('success')}
                    className="w-4 h-4 text-green-600"
                  />
                  <span>نجاح (أخضر)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="pushType" 
                    value="warning" 
                    checked={pushType === 'warning'} 
                    onChange={() => setPushType('warning')}
                    className="w-4 h-4 text-yellow-600"
                  />
                  <span>تنبيه (أصفر)</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">عنوان الإشعار</label>
              <input
                type="text"
                value={pushTitle}
                onChange={(e) => setPushTitle(e.target.value)}
                placeholder="مثال: خصومات حصرية على الشحن..."
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-[#4f46e5] focus:border-[#4f46e5] bg-gray-50 dark:bg-gray-900 focus:bg-white dark:bg-gray-800"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">نص الإشعار</label>
              <textarea
                rows={4}
                value={pushMessage}
                onChange={(e) => setPushMessage(e.target.value)}
                placeholder="اكتب نص الإشعار الذي سيظهر على شاشة الهاتف وفي جرس التنبيهات..."
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-[#4f46e5] focus:border-[#4f46e5] resize-none bg-gray-50 dark:bg-gray-900 focus:bg-white dark:bg-gray-800"
              />
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={handleSendBroadcastPush}
                disabled={sendingPush || !pushTitle.trim() || !pushMessage.trim()}
                className="flex items-center gap-2 px-8 py-3 bg-[#4f46e5] text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {sendingPush ? 'جاري الإرسال لهواتف المستخدمين...' : (
                  <>
                    <Smartphone size={18} />
                    إرسال الإشعار الفوري (الهاتف + الجرس)
                  </>
                )}
              </button>

              {isAuthorized && (
                <button
                  type="button"
                  onClick={() => setShowDiagnostics(true)}
                  className="flex items-center gap-2 px-4 py-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-xl font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition border border-indigo-200 dark:border-indigo-800 text-sm"
                >
                  <Bell size={16} />
                  <span>فحص إشعارات الهاتف وحل المشاكل</span>
                </button>
              )}
            </div>
          </div>
        </div>
        </div>
      )}

      {/* TAB 4: TELEGRAM BROADCAST */}
      {activeTab === 'telegram' && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 max-w-3xl">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-6 flex items-center gap-2">
            <Send className="text-blue-500" />
            إرسال إشعار تسويقي عبر تلغرام
          </h2>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">الفئة المستهدفة</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="tgAudience" 
                    value="all" 
                    checked={telegramTargetAudience === 'all'} 
                    onChange={() => setTelegramTargetAudience('all')}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span>الجميع</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="tgAudience" 
                    value="merchant" 
                    checked={telegramTargetAudience === 'merchant'} 
                    onChange={() => setTelegramTargetAudience('merchant')}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span>التجار فقط</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="tgAudience" 
                    value="supplier" 
                    checked={telegramTargetAudience === 'supplier'} 
                    onChange={() => setTelegramTargetAudience('supplier')}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span>الموردون فقط</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">نص الرسالة</label>
              <textarea
                rows={6}
                value={telegramMessage}
                onChange={(e) => setTelegramMessage(e.target.value)}
                placeholder="اكتب رسالتك هنا..."
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-blue-500 focus:border-blue-500 resize-none bg-gray-50 dark:bg-gray-900 focus:bg-white dark:bg-gray-800"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                يمكنك استخدام تنسيق HTML البسيط مثل &lt;b&gt;نص عريض&lt;/b&gt; أو &lt;i&gt;نص مائل&lt;/i&gt;.
              </p>
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <button
                onClick={handleSendTelegram}
                disabled={sendingTelegram || !telegramMessage.trim()}
                className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {sendingTelegram ? 'جاري الإرسال...' : (
                  <>
                    <Send size={18} />
                    إرسال الآن
                  </>
                )}
              </button>

              {telegramSendResult && (
                <div className="text-sm font-medium">
                  <span className="text-green-600">✅ نجح: {telegramSendResult.success}</span>
                  <span className="mx-2 text-gray-300">|</span>
                  <span className="text-red-600">❌ فشل: {telegramSendResult.failed}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: APP FORCE UPDATE */}
      {activeTab === 'appUpdate' && <AppUpdateAdminTab />}

      {/* TAB 6: TENDER APP PROMPT */}
      {activeTab === 'tenderAppModal' && <TenderAppPromptAdminTab />}

      {/* TAB 7: APP USERS & VERSIONS TRACKER */}
      {activeTab === 'appUsers' && <AppUsersTrackerTab />}

      {/* Diagnostics Modal (Developer madaniameur26@gmail.com Only) */}
      {isAuthorized && (
        <NotificationDiagnosticsModal
          isOpen={showDiagnostics}
          onClose={() => setShowDiagnostics(false)}
        />
      )}
    </DashboardLayout>
  );
}
