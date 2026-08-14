import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  AcceptInviteResponse, ActivityItem, BalanceResponse, ExpenseResponse, ExpenseRevision, GroupResponse,
  InviteResponse, JoinRequest, ParticipantResponse, SettlementResponse, SourceResponse,
} from '../models';
import { environment } from '../../environments/environment';

export interface AddExpenseBody {
  payerParticipantId?: string | null;
  amount: number;
  description: string;
  occurredOn?: string | null;
  sourceId?: string | null;
}

export interface RecordSettlementBody {
  fromParticipantId: string;
  toParticipantId: string;
  amount: number;
  note?: string | null;
}

export interface ShareInput {
  participantId: string;
  percent: number;
}

const BASE = environment.apiBase;

@Injectable({ providedIn: 'root' })
export class ExpensesService {
  private readonly http = inject(HttpClient);

  listGroups() {
    return firstValueFrom(this.http.get<GroupResponse[]>(`${BASE}/api/groups`));
  }

  listSources() {
    return firstValueFrom(this.http.get<SourceResponse[]>(`${BASE}/api/sources`));
  }

  createSource(name: string, category?: string) {
    return firstValueFrom(this.http.post<SourceResponse>(`${BASE}/api/sources`, { name, category }));
  }

  deleteSource(id: string) {
    return firstValueFrom(this.http.delete<void>(`${BASE}/api/sources/${id}`));
  }

  setSourceFavorite(id: string, isFavorite: boolean) {
    const url = `${BASE}/api/sources/${id}/favorite`;
    return isFavorite
      ? firstValueFrom(this.http.post<void>(url, {}))
      : firstValueFrom(this.http.delete<void>(url));
  }

  uploadSourceIcon(id: string, image: string) {
    return firstValueFrom(this.http.post<SourceResponse>(`${BASE}/api/sources/${id}/icon`, { image }));
  }

  getGroup(id: string) {
    return firstValueFrom(this.http.get<GroupResponse>(`${BASE}/api/groups/${id}`));
  }

  createGroup(name: string, currencyCode: string, creatorDisplayName?: string) {
    return firstValueFrom(this.http.post<GroupResponse>(`${BASE}/api/groups`, { name, currencyCode, creatorDisplayName }));
  }

  addParticipant(groupId: string, displayName: string, defaultSharePercent: number, linkQuery?: string, userId?: string) {
    return firstValueFrom(this.http.post<ParticipantResponse>(
      `${BASE}/api/groups/${groupId}/participants`, { displayName, defaultSharePercent, linkQuery, userId }));
  }

  setSplit(groupId: string, shares: ShareInput[]) {
    return firstValueFrom(this.http.put<GroupResponse>(`${BASE}/api/groups/${groupId}/split`, { shares }));
  }

  addExpense(groupId: string, body: AddExpenseBody) {
    return firstValueFrom(this.http.post<ExpenseResponse>(`${BASE}/api/groups/${groupId}/expenses`, body));
  }

  listExpenses(groupId: string) {
    return firstValueFrom(this.http.get<ExpenseResponse[]>(`${BASE}/api/groups/${groupId}/expenses`));
  }

  uploadReceipt(groupId: string, expenseId: string, image: string) {
    return firstValueFrom(this.http.post<ExpenseResponse>(
      `${BASE}/api/groups/${groupId}/expenses/${expenseId}/receipt`, { image }));
  }

  removeReceipt(groupId: string, expenseId: string) {
    return firstValueFrom(this.http.delete<ExpenseResponse>(
      `${BASE}/api/groups/${groupId}/expenses/${expenseId}/receipt`));
  }

  editExpense(groupId: string, expenseId: string, body: AddExpenseBody) {
    return firstValueFrom(this.http.put<ExpenseResponse>(`${BASE}/api/groups/${groupId}/expenses/${expenseId}`, body));
  }

  deleteExpense(groupId: string, expenseId: string) {
    return firstValueFrom(this.http.delete<void>(`${BASE}/api/groups/${groupId}/expenses/${expenseId}`));
  }

  listRevisions(groupId: string, expenseId: string) {
    return firstValueFrom(this.http.get<ExpenseRevision[]>(`${BASE}/api/groups/${groupId}/expenses/${expenseId}/revisions`));
  }

  clearHistory(groupId: string) {
    return firstValueFrom(this.http.post<{ removed: number }>(`${BASE}/api/groups/${groupId}/clear-history`, {}));
  }

  recordSettlement(groupId: string, body: RecordSettlementBody) {
    return firstValueFrom(this.http.post<SettlementResponse>(`${BASE}/api/groups/${groupId}/settlements`, body));
  }

  getBalance(groupId: string) {
    return firstValueFrom(this.http.get<BalanceResponse>(`${BASE}/api/groups/${groupId}/balance`));
  }

  getActivity(groupId: string) {
    return firstValueFrom(this.http.get<ActivityItem[]>(`${BASE}/api/groups/${groupId}/activity`));
  }

  renameGroup(groupId: string, name: string) {
    return firstValueFrom(this.http.put<GroupResponse>(`${BASE}/api/groups/${groupId}`, { name }));
  }

  // Link an already-existing (unlinked) participant to a real account by handle/email.
  linkParticipant(groupId: string, participantId: string, linkQuery: string) {
    return firstValueFrom(this.http.put<ParticipantResponse>(
      `${BASE}/api/groups/${groupId}/participants/${participantId}/link`, { linkQuery }));
  }

  // Membership mode & invites
  setMembershipMode(groupId: string, mode: 'open' | 'approval') {
    return firstValueFrom(this.http.put<GroupResponse>(`${BASE}/api/groups/${groupId}/membership-mode`, { mode }));
  }

  createInvite(groupId: string) {
    return firstValueFrom(this.http.post<InviteResponse>(`${BASE}/api/groups/${groupId}/invite`, {}));
  }

  revokeInvite(groupId: string) {
    return firstValueFrom(this.http.delete<GroupResponse>(`${BASE}/api/groups/${groupId}/invite`));
  }

  acceptInvite(token: string) {
    return firstValueFrom(this.http.post<AcceptInviteResponse>(`${BASE}/api/invites/${token}/accept`, {}));
  }

  // Join requests (approval mode)
  listJoinRequests(groupId: string) {
    return firstValueFrom(this.http.get<JoinRequest[]>(`${BASE}/api/groups/${groupId}/join-requests`));
  }

  approveJoinRequest(groupId: string, requestId: string) {
    return firstValueFrom(this.http.post<ParticipantResponse>(
      `${BASE}/api/groups/${groupId}/join-requests/${requestId}/approve`, {}));
  }

  rejectJoinRequest(groupId: string, requestId: string) {
    return firstValueFrom(this.http.delete<void>(`${BASE}/api/groups/${groupId}/join-requests/${requestId}`));
  }
}
