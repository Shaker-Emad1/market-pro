import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProductsApi, Product, Category } from '../../core/products.api';
import { ToastService } from '../../core/toast.service';
import { StoreService } from '../../core/store.service';

@Component({
  selector: 'mp-products',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="page">
      <header class="head animate-fade">
        <div>
          <h1>إدارة المنتجات</h1>
          <p class="text-muted">أضف، عدل، تصفح، وتتبع رصيد جميع السلع والمنتجات.</p>
        </div>
        <button class="btn primary" (click)="openAddModal()">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          إضافة منتج جديد
        </button>
      </header>

      <!-- Search & Filters -->
      <section class="card filters animate-slide">
        <div class="search-box">
          <input type="text" class="input" placeholder="ابحث باسم المنتج، SKU أو الباركود..." [value]="searchQuery()" (input)="onSearch($event)">
        </div>
        <div class="filter-actions">
          <select class="input select" [value]="selectedCategory()" (change)="onCategoryChange($event)">
            <option value="">كل الأقسام</option>
            <option *ngFor="let cat of categories()" [value]="cat.id">{{ cat.nameAr }}</option>
          </select>
          <label class="checkbox-label">
            <input type="checkbox" [checked]="lowStockOnly()" (change)="toggleLowStock($event)">
            <span>منخفض المخزون فقط</span>
          </label>
        </div>
      </section>

      <!-- Products Grid/Table -->
      <div class="card table-container animate-fade" *ngIf="!loading(); else loadingTpl">
        <table class="table" *ngIf="products().length > 0; else emptyState">
          <thead>
            <tr>
              <th>المنتج</th>
              <th>SKU / الباركود</th>
              <th>القسم</th>
              <th>سعر الشراء</th>
              <th>سعر البيع</th>
              <th>المخزون الحالي</th>
              <th>الكمية الحرجة</th>
              <th>الحالة</th>
              <th style="text-align: center;">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let p of products()" [class.warning]="p.trackStock && p.stockQty <= p.minStockQty && p.stockQty > 0" [class.danger]="p.trackStock && p.stockQty <= 0">
              <td>
                <div class="prod-cell">
                  <div class="prod-img" [style.background-color]="p.imageUrl ? 'transparent' : 'rgba(14, 165, 164, 0.15)'">
                    <img *ngIf="p.imageUrl" [src]="p.imageUrl" alt="img">
                    <span *ngIf="!p.imageUrl" class="prod-char">{{ p.nameAr[0] }}</span>
                  </div>
                  <div>
                    <div class="prod-name">{{ p.nameAr }}</div>
                    <div class="prod-en text-muted">{{ p.nameEn || '—' }}</div>
                  </div>
                </div>
              </td>
              <td>
                <div class="sku-cell">
                  <span class="kbd">{{ p.sku }}</span>
                  <span class="barcode text-muted" dir="ltr">{{ p.barcode || '—' }}</span>
                </div>
              </td>
              <td>
                <span class="badge">{{ p.categoryName }}</span>
              </td>
              <td dir="ltr">{{ p.costPrice | number:'1.2-2' }} {{ store.store().currency }}</td>
              <td dir="ltr">
                <span [class.strike]="p.discountPrice" class="sell-p">{{ p.sellPrice | number:'1.2-2' }}</span>
                <span *ngIf="p.discountPrice" class="disc-p"> {{ p.discountPrice | number:'1.2-2' }}</span>
                <span class="currency"> {{ store.store().currency }}</span>
              </td>
              <td>
                <div class="qty-badge" [class.low]="p.trackStock && p.stockQty <= p.minStockQty && p.stockQty > 0" [class.out]="p.trackStock && p.stockQty <= 0">
                  <span class="qty">{{ p.stockQty | number:'1.0-3' }}</span>
                  <span class="unit">{{ p.unit === 1 ? 'حبة' : 'كجم' }}</span>
                </div>
              </td>
              <td>
                <span class="text-muted">{{ p.minStockQty }}</span>
              </td>
              <td>
                <span class="status" [class.active]="p.isActive" [class.inactive]="!p.isActive">
                  {{ p.isActive ? 'نشط' : 'موقف' }}
                </span>
              </td>
              <td>
                <div class="actions">
                  <button class="btn sm ghost" (click)="openEditModal(p)" title="تعديل">
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z"></path></svg>
                  </button>
                  <button class="btn sm ghost danger" (click)="confirmDelete(p)" title="حذف">
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Empty state -->
        <ng-template #emptyState>
          <div class="empty-state animate-fade">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="9" x2="15" y2="9"></line><line x1="9" y1="13" x2="15" y2="13"></line><line x1="9" y1="17" x2="13" y2="17"></line></svg>
            <h3>لا توجد منتجات مطابقة للبحث</h3>
            <p class="text-muted">تأكد من كتابة الكلمة الصحيحة أو قم بتغيير الفلاتر النشطة.</p>
          </div>
        </ng-template>

        <!-- Pagination -->
        <footer class="pagination" *ngIf="totalCount() > 0">
          <span class="info">يتم عرض {{ products().length }} من أصل {{ totalCount() }} منتج</span>
          <div class="pages">
            <button class="btn sm" [disabled]="page() === 1" (click)="setPage(page() - 1)">السابق</button>
            <span class="curr">صفحة {{ page() }} من {{ totalPages() }}</span>
            <button class="btn sm" [disabled]="page() >= totalPages()" (click)="setPage(page() + 1)">التالي</button>
          </div>
        </footer>
      </div>

      <!-- Loading skeleton -->
      <ng-template #loadingTpl>
        <div class="loading-container">
          <div class="skeleton-row" *ngFor="let s of [1,2,3,4,5]"></div>
        </div>
      </ng-template>

      <!-- Modal Dialog Add/Edit -->
      <div class="modal-backdrop" *ngIf="showModal()">
        <div class="modal card animate-pop">
          <header class="modal-header">
            <h2>{{ isEditMode() ? 'تعديل بيانات منتج' : 'إضافة منتج جديد' }}</h2>
            <button class="btn ghost close" (click)="closeModal()">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </header>

          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="modal-body">
            <div class="form-grid">
              <div class="form-group">
                <label>الاسم باللغة العربية *</label>
                <input type="text" class="input" formControlName="nameAr" placeholder="مثال: أرز بسمتي 5 كجم">
              </div>

              <div class="form-group">
                <label>الاسم باللغة الإنجليزية</label>
                <input type="text" class="input" formControlName="nameEn" placeholder="مثال: Basmati Rice 5kg">
              </div>

              <div class="form-group">
                <label>رمز SKU فريد *</label>
                <input type="text" class="input" formControlName="sku" placeholder="مثال: RICE-001">
              </div>

              <div class="form-group">
                <label>الباركود</label>
                <input type="text" class="input" formControlName="barcode" placeholder="مثال: 628100100200">
              </div>

              <div class="form-group">
                <label>القسم الأساسي *</label>
                <select class="input select" formControlName="categoryId">
                  <option value="">اختر القسم...</option>
                  <option *ngFor="let cat of categories()" [value]="cat.id">{{ cat.nameAr }}</option>
                </select>
              </div>

              <div class="form-group">
                <label>وحدة القياس *</label>
                <select class="input select" formControlName="unit">
                  <option [value]="1">حبة / قطعة</option>
                  <option [value]="2">وزن / كيلوجرام</option>
                </select>
              </div>

              <div class="form-group">
                <label>سعر التكلفة (الشراء) *</label>
                <input type="number" step="0.01" class="input" formControlName="costPrice">
              </div>

              <div class="form-group">
                <label>سعر البيع الافتراضي *</label>
                <input type="number" step="0.01" class="input" formControlName="sellPrice">
              </div>

              <div class="form-group">
                <label>سعر العرض الترويجي (اختياري)</label>
                <input type="number" step="0.01" class="input" formControlName="discountPrice">
              </div>

              <div class="form-group">
                <label>نسبة الضريبة % *</label>
                <input type="number" step="0.1" class="input" formControlName="taxRate">
              </div>

              <!-- Only show stock setting in Add Mode to avoid side effects (restock / adjustments are done in Inventory module) -->
              <div class="form-group" *ngIf="!isEditMode()">
                <label>الكمية الافتتاحية للمخزون</label>
                <input type="number" step="0.001" class="input" formControlName="stockQty">
              </div>

              <div class="form-group">
                <label>الحد الأدنى للإنذار (الكمية الحرجة)</label>
                <input type="number" step="0.1" class="input" formControlName="minStockQty">
              </div>

              <div class="form-group">
                <label>تاريخ انتهاء الصلاحية</label>
                <input type="date" class="input" formControlName="expirationDate">
              </div>

              <div class="form-group">
                <label>رابط صورة المنتج (URL)</label>
                <input type="text" class="input" formControlName="imageUrl" placeholder="http://example.com/image.png">
              </div>

              <div class="form-group full-width checkbox-row">
                <label class="checkbox-label">
                  <input type="checkbox" formControlName="trackStock">
                  <span>تفعيل تتبع المخزون لهذا المنتج</span>
                </label>
                <label class="checkbox-label">
                  <input type="checkbox" formControlName="isActive">
                  <span>المنتج نشط ومتاح للبيع في الكاشير</span>
                </label>
              </div>

              <div class="form-group full-width">
                <label>وصف مختصر للمنتج</label>
                <textarea class="input textarea" formControlName="description" rows="2" placeholder="وصف تفصيلي أو ملاحظات الكاشير..."></textarea>
              </div>
            </div>

            <footer class="modal-footer">
              <button type="button" class="btn ghost" (click)="closeModal()">إلغاء</button>
              <button type="submit" class="btn primary" [disabled]="form.invalid || submitting()">
                <span class="spinner-sm" *ngIf="submitting()"></span>
                حفظ المنتج
              </button>
            </footer>
          </form>
        </div>
      </div>

      <!-- Delete Confirmation Dialog -->
      <div class="modal-backdrop delete" *ngIf="showDeleteConfirm()">
        <div class="modal card alert animate-pop">
          <header class="modal-header danger">
            <h2>تأكيد حذف المنتج</h2>
          </header>
          <div class="modal-body text-center">
            <p>هل أنت متأكد من رغبتك في حذف المنتج <strong>{{ selectedProduct()?.nameAr }}</strong>؟</p>
            <p class="text-danger sub-warn">هذا الإجراء سيقوم بإخفاء المنتج تماماً ولكن سيحافظ على فواتير المبيعات المرتبطة به.</p>
          </div>
          <footer class="modal-footer">
            <button type="button" class="btn ghost" (click)="closeDeleteConfirm()">إلغاء</button>
            <button type="button" class="btn danger" (click)="deleteProduct()">نعم، احذف المنتج</button>
          </footer>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page { display: grid; gap: 18px; }
    .head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    h1 { margin: 0; font-size: 24px; font-weight: 800; color: #fff; }
    .filters {
      display: flex; gap: 14px; padding: 16px; align-items: center;
      flex-wrap: wrap; justify-content: space-between;
    }
    .search-box { flex: 1; min-width: 280px; }
    .filter-actions { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
    .select { min-width: 160px; height: 44px; }
    .checkbox-label {
      display: flex; align-items: center; gap: 8px; cursor: pointer;
      user-select: none; font-size: 13.5px;
    }
    .checkbox-label input { width: 17px; height: 17px; border-radius: 4px; accent-color: var(--primary); }

    .table-container { overflow-x: auto; padding: 0; }
    .table { width: 100%; border-collapse: collapse; text-align: right; font-size: 13.5px; }
    .table th {
      padding: 14px 18px; color: var(--muted); font-weight: 700;
      border-bottom: 1px solid var(--border); background: rgba(255,255,255,.01);
    }
    .table td { padding: 14px 18px; border-bottom: 1px solid var(--border); vertical-align: middle; }
    .table tbody tr:hover { background: rgba(255,255,255,.02); }
    
    .table tr.warning { background: rgba(245,158,11,.03); }
    .table tr.danger { background: rgba(239,68,68,.03); }

    .prod-cell { display: flex; align-items: center; gap: 12px; }
    .prod-img {
      width: 40px; height: 40px; border-radius: 8px; overflow: hidden;
      display: grid; place-items: center; border: 1px solid var(--border);
    }
    .prod-img img { width: 100%; height: 100%; object-fit: cover; }
    .prod-char { font-weight: 800; font-size: 16px; color: var(--primary); }
    .prod-name { font-weight: 700; color: #fff; }
    .prod-en { font-size: 11px; margin-top: 2px; }

    .sku-cell { display: grid; gap: 3px; }
    .sku-cell .kbd { font-size: 11px; width: fit-content; }
    .sku-cell .barcode { font-size: 11px; }

    .sell-p.strike { text-decoration: line-through; opacity: 0.5; font-size: 12px; }
    .disc-p { color: #5EEAD4; font-weight: 800; }
    .currency { font-size: 11px; color: var(--muted); }

    .qty-badge {
      display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px;
      border-radius: 8px; background: rgba(34,197,94,.12); color: #86EFAC;
      font-weight: 800; font-variant-numeric: tabular-nums;
    }
    .qty-badge.low { background: rgba(245,158,11,.16); color: #FCD34D; }
    .qty-badge.out { background: rgba(239,68,68,.16); color: #FCA5A5; }
    .qty-badge .unit { font-size: 11px; font-weight: 400; opacity: 0.8; }

    .status {
      display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700;
    }
    .status::before { content: ''; width: 6px; height: 6px; border-radius: 50%; }
    .status.active { color: #86EFAC; }
    .status.active::before { background: var(--success); }
    .status.inactive { color: var(--muted); }
    .status.inactive::before { background: var(--muted); }

    .actions { display: flex; align-items: center; justify-content: center; gap: 4px; }

    .pagination {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 20px; border-top: 1px solid var(--border); font-size: 13px;
    }
    .pages { display: flex; align-items: center; gap: 12px; }
    .curr { color: var(--muted); }

    .empty-state { display: grid; place-items: center; padding: 48px 0; gap: 12px; text-align: center; }
    .empty-state svg { opacity: .3; }
    .empty-state h3 { margin: 0; font-size: 18px; color: #fff; }
    .empty-state p { margin: 0; }

    /* Loading skeletons */
    .loading-container { padding: 24px; display: grid; gap: 12px; }
    .skeleton-row {
      height: 48px; border-radius: 8px;
      background: linear-gradient(90deg, var(--surface-2) 25%, var(--surface-3) 50%, var(--surface-2) 75%);
      background-size: 200% 100%; animation: loading-sweep 1.4s infinite;
    }
    @keyframes loading-sweep { to { background-position: -200% 0; } }

    /* Modals */
    .modal-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,.65);
      backdrop-filter: blur(4px); display: flex; align-items: center;
      justify-content: center; z-index: 1000; padding: 20px;
    }
    .modal {
      width: 100%; max-width: 680px; max-height: calc(100vh - 40px);
      display: flex; flex-direction: column; overflow: hidden;
    }
    .modal.alert { max-width: 440px; }
    .modal-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 20px; border-bottom: 1px solid var(--border);
    }
    .modal-header h2 { margin: 0; font-size: 18px; font-weight: 800; color: #fff; }
    .modal-header.danger h2 { color: #FCA5A5; }
    .modal-body { padding: 20px; overflow-y: auto; }
    .form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
    @media (max-width: 600px) { .form-grid { grid-template-columns: 1fr; } }
    .form-group { display: grid; gap: 6px; }
    .form-group.full-width { grid-column: span 2; }
    @media (max-width: 600px) { .form-group.full-width { grid-column: span 1; } }
    .form-group label { font-size: 12.5px; font-weight: 600; color: var(--muted); }
    .checkbox-row { display: flex; gap: 24px; flex-wrap: wrap; margin: 8px 0; }
    .textarea { resize: vertical; }

    .modal-footer {
      display: flex; align-items: center; justify-content: flex-end; gap: 12px;
      padding: 14px 20px; border-top: 1px solid var(--border);
      background: rgba(255,255,255,.01);
    }
    .text-center { text-align: center; }
    .sub-warn { font-size: 12px; margin-top: 8px; }

    /* Animations */
    .animate-fade { animation: fade .25s ease both; }
    .animate-slide { animation: slide .3s ease both; }
    .animate-pop { animation: pop .22s cubic-bezier(.34,1.56,.64,1) both; }
    @keyframes fade { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slide { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes pop { from { opacity: 0; transform: scale(.94); } to { opacity: 1; transform: scale(1); } }
  `]
})
export class ProductsComponent implements OnInit {
  private api = inject(ProductsApi);
  protected store = inject(StoreService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);

  products = signal<Product[]>([]);
  categories = signal<Category[]>([]);
  totalCount = signal(0);
  loading = signal(false);
  submitting = signal(false);

  // Filters State
  searchQuery = signal('');
  selectedCategory = signal('');
  lowStockOnly = signal(false);
  page = signal(1);
  pageSize = 10;

  // Modals state
  showModal = signal(false);
  isEditMode = signal(false);
  showDeleteConfirm = signal(false);
  selectedProduct = signal<Product | null>(null);

  form!: FormGroup;

  ngOnInit() {
    this.initForm();
    this.loadCategories();
    this.loadProducts();
  }

  initForm() {
    this.form = this.fb.group({
      nameAr: ['', [Validators.required, Validators.maxLength(200)]],
      nameEn: [''],
      sku: ['', [Validators.required, Validators.maxLength(64)]],
      barcode: [''],
      categoryId: ['', Validators.required],
      unit: [1, Validators.required], // default Piece
      costPrice: [0, [Validators.required, Validators.min(0)]],
      sellPrice: [0, [Validators.required, Validators.min(0)]],
      discountPrice: [null],
      taxRate: [15, [Validators.required, Validators.min(0)]],
      stockQty: [0, Validators.min(0)],
      minStockQty: [5, [Validators.required, Validators.min(0)]],
      trackStock: [true],
      isActive: [true],
      expirationDate: [null],
      imageUrl: [''],
      description: ['']
    });
  }

  loadCategories() {
    this.api.getCategories().subscribe({
      next: cats => this.categories.set(cats),
      error: () => this.toast.error('فشل تحميل أقسام المنتجات')
    });
  }

  loadProducts() {
    this.loading.set(true);
    this.api.getProducts({
      search: this.searchQuery(),
      categoryId: this.selectedCategory(),
      lowStock: this.lowStockOnly(),
      page: this.page(),
      pageSize: this.pageSize
    }).subscribe({
      next: res => {
        this.products.set(res.items);
        this.totalCount.set(res.totalCount);
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('فشل في تحميل قائمة المنتجات');
        this.loading.set(false);
      }
    });
  }

  onSearch(e: any) {
    this.searchQuery.set(e.target.value);
    this.page.set(1);
    this.loadProducts();
  }

  onCategoryChange(e: any) {
    this.selectedCategory.set(e.target.value);
    this.page.set(1);
    this.loadProducts();
  }

  toggleLowStock(e: any) {
    this.lowStockOnly.set(e.target.checked);
    this.page.set(1);
    this.loadProducts();
  }

  setPage(p: number) {
    this.page.set(p);
    this.loadProducts();
  }

  totalPages(): number {
    return Math.ceil(this.totalCount() / this.pageSize);
  }

  openAddModal() {
    this.isEditMode.set(false);
    this.form.reset({
      nameAr: '',
      nameEn: '',
      sku: '',
      barcode: '',
      categoryId: '',
      unit: 1,
      costPrice: 0,
      sellPrice: 0,
      discountPrice: null,
      taxRate: 15,
      stockQty: 0,
      minStockQty: 5,
      trackStock: true,
      isActive: true,
      expirationDate: null,
      imageUrl: '',
      description: ''
    });
    this.showModal.set(true);
  }

  openEditModal(p: Product) {
    this.isEditMode.set(true);
    this.selectedProduct.set(p);
    
    // Format date string for input element
    let formattedDate = null;
    if (p.expirationDate) {
      formattedDate = p.expirationDate.split('T')[0];
    }

    this.form.patchValue({
      nameAr: p.nameAr,
      nameEn: p.nameEn,
      sku: p.sku,
      barcode: p.barcode,
      categoryId: p.categoryId,
      unit: p.unit,
      costPrice: p.costPrice,
      sellPrice: p.sellPrice,
      discountPrice: p.discountPrice,
      taxRate: p.taxRate,
      minStockQty: p.minStockQty,
      trackStock: p.trackStock,
      isActive: p.isActive,
      expirationDate: formattedDate,
      imageUrl: p.imageUrl,
      description: p.description
    });

    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }

  onSubmit() {
    if (this.form.invalid) return;

    const val = this.form.value;
    if (val.sellPrice < val.costPrice) {
      this.toast.warn('سعر البيع لا يمكن أن يكون أقل من سعر الشراء للتكلفة!');
      return;
    }

    this.submitting.set(true);

    const payload = {
      ...val,
      unit: +val.unit,
      costPrice: +val.costPrice,
      sellPrice: +val.sellPrice,
      discountPrice: val.discountPrice ? +val.discountPrice : null,
      taxRate: +val.taxRate,
      minStockQty: +val.minStockQty,
      stockQty: val.stockQty ? +val.stockQty : 0,
      sku: val.sku?.trim(),
      barcode: val.barcode?.trim() || null,
      expirationDate: val.expirationDate ? new Date(val.expirationDate).toISOString() : null,
      imageUrl: val.imageUrl?.trim() || null,
      description: val.description?.trim() || null
    };

    if (this.isEditMode()) {
      const id = this.selectedProduct()!.id;
      this.api.update(id, payload).subscribe({
        next: () => {
          this.toast.success('تم تحديث بيانات المنتج بنجاح');
          this.showModal.set(false);
          this.submitting.set(false);
          this.loadProducts();
        },
        error: err => {
          const msg = err.error?.error || 'فشل تحديث المنتج';
          this.toast.error(msg);
          this.submitting.set(false);
        }
      });
    } else {
      this.api.create(payload).subscribe({
        next: () => {
          this.toast.success('تمت إضافة المنتج الجديد بنجاح');
          this.showModal.set(false);
          this.submitting.set(false);
          this.loadProducts();
        },
        error: err => {
          const msg = err.error?.error || 'فشل إضافة المنتج الجديد';
          this.toast.error(msg);
          this.submitting.set(false);
        }
      });
    }
  }

  confirmDelete(p: Product) {
    this.selectedProduct.set(p);
    this.showDeleteConfirm.set(true);
  }

  closeDeleteConfirm() {
    this.showDeleteConfirm.set(false);
  }

  deleteProduct() {
    const id = this.selectedProduct()!.id;
    this.api.delete(id).subscribe({
      next: () => {
        this.toast.success('تم حذف المنتج بنجاح');
        this.showDeleteConfirm.set(false);
        this.loadProducts();
      },
      error: () => {
        this.toast.error('فشل في حذف المنتج');
      }
    });
  }
}
