const assert = require('assert');

console.log('=====================================================');
console.log('📒 TESTING UDHAAR KHATA & PAYMENT REMINDER SUITE');
console.log('=====================================================\n');

let passCount = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passCount++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

// Mock Data
const mockCustomer = {
  id: 'cust_test_1',
  name: 'Sunil Book Depot',
  phone: '9876543210',
  email: 'sunil@test.com'
};

const mockInvoices = [
  {
    id: 'inv_1',
    invoiceNumber: 'INV-1001',
    customerId: 'cust_test_1',
    customerName: 'Sunil Book Depot',
    date: '2026-09-10',
    grandTotal: 5000,
    paidAmount: 2000,
    balanceDue: 3000,
    paymentStatus: 'Partial'
  },
  {
    id: 'inv_2',
    invoiceNumber: 'INV-1002',
    customerId: 'cust_test_1',
    customerName: 'Sunil Book Depot',
    date: '2026-09-15',
    grandTotal: 4000,
    paidAmount: 0,
    balanceDue: 4000,
    paymentStatus: 'Pending'
  },
  {
    id: 'inv_3',
    invoiceNumber: 'INV-1003',
    customerId: 'cust_test_2',
    customerName: 'Other Customer',
    date: '2026-09-18',
    grandTotal: 2500,
    paidAmount: 2500,
    balanceDue: 0,
    paymentStatus: 'Paid'
  }
];

// Test 1: Calculate Customer Pending Balance
test('Calculate total pending balance for customer', () => {
  const custInvs = mockInvoices.filter(i => i.customerId === mockCustomer.id);
  const totalPending = custInvs.reduce((s, i) => s + (Number(i.balanceDue) || 0), 0);
  assert.strictEqual(totalPending, 7000);
});

// Test 2: Calculate Khata Summary Across All Customers
test('Calculate Udhaar Khata total outstanding and customer count', () => {
  const totalOutstanding = mockInvoices.reduce((s, i) => s + (Number(i.balanceDue) || 0), 0);
  const totalCollected = mockInvoices.reduce((s, i) => s + (Number(i.paidAmount) || 0), 0);
  
  assert.strictEqual(totalOutstanding, 7000);
  assert.strictEqual(totalCollected, 4500);

  const customersWithDue = new Set(
    mockInvoices.filter(i => Number(i.balanceDue) > 0).map(i => i.customerId)
  ).size;
  assert.strictEqual(customersWithDue, 1);
});

// Test 3: Generate Dynamic UPI URL
test('Generate valid UPI intent URL with exact params', () => {
  const upiId = 'deepaksharma@okaxis';
  const bizName = 'Apex Retailers & Co.';
  const amount = 7000;
  const custName = 'Sunil Book Depot';
  const note = `Khata Payment - ${custName}`;

  const upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(bizName)}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(note)}`;

  assert(upiUrl.startsWith('upi://pay?'));
  assert(upiUrl.includes('pa=deepaksharma%40okaxis'));
  assert(upiUrl.includes('am=7000.00'));
  assert(upiUrl.includes('cu=INR'));
  assert(upiUrl.includes('tn=Khata%20Payment%20-%20Sunil%20Book%20Depot'));
});

// Test 4: Format WhatsApp Reminder Message
test('Format professional WhatsApp reminder message', () => {
  const settings = { businessName: 'Apex Retailers & Co.', upiId: 'deepaksharma@okaxis' };
  const totalDue = 7000;
  const pendingInvs = mockInvoices.filter(i => i.customerId === mockCustomer.id);

  let invText = '';
  pendingInvs.forEach(inv => {
    invText += `• Bill #${inv.invoiceNumber}: ₹${inv.balanceDue} due\n`;
  });

  const msg = `📢 *PAYMENT REMINDER / उधारी भुगतान सूचना*
*${settings.businessName}*

Namaste ${mockCustomer.name} ji,

Aapka hamari dukan par kul balance *₹${totalDue.toFixed(2)}* pending/udhaar hai.

📋 *Pending Bills / बकाया बिल विवरण:*
${invText.trim()}

💰 *Total Due Amount: ₹${totalDue.toFixed(2)}*`;

  assert(msg.includes('Sunil Book Depot'));
  assert(msg.includes('Apex Retailers & Co.'));
  assert(msg.includes('INV-1001'));
  assert(msg.includes('INV-1002'));
  assert(msg.includes('₹7000.00'));
});

// Test 5: Phone number sanitization and WhatsApp URL
test('Sanitize Indian 10-digit phone to international format', () => {
  let phone = mockCustomer.phone.replace(/\D/g, '');
  if (phone.length === 10) phone = '91' + phone;

  assert.strictEqual(phone, '919876543210');

  const waUrl = `https://api.whatsapp.com/send?phone=${phone}&text=test`;
  assert(waUrl.includes('phone=919876543210'));
});

// Test 6: FIFO Settlement - Partial Payment
test('FIFO Payment settlement: Partial payment clears oldest invoice first', () => {
  const invoicesCopy = JSON.parse(JSON.stringify(mockInvoices));
  const custInvs = invoicesCopy.filter(i => i.customerId === mockCustomer.id)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  let payment = 4000; // Less than 7000 total due

  for (const inv of custInvs) {
    if (payment <= 0) break;
    const currentBalance = inv.balanceDue;
    const currentPaid = inv.paidAmount;

    if (payment >= currentBalance) {
      inv.paidAmount = currentPaid + currentBalance;
      inv.balanceDue = 0;
      inv.paymentStatus = 'Paid';
      payment -= currentBalance;
    } else {
      inv.paidAmount = currentPaid + payment;
      inv.balanceDue = currentBalance - payment;
      inv.paymentStatus = 'Partial';
      payment = 0;
    }
  }

  // Invoice 1 (INV-1001, was 3000 due) should now be fully PAID!
  assert.strictEqual(custInvs[0].balanceDue, 0);
  assert.strictEqual(custInvs[0].paidAmount, 5000);
  assert.strictEqual(custInvs[0].paymentStatus, 'Paid');

  // Invoice 2 (INV-1002, was 4000 due) should have 1000 paid and 3000 balance!
  assert.strictEqual(custInvs[1].paidAmount, 1000);
  assert.strictEqual(custInvs[1].balanceDue, 3000);
  assert.strictEqual(custInvs[1].paymentStatus, 'Partial');

  // Total remaining balance is 3000
  const remainingDue = custInvs.reduce((s, i) => s + i.balanceDue, 0);
  assert.strictEqual(remainingDue, 3000);
});

// Test 7: FIFO Settlement - Full Payment
test('FIFO Payment settlement: Full payment clears all pending invoices', () => {
  const invoicesCopy = JSON.parse(JSON.stringify(mockInvoices));
  const custInvs = invoicesCopy.filter(i => i.customerId === mockCustomer.id)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  let payment = 7000;

  for (const inv of custInvs) {
    if (payment <= 0) break;
    const currentBalance = inv.balanceDue;
    const currentPaid = inv.paidAmount;

    if (payment >= currentBalance) {
      inv.paidAmount = currentPaid + currentBalance;
      inv.balanceDue = 0;
      inv.paymentStatus = 'Paid';
      payment -= currentBalance;
    } else {
      inv.paidAmount = currentPaid + payment;
      inv.balanceDue = currentBalance - payment;
      inv.paymentStatus = 'Partial';
      payment = 0;
    }
  }

  assert.strictEqual(custInvs[0].balanceDue, 0);
  assert.strictEqual(custInvs[0].paymentStatus, 'Paid');
  assert.strictEqual(custInvs[1].balanceDue, 0);
  assert.strictEqual(custInvs[1].paymentStatus, 'Paid');

  const remainingDue = custInvs.reduce((s, i) => s + i.balanceDue, 0);
  assert.strictEqual(remainingDue, 0);
});

console.log(`\n=====================================================`);
console.log(`RESULTS: ${passCount}/7 tests passed (100%)`);
console.log(`=====================================================`);
console.log(`🎉 ALL UDHAAR KHATA UNIT TESTS PASSED!`);
