package com.jiibha.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.ComponentName;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.util.Log;
import android.webkit.JavascriptInterface;
import com.getcapacitor.BridgeActivity;
import com.google.firebase.messaging.FirebaseMessaging;

public class MainActivity extends BridgeActivity {
    public static final String NOTIFICATION_CHANNEL_ID = "jibha_channel";
    private static final String TAG = "JiibhaMain";
    public static volatile String cachedFcmToken = "";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        createNotificationChannel();
        registerNativeInterface();
        checkAndRequestPushPermissions();
        syncFcmToken();
    }

    @Override
    public void onResume() {
        super.onResume();
        syncFcmToken();
    }

    private void checkAndRequestPushPermissions() {
        if (Build.VERSION.SDK_INT >= 33) {
            if (checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                requestPermissions(new String[]{android.Manifest.permission.POST_NOTIFICATIONS}, 101);
            }
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == 101) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                try {
                    com.onesignal.OneSignal.getUser().getPushSubscription().optIn();
                } catch (Exception ignored) {}
                syncFcmToken();
            }
        }
    }

    public void syncFcmToken() {
        try {
            FirebaseMessaging.getInstance().getToken().addOnCompleteListener(task -> {
                if (task.isSuccessful() && task.getResult() != null) {
                    String token = task.getResult();
                    cachedFcmToken = token;
                    Log.d(TAG, "Native FCM token obtained: " + token);
                    try {
                        com.onesignal.OneSignal.getUser().getPushSubscription().optIn();
                    } catch (Exception ignored) {}
                } else {
                    Log.w(TAG, "Failed to get FCM token natively: ", task.getException());
                }
            });
        } catch (Exception e) {
            Log.w(TAG, "FirebaseMessaging exception: " + e.getMessage());
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            CharSequence name = "إشعارات جيبها";
            String description = "تنبيهات فورية للطلبات، العروض، والمراسلات";
            int importance = NotificationManager.IMPORTANCE_HIGH;
            NotificationChannel channel = new NotificationChannel(NOTIFICATION_CHANNEL_ID, name, importance);
            channel.setDescription(description);
            channel.enableVibration(true);
            channel.enableLights(true);

            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            if (notificationManager != null) {
                notificationManager.createNotificationChannel(channel);
            }
        }
    }

    private void registerNativeInterface() {
        if (this.bridge != null && this.bridge.getWebView() != null) {
            this.bridge.getWebView().addJavascriptInterface(new Object() {
                @JavascriptInterface
                public void openAppSettings() {
                    try {
                        Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                        intent.setData(Uri.parse("package:" + getPackageName()));
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(intent);
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                }

                @JavascriptInterface
                public void openNotificationSettings() {
                    try {
                        Intent intent = new Intent();
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                            intent.setAction(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
                            intent.putExtra(Settings.EXTRA_APP_PACKAGE, getPackageName());
                        } else {
                            intent.setAction(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                            intent.setData(Uri.parse("package:" + getPackageName()));
                        }
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(intent);
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                }

                @JavascriptInterface
                public String getDeviceManufacturer() {
                    return Build.MANUFACTURER != null ? Build.MANUFACTURER : "unknown";
                }

                @JavascriptInterface
                public String getDeviceModel() {
                    return Build.MODEL != null ? Build.MODEL : "unknown";
                }

                @JavascriptInterface
                public int getAndroidVersion() {
                    return Build.VERSION.SDK_INT;
                }

                @JavascriptInterface
                public void openUniversalBatterySettings() {
                    try {
                        Intent intent = new Intent();
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                            intent.setAction(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
                        } else {
                            intent.setAction(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                            intent.setData(Uri.parse("package:" + getPackageName()));
                        }
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(intent);
                    } catch (Exception e) {
                        openAppSettings();
                    }
                }

                @JavascriptInterface
                public void openHuaweiAppLaunch() {
                    try {
                        Intent intent = new Intent();
                        intent.setComponent(new ComponentName("com.huawei.systemmanager", "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity"));
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(intent);
                    } catch (Exception e) {
                        openAppSettings();
                    }
                }

                @JavascriptInterface
                public void openOppoAutoStart() {
                    try {
                        Intent intent = new Intent();
                        intent.setComponent(new ComponentName("com.coloros.safecenter", "com.coloros.safecenter.permission.startup.StartupAppListActivity"));
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(intent);
                    } catch (Exception e) {
                        openAppSettings();
                    }
                }

                @JavascriptInterface
                public void openAutostartSettings() {
                    try {
                        Intent intent = new Intent();
                        intent.setComponent(new ComponentName("com.miui.securitycenter", "com.miui.permcenter.autostart.AutoStartManagementActivity"));
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(intent);
                    } catch (Exception e) {
                        openAppSettings();
                    }
                }

                @JavascriptInterface
                public void openBatterySettings() {
                    try {
                        Intent intent = new Intent();
                        intent.setComponent(new ComponentName("com.miui.powerkeeper", "com.miui.powerkeeper.ui.HiddenAppsConfigActivity"));
                        intent.putExtra("package_name", getPackageName());
                        intent.putExtra("package_label", getResources().getString(R.string.app_name));
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(intent);
                    } catch (Exception e) {
                        openAppSettings();
                    }
                }

                @JavascriptInterface
                public void syncFcmTokenDirect() {
                    runOnUiThread(() -> syncFcmToken());
                }

                @JavascriptInterface
                public String getPushSubscriptionId() {
                    try {
                        return com.onesignal.OneSignal.getUser().getPushSubscription().getId();
                    } catch (Exception e) {
                        return "";
                    }
                }

                @JavascriptInterface
                public String getPushSubscriptionToken() {
                    try {
                        String token = com.onesignal.OneSignal.getUser().getPushSubscription().getToken();
                        if (token != null && !token.trim().isEmpty()) {
                            cachedFcmToken = token.trim();
                            return token.trim();
                        }
                    } catch (Exception ignored) {}
                    return cachedFcmToken != null ? cachedFcmToken : "";
                }

                @JavascriptInterface
                public boolean getPushSubscriptionOptedIn() {
                    try {
                        return com.onesignal.OneSignal.getUser().getPushSubscription().getOptedIn();
                    } catch (Exception e) {
                        return false;
                    }
                }

                @JavascriptInterface
                public void forceOptInPush() {
                    try {
                        com.onesignal.OneSignal.getUser().getPushSubscription().optIn();
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                }

                @JavascriptInterface
                public void requestPushPermission() {
                    try {
                        runOnUiThread(() -> {
                            try {
                                com.onesignal.OneSignal.getNotifications().requestPermission(true, com.onesignal.Continue.none());
                                com.onesignal.OneSignal.getUser().getPushSubscription().optIn();
                            } catch (Exception ex) {
                                ex.printStackTrace();
                            }
                        });
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                }

                @JavascriptInterface
                public String getOnesignalId() {
                    try {
                        return com.onesignal.OneSignal.getUser().getOnesignalId();
                    } catch (Exception e) {
                        return "";
                    }
                }

                @JavascriptInterface
                public String getExternalId() {
                    try {
                        return com.onesignal.OneSignal.getUser().getExternalId();
                    } catch (Exception e) {
                        return "";
                    }
                }

                @JavascriptInterface
                public void resetAndReOptIn(String externalId) {
                    try {
                        runOnUiThread(() -> {
                            try {
                                com.onesignal.OneSignal.getUser().getPushSubscription().optIn();
                                if (externalId != null && !externalId.trim().isEmpty()) {
                                    com.onesignal.OneSignal.login(externalId.trim());
                                }
                            } catch (Exception ex) {
                                ex.printStackTrace();
                            }
                        });
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                }

                @JavascriptInterface
                public void loginOneSignal(String externalId) {
                    try {
                        if (externalId != null && !externalId.trim().isEmpty()) {
                            com.onesignal.OneSignal.login(externalId.trim());
                        }
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                }

                @JavascriptInterface
                public String sendPushDirect(String urlStr, String authHeader, String jsonBody) {
                    try {
                        java.util.concurrent.ExecutorService executor = java.util.concurrent.Executors.newSingleThreadExecutor();
                        java.util.concurrent.Future<String> future = executor.submit(() -> {
                            java.net.HttpURLConnection conn = null;
                            try {
                                java.net.URL url = new java.net.URL(urlStr);
                                conn = (java.net.HttpURLConnection) url.openConnection();
                                conn.setRequestMethod("POST");
                                conn.setRequestProperty("Content-Type", "application/json; charset=utf-8");
                                conn.setRequestProperty("Accept", "application/json");
                                conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android " + android.os.Build.VERSION.RELEASE + ") JiibhaApp/1.3.2");
                                conn.setRequestProperty("Authorization", authHeader);
                                conn.setDoOutput(true);
                                conn.setConnectTimeout(8000);
                                conn.setReadTimeout(8000);

                                byte[] input = jsonBody.getBytes(java.nio.charset.StandardCharsets.UTF_8);
                                try (java.io.OutputStream os = conn.getOutputStream()) {
                                    os.write(input, 0, input.length);
                                }

                                int code = conn.getResponseCode();
                                java.io.InputStream is = (code >= 200 && code < 400) ? conn.getInputStream() : conn.getErrorStream();
                                String responseBody = "";
                                if (is != null) {
                                    java.util.Scanner s = new java.util.Scanner(is, "UTF-8").useDelimiter("\\A");
                                    responseBody = s.hasNext() ? s.next() : "";
                                    is.close();
                                }

                                org.json.JSONObject res = new org.json.JSONObject();
                                res.put("status", code);
                                res.put("body", responseBody);
                                return res.toString();
                            } finally {
                                if (conn != null) {
                                    conn.disconnect();
                                }
                            }
                        });
                        String res = future.get(10, java.util.concurrent.TimeUnit.SECONDS);
                        executor.shutdown();
                        return res;
                    } catch (Exception e) {
                        return "{\"status\":500,\"error\":\"" + (e.getMessage() != null ? e.getMessage().replace("\"", "\\\"") : "bridge_error") + "\",\"isBridgeError\":true}";
                    }
                }
            }, "NativeDeviceBridge");
        }
    }
}

