import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  ActivityItem, BalanceResponse, ExpenseResponse, GroupResponse, ParticipantResponse, SettlementResponse,
} from '../models';
import { environment } from '../../environments/environment';

export interface AddExpenseBody {
  payerParticipantId?: string | null;
  amount: number;
  description: string;
  occurredOn?: string | null;
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

  getGroup(id: string) {
    return firstValueFrom(this.http.get<GroupResponse>(`${BASE}/api/groups/${id}`));
  }

  createGroup(name: string, currencyCode: string, creatorDisplayName?: string) {
    return firstValueFrom(this.http.post<GroupResponse>(`${BASE}/api/groups`, { name, currencyCode, creatorDisplayName }));
  }

  addParticipant(groupId: string, displayName: string, defaultSharePercent: number) {
    return firstValueFrom(this.http.post<ParticipantResponse>(
      `${BASE}/api/groups/${groupId}/participants`, { displayName, defaultSharePercent }));
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
}
