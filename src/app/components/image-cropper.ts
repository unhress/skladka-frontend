import { Component, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { cropToDataUrl, loadImageElement } from '../image.util';

const STAGE = 264;

@Component({
  selector: 'app-image-cropper',
  imports: [FormsModule],
  styles: [`
    .cropper-stage{position:relative;width:${STAGE}px;height:${STAGE}px;max-width:100%;margin:4px auto 0;border-radius:16px;overflow:hidden;background:var(--surface-2);touch-action:none;cursor:grab;user-select:none;-webkit-user-select:none}
    .cropper-stage.drag{cursor:grabbing}
    .cropper-stage img{position:absolute;top:0;left:0;transform-origin:0 0;will-change:transform;pointer-events:none;max-width:none}
    .cropper-ring{position:absolute;inset:0;border-radius:50%;box-shadow:0 0 0 9999px rgba(10,12,16,.34);pointer-events:none}
    .cropper-hint{text-align:center;font-size:12.5px;color:var(--faint);margin-top:10px}
    .cropper-zoom{width:100%;margin:10px 0 4px;accent-color:var(--accent)}
  `],
  template: `
    <div class="scrim" (click)="cancel()">
      <div class="sheet" (click)="$event.stopPropagation()" style="max-width:340px">
        <div class="sheet-head"><div class="sheet-title">Обрізати фото</div>
          <button class="icon-btn" type="button" (click)="cancel()" aria-label="Закрити"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
        </div>
        @if (loading()) {
          <div class="loading" style="min-height:220px"><div class="spinner"></div></div>
        } @else if (error()) {
          <div class="error" style="min-height:60px">{{ error() }}</div>
          <button class="btn btn-ghost btn-block" type="button" (click)="cancel()">Закрити</button>
        } @else {
          <div class="cropper-stage" [class.drag]="dragging()"
               (pointerdown)="onDown($event)" (pointermove)="onMove($event)" (pointerup)="onUp($event)" (pointercancel)="onUp($event)">
            <img [src]="src()" [style.width.px]="natW() * scale()" [style.height.px]="natH() * scale()"
                 [style.transform]="'translate(' + tx() + 'px,' + ty() + 'px)'" alt="" draggable="false" />
            <div class="cropper-ring"></div>
          </div>
          <div class="cropper-hint">Перетягни й масштабуй — вибери, що потрапить у кружечок</div>
          <input class="cropper-zoom" type="range" [min]="minScale()" [max]="minScale() * 4" step="0.001"
                 [ngModel]="scale()" (ngModelChange)="setScale($event)" aria-label="Масштаб" />
          <button class="btn btn-primary btn-block btn-lg" type="button" (click)="confirm()">Готово</button>
        }
      </div>
    </div>
  `,
})
export class ImageCropper {
  readonly file = input.required<File>();
  readonly outputSize = input(512);
  /** Emit a PNG (keeps transparency) instead of a flattened JPEG — for logos. */
  readonly transparent = input(false);
  readonly cropped = output<string>();
  readonly cancelled = output<void>();

  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly src = signal('');
  protected readonly scale = signal(1);
  protected readonly tx = signal(0);
  protected readonly ty = signal(0);
  protected readonly natW = signal(0);
  protected readonly natH = signal(0);
  protected readonly minScale = signal(1);
  protected readonly dragging = signal(false);

  private img: HTMLImageElement | null = null;
  private startX = 0;
  private startY = 0;
  private startTx = 0;
  private startTy = 0;

  constructor() {
    effect(() => {
      const file = this.file();
      if (file) void this.load(file);
    });
  }

  private async load(file: File): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const img = await loadImageElement(file);
      this.img = img;
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      if (!w || !h) throw new Error('Порожнє зображення');
      this.natW.set(w);
      this.natH.set(h);
      this.src.set(img.src);
      const min = STAGE / Math.min(w, h);
      this.minScale.set(min);
      this.scale.set(min);
      this.tx.set((STAGE - w * min) / 2);
      this.ty.set((STAGE - h * min) / 2);
      this.loading.set(false);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Не вдалося прочитати зображення');
      this.loading.set(false);
    }
  }

  private clamp(): void {
    const w = this.natW() * this.scale();
    const h = this.natH() * this.scale();
    this.tx.set(Math.min(0, Math.max(STAGE - w, this.tx())));
    this.ty.set(Math.min(0, Math.max(STAGE - h, this.ty())));
  }

  protected setScale(next: number): void {
    const min = this.minScale();
    const s = Math.min(min * 4, Math.max(min, Number(next) || min));
    const c = STAGE / 2;
    const k = s / this.scale();
    this.tx.set(c - (c - this.tx()) * k);
    this.ty.set(c - (c - this.ty()) * k);
    this.scale.set(s);
    this.clamp();
  }

  protected onDown(event: PointerEvent): void {
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    this.dragging.set(true);
    this.startX = event.clientX;
    this.startY = event.clientY;
    this.startTx = this.tx();
    this.startTy = this.ty();
  }

  protected onMove(event: PointerEvent): void {
    if (!this.dragging()) return;
    this.tx.set(this.startTx + (event.clientX - this.startX));
    this.ty.set(this.startTy + (event.clientY - this.startY));
    this.clamp();
  }

  protected onUp(event: PointerEvent): void {
    this.dragging.set(false);
    (event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId);
  }

  protected confirm(): void {
    if (!this.img) return;
    const s = this.scale();
    const sourceSize = STAGE / s;
    const url = cropToDataUrl(this.img, -this.tx() / s, -this.ty() / s, sourceSize, this.outputSize(), 0.85, this.transparent());
    this.revoke();
    this.cropped.emit(url);
  }

  protected cancel(): void {
    this.revoke();
    this.cancelled.emit();
  }

  private revoke(): void {
    if (this.img?.src.startsWith('blob:')) {
      URL.revokeObjectURL(this.img.src);
    }
  }
}
