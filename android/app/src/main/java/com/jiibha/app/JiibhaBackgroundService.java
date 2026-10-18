package com.jiibha.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ServiceInfo;
import android.graphics.Color;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * Jiibha Native Foreground Background Service
 * Keeps the user connected to Supabase notifications in the background.
 * Delivers instant heads-up notifications with sound, vibration, and screen wake-up
 * even when the app is minimized, locked, or under aggressive OEM battery constraints.
 */
public class JiibhaBackgroundService extends Service {

    public static final String ACTION_START = "ACTION_START";
    public static final String ACTION_STOP = "ACTION_STOP";
    public static final String ACTION_UPDATE_SESSION = "ACTION_UPDATE_SESSION";

    public static final String SERVICE_CHANNEL_ID = "jiibha_service_channel";
    public static final String ALERT_CHANNEL_ID = MainActivity.NOTIFICATION_CHANNEL_ID;
    public static final int SERVICE_NOTIFICATION_ID = 2001;

    public static final String PREFS_NAME = "jiibha_session_prefs";
    public static final String PREF_ROLE = "role";
    public static final String PREF_USER_ID = "user_id";
    public static final String PREF_USER_NAME = "user_name";
    public static final String PREF_SUPABASE_URL = "supabase_url";
    public static final String PREF_SUPABASE_KEY = "supabase_key";

    // Track alerted notification IDs to avoid duplicate chimes
    public static final Set<String> alertedNotificationIds = Collections.synchronizedSet(new HashSet<>());

    private ScheduledExecutorService scheduler;
    private PowerManager.WakeLock wakeLock;

    @Override
    public void onCreate() {
        super.onCreate();
        createServiceNotificationChannel();

        try {
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "jiibha:background_service_wakelock");
                wakeLock.acquire(10 * 60 * 1000L /* 10 minutes auto-release safeguard */);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : null;

        if (ACTION_STOP.equals(action)) {
            stopPolling();
            stopForeground(true);
            stopSelf();
            return START_NOT_STICKY;
        }

        // Start Foreground Notification
        Notification notification = buildForegroundNotification();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            try {
                startForeground(SERVICE_NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC);
            } catch (Exception e) {
                startForeground(SERVICE_NOTIFICATION_ID, notification);
            }
        } else {
            startForeground(SERVICE_NOTIFICATION_ID, notification);
        }

        startPolling();

        return START_STICKY;
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        stopPolling();
        if (wakeLock != null && wakeLock.isHeld()) {
            try {
                wakeLock.release();
            } catch (Exception ignored) {}
        }
        super.onDestroy();
    }

    private void createServiceNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                NotificationChannel channel = new NotificationChannel(
                    SERVICE_CHANNEL_ID,
                    "خدمة جيبها في الخلفية",
                    NotificationManager.IMPORTANCE_LOW
                );
                channel.setDescription("إبقاء التطبيق متصلاً لاستقبال التنبيهات الفورية والطلبات في الخلفية");
                channel.setShowBadge(false);
                nm.createNotificationChannel(channel);
            }
        }
    }

    private Notification buildForegroundNotification() {
        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent pi = PendingIntent.getActivity(this, 0, intent, flags);

        int smallIcon = getApplicationInfo().icon;
        if (smallIcon == 0) smallIcon = android.R.drawable.ic_dialog_info;

        return new NotificationCompat.Builder(this, SERVICE_CHANNEL_ID)
            .setSmallIcon(smallIcon)
            .setContentTitle("جيبها - متصل لاستقبال التنبيهات 📦")
            .setContentText("التطبيق جاهز لتنبيهك فور وصول أي إشعار أو طلب جديد")
            .setContentIntent(pi)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build();
    }

    private synchronized void startPolling() {
        if (scheduler != null && !scheduler.isShutdown()) return;

        scheduler = Executors.newSingleThreadScheduledExecutor();
        // Poll every 6 seconds for unread notifications in Supabase
        scheduler.scheduleWithFixedDelay(this::checkSupabaseForNotifications, 2, 6, TimeUnit.SECONDS);
    }

    private synchronized void stopPolling() {
        if (scheduler != null) {
            scheduler.shutdownNow();
            scheduler = null;
        }
    }

    private void checkSupabaseForNotifications() {
        try {
            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String userId = prefs.getString(PREF_USER_ID, null);
            String supabaseUrl = prefs.getString(PREF_SUPABASE_URL, "https://mfottmlpvjqonizrqegg.supabase.co");
            String supabaseKey = prefs.getString(PREF_SUPABASE_KEY, "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mb3R0bWxwdmpxb25penJxZWdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5OTY2MjAsImV4cCI6MjA5NzU3MjYyMH0.LAlI52L-wPEyOD4QQ19nFYcVTe4IYxVsj54XXPIarQQ");

            if (userId == null || userId.trim().isEmpty()) return;

            // Principle: Monitor the user's notification bell (notifications table)
            String endpoint = supabaseUrl + "/rest/v1/notifications?select=id,title,message,type,is_read,created_at&user_id=eq." 
                + userId + "&is_read=eq.false&order=created_at.desc&limit=5";

            String jsonResponse = makeHttpGet(endpoint, supabaseKey);
            if (jsonResponse == null) return;

            JSONArray notifications = new JSONArray(jsonResponse);
            for (int i = 0; i < notifications.length(); i++) {
                JSONObject notif = notifications.getJSONObject(i);
                String notifId = notif.optString("id");
                if (notifId == null || notifId.isEmpty()) continue;

                if (alertedNotificationIds.contains(notifId)) {
                    continue;
                }

                alertedNotificationIds.add(notifId);
                String title = notif.optString("title", "جيبها - إشعار جديد 🔔");
                String message = notif.optString("message", "لديك تحديث جديد في حسابك");

                fireAlertNotification(title, message, "/notifications", true);
            }
        } catch (Exception ignored) {
            // Silently catch network errors during background check
        }
    }

    private void fireAlertNotification(String title, String message, String url, boolean isUrgent) {
        try {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;

            Intent intent = new Intent(this, MainActivity.class);
            intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            if (url != null) intent.putExtra("url", url);

            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }
            PendingIntent pi = PendingIntent.getActivity(this, (int) System.currentTimeMillis(), intent, flags);

            long[] vibration = isUrgent
                ? new long[]{0, 350, 200, 350, 200, 500}
                : new long[]{0, 250, 200, 250, 200, 500};

            int smallIcon = getApplicationInfo().icon;
            if (smallIcon == 0) smallIcon = android.R.drawable.ic_dialog_info;

            NotificationCompat.Builder builder = new NotificationCompat.Builder(this, ALERT_CHANNEL_ID)
                .setSmallIcon(smallIcon)
                .setContentTitle(title)
                .setContentText(message)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(message))
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_MESSAGE)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setAutoCancel(true)
                .setContentIntent(pi)
                .setVibrate(vibration)
                .setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION));

            // Briefly wake screen so the user notices immediately
            try {
                PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
                if (pm != null) {
                    PowerManager.WakeLock screenLock = pm.newWakeLock(
                        PowerManager.SCREEN_BRIGHT_WAKE_LOCK | PowerManager.ACQUIRE_CAUSES_WAKEUP | PowerManager.ON_AFTER_RELEASE,
                        "jiibha:screen_alert_wakelock"
                    );
                    screenLock.acquire(4000L);
                }
            } catch (Exception ignored) {}

            int notificationId = (int) (System.currentTimeMillis() % Integer.MAX_VALUE);
            nm.notify(notificationId, builder.build());
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private String makeHttpGet(String urlString, String apiKey) {
        HttpURLConnection conn = null;
        BufferedReader reader = null;
        try {
            URL url = new URL(urlString);
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setConnectTimeout(5000);
            conn.setReadTimeout(5000);
            conn.setRequestProperty("apikey", apiKey);
            conn.setRequestProperty("Authorization", "Bearer " + apiKey);
            conn.setRequestProperty("Accept", "application/json");

            int code = conn.getResponseCode();
            if (code >= 200 && code < 300) {
                reader = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) {
                    sb.append(line);
                }
                return sb.toString();
            }
        } catch (Exception ignored) {
        } finally {
            if (reader != null) {
                try { reader.close(); } catch (Exception ignored) {}
            }
            if (conn != null) {
                conn.disconnect();
            }
        }
        return null;
    }
}
