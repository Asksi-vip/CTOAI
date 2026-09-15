package com.ctoai.factory;

import java.util.ArrayList;
import java.util.List;

/**
 * مولّد مشاريع أندرويد — ترجمة مباشرة لمنطق منصة BuildAI (generator.ts)
 * يشتغل كامل داخل الجوال بدون سيرفر.
 */
public class ProjectGenerator {

    public static class GeneratedFile {
        public final String path;
        public final String content;
        public GeneratedFile(String path, String content) {
            this.path = path;
            this.content = content;
        }
    }

    public static class AppSpec {
        public String appName;
        public String appType;
        public String description;
        public String primaryColor;
        public List<String> features;
        public String welcomeText;
    }

    // ---------------- helpers ----------------

    static String sanitizePackage(String name) {
        StringBuilder sb = new StringBuilder();
        for (char c : name.toLowerCase().toCharArray()) {
            if ((c >= 'a' && c <= 'z') || (c >= '0' && c <= '9')) sb.append(c);
        }
        String clean = sb.toString();
        return clean.length() > 0 ? clean : "myapp";
    }

    static String colorToAndroid(String hex) {
        String m = hex.replace("#", "");
        return "#FF" + (m.length() == 6 ? m.toUpperCase() : "22C55E");
    }

    static String shade(String hex, double factor) {
        String m = hex.replace("#", "");
        int num;
        try {
            num = (int) Long.parseLong(m.length() == 6 ? m : "22C55E", 16);
        } catch (Exception e) {
            num = (int) Long.parseLong("22C55E", 16);
        }
        int r = (int) Math.min(255, Math.round(((num >> 16) & 255) * factor));
        int g = (int) Math.min(255, Math.round(((num >> 8) & 255) * factor));
        int b = (int) Math.min(255, Math.round((num & 255) * factor));
        return String.format("#FF%06X", (r << 16) | (g << 8) | b);
    }

    /** Escape user text for XML resources — & first to avoid double-escaping. */
    static String xmlEscape(String s) {
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }

    // ---------------- templates ----------------

    static String buildWorkflow() {
        return """
name: Build APK

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: '17'

      - name: Setup Gradle
        uses: gradle/actions/setup-gradle@v3

      - name: Grant execute permission for gradlew
        run: chmod +x gradlew

      - name: Build Debug APK
        run: ./gradlew assembleDebug --no-daemon

      - name: Upload APK artifact
        uses: actions/upload-artifact@v4
        with:
          name: app-debug-apk
          path: app/build/outputs/apk/debug/app-debug.apk
""";
    }

    static String gitignore() {
        return """
*.iml
.gradle
/local.properties
/.idea
.DS_Store
/build
/captures
.externalNativeBuild
.cxx
app/build/
""";
    }

    static String settingsGradle(String pkg) {
        return """
pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}
rootProject.name = "__PKG__"
include ':app'
""".replace("__PKG__", pkg);
    }

    static String rootBuildGradle() {
        return """
plugins {
    id 'com.android.application' version '8.4.1' apply false
}
""";
    }

    static String gradleWrapperProps() {
        return """
org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
android.useAndroidX=true
android.enableJetifier=true
android.nonTransitiveRClass=true
distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\\://services.gradle.org/distributions/gradle-8.7-bin.zip
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
""";
    }

    static String gradlewScript() {
        return """
#!/bin/sh
# Gradle bootstrap — downloads Gradle 8.7 and runs the requested task.
echo "Downloading Gradle 8.7..."
curl -sL https://services.gradle.org/distributions/gradle-8.7-bin.zip -o /tmp/gradle.zip
unzip -q -o /tmp/gradle.zip -d /tmp
/tmp/gradle-8.7/bin/gradle "$@"
""";
    }

    static String appBuildGradle(String pkg) {
        return """
plugins {
    id 'com.android.application'
}

android {
    namespace '__PKG__'
    compileSdk 34

    defaultConfig {
        applicationId "__PKG__"
        minSdk 24
        targetSdk 34
        versionCode 1
        versionName "1.0"
    }

    buildTypes {
        release {
            minifyEnabled false
        }
    }
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_17
        targetCompatibility JavaVersion.VERSION_17
    }
}

dependencies {
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'com.google.android.material:material:1.11.0'
    implementation 'androidx.recyclerview:recyclerview:1.3.2'
    implementation 'androidx.constraintlayout:constraintlayout:2.1.4'
}
""".replace("__PKG__", pkg);
    }

    static String manifest(String appName) {
        return """
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <application
        android:allowBackup="true"
        android:icon="@drawable/ic_launcher"
        android:label="@string/app_name"
        android:theme="@style/Theme.BuildAI">
        <activity
            android:name=".MainActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>

</manifest>
""".replace("__APPNAME__", appName);
    }

    static String launcherIconXml() {
        return """
<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">

    <path
        android:fillColor="@color/primary"
        android:pathData="M0,0h108v108h-108z" />

    <path
        android:fillColor="#FFFFFF"
        android:pathData="M54,26 L72,80 L54,68 L36,80 Z" />

    <path
        android:fillColor="@color/primary_light"
        android:pathData="M54,30 m-6,0 a6,6 0 1,1 12,0 a6,6 0 1,1 -12,0" />

</vector>
""";
    }

    static String stringsXml(String appName, String welcome, String screenTitle, List<String> features) {
        StringBuilder sb = new StringBuilder();
        sb.append("<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<resources>\n");
        sb.append("    <string name=\"app_name\">").append(xmlEscape(appName)).append("</string>\n");
        sb.append("    <string name=\"welcome_text\">").append(xmlEscape(welcome)).append("</string>\n");
        sb.append("    <string name=\"screen_title\">").append(xmlEscape(screenTitle)).append("</string>\n");
        sb.append("    <string name=\"add_hint\">أضف عنصر جديد…</string>\n");
        sb.append("    <string name=\"add_btn\">إضافة</string>\n");
        for (int i = 0; i < features.size(); i++) {
            sb.append("    <string name=\"feature_").append(i + 1).append("\">")
              .append(xmlEscape(features.get(i))).append("</string>\n");
        }
        sb.append("</resources>\n");
        return sb.toString();
    }

    static String colorsXml(String hex) {
        return """
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="primary">__PRIMARY__</color>
    <color name="primary_dark">__DARK__</color>
    <color name="primary_light">__LIGHT__</color>
    <color name="white">#FFFFFFFF</color>
    <color name="black">#FF000000</color>
    <color name="background">#FFF7F8FA</color>
    <color name="card">#FFFFFFFF</color>
</resources>
"""
            .replace("__PRIMARY__", colorToAndroid(hex))
            .replace("__DARK__", shade(hex, 0.65))
            .replace("__LIGHT__", shade(hex, 1.35));
    }

    static String themesXml() {
        return """
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="Theme.BuildAI" parent="Theme.MaterialComponents.DayNight.NoActionBar">
        <item name="colorPrimary">@color/primary</item>
        <item name="colorPrimaryDark">@color/primary_dark</item>
        <item name="colorAccent">@color/primary</item>
        <item name="android:windowBackground">@color/background</item>
    </style>
</resources>
""";
    }

    static String activityMainXml() {
        return """
<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:background="@color/background">

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="vertical"
        android:padding="24dp"
        android:background="@color/primary">

        <TextView
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="@string/app_name"
            android:textColor="@color/white"
            android:textSize="26sp"
            android:textStyle="bold" />

        <TextView
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_marginTop="8dp"
            android:text="@string/welcome_text"
            android:textColor="@color/primary_light"
            android:textSize="14sp" />

    </LinearLayout>

    <TextView
        android:id="@+id/counterText"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_gravity="center"
        android:layout_marginTop="20dp"
        android:text="0"
        android:textColor="@color/primary"
        android:textSize="48sp"
        android:textStyle="bold" />

    <androidx.recyclerview.widget.RecyclerView
        android:id="@+id/itemsList"
        android:layout_width="match_parent"
        android:layout_height="0dp"
        android:layout_weight="1"
        android:layout_marginTop="12dp"
        android:padding="12dp"
        android:clipToPadding="false" />

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="horizontal"
        android:padding="12dp"
        android:gravity="center_vertical">

        <EditText
            android:id="@+id/inputField"
            android:layout_width="0dp"
            android:layout_height="48dp"
            android:layout_weight="1"
            android:hint="@string/add_hint"
            android:padding="12dp"
            android:background="@color/card"
            android:inputType="text" />

        <Button
            android:id="@+id/addButton"
            android:layout_width="wrap_content"
            android:layout_height="48dp"
            android:layout_marginStart="8dp"
            android:backgroundTint="@color/primary"
            android:text="@string/add_btn"
            android:textColor="@color/white" />

    </LinearLayout>

</LinearLayout>
""";
    }

    static String itemRowXml() {
        return """
<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:orientation="horizontal"
    android:gravity="center_vertical"
    android:layout_marginBottom="8dp"
    android:padding="16dp"
    android:background="@color/card">

    <TextView
        android:id="@+id/itemText"
        android:layout_width="0dp"
        android:layout_height="wrap_content"
        android:layout_weight="1"
        android:textSize="16sp"
        android:textColor="@color/black" />

    <TextView
        android:id="@+id/deleteBtn"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="✕"
        android:textColor="#FFCC3333"
        android:textSize="18sp"
        android:padding="8dp" />

</LinearLayout>
""";
    }

    static String mainActivityJava(String pkg, List<String> features, String screenTitle) {
        StringBuilder featureComments = new StringBuilder();
        for (String f : features) featureComments.append("    // ✓ ").append(f).append('\n');
        return """
package __PKG__;

import android.os.Bundle;
import android.text.TextUtils;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import java.util.ArrayList;
import java.util.List;

/**
 * __TITLE__ — generated by BuildAI 🤖
 */
public class MainActivity extends AppCompatActivity {

    private final List<String> items = new ArrayList<>();
    private ItemsAdapter adapter;
    private TextView counterText;

__FEATURES__
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        counterText = findViewById(R.id.counterText);
        EditText inputField = findViewById(R.id.inputField);
        View addButton = findViewById(R.id.addButton);
        RecyclerView list = findViewById(R.id.itemsList);

        adapter = new ItemsAdapter();
        list.setLayoutManager(new LinearLayoutManager(this));
        list.setAdapter(adapter);

        seedItems();

        addButton.setOnClickListener(v -> {
            String text = inputField.getText().toString().trim();
            if (TextUtils.isEmpty(text)) {
                Toast.makeText(this, "اكتب شي أولاً 🙂", Toast.LENGTH_SHORT).show();
                return;
            }
            items.add(0, text);
            adapter.notifyItemInserted(0);
            list.scrollToPosition(0);
            inputField.setText("");
            updateCounter();
        });
    }

    private void seedItems() {
        for (int i = 1; i <= 3; i++) {
            items.add("عنصر تجريبي " + i);
        }
        adapter.notifyDataSetChanged();
        updateCounter();
    }

    private void updateCounter() {
        counterText.setText(String.valueOf(items.size()));
    }

    private void removeItem(int position) {
        if (position >= 0 && position < items.size()) {
            items.remove(position);
            adapter.notifyItemRemoved(position);
            updateCounter();
        }
    }

    private class ItemsAdapter extends RecyclerView.Adapter<ItemsAdapter.Holder> {

        @NonNull
        @Override
        public Holder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            View view = LayoutInflater.from(parent.getContext())
                    .inflate(R.layout.item_row, parent, false);
            return new Holder(view);
        }

        @Override
        public void onBindViewHolder(@NonNull Holder holder, int position) {
            holder.itemText.setText(items.get(position));
            holder.deleteBtn.setOnClickListener(v -> removeItem(holder.getBindingAdapterPosition()));
        }

        @Override
        public int getItemCount() {
            return items.size();
        }

        class Holder extends RecyclerView.ViewHolder {
            TextView itemText;
            TextView deleteBtn;

            Holder(View itemView) {
                super(itemView);
                itemText = itemView.findViewById(R.id.itemText);
                deleteBtn = itemView.findViewById(R.id.deleteBtn);
            }
        }
    }
}
"""
            .replace("__PKG__", pkg)
            .replace("__TITLE__", screenTitle)
            .replace("__FEATURES__", featureComments.toString());
    }

    static String readme(String appName, String description, List<String> features) {
        StringBuilder sb = new StringBuilder();
        sb.append("# ").append(appName).append(" 📱\n\n");
        sb.append("> ").append(description == null || description.isEmpty()
                ? "تطبيق أندرويد تم توليده بالذكاء الاصطناعي" : description);
        sb.append(" — مولّد تلقائياً بواسطة **CTO AI Factory** 📱🏭\n\n");
        sb.append("## ✨ المميزات\n");
        for (String f : features) sb.append("- ").append(f).append('\n');
        sb.append("""
            
            ## 🏗️ بناء الـ APK تلقائياً
            هذا المستودع يحتوي على GitHub Actions Workflow جاهز:
            
            1. افتح تبويب **Actions** بهذا المستودع
            2. انتظر انتهاء الـ workflow **Build APK**
            3. نزّل **app-debug-apk** من قسم Artifacts
            4. ثبّت الـ APK على هاتفك 🎉
            
            ## 🛠️ التقنيات
            - Java + Android SDK (minSdk 24)
            - Gradle 8.7 / AGP 8.4.1
            - Material Components
            - RecyclerView لعرض العناصر
            """);
        return sb.toString();
    }

    // ---------------- main entry ----------------

    public static List<GeneratedFile> generate(AppSpec spec) {
        String pkg = "com.buildai." + sanitizePackage(spec.appName);
        List<GeneratedFile> files = new ArrayList<>();

        files.add(new GeneratedFile(".github/workflows/build-apk.yml", buildWorkflow()));
        files.add(new GeneratedFile(".gitignore", gitignore()));
        files.add(new GeneratedFile("settings.gradle", settingsGradle(pkg)));
        files.add(new GeneratedFile("build.gradle", rootBuildGradle()));
        files.add(new GeneratedFile("gradle.properties", gradleWrapperProps()));
        files.add(new GeneratedFile("gradlew", gradlewScript()));
        files.add(new GeneratedFile("app/build.gradle", appBuildGradle(pkg)));
        files.add(new GeneratedFile("app/src/main/AndroidManifest.xml", manifest(spec.appName)));
        files.add(new GeneratedFile(
                "app/src/main/java/" + pkg.replace(".", "/") + "/MainActivity.java",
                mainActivityJava(pkg, spec.features, Planner.screenTitle(spec.appType, spec.appName))));
        files.add(new GeneratedFile("app/src/main/res/layout/activity_main.xml", activityMainXml()));
        files.add(new GeneratedFile("app/src/main/res/layout/item_row.xml", itemRowXml()));
        files.add(new GeneratedFile("app/src/main/res/drawable/ic_launcher.xml", launcherIconXml()));
        files.add(new GeneratedFile("app/src/main/res/values/strings.xml",
                stringsXml(spec.appName, spec.welcomeText,
                        Planner.screenTitle(spec.appType, spec.appName), spec.features)));
        files.add(new GeneratedFile("app/src/main/res/values/colors.xml", colorsXml(spec.primaryColor)));
        files.add(new GeneratedFile("app/src/main/res/values/themes.xml", themesXml()));
        files.add(new GeneratedFile("README.md", readme(spec.appName, spec.description, spec.features)));

        return files;
    }
}
