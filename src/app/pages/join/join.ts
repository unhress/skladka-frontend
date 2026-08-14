import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ExpensesService } from '../../services/expenses.service';
import { httpError } from '../../format';

@Component({
  selector: 'app-join',
  imports: [RouterLink, TranslatePipe],
  template: `
    <div class="auth-wrap">
      <div class="auth-card" style="text-align:center">
        <div class="brand" style="justify-content:center">Sk<b>lad</b>ka</div>

        @switch (state()) {
          @case ('loading') {
            <div class="loading" style="margin:26px 0"><div class="spinner"></div></div>
            <div style="color:var(--muted)">{{ 'join.joining' | translate }}</div>
          }
          @case ('requested') {
            <h1 style="font-size:19px;font-weight:650;margin:18px 0 8px">{{ 'join.requestedTitle' | translate }}</h1>
            <p style="color:var(--muted);margin:0 0 20px;line-height:1.5">
              {{ 'join.requestedText' | translate }}
            </p>
            <a class="btn btn-primary btn-block" routerLink="/">{{ 'join.toMyGroups' | translate }}</a>
          }
          @default {
            <h1 style="font-size:19px;font-weight:650;margin:18px 0 8px">{{ 'join.failTitle' | translate }}</h1>
            <p class="error" style="margin:0 0 20px">{{ error() }}</p>
            <a class="btn btn-ghost btn-block" routerLink="/">{{ 'join.toHome' | translate }}</a>
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
  private readonly translate = inject(TranslateService);

  protected readonly state = signal<'loading' | 'requested' | 'error'>('loading');
  protected readonly error = signal('');

  constructor() {
    void this.accept();
  }

  private async accept(): Promise<void> {
    const token = this.route.snapshot.paramMap.get('token') ?? '';
    if (!token) {
      this.error.set(this.translate.instant('join.invalidLink'));
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
