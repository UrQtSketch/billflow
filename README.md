# BillFlow — Universal Business Billing Application

**Version:** `v1.0.0-MVP-STABLE`  
**Checkpoint Date:** 2026-09-20  
**Status:** Frozen MVP (Production-Ready)  
**Live Production URL:** https://billflow-three-roan.vercel.app  

---

## 1. Overview

BillFlow is a clean, lightweight, modular client-side business billing and invoicing application with zero runtime dependencies. It operates entirely in the modern browser using `localStorage` for fast, offline-first persistence.

---

## 2. Implemented Features (MVP Scope)

### 🏢 Business Setup & Profiles
- **Profile Management:** Dynamic multi-business profile support (`Store.createProfile`, `Store.switchProfile`) with complete data isolation across profiles.
- **Business Details:** Business Name, Owner Name, Phone, Address, GSTIN, and Invoice Prefix configuration.
- **Auto-Increment Sequences:** Configurable next invoice sequence numbering.

### 📦 Products & Services Catalog
- **CRUD Operations:** Create, Read, Update, and Delete for items.
- **Item Classification:** Clear differentiation between physical **Products** (with stock tracking) and intangible **Services** (without stock tracking).
- **Attributes:** Name, optional SKU/Code, Selling Price, Category, and Initial Stock.
- **Live Search & Filtering:** Instant search by name, SKU, or category.

### 👥 Customer Management
- **CRUD Operations:** Create, Read, Update, and Delete customer records.
- **Billing History & Statements:** Instant drill-down modal showing all invoices issued to a customer, total billed, paid amount, and outstanding balance.
- **Auto-Registration:** Direct auto-save of new customers during invoice creation.

### 🧾 Invoice Creation & Management
- **Interactive Multi-Item Editor:** Dynamic line items with product picker, auto-fill prices, and manual overrides.
- **Tax & Discount Engine:**
  - GST presets (0%, 5%, 12%, 18%, 28%) and custom tax rates (0%–100%).
  - Percentage (%) or fixed flat rate (₹) discounts.
- **Payment Lifecycle:**
  - Statuses: Paid, Pending, Partial, and Draft.
  - Automatic balance due calculation.
  - Payment methods: Cash, UPI, Bank Transfer, Card, Cheque, Other.
- **Live Preview:** Real-time synchronized invoice preview during creation and editing.
- **Edit & Cancel Safety:** Deep-copy snapshot protection preventing accidental state mutation on navigation or cancellation.
- **Duplicate Protection:** Validation against duplicate invoice numbers.
- **Inventory Synchronization:** Stock automatically deducted upon invoice creation and restored on invoice deletion.

### 📊 Dashboard & Analytics
- **Live Metrics:** Today's Sales, Outstanding Dues, Total Invoices Generated, and Low Stock Alerts (< 10 units).
- **Recent Invoices Table:** Quick status badges and one-click view/edit actions.

### 🖨️ Print, PDF & Sharing
- **A4 Print Engine:** Dedicated `@media print` layout with A4 page dimensions, margins, and automatic modal/chrome suppression.
- **PDF Export:** Native browser print-to-PDF pipeline.
- **WhatsApp & Email Sharing:** Formatted pre-filled messages and links.

### 💾 Backup & Portability
- **Data Export:** Full JSON backup generation for active profile data.
- **Data Import:** JSON backup restoration with structural validation and XSS sanitization.

---

## 3. Test & Quality Assurance Status

The application has undergone complete automated verification with **100% pass rate**:

| Test Suite | Total Checks | Passed | Failed | Status |
|---|---|---|---|---|
| **Core Regression Suite** | 15 | 15 | 0 | ✅ 100% PASS |
| **Production Readiness Audit** | 22 | 22 | 0 | ✅ 100% PASS |

### Tested & Verified Areas:
- **State & Data Persistence:** Corrupted/null storage recovery, refresh resilience during edits.
- **Inventory Consistency:** Stock deduction and full restoration on deletion.
- **Financial Calculations:** Rounding precision, partial balances, tax/discount combinations.
- **Security:** Strict XSS prevention in forms and JSON backup parsing.
- **Performance:** 100 products, 100 customers, 500 invoices rendered in ~109ms.
- **Responsive UI:** 0 horizontal overflow across 5 standard viewport sizes (320px to 1440px).
- **Zero Console Errors / Zero Runtime Exceptions.**

---

## 4. How to Run Locally

Because BillFlow is a zero-dependency client-side application, it requires no backend server, database, or build pipeline.

### Option A: Direct Browser Launch (Recommended)
Double-click `index.html` or open it directly in any modern browser (Chrome, Edge, Firefox, Safari):
```text
file:///C:/Users/deepak/OneDrive/Desktop/bill project/index.html
```

### Option B: Local Static Server (Optional)
If running via a local development server:
```powershell
# Using Python
python -m http.server 8000

# Using Node (npx)
npx serve .
```
Then navigate to `http://localhost:8000`.

---

## 5. Architecture & Preserved Files

When resuming future development (e.g., adding AI features, OCR, analytics), preserve the core structure:

```
bill project/
├── index.html   # Main application markup & modular modal definitions
├── styles.css   # Clean modern styling & dedicated @media print rules
├── app.js       # Self-contained IIFE modular application (Store, Controllers, UI)
└── README.md    # Documentation & frozen state reference
```

### Core Architecture Boundaries:
- `Store`: Handles `localStorage` isolation (`billflow_{profileId}_{key}`).
- `Controllers`: Encapsulated controllers for `Dashboard`, `Product`, `Customer`, `Invoice`, `InvoicesList`, `Settings`.
- `Utils`: Formatters (`formatCurrency`, `escapeHtml`, `generateId`, `todayYMD`).
