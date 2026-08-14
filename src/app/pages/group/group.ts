import { ThemeSwitcher } from '../../components/theme-switcher';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ExpensesService, ShareInput } from '../../services/expenses.service';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { ActivityItem, BalanceResponse, ExpenseResponse, ExpenseRevision, Friend, GroupResponse, JoinRequest, ParticipantResponse, SourceResponse } from '../../models';
import { avatarClass, httpError, initials, money, moneySigned, shortDate } from '../../format';
import { ToastService } from '../../services/toast.service';
import { downscaleImage } from '../../image.util';

@Component({
  selector: 'app-group',
  imports: [ThemeSwitcher, FormsModule, RouterLink],
  styles: [`
    .seg{display:flex;gap:4px;background:var(--surface-2);padding:4px;border-radius:12px}
    .seg-btn{flex:1;border:0;background:transparent;color:var(--muted);font:inherit;font-size:13px;font-weight:600;padding:9px 6px;border-radius:9px;cursor:pointer;transition:background .12s,color .12s}
    .seg-btn.on{background:var(--surface);color:var(--ink);box-shadow:var(--shadow)}
    .req-badge{position:absolute;top:-2px;right:-2px;min-width:16px;height:16px;padding:0 4px;border-radius:8px;background:var(--neg);color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;line-height:1}
    .transfers{display:flex;flex-direction:column;gap:7px;margin-top:16px;position:relative}
    .trow{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:13.5px}
    .trow .tname{color:var(--muted);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .trow .tamt{color:var(--ink);font-weight:640;flex:0 0 auto}
  `],
  template: `
    @if (loading()) {
      <div class="app"><div class="loading"><div class="spinner"></div></div></div>
    } @else if (group(); as g) {
      <div class="app">
        <header class="topbar">
          <div class="topbar-left">
            <a class="icon-btn" routerLink="/" aria-label="Назад">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            </a>
            @if (editingName()) {
              <input class="input" style="height:34px" name="nameDraft" [(ngModel)]="nameDraft" (keyup.enter)="saveName(g)" (keyup.escape)="editingName.set(false)" />
              <button class="icon-btn" type="button" (click)="saveName(g)" aria-label="Зберегти назву">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
              </button>
            } @else {
              <button class="title-strong" type="button" (click)="startRename(g)" style="background:none;border:0;padding:0;cursor:pointer;color:inherit;font:inherit;display:inline-flex;align-items:center;gap:6px">
                {{ g.name }}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
              </button>
            }
          </div>
          <div style="display:flex;align-items:center;gap:6px">
            <button class="icon-btn" type="button" (click)="openSettings()" aria-label="Налаштування групи" style="position:relative">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              @if (joinRequests().length > 0) { <span class="req-badge">{{ joinRequests().length }}</span> }
            </button>
            <app-theme-switcher />
          </div>
        </header>

        @let bal = balance();
        @let mine = myNet();
        <section class="hero">
          @if (bal && bal.transfers.length > 0) {
            @if (mine !== null && mine > 0.005) {
              <div class="eyebrow">Тобі винні</div>
              <div class="settle-amount tnum">{{ money(mine) }}</div>
            } @else if (mine !== null && mine < -0.005) {
              <div class="eyebrow">Ти винен</div>
              <div class="settle-amount tnum">{{ money(-mine) }}</div>
            } @else if (mine !== null) {
              <div class="eyebrow">Твій баланс</div>
              <div class="settle-amount" style="font-size:1.8rem">Ти в розрахунку</div>
            } @else {
              <div class="eyebrow">Хто кому винен</div>
            }
            @if (bal.transfers.length > 1 || mine === null) {
              <div class="transfers">
                @for (tr of bal.transfers; track tr.fromParticipantId + '_' + tr.toParticipantId) {
                  <div class="trow"><span class="tname">{{ tr.fromName }} → {{ tr.toName }}</span><span class="tamt tnum">{{ money(tr.amount) }}</span></div>
                }
              </div>
            }
            <div class="hero-actions">
              <button class="btn btn-ghost" type="button" (click)="openSettle()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                Повернути борг
              </button>
            </div>
          } @else {
            <div class="eyebrow">Баланс</div>
            <div class="settle-amount" style="font-size:1.7rem">Усі розрахувалися 🎉</div>
          }
        </section>

        @if (joinRequests().length > 0) {
          <section>
            <div class="section-head"><span class="section-title">Заявки на приєднання</span></div>
            <div class="card rows">
              @for (r of joinRequests(); track r.id) {
                <div class="row">
                  <div [class]="avatarClass(r.id)">{{ initials(r.displayName) }}</div>
                  <div class="row-main">
                    <div class="row-title">{{ r.displayName }}</div>
                    <div class="row-sub">хоче приєднатися · {{ shortDate(r.createdUtc) }}</div>
                  </div>
                  <div style="display:flex;gap:6px">
                    <button class="btn btn-primary btn-sm" type="button" (click)="approve(r.id)" [disabled]="busy()">Схвалити</button>
                    <button class="btn btn-ghost btn-sm" type="button" (click)="reject(r.id)" [disabled]="busy()">Відхилити</button>
                  </div>
                </div>
              }
            </div>
          </section>
        }

        <section>
          <div class="section-head">
            <span class="section-title">Учасники</span>
            <button class="link" type="button" (click)="toggleSplit(g)">{{ showSplit() ? 'Готово' : 'Поділ' }}</button>
          </div>
          <div class="card rows">
            @for (p of g.participants; track p.id) {
              <div class="row">
                <div [class]="avatarClass(p.id)">{{ initials(p.displayName) }}</div>
                <div class="row-main">
                  <div class="row-title">{{ p.displayName }}@if (isMe(p)) { <span class="chip">ти</span> } @else if (p.userId) { <span class="chip">акаунт</span> }</div>
                  @if (!showSplit()) {
                    <div class="row-sub">частка {{ p.defaultSharePercent }}% · заплатив {{ money(paidFor(p.id)) }}</div>
                  }
                </div>
                @if (showSplit()) {
                  <div style="display:flex;align-items:center;gap:6px;color:var(--muted);font-size:13px">
                    <input class="input" type="number" step="0.01" [name]="'sp_' + p.id" [ngModel]="splitDraft[p.id]" (ngModelChange)="rebalance(p.id, $event)" style="height:38px;width:76px" /> %
                  </div>
                } @else {
                  <div class="amount tnum" [class.pos]="netFor(p.id) >= 0" [class.neg]="netFor(p.id) < 0">{{ moneySigned(netFor(p.id)) }}</div>
                }
              </div>
            }
          </div>

          @if (showSplit()) {
            <div class="card card-pad form-col" style="margin-top:10px">
              <button class="btn btn-primary btn-sm" type="button" (click)="saveSplit(g)" [disabled]="busy()">Зберегти поділ</button>
              <div class="section-title" style="margin-top:6px">Додати учасника</div>
              <div class="form-row">
                <input class="input" name="paName" [(ngModel)]="paName" placeholder="Ім'я" />
                <input class="input w-pct" type="number" step="0.01" name="paShare" [(ngModel)]="paShare" placeholder="%" />
              </div>
              <input class="input" name="paLink" [(ngModel)]="paLink" placeholder="@логін або email (щоб приєднати акаунт)" autocapitalize="off" autocomplete="off" />
              <button class="btn btn-ghost btn-sm" type="button" (click)="addParticipant(g)" [disabled]="busy() || (!paName.trim() && !paLink.trim())">Додати</button>

              <div class="section-title" style="margin-top:6px">Або з друзів</div>
              <button class="btn btn-ghost btn-sm" type="button" (click)="toggleFriendPicker()">{{ showFriendPicker() ? 'Сховати друзів' : 'Показати друзів' }}</button>
              @if (showFriendPicker()) {
                @if (friendsLoading()) {
                  <div class="row-sub">Завантаження…</div>
                } @else if (availableFriends(g).length === 0) {
                  <div class="row-sub">Немає доступних друзів. Додай їх у вкладці «Друзі».</div>
                } @else {
                  <div class="card rows">
                    @for (f of availableFriends(g); track f.userId) {
                      <div class="row">
                        <div [class]="avatarClass(f.userId)">{{ initials(f.displayName) }}</div>
                        <div class="row-main">
                          <div class="row-title">{{ f.displayName }}</div>
                          @if (f.handle) { <div class="row-sub">&#64;{{ f.handle }}</div> }
                        </div>
                        <button class="btn btn-primary btn-sm" type="button" (click)="addFromFriend(g, f)" [disabled]="busy()">Додати</button>
                      </div>
                    }
                  </div>
                }
              }
              <div class="error">{{ error() }}</div>
            </div>
          }
        </section>

        <section>
          <div class="section-head"><span class="section-title">Історія</span></div>
          @if (activity().length === 0) {
            <div class="card"><div class="empty">Ще порожньо. Додай перший чек 👇</div></div>
          } @else {
            <div class="card rows">
              @for (a of activity(); track a.id) {
                <div class="row" [style.cursor]="a.type !== 'opening' && !a.isDeleted ? 'pointer' : 'default'" [style.opacity]="a.isDeleted ? '0.55' : '1'" (click)="onActivityClick(g, a)">
                  <div class="avatar" aria-hidden="true">
                    @if (a.type === 'settlement') {
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M7 11l-4 4 4 4"/><path d="M3 15h13a4 4 0 0 0 4-4V5"/></svg>
                    } @else if (a.type === 'opening') {
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 8v4l3 2"/></svg>
                    } @else {
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2h9l3 3v17l-2.4-1.4L13 22l-2.6-1.4L8 22l-2.6-1.4L3 22V4a2 2 0 0 1 2-2z"/><path d="M8 8h6M8 12h6"/></svg>
                    }
                  </div>
                  <div class="row-main">
                    <div class="row-title" [style.text-decoration]="a.isDeleted ? 'line-through' : 'none'">{{ a.title }}@if (a.isDeleted) { <span class="chip">видалено</span> } @else if (a.isEdited) { <span class="chip">змінено</span> }</div>
                    <div class="row-sub">{{ a.subtitle }} · {{ shortDate(a.date) }}</div>
                  </div>
                  @if (a.receiptUrl) {
                    <button class="icon-btn" type="button" (click)="$event.stopPropagation(); lightbox.set(a.receiptUrl!)" aria-label="Показати чек" style="width:32px;height:32px">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a5 5 0 0 1-7.07-7.07l9.19-9.19a3.5 3.5 0 0 1 4.95 4.95l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                    </button>
                  }
                  <div class="amount tnum" [class.pos]="a.type === 'settlement' || (a.type === 'opening' && a.amount >= 0)" [class.neg]="a.type === 'opening' && a.amount < 0" [class.plain]="a.type === 'expense'">{{ a.type === 'opening' ? moneySigned(a.amount) : money(a.amount) }}</div>
                </div>
              }
            </div>
          }
        </section>

      </div>

      <div class="fab-wrap">
        <button class="btn btn-primary btn-lg" type="button" (click)="openAdd(g)">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
          Додати чек
        </button>
      </div>

      @if (showAdd()) {
        <div class="scrim" (click)="showAdd.set(false)">
          <div class="sheet" (click)="$event.stopPropagation()">
            <div class="sheet-head"><div class="sheet-title">{{ editingExpenseId() ? 'Редагувати чек' : 'Новий чек' }}</div>
              <button class="icon-btn" type="button" (click)="showAdd.set(false)" aria-label="Закрити"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
            </div>
            <div class="form-col">
              <div class="form-row">
                <label class="field" style="flex:1.4"><span>Сума, ₴</span><input class="input" type="number" step="0.01" name="exAmount" [(ngModel)]="exAmount" /></label>
                <label class="field"><span>Хто платив</span>
                  <select class="input" name="exPayer" [(ngModel)]="exPayer">
                    @for (p of g.participants; track p.id) { <option [value]="p.id">{{ p.displayName }}</option> }
                  </select>
                </label>
              </div>
              <div class="field" style="position:relative">
                <span>Джерело</span>
                <div style="display:flex;align-items:center;gap:6px">
                  <input class="input" name="exSourceQuery" [ngModel]="exSourceQuery()" (ngModelChange)="onSourceInput($event)" (focus)="showSourceList.set(true)" placeholder="напр. Сільпо" autocapitalize="off" autocomplete="off" style="flex:1" />
                  @if (exSourceId()) {
                    <button class="icon-btn" type="button" (click)="clearSource()" aria-label="Очистити"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
                  }
                </div>
                @if (showSourceList() && (filteredSources().length || canCreateSource())) {
                  <div class="card rows" style="position:absolute;left:0;right:0;top:100%;z-index:30;max-height:260px;overflow:auto;margin-top:4px;box-shadow:var(--shadow-hero)">
                    @if (canCreateSource()) {
                      <div class="row" style="cursor:pointer" (click)="createSourceFromQuery()">
                        <div [class]="avatarClass('new')" style="width:30px;height:30px;font-size:16px">+</div>
                        <div class="row-main"><div class="row-title">Додати «{{ exSourceQuery().trim() }}»</div><div class="row-sub">власне джерело</div></div>
                      </div>
                    }
                    @for (s of filteredSources(); track s.id) {
                      <div class="row" style="cursor:pointer" (click)="selectSource(s)">
                        @if (s.iconUrl) {
                          <img [src]="s.iconUrl" alt="" style="width:30px;height:30px;border-radius:8px;object-fit:cover;flex:0 0 auto" />
                        } @else if (!iconFailed().has(s.slug)) {
                          <img [src]="'assets/merchants/' + s.slug + '.png'" (error)="markIconFailed(s.slug)" alt="" style="width:30px;height:30px;border-radius:8px;object-fit:contain;flex:0 0 auto" />
                        } @else {
                          <div [class]="avatarClass(s.slug)" style="width:30px;height:30px;font-size:12px">{{ initials(s.name) }}</div>
                        }
                        <div class="row-main"><div class="row-title">{{ s.name }}</div><div class="row-sub">{{ s.category }}</div></div>
                        <button class="icon-btn" type="button" (click)="toggleFav(s, $event)" [attr.aria-label]="s.isFavorite ? 'Прибрати з обраного' : 'В обране'" style="width:30px;height:30px">
                          <svg width="16" height="16" viewBox="0 0 24 24" [attr.fill]="s.isFavorite ? 'var(--accent)' : 'none'" [attr.stroke]="s.isFavorite ? 'var(--accent)' : 'var(--faint)'" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                        </button>
                      </div>
                    }
                    <a class="row" routerLink="/sources" style="color:var(--muted);text-decoration:none">
                      <div class="row-main"><div class="row-sub">⚙ Керувати джерелами</div></div>
                    </a>
                  </div>
                }
              </div>
              <label class="field"><span>Опис</span><input class="input" name="exDesc" [(ngModel)]="exDesc" placeholder="За що (напр. Продукти)" /></label>
              @if (!editingExpenseId()) {
                <div style="display:flex;align-items:center;gap:10px">
                  @if (exPhoto(); as ph) {
                    <img [src]="ph" alt="Чек" style="width:54px;height:54px;border-radius:10px;object-fit:cover;border:1px solid var(--line)" (click)="lightbox.set(ph)" />
                    <button class="link" type="button" (click)="exPhoto.set(null)">Прибрати фото</button>
                  } @else {
                    <button class="btn btn-ghost btn-sm" type="button" (click)="exFile.click()" [disabled]="exPhotoBusy()">@if (exPhotoBusy()) { <span class="btn-spin"></span> } 📷 Фото чека</button>
                  }
                  <input #exFile type="file" accept="image/*" hidden (change)="onExpensePhoto($event)" />
                </div>
              }
              <button class="btn btn-primary btn-block btn-lg" type="button" (click)="saveExpense(g)" [disabled]="busy() || !exDesc.trim() || !exAmount">@if (busy()) { <span class="btn-spin"></span> } {{ editingExpenseId() ? 'Зберегти зміни' : 'Зберегти чек' }}</button>
              @if (editingExpenseId()) {
                <div style="display:flex;gap:8px">
                  <button class="btn btn-ghost btn-sm" type="button" style="flex:1" (click)="loadRevisions(g)">{{ showRevisions() ? 'Сховати історію' : 'Історія змін' }}</button>
                  <button class="btn btn-ghost btn-sm" type="button" style="flex:1;color:var(--neg)" (click)="removeExpense(g)" [disabled]="busy()">Видалити чек</button>
                </div>
                @if (showRevisions()) {
                  @if (revisions().length === 0) {
                    <div class="row-sub">Змін ще не було.</div>
                  } @else {
                    <div class="card rows">
                      @for (r of revisions(); track r.id) {
                        <div class="row">
                          <div class="row-main">
                            <div class="row-title">{{ r.changeKind === 'deleted' ? 'Видалено' : 'Було' }}: {{ money(r.amount) }} · {{ r.description }}</div>
                            <div class="row-sub">{{ participantName(r.payerParticipantId) }} · {{ shortDate(r.changedUtc) }}</div>
                          </div>
                        </div>
                      }
                    </div>
                  }
                }
              }
              <div class="error">{{ error() }}</div>
            </div>
          </div>
        </div>
      }

      @if (showSettle()) {
        <div class="scrim" (click)="showSettle.set(false)">
          <div class="sheet" (click)="$event.stopPropagation()">
            <div class="sheet-head"><div class="sheet-title">Повернути борг</div>
              <button class="icon-btn" type="button" (click)="showSettle.set(false)" aria-label="Закрити"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
            </div>
            <div class="form-col">
              <div class="form-row">
                <label class="field"><span>Від кого</span>
                  <select class="input" name="seFrom" [(ngModel)]="seFrom">
                    @for (p of g.participants; track p.id) { <option [value]="p.id">{{ p.displayName }}</option> }
                  </select>
                </label>
                <label class="field"><span>Кому</span>
                  <select class="input" name="seTo" [(ngModel)]="seTo">
                    @for (p of g.participants; track p.id) { <option [value]="p.id">{{ p.displayName }}</option> }
                  </select>
                </label>
              </div>
              <label class="field"><span>Сума, ₴ (можна частково)</span><input class="input" type="number" step="0.01" name="seAmount" [(ngModel)]="seAmount" /></label>
              <button class="btn btn-primary btn-block btn-lg" type="button" (click)="settle(g)" [disabled]="busy() || !seAmount || seFrom === seTo">@if (busy()) { <span class="btn-spin"></span> } Записати повернення</button>
              <div class="error">{{ error() }}</div>
            </div>
          </div>
        </div>
      }

      @if (showSettings()) {
        <div class="scrim" (click)="showSettings.set(false)">
          <div class="sheet" (click)="$event.stopPropagation()">
            <div class="sheet-head"><div class="sheet-title">Налаштування групи</div>
              <button class="icon-btn" type="button" (click)="showSettings.set(false)" aria-label="Закрити"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
            </div>
            <div class="form-col">
              <div class="section-title">Приєднання</div>
              <div class="seg">
                <button type="button" class="seg-btn" [class.on]="g.membershipMode !== 'approval'" (click)="setMode(g, 'open')" [disabled]="busy()">Вільне</button>
                <button type="button" class="seg-btn" [class.on]="g.membershipMode === 'approval'" (click)="setMode(g, 'approval')" [disabled]="busy()">За підтвердженням</button>
              </div>
              <div class="row-sub">{{ g.membershipMode === 'approval' ? 'Нові учасники надсилають заявку — її треба схвалити.' : 'Будь-хто з посиланням одразу стає учасником.' }}</div>

              <div class="section-title" style="margin-top:8px">Посилання-запрошення</div>
              @if (g.inviteToken) {
                <input class="input" [value]="inviteUrl(g)" readonly (focus)="selectAll($event)" />
                <div class="form-row">
                  <button class="btn btn-primary btn-sm" type="button" style="flex:1" (click)="copyInvite(g)">Копіювати</button>
                  <button class="btn btn-ghost btn-sm" type="button" style="flex:1" (click)="revokeInvite(g)" [disabled]="busy()">Відкликати</button>
                </div>
              } @else {
                <button class="btn btn-ghost btn-sm" type="button" (click)="createInvite(g)" [disabled]="busy()">Створити посилання</button>
              }

              <div class="section-title" style="margin-top:8px">Історія</div>
              <button class="btn btn-ghost btn-sm" type="button" (click)="clearHistory(g)" [disabled]="busy()" style="color:var(--neg)">Очистити історію</button>
              <div class="row-sub">Прибирає всі чеки й повернення, а поточні борги переносить у стартові суми — баланс не зміниться.</div>

              @if (unlinked(g).length > 0) {
                <div class="section-title" style="margin-top:8px">Прив'язати акаунт до учасника</div>
                <div class="row-sub">Якщо хтось вів витрати за іншого, а той згодом зареєструвався — приєднай його акаунт, і минулі чеки стануть його.</div>
                <div class="card rows" style="margin-top:4px">
                  @for (p of unlinked(g); track p.id) {
                    <div class="row" style="flex-wrap:wrap">
                      <div [class]="avatarClass(p.id)">{{ initials(p.displayName) }}</div>
                      <div class="row-main"><div class="row-title">{{ p.displayName }}</div></div>
                      @if (linkingId() !== p.id) {
                        <button class="btn btn-ghost btn-sm" type="button" (click)="startLink(p)">Прив'язати</button>
                      } @else {
                        <div style="flex-basis:100%;display:flex;gap:6px;margin-top:8px">
                          <input class="input" name="linkDraft" [(ngModel)]="linkDraft" placeholder="@логін або email" autocapitalize="off" autocomplete="off" style="flex:1" (keyup.enter)="confirmLink(g, p)" />
                          <button class="btn btn-primary btn-sm" type="button" (click)="confirmLink(g, p)" [disabled]="busy() || !linkDraft.trim()">OK</button>
                          <button class="icon-btn" type="button" (click)="cancelLink()" aria-label="Скасувати"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
                        </div>
                      }
                    </div>
                  }
                </div>
              }
              <div class="error">{{ error() }}</div>
            </div>
          </div>
        </div>
      }

      @if (lightbox(); as url) {
        <div class="scrim" (click)="lightbox.set(null)" style="align-items:center;justify-content:center;padding:16px">
          <img [src]="url" alt="Чек" (click)="$event.stopPropagation()" style="max-width:92vw;max-height:86vh;border-radius:12px;box-shadow:var(--shadow-hero)" />
        </div>
      }
    } @else {
      <div class="app"><div class="empty" style="margin-top:60px">{{ error() || 'Групу не знайдено.' }}</div></div>
    }
  `,
})
export class Group {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ExpensesService);
  private readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);
  private readonly toast = inject(ToastService);

  protected readonly money = money;
  protected readonly moneySigned = moneySigned;
  protected readonly shortDate = shortDate;
  protected readonly initials = initials;
  protected readonly avatarClass = avatarClass;

  protected readonly group = signal<GroupResponse | null>(null);
  protected readonly balance = signal<BalanceResponse | null>(null);
  protected readonly activity = signal<ActivityItem[]>([]);
  protected readonly joinRequests = signal<JoinRequest[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly busy = signal(false);

  protected readonly showAdd = signal(false);
  protected readonly showSettle = signal(false);
  protected readonly showSplit = signal(false);
  protected readonly showSettings = signal(false);
  protected readonly editingName = signal(false);
  protected readonly linkingId = signal<string | null>(null);
  protected readonly friends = signal<Friend[]>([]);
  protected readonly showFriendPicker = signal(false);
  protected readonly friendsLoading = signal(false);
  private friendsLoaded = false;
  protected readonly exPhoto = signal<string | null>(null);
  protected readonly exPhotoBusy = signal(false);
  protected readonly lightbox = signal<string | null>(null);
  protected readonly sources = signal<SourceResponse[]>([]);
  private sourcesLoaded = false;
  protected readonly exSourceId = signal<string | null>(null);
  protected readonly exSourceQuery = signal('');
  protected readonly showSourceList = signal(false);
  protected readonly iconFailed = signal<Set<string>>(new Set<string>());
  protected readonly expenses = signal<ExpenseResponse[]>([]);
  protected readonly editingExpenseId = signal<string | null>(null);
  protected readonly revisions = signal<ExpenseRevision[]>([]);
  protected readonly showRevisions = signal(false);

  protected exAmount: number | null = null;
  protected exDesc = '';
  protected exPayer = '';

  protected seFrom = '';
  protected seTo = '';
  protected seAmount: number | null = null;

  protected splitDraft: Record<string, number> = {};
  protected paName = '';
  protected paShare: number | null = null;
  protected paLink = '';
  protected nameDraft = '';
  protected linkDraft = '';

  private groupId = '';

  constructor() {
    this.groupId = this.route.snapshot.paramMap.get('id') ?? '';
    void this.load();
  }

  protected isMe(p: ParticipantResponse): boolean {
    return !!p.userId && p.userId === this.auth.user()?.id;
  }

  protected unlinked(g: GroupResponse): ParticipantResponse[] {
    return g.participants.filter(p => !p.userId);
  }

  protected inviteUrl(g: GroupResponse): string {
    return `${window.location.origin}/join/${g.inviteToken}`;
  }

  protected participantName(id: string): string {
    return this.group()?.participants.find(p => p.id === id)?.displayName ?? '—';
  }

  protected onActivityClick(g: GroupResponse, a: ActivityItem): void {
    if (a.isDeleted || a.type === 'opening') return;
    if (a.type === 'expense') {
      this.openEdit(g, a.id);
    } else if (a.type === 'settlement') {
      void this.deleteSettlement(g, a);
    }
  }

  protected async deleteSettlement(g: GroupResponse, a: ActivityItem): Promise<void> {
    if (!confirm('Видалити це повернення? Воно лишиться в історії позначеним.')) return;
    await this.run(async () => {
      await this.api.deleteSettlement(g.id, a.id);
    }, 'Повернення видалено');
  }

  protected netFor(id: string): number {
    return this.balance()?.balances.find(b => b.participantId === id)?.net ?? 0;
  }

  protected paidFor(id: string): number {
    return this.balance()?.balances.find(b => b.participantId === id)?.paid ?? 0;
  }

  /** The current user's net (positive = owed to them, negative = they owe); null if not a participant. */
  protected myNet(): number | null {
    const balance = this.balance();
    const group = this.group();
    const uid = this.auth.user()?.id;
    if (!balance || !group || !uid) return null;
    const me = group.participants.find(p => p.userId === uid);
    if (!me) return null;
    return balance.balances.find(b => b.participantId === me.id)?.net ?? null;
  }

  protected openAdd(g: GroupResponse): void {
    const mine = g.participants.find(p => this.isMe(p));
    this.exPayer = (mine ?? g.participants[0])?.id ?? '';
    this.exAmount = null;
    this.exDesc = '';
    this.exPhoto.set(null);
    this.exSourceId.set(null);
    this.exSourceQuery.set('');
    this.showSourceList.set(false);
    this.editingExpenseId.set(null);
    this.showRevisions.set(false);
    void this.ensureSources();
    this.error.set('');
    this.showAdd.set(true);
  }

  protected openEdit(g: GroupResponse, expenseId: string): void {
    const ex = this.expenses().find(e => e.id === expenseId);
    if (!ex) return;
    this.editingExpenseId.set(expenseId);
    this.exPayer = ex.payerParticipantId;
    this.exAmount = ex.amount;
    this.exDesc = ex.description;
    this.exPhoto.set(null);
    this.exSourceId.set(ex.sourceId ?? null);
    this.exSourceQuery.set('');
    this.showSourceList.set(false);
    this.showRevisions.set(false);
    this.revisions.set([]);
    this.error.set('');
    void this.ensureSources().then(() => {
      this.exSourceQuery.set(ex.sourceId ? (this.sources().find(s => s.id === ex.sourceId)?.name ?? '') : '');
    });
    this.showAdd.set(true);
  }

  protected async removeExpense(g: GroupResponse): Promise<void> {
    const id = this.editingExpenseId();
    if (!id) return;
    if (!confirm('Видалити чек? Він лишиться в історії позначеним, зображення збережеться.')) return;
    await this.run(async () => {
      await this.api.deleteExpense(g.id, id);
      this.showAdd.set(false);
    }, 'Чек видалено');
  }

  protected async loadRevisions(g: GroupResponse): Promise<void> {
    const id = this.editingExpenseId();
    if (!id) return;
    const next = !this.showRevisions();
    this.showRevisions.set(next);
    if (next && this.revisions().length === 0) {
      try {
        this.revisions.set(await this.api.listRevisions(g.id, id));
      } catch {
        /* revisions are optional */
      }
    }
  }

  protected async clearHistory(g: GroupResponse): Promise<void> {
    if (!confirm('Очистити історію? Усі чеки й повернення буде прибрано (разом із фото), а поточні борги перенесено у стартові суми — баланс не зміниться.')) return;
    await this.run(async () => {
      await this.api.clearHistory(g.id);
      this.showSettings.set(false);
    }, 'Історію очищено');
  }

  private async ensureSources(): Promise<void> {
    if (this.sourcesLoaded) return;
    try {
      this.sources.set(await this.api.listSources());
      this.sourcesLoaded = true;
    } catch {
      /* sources are optional */
    }
  }

  protected selectedSource(): SourceResponse | undefined {
    const id = this.exSourceId();
    return id ? this.sources().find(s => s.id === id) : undefined;
  }

  protected filteredSources(): SourceResponse[] {
    const q = this.exSourceQuery().trim().toLowerCase();
    const list = this.sources();
    const filtered = q
      ? list.filter(s => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q))
      : list;
    return filtered.slice(0, 40);
  }

  protected onSourceInput(value: string): void {
    this.exSourceQuery.set(value);
    this.exSourceId.set(null);
    this.showSourceList.set(true);
  }

  protected selectSource(s: SourceResponse): void {
    this.exSourceId.set(s.id);
    this.exSourceQuery.set(s.name);
    if (!this.exDesc.trim()) {
      this.exDesc = s.name;
    }
    this.showSourceList.set(false);
  }

  protected clearSource(): void {
    this.exSourceId.set(null);
    this.exSourceQuery.set('');
    this.showSourceList.set(false);
  }

  protected markIconFailed(slug: string): void {
    const next = new Set(this.iconFailed());
    next.add(slug);
    this.iconFailed.set(next);
  }

  private async reloadSources(): Promise<void> {
    try {
      this.sources.set(await this.api.listSources());
      this.sourcesLoaded = true;
    } catch {
      /* sources are optional */
    }
  }

  protected async toggleFav(s: SourceResponse, event: Event): Promise<void> {
    event.stopPropagation();
    try {
      await this.api.setSourceFavorite(s.id, !s.isFavorite);
      await this.reloadSources();
    } catch (e) {
      this.toast.show(httpError(e), 'err');
    }
  }

  protected canCreateSource(): boolean {
    const q = this.exSourceQuery().trim().toLowerCase();
    if (!q) return false;
    return !this.sources().some(s => s.name.toLowerCase() === q);
  }

  protected async createSourceFromQuery(): Promise<void> {
    const name = this.exSourceQuery().trim();
    if (!name) return;
    try {
      const created = await this.api.createSource(name);
      await this.reloadSources();
      this.selectSource(created);
      this.toast.show('Джерело додано');
    } catch (e) {
      this.toast.show(httpError(e), 'err');
    }
  }

  protected async onExpensePhoto(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.exPhotoBusy.set(true);
    try {
      const { dataUrl } = await downscaleImage(file, { maxSize: 1280, quality: 0.8 });
      this.exPhoto.set(dataUrl);
    } catch (e) {
      this.toast.show(httpError(e), 'err');
    } finally {
      this.exPhotoBusy.set(false);
    }
  }

  protected openSettle(): void {
    const t = this.balance()?.transfers[0];
    const parts = this.group()?.participants ?? [];
    this.seFrom = t?.fromParticipantId ?? parts[0]?.id ?? '';
    this.seTo = t?.toParticipantId ?? parts[1]?.id ?? '';
    this.seAmount = t?.amount ?? null;
    this.error.set('');
    this.showSettle.set(true);
  }

  protected openSettings(): void {
    this.error.set('');
    this.linkingId.set(null);
    this.showSettings.set(true);
  }

  protected toggleSplit(g: GroupResponse): void {
    if (!this.showSplit()) {
      this.splitDraft = {};
      for (const p of g.participants) this.splitDraft[p.id] = p.defaultSharePercent;
      this.paName = '';
      this.paShare = null;
    }
    this.error.set('');
    this.showSplit.set(!this.showSplit());
  }

  protected startRename(g: GroupResponse): void {
    this.nameDraft = g.name;
    this.editingName.set(true);
  }

  protected async saveName(g: GroupResponse): Promise<void> {
    const name = this.nameDraft.trim();
    this.editingName.set(false);
    if (!name || name === g.name) return;
    await this.run(async () => { await this.api.renameGroup(g.id, name); }, 'Назву оновлено');
  }

  protected startLink(p: ParticipantResponse): void {
    this.linkDraft = '';
    this.error.set('');
    this.linkingId.set(p.id);
  }

  protected cancelLink(): void {
    this.linkingId.set(null);
    this.linkDraft = '';
  }

  protected async confirmLink(g: GroupResponse, p: ParticipantResponse): Promise<void> {
    const query = this.linkDraft.trim();
    if (!query) return;
    await this.run(async () => {
      await this.api.linkParticipant(g.id, p.id, query);
      this.linkingId.set(null);
      this.linkDraft = '';
    }, 'Акаунт прив’язано');
  }

  protected async setMode(g: GroupResponse, mode: 'open' | 'approval'): Promise<void> {
    const current = g.membershipMode === 'approval' ? 'approval' : 'open';
    if (current === mode) return;
    await this.run(async () => { await this.api.setMembershipMode(g.id, mode); },
      mode === 'approval' ? 'Приєднання — за підтвердженням' : 'Приєднання — вільне');
  }

  protected async createInvite(g: GroupResponse): Promise<void> {
    await this.run(async () => { await this.api.createInvite(g.id); }, 'Посилання створено');
  }

  protected async revokeInvite(g: GroupResponse): Promise<void> {
    await this.run(async () => { await this.api.revokeInvite(g.id); }, 'Посилання відкликано');
  }

  protected async copyInvite(g: GroupResponse): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.inviteUrl(g));
      this.toast.show('Посилання скопійовано');
    } catch {
      this.toast.show('Не вдалося скопіювати — виділіть вручну', 'err');
    }
  }

  protected selectAll(event: Event): void {
    (event.target as HTMLInputElement).select();
  }

  protected async approve(requestId: string): Promise<void> {
    await this.run(async () => { await this.api.approveJoinRequest(this.groupId, requestId); }, 'Учасника додано');
  }

  protected async reject(requestId: string): Promise<void> {
    await this.run(async () => { await this.api.rejectJoinRequest(this.groupId, requestId); }, 'Заявку відхилено');
  }

  protected rebalance(changedId: string, value: number | string): void {
    const g = this.group();
    if (!g) return;
    const clamped = Math.max(0, Math.min(100, Number(value) || 0));
    this.splitDraft[changedId] = clamped;

    const others = g.participants.filter(p => p.id !== changedId);
    if (others.length === 0) return;

    const remaining = 100 - clamped;
    const otherSum = others.reduce((sum, p) => sum + (Number(this.splitDraft[p.id]) || 0), 0);
    let assigned = 0;
    others.forEach((p, index) => {
      let share: number;
      if (index === others.length - 1) {
        share = round2(remaining - assigned);
      } else if (otherSum > 0) {
        share = round2(remaining * (Number(this.splitDraft[p.id]) || 0) / otherSum);
      } else {
        share = round2(remaining / others.length);
      }
      this.splitDraft[p.id] = Math.max(0, share);
      assigned += share;
    });
  }

  protected async saveExpense(g: GroupResponse): Promise<void> {
    if (!this.exAmount || !this.exDesc.trim()) return;
    const editingId = this.editingExpenseId();
    const body = { payerParticipantId: this.exPayer, amount: this.exAmount, description: this.exDesc.trim(), sourceId: this.exSourceId() };
    const photo = this.exPhoto();
    await this.run(async () => {
      if (editingId) {
        await this.api.editExpense(g.id, editingId, body);
      } else {
        const created = await this.api.addExpense(g.id, body);
        if (photo) {
          await this.api.uploadReceipt(g.id, created.id, photo);
        }
      }
      this.showAdd.set(false);
    }, editingId ? 'Чек оновлено' : 'Чек додано');
  }

  protected async settle(g: GroupResponse): Promise<void> {
    if (!this.seAmount || this.seFrom === this.seTo) return;
    await this.run(async () => {
      await this.api.recordSettlement(g.id, { fromParticipantId: this.seFrom, toParticipantId: this.seTo, amount: this.seAmount! });
      this.showSettle.set(false);
    }, 'Повернення записано');
  }

  protected async addParticipant(g: GroupResponse): Promise<void> {
    if (!this.paName.trim() && !this.paLink.trim()) return;
    await this.run(async () => {
      await this.api.addParticipant(g.id, this.paName.trim(), this.paShare ?? 0, this.paLink.trim() || undefined);
      this.paName = '';
      this.paShare = null;
      this.paLink = '';
      this.showSplit.set(false);
    }, 'Учасника додано');
  }

  protected async toggleFriendPicker(): Promise<void> {
    const next = !this.showFriendPicker();
    this.showFriendPicker.set(next);
    if (next && !this.friendsLoaded) {
      this.friendsLoading.set(true);
      try {
        this.friends.set(await this.auth.listFriends());
        this.friendsLoaded = true;
      } catch {
        /* friends are optional here */
      } finally {
        this.friendsLoading.set(false);
      }
    }
  }

  protected availableFriends(g: GroupResponse): Friend[] {
    const taken = new Set(g.participants.map(p => p.userId).filter((id): id is string => !!id));
    return this.friends().filter(f => !taken.has(f.userId));
  }

  protected async addFromFriend(g: GroupResponse, friend: Friend): Promise<void> {
    await this.run(async () => {
      await this.api.addParticipant(g.id, friend.displayName, 0, undefined, friend.userId);
    }, 'Учасника додано');
  }

  protected async saveSplit(g: GroupResponse): Promise<void> {
    const shares: ShareInput[] = g.participants.map(p => ({ participantId: p.id, percent: Number(this.splitDraft[p.id] ?? 0) }));
    await this.run(async () => {
      await this.api.setSplit(g.id, shares);
      this.showSplit.set(false);
    }, 'Поділ збережено');
  }

  private async run(action: () => Promise<void>, okMessage: string): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    try {
      await action();
      await this.reload();
      this.toast.show(okMessage);
    } catch (e) {
      const message = httpError(e);
      this.error.set(message);
      this.toast.show(message, 'err');
    } finally {
      this.busy.set(false);
    }
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      await this.reload();
    } catch (e) {
      this.error.set(httpError(e));
    } finally {
      this.loading.set(false);
    }
  }

  private async reload(): Promise<void> {
    const [group, balance, activity, joinRequests, expenses] = await Promise.all([
      this.api.getGroup(this.groupId),
      this.api.getBalance(this.groupId),
      this.api.getActivity(this.groupId),
      this.api.listJoinRequests(this.groupId).catch(() => [] as JoinRequest[]),
      this.api.listExpenses(this.groupId).catch(() => [] as ExpenseResponse[]),
    ]);
    this.group.set(group);
    this.balance.set(balance);
    this.activity.set(activity);
    this.joinRequests.set(joinRequests);
    this.expenses.set(expenses);
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
