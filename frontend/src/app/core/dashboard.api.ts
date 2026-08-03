import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface DailyPoint { label: string; total: number; }
export interface TopProduct { name: string; quantity: number; revenue: number; }
export interface LowStockItem { name: string; stockQty: number; sku: string; }

export interface DashboardSummary {
  todaySales: number;
  todayInvoices: number;
  averageBasket: number;
  lowStockCount: number;
  activeProducts: number;
  last7Days: DailyPoint[];
  topProducts: TopProduct[];
  lowStockItems: LowStockItem[];
}

@Injectable({ providedIn: 'root' })
export class DashboardApi {
  private http = inject(HttpClient);

  summary(): Observable<DashboardSummary> {
    return this.http.get<DashboardSummary>(`${environment.apiUrl}/dashboard/summary`);
  }
}
