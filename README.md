# CTO AI 🚀

منصة ذكاء اصطناعي تبني تطبيقات أندرويد كاملة من وصف نصي — بدون ما تحتاج IDE أو خبرة برمجة.

> اسمها الأصلي: **شرائيك / BuildAI**

## ✨ شنو تسوي المنصة؟

1. **تسجيل دخول GitHub** — بس التوكن، الذكاء الاصطناعي مدمج بالمنصة (بدون API key)
2. **إنشاء مشروع بالذكاء الاصطناعي** — تكتب فكرة تطبيقك، والـ AI يخطط ويولّد مشروع أندرويد كامل (Java + XML + Gradle)
3. **رفع فعلي على GitHub** — المشروع ينتقل لحسابك على GitHub عبر GitHub REST API
4. **بناء APK تلقائي** — زر Build يشغّل GitHub Actions (Gradle 8.7 + JDK 17) ويسلّمك APK جاهز للتحميل

## 🧱 التقنيات

| الطبقة | التقنية |
|--------|---------|
| الفرونت | Next.js App Router + TypeScript + Tailwind CSS + shadcn/ui (عربي RTL) |
| الباك | Next.js API Routes + Prisma ORM + SQLite |
| الذكاء الاصطناعي | z-ai-web-dev-sdk (تخطيط التطبيق + دردشة المساعد) |
| رفع GitHub | REST API (blobs → trees → commits) بدون git CLI |
| بناء APK | GitHub Actions workflow يتولد تلقائياً مع كل مشروع |

## 🚀 التشغيل محلياً

```bash
# 1. تثبيت الحزم
bun install   # أو npm install

# 2. إعداد قاعدة البيانات
cp .env.example .env
npx prisma db push
npx prisma generate

# 3. التشغيل
bun run dev   # أو npm run dev
```

افتح `http://localhost:3000` وسجّل دخول بـ GitHub Personal Access Token (يحتاج صلاحيات `repo` و `workflow`).

## 📁 هيكل المشروع

```
src/
├── app/                    # صفحات Next.js + API routes
│   ├── api/
│   │   ├── auth/           # دخول بالتوكن / تجريبي / جلسة
│   │   ├── projects/       # إنشاء المشاريع + رفع + بناء
│   │   └── builds/         # متابعة البناء + تحميل APK
│   └── page.tsx            # الواجهة الرئيسية
├── components/builder/     # واجهات: دخول، لوحة مشاريع، مساحة عمل
└── lib/
    ├── generator.ts        # مولد مشاريع الأندرويد
    ├── planner.ts          # تخطيط التطبيق بالـ AI
    ├── github.ts           # رفع GitHub REST API
    ├── builder.ts          # إدارة البناء
    ├── auth.ts             # الجلسات
    └── zipper.ts           # كاتب ZIP (تحميل المصدر)
prisma/schema.prisma        # نماذج: User, Project, Build, Message...
```

## 🔒 الأمان

- التوكن يتخزن بقاعدة بياناتك محلياً وما يشارك مع أي طرف ثالث
- الجلسات بكوكيز httpOnly
- **نصيحة**: استخدم توكن بصلاحيات محدودة واحذفه بعد الانتهاء

---

صُنعت بـ ❤️ — أول تطبيق بُني بها: **CTO AI** 📱
