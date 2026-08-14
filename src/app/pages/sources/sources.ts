import { ThemeSwitcher } from '../../components/theme-switcher';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ExpensesService } from '../../services/expenses.service';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { ToastService } from '../../services/toast.service';
import { SourceResponse, SourceProposal } from '../../models';
import { avatarClass, httpError, initials } from '../../format';
import { downscaleImage } from '../../image.util';
import { GlassSelect, SelectOption } from '../../components/glass-select';
import { ImageCropper } from '../../components/image-cropper';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

const CATEGORIES = ['Продукти', 'Пальне', "Кав'ярні", 'Кафе та ресторани', "Краса та здоров'я", 'Одяг', 'Книгарні', 'Маркетплейс', 'Техніка', "Зв'язок", 'Транспорт', 'Доставка', 'Фінанси', 'Спорт', 'Дім', 'Розваги', 'Інше'];
const CATEGORY_OPTIONS: SelectOption[] = CATEGORIES.map(c => ({ value: c, label: c }));
const FILTER_OPTIONS: SelectOption[] = [{ value: '', label: 'Усі категорії' }, ...CATEGORY_OPTIONS];

@Component({
  selector: 'app-sources',
  imports: [ThemeSwitcher, FormsModule, RouterLink, GlassSelect, TranslatePipe, ImageCropper],
  styles: [`
    .plogo{width:48px;height:48px;border-radius:12px;object-fit:cover;border:1px solid var(--glass-brd);flex:0 0 auto;background:var(--surface-2)}
  `],
  template: `
    <div class="app">
      <header class="topbar">
        <div class="topbar-left">
          <a class="icon-btn" routerLink="/" [attr.aria-label]="'nav.back' | translate">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </a>
          <div class="title-strong">{{ 'sources.title' | translate }}</div>
        </div>
        <app-theme-switcher />
      </header>

      <section>
        <div class="section-head"><span class="section-title">{{ 'sources.addOwn' | translate }}</span></div>
        <div class="card card-pad form-col">
          <div class="form-row">
            <input class="input" name="name" [(ngModel)]="name" [placeholder]="'sources.namePlaceholder' | translate" style="flex:1.6" />
            <app-glass-select style="flex:1" [(value)]="category" [options]="categoryOptions" [ariaLabel]="'sources.category' | translate" />
          </div>
          @if (isAdmin()) {
            <label style="display:flex;align-items:center;gap:9px;cursor:pointer;font-size:13.5px;color:var(--muted)">
              <input type="checkbox" name="isGlobal" [(ngModel)]="isGlobal" style="width:17px;height:17px;accent-color:var(--accent)" />
              {{ 'sources.globalCheckbox' | translate }}
            </label>
          }
          <button class="btn btn-primary" type="button" (click)="add()" [disabled]="busy() || !name.trim()">@if (busy()) { <span class="btn-spin"></span> } {{ 'sources.add' | translate }}</button>
          <div class="error">{{ error() }}</div>
        </div>
      </section>

      @if (!isAdmin()) {
        <section>
          <div class="section-head"><span class="section-title">{{ 'sources.proposeTitle' | translate }}</span></div>
          <div class="card card-pad form-col">
            <div style="display:flex;align-items:center;gap:12px">
              @if (proposeLogo(); as logo) {
                <img class="plogo" [src]="logo" alt="" />
              } @else {
                <div class="plogo" style="display:grid;place-items:center;color:var(--faint)">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                </div>
              }
              <button class="btn btn-ghost btn-sm" type="button" (click)="proposeLogoInput.click()">{{ (proposeLogo() ? 'sources.changeLogo' : 'sources.chooseLogo') | translate }}</button>
              <input #proposeLogoInput type="file" accept="image/*" hidden (change)="onProposeLogoFile($event)" />
            </div>
            <div class="form-row">
              <input class="input" name="proposeName" [(ngModel)]="proposeName" [placeholder]="'sources.namePlaceholder' | translate" style="flex:1.6" />
              <app-glass-select style="flex:1" [(value)]="proposeCategory" [options]="categoryOptions" [ariaLabel]="'sources.category' | translate" />
            </div>
            <div class="row-sub">{{ 'sources.proposeHint' | translate }}</div>
            <button class="btn btn-primary" type="button" (click)="submitProposal()" [disabled]="proposeBusy() || !proposeName.trim() || !proposeLogo()">@if (proposeBusy()) { <span class="btn-spin"></span> } {{ 'sources.propose' | translate }}</button>
          </div>
        </section>
      }

      @if (isAdmin() && proposals().length > 0) {
        <section>
          <div class="section-head"><span class="section-title">{{ 'sources.proposalsTitle' | translate }}</span></div>
          <div class="card rows">
            @for (p of proposals(); track p.id) {
              <div class="row">
                @if (p.iconUrl) { <img class="plogo" [src]="p.iconUrl" alt="" /> } @else { <div [class]="avatarClass(p.id)">{{ initials(p.name) }}</div> }
                <div class="row-main">
                  <div class="row-title">{{ p.name }}</div>
                  <div class="row-sub">{{ p.category }} · {{ 'sources.proposedBy' | translate:{ name: p.proposerName } }}</div>
                </div>
                <div style="display:flex;gap:6px">
                  <button class="btn btn-primary btn-sm" type="button" (click)="approveProposal(p)" [disabled]="busy()">{{ 'sources.approve' | translate }}</button>
                  <button class="btn btn-ghost btn-sm" type="button" (click)="rejectProposal(p)" [disabled]="busy()">{{ 'sources.reject' | translate }}</button>
                </div>
              </div>
            }
          </div>
        </section>
      }

      <section>
        <div class="section-head">
          <span class="section-title">{{ 'sources.allSources' | translate }}</span>
          <div style="width:200px"><app-glass-select [value]="filterCategory()" (valueChange)="filterCategory.set($event)" [options]="filterOptions" [ariaLabel]="'sources.category' | translate" /></div>
        </div>
        @if (loading()) {
          <div class="loading"><div class="spinner"></div></div>
        } @else if (visibleSources().length === 0) {
          <div class="card"><div class="empty">{{ 'sources.empty' | translate }}</div></div>
        } @else {
          <input id="sourceIconInput" type="file" accept="image/*" hidden (change)="onIcon($event)" #iconInput />
          <div class="card rows">
            @for (s of visibleSources(); track s.id) {
              <div class="row">
                @if (s.iconUrl) {
                  <img [src]="s.iconUrl" alt="" style="width:36px;height:36px;border-radius:9px;object-fit:cover;flex:0 0 auto" />
                } @else if (!iconFailed().has(s.slug)) {
                  <img [src]="'assets/merchants/' + s.slug + '.png'" (error)="markIconFailed(s.slug)" alt="" style="width:36px;height:36px;border-radius:11px;object-fit:cover;flex:0 0 auto" />
                } @else {
                  <div [class]="avatarClass(s.slug)">{{ initials(s.name) }}</div>
                }
                @if (editingId() === s.id) {
                  <div class="row-main" style="gap:6px">
                    <input class="input" [name]="'en_' + s.id" [(ngModel)]="editName" style="height:36px" />
                    <app-glass-select [(value)]="editCategory" [options]="categoryOptions" [ariaLabel]="'sources.category' | translate" />
                  </div>
                  <div style="display:flex;align-items:center;gap:4px">
                    <button class="btn btn-primary btn-sm" type="button" (click)="saveEdit(s)" [disabled]="busy() || !editName.trim()">{{ 'common.ok' | translate }}</button>
                    <button class="icon-btn" type="button" (click)="cancelEdit()" [attr.aria-label]="'sources.cancelAria' | translate"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
                  </div>
                } @else {
                  <div class="row-main">
                    <div class="row-title">{{ s.name }}</div>
                    <div class="row-sub">{{ s.category }}@if (!s.isGlobal) { · {{ 'sources.tagOwn' | translate }} } @else if (isAdmin()) { · {{ 'sources.tagGlobal' | translate }} }</div>
                  </div>
                  <div style="display:flex;align-items:center;gap:2px">
                    <button class="icon-btn" type="button" (click)="toggleFav(s)" [disabled]="busy()" [attr.aria-label]="s.isFavorite ? ('sources.favRemove' | translate) : ('sources.favAdd' | translate)">
                      <svg width="17" height="17" viewBox="0 0 24 24" [attr.fill]="s.isFavorite ? 'var(--accent)' : 'none'" [attr.stroke]="s.isFavorite ? 'var(--accent)' : 'var(--faint)'" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                    </button>
                    @if (!s.isGlobal || isAdmin()) {
                      <button class="icon-btn" type="button" (click)="startEdit(s)" [disabled]="busy()" [attr.aria-label]="'sources.editAria' | translate" [title]="'sources.editAria' | translate">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
                      </button>
                      <button class="icon-btn" type="button" (click)="pickIcon(s)" [disabled]="busy()" [attr.aria-label]="'sources.iconAria' | translate" [title]="'sources.iconAria' | translate">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                      </button>
                      <button class="icon-btn" type="button" (click)="remove(s)" [disabled]="busy()" [attr.aria-label]="'sources.deleteAria' | translate">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
                      </button>
                    }
                  </div>
                }
              </div>
            }
          </div>
        }
      </section>

      <div class="foot">{{ 'sources.foot' | translate }}</div>
    </div>

    @if (cropFile(); as f) {
      <app-image-cropper [file]="f" [outputSize]="128" (cropped)="onProposeLogoCropped($event)" (cancelled)="cropFile.set(null)" />
    }
  `,
})
export class Sources {
  private readonly api = inject(ExpensesService);
  private readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);
  protected readonly avatarClass = avatarClass;
  protected readonly initials = initials;
  protected readonly categories = CATEGORIES;
  protected readonly categoryOptions = CATEGORY_OPTIONS;
  protected readonly filterOptions = FILTER_OPTIONS;
  protected readonly filterCategory = signal('');

  protected readonly sources = signal<SourceResponse[]>([]);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly iconFailed = signal<Set<string>>(new Set<string>());
  protected readonly isAdmin = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly visibleSources = computed(() => {
    const cat = this.filterCategory();
    return cat ? this.sources().filter(s => s.category === cat) : this.sources();
  });

  // Global-source proposals
  protected readonly proposals = signal<SourceProposal[]>([]);
  protected readonly proposeLogo = signal<string | null>(null);
  protected readonly cropFile = signal<File | null>(null);
  protected readonly proposeBusy = signal(false);

  protected name = '';
  protected category = CATEGORIES[0];
  protected isGlobal = false;
  protected editName = '';
  protected editCategory = CATEGORIES[0];
  protected proposeName = '';
  protected proposeCategory = CATEGORIES[0];
  private pendingIconId: string | null = null;

  constructor() {
    void this.load();
    void this.loadProfile();
  }

  private async loadProfile(): Promise<void> {
    try {
      const profile = await this.auth.getProfile();
      this.isAdmin.set(profile.isAdmin === true);
      if (profile.isAdmin === true) {
        await this.loadProposals();
      }
    } catch {
      /* admin flag is optional */
    }
  }

  private async loadProposals(): Promise<void> {
    try {
      this.proposals.set(await this.api.listSourceProposals());
    } catch {
      /* proposals are admin-only; ignore for non-admins */
    }
  }

  protected onProposeLogoFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) this.cropFile.set(file);
  }

  protected onProposeLogoCropped(dataUrl: string): void {
    this.cropFile.set(null);
    this.proposeLogo.set(dataUrl);
  }

  protected async submitProposal(): Promise<void> {
    const name = this.proposeName.trim();
    const logo = this.proposeLogo();
    if (!name || !logo) return;
    this.proposeBusy.set(true);
    try {
      await this.api.createSourceProposal(name, this.proposeCategory, logo);
      this.proposeName = '';
      this.proposeLogo.set(null);
      this.toast.show(this.translate.instant('sources.proposeSent'));
    } catch (e) {
      this.toast.show(httpError(e), 'err');
    } finally {
      this.proposeBusy.set(false);
    }
  }

  protected async approveProposal(p: SourceProposal): Promise<void> {
    this.busy.set(true);
    try {
      await this.api.approveSourceProposal(p.id);
      this.proposals.set(this.proposals().filter(x => x.id !== p.id));
      await this.load();
      this.toast.show(this.translate.instant('sources.toastProposalApproved'));
    } catch (e) {
      this.toast.show(httpError(e), 'err');
    } finally {
      this.busy.set(false);
    }
  }

  protected async rejectProposal(p: SourceProposal): Promise<void> {
    this.busy.set(true);
    try {
      await this.api.rejectSourceProposal(p.id);
      this.proposals.set(this.proposals().filter(x => x.id !== p.id));
      this.toast.show(this.translate.instant('sources.toastProposalRejected'));
    } catch (e) {
      this.toast.show(httpError(e), 'err');
    } finally {
      this.busy.set(false);
    }
  }

  protected async add(): Promise<void> {
    const name = this.name.trim();
    if (!name) return;
    this.busy.set(true);
    this.error.set('');
    try {
      await this.api.createSource(name, this.category, this.isAdmin() && this.isGlobal);
      this.name = '';
      this.isGlobal = false;
      await this.load();
      this.toast.show(this.translate.instant('sources.toastAdded'));
    } catch (e) {
      const message = httpError(e);
      this.error.set(message);
      this.toast.show(message, 'err');
    } finally {
      this.busy.set(false);
    }
  }

  protected async toggleFav(s: SourceResponse): Promise<void> {
    this.busy.set(true);
    try {
      await this.api.setSourceFavorite(s.id, !s.isFavorite);
      await this.load();
    } catch (e) {
      this.toast.show(httpError(e), 'err');
    } finally {
      this.busy.set(false);
    }
  }

  protected startEdit(s: SourceResponse): void {
    this.editingId.set(s.id);
    this.editName = s.name;
    this.editCategory = this.categories.includes(s.category) ? s.category : this.categories[0];
  }

  protected cancelEdit(): void {
    this.editingId.set(null);
  }

  protected async saveEdit(s: SourceResponse): Promise<void> {
    const name = this.editName.trim();
    if (!name) return;
    this.busy.set(true);
    try {
      await this.api.updateSource(s.id, name, this.editCategory);
      this.editingId.set(null);
      await this.load();
      this.toast.show(this.translate.instant('sources.toastUpdated'));
    } catch (e) {
      this.toast.show(httpError(e), 'err');
    } finally {
      this.busy.set(false);
    }
  }

  protected async remove(s: SourceResponse): Promise<void> {
    if (s.isGlobal && !confirm(this.translate.instant('sources.confirmDeleteGlobal', { name: s.name }))) return;
    this.busy.set(true);
    try {
      await this.api.deleteSource(s.id);
      this.sources.set(this.sources().filter(x => x.id !== s.id));
      this.toast.show(this.translate.instant('sources.toastDeleted'));
    } catch (e) {
      this.toast.show(httpError(e), 'err');
    } finally {
      this.busy.set(false);
    }
  }

  protected pickIcon(s: SourceResponse): void {
    this.pendingIconId = s.id;
    document.getElementById('sourceIconInput')?.click();
  }

  protected async onIcon(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    const id = this.pendingIconId;
    this.pendingIconId = null;
    if (!file || !id) return;

    this.busy.set(true);
    try {
      const { dataUrl } = await downscaleImage(file, { maxSize: 256, quality: 0.85, square: true });
      await this.api.uploadSourceIcon(id, dataUrl);
      await this.load();
      this.toast.show(this.translate.instant('sources.toastIconUpdated'));
    } catch (e) {
      this.toast.show(httpError(e), 'err');
    } finally {
      this.busy.set(false);
    }
  }

  protected markIconFailed(slug: string): void {
    const next = new Set(this.iconFailed());
    next.add(slug);
    this.iconFailed.set(next);
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      this.sources.set(await this.api.listSources());
    } catch (e) {
      this.error.set(httpError(e));
    } finally {
      this.loading.set(false);
    }
  }
}
