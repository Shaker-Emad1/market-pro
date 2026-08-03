import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'mp-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="wrap">
    <div class="card auth">
      <div class="brand">
        <div class="logo">MP</div>
        <div>
          <h1>Market Pro</h1>
          <p class="text-muted">نظام نقاط البيع للسوبرماركت</p>
        </div>
      </div>

      <form (ngSubmit)="submit()" #f="ngForm" class="form">
        <label>اسم المستخدم</label>
        <input class="input" name="username" [(ngModel)]="username" required autofocus />

        <label>كلمة المرور</label>
        <input class="input" type="password" name="password" [(ngModel)]="password" required />

        <button class="btn primary lg block" [disabled]="loading()">
          {{ loading() ? 'جارٍ الدخول…' : 'تسجيل الدخول' }}
        </button>

        <p class="error" *ngIf="error()">{{ error() }}</p>

        <div class="hint">
          <span class="text-muted">حسابات تجريبية:</span>
          <span class="kbd">admin / admin123</span>
          <span class="kbd">cashier / cashier123</span>
        </div>
      </form>
    </div>
  </div>
  `,
  styles: [`
    .wrap { min-height: 100vh; display: grid; place-items: center; padding: 24px; }
    .auth { width: 100%; max-width: 440px; padding: 28px; }
    .brand { display: flex; align-items: center; gap: 14px; margin-bottom: 22px; }
    .logo {
      width: 52px; height: 52px; border-radius: 14px;
      background: linear-gradient(135deg, var(--primary), #06D6D5);
      color: var(--primary-foreground); font-weight: 800; display: grid; place-items: center;
      box-shadow: var(--shadow-2); font-size: 18px;
    }
    h1 { margin: 0; font-size: 22px; }
    .form { display: grid; gap: 10px; }
    label { font-size: 13px; color: var(--muted); margin-top: 6px; }
    .error { color: var(--danger); font-size: 13px; margin: 4px 0 0; }
    .hint { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-top: 12px; font-size: 12px; }
  `]
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  username = 'cashier';
  password = 'cashier123';
  loading = signal(false);
  error = signal<string | null>(null);

  submit() {
    this.error.set(null);
    if (!this.username || !this.password) return;
    this.loading.set(true);
    this.auth.login(this.username, this.password).subscribe({
      next: () => { this.loading.set(false); this.router.navigateByUrl('/pos'); },
      error: (e) => {
        this.loading.set(false);
        const msg =
          e?.error?.error?.message ??
          (typeof e?.error?.error === 'string' ? e.error.error : null) ??
          e?.error?.message ??
          'فشل تسجيل الدخول';
        this.error.set(msg);
      }
    });
  }
}
