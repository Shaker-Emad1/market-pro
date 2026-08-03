import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface SalesReport {
  totalSales: number;
  totalInvoices: number;
  totalDiscount: number;
  totalTax: number;
  netRevenue: number;
  averageBasket: number;
  paymentMethods: { method: number; count: number; total: number; }[];
  dailySales: { date: string; count: number; total: number; }[];
}

export interface ProductSalesReport {
  sku: string;
  productName: string;
  categoryName: string;
  quantitySold: number;
  revenue: number;
  cost: number;
  profit: number;
}

export interface CustomerDebtReport {
  customerId: string;
  fullName: string;
  phone?: string;
  creditBalance: number;
  totalPurchased: number;
}

export interface InventoryStatusReport {
  totalItems: number;
  totalQuantity: number;
  totalCostValue: number;
  totalRetailValue: number;
  projectedProfit: number;
  lowStockItems: { sku: string; nameAr: string; stockQty: number; minStockQty: number; categoryName: string; }[];
}

@Injectable({ providedIn: 'root' })
export class ReportsApi {
  private http = inject(HttpClient);

  getSalesReport(from?: string, to?: string): Observable<SalesReport> {
    const params: any = {};
    if (from) params.from = from;
    if (to) params.to = to;
    return this.http.get<SalesReport>(`${environment.apiUrl}/reports/sales`, { params });
  }

  getProductSalesReport(from?: string, to?: string): Observable<ProductSalesReport[]> {
    const params: any = {};
    if (from) params.from = from;
    if (to) params.to = to;
    return this.http.get<ProductSalesReport[]>(`${environment.apiUrl}/reports/products`, { params });
  }

  getCustomerDebtReport(): Observable<CustomerDebtReport[]> {
    return this.http.get<CustomerDebtReport[]>(`${environment.apiUrl}/reports/customer-debt`);
  }

  getInventoryReport(): Observable<InventoryStatusReport> {
    return this.http.get<InventoryStatusReport>(`${environment.apiUrl}/reports/inventory`);
  }
}
