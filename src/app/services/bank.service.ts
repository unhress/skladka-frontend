import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  BankAccountResponse, BankConnectionResponse, BankTransactionResponse, ImportStatementResponse,
} from '../models';
import { environment } from '../../environments/environment';
import { TokenLine } from './monobank-token.service';

export interface AddToGroupBody {
  groupId: string;
  payerParticipantId?: string | null;
  categoryId?: string | null;
  sourceId?: string | null;
  description?: string | null;
  shares?: { participantId: string; percent: number }[] | null;
}

const BASE = `${environment.apiBase}/api/bank`;

@Injectable({ providedIn: 'root' })
export class BankService {
  private readonly http = inject(HttpClient);

  listConnections() {
    return firstValueFrom(this.http.get<BankConnectionResponse[]>(`${BASE}/connections`));
  }

  startConnection() {
    return firstValueFrom(this.http.post<BankConnectionResponse>(`${BASE}/connections`, {}));
  }

  refreshConnection(id: string) {
    return firstValueFrom(this.http.post<BankConnectionResponse>(`${BASE}/connections/${id}/refresh`, {}));
  }

  revokeConnection(id: string) {
    return firstValueFrom(this.http.delete<void>(`${BASE}/connections/${id}`));
  }

  listAccounts(connectionId: string) {
    return firstValueFrom(this.http.get<BankAccountResponse[]>(`${BASE}/connections/${connectionId}/accounts`));
  }

  importStatement(connectionId: string, accountId: string, from: string, to: string) {
    return firstValueFrom(
      this.http.post<ImportStatementResponse>(`${BASE}/connections/${connectionId}/import`, { accountId, from, to }),
    );
  }

  importLines(accountId: string, lines: TokenLine[], accountTitle?: string) {
    return firstValueFrom(this.http.post<ImportStatementResponse>(`${BASE}/import-lines`, { accountId, lines, accountTitle }));
  }

  setAccountTitles(titles: { accountId: string; title: string }[]) {
    return firstValueFrom(this.http.put<void>(`${BASE}/account-titles`, { titles }));
  }

  listTransactions(status: string) {
    return firstValueFrom(this.http.get<BankTransactionResponse[]>(`${BASE}/transactions`, { params: { status } }));
  }

  ignore(id: string) {
    return firstValueFrom(this.http.post<BankTransactionResponse>(`${BASE}/transactions/${id}/ignore`, {}));
  }

  ignoreAccount(accountId: string) {
    return firstValueFrom(this.http.post<{ ignored: number }>(`${BASE}/transactions/ignore-account`, { accountId }));
  }

  restore(id: string) {
    return firstValueFrom(this.http.post<BankTransactionResponse>(`${BASE}/transactions/${id}/restore`, {}));
  }

  addToGroup(id: string, body: AddToGroupBody) {
    return firstValueFrom(this.http.post<BankTransactionResponse>(`${BASE}/transactions/${id}/add-to-group`, body));
  }
}
