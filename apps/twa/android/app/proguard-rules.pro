# ProGuard rules for FitlyNutri TWA
# Keep the TWA LauncherActivity
-keep class com.google.androidbrowserhelper.trusted.LauncherActivity { *; }
-keep class com.google.androidbrowserhelper.trusted.DelegationService { *; }

# Keep all custom tabs related classes
-keep class android.support.customtabs.** { *; }
-keep class androidx.browser.** { *; }
