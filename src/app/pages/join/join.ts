import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ExpensesService } from '../../services/expenses.service';
import { httpError } from '../../format';

@Component({
  selector: 'app-join',
  imports: [RouterLink],
  template: `
    <div class="auth-wrap">
      <div class="auth-card" style="text-align:center">
        <div class="brand" style="justify-content:center">Sk<b>lad</b>ka</div>

        @switch (state()) {
          @case ('loading') {
            <div class="loading" style="margin:26px 0"><div class="spinner"></div></div>
            <div style="color:var(--muted)">Приєднуємо до групи…</div>
          }
          @case ('requested') {
            <h1 style="font-size:19px;font-weight:650;margin:18px 0 8px">Заявку надіслано</h1>
            <p style="color:var(--muted);margin:0 0 20px;line-height:1.5">
              Ця група приймає учасників за підтвердженням. Щойно хтось із групи схвалить твою заявку — вона зʼявиться у списку груп.
            </p>
            <a class="btn btn-primary btn-block" routerLink="/">До моїх груп</a>
          }
          @default {
            <h1 style="font-size:19px;font-weight:650;margin:18px 0 8px">Не вдалося приєднатися</h1>
            <p class="error" style="margin:0 0 20px">{{ error() }}</p>
            <a class="btn btn-ghost btn-block" routerLink="/">На головну</a>
          }
        }
      </div>
    </div>
  `,
})
export class Join {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ExpensesService);

  protected readonly state = signal<'loading' | 'requested' | 'error'>('loading');
  protected readonly error = signal('');

  constructor() {
    void this.accept();
  }

  private async accept(): Promise<void> {
    const token = this.route.snapshot.paramMap.get('token') ?? '';
    if (!token) {
      this.error.set('Недійсне посилання.');
      this.state.set('error');
      return;
    }
    try {
      const result = await this.api.acceptInvite(token);
      if (result.status === 'joined') {
        await this.router.navigate(['/groups', result.groupId]);
      } else {
        this.state.set('requested');
      }
    } catch (e) {
      this.error.set(httpError(e));
      this.state.set('error');
    }
  }
}
