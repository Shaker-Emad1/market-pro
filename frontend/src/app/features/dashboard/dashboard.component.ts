import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardApi, DashboardSummary } from '../../core/dashboard.api';
import { StoreService } from '../../core/store.service';

/**
 * Live dashboard. Pulls a single rollup endpoint; renders KPI cards, a hand-drawn
 * SVG sparkline (no chart library, ~0kb cost) for the last 7 days, a top
 * products list and a low-stock warning list.
 */
@Component({
  selector: 'mp-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="page" *ngIf="data() as d; else loadingTpl">
    <header class="head">
      <div>
        <h1>لوحة التحكم</h1>
        <p class="text-muted">نظرة عامة على المبيعات والمخزون والأداء.</p>
      </div>
      <button class="btn" (click)="refresh()" [disabled]="loading()">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-3.5-7.1"/><path d="M21 4v6h-6"/></svg>
        تحديث
      </button>
    </header>

    <div class="kpis">
      <div class="kpi card">
        <div class="label">مبيعات اليوم</div>
        <div class="value" dir="ltr">
          {{ d.todaySales | number:'1.2-2' }}
          <span>{{ store.store().currency }}</span>
        </div>
        <div class="bar"><div class="fill" [style.width.%]="100"></div></div>
      </div>
      <div class="kpi card">
        <div class="label">عدد الفواتير</div>
        <div class="value" dir="ltr">{{ d.todayInvoices }}</div>
        <div class="delta">متوسط السلة <span dir="ltr">{{ d.averageBasket | number:'1.2-2' }}</span></div>
      </div>
      <div class="kpi card warn" [class.danger]="d.lowStockCount > 0">
        <div class="label">منتجات منخفضة المخزون</div>
        <div class="value" dir="ltr">{{ d.lowStockCount }}</div>
        <div class="delta">يحتاج إعادة طلب</div>
      </div>
      <div class="kpi card">
        <div class="label">منتجات نشطة</div>
        <div class="value" dir="ltr">{{ d.activeProducts }}</div>
        <div class="delta">في المخزون</div>
      </div>
    </div>

    <div class="grid-2">
      <section class="card sales-chart">
        <header class="ch-head">
          <div>
            <div class="title">مبيعات آخر 7 أيام</div>
            <div class="text-muted sub">إجمالي يومي</div>
          </div>
          <div class="badge" dir="ltr">{{ totalWeek() | number:'1.2-2' }} {{ store.store().currency }}</div>
        </header>
        <svg [attr.viewBox]="'0 0 ' + chartW + ' ' + chartH" class="chart">
          <defs>
            <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#0EA5A4" stop-opacity=".55" />
              <stop offset="100%" stop-color="#0EA5A4" stop-opacity="0" />
            </linearGradient>
          </defs>
          <!-- grid -->
          <g class="grid">
            <line *ngFor="let g of [0.25, 0.5, 0.75]"
                  [attr.x1]="0" [attr.x2]="chartW"
                  [attr.y1]="chartH * g" [attr.y2]="chartH * g" />
          </g>
          <!-- area -->
          <path [attr.d]="areaPath()" fill="url(#area)" />
          <!-- line -->
          <path [attr.d]="linePath()" fill="none" stroke="#0EA5A4" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />
          <!-- dots -->
          <g>
            <circle *ngFor="let p of points()"
                    [attr.cx]="p.x" [attr.cy]="p.y" r="4"
                    fill="#0E1830" stroke="#0EA5A4" stroke-width="2.2" />
          </g>
          <!-- labels -->
          <g class="labels">
            <text *ngFor="let p of points()"
                  [attr.x]="p.x" [attr.y]="chartH - 4"
                  text-anchor="middle">{{ p.label }}</text>
          </g>
        </svg>
      </section>

      <section class="card top-list">
        <header class="ch-head">
          <div class="title">الأكثر مبيعًا (30 يوم)</div>
        </header>
        <ul class="t-list" *ngIf="d.topProducts.length; else emptyTop">
          <li *ngFor="let t of d.topProducts; let i = index">
            <span class="rank">{{ i + 1 }}</span>
            <span class="t-name">{{ t.name }}</span>
            <span class="t-qty text-muted" dir="ltr">{{ t.quantity | number:'1.0-2' }}</span>
            <span class="t-rev" dir="ltr">{{ t.revenue | number:'1.2-2' }}</span>
          </li>
        </ul>
        <ng-template #emptyTop>
          <p class="text-muted" style="padding: 12px 0;">لا توجد بيانات بعد</p>
        </ng-template>
      </section>
    </div>

    <section class="card low-stock" *ngIf="d.lowStockItems.length">
      <header class="ch-head">
        <div>
          <div class="title">تنبيهات المخزون</div>
          <div class="text-muted sub">منتجات وصلت للحد الأدنى</div>
        </div>
        <span class="badge danger">{{ d.lowStockItems.length }}</span>
      </header>
      <ul class="ls">
        <li *ngFor="let it of d.lowStockItems">
          <div class="ls-name">{{ it.name }}</div>
          <div class="ls-sku text-muted" dir="ltr">{{ it.sku }}</div>
          <div class="ls-qty" dir="ltr">{{ it.stockQty | number:'1.0-2' }}</div>
        </li>
      </ul>
    </section>
  </div>

  <ng-template #loadingTpl>
    <div class="loading-state">
      <div class="spinner"></div>
      <p class="text-muted">جارٍ تحميل البيانات…</p>
    </div>
  </ng-template>
  `,
  styles: [`
    .page { display: grid; gap: 18px; }
    .head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    h1 { margin: 0; font-size: 24px; }
    .head p { margin: 4px 0 0; }

    .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; }
    .kpi { padding: 18px 18px 16px; position: relative; overflow: hidden; }
    .kpi::after {
      content: ''; position: absolute; inset: 0;
      background: radial-gradient(220px 110px at 100% 0%, rgba(14,165,164,.12), transparent 70%);
      pointer-events: none;
    }
    .kpi.warn::after { background: radial-gradient(220px 110px at 100% 0%, rgba(245,158,11,.18), transparent 70%); }
    .kpi.danger::after { background: radial-gradient(220px 110px at 100% 0%, rgba(239,68,68,.18), transparent 70%); }
    .label { color: var(--muted); font-size: 13px; font-weight: 600; }
    .value { font-size: 26px; font-weight: 800; margin-top: 6px; font-variant-numeric: tabular-nums; }
    .value span { font-size: 14px; color: var(--muted); margin-inline-start: 6px; }
    .delta { font-size: 12px; margin-top: 8px; color: var(--muted); }
    .delta span { color: var(--foreground); font-weight: 700; }
    .bar {
      height: 4px; border-radius: 999px; background: rgba(255,255,255,.06);
      margin-top: 10px; overflow: hidden;
    }
    .bar .fill {
      height: 100%; background: linear-gradient(90deg, #0EA5A4, #06D6D5);
      transform-origin: left; animation: fill-grow .8s ease both;
    }
    @keyframes fill-grow { from { transform: scaleX(0);} to { transform: scaleX(1); } }

    .grid-2 { display: grid; grid-template-columns: 1.6fr 1fr; gap: 14px; }
    @media (max-width: 1100px) { .grid-2 { grid-template-columns: 1fr; } }

    .card { padding: 18px; }
    .ch-head {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 8px;
    }
    .ch-head .title { font-weight: 800; font-size: 15px; }
    .ch-head .sub { font-size: 12px; }
    .badge.danger { background: rgba(239,68,68,.18); color: #FCA5A5; }

    .chart { width: 100%; height: 220px; display: block; }
    .chart .grid line { stroke: rgba(255,255,255,.05); stroke-width: 1; }
    .chart .labels text { fill: var(--muted); font-size: 11px; }

    .t-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
    .t-list li {
      display: grid; grid-template-columns: 28px 1fr auto auto;
      gap: 10px; align-items: center;
      padding: 10px; border: 1px solid var(--border); border-radius: 12px;
      background: rgba(14,24,48,.7);
    }
    .rank {
      width: 24px; height: 24px; border-radius: 8px;
      display: grid; place-items: center; font-weight: 800; font-size: 12px;
      background: rgba(14,165,164,.18); color: #6EE7E7;
    }
    .t-name { font-weight: 700; font-size: 13px; }
    .t-qty { font-size: 12px; }
    .t-rev { font-weight: 700; font-variant-numeric: tabular-nums; color: #B7F4F2; }

    .low-stock .ls { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
    .ls li {
      display: grid; grid-template-columns: 1fr auto auto;
      gap: 12px; align-items: center;
      padding: 10px 12px;
      border: 1px solid rgba(245,158,11,.25);
      background: rgba(245,158,11,.06);
      border-radius: 12px;
    }
    .ls-name { font-weight: 700; }
    .ls-sku { font-size: 12px; }
    .ls-qty { font-weight: 800; color: var(--accent); font-variant-numeric: tabular-nums; }

    .loading-state { display: grid; place-items: center; padding: 80px 0; gap: 12px; }
    .spinner {
      width: 32px; height: 32px; border-radius: 50%;
      border: 3px solid rgba(255,255,255,.08); border-top-color: var(--primary);
      animation: spin .9s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class DashboardComponent implements OnInit {
  private api = inject(DashboardApi);
  protected store = inject(StoreService);

  data = signal<DashboardSummary | null>(null);
  loading = signal(false);

  readonly chartW = 600;
  readonly chartH = 220;

  totalWeek = computed(() =>
    (this.data()?.last7Days ?? []).reduce((s, p) => s + p.total, 0)
  );

  points = computed(() => {
    const d = this.data();
    if (!d || d.last7Days.length === 0) return [];
    const max = Math.max(1, ...d.last7Days.map(p => p.total));
    const padX = 24;
    const padY = 18;
    const w = this.chartW - padX * 2;
    const h = this.chartH - padY * 2 - 16;
    const step = w / Math.max(1, d.last7Days.length - 1);
    return d.last7Days.map((p, i) => ({
      x: padX + step * i,
      y: padY + (h - (p.total / max) * h),
      label: p.label,
      total: p.total
    }));
  });

  linePath = computed(() => {
    const pts = this.points();
    if (pts.length === 0) return '';
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  });

  areaPath = computed(() => {
    const pts = this.points();
    if (pts.length === 0) return '';
    const top = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const last = pts[pts.length - 1];
    const first = pts[0];
    const baseY = this.chartH - 18 - 16;
    return `${top} L${last.x.toFixed(1)},${baseY} L${first.x.toFixed(1)},${baseY} Z`;
  });

  ngOnInit() { this.refresh(); }

  refresh() {
    this.loading.set(true);
    this.api.summary().subscribe({
      next: d => { this.data.set(d); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }
}
