package com.vibesocial.app;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.Ringtone;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.os.Vibrator;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.WebSettings;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;

public class MainActivity extends BridgeActivity {
    private static final int PERMISSION_REQ_CODE = 101;
    private static final String CALL_CHANNEL_ID = "vibe_incoming_calls_channel";
    private static final int CALL_NOTIFICATION_ID = 9991;

    private Ringtone currentRingtone = null;
    private Vibrator currentVibrator = null;
    private AudioManager audioManager = null;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);

        // 1. Create High-Priority Notification Channel for Incoming Calls
        createCallNotificationChannel();

        // 2. Prompt Android OS runtime permissions on app launch
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            String[] permissions;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                permissions = new String[]{
                    Manifest.permission.CAMERA,
                    Manifest.permission.RECORD_AUDIO,
                    Manifest.permission.MODIFY_AUDIO_SETTINGS,
                    Manifest.permission.POST_NOTIFICATIONS
                };
            } else {
                permissions = new String[]{
                    Manifest.permission.CAMERA,
                    Manifest.permission.RECORD_AUDIO,
                    Manifest.permission.MODIFY_AUDIO_SETTINGS
                };
            }
            boolean needed = false;
            for (String perm : permissions) {
                if (ContextCompat.checkSelfPermission(this, perm) != PackageManager.PERMISSION_GRANTED) {
                    needed = true;
                    break;
                }
            }
            if (needed) {
                ActivityCompat.requestPermissions(this, permissions, PERMISSION_REQ_CODE);
            }
        }

        // Configure Window to turn on screen and show over lock screen for incoming calls
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        } else {
            getWindow().addFlags(
                android.view.WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                android.view.WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD |
                android.view.WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON |
                android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
            );
        }

        try {
            if (this.bridge != null && this.bridge.getWebView() != null) {
                WebSettings settings = this.bridge.getWebView().getSettings();
                String ua = settings.getUserAgentString();
                if (ua != null && ua.contains("; wv")) {
                    settings.setUserAgentString(ua.replace("; wv", ""));
                }
                settings.setJavaScriptCanOpenWindowsAutomatically(true);
                settings.setSupportMultipleWindows(true);
                settings.setDomStorageEnabled(true);
                settings.setDatabaseEnabled(true);
                settings.setMediaPlaybackRequiresUserGesture(false);

                // Preserve Capacitor's BridgeWebChromeClient (file chooser / camera)
                this.bridge.getWebView().setWebChromeClient(new BridgeWebChromeClient(this.bridge) {
                    @Override
                    public void onPermissionRequest(final PermissionRequest request) {
                        runOnUiThread(() -> request.grant(request.getResources()));
                    }
                });

                // Register Native Call Bridge for Javascript
                this.bridge.getWebView().addJavascriptInterface(new CallBridge(), "AndroidCallBridge");

                android.webkit.CookieManager cookieManager = android.webkit.CookieManager.getInstance();
                cookieManager.setAcceptCookie(true);
                cookieManager.setAcceptThirdPartyCookies(this.bridge.getWebView(), true);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void createCallNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CALL_CHANNEL_ID,
                "Incoming Calls",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Incoming Audio & Video Calls from Vibe Social");
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{0, 1000, 500, 1000, 500, 1000});
            channel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);

            Uri ringtoneUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                .build();
            channel.setSound(ringtoneUri, audioAttributes);

            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    @Override
    public void onPause() {
        super.onPause();
        // Prevent WebView from freezing in background so Firestore call listener stays active
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

    public class CallBridge {
        @JavascriptInterface
        public void triggerIncomingCall(String callerName, String callType, String callId) {
            runOnUiThread(() -> showIncomingCallNotification(callerName, callType, callId));
        }

        @JavascriptInterface
        public void cancelIncomingCall() {
            runOnUiThread(() -> dismissIncomingCallNotification());
        }

        @JavascriptInterface
        public void setSpeakerphoneOn(boolean enable) {
            runOnUiThread(() -> {
                if (audioManager != null) {
                    try {
                        audioManager.setMode(AudioManager.MODE_IN_COMMUNICATION);
                        audioManager.setSpeakerphoneOn(enable);
                    } catch (Exception e) {}
                }
            });
        }
    }

    private void showIncomingCallNotification(String callerName, String callType, String callId) {
        try {
            // 1. Wake screen up
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                PowerManager.WakeLock wakeLock = pm.newWakeLock(
                    PowerManager.SCREEN_BRIGHT_WAKE_LOCK | PowerManager.ACQUIRE_CAUSES_WAKEUP | PowerManager.ON_AFTER_RELEASE,
                    "vibesocial:incoming_call_wake"
                );
                wakeLock.acquire(15000); // 15 seconds screen wake
            }

            // 2. Play ringtone
            try {
                Uri ringtoneUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
                currentRingtone = RingtoneManager.getRingtone(getApplicationContext(), ringtoneUri);
                if (currentRingtone != null) {
                    currentRingtone.play();
                }
            } catch (Exception ignored) {}

            // 3. Vibrator
            try {
                currentVibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
                if (currentVibrator != null && currentVibrator.hasVibrator()) {
                    currentVibrator.vibrate(new long[]{0, 1000, 500, 1000, 500, 1000}, 0);
                }
            } catch (Exception ignored) {}

            // 4. Intent to open app
            Intent intent = new Intent(this, MainActivity.class);
            intent.setAction("INCOMING_CALL_ACTION");
            intent.putExtra("callId", callId);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);

            PendingIntent pendingIntent = PendingIntent.getActivity(
                this,
                0,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
            );

            // 5. Build high priority Heads-up / FullScreen Notification
            String callTitle = "📞 Incoming " + (callType != null && callType.equals("video") ? "Video" : "Audio") + " Call";
            String callText = callerName + " is calling you...";

            NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CALL_CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_menu_call)
                .setContentTitle(callTitle)
                .setContentText(callText)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_CALL)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setAutoCancel(true)
                .setOngoing(true)
                .setContentIntent(pendingIntent)
                .setFullScreenIntent(pendingIntent, true);

            NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager != null) {
                manager.notify(CALL_NOTIFICATION_ID, builder.build());
            }

            // 6. Automatically bring MainActivity to front so user sees the call popup immediately
            Intent bringToFrontIntent = new Intent(this, MainActivity.class);
            bringToFrontIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
            startActivity(bringToFrontIntent);

        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void dismissIncomingCallNotification() {
        try {
            if (currentRingtone != null && currentRingtone.isPlaying()) {
                currentRingtone.stop();
                currentRingtone = null;
            }
            if (currentVibrator != null) {
                currentVibrator.cancel();
                currentVibrator = null;
            }
            NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager != null) {
                manager.cancel(CALL_NOTIFICATION_ID);
            }
        } catch (Exception ignored) {}
    }

    @Override
    public void onDestroy() {
        dismissIncomingCallNotification();
        super.onDestroy();
    }
}

