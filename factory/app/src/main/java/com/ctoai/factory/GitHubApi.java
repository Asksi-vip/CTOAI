package com.ctoai.factory;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * GitHub REST API — نفس منطق المنصة (github.ts): إنشاء مستودع، blobs،
 * tree، commit، ثم تحديث الفرع (وهذا يُشغّل بناء الـ APK تلقائياً).
 * Java صافية — java.net + org.json فقط، بدون أي مكتبات خارجية.
 */
public class GitHubApi {

    private static final String API = "https://api.github.com";

    public static class ApiException extends Exception {
        public final int code;
        ApiException(int code, String message) {
            super(friendly(code, message));
            this.code = code;
        }
    }

    public static class GhUser {
        public String login;
        public String name;
        public String avatarUrl;
    }

    public static class PushResult {
        public String htmlUrl;
        public String repoFullName;
    }

    public static class RunInfo {
        public String status;      // queued | in_progress | completed
        public String conclusion;  // success | failure | null
        public String htmlUrl;
    }

    public interface Progress {
        void onStep(String message);
    }

    private static String friendly(int code, String raw) {
        String msg = raw;
        try {
            JSONObject o = new JSONObject(raw);
            msg = o.optString("message", raw);
        } catch (Exception ignored) { }
        if (code == 401) return "التوكن غير صالح أو منتهي (401)";
        if (code == 403) return "التوكن ماكو إله صلاحية هاذي (403) — تحتاج repo و workflow";
        if (code == 404) return "ماكو شي موجود (404)";
        return "خطأ من GitHub (" + code + "): " + msg;
    }

    private static String readAll(InputStream in) throws Exception {
        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        byte[] buf = new byte[8192];
        int n;
        while ((n = in.read(buf)) > 0) bos.write(buf, 0, n);
        return bos.toString("UTF-8");
    }

    private static HttpURLConnection open(String method, String url, String token) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setRequestMethod(method);
        c.setConnectTimeout(20000);
        c.setReadTimeout(60000);
        c.setRequestProperty("Authorization", "Bearer " + token);
        c.setRequestProperty("Accept", "application/vnd.github+json");
        c.setRequestProperty("Content-Type", "application/json");
        c.setRequestProperty("User-Agent", "CTOAI-Factory");
        return c;
    }

    private static JSONObject httpJson(String method, String url, String token, JSONObject body) throws Exception {
        HttpURLConnection c = open(method, url, token);
        if (body != null) {
            c.setDoOutput(true);
            byte[] data = body.toString().getBytes(StandardCharsets.UTF_8);
            c.setFixedLengthStreamingMode(data.length);
            try (OutputStream os = c.getOutputStream()) {
                os.write(data);
            }
        }
        int code = c.getResponseCode();
        String text = readAll(code < 400 ? c.getInputStream() : c.getErrorStream());
        c.disconnect();
        if (code >= 400) throw new ApiException(code, text);
        return text.isEmpty() ? new JSONObject() : new JSONObject(text);
    }

    /** GET JSON مع دعم رد غير-JSON (مثل artifact zip يعاد توجيهه) */
    private static JSONArray httpJsonArray(String method, String url, String token) throws Exception {
        HttpURLConnection c = open(method, url, token);
        int code = c.getResponseCode();
        String text = readAll(code < 400 ? c.getInputStream() : c.getErrorStream());
        c.disconnect();
        if (code >= 400) throw new ApiException(code, text);
        return new JSONArray(text);
    }

    // ---------------- auth ----------------

    public static GhUser verifyToken(String token) throws Exception {
        JSONObject u = httpJson("GET", API + "/user", token, null);
        GhUser user = new GhUser();
        user.login = u.getString("login");
        user.name = u.optString("name", user.login);
        user.avatarUrl = u.optString("avatar_url", "");
        return user;
    }

    // ---------------- push ----------------

    public static PushResult pushProject(String token, String username, String repoName,
                                         String description, List<ProjectGenerator.GeneratedFile> files,
                                         Progress progress) throws Exception {
        // 1) create repo with auto_init (Git Data API يرفض المستودعات الفاضية بـ 409)
        progress.onStep("إنشاء المستودع " + repoName + " …");
        JSONObject repo;
        try {
            JSONObject body = new JSONObject();
            body.put("name", repoName);
            body.put("description", description == null || description.isEmpty()
                    ? "Built with CTO AI Factory 📱" : description);
            body.put("private", false);
            body.put("auto_init", true);
            repo = httpJson("POST", API + "/user/repos", token, body);
        } catch (ApiException e) {
            if (e.code != 422) throw e;
            progress.onStep("المستودع موجود — إعادة استخدامه…");
            repo = httpJson("GET", API + "/repos/" + username + "/" + repoName, token, null);
            if (!repo.has("size") || repo.optInt("size", 0) == 0) {
                JSONObject seed = new JSONObject();
                seed.put("message", "chore: init");
                seed.put("content", android.util.Base64.encodeToString(
                        "# Initializing...".getBytes(StandardCharsets.UTF_8), android.util.Base64.NO_WRAP));
                httpJson("PUT", API + "/repos/" + repo.getString("full_name") + "/contents/README.md", token, seed);
                repo = httpJson("GET", API + "/repos/" + repo.getString("full_name"), token, null);
            }
        }

        String repoFull = repo.optString("full_name", username + "/" + repoName);
        String htmlUrl = repo.optString("html_url", "https://github.com/" + repoFull);
        String branch = repo.optString("default_branch", "main");

        // 2) base commit + tree
        progress.onStep("تحضير الفرع " + branch + "…");
        JSONObject ref = httpJson("GET", API + "/repos/" + repoFull + "/git/ref/heads/" + branch, token, null);
        String baseCommitSha = ref.getJSONObject("object").getString("sha");
        JSONObject baseCommit = httpJson("GET", API + "/repos/" + repoFull + "/git/commits/" + baseCommitSha, token, null);
        String baseTreeSha = baseCommit.getJSONObject("tree").getString("sha");

        // 3) blobs
        JSONArray tree = new JSONArray();
        int done = 0;
        for (ProjectGenerator.GeneratedFile f : files) {
            JSONObject blobBody = new JSONObject();
            blobBody.put("content", f.content);
            blobBody.put("encoding", "utf-8");
            JSONObject blob = httpJson("POST", API + "/repos/" + repoFull + "/git/blobs", token, blobBody);
            JSONObject entry = new JSONObject();
            entry.put("path", f.path);
            entry.put("mode", "100644");
            entry.put("type", "blob");
            entry.put("sha", blob.getString("sha"));
            tree.put(entry);
            done++;
            progress.onStep("رفع الملفات… " + done + "/" + files.size());
        }

        // 4) tree
        progress.onStep("تجميع الشجرة النهائية…");
        JSONObject treeBody = new JSONObject();
        treeBody.put("base_tree", baseTreeSha);
        treeBody.put("tree", tree);
        JSONObject newTree = httpJson("POST", API + "/repos/" + repoFull + "/git/trees", token, treeBody);

        // 5) commit
        progress.onStep("إنشاء الكومِت…");
        JSONObject commitBody = new JSONObject();
        commitBody.put("message", "🚀 Generated by CTO AI Factory (mobile)");
        commitBody.put("tree", newTree.getString("sha"));
        commitBody.put("parents", new JSONArray().put(baseCommitSha));
        JSONObject commit = httpJson("POST", API + "/repos/" + repoFull + "/git/commits", token, commitBody);

        // 6) fast-forward — هذا يُشغّل workflow البناء تلقائياً
        progress.onStep("تحديث الفرع وتشغيل البناء…");
        JSONObject patch = new JSONObject();
        patch.put("sha", commit.getString("sha"));
        HttpURLConnection c = open("PATCH", API + "/repos/" + repoFull + "/git/refs/heads/" + branch, token);
        c.setDoOutput(true);
        byte[] data = patch.toString().getBytes(StandardCharsets.UTF_8);
        c.setFixedLengthStreamingMode(data.length);
        try (OutputStream os = c.getOutputStream()) { os.write(data); }
        int code = c.getResponseCode();
        readAll(code < 400 ? c.getInputStream() : c.getErrorStream());
        c.disconnect();
        if (code >= 400) throw new ApiException(code, "{\"message\":\"فشل تحديث الفرع\"}");

        PushResult result = new PushResult();
        result.htmlUrl = htmlUrl;
        result.repoFullName = repoFull;
        return result;
    }

    // ---------------- build status ----------------

    public static RunInfo latestRun(String token, String repoFull) throws Exception {
        JSONObject data = httpJson("GET", API + "/repos/" + repoFull + "/actions/runs?per_page=1", token, null);
        JSONArray runs = data.optJSONArray("workflow_runs");
        if (runs == null || runs.length() == 0) return null;
        JSONObject run = runs.getJSONObject(0);
        RunInfo info = new RunInfo();
        info.status = run.optString("status", "");
        info.conclusion = run.isNull("conclusion") ? null : run.optString("conclusion");
        info.htmlUrl = run.optString("html_url", "https://github.com/" + repoFull + "/actions");
        return info;
    }

    // ---------------- artifact download ----------------

    public interface ArtifactStream {
        void start(InputStream input) throws Exception;
    }

    /** يجد آخر artifact اسمه app-debug-apk ويرجع رابط التحميل أو null */
    public static String findApkArtifactUrl(String token, String repoFull) throws Exception {
        JSONObject data = httpJson("GET", API + "/repos/" + repoFull + "/actions/artifacts?per_page=10", token, null);
        JSONArray artifacts = data.optJSONArray("artifacts");
        if (artifacts == null) return null;
        for (int i = 0; i < artifacts.length(); i++) {
            JSONObject a = artifacts.getJSONObject(i);
            if ("app-debug-apk".equals(a.optString("name")) && !a.optBoolean("expired", false)) {
                return a.optString("archive_download_url", null);
            }
        }
        return null;
    }

    /** يبث محتوى artifact zip عبر الكولباك (يُفك الضغط عند المستقبل) */
    public static void streamArtifact(String token, String archiveUrl, ArtifactStream consumer) throws Exception {
        HttpURLConnection c = open("GET", archiveUrl, token);
        c.setInstanceFollowRedirects(true);
        int code = c.getResponseCode();
        if (code >= 400) {
            String err = readAll(c.getErrorStream());
            c.disconnect();
            throw new ApiException(code, err);
        }
        try (InputStream in = c.getInputStream()) {
            consumer.start(in);
        } finally {
            c.disconnect();
        }
    }
}
