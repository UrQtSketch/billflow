const assert = require('assert');

console.log('=====================================================');
console.log('📦 TESTING LOW STOCK & REORDER ALERT SUITE');
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

// Mock LowStock Logic from app.js
function getLowStockItems(products) {
  return products
    .filter(p => p.type === 'product' && (Number(p.stock) || 0) <= 10)
    .map(p => {
      const stock = Number(p.stock) || 0;
      let status = 'low';
      let badgeText = `${stock} left (Low)`;
      let badgeClass = 'low-stock-badge-warning';

      if (stock <= 0) {
        status = 'out';
        badgeText = 'Out of Stock (0)';
        badgeClass = 'low-stock-badge-out';
      } else if (stock <= 5) {
        status = 'critical';
        badgeText = `${stock} left (Critical)`;
        badgeClass = 'low-stock-badge-critical';
      }

      return {
        ...p,
        stock,
        status,
        badgeText,
        badgeClass
      };
    })
    .sort((a, b) => a.stock - b.stock);
}

const mockCatalog = [
  { id: 'p1', name: 'Notebook A5', type: 'product', stock: 2, price: 50 },
  { id: 'p2', name: 'Pen Box', type: 'product', stock: 8, price: 150 },
  { id: 'p3', name: 'Marker Set', type: 'product', stock: 0, price: 120 },
  { id: 'p4', name: 'Paper Ream', type: 'product', stock: 50, price: 300 },
  { id: 'p5', name: 'Web Consulting', type: 'service', stock: 0, price: 2000 },
  { id: 'p6', name: 'Calculator', type: 'product', stock: 5, price: 450 }
];

it('Correctly identifies low-stock products (<= 10) and excludes services', () => {
  const lowItems = getLowStockItems(mockCatalog);
  assert.strictEqual(lowItems.length, 4);
  const ids = lowItems.map(i => i.id);
  assert.ok(ids.includes('p1')); // stock 2
  assert.ok(ids.includes('p2')); // stock 8
  assert.ok(ids.includes('p3')); // stock 0
  assert.ok(ids.includes('p6')); // stock 5
  assert.ok(!ids.includes('p4')); // stock 50 > 10
  assert.ok(!ids.includes('p5')); // service
});

it('Categorizes stock <= 0 as Out of Stock', () => {
  const lowItems = getLowStockItems(mockCatalog);
  const outItem = lowItems.find(i => i.id === 'p3');
  assert.strictEqual(outItem.status, 'out');
  assert.strictEqual(outItem.badgeText, 'Out of Stock (0)');
});

it('Categorizes stock 1 to 5 as Critical Stock', () => {
  const lowItems = getLowStockItems(mockCatalog);
  const critItem1 = lowItems.find(i => i.id === 'p1');
  assert.strictEqual(critItem1.status, 'critical');
  assert.strictEqual(critItem1.badgeText, '2 left (Critical)');

  const critItem2 = lowItems.find(i => i.id === 'p6');
  assert.strictEqual(critItem2.status, 'critical');
  assert.strictEqual(critItem2.badgeText, '5 left (Critical)');
});

it('Categorizes stock 6 to 10 as Low Stock', () => {
  const lowItems = getLowStockItems(mockCatalog);
  const warnItem = lowItems.find(i => i.id === 'p2');
  assert.strictEqual(warnItem.status, 'low');
  assert.strictEqual(warnItem.badgeText, '8 left (Low)');
});

it('Sorts low stock items by stock ascending (0 first, then 2, 5, 8)', () => {
  const lowItems = getLowStockItems(mockCatalog);
  assert.strictEqual(lowItems[0].stock, 0);
  assert.strictEqual(lowItems[1].stock, 2);
  assert.strictEqual(lowItems[2].stock, 5);
  assert.strictEqual(lowItems[3].stock, 8);
});

it('Simulates stock reduction on billing: decreases stock and triggers low stock alert', () => {
  const dynamicCatalog = JSON.parse(JSON.stringify(mockCatalog));
  // Initially p4 has stock 50
  assert.strictEqual(getLowStockItems(dynamicCatalog).some(i => i.id === 'p4'), false);

  // Customer buys 42 units of p4
  const billedItem = { productId: 'p4', qty: 42 };
  const prod = dynamicCatalog.find(p => p.id === billedItem.productId);
  prod.stock = Math.max(0, prod.stock - billedItem.qty);

  // Stock is now 8 <= 10
  assert.strictEqual(prod.stock, 8);
  const updatedLow = getLowStockItems(dynamicCatalog);
  assert.ok(updatedLow.some(i => i.id === 'p4'));
  const p4Low = updatedLow.find(i => i.id === 'p4');
  assert.strictEqual(p4Low.status, 'low');
});

console.log('\n=====================================================');
console.log(`RESULTS: ${passCount}/${passCount + failCount} tests passed (${Math.round((passCount/(passCount + failCount))*100)}%)`);
console.log('=====================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL LOW STOCK UNIT TESTS PASSED!\n');
}
