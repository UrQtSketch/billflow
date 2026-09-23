const fs = require('fs');

const stylesCss = fs.readFileSync('./styles.css', 'utf8');

console.log('=====================================================');
console.log('📱 TESTING RESPONSIVE CSS & SIDEBAR BEHAVIOR');
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

// Check 1: In base styles, sidebar toggle buttons
const btnSidebarBaseMatch = stylesCss.match(/\.btn-sidebar-toggle\s*\{[^}]*display:\s*inline-flex/);
check('Base style displays .btn-sidebar-toggle for collapsing menu', !!btnSidebarBaseMatch);

const btnMainBaseMatch = stylesCss.match(/\.btn-sidebar-toggle-main\s*\{[^}]*display:\s*none/);
check('Base style hides .btn-sidebar-toggle-main when sidebar already open', !!btnMainBaseMatch);

// Check 2: When sidebar is collapsed on desktop, expand button is visible
const collapsedMainBtnMatch = stylesCss.match(/body\.sidebar-collapsed\s+\.btn-sidebar-toggle-main\s*\{[^}]*display:\s*inline-flex\s*!important/);
check('Collapsed sidebar displays .btn-sidebar-toggle-main so user can reopen', !!collapsedMainBtnMatch);

// Check 3: In @media (min-width: 1024px), sidebar and main layout
const desktopSection = stylesCss.match(/@media\s*\(min-width:\s*1024px\)[\s\S]*?\n\}/);
if (desktopSection) {
  check('Desktop @media (min-width: 1024px) supports toggle button', desktopSection[0].includes('.btn-sidebar-toggle'));
  check('Desktop @media (min-width: 1024px) positions sidebar fixed', desktopSection[0].includes('position: fixed !important'));
  check('Desktop @media (min-width: 1024px) sets main margin-left: 245px', desktopSection[0].includes('margin-left: 245px !important'));
  check('Desktop supports collapsed sidebar state', desktopSection[0].includes('body.sidebar-collapsed .sidebar'));
} else {
  check('Desktop @media (min-width: 1024px) section exists', false);
}

// Check 4: In @media (max-width: 768px), mobile drawer and bottom nav
const mobileSection = stylesCss.match(/@media\s*\(max-width:\s*768px\)[\s\S]*?\n\/\* --- EXTRA SMALL/);
if (mobileSection) {
  check('Mobile @media (max-width: 768px) shows 3-dot button for mobile drawer', mobileSection[0].includes('.btn-sidebar-toggle-main') && mobileSection[0].includes('display: inline-flex !important'));
  check('Mobile shows mobile bottom navigation bar', mobileSection[0].includes('.mobile-bottom-nav') && mobileSection[0].includes('display: flex'));
  check('Mobile hides sidebar off-canvas by default', mobileSection[0].includes('transform: translateX(-100%)'));
} else {
  check('Mobile @media (max-width: 768px) section exists', false);
}

console.log('\n=====================================================');
console.log(`RESULTS: ${passed}/${total} checks passed (${Math.round((passed/total)*100)}%)`);
console.log('=====================================================');

if (passed === total) {
  console.log('🎉 ALL RESPONSIVE SIDEBAR TESTS PASSED!');
  process.exit(0);
} else {
  process.exit(1);
}
