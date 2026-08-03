import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { InventoryApi, InventoryAnalytics, InventoryItem, Movement } from '../../core/inventory.api';
import { ProductsApi, Product } from '../../core/products.api';
import { ToastService } from '../../core/toast.service';
import { StoreService } from '../../core/store.service';

@Component({
  selector: 'mp-inventory',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="page">
      <header class="head animate-fade">
        <div>
          <h1>مراقبة المخزون والجرد</h1>
          <p class="text-muted">تتبع الكميات، مستويات الطلب، وحركة السلع، وقم بإجراء تسويات وتوريدات المخزن.</p>
        </div>
        <div class="header-actions">
          <button class="btn primary" (click)="openRestockModal()">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            توريد بضاعة جديدة
          </button>
        </div>
      </header>

      <!-- Analytics Cards -->
      <section class="analytics-grid animate-slide" *ngIf="analytics() as a">
        <div class="card stat">
          <span class="label">إجمالي السلع النشطة</span>
          <span class="value" dir="ltr">{{ a.totalProducts }}</span>
          <span class="desc">منتج مسجل بالمخازن</span>
        </div>
        <div class="card stat">
          <span class="label">إجمالي قطع المخزون</span>
          <span class="value" dir="ltr">{{ a.totalStockQty | number:'1.0-2' }}</span>
          <span class="desc">حبة / كجم متوفرة حالياً</span>
        </div>
        <div class="card stat info">
          <span class="label">قيمة المخزون بسعر التكلفة</span>
          <span class="value" dir="ltr">{{ a.totalStockValue | number:'1.2-2' }} <span class="cur">{{ store.store().currency }}</span></span>
          <span class="desc">رأس المال المستثمر في البضاعة</span>
        </div>
        <div class="card stat warn" [class.danger]="a.lowStockCount > 0">
          <span class="label">أصناف منخفضة المخزون</span>
          <span class="value" dir="ltr">{{ a.lowStockCount }}</span>
          <span class="desc">وصلت أو تعدت الحد الأدنى</span>
        </div>
        <div class="card stat danger" [class.fine]="a.expiringCount === 0">
          <span class="label">أصناف قريبة الانتهاء</span>
          <span class="value" dir="ltr">{{ a.expiringCount }}</span>
          <span class="desc">تنتهي صلاحيتها خلال 30 يوم</span>
        </div>
      </section>

      <!-- Tabs Navigation -->
      <nav class="tabs">
        <button class="tab-btn" [class.active]="activeTab() === 'overview'" (click)="setTab('overview')">
          حالة المخزون الحالي
        </button>
        <button class="tab-btn" [class.active]="activeTab() === 'movements'" (click)="setTab('movements')">
          سجل حركات المخزن
        </button>
      </nav>

      <!-- TAB 1: OVERVIEW -->
      <div *ngIf="activeTab() === 'overview'" class="tab-content">
        <section class="card filters animate-fade">
          <div class="search-box">
            <input type="text" class="input" placeholder="ابحث باسم المنتج أو رمز SKU..." [value]="overviewSearch()" (input)="onOverviewSearch($event)">
          </div>
          <div class="filter-actions">
            <label class="checkbox-label">
              <input type="checkbox" [checked]="overviewLowStock()" (change)="toggleOverviewLowStock($event)">
              <span>منخفض المخزون فقط</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" [checked]="overviewExpiring()" (change)="toggleOverviewExpiring($event)">
              <span>قريب الانتهاء (30 يوم)</span>
            </label>
          </div>
        </section>

        <div class="card table-container animate-fade" *ngIf="!loading(); else loadingTpl">
          <table class="table" *ngIf="overviewItems().length > 0; else emptyOverview">
            <thead>
              <tr>
                <th>المنتج / الباركود</th>
                <th>التصنيف</th>
                <th>سعر التكلفة</th>
                <th>سعر البيع</th>
                <th>المخزون الحالي</th>
                <th>تاريخ الصلاحية</th>
                <th>مستوى الإنذار</th>
                <th style="text-align: center;">إجراءات الجرد</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of overviewItems()" 
                  [class.warning]="item.trackStock && item.stockQty <= item.minStockQty && item.stockQty > 0" 
                  [class.danger]="item.trackStock && item.stockQty <= 0">
                <td>
                  <div>
                    <div class="prod-name">{{ item.nameAr }}</div>
                    <div class="prod-sub text-muted" dir="ltr">{{ item.sku }} | {{ item.barcode || '—' }}</div>
                  </div>
                </td>
                <td><span class="badge">{{ item.categoryName }}</span></td>
                <td dir="ltr">{{ item.costPrice | number:'1.2-2' }} {{ store.store().currency }}</td>
                <td dir="ltr">{{ item.sellPrice | number:'1.2-2' }} {{ store.store().currency }}</td>
                <td>
                  <div class="qty-cell" [class.warn]="item.trackStock && item.stockQty <= item.minStockQty && item.stockQty > 0" [class.danger]="item.trackStock && item.stockQty <= 0">
                    <strong>{{ item.stockQty | number:'1.0-3' }}</strong>
                    <span class="unit text-muted">{{ item.unit === 1 ? 'حبة' : 'كجم' }}</span>
                  </div>
                </td>
                <td>
                  <span *ngIf="item.expirationDate" [class.text-danger]="isExpiring(item.expirationDate)" class="exp-date">
                    {{ item.expirationDate | date:'yyyy/MM/dd' }}
                  </span>
                  <span *ngIf="!item.expirationDate" class="text-muted">—</span>
                </td>
                <td>{{ item.minStockQty }}</td>
                <td>
                  <div class="actions">
                    <button class="btn sm" (click)="openAdjustModal(item)">تسوية وجرد</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <ng-template #emptyOverview>
            <div class="empty-state">
              <h3>لا توجد بضاعة مطابقة لمعايير الجرد</h3>
              <p class="text-muted">جرب البحث بكلمة مختلفة أو غير الفلاتر النشطة.</p>
            </div>
          </ng-template>

          <footer class="pagination" *ngIf="overviewTotal() > 0">
            <span>عرض {{ overviewItems().length }} من {{ overviewTotal() }} منتج</span>
            <div class="pages">
              <button class="btn sm" [disabled]="overviewPage() === 1" (click)="setOverviewPage(overviewPage() - 1)">السابق</button>
              <span>صفحة {{ overviewPage() }} من {{ overviewTotalPages() }}</span>
              <button class="btn sm" [disabled]="overviewPage() >= overviewTotalPages()" (click)="setOverviewPage(overviewPage() + 1)">التالي</button>
            </div>
          </footer>
        </div>
      </div>

      <!-- TAB 2: MOVEMENTS LOG -->
      <div *ngIf="activeTab() === 'movements'" class="tab-content">
        <section class="card filters animate-fade">
          <div class="search-box">
            <input type="text" class="input" placeholder="ابحث باسم المنتج أو رقم المرجع..." [value]="movementSearch()" (input)="onMovementSearch($event)">
          </div>
          <div class="filter-actions">
            <select class="input select" [value]="movementTypeFilter()" (change)="onMovementTypeChange($event)">
              <option value="">جميع الحركات</option>
              <option value="1">شراء وتوريد</option>
              <option value="2">مبيعات كاشير</option>
              <option value="3">تسوية جرد</option>
              <option value="4">مرتجع</option>
              <option value="5">تالف ومستبعد</option>
            </select>
          </div>
        </section>

        <div class="card table-container animate-fade" *ngIf="!loading(); else loadingTpl">
          <table class="table movements-table" *ngIf="movements().length > 0; else emptyMovements">
            <thead>
              <tr>
                <th>التاريخ والوقت</th>
                <th>المنتج</th>
                <th>نوع الحركة</th>
                <th>الكمية المضافة/المحذوفة</th>
                <th>الرصيد قبل</th>
                <th>الرصيد بعد</th>
                <th>التكلفة للوحدة</th>
                <th>المرجع</th>
                <th>السبب / المستخدم</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let m of movements()">
                <td class="text-muted">{{ m.createdAt | date:'yyyy/MM/dd HH:mm' }}</td>
                <td>
                  <div>
                    <div class="prod-name">{{ m.productName }}</div>
                    <div class="prod-sub text-muted" dir="ltr">{{ m.sku }}</div>
                  </div>
                </td>
                <td>
                  <span class="m-badge" [class.purchase]="m.type === 1" [class.sale]="m.type === 2" [class.adjust]="m.type === 3" [class.return]="m.type === 4" [class.waste]="m.type === 5">
                    {{ getMovementTypeName(m.type) }}
                  </span>
                </td>
                <td dir="ltr" [class.text-success]="m.quantity > 0" [class.text-danger]="m.quantity < 0" style="font-weight: 800;">
                  {{ m.quantity > 0 ? '+' : '' }}{{ m.quantity | number:'1.0-3' }}
                </td>
                <td>{{ m.quantityBefore | number:'1.0-3' }}</td>
                <td>{{ m.quantityAfter | number:'1.0-3' }}</td>
                <td dir="ltr">{{ m.unitCost | number:'1.2-2' }} {{ store.store().currency }}</td>
                <td><span class="kbd" *ngIf="m.reference">{{ m.reference }}</span><span class="text-muted" *ngIf="!m.reference">—</span></td>
                <td>
                  <div>
                    <div class="reason">{{ m.reason || '—' }}</div>
                    <div class="user text-muted">{{ m.userFullName || 'النظام' }}</div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <ng-template #emptyMovements>
            <div class="empty-state">
              <h3>سجل الحركات فارغ</h3>
              <p class="text-muted">لم يتم العثور على أي حركات مخزنية مطابقة لشروط الفلترة.</p>
            </div>
          </ng-template>

          <footer class="pagination" *ngIf="movementsTotal() > 0">
            <span>عرض {{ movements().length }} من {{ movementsTotal() }} حركة</span>
            <div class="pages">
              <button class="btn sm" [disabled]="movementsPage() === 1" (click)="setMovementsPage(movementsPage() - 1)">السابق</button>
              <span>صفحة {{ movementsPage() }} من {{ movementsTotalPages() }}</span>
              <button class="btn sm" [disabled]="movementsPage() >= movementsTotalPages()" (click)="setMovementsPage(movementsPage() + 1)">التالي</button>
            </div>
          </footer>
        </div>
      </div>

      <!-- Loading skeleton -->
      <ng-template #loadingTpl>
        <div class="loading-container">
          <div class="skeleton-row" *ngFor="let s of [1,2,3,4,5]"></div>
        </div>
      </ng-template>

      <!-- Modal 1: Restock (توريد بضاعة) -->
      <div class="modal-backdrop" *ngIf="showRestockModal()">
        <div class="modal card animate-pop">
          <header class="modal-header">
            <h2>شراء وتوريد بضاعة للمستودع</h2>
            <button class="btn ghost close" (click)="closeRestockModal()">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </header>
          <form [formGroup]="restockForm" (ngSubmit)="onRestockSubmit()" class="modal-body">
            <div class="form-grid">
              <div class="form-group full-width">
                <label>اختر المنتج المراد توريده *</label>
                <select class="input select" formControlName="productId" (change)="onRestockProductChange($event)">
                  <option value="">اختر من المنتجات المتوفرة...</option>
                  <option *ngFor="let p of allProducts()" [value]="p.id">{{ p.nameAr }} ({{ p.sku }})</option>
                </select>
              </div>

              <div class="form-group">
                <label>الكمية المضافة للتوريد *</label>
                <input type="number" step="0.001" class="input" formControlName="quantity">
              </div>

              <div class="form-group">
                <label>سعر التكلفة الجديد (شامل الضريبة)</label>
                <input type="number" step="0.01" class="input" formControlName="unitCost">
              </div>

              <div class="form-group">
                <label>المرجع / رقم فاتورة المورد</label>
                <input type="text" class="input" formControlName="reference" placeholder="مثال: INV-SUPP-88">
              </div>

              <div class="form-group">
                <label>ملاحظات التوريد</label>
                <input type="text" class="input" formControlName="notes" placeholder="ملاحظات أو اسم المورد...">
              </div>
            </div>

            <footer class="modal-footer">
              <button type="button" class="btn ghost" (click)="closeRestockModal()">إلغاء</button>
              <button type="submit" class="btn primary" [disabled]="restockForm.invalid || submitting()">تأكيد التوريد</button>
            </footer>
          </form>
        </div>
      </div>

      <!-- Modal 2: Adjust Stock (تسوية وجرد) -->
      <div class="modal-backdrop" *ngIf="showAdjustModal()">
        <div class="modal card animate-pop alert">
          <header class="modal-header">
            <h2>تسوية مخزنية وجرد يدوي</h2>
            <button class="btn ghost close" (click)="closeAdjustModal()">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </header>
          <form [formGroup]="adjustForm" (ngSubmit)="onAdjustSubmit()" class="modal-body">
            <div class="text-center" style="margin-bottom: 18px;">
              <h3>{{ selectedOverviewItem()?.nameAr }}</h3>
              <p class="text-muted">الرصيد الحالي بالمخزن: <strong>{{ selectedOverviewItem()?.stockQty | number:'1.0-3' }} {{ selectedOverviewItem()?.unit === 1 ? 'حبة' : 'كجم' }}</strong></p>
            </div>

            <div class="form-grid" style="grid-template-columns: 1fr;">
              <div class="form-group">
                <label>الكمية الفعلية الصحيحة بعد الجرد *</label>
                <input type="number" step="0.001" class="input" formControlName="newQuantity">
              </div>

              <div class="form-group">
                <label>نوع حركة التسوية *</label>
                <select class="input select" formControlName="type">
                  <option [value]="3">تسوية جرد يدوية (عجز/زيادة)</option>
                  <option [value]="5">بضاعة تالفة / منتهية الصلاحية</option>
                  <option [value]="4">بضاعة مرتجعة للمخزن</option>
                </select>
              </div>

              <div class="form-group">
                <label>السبب والتبرير بالتفصيل *</label>
                <input type="text" class="input" formControlName="reason" placeholder="مثال: كسر عبوة، جرد دوري، عجز طبيعي...">
              </div>
            </div>

            <footer class="modal-footer">
              <button type="button" class="btn ghost" (click)="closeAdjustModal()">إلغاء</button>
              <button type="submit" class="btn primary" [disabled]="adjustForm.invalid || submitting()">تحديث رصيد الجرد</button>
            </footer>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page { display: grid; gap: 18px; }
    .head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    h1 { margin: 0; font-size: 24px; font-weight: 800; color: #fff; }
    
    .analytics-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px;
    }
    .stat { padding: 16px; display: grid; gap: 4px; }
    .stat .label { font-size: 12.5px; color: var(--muted); font-weight: 600; }
    .stat .value { font-size: 22px; font-weight: 800; color: #fff; font-variant-numeric: tabular-nums; }
    .stat .value .cur { font-size: 12px; color: var(--muted); }
    .stat .desc { font-size: 11px; color: var(--muted); }
    
    .stat.info { border-color: rgba(14,165,164,.4); }
    .stat.info .value { color: #6EE7E7; }
    .stat.warn { border-color: rgba(245,158,11,.4); }
    .stat.warn .value { color: #FCD34D; }
    .stat.danger { border-color: rgba(239,68,68,.4); }
    .stat.danger .value { color: #FCA5A5; }
    .stat.danger.fine { border-color: var(--border); }
    .stat.danger.fine .value { color: #86EFAC; }

    .tabs { display: flex; border-bottom: 2px solid var(--border); gap: 8px; margin-top: 10px; }
    .tab-btn {
      padding: 12px 20px; font-size: 14px; font-weight: 700; color: var(--muted);
      background: transparent; border: none; cursor: pointer; border-bottom: 3px solid transparent;
      transition: all var(--transition);
    }
    .tab-btn:hover { color: #fff; }
    .tab-btn.active { color: var(--primary); border-bottom-color: var(--primary); }

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
    .checkbox-label input { width: 17px; height: 17px; accent-color: var(--primary); }

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

    .prod-name { font-weight: 700; color: #fff; }
    .prod-sub { font-size: 11px; margin-top: 2px; }

    .qty-cell { display: inline-flex; align-items: center; gap: 6px; }
    .qty-cell strong { font-size: 15px; color: #86EFAC; font-variant-numeric: tabular-nums; }
    .qty-cell.warn strong { color: #FCD34D; }
    .qty-cell.danger strong { color: #FCA5A5; }
    .qty-cell .unit { font-size: 11px; }

    .exp-date { font-weight: 700; font-variant-numeric: tabular-nums; }

    .m-badge {
      display: inline-flex; padding: 3px 8px; border-radius: 6px; font-size: 11.5px; font-weight: 700;
    }
    .m-badge.purchase { background: rgba(14,165,164,.15); color: #6EE7E7; }
    .m-badge.sale { background: rgba(34,197,94,.12); color: #86EFAC; }
    .m-badge.adjust { background: rgba(245,158,11,.15); color: #FCD34D; }
    .m-badge.return { background: rgba(147,51,234,.15); color: #D8B4FE; }
    .m-badge.waste { background: rgba(239,68,68,.15); color: #FCA5A5; }

    .reason { font-size: 13px; font-weight: 700; color: #fff; }
    .user { font-size: 11.5px; }

    .pagination {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 20px; border-top: 1px solid var(--border); font-size: 13px;
    }
    .pages { display: flex; align-items: center; gap: 12px; }

    .empty-state { display: grid; place-items: center; padding: 48px 0; gap: 8px; text-align: center; }
    .empty-state h3 { margin: 0; font-size: 18px; color: #fff; }

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
      width: 100%; max-width: 600px; max-height: calc(100vh - 40px);
      display: flex; flex-direction: column; overflow: hidden;
    }
    .modal.alert { max-width: 440px; }
    .modal-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 20px; border-bottom: 1px solid var(--border);
    }
    .modal-header h2 { margin: 0; font-size: 18px; font-weight: 800; color: #fff; }
    .modal-body { padding: 20px; overflow-y: auto; }
    .form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
    .form-group { display: grid; gap: 6px; }
    .form-group.full-width { grid-column: span 2; }
    .form-group label { font-size: 12.5px; font-weight: 600; color: var(--muted); }
    .modal-footer {
      display: flex; align-items: center; justify-content: flex-end; gap: 12px;
      padding: 14px 20px; border-top: 1px solid var(--border);
      background: rgba(255,255,255,.01);
    }
    .text-center { text-align: center; }

    /* Animations */
    .animate-fade { animation: fade .25s ease both; }
    .animate-slide { animation: slide .3s ease both; }
    .animate-pop { animation: pop .22s cubic-bezier(.34,1.56,.64,1) both; }
    @keyframes fade { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slide { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes pop { from { opacity: 0; transform: scale(.94); } to { opacity: 1; transform: scale(1); } }
  `]
})
export class InventoryComponent implements OnInit {
  private api = inject(InventoryApi);
  private productsApi = inject(ProductsApi);
  protected store = inject(StoreService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);

  activeTab = signal<'overview' | 'movements'>('overview');
  analytics = signal<InventoryAnalytics | null>(null);
  loading = signal(false);
  submitting = signal(false);

  // Tab 1: Overview state
  overviewItems = signal<InventoryItem[]>([]);
  overviewTotal = signal(0);
  overviewPage = signal(1);
  overviewSearch = signal('');
  overviewLowStock = signal(false);
  overviewExpiring = signal(false);
  overviewPageSize = 10;

  // Tab 2: Movements state
  movements = signal<Movement[]>([]);
  movementsTotal = signal(0);
  movementsPage = signal(1);
  movementSearch = signal('');
  movementTypeFilter = signal('');
  movementsPageSize = 10;

  // Form Modals state
  showRestockModal = signal(false);
  showAdjustModal = signal(false);
  allProducts = signal<Product[]>([]);
  selectedOverviewItem = signal<InventoryItem | null>(null);

  restockForm!: FormGroup;
  adjustForm!: FormGroup;

  ngOnInit() {
    this.initForms();
    this.loadAnalytics();
    this.loadOverview();
  }

  initForms() {
    this.restockForm = this.fb.group({
      productId: ['', Validators.required],
      quantity: [0, [Validators.required, Validators.min(0.001)]],
      unitCost: [0, [Validators.required, Validators.min(0)]],
      reference: [''],
      notes: ['']
    });

    this.adjustForm = this.fb.group({
      productId: ['', Validators.required],
      newQuantity: [0, [Validators.required, Validators.min(0)]],
      type: [3, Validators.required], // default adjustment
      reason: ['', [Validators.required, Validators.maxLength(200)]],
      reference: ['']
    });
  }

  setTab(tab: 'overview' | 'movements') {
    this.activeTab.set(tab);
    if (tab === 'overview') {
      this.loadOverview();
    } else {
      this.loadMovements();
    }
  }

  loadAnalytics() {
    this.api.getAnalytics().subscribe({
      next: data => this.analytics.set(data),
      error: () => this.toast.error('فشل في تحميل مؤشرات المخزون')
    });
  }

  // Load Tab 1: Overview
  loadOverview() {
    this.loading.set(true);
    this.api.getOverview({
      search: this.overviewSearch(),
      lowStock: this.overviewLowStock(),
      expiringSoon: this.overviewExpiring(),
      page: this.overviewPage(),
      pageSize: this.overviewPageSize
    }).subscribe({
      next: res => {
        this.overviewItems.set(res.items);
        this.overviewTotal.set(res.totalCount);
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('فشل في جلب نظرة عامة على المخزون');
        this.loading.set(false);
      }
    });
  }

  // Load Tab 2: Movements
  loadMovements() {
    this.loading.set(true);
    const typeVal = this.movementTypeFilter();
    this.api.getMovements({
      search: this.movementSearch(),
      type: typeVal ? parseInt(typeVal, 10) : undefined,
      page: this.movementsPage(),
      pageSize: this.movementsPageSize
    }).subscribe({
      next: res => {
        this.movements.set(res.items);
        this.movementsTotal.set(res.totalCount);
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('فشل في جلب سجل حركات المخزن');
        this.loading.set(false);
      }
    });
  }

  // Tab 1 Events
  onOverviewSearch(e: any) {
    this.overviewSearch.set(e.target.value);
    this.overviewPage.set(1);
    this.loadOverview();
  }

  toggleOverviewLowStock(e: any) {
    this.overviewLowStock.set(e.target.checked);
    this.overviewPage.set(1);
    this.loadOverview();
  }

  toggleOverviewExpiring(e: any) {
    this.overviewExpiring.set(e.target.checked);
    this.overviewPage.set(1);
    this.loadOverview();
  }

  setOverviewPage(p: number) {
    this.overviewPage.set(p);
    this.loadOverview();
  }

  overviewTotalPages(): number {
    return Math.ceil(this.overviewTotal() / this.overviewPageSize);
  }

  isExpiring(dateStr: string): boolean {
    const d = new Date(dateStr);
    const limit = new Date();
    limit.setDate(limit.getDate() + 30);
    return d <= limit;
  }

  // Tab 2 Events
  onMovementSearch(e: any) {
    this.movementSearch.set(e.target.value);
    this.movementsPage.set(1);
    this.loadMovements();
  }

  onMovementTypeChange(e: any) {
    this.movementTypeFilter.set(e.target.value);
    this.movementsPage.set(1);
    this.loadMovements();
  }

  setMovementsPage(p: number) {
    this.movementsPage.set(p);
    this.loadMovements();
  }

  movementsTotalPages(): number {
    return Math.ceil(this.movementsTotal() / this.movementsPageSize);
  }

  getMovementTypeName(type: number): string {
    switch (type) {
      case 1: return 'شراء وتوريد';
      case 2: return 'مبيعات كاشير';
      case 3: return 'تسوية جرد';
      case 4: return 'مرتجع';
      case 5: return 'تالف ومستبعد';
      default: return 'أخرى';
    }
  }

  // Restock Modal
  openRestockModal() {
    this.productsApi.getProducts({ page: 1, pageSize: 500 }).subscribe({
      next: res => {
        this.allProducts.set(res.items);
        this.restockForm.reset({ quantity: 0, unitCost: 0 });
        this.showRestockModal.set(true);
      },
      error: () => this.toast.error('فشل تحميل قائمة المنتجات للتوريد')
    });
  }

  onRestockProductChange(e: any) {
    const prodId = e.target.value;
    const prod = this.allProducts().find(p => p.id === prodId);
    if (prod) {
      this.restockForm.patchValue({ unitCost: prod.costPrice });
    }
  }

  closeRestockModal() {
    this.showRestockModal.set(false);
  }

  onRestockSubmit() {
    if (this.restockForm.invalid) return;

    this.submitting.set(true);
    this.api.restock(this.restockForm.value).subscribe({
      next: () => {
        this.toast.success('تم توريد البضاعة للمستودع بنجاح');
        this.showRestockModal.set(false);
        this.submitting.set(false);
        this.loadAnalytics();
        if (this.activeTab() === 'overview') this.loadOverview();
        else this.loadMovements();
      },
      error: err => {
        const msg = err.error?.error || 'فشل توريد البضاعة';
        this.toast.error(msg);
        this.submitting.set(false);
      }
    });
  }

  // Adjust Modal
  openAdjustModal(item: InventoryItem) {
    this.selectedOverviewItem.set(item);
    this.adjustForm.reset({
      productId: item.productId,
      newQuantity: item.stockQty,
      type: 3,
      reason: ''
    });
    this.showAdjustModal.set(true);
  }

  closeAdjustModal() {
    this.showAdjustModal.set(false);
  }

  onAdjustSubmit() {
    if (this.adjustForm.invalid) return;

    this.submitting.set(true);
    this.api.adjust(this.adjustForm.value).subscribe({
      next: () => {
        this.toast.success('تمت تسوية رصيد الجرد بنجاح');
        this.showAdjustModal.set(false);
        this.submitting.set(false);
        this.loadAnalytics();
        this.loadOverview();
      },
      error: err => {
        const msg = err.error?.error || 'فشل إجراء التسوية';
        this.toast.error(msg);
        this.submitting.set(false);
      }
    });
  }
}
