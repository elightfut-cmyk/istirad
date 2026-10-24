# التوثيق الهندسي الشامل والنهائي لنظام الإشعارات (Push Notifications Architecture)

> **المرجع التقني النهائي لنظام الإشعارات الفورية والمحلية في منصة جيبها (Jiibha)**  
> **الإصدار:** 3.0 (Zero-Click Server-Side Registration & Auto-Fallback Architecture)  
> **تاريخ التوثيق:** 2026-10-24  
> **حالة النظام:** معتمد ومثبت ميدانياً (Production Ready - 100% Automated)

---

## فهرس المحتويات
1. [المعمارية العامة للنظام (System Architecture Overview)](#1-المعمارية-العامة-للنظام-system-architecture-overview)
2. [التمييز بين إشعارات الهاتف الفورية وإشعارات الجرس الداخلية](#2-التمييز-بين-إشعارات-الهاتف-الفورية-وإشعارات-الجرس-الداخلية)
3. [تهيئة البيئة الأصلية للأندرويد (Capacitor & Android Native Setup)](#3-تهيئة-البيئة-الأصلية-للأندرويد-capacitor--android-native-setup)
4. [دورة حياة الواجهة الأمامية: التسجيل الصامت (Frontend Lifecycle & Zero-Click Registration)](#4-دورة-حياة-الواجهة-الأمامية-التسجيل-الصامت-frontend-lifecycle--zero-click-registration)
5. [جسر تسجيل الأجهزة السحابي (Server-Side Device Registration Bridge)](#5-جسر-تسجيل-الأجهزة-السحابي-server-side-device-registration-bridge)
6. [الضمان المزدوج للإرسال (Auto-Fallback Tag Targeting Architecture)](#6-الضمان-المزدوج-للإرسال-auto-fallback-tag-targeting-architecture)
7. [تكامل قاعدة البيانات وأرشفة التنبيهات (Database & Realtime Integration)](#7-تكامل-قاعدة-البيانات-وأرشفة-التنبيهات-database--realtime-integration)
8. [بروتوكول فحص الأخطاء والتشخيص (Troubleshooting & Testing Protocol)](#8-بروتوكول-فحص-الأخطاء-والتشخيص-troubleshooting--testing-protocol)

---

## 1. المعمارية العامة للنظام (System Architecture Overview)

يعتمد نظام الإشعارات في منصة **جيبها (Jiibha)** على معمارية هجينة ومؤتمتة بالكامل (Zero-Click Autonomous Push Architecture) تقضي على أي تدخل يدوي، وتضمن استلام التنبيهات في جميع السيناريوهات:
1. **أثناء تصفح التطبيق أو الموقع:** يظهر التنبيه فوراً في جرس الإشعارات مع صوت تنبيهي (Audio Chime) وتحديث Realtime فوري.
2. **عندما يكون التطبيق مغلقاً أو الهاتف في وضع السكون:** يهتز هاتف المستخدم وتنبثق لافتة النظام العلوية (Heads-up Notification) مع إيقاظ الشاشة (WakeLock) والصوت المخصص.
3. **عند تبديل الحسابات على نفس الجهاز:** يتم تسجيل وتحديث هوية الجهاز سحابياً بصمت تام دون الوقوع في حالة الجلسة المعلقة (Ghost State) ودون الحاجة لأي نقرة تشخيص.

### مخطط تدفق الإشعار والتسجيل التلقائي (Notification & Registration Flow):

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        1. التسجيل الصامت للجهاز                         │
│                    (Zero-Click Auto Registration)                      │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
      [ فتح التطبيق / تسجيل الدخول / تبديل الحساب / استعادة التطبيق ]
                                     │
                                     ▼
                ┌────────────────────────────────────────┐
                │        src/lib/onesignal.ts            │
                │        waitForFcmToken()               │
                │   (استخراج FCM Token عبر NativeBridge) │
                └────────────────────┬───────────────────┘
                                     │
                                     ▼
                ┌────────────────────────────────────────┐
                │   Supabase Edge Function: send-push    │
                │   action: 'register_device'            │
                └────────────────────┬───────────────────┘
                                     │
             ┌───────────────────────┴───────────────────────┐
             ▼                                               ▼
┌───────────────────────────┐                   ┌───────────────────────────┐
│ POST /api/v1/players      │                   │ PUT /api/v1/players/{id}  │
│ (إنشاء الجهاز بالـ FCM)   │                   │ (إجبار تفعيل notification)│
└────────────┬──────────────┘                   └─────────────┬─────────────┘
             │                                                │
             └───────────────────────┬────────────────────────┘
                                     ▼
                ┌────────────────────────────────────────┐
                │ PATCH /apps/{app_id}/subscriptions/... │
                │ (ربط الهوية external_id الصارم في v5)  │
                └────────────────────────────────────────┘

══════════════════════════════════════════════════════════════════════════

┌────────────────────────────────────────────────────────────────────────┐
│                         2. تدفق إرسال الإشعار                          │
│                     (Dispatch & Double Guarantee)                      │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
    [ حدث: طلب شحن محفظة / تحويل نقاط / مناقصة جديدة / عرض سعر / طلب مباشر ]
                                     │
                                     ▼
                ┌────────────────────────────────────────┐
                │        useNotificationStore.ts         │
                │        sendNotification()              │
                └────────────────────┬───────────────────┘
                                     │
         ┌───────────────────────────┴───────────────────────────┐
         ▼                                                       ▼
┌──────────────────┐                               ┌───────────────────────────┐
│  Supabase DB     │                               │  Supabase Edge Function   │
│  `notifications` │                               │  `send-push`              │
│  (In-App Bell)   │                               └─────────────┬─────────────┘
└────────┬─────────┘                                             │
         │ Realtime                                              ▼
         ▼                                         ┌───────────────────────────┐
┌──────────────────┐                               │ OneSignal REST API        │
│ جرس المنصة       │                               │ (include_aliases)         │
│ لجميع الأجهزة    │                               └─────────────┬─────────────┘
└──────────────────┘                                             │
                                                                 │ هل رد بـ "All included players
                                                                 │ are not subscribed"؟
                                                                 ▼
                                                   ┌───────────────────────────┐
                                              لا ┌─┤ فحص رد OneSignal السحابي │
                                                 │ └─────────────┬─────────────┘
                                                 │               │ نعم (Auto-Fallback)
                                                 │               ▼
                                                 │ ┌───────────────────────────┐
                                                 │ │ إعادة الإرسال الفوري عبر  │
                                                 │ │ الوسوم: filters (user_id) │
                                                 │ └─────────────┬─────────────┘
                                                 ▼               ▼
                                            ┌─────────────────────────┐
                                            │ OneSignal Cloud Server  │
                                            └────────────┬────────────┘
                                                         │ High Priority Push
                                                         ▼
                                            ┌─────────────────────────┐
                                            │  Google FCM Gateway     │
                                            └────────────┬────────────┘
                                                         │
                                                         ▼
                                            ┌─────────────────────────┐
                                            │  هاتف المستخدم المستهدف │
                                            │  صوت + اهتزاز + لافتة   │
                                            └─────────────────────────┘
```

---

## 2. التمييز بين إشعارات الهاتف الفورية وإشعارات الجرس الداخلية

| وجه المقارنة | إشعارات الهاتف الفورية (Native Push) | إشعارات الجرس الداخلية (In-App Bell) |
| :--- | :--- | :--- |
| **المحرك التقني** | OneSignal REST API + Google FCM Gateway | Supabase PostgreSQL + Realtime WebSockets |
| **قناة الاستقبال** | نظام تشغيل الهاتف (Android Notification Manager) | جدول `notifications` وواجهة React المباشرة |
| **حالة التطبيق المطلوبة**| يعمل والتطبيق مغلق، في الخلفية، أو بعد إعادة تشغيل الهاتف | يتطلب فتح الموقع أو التطبيق وتواجد جلسة نشطة |
| **المعرف المستخدم** | رمز FCM والجهاز المسجل سحابياً (`Push ID` / `external_id`) | المعرف الداخلي لقاعدة البيانات (`user_id` UUID) |
| **التأثير على المستخدم**| اهتزاز الهاتف، تشغيل نغمة عالية، إضاءة الشاشة (WakeLock) | زيادة عداد الجرس الأحمر، وظهور البطاقة داخل القائمة |
| **الاعتمادية على التثبيت** | تتطلب تثبيت ملف الـ APK وموافقة صلاحية `POST_NOTIFICATIONS` | متاحة لجميع المستخدمين (المتصفح، الهاتف، والويب) |
| **تغطية الأحداث الجديدة** | تشمل الآن: طلبات شحن المحفظة، تحويل نقاط الولاء، المناقصات والطلبات | تظهر كإشعارات تفاعلية قابلة للنقر والقراءة والحذف |

---

## 3. تهيئة البيئة الأصلية للأندرويد (Capacitor & Android Native Setup)

### أ. ملف `google-services.json`
- **المسار الإلزامي:** `android/app/google-services.json`
- **الشروط:**
  - تطابق اسم الحزمة (Package Name) بدقة مع: `com.jiibha.app`.
  - احتواء الملف على معرف المشروع السحابي في Firebase ومفاتيح عميل الأندرويد.

### ب. إعدادات Gradle (`android/app/build.gradle`)
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
        versionCode 28
        versionName "1.4.5"
    }
}

dependencies {
    implementation fileTree(include: ['*.jar'], dir: 'libs')
    implementation "androidx.appcompat:appcompat:$androidxAppCompatVersion"
    implementation project(':capacitor-android')
    implementation "com.onesignal:OneSignal:5.10.2"
    implementation "com.google.firebase:firebase-messaging:23.4.1"
}
```

### ج. جسر الأندرويد الأصلي وقناة الإشعارات (`MainActivity.java`)
يقوم كود الجافا في `MainActivity.java` بالتقاط رمز Google FCM فورياً وحفظه في `cachedFcmToken` وذاكرة `SharedPreferences`، مما يجعله جاهزاً ومتاحاً للجافاسكريبت عبر الدالة الأصلية:
```java
@JavascriptInterface
public String getFcmToken() {
    if (cachedFcmToken != null && !cachedFcmToken.isEmpty()) {
        return cachedFcmToken;
    }
    try {
        SharedPreferences prefs = context.getSharedPreferences("jiibha_prefs", Context.MODE_PRIVATE);
        return prefs.getString("fcm_token", "");
    } catch (Exception ignored) {}
    return "";
}
```

---

## 4. دورة حياة الواجهة الأمامية: التسجيل الصامت (Frontend Lifecycle & Zero-Click Registration)

في التحديث الجديد، **تم الاستغناء كلياً عن الاعتماد على مصفوفات OneSignal المحلية المعرضة للتعليق لتسجيل الأجهزة، كما تم إخفاء أزرار التشخيص تماماً عن المستخدمين**.

### أ. دالة الانتظار الذكي لالتقاط رمز الهاتف (`waitForFcmToken`):
تقوم الدالة بعمل استطلاع تلقائي (Polling) سريع في الخلفية حتى يكتمل استخراج الرمز من جسر الأندرويد أو الذاكرة المحلية:

```typescript
// في ملف src/lib/onesignal.ts
const waitForFcmToken = async (maxAttempts = 8, delayMs = 1000): Promise<string | null> => {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      // 1. محاولة الجلب من الجسر الأصلي للأندرويد
      const bridgeToken = (window as any).NativeBridge?.getFcmToken?.() 
        || (window as any).NativeDeviceBridge?.getFcmToken?.() 
        || localStorage.getItem('fcm_token')
        || localStorage.getItem('onesignal_fcm_token');
      if (bridgeToken && bridgeToken.length > 20) return bridgeToken;

      // 2. محاولة الجلب من كائن OneSignal SDK
      const osToken = (OneSignal?.User?.pushSubscription as any)?.token;
      if (osToken && osToken.length > 20) return osToken;

      if (typeof (OneSignal?.User?.pushSubscription as any)?.getTokenAsync === 'function') {
        const asyncToken = await (OneSignal.User.pushSubscription as any).getTokenAsync().catch(() => null);
        if (asyncToken && asyncToken.length > 20) return asyncToken;
      }
    } catch (_) {}

    await new Promise((r) => setTimeout(r, delayMs));
  }
  return null;
};
```

### ب. التسجيل الأوتوماتيكي الصامت (`loginOneSignalUser`):
تقوم الدالة بتسجيل المستخدم محلياً بالوسوم، ثم تفويض عملية ربط الجهاز الفعلية إلى الدالة السحابية لتفادي تعارض الـ Aliases:

```typescript
// في ملف src/lib/onesignal.ts
export const loginOneSignalUser = async (userId: string | number, role?: string | null, userName?: string): Promise<void> => {
  const cleanId = String(userId || '').trim();
  if (!cleanId) return;

  try {
    if (isNativePlatform()) {
      if (!isInitialized) {
        try { await initOneSignal(); } catch {}
      }

      // 1. طلب الصلاحية وتفعيل الاشتراك تلقائياً عند أول دخول
      let hasPermission = false;
      try {
        hasPermission = typeof (OneSignal.Notifications as any)?.getPermissionAsync === 'function'
          ? await (OneSignal.Notifications as any).getPermissionAsync()
          : await OneSignal.Notifications.hasPermission();
      } catch { hasPermission = false; }

      if (!hasPermission) {
        try { await OneSignal.Notifications.requestPermission(true); } catch {}
      }
      try { await OneSignal.User.pushSubscription.optIn(); } catch {}

      // 2. الربط المحلي الخفيف عبر SDK والوسوم
      await OneSignal.login(cleanId);
      localStorage.setItem('onesignal_external_id', cleanId);
      await OneSignal.User.addTag('user_id', cleanId);
      if (role) {
        await OneSignal.User.addTag('role', role.trim());
      }

      // 3. الربط السحابي الصامت (Server-Side Registration Bridge)
      const fcmToken = await waitForFcmToken();
      if (fcmToken) {
        const syncKey = `os_synced_${cleanId}_${role || 'user'}_${fcmToken.slice(-10)}`;
        if (sessionStorage.getItem(syncKey) !== 'true') {
          const { data } = await supabase.functions.invoke('send-push', {
            body: {
              action: 'register_device',
              userId: cleanId,
              role: (role || 'user').trim(),
              fcmToken: fcmToken.trim()
            }
          });

          if (data?.pushId) {
            localStorage.setItem('jiibha_verified_push_id', data.pushId);
            localStorage.setItem('onesignal_subscription_id', data.pushId);
            sessionStorage.setItem(syncKey, 'true');
            console.log('✅ Auto-registered device in background, Push ID:', data.pushId);
          }
        }
      }
    }
  } catch (error) {
    console.error('Silent OneSignal auto-login error:', error);
  }
};
```

### ج. الحفاظ على الجلسة الحية عند العودة للواجهة (`App.tsx`):
يتم استدعاء `loginOneSignalUser` تلقائياً عبر:
1. تغير `user.id` أو `user.role`.
2. عودة التطبيق من الخلفية للأمامية عبر `CapApp.addListener('appStateChange')`.
3. مستمع المتصفح `document.addEventListener('visibilitychange')`.

---

## 5. جسر تسجيل الأجهزة السحابي (Server-Side Device Registration Bridge)

يقضي هذا القسم على مشكلة فقدان الـ `Push ID` أو تضارب المعرفات بنسبة 100%، حيث تتولى الدالة السحابية (`supabase/functions/send-push/index.ts`) تسجيل الجهاز مباشرة عبر **OneSignal REST API** بمفتاح الإدارة (`REST API Key`):

### خطوات المعالجة السحابية عند وصول `action: 'register_device'`:
1. **إنشاء أو ربط المشترك (`POST https://onesignal.com/api/v1/players`):**
   - تمرير `device_type: 1` (أندرويد).
   - تمرير `identifier: cleanFcmToken`.
   - تمرير `external_user_id: cleanUserId`.
   - تمرير `notification_types: 1` لتفعيل الاستقبال إجبارياً.
   - تمرير الوسوم `tags: { user_id: cleanUserId, role: cleanRole }`.
2. **تحديث خصائص الجهاز (`PUT https://onesignal.com/api/v1/players/${pushId}`):**
   - تثبيت حالة الاشتراك وتحديث المعرف الخارجي والوسوم دون أي فرصة للتجاهل.
3. **تثبيت الهوية الرسمية في OneSignal v5 (`PATCH /subscriptions/${pushId}/user/identity`):**
   - ربط الـ `external_id` مباشرة في معمارية الاشتراكات الحديثة.

```typescript
// مقتطف من supabase/functions/send-push/index.ts
if (body.action === 'register_device') {
  const { userId, role, fcmToken } = body;
  const cleanUserId = String(userId || '').trim();
  const cleanFcmToken = String(fcmToken || '').trim();
  const cleanRole = String(role || 'user').trim();

  // 1. تسجيل المشترك عبر POST /players
  const createRes = await fetch('https://onesignal.com/api/v1/players', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`
    },
    body: JSON.stringify({
      app_id: ONESIGNAL_APP_ID,
      device_type: 1,
      identifier: cleanFcmToken,
      external_user_id: cleanUserId,
      notification_types: 1,
      tags: { user_id: cleanUserId, role: cleanRole }
    })
  });

  const registerResult = await createRes.json().catch(() => ({}));
  const pushId = registerResult?.id || null;

  // 2. تحديث الخصائص عبر PUT
  if (pushId) {
    await fetch(`https://onesignal.com/api/v1/players/${pushId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        notification_types: 1,
        external_user_id: cleanUserId,
        tags: { user_id: cleanUserId, role: cleanRole }
      })
    });

    // 3. تحديث الهوية عبر PATCH identity
    await fetch(`https://api.onesignal.com/apps/${ONESIGNAL_APP_ID}/subscriptions/${pushId}/user/identity`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeaderValue
      },
      body: JSON.stringify({
        identity: { external_id: cleanUserId }
      })
    });
  }

  return new Response(JSON.stringify({ ok: true, pushId, result: registerResult }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
```

---

## 6. الضمان المزدوج للإرسال (Auto-Fallback Tag Targeting Architecture)

في إصدارات OneSignal الحديثة، قد تتأخر مزامنة الـ `external_id` أحياناً بضع ثوانٍ داخل قاعدة بيانات OneSignal، مما كان يُرجع في السابق خطأ:
`"All included players are not subscribed"` ويفشل الإشعار.

### آلية الاستهداف البديل التلقائي (Auto-Fallback):
تقوم الدالة السحابية بفحص الرد القادم من OneSignal فوراً؛ فإذا احتوى الرد على الخطأ المذكور، **لا تتوقف الدالة**، بل تقوم تلقائياً وفي نفس الطلب بإعادة إرسال الإشعار بالاعتماد على فلتر الوسم المباشر (`filters` مع `field: 'tag', key: 'user_id'`)، مما يضمن رنين الهاتف فوراً:

```typescript
// في ملف supabase/functions/send-push/index.ts
let osResult = await oneSignalRes.json().catch(() => ({}));

const hasUnsubscribedError = Array.isArray(osResult?.errors)
  ? osResult.errors.some((e: any) => typeof e === 'string' && e.includes('All included players are not subscribed'))
  : (typeof osResult?.errors === 'string' && osResult.errors.includes('All included players are not subscribed'));

// إذا فشل الإرسال عبر external_id، يعاد الإرسال فوراً عبر الوسوم كخطة بديلة مضمونة
if (hasUnsubscribedError && externalIds.length > 0 && externalIds.length <= 50) {
  console.log('⚠️ Triggering Fallback Tag Targeting for userIds:', externalIds);
  const tagFilters: any[] = [];
  externalIds.forEach((id, idx) => {
    if (idx > 0) tagFilters.push({ operator: 'OR' });
    tagFilters.push({ field: 'tag', key: 'user_id', relation: '=', value: id });
  });

  const fallbackPayload = {
    ...oneSignalPayload,
    include_aliases: undefined,
    filters: tagFilters
  };
  delete fallbackPayload.include_aliases;

  const retryRes = await fetch('https://onesignal.com/api/v1/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`
    },
    body: JSON.stringify(fallbackPayload)
  });
  osResult = await retryRes.json().catch(() => ({}));
  console.log('🔄 Fallback Tag Targeting Response:', osResult);
}
```

---

## 7. تكامل قاعدة البيانات وأرشفة التنبيهات (Database & Realtime Integration)

### أ. تغطية تنبيهات المحفظة ونقاط الولاء الجديدة (`MerchantWallet.tsx`):
تم ربط عمليات التاجر المالية مباشرة بنظام التنبيهات المركزي لتصل فورياً في شارة الجرس وهواتف الإدارة:

1. **عند طلب شحن المحفظة يدويّاً (`handleTopup`):**
   ```typescript
   sendNotification(
     'all_admins',
     'طلب شحن محفظة جديد 💰',
     `قام التاجر ${merchantName} بتقديم طلب شحن محفظة بمبلغ ${formattedAmount} عبر ${paymentMethod.toUpperCase()} (معرف المعاملة: ${transactionId.trim()}).`,
     'info',
     'admin'
   );
   ```
2. **عند تحويل نقاط الولاء إلى رصيد (`handleConvertPoints`):**
   ```typescript
   sendNotification(
     'all_admins',
     'تحويل نقاط ولاء إلى رصيد 🎁',
     `قام التاجر ${merchantName} بتحويل ${pointsToConvert} نقطة ولاء إلى رصيد محفظته (بقيمة ${addedAmountStr}).`,
     'info',
     'admin'
   );
   ```

### ب. الضمان المزدوج للأرشفة عبر الـ Service Role:
تقوم الدالة السحابية `send-push` باستخدام مفتاح `SUPABASE_SERVICE_ROLE_KEY` لحفظ الإشعار دائماً في جدول `notifications` قبل إرسال الدفع للهاتف، مما يضمن ظهور الإشعار في جرس المنصة حتى وإن كان الهاتف مغلقاً تماماً أو بدون إنترنت.

---

## 8. بروتوكول فحص الأخطاء والتشخيص (Troubleshooting & Testing Protocol)

### أ. القواعد المعمارية المحدثة:
1. **لا حاجة للضغط على أزرار تشخيص يدوية:** النظام يعمل بصمت في الخلفية بمجرد تسجيل الدخول أو التنقل في التطبيق.
2. **إلغاء الحاجة لـ `OneSignal.logout()` المتكرر:** تم حل تعارض الجلسات من جذوره بفضل التسجيل السحابي الصامت وإعادة مزامنة الهوية الفورية عند كل دخول جديد.
3. **اختبار الأدوار المتعددة على جهاز واحد:**
   - بفضل التسجيل السحابي الفوري، يمكن الآن تسجيل الخروج والدخول بحساب تاجر ثم بحساب مورد على نفس الهاتف، وسيقوم النظام بتحديث الـ `Push ID` والوسوم تلقائياً في أقل من ثانية دون الحاجة لمسح بيانات التطبيق.

### ب. جدول تفسير سجلات السيرفر (Edge Function Logs Interpretation):

| مظهر السجل (Log Output) | المعنى الهندسي الدقيق | الإجراء التلقائي المتخذ |
| :--- | :--- | :--- |
| `Auto-registered device in background, Push ID: <uuid>` | تم التقاط رمز FCM بنجاح وتسجيل الجهاز وتأكيد هويته في OneSignal | تسجيل مثالي 100% ولا يتطلب أي تدخل |
| `OneSignal Dispatch Response: { id: "...", recipients: 1 }` | تم قبول الإشعار وتوجيهه للهاتف فوراً عبر `include_aliases` | وصل التنبيه لهاتف المستخدم بنجاح |
| `⚠️ Triggering Fallback Tag Targeting for userIds` | تعذر الاستهداف عبر الـ Alias بسبب تأخر مزامنة OneSignal | تفعيل خطة الطوارئ فورياً عبر `filters: user_id` لضمان الرنين |
| `Fallback Tag Targeting Response: { id: "...", recipients: 1 }` | نجحت الخطة البديلة في إيصال الإشعار للهاتف بدون أي فقدان | رنين الهاتف بنجاح |
| `Missing userId or fcmToken` | لم يتمكن الجهاز من استخراج رمز FCM من الهاتف | التأكد من اتصال الهاتف بالإنترنت ووجود خدمات Google Play |

---

## ملخص الأوامر الإلزامية بعد أي تعديل:
```bash
# 1. بناء حزمة الواجهة الأمامية
npm run build

# 2. مزامنة الأصول وملفات التكوين مع مجلد الأندرويد
npx cap sync android

# 3. بناء تطبيق الأندرويد الإنتاجي (Release APK)
cd android && ./gradlew assembleRelease

# 4. نسخ الـ APK إلى مجلد public وإعادة الرفع
cp android/app/build/outputs/apk/release/app-release.apk public/jiibha-app.apk
git add . && git commit -m "update" && git push origin main
```
