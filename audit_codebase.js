const fs = require('fs');
const path = require('path');

console.log('=====================================================');
console.log('🔍 FULL PROJECT CODEBASE AUDIT & INTEGRITY CHECK');
console.log('=====================================================\n');

let errorCount = 0;

// 1. Audit index.html IDs referenced in app.js
const htmlPath = path.join(__dirname, 'index.html');
const appJsPath = path.join(__dirname, 'app.js');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');
const appJsContent = fs.readFileSync(appJsPath, 'utf8');

console.log('Step 1: Checking DOM element ID consistency between app.js and index.html...');
const idMatches = appJsContent.match(/document\.getElementById\(['"]([^'"]+)['"]\)/g) || [];
const checkedIds = new Set();

idMatches.forEach(match => {
  const id = match.replace(/document\.getElementById\(['"]/, '').replace(/['"]\)/, '');
  if (checkedIds.has(id)) return;
  checkedIds.add(id);

  // Dynamic IDs like row totals or line items
  if (id.includes('${') || id.startsWith('ai-draft-row-total-') || id.startsWith('row-')) return;

  const idPattern = new RegExp(`id=["']${id}["']`);
  if (!idPattern.test(htmlContent)) {
    console.error(`❌ Missing DOM Element in index.html: id="${id}"`);
    errorCount++;
  }
});

console.log(`Checked ${checkedIds.size} unique DOM element IDs.`);

// 2. Audit Views in HTML
const expectedViews = [
  'view-dashboard',
  'view-create-invoice',
  'view-ai-billing',
  'view-invoices',
  'view-customers',
  'view-products',
  'view-sales-analysis',
  'view-settings'
];

expectedViews.forEach(v => {
  if (!htmlContent.includes(`id="${v}"`)) {
    console.error(`❌ Missing view container in HTML: ${v}`);
    errorCount++;
  }
});

// 3. Check for syntax / unhandled exports
try {
  // Test requiring all api files
  require('./api/_lib/db.js');
  require('./api/_lib/auth.js');
  require('./api/_lib/response.js');
  require('./api/auth.js');
  require('./api/businesses.js');
  require('./api/customers.js');
  require('./api/products.js');
  require('./api/invoices.js');
  require('./api/dashboard.js');
  require('./api/analytics.js');
  require('./api/ai.js');
  console.log('✅ All backend API modules load and compile without syntax errors.');
} catch (e) {
  console.error('❌ Backend module require error:', e);
  errorCount++;
}

if (errorCount === 0) {
  console.log('\n🎉 ALL DOM & STATIC CODE INTEGRITY CHECKS PASSED (100%)!');
} else {
  console.error(`\n⚠️ Found ${errorCount} issue(s) during static audit.`);
  process.exit(1);
}
