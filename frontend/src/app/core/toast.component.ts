import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../core/toast.service';

/**
 * Stack of toasts rendered at app root. Uses signals for reactive updates and
 * pure CSS keyframes for enter/exit so it stays smooth even under load.
 */
@Component({
  selector: 'mp-toast-host',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-host" aria-live="polite" aria-atomic="true">
      <div *ngFor="let t of toasts.toasts()"
           class="toast"
           [class.success]="t.kind === 'success'"
           [class.error]="t.kind === 'error'"
           [class.warn]="t.kind === 'warn'"
           [class.info]="t.kind === 'info'"
           (click)="toasts.dismiss(t.id)">
        <span class="ic" aria-hidden="true">
          <svg *ngIf="t.kind === 'success'" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
          <svg *ngIf="t.kind === 'error'" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8v5M12 17h.01M10.3 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.7 3.86a2 2 0 00-3.4 0z"/></svg>
          <svg *ngIf="t.kind === 'warn'" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4M12 17h.01M10.3 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.7 3.86a2 2 0 00-3.4 0z"/></svg>
          <svg *ngIf="t.kind === 'info'" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
        </span>
        <div class="body">
          <div class="title" *ngIf="t.title">{{ t.title }}</div>
          <div class="msg">{{ t.message }}</div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .toast-host {
      position: fixed;
      bottom: 20px;
      inset-inline-start: 50%;
      transform: translateX(-50%);
      display: flex; flex-direction: column; gap: 10px;
      z-index: 9999;
      pointer-events: none;
      width: min(420px, 92vw);
    }
    .toast {
      pointer-events: auto;
      display: flex; align-items: flex-start; gap: 12px;
      padding: 12px 14px;
      border-radius: 14px;
      background: rgba(17, 26, 46, .85);
      backdrop-filter: blur(14px) saturate(140%);
      -webkit-backdrop-filter: blur(14px) saturate(140%);
      border: 1px solid var(--border);
      box-shadow: 0 18px 50px rgba(0,0,0,.45), 0 2px 6px rgba(0,0,0,.3);
      color: var(--foreground);
      font-weight: 600;
      animation: toast-in .22s cubic-bezier(.2,.8,.2,1) both;
      cursor: pointer;
    }
    .toast .ic {
      width: 28px; height: 28px; border-radius: 8px; display: grid; place-items: center;
      flex: 0 0 28px;
    }
    .toast.success { border-color: rgba(34,197,94,.35); }
    .toast.success .ic { background: rgba(34,197,94,.18); color: #4ADE80; }
    .toast.error { border-color: rgba(239,68,68,.4); }
    .toast.error .ic { background: rgba(239,68,68,.18); color: #FCA5A5; }
    .toast.warn { border-color: rgba(245,158,11,.4); }
    .toast.warn .ic { background: rgba(245,158,11,.18); color: #FCD34D; }
    .toast.info .ic { background: rgba(96,165,250,.18); color: #93C5FD; }
    .body { flex: 1; min-width: 0; }
    .title { font-weight: 800; font-size: 13px; margin-bottom: 2px; }
    .msg { font-size: 13px; line-height: 1.5; color: var(--foreground); opacity: .92; }

    @keyframes toast-in {
      from { opacity: 0; transform: translateY(12px) scale(.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
  `]
})
export class ToastHostComponent {
  toasts = inject(ToastService);
}
