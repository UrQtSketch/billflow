const fs = require('fs');

// Extract VoiceBillingMatcher from app.js
const appJs = fs.readFileSync('./app.js', 'utf8');

// Isolate VoiceBillingMatcher
const matcherCodeMatch = appJs.match(/const VoiceBillingMatcher = \{[\s\S]*?\n  \};/);
if (!matcherCodeMatch) {
  console.error('Could not find VoiceBillingMatcher in app.js');
  process.exit(1);
}

// Eval VoiceBillingMatcher in a safe sandbox
const sandbox = {};
const fn = new Function('sandbox', `
  ${matcherCodeMatch[0]}
  sandbox.VoiceBillingMatcher = VoiceBillingMatcher;
`);
fn(sandbox);
const { VoiceBillingMatcher } = sandbox;

console.log('=====================================================');
console.log('🎙️ TESTING VOICE BILLING MATCHER SUITE');
console.log('=====================================================');

const mockCatalog = [
  { id: 'p1', name: 'A4 Long Register (200 Pages)', sku: 'REG-200', price: 70, costPrice: 45, stock: 40, type: 'product' },
  { id: 'p2', name: 'Classmate Notebook 172 Pages', sku: 'NB-172', price: 40, costPrice: 28, stock: 5, type: 'product' },
  { id: 'p3', name: 'Reynolds 045 Fine Blue Ball Pen', sku: 'PEN-045', price: 10, costPrice: 6, stock: 100, type: 'product' },
  { id: 'p4', name: 'Practical File Hard Cover', sku: 'FILE-01', price: 50, costPrice: 30, stock: 15, type: 'product' },
  { id: 'p5', name: 'NCERT Mathematics Class 10', sku: 'BK-M10', price: 180, costPrice: 130, stock: 8, type: 'product' }
];

const mockCustomers = [
  { id: 'c1', name: 'Rahul Sharma', phone: '+91 98765 43210' },
  { id: 'c2', name: 'Amit Kumar', phone: '+91 98123 45678' }
];

let totalTests = 0;
let passedTests = 0;

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${testName} — ${details}`);
  }
}

// Test 1: Standard multi-item with rates and cash
console.log('\n--- Scenario 1: Multi-item prompt with explicit rates ---');
const r1 = VoiceBillingMatcher.parseSpokenBill('5 register rs.100 per, 5 copy rs.50 per, cash', mockCatalog, mockCustomers);
assert(r1.items.length === 2, 'Parsed 2 line items', `Got ${r1.items.length}`);
assert(r1.items[0].qty === 5, 'Item 1 qty is 5', `Got ${r1.items[0].qty}`);
assert(r1.items[0].price === 100, 'Item 1 price is 100 (spoken price override)', `Got ${r1.items[0].price}`);
assert(r1.paymentMethod === 'Cash', 'Payment method is Cash', `Got ${r1.paymentMethod}`);
assert(r1.isPaymentSpoken === true, 'Payment was explicitly spoken', `Got ${r1.isPaymentSpoken}`);

// Test 2: Hindi numbers and customer lookup
console.log('\n--- Scenario 2: Hindi words, customer lookup & UPI ---');
const r2 = VoiceBillingMatcher.parseSpokenBill('Rahul ko do copy aur teen pen diye UPI', mockCatalog, mockCustomers);
assert(r2.customerName === 'Rahul Sharma', 'Customer matched to Rahul Sharma', `Got ${r2.customerName}`);
assert(r2.customerPhone === '+91 98765 43210', 'Customer phone attached', `Got ${r2.customerPhone}`);
assert(r2.paymentMethod === 'UPI', 'Payment method is UPI', `Got ${r2.paymentMethod}`);
assert(r2.items.length === 2, 'Parsed 2 items (copy and pen)', `Got ${r2.items.length}`);
assert(r2.items[0].qty === 2, 'Quantity for copy is 2', `Got ${r2.items[0].qty}`);
assert(r2.items[1].qty === 3, 'Quantity for pen is 3', `Got ${r2.items[1].qty}`);

// Test 3: Price Conflict Detection
console.log('\n--- Scenario 3: Price Conflict Detection ---');
const r3 = VoiceBillingMatcher.parseSpokenBill('1 notebook 50 me, cash', mockCatalog, mockCustomers);
assert(r3.items[0].catalogPrice === 40, 'Catalog price identified as 40', `Got ${r3.items[0].catalogPrice}`);
assert(r3.items[0].spokenPrice === 50, 'Spoken price identified as 50', `Got ${r3.items[0].spokenPrice}`);
assert(r3.items[0].hasPriceConflict === true, 'Price conflict flagged', `Got ${r3.items[0].hasPriceConflict}`);

// Test 4: Insufficient Stock Warning
console.log('\n--- Scenario 4: Insufficient Stock Warning ---');
const r4 = VoiceBillingMatcher.parseSpokenBill('10 notebook 40 me, cash', mockCatalog, mockCustomers);
assert(r4.items[0].qty === 10, 'Requested qty is 10', `Got ${r4.items[0].qty}`);
assert(r4.items[0].availableStock === 5, 'Available stock is 5', `Got ${r4.items[0].availableStock}`);
assert(r4.items[0].hasInsufficientStock === true, 'Insufficient stock flagged', `Got ${r4.items[0].hasInsufficientStock}`);

// Test 5: Unregistered Customer Alert
console.log('\n--- Scenario 5: Unregistered Customer ---');
const r5 = VoiceBillingMatcher.parseSpokenBill('Vikas Verma ko 2 pen diya cash me', mockCatalog, mockCustomers);
assert(r5.isUnregistered === true, 'Unregistered customer flagged', `Got ${r5.isUnregistered}`);
assert(r5.spokenCustomerName === 'Vikas Verma', 'Spoken name captured', `Got ${r5.spokenCustomerName}`);

// Test 6: Missing Payment Method Warning
console.log('\n--- Scenario 6: Missing Payment Method ---');
const r6 = VoiceBillingMatcher.parseSpokenBill('2 practical file 50 me', mockCatalog, mockCustomers);
assert(r6.isPaymentSpoken === false, 'Payment not spoken flagged', `Got ${r6.isPaymentSpoken}`);

// Test 7: Discount parsing
console.log('\n--- Scenario 7: Discount Parsing ---');
const r7 = VoiceBillingMatcher.parseSpokenBill('2 NCERT Maths 180 me, 20 discount, cash', mockCatalog, mockCustomers);
assert(r7.discountAmount === 20, 'Discount parsed as 20', `Got ${r7.discountAmount}`);
assert(r7.subtotal === 360, 'Subtotal is 360', `Got ${r7.subtotal}`);
assert(r7.grandTotal === 340, 'Grand total is 340 after discount', `Got ${r7.grandTotal}`);

console.log('\n=====================================================');
console.log(`RESULTS: ${passedTests}/${totalTests} tests passed (${Math.round((passedTests/totalTests)*100)}%)`);
console.log('=====================================================');

if (passedTests === totalTests) {
  console.log('🎉 ALL VOICE MATCHER UNIT TESTS PASSED!');
  process.exit(0);
} else {
  console.error('❌ SOME TESTS FAILED');
  process.exit(1);
}
