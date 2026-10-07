import { useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import imageCompression from 'browser-image-compression';
import { addPhoto } from '../db/db';
import { injectExifMetadata } from '../utils/exif';
import type { PhotoCategory, PhotoRecord } from '../types';

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.75;

interface Props {
  jobId: number;
  simproJobId: string;
  category: PhotoCategory;
  label: string;
  onCaptured: (photoId: string) => void;
}

interface GeoResult {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  error?: string;
}

function getPosition(): Promise<GeoResult> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) {
      resolve({ latitude: null, longitude: null, accuracy: null, error: 'Geolocation not supported on this device' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy
        });
      },
      (err) => {
        resolve({ latitude: null, longitude: null, accuracy: null, error: err.message });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}

/**
 * Draws the source image onto an offscreen canvas, downscaled to
 * MAX_DIMENSION, then stamps a solid dark banner across the bottom with
 * white watermark text (the visible, tamper-evident burn-in). Returns both
 * a compressed Blob and a base64 string. Real EXIF GPS/timestamp metadata
 * is injected separately in handleFile via injectExifMetadata, since a
 * canvas re-encode strips any EXIF a source photo may have had.
 */
async function watermarkImage(
  img: HTMLImageElement,
  watermarkText: string
): Promise<{ blob: Blob; base64: string }> {
  const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
  const width = Math.round(img.width * scale);
  const height = Math.round(img.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  ctx.drawImage(img, 0, 0, width, height);

  const bannerHeight = Math.max(28, Math.round(height * 0.06));
  ctx.fillStyle = 'rgba(10, 10, 10, 0.85)';
  ctx.fillRect(0, height - bannerHeight, width, bannerHeight);

  ctx.fillStyle = '#ffffff';
  const fontSize = Math.max(10, Math.round(bannerHeight * 0.38));
  ctx.font = `${fontSize}px monospace`;
  ctx.textBaseline = 'middle';

  // Wrap the watermark text onto up to two lines if it doesn't fit.
  const maxWidth = width - 12;
  const words = watermarkText.split(' | ');
  const lines: string[] = [];
  let current = '';
  for (const w of words) {
    const candidate = current ? `${current} | ${w}` : w;
    if (ctx.measureText(candidate).width > maxWidth && current) {
      lines.push(current);
      current = w;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  const lineHeight = fontSize + 2;
  const startY = height - bannerHeight / 2 - ((lines.length - 1) * lineHeight) / 2;
  lines.slice(0, 2).forEach((line, i) => {
    ctx.fillText(line, 6, startY + i * lineHeight);
  });

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Canvas toBlob failed'))),
      'image/jpeg',
      JPEG_QUALITY
    );
  });

  // Extra pass through browser-image-compression keeps large source photos
  // (e.g. 12MP phone camera) well under a sane payload size for later sync.
  const compressed = await imageCompression(new File([blob], 'photo.jpg', { type: 'image/jpeg' }), {
    maxSizeMB: 1.2,
    maxWidthOrHeight: MAX_DIMENSION,
    useWebWorker: true,
    initialQuality: JPEG_QUALITY
  });

  const base64: string = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(compressed);
  });

  return { blob: compressed, base64 };
}

export default function GeotaggedCameraCapture({ jobId, simproJobId, category, label, onCaptured }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<'idle' | 'locating' | 'processing' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [thumbnail, setThumbnail] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setStatus('locating');

    try {
      const geo = await getPosition();
      setStatus('processing');

      const img = await loadImage(file);
      const nowIso = new Date().toISOString();
      const latText = geo.latitude !== null ? geo.latitude.toFixed(6) : 'N/A';
      const lonText = geo.longitude !== null ? geo.longitude.toFixed(6) : 'N/A';
      const accText = geo.accuracy !== null ? Math.round(geo.accuracy).toString() : '?';
      const watermarkText = `LAT: ${latText} | LON: ${lonText} | ACC: \u00B1${accText}m | UTC: ${nowIso} | JOB #${simproJobId || jobId} | ${category}`;

      const { blob: watermarkedBlob, base64: watermarkedBase64 } = await watermarkImage(img, watermarkText);

      // Embed real EXIF GPS/timestamp/description into the file header —
      // distinct from the visible pixel watermark above — so audit tooling
      // that reads EXIF (not just the burned-in banner) can verify capture
      // location and time directly from the file.
      const base64 = injectExifMetadata(watermarkedBase64, {
        latitude: geo.latitude,
        longitude: geo.longitude,
        accuracy: geo.accuracy,
        timestamp: nowIso,
        description: `JOB #${simproJobId || jobId} | ${category}`
      });
      const blob = base64 === watermarkedBase64 ? watermarkedBlob : await dataUrlToBlob(base64);

      const photoId = uuidv4();
      const record: PhotoRecord = {
        id: photoId,
        jobId,
        category,
        blob,
        base64,
        latitude: geo.latitude,
        longitude: geo.longitude,
        accuracy: geo.accuracy,
        timestamp: nowIso
      };
      await addPhoto(record);

      setThumbnail(base64);
      setStatus('done');
      onCaptured(photoId);

      if (geo.error) {
        setError(`Photo saved as a draft, but GPS is missing: ${geo.error}. Retake it before final submission.`);
      }
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Unknown error capturing photo');
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="border rounded p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">{label}</span>
        {status === 'done' && <span className="text-green-600 text-xs">Captured</span>}
        {status === 'locating' && <span className="text-amber-600 text-xs">Getting GPS fix…</span>}
        {status === 'processing' && <span className="text-amber-600 text-xs">Processing photo…</span>}
      </div>

      {thumbnail && <img src={thumbnail} alt={label} className="w-full max-h-48 object-cover rounded" />}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        className="block w-full text-sm"
      />

      {error && <p className="text-red-600 text-xs">{error}</p>}
    </div>
  );
}
