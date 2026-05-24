# LA — ProGuard / R8 keep rules
#
# These rules are appended to the default Android rules
# (proguard-android.txt) when `enableProguardInReleaseBuilds = true` in
# app/build.gradle. They cover libraries that rely on reflection,
# JNI/native bridges, or codegen which R8 cannot statically prove are
# in use.
#
# When adding a new RN library that breaks only in release builds, the
# fix almost always belongs here: figure out which classes the library
# loads reflectively (typically *.JavaScriptModule, *.NativeModule,
# Room *_Impl, plugin descriptors) and add a `-keep` for them.
#
# Order roughly mirrors dependency frequency.

# ---------------------------------------------------------------------------
# React Native runtime
# ---------------------------------------------------------------------------
# RN 0.85's Gradle plugin already injects most rules. These are belt-and-
# suspenders for code paths that occasionally regress with new releases.
-keep,allowobfuscation @interface com.facebook.proguard.annotations.DoNotStrip
-keep,allowobfuscation @interface com.facebook.proguard.annotations.KeepGettersAndSetters
-keep,allowobfuscation @interface com.facebook.common.internal.DoNotStrip

-keep @com.facebook.proguard.annotations.DoNotStrip class * { *; }
-keep @com.facebook.common.internal.DoNotStrip class * { *; }
-keepclassmembers class * {
    @com.facebook.proguard.annotations.DoNotStrip *;
    @com.facebook.common.internal.DoNotStrip *;
    @com.facebook.react.uimanager.annotations.ReactProp <methods>;
    @com.facebook.react.uimanager.annotations.ReactPropGroup <methods>;
}

-keep class com.facebook.react.bridge.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }
-keep class com.facebook.react.fabric.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.hermes.** { *; }

# ReactPackage discovery
-keep class * implements com.facebook.react.ReactPackage { *; }
-keep class * implements com.facebook.react.bridge.NativeModule { *; }
-keep class * implements com.facebook.react.bridge.JavaScriptModule { *; }

# Generated Codegen specs (New Architecture)
-keep class **.NativeModuleSpec { *; }
-keep class **.NativeComponentSpec { *; }

# ---------------------------------------------------------------------------
# Hermes
# ---------------------------------------------------------------------------
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.jni.** { *; }

# ---------------------------------------------------------------------------
# OkHttp / Okio (RN networking layer)
# ---------------------------------------------------------------------------
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn org.codehaus.mojo.animal_sniffer.**
-dontwarn org.conscrypt.**
-keepnames class okhttp3.internal.publicsuffix.PublicSuffixDatabase

# ---------------------------------------------------------------------------
# AsyncStorage v3 (Room + KSP)
# ---------------------------------------------------------------------------
# Room generates *_Impl classes via KSP that are loaded by name at
# runtime. R8 can usually prove these are reachable, but reflection
# inside Room's runtime occasionally trips it.
-keep class * extends androidx.room.RoomDatabase { <init>(); }
-keep class **_Impl { *; }
-keepclassmembers class * extends androidx.room.RoomDatabase {
    public static <methods>;
}
-dontwarn androidx.room.paging.**

# AsyncStorage shared_storage native module
-keep class org.asyncstorage.** { *; }
-dontwarn org.asyncstorage.**

# ---------------------------------------------------------------------------
# react-native-video / ExoPlayer
# ---------------------------------------------------------------------------
-keep class androidx.media3.** { *; }
-keep interface androidx.media3.** { *; }
-dontwarn androidx.media3.**
-keep class com.brentvatne.** { *; }
-dontwarn com.brentvatne.**

# ---------------------------------------------------------------------------
# react-native-svg (uses reflection for view manager registration)
# ---------------------------------------------------------------------------
-keep class com.horcrux.svg.** { *; }
-dontwarn com.horcrux.svg.**

# ---------------------------------------------------------------------------
# react-native-webview
# ---------------------------------------------------------------------------
-keep class com.reactnativecommunity.webview.** { *; }
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# ---------------------------------------------------------------------------
# react-native-iap (consumer-rules.pro is shipped, this is extra safety)
# ---------------------------------------------------------------------------
-keep class com.android.vending.billing.** { *; }
-keep class com.dooboolab.rniap.** { *; }
-dontwarn com.dooboolab.rniap.**

# ---------------------------------------------------------------------------
# Nitro Modules (codegen-heavy; HybridObject classes loaded via JNI)
# ---------------------------------------------------------------------------
-keep class com.margelo.nitro.** { *; }
-keep class * extends com.margelo.nitro.core.HybridObject { *; }
-dontwarn com.margelo.nitro.**

# ---------------------------------------------------------------------------
# Firebase / Crashlytics (gracefully no-op when google-services.json absent)
# ---------------------------------------------------------------------------
-keep class com.google.firebase.** { *; }
-keep class io.invertase.firebase.** { *; }
-dontwarn com.google.firebase.**
-dontwarn io.invertase.firebase.**

# Keep Crashlytics line numbers + source file in stack traces
-keepattributes SourceFile,LineNumberTable

# ---------------------------------------------------------------------------
# Google Sign-In / Apple Sign-In
# ---------------------------------------------------------------------------
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.android.gms.**
-keep class com.invertase.** { *; }
-dontwarn com.invertase.**

# ---------------------------------------------------------------------------
# Other RN community modules used by LA
# ---------------------------------------------------------------------------
# react-native-fs
-keep class com.rnfs.** { *; }
# react-native-permissions
-keep class com.zoontek.rnpermissions.** { *; }
# react-native-image-picker
-keep class com.imagepicker.** { *; }
# react-native-bootsplash
-keep class com.zoontek.rnbootsplash.** { *; }
# react-native-screens
-keep class com.swmansion.rnscreens.** { *; }
# react-native-safe-area-context
-keep class com.th3rdwave.safeareacontext.** { *; }
# react-native-linear-gradient
-keep class com.BV.LinearGradient.** { *; }
# react-native-youtube-iframe (depends on WebView, see WebView block above)

# ---------------------------------------------------------------------------
# Kotlin coroutines / metadata (used by several RN libs internally)
# ---------------------------------------------------------------------------
-keepattributes *Annotation*, InnerClasses, EnclosingMethod, Signature, Exceptions
-dontwarn kotlinx.coroutines.**
-dontwarn org.jetbrains.annotations.**

# ---------------------------------------------------------------------------
# Stack-trace readability
# ---------------------------------------------------------------------------
# Keep generic signatures + checked exceptions for nicer stack traces in
# Crashlytics and Play Console without sacrificing meaningful shrink.
-keepattributes Signature
-keepattributes Exceptions
-keepattributes InnerClasses
-keepattributes EnclosingMethod
-keepattributes RuntimeVisibleAnnotations
-keepattributes RuntimeVisibleParameterAnnotations
