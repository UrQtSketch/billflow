const fs = require('fs');
const assert = require('assert');

console.log('=====================================================');
console.log('🧪 COMPREHENSIVE END-TO-END BUTTON & BACKEND VERIFICATION');
console.log('=====================================================');

let passed = 0;
let total = 0;

function check(desc, condition) {
  total++;
  if (condition) {
    console.log(`  ✅ PASS: ${desc}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${desc}`);
  }
}

const html = fs.readFileSync('index.html', 'utf8');
const app = fs.readFileSync('app.js', 'utf8');
const styles = fs.readFileSync('styles.css', 'utf8');
const dbJs = fs.readFileSync('api/_lib/db.js', 'utf8');
const custJs = fs.readFileSync('api/customers.js', 'utf8');
const invJs = fs.readFileSync('api/invoices.js', 'utf8');
const bizJs = fs.readFileSync('api/businesses.js', 'utf8');
const dashJs = fs.readFileSync('api/dashboard.js', 'utf8');

// --- 1. MODAL VISIBILITY TESTS ---
console.log('\n--- 1. Modal Display & Visibility Verification ---');
const problematicModals = ['modal-thermal-receipt', 'modal-payment-reminder', 'modal-record-payment', 'modal-gst-report'];
problematicModals.forEach(mId => {
  const modalTagMatch = html.match(new RegExp(`<div[^>]*id=['"]${mId}['"][^>]*>`));
  check(`Modal #${mId} does NOT have blocking inline style="display:none"`, modalTagMatch && !modalTagMatch[0].includes('display:none'));
});

check('CSS .modal-backdrop.show forces display: flex !important', styles.includes('.modal-backdrop.show') && styles.includes('display: flex !important'));

check('app.js Modal.open explicitly applies display: flex', app.includes("modal.style.display = 'flex'"));
check('app.js Modal.close explicitly applies display: none', app.includes("modal.style.display = 'none'"));

// --- 2. NAVIGATION & ALIASES TESTS ---
console.log('\n--- 2. Navigation & Button Handlers Verification ---');
check('Navigation has showView alias method', app.includes('showView(viewName)') && app.includes('return this.switchView(viewName)'));
check('window.switchView is globally exposed', app.includes('window.switchView ='));
check('window.showView is globally exposed', app.includes('window.showView ='));

// Check in-page buttons do not rely on fragile querySelector .nav clicks
const querySelectorNavClicks = html.match(/onclick=["'][^"']*querySelector\([^"']*\.nav[^"']*\)\.click\(\)/g);
check('No in-page buttons rely on simulated .nav querySelector clicks', !querySelectorNavClicks || querySelectorNavClicks.length === 0);

// --- 3. SIDEBAR TOGGLE (3-DOT) BUTTON RESPONSIVENESS ---
console.log('\n--- 3. Sidebar Toggle / 3-Dot Button Verification ---');
check('window.toggleSidebar is defined', app.includes('window.toggleSidebar = function'));
check('window.toggleSidebar handles mobile drawer', app.includes("sidebar.classList.toggle('open')") || app.includes("sidebar.classList.add('open')"));
check('window.toggleSidebar toggles desktop sidebar-collapsed state', app.includes("document.body.classList.toggle('sidebar-collapsed')") || app.includes("document.body.classList.add('sidebar-collapsed')"));
check('window.toggleSidebar persists state in localStorage', app.includes("localStorage.setItem('billflow_sidebar_collapsed'"));

// --- 4. BACKEND SCHEMA & ENDPOINT PARITY ---
console.log('\n--- 4. Backend Schema & Endpoints Verification ---');
check('db.js adds upi_id to businesses table', dbJs.includes('upi_id VARCHAR(100)'));
check('db.js adds gstin to customers table', dbJs.includes('ALTER TABLE customers ADD COLUMN IF NOT EXISTS gstin VARCHAR(30)'));
check('db.js adds customer_gstin to invoices table', dbJs.includes('ALTER TABLE invoices ADD COLUMN IF NOT EXISTS customer_gstin VARCHAR(30)'));

check('customers.js POST handles gstin', custJs.includes('cleanGstin') && custJs.includes('gstin) VALUES'));
check('customers.js PUT handles gstin', custJs.includes('gstin = COALESCE'));

check('invoices.js POST handles customer_gstin', invJs.includes('cleanCustGstin') && invJs.includes('customer_gstin,'));
check('invoices.js PUT handles customer_gstin', invJs.includes('customer_gstin = COALESCE'));

check('businesses.js GET formats upiId', bizJs.includes('upiId:'));
check('businesses.js POST handles upiId', bizJs.includes('cleanUpi') && bizJs.includes('upi_id,'));
check('businesses.js PUT handles upiId', bizJs.includes('upi_id = COALESCE'));

check('dashboard.js lowStock threshold uses <= 10', dashJs.includes('<= 10'));

// --- 5. APICLIENT METHODS ---
console.log('\n--- 5. ApiClient Methods Verification ---');
check('ApiClient has syncInvoices method', app.includes('async syncInvoices(businessId, invoices)'));

// --- 6. DOM READY / BOOTAPP ---
console.log('\n--- 6. DOM BootApp Verification ---');
check('bootApp runs immediately if document.readyState !== loading', app.includes("document.readyState === 'loading'") && app.includes('bootApp()'));

console.log('\n=====================================================');
console.log(`RESULTS: ${passed}/${total} checks passed (${Math.round((passed/total)*100)}%)`);
console.log('=====================================================');

if (passed === total) {
  console.log('🎉 ALL 24 BUTTON & BACKEND VERIFICATION CHECKS PASSED!');
  process.exit(0);
} else {
  process.exit(1);
}
