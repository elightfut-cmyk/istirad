# التوثيق الهندسي الشامل والنهائي لنظام الإشعارات (Push Notifications Architecture)

> **المرجع التقني النهائي لنظام الإشعارات الفورية والمحلية في منصة جيبها (Jiibha)**  
> **الإصدار:** 2.0 (Native FCM + OneSignal + Supabase Realtime)  
> **تاريخ التوثيق:** 2026-10-23  
> **حالة النظام:** مكتمل ومثبت ميدانياً (Production Ready)

---

## فهرس المحتويات
1. [المعمارية العامة للنظام (System Architecture Overview)](#1-المعمارية-العامة-للنظام-system-architecture-overview)
2. [التمييز بين إشعارات الهاتف الفورية وإشعارات الجرس الداخلية](#2-التمييز-بين-إشعارات-الهاتف-الفورية-وإشعارات-الجرس-الداخلية)
3. [تهيئة البيئة الأصلية للأندرويد (Capacitor & Android Native Setup)](#3-تهيئة-البيئة-الأصلية-للأندرويد-capacitor--android-native-setup)
4. [دورة حياة المستخدم في الواجهة الأمامية (Frontend Lifecycle & Auth Handling)](#4-دورة-حياة-المستخدم-في-الواجهة-الأمامية-frontend-lifecycle--auth-handling)
5. [الدالة السحابية (Edge Function - send-push)](#5-الدالة-السحابية-edge-function---send-push)
6. [تكامل قاعدة البيانات وأرشفة الإشعارات (Database Integration)](#6-تكامل-قاعدة-البيانات-وأرشفة-الإشعارات-database-integration)
7. [بروتوكول فحص الأخطاء والاختبار الصارم (Troubleshooting & Testing Protocol)](#7-بروتوكول-فحص-الأخطاء-والاختبار-الصارم-troubleshooting--testing-protocol)

---

## 1. المعمارية العامة للنظام (System Architecture Overview)

يعتمد نظام الإشعارات في منصة **جيبها (Jiibha)** على معمارية هجينة متكاملة (Hybrid Push & In-App Architecture) تضمن وصول التنبيه إلى المستخدم سواء كان:
1. **داخل التطبيق يتصفح:** يظهر الإشعار فوراً في شارة الجرس العلوية مع تحديث Realtime لحظي.
2. **التطبيق مغلق أو الهاتف مقفل:** يهتز هاتف المستخدم وتنبثق لافتة النظام العلوية (Heads-up Notification) مع تشغيل صوت التنبيه المخصص وإيقاظ الشاشة.

### مخطط تدفق الإشعار (Notification Flow):

```text
[ حدث في التطبيق: مناقصة / عرض سعر / دفع عربون ]
                        │
                        ▼
    ┌────────────────────────────────────────┐
    │     useNotificationStore.ts            │
    │     (sendNotification Helper)          │
    └───────────────────┬────────────────────┘
                        │
         ┌──────────────┴──────────────┐
         ▼                             ▼
┌──────────────────┐         ┌──────────────────────────────────┐
│  Supabase DB     │         │  Supabase Edge Function          │
│  `notifications` │         │  `send-push`                     │
│  (In-App Bell)   │         └─────────────────┬────────────────┘
└────────┬─────────┘                           │
         │ Realtime Subscription               │ 1. تنظيف المعرفات (Clean IDs)
         ▼                                     │ 2. تحديد نوع الاستهداف (Aliases / Filters)
┌──────────────────┐                           │ 3. REST API Key Authorization
│ واجهة المتصفح/   │                           ▼
│ الجرس الداخلي     │                ┌──────────────────────────────────┐
└──────────────────┘                │      OneSignal Cloud Engine      │
                                    └──────────────────┬───────────────┘
                                                       │
                                                       ▼
                                    ┌──────────────────────────────────┐
                                    │  Google Firebase Cloud Messaging │
                                    │  (FCM Gateway)                   │
                                    └──────────────────┬───────────────┘
                                                       │ Push Protocol
                                                       ▼
                                    ┌──────────────────────────────────┐
                                    │       هاتف المستخدم (Android)     │
                                    │ 1. التقاط الحزمة عبر FCM Token  │
                                    │ 2. توجيهها لقناة IMPORTANCE_HIGH │
                                    │ 3. اهتزاز + صوت + WakeLock      │
                                    └──────────────────────────────────┘
```

---

## 2. التمييز بين إشعارات الهاتف الفورية وإشعارات الجرس الداخلية

| وجه المقارنة | إشعارات الهاتف الفورية (Native Push) | إشعارات الجرس الداخلية (In-App Bell) |
| :--- | :--- | :--- |
| **المحرك التقني** | OneSignal REST API + Google FCM Gateway | Supabase PostgreSQL + Realtime WebSockets |
| **قناة الاستقبال** | نظام تشغيل الهاتف (Android Notification Manager) | جدول `notifications` وواجهة React المباشرة |
| **حالة التطبيق المطلوبة**| يعمل عندما يكون التطبيق مقفلاً، في الخلفية، أو بعد إعادة تشغيل الهاتف | يتطلب فتح الموقع أو التطبيق وتواجد جلسة نشطة |
| **المعرف المستخدم** | معرف الجهاز (FCM Token / OneSignal Player ID / External ID) | المعرف الداخلي لقاعدة البيانات (`user_id` UUID) |
| **التأثير على المستخدم**| اهتزاز الهاتف، تشغيل نغمة، إضاءة الشاشة (WakeLock) | زيادة عداد الجرس الأحمر، وظهور البطاقة داخل القائمة |
| **الاعتمادية على التثبيت** | تتطلب تثبيت ملف الـ APK وموافقة صلاحية `POST_NOTIFICATIONS` | متاحة لجميع المستخدمين (المتصفح، الهاتف، والويب) |

---

## 3. تهيئة البيئة الأصلية للأندرويد (Capacitor & Android Native Setup)

### أ. ملف `google-services.json`
- **المسار الإلزامي:** `android/app/google-services.json`
- **الشروط:**
  - تطابق اسم الحزمة (Package Name) بدقة مع: `com.jiibha.app`.
  - احتواء الملف على معرف المشروع السحابي في Firebase ومفاتيح عميل الأندرويد (`client_info` و `current_key`).

### ب. إعدادات Gradle المطلوبة

#### 1. ملف المشروع العام: `android/build.gradle`
يحتوي على مستودعات Google ومكون `google-services`:
```groovy
buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath 'com.android.tools.build:gradle:8.7.2'
        classpath 'com.google.gms:google-services:4.4.2'
    }
}

allprojects {
    repositories {
        google()
        mavenCentral()
    }
}
```

#### 2. ملف التطبيق: `android/app/build.gradle`
يجب تطبيق إضافة `google-services` في أعلى الملف لدعم أحدث إصدارات Gradle 8+:
```groovy
apply plugin: 'com.android.application'
apply plugin: 'com.google.gms.google-services'

android {
    namespace "com.jiibha.app"
    compileSdk rootProject.ext.compileSdkVersion

    defaultConfig {
        applicationId "com.jiibha.app"
        minSdkVersion rootProject.ext.minSdkVersion
        targetSdkVersion rootProject.ext.targetSdkVersion
        versionCode 3
        versionName "1.0.2"
    }
}

dependencies {
    implementation fileTree(dir: 'libs', include: ['*.jar'])
    implementation project(':capacitor-android')
    implementation project(':capacitor-cordova-android-plugins')
    
    // Firebase Messaging & OneSignal SDK
    implementation platform('com.google.firebase:firebase-bom:33.7.0')
    implementation 'com.google.firebase:firebase-messaging'
    implementation 'com.onesignal:OneSignal:5.1.28'
}
```

### ج. إعدادات الصلاحيات في `AndroidManifest.xml`
```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <!-- صلاحيات استقبال الإشعارات والعمل في الخلفية -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
    <uses-permission android:name="android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS" />
```

### د. إنشاء قناة الإشعارات ذات الأولوية القصوى (MainActivity.java)
```java
private void createDefaultNotificationChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (notificationManager != null) {
            NotificationChannel channel = new NotificationChannel(
                "default_notification_channel",
                "إشعارات جيبها الفورية",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("قناة الإشعارات الفورية للطلبات والعروض في منصة جيبها");
            channel.enableLights(true);
            channel.setLightColor(Color.parseColor("#4F46E5"));
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{0, 250, 200, 250, 200, 500});
            channel.setShowBadge(true);
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);

            Uri defaultSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                .build();
            channel.setSound(defaultSoundUri, audioAttributes);

            notificationManager.createNotificationChannel(channel);
        }
    }
}
```

### هـ. شروط توليد الـ Push Token / FCM بنجاح على هواتف الأندرويد:
1. توفر خدمات **Google Play Services** ومطابقتها على الهاتف.
2. تزامن وقت وتاريخ الهاتف تلقائياً مع الشبكة (لتفادي رفض شهادات SSL أثناء مصافحة FCM).
3. إعطاء إذن الصلاحية (`POST_NOTIFICATIONS`) على أندرويد 13 فما فوق.
4. سلامة إعدادات نقطة الوصول (APN) لتدعم بروتوكول `IPv4/IPv6`.
5. استثناء التطبيق من موفر البطارية القاتل (Battery Optimization / Whitelist) لشركات Xiaomi وHuawei وOppo.

---

## 4. دورة حياة المستخدم في الواجهة الأمامية (Frontend Lifecycle & Auth Handling)

### أ. تهيئة OneSignal وربط هوية المستخدم (`OneSignal.login`)
عند تسجيل دخول المستخدم، يتم استدعاء الربط المباشر مع خوادم OneSignal لتسجيل الـ `external_id`:

```typescript
// في ملف src/lib/onesignal.ts
export const loginOneSignalUser = async (userId: string, role?: string, name?: string) => {
  if (!userId) return;

  try {
    const isNative = isNativePlatform();
    
    if (isNative) {
      // 1. استدعاء مكتبة OneSignal الأصلية للـ Capacitor
      await OneSignal.login(userId.trim());
      await OneSignal.User.addTag('user_id', userId.trim());

      if (role) {
        await OneSignal.User.addTag('role', role.trim());
      }
      
      // تفعيل الاشتراك في التنبيهات
      await OneSignal.User.pushSubscription.optIn();

      // 2. مزامنة المعرف مع الجسر الأصلي (Native Android Bridge) للحفظ الدائم في SharedPreferences
      if (typeof window !== 'undefined' && (window as any).NativeBridge?.loginOneSignal) {
        (window as any).NativeBridge.loginOneSignal(userId.trim(), role || '');
      }
    }
  } catch (error) {
    console.error("OneSignal login error:", error);
  }
};
```

### ب. منع حالة التعليق (Ghost State) ومعالجة التبديل السريع بين الحسابات
تحدث مشكلة **Ghost State** عندما يقوم المطور أو المستخدم بتبديل الحسابات على نفس الجهاز بسرعة، مما يسبب تداخل جلسات OneSignal وتوليد خطأ اشتراك وهمي. تم حل هذه المشكلة هندسياً عبر قاعدتين صارمتين:

#### القاعدة الأولى: حصر `OneSignal.logout()` في زر تسجيل الخروج اليدوي حصراً
تم منع استدعاء `OneSignal.logout()` نهائياً داخل `useEffect` كـ Cleanup Function أو عند تبديل الصفحات. يستدعى فقط عندما ينقر المستخدم بيده على زر "تسجيل الخروج":

```typescript
// في ملف src/store/useAuthStore.ts
logout: async () => {
  try {
    // استدعاء logout حصرياً عند الخروج اليدوي الصريح
    await logoutOneSignalUser();
  } catch (e) {
    console.warn('OneSignal manual logout notice:', e);
  }
  
  localStorage.removeItem('jiibha_user_cache');
  set({ user: null, isAuthenticated: false, isLoading: false });
  await supabase.auth.signOut();
}
```

#### القاعدة الثانية: تطبيق التأخير الآمن (Safe Delay 500ms) ومؤشر الإلغاء (Cancellation Token)
في مكوّن `src/App.tsx`:
```typescript
useEffect(() => {
  let isCancelled = false;

  const initOneSignal = async () => {
    // تأخير أمان لحسم استقرار الجلسة وتفادي سباق الذاكرة (Race Condition)
    await new Promise((resolve) => setTimeout(resolve, 500));

    if (isCancelled) return;

    if (user?.id) {
      try {
        await loginOneSignalUser(user.id, user.role || undefined, user.name || undefined);
      } catch (error) {
        console.error("OneSignal Auto-Login Failed:", error);
      }
    }
  };

  initOneSignal();

  return () => {
    isCancelled = true; // إلغاء أي محاولة معلقة إذا تغيرت الحالة فوراً
  };
}, [user?.id, user?.role]);
```

---

## 5. الدالة السحابية (Edge Function - send-push)

تتولى الدالة السحابية `send-push` المنشورة على Supabase استلام طلبات التنبيه من التطبيق وتنفيذ المعالجة والتوزيع.

### أ. تنظيف المعرفات المكررة (Clean IDs Logic)
تمنع الدالة أخطاء OneSignal الناتجة عن تكرار المعرفات عبر تحويل المصفوفة إلى `Set`:
```typescript
const rawIds = userIds || (user_id ? [user_id] : []);

// إزالة أي تكرار نهائياً وتصفية القيم الفارغة
const externalIds = [...new Set(
  (Array.isArray(rawIds) ? rawIds : [rawIds])
    .filter(Boolean)
    .map(String)
    .filter(id => id !== 'all')
)];
```

### ب. آلية التوجيه والاستهداف (Targeting Strategy)
```typescript
if (sendToAll) {
  // 1. الإرسال الشامل لكافة المشتركين
  oneSignalPayload.included_segments = ['Total Subscriptions', 'Active Subscriptions'];
} else if (validSubIds.length > 0) {
  // 2. الإرسال عبر معرفات اشتراك OneSignal المباشرة
  oneSignalPayload.include_player_ids = validSubIds;
} else if (targetRole && targetRole !== 'all') {
  // 3. الاستهداف بحسب الدور (role: supplier / merchant / admin)
  if (externalIds.length > 0) {
    oneSignalPayload.filters = [
      { field: 'tag', key: 'role', relation: '=', value: String(targetRole) },
      { operator: 'OR' },
      { field: 'tag', key: 'user_id', relation: '=', value: externalIds[0] }
    ];
  } else {
    oneSignalPayload.filters = [{ field: 'tag', key: 'role', relation: '=', value: String(targetRole) }];
  }
} else if (externalIds.length > 0) {
  // 4. الاستهداف عبر المعرفات الخارجية للمستخدمين (external_id)
  oneSignalPayload.include_aliases = {
    external_id: externalIds
  };
}
```

### ج. معالجة القوائم الكبيرة وتفسير الردود:
- إذا أعادت خوادم OneSignal خطأ: `"All included players are not subscribed"`:  
  **السبب الهندسي:** المعرف المستهدف صحيح ووصل للدالة بنجاح، لكن المستخدم صاحب هذا المعرف لم يقم بعد بفتح التطبيق على هاتف مسجل أو لم يمنح إذن الإشعارات في FCM.
- **سلوك الدالة:** تقوم الدالة بتسجيل الحدث وأرشفة الإشعار في جدول `notifications` وتعيد `HTTP 200` مع بيانات الخطأ في جسم الرد لتفادي تعطل تدفق العمليات المالية أو واجهة التطبيق.

---

## 6. تكامل قاعدة البيانات وأرشفة الإشعارات (Database Integration)

### أ. هيكل جدول `notifications` في Supabase
```sql
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- سياسات الأمان (RLS)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "المستخدم يقرأ إشعاراته فقط" 
ON public.notifications FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "المستخدم يعدل حالة قراءة إشعاراته" 
ON public.notifications FOR UPDATE 
USING (auth.uid() = user_id);
```

### ب. الضمان المزدوج للأرشفة عبر الـ Service Role
حتى يضمن النظام وصول الإشعار لجميع المستخدمين (سواء كان هاتفهم مغلقاً أو لم يثبتوا التطبيق أبداً):
تقوم الدالة السحابية `send-push` باستخدام مفتاح `SUPABASE_SERVICE_ROLE_KEY` لإدراج سجل في جدول `notifications` لكل مستخدم مستهدف، مما يتجاوز قيود الـ RLS ويضمن ظهور التنبيه في شارة الجرس بمجرد أن يفتح المستخدم حسابه من أي جهاز أو متصفح.

---

## 7. بروتوكول فحص الأخطاء والاختبار الصارم (Troubleshooting & Testing Protocol)

### أ. القواعد الصارمة للاختبار (Strict Testing Rules):
1. **تجنب فخ الجهاز الواحد (Single Device Trap):**
   - لا تختبر دور المورد ودور التاجر على نفس هاتف الأندرويد في نفس اللحظة عبر تسجيل الخروج والدخول المتتالي دون مسح بيانات التطبيق.
   - عند الحاجة لاختبار مستخدم آخر على نفس الجهاز: يجب الضغط على **Clear Data (مسح بيانات التخزين)** للتطبيق من إعدادات أندرويد لضمان إنشاء جلسة FCM و OneSignal نقية.
2. **فحص الـ Push Subscription ID:**
   - من شاشة الإعدادات أو لوحة المطورين: تأكد أن قيمة `Push Subscription ID` ليست `null` أو فارغة، وأن قيمة `Opted-In` هي `true`.

### ب. كيفية تفسير سجلات السيرفر (Logs Interpretation):

| مظهر السجل (Log) | المعنى الهندسي | الإجراء المطلوب |
| :--- | :--- | :--- |
| `External IDs for push: ["<uuid>"]` | المعرف تم استخراجه وتنظيفه بنجاح ووصل للدالة السحابية | لا يوجد خطأ في الكود |
| `OneSignal response status: 200` | تم قبول الإشعار وتوجيهه إلى Google FCM للإرسال الفوري | تم بنجاح |
| `errors: ["All included players are not subscribed"]` | المعرف وصل إلى OneSignal، لكن هذا المستخدم لم يسجل رمز هاتف (FCM Token) حتى الآن | فتح التطبيق بحساب هذا المستخدم على هاتف حقيقي والتأكد من قبول إذن الإشعارات |
| `FCM Token retrieved successfully` | هاتف الأندرويد متصل بنجاح بخوادم Google FCM وحصل على رمز الدفع | ممتاز |
| `FirebaseMessaging: Failed to retrieve FCM Token` | الهاتف غير قادر على الاتصال بـ Google (مثل غياب خدمات Play Services أو تعطل DNS) | فحص اتصال الهاتف وشبكة الإنترنت وضبط APN على IPv4/IPv6 |

---

## ملخص الأوامر الإلزامية بعد أي تعديل أصلي:
```bash
# 1. بناء مشروع الواجهة
npm run build

# 2. مزامنة الأصول وملفات التكوين مع مجلد الأندرويد
npx cap sync android

# 3. بناء تطبيق الأندرويد المحدث
cd android && ./gradlew assembleDebug
```
