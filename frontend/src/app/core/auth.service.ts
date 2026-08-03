import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface LoginResponse {
  token: string;
  expiresAt: string;
  userId: string;
  fullName: string;
  role: string;
}

const STORAGE_KEY = 'mp.auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _state = signal<LoginResponse | null>(this.read());
  readonly state = this._state.asReadonly();
  readonly isAuthenticated = computed(() => !!this._state());
  readonly user = computed(() => this._state());

  constructor(private http: HttpClient) {}

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, { username, password })
      .pipe(tap(res => this.persist(res)));
  }

  logout() {
    localStorage.removeItem(STORAGE_KEY);
    this._state.set(null);
  }

  get token(): string | null {
    return this._state()?.token ?? null;
  }

  private persist(res: LoginResponse) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(res));
    this._state.set(res);
  }

  private read(): LoginResponse | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const v = JSON.parse(raw) as LoginResponse;
      if (new Date(v.expiresAt) < new Date()) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return v;
    } catch {
      return null;
    }
  }
}
