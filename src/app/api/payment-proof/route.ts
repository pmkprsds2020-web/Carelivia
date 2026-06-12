import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const invoiceNumber = searchParams.get('invoiceNumber') || 'INV-000000';
  const amount = searchParams.get('amount') || '0';
  const method = searchParams.get('method') || 'qris';
  const paidAt = searchParams.get('paidAt') || new Date().toISOString();
  const patientName = searchParams.get('patientName') || 'Pasien';
  const doctorName = searchParams.get('doctorName') || 'Dokter';
  const itemsRaw = searchParams.get('items') || '[]';
  const prescriptionId = searchParams.get('prescriptionId') || '';

  let items: { name: string; dosage: string; quantity: number; price: number }[] = [];
  try {
    items = JSON.parse(itemsRaw);
  } catch {
    items = [];
  }

  const methodLabels: Record<string, string> = {
    qris: 'QRIS',
    bank_transfer: 'Transfer Bank',
    va: 'Virtual Account',
    gopay: 'GoPay',
    ovo: 'OVO',
    dana: 'DANA',
    shopeepay: 'ShopeePay',
  };

  const methodLabel = methodLabels[method] || method;

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const itemsRows = items
    .map(
      (item) => `
      <tr>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px;">${item.name}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; text-align: center;">${item.dosage}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; text-align: right;">${formatCurrency(item.price)}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; text-align: right; font-weight: 600;">${formatCurrency(item.price * item.quantity)}</td>
      </tr>`,
    )
    .join('');

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Bukti Pembayaran - ${invoiceNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif; background: #f9fafb; color: #111827; }
    .container { max-width: 680px; margin: 0 auto; padding: 40px 24px; }
    .header { text-align: center; margin-bottom: 32px; }
    .logo { font-size: 28px; font-weight: 800; color: #0d9488; letter-spacing: -0.5px; }
    .logo span { color: #10b981; }
    .subtitle { font-size: 12px; color: #6b7280; margin-top: 4px; letter-spacing: 2px; text-transform: uppercase; }
    .receipt-card { background: #fff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); overflow: hidden; }
    .receipt-header { background: linear-gradient(135deg, #0d9488, #10b981); color: white; padding: 24px 28px; display: flex; justify-content: space-between; align-items: center; }
    .receipt-header h1 { font-size: 20px; font-weight: 700; }
    .receipt-header .badge { background: rgba(255,255,255,0.2); border-radius: 8px; padding: 6px 14px; font-size: 12px; font-weight: 600; }
    .receipt-body { padding: 28px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
    .info-item label { display: block; font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .info-item span { font-size: 14px; font-weight: 600; color: #111827; }
    .divider { height: 1px; background: #e5e7eb; margin: 20px 0; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    thead th { padding: 10px 12px; text-align: left; font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e5e7eb; }
    thead th:nth-child(3), thead th:nth-child(4) { text-align: center; }
    thead th:nth-child(5) { text-align: right; }
    .total-row { background: #f0fdfa; }
    .total-row td { padding: 14px 12px; font-weight: 700; font-size: 15px; }
    .total-row td:last-child { text-align: right; color: #0d9488; font-size: 18px; }
    .footer { text-align: center; margin-top: 32px; }
    .footer p { font-size: 11px; color: #9ca3af; line-height: 1.6; }
    .stamp { display: inline-block; border: 2px solid #0d9488; border-radius: 50%; width: 80px; height: 80px; line-height: 76px; text-align: center; font-size: 11px; font-weight: 700; color: #0d9488; transform: rotate(-15deg); margin: 20px auto; opacity: 0.7; }
    @media print {
      body { background: white; }
      .container { padding: 20px; }
      .receipt-card { box-shadow: none; border: 1px solid #e5e7eb; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Medika<span>Link</span></div>
      <div class="subtitle">Platform Telemedicine Terintegrasi SATUSEHAT</div>
    </div>
    <div class="receipt-card">
      <div class="receipt-header">
        <h1>BUKTI PEMBAYARAN</h1>
        <div class="badge">LUNAS</div>
      </div>
      <div class="receipt-body">
        <div class="info-grid">
          <div class="info-item">
            <label>No. Invoice</label>
            <span>${invoiceNumber}</span>
          </div>
          <div class="info-item">
            <label>Tanggal Pembayaran</label>
            <span>${formatDate(paidAt)}</span>
          </div>
          <div class="info-item">
            <label>Nama Pasien</label>
            <span>${patientName}</span>
          </div>
          <div class="info-item">
            <label>Dokter</label>
            <span>${doctorName}</span>
          </div>
          <div class="info-item">
            <label>Metode Pembayaran</label>
            <span>${methodLabel}</span>
          </div>
          <div class="info-item">
            <label>No. Resep</label>
            <span>${prescriptionId || '-'}</span>
          </div>
        </div>
        <div class="divider"></div>
        <table>
          <thead>
            <tr>
              <th>Obat</th>
              <th>Dosis</th>
              <th>Qty</th>
              <th>Harga</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td colspan="4">TOTAL PEMBAYARAN</td>
              <td>${formatCurrency(totalAmount || Number(amount))}</td>
            </tr>
          </tfoot>
        </table>
        <div style="text-align: center;">
          <div class="stamp">DIBAYAR</div>
        </div>
      </div>
    </div>
    <div class="footer">
      <p>Bukti pembayaran ini merupakan bukti sah dari CARE'Livia.</p>
      <p>Untuk pertanyaan, hubungi support@carelivia.id</p>
      <p style="margin-top: 8px; color: #0d9488; font-weight: 600;">CARE'Livia &mdash; Sehat Terhubung, Hidup Lebih Baik</p>
    </div>
  </div>
  <script>
    window.onload = function() { window.print(); }
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="bukti-pembayaran-${invoiceNumber}.html"`,
    },
  });
}
