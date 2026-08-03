import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { StoreService } from '../core/store.service';

interface NavItem { path: string; label: string; icon: string; }

@Component({
  selector: 'mp-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
  <div class="shell">
    <aside class="side">
      <div class="brand">
        <div class="logo" *ngIf="!store.store().logoUrl; else logoImg">
          {{ initialsBrand() }}
        </div>
        <ng-template #logoImg>
          <img class="logo-img" [src]="store.store().logoUrl" alt="" />
        </ng-template>
        <div class="brand-text">
          <div class="title">{{ store.store().nameAr || 'Market Pro' }}</div>
          <div class="sub">{{ store.store().nameEn || 'Premium Retail' }}</div>
        </div>
      </div>

      <nav>
        <a *ngFor="let n of nav"
           [routerLink]="n.path"
           routerLinkActive="active"
           class="link">
          <span class="ic" [innerHTML]="n.icon"></span>
          <span class="lbl">{{ n.label }}</span>
        </a>
      </nav>

      <div class="user">
        <div class="avatar">{{ initials() }}</div>
        <div class="meta">
          <div class="name">{{ auth.user()?.fullName }}</div>
          <div class="role">{{ roleLabel() }}</div>
        </div>
        <button class="btn ghost icon-btn" (click)="logout()" title="خروج" aria-label="خروج">
          <span [innerHTML]="logoutIcon"></span>
        </button>
      </div>
    </aside>

    <main class="content">
      <router-outlet />
    </main>
  </div>
  `,
  styles: [`
    .shell {
      display: grid;
      grid-template-columns: 280px 1fr;
      min-height: 100vh;
    }
    .side {
      background:
        linear-gradient(180deg, rgba(14,24,48,.96), rgba(10,20,38,.96)),
        radial-gradient(400px 200px at 100% 0%, rgba(14,165,164,.08), transparent 70%);
      border-inline-start: 1px solid var(--border);
      padding: 20px 16px;
      display: flex; flex-direction: column; gap: 18px;
      position: sticky; top: 0; height: 100vh;
      backdrop-filter: blur(8px);
    }
    .brand {
      display: flex; align-items: center; gap: 12px;
      padding: 4px 6px 16px;
      border-bottom: 1px solid var(--border);
    }
    .logo, .logo-img {
      width: 44px; height: 44px; border-radius: 12px;
      flex: 0 0 44px;
    }
    .logo {
      background: linear-gradient(135deg, var(--primary), #06D6D5);
      color: var(--primary-foreground); font-weight: 800;
      display: grid; place-items: center;
      box-shadow: var(--shadow-2);
      font-size: 18px;
    }
    .logo-img { object-fit: cover; box-shadow: var(--shadow-2); }
    .brand-text { min-width: 0; }
    .title { font-weight: 800; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .sub { font-size: 11.5px; color: var(--muted); }

    nav { display: flex; flex-direction: column; gap: 4px; flex: 1; overflow: auto; }
    .link {
      display: flex; align-items: center; gap: 12px;
      padding: 11px 12px; border-radius: 12px; color: var(--muted);
      font-weight: 600; font-size: 14px;
      transition: background var(--transition), color var(--transition), transform var(--transition);
      border: 1px solid transparent;
    }
    .link:hover {
      background: rgba(255,255,255,.03);
      color: var(--foreground);
    }
    .link.active {
      background: linear-gradient(180deg, rgba(14,165,164,.18), rgba(14,165,164,.04));
      color: #B7F4F2;
      border-color: rgba(14,165,164,.35);
      box-shadow: 0 4px 14px rgba(14,165,164,.16);
    }
    .ic {
      width: 20px; height: 20px; display: inline-grid; place-items: center;
      flex: 0 0 20px;
    }
    .ic ::ng-deep svg { width: 20px; height: 20px; }
    .lbl { white-space: nowrap; }

    .user {
      display: flex; align-items: center; gap: 10px;
      padding: 10px;
      border: 1px solid var(--border); border-radius: 12px;
      background: rgba(14,24,48,.85);
    }
    .avatar {
      width: 38px; height: 38px; border-radius: 50%;
      background: linear-gradient(135deg, #1B294A, #243558);
      display: grid; place-items: center; font-weight: 700;
      flex: 0 0 38px;
    }
    .meta { flex: 1; min-width: 0; }
    .name {
      font-weight: 700; font-size: 13px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .role { color: var(--muted); font-size: 11.5px; }
    .icon-btn { width: 36px; height: 36px; padding: 0; border-radius: 10px; display: grid; place-items: center; }
    .icon-btn ::ng-deep svg { width: 16px; height: 16px; }

    .content {
      padding: 20px;
      min-width: 0;
      animation: fade-in .22s ease both;
    }
    @keyframes fade-in {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @media (max-width: 900px) {
      .shell { grid-template-columns: 1fr; }
      .side { position: static; height: auto; flex-direction: row; flex-wrap: wrap; }
      nav { flex-direction: row; flex-wrap: wrap; }
      .link .lbl { display: none; }
    }
  `]
})
export class ShellComponent {
  protected auth = inject(AuthService);
  protected store = inject(StoreService);
  private router = inject(Router);

  nav: NavItem[] = [
    { path: '/pos', label: 'نقطة البيع', icon: svg('M3 7h18M5 7l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12M9 7V5a3 3 0 016 0v2') },
    { path: '/dashboard', label: 'لوحة التحكم', icon: svg('M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z') },
    { path: '/products', label: 'المنتجات', icon: svg('M20 7l-8-4-8 4 8 4 8-4zM4 7v10l8 4M20 7v10l-8 4') },
    { path: '/inventory', label: 'المخزون', icon: svg('M3 7h18v4H3zM5 11v9h14v-9M10 15h4') },
    { path: '/customers', label: 'العملاء', icon: svg('M16 11a4 4 0 10-8 0 4 4 0 008 0zM2 21a8 8 0 0120 0') },
    { path: '/reports', label: 'التقارير', icon: svg('M4 19V5M4 19h16M8 15V9M12 15V7M16 15v-4') }
  ];

  logoutIcon = svg('M15 12H3M3 12l4-4M3 12l4 4M21 5v14a2 2 0 01-2 2h-6');

  initials() {
    const n = this.auth.user()?.fullName || '?';
    return n.trim().split(/\s+/).slice(0, 2).map(x => x[0]).join('');
  }

  initialsBrand() {
    const n = this.store.store().nameEn || this.store.store().nameAr || 'MP';
    return n.trim().split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase();
  }

  roleLabel() {
    const role = this.auth.user()?.role;
    return role === 'Admin' ? 'مدير' : role === 'Cashier' ? 'كاشير' : (role ?? '');
  }

  logout() {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}

function svg(d: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
}
