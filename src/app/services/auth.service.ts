import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthenticatedUser, AuthenticationResult } from '../models';
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

  logout(): void {
    this.token.set(null);
    this.user.set(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  displayName(): string {
    const u = this.user();
    if (!u) return '';
    return [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email;
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
