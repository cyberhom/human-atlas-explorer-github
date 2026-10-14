"use client";

import { ExternalLink, Info, Maximize2 } from "lucide-react";

const ATLAS_URL = "https://itayinbarr.github.io/brainproject/";

/**
 * Embed a source-derived anatomical atlas rather than rendering synthetic geometry.
 * The remote atlas contains separately named 3D meshes derived from Z-Anatomy / BodyParts3D.
 * The Allen Human Brain Atlas API remains a separate workflow in the MRI tab.
 */
export default function BrainViewer() {
  return (
    <section className="viewer-shell real-atlas-shell" aria-label="اطلس واقعی سه‌بعدی آناتومی مغز">
      <div className="viewer-topbar real-atlas-topbar">
        <div className="viewer-top-label">
          <span className="live-dot" />
          اطلس آناتومیک سه‌بعدی واقعی
          <span className="viewer-separator">/</span>
          Z‑Anatomy · BodyParts3D
        </div>
        <a className="open-real-atlas" href={ATLAS_URL} target="_blank" rel="noreferrer">
          باز کردن در صفحهٔ مستقل <ExternalLink size={14} />
        </a>
      </div>

      <div className="real-atlas-frame-wrap">
        <iframe
          className="real-atlas-frame"
          src={ATLAS_URL}
          title="اطلس تعاملی واقعی سه‌بعدی مغز؛ ساختارهای آناتومیک تفکیک‌شده"
          loading="eager"
          allow="fullscreen; clipboard-read; clipboard-write"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
        <a className="iframe-fallback" href={ATLAS_URL} target="_blank" rel="noreferrer">
          اگر مدل داخل این کادر بارگذاری نشد، اطلس سه‌بعدی را در صفحهٔ مستقل باز کن <ExternalLink size={14} />
        </a>
      </div>

      <div className="real-atlas-credit">
        <Info size={15} />
        <p>
          این نما از اطلس مش‌بندی‌شدهٔ منبع‌دار استفاده می‌کند؛ ساختارها به‌صورت مش‌های جداگانه قابل انتخاب و لایه‌بندی‌اند.
          داده‌های MRI در بخش دیگر برنامه و از API مؤسسهٔ Allen جست‌وجو می‌شوند؛ این دو منبع به‌طور خودکار با هم هم‌تراز نشده‌اند.
        </p>
        <a href="https://github.com/itayinbarr/brainproject" target="_blank" rel="noreferrer">
          منبع و مجوز مدل <ExternalLink size={13} />
        </a>
      </div>
    </section>
  );
}
