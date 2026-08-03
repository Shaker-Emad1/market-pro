import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { PagedResult } from './products.api';

export interface InventoryAnalytics {
  totalProducts: number;
  totalStockQty: number;
  totalStockValue: number;
  lowStockCount: number;
  expiringCount: number;
}

export interface InventoryItem {
  productId: string;
  sku: string;
  barcode?: string;
  nameAr: string;
  categoryName: string;
  stockQty: number;
  minStockQty: number;
  costPrice: number;
  sellPrice: number;
  unit: number; // 1 = Piece, 2 = Weight
  expirationDate?: string;
  trackStock: boolean;
}

export interface Movement {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  type: number; // 1 = Purchase, 2 = Sale, 3 = Adjustment, 4 = Return, 5 = Waste
  quantity: number;
  quantityBefore: number;
  quantityAfter: number;
  unitCost: number;
  reference?: string;
  reason?: string;
  createdAt: string;
  userFullName?: string;
}

@Injectable({ providedIn: 'root' })
export class InventoryApi {
  private http = inject(HttpClient);

  getAnalytics(): Observable<InventoryAnalytics> {
    return this.http.get<InventoryAnalytics>(`${environment.apiUrl}/inventory/analytics`);
  }

  getOverview(params: {
    search?: string;
    lowStock?: boolean;
    expiringSoon?: boolean;
    page: number;
    pageSize: number;
  }): Observable<PagedResult<InventoryItem>> {
    return this.http.get<PagedResult<InventoryItem>>(`${environment.apiUrl}/inventory/overview`, { params: params as any });
  }

  getMovements(params: {
    search?: string;
    type?: number;
    productId?: string;
    page: number;
    pageSize: number;
  }): Observable<PagedResult<Movement>> {
    return this.http.get<PagedResult<Movement>>(`${environment.apiUrl}/inventory/movements`, { params: params as any });
  }

  restock(req: {
    productId: string;
    quantity: number;
    unitCost: number;
    reference?: string;
    notes?: string;
  }): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${environment.apiUrl}/inventory/restock`, req);
  }

  adjust(req: {
    productId: string;
    newQuantity: number;
    type: number; // 3 = Adjustment, 5 = Waste, etc.
    reason?: string;
    reference?: string;
  }): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${environment.apiUrl}/inventory/adjust`, req);
  }
}
