import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface Product {
  id: string;
  sku: string;
  barcode?: string;
  nameAr: string;
  nameEn?: string;
  description?: string;
  imageUrl?: string;
  costPrice: number;
  sellPrice: number;
  discountPrice?: number;
  taxRate: number;
  stockQty: number;
  minStockQty: number;
  trackStock: boolean;
  unit: number; // 1 = Piece, 2 = Weight
  expirationDate?: string;
  isActive: boolean;
  categoryId: string;
  categoryName: string;
}

export interface Category {
  id: string;
  nameAr: string;
  nameEn?: string;
  iconName?: string;
  colorHex?: string;
  displayOrder: number;
}

@Injectable({ providedIn: 'root' })
export class ProductsApi {
  private http = inject(HttpClient);

  getProducts(params: {
    search?: string;
    categoryId?: string;
    lowStock?: boolean;
    page: number;
    pageSize: number;
  }): Observable<PagedResult<Product>> {
    return this.http.get<PagedResult<Product>>(`${environment.apiUrl}/products`, { params: params as any });
  }

  getById(id: string): Observable<Product> {
    return this.http.get<Product>(`${environment.apiUrl}/products/${id}`);
  }

  create(product: Partial<Product>): Observable<Product> {
    return this.http.post<Product>(`${environment.apiUrl}/products`, product);
  }

  update(id: string, product: Partial<Product>): Observable<Product> {
    return this.http.put<Product>(`${environment.apiUrl}/products/${id}`, product);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/products/${id}`);
  }

  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${environment.apiUrl}/products/categories`);
  }
}
