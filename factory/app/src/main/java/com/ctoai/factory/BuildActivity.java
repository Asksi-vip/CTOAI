package com.ctoai.factory;

import android.app.Activity;
import android.content.ContentValues;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.view.View;
import android.widget.Button;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

/**
 * شاشة التصنيع: توليد المشروع محلياً → رفعه ع GitHub → متابعة البناء →
 * تحميل الـ APK الجاهز إلى مجلد التنزيلات في الجوال.
 */
public class BuildActivity extends Activity {

    private Prefs prefs;
    private TextView statusText;
    private TextView logText;
    private ScrollView logScroll;
    private Button downloadBtn;
    private Button openRepoBtn;

    private String repoFull;
    private String repoUrl;
    private volatile boolean downloading = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_build);
        prefs = new Prefs(this);

        statusText = findViewById(R.id.statusText);
        logText = findViewById(R.id.logText);
        logScroll = findViewById(R.id.logScroll);
        downloadBtn = findViewById(R.id.downloadBtn);
        openRepoBtn = findViewById(R.id.openRepoBtn);

        downloadBtn.setEnabled(false);
        downloadBtn.setOnClickListener(v -> downloadApk());
        openRepoBtn.setOnClickListener(v -> {
            if (repoUrl != null) {
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(repoUrl)));
                } catch (Exception ignored) { }
            }
        });

        final String appName = getIntent().getStringExtra("appName");
        final String appType = getIntent().getStringExtra("appType");
        final String description = getIntent().getStringExtra("description");

        new Thread(() -> manufacture(appName, appType, description)).start();
    }

    private void log(final String line) {
        log(line, "info");
    }

    private void log(final String line, final String kind) {
        runOnUiThread(() -> {
            int color = kind.equals("ok") ? 0xFF34D399 : kind.equals("err") ? 0xFFF87171 : 0xFF9CC7AD;
            int start = logText.length();
            logText.append(line + "\n");
            CharSequence cs = logText.getText();
            if (cs instanceof android.text.Editable) {
                ((android.text.Editable) cs).setSpan(
                        new android.text.style.ForegroundColorSpan(color), start, logText.length(), 0);
            }
            logScroll.post(() -> logScroll.smoothScrollTo(0, logText.getBottom()));
        });
    }

    private void setStatus(final String s, final int color) {
        runOnUiThread(() -> {
            statusText.setText(s);
            statusText.setTextColor(color);
        });
    }

    private void manufacture(String appName, String appType, String description) {
        final String token = prefs.token();
        if (token == null) {
            setStatus("ماكو توكن — ارجع وسجّل دخول", 0xFFF87171);
            return;
        }
        try {
            setStatus("⚙️ جاري التصنيع…", 0xFFFBBF24);

            log("🧠 تخطيط التطبيق حسب اختيارك…");
            ProjectGenerator.AppSpec spec = Planner.plan(appName, appType, description);
            log("✅ النوع: " + Planner.byKey(appType).label + " — اللون: " + spec.primaryColor);

            log("🏗️ توليد مشروع أندرويد كامل داخل جوالك…");
            List<ProjectGenerator.GeneratedFile> files = ProjectGenerator.generate(spec);
            log("✅ انطولد " + files.size() + " ملف (Java + XML + Gradle + Actions)");

            // اسم مستودع فريد
            String slug = appName.replaceAll("[^a-zA-Z0-9]+", "-").toLowerCase();
            while (slug.startsWith("-") || slug.isEmpty()) {
                slug = slug.replaceFirst("^-", "");
                if (slug.isEmpty()) slug = "my-app";
            }
            final String repoName = slug + "-" + randomSuffix();
            log("🐙 المستودع: " + repoName);

            GitHubApi.PushResult result = GitHubApi.pushProject(
                    token, prefs.userLogin(), repoName, description, files,
                    step -> log("🐙 " + step));

            repoFull = result.repoFullName;
            repoUrl = result.htmlUrl;
            prefs.addRepo(repoFull, repoUrl);

            log("✅ انرفع ع GitHub بنجاح!", "ok");
            log("🚀 GitHub Actions يبني الـ APK هسه (≈ 4 دقائق)…");
            setStatus("🚀 البناء شغال — راح أراقبه", 0xFF34D399);
            pollBuild();
        } catch (Exception e) {
            log("❌ " + (e.getMessage() != null ? e.getMessage() : "خطأ غير متوقع"), "err");
            setStatus("فشل — شوف السجل فوق", 0xFFF87171);
        }
    }

    private String randomSuffix() {
        String alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 4; i++) {
            sb.append(alphabet.charAt((int) (Math.random() * alphabet.length())));
        }
        return sb.toString();
    }

    private void pollBuild() {
        final String token = prefs.token();
        new Thread(() -> {
            for (int i = 0; i < 120; i++) { // حتى 20 دقيقة
                try {
                    Thread.sleep(10000);
                } catch (InterruptedException e) {
                    return;
                }
                try {
                    GitHubApi.RunInfo info = GitHubApi.latestRun(token, repoFull);
                    if (info == null) continue;
                    if ("completed".equals(info.status)) {
                        if ("success".equals(info.conclusion)) {
                            log("✅ البناء نجح — الـ APK جاهز!", "ok");
                            setStatus("✅ الـ APK جاهز — دوس تحميل", 0xFF34D399);
                            runOnUiThread(() -> downloadBtn.setEnabled(true));
                        } else {
                            log("❌ فشل البناء — شوف السجلات بـ Actions", "err");
                            setStatus("❌ فشل البناء", 0xFFF87171);
                        }
                        return;
                    } else {
                        log("⏳ الحالة: " + info.status + "…");
                    }
                } catch (Exception e) {
                    log("⚠️ تعذر جلب الحالة — أعيد المحاولة…", "err");
                }
            }
        }).start();
    }

    /** يحمّل artifact الـ APK ويفكه إلى مجلد التنزيلات */
    private void downloadApk() {
        if (downloading) return;
        downloading = true;
        downloadBtn.setEnabled(false);
        downloadBtn.setText("جاري التحميل…");
        final String token = prefs.token();
        new Thread(() -> {
            try {
                log("📥 أجيب رابط الـ artifact…");
                String url = GitHubApi.findApkArtifactUrl(token, repoFull);
                if (url == null) throw new Exception("ما لقيت artifact الـ APK");

                final File apkFile = new File(getCacheDir(), "factory-apk.zip");
                GitHubApi.streamArtifact(token, url, input -> {
                    try (FileOutputStream out = new FileOutputStream(apkFile)) {
                        byte[] buf = new byte[8192];
                        int n;
                        while ((n = input.read(buf)) > 0) out.write(buf, 0, n);
                    }
                });
                log("🗜️ أفك الضغط وأحفظ الـ APK…");

                String apkName = repoFull.replace("/", "-") + ".apk";
                String savedWhere = extractApk(apkName, apkFile);
                apkFile.delete();

                log("✅ انحفظ: " + savedWhere, "ok");
                setStatus("🎉 الـ APK انحفظ بالتنزيلات — نصبه هسه!", 0xFF34D399);
                runOnUiThread(() -> {
                    downloadBtn.setText("تم التحميل ✅");
                    Toast.makeText(this, "انحفظ بالتنزيلات: " + apkName, Toast.LENGTH_LONG).show();
                });
            } catch (Exception e) {
                log("❌ فشل التحميل: " + e.getMessage(), "err");
                runOnUiThread(() -> {
                    downloadBtn.setEnabled(true);
                    downloadBtn.setText(R.string.download_apk);
                });
            } finally {
                downloading = false;
            }
        }).start();
    }

    private String extractApk(String name, File zipFile) throws Exception {
        try (ZipInputStream zin = new ZipInputStream(new java.io.FileInputStream(zipFile))) {
            ZipEntry entry;
            while ((entry = zin.getNextEntry()) != null) {
                if (entry.getName().endsWith(".apk")) {
                    if (Build.VERSION.SDK_INT >= 29) {
                        ContentValues cv = new ContentValues();
                        cv.put(MediaStore.Downloads.DISPLAY_NAME, name);
                        cv.put(MediaStore.Downloads.MIME_TYPE, "application/vnd.android.package-archive");
                        Uri uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv);
                        if (uri == null) throw new Exception("تعذر الإنشاء بالتنزيلات");
                        try (OutputStream os = getContentResolver().openOutputStream(uri)) {
                            copy(zin, os);
                        }
                        return "Downloads/" + name;
                    } else {
                        File dir = getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
                        if (dir == null) dir = getFilesDir();
                        File out = new File(dir, name);
                        try (OutputStream os = new FileOutputStream(out)) {
                            copy(zin, os);
                        }
                        return out.getAbsolutePath();
                    }
                }
            }
        }
        throw new Exception("الـ artifact ماكو داخل APK");
    }

    private void copy(InputStream in, OutputStream out) throws Exception {
        byte[] buf = new byte[8192];
        int n;
        while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
    }
}
