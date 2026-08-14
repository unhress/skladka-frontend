import { ThemeSwitcher } from '../../components/theme-switcher';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ExpensesService, ShareInput } from '../../services/expenses.service';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { ActivityItem, BalanceResponse, ExpenseResponse, ExpenseRevision, Friend, GroupResponse, JoinRequest, ParticipantResponse, SourceResponse } from '../../models';
import { avatarClass, httpError, initials, money, moneySigned, shortDate } from '../../format';
import { fuzzyMatch } from '../../search.util';
import { ToastService } from '../../services/toast.service';
import { downscaleImage } from '../../image.util';
import { ImageCropper } from '../../components/image-cropper';
import { GlassSelect, SelectOption } from '../../components/glass-select';
import { EmojiPicker } from '../../components/emoji-picker';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-group',
  imports: [ThemeSwitcher, FormsModule, RouterLink, ImageCropper, GlassSelect, EmojiPicker, TranslatePipe],
  styles: [`
    .seg{display:flex;gap:4px;background:var(--surface-2);padding:4px;border-radius:12px}
    .seg-btn{flex:1;border:0;background:transparent;color:var(--muted);font:inherit;font-size:13px;font-weight:600;padding:9px 6px;border-radius:9px;cursor:pointer;transition:background .12s,color .12s}
    .seg-btn.on{background:var(--surface);color:var(--ink);box-shadow:var(--shadow)}
    .req-badge{position:absolute;top:-2px;right:-2px;min-width:16px;height:16px;padding:0 4px;border-radius:8px;background:var(--neg);color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;line-height:1}
    .transfers{display:flex;flex-direction:column;gap:7px;margin-top:16px;position:relative}
    .trow{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:13.5px}
    .trow .tname{color:var(--muted);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .trow .tamt{color:var(--ink);font-weight:640;flex:0 0 auto}
    .gicon{width:30px;height:30px;border-radius:9px;flex:0 0 auto;border:1px solid var(--glass-brd);background:var(--surface-2);display:grid;place-items:center;font-size:17px;padding:0;cursor:pointer;overflow:hidden}
    .gicon img{width:100%;height:100%;object-fit:cover}
    .emoji-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:6px}
    .emoji-cell{aspect-ratio:1;border:1px solid var(--glass-brd);background:var(--surface-2);border-radius:10px;font-size:20px;cursor:pointer;display:grid;place-items:center;padding:0}
    .emoji-cell.on{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 16%,var(--surface-2))}
    .gicon-preview{width:56px;height:56px;border-radius:14px;border:1px solid var(--glass-brd);background:var(--surface-2);display:grid;place-items:center;font-size:28px;overflow:hidden;flex:0 0 auto}
    .gicon-preview img{width:100%;height:100%;object-fit:cover}
  `],
  template: `
    @if (loading()) {
      <div class="app"><div class="loading"><div class="spinner"></div></div></div>
    } @else if (group(); as g) {
      <div class="app">
        <header class="topbar">
          <div class="topbar-left">
            <a class="icon-btn" routerLink="/" [attr.aria-label]="'nav.back' | translate">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            </a>
            @if (g.iconUrl || g.emoji) {
              <button class="gicon" type="button" (click)="openSettings()" [attr.aria-label]="'group.groupIconAria' | translate" [title]="'group.groupIcon' | translate">
                @if (g.iconUrl) { <img [src]="g.iconUrl" alt="" /> } @else { <span>{{ g.emoji }}</span> }
              </button>
            }
            @if (editingName()) {
              <input class="input" style="height:34px" name="nameDraft" [(ngModel)]="nameDraft" (keyup.enter)="saveName(g)" (keyup.escape)="editingName.set(false)" />
              <button class="icon-btn" type="button" (click)="saveName(g)" [attr.aria-label]="'group.saveNameAria' | translate">
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
            <button class="icon-btn" type="button" (click)="openSettings()" [attr.aria-label]="'group.settingsAria' | translate" style="position:relative">
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
              <div class="eyebrow">{{ 'group.owedToYou' | translate }}</div>
              <div class="settle-amount tnum">{{ money(mine) }}</div>
            } @else if (mine !== null && mine < -0.005) {
              <div class="eyebrow">{{ 'group.youOwe' | translate }}</div>
              <div class="settle-amount tnum">{{ money(-mine) }}</div>
            } @else if (mine !== null) {
              <div class="eyebrow">{{ 'group.yourBalance' | translate }}</div>
              <div class="settle-amount" style="font-size:1.8rem">{{ 'group.settledUp' | translate }}</div>
            } @else {
              <div class="eyebrow">{{ 'group.whoOwesWhom' | translate }}</div>
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
                {{ 'group.returnDebt' | translate }}
              </button>
            </div>
          } @else {
            <div class="eyebrow">{{ 'group.balance' | translate }}</div>
            <div class="settle-amount" style="font-size:1.7rem">{{ 'group.allSettled' | translate }}</div>
          }
        </section>

        @if (joinRequests().length > 0) {
          <section>
            <div class="section-head"><span class="section-title">{{ 'group.joinRequests' | translate }}</span></div>
            <div class="card rows">
              @for (r of joinRequests(); track r.id) {
                <div class="row">
                  <div [class]="avatarClass(r.id)">{{ initials(r.displayName) }}</div>
                  <div class="row-main">
                    <div class="row-title">{{ r.displayName }}</div>
                    <div class="row-sub">{{ 'group.wantsToJoin' | translate }} · {{ shortDate(r.createdUtc) }}</div>
                  </div>
                  <div style="display:flex;gap:6px">
                    <button class="btn btn-primary btn-sm" type="button" (click)="approve(r.id)" [disabled]="busy()">{{ 'group.approve' | translate }}</button>
                    <button class="btn btn-ghost btn-sm" type="button" (click)="reject(r.id)" [disabled]="busy()">{{ 'group.decline' | translate }}</button>
                  </div>
                </div>
              }
            </div>
          </section>
        }

        <section>
          <div class="section-head">
            <span class="section-title">{{ 'group.participants' | translate }}</span>
            <button class="link" type="button" (click)="toggleSplit(g)">{{ (showSplit() ? 'group.done' : 'group.split') | translate }}</button>
          </div>
          <div class="card rows">
            @for (p of g.participants; track p.id) {
              <div class="row">
                <div [class]="avatarClass(p.id)">{{ initials(p.displayName) }}</div>
                <div class="row-main">
                  <div class="row-title">{{ p.displayName }}@if (isMe(p)) { <span class="chip">{{ 'group.chipYou' | translate }}</span> } @else if (p.userId) { <span class="chip">{{ 'group.chipAccount' | translate }}</span> }</div>
                  @if (!showSplit()) {
                    <div class="row-sub">{{ 'group.shareLabel' | translate:{ percent: p.defaultSharePercent, amount: money(paidFor(p.id)) } }}</div>
                  }
                </div>
                @if (showSplit()) {
                  <div style="display:flex;align-items:center;gap:6px;color:var(--muted);font-size:13px">
                    <input class="input" type="number" step="0.01" min="0" max="100" [name]="'sp_' + p.id" [(ngModel)]="splitDraft[p.id]" (change)="rebalance(p.id, splitDraft[p.id])" style="height:38px;width:76px" /> %
                    @if (g.participants.length > 1) {
                      <button class="icon-btn" type="button" (click)="removeParticipant(g, p)" [disabled]="busy()" [attr.aria-label]="'group.removeParticipant' | translate">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--neg)" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
                      </button>
                    }
                  </div>
                } @else {
                  <div class="amount tnum" [class.pos]="netFor(p.id) >= 0" [class.neg]="netFor(p.id) < 0">{{ moneySigned(netFor(p.id)) }}</div>
                }
              </div>
            }
          </div>

          @if (showSplit()) {
            <div class="card card-pad form-col" style="margin-top:10px">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:10px">
                <button class="btn btn-ghost btn-sm" type="button" (click)="splitEvenly(g)" [disabled]="busy()">{{ 'group.splitEvenly' | translate }}</button>
                <span class="tnum" [style.color]="splitBalanced(g) ? 'var(--muted)' : 'var(--neg)'" style="font-size:13px;font-weight:600">{{ 'group.splitTotal' | translate:{ total: splitTotal(g) } }}</span>
              </div>
              <button class="btn btn-primary btn-sm" type="button" (click)="saveSplit(g)" [disabled]="busy()">{{ 'group.saveSplit' | translate }}</button>
              <div class="section-title" style="margin-top:6px">{{ 'group.addParticipant' | translate }}</div>
              <div class="form-row">
                <input class="input" name="paName" [(ngModel)]="paName" [placeholder]="'group.namePlaceholder' | translate" />
                <input class="input w-pct" type="number" step="0.01" name="paShare" [(ngModel)]="paShare" placeholder="%" />
              </div>
              <input class="input" name="paLink" [(ngModel)]="paLink" [placeholder]="'group.linkPlaceholder' | translate" autocapitalize="off" autocomplete="off" />
              <button class="btn btn-ghost btn-sm" type="button" (click)="addParticipant(g)" [disabled]="busy() || (!paName.trim() && !paLink.trim())">{{ 'group.add' | translate }}</button>

              <div class="section-title" style="margin-top:6px">{{ 'group.orFromFriends' | translate }}</div>
              <button class="btn btn-ghost btn-sm" type="button" (click)="toggleFriendPicker()">{{ (showFriendPicker() ? 'group.hideFriends' : 'group.showFriends') | translate }}</button>
              @if (showFriendPicker()) {
                @if (friendsLoading()) {
                  <div class="row-sub">{{ 'group.loadingFriends' | translate }}</div>
                } @else if (availableFriends(g).length === 0) {
                  <div class="row-sub">{{ 'group.noFriends' | translate }}</div>
                } @else {
                  <div class="card rows">
                    @for (f of availableFriends(g); track f.userId) {
                      <div class="row">
                        <div [class]="avatarClass(f.userId)">{{ initials(f.displayName) }}</div>
                        <div class="row-main">
                          <div class="row-title">{{ f.displayName }}</div>
                          @if (f.handle) { <div class="row-sub">&#64;{{ f.handle }}</div> }
                        </div>
                        <button class="btn btn-primary btn-sm" type="button" (click)="addFromFriend(g, f)" [disabled]="busy()">{{ 'group.add' | translate }}</button>
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
          <div class="section-head"><span class="section-title">{{ 'group.history' | translate }}</span></div>
          @if (activity().length === 0) {
            <div class="card"><div class="empty">{{ 'group.historyEmpty' | translate }}</div></div>
          } @else {
            <div class="card rows">
              @for (a of activity(); track a.id) {
                <div class="row" [style.cursor]="a.type !== 'opening' && !a.isDeleted ? 'pointer' : 'default'" [style.opacity]="a.isDeleted ? '0.55' : '1'" (click)="onActivityClick(g, a)">
                  <div class="avatar" aria-hidden="true">
                    @if (a.type === 'settlement') {
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M7 11l-4 4 4 4"/><path d="M3 15h13a4 4 0 0 0 4-4V5"/></svg>
                    } @else if (a.type === 'opening') {
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 8v4l3 2"/></svg>
                    } @else if (a.sourceIconUrl) {
                      <img [src]="a.sourceIconUrl" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:12px" />
                    } @else if (a.sourceSlug && !iconFailed().has(a.sourceSlug)) {
                      <img [src]="'assets/merchants/' + a.sourceSlug + '.png'" (error)="markIconFailed(a.sourceSlug!)" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:12px" />
                    } @else {
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2h9l3 3v17l-2.4-1.4L13 22l-2.6-1.4L8 22l-2.6-1.4L3 22V4a2 2 0 0 1 2-2z"/><path d="M8 8h6M8 12h6"/></svg>
                    }
                  </div>
                  <div class="row-main">
                    <div class="row-title" [style.text-decoration]="a.isDeleted ? 'line-through' : 'none'">{{ a.title }}@if (a.isDeleted) { <span class="chip">{{ 'group.chipDeleted' | translate }}</span> } @else if (a.isEdited) { <span class="chip">{{ 'group.chipEdited' | translate }}</span> }</div>
                    <div class="row-sub">{{ a.subtitle }} · {{ shortDate(a.date) }}</div>
                  </div>
                  @if (a.receiptUrl) {
                    <button class="icon-btn" type="button" (click)="$event.stopPropagation(); lightbox.set(a.receiptUrl!)" [attr.aria-label]="'group.showReceiptAria' | translate" style="width:32px;height:32px">
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
          {{ 'group.addReceipt' | translate }}
        </button>
      </div>

      @if (showAdd()) {
        <div class="scrim" (pointerdown)="onScrimDown($event)" (click)="scrimArmed && showAdd.set(false)">
          <div class="sheet" (click)="$event.stopPropagation()">
            <div class="sheet-head"><div class="sheet-title">{{ (editingExpenseId() ? 'group.editReceipt' : 'group.newReceipt') | translate }}</div>
              <button class="icon-btn" type="button" (click)="showAdd.set(false)" [attr.aria-label]="'common.close' | translate"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
            </div>
            <div class="form-col">
              <div class="form-row">
                <label class="field" style="flex:1.4"><span>{{ 'group.amount' | translate }}</span><input class="input" type="number" step="0.01" name="exAmount" [(ngModel)]="exAmount" /></label>
                <label class="field"><span>{{ 'group.whoPaid' | translate }}</span>
                  <app-glass-select [(value)]="exPayer" [options]="participantOptions()" [ariaLabel]="'group.whoPaid' | translate" />
                </label>
              </div>
              <div class="field" style="position:relative">
                <span>{{ 'group.source' | translate }}</span>
                <div style="display:flex;align-items:center;gap:6px">
                  <input class="input" name="exSourceQuery" [ngModel]="exSourceQuery()" (ngModelChange)="onSourceInput($event)" (focus)="showSourceList.set(true)" (blur)="onSourceBlur()" [placeholder]="'group.sourcePlaceholder' | translate" autocapitalize="off" autocomplete="off" style="flex:1" />
                  @if (exSourceId()) {
                    <button class="icon-btn" type="button" (click)="clearSource()" [attr.aria-label]="'group.clearAria' | translate"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
                  }
                </div>
                @if (showSourceList() && (filteredSources().length || exSourceQuery().trim())) {
                  <div class="card rows" style="position:absolute;left:0;right:0;top:100%;z-index:30;max-height:260px;overflow:auto;margin-top:4px;box-shadow:var(--shadow-hero);background:var(--surface);-webkit-backdrop-filter:none;backdrop-filter:none">
                    @for (s of filteredSources(); track s.id) {
                      <div class="row" style="cursor:pointer" (click)="selectSource(s)">
                        @if (s.iconUrl) {
                          <img [src]="s.iconUrl" alt="" style="width:30px;height:30px;border-radius:8px;object-fit:cover;flex:0 0 auto" />
                        } @else if (!iconFailed().has(s.slug)) {
                          <img [src]="'assets/merchants/' + s.slug + '.png'" (error)="markIconFailed(s.slug)" alt="" style="width:30px;height:30px;border-radius:10px;object-fit:cover;flex:0 0 auto" />
                        } @else {
                          <div [class]="avatarClass(s.slug)" style="width:30px;height:30px;font-size:12px">{{ initials(s.name) }}</div>
                        }
                        <div class="row-main"><div class="row-title">{{ s.name }}</div><div class="row-sub">{{ s.category }}</div></div>
                        <button class="icon-btn" type="button" (click)="toggleFav(s, $event)" [attr.aria-label]="(s.isFavorite ? 'sources.favRemove' : 'sources.favAdd') | translate" style="width:30px;height:30px">
                          <svg width="16" height="16" viewBox="0 0 24 24" [attr.fill]="s.isFavorite ? 'var(--accent)' : 'none'" [attr.stroke]="s.isFavorite ? 'var(--accent)' : 'var(--faint)'" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                        </button>
                      </div>
                    }
                    @if (exSourceQuery().trim()) {
                      <div class="row" style="cursor:pointer;background:var(--accent-soft)" (click)="proposeNewSource()">
                        <div style="width:30px;height:30px;border-radius:8px;border:1px dashed var(--accent);display:grid;place-items:center;color:var(--accent);flex:0 0 auto">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
                        </div>
                        <div class="row-main">
                          <div class="row-title" style="color:var(--accent-ink)">{{ 'group.addOwnSource' | translate:{ name: exSourceQuery().trim() } }}</div>
                          <div class="row-sub" style="color:var(--accent-ink);opacity:.85">{{ 'group.addOwnSourceHint' | translate }}</div>
                        </div>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-ink)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex:0 0 auto"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                      </div>
                    }
                    <a class="row" routerLink="/sources" style="color:var(--muted);text-decoration:none">
                      <div class="row-main"><div class="row-sub">{{ 'group.manageSources' | translate }}</div></div>
                    </a>
                  </div>
                }
              </div>
              <label class="field"><span>{{ 'group.desc' | translate }}</span><input class="input" name="exDesc" [(ngModel)]="exDesc" [placeholder]="'group.descPlaceholder' | translate" /></label>
              <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
                @if (exPhoto(); as ph) {
                  <img [src]="ph" alt="" style="width:54px;height:54px;border-radius:10px;object-fit:cover;border:1px solid var(--line)" (click)="lightbox.set(ph)" />
                  <button class="link" type="button" (click)="exPhoto.set(null)">{{ 'group.removePhoto' | translate }}</button>
                } @else if (editingExpenseId() && exReceiptUrl() && !exReceiptRemoved()) {
                  <img [src]="exReceiptUrl()!" alt="" style="width:54px;height:54px;border-radius:10px;object-fit:cover;border:1px solid var(--line)" (click)="lightbox.set(exReceiptUrl()!)" />
                  <button class="btn btn-ghost btn-sm" type="button" (click)="exFile.click()" [disabled]="exPhotoBusy()">@if (exPhotoBusy()) { <span class="btn-spin"></span> } {{ 'group.replacePhoto' | translate }}</button>
                  <button class="link" type="button" style="color:var(--neg)" (click)="exReceiptRemoved.set(true)">{{ 'group.removePhoto' | translate }}</button>
                } @else {
                  <button class="btn btn-ghost btn-sm" type="button" (click)="exFile.click()" [disabled]="exPhotoBusy()">@if (exPhotoBusy()) { <span class="btn-spin"></span> } {{ 'group.photoReceipt' | translate }}</button>
                }
                <input #exFile type="file" accept="image/*" hidden (change)="onExpensePhoto($event)" />
              </div>
              <button class="btn btn-primary btn-block btn-lg" type="button" (click)="saveExpense(g)" [disabled]="busy() || !exDesc.trim() || !exAmount">@if (busy()) { <span class="btn-spin"></span> } {{ (editingExpenseId() ? 'group.saveChanges' : 'group.saveReceipt') | translate }}</button>
              @if (editingExpenseId()) {
                <div style="display:flex;gap:8px">
                  <button class="btn btn-ghost btn-sm" type="button" style="flex:1" (click)="loadRevisions(g)">{{ (showRevisions() ? 'group.hideChangeHistory' : 'group.changeHistory') | translate }}</button>
                  <button class="btn btn-ghost btn-sm" type="button" style="flex:1;color:var(--neg)" (click)="removeExpense(g)" [disabled]="busy()">{{ 'group.deleteReceipt' | translate }}</button>
                </div>
                @if (showRevisions()) {
                  @if (revisions().length === 0) {
                    <div class="row-sub">{{ 'group.noChangesYet' | translate }}</div>
                  } @else {
                    <div class="card rows">
                      @for (r of revisions(); track r.id) {
                        <div class="row">
                          <div class="row-main">
                            <div class="row-title">{{ (r.changeKind === 'deleted' ? 'group.revisionDeleted' : 'group.revisionWas') | translate }}: {{ money(r.amount) }} · {{ r.description }}</div>
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
        <div class="scrim" (pointerdown)="onScrimDown($event)" (click)="scrimArmed && showSettle.set(false)">
          <div class="sheet" (click)="$event.stopPropagation()">
            <div class="sheet-head"><div class="sheet-title">{{ 'group.settleTitle' | translate }}</div>
              <button class="icon-btn" type="button" (click)="showSettle.set(false)" [attr.aria-label]="'common.close' | translate"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
            </div>
            <div class="form-col">
              <div class="form-row">
                <label class="field"><span>{{ 'group.fromWhom' | translate }}</span>
                  <app-glass-select [(value)]="seFrom" [options]="participantOptions()" [ariaLabel]="'group.fromWhom' | translate" />
                </label>
                <label class="field"><span>{{ 'group.toWhom' | translate }}</span>
                  <app-glass-select [(value)]="seTo" [options]="participantOptions()" [ariaLabel]="'group.toWhom' | translate" />
                </label>
              </div>
              <label class="field"><span>{{ 'group.amountPartial' | translate }}</span><input class="input" type="number" step="0.01" name="seAmount" [(ngModel)]="seAmount" /></label>
              <button class="btn btn-primary btn-block btn-lg" type="button" (click)="settle(g)" [disabled]="busy() || !seAmount || seFrom === seTo">@if (busy()) { <span class="btn-spin"></span> } {{ 'group.recordReturn' | translate }}</button>
              <div class="error">{{ error() }}</div>
            </div>
          </div>
        </div>
      }

      @if (showSettings()) {
        <div class="scrim" (pointerdown)="onScrimDown($event)" (click)="scrimArmed && showSettings.set(false)">
          <div class="sheet" (click)="$event.stopPropagation()">
            <div class="sheet-head"><div class="sheet-title">{{ 'group.settingsTitle' | translate }}</div>
              <button class="icon-btn" type="button" (click)="showSettings.set(false)" [attr.aria-label]="'common.close' | translate"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
            </div>
            <div class="form-col">
              <div class="section-title">{{ 'group.groupIcon' | translate }}</div>
              <div style="display:flex;align-items:center;gap:12px">
                <div class="gicon-preview">
                  @if (g.iconUrl) { <img [src]="g.iconUrl" alt="" style="cursor:zoom-in" (click)="lightbox.set(g.iconUrl!)" [title]="'group.showReceiptAria' | translate" /> }
                  @else if (g.emoji) { <span>{{ g.emoji }}</span> }
                  @else { <span style="font-size:19px;font-weight:650;color:var(--muted)">{{ initials(g.name) }}</span> }
                </div>
                <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-start">
                  <button class="btn btn-ghost btn-sm" type="button" (click)="groupIconFile.click()" [disabled]="busy()">{{ 'group.uploadPhoto' | translate }}</button>
                  @if (g.iconUrl || g.emoji) {
                    <button class="link" type="button" (click)="clearGroupIcon(g)" [disabled]="busy()">{{ 'group.removeIcon' | translate }}</button>
                  }
                </div>
                <input #groupIconFile type="file" accept="image/*" hidden (change)="onGroupIconFile($event)" />
              </div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end">
                <label class="field" style="flex:1;min-width:130px"><span>{{ 'group.ownEmoji' | translate }}</span>
                  <input class="input" name="groupEmojiDraft" [(ngModel)]="groupEmojiDraft" maxlength="16" [placeholder]="'group.emojiPlaceholder' | translate" autocomplete="off" (keyup.enter)="applyGroupEmoji(g)" />
                </label>
                <button class="btn btn-ghost btn-sm" type="button" (click)="applyGroupEmoji(g)" [disabled]="busy() || !groupEmojiDraft.trim()">{{ 'group.apply' | translate }}</button>
                <button class="btn btn-ghost btn-sm" type="button" (click)="showEmojiPicker.set(true)" [disabled]="busy()">{{ 'group.chooseEmoji' | translate }}</button>
              </div>
              <div class="row-sub">{{ 'group.emojiHint' | translate }}</div>

              <div class="section-title" style="margin-top:8px">{{ 'group.membership' | translate }}</div>
              <div class="seg">
                <button type="button" class="seg-btn" [class.on]="g.membershipMode !== 'approval'" (click)="setMode(g, 'open')" [disabled]="busy()">{{ 'group.membershipFree' | translate }}</button>
                <button type="button" class="seg-btn" [class.on]="g.membershipMode === 'approval'" (click)="setMode(g, 'approval')" [disabled]="busy()">{{ 'group.membershipApproval' | translate }}</button>
              </div>
              <div class="row-sub">{{ (g.membershipMode === 'approval' ? 'group.membershipApprovalHint' : 'group.membershipFreeHint') | translate }}</div>

              <div class="section-title" style="margin-top:8px">{{ 'group.inviteLink' | translate }}</div>
              @if (g.inviteToken) {
                <input class="input" [value]="inviteUrl(g)" readonly (focus)="selectAll($event)" />
                <div class="form-row">
                  <button class="btn btn-primary btn-sm" type="button" style="flex:1" (click)="copyInvite(g)">{{ 'group.copy' | translate }}</button>
                  <button class="btn btn-ghost btn-sm" type="button" style="flex:1" (click)="revokeInvite(g)" [disabled]="busy()">{{ 'group.revoke' | translate }}</button>
                </div>
              } @else {
                <button class="btn btn-ghost btn-sm" type="button" (click)="createInvite(g)" [disabled]="busy()">{{ 'group.createLink' | translate }}</button>
              }

              <div class="section-title" style="margin-top:8px">{{ 'group.historySection' | translate }}</div>
              <button class="btn btn-ghost btn-sm" type="button" (click)="clearHistory(g)" [disabled]="busy()" style="color:var(--neg)">{{ 'group.clearHistory' | translate }}</button>
              <div class="row-sub">{{ 'group.clearHistoryHint' | translate }}</div>

              @if (unlinked(g).length > 0) {
                <div class="section-title" style="margin-top:8px">{{ 'group.linkAccountTitle' | translate }}</div>
                <div class="row-sub">{{ 'group.linkAccountHint' | translate }}</div>
                <div class="card rows" style="margin-top:4px">
                  @for (p of unlinked(g); track p.id) {
                    <div class="row" style="flex-wrap:wrap">
                      <div [class]="avatarClass(p.id)">{{ initials(p.displayName) }}</div>
                      <div class="row-main"><div class="row-title">{{ p.displayName }}</div></div>
                      @if (linkingId() !== p.id) {
                        <button class="btn btn-ghost btn-sm" type="button" (click)="startLink(p)">{{ 'group.link' | translate }}</button>
                      } @else {
                        <div style="flex-basis:100%;display:flex;gap:6px;margin-top:8px">
                          <input class="input" name="linkDraft" [(ngModel)]="linkDraft" [placeholder]="'group.linkQueryPlaceholder' | translate" autocapitalize="off" autocomplete="off" style="flex:1" (keyup.enter)="confirmLink(g, p)" />
                          <button class="btn btn-primary btn-sm" type="button" (click)="confirmLink(g, p)" [disabled]="busy() || !linkDraft.trim()">{{ 'common.ok' | translate }}</button>
                          <button class="icon-btn" type="button" (click)="cancelLink()" [attr.aria-label]="'common.cancel' | translate"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
                        </div>
                      }
                    </div>
                  }
                </div>
              }

              <div class="section-title" style="margin-top:8px;color:var(--neg)">{{ 'group.dangerZone' | translate }}</div>
              <button class="btn btn-ghost btn-sm" type="button" (click)="deleteGroup(g)" [disabled]="busy()" style="color:var(--neg)">{{ 'group.deleteGroup' | translate }}</button>
              <div class="row-sub">{{ 'group.deleteGroupHint' | translate }}</div>
              <div class="error">{{ error() }}</div>
            </div>
          </div>
        </div>
      }

      @if (cropFile(); as f) {
        <app-image-cropper [file]="f" [outputSize]="256" (cropped)="onGroupIconCropped($event)" (cancelled)="cropFile.set(null)" />
      }

      @if (lightbox(); as url) {
        <div class="scrim" (click)="lightbox.set(null)" style="align-items:center;justify-content:center;padding:16px">
          <img [src]="url" alt="Чек" (click)="$event.stopPropagation()" style="max-width:92vw;max-height:86vh;border-radius:12px;box-shadow:var(--shadow-hero)" />
        </div>
      }
      @if (showEmojiPicker()) {
        <app-emoji-picker (picked)="onEmojiPicked(g, $event)" (cancelled)="showEmojiPicker.set(false)" />
      }
    } @else {
      <div class="app"><div class="empty" style="margin-top:60px">{{ error() || ('group.notFound' | translate) }}</div></div>
    }
  `,
})
export class Group {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ExpensesService);
  private readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);

  protected readonly showEmojiPicker = signal(false);
  protected readonly cropFile = signal<File | null>(null);

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
  // Receipt already attached to the expense being edited, and whether the user chose to drop it.
  protected readonly exReceiptUrl = signal<string | null>(null);
  protected readonly exReceiptRemoved = signal(false);
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
  protected groupEmojiDraft = '';

  protected scrimArmed = false;
  private groupId = '';

  constructor() {
    this.groupId = this.route.snapshot.paramMap.get('id') ?? '';
    void this.load();
  }

  /**
   * Arms scrim-dismiss only when the press starts on the backdrop itself. Kept as a void method
   * (not an inline template expression): an inline `scrimArmed = a === b` evaluates to `false`
   * when pressing inside the sheet, and Angular preventDefault()s a handler that returns false —
   * which would swallow focus and make the sheet inputs untypable.
   */
  protected onScrimDown(event: Event): void {
    this.scrimArmed = event.target === event.currentTarget;
  }

  protected participantOptions(): SelectOption[] {
    return (this.group()?.participants ?? []).map(p => ({ value: p.id, label: p.displayName }));
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
    if (!confirm(this.translate.instant('group.confirmDeleteSettlement'))) return;
    await this.run(async () => {
      await this.api.deleteSettlement(g.id, a.id);
    }, this.translate.instant('group.toastSettlementDeleted'));
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
    this.exReceiptUrl.set(null);
    this.exReceiptRemoved.set(false);
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
    this.exReceiptUrl.set(ex.receiptUrl ?? null);
    this.exReceiptRemoved.set(false);
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
    if (!confirm(this.translate.instant('group.confirmDeleteReceipt'))) return;
    await this.run(async () => {
      await this.api.deleteExpense(g.id, id);
      this.showAdd.set(false);
    }, this.translate.instant('group.toastReceiptDeleted'));
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
    if (!confirm(this.translate.instant('group.confirmClearHistory'))) return;
    await this.run(async () => {
      await this.api.clearHistory(g.id);
      this.showSettings.set(false);
    }, this.translate.instant('group.toastHistoryCleared'));
  }

  protected async onEmojiPicked(g: GroupResponse, emoji: string): Promise<void> {
    this.showEmojiPicker.set(false);
    await this.run(async () => { await this.api.setGroupIcon(g.id, { emoji, image: null }); }, this.translate.instant('group.toastIconUpdated'));
  }

  protected async applyGroupEmoji(g: GroupResponse): Promise<void> {
    const emoji = this.groupEmojiDraft.trim();
    if (!emoji) return;
    await this.run(async () => { await this.api.setGroupIcon(g.id, { emoji, image: null }); }, this.translate.instant('group.toastIconUpdated'));
    this.groupEmojiDraft = '';
  }

  protected onGroupIconFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) this.cropFile.set(file);
  }

  protected async onGroupIconCropped(dataUrl: string): Promise<void> {
    this.cropFile.set(null);
    const g = this.group();
    if (!g) return;
    await this.run(async () => { await this.api.setGroupIcon(g.id, { image: dataUrl }); }, this.translate.instant('group.toastIconUpdated'));
  }

  protected async clearGroupIcon(g: GroupResponse): Promise<void> {
    await this.run(async () => { await this.api.setGroupIcon(g.id, { emoji: null, image: null }); }, this.translate.instant('group.toastIconRemoved'));
  }

  protected async deleteGroup(g: GroupResponse): Promise<void> {
    if (!confirm(this.translate.instant('group.confirmDeleteGroup', { name: g.name }))) return;
    this.busy.set(true);
    this.error.set('');
    try {
      await this.api.deleteGroup(g.id);
      this.toast.show(this.translate.instant('group.toastGroupDeleted'));
      await this.router.navigate(['/']);
    } catch (e) {
      const message = httpError(e);
      this.error.set(message);
      this.toast.show(message, 'err');
    } finally {
      this.busy.set(false);
    }
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
    const q = this.exSourceQuery().trim();
    const list = this.sources();
    // Script-tolerant: "Новус" matches "Novus" and vice versa (see search.util).
    const filtered = q ? list.filter(s => fuzzyMatch(q, s.name, s.slug, s.category)) : list;
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

  protected onSourceBlur(): void {
    // Let a click on a dropdown row register before closing.
    setTimeout(() => this.showSourceList.set(false), 150);
  }

  protected proposeNewSource(): void {
    // Route to the Sources page with the typed name prefilled; sources.ts decides
    // proposal form (regular user) vs. create form (admin) based on the admin flag.
    this.showSourceList.set(false);
    void this.router.navigate(['/sources'], { queryParams: { propose: this.exSourceQuery().trim() } });
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
    await this.run(async () => { await this.api.renameGroup(g.id, name); }, this.translate.instant('group.toastNameUpdated'));
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
    }, this.translate.instant('group.toastLinked'));
  }

  protected async setMode(g: GroupResponse, mode: 'open' | 'approval'): Promise<void> {
    const current = g.membershipMode === 'approval' ? 'approval' : 'open';
    if (current === mode) return;
    await this.run(async () => { await this.api.setMembershipMode(g.id, mode); },
      this.translate.instant(mode === 'approval' ? 'group.toastModeApproval' : 'group.toastModeOpen'));
  }

  protected async createInvite(g: GroupResponse): Promise<void> {
    await this.run(async () => { await this.api.createInvite(g.id); }, this.translate.instant('group.toastLinkCreated'));
  }

  protected async revokeInvite(g: GroupResponse): Promise<void> {
    await this.run(async () => { await this.api.revokeInvite(g.id); }, this.translate.instant('group.toastLinkRevoked'));
  }

  protected async copyInvite(g: GroupResponse): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.inviteUrl(g));
      this.toast.show(this.translate.instant('group.toastLinkCopied'));
    } catch {
      this.toast.show(this.translate.instant('group.toastLinkCopyFailed'), 'err');
    }
  }

  protected selectAll(event: Event): void {
    (event.target as HTMLInputElement).select();
  }

  protected async approve(requestId: string): Promise<void> {
    await this.run(async () => { await this.api.approveJoinRequest(this.groupId, requestId); }, this.translate.instant('group.toastApproved'));
  }

  protected async reject(requestId: string): Promise<void> {
    await this.run(async () => { await this.api.rejectJoinRequest(this.groupId, requestId); }, this.translate.instant('group.toastRejected'));
  }

  protected rebalance(changedId: string, value: number | string): void {
    const g = this.group();
    if (!g) return;
    const clamped = Math.max(0, Math.min(100, Number(value) || 0));
    this.splitDraft[changedId] = clamped;

    const others = g.participants.filter(p => p.id !== changedId).map(p => p.id);
    if (others.length === 0) {
      // Only one participant — they must own the whole thing.
      this.splitDraft[changedId] = 100;
      return;
    }

    const dist = this.distribute(others, this.splitDraft, Math.max(0, 100 - clamped));
    for (const id of others) this.splitDraft[id] = dist[id];
  }

  // Distribute `target`% across `ids` proportionally to their current weights;
  // splits evenly when all weights are zero. Sums to exactly `target` (last absorbs rounding).
  private distribute(ids: string[], weights: Record<string, number>, target: number): Record<string, number> {
    const out: Record<string, number> = {};
    const n = ids.length;
    if (n === 0) return out;
    const sum = ids.reduce((s, id) => s + Math.max(0, Number(weights[id]) || 0), 0);
    let assigned = 0;
    ids.forEach((id, index) => {
      let share: number;
      if (index === n - 1) share = round2(target - assigned);
      else if (sum > 0) share = round2(target * Math.max(0, Number(weights[id]) || 0) / sum);
      else share = round2(target / n);
      share = Math.max(0, share);
      out[id] = share;
      assigned += share;
    });
    return out;
  }

  protected splitEvenly(g: GroupResponse): void {
    const ids = g.participants.map(p => p.id);
    const even: Record<string, number> = {};
    for (const id of ids) even[id] = 1;
    const dist = this.distribute(ids, even, 100);
    for (const id of ids) this.splitDraft[id] = dist[id];
  }

  protected splitTotal(g: GroupResponse): number {
    return round2(g.participants.reduce((s, p) => s + (Number(this.splitDraft[p.id]) || 0), 0));
  }

  protected splitBalanced(g: GroupResponse): boolean {
    return Math.abs(this.splitTotal(g) - 100) < 0.05;
  }

  private resyncSplitDraft(): void {
    const g = this.group();
    if (!g) return;
    this.splitDraft = {};
    for (const p of g.participants) this.splitDraft[p.id] = p.defaultSharePercent;
  }

  protected async saveExpense(g: GroupResponse): Promise<void> {
    if (!this.exAmount || !this.exDesc.trim()) return;
    const editingId = this.editingExpenseId();
    const body = { payerParticipantId: this.exPayer, amount: this.exAmount, description: this.exDesc.trim(), sourceId: this.exSourceId() };
    const photo = this.exPhoto();
    await this.run(async () => {
      if (editingId) {
        await this.api.editExpense(g.id, editingId, body);
        if (photo) {
          await this.api.uploadReceipt(g.id, editingId, photo);
        } else if (this.exReceiptRemoved() && this.exReceiptUrl()) {
          await this.api.removeReceipt(g.id, editingId);
        }
      } else {
        const created = await this.api.addExpense(g.id, body);
        if (photo) {
          await this.api.uploadReceipt(g.id, created.id, photo);
        }
      }
      this.showAdd.set(false);
    }, this.translate.instant(editingId ? 'group.toastReceiptUpdated' : 'group.toastReceiptAdded'));
  }

  protected async settle(g: GroupResponse): Promise<void> {
    if (!this.seAmount || this.seFrom === this.seTo) return;
    await this.run(async () => {
      await this.api.recordSettlement(g.id, { fromParticipantId: this.seFrom, toParticipantId: this.seTo, amount: this.seAmount! });
      this.showSettle.set(false);
    }, this.translate.instant('group.toastSettlementRecorded'));
  }

  protected async addParticipant(g: GroupResponse): Promise<void> {
    if (!this.paName.trim() && !this.paLink.trim()) return;
    const newShare = Math.max(0, Math.min(100, Number(this.paShare) || 0));
    await this.run(async () => {
      const created = await this.api.addParticipant(g.id, this.paName.trim(), newShare, this.paLink.trim() || undefined);
      // Adding with a share: take it proportionally from everyone else so the total stays 100%.
      if (newShare > 0) {
        const existing = g.participants.map(p => p.id);
        const weights: Record<string, number> = {};
        for (const p of g.participants) weights[p.id] = p.defaultSharePercent;
        const dist = this.distribute(existing, weights, 100 - newShare);
        const shares: ShareInput[] = [
          ...existing.map(id => ({ participantId: id, percent: dist[id] })),
          { participantId: created.id, percent: newShare },
        ];
        await this.api.setSplit(g.id, shares);
      }
      this.paName = '';
      this.paShare = null;
      this.paLink = '';
    }, this.translate.instant('group.toastParticipantAdded'));
    // Keep the editor open and refresh the draft so the new participant appears.
    this.resyncSplitDraft();
  }

  protected async removeParticipant(g: GroupResponse, p: ParticipantResponse): Promise<void> {
    if (!confirm(this.translate.instant('group.confirmRemoveParticipant', { name: p.displayName }))) return;
    await this.run(async () => {
      await this.api.removeParticipant(g.id, p.id);
    }, this.translate.instant('group.toastParticipantRemoved'));
    this.resyncSplitDraft();
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
    }, this.translate.instant('group.toastParticipantAdded'));
    // Refresh the split draft so the newly added friend shows up in the editor.
    this.resyncSplitDraft();
  }

  protected async saveSplit(g: GroupResponse): Promise<void> {
    const shares: ShareInput[] = g.participants.map(p => ({ participantId: p.id, percent: Number(this.splitDraft[p.id] ?? 0) }));
    await this.run(async () => {
      await this.api.setSplit(g.id, shares);
      this.showSplit.set(false);
    }, this.translate.instant('group.toastSplitSaved'));
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
      // Opened from the groups list "quick add" shortcut — pop the full add-expense window.
      if (this.route.snapshot.queryParamMap.get('add') === '1') {
        const group = this.group();
        if (group) this.openAdd(group);
      }
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
