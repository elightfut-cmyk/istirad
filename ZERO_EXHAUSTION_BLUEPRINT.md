# الدليل الهندسي الشامل للقضاء على استنزاف باقة Supabase والانتقال إلى بنية (Zero-Background Polling)
> **مشروع المصدر:** منصة جيبها (Jiibha / Istirad)  
> **مشروع الوجهة:** تطبيق طلبية مزار (Talbaiah Mazar)  
> **الهدف:** القضاء النهائي على استنزاف قاعدة البيانات المجانية، منع الانهيارات (Crashes & ANR)، وضمان وصول الإشعارات اللحظية وحل مشاكل جلسات الأدمن.

---

## 📋 ملخص المشكلة الجذرية (Root Cause Analysis)
1. **استنزاف الحصة (Quota Exhaustion):** كان التطبيق يستخدم خدمة أندرويد في الخلفية (`Foreground/Background Service`) تقوم بعمل استعلام متكرر (Polling) كل 6 إلى 10 ثوانٍ على جدول `notifications` أو جداول أخرى. جهاز واحد فقط كان يرسل أكثر من **14,400 طلب يومياً**، ومع بضعة أجهزة تُستنفد باقة Supabase المجانية بالكامل وتتوقف السيرفرات.
2. **اتصال Realtime المستمر في الخلفية:** قنوات الـ WebSocket تظل مفتوحة حتى عندما يغلق المستخدم شاشة الهاتف، مما يستهلك حد الاتصالات المتزامنة (Concurrent Connections).
3. **تكرار طلب النوافذ الثابتة مع كل تنقل:** في كل ضغطة شاشة أو انتقال بين الصفحات، كان التطبيق يعيد استعلام جداول الإعدادات والنوافذ الترويجية (`platform_policies` و `platform_settings`) مما يضاعف استهلاك الـ API بدون داعٍ.
4. **مشكلة "لا يمكن ذلك إلا للأدمن" عند الحذف:** انتهاء صلاحية توكن المصادقة (JWT) بعد ساعة واحدة في بيئة الموبايل يؤدي إلى أن تصبح `auth.uid()` فارغة (`NULL`) في دوال الـ RPC، فيرفض السيرفر عمليات الأدمن حتى يعيد تسجيل الدخول.

---

## 🛠️ خطوات التنفيذ المباشرة لمشروع Mazar

### الخطوة 1: استئصال خدمات الخلفية نهائياً من الأندرويد (Eradicate Background Services)
1. **حذف ملفات الجافا للخدمات السابقة:**
   - احذف أي ملف باسم `*BackgroundService.java` أو `NotificationPollingService.java` من المسار:
     `android/app/src/main/java/...`
2. **تنظيف ملف `android/app/src/main/AndroidManifest.xml`:**
   - احذف أي وسم `<service>` و `<receiver>` خاص بخدمات التنبيه السابقة أو بدء التشغيل التلقائي (`BOOT_COMPLETED`).
   - احذف أذونات `FOREGROUND_SERVICE` غير الضرورية و `WAKE_LOCK` إذا كانت مستخدمة للبقاء مستيقظاً للاستعلام.
   - احتفظ فقط بصلاحيات الإنترنت والإشعارات الرسمية:
     ```xml
     <uses-permission android:name="android.permission.INTERNET" />
     <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
     <uses-permission android:name="android.permission.VIBRATE" />
     <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
     ```

---

### الخطوة 2: تثبيت حزمة إدارة حالة التطبيق (`@capacitor/app`)
لتتبع دخول وخروج التطبيق من الخلفية:
```bash
npm install @capacitor/app
```

---

### الخطوة 3: إدارة اشتراك Supabase Realtime (إيقاف بالخلفية وتفعيل بالواجهة)
في ملف إدارة الإشعارات (مثل `src/store/useNotificationStore.ts`):
1. **أضف دالتي `pauseRealtime` و `resumeRealtime`:**
```typescript
let activeChannel: any = null;
let activeUserId: string | null = null;

export const useNotificationStore = create<NotificationState>((set, get) => ({
  // ... بقية الـ state

  subscribeToNotifications: (userId: string) => {
    if (!userId) return () => {};
    if (activeChannel && activeUserId === userId) return () => {};

    if (activeChannel) {
      try { supabase.removeChannel(activeChannel); } catch {}
      activeChannel = null;
    }

    activeUserId = userId;

    const channel = supabase
      .channel(`user-notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const newNotif = payload.new;
          if (!newNotif) return;
          // إضافة الإشعار للواجهة وتشغيل الصوت
          set((state) => ({
            notifications: [newNotif, ...state.notifications],
            unreadCount: state.unreadCount + 1
          }));
          window.dispatchEvent(new CustomEvent('refresh_data'));
        }
      )
      .subscribe();

    activeChannel = channel;
    return () => {
      try { supabase.removeChannel(channel); } catch {}
      if (activeChannel === channel) activeChannel = null;
    };
  },

  // إيقاف فوري للاتصال بمجرد خروج التطبيق للخلفية لحفظ باقة السيرفر
  pauseRealtime: () => {
    if (activeChannel) {
      try { supabase.removeChannel(activeChannel); } catch {}
      activeChannel = null;
      console.log('🔌 Supabase Realtime paused (Zero-Background Polling)');
    }
  },

  // إعادة الاتصال فقط عند عودة المستخدم لفتح التطبيق
  resumeRealtime: () => {
    if (activeUserId) {
      console.log('⚡ Supabase Realtime resumed for user:', activeUserId);
      get().fetchNotifications(activeUserId, true);
      get().subscribeToNotifications(activeUserId);
    }
  }
}));
```

2. **الربط مع دورة حياة التطبيق في `src/App.tsx`:**
```typescript
import { App as CapApp } from '@capacitor/app';
import { useNotificationStore } from './store/useNotificationStore';

useEffect(() => {
  let listenerHandle: any = null;

  try {
    CapApp.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) {
        useNotificationStore.getState().pauseRealtime();
      } else {
        useNotificationStore.getState().resumeRealtime();
      }
    }).then(h => { listenerHandle = h; });
  } catch (e) {}

  // لمتصفحات الويب
  const handleVisibility = () => {
    if (document.hidden) {
      useNotificationStore.getState().pauseRealtime();
    } else {
      useNotificationStore.getState().resumeRealtime();
    }
  };
  document.addEventListener('visibilitychange', handleVisibility);

  return () => {
    if (listenerHandle?.remove) listenerHandle.remove();
    document.removeEventListener('visibilitychange', handleVisibility);
  };
}, []);
```

---

### الخطوة 4: كبح طلبات الإشعارات (Throttle / Cooldown)
لمنع تكرار طلب `fetchNotifications` عدة مرات في بضع ثوانٍ عند تنقل المستخدم:
في `src/store/useNotificationStore.ts`:
```typescript
let lastFetchTime = 0;
let lastFetchUserId: string | null = null;

fetchNotifications: async (userId: string, force = false) => {
  if (!userId) return;
  const now = Date.now();
  // منع الطلب إذا تم طلبه لنفس المستخدم خلال آخر 10 ثوانٍ إلا إذا كان إجبارياً
  if (!force && lastFetchUserId === userId && now - lastFetchTime < 10000) {
    return;
  }
  lastFetchTime = now;
  lastFetchUserId = userId;

  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) return;
    set({ notifications: data, unreadCount: data.filter((n: any) => !n.is_read).length });
  } catch (err) {
    console.error('Error fetching notifications:', err);
  }
};
```

---

### الخطوة 5: التقاط إشعارات OneSignal الأصلية في الواجهة (Native Push Events)
في ملف `src/lib/onesignal.ts`:
```typescript
import OneSignal from '@onesignal/capacitor-plugin';

// الاستماع لوصول الإشعار أثناء فتح التطبيق
OneSignal.Notifications.addEventListener('foregroundWillDisplay', (event) => {
  const notif = event.getNotification();
  console.log('🔔 Foreground Notification received:', notif);
  
  // تشغيل النغمة وتحديث قائمة التنبيهات
  const currentUserId = localStorage.getItem('onesignal_external_id');
  if (currentUserId) {
    useNotificationStore.getState().fetchNotifications(currentUserId, true);
  }
  window.dispatchEvent(new CustomEvent('refresh_data'));
});

// الاستماع لنقر المستخدم على الإشعار من شريط التنبيهات
OneSignal.Notifications.addEventListener('click', (event) => {
  const data = event.notification.additionalData as any;
  const targetUrl = data?.url || '/notifications';
  if (window.location.pathname !== targetUrl) {
    window.location.href = targetUrl;
  }
});
```

---

### الخطوة 6: التخزين المؤقت في الذاكرة (In-Memory TTL Caching - 5 Minutes)
كل خدمة تجلب نوافذ منبثقة أو سياسات أو إعدادات ثابتة، يجب وضع كاش مؤقت لها لتوفير أكثر من 70% من اتصالات قاعدة البيانات عند التنقل:

**مثال تطبيقي لكاش 5 دقائق في أي سيرفس (مثل `dashboardAlertService` أو `pollService`):**
```typescript
let cachedData: { data: any; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 دقائق

export const alertService = {
  async getAlert(force = false) {
    if (!force && cachedData && (Date.now() - cachedData.timestamp < CACHE_TTL)) {
      return cachedData.data;
    }
    
    // جلب من Supabase فقط عند انقضاء الـ 5 دقائق
    const { data } = await supabase.from('platform_policies').select('*').eq('policy_type', 'POPUP').maybeSingle();
    const result = data ? JSON.parse(data.content) : null;
    
    cachedData = { data: result, timestamp: Date.now() };
    return result;
  },
  
  async saveAlert(newData: any) {
    cachedData = null; // إبطال الكاش فوراً عند قيام الأدمن بالتعديل
    // كود الحفظ في Supabase...
  }
};
```
طبق نفس النمط على:
- إعدادات التحديث الإجباري (`appUpdateService`)
- استطلاعات الرأي (`pollService`)
- روابط التواصل (`socialLinksAlertService`)
- إعدادات المنصة العامة (`useSettingsStore.fetchSettings`)

---

### الخطوة 7: حل مشكلة "لا يمكن ذلك إلا للأدمن" عند الحذف وجلسات الـ JWT
1. **في إعداد Supabase Client (`src/lib/supabase.ts`):**
```typescript
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  }
});
```

2. **في دوال الأدمن الحساسة (مثل `handleDeleteUser` في صفحة إدارة المستخدمين):**
```typescript
// دالة مساعدة لضمان تجديد التوكن تلقائياً
const ensureAdminSession = async (): Promise<boolean> => {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData?.session;
    // إذا تبقى أقل من 5 دقائق على انتهاء التوكن، يتم تجديده فوراً
    if (!session || (session.expires_at && session.expires_at * 1000 - Date.now() < 300000)) {
      const { data: refreshData, error } = await supabase.auth.refreshSession();
      if (error || !refreshData.session) return false;
    }
    return true;
  } catch {
    return false;
  }
};

const handleDeleteUser = async (userId: string) => {
  if (!window.confirm('هل أنت متأكد من الحذف؟')) return;

  try {
    // 1. ضمان صحة الجلسة قبل الطلب
    await ensureAdminSession();

    let { error } = await supabase.rpc('delete_user_by_admin', {
      user_id_to_delete: userId
    });

    // 2. إذا فشل بسبب انتهاء الصلاحية أو خطأ أدمن، يتم التجديد الصامت وإعادة المحاولة لمرة واحدة فوراً
    if (error && (
      error.message?.toLowerCase().includes('admin') || 
      error.message?.includes('أدمن') || 
      error.message?.toLowerCase().includes('unauthorized') ||
      error.code === '401' || 
      error.code === '403' ||
      error.code === 'PGRST301'
    )) {
      const { data: refreshed } = await supabase.auth.refreshSession();
      if (refreshed?.session) {
        const retryRes = await supabase.rpc('delete_user_by_admin', {
          user_id_to_delete: userId
        });
        error = retryRes.error;
      }
    }

    if (error) throw error;
    setUsers(prev => prev.filter(u => u.id !== userId));
    toast.success('تم حذف المستخدم بنجاح.');
  } catch (error: any) {
    toast.error(error.message || 'حدث خطأ أثناء الحذف.');
    fetchUsers();
  }
};
```

---

## 🎯 النتيجة النهائية المضمونة
1. **انخفاض استهلاك باقة Supabase من آلاف الطلبات إلى بضع طلبات فعلية فقط.**
2. **انعدام تام لأي نشاط في الخلفية عند إغلاق التطبيق.**
3. **سرعة فائقة وانسيابية في التصفح بفضل الكاش المؤقت.**
4. **استقبال التنبيهات الفورية عبر OneSignal Push بدون أي تأخير.**
5. **عمليات الأدمن وحذف المستخدمين تنفذ دائماً بسلاسة وبدون أي أخطاء مصادقة.**
