# دليل وبرومبت هندسي شامل: بناء وتصحيح أنظمة الإشعارات الفورية (Push Notifications)
## Master Engineering Blueprint & System Prompt for Mobile Push Notifications

> هذا الملف هو الدليل المرجعي الصارم (Master Blueprint & Prompt) الذي يجب استدعاؤه واتباعه حرفياً عند تصميم، بناء، أو تصحيح أي نظام إشعارات فورية (Push Notifications) لتطبيق هجين (Capacitor / React) أو أصيل (Native Android/iOS).

---

## 📌 البرومبت التأسيسي (System Prompt للاستخدام المباشر)

```markdown
أنت مهندس نظم وتطبيقات متقدم (Principal Mobile & Systems Engineer) متخصص في بنيات الإشعارات الفورية (Push Notifications Architecture) عبر بيئات الهواتف الذكية (Android / iOS) والأنظمة السحابية (OneSignal / Firebase FCM / Supabase).

عند بناء أو تصحيح نظام إشعارات فورية لأي تطبيق، يجب أن تعمل وفق المبادئ الصارمة التالية دون أي تهاون:

1. الفصل المطلق بين المفاتيح (Key Separation & Zero Trust):
   - لا تخلط أبداً بين App ID (المعرف العلني) ومفتاح الـ REST API Key (المفتاح السري للخادم).
   - لا تضع مفاتيح الـ REST API في كود العميل (Client-side) نهائياً؛ الإرسال يتم دائماً عبر Backend / Supabase Edge Functions.
   - تحقق دائماً من صيغة المفاتيح (مثل صيغ OneSignal v2 الحديثة: os_v2_app_...) ولا تخلط بين الحسابات أو التطبيقات المختلفة.

2. حتمية التعامل مع تباين أجهزة ومصنعي الهواتف (OEM Fragmentation):
   - لا تفترض أبداً أن نجاح الإشعار في هاتف أو محاكي يعني نجاحه على هواتف شاومي (Redmi/Xiaomi)، هواوي (Huawei)، أوبو (Oppo)، أو سامسونج (Samsung).
   - واجهات MIUI / HyperOS / EMUI تقتل التطبيقات في الخلفية وتمنع التشغيل التلقائي (AutoStart) افتراضياً.
   - يجب توفير واجهات مساعدة برمجية (Native Intents & Bridges) لتوجيه المستخدمين بوضوح لتعطيل موفر الطاقة وإتاحة التشغيل في الخلفية للأجهزة المستهدفة.

3. هندسة الأذونات وقنوات أندرويد (Android 13+ & Notification Channels):
   - أندرويد 13+ (API 33+) يتطلب إذن POST_NOTIFICATIONS صريح أثناء التشغيل (Runtime Permission)؛ بدونه لن يصل أي إشعار.
   - أندرويد 8.0+ (API 26+) يشترط وجود قناة تنبيه (Notification Channel) بأهمية قصوى (IMPORTANCE_HIGH) لكي يصدر الهاتف صوتاً واهتزازاً ويظهر التنبيه العائم (Heads-up).

4. دورة حياة الربط والتسجيل (User Identity & Subscription Lifecycle):
   - يتم تهيئة OneSignal فور إقلاع التطبيق، ويتم استدعاء OneSignal.login(userId) فور توثيق المستخدم لربط المعرف الخارجي (External ID).
   - عند الإرسال، يتم الاعتماد على المعرف الموحد للمستخدم (External ID) لتصل التنبيهات لجميع أجهزته المتزامنة تلقائياً.

5. الأمان وخصوصية الواجهة (UI Security & Strict Isolation):
   - أدوات الفحص، شاشات الـ Diagnostics، أزرار التجربة، والـ Player IDs هي أدوات للمطور فقط.
   - يحظر تماماً عرض شاشات الفحص أو التوكنات التقنية للمستخدمين العاديين، ويجب قصرها برمجياً على حساب المطور المسؤول.
```

---

## 🛠️ الدليل الهندسي التفصيلي: الخطوات العملية والأخطاء التي يجب تفاديها

### 1. معضلة المفاتيح (App ID vs REST API Key vs FCM v1)

#### ❌ الأخطاء السابقة الشائعة:
- استخدام مفتاح REST API قديم ملغى في خوادم Supabase، مع تحديثه فقط في كود العميل أو العكس.
- نسخ الـ REST API Key في خانة الـ App ID أو العكس.
- استدعاء واجهات إرسال OneSignal مباشرة من كود React بواسطة مفتاح REST API سري، مما يجعله عرضة للاستخراج والفحص من ملفات APK.

#### ✅ القواعد الذهبية:
1. **OneSignal App ID (معرف التطبيق)**:
   - شكله: UUID قياسي مثل `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`.
   - مكانه: يوضع في كود الواجهة الأمامية (`capacitor.config.ts`, `src/lib/onesignal.ts`, `.env.production`).
   - وظيفته: تسجيل الجهاز لدى خدمة OneSignal واستقبال التوكنات فقط.
2. **OneSignal REST API Key (مفتاح الخادم السري)**:
   - شكله: يبدأ بالبادئة الحديثة `os_v2_app_...` بطول حوالي 80+ محرف.
   - مكانه: حصرياً في خوادم Backend أو Supabase Secrets (`supabase secrets set ONESIGNAL_REST_API_KEY=...`).
   - وظيفته: إرسال الإشعارات إلى المستخدمين عبر الطلبات البرمجية الموثوقة.
3. **Google Firebase FCM v1 Service Account**:
   - لم يعد Google يدعم مفاتيح Legacy Server Key القديمة.
   - يجب توليد ملف JSON من Google Cloud Console لحساب الخدمة (Firebase Service Account) ورفعه داخل لوحة OneSignal Dashboard تحت إعدادات Android.

---

### 2. هندسة أذونات أندرويد وقنوات التنبيه (Permissions & Channels)

#### أ. إذن POST_NOTIFICATIONS (Android 13+ / API 33):
في ملف `android/app/src/main/AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
```

#### ب. إنشاء قناة الإشعارات الإجبارية (High Importance Notification Channel):
في `MainActivity.java`، لا تعتمد على إنشاء القناة تلقائياً، بل قم بإنشائها برمجياً في `onCreate`:
```java
if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
    NotificationManager notificationManager = getSystemService(NotificationManager.class);
    if (notificationManager != null) {
        String channelId = "default_notification_channel";
        NotificationChannel channel = new NotificationChannel(
            channelId,
            "تنبيهات التطبيق الهامة",
            NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription("إشعارات فورية للطلبات، العروض، وحالة الحساب");
        channel.enableVibration(true);
        channel.enableLights(true);
        channel.setShowBadge(true);
        channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        
        notificationManager.createNotificationChannel(channel);
    }
}
```

---

### 3. معضلة تباين الهواتف ومصنعي الأجهزة (The OEM Battery Killer Dilemma)

#### ما السبب وراء فشل الإشعارات على Redmi / Xiaomi / Oppo / Huawei رغم عملها على Samsung أو Pixel؟
تحتوي أنظمة أندرويد المعدلة (Custom ROMs) على برامج إدارة طاقة عدوانية للغاية:
1. **شاومي / ريدمي (MIUI / HyperOS)**:
   - خاصية **AutoStart (التشغيل التلقائي)** مغلقة افتراضياً لأي تطبيق لا ينتمي لشاومي أو جوجل. بمجرد خروج المستخدم من التطبيق، تُغلق خلفيته ويمنع استيقاظه بواسطة FCM.
   - خيار **MIUI Battery Saver** يقوم بقطع الاتصال بالشبكة عن التطبيقات في الخلفية بعد دقائق من قفل الشاشة.
2. **هواوي (EMUI / HarmonyOS)**:
   - نظام **App Launch** يُعيّن التطبيقات تلقائياً على "إدارة تلقائية"، مما يمنع التشغيل الثانوي (Secondary Launch).
3. **أوبو / ريلمي / فيفو (ColorOS / OriginOS)**:
   - خاصية **Background Freeze** تُجمد العملية البرمجية بالكامل عند سكون الهاتف.

#### ✅ الحل البرمجي المتكامل: جسر النظام (Native Device Bridge):
تمكين التطبيق من فتح شاشات الضبط الخاصة بكل مصنّع مباشرة:
1. **فتح إعداد التشغيل التلقائي لشومي (Xiaomi Autostart Intent)**:
   ```java
   Intent intent = new Intent();
   intent.setComponent(new ComponentName("com.miui.securitycenter", "com.miui.permcenter.autostart.AutoStartManagementActivity"));
   startActivity(intent);
   ```
2. **فتح إعداد توفير البطارية بدون قيود (MIUI No Restrictions)**:
   ```java
   Intent intent = new Intent();
   intent.setComponent(new ComponentName("com.miui.securitycenter", "com.miui.powerkeeper.ui.HiddenAppsConfigActivity"));
   intent.putExtra("package_name", getPackageName());
   intent.putExtra("package_label", "Jiibha");
   startActivity(intent);
   ```
3. **الطلب العام لتجاهل تحسين البطارية (Universal Battery Optimization Request)**:
   ```java
   Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
   intent.setData(Uri.parse("package:" + getPackageName()));
   startActivity(intent);
   ```

---

### 4. دورة حياة ربط المستخدم (OneSignal User Lifecycle)

```
[تسجيل الدخول / فتح التطبيق]
         │
         ▼
 1. initOneSignal() ──────────► تهيئة المكتبة بالـ App ID فقط
         │
         ▼
 2. طلب إذن الإشعارات ────────► OneSignal.Notifications.requestPermission(true)
         │
         ▼
 3. ربط هوية المستخدم ────────► OneSignal.login(user.id)
         │
         ▼
 4. تخزين الاشتراك ───────────► حفظ subscriptionId و pushToken في جدول profiles
```

#### حمولة الإرسال النموذجية للـ Backend (Payload Standard):
عند استدعاء API الـ OneSignal من السيرفر أو Edge Function:
```json
{
  "app_id": "YOUR_ONESIGNAL_APP_ID",
  "include_aliases": {
    "external_id": ["user-uuid-here"]
  },
  "target_channel": "push",
  "headings": { "en": "عنوان الإشعار", "ar": "عنوان الإشعار" },
  "contents": { "en": "نص التنبيه بالتفصيل", "ar": "نص التنبيه بالتفصيل" },
  "android_channel_id": "default_notification_channel",
  "priority": 10,
  "android_visibility": 1,
  "small_icon": "ic_stat_onesignal_default",
  "data": {
    "url": "/orders/123",
    "type": "order_update"
  }
}
```

---

### 5. أمان الواجهة وخصوصية أدوات الفحص (Security & Developer Tool Isolation)

#### ❌ الخطر الأمني السابق:
ترك زر "فحص الإشعارات وتجربتها" أو كروت التشخيص متاحة لكل المستخدمين والتجار والزبائن في لوحة التحكم أو الملف الشخصي، مع إمكانية عرض التوكنات أو إتاحة تعديل الـ REST API Key.

#### ✅ معايير الأمان المطبقة:
1. **Strict Email Authorization**:
   - لا يتم فتح أو تصيير (Render) نوافذ التشخيص وأزرار الاختبار إلا للمطور المعتمد:
   ```typescript
   const isAuthorized = user?.email?.trim().toLowerCase() === 'madaniameur26@gmail.com';
   if (!isOpen || !isAuthorized) return null;
   ```
2. **Hidden Triggers**:
   - إخفاء أزرار الفحص بالكامل من شريط الإشعارات، جرس التنبيهات، صفحة الملف الشخصي، ولوحة التحكم لأي حساب آخر.

---

### 6. قائمة الفحص العملية الإجبارية (Pre-Flight Checklist)
قبل الإعلان عن جاهزية نظام الإشعارات أو تسليم أي تطبيق، يجب التأكد من:
- [ ] التأكد من صحة OneSignal App ID في الواجهة، وصحة REST API Key في خوادم Backend.
- [ ] التأكد من وجود ملف `google-services.json` صالح داخل مجلد `android/app`.
- [ ] التحقق من إنشاء `NotificationChannel` بقيمة `IMPORTANCE_HIGH` داخل كود الأندرويد.
- [ ] التحقق من تضمين إذن `POST_NOTIFICATIONS` في `AndroidManifest.xml`.
- [ ] اختبار الربط باستخدام `OneSignal.login(user.id)` والتحقق من ظهور الجهاز في لوحة OneSignal Dashboard تحت المستخدم الصحيح.
- [ ] تجربة وصول الإشعار في 3 حالات للجهاز:
  1. التطبيق مفتوح في الواجهة (Foreground).
  2. التطبيق في الخلفية (Background).
  3. التطبيق مغلق تماماً (Killed / Terminated state).
- [ ] التحقق من عمل الإشعارات على هاتف شاومي / ريدمي بعد تفعيل التشغيل التلقائي وإلغاء تقييد البطارية.
- [ ] التحقق بنسبة 100% من أن نوافذ وأدوات الفحص لا تظهر لأي مستخدم عادي ومحصورة على إيميل المطور فقط.
