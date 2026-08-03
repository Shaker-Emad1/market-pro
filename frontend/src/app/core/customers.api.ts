import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { PagedResult } from './products.api';

export interface Customer {
  id: string;
  fullName: string;
  phone?: string;
  email?: string;
  notes?: string;
  creditBalance: number;
  loyaltyPoints: number;
  totalSalesCount: number;
  totalSalesAmount: number;
}

export interface CustomerInvoice {
  id: string;
  invoiceNumber: string;
  saleDate: string;
  total: number;
  paidAmount: number;
  changeAmount: number;
  paymentMethod: number;
}

@Injectable({ providedIn: 'root' })
export class CustomersApi {
  private http = inject(HttpClient);

  getCustomers(params: {
    search?: string;
    hasDebt?: boolean;
    page: number;
    pageSize: number;
  }): Observable<PagedResult<Customer>> {
    return this.http.get<PagedResult<Customer>>(`${environment.apiUrl}/customers`, { params: params as any });
  }

  getById(id: string): Observable<Customer> {
    return this.http.get<Customer>(`${environment.apiUrl}/customers/${id}`);
  }

  create(customer: Partial<Customer>): Observable<Customer> {
    return this.http.post<Customer>(`${environment.apiUrl}/customers`, customer);
  }

  update(id: string, customer: Partial<Customer>): Observable<Customer> {
    return this.http.put<Customer>(`${environment.apiUrl}/customers/${id}`, customer);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/customers/${id}`);
  }

  getInvoices(id: string, page: number, pageSize: number): Observable<PagedResult<CustomerInvoice>> {
    return this.http.get<PagedResult<CustomerInvoice>>(`${environment.apiUrl}/customers/${id}/invoices`, {
      params: { page, pageSize }
    });
  }

  payDebt(id: string, amount: number, notes?: string): Observable<{ creditBalance: number; message: string }> {
    return this.http.post<{ creditBalance: number; message: string }>(`${environment.apiUrl}/customers/${id}/pay-debt`, { amount, notes });
  }
}
