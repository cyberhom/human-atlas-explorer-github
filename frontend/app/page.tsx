"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  Activity, ArrowDownToLine, Brain, Check, ChevronLeft, Command,
  Database, ExternalLink, Eye, FileSearch, FlaskConical, Layers3, LoaderCircle,
  PersonStanding, Radio, ScanLine, Search, ShieldCheck,
} from "lucide-react";
import BrainViewer from "../components/BrainViewer";
import ExternalAnatomyViewer from "../components/ExternalAnatomyViewer";
import MriPreview from "../components/MriPreview";
import { API_BASE, apiGet } from "../lib/api";

type Tab = "anatomy" | "eye" | "skin" | "mri";
type MriRecord = { id: string; donor: string; specimen_id?: number | string | null; modality: string; product?: string; download_url: string };
type MriResponse = { source: string; method: string; query_endpoint: string; count: number; items: MriRecord[]; note?: string };

const anatomyContent = {
  anatomy: {
    crumb: "آناتومی مغز",
    eyebrow: "HUMAN NEUROANATOMY", count: "01 / 04", title: "آناتومی مغز،", emphasis: "در فضای سه‌بعدی",
    description: "مش‌های واقعی نواحی مغز را بچرخان، ساختارها را جداگانه انتخاب کن و لایه‌ها را بررسی کن.",
    stats: ["مش‌های منبع‌دار", "انتخاب ساختارهای مجزا", "چرخش و زوم", "Z-Anatomy / BodyParts3D"],
    source: "https://github.com/itayinbarr/brainproject",
    credit: "اطلس از مش‌های آناتومیک منبع‌دار Z‑Anatomy و BodyParts3D استفاده می‌کند. برای آموزش و اکتشاف است و با MRI پنل Allen به‌طور خودکار هم‌تراز نمی‌شود."
  },
  eye: {
    crumb: "آناتومی چشم",
    eyebrow: "HUMAN EYE ANATOMY", count: "02 / 04", title: "آناتومی چشم،", emphasis: "با جزئیات ساختاری",
    description: "یک مش سه‌بعدی با جزئیات بالا را بررسی کن؛ از قرنیه و عدسی تا شبکیه، صلبیه، عضلات و عصب بینایی.",
    stats: ["مش سه‌بعدی 376K مثلث", "قرنیه، عنبیه، عدسی و شبکیه", "چرخش و زوم تعاملی", "Sketchfab · Ebers"],
    source: "https://sketchfab.com/3d-models/human-eye-anatomy-5f741793c4654d14aa8257eec1f1a393",
    credit: "این نسخه از مدل سه‌بعدی Human Eye Anatomy از سازندهٔ Ebers استفاده می‌کند. صفحهٔ مدل 376.2 هزار مثلث و جزئیات سگمان قدامی و خلفی چشم را گزارش می‌کند. مدل از سرور Sketchfab بارگذاری می‌شود و فایل مش در این پروژه بازتوزیع نشده است. صفحهٔ مدل محدودیت NoAI دارد؛ از آن برای آموزش یا ورودی سامانه‌های هوش مصنوعی استفاده نکن. این مدل آموزشی است، نه ابزار تشخیص پزشکی."
  },
  skin: {
    crumb: "آناتومی پوست",
    eyebrow: "HUMAN SKIN ANATOMY", count: "03 / 04", title: "آناتومی پوست،", emphasis: "با جزئیات میکروآناتومی",
    description: "برش مقطعی پرجزئیات پوست را بچرخان و اپیدرم، درم، بافت زیرجلدی، فولیکول مو، غدد، عروق و اعصاب را بررسی کن.",
    stats: ["مش مقطعی 833K مثلث", "اپیدرم، درم و زیرپوست", "چرخش و زوم تعاملی", "Sketchfab · Ebers"],
    source: "https://sketchfab.com/3d-models/human-skin-integumentary-system-2c902649de1843e9b2e004a99a9ab923",
    credit: "این نسخه از مدل Human Skin — Integumentary System از سازندهٔ Ebers استفاده می‌کند. صفحهٔ مدل 833.6 هزار مثلث و نمایش برش پوست همراه با فولیکول‌های مو، غدد سباسه و عرق، عروق و اعصاب را گزارش می‌کند. مدل از سرور Sketchfab بارگذاری می‌شود و فایل مش در این پروژه بازتوزیع نشده است. صفحهٔ مدل محدودیت NoAI دارد؛ از آن برای آموزش یا ورودی سامانه‌های هوش مصنوعی استفاده نکن. این مدل آموزشی است و جایگزین تصویر بافت‌شناسی یک نمونهٔ واقعی نیست."
  }
} as const;

const modalityLabels: Record<string, string> = { "T1-MRI": "MRI وزن‌دهی T1", "T2-MRI": "MRI وزن‌دهی T2", "DTI-MRI": "تصویربرداری DTI", "Unknown MRI": "MRI" };

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<Tab>("anatomy");
  const [apiStatus, setApiStatus] = useState<"checking" | "online" | "offline">("checking");
  const [donor, setDonor] = useState("");
  const [modality, setModality] = useState("T1-MRI");
  const [limit, setLimit] = useState("50");
  const [mriData, setMriData] = useState<MriResponse | null>(null);
  const [mriLoading, setMriLoading] = useState(false);
  const [mriError, setMriError] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [getPath, setGetPath] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_BASE}/api/health`, { method: "GET", signal: controller.signal, cache: "no-store" })
      .then((r) => { if (!r.ok) throw new Error("API unavailable"); return r.json(); })
      .then(() => setApiStatus("online"))
      .catch(() => setApiStatus("offline"));
    return () => controller.abort();
  }, []);

  async function searchMri(event?: FormEvent) {
    event?.preventDefault();
    setMriLoading(true); setMriError(""); setMriData(null); setPreviewId(null);
    const params = new URLSearchParams({ modality, limit });
    if (donor.trim()) params.set("donor", donor.trim());
    const path = `/api/mri?${params.toString()}`;
    setGetPath(`GET ${API_BASE}${path}`);
    try {
      const data = await apiGet<MriResponse>(path);
      setMriData(data);
    } catch (error) {
      setMriError(error instanceof Error ? error.message : "درخواست ناموفق بود.");
    } finally { setMriLoading(false); }
  }


  return (
    <div className="app-frame">
      <header className="top-header">
        <div className="brand-lockup">
          <div className="brand-mark"><Layers3 size={23} strokeWidth={1.7} /></div>
          <div><div className="brand-name">HUMAN<span>ATLAS</span></div><div className="brand-sub">3D ANATOMY EXPLORER</div></div>
        </div>
        <div className="header-center"><span className="header-breadcrumb">پژوهش و اکتشاف</span><ChevronLeft size={14} /><span>{activeTab === "mri" ? "مرورگر MRI" : anatomyContent[activeTab].crumb}</span></div>
        <div className="header-meta"><div className={`api-indicator ${apiStatus}`}><span />{apiStatus === "checking" ? "در حال بررسی اتصال" : apiStatus === "online" ? "سرور محلی متصل" : "سرور محلی قطع است"}</div><span className="meta-divider" /><a href="https://brain-map.org/support/documentation/human-brain-atlas-api" target="_blank" rel="noreferrer" className="docs-link">مستندات API <ExternalLink size={13} /></a></div>
      </header>

      <div className="workspace">
        <aside className="sidebar">
          <div className="sidebar-section-label">WORKSPACE</div>
          <button className={`nav-item ${activeTab === "anatomy" ? "active" : ""}`} onClick={() => setActiveTab("anatomy")}><span className="nav-icon"><Brain size={18} /></span><span className="nav-copy"><b>آناتومی مغز</b><small>Brain atlas</small></span>{activeTab === "anatomy" && <span className="nav-active-mark" />}</button>
          <button className={`nav-item ${activeTab === "eye" ? "active" : ""}`} onClick={() => setActiveTab("eye")}><span className="nav-icon"><Eye size={18} /></span><span className="nav-copy"><b>آناتومی چشم</b><small>Eye atlas</small></span>{activeTab === "eye" && <span className="nav-active-mark" />}</button>
          <button className={`nav-item ${activeTab === "skin" ? "active" : ""}`} onClick={() => setActiveTab("skin")}><span className="nav-icon"><PersonStanding size={18} /></span><span className="nav-copy"><b>آناتومی پوست</b><small>Skin atlas</small></span>{activeTab === "skin" && <span className="nav-active-mark" />}</button>
          <button className={`nav-item ${activeTab === "mri" ? "active" : ""}`} onClick={() => setActiveTab("mri")}><span className="nav-icon"><ScanLine size={18} /></span><span className="nav-copy"><b>بررسی MRI</b><small>MRI Browser</small></span>{activeTab === "mri" && <span className="nav-active-mark" />}</button>
          <div className="sidebar-rule" />
          <div className="sidebar-section-label">DATA SOURCE</div>
          <div className="source-card"><div className="source-logo"><Activity size={17} /></div><div><b>اطلس‌های آناتومی و MRI</b><small>HRA / BodyParts3D / Allen</small></div><span className="source-status" /></div>
          <div className="sidebar-note"><ShieldCheck size={16} /><p>بخش‌های مغز، چشم و پوست از اطلس‌های منبع‌دار؛ داده‌های MRI از API آلن.</p></div>
          <div className="sidebar-footer"><span className="footer-dot" /> LOCAL SESSION <span>v1.0.0</span></div>
        </aside>

        <main className="main-content">
          {activeTab !== "mri" ? (
            <>
              <div className="page-heading">
                <div><div className="eyebrow"><span className="eyebrow-line" /> {anatomyContent[activeTab].eyebrow} <span className="eyebrow-count">{anatomyContent[activeTab].count}</span></div><h1>{anatomyContent[activeTab].title} <em>{anatomyContent[activeTab].emphasis}</em></h1><p>{anatomyContent[activeTab].description}</p></div>
                <div className="heading-tag"><Layers3 size={15} /> {activeTab === "anatomy" ? "BRAIN 3D ATLAS" : activeTab === "eye" ? "EYE REFERENCE MODEL" : "SKIN REFERENCE ATLAS"} <span className="heading-tag-dot" /></div>
              </div>
              <div className="stat-strip">
                <div className="stat-item"><span className="stat-icon cyan"><Brain size={17} /></span><div><small>نوع مدل</small><b>{anatomyContent[activeTab].stats[0]}</b></div></div>
                <div className="stat-item"><span className="stat-icon amber"><Layers3 size={17} /></span><div><small>آناتومی</small><b>{anatomyContent[activeTab].stats[1]}</b></div></div>
                <div className="stat-item"><span className="stat-icon violet"><Radio size={17} /></span><div><small>کنترل‌ها</small><b>{anatomyContent[activeTab].stats[2]}</b></div></div>
                <div className="stat-item stat-source"><span className="stat-icon green"><Database size={17} /></span><div><small>منبع مدل</small><b>{anatomyContent[activeTab].stats[3]}</b></div></div>
              </div>
              <div className="anatomy-layout real-atlas-layout">
                {activeTab === "anatomy" ? <BrainViewer /> : activeTab === "eye" ? (
                  <ExternalAnatomyViewer
                    title="مدل آناتومی چشم با جزئیات بالا"
                    source="Ebers · 376.2K triangles · Sketchfab"
                    src="https://sketchfab.com/models/5f741793c4654d14aa8257eec1f1a393/embed?ui_theme=dark"
                    externalUrl="https://sketchfab.com/3d-models/human-eye-anatomy-5f741793c4654d14aa8257eec1f1a393"
                    sourceUrl="https://sketchfab.com/3d-models/human-eye-anatomy-5f741793c4654d14aa8257eec1f1a393"
                    extraUrl="https://sketchfab.com/3d-models/anatomy-of-the-eye-f7745aaff145485fb02cf729c96c5f37"
                    extraLabel="مدل آموزشی دانشگاه Groningen"
                    description="مش سه‌بعدی پرجزئیات شامل قرنیه، عنبیه، عدسی، شبکیه، مشیمیه، صلبیه و عصب بینایی. با ابزارهای داخل نمایشگر بچرخان و بزرگ‌نمایی کن. مدل از Sketchfab میزبانی می‌شود؛ برای محدودیت‌های مجوز به صفحهٔ منبع مراجعه کن."
                  />
                ) : (
                  <ExternalAnatomyViewer
                    title="مدل مقطعی پوست با جزئیات میکروآناتومیک"
                    source="Ebers · 833.6K triangles · Sketchfab"
                    src="https://sketchfab.com/models/2c902649de1843e9b2e004a99a9ab923/embed?ui_theme=dark"
                    externalUrl="https://sketchfab.com/3d-models/human-skin-integumentary-system-2c902649de1843e9b2e004a99a9ab923"
                    sourceUrl="https://sketchfab.com/3d-models/human-skin-integumentary-system-2c902649de1843e9b2e004a99a9ab923"
                    extraUrl="https://sketchfab.com/3d-models/human-anatomy-skin-3d-model-elt-assignment-98476537da2e451d80d7f45dc212f9eb"
                    extraLabel="مدل جایگزین با مجوز CC BY"
                    description="برش مقطعی دقیق پوست با اپیدرم، درم، بافت زیرجلدی، فولیکول‌ها، غدد، عروق و اعصاب. مدل از Sketchfab میزبانی می‌شود و در این پروژه دانلود یا بازتوزیع نشده است؛ برای شرایط استفاده، صفحهٔ منبع را بررسی کن."
                  />
                )}
              </div>
              <div className="bottom-note"><div className="note-mark"><FlaskConical size={16} /></div><div><b>یادداشت علمی و منبع داده</b><p>{anatomyContent[activeTab].credit}</p></div><a href={anatomyContent[activeTab].source} target="_blank" rel="noreferrer">منبع اطلس <ExternalLink size={13} /></a></div>
            </>
          ) : (
            <>
              <div className="page-heading mri-page-heading">
                <div><div className="eyebrow"><span className="eyebrow-line" /> MAGNETIC RESONANCE IMAGING <span className="eyebrow-count">04 / 04</span></div><h1>مرورگر <em>داده‌های MRI</em></h1><p>فایل‌های تصویربرداری ثبت‌شده در Allen Human Brain Atlas را از API رسمی جست‌وجو کن.</p></div>
                <div className="heading-tag"><ScanLine size={15} /> API · GET REQUEST <span className="heading-tag-dot" /></div>
              </div>
              <div className="mri-intro-grid">
                <div className="mri-intro-card"><div className="mri-intro-icon"><ScanLine size={19} /></div><div><span>MODALITY</span><b>T1 / T2 / DTI</b><small>بر اساس فایل موجود در API</small></div></div>
                <div className="mri-intro-card"><div className="mri-intro-icon"><Database size={19} /></div><div><span>DATA SOURCE</span><b>WellKnownFile</b><small>شناسهٔ فایل و پیوند دانلود رسمی</small></div></div>
                <div className="mri-intro-card"><div className="mri-intro-icon"><Activity size={19} /></div><div><span>REQUEST METHOD</span><b>HTTP GET</b><small>درخواست از طریق لایهٔ Flask</small></div></div>
              </div>
              <section className="mri-search-panel panel">
                <div className="panel-heading mri-panel-heading"><div><span className="panel-kicker">QUERY BUILDER</span><h2>جست‌وجوی فایل MRI</h2><p>فیلترها را انتخاب کن و درخواست GET را اجرا کن.</p></div><div className="get-badge"><span>GET</span> /api/mri</div></div>
                <form className="mri-form" onSubmit={searchMri}>
                  <label className="form-field"><span>شناسهٔ اهداکننده <small>اختیاری</small></span><div className="input-wrap"><Search size={16} /><input value={donor} onChange={(e) => setDonor(e.target.value)} placeholder="مثال: H0351.2002" dir="ltr" autoComplete="off" /></div><small className="field-hint">برای مشاهدهٔ داده‌های مرتبط با یک donor، نام آن را وارد کن.</small></label>
                  <label className="form-field"><span>نوع تصویربرداری</span><select value={modality} onChange={(e) => setModality(e.target.value)}><option value="T1-MRI">T1-weighted MRI</option><option value="T2-MRI">T2-weighted MRI</option><option value="DTI-MRI">Diffusion Tensor Imaging (DTI)</option><option value="ALL">همهٔ انواع MRI</option></select><small className="field-hint">DTI فقط برای نمونه‌هایی برگردانده می‌شود که فایل آن موجود باشد.</small></label>
                  <label className="form-field limit-field"><span>حداکثر نتایج</span><select value={limit} onChange={(e) => setLimit(e.target.value)}><option value="10">۱۰ فایل</option><option value="25">۲۵ فایل</option><option value="50">۵۰ فایل</option><option value="100">۱۰۰ فایل</option></select><small className="field-hint">برای جلوگیری از درخواست سنگین، حداکثر ۱۰۰ رکورد.</small></label>
                  <button className="primary-button" type="submit" disabled={mriLoading}>{mriLoading ? <LoaderCircle className="spin" size={17} /> : <Search size={17} />}{mriLoading ? "در حال جست‌وجو…" : "جست‌وجوی MRI"}<ChevronLeft size={16} /></button>
                </form>
                {getPath && <div className="request-preview"><div><span className="request-method">GET</span><code dir="ltr">{getPath.replace(API_BASE, "")}</code></div><button onClick={() => navigator.clipboard?.writeText(getPath)} title="کپی مسیر درخواست">کپی مسیر</button></div>}
              </section>

              {mriError && <div className="error-banner"><span className="error-icon">!</span><div><b>درخواست انجام نشد</b><p>{mriError}</p><small>مطمئن شو Flask روی پورت 5000 اجرا است و دسترسی شبکه به api.brain-map.org برقرار است.</small></div></div>}

              {mriData && <section className="mri-results-section">
                <div className="results-heading"><div><span className="panel-kicker">QUERY RESULTS</span><h2>فایل‌های یافت‌شده <span>{mriData.count}</span></h2></div><div className="results-meta"><Check size={14} /> درخواست GET پاسخ دریافت کرد</div></div>
                {mriData.items.length === 0 ? <div className="empty-state"><div><FileSearch size={24} /></div><b>فایلی مطابق فیلترهای انتخابی پیدا نشد</b><p>نوع MRI را تغییر بده یا فیلتر شناسهٔ اهداکننده را پاک کن. موجود بودن فایل به داده‌های منتشرشده در API بستگی دارد.</p></div> : <div className="mri-results-list">{mriData.items.map((record) => <article className="mri-result-card" key={`${record.id}-${record.modality}`}>
                  <div className={`mri-file-icon ${record.modality.startsWith("T1") ? "t1" : record.modality.startsWith("T2") ? "t2" : "dti"}`}><ScanLine size={21} /></div>
                  <div className="mri-result-info"><div className="mri-result-title"><h3>{modalityLabels[record.modality] || record.modality}</h3><span className="modality-pill">{record.modality}</span></div><div className="mri-record-details"><span><small>DONOR</small><b dir="ltr">{record.donor}</b></span><span><small>FILE ID</small><b className="mono">{record.id}</b></span><span><small>SPECIMEN</small><b className="mono">{record.specimen_id ?? "—"}</b></span></div></div>
                  <div className="mri-record-actions"><button className="secondary-button" onClick={() => setPreviewId(previewId === record.id ? null : record.id)}><ScanLine size={15} />{previewId === record.id ? "بستن پیش‌نمایش" : "پیش‌نمایش برش"}</button><a className="download-button" href={`${API_BASE}${record.download_url}`}><ArrowDownToLine size={15} /> دانلود فایل</a></div>
                  {previewId === record.id && <div className="preview-full-row"><MriPreview fileId={record.id} onClose={() => setPreviewId(null)} /></div>}
                </article>)}</div>}
                <div className="api-source-note"><Database size={15} /><span>{mriData.source}</span><span className="source-note-sep">·</span><span>{mriData.note}</span></div>
              </section>}
              {!mriData && !mriError && <section className="mri-empty-prompt"><div className="mri-empty-graphic"><div className="scan-ring ring-a"/><div className="scan-ring ring-b"/><div className="scan-cross"/><ScanLine size={42} strokeWidth={1.2} /></div><h2>آمادهٔ واکشی داده‌های تصویربرداری</h2><p>یک درخواست GET به API واسط Flask ارسال می‌شود. پاسخ شامل نوع MRI، شناسهٔ فایل، شناسهٔ اهداکننده و لینک دانلود رسمی است.</p><div className="endpoint-sample"><span>GET</span><code dir="ltr">/api/v2/data/query.json?criteria=…</code><ExternalLink size={14} /></div></section>}
            </>
          )}
          <footer className="page-footer"><span>HUMANATLAS <span className="footer-copyright">/</span> 3D ANATOMY EXPLORER</span><span>برای پژوهش و آموزش · نه برای تشخیص پزشکی</span><span className="footer-build"><Command size={12} /> FLASK + NEXT.JS</span></footer>
        </main>
      </div>
    </div>
  );
}
