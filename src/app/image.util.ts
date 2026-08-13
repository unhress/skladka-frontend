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
 * returning a compact JPEG data URL. Keeps uploads small so we never ship full-res photos.
 */
export async function downscaleImage(file: File, options: DownscaleOptions = {}): Promise<DownscaledImage> {
  const maxSize = options.maxSize ?? 512;
  const quality = options.quality ?? 0.85;
  const square = options.square ?? false;

  const img = await loadImage(file);
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

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Не вдалося прочитати зображення'));
    img.src = URL.createObjectURL(file);
  });
}
