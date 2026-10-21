package com.vibesocial.app;

import android.os.Bundle;
import android.webkit.WebSettings;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
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

                android.webkit.CookieManager cookieManager = android.webkit.CookieManager.getInstance();
                cookieManager.setAcceptCookie(true);
                cookieManager.setAcceptThirdPartyCookies(this.bridge.getWebView(), true);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
