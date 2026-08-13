import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  text: string;
  kind: 'ok' | 'err';
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);
  private counter = 0;

  show(text: string, kind: 'ok' | 'err' = 'ok'): void {
    const id = ++this.counter;
    this.toasts.update(list => [...list, { id, text, kind }]);
    setTimeout(() => this.dismiss(id), 2600);
  }

  dismiss(id: number): void {
    this.toasts.update(list => list.filter(t => t.id !== id));
  }
}
