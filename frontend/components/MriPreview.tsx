"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as nifti from "nifti-reader-js";
import { API_BASE } from "../lib/api";
import { LoaderCircle, ScanLine } from "lucide-react";

type Volume = { data: ArrayLike<number>; nx: number; ny: number; nz: number; min: number; max: number };

function getVoxelArray(header: { datatypeCode: number }, image: ArrayBuffer): ArrayLike<number> {
  const code = header.datatypeCode;
  if (code === nifti.NIFTI1.TYPE_UINT8) return new Uint8Array(image);
  if (code === nifti.NIFTI1.TYPE_INT8) return new Int8Array(image);
  if (code === nifti.NIFTI1.TYPE_UINT16) return new Uint16Array(image);
  if (code === nifti.NIFTI1.TYPE_INT16) return new Int16Array(image);
  if (code === nifti.NIFTI1.TYPE_UINT32) return new Uint32Array(image);
  if (code === nifti.NIFTI1.TYPE_INT32) return new Int32Array(image);
  if (code === nifti.NIFTI1.TYPE_FLOAT32) return new Float32Array(image);
  if (code === nifti.NIFTI1.TYPE_FLOAT64) return new Float64Array(image);
  if (code === nifti.NIFTI1.TYPE_INT64 && typeof BigInt64Array !== "undefined") {
    const array = new BigInt64Array(image);
    return Array.from(array, (value) => Number(value));
  }
  if (code === nifti.NIFTI1.TYPE_UINT64 && typeof BigUint64Array !== "undefined") {
    const array = new BigUint64Array(image);
    return Array.from(array, (value) => Number(value));
  }
  throw new Error(`نوع دادهٔ NIfTI پشتیبانی نمی‌شود (datatype=${code}).`);
}

export default function MriPreview({ fileId, onClose }: { fileId: string; onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [volume, setVolume] = useState<Volume | null>(null);
  const [slice, setSlice] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const volumeRef = useRef<Volume | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true); setError(""); setVolume(null); volumeRef.current = null;
      try {
        const response = await fetch(`${API_BASE}/api/mri/files/${fileId}/volume`, { method: "GET", cache: "no-store" });
        if (!response.ok) throw new Error("فایل MRI از سرویس دریافت نشد.");
        let buffer = await response.arrayBuffer();
        if (nifti.isCompressed(buffer)) buffer = nifti.decompress(buffer);
        if (!nifti.isNIFTI(buffer)) {
          throw new Error("این فایل به‌صورت NIfTI خام قابل پیش‌نمایش نیست؛ از دکمهٔ دانلود برای دریافت فایل اصلی استفاده کنید.");
        }
        const header = nifti.readHeader(buffer);
        const image = nifti.readImage(header, buffer);
        const data = getVoxelArray(header, image);
        const nx = Number(header.dims[1]); const ny = Number(header.dims[2]); const nz = Number(header.dims[3]);
        if (!nx || !ny || !nz || nx * ny * nz > data.length) throw new Error("ابعاد حجم MRI با دادهٔ دریافتی سازگار نیست.");
        let min = Infinity; let max = -Infinity;
        const step = Math.max(1, Math.floor(data.length / 150000));
        for (let i = 0; i < data.length; i += step) {
          const value = Number(data[i]);
          if (Number.isFinite(value)) { if (value < min) min = value; if (value > max) max = value; }
        }
        const result = { data, nx, ny, nz, min, max };
        if (!cancelled) { volumeRef.current = result; setVolume(result); setSlice(Math.floor(nz / 2)); }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "خطای ناشناخته هنگام خواندن MRI.");
      } finally { if (!cancelled) setLoading(false); }
    }
    void load();
    return () => { cancelled = true; };
  }, [fileId]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const v = volumeRef.current;
    if (!canvas || !v) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = v.nx; canvas.height = v.ny;
    const image = ctx.createImageData(v.nx, v.ny);
    const z = Math.min(v.nz - 1, Math.max(0, slice));
    const range = Math.max(1, v.max - v.min);
    for (let y = 0; y < v.ny; y++) {
      for (let x = 0; x < v.nx; x++) {
        const sourceY = v.ny - 1 - y;
        const value = Number(v.data[z * v.nx * v.ny + sourceY * v.nx + x]);
        const normalized = Number.isFinite(value) ? Math.max(0, Math.min(255, ((value - v.min) / range) * 255)) : 0;
        const idx = (y * v.nx + x) * 4;
        image.data[idx] = normalized; image.data[idx + 1] = normalized; image.data[idx + 2] = normalized; image.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(image, 0, 0);
  }, [slice]);

  useEffect(() => { draw(); }, [draw, volume]);

  return (
    <div className="mri-preview">
      <div className="mri-preview-header"><div><ScanLine size={16} /><strong>پیش‌نمایش برش محوری</strong><span className="tiny-code">FILE {fileId}</span></div><button className="text-button" onClick={onClose}>بستن ×</button></div>
      {loading && <div className="preview-state"><LoaderCircle className="spin" size={24} /><span>دریافت و تحلیل فایل MRI… ممکن است فایل حجیم باشد.</span></div>}
      {!loading && error && <div className="preview-error"><strong>پیش‌نمایش در دسترس نیست</strong><span>{error}</span><small>پنل دانلود مستقل از قابلیت پیش‌نمایش کار می‌کند.</small></div>}
      {!loading && volume && <div className="preview-content"><div className="slice-canvas-wrap"><canvas ref={canvasRef} /><span className="slice-overlay">AXIAL · Z {slice + 1}/{volume.nz}</span></div><div className="slice-controls"><label htmlFor={`slice-${fileId}`}>شمارهٔ برش</label><input id={`slice-${fileId}`} type="range" min={0} max={Math.max(0, volume.nz - 1)} value={slice} onChange={(e) => setSlice(Number(e.target.value))} /><span>{slice + 1} / {volume.nz}</span></div><div className="volume-stats"><span>ابعاد: {volume.nx} × {volume.ny} × {volume.nz}</span><span>شدت نمونه‌برداری‌شده: {volume.min.toFixed(1)} تا {volume.max.toFixed(1)}</span></div></div>}
    </div>
  );
}
