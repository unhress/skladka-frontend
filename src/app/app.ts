import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './services/theme.service';
import { ToastService } from './services/toast.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `
    <router-outlet />
    <div class="toast-host">
      @for (t of toast.toasts(); track t.id) {
        <div class="toast" [class.err]="t.kind === 'err'">{{ t.text }}</div>
      }
    </div>
  `,
})
export class App {
  protected readonly toast = inject(ToastService);
  // Instantiating ThemeService applies the saved theme on boot.
  private readonly theme = inject(ThemeService);
}
