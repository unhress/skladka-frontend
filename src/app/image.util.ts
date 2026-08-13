export interface DownscaledImage {
  dataUrl: string;
  contentType: string;
}

export interface DownscaleOptions {
  maxSize?: number;
  quality?: number;
  square?: boolean;
}

/**
 * Downscales (and optionally center-crops to a square) an image entirely in the browser,
 * returning a compact JPEG data URL. iPhone HEIC/HEIF photos are transparently converted
 * to JPEG first (browsers can't decode HEIC on a canvas). Keeps uploads small so we never
 * ship full-res photos.
 */
export async function downscaleImage(file: File, options: DownscaleOptions = {}): Promise<DownscaledImage> {
  const maxSize = options.maxSize ?? 512;
  const quality = options.quality ?? 0.85;
  const square = options.square ?? false;

  const source = await toDecodableBlob(file);
  const img = await loadImage(source);
  try {
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    if (!iw || !ih) throw new Error('Порожнє зображення');

    let sx = 0, sy = 0, sw = iw, sh = ih;
    if (square) {
      const side = Math.min(iw, ih);
      sx = (iw - side) / 2;
      sy = (ih - side) / 2;
      sw = side;
      sh = side;
    }

    const scale = Math.min(1, maxSize / Math.max(sw, sh));
    const tw = Math.max(1, Math.round(sw * scale));
    const th = Math.max(1, Math.round(sh * scale));

    const canvas = document.createElement('canvas');
    canvas.width = tw;
    canvas.height = th;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D недоступний');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, tw, th);

    return { dataUrl: canvas.toDataURL('image/jpeg', quality), contentType: 'image/jpeg' };
  } finally {
    URL.revokeObjectURL(img.src);
  }
}

function isHeic(file: File): boolean {
  const type = (file.type || '').toLowerCase();
  return type === 'image/heic' || type === 'image/heif' || /\.hei[cf]$/i.test(file.name);
}

async function toDecodableBlob(file: File): Promise<Blob> {
  if (!isHeic(file)) {
    return file;
  }

  // libheif is heavy — only pull it in when we actually meet a HEIC file.
  const heic2any = (await import('heic2any')).default as (options: {
    blob: Blob;
    toType?: string;
    quality?: number;
  }) => Promise<Blob | Blob[]>;

  const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 });
  return Array.isArray(converted) ? converted[0] : converted;
}

function loadImage(source: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(source);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Не вдалося прочитати зображення'));
    };
    img.src = url;
  });
}
