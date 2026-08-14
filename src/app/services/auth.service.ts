import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AddFriendResult, AuthenticatedUser, AuthenticationResult, Friend, UserDetail, UserProfile } from '../models';
import { environment } from '../../environments/environment';

const TOKEN_KEY = 'skladka_token';
const USER_KEY = 'skladka_user';
const BASE = environment.apiBase;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  readonly token = signal<string | null>(localStorage.getItem(TOKEN_KEY));
  readonly user = signal<AuthenticatedUser | null>(safeParse(localStorage.getItem(USER_KEY)));
  readonly isAuthenticated = computed(() => this.token() !== null);

  async login(email: string, password: string): Promise<void> {
    this.setSession(await firstValueFrom(
      this.http.post<AuthenticationResult>(`${BASE}/api/auth/login`, { email, password })));
  }

  async register(email: string, password: string, firstName?: string, lastName?: string): Promise<void> {
    this.setSession(await firstValueFrom(
      this.http.post<AuthenticationResult>(`${BASE}/api/auth/register`, { email, password, firstName, lastName })));
  }

  async loginWithGoogle(idToken: string): Promise<void> {
    this.setSession(await firstValueFrom(
      this.http.post<AuthenticationResult>(`${BASE}/api/auth/google`, { idToken })));
  }

  async googleClientId(): Promise<string> {
    const config = await firstValueFrom(this.http.get<{ clientId: string }>(`${BASE}/api/auth/google-config`));
    return config.clientId ?? '';
  }

  getProfile() {
    return firstValueFrom(this.http.get<UserProfile>(`${BASE}/api/auth/me`));
  }

  listUsers() {
    return firstValueFrom(this.http.get<UserProfile[]>(`${BASE}/api/auth/users`));
  }

  deleteUser(userId: string) {
    return firstValueFrom(this.http.delete<void>(`${BASE}/api/auth/users/${userId}`));
  }

  getUserDetail(userId: string) {
    return firstValueFrom(this.http.get<UserDetail>(`${BASE}/api/auth/users/${userId}/detail`));
  }

  uploadAvatar(image: string) {
    return firstValueFrom(this.http.post<UserProfile>(`${BASE}/api/auth/me/avatar`, { image }));
  }

  deleteAvatar() {
    return firstValueFrom(this.http.delete<UserProfile>(`${BASE}/api/auth/me/avatar`));
  }

  listFriends() {
    return firstValueFrom(this.http.get<Friend[]>(`${BASE}/api/friends`));
  }

  addFriend(query: string) {
    return firstValueFrom(this.http.post<AddFriendResult>(`${BASE}/api/friends`, { query }));
  }

  removeFriend(userId: string) {
    return firstValueFrom(this.http.delete<void>(`${BASE}/api/friends/${userId}`));
  }

  listFriendRequests() {
    return firstValueFrom(this.http.get<Friend[]>(`${BASE}/api/friends/requests`));
  }

  acceptFriendRequest(fromUserId: string) {
    return firstValueFrom(this.http.post<Friend>(`${BASE}/api/friends/requests/${fromUserId}/accept`, {}));
  }

  declineFriendRequest(fromUserId: string) {
    return firstValueFrom(this.http.delete<void>(`${BASE}/api/friends/requests/${fromUserId}`));
  }

  async updateProfile(body: { firstName?: string; lastName?: string; handle?: string }): Promise<UserProfile> {
    const profile = await firstValueFrom(this.http.put<UserProfile>(`${BASE}/api/auth/me`, body));
    const current = this.user();
    if (current) {
      const updated = { ...current, firstName: profile.firstName, lastName: profile.lastName };
      this.user.set(updated);
      localStorage.setItem(USER_KEY, JSON.stringify(updated));
    }
    return profile;
  }

  logout(): void {
    this.token.set(null);
    this.user.set(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  displayName(): string {
    const u = this.user();
    if (!u) return '';
    return [u.firstName, u.lastName].filter(Boolean).join(' ') || (u.handle ? '@' + u.handle : u.email);
  }

  private setSession(result: AuthenticationResult): void {
    this.token.set(result.accessToken);
    this.user.set(result.user);
    localStorage.setItem(TOKEN_KEY, result.accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(result.user));
  }
}

function safeParse(value: string | null): AuthenticatedUser | null {
  try {
    return value ? JSON.parse(value) as AuthenticatedUser : null;
  } catch {
    return null;
  }
}
