package com.jiibha.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.webkit.JavascriptInterface;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    public static final String NOTIFICATION_CHANNEL_ID = "jibha_channel";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        createNotificationChannel();
        registerNativeInterface();
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
                        return com.onesignal.OneSignal.getUser().getPushSubscription().getToken();
                    } catch (Exception e) {
                        return "";
                    }
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
            }, "NativeDeviceBridge");
        }
    }
}

