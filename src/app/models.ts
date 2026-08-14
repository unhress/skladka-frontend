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
  membershipMode: 'open' | 'approval' | string;
  inviteToken?: string | null;
  participants: ParticipantResponse[];
}

export interface InviteResponse {
  token: string;
}

export interface AcceptInviteResponse {
  status: 'joined' | 'requested' | string;
  groupId: string;
  groupName: string;
}

export interface JoinRequest {
  id: string;
  userId: string;
  displayName: string;
  createdUtc: string;
}

export interface ExpenseResponse {
  id: string;
  payerParticipantId: string;
  amount: number;
  description: string;
  categoryId?: string | null;
  sourceId?: string | null;
  occurredOn: string;
  receiptKey?: string | null;
  receiptUrl?: string | null;
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

export interface ActivityItem {
  type: 'expense' | 'settlement' | 'opening';
  id: string;
  date: string;
  amount: number;
  title: string;
  subtitle: string;
  receiptKey?: string | null;
  receiptUrl?: string | null;
  isDeleted?: boolean;
  isEdited?: boolean;
}

export interface AddFriendResult {
  status: 'requested' | 'accepted' | string;
  friend: Friend;
}

export interface ExpenseRevision {
  id: string;
  changeKind: 'edited' | 'deleted' | string;
  payerParticipantId: string;
  amount: number;
  description: string;
  occurredOn: string;
  sourceId?: string | null;
  changedUtc: string;
}

export interface SourceResponse {
  id: string;
  name: string;
  category: string;
  slug: string;
  isGlobal: boolean;
  isFavorite: boolean;
  iconUrl?: string | null;
}

export interface Friend {
  userId: string;
  displayName: string;
  handle?: string | null;
  avatarKey?: string | null;
  avatarUrl?: string | null;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  handle?: string | null;
  avatarKey?: string | null;
  avatarUrl?: string | null;
}
