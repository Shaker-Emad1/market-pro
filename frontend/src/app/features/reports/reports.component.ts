import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportsApi, SalesReport, ProductSalesReport, CustomerDebtReport, InventoryStatusReport } from '../../core/reports.api';
import { ToastService } from '../../core/toast.service';
import { StoreService } from '../../core/store.service';

@Component({
  selector: 'mp-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page print-area">
      <!-- Report Header -->
      <header class="head no-print animate-fade">
        <div>
          <h1>التقارير التحليلية والمالية</h1>
          <p class="text-muted">مراقبة الأداء، الأرباح، الضرائب، وحسابات الذمم والديون للمؤسسة.</p>
        </div>
        <div class="header-actions">
          <button class="btn" (click)="printReport()">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
            طباعة التقرير
          </button>
        </div>
      </header>

      <!-- Print Title Header (Only visible on paper) -->
      <div class="print-header only-print">
        <h2>{{ store.store().nameAr }}</h2>
        <p>{{ store.store().addressAr }} | هاتف: {{ store.store().phone }} | الرقم الضريبي: {{ store.store().taxNumber }}</p>
        <hr>
        <h3 class="text-center">تقرير الأداء والتحليلات المالية</h3>
        <p class="text-center text-muted" style="font-size:12px;">تاريخ استخراج التقرير: {{ today | date:'yyyy/MM/dd HH:mm' }}</p>
      </div>

      <!-- Report Tabs -->
      <nav class="tabs no-print">
        <button class="tab-btn" [class.active]="activeTab() === 'sales'" (click)="setTab('sales')">تقرير المبيعات والضرائب</button>
        <button class="tab-btn" [class.active]="activeTab() === 'products'" (click)="setTab('products')">مبيعات وأرباح الأصناف</button>
        <button class="tab-btn" [class.active]="activeTab() === 'debt'" (click)="setTab('debt')">ديون وحسابات العملاء</button>
        <button class="tab-btn" [class.active]="activeTab() === 'inventory'" (click)="setTab('inventory')">تقييم وحالة المخزون</button>
      </nav>

      <!-- Date filters for Sales and Products tabs -->
      <section class="card filters no-print animate-fade" *ngIf="activeTab() === 'sales' || activeTab() === 'products'">
        <div class="date-inputs">
          <div class="grp">
            <label>من تاريخ</label>
            <input type="date" class="input" [(ngModel)]="startDate" (change)="onDateChange()">
          </div>
          <div class="grp">
            <label>إلى تاريخ</label>
            <input type="date" class="input" [(ngModel)]="endDate" (change)="onDateChange()">
          </div>
        </div>
        <div class="export-actions">
          <button class="btn sm primary" (click)="exportCSV()">تصدير بيانات CSV (إكسل)</button>
        </div>
      </section>

      <!-- LOADING INDICATOR -->
      <div class="loading-state animate-fade" *ngIf="loading()">
        <div class="spinner"></div>
        <p class="text-muted">جاري سحب وتجميع البيانات التحليلية المباشرة…</p>
      </div>

      <!-- TAB 1: SALES REPORT -->
      <div *ngIf="activeTab() === 'sales' && !loading()" class="tab-content animate-fade">
        <div class="metrics-grid" *ngIf="salesData() as s">
          <div class="card stat">
            <span class="label">إجمالي قيمة المبيعات (شامل الضريبة)</span>
            <span class="value text-success" dir="ltr">{{ s.totalSales | number:'1.2-2' }} <span class="cur">{{ store.store().currency }}</span></span>
            <span class="desc">صافي الدخل المستلم بالمبيعات</span>
          </div>
          <div class="card stat">
            <span class="label">عدد الفواتير الصادرة</span>
            <span class="value" dir="ltr">{{ s.totalInvoices }}</span>
            <span class="desc">متوسط قيمة الفاتورة: <strong dir="ltr">{{ s.averageBasket | number:'1.2-2' }}</strong></span>
          </div>
          <div class="card stat">
            <span class="label">إجمالي قيمة الخصومات الممنوحة</span>
            <span class="value text-danger" dir="ltr">{{ s.totalDiscount | number:'1.2-2' }} <span class="cur">{{ store.store().currency }}</span></span>
            <span class="desc">قيمة العروض والتخفيضات بالفواتير</span>
          </div>
          <div class="card stat info">
            <span class="label">إجمالي الضرائب المحصلة</span>
            <span class="value" dir="ltr">{{ s.totalTax | number:'1.2-2' }} <span class="cur">{{ store.store().currency }}</span></span>
            <span class="desc">ضريبة القيمة المضافة المحسوبة %15</span>
          </div>
        </div>

        <!-- Payments method breakdown -->
        <div class="grid-2 animate-slide" style="margin-top:18px;" *ngIf="salesData() as s">
          <section class="card breakdown">
            <div class="title">طرق الدفع المفضلة</div>
            <ul class="b-list">
              <li *ngFor="let pm of s.paymentMethods">
                <span class="name">{{ getPayMethodName(pm.method) }}</span>
                <span class="count text-muted">{{ pm.count }} فاتورة</span>
                <span class="total" dir="ltr">{{ pm.total | number:'1.2-2' }} {{ store.store().currency }}</span>
              </li>
              <li *ngIf="s.paymentMethods.length === 0" class="text-muted">لا يوجد مبيعات مسجلة في هذه الفترة بعد.</li>
            </ul>
          </section>

          <!-- SVG Sparkline for Sales Trend -->
          <section class="card trend">
            <header class="ch-head">
              <div class="title">مخطط حركة المبيعات اليومية</div>
            </header>
            <div class="chart-wrapper">
              <svg viewBox="0 0 500 160" class="mini-chart" *ngIf="s.dailySales.length > 0; else emptyTrend">
                <path [attr.d]="salesLinePath()" fill="none" stroke="#0EA5A4" stroke-width="2.5" />
                <circle *ngFor="let pt of salesPoints()" [attr.cx]="pt.x" [attr.cy]="pt.y" r="3.5" fill="#0B1220" stroke="#0EA5A4" stroke-width="2" />
                <g class="labels">
                  <text *ngFor="let pt of salesPoints()" [attr.x]="pt.x" y="152" text-anchor="middle">{{ pt.date | date:'MM/dd' }}</text>
                  <text *ngFor="let pt of salesPoints()" [attr.x]="pt.x" [attr.y]="pt.y - 8" text-anchor="middle" font-size="9" fill="#86EFAC" font-weight="700">{{ pt.total | number:'1.0-0' }}</text>
                </g>
              </svg>
              <ng-template #emptyTrend>
                <p class="text-muted text-center" style="padding-top:40px;">لا يوجد بيانات رسم تخطيطي كافية</p>
              </ng-template>
            </div>
          </section>
        </div>
      </div>

      <!-- TAB 2: PRODUCT SALES REPORT -->
      <div *ngIf="activeTab() === 'products' && !loading()" class="tab-content animate-fade">
        <div class="card table-container">
          <header class="ch-head" style="padding:16px 20px 4px;">
            <div class="title">أصناف السلع الأكثر مبيعا وربحية</div>
          </header>
          <table class="table" *ngIf="productSales().length > 0; else emptyProducts">
            <thead>
              <tr>
                <th>رمز SKU</th>
                <th>اسم المنتج</th>
                <th>القسم</th>
                <th>الكمية المباعة</th>
                <th>إجمالي المبيعات</th>
                <th>إجمالي تكلفة الشراء</th>
                <th>صافي الأرباح</th>
                <th>هامش الربح %</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let p of productSales()">
                <td><span class="kbd">{{ p.sku }}</span></td>
                <td><strong class="prod-name">{{ p.productName }}</strong></td>
                <td><span class="badge">{{ p.categoryName }}</span></td>
                <td style="font-weight: 700;">{{ p.quantitySold | number:'1.0-3' }}</td>
                <td dir="ltr">{{ p.revenue | number:'1.2-2' }} {{ store.store().currency }}</td>
                <td dir="ltr">{{ p.cost | number:'1.2-2' }} {{ store.store().currency }}</td>
                <td dir="ltr" class="text-success" style="font-weight: 800;">+{{ p.profit | number:'1.2-2' }} {{ store.store().currency }}</td>
                <td dir="ltr" style="font-weight: 700;">{{ getProfitMargin(p) | number:'1.0-1' }}%</td>
              </tr>
            </tbody>
          </table>
          <ng-template #emptyProducts>
            <div class="empty-state">
              <h3>لا توجد حركة مبيعات مسجلة لأي صنف</h3>
              <p class="text-muted">قم بتغيير نطاق التواريخ أو انتظر حتى تتم عمليات مبيعات الكاشير.</p>
            </div>
          </ng-template>
        </div>
      </div>

      <!-- TAB 3: CUSTOMER DEBT REPORT -->
      <div *ngIf="activeTab() === 'debt' && !loading()" class="tab-content animate-fade">
        <div class="card table-container">
          <header class="ch-head" style="padding:16px 20px 4px;">
            <div class="title">الديون المستحقة والذمم الآجلة على العملاء</div>
          </header>
          <table class="table" *ngIf="debtReport().length > 0; else emptyDebt">
            <thead>
              <tr>
                <th>اسم العميل</th>
                <th>رقم الهاتف</th>
                <th>إجمالي مشترياته التاريخية</th>
                <th>الدين المستحق والذمة المطلوبة</th>
                <th>الحالة المالية</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let d of debtReport()" class="danger-row">
                <td><strong>{{ d.fullName }}</strong></td>
                <td><span class="kbd" *ngIf="d.phone">{{ d.phone }}</span><span class="text-muted" *ngIf="!d.phone">—</span></td>
                <td dir="ltr">{{ d.totalPurchased | number:'1.2-2' }} {{ store.store().currency }}</td>
                <td dir="ltr" class="text-danger" style="font-weight: 800;">{{ d.creditBalance | number:'1.2-2' }} {{ store.store().currency }}</td>
                <td><span class="badge debt-bad">مطلوب سداد</span></td>
              </tr>
            </tbody>
          </table>
          <ng-template #emptyDebt>
            <div class="empty-state">
              <h3>لا توجد ديون مستحقة على أي عميل</h3>
              <p class="text-success" style="font-weight:700;">جميع حسابات العملاء مسواة بالكامل ولا توجد ذمم آجلة متأخرة!</p>
            </div>
          </ng-template>
        </div>
      </div>

      <!-- TAB 4: INVENTORY VALUE REPORT -->
      <div *ngIf="activeTab() === 'inventory' && !loading()" class="tab-content animate-fade">
        <div class="metrics-grid" *ngIf="inventoryReport() as inv">
          <div class="card stat">
            <span class="label">إجمالي السلع المتبعة بالمخزن</span>
            <span class="value" dir="ltr">{{ inv.totalItems }}</span>
            <span class="desc">أصناف فريدة مسجلة</span>
          </div>
          <div class="card stat">
            <span class="label">إجمالي قطع البضاعة المتوفرة</span>
            <span class="value" dir="ltr">{{ inv.totalQuantity | number:'1.0-3' }}</span>
            <span class="desc">حبة / كيلوجرام بالمستودعات</span>
          </div>
          <div class="card stat info">
            <span class="label">القيمة الكلية بسعر التكلفة</span>
            <span class="value" dir="ltr">{{ inv.totalCostValue | number:'1.2-2' }} <span class="cur">{{ store.store().currency }}</span></span>
            <span class="desc">رأس المال المجمد في البضاعة حاليا</span>
          </div>
          <div class="card stat text-success" style="border-color: rgba(34,197,94,.4);">
            <span class="label">القيمة المتوقعة عند البيع بالتجزئة</span>
            <span class="value text-success" dir="ltr">{{ inv.totalRetailValue | number:'1.2-2' }} <span class="cur">{{ store.store().currency }}</span></span>
            <span class="desc">الأرباح المتوقعة المحتملة: <strong class="text-success" dir="ltr">+{{ inv.projectedProfit | number:'1.2-2' }}</strong></span>
          </div>
        </div>

        <!-- Low stock alerts table in inventory report -->
        <div class="card table-container" style="margin-top:18px;" *ngIf="inventoryReport() as inv">
          <header class="ch-head" style="padding:16px 20px 4px;">
            <div class="title">الإنذارات الحرجة للمخزون (تحت الحد الأدنى)</div>
          </header>
          <table class="table" *ngIf="inv.lowStockItems.length > 0; else emptyLowStock">
            <thead>
              <tr>
                <th>رمز SKU</th>
                <th>اسم المنتج</th>
                <th>القسم</th>
                <th>الرصيد المتبقي</th>
                <th>الحد الأدنى للإنذار</th>
                <th>حالة الطلب</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let ls of inv.lowStockItems" [class.danger]="ls.stockQty <= 0">
                <td><span class="kbd">{{ ls.sku }}</span></td>
                <td><strong>{{ ls.nameAr }}</strong></td>
                <td><span class="badge">{{ ls.categoryName }}</span></td>
                <td style="font-weight: 800;" [class.text-danger]="ls.stockQty <= 0" [class.text-danger-soft]="ls.stockQty > 0">{{ ls.stockQty | number:'1.0-3' }}</td>
                <td>{{ ls.minStockQty }}</td>
                <td>
                  <span class="badge debt-bad" [class.out]="ls.stockQty <= 0">
                    {{ ls.stockQty <= 0 ? 'نفد تماماً' : 'منخفض جداً' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
          <ng-template #emptyLowStock>
            <div class="empty-state">
              <h3 class="text-success">المخزون ممتاز!</h3>
              <p class="text-muted">لا يوجد أي سلع وصلت للحد الأدنى من الطلب.</p>
            </div>
          </ng-template>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page { display: grid; gap: 18px; }
    .head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    h1 { margin: 0; font-size: 24px; font-weight: 800; color: #fff; }

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
    .date-inputs { display: flex; gap: 14px; flex-wrap: wrap; }
    .grp { display: grid; gap: 4px; }
    .grp label { font-size: 11px; font-weight: 700; color: var(--muted); }
    .grp .input { padding: 8px 12px; height: 38px; width: 150px; }

    .metrics-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px;
    }
    .stat { padding: 18px; display: grid; gap: 4px; }
    .stat .label { font-size: 12.5px; color: var(--muted); font-weight: 600; }
    .stat .value { font-size: 24px; font-weight: 800; color: #fff; font-variant-numeric: tabular-nums; }
    .stat .value .cur { font-size: 12px; color: var(--muted); }
    .stat .desc { font-size: 11.5px; color: var(--muted); }
    
    .stat.info { border-color: rgba(14,165,164,.4); }
    .stat.info .value { color: #6EE7E7; }

    .grid-2 { display: grid; grid-template-columns: 1fr 1.2fr; gap: 18px; }
    @media (max-width: 900px) { .grid-2 { grid-template-columns: 1fr; } }
    
    .breakdown { padding: 18px; }
    .breakdown .title, .trend .title { font-weight: 800; font-size: 15px; margin-bottom: 12px; color: #fff; }
    .b-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 10px; }
    .b-list li {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 12px; border: 1px solid var(--border); border-radius: 10px;
      background: rgba(14,24,48,.5); font-size: 13.5px;
    }
    .b-list .name { font-weight: 700; color: #fff; }
    .b-list .count { font-size: 11px; }
    .b-list .total { font-weight: 800; color: #86EFAC; font-variant-numeric: tabular-nums; }

    .trend { padding: 18px; display: flex; flex-direction: column; }
    .chart-wrapper { flex: 1; display: flex; align-items: center; justify-content: center; }
    .mini-chart { width: 100%; height: 160px; }
    .mini-chart text { fill: var(--muted); font-size: 9px; font-family: inherit; }

    .table-container { overflow-x: auto; padding: 0; }
    .table { width: 100%; border-collapse: collapse; text-align: right; font-size: 13.5px; }
    .table th {
      padding: 14px 18px; color: var(--muted); font-weight: 700;
      border-bottom: 1px solid var(--border); background: rgba(255,255,255,.01);
    }
    .table td { padding: 14px 18px; border-bottom: 1px solid var(--border); vertical-align: middle; }
    .table tbody tr:hover { background: rgba(255,255,255,.02); }
    .table tbody tr.danger-row { background: rgba(239,68,68,.02); }
    .table tbody tr.danger { background: rgba(239,68,68,.04); }

    .prod-name { color: #fff; }
    .badge.debt-bad { background: rgba(239,68,68,.16); color: #FCA5A5; font-weight: 800; }
    .badge.debt-bad.out { background: #7F1D1D; color: #FEE2E2; }
    .text-danger-soft { color: #FCD34D; }

    .loading-state { display: grid; place-items: center; padding: 120px 0; gap: 12px; }
    .spinner {
      width: 36px; height: 36px; border-radius: 50%;
      border: 3px solid rgba(255,255,255,.08); border-top-color: var(--primary);
      animation: spin .9s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .only-print { display: none; }

    /* Print styling rules */
    @media print {
      .no-print { display: none !important; }
      .only-print { display: block !important; }
      body { background: #fff !important; color: #000 !important; font-size: 12px; }
      .card { border: none !important; box-shadow: none !important; background: transparent !important; }
      .table th { border-bottom: 2px solid #000 !important; color: #000 !important; background: transparent !important; }
      .table td { border-bottom: 1px solid #ddd !important; color: #000 !important; }
      .stat { border: 1px solid #ddd !important; margin-bottom: 10px; }
      .stat .value { color: #000 !important; }
      .b-list li { border: 1px solid #ddd !important; background: transparent !important; }
      .b-list .name { color: #000 !important; }
      .b-list .total { color: #000 !important; }
      .trend { display: none !important; }
    }

    /* Animations */
    .animate-fade { animation: fade .25s ease both; }
    .animate-slide { animation: slide .3s ease both; }
    @keyframes fade { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slide { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class ReportsComponent implements OnInit {
  private api = inject(ReportsApi);
  protected store = inject(StoreService);
  private toast = inject(ToastService);

  activeTab = signal<'sales' | 'products' | 'debt' | 'inventory'>('sales');
  loading = signal(false);
  today = new Date();

  // Filters State
  startDate = '';
  endDate = '';

  // Tab Data Signals
  salesData = signal<SalesReport | null>(null);
  productSales = signal<ProductSalesReport[]>([]);
  debtReport = signal<CustomerDebtReport[]>([]);
  inventoryReport = signal<InventoryStatusReport | null>(null);

  ngOnInit() {
    // Set default date range to last 30 days
    const today = new Date();
    const past = new Date();
    past.setDate(today.getDate() - 30);
    
    this.startDate = past.toISOString().split('T')[0];
    this.endDate = today.toISOString().split('T')[0];

    this.loadReport();
  }

  setTab(tab: 'sales' | 'products' | 'debt' | 'inventory') {
    this.activeTab.set(tab);
    this.loadReport();
  }

  loadReport() {
    this.loading.set(true);
    const tab = this.activeTab();

    if (tab === 'sales') {
      this.api.getSalesReport(this.startDate, this.endDate).subscribe({
        next: data => { this.salesData.set(data); this.loading.set(false); },
        error: () => { this.toast.error('فشل في جلب تقرير المبيعات'); this.loading.set(false); }
      });
    } else if (tab === 'products') {
      this.api.getProductSalesReport(this.startDate, this.endDate).subscribe({
        next: data => { this.productSales.set(data); this.loading.set(false); },
        error: () => { this.toast.error('فشل في جلب تقرير الأصناف'); this.loading.set(false); }
      });
    } else if (tab === 'debt') {
      this.api.getCustomerDebtReport().subscribe({
        next: data => { this.debtReport.set(data); this.loading.set(false); },
        error: () => { this.toast.error('فشل في جلب تقرير الديون'); this.loading.set(false); }
      });
    } else if (tab === 'inventory') {
      this.api.getInventoryReport().subscribe({
        next: data => { this.inventoryReport.set(data); this.loading.set(false); },
        error: () => { this.toast.error('فشل في جلب تقرير المخازن'); this.loading.set(false); }
      });
    }
  }

  onDateChange() {
    this.loadReport();
  }

  getProfitMargin(p: ProductSalesReport): number {
    if (p.revenue === 0) return 0;
    return (p.profit / p.revenue) * 100;
  }

  getPayMethodName(method: number): string {
    switch (method) {
      case 1: return 'كاش / نقدي';
      case 2: return 'شبكة / بطاقة مدى';
      case 3: return 'آجل / ذمة عميل';
      default: return 'أخرى';
    }
  }

  // Sales Trend Points computation
  salesPoints = computed(() => {
    const data = this.salesData();
    if (!data || data.dailySales.length === 0) return [];
    
    const sales = data.dailySales;
    const maxVal = Math.max(1, ...sales.map(s => s.total));
    const padX = 30;
    const padY = 20;
    const w = 500 - padX * 2;
    const h = 160 - padY * 2 - 12;
    const step = w / Math.max(1, sales.length - 1);
    
    return sales.map((s, i) => ({
      x: padX + step * i,
      y: padY + (h - (s.total / maxVal) * h),
      date: new Date(s.date),
      total: s.total
    }));
  });

  salesLinePath = computed(() => {
    const pts = this.salesPoints();
    if (pts.length === 0) return '';
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  });

  printReport() {
    window.print();
  }

  // Export to CSV directly in JS
  exportCSV() {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // Include BOM for proper Excel Arabic display
    const tab = this.activeTab();

    if (tab === 'sales') {
      const data = this.salesData();
      if (!data) return;
      csvContent += "المؤشر,القيمة\r\n";
      csvContent += `إجمالي المبيعات,${data.totalSales}\r\n`;
      csvContent += `عدد الفواتير,${data.totalInvoices}\r\n`;
      csvContent += `إجمالي الخصومات,${data.totalDiscount}\r\n`;
      csvContent += `إجمالي الضريبة المحصلة,${data.totalTax}\r\n`;
      csvContent += `صافي الدخل,${data.netRevenue}\r\n`;
      csvContent += `متوسط السلة,${data.averageBasket}\r\n`;
      
      csvContent += "\r\nطريقة الدفع,عدد الفواتير,الإجمالي\r\n";
      data.paymentMethods.forEach(pm => {
        csvContent += `${this.getPayMethodName(pm.method)},${pm.count},${pm.total}\r\n`;
      });
    } else if (tab === 'products') {
      csvContent += "SKU,اسم المنتج,القسم,الكمية المباعة,إجمالي المبيعات,التكلفة,صافي الربح,هامش الربح\r\n";
      this.productSales().forEach(p => {
        const margin = this.getProfitMargin(p).toFixed(1) + "%";
        csvContent += `"${p.sku}","${p.productName}","${p.categoryName}",${p.quantitySold},${p.revenue},${p.cost},${p.profit},"${margin}"\r\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `report_${tab}_${this.startDate}_to_${this.endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
