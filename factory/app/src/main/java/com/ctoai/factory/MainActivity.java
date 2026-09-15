package com.ctoai.factory;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * الشاشة الرئيسية: تسجيل دخول GitHub + استمارة إنشاء مشروع + قائمة مشاريعي.
 * واجهة Java أصيلة — بدون WebView وبدون مكتبات خارجية.
 */
public class MainActivity extends Activity {

    private Prefs prefs;

    private LinearLayout loginSection;
    private LinearLayout factorySection;
    private EditText tokenInput;
    private EditText appNameInput;
    private EditText descInput;
    private Spinner typeSpinner;
    private Button loginBtn;
    private TextView loginError;
    private TextView greeting;
    private LinearLayout reposList;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        prefs = new Prefs(this);

        loginSection = findViewById(R.id.loginSection);
        factorySection = findViewById(R.id.factorySection);
        tokenInput = findViewById(R.id.tokenInput);
        appNameInput = findViewById(R.id.appNameInput);
        descInput = findViewById(R.id.descInput);
        typeSpinner = findViewById(R.id.typeSpinner);
        loginBtn = findViewById(R.id.loginBtn);
        loginError = findViewById(R.id.loginError);
        greeting = findViewById(R.id.greeting);
        reposList = findViewById(R.id.reposList);

        // Spinner لأنواع التطبيقات
        String[] labels = new String[Planner.TYPES.size()];
        for (int i = 0; i < Planner.TYPES.size(); i++) {
            Planner.AppType t = Planner.TYPES.get(i);
            labels[i] = t.emoji + "  " + t.label;
        }
        ArrayAdapter<String> adapter = new ArrayAdapter<String>(this, android.R.layout.simple_spinner_item, labels) {
            @Override
            public View getDropDownView(int position, View convertView, ViewGroup parent) {
                View v = super.getDropDownView(position, convertView, parent);
                ((TextView) v).setPadding(24, 20, 24, 20);
                return v;
            }
        };
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        typeSpinner.setAdapter(adapter);

        loginBtn.setOnClickListener(v -> doLogin());
        findViewById(R.id.createBtn).setOnClickListener(v -> createProject());
        findViewById(R.id.logoutBtn).setOnClickListener(v -> {
            prefs.clear();
            applyAuthState();
        });

        applyAuthState();
        renderRepos();
    }

    private void applyAuthState() {
        boolean logged = prefs.token() != null;
        loginSection.setVisibility(logged ? View.GONE : View.VISIBLE);
        factorySection.setVisibility(logged ? View.VISIBLE : View.GONE);
        if (logged) {
            String name = prefs.userName();
            greeting.setText("هلا " + name + " 👋 المصنع جاهز — وصف تطبيقك ودوس سوي");
        }
    }

    private void doLogin() {
        final String token = tokenInput.getText().toString().trim();
        if (token.isEmpty()) {
            loginError.setText("حط التوكن أولاً");
            return;
        }
        loginBtn.setEnabled(false);
        loginBtn.setText("جاري التحقق…");
        loginError.setText("");
        new Thread(() -> {
            String err = null;
            try {
                GitHubApi.GhUser user = GitHubApi.verifyToken(token);
                prefs.setToken(token);
                prefs.setUser(user);
            } catch (Exception e) {
                err = e.getMessage() != null ? e.getMessage() : "فشل الاتصال — تأكد من الإنترنت";
            }
            final String error = err;
            runOnUiThread(() -> {
                loginBtn.setEnabled(true);
                loginBtn.setText(R.string.login_btn);
                if (error != null) {
                    loginError.setText(error);
                } else {
                    tokenInput.setText("");
                    applyAuthState();
                    renderRepos();
                    Toast.makeText(this, "أهلاً بيك بالمصنع 🏭", Toast.LENGTH_SHORT).show();
                }
            });
        }).start();
    }

    private void createProject() {
        String name = appNameInput.getText().toString().trim();
        if (name.isEmpty()) {
            Toast.makeText(this, "اكتب اسم التطبيق أولاً", Toast.LENGTH_SHORT).show();
            return;
        }
        Planner.AppType type = Planner.TYPES.get(typeSpinner.getSelectedItemPosition());
        String desc = descInput.getText().toString().trim();
        Intent it = new Intent(this, BuildActivity.class);
        it.putExtra("appName", name);
        it.putExtra("appType", type.key);
        it.putExtra("description", desc);
        startActivity(it);
    }

    private void renderRepos() {
        reposList.removeAllViews();
        JSONArray repos = prefs.repos();
        if (repos.length() == 0) {
            TextView empty = new TextView(this);
            empty.setText("ما عندك مشاريع بعد — اسوي أول واحد 👇");
            empty.setTextColor(0xFF5F8672);
            empty.setTextSize(13);
            empty.setPadding(4, 8, 4, 8);
            reposList.addView(empty);
            return;
        }
        for (int i = 0; i < repos.length(); i++) {
            try {
                final JSONObject r = repos.getJSONObject(i);
                TextView tv = new TextView(this);
                tv.setText("📦 " + r.optString("name"));
                tv.setTextColor(0xFF9CC7AD);
                tv.setTextSize(14);
                int pad = (int) (12 * getResources().getDisplayMetrics().density);
                tv.setPadding(pad, pad / 2, pad, pad / 2);
                tv.setBackgroundResource(R.color.rowBg);
                tv.setOnClickListener(v -> {
                    try {
                        startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(r.getString("url"))));
                    } catch (Exception ignored) { }
                });
                reposList.addView(tv);
            } catch (Exception ignored) { }
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        renderRepos();
    }
}
