import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CustomersApi, Customer, CustomerInvoice } from '../../core/customers.api';
import { ToastService } from '../../core/toast.service';
import { StoreService } from '../../core/store.service';

@Component({
  selector: 'mp-customers',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="page">
      <header class="head animate-fade">
        <div>
          <h1>إدارة حسابات العملاء</h1>
          <p class="text-muted">سجل المبيعات الآجلة، دفعات السداد، وتتبع الولاء والمدفوعات لكل عميل.</p>
        </div>
        <button class="btn primary" (click)="openAddModal()">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          تسجيل عميل جديد
        </button>
      </header>

      <!-- Search & Filters -->
      <section class="card filters animate-slide">
        <div class="search-box">
          <input type="text" class="input" placeholder="ابحث باسم العميل أو رقم الهاتف..." [value]="searchQuery()" (input)="onSearch($event)">
        </div>
        <div class="filter-actions">
          <label class="checkbox-label">
            <input type="checkbox" [checked]="hasDebtOnly()" (change)="toggleHasDebt($event)">
            <span>العملاء المدينين فقط</span>
          </label>
        </div>
      </section>

      <!-- Customers Table -->
      <div class="card table-container animate-fade" *ngIf="!loading(); else loadingTpl">
        <table class="table" *ngIf="customers().length > 0; else emptyState">
          <thead>
            <tr>
              <th>اسم العميل</th>
              <th>رقم الهاتف / الإيميل</th>
              <th>الدين المستحق</th>
              <th>نقاط الولاء</th>
              <th>إجمالي الفواتير</th>
              <th>إجمالي المبيعات</th>
              <th>ملاحظات</th>
              <th style="text-align: center;">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let c of customers()" [class.danger]="c.creditBalance > 0">
              <td>
                <div class="c-cell">
                  <div class="c-avatar">{{ c.fullName[0] }}</div>
                  <div>
                    <div class="c-name">{{ c.fullName }}</div>
                  </div>
                </div>
              </td>
              <td>
                <div class="phone-cell">
                  <span class="kbd" *ngIf="c.phone">{{ c.phone }}</span>
                  <span class="email text-muted" *ngIf="c.email">{{ c.email }}</span>
                  <span class="text-muted" *ngIf="!c.phone && !c.email">—</span>
                </div>
              </td>
              <td>
                <div class="debt-badge" [class.active]="c.creditBalance > 0">
                  <span class="val" dir="ltr">{{ c.creditBalance | number:'1.2-2' }}</span>
                  <span class="curr"> {{ store.store().currency }}</span>
                </div>
              </td>
              <td>
                <span class="badge points">{{ c.loyaltyPoints | number:'1.0-1' }} نقطة</span>
              </td>
              <td>
                <span class="text-muted">{{ c.totalSalesCount }} فاتورة</span>
              </td>
              <td dir="ltr" style="font-weight: 700;">
                {{ c.totalSalesAmount | number:'1.2-2' }} {{ store.store().currency }}
              </td>
              <td>
                <span class="notes-preview text-muted" [title]="c.notes || ''">{{ c.notes || '—' }}</span>
              </td>
              <td>
                <div class="actions">
                  <button class="btn sm" (click)="openDetailsModal(c)" title="عرض التفاصيل والفواتير">التفاصيل</button>
                  <button class="btn sm accent" *ngIf="c.creditBalance > 0" (click)="openPayDebtModal(c)" title="سداد الدين">سداد دفعة</button>
                  <button class="btn sm ghost" (click)="openEditModal(c)" title="تعديل">
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z"></path></svg>
                  </button>
                  <button class="btn sm ghost danger" (click)="confirmDelete(c)" title="حذف">
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Empty state -->
        <ng-template #emptyState>
          <div class="empty-state">
            <h3>لا يوجد عملاء مطابقين للبحث</h3>
            <p class="text-muted">جرب البحث باسم أو رقم هاتف آخر.</p>
          </div>
        </ng-template>

        <!-- Pagination -->
        <footer class="pagination" *ngIf="totalCount() > 0">
          <span>يتم عرض {{ customers().length }} من أصل {{ totalCount() }} عميل</span>
          <div class="pages">
            <button class="btn sm" [disabled]="page() === 1" (click)="setPage(page() - 1)">السابق</button>
            <span>صفحة {{ page() }} من {{ totalPages() }}</span>
            <button class="btn sm" [disabled]="page() >= totalPages()" (click)="setPage(page() + 1)">التالي</button>
          </div>
        </footer>
      </div>

      <!-- Loading skeleton -->
      <ng-template #loadingTpl>
        <div class="loading-container">
          <div class="skeleton-row" *ngFor="let s of [1,2,3]"></div>
        </div>
      </ng-template>

      <!-- Add/Edit Customer Modal -->
      <div class="modal-backdrop" *ngIf="showModal()">
        <div class="modal card animate-pop alert">
          <header class="modal-header">
            <h2>{{ isEditMode() ? 'تعديل بيانات عميل' : 'تسجيل عميل جديد' }}</h2>
            <button class="btn ghost close" (click)="closeModal()">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </header>

          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="modal-body">
            <div class="form-grid" style="grid-template-columns: 1fr;">
              <div class="form-group">
                <label>اسم العميل بالكامل *</label>
                <input type="text" class="input" formControlName="fullName" placeholder="مثال: أحمد عبد الله الودعاني">
              </div>

              <div class="form-group">
                <label>رقم الجوال / الهاتف</label>
                <input type="text" class="input" formControlName="phone" placeholder="مثال: 05XXXXXXXX">
              </div>

              <div class="form-group">
                <label>البريد الإلكتروني</label>
                <input type="email" class="input" formControlName="email" placeholder="customer@example.com">
              </div>

              <div class="form-group" *ngIf="isEditMode()">
                <label>رصيد المبيعات الآجلة (الدين)</label>
                <input type="number" step="0.01" class="input" formControlName="creditBalance">
              </div>

              <div class="form-group" *ngIf="isEditMode()">
                <label>نقاط الولاء</label>
                <input type="number" step="0.1" class="input" formControlName="loyaltyPoints">
              </div>

              <div class="form-group">
                <label>ملاحظات إضافية</label>
                <textarea class="input" formControlName="notes" rows="2" placeholder="ملاحظات ائتمانية أو تذكير خاص بالعميل..."></textarea>
              </div>
            </div>

            <footer class="modal-footer">
              <button type="button" class="btn ghost" (click)="closeModal()">إلغاء</button>
              <button type="submit" class="btn primary" [disabled]="form.invalid || submitting()">حفظ العميل</button>
            </footer>
          </form>
        </div>
      </div>

      <!-- Pay Debt Modal (سداد الدين) -->
      <div class="modal-backdrop" *ngIf="showPayModal()">
        <div class="modal card animate-pop alert">
          <header class="modal-header">
            <h2>سداد دفعة من الحساب الآجل</h2>
            <button class="btn ghost close" (click)="closePayModal()">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </header>
          <form [formGroup]="payForm" (ngSubmit)="onPaySubmit()" class="modal-body">
            <div class="text-center" style="margin-bottom: 16px;">
              <h3>{{ selectedCustomer()?.fullName }}</h3>
              <p class="text-muted">إجمالي الدين الحالي: <strong class="text-danger">{{ selectedCustomer()?.creditBalance | number:'1.2-2' }} {{ store.store().currency }}</strong></p>
            </div>

            <div class="form-grid" style="grid-template-columns: 1fr;">
              <div class="form-group">
                <label>المبلغ المدفوع كاش *</label>
                <input type="number" step="0.01" class="input" formControlName="amount">
              </div>

              <div class="form-group">
                <label>رقم الإيصال أو ملاحظة السداد</label>
                <input type="text" class="input" formControlName="notes" placeholder="مثال: دفعة يدوية كاش، إيداع بنكي...">
              </div>
            </div>

            <footer class="modal-footer">
              <button type="button" class="btn ghost" (click)="closePayModal()">إلغاء</button>
              <button type="submit" class="btn primary" [disabled]="payForm.invalid || submitting()">تأكيد سداد الدفعة</button>
            </footer>
          </form>
        </div>
      </div>

      <!-- Customer Details & Invoices History Modal -->
      <div class="modal-backdrop" *ngIf="showDetailsModal()">
        <div class="modal card animate-pop">
          <header class="modal-header">
            <h2>تفاصيل ملف العميل وتاريخ العمليات</h2>
            <button class="btn ghost close" (click)="closeDetailsModal()">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </header>

          <div class="modal-body" *ngIf="selectedCustomer() as c">
            <!-- Client Cards Summary -->
            <div class="details-summary">
              <div>
                <h3>{{ c.fullName }}</h3>
                <span class="text-muted" *ngIf="c.phone">جوال: {{ c.phone }}</span>
                <span class="text-muted" *ngIf="c.email"><br>إيميل: {{ c.email }}</span>
              </div>
              <div class="metrics">
                <div class="met-card">
                  <span class="lbl">رصيد الآجل</span>
                  <span class="val danger" dir="ltr">{{ c.creditBalance | number:'1.2-2' }}</span>
                </div>
                <div class="met-card">
                  <span class="lbl">مشتريات مسجلة</span>
                  <span class="val info" dir="ltr">{{ c.totalSalesAmount | number:'1.2-2' }}</span>
                </div>
              </div>
            </div>

            <!-- Notes Section -->
            <div class="notes-log card" *ngIf="c.notes">
              <strong>سجل الملاحظات والعمليات:</strong>
              <p style="white-space: pre-line; font-size:12.5px; margin-top:6px;" class="text-muted">{{ c.notes }}</p>
            </div>

            <!-- Purchase History Invoices -->
            <div class="history-title">
              <h4>سجل الفواتير والمشتريات</h4>
            </div>

            <div class="table-container" *ngIf="invoices().length > 0; else emptyInvoices">
              <table class="table min">
                <thead>
                  <tr>
                    <th>رقم الفاتورة</th>
                    <th>التاريخ</th>
                    <th>إجمالي الفاتورة</th>
                    <th>المبلغ المدفوع</th>
                    <th>طريقة الدفع</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let inv of invoices()">
                    <td><span class="kbd">{{ inv.invoiceNumber }}</span></td>
                    <td class="text-muted">{{ inv.saleDate | date:'yyyy/MM/dd HH:mm' }}</td>
                    <td dir="ltr" style="font-weight: 700;">{{ inv.total | number:'1.2-2' }} {{ store.store().currency }}</td>
                    <td dir="ltr">{{ inv.paidAmount | number:'1.2-2' }} {{ store.store().currency }}</td>
                    <td>
                      <span class="badge" [class.card-p]="inv.paymentMethod === 2" [class.credit-p]="inv.paymentMethod === 3">
                        {{ getPayMethodName(inv.paymentMethod) }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>

              <footer class="pagination compact">
                <div class="pages">
                  <button class="btn sm" [disabled]="invPage() === 1" (click)="setInvPage(invPage() - 1)">السابق</button>
                  <span>صفحة {{ invPage() }} من {{ invTotalPages() }}</span>
                  <button class="btn sm" [disabled]="invPage() >= invTotalPages()" (click)="setInvPage(invPage() + 1)">التالي</button>
                </div>
              </footer>
            </div>

            <ng-template #emptyInvoices>
              <p class="text-muted text-center" style="padding: 24px 0;">لا يوجد مشتريات أو فواتير مسجلة لهذا العميل بعد.</p>
            </ng-template>
          </div>
        </div>
      </div>

      <!-- Delete Confirmation Dialog -->
      <div class="modal-backdrop delete" *ngIf="showDeleteConfirm()">
        <div class="modal card alert animate-pop">
          <header class="modal-header danger">
            <h2>تأكيد حذف عميل</h2>
          </header>
          <div class="modal-body text-center">
            <p>هل أنت متأكد من رغبتك في حذف العميل <strong>{{ selectedCustomer()?.fullName }}</strong>؟</p>
            <p class="text-danger sub-warn">هذا الإجراء سيقوم بإخفاء العميل تماماً ولكنه سيحافظ على مبيعاته وفواتيره للأمان المالي وسجل المخازن.</p>
          </div>
          <footer class="modal-footer">
            <button type="button" class="btn ghost" (click)="closeDeleteConfirm()">إلغاء</button>
            <button type="button" class="btn danger" (click)="deleteCustomer()">نعم، احذف العميل</button>
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
    .filter-actions { display: flex; align-items: center; gap: 16px; }
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
    
    .table tr.danger { background: rgba(239,68,68,.02); }
    
    .c-cell { display: flex; align-items: center; gap: 12px; }
    .c-avatar {
      width: 36px; height: 36px; border-radius: 50%;
      background: rgba(14,165,164,.18); color: #6EE7E7;
      display: grid; place-items: center; font-weight: 800; font-size: 16px;
    }
    .c-name { font-weight: 700; color: #fff; }

    .phone-cell { display: grid; gap: 2px; }
    .phone-cell .kbd { font-size: 11px; width: fit-content; }
    .phone-cell .email { font-size: 11px; }

    .debt-badge {
      display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px;
      border-radius: 8px; background: rgba(255,255,255,.04); color: var(--muted);
      font-weight: 800; font-variant-numeric: tabular-nums;
    }
    .debt-badge.active { background: rgba(239,68,68,.16); color: #FCA5A5; }
    .debt-badge .curr { font-size: 11px; font-weight: 400; }

    .badge.points { background: rgba(245,158,11,.15); color: #FCD34D; }

    .notes-preview {
      display: block; max-width: 140px; overflow: hidden;
      text-overflow: ellipsis; white-space: nowrap; font-size: 12px;
    }

    .actions { display: flex; align-items: center; justify-content: center; gap: 4px; }

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
    .modal-header.danger h2 { color: #FCA5A5; }
    .modal-body { padding: 20px; overflow-y: auto; }
    .form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
    .form-group { display: grid; gap: 6px; }
    .form-group label { font-size: 12.5px; font-weight: 600; color: var(--muted); }
    .modal-footer {
      display: flex; align-items: center; justify-content: flex-end; gap: 12px;
      padding: 14px 20px; border-top: 1px solid var(--border);
      background: rgba(255,255,255,.01);
    }
    .text-center { text-align: center; }

    /* Details styling */
    .details-summary {
      display: flex; align-items: center; justify-content: space-between;
      gap: 16px; margin-bottom: 18px; border-bottom: 1px solid var(--border);
      padding-bottom: 16px;
    }
    .details-summary h3 { margin: 0; font-size: 20px; color: #fff; }
    .metrics { display: flex; gap: 12px; }
    .met-card {
      padding: 10px 14px; border-radius: 10px; background: var(--surface-2);
      border: 1px solid var(--border); text-align: center; display: grid; gap: 4px;
    }
    .met-card .lbl { font-size: 11px; color: var(--muted); }
    .met-card .val { font-size: 16px; font-weight: 800; }
    .met-card .val.danger { color: #FCA5A5; }
    .met-card .val.info { color: #6EE7E7; }

    .notes-log { padding: 12px 16px; background: rgba(14,165,164,.03); border-color: rgba(14,165,164,.18); margin-bottom: 20px; }
    .history-title { margin: 18px 0 10px; border-bottom: 1px solid var(--border); padding-bottom: 8px; }
    .history-title h4 { margin: 0; font-size: 15px; font-weight: 800; color: #fff; }

    .table.min th { padding: 8px 12px; font-size: 12px; }
    .table.min td { padding: 8px 12px; font-size: 12.5px; }
    
    .badge.card-p { background: rgba(147,51,234,.15); color: #D8B4FE; }
    .badge.credit-p { background: rgba(239,68,68,.15); color: #FCA5A5; }

    .pagination.compact { border-top: none; padding: 10px 0 0; justify-content: flex-end; }

    /* Animations */
    .animate-fade { animation: fade .25s ease both; }
    .animate-slide { animation: slide .3s ease both; }
    .animate-pop { animation: pop .22s cubic-bezier(.34,1.56,.64,1) both; }
    @keyframes fade { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slide { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes pop { from { opacity: 0; transform: scale(.94); } to { opacity: 1; transform: scale(1); } }
  `]
})
export class CustomersComponent implements OnInit {
  private api = inject(CustomersApi);
  protected store = inject(StoreService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);

  customers = signal<Customer[]>([]);
  totalCount = signal(0);
  loading = signal(false);
  submitting = signal(false);

  // Filters State
  searchQuery = signal('');
  hasDebtOnly = signal(false);
  page = signal(1);
  pageSize = 10;

  // Modals state
  showModal = signal(false);
  isEditMode = signal(false);
  showPayModal = signal(false);
  showDetailsModal = signal(false);
  showDeleteConfirm = signal(false);
  selectedCustomer = signal<Customer | null>(null);

  // Purchase/Invoice history sub-modal state
  invoices = signal<CustomerInvoice[]>([]);
  invTotal = signal(0);
  invPage = signal(1);
  invPageSize = 5;

  form!: FormGroup;
  payForm!: FormGroup;

  ngOnInit() {
    this.initForms();
    this.loadCustomers();
  }

  initForms() {
    this.form = this.fb.group({
      fullName: ['', [Validators.required, Validators.maxLength(200)]],
      phone: [''],
      email: [''],
      creditBalance: [0, Validators.min(0)],
      loyaltyPoints: [0, Validators.min(0)],
      notes: ['']
    });

    this.payForm = this.fb.group({
      amount: [0, [Validators.required, Validators.min(0.01)]],
      notes: ['']
    });
  }

  loadCustomers() {
    this.loading.set(true);
    this.api.getCustomers({
      search: this.searchQuery(),
      hasDebt: this.hasDebtOnly(),
      page: this.page(),
      pageSize: this.pageSize
    }).subscribe({
      next: res => {
        this.customers.set(res.items);
        this.totalCount.set(res.totalCount);
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('فشل في جلب ملفات العملاء');
        this.loading.set(false);
      }
    });
  }

  onSearch(e: any) {
    this.searchQuery.set(e.target.value);
    this.page.set(1);
    this.loadCustomers();
  }

  toggleHasDebt(e: any) {
    this.hasDebtOnly.set(e.target.checked);
    this.page.set(1);
    this.loadCustomers();
  }

  setPage(p: number) {
    this.page.set(p);
    this.loadCustomers();
  }

  totalPages(): number {
    return Math.ceil(this.totalCount() / this.pageSize);
  }

  // Add/Edit modal actions
  openAddModal() {
    this.isEditMode.set(false);
    this.form.reset({
      creditBalance: 0,
      loyaltyPoints: 0
    });
    this.showModal.set(true);
  }

  openEditModal(c: Customer) {
    this.isEditMode.set(true);
    this.selectedCustomer.set(c);
    this.form.patchValue({
      fullName: c.fullName,
      phone: c.phone,
      email: c.email,
      creditBalance: c.creditBalance,
      loyaltyPoints: c.loyaltyPoints,
      notes: c.notes
    });
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }

  onSubmit() {
    if (this.form.invalid) return;

    this.submitting.set(true);
    const val = this.form.value;

    if (this.isEditMode()) {
      const id = this.selectedCustomer()!.id;
      this.api.update(id, val).subscribe({
        next: () => {
          this.toast.success('تم تحديث ملف العميل بنجاح');
          this.showModal.set(false);
          this.submitting.set(false);
          this.loadCustomers();
        },
        error: err => {
          const msg = err.error?.error || 'فشل تحديث العميل';
          this.toast.error(msg);
          this.submitting.set(false);
        }
      });
    } else {
      this.api.create(val).subscribe({
        next: () => {
          this.toast.success('تم تسجيل العميل الجديد بنجاح');
          this.showModal.set(false);
          this.submitting.set(false);
          this.loadCustomers();
        },
        error: err => {
          const msg = err.error?.error || 'فشل تسجيل العميل';
          this.toast.error(msg);
          this.submitting.set(false);
        }
      });
    }
  }

  // Delete actions
  confirmDelete(c: Customer) {
    this.selectedCustomer.set(c);
    this.showDeleteConfirm.set(true);
  }

  closeDeleteConfirm() {
    this.showDeleteConfirm.set(false);
  }

  deleteCustomer() {
    const id = this.selectedCustomer()!.id;
    this.api.delete(id).subscribe({
      next: () => {
        this.toast.success('تم حذف ملف العميل بنجاح');
        this.showDeleteConfirm.set(false);
        this.loadCustomers();
      },
      error: () => this.toast.error('فشل في حذف العميل')
    });
  }

  // Pay Debt Modal Actions
  openPayDebtModal(c: Customer) {
    this.selectedCustomer.set(c);
    this.payForm.reset({
      amount: c.creditBalance,
      notes: ''
    });
    this.showPayModal.set(true);
  }

  closePayModal() {
    this.showPayModal.set(false);
  }

  onPaySubmit() {
    if (this.payForm.invalid) return;

    const val = this.payForm.value;
    const c = this.selectedCustomer()!;
    if (val.amount > c.creditBalance) {
      this.toast.warn('القيمة المدفوعة أكبر من الدين المطلوب سداده!');
      return;
    }

    this.submitting.set(true);
    this.api.payDebt(c.id, val.amount, val.notes).subscribe({
      next: () => {
        this.toast.success('تم تسجيل سداد دفعة الدين بنجاح');
        this.showPayModal.set(false);
        this.submitting.set(false);
        this.loadCustomers();
      },
      error: err => {
        const msg = err.error?.error || 'فشل عملية السداد';
        this.toast.error(msg);
        this.submitting.set(false);
      }
    });
  }

  // Details Modal & Purchase History Actions
  openDetailsModal(c: Customer) {
    this.selectedCustomer.set(c);
    this.invPage.set(1);
    this.showDetailsModal.set(true);
    this.loadInvoices();
  }

  closeDetailsModal() {
    this.showDetailsModal.set(false);
  }

  loadInvoices() {
    const c = this.selectedCustomer()!;
    this.api.getInvoices(c.id, this.invPage(), this.invPageSize).subscribe({
      next: res => {
        this.invoices.set(res.items);
        this.invTotal.set(res.totalCount);
      },
      error: () => this.toast.error('فشل تحميل تاريخ فواتير المشتريات')
    });
  }

  setInvPage(p: number) {
    this.invPage.set(p);
    this.loadInvoices();
  }

  invTotalPages(): number {
    return Math.ceil(this.invTotal() / this.invPageSize);
  }

  getPayMethodName(method: number): string {
    switch (method) {
      case 1: return 'كاش / نقدي';
      case 2: return 'شبكة / بطاقة';
      case 3: return 'آجل / ائتمان';
      default: return 'أخرى';
    }
  }
}
