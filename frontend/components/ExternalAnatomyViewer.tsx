"use client";

import { ExternalLink, Info } from "lucide-react";

type Props = {
  title: string;
  source: string;
  src: string;
  externalUrl: string;
  sourceUrl: string;
  extraUrl?: string;
  extraLabel?: string;
  description: string;
};

/** Embeds a real, source-attributed anatomy viewer; the standalone link is kept as a fallback
 * because some remote atlas hosts may block display in an iframe. */
export default function ExternalAnatomyViewer({
  title,
  source,
  src,
  externalUrl,
  sourceUrl,
  extraUrl,
  extraLabel,
  description,
}: Props) {
  return (
    <section className="viewer-shell real-atlas-shell" aria-label={title}>
      <div className="viewer-topbar real-atlas-topbar">
        <div className="viewer-top-label">
          <span className="live-dot" />
          {title}
          <span className="viewer-separator">/</span>
          {source}
        </div>
        <a className="open-real-atlas" href={externalUrl} target="_blank" rel="noreferrer">
          باز کردن در صفحهٔ مستقل <ExternalLink size={14} />
        </a>
      </div>

      <div className="real-atlas-frame-wrap">
        <iframe
          className="real-atlas-frame"
          src={src}
          title={title}
          loading="eager"
          allow="fullscreen; clipboard-read; clipboard-write; xr-spatial-tracking"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
        <a className="iframe-fallback" href={externalUrl} target="_blank" rel="noreferrer">
          اگر اطلس داخل این کادر باز نشد، برای نمایش مدل سه‌بعدی اینجا کلیک کن <ExternalLink size={14} />
        </a>
      </div>

      <div className="real-atlas-credit">
        <Info size={15} />
        <p>{description}</p>
        <a href={sourceUrl} target="_blank" rel="noreferrer">
          منبع و مجوز <ExternalLink size={13} />
        </a>
        {extraUrl && (
          <a href={extraUrl} target="_blank" rel="noreferrer">
            {extraLabel ?? "مدل مرجع"} <ExternalLink size={13} />
          </a>
        )}
      </div>
    </section>
  );
}
