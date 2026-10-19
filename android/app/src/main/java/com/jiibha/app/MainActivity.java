package com.jiibha.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.provider.Settings;
import android.webkit.JavascriptInterface;
import androidx.core.app.NotificationCompat;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.NetworkInfo;
import android.telephony.TelephonyManager;
import org.json.JSONObject;
import com.getcapacitor.BridgeActivity;
import com.google.firebase.messaging.FirebaseMessaging;

public class MainActivity extends BridgeActivity {

    public static final String NOTIFICATION_CHANNEL_ID = "default_notification_channel";
    public static volatile String cachedFcmToken = "";
    public static volatile String cachedSubscriptionId = "";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Principle 3: Setup Notification Channel with IMPORTANCE_HIGH (Android 8.0+ / Android 13+)
        createDefaultNotificationChannel();

        // Request POST_NOTIFICATIONS runtime permission on Android 13+ (API 33+)
        requestNotificationRuntimePermission();

        // Principle 2: Setup Native Bridge for OEM Battery Management (Xiaomi, Huawei, Oppo, etc.)
        setupNativeBridge();

        // Cache FCM token and subscription
        syncFcmToken();
    }

    @Override
    public void onStart() {
        super.onStart();
        setupNativeBridge();
    }

    @Override
    public void onResume() {
        super.onResume();
        setupNativeBridge();
        syncFcmToken();
    }

    @Override
    public void onPause() {
        super.onPause();
        if (this.bridge != null && this.bridge.getWebView() != null) {
            this.bridge.getWebView().resumeTimers();
        }
    }

    @Override
    public void onStop() {
        super.onStop();
        if (this.bridge != null && this.bridge.getWebView() != null) {
            this.bridge.getWebView().resumeTimers();
        }
    }

    private void requestNotificationRuntimePermission() {
        if (Build.VERSION.SDK_INT >= 33) {
            if (checkSelfPermission("android.permission.POST_NOTIFICATIONS") != PackageManager.PERMISSION_GRANTED) {
                requestPermissions(new String[]{"android.permission.POST_NOTIFICATIONS"}, 101);
            }
        }
    }

    private void syncFcmToken() {
        try {
            FirebaseMessaging.getInstance().getToken().addOnCompleteListener(task -> {
                if (task.isSuccessful() && task.getResult() != null) {
                    cachedFcmToken = task.getResult();
                }
            });
            try {
                String subId = com.onesignal.OneSignal.getUser().getPushSubscription().getId();
                if (subId != null && !subId.isEmpty()) {
                    cachedSubscriptionId = subId;
                }
            } catch (Exception ignored) {}
        } catch (Exception ignored) {}
    }

    private void createDefaultNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (notificationManager != null) {
                NotificationChannel channel = new NotificationChannel(
                    NOTIFICATION_CHANNEL_ID,
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

                // Also maintain legacy channel name for seamless migration
                NotificationChannel legacyChannel = new NotificationChannel(
                    "jibha_channel",
                    "إشعارات جيبها العامة",
                    NotificationManager.IMPORTANCE_HIGH
                );
                legacyChannel.enableVibration(true);
                legacyChannel.enableLights(true);
                notificationManager.createNotificationChannel(legacyChannel);
            }
        }
    }

    private void setupNativeBridge() {
        if (this.bridge != null && this.bridge.getWebView() != null) {
            NativeOEMBridge bridgeObj = new NativeOEMBridge(this);
            this.bridge.getWebView().addJavascriptInterface(bridgeObj, "NativeBridge");
            this.bridge.getWebView().addJavascriptInterface(bridgeObj, "NativeDeviceBridge");
        }
    }

    public static class NativeOEMBridge {
        private final Context context;

        public NativeOEMBridge(Context context) {
            this.context = context;
        }

        @JavascriptInterface
        public void showNotification(String title, String message, String url) {
            try {
                NotificationManager notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
                if (notificationManager == null) return;

                Intent intent = new Intent(context, MainActivity.class);
                intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                if (url != null) {
                    intent.putExtra("url", url);
                }

                int flags = PendingIntent.FLAG_UPDATE_CURRENT;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    flags |= PendingIntent.FLAG_IMMUTABLE;
                }

                PendingIntent pendingIntent = PendingIntent.getActivity(
                    context,
                    (int) System.currentTimeMillis(),
                    intent,
                    flags
                );

                int smallIcon = context.getApplicationInfo().icon;
                if (smallIcon == 0) {
                    smallIcon = android.R.drawable.ic_dialog_info;
                }

                NotificationCompat.Builder builder = new NotificationCompat.Builder(context, NOTIFICATION_CHANNEL_ID)
                    .setSmallIcon(smallIcon)
                    .setContentTitle(title != null ? title : "جيبها")
                    .setContentText(message != null ? message : "")
                    .setStyle(new NotificationCompat.BigTextStyle().bigText(message != null ? message : ""))
                    .setPriority(NotificationCompat.PRIORITY_MAX)
                    .setDefaults(Notification.DEFAULT_ALL)
                    .setAutoCancel(true)
                    .setContentIntent(pendingIntent)
                    .setVibrate(new long[]{0, 300, 200, 300, 200, 500})
                    .setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION))
                    .setVisibility(NotificationCompat.VISIBILITY_PUBLIC);
                // Wake screen briefly so user notices immediately even if screen is locked/off
                try {
                    PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
                    if (pm != null) {
                        PowerManager.WakeLock screenLock = pm.newWakeLock(
                            PowerManager.SCREEN_BRIGHT_WAKE_LOCK | PowerManager.ACQUIRE_CAUSES_WAKEUP | PowerManager.ON_AFTER_RELEASE,
                            "jiibha:main_show_alert_wakelock"
                        );
                        screenLock.acquire(4000L);
                    }
                } catch (Exception ignored) {}

                int notificationId = (int) (System.currentTimeMillis() % Integer.MAX_VALUE);
                notificationManager.notify(notificationId, builder.build());
            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        @JavascriptInterface
        public void requestIgnoreBatteryOptimizations() {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    String packageName = context.getPackageName();
                    PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
                    if (pm != null && !pm.isIgnoringBatteryOptimizations(packageName)) {
                        Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                        intent.setData(Uri.parse("package:" + packageName));
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        context.startActivity(intent);
                        return;
                    }
                }
            } catch (Exception ignored) {}

            try {
                Intent fallback = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
                fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(fallback);
            } catch (Exception ignored) {}
        }

        @JavascriptInterface
        public void openAutoStartSettings() {
            String[][] intents = {
                {"com.miui.securitycenter", "com.miui.permcenter.autostart.AutoStartManagementActivity"},
                {"com.letv.android.letvsafe", "com.letv.android.letvsafe.AutobootManageActivity"},
                {"com.huawei.systemmanager", "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity"},
                {"com.huawei.systemmanager", "com.huawei.systemmanager.optimize.process.ProtectActivity"},
                {"com.coloros.safecenter", "com.coloros.safecenter.permission.startup.StartupAppListActivity"},
                {"com.oppo.safe", "com.oppo.safe.permission.startup.StartupAppListActivity"},
                {"com.iqoo.secure", "com.iqoo.secure.ui.phoneoptimize.AddWhiteListActivity"},
                {"com.vivo.permissionmanager", "com.vivo.permissionmanager.activity.BgStartUpManagerActivity"}
            };

            for (String[] pair : intents) {
                try {
                    Intent intent = new Intent();
                    intent.setComponent(new ComponentName(pair[0], pair[1]));
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    context.startActivity(intent);
                    return;
                } catch (Exception ignored) {}
            }

            try {
                Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                intent.setData(Uri.parse("package:" + context.getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);
            } catch (Exception ignored) {}
        }

        @JavascriptInterface
        public void openBatterySaverSettings() {
            try {
                Intent intent = new Intent();
                intent.setComponent(new ComponentName("com.miui.powerkeeper", "com.miui.powerkeeper.ui.HiddenAppsConfigActivity"));
                intent.putExtra("package_name", context.getPackageName());
                intent.putExtra("package_label", "جيبها");
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);
            } catch (Exception e) {
                requestIgnoreBatteryOptimizations();
            }
        }

        @JavascriptInterface
        public void openAppSettings() {
            try {
                Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                intent.setData(Uri.parse("package:" + context.getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);
            } catch (Exception ignored) {}
        }

        @JavascriptInterface
        public void openNotificationSettings() {
            try {
                Intent intent = new Intent();
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    intent.setAction(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
                    intent.putExtra(Settings.EXTRA_APP_PACKAGE, context.getPackageName());
                } else {
                    intent.setAction(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                    intent.setData(Uri.parse("package:" + context.getPackageName()));
                }
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);
            } catch (Exception ignored) {}
        }

        @JavascriptInterface
        public void openBrowser(String url) {
            try {
                if (url == null || url.trim().isEmpty()) return;
                Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);
            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        @JavascriptInterface
        public void loginOneSignal(String userId) {
            try {
                if (userId != null && !userId.isEmpty()) {
                    com.onesignal.OneSignal.login(userId);
                }
            } catch (Exception ignored) {}
        }

        @JavascriptInterface
        public void logoutOneSignal() {
            try {
                com.onesignal.OneSignal.logout();
            } catch (Exception ignored) {}
        }

        @JavascriptInterface
        public String getPushSubscriptionId() {
            if (cachedSubscriptionId != null && !cachedSubscriptionId.isEmpty()) {
                return cachedSubscriptionId;
            }
            try {
                String id = com.onesignal.OneSignal.getUser().getPushSubscription().getId();
                if (id != null && !id.isEmpty()) {
                    cachedSubscriptionId = id;
                    return id;
                }
            } catch (Exception ignored) {}
            return "";
        }

        @JavascriptInterface
        public String getFcmToken() {
            return cachedFcmToken;
        }

        @JavascriptInterface
        public boolean isNotificationPermissionGranted() {
            try {
                return com.onesignal.OneSignal.getNotifications().getPermission();
            } catch (Exception e) {
                return false;
            }
        }

        @JavascriptInterface
        public void openDataSaverSettings() {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                    Intent intent = new Intent(Settings.ACTION_IGNORE_BACKGROUND_DATA_RESTRICTIONS_SETTINGS);
                    intent.setData(Uri.parse("package:" + context.getPackageName()));
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    context.startActivity(intent);
                    return;
                }
            } catch (Exception ignored) {}

            try {
                Intent fallback = new Intent("android.settings.DATA_SAVER_SETTINGS");
                fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(fallback);
            } catch (Exception ignored) {
                openAppSettings();
            }
        }

        @JavascriptInterface
        public void openGooglePlayServicesSettings() {
            try {
                Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                intent.setData(Uri.parse("package:com.google.android.gms"));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);
            } catch (Exception e) {
                openAppSettings();
            }
        }

        @JavascriptInterface
        public void openMobileNetworkSettings() {
            try {
                Intent intent = new Intent(Settings.ACTION_DATA_ROAMING_SETTINGS);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);
            } catch (Exception e1) {
                try {
                    Intent fallback = new Intent(Settings.ACTION_NETWORK_OPERATOR_SETTINGS);
                    fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    context.startActivity(fallback);
                } catch (Exception ignored) {
                    try {
                        Intent wireless = new Intent(Settings.ACTION_WIRELESS_SETTINGS);
                        wireless.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        context.startActivity(wireless);
                    } catch (Exception ignored2) {}
                }
            }
        }

        @JavascriptInterface
        public void openFcmDiagnostics() {
            try {
                Intent intent = new Intent();
                intent.setClassName("com.google.android.gms", "com.google.android.gms.gcm.GcmDiagnostics");
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);
            } catch (Exception ignored) {
                try {
                    Intent dialIntent = new Intent(Intent.ACTION_DIAL);
                    dialIntent.setData(Uri.parse("tel:" + Uri.encode("*#*#426#*#*")));
                    dialIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    context.startActivity(dialIntent);
                } catch (Exception ignored2) {}
            }
        }

        @JavascriptInterface
        public void openXiaomiDataUsageSettings() {
            try {
                String packageName = context.getPackageName();
                String[][] intents = {
                    {"com.miui.securitycenter", "com.miui.networkassistant.ui.activity.FirewallActivity"},
                    {"com.miui.securitycenter", "com.miui.networkassistant.ui.activity.AppNetworkDetailActivity"},
                    {"com.miui.networkassistant", "com.miui.networkassistant.ui.activity.FirewallActivity"}
                };
                for (String[] pair : intents) {
                    try {
                        Intent intent = new Intent();
                        intent.setComponent(new ComponentName(pair[0], pair[1]));
                        intent.putExtra("package_name", packageName);
                        intent.putExtra("package_label", "جيبها");
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        context.startActivity(intent);
                        return;
                    } catch (Exception ignored) {}
                }
            } catch (Exception ignored) {}
            openAppSettings();
        }

        @JavascriptInterface
        public String getNetworkDiagnostics() {
            try {
                JSONObject obj = new JSONObject();
                ConnectivityManager cm = (ConnectivityManager) context.getSystemService(Context.CONNECTIVITY_SERVICE);

                String networkType = "NONE";
                boolean isConnected = false;
                boolean isMetered = true;

                if (cm != null) {
                    NetworkInfo info = cm.getActiveNetworkInfo();
                    if (info != null && info.isConnected()) {
                        isConnected = true;
                        if (info.getType() == ConnectivityManager.TYPE_WIFI) {
                            networkType = "WIFI";
                            isMetered = false;
                        } else if (info.getType() == ConnectivityManager.TYPE_MOBILE) {
                            networkType = "CELLULAR";
                            isMetered = true;
                        } else {
                            networkType = "OTHER";
                        }
                    }
                }

                boolean isDataSaverActive = false;
                boolean isAppRestricted = false;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N && cm != null) {
                    try {
                        int status = cm.getRestrictBackgroundStatus();
                        if (status == ConnectivityManager.RESTRICT_BACKGROUND_STATUS_ENABLED) {
                            isDataSaverActive = true;
                            isAppRestricted = true;
                        } else if (status == ConnectivityManager.RESTRICT_BACKGROUND_STATUS_WHITELISTED) {
                            isDataSaverActive = true;
                            isAppRestricted = false;
                        }
                    } catch (Exception ignored) {}
                }

                obj.put("networkType", networkType);
                obj.put("isConnected", isConnected);
                obj.put("isMetered", isMetered);
                obj.put("isDataSaverActive", isDataSaverActive);
                obj.put("isAppRestricted", isAppRestricted);
                obj.put("carrierName", "");

                return obj.toString();
            } catch (Exception e) {
                return "{}";
            }
        }
    }
}
