export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  roles: string[];
}

export interface AuthenticationResult {
  accessToken: string;
  tokenType: string;
  expiresAtUtc: string;
  user: AuthenticatedUser;
}

export interface ParticipantResponse {
  id: string;
  displayName: string;
  userId?: string | null;
  defaultSharePercent: number;
  isActive: boolean;
}

export interface GroupResponse {
  id: string;
  name: string;
  currencyCode: string;
  participants: ParticipantResponse[];
}

export interface ExpenseResponse {
  id: string;
  payerParticipantId: string;
  amount: number;
  description: string;
  categoryId?: string | null;
  occurredOn: string;
  receiptKey?: string | null;
}

export interface SettlementResponse {
  id: string;
  fromParticipantId: string;
  toParticipantId: string;
  amount: number;
  settledOn: string;
  note?: string | null;
}

export interface ParticipantBalance {
  participantId: string;
  displayName: string;
  paid: number;
  share: number;
  net: number;
}

export interface SuggestedTransfer {
  fromParticipantId: string;
  fromName: string;
  toParticipantId: string;
  toName: string;
  amount: number;
}

export interface BalanceResponse {
  groupId: string;
  currencyCode: string;
  totalExpenses: number;
  balances: ParticipantBalance[];
  transfers: SuggestedTransfer[];
}
