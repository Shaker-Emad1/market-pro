import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'error' | 'info' | 'warn';

export interface Toast {
  id: number;
  kind: ToastKind;
  title?: string;
  message: string;
  ttl: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private seq = 0;
  readonly toasts = signal<Toast[]>([]);

  show(message: string, kind: ToastKind = 'info', title?: string, ttl = 2800) {
    const id = ++this.seq;
    this.toasts.update(t => [...t, { id, kind, title, message, ttl }]);
    setTimeout(() => this.dismiss(id), ttl);
  }

  success(msg: string, title?: string) { this.show(msg, 'success', title); }
  error(msg: string, title?: string) { this.show(msg, 'error', title, 4000); }
  info(msg: string, title?: string) { this.show(msg, 'info', title); }
  warn(msg: string, title?: string) { this.show(msg, 'warn', title, 3500); }

  dismiss(id: number) {
    this.toasts.update(t => t.filter(x => x.id !== id));
  }
}
