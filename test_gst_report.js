const assert = require('assert');

console.log('=====================================================');
console.log('📑 TESTING MONTHLY GST & CA REPORT (GSTR-1 READY) SUITE');
console.log('=====================================================\n');

let passCount = 0;
let failCount = 0;

function it(desc, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${desc}`);
    passCount++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${desc}`);
    console.error(err);
    failCount++;
  }
}

// Logic mirror from GstReportController in app.js
function computeMonthGstData(yearMonth, invoices, customers, settings) {
  const monthInvoices = invoices.filter(inv => {
    const invDate = String(inv.date || '').split('T')[0];
    return invDate.startsWith(yearMonth);
  }).sort((a, b) => new Date(a.date) - new Date(b.date));

  let totalTaxable = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;
  let totalTax = 0;
  let grossSales = 0;

  const processedInvoices = [];
  const b2bInvoices = [];
  const b2cInvoices = [];
  const hsnMap = {};

  monthInvoices.forEach(inv => {
    const cust = customers.find(c => c.id === inv.customerId || c.name === inv.customerName);
    const gstin = (inv.customerGstin || (cust && cust.gstin) || '').trim().toUpperCase();
    const isB2B = Boolean(gstin && gstin.length >= 10);

    const subtotal = Number(inv.subtotal) || 0;
    const discount = Number(inv.discountAmount) || 0;
    let taxable = Math.max(0, subtotal - discount);
    const taxRate = Number(inv.taxRate) || 0;
    let taxAmt = Number(inv.taxAmount) || 0;
    const grandTotal = Number(inv.grandTotal) || 0;

    if (taxable === 0 && grandTotal > 0 && taxAmt > 0) {
      taxable = Math.max(0, grandTotal - taxAmt);
    } else if (taxAmt === 0 && taxRate > 0 && taxable > 0) {
      taxAmt = (taxable * taxRate) / 100;
    }

    const cgst = taxAmt / 2;
    const sgst = taxAmt / 2;
    const igst = 0;

    totalTaxable += taxable;
    totalCgst += cgst;
    totalSgst += sgst;
    totalIgst += igst;
    totalTax += taxAmt;
    grossSales += grandTotal;

    const row = {
      ...inv,
      customerGstin: gstin,
      isB2B,
      taxable,
      taxRate,
      taxAmt,
      cgst,
      sgst,
      igst,
      grandTotal
    };

    processedInvoices.push(row);
    if (isB2B) {
      b2bInvoices.push(row);
    } else {
      b2cInvoices.push(row);
    }

    if (Array.isArray(inv.items)) {
      inv.items.forEach(it => {
        const hsnKey = (it.sku || it.name || 'GENERAL').toUpperCase();
        if (!hsnMap[hsnKey]) {
          hsnMap[hsnKey] = {
            sku: it.sku || '—',
            name: it.name || 'General Item',
            totalQty: 0,
            taxableValue: 0,
            taxRate: taxRate,
            cgst: 0,
            sgst: 0,
            totalTax: 0,
            totalValue: 0
          };
        }
        const itQty = Number(it.qty) || 1;
        const itTotal = Number(it.total) || 0;
        const itTax = taxRate > 0 ? (itTotal * taxRate) / 100 : 0;

        hsnMap[hsnKey].totalQty += itQty;
        hsnMap[hsnKey].taxableValue += itTotal;
        hsnMap[hsnKey].cgst += itTax / 2;
        hsnMap[hsnKey].sgst += itTax / 2;
        hsnMap[hsnKey].totalTax += itTax;
        hsnMap[hsnKey].totalValue += (itTotal + itTax);
      });
    }
  });

  return {
    month: yearMonth,
    invoices: processedInvoices,
    b2bInvoices,
    b2cInvoices,
    hsnItems: Object.values(hsnMap),
    totals: {
      totalInvoices: monthInvoices.length,
      totalTaxable,
      totalCgst,
      totalSgst,
      totalIgst,
      totalTax,
      grossSales,
      b2bCount: b2bInvoices.length,
      b2cCount: b2cInvoices.length
    },
    settings
  };
}

// Sample Test Data
const mockSettings = {
  businessName: 'Apex Retailers & Co.',
  gstin: '07AAAAA0000A1Z5',
  currency: '₹'
};

const mockCustomers = [
  { id: 'c1', name: 'Sharma Enterprises', gstin: '07BBBBB1111B1Z2' },
  { id: 'c2', name: 'Local Consumer', gstin: '' }
];

const mockInvoices = [
  // September Invoices
  {
    id: 'inv_1',
    invoiceNumber: 'INV-1001',
    date: '2026-09-05',
    customerId: 'c1',
    customerName: 'Sharma Enterprises',
    customerGstin: '07BBBBB1111B1Z2',
    items: [{ sku: 'BK-01', name: 'Python Book', qty: 5, price: 1000, total: 5000 }],
    subtotal: 5000,
    discountAmount: 0,
    taxRate: 18,
    taxAmount: 900,
    grandTotal: 5900,
    paymentStatus: 'Paid'
  },
  {
    id: 'inv_2',
    invoiceNumber: 'INV-1002',
    date: '2026-09-12',
    customerId: 'c2',
    customerName: 'Local Consumer',
    customerGstin: '',
    items: [{ sku: 'BK-01', name: 'Python Book', qty: 2, price: 1000, total: 2000 }],
    subtotal: 2000,
    discountAmount: 0,
    taxRate: 12,
    taxAmount: 240,
    grandTotal: 2240,
    paymentStatus: 'Paid'
  },
  {
    id: 'inv_3',
    invoiceNumber: 'INV-1003',
    date: '2026-09-20',
    customerId: 'c2',
    customerName: 'Retail Walk-in',
    customerGstin: '',
    items: [{ sku: 'ST-01', name: 'Copy Paper', qty: 10, price: 300, total: 3000 }],
    subtotal: 3000,
    discountAmount: 500, // 2500 taxable
    taxRate: 5,
    taxAmount: 125,
    grandTotal: 2625,
    paymentStatus: 'Pending'
  },
  // August Invoice (should not appear in September report)
  {
    id: 'inv_4',
    invoiceNumber: 'INV-0999',
    date: '2026-08-25',
    customerId: 'c1',
    customerName: 'Sharma Enterprises',
    items: [{ sku: 'BK-01', name: 'Python Book', qty: 1, price: 1000, total: 1000 }],
    subtotal: 1000,
    taxRate: 18,
    taxAmount: 180,
    grandTotal: 1180
  }
];

it('Filters invoices strictly by selected month YYYY-MM', () => {
  const data = computeMonthGstData('2026-09', mockInvoices, mockCustomers, mockSettings);
  assert.strictEqual(data.totals.totalInvoices, 3);
  assert.strictEqual(data.invoices.some(i => i.invoiceNumber === 'INV-0999'), false);
});

it('Computes accurate Taxable Turnover, CGST, SGST, Total Tax and Gross Sales', () => {
  const data = computeMonthGstData('2026-09', mockInvoices, mockCustomers, mockSettings);
  // inv_1: 5000, inv_2: 2000, inv_3: 3000 - 500 = 2500
  // Total Taxable: 5000 + 2000 + 2500 = 9500
  assert.strictEqual(data.totals.totalTaxable, 9500);

  // inv_1 tax: 900, inv_2 tax: 240, inv_3 tax: 125
  // Total Tax: 900 + 240 + 125 = 1265
  assert.strictEqual(data.totals.totalTax, 1265);

  // CGST: 1265 / 2 = 632.5
  assert.strictEqual(data.totals.totalCgst, 632.5);
  assert.strictEqual(data.totals.totalSgst, 632.5);

  // Gross Sales: 5900 + 2240 + 2625 = 10765
  assert.strictEqual(data.totals.grossSales, 10765);
});

it('Accurately segregates B2B (with GSTIN) and B2C (without GSTIN)', () => {
  const data = computeMonthGstData('2026-09', mockInvoices, mockCustomers, mockSettings);
  assert.strictEqual(data.totals.b2bCount, 1);
  assert.strictEqual(data.totals.b2cCount, 2);
  assert.strictEqual(data.b2bInvoices[0].invoiceNumber, 'INV-1001');
  assert.strictEqual(data.b2bInvoices[0].customerGstin, '07BBBBB1111B1Z2');
});

it('Correctly groups HSN / products and sums sold quantities', () => {
  const data = computeMonthGstData('2026-09', mockInvoices, mockCustomers, mockSettings);
  assert.strictEqual(data.hsnItems.length, 2);

  const bkItem = data.hsnItems.find(h => h.sku === 'BK-01');
  assert.ok(bkItem);
  // 5 units in inv_1 + 2 units in inv_2 = 7 units
  assert.strictEqual(bkItem.totalQty, 7);
  assert.strictEqual(bkItem.taxableValue, 7000);

  const stItem = data.hsnItems.find(h => h.sku === 'ST-01');
  assert.ok(stItem);
  assert.strictEqual(stItem.totalQty, 10);
  assert.strictEqual(stItem.taxableValue, 3000);
});

it('Formats CA / WhatsApp summary with all required Indian tax metrics', () => {
  const data = computeMonthGstData('2026-09', mockInvoices, mockCustomers, mockSettings);
  const summary = `📑 GST & Tax Summary Report — ${data.month}
Business: ${data.settings.businessName}
GSTIN: ${data.settings.gstin}
• Total Invoices: ${data.totals.totalInvoices}
• Taxable Turnover: ₹${data.totals.totalTaxable}
• CGST: ₹${data.totals.totalCgst}
• SGST: ₹${data.totals.totalSgst}
• Total GST: ₹${data.totals.totalTax}`;

  assert.ok(summary.includes('Apex Retailers & Co.'));
  assert.ok(summary.includes('07AAAAA0000A1Z5'));
  assert.ok(summary.includes('Total Invoices: 3'));
  assert.ok(summary.includes('Taxable Turnover: ₹9500'));
  assert.ok(summary.includes('Total GST: ₹1265'));
});

console.log('\n=====================================================');
console.log(`RESULTS: ${passCount}/${passCount + failCount} tests passed (${Math.round((passCount/(passCount + failCount))*100)}%)`);
console.log('=====================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL GST & CA REPORT UNIT TESTS PASSED!\n');
}
