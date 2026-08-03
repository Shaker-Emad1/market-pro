import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type UnitType = 'Piece' | 'Kilogram' | 'Gram' | 'Liter' | 'Box' | 'Pack';
export type PaymentMethod = 'Cash' | 'Card' | 'BankTransfer' | 'Credit' | 'Mixed';

export interface PosCategory {
  id: string;
  nameAr: string;
  iconName?: string;
  colorHex?: string;
  productCount: number;
}

export interface PosProduct {
  id: string;
  sku: string;
  barcode?: string;
  nameAr: string;
  nameEn?: string;
  sellPrice: number;
  discountPrice?: number;
  taxRate: number;
  stockQty: number;
  unit: UnitType | number;
  imageUrl?: string;
  categoryId: string;
  categoryNameAr: string;
}

export interface CartItemDto {
  productId: string;
  quantity: number;
  overrideUnitPrice?: number | null;
  lineDiscount: number;
}

export interface CreateSaleRequest {
  customerId?: string | null;
  paymentMethod: PaymentMethod;
  paidAmount: number;
  discountAmount: number;
  notes?: string;
  items: CartItemDto[];
}

export interface SaleLineDto {
  productName: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxRate: number;
  lineTotal: number;
  unit: number;
}

export interface SaleSummary {
  id: string;
  invoiceNumber: string;
  saleDate: string;
  subTotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  paidAmount: number;
  changeAmount: number;
  paymentMethod: PaymentMethod;
  cashierName: string;
  customerName?: string;
  items: SaleLineDto[];
  qrPayload: string;
  store: {
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
  };
}

@Injectable({ providedIn: 'root' })
export class PosApi {
  private base = `${environment.apiUrl}/pos`;
  constructor(private http: HttpClient) {}

  categories(): Observable<PosCategory[]> {
    return this.http.get<PosCategory[]>(`${this.base}/categories`);
  }

  products(q?: string, categoryId?: string | null): Observable<PosProduct[]> {
    const params: Record<string, string> = {};
    if (q) params['q'] = q;
    if (categoryId) params['categoryId'] = categoryId;
    return this.http.get<PosProduct[]>(`${this.base}/products`, { params });
  }

  byBarcode(barcode: string): Observable<PosProduct> {
    return this.http.get<PosProduct>(`${this.base}/products/by-barcode/${encodeURIComponent(barcode)}`);
  }

  createSale(req: CreateSaleRequest): Observable<SaleSummary> {
    return this.http.post<SaleSummary>(`${this.base}/sales`, req);
  }
}
