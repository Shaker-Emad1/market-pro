import { Injectable } from '@angular/core';

/**
 * Robust browser printing for the receipt modal.
 *
 * The naive `window.print()` approach is fragile: scrollbars print, sidebars
 * leak in, and on some browsers the print dialog races with content rendering.
 * Instead we clone only the receipt subtree into a hidden iframe, wait for the
 * iframe document to be ready (including the QR `<img>`), then print the iframe
 * contentWindow. This isolates the print stylesheet so the rest of the app
 * never appears on the paper, and works reliably on Chrome / Edge / Safari.
 */
@Injectable({ providedIn: 'root' })
export class PrintService {
  async printElement(el: HTMLElement, title = 'receipt'): Promise<void> {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.setAttribute('aria-hidden', 'true');
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument!;
    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map(n => n.outerHTML).join('\n');

    doc.open();
    doc.write(`<!doctype html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8" />
<title>${title}</title>
${styles}
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
  @page { size: 58mm auto; margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body { font-family: 'Cairo', 'Tajawal', system-ui, sans-serif; }
</style>
</head>
<body></body>
</html>`);
    doc.close();

    doc.body.appendChild(el.cloneNode(true));

    // Wait for fonts + images (notably the QR data URL) before printing.
    await new Promise<void>(resolve => {
      const imgs = Array.from(doc.images);
      let pending = imgs.length;
      if (pending === 0) return resolve();
      imgs.forEach(img => {
        if (img.complete) {
          if (--pending === 0) resolve();
        } else {
          img.onload = img.onerror = () => { if (--pending === 0) resolve(); };
        }
      });
      // Hard timeout so a broken image never blocks printing
      setTimeout(() => resolve(), 1200);
    });

    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } finally {
      // Give the print dialog a tick before tearing the iframe down.
      setTimeout(() => iframe.remove(), 1000);
    }
  }
}
