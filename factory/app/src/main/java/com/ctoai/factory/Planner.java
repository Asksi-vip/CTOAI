package com.ctoai.factory;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * المخطِّط — يحول اختيار المستخدم ووصفه لمواصفات تطبيق.
 * يعمل محلياً داخل الجوال بدون سيرفر (نفس منطق fallback المنصة).
 */
public class Planner {

    public static class AppType {
        public final String key;
        public final String label;
        public final String emoji;
        public final String screenTitle;
        public final String color;
        public final List<String> defaults;

        AppType(String key, String label, String emoji, String screenTitle, String color, List<String> defaults) {
            this.key = key;
            this.label = label;
            this.emoji = emoji;
            this.screenTitle = screenTitle;
            this.color = color;
            this.defaults = defaults;
        }
    }

    public static final List<AppType> TYPES = Arrays.asList(
            new AppType("tasks", "مهام يومية", "✅", "مهامي", "#22C55E",
                    Arrays.asList("إضافة مهمة", "تعليم كمكتملة", "حذف مهمة", "عدّاد الإنجاز")),
            new AppType("notes", "مذكرات", "📝", "مذكراتي", "#F59E0B",
                    Arrays.asList("إضافة ملاحظة", "حفظ تلقائي", "مسح ملاحظة", "بحث سريع")),
            new AppType("store", "متجر بسيط", "🛒", "المتجر", "#8B5CF6",
                    Arrays.asList("عرض منتجات", "سلة مشتريات", "حساب المجموع", "زر الشراء")),
            new AppType("calculator", "حاسبة", "🧮", "الحاسبة", "#3B82F6",
                    Arrays.asList("عمليات أساسية", "نسبة مئوية", "تاريخ العمليات", "وضع ليلي")),
            new AppType("fitness", "لياقة", "💪", "لياقتي", "#EF4444",
                    Arrays.asList("عدّاد خطوات", "هدف يومي", "مؤشر تقدم", "سجل أسبوعي")),
            new AppType("chat", "دردشة", "💬", "الدردشة", "#06B6D4",
                    Arrays.asList("رسائل فورية", "قائمة محادثات", "حالة الاتصال", "إرسال صور"))
    );

    private static final Map<String, AppType> BY_KEY = new HashMap<>();
    static {
        for (AppType t : TYPES) BY_KEY.put(t.key, t);
    }

    public static AppType byKey(String key) {
        AppType t = BY_KEY.get(key);
        return t != null ? t : TYPES.get(0);
    }

    public static String screenTitle(String key, String appName) {
        return byKey(key).screenTitle;
    }

    public static ProjectGenerator.AppSpec plan(String appName, String appType, String description) {
        AppType meta = byKey(appType);
        ProjectGenerator.AppSpec spec = new ProjectGenerator.AppSpec();
        spec.appName = appName;
        spec.appType = meta.key;
        spec.description = (description == null || description.isEmpty())
                ? "تطبيق " + meta.label + " جاهز للاستخدام" : description;
        spec.primaryColor = meta.color;
        spec.features = meta.defaults;
        spec.welcomeText = (description != null && !description.isEmpty())
                ? description.substring(0, Math.min(60, description.length()))
                : "تطبيق " + meta.label + " جاهز للاستخدام";
        return spec;
    }
}
