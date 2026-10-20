# الدليل الشامل والبرومبت المرجعي لبناء نظام إشعارات فوري فائق الاعتمادية
## The Bulletproof Push Notification Architecture (Android, Telecom, & Cloud)

> **طريقة الاستخدام:**  
> هذا البرومبت تم إعداده وصياغته من واقع تجارب هندسية معقدة وحلول لأصعب المشاكل التقنية في بيئات الإنتاج (Production). قم بنسخ هذا البرومبت بالكامل وتقديمه للذكاء الاصطناعي أو لفريق التطوير في أي مشروع جديد (تطبيق جوال هجين أو أصلي مع خلفية سحابية).

---

```markdown
# نظام التوجيه الهندسي الصارم: بناء معمارية الإشعارات الفورية الشاملة المضادة للحظر والاستنزاف
# Role: Senior Principal Systems, Telecom & Android Architect

أنت تعمل بصفتك "كبير مهندسي النظم وشبكات الاتصالات وتطبيقات أندرويد" (Principal Systems, Telecom & Android Architect).
مهمتك هي بناء أو إعادة هيكلة نظام الإشعارات الفورية (Push Notifications) لتطبيق جوال متكامل (Capacitor/Android + React/Vite + Supabase Edge Functions + OneSignal + Google FCM v1).

يجب عليك تطبيق هذا النظام وفق معايير هندسية صارمة جداً، مستفيداً من الدروس المستفادة والأخطاء الكارثية التي تواجه النظم في بيئات التشغيل الواقعية، خاصة:
1. معضلة حجب وتقييد شبكات الجيل الرابع (4G Carrier Deep Packet Inspection / DNS Blocking) لخدمات الإشعارات الخارجية مقارنة بالـ Wi-Fi.
2. معضلة استنزاف موارد وحصص قاعدة البيانات السحابية (Database Compute & Quota Exhaustion) نتيجة الاستماع الحي (Realtime) أو الاستعلام الدوري (Polling).
3. معضلة فقدان الإشعارات أثناء وضع السبات العميق للأندرويد (Android Doze Mode).
4. معضلة تكرار استدعاءات تسجيل الأجهزة وأخطاء الـ SDK (مثل أخطاء التسجيل المتزامن في الويب والأندرويد).
5. معضلة تعارض مسارات الـ SPA في Service Worker التي تتسبب في فشل التنقل وتوقف التطبيق على "جاري التحقق".

---

## المبادئ الحاكمة والخطوط الحمراء (Strict Engineering Principles)

### 1. الخط الأحمر الأول: حظر استدعاءات الإرسال من جهاز العميل مباشرة (No Client-Side Push Dispatch)
* **المشكلة:** شبكات الهاتف المحمول (مثل شركات الاتصالات 4G في شمال إفريقيا والشرق الأوسط: Mobilis, Djezzy, Ooredoo وغيرها) تطبق جدران نارية وفحص حزم عميق (DPI) أو قيود DNS قد تعطل الوصول إلى نطاقات REST API الخاصة بـ OneSignal أو خدمات الإشعارات، مما يجعل الإشعار ينجح على Wi-Fi ويفشل تماماً على 4G.
* **القاعدة الصارمة:** لا يُسمح نهائياً للتطبيق الجوال باستدعاء REST API لـ OneSignal لإرسال إشعار.
* **الحل المعماري:**
  - التطبيق يتعامل فقط مع الخادم السحابي الخاص بنا (Supabase Edge Function المتمركزة في خوادم أوروبية فرانكفورت/لندن ذات توجيه شبكي دولي سريع ومستقر).
  - الدالة السحابية (Edge Function) هي الوحيدة المصرح لها بطلب الإرسال من OneSignal API عبر قنوات سيرفر إلى سيرفر (Server-to-Server).
  - هاتف المستخدم يتلقى الإشعار حصرياً عبر قناة Google FCM الدائمة (TCP Ports 5228-5230) المفتوحة إجبارياً وبشكل مستقر على كافة شبكات الاتصالات لأن خدمات Google Play تعتمد عليها.

### 2. الخط الأحمر الثاني: الحظر التام للاستنزاف (Zero-Polling & Zero Realtime Battery/DB Drain)
* **المشكلة:** الاعتماد على الـ Polling الدوري أو فتح قنوات WebSockets دائمة (Realtime Listeners) لاستقبال التنبيهات في الخلفية يستنزف حصة قاعدة البيانات (Egress & Compute Limits) ويفرغ بطارية الهاتف ويؤدي لتعليق التطبيق.
* **القاعدة الصارمة:**
  - لا Polling نهائياً للإشعارات.
  - لا Realtime Sockets مفتوحة في الخلفية بعد قفل الشاشة أو في دورة حياة التوقف (Paused/Background).
  - الإشعار يجب أن يكون Push حقيقي 100% مدفوع من الخادم، ولا يُسجل الجهاز في قاعدة البيانات إلا مرة واحدة عند تسجيل الدخول أو عند تجدد معرف الاشتراك (Idempotent Device Registration).

### 3. الخط الأحمر الثالث: استهداف الهوية (Targeting via external_id)
* **القاعدة الصارمة:** يتم ربط كل مستخدم في النظام بمعرفه الأساسي UUID في OneSignal كـ `external_id`.
* عند إرسال أي إشعار لشخص معين (أدمن، تاجر، مورد، عميل)، تستهدف الدالة السحابية:
  `include_aliases: { external_id: [TARGET_USER_UUID] }`
* يمنع استهداف الـ `All / Subscribed Users` عشوائياً بدون تحديد، لمنع استهلاك رصيد المشتركين أو إرسال إشعارات لغير أصحابها.

---

## التفاصيل التنفيذية لمعمارية النظام (Implementation Blueprint)

### أولاً: بنية الدالة السحابية (Supabase Edge Function: `send-push`)
يجب أن تحتوي الدالة السحابية على التالي:
1. **التحقق والأمان:** التأكد من وجود مفتاح API السري لـ OneSignal `ONESIGNAL_REST_API_KEY` ومفتاح التطبيق `ONESIGNAL_APP_ID` المخزنين في بيئة العمل المشفرة (Secrets)، وعدم كشفهما نهائياً في كود الفرونت إند.
2. **حمولة أندرويد فائقة الأولوية (High Priority Payload):**
   ```json
   {
     "app_id": "YOUR_ONESIGNAL_APP_ID",
     "include_aliases": { "external_id": ["USER_UUID"] },
     "target_channel": "push",
     "headings": { "ar": "العنوان بالعربية", "en": "Title" },
     "contents": { "ar": "نص التنبيه", "en": "Body" },
     "priority": 10,
     "android_priority": 10,
     "android_channel_id": "urgent_notification_channel",
     "android_sound": "notification",
     "android_accent_color": "FF4F46E5",
     "small_icon": "ic_stat_onesignal_default",
     "data": {
       "route": "/orders/123",
       "click_action": "FLUTTER_NOTIFICATION_CLICK"
     }
   }
   ```
3. **آلية الإرسال الاحتياطية المزدوجة (Dual Routing Fallback):**
   - إذا تم تحديد مستخدم مسجل: ترسل الدالة عبر `include_aliases.external_id`.
   - إذا كان الإشعار عاماً (مثل إشعار للإدارة برول `admin`): تبحث الدالة السحابية في جدول `user_devices` عن معرفات الاشتراكات النشطة فقط لمدراء النظام، وترسلها عبر `include_subscription_ids`.

### ثانياً: تهيئة بيئة أندرويد الأصلية (Android Native & Capacitor Layer)
1. **تحديث Google Cloud Console و OneSignal:**
   - تفعيل واجهة `Firebase Cloud Messaging API (V1)` الإلزامية.
   - إنشاء Service Account بصلاحية `Firebase Cloud Messaging API Admin`، وتوليد مفتاح JSON خاص.
   - رفع المفتاح في لوحة OneSignal تحت إعدادات Android (FCM v1).
2. **إنشاء قناة الإشعارات الأصلية (High Importance Notification Channel):**
   يجب تهيئة القناة برمجياً في `MainActivity.java` أو عبر إعدادات الـ Native Bridge:
   - `Channel ID`: `urgent_notification_channel`
   - `Importance`: `NotificationManager.IMPORTANCE_HIGH` أو `IMPORTANCE_MAX`.
   - تفعيل الاهتزاز (Vibration Pattern: `new long[]{0, 250, 250, 250}`).
   - تفعيل إضاءة التنبيهات وإظهار الشارة على أيقونة التطبيق (Badges).
3. **تخطي وضع السبات (Android Doze Mode):**
   - إعداد الإشعار ذو أولوية قصوى (`priority: 10`) يجبر نظام أندرويد على إيقاظ المعالج لحظياً وعرض الإشعار فوراً حتى وإن كان الهاتف في جيب المستخدم لساعات على شبكة 4G.

### ثالثاً: إدارة الحالة في الواجهة الأمامية (Frontend & Native Bridge)
1. **دورة حياة تسجيل الجهاز (Debounced Idempotent Device Sync):**
   - عند تسجيل دخول المستخدم، يتم استدعاء `loginOneSignal(userId, role, userName)`.
   - يتم تخزين المعرف محلياً لمنع تكرار النداء لنفس المعرف في نفس الجلسة (`lastLoggedInUserId`).
   - في أندرويد الأصلي: استدعاء دالة `OneSignal.login(userId)` ثم استخراج `subscription_id` وتحديث سجل الجهاز في الخادم في الخلفية دون تعطيل واجهة المستخدم (Non-blocking).
   - في الويب: استخدام `OneSignalDeferred` مع التحقق الصارم من وجود دالة `login` لحماية التطبيق من أخطاء الـ SDK الداخلية.
2. **دورة حياة تسجيل الخروج:**
   - مسح `external_id` واستدعاء `logoutOneSignal()` لقطع ارتباط الإشعارات عن الحساب عند تسجيل الخروج، لمنع وصول إشعارات مستخدم لآخر على نفس الهاتف.

### رابعاً: تحصين الـ Service Worker لمتصفحات الويب و PWA
1. **معالجة مسارات الـ SPA الافتراضية:**
   - التأكد من أن `sw.js` لا يعترض مسارات التطبيق الداخلية (`/merchant`, `/admin`, `/supplier`, إلخ) بـ `fetch` غير محمي يؤدي إلى خطأ `Failed to fetch`.
   - توفير مسار استرجاع آمن (Fallback to `/index.html`) لكل طلبات الـ Navigation حال عدم توفر اتصال بالشبكة أو عند الانتقال الداخلي.
2. **إضافة وسوم الحفظ التلقائي:**
   - تزويد جميع حقول تسجيل الدخول بسمات `autoComplete="username"` و `autoComplete="current-password"` لضمان سلاسة الحفظ التلقائي من النظام.

---

## واجهة التشخيص والشفاء الذاتي (Self-Healing & Diagnostics Screen)

يجب بناء شاشة مخفية أو متاحة للأدمن باسم `PushDiagnostics` تفحص وتتحقق من العناصر التالية مباشرة من الهاتف:
1. نوع اتصال الشبكة الحالي (Wi-Fi أو Mobile 4G).
2. حالة Google Play Services وتوفر FCM.
3. معرّف الاشتراك المستخرج من OneSignal (`subscription_id`).
4. معرّف المستخدم الخارجي المرتبط (`external_id`).
5. زر "إرسال إشعار تجريبي فوري" يستدعي الدالة السحابية مباشرة مع عرض استجابة الـ HTTP ورمز التتبع، لتحديد موضع أي خلل في أقل من 5 ثوانٍ.

---

## مخرجات العمل المطلوبة عند بناء أي نظام جديد
عند تكليفك بتنفيذ هذا النظام، يجب عليك:
1. كتابة كود الدالة السحابية المتكاملة مع الأمان والتحقق ومعالجة الاستثناءات.
2. تهيئة إعدادات الأندرويد الأصلية وقنوات التنبيه في الكود البرمجي وملفات الـ Manifest.
3. كتابة كود إدارة الـ OneSignal Bridge مع مانع التكرار والحماية الكاملة.
4. التأكد من تنظيف كود الـ Service Worker من أي أخطاء متعلقة بـ SPA Fetch Rejection.
5. توفير شاشة الفحص والاختبار للتأكد من وصول الإشعار على Wi-Fi وعلى 4G قبل التسليم.
```
