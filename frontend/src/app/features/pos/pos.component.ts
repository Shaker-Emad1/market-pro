import { Component, ElementRef, ViewChild, computed, inject, signal, OnInit, HostListener, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PosApi, PosCategory, PosProduct, PaymentMethod, SaleSummary } from '../../core/pos.api';
import { ToastService } from '../../core/toast.service';
import { PrintService } from '../../core/print.service';
import { ReceiptComponent } from '../../core/receipt.component';
import { StoreService } from '../../core/store.service';

interface CartLine {
  product: PosProduct;
  quantity: number;
  lineDiscount: number;
  unitPrice: number;
}

/**
 * POS — the cashier-facing screen.
 *
 * Design notes:
 * - Signals everywhere: `cart`, totals, search, etc. Every total is a `computed`
 *   so changing quantity, discount or paid amount updates the UI without manual
 *   recompute and without dirty-checking the entire tree.
 * - Search is debounced via a single trailing setTimeout to avoid hammering the
 *   API on every keystroke; barcode-style submits (Enter) commit immediately.
 * - Keyboard-first: F2 = checkout, F4 = clear cart, F8 = focus search,
 *   Esc = close receipt, +/- on focused row tweaks quantity.
 * - The receipt modal is a controlled signal; the PrintService clones the inner
 *   `<mp-receipt>` into an isolated iframe so printing never leaks the rest of
 *   the app onto the paper.
 */
@Component({
  selector: 'mp-pos',
  standalone: true,
  imports: [CommonModule, FormsModule, ReceiptComponent],
  templateUrl: './pos.component.html',
  styleUrls: ['./pos.component.scss']
})
export class PosComponent implements OnInit, AfterViewInit {
  private api = inject(PosApi);
  private toast = inject(ToastService);
  private print = inject(PrintService);
  protected store = inject(StoreService);

  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;
  @ViewChild('receiptHost') receiptHost?: ElementRef<HTMLElement>;

  categories = signal<PosCategory[]>([]);
  products = signal<PosProduct[]>([]);
  cart = signal<CartLine[]>([]);

  selectedCategory = signal<string | null>(null);
  search = signal('');
  loading = signal(false);
  loadingCats = signal(false);

  globalDiscount = signal(0);
  paid = signal(0);
  paymentMethod = signal<PaymentMethod>('Cash');
  notes = signal('');

  busy = signal(false);
  lastReceipt = signal<SaleSummary | null>(null);
  flashSuccess = signal(false);

  subTotal = computed(() =>
    this.cart().reduce((s, l) => s + (l.unitPrice * l.quantity - l.lineDiscount), 0)
  );
  taxTotal = computed(() =>
    this.cart().reduce((s, l) => s + (l.unitPrice * l.quantity - l.lineDiscount) * (l.product.taxRate / 100), 0)
  );
  total = computed(() => Math.max(0, this.subTotal() + this.taxTotal() - this.globalDiscount()));
  change = computed(() => Math.max(0, this.paid() - this.total()));
  itemCount = computed(() => this.cart().reduce((s, l) => s + l.quantity, 0));
  remaining = computed(() => Math.max(0, this.total() - this.paid()));

  private searchDebounce?: any;

  ngOnInit() {
    this.loadCategories();
    this.loadProducts();
  }

  ngAfterViewInit() {
    setTimeout(() => this.searchInput?.nativeElement.focus(), 50);
  }

  loadCategories() {
    this.loadingCats.set(true);
    this.api.categories().subscribe({
      next: c => { this.categories.set(c); this.loadingCats.set(false); },
      error: () => { this.loadingCats.set(false); }
    });
  }

  loadProducts() {
    this.loading.set(true);
    this.api.products(this.search() || undefined, this.selectedCategory()).subscribe({
      next: p => { this.products.set(p); this.loading.set(false); },
      error: () => { this.loading.set(false); }
    });
  }

  selectCategory(id: string | null) {
    this.selectedCategory.set(id);
    this.loadProducts();
  }

  onSearchChange(v: string) {
    this.search.set(v);
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => this.loadProducts(), 220);
  }

  onSearchSubmit() {
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
    // If the search looks like a barcode (digits only, length 8+), try barcode lookup first.
    const term = this.search().trim();
    if (/^\d{8,}$/.test(term)) {
      this.api.byBarcode(term).subscribe({
        next: p => { this.add(p); this.search.set(''); this.loadProducts(); },
        error: () => this.loadProducts()
      });
    } else {
      this.loadProducts();
    }
  }

  add(p: PosProduct) {
    if (p.stockQty <= 0) {
      this.toast.error(`نفد رصيد: ${p.nameAr}`);
      return;
    }
    const existing = this.cart().find(l => l.product.id === p.id);
    if (existing) {
      this.updateQty(existing, existing.quantity + 1);
    } else {
      const unitPrice = p.discountPrice ?? p.sellPrice;
      this.cart.update(c => [...c, { product: p, quantity: 1, lineDiscount: 0, unitPrice }]);
    }
  }

  updateQty(line: CartLine, qty: number) {
    if (qty <= 0) { this.remove(line); return; }
    if (qty > line.product.stockQty) {
      this.toast.warn(`المخزون المتاح: ${line.product.stockQty}`);
      qty = line.product.stockQty;
    }
    this.cart.update(c => c.map(l => l === line ? { ...l, quantity: qty } : l));
  }

  remove(line: CartLine) {
    this.cart.update(c => c.filter(l => l !== line));
  }

  clearCart() {
    if (this.cart().length === 0) return;
    this.cart.set([]);
    this.globalDiscount.set(0);
    this.paid.set(0);
    this.notes.set('');
    this.toast.info('تم مسح الفاتورة');
  }

  setPayment(m: PaymentMethod) { this.paymentMethod.set(m); }

  quickPay(amount: number) { this.paid.set(amount); }
  payExact() { this.paid.set(Number(this.total().toFixed(2))); }
  addToPaid(amount: number) { this.paid.update(v => +(v + amount).toFixed(2)); }

  checkout() {
    if (this.cart().length === 0) { this.toast.warn('الفاتورة فارغة'); return; }
    if (this.paid() < this.total() && this.paymentMethod() !== 'Credit') {
      this.toast.error('المبلغ المدفوع أقل من الإجمالي');
      return;
    }
    this.busy.set(true);
    this.api.createSale({
      customerId: null,
      paymentMethod: this.paymentMethod(),
      paidAmount: this.paid(),
      discountAmount: this.globalDiscount(),
      notes: this.notes(),
      items: this.cart().map(l => ({
        productId: l.product.id,
        quantity: l.quantity,
        overrideUnitPrice: l.unitPrice,
        lineDiscount: l.lineDiscount
      }))
    }).subscribe({
      next: res => {
        this.busy.set(false);
        this.lastReceipt.set(res);
        this.toast.success(`تم إصدار الفاتورة ${res.invoiceNumber}`, 'تمت العملية');
        this.flashSuccess.set(true);
        setTimeout(() => this.flashSuccess.set(false), 600);
        this.clearCart();
        this.loadProducts();
      },
      error: () => { this.busy.set(false); }
    });
  }

  closeReceipt() {
    this.lastReceipt.set(null);
    setTimeout(() => this.searchInput?.nativeElement.focus(), 50);
  }

  async printReceipt() {
    if (!this.receiptHost) return;
    const node = this.receiptHost.nativeElement.querySelector('.rcpt-paper') as HTMLElement | null;
    if (!node) return;
    await this.print.printElement(node, this.lastReceipt()?.invoiceNumber);
  }

  trackProduct = (_: number, p: PosProduct) => p.id;
  trackLine = (_: number, l: CartLine) => l.product.id;

  thumbColor(p: PosProduct): string {
    const palette = ['#0EA5A4', '#60A5FA', '#F59E0B', '#22C55E', '#EF4444', '#A78BFA', '#06D6D5', '#FB923C'];
    let hash = 0;
    for (const ch of p.id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
    return `linear-gradient(135deg, ${palette[hash % palette.length]} 0%, #0E1830 100%)`;
  }

  stockBadge(p: PosProduct): 'out' | 'low' | 'ok' {
    if (p.stockQty <= 0) return 'out';
    if (p.stockQty < 10) return 'low';
    return 'ok';
  }

  @HostListener('window:keydown', ['$event'])
  onKey(e: KeyboardEvent) {
    // Don't hijack typing inside text inputs other than for global function keys.
    const target = e.target as HTMLElement;
    const isTyping = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA';

    if (e.key === 'F2') { e.preventDefault(); this.checkout(); return; }
    if (e.key === 'F4') { e.preventDefault(); this.clearCart(); return; }
    if (e.key === 'F8') { e.preventDefault(); this.searchInput?.nativeElement.focus(); return; }
    if (e.key === 'Escape' && this.lastReceipt()) { e.preventDefault(); this.closeReceipt(); return; }

    if (!isTyping && (e.key === '+' || e.key === '=')) {
      e.preventDefault();
      const last = this.cart().at(-1);
      if (last) this.updateQty(last, last.quantity + 1);
    }
    if (!isTyping && (e.key === '-' || e.key === '_')) {
      e.preventDefault();
      const last = this.cart().at(-1);
      if (last) this.updateQty(last, last.quantity - 1);
    }
  }
}
