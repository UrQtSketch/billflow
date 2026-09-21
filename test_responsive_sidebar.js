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

// Check 1: In base styles, 3-dot buttons are hidden by default
const btnMainBaseMatch = stylesCss.match(/\.btn-sidebar-toggle-main\s*\{[^}]*display:\s*none/);
check('Base style hides .btn-sidebar-toggle-main on desktop', !!btnMainBaseMatch);

const btnSidebarBaseMatch = stylesCss.match(/\.btn-sidebar-toggle\s*\{[^}]*display:\s*none/);
check('Base style hides .btn-sidebar-toggle on desktop', !!btnSidebarBaseMatch);

// Check 2: In @media (min-width: 1024px), 3-dot buttons are explicitly display: none !important
const desktopSection = stylesCss.match(/@media\s*\(min-width:\s*1024px\)[\s\S]*?\n\}/);
if (desktopSection) {
  check('Desktop @media (min-width: 1024px) hides 3-dot buttons', desktopSection[0].includes('display: none !important'));
  check('Desktop @media (min-width: 1024px) keeps sidebar permanent', desktopSection[0].includes('transform: none !important'));
  check('Desktop @media (min-width: 1024px) sets main margin-left: 245px', desktopSection[0].includes('margin-left: 245px !important'));
} else {
  check('Desktop @media (min-width: 1024px) section exists', false);
}

// Check 3: In @media (min-width: 769px), 3-dot buttons are also hidden
const tabletSection = stylesCss.match(/@media\s*\(min-width:\s*769px\)\s*and\s*\(max-width:\s*1023px\)[\s\S]*?\n\}/);
if (tabletSection) {
  check('Tablet/Laptop landscape hides 3-dot buttons', tabletSection[0].includes('display: none !important'));
  check('Tablet/Laptop landscape keeps sidebar permanent', tabletSection[0].includes('transform: none !important'));
} else {
  check('Tablet @media (min-width: 769px) section exists', false);
}

// Check 4: In @media (max-width: 768px), 3-dot button is shown for mobile phone drawer
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
