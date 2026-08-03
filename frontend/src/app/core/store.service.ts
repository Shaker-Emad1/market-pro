import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface StoreInfo {
  nameAr: string;
  nameEn: string;
  addressAr: string;
  phone: string;
  taxNumber: string;
  currency: string;
  logoUrl: string;
  footerAr: string;
  footerEn: string;
  receiptWidthMm: number;
}

const FALLBACK: StoreInfo = {
  nameAr: 'ماركت برو',
  nameEn: 'Market Pro',
  addressAr: '',
  phone: '',
  taxNumber: '',
  currency: 'ر.س',
  logoUrl: '',
  footerAr: 'شكراً لزيارتكم',
  footerEn: 'Thank you',
  receiptWidthMm: 58
};

@Injectable({ providedIn: 'root' })
export class StoreService {
  private http = inject(HttpClient);
  readonly store = signal<StoreInfo>(FALLBACK);

  async load(): Promise<void> {
    try {
      const s = await firstValueFrom(this.http.get<StoreInfo>(`${environment.apiUrl}/store`));
      if (s) this.store.set(s);
    } catch {
      // Keep fallback; printing should never block the app.
    }
  }
}
