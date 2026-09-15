package com.ctoai.factory;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONObject;

/** تخزين محلي بسيط — التوكن يبقى داخل الجوال بس. */
public class Prefs {

    private static final String FILE = "ctoai_prefs";

    private final SharedPreferences sp;

    public Prefs(Context ctx) {
        sp = ctx.getApplicationContext().getSharedPreferences(FILE, Context.MODE_PRIVATE);
    }

    public String token() {
        return sp.getString("token", null);
    }

    public void setToken(String token) {
        sp.edit().putString("token", token).apply();
    }

    public String userLogin() {
        return sp.getString("user_login", null);
    }

    public String userName() {
        return sp.getString("user_name", null);
    }

    public void setUser(GitHubApi.GhUser u) {
        sp.edit()
                .putString("user_login", u.login)
                .putString("user_name", u.name != null ? u.name : u.login)
                .apply();
    }

    public void clear() {
        sp.edit().clear().apply();
    }

    /** سجل آخر 10 مستودعات أنشئت من التطبيق */
    public void addRepo(String fullName, String url) {
        try {
            JSONArray arr = new JSONArray(sp.getString("repos", "[]"));
            JSONArray next = new JSONArray();
            JSONObject item = new JSONObject();
            item.put("name", fullName);
            item.put("url", url);
            next.put(item);
            for (int i = 0; i < arr.length() && next.length() < 10; i++) {
                JSONObject prev = arr.getJSONObject(i);
                if (!fullName.equals(prev.optString("name"))) next.put(prev);
            }
            sp.edit().putString("repos", next.toString()).apply();
        } catch (Exception ignored) { }
    }

    public JSONArray repos() {
        try {
            return new JSONArray(sp.getString("repos", "[]"));
        } catch (Exception e) {
            return new JSONArray();
        }
    }
}
