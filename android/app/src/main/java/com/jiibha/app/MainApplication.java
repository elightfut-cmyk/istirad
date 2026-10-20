package com.jiibha.app;

import android.app.Application;
import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;
import com.onesignal.OneSignal;
import com.onesignal.debug.LogLevel;
import com.onesignal.user.subscriptions.IPushSubscriptionObserver;
import com.onesignal.user.subscriptions.PushSubscriptionChangedState;

public class MainApplication extends Application {
    private static final String TAG = "JiibhaApp";
    public static final String ONESIGNAL_APP_ID = "daeaef49-9125-4ef2-8950-6c0428063f09";

    @Override
    public void onCreate() {
        super.onCreate();
        try {
            Log.d(TAG, "Initializing OneSignal native SDK from MainApplication...");
            OneSignal.getDebug().setLogLevel(LogLevel.WARN);
            OneSignal.initWithContext(this, ONESIGNAL_APP_ID);

            // Register Push Subscription Observer to capture ID and Token as soon as assigned
            OneSignal.getUser().getPushSubscription().addObserver(new IPushSubscriptionObserver() {
                @Override
                public void onPushSubscriptionChange(PushSubscriptionChangedState state) {
                    try {
                        String id = state.getCurrent().getId();
                        String token = state.getCurrent().getToken();
                        if (id != null && !id.isEmpty()) {
                            MainActivity.cachedSubscriptionId = id;
                            SharedPreferences prefs = getSharedPreferences("jiibha_prefs", Context.MODE_PRIVATE);
                            prefs.edit().putString("subscription_id", id).apply();
                            Log.d(TAG, "OneSignal Subscription ID observed: " + id);
                        }
                        if (token != null && !token.isEmpty()) {
                            MainActivity.cachedFcmToken = token;
                            SharedPreferences prefs = getSharedPreferences("jiibha_prefs", Context.MODE_PRIVATE);
                            prefs.edit().putString("fcm_token", token).apply();
                            Log.d(TAG, "FCM Token observed: " + token.substring(0, Math.min(10, token.length())) + "...");
                        }
                    } catch (Exception e) {
                        Log.w(TAG, "PushSubscriptionObserver error", e);
                    }
                }
            });

            try {
                OneSignal.getUser().getPushSubscription().optIn();
            } catch (Exception ignored) {}
            Log.d(TAG, "OneSignal native SDK initialized successfully in MainApplication.");
        } catch (Exception e) {
            Log.e(TAG, "Error initializing OneSignal in MainApplication", e);
        }
    }
}

