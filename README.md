# HumanAtlas — کاوشگر آناتومی سه‌بعدی و MRI

وب‌اپلیکیشن فارسی و راست‌به‌چپ برای مرور مدل‌های آناتومیک مغز، چشم و پوست و جست‌وجوی فایل‌های MRI از Allen Human Brain Atlas. رابط کاربری با Next.js/React/TypeScript/CSS و API واسط با Python/Flask نوشته شده است.

## امکانات

- **مغز:** اطلس سه‌بعدی تعاملی، میزبانی‌شده در [Brain Project](https://github.com/itayinbarr/brainproject)، بر مبنای مش‌های منبع‌دار Z-Anatomy / BodyParts3D.
- **چشم:** نمایشگر سه‌بعدی مدل چشم از [Sketchfab — Ebers](https://sketchfab.com/3d-models/human-eye-anatomy-5f741793c4654d14aa8257eec1f1a393)، با لینک مدل جایگزین آموزشی.
- **پوست:** نمایشگر سه‌بعدی برش مقطعی پوست از [Sketchfab — Ebers](https://sketchfab.com/3d-models/human-skin-integumentary-system-2c902649de1843e9b2e004a99a9ab923)، به‌همراه لینک مدل جایگزین.
- **MRI:** درخواست‌های GET به Flask برای جست‌وجوی T1-MRI، T2-MRI و DTI-MRI، فیلتر اختیاری donor، نمایش شناسه فایل و دانلود رسمی. پیش‌نمایش برش محوری فقط برای فایل‌های NIfTI سازگار ممکن است.
- API مرورگر مستقیماً به Allen درخواست نمی‌زند؛ Flask درخواست را انجام می‌دهد تا CORS و منطق درخواست در یک محل کنترل شود.

> مدل‌های سه‌بعدی در این مخزن ذخیره نشده‌اند؛ آن‌ها از میزبان اصلی‌شان بارگذاری می‌شوند. در نتیجه اتصال اینترنت لازم است و ممکن است بعضی میزبان‌ها نمایش داخل iframe را محدود کنند؛ هر پنل لینک بازکردن مدل در تب مستقل دارد. این پروژه برای آموزش و پژوهش مقدماتی است، نه تشخیص پزشکی، و مش سه‌بعدی به صورت خودکار با MRI دانلودشده هم‌تراز نمی‌شود.

## ساختار مخزن

```text
human-atlas-explorer/
├── backend/
│   ├── app.py
│   ├── wsgi.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── app/
│   │   ├── page.tsx
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── BrainViewer.tsx
│   │   ├── ExternalAnatomyViewer.tsx
│   │   └── MriPreview.tsx
│   ├── lib/api.ts
│   ├── package.json
│   ├── next.config.mjs
│   ├── tsconfig.json
│   ├── .env.local.example
│   └── .env.production.example
├── render.yaml
├── .gitignore
├── .gitattributes
└── README.md
```

## اجرای محلی در Windows

به Python 3.10+ و Node.js 20.9+ (پیشنهاد: Node.js 22 LTS) نیاز است. دو PowerShell باز کن.

### ۱) بک‌اند Flask

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
python app.py
```

اگر PowerShell اجازه فعال‌سازی محیط مجازی نداد، مستقیم اجرا کن:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe app.py
```

Flask به‌طور پیش‌فرض روی `http://127.0.0.1:5000` اجرا می‌شود. برای بررسی سلامت، باز کن: <http://127.0.0.1:5000/api/health>

### ۲) فرانت‌اند Next.js

در ترمینال دوم، از مسیر ریشه مخزن:

```powershell
cd frontend
Copy-Item .env.local.example .env.local
npm install
npm run dev
```

سایت در <http://localhost:3000> در دسترس است. برای بررسی TypeScript از `npm run lint` و برای ساخت نسخه تولید از `npm run build` استفاده کن.

## مسیرهای API بک‌اند

| متد | مسیر | کارکرد |
|---|---|---|
| `GET` | `/api/health` | وضعیت Flask |
| `GET` | `/api/mri?modality=T1-MRI&limit=50` | جست‌وجوی MRI |
| `GET` | `/api/mri?donor=H0351.2002&modality=T1-MRI` | جست‌وجو بر اساس donor (نمونهٔ شناسه) |
| `GET` | `/api/mri/files/{id}/download` | هدایت به دانلود رسمی Allen |
| `GET` | `/api/mri/files/{id}/volume` | استریم فایل برای تلاش به پیش‌نمایش NIfTI |

موجود بودن فایل و نوع آن وابسته به داده‌های موجود در API است؛ همهٔ فایل‌های MRI الزاماً فرمت قابل نمایش داخل مرورگر ندارند.

## انتشار روی GitHub، Render و Vercel

### آپلود به GitHub با Git

۱. یک repository خالی در GitHub بساز.
۲. در PowerShell، از مسیر ریشه پروژه اجرا کن و `USERNAME/REPOSITORY` را با مقادیر خودت جایگزین کن:

```powershell
git init
git add .
git commit -m "Initial HumanAtlas project"
git branch -M main
git remote add origin https://github.com/USERNAME/REPOSITORY.git
git push -u origin main
```

### بک‌اند روی Render

فایل `render.yaml` برای سرویس Flask در مخزن قرار دارد. می‌توانی از Render گزینه **New + → Blueprint** را انتخاب کنی و repository را وصل کنی، یا یک **Web Service** بسازی و این مقادیر را وارد کنی:

- **Root Directory:** `backend`
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `gunicorn --bind 0.0.0.0:$PORT wsgi:app`
- **Health Check Path:** `/api/health`

در تنظیمات Environment، متغیر `FRONTEND_ORIGIN` را تنظیم کن. بعد از انتشار Vercel، مقدارش دامنهٔ دقیق فرانت‌اند باشد، مانند `https://your-project.vercel.app`. برای چند origin می‌توان آدرس‌ها را با کاما جدا کرد. اگر از Blueprint استفاده کنی، Render برای متغیر `FRONTEND_ORIGIN` مقدار را از تو می‌خواهد.

### فرانت‌اند روی Vercel

۱. در Vercel، **Add New → Project** را بزن و همان repository را Import کن.
۲. مقدار **Root Directory** را `frontend` انتخاب کن. Framework باید Next.js شناسایی شود.
۳. در Environment Variables متغیر زیر را ایجاد کن:

```text
NEXT_PUBLIC_API_BASE=https://YOUR-FLASK-SERVICE.onrender.com
```

آدرس نمونه را با آدرس واقعی Flask روی Render عوض کن و Deploy کن. چون `NEXT_PUBLIC_API_BASE` هنگام build وارد فرانت‌اند می‌شود، پس از تغییر آن باید دوباره Deploy کنی.

**نکته:** سرویس رایگان Render ممکن است پس از مدتی بی‌درخواست خواب برود و اولین درخواست مجدد با تأخیر پاسخ دهد. برای استفادهٔ عمومی، محدودیت‌های روزِ سرویس‌های رایگان را پیش از انتشار بررسی کن.

## مستندات و انتساب منابع

- Allen Human Brain Atlas API: <https://brain-map.org/support/documentation/human-brain-atlas-api>
- Allen API download endpoint (`WellKnownFile`): <https://api.brain-map.org/api/v2/well_known_file_download/>
- Brain Project / Z-Anatomy / BodyParts3D: <https://github.com/itayinbarr/brainproject>
- Eye model page and license: <https://sketchfab.com/3d-models/human-eye-anatomy-5f741793c4654d14aa8257eec1f1a393>
- Skin model page and license: <https://sketchfab.com/3d-models/human-skin-integumentary-system-2c902649de1843e9b2e004a99a9ab923>

**مجوز دارایی‌های خارجی را جداگانه بررسی کن.** این مخزن مدل‌های سه‌بعدی Sketchfab را کپی یا بازتوزیع نمی‌کند و فقط viewer میزبانی‌شده را embed می‌کند. مجوز کد وب‌اپ، به‌خودی‌خود مجوز مدل‌های خارجی را تغییر نمی‌دهد.
