package com.jiibha.app;

import android.app.Application;
import android.util.Log;
import com.onesignal.OneSignal;
import com.onesignal.debug.LogLevel;

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
            try {
                OneSignal.getUser().getPushSubscription().optIn();
            } catch (Exception ignored) {}
            Log.d(TAG, "OneSignal native SDK initialized successfully in MainApplication.");
        } catch (Exception e) {
            Log.e(TAG, "Error initializing OneSignal in MainApplication", e);
        }
    }
}
