import { ChangeDetectionStrategy, Component, Input, OnChanges, SimpleChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SaleSummary, PaymentMethod } from './pos.api';
import { StoreInfo } from './store.service';
import * as QRCode from 'qrcode';

/**
 * Premium 58mm thermal‑optimized receipt.
 * Vertical layout, no horizontal overflow, RTL Arabic support.
 */
@Component({
  selector: 'mp-receipt',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="rcpt-wrap" *ngIf="sale; else nothing">
      <div class="rcpt-paper" [style.--rcpt-width]="store?.receiptWidthMm || 58">
        <header class="rcpt-head">
          <div class="rcpt-logo" *ngIf="store?.logoUrl as logo; else letter">
            <img [src]="logo" alt="" />
          </div>
          <ng-template #letter>
            <div class="rcpt-letter">{{ initial() }}</div>
          </ng-template>
          <div class="rcpt-store-ar">{{ store?.nameAr }}</div>
          <div class="rcpt-store-en" *ngIf="store?.nameEn">{{ store?.nameEn }}</div>
          <div class="rcpt-meta">{{ store?.addressAr }}</div>
          <div class="rcpt-meta" *ngIf="store?.phone">{{ store?.phone }}</div>
          <div class="rcpt-meta" *ngIf="store?.taxNumber">
            الرقم الضريبي: <span dir="ltr">{{ store?.taxNumber }}</span>
          </div>
        </header>
        <div class="rcpt-divider"></div>
        <section class="rcpt-info">
          <div class="rcpt-row rcpt-title-row">فاتورة ضريبية مبسطة</div>
          <div class="rcpt-row"><span>رقم الفاتورة</span><span dir="ltr">{{ sale.invoiceNumber }}</span></div>
          <div class="rcpt-row"><span>التاريخ</span><span dir="ltr">{{ sale.saleDate | date:'yyyy-MM-dd HH:mm' }}</span></div>
          <div class="rcpt-row"><span>الكاشير</span><span>{{ sale.cashierName }}</span></div>
          <div class="rcpt-row" *ngIf="sale.customerName"><span>العميل</span><span>{{ sale.customerName }}</span></div>
          <div class="rcpt-row"><span>طريقة الدفع</span><span>{{ paymentLabel(sale.paymentMethod) }}</span></div>
        </section>
        <div class="rcpt-divider dashed"></div>
        <section class="rcpt-lines">
          <div class="rcpt-line-item" *ngFor="let i of sale.items; let idx = index">
            <div class="rcpt-item-header">
              <span class="rcpt-item-idx">{{ idx + 1 }}.</span>
              <span class="rcpt-item-name">{{ i.productName }}</span>
            </div>
            <div class="rcpt-item-details">
              <span class="rcpt-item-qty-price" dir="ltr">
                {{ i.quantity | number:(i.quantity % 1 === 0 ? '1.0-0' : '1.3-3') }} {{ i.unit === 2 ? 'كجم' : 'حبة' }} × {{ i.unitPrice | number:'1.2-2' }}
              </span>
              <span class="rcpt-item-total" dir="ltr">{{ i.lineTotal | number:'1.2-2' }}</span>
            </div>
            <div class="rcpt-item-discount" *ngIf="i.discountAmount > 0" dir="ltr">خصم: -{{ i.discountAmount | number:'1.2-2' }}</div>
          </div>
        </section>
        <div class="rcpt-divider dashed"></div>
        <section class="rcpt-totals">
          <div class="rcpt-t-row"><span>المجموع</span><span dir="ltr">{{ sale.subTotal | number:'1.2-2' }}</span></div>
          <div class="rcpt-t-row" *ngIf="sale.discountAmount > 0"><span>الخصم</span><span dir="ltr">- {{ sale.discountAmount | number:'1.2-2' }}</span></div>
          <div class="rcpt-t-row"><span>ضريبة القيمة المضافة</span><span dir="ltr">{{ sale.taxAmount | number:'1.2-2' }}</span></div>
          <div class="rcpt-t-row rcpt-grand"><span>الإجمالي</span><span dir="ltr">{{ sale.total | number:'1.2-2' }} {{ store?.currency }}</span></div>
          <div class="rcpt-t-row" *ngIf="sale.paidAmount > 0"><span>المدفوع</span><span dir="ltr">{{ sale.paidAmount | number:'1.2-2' }}</span></div>
          <div class="rcpt-t-row" *ngIf="sale.changeAmount > 0"><span>الباقي</span><span dir="ltr">{{ sale.changeAmount | number:'1.2-2' }}</span></div>
        </section>
        <div class="rcpt-divider dashed"></div>
        <div class="rcpt-qr" *ngIf="qrDataUrl()"><img [src]="qrDataUrl()!" alt="QR" /></div>
        <footer class="rcpt-foot">
          <div class="rcpt-thanks">{{ store?.footerAr }}</div>
          <div class="rcpt-thanks rcpt-en" *ngIf="store?.footerEn">{{ store?.footerEn }}</div>
          <div class="rcpt-inv-no" dir="ltr">{{ sale.invoiceNumber }}</div>
        </footer>
      </div>
    </div>
    <ng-template #nothing></ng-template>
  `,
  styles: [`
    :host { display: block; }
    .rcpt-wrap { display: grid; place-items: center; padding: 16px 0; width: 100%; background: transparent; }
    .rcpt-paper { --rcpt-width: 58; width: calc(var(--rcpt-width) * 1mm); max-width: 100%; background: #fff; color: #000; padding: 4mm 3mm; font-family: 'Cairo', 'Tajawal', system-ui, sans-serif; font-size: 11px; line-height: 1.45; direction: rtl; text-align: center; box-shadow: 0 12px 40px rgba(0,0,0,.45); border-radius: 4px; box-sizing: border-box; }
    .rcpt-head { display: grid; gap: 2px; }
    .rcpt-logo img { width: 18mm; height: auto; margin: 0 auto 2mm; display: block; }
    .rcpt-letter { width: 14mm; height: 14mm; border-radius: 50%; display: grid; place-items: center; margin: 0 auto 2mm; background: #000; color: #fff; font-weight: 800; font-size: 16px; }
    .rcpt-store-ar { font-weight: 800; font-size: 13.5px; color: #000; }
    .rcpt-store-en { font-weight: 700; font-size: 11px; opacity: .8; color: #222; }
    .rcpt-meta { font-size: 9.5px; color: #333; }
    .rcpt-divider { border-top: 1px solid #000; margin: 2mm 0; }
    .rcpt-divider.dashed { border-top: 1px dashed #444; }
    .rcpt-info { text-align: start; display: flex; flex-direction: column; gap: 2px; }
    .rcpt-row { display: flex; justify-content: space-between; gap: 6px; font-size: 10px; color: #222; }
    .rcpt-title-row { font-weight: 800; font-size: 11px; justify-content: center; margin-bottom: 2px; color: #000; }
    .rcpt-lines { display: flex; flex-direction: column; gap: 6px; text-align: start; }
    .rcpt-line-item { display: flex; flex-direction: column; gap: 1px; padding: 2px 0; border-bottom: 1px dashed #ddd; }
    .rcpt-line-item:last-child { border-bottom: none; }
    .rcpt-item-header { display: flex; gap: 4px; font-weight: 700; font-size: 11px; color: #000; word-break: break-word; }
    .rcpt-item-idx { color: #555; }
    .rcpt-item-name { flex: 1; }
    .rcpt-item-details { display: flex; justify-content: space-between; font-size: 10px; color: #333; font-variant-numeric: tabular-nums; }
    .rcpt-item-qty-price { color: #555; }
    .rcpt-item-total { font-weight: 700; color: #000; }
    .rcpt-item-discount { font-size: 9px; color: #d9534f; text-align: end; margin-top: 1px; }
    .rcpt-totals { display: grid; gap: 2px; font-variant-numeric: tabular-nums; text-align: start; }
    .rcpt-t-row { display: flex; justify-content: space-between; gap: 6px; font-size: 10.5px; color: #222; }
    .rcpt-t-row.rcpt-grand { font-weight: 800; font-size: 13px; color: #000; border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 1.5mm 0; margin: 1mm 0; }
    .rcpt-qr { display: grid; place-items: center; margin: 2mm 0; }
    .rcpt-qr img { width: 22mm; height: 22mm; image-rendering: pixelated; }
    .rcpt-foot { display: grid; gap: 1px; padding-top: 1.5mm; }
    .rcpt-thanks { font-weight: 700; font-size: 10.5px; color: #000; }
    .rcpt-thanks.rcpt-en { font-size: 9.5px; opacity: .8; color: #222; }
    .rcpt-inv-no { font-size: 9px; opacity: .7; letter-spacing: .04em; color: #444; }
    @media print {
      :host, .rcpt-wrap { padding: 0 !important; background: #fff !important; }
      .rcpt-paper { box-shadow: none !important; border-radius: 0 !important; padding: 2mm 1mm !important; width: 100% !important; max-width: 100% !important; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReceiptComponent implements OnChanges {
  @Input() sale: SaleSummary | null = null;
  @Input() store: StoreInfo | null = null;

  qrDataUrl = signal<string | null>(null);

  async ngOnChanges(changes: SimpleChanges) {
    if (changes['sale'] && this.sale?.qrPayload) {
      try {
        const url = await QRCode.toDataURL(this.sale.qrPayload, {
          errorCorrectionLevel: 'M',
          margin: 0,
          width: 220,
          color: { dark: '#000000', light: '#ffffff' }
        });
        this.qrDataUrl.set(url);
      } catch {
        this.qrDataUrl.set(null);
      }
    }
  }

  initial(): string {
    return (this.store?.nameAr?.trim() || 'M').charAt(0);
  }

  paymentLabel(m: PaymentMethod): string {
    switch (m) {
      case 'Cash': return 'نقد';
      case 'Card': return 'بطاقة';
      case 'BankTransfer': return 'تحويل بنكي';
      case 'Credit': return 'آجل';
      case 'Mixed': return 'دفع مختلط';
      default: return m;
    }
  }
}
