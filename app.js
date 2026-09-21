/**
 * BillFlow — Universal Business Billing Application
 * Clean, modular basic billing system with zero dependencies.
 */

(function () {
  'use strict';

  // --- STATE & PERSISTENCE LAYER ---
  const DEFAULT_PROFILE = 'default';
  let currentProfile = localStorage.getItem('billflow_active_profile') || DEFAULT_PROFILE;

  const defaultProfiles = [
    { id: 'default', name: 'Default Business Profile' }
  ];

  const storageKey = (key) => `billflow_${currentProfile}_${key}`;

  const defaultSettings = {
    businessName: 'Apex Retailers & Co.',
    ownerName: 'Deepak Sharma',
    phone: '+91 98765 43210',
    address: 'Shop 12, Main Market, Connaught Place, New Delhi, India',
    gstin: '07AAAAA0000A1Z5',
    invoicePrefix: 'INV-',
    nextNumber: 1029,
    currency: '₹'
  };

  const defaultProducts = [
    { id: 'prod_1', name: 'Python Programming Guide', type: 'product', sku: 'BK-PY-01', price: 650, stock: 45, category: 'Books' },
    { id: 'prod_2', name: 'A4 Premium Copy Paper (500 sheets)', type: 'product', sku: 'ST-A4-50', price: 320, stock: 120, category: 'Stationery' },
    { id: 'prod_3', name: 'Gel Pen Box (Set of 10)', type: 'product', sku: 'ST-PEN-10', price: 150, stock: 80, category: 'Stationery' },
    { id: 'prod_4', name: 'Website Maintenance (Monthly)', type: 'service', sku: 'SRV-WEB-01', price: 3500, stock: 0, category: 'Services' },
    { id: 'prod_5', name: 'Annual Software License', type: 'service', sku: 'SRV-LIC-02', price: 7500, stock: 0, category: 'Services' }
  ];

  const defaultCustomers = [
    { id: 'cust_1', name: 'Student Book Center', phone: '+91 98111 22334', email: 'contact@studentbook.in', address: 'Daryaganj, New Delhi', createdAt: '2026-09-01' },
    { id: 'cust_2', name: 'Rahul Traders', phone: '+91 98222 33445', email: 'rahul.traders@gmail.com', address: 'Chandni Chowk, Delhi', createdAt: '2026-09-05' },
    { id: 'cust_3', name: 'Creative Studio', phone: '+91 98333 44556', email: 'hello@creativestudio.co', address: 'Noida Sector 62, UP', createdAt: '2026-09-10' }
  ];

  const defaultInvoices = [
    {
      id: 'inv_1028',
      invoiceNumber: 'INV-1028',
      customerId: 'cust_1',
      customerName: 'Student Book Center',
      customerPhone: '+91 98111 22334',
      customerEmail: 'contact@studentbook.in',
      customerAddress: 'Daryaganj, New Delhi',
      date: '2026-09-20',
      dueDate: '2026-09-27',
      items: [
        { id: 'item_1', productId: 'prod_1', name: 'Python Programming Guide', sku: 'BK-PY-01', qty: 10, price: 650, total: 6500 },
        { id: 'item_2', productId: 'prod_2', name: 'A4 Premium Copy Paper (500 sheets)', sku: 'ST-A4-50', qty: 10, price: 320, total: 3200 }
      ],
      subtotal: 9700,
      discountType: 'fixed',
      discountValue: 200,
      discountAmount: 200,
      taxRate: 0,
      taxAmount: 0,
      grandTotal: 9500,
      paymentMethod: 'UPI',
      paymentStatus: 'Paid',
      paidAmount: 9500,
      balanceDue: 0,
      notes: 'Thank you for your business! Regular bulk order.',
      createdAt: '2026-09-20T10:30:00'
    },
    {
      id: 'inv_1027',
      invoiceNumber: 'INV-1027',
      customerId: 'cust_2',
      customerName: 'Rahul Traders',
      customerPhone: '+91 98222 33445',
      customerEmail: 'rahul.traders@gmail.com',
      customerAddress: 'Chandni Chowk, Delhi',
      date: '2026-09-19',
      dueDate: '2026-09-26',
      items: [
        { id: 'item_3', productId: 'prod_2', name: 'A4 Premium Copy Paper (500 sheets)', sku: 'ST-A4-50', qty: 35, price: 320, total: 11200 },
        { id: 'item_4', productId: 'prod_3', name: 'Gel Pen Box (Set of 10)', sku: 'ST-PEN-10', qty: 25, price: 150, total: 3750 }
      ],
      subtotal: 14950,
      discountType: 'fixed',
      discountValue: 100,
      discountAmount: 100,
      taxRate: 0,
      taxAmount: 0,
      grandTotal: 14850,
      paymentMethod: 'Bank Transfer',
      paymentStatus: 'Pending',
      paidAmount: 0,
      balanceDue: 14850,
      notes: 'Payment terms: Net 7 days.',
      createdAt: '2026-09-19T14:15:00'
    },
    {
      id: 'inv_1026',
      invoiceNumber: 'INV-1026',
      customerId: 'cust_3',
      customerName: 'Creative Studio',
      customerPhone: '+91 98333 44556',
      customerEmail: 'hello@creativestudio.co',
      customerAddress: 'Noida Sector 62, UP',
      date: '2026-09-18',
      dueDate: '2026-09-25',
      items: [
        { id: 'item_5', productId: 'prod_4', name: 'Website Maintenance (Monthly)', sku: 'SRV-WEB-01', qty: 2, price: 3500, total: 7000 }
      ],
      subtotal: 7000,
      discountType: 'percent',
      discountValue: 0,
      discountAmount: 0,
      taxRate: 5,
      taxAmount: 350,
      grandTotal: 7350,
      paymentMethod: 'Card',
      paymentStatus: 'Paid',
      paidAmount: 7350,
      balanceDue: 0,
      notes: 'Monthly maintenance retainer.',
      createdAt: '2026-09-18T16:00:00'
    }
  ];

  const Store = {
    getProfiles() {
      try {
        const list = JSON.parse(localStorage.getItem('billflow_profiles_list'));
        if (Array.isArray(list) && list.length > 0) return list;
      } catch (e) {}
      return defaultProfiles;
    },
    saveProfiles(profiles) {
      localStorage.setItem('billflow_profiles_list', JSON.stringify(profiles));
    },
    createProfile(name) {
      const trimmed = name.trim() || 'New Business Profile';
      const id = 'biz_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
      const profiles = this.getProfiles();
      profiles.push({ id, name: trimmed });
      this.saveProfiles(profiles);

      // Clean empty stores for new business
      const cleanSettings = {
        businessName: trimmed,
        ownerName: '',
        phone: '',
        address: '',
        gstin: '',
        invoicePrefix: 'INV-',
        nextNumber: 1001,
        currency: '₹'
      };
      localStorage.setItem(`billflow_${id}_settings`, JSON.stringify(cleanSettings));
      localStorage.setItem(`billflow_${id}_products`, JSON.stringify([]));
      localStorage.setItem(`billflow_${id}_customers`, JSON.stringify([]));
      localStorage.setItem(`billflow_${id}_invoices`, JSON.stringify([]));

      currentProfile = id;
      localStorage.setItem('billflow_active_profile', id);
      return id;
    },
    switchProfile(id) {
      const profiles = this.getProfiles();
      if (!profiles.some(p => p.id === id)) {
        id = 'default';
      }
      currentProfile = id;
      localStorage.setItem('billflow_active_profile', id);
      this.init();
    },
    init() {
      // Ensure profiles list is persisted
      if (!localStorage.getItem('billflow_profiles_list')) {
        localStorage.setItem('billflow_profiles_list', JSON.stringify(defaultProfiles));
      }

      if (currentProfile === 'default') {
        if (!localStorage.getItem(storageKey('settings'))) {
          localStorage.setItem(storageKey('settings'), JSON.stringify(defaultSettings));
        }
        if (!localStorage.getItem(storageKey('products'))) {
          localStorage.setItem(storageKey('products'), JSON.stringify(defaultProducts));
        }
        if (!localStorage.getItem(storageKey('customers'))) {
          localStorage.setItem(storageKey('customers'), JSON.stringify(defaultCustomers));
        }
        if (!localStorage.getItem(storageKey('invoices'))) {
          localStorage.setItem(storageKey('invoices'), JSON.stringify(defaultInvoices));
        }
      } else {
        if (!localStorage.getItem(storageKey('settings'))) {
          const profiles = this.getProfiles();
          const p = profiles.find(x => x.id === currentProfile);
          const name = p ? p.name : 'Business Workspace';
          localStorage.setItem(storageKey('settings'), JSON.stringify({
            businessName: name,
            ownerName: '',
            phone: '',
            address: '',
            gstin: '',
            invoicePrefix: 'INV-',
            nextNumber: 1001,
            currency: '₹'
          }));
        }
        if (!localStorage.getItem(storageKey('products'))) {
          localStorage.setItem(storageKey('products'), JSON.stringify([]));
        }
        if (!localStorage.getItem(storageKey('customers'))) {
          localStorage.setItem(storageKey('customers'), JSON.stringify([]));
        }
        if (!localStorage.getItem(storageKey('invoices'))) {
          localStorage.setItem(storageKey('invoices'), JSON.stringify([]));
        }
      }
    },
    getSettings() {
      try {
        return JSON.parse(localStorage.getItem(storageKey('settings'))) || defaultSettings;
      } catch (e) {
        return defaultSettings;
      }
    },
    saveSettings(settings) {
      localStorage.setItem(storageKey('settings'), JSON.stringify(settings));
    },
    getProducts() {
      try {
        return JSON.parse(localStorage.getItem(storageKey('products'))) || [];
      } catch (e) {
        return [];
      }
    },
    saveProducts(products) {
      localStorage.setItem(storageKey('products'), JSON.stringify(products));
    },
    getCustomers() {
      try {
        return JSON.parse(localStorage.getItem(storageKey('customers'))) || [];
      } catch (e) {
        return [];
      }
    },
    saveCustomers(customers) {
      localStorage.setItem(storageKey('customers'), JSON.stringify(customers));
    },
    getInvoices() {
      try {
        return JSON.parse(localStorage.getItem(storageKey('invoices'))) || [];
      } catch (e) {
        return [];
      }
    },
    saveInvoices(invoices) {
      localStorage.setItem(storageKey('invoices'), JSON.stringify(invoices));
    },
    exportBackup() {
      const backup = {
        profile: currentProfile,
        exportedAt: new Date().toISOString(),
        settings: this.getSettings(),
        products: this.getProducts(),
        customers: this.getCustomers(),
        invoices: this.getInvoices()
      };
      return JSON.stringify(backup, null, 2);
    },
    importBackup(jsonData) {
      try {
        const data = JSON.parse(jsonData);
        if (data.settings) this.saveSettings(data.settings);
        if (data.products) this.saveProducts(data.products);
        if (data.customers) this.saveCustomers(data.customers);
        if (data.invoices) this.saveInvoices(data.invoices);
        return true;
      } catch (e) {
        console.error('Import failed', e);
        return false;
      }
    }
  };

  // Initialize store
  Store.init();

  // --- DATA NORMALIZER LAYER ---
  const Normalizer = {
    settings(biz) {
      if (!biz) return null;
      return {
        businessName: biz.name || biz.businessName || 'My Business',
        ownerName: biz.owner_name || biz.ownerName || '',
        phone: biz.phone || '',
        address: biz.address || '',
        gstin: biz.gstin || '',
        invoicePrefix: biz.invoice_prefix || biz.invoicePrefix || 'INV-',
        nextNumber: Number(biz.next_number !== undefined ? biz.next_number : biz.nextNumber) || 1001,
        currency: biz.currency || '₹'
      };
    },
    product(prod) {
      if (!prod) return null;
      return {
        id: prod.id,
        businessId: prod.business_id || prod.businessId,
        name: prod.name,
        type: prod.type || 'product',
        sku: prod.sku || '',
        category: prod.category || 'General',
        price: Number(prod.price) || 0,
        costPrice: Number(prod.cost_price !== undefined ? prod.cost_price : prod.costPrice) || 0,
        stock: Number(prod.stock) || 0,
        createdAt: prod.created_at || prod.createdAt
      };
    },
    customer(cust) {
      if (!cust) return null;
      return {
        id: cust.id,
        businessId: cust.business_id || cust.businessId,
        name: cust.name,
        phone: cust.phone || '',
        email: cust.email || '',
        address: cust.address || '',
        createdAt: cust.created_at || cust.createdAt || (typeof Utils !== 'undefined' ? Utils.todayYMD() : '2026-09-20')
      };
    },
    invoice(inv) {
      if (!inv) return null;
      return {
        id: inv.id,
        businessId: inv.business_id || inv.businessId,
        invoiceNumber: inv.invoice_number || inv.invoiceNumber,
        customerId: inv.customer_id || inv.customerId,
        customerName: inv.customer_name || inv.customerName,
        customerPhone: inv.customer_phone || inv.customerPhone || '',
        customerEmail: inv.customer_email || inv.customerEmail || '',
        customerAddress: inv.customer_address || inv.customerAddress || '',
        date: inv.invoice_date || inv.date,
        dueDate: inv.due_date || inv.dueDate || inv.invoice_date || inv.date,
        items: (inv.items || []).map(it => ({
          id: it.id,
          productId: it.product_id || it.productId,
          name: it.name,
          sku: it.sku || '',
          qty: Number(it.qty) || 1,
          price: Number(it.price) || 0,
          total: Number(it.total) || 0
        })),
        subtotal: Number(inv.subtotal) || 0,
        discountType: inv.discount_type || inv.discountType || 'percent',
        discountValue: Number(inv.discount_value !== undefined ? inv.discount_value : inv.discountValue) || 0,
        discountAmount: Number(inv.discount_amount !== undefined ? inv.discount_amount : inv.discountAmount) || 0,
        taxRate: Number(inv.tax_rate !== undefined ? inv.tax_rate : inv.taxRate) || 0,
        taxAmount: Number(inv.tax_amount !== undefined ? inv.tax_amount : inv.taxAmount) || 0,
        grandTotal: Number(inv.grand_total !== undefined ? inv.grand_total : inv.grandTotal) || 0,
        paymentMethod: inv.payment_method || inv.paymentMethod || 'Cash',
        paymentStatus: inv.payment_status || inv.paymentStatus || 'Pending',
        paidAmount: Number(inv.paid_amount !== undefined ? inv.paid_amount : inv.paidAmount) || 0,
        balanceDue: Number(inv.balance_due !== undefined ? inv.balance_due : inv.balanceDue) || 0,
        notes: inv.notes || '',
        createdAt: inv.created_at || inv.createdAt || new Date().toISOString()
      };
    }
  };

  // --- CLOUD API CLIENT ---
  const ApiClient = {
    async fetchMe() {
      const res = await fetch('/api/auth/me');
      return res.json();
    },
    async login(email, password) {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      return res.json();
    },
    async signup(fullName, businessName, email, password) {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, businessName, email, password })
      });
      return res.json();
    },
    async logout() {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      return res.json();
    },
    async fetchBusinesses() {
      const res = await fetch('/api/businesses');
      return res.json();
    },
    async fetchBusiness(businessId) {
      const res = await fetch(`/api/businesses/${businessId}`);
      return res.json();
    },
    async createBusiness(name) {
      const res = await fetch('/api/businesses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      return res.json();
    },
    async updateBusiness(businessId, data) {
      const res = await fetch(`/api/businesses/${businessId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return res.json();
    },
    async fetchProducts(businessId) {
      const res = await fetch(`/api/products?businessId=${encodeURIComponent(businessId)}`);
      return res.json();
    },
    async createProduct(businessId, data) {
      const res = await fetch(`/api/products?businessId=${encodeURIComponent(businessId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return res.json();
    },
    async updateProduct(businessId, productId, data) {
      const res = await fetch(`/api/products/${productId}?businessId=${encodeURIComponent(businessId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return res.json();
    },
    async deleteProduct(businessId, productId) {
      const res = await fetch(`/api/products/${productId}?businessId=${encodeURIComponent(businessId)}`, {
        method: 'DELETE'
      });
      return res.json();
    },
    async fetchCustomers(businessId) {
      const res = await fetch(`/api/customers?businessId=${encodeURIComponent(businessId)}`);
      return res.json();
    },
    async createCustomer(businessId, data) {
      const res = await fetch(`/api/customers?businessId=${encodeURIComponent(businessId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return res.json();
    },
    async updateCustomer(businessId, customerId, data) {
      const res = await fetch(`/api/customers/${customerId}?businessId=${encodeURIComponent(businessId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return res.json();
    },
    async deleteCustomer(businessId, customerId) {
      const res = await fetch(`/api/customers/${customerId}?businessId=${encodeURIComponent(businessId)}`, {
        method: 'DELETE'
      });
      return res.json();
    },
    async fetchInvoices(businessId) {
      const res = await fetch(`/api/invoices?businessId=${encodeURIComponent(businessId)}`);
      return res.json();
    },
    async createInvoice(businessId, data) {
      const res = await fetch(`/api/invoices?businessId=${encodeURIComponent(businessId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return res.json();
    },
    async updateInvoice(businessId, invoiceId, data) {
      const res = await fetch(`/api/invoices/${invoiceId}?businessId=${encodeURIComponent(businessId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return res.json();
    },
    async deleteInvoice(businessId, invoiceId) {
      const res = await fetch(`/api/invoices/${invoiceId}?businessId=${encodeURIComponent(businessId)}`, {
        method: 'DELETE'
      });
      return res.json();
    },
    async sendAiQuery(businessId, prompt, customerName = '', customerPhone = '') {
      const res = await fetch(`/api/ai?businessId=${encodeURIComponent(businessId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, customerName, customerPhone })
      });
      return res.json();
    },
    async fetchAnalytics(businessId, range = '7days') {
      const res = await fetch(`/api/analytics?businessId=${encodeURIComponent(businessId)}&range=${encodeURIComponent(range)}&date=${encodeURIComponent(Utils.todayYMD())}`);
      return res.json();
    }
  };

  // --- UTILITY FUNCTIONS ---
  const Utils = {
    formatCurrency(amount, symbol) {
      const s = symbol !== undefined ? symbol : (Store.getSettings().currency || '₹');
      const num = Number(amount) || 0;
      return `${s}${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    },
    formatDate(dateStr) {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    },
    todayYMD() {
      const d = new Date();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${d.getFullYear()}-${month}-${day}`;
    },
    addDays(dateStr, days) {
      const d = new Date(dateStr);
      d.setDate(d.getDate() + days);
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${d.getFullYear()}-${month}-${day}`;
    },
    escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    },
    generateId(prefix = 'id_') {
      return prefix + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }
  };

  // --- TOAST NOTIFICATIONS ---
  const Toast = {
    show(message, type = 'default') {
      let container = document.getElementById('toast-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
      }
      const toast = document.createElement('div');
      toast.className = `toast ${type}`;
      let icon = '🔔';
      if (type === 'success') icon = '✓';
      if (type === 'error') icon = '⚠';
      toast.innerHTML = `<span>${icon}</span><span>${Utils.escapeHtml(message)}</span>`;
      container.appendChild(toast);
      setTimeout(() => toast.classList.add('show'), 10);
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
      }, 3500);
    }
  };

  // --- MODAL CONTROLLER ---
  const Modal = {
    open(modalId) {
      const modal = document.getElementById(modalId);
      if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
      }
    },
    close(modalId) {
      const modal = document.getElementById(modalId);
      if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
      }
      if (modalId === 'modal-product' && typeof ProductController !== 'undefined') {
        ProductController.editingId = null;
      }
      if (modalId === 'modal-customer' && typeof CustomerController !== 'undefined') {
        CustomerController.editingId = null;
      }
    },
    closeAll() {
      document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('show'));
      document.body.style.overflow = '';
      if (typeof ProductController !== 'undefined') ProductController.editingId = null;
      if (typeof CustomerController !== 'undefined') CustomerController.editingId = null;
    }
  };

  // Global window modal toggle
  window.closeModal = (id) => Modal.close(id);

  // --- NAVIGATION CONTROLLER ---
  const Navigation = {
    currentView: 'dashboard',
    init() {
      // Bind both desktop sidebar buttons and mobile bottom navigation items
      document.querySelectorAll('.nav button[data-view], .mobile-bottom-nav button[data-view]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const view = btn.getAttribute('data-view');
          if (view === 'create-invoice' || InvoiceController.editingInvoiceId) {
            InvoiceController.resetForm();
          }
          this.switchView(view);
          if (window.innerWidth <= 768) {
            window.toggleSidebar(false);
          }
        });
      });
    },
    switchView(viewName) {
      // If leaving edit mode without saving, discard uncommitted edit session
      if (this.currentView === 'create-invoice' && viewName !== 'create-invoice' && InvoiceController.editingInvoiceId) {
        InvoiceController.resetForm();
      }

      this.currentView = viewName;
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      const activeViewEl = document.getElementById(`view-${viewName}`);
      if (activeViewEl) {
        activeViewEl.classList.add('active');
        // Scroll to top on view change
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }

      // Update sidebar nav active classes
      document.querySelectorAll('.nav button[data-view]').forEach(b => {
        if (b.getAttribute('data-view') === viewName) {
          b.classList.add('active');
        } else {
          b.classList.remove('active');
        }
      });

      // Update mobile bottom nav active classes
      document.querySelectorAll('.mobile-bottom-nav button[data-view]').forEach(b => {
        if (b.getAttribute('data-view') === viewName) {
          b.classList.add('active');
        } else {
          b.classList.remove('active');
        }
      });

      // Trigger view renders
      if (viewName === 'dashboard') DashboardController.render();
      if (viewName === 'sales-analysis') SalesAnalysisController.render();
      if (viewName === 'invoices') InvoicesListController.render();
      if (viewName === 'customers') CustomerController.renderList();
      if (viewName === 'products') ProductController.renderList();
      if (viewName === 'settings') SettingsController.loadSettings();
      if (viewName === 'create-invoice') InvoiceController.syncFormWithSettings();
      if (viewName === 'ai-billing') AiBillingController.init();
      if (viewName === 'voice-billing') VoiceBillingController.init();

      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // --- DASHBOARD CONTROLLER ---
  const DashboardController = {
    render() {
      const invoices = Store.getInvoices();
      const settings = Store.getSettings();
      const today = Utils.todayYMD();
      const todayUtc = new Date().toISOString().split('T')[0];

      let todaySales = 0;
      let totalPaid = 0;
      let totalPending = 0;
      let totalCount = invoices.length;

      invoices.forEach(inv => {
        const invDate = String(inv.date || '').split('T')[0];
        if (invDate === today || invDate === todayUtc) {
          todaySales += Number(inv.grandTotal || 0);
        }
        totalPaid += Number(inv.paidAmount || 0);
        totalPending += Number(inv.balanceDue || 0);
      });

      // Update stat cards
      const statToday = document.getElementById('stat-today-sales');
      if (statToday) statToday.textContent = Utils.formatCurrency(todaySales, settings.currency);

      const statCount = document.getElementById('stat-total-invoices');
      if (statCount) statCount.textContent = totalCount;

      const statPaid = document.getElementById('stat-paid-amount');
      if (statPaid) statPaid.textContent = Utils.formatCurrency(totalPaid, settings.currency);

      const statPending = document.getElementById('stat-pending-amount');
      if (statPending) statPending.textContent = Utils.formatCurrency(totalPending, settings.currency);

      // Update badge in sidebar
      const navBadge = document.getElementById('nav-invoices-badge');
      if (navBadge) navBadge.textContent = totalCount;

      // Render recent invoices (top 5)
      const recentTbody = document.getElementById('dashboard-recent-tbody');
      if (recentTbody) {
        if (invoices.length === 0) {
          recentTbody.innerHTML = `<tr><td colspan="6" class="empty-state"><p>No invoices created yet. Click "+ Create Invoice" to get started!</p></td></tr>`;
          return;
        }

        const sorted = [...invoices].sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
        const recent = sorted.slice(0, 5);

        recentTbody.innerHTML = recent.map(inv => {
          let statusClass = 'pending';
          if (inv.paymentStatus === 'Paid') statusClass = 'paid';
          if (inv.paymentStatus === 'Partial') statusClass = 'partial';

          return `
            <tr>
              <td><strong style="cursor:pointer;color:var(--p)" onclick="window.viewInvoice('${inv.id}')">#${Utils.escapeHtml(inv.invoiceNumber)}</strong></td>
              <td>${Utils.escapeHtml(inv.customerName || 'N/A')}</td>
              <td>${inv.items ? inv.items.length : 1} item(s)</td>
              <td><strong>${Utils.formatCurrency(inv.grandTotal, settings.currency)}</strong></td>
              <td><span class="status ${statusClass}">${Utils.escapeHtml(inv.paymentStatus)}</span></td>
              <td>${Utils.formatDate(inv.date)}</td>
            </tr>
          `;
        }).join('');
      }
    }
  };

  // --- BUSINESS SALES ANALYSIS & PROFIT/LOSS CONTROLLER ---
  const SalesAnalysisController = {
    activeRange: '7days',
    cachedData: null,

    init() {
      // Range button click handlers
      document.querySelectorAll('.analysis-filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const range = btn.getAttribute('data-range') || '7days';
          this.setRange(range);
        });
      });
    },

    setRange(range) {
      this.activeRange = range;
      document.querySelectorAll('.analysis-filter-btn').forEach(btn => {
        if (btn.getAttribute('data-range') === range) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
      this.render();
    },

    async render() {
      const settings = Store.getSettings();
      const currency = settings.currency || '₹';

      // Update range period text
      const periodMap = {
        today: 'Today (आज)',
        '7days': 'Last 7 Days',
        '30days': 'Last 30 Days',
        this_month: 'This Month',
        all: 'All Time'
      };
      const periodEl = document.getElementById('analysis-chart-period');
      if (periodEl) periodEl.textContent = periodMap[this.activeRange] || 'Last 7 Days';

      let analyticsData = null;

      if (AuthController.isAuthenticated()) {
        const activeBizId = AuthController.getActiveBusinessId();
        try {
          const res = await ApiClient.fetchAnalytics(activeBizId, this.activeRange);
          if (res && res.summary) {
            analyticsData = res;
          }
        } catch (err) {
          console.warn('Could not fetch cloud analytics, falling back to local calculation', err);
        }
      }

      // Local Calculation if not authenticated or offline
      if (!analyticsData) {
        analyticsData = this.computeLocalAnalytics(this.activeRange, currency);
      }

      this.cachedData = analyticsData;

      // 1. Update Stat Cards
      const summary = analyticsData.summary || {};
      const elSales = document.getElementById('analysis-stat-sales');
      if (elSales) elSales.textContent = Utils.formatCurrency(summary.totalSales || 0, currency);

      const elProfit = document.getElementById('analysis-stat-profit');
      if (elProfit) elProfit.textContent = Utils.formatCurrency(summary.netProfit || 0, currency);

      const elMargin = document.getElementById('analysis-margin-badge');
      if (elMargin) {
        const m = Number(summary.profitMargin) || 0;
        elMargin.textContent = `${m >= 0 ? '+' : ''}${m.toFixed(1)}% Margin`;
        elMargin.style.background = m >= 0 ? 'var(--success-bg)' : 'var(--danger-bg)';
        elMargin.style.color = m >= 0 ? 'var(--success)' : 'var(--danger)';
      }

      const elInvoices = document.getElementById('analysis-stat-invoices');
      if (elInvoices) elInvoices.textContent = summary.totalInvoices || 0;

      const elAov = document.getElementById('analysis-stat-aov');
      if (elAov) elAov.textContent = Utils.formatCurrency(summary.avgOrderValue || 0, currency);

      const elPaid = document.getElementById('analysis-stat-paid');
      if (elPaid) elPaid.textContent = Utils.formatCurrency(summary.paidAmount || 0, currency);

      const elPending = document.getElementById('analysis-stat-pending');
      if (elPending) elPending.textContent = Utils.formatCurrency(summary.pendingAmount || 0, currency);

      const elCost = document.getElementById('analysis-stat-cost');
      if (elCost) elCost.textContent = Utils.formatCurrency(summary.totalCost || 0, currency);

      // 2. Update Profit & Loss Meters
      const totSales = summary.totalSales || 0;
      const totCost = summary.totalCost || 0;
      const netProfit = summary.netProfit || 0;

      const pnlSales = document.getElementById('pnl-sales-val');
      if (pnlSales) pnlSales.textContent = Utils.formatCurrency(totSales, currency);

      const pnlCost = document.getElementById('pnl-cost-val');
      if (pnlCost) pnlCost.textContent = Utils.formatCurrency(totCost, currency);

      const pnlProfit = document.getElementById('pnl-profit-val');
      if (pnlProfit) pnlProfit.textContent = Utils.formatCurrency(netProfit, currency);

      const pnlSalesBar = document.getElementById('pnl-sales-bar');
      if (pnlSalesBar) pnlSalesBar.style.width = totSales > 0 ? '100%' : '0%';

      const pnlCostBar = document.getElementById('pnl-cost-bar');
      if (pnlCostBar) {
        const costPct = totSales > 0 ? Math.min(100, Math.round((totCost / totSales) * 100)) : 0;
        pnlCostBar.style.width = `${costPct}%`;
      }

      const pnlProfitBar = document.getElementById('pnl-profit-bar');
      if (pnlProfitBar) {
        const profPct = totSales > 0 ? Math.min(100, Math.max(0, Math.round((netProfit / totSales) * 100))) : 0;
        pnlProfitBar.style.width = `${profPct}%`;
      }

      const healthMsg = document.getElementById('pnl-health-msg');
      const healthBox = document.getElementById('pnl-summary-box');
      if (healthMsg && healthBox) {
        if (totSales === 0) {
          healthMsg.textContent = 'No sales recorded for this timeframe yet.';
          healthBox.style.background = 'var(--bg)';
        } else if (netProfit > 0) {
          healthMsg.textContent = `Excellent! Business is generating a healthy ${summary.profitMargin}% net profit margin.`;
          healthBox.style.background = 'var(--success-bg)';
        } else if (netProfit === 0) {
          healthMsg.textContent = 'Business is currently at break-even point.';
          healthBox.style.background = 'var(--warning-bg)';
        } else {
          healthMsg.textContent = 'Warning: Costs exceed revenue for this period.';
          healthBox.style.background = 'var(--danger-bg)';
        }
      }

      // 3. Render Interactive Daily Sales SVG Chart
      this.renderDailySalesChart(analyticsData.dailyTrend || [], currency);

      // 4. Render Top Products
      this.renderTopProducts(analyticsData.topProducts || [], currency, totSales);

      // 5. Render Payment Modes
      this.renderPaymentBreakdown(analyticsData.paymentBreakdown || {}, currency, totSales);

      // 6. Render Daily Sales Log Table
      this.renderDailyLogTable(analyticsData.dailyTrend || [], currency);
    },

    computeLocalAnalytics(range, currency) {
      const invoices = Store.getInvoices();
      const products = Store.getProducts();
      const now = new Date();
      const todayStr = Utils.todayYMD();
      const todayUtc = now.toISOString().split('T')[0];

      let startDate = new Date();
      if (range === 'today') {
        startDate.setHours(0, 0, 0, 0);
      } else if (range === '7days') {
        startDate.setDate(startDate.getDate() - 6);
        startDate.setHours(0, 0, 0, 0);
      } else if (range === '30days') {
        startDate.setDate(startDate.getDate() - 29);
        startDate.setHours(0, 0, 0, 0);
      } else if (range === 'this_month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (range === 'all') {
        startDate = new Date(2000, 0, 1);
      }

      const startMonth = String(startDate.getMonth() + 1).padStart(2, '0');
      const startDay = String(startDate.getDate()).padStart(2, '0');
      const startDateStr = `${startDate.getFullYear()}-${startMonth}-${startDay}`;

      const filteredInvoices = invoices.filter(inv => {
        const invDate = String(inv.date || '').split('T')[0];
        if (!invDate) return false;
        if (range === 'today') {
          return invDate === todayStr || invDate === todayUtc;
        }
        if (range === 'this_month') {
          const cMonth = todayStr.substring(0, 7);
          const uMonth = todayUtc.substring(0, 7);
          return invDate.startsWith(cMonth) || invDate.startsWith(uMonth);
        }
        if (range === 'all') {
          return true;
        }
        return invDate >= startDateStr;
      });

      let totalSales = 0;
      let totalPaid = 0;
      let totalPending = 0;
      let totalCost = 0;
      let productSalesMap = {};
      let paymentMethodMap = { Cash: 0, UPI: 0, 'Bank Transfer': 0, Card: 0, Cheque: 0, Other: 0 };
      let dailyMap = {};

      // Pre-fill all dates for 7-day range so every day shows cleanly on graph
      if (range === '7days') {
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          const dStr = `${d.getFullYear()}-${m}-${day}`;
          dailyMap[dStr] = { date: dStr, invoicesCount: 0, sales: 0, cost: 0, profit: 0 };
        }
      }

      filteredInvoices.forEach(inv => {
        const invDate = String(inv.date || '').split('T')[0];
        const gTotal = Number(inv.grandTotal) || 0;
        const paid = Number(inv.paidAmount) || 0;
        const due = Number(inv.balanceDue) || 0;

        totalSales += gTotal;
        totalPaid += paid;
        totalPending += due;

        const pMethod = inv.paymentMethod || 'Cash';
        if (paymentMethodMap[pMethod] !== undefined) {
          paymentMethodMap[pMethod] += gTotal;
        } else {
          paymentMethodMap['Other'] = (paymentMethodMap['Other'] || 0) + gTotal;
        }

        let invoiceCost = 0;
        const items = inv.items || [];
        if (items.length > 0) {
          items.forEach(it => {
            const qty = Number(it.qty) || 1;
            const price = Number(it.price) || 0;
            const total = Number(it.total) || (price * qty);
            const prod = products.find(p => p.id === it.productId || (p.name && p.name.toLowerCase() === (it.name || '').toLowerCase()));
            const unitCost = prod && (prod.costPrice !== undefined || prod.cost_price !== undefined)
              ? Number(prod.costPrice || prod.cost_price || 0)
              : (price * 0.70);
            const itemCost = unitCost * qty;
            invoiceCost += itemCost;

            const pName = it.name || (prod ? prod.name : 'Unknown Item');
            if (!productSalesMap[pName]) {
              productSalesMap[pName] = { name: pName, qty: 0, revenue: 0, profit: 0 };
            }
            productSalesMap[pName].qty += qty;
            productSalesMap[pName].revenue += total;
            productSalesMap[pName].profit += (total - itemCost);
          });
        } else {
          invoiceCost = gTotal * 0.70;
        }

        totalCost += invoiceCost;
        const netProfit = gTotal - invoiceCost;

        if (!dailyMap[invDate]) {
          dailyMap[invDate] = { date: invDate, invoicesCount: 0, sales: 0, cost: 0, profit: 0 };
        }
        dailyMap[invDate].invoicesCount += 1;
        dailyMap[invDate].sales += gTotal;
        dailyMap[invDate].cost += invoiceCost;
        dailyMap[invDate].profit += netProfit;
      });

      const netProfit = totalSales - totalCost;
      const profitMargin = totalSales > 0 ? ((netProfit / totalSales) * 100) : 0;
      const avgOrderValue = filteredInvoices.length > 0 ? (totalSales / filteredInvoices.length) : 0;

      const dailyTrend = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));
      const topProducts = Object.values(productSalesMap).sort((a, b) => b.revenue - a.revenue).slice(0, 6);

      return {
        range,
        currency,
        summary: {
          totalSales: Math.round(totalSales * 100) / 100,
          totalCost: Math.round(totalCost * 100) / 100,
          netProfit: Math.round(netProfit * 100) / 100,
          profitMargin: Math.round(profitMargin * 10) / 10,
          totalInvoices: filteredInvoices.length,
          avgOrderValue: Math.round(avgOrderValue * 100) / 100,
          paidAmount: Math.round(totalPaid * 100) / 100,
          pendingAmount: Math.round(totalPending * 100) / 100
        },
        dailyTrend,
        topProducts,
        paymentBreakdown: paymentMethodMap
      };
    },

    renderDailySalesChart(dailyTrend, currency) {
      const container = document.getElementById('daily-sales-chart-container');
      if (!container) return;

      if (!dailyTrend || dailyTrend.length === 0 || dailyTrend.every(d => d.sales === 0)) {
        container.innerHTML = `
          <div style="text-align:center;padding:30px 10px;color:var(--muted)">
            <div style="font-size:32px;margin-bottom:8px">📊</div>
            <strong>No sales recorded for this time range</strong>
            <p style="font-size:12px;margin-top:4px">Create invoices or AI Counter Bills to see your sales & profit trend graph.</p>
          </div>
        `;
        return;
      }

      const maxSales = Math.max(...dailyTrend.map(d => d.sales), 100);
      const chartHeight = 150;
      const chartWidth = 540;
      const barWidth = Math.max(14, Math.min(36, Math.floor((chartWidth - 60) / dailyTrend.length) - 10));
      const xSpacing = (chartWidth - 60) / dailyTrend.length;

      let barsSvg = '';
      dailyTrend.forEach((day, idx) => {
        const barH = Math.max(4, Math.round((day.sales / maxSales) * chartHeight));
        const x = 40 + idx * xSpacing + (xSpacing - barWidth) / 2;
        const y = 180 - barH;

        const dateObj = new Date(day.date + 'T00:00:00');
        const dayLabel = isNaN(dateObj.getTime()) ? day.date : dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

        const barColor = day.sales > 0 ? 'url(#barGradientSales)' : 'var(--line)';

        barsSvg += `
          <g class="chart-bar-group">
            <rect x="${x - 4}" y="10" width="${barWidth + 8}" height="180" fill="transparent">
              <title>${dayLabel}: Sales ${Utils.formatCurrency(day.sales, currency)} | Profit ${Utils.formatCurrency(day.profit, currency)} (${day.invoicesCount} bills)</title>
            </rect>
            <rect x="${x}" y="20" width="${barWidth}" height="${chartHeight + 10}" rx="4" fill="var(--bg)" opacity="0.6" />
            <rect class="chart-bar-rect" x="${x}" y="${y}" width="${barWidth}" height="${barH}" rx="4" fill="${barColor}">
              <title>${dayLabel}: Sales ${Utils.formatCurrency(day.sales, currency)} | Profit ${Utils.formatCurrency(day.profit, currency)}</title>
            </rect>
            ${day.sales > 0 ? `<text x="${x + barWidth / 2}" y="${y - 5}" text-anchor="middle" font-size="10" font-weight="700" fill="var(--ink)">${Math.round(day.sales)}</text>` : ''}
            <text x="${x + barWidth / 2}" y="200" text-anchor="middle" font-size="11" fill="var(--muted)" font-weight="500">${dayLabel}</text>
          </g>
        `;
      });

      container.innerHTML = `
        <svg class="chart-svg" viewBox="0 0 ${chartWidth} 215" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="barGradientSales" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#6366f1" />
              <stop offset="100%" stop-color="#4f46e5" />
            </linearGradient>
            <linearGradient id="barGradientProfit" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#22c55e" />
              <stop offset="100%" stop-color="#15803d" />
            </linearGradient>
          </defs>
          <line x1="30" y1="20" x2="${chartWidth - 10}" y2="20" stroke="var(--line)" stroke-dasharray="3,3" />
          <line x1="30" y1="100" x2="${chartWidth - 10}" y2="100" stroke="var(--line)" stroke-dasharray="3,3" />
          <line x1="30" y1="180" x2="${chartWidth - 10}" y2="180" stroke="var(--line)" />
          <text x="25" y="24" text-anchor="end" font-size="10" fill="var(--muted)">${Math.round(maxSales)}</text>
          <text x="25" y="104" text-anchor="end" font-size="10" fill="var(--muted)">${Math.round(maxSales / 2)}</text>
          <text x="25" y="184" text-anchor="end" font-size="10" fill="var(--muted)">0</text>
          ${barsSvg}
        </svg>
      `;
    },

    renderTopProducts(topProducts, currency, totalSales) {
      const container = document.getElementById('analysis-top-products-list');
      if (!container) return;

      if (!topProducts || topProducts.length === 0) {
        container.innerHTML = `<div class="muted" style="font-size:12px;text-align:center;padding:16px">No products sold in this period.</div>`;
        return;
      }

      container.innerHTML = topProducts.map((p, idx) => {
        const share = totalSales > 0 ? Math.round((p.revenue / totalSales) * 100) : 0;
        return `
          <div class="analysis-product-row">
            <div style="flex:1;min-width:0;margin-right:12px">
              <div style="display:flex;align-items:center;gap:6px">
                <span style="font-size:11px;font-weight:700;color:var(--p);background:var(--p-light);padding:1px 6px;border-radius:4px">#${idx + 1}</span>
                <strong style="font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${Utils.escapeHtml(p.name)}</strong>
              </div>
              <div style="font-size:11px;color:var(--muted);margin-top:2px">${p.qty} unit(s) sold • ${share}% of total sales</div>
            </div>
            <div style="text-align:right">
              <strong style="font-size:13px;color:var(--ink)">${Utils.formatCurrency(p.revenue, currency)}</strong>
              <div style="font-size:11px;color:var(--success);font-weight:600">+${Utils.formatCurrency(p.profit, currency)} profit</div>
            </div>
          </div>
        `;
      }).join('');
    },

    renderPaymentBreakdown(paymentMap, currency, totalSales) {
      const container = document.getElementById('analysis-payment-list');
      if (!container) return;

      const entries = Object.entries(paymentMap).filter(([_, val]) => val > 0);
      if (entries.length === 0) {
        container.innerHTML = `<div class="muted" style="font-size:12px;text-align:center;padding:16px">No payment records found.</div>`;
        return;
      }

      const icons = { Cash: '💵', UPI: '📱', 'Bank Transfer': '🏦', Card: '💳', Cheque: '📝', Other: '🪙' };

      container.innerHTML = entries.map(([method, amount]) => {
        const pct = totalSales > 0 ? Math.round((amount / totalSales) * 100) : 0;
        const icon = icons[method] || '💵';
        return `
          <div class="analysis-payment-row">
            <div style="display:flex;align-items:center;gap:8px">
              <span style="font-size:18px">${icon}</span>
              <div>
                <strong style="font-size:13px">${Utils.escapeHtml(method)}</strong>
                <div style="font-size:11px;color:var(--muted)">${pct}% of all transactions</div>
              </div>
            </div>
            <strong style="font-size:13px;color:var(--ink)">${Utils.formatCurrency(amount, currency)}</strong>
          </div>
        `;
      }).join('');
    },

    renderDailyLogTable(dailyTrend, currency) {
      const tbody = document.getElementById('analysis-daily-tbody');
      if (!tbody) return;

      const activeDays = (dailyTrend || []).filter(d => d.sales > 0 || d.invoicesCount > 0);
      if (activeDays.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="empty-state"><p>No sales activity recorded for this period.</p></td></tr>`;
        return;
      }

      const sorted = [...activeDays].sort((a, b) => b.date.localeCompare(a.date));

      tbody.innerHTML = sorted.map(d => {
        const margin = d.sales > 0 ? ((d.profit / d.sales) * 100) : 0;
        const isProfitable = d.profit >= 0;
        const statusClass = isProfitable ? 'paid' : 'pending';
        const statusText = isProfitable ? 'Profitable (लाभ)' : 'Loss (हानि)';

        return `
          <tr>
            <td><strong>${Utils.formatDate(d.date)}</strong></td>
            <td><span class="badge" style="background:var(--bg);border:1px solid var(--line);padding:2px 8px;border-radius:6px">${d.invoicesCount} bill(s)</span></td>
            <td><strong>${Utils.formatCurrency(d.sales, currency)}</strong></td>
            <td class="muted">${Utils.formatCurrency(d.cost, currency)}</td>
            <td><strong style="color:${isProfitable ? 'var(--success)' : 'var(--danger)'}">${Utils.formatCurrency(d.profit, currency)}</strong></td>
            <td><span class="badge-profit" style="${!isProfitable ? 'background:var(--danger-bg);color:var(--danger)' : ''}">${margin.toFixed(1)}%</span></td>
            <td><span class="status ${statusClass}">${statusText}</span></td>
          </tr>
        `;
      }).join('');
    }
  };

  window.exportSalesAnalysisCSV = function () {
    if (!SalesAnalysisController.cachedData || !SalesAnalysisController.cachedData.dailyTrend) {
      Toast.show('No data available to export', 'error');
      return;
    }

    const data = SalesAnalysisController.cachedData.dailyTrend;
    let csvContent = 'Date,Invoices Count,Total Sales,Estimated Cost,Net Profit,Profit Margin Percent\n';
    data.forEach(d => {
      const m = d.sales > 0 ? ((d.profit / d.sales) * 100).toFixed(1) : '0.0';
      csvContent += `"${d.date}",${d.invoicesCount},${d.sales.toFixed(2)},${d.cost.toFixed(2)},${d.profit.toFixed(2)},${m}%\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Business_Sales_Profit_Analysis_${SalesAnalysisController.activeRange}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    Toast.show('Sales Analysis report exported as CSV!', 'success');
  };

  // --- SETTINGS CONTROLLER ---
  const SettingsController = {
    init() {
      const form = document.getElementById('form-settings');
      if (form) {
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          this.saveSettings();
        });
      }

      const btnExport = document.getElementById('btn-export-backup');
      if (btnExport) {
        btnExport.addEventListener('click', () => this.exportBackup());
      }

      const fileInput = document.getElementById('input-import-backup');
      if (fileInput) {
        fileInput.addEventListener('change', (e) => this.importBackup(e));
      }

      const profileSelect = document.getElementById('settings-profile-select');
      if (profileSelect) {
        this.renderProfileDropdown();
        profileSelect.addEventListener('change', async (e) => {
          const selectedId = e.target.value;
          Store.switchProfile(selectedId);
          const p = Store.getProfiles().find(x => x.id === selectedId);
          Toast.show(`Switched to business workspace: ${p ? p.name : selectedId}`, 'success');
          if (AuthController.isAuthenticated()) {
            await AuthController.syncFromCloud(selectedId);
          } else {
            this.refreshAllDataViews();
          }
        });
      }

      const btnNewProfile = document.getElementById('btn-create-profile');
      if (btnNewProfile) {
        btnNewProfile.addEventListener('click', () => {
          document.getElementById('form-new-profile').reset();
          Modal.open('modal-new-profile');
        });
      }

      const formNewProfile = document.getElementById('form-new-profile');
      if (formNewProfile) {
        formNewProfile.addEventListener('submit', async (e) => {
          e.preventDefault();
          const nameInput = document.getElementById('new-profile-name');
          const name = nameInput ? nameInput.value.trim() : '';
          if (!name) {
            Toast.show('Profile name is required', 'error');
            return;
          }

          if (AuthController.isAuthenticated()) {
            try {
              const res = await ApiClient.createBusiness(name);
              if (res.success && res.business) {
                const profiles = Store.getProfiles();
                profiles.push({ id: res.business.id, name: res.business.name });
                Store.saveProfiles(profiles);
                currentProfile = res.business.id;
                localStorage.setItem('billflow_active_profile', res.business.id);
                Modal.close('modal-new-profile');
                await AuthController.syncFromCloud(res.business.id);
                Toast.show(`Created and switched to business workspace: "${name}"`, 'success');
                return;
              }
            } catch (err) {
              console.warn('Could not create cloud business profile', err);
            }
          }

          Store.createProfile(name);
          Modal.close('modal-new-profile');
          this.renderProfileDropdown();
          this.refreshAllDataViews();
          Toast.show(`Created and switched to business workspace: "${name}"`, 'success');
        });
      }
    },
    renderProfileDropdown() {
      const profileSelect = document.getElementById('settings-profile-select');
      if (!profileSelect) return;
      const profiles = Store.getProfiles();
      profileSelect.innerHTML = '';
      profiles.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.name;
        if (p.id === currentProfile) opt.selected = true;
        profileSelect.appendChild(opt);
      });
    },
    refreshAllDataViews() {
      this.loadSettings();
      DashboardController.render();
      InvoiceController.resetForm();
      InvoiceController.syncFormWithSettings();
      InvoicesListController.render();
      CustomerController.renderList();
      ProductController.renderList();
    },
    loadSettings() {
      const settings = Store.getSettings();
      const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val !== undefined ? val : '';
      };
      setVal('setting-business-name', settings.businessName);
      setVal('setting-owner-name', settings.ownerName);
      setVal('setting-phone', settings.phone);
      setVal('setting-address', settings.address);
      setVal('setting-gstin', settings.gstin);
      setVal('setting-prefix', settings.invoicePrefix);
      setVal('setting-next-number', settings.nextNumber);
      setVal('setting-currency', settings.currency);

      // Update global business displays
      this.updateGlobalBranding(settings);
    },
    async saveSettings() {
      const settings = {
        businessName: document.getElementById('setting-business-name').value.trim() || 'My Business',
        ownerName: document.getElementById('setting-owner-name').value.trim(),
        phone: document.getElementById('setting-phone').value.trim(),
        address: document.getElementById('setting-address').value.trim(),
        gstin: document.getElementById('setting-gstin').value.trim(),
        invoicePrefix: document.getElementById('setting-prefix').value.trim() || 'INV-',
        nextNumber: parseInt(document.getElementById('setting-next-number').value, 10) || 1001,
        currency: document.getElementById('setting-currency').value.trim() || '₹'
      };

      Store.saveSettings(settings);
      this.updateGlobalBranding(settings);
      InvoiceController.syncFormWithSettings();

      if (AuthController.isAuthenticated()) {
        const activeBizId = AuthController.getActiveBusinessId();
        if (activeBizId && activeBizId !== 'default') {
          try {
            await ApiClient.updateBusiness(activeBizId, {
              name: settings.businessName,
              ownerName: settings.ownerName,
              phone: settings.phone,
              address: settings.address,
              gstin: settings.gstin,
              invoicePrefix: settings.invoicePrefix,
              nextNumber: settings.nextNumber,
              currency: settings.currency
            });
          } catch (err) {
            console.warn('Cloud settings update issue', err);
          }
        }
      }

      Toast.show('Business settings updated successfully!', 'success');
    },
    updateGlobalBranding(settings) {
      document.querySelectorAll('.display-business-name').forEach(el => {
        el.textContent = settings.businessName;
      });
      document.querySelectorAll('.display-business-address').forEach(el => {
        el.textContent = settings.address || 'Address not configured';
      });
      document.querySelectorAll('.display-business-phone').forEach(el => {
        el.textContent = settings.phone ? `Phone: ${settings.phone}` : '';
      });
      document.querySelectorAll('.display-business-gstin').forEach(el => {
        el.textContent = settings.gstin ? `GSTIN: ${settings.gstin}` : '';
        if (el.classList.contains('tag')) {
          el.style.display = settings.gstin ? 'inline-block' : 'none';
        }
      });
    },
    exportBackup() {
      const json = Store.exportBackup();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `billflow_${currentProfile}_backup_${Utils.todayYMD()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      Toast.show('Backup data downloaded', 'success');
    },
    importBackup(e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const success = Store.importBackup(event.target.result);
        if (success) {
          Toast.show('Backup restored successfully!', 'success');
          this.loadSettings();
          DashboardController.render();
          InvoicesListController.render();
          CustomerController.renderList();
          ProductController.renderList();
        } else {
          Toast.show('Invalid backup file format.', 'error');
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    }
  };

  // --- PRODUCT & SERVICE CONTROLLER ---
  const ProductController = {
    editingId: null,
    init() {
      const searchInput = document.getElementById('product-search');
      if (searchInput) {
        searchInput.addEventListener('input', () => this.renderList());
      }
      const catFilter = document.getElementById('product-category-filter');
      if (catFilter) {
        catFilter.addEventListener('change', () => this.renderList());
      }

      const btnAdd = document.getElementById('btn-add-product');
      if (btnAdd) {
        btnAdd.addEventListener('click', () => this.openAddModal());
      }

      const form = document.getElementById('form-product');
      if (form) {
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          this.saveProduct();
        });
      }

      const typeSelect = document.getElementById('prod-type');
      if (typeSelect) {
        typeSelect.addEventListener('change', (e) => {
          const stockField = document.getElementById('prod-stock-field');
          if (stockField) {
            stockField.style.display = e.target.value === 'service' ? 'none' : 'flex';
          }
        });
      }
    },
    renderList() {
      const tbody = document.getElementById('products-tbody');
      if (!tbody) return;

      const products = Store.getProducts();
      const settings = Store.getSettings();
      const query = (document.getElementById('product-search')?.value || '').toLowerCase().trim();
      const cat = document.getElementById('product-category-filter')?.value || 'all';

      // Update category filter dropdown options
      const catSelect = document.getElementById('product-category-filter');
      if (catSelect && catSelect.options.length <= 1) {
        const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
        categories.forEach(c => {
          const opt = document.createElement('option');
          opt.value = c;
          opt.textContent = c;
          catSelect.appendChild(opt);
        });
      }

      const filtered = products.filter(p => {
        const matchesQuery = (p.name || '').toLowerCase().includes(query) || (p.sku || '').toLowerCase().includes(query);
        const matchesCat = cat === 'all' || p.category === cat;
        return matchesQuery && matchesCat;
      });

      if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="empty-state"><div class="empty-state-icon">▣</div><h3>No products or services found</h3><p>Click "+ Add Product / Service" to add items to your catalog.</p></td></tr>`;
        return;
      }

      tbody.innerHTML = filtered.map(p => {
        const isService = p.type === 'service';
        const typeBadge = isService
          ? `<span class="status" style="background:#f3e8ff;color:#7e22ce">Service</span>`
          : `<span class="status" style="background:#ecfdf5;color:#047857">Product</span>`;

        let stockDisplay = isService ? '<span class="muted">—</span>' : `${p.stock || 0}`;
        if (!isService && (p.stock || 0) <= 5) {
          stockDisplay = `<span class="status pending" title="Low Stock">${p.stock || 0} (Low)</span>`;
        }

        return `
          <tr>
            <td><strong>${Utils.escapeHtml(p.name)}</strong></td>
            <td>${typeBadge}</td>
            <td><code>${Utils.escapeHtml(p.sku || '—')}</code></td>
            <td><span class="tag">${Utils.escapeHtml(p.category || 'General')}</span></td>
            <td><strong>${Utils.formatCurrency(p.price, settings.currency)}</strong></td>
            <td>${stockDisplay}</td>
            <td>
              <div class="actions" style="justify-content:flex-start">
                <button class="btn btn-sm" onclick="window.editProduct('${p.id}')">Edit</button>
                <button class="btn btn-sm danger" onclick="window.deleteProduct('${p.id}')">Delete</button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    },
    openAddModal() {
      this.editingId = null;
      document.getElementById('modal-product-title').textContent = 'Add Product / Service';
      document.getElementById('form-product').reset();
      const costEl = document.getElementById('prod-cost-price');
      if (costEl) costEl.value = '';
      document.getElementById('prod-stock-field').style.display = 'flex';
      Modal.open('modal-product');
    },
    openEditModal(id) {
      const products = Store.getProducts();
      const product = products.find(p => p.id === id);
      if (!product) return;

      this.editingId = id;
      document.getElementById('modal-product-title').textContent = 'Edit Product / Service';
      document.getElementById('prod-name').value = product.name || '';
      document.getElementById('prod-type').value = product.type || 'product';
      document.getElementById('prod-sku').value = product.sku || '';
      document.getElementById('prod-category').value = product.category || '';
      document.getElementById('prod-price').value = product.price || 0;
      const costEl = document.getElementById('prod-cost-price');
      if (costEl) costEl.value = product.costPrice !== undefined ? product.costPrice : (product.cost_price !== undefined ? product.cost_price : '');
      document.getElementById('prod-stock').value = product.stock || 0;

      const stockField = document.getElementById('prod-stock-field');
      if (stockField) {
        stockField.style.display = product.type === 'service' ? 'none' : 'flex';
      }

      Modal.open('modal-product');
    },
    async saveProduct() {
      const name = document.getElementById('prod-name').value.trim();
      const type = document.getElementById('prod-type').value;
      const sku = document.getElementById('prod-sku').value.trim();
      const category = document.getElementById('prod-category').value.trim() || 'General';
      const price = parseFloat(document.getElementById('prod-price').value) || 0;
      const costPrice = Math.max(0, parseFloat(document.getElementById('prod-cost-price')?.value) || 0);
      const stock = type === 'service' ? 0 : (parseInt(document.getElementById('prod-stock').value, 10) || 0);

      if (!name) {
        Toast.show('Item name is required', 'error');
        return;
      }
      if (price < 0) {
        Toast.show('Price cannot be negative', 'error');
        return;
      }

      const products = Store.getProducts();

      if (this.editingId) {
        if (AuthController.isAuthenticated()) {
          const activeBizId = AuthController.getActiveBusinessId();
          try {
            const res = await ApiClient.updateProduct(activeBizId, this.editingId, { name, type, sku, category, price, costPrice, stock });
            if (res.product) {
              const norm = Normalizer.product(res.product);
              const idx = products.findIndex(p => p.id === this.editingId);
              if (idx !== -1) products[idx] = norm;
              Store.saveProducts(products);
              Toast.show('Item updated successfully', 'success');
              Modal.close('modal-product');
              this.renderList();
              InvoiceController.populateProductDropdowns();
              if (typeof SalesAnalysisController !== 'undefined') SalesAnalysisController.render();
              return;
            }
          } catch (err) {
            console.warn('Cloud product update issue', err);
          }
        }
        const index = products.findIndex(p => p.id === this.editingId);
        if (index !== -1) {
          products[index] = { ...products[index], name, type, sku, category, price, costPrice, stock };
          Store.saveProducts(products);
          Toast.show('Item updated successfully', 'success');
        }
      } else {
        if (AuthController.isAuthenticated()) {
          const activeBizId = AuthController.getActiveBusinessId();
          try {
            const res = await ApiClient.createProduct(activeBizId, { name, type, sku, category, price, costPrice, stock });
            if (res.product) {
              const norm = Normalizer.product(res.product);
              products.push(norm);
              Store.saveProducts(products);
              Toast.show('Item added to catalog', 'success');
              Modal.close('modal-product');
              this.renderList();
              InvoiceController.populateProductDropdowns();
              if (typeof SalesAnalysisController !== 'undefined') SalesAnalysisController.render();
              return;
            }
          } catch (err) {
            console.warn('Cloud product creation issue', err);
          }
        }
        const newProduct = {
          id: Utils.generateId('prod_'),
          name,
          type,
          sku,
          category,
          price,
          costPrice,
          stock
        };
        products.push(newProduct);
        Store.saveProducts(products);
        Toast.show('Item added to catalog', 'success');
      }

      Modal.close('modal-product');
      this.renderList();
      InvoiceController.populateProductDropdowns();
      if (typeof SalesAnalysisController !== 'undefined') SalesAnalysisController.render();
    },
    async delete(id) {
      const products = Store.getProducts();
      const prod = products.find(p => p.id === id);
      if (!prod) return;

      if (confirm(`Are you sure you want to delete "${prod.name}"?`)) {
        if (AuthController.isAuthenticated()) {
          const activeBizId = AuthController.getActiveBusinessId();
          try {
            await ApiClient.deleteProduct(activeBizId, id);
          } catch (err) {
            console.warn('Cloud product deletion issue', err);
          }
        }
        const updated = products.filter(p => p.id !== id);
        Store.saveProducts(updated);
        Toast.show('Item deleted from catalog', 'success');
        this.renderList();
        InvoiceController.populateProductDropdowns();
      }
    }
  };

  window.editProduct = (id) => ProductController.openEditModal(id);
  window.deleteProduct = (id) => ProductController.delete(id);

  // --- CUSTOMER CONTROLLER ---
  const CustomerController = {
    editingId: null,
    init() {
      const searchInput = document.getElementById('customer-search');
      if (searchInput) {
        searchInput.addEventListener('input', () => this.renderList());
      }

      const btnAdd = document.getElementById('btn-add-customer');
      if (btnAdd) {
        btnAdd.addEventListener('click', () => this.openAddModal());
      }

      const form = document.getElementById('form-customer');
      if (form) {
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          this.saveCustomer();
        });
      }
    },
    renderList() {
      const tbody = document.getElementById('customers-tbody');
      if (!tbody) return;

      const customers = Store.getCustomers();
      const invoices = Store.getInvoices();
      const settings = Store.getSettings();
      const query = (document.getElementById('customer-search')?.value || '').toLowerCase().trim();

      const filtered = customers.filter(c => {
        return (c.name || '').toLowerCase().includes(query) ||
               (c.phone || '').toLowerCase().includes(query) ||
               (c.email || '').toLowerCase().includes(query);
      });

      if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="empty-state"><div class="empty-state-icon">♙</div><h3>No customers found</h3><p>Click "+ Add Customer" to register your clients.</p></td></tr>`;
        return;
      }

      tbody.innerHTML = filtered.map(c => {
        // Calculate customer stats from invoices
        const custInvoices = invoices.filter(inv => inv.customerId === c.id || inv.customerName === c.name);
        const invCount = custInvoices.length;
        const totalBilled = custInvoices.reduce((sum, inv) => sum + (Number(inv.grandTotal) || 0), 0);
        const totalPending = custInvoices.reduce((sum, inv) => sum + (Number(inv.balanceDue) || 0), 0);

        return `
          <tr>
            <td><strong>${Utils.escapeHtml(c.name)}</strong></td>
            <td>${Utils.escapeHtml(c.phone || '—')}</td>
            <td>${Utils.escapeHtml(c.email || '—')}</td>
            <td><small class="muted">${Utils.escapeHtml(c.address || '—')}</small></td>
            <td><strong>${invCount}</strong> bills</td>
            <td><strong>${Utils.formatCurrency(totalBilled, settings.currency)}</strong></td>
            <td>
              ${totalPending > 0
                ? `<span class="status pending">${Utils.formatCurrency(totalPending, settings.currency)}</span>`
                : `<span class="status paid">₹0.00</span>`
              }
            </td>
            <td>
              <div class="actions" style="justify-content:flex-start">
                <button class="btn btn-sm" onclick="window.viewCustomerHistory('${c.id}')" title="Billing History">History</button>
                <button class="btn btn-sm" onclick="window.editCustomer('${c.id}')">Edit</button>
                <button class="btn btn-sm danger" onclick="window.deleteCustomer('${c.id}')">Delete</button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    },
    openAddModal() {
      this.editingId = null;
      document.getElementById('modal-customer-title').textContent = 'Add Customer';
      document.getElementById('form-customer').reset();
      Modal.open('modal-customer');
    },
    openEditModal(id) {
      const customers = Store.getCustomers();
      const customer = customers.find(c => c.id === id);
      if (!customer) return;

      this.editingId = id;
      document.getElementById('modal-customer-title').textContent = 'Edit Customer';
      document.getElementById('cust-name').value = customer.name || '';
      document.getElementById('cust-phone').value = customer.phone || '';
      document.getElementById('cust-email').value = customer.email || '';
      document.getElementById('cust-address').value = customer.address || '';
      Modal.open('modal-customer');
    },
    async saveCustomer() {
      const name = document.getElementById('cust-name').value.trim();
      const phone = document.getElementById('cust-phone').value.trim();
      const email = document.getElementById('cust-email').value.trim();
      const address = document.getElementById('cust-address').value.trim();

      if (!name) {
        Toast.show('Customer name is required', 'error');
        return;
      }
      if (!phone) {
        Toast.show('Customer phone number is required', 'error');
        return;
      }

      const customers = Store.getCustomers();

      if (this.editingId) {
        if (AuthController.isAuthenticated()) {
          const activeBizId = AuthController.getActiveBusinessId();
          try {
            const res = await ApiClient.updateCustomer(activeBizId, this.editingId, { name, phone, email, address });
            if (res.customer) {
              const norm = Normalizer.customer(res.customer);
              const idx = customers.findIndex(c => c.id === this.editingId);
              if (idx !== -1) customers[idx] = norm;
              Store.saveCustomers(customers);
              Toast.show('Customer updated successfully', 'success');
              Modal.close('modal-customer');
              this.renderList();
              InvoiceController.populateCustomerDropdown();
              return;
            }
          } catch (err) {
            console.warn('Cloud customer update issue', err);
          }
        }
        const index = customers.findIndex(c => c.id === this.editingId);
        if (index !== -1) {
          customers[index] = { ...customers[index], name, phone, email, address };
          Store.saveCustomers(customers);
          Toast.show('Customer updated successfully', 'success');
        }
      } else {
        if (AuthController.isAuthenticated()) {
          const activeBizId = AuthController.getActiveBusinessId();
          try {
            const res = await ApiClient.createCustomer(activeBizId, { name, phone, email, address });
            if (res.customer) {
              const norm = Normalizer.customer(res.customer);
              customers.push(norm);
              Store.saveCustomers(customers);
              Toast.show('Customer added successfully', 'success');
              Modal.close('modal-customer');
              this.renderList();
              InvoiceController.populateCustomerDropdown();
              return;
            }
          } catch (err) {
            console.warn('Cloud customer creation issue', err);
          }
        }
        const newCustomer = {
          id: Utils.generateId('cust_'),
          name,
          phone,
          email,
          address,
          createdAt: Utils.todayYMD()
        };
        customers.push(newCustomer);
        Store.saveCustomers(customers);
        Toast.show('Customer added successfully', 'success');
      }

      Modal.close('modal-customer');
      this.renderList();
      InvoiceController.populateCustomerDropdown();
    },
    viewHistory(id) {
      const customers = Store.getCustomers();
      const customer = customers.find(c => c.id === id);
      if (!customer) return;

      const invoices = Store.getInvoices();
      const settings = Store.getSettings();
      const custInvoices = invoices.filter(inv => inv.customerId === customer.id || inv.customerName === customer.name);

      const totalBilled = custInvoices.reduce((sum, inv) => sum + (Number(inv.grandTotal) || 0), 0);
      const totalPaid = custInvoices.reduce((sum, inv) => sum + (Number(inv.paidAmount) || 0), 0);
      const totalPending = custInvoices.reduce((sum, inv) => sum + (Number(inv.balanceDue) || 0), 0);

      document.getElementById('history-customer-name').textContent = customer.name;
      document.getElementById('history-customer-details').textContent = `${customer.phone} • ${customer.email || 'No email'} • ${customer.address || 'No address'}`;

      document.getElementById('history-total-invoices').textContent = custInvoices.length;
      document.getElementById('history-total-billed').textContent = Utils.formatCurrency(totalBilled, settings.currency);
      document.getElementById('history-total-paid').textContent = Utils.formatCurrency(totalPaid, settings.currency);
      document.getElementById('history-total-pending').textContent = Utils.formatCurrency(totalPending, settings.currency);

      const tbody = document.getElementById('history-invoices-tbody');
      if (custInvoices.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="empty-state"><p>No billing history found for this customer.</p></td></tr>`;
      } else {
        tbody.innerHTML = custInvoices.map(inv => {
          let statusClass = 'pending';
          if (inv.paymentStatus === 'Paid') statusClass = 'paid';
          if (inv.paymentStatus === 'Partial') statusClass = 'partial';

          return `
            <tr>
              <td><strong>#${Utils.escapeHtml(inv.invoiceNumber)}</strong></td>
              <td>${Utils.formatDate(inv.date)}</td>
              <td><strong>${Utils.formatCurrency(inv.grandTotal, settings.currency)}</strong></td>
              <td><span class="status ${statusClass}">${Utils.escapeHtml(inv.paymentStatus)}</span></td>
              <td><button class="btn btn-sm" onclick="window.viewInvoice('${inv.id}')">View</button></td>
            </tr>
          `;
        }).join('');
      }

      Modal.open('modal-customer-history');
    },
    async delete(id) {
      const customers = Store.getCustomers();
      const customer = customers.find(c => c.id === id);
      if (!customer) return;

      if (confirm(`Are you sure you want to delete customer "${customer.name}"?`)) {
        if (AuthController.isAuthenticated()) {
          const activeBizId = AuthController.getActiveBusinessId();
          try {
            await ApiClient.deleteCustomer(activeBizId, id);
          } catch (err) {
            console.warn('Cloud customer deletion issue', err);
          }
        }
        const updated = customers.filter(c => c.id !== id);
        Store.saveCustomers(updated);
        Toast.show('Customer deleted', 'success');
        this.renderList();
        InvoiceController.populateCustomerDropdown();
      }
    }
  };

  window.editCustomer = (id) => CustomerController.openEditModal(id);
  window.deleteCustomer = (id) => CustomerController.delete(id);
  window.viewCustomerHistory = (id) => CustomerController.viewHistory(id);

  // --- INVOICE CONTROLLER (CREATE & EDIT & LIVE PREVIEW) ---
  const InvoiceController = {
    editingInvoiceId: null,
    items: [],
    init() {
      // "+ Add Line Item" button
      const btnAddItem = document.getElementById('btn-add-line-item');
      if (btnAddItem) {
        btnAddItem.addEventListener('click', () => this.addItemRow());
      }

      // Customer select change
      const customerSelect = document.getElementById('inv-customer-select');
      if (customerSelect) {
        customerSelect.addEventListener('change', (e) => this.onCustomerChange(e.target.value));
      }

      // Quick add customer button inside invoice form
      const btnQuickCustomer = document.getElementById('btn-quick-add-customer');
      if (btnQuickCustomer) {
        btnQuickCustomer.addEventListener('click', () => CustomerController.openAddModal());
      }

      // Calculation trigger inputs
      const triggerIds = ['inv-discount-value', 'inv-discount-type', 'inv-tax-rate', 'inv-custom-tax', 'inv-payment-status', 'inv-payment-method', 'inv-paid-amount', 'inv-notes', 'inv-number', 'inv-date', 'inv-due-date'];
      triggerIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.addEventListener('input', () => this.recalculate());
          el.addEventListener('change', () => this.recalculate());
        }
      });

      // Tax select dropdown handler (toggle custom tax input)
      const taxSelect = document.getElementById('inv-tax-rate');
      if (taxSelect) {
        taxSelect.addEventListener('change', (e) => {
          const customInput = document.getElementById('inv-custom-tax');
          if (customInput) {
            customInput.style.display = e.target.value === 'custom' ? 'block' : 'none';
          }
          this.recalculate();
        });
      }

      // Payment status change (toggle paid amount field)
      const payStatusSelect = document.getElementById('inv-payment-status');
      if (payStatusSelect) {
        payStatusSelect.addEventListener('change', (e) => {
          const paidField = document.getElementById('inv-paid-amount-field');
          if (paidField) {
            paidField.style.display = e.target.value === 'Partial' ? 'flex' : 'none';
          }
          this.recalculate();
        });
      }

      // Save Invoice Buttons
      const btnSaveInvoice = document.getElementById('btn-save-invoice');
      if (btnSaveInvoice) {
        btnSaveInvoice.addEventListener('click', () => this.saveInvoice(false));
      }
      const btnSaveDraft = document.getElementById('btn-save-draft');
      if (btnSaveDraft) {
        btnSaveDraft.addEventListener('click', () => this.saveInvoice(true));
      }

      // Cancel Edit Button
      const btnCancelEdit = document.getElementById('btn-cancel-edit');
      if (btnCancelEdit) {
        btnCancelEdit.addEventListener('click', () => this.cancelEdit());
      }

      // Preview action buttons
      const btnPrint = document.getElementById('preview-btn-print');
      if (btnPrint) {
        btnPrint.addEventListener('click', () => {
          document.body.classList.remove('printing-modal');
          window.print();
        });
      }
      const btnPdf = document.getElementById('preview-btn-pdf');
      if (btnPdf) {
        btnPdf.addEventListener('click', () => {
          document.body.classList.remove('printing-modal');
          window.print();
        });
      }
      const btnThermal = document.getElementById('preview-btn-thermal');
      if (btnThermal) {
        btnThermal.addEventListener('click', () => {
          const data = this.collectFormData();
          ThermalReceiptController.openModal(data);
        });
      }
      const btnWhatsapp = document.getElementById('preview-btn-whatsapp');
      if (btnWhatsapp) {
        btnWhatsapp.addEventListener('click', () => this.shareWhatsApp());
      }
      const btnEmail = document.getElementById('preview-btn-email');
      if (btnEmail) {
        btnEmail.addEventListener('click', () => this.shareEmail());
      }

      // Initialize form with fresh empty row
      this.resetForm();
    },
    syncFormWithSettings() {
      const settings = Store.getSettings();
      if (!this.editingInvoiceId) {
        const invNumInput = document.getElementById('inv-number');
        if (invNumInput) {
          invNumInput.value = `${settings.invoicePrefix}${settings.nextNumber}`;
        }
      }
      this.populateCustomerDropdown();
      this.populateProductDropdowns();
      this.recalculate();
    },
    populateCustomerDropdown() {
      const select = document.getElementById('inv-customer-select');
      if (!select) return;

      const currentVal = select.value;
      const customers = Store.getCustomers();

      select.innerHTML = '<option value="">-- Select or Type Customer --</option>';
      customers.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = `${c.name} (${c.phone})`;
        select.appendChild(opt);
      });

      if (currentVal) select.value = currentVal;
    },
    populateProductDropdowns() {
      const selects = document.querySelectorAll('.line-item-prod-select');
      const products = Store.getProducts();

      selects.forEach(sel => {
        const cur = sel.value;
        sel.innerHTML = '<option value="">-- Select Product / Service --</option>';
        products.forEach(p => {
          const opt = document.createElement('option');
          opt.value = p.id;
          opt.textContent = `${p.name} [₹${p.price}]`;
          sel.appendChild(opt);
        });
        const optCustom = document.createElement('option');
        optCustom.value = 'custom';
        optCustom.textContent = '✎ Custom Item...';
        sel.appendChild(optCustom);
        if (cur) sel.value = cur;
      });
    },
    onCustomerChange(customerId) {
      const customers = Store.getCustomers();
      const customer = customers.find(c => c.id === customerId);
      const nameInput = document.getElementById('inv-customer-name');
      const phoneInput = document.getElementById('inv-customer-phone');
      const addressInput = document.getElementById('inv-customer-address');

      if (customer) {
        if (nameInput) nameInput.value = customer.name;
        if (phoneInput) phoneInput.value = customer.phone;
        if (addressInput) addressInput.value = customer.address || '';
      }
      this.recalculate();
    },
    addItemRow(itemData = null) {
      const tbody = document.getElementById('line-items-tbody');
      if (!tbody) return;

      const rowId = Utils.generateId('row_');
      const tr = document.createElement('tr');
      tr.id = rowId;
      tr.className = 'line-item-row';

      const products = Store.getProducts();
      let productOptions = '<option value="">-- Select Product / Service --</option>';
      products.forEach(p => {
        const selected = itemData && itemData.productId === p.id ? 'selected' : '';
        productOptions += `<option value="${p.id}" ${selected}>${Utils.escapeHtml(p.name)} [₹${p.price}]</option>`;
      });
      productOptions += `<option value="custom" ${itemData && !itemData.productId ? 'selected' : ''}>✎ Custom Item...</option>`;

      const initialQty = itemData && itemData.qty >= 1 ? itemData.qty : 1;
      const initialPrice = itemData ? itemData.price : 0;

      tr.innerHTML = `
        <td style="width: 35%">
          <select class="line-item-prod-select" onchange="window.invoiceItemProductChanged('${rowId}', this.value)">
            ${productOptions}
          </select>
          <input type="text" class="line-item-name" placeholder="Item description" style="margin-top:4px" value="${itemData ? Utils.escapeHtml(itemData.name) : ''}">
        </td>
        <td style="width: 15%">
          <input type="text" class="line-item-sku" placeholder="SKU" value="${itemData ? Utils.escapeHtml(itemData.sku || '') : ''}">
        </td>
        <td style="width: 15%">
          <input type="number" class="line-item-qty" min="1" step="1" value="${initialQty}" oninput="window.invoiceRecalculate()">
        </td>
        <td style="width: 18%">
          <input type="number" class="line-item-price" min="0" step="any" value="${initialPrice}" oninput="window.invoiceRecalculate()">
        </td>
        <td style="width: 12%; text-align: right">
          <span class="row-total">₹0.00</span>
        </td>
        <td style="width: 5%; text-align: center">
          <button type="button" class="btn-close" onclick="window.removeInvoiceItemRow('${rowId}')" title="Remove item">✕</button>
        </td>
      `;

      tbody.appendChild(tr);
      this.recalculate();
    },
    removeItemRow(rowId) {
      const tbody = document.getElementById('line-items-tbody');
      if (!tbody) return;

      if (tbody.children.length <= 1) {
        Toast.show('An invoice must have at least one line item', 'error');
        return;
      }

      const row = document.getElementById(rowId);
      if (row) {
        row.remove();
        this.recalculate();
      }
    },
    onItemProductChanged(rowId, productId) {
      const row = document.getElementById(rowId);
      if (!row) return;

      const nameInput = row.querySelector('.line-item-name');
      const skuInput = row.querySelector('.line-item-sku');
      const priceInput = row.querySelector('.line-item-price');

      if (productId === 'custom' || !productId) {
        if (productId === 'custom') {
          if (nameInput) {
            nameInput.value = '';
            nameInput.focus();
          }
          if (skuInput) skuInput.value = '';
          if (priceInput) priceInput.value = 0;
        }
      } else {
        const products = Store.getProducts();
        const prod = products.find(p => p.id === productId);
        if (prod) {
          if (nameInput) nameInput.value = prod.name;
          if (skuInput) skuInput.value = prod.sku || '';
          if (priceInput) priceInput.value = prod.price || 0;
        }
      }
      this.recalculate();
    },
    resetForm() {
      this.editingInvoiceId = null;
      this.originalInvoiceSnapshot = null;

      const titleEl = document.getElementById('invoice-form-title');
      if (titleEl) titleEl.textContent = 'Create a new invoice';

      const btnSave = document.getElementById('btn-save-invoice');
      if (btnSave) btnSave.textContent = 'Generate Invoice →';

      const btnCancel = document.getElementById('btn-cancel-edit');
      if (btnCancel) btnCancel.style.display = 'none';

      const settings = Store.getSettings();

      const invNumInput = document.getElementById('inv-number');
      if (invNumInput) invNumInput.value = `${settings.invoicePrefix}${settings.nextNumber}`;

      const dateInput = document.getElementById('inv-date');
      if (dateInput) dateInput.value = Utils.todayYMD();

      const dueDateInput = document.getElementById('inv-due-date');
      if (dueDateInput) dueDateInput.value = Utils.addDays(Utils.todayYMD(), 7);

      const custSelect = document.getElementById('inv-customer-select');
      if (custSelect) custSelect.value = '';

      const custName = document.getElementById('inv-customer-name');
      if (custName) custName.value = '';

      const custPhone = document.getElementById('inv-customer-phone');
      if (custPhone) custPhone.value = '';

      const custAddress = document.getElementById('inv-customer-address');
      if (custAddress) custAddress.value = '';

      const discountVal = document.getElementById('inv-discount-value');
      if (discountVal) discountVal.value = '0';

      const taxRate = document.getElementById('inv-tax-rate');
      if (taxRate) taxRate.value = '18';

      const customTax = document.getElementById('inv-custom-tax');
      if (customTax) {
        customTax.style.display = 'none';
        customTax.value = '';
      }

      const payMethod = document.getElementById('inv-payment-method');
      if (payMethod) payMethod.value = 'Cash';

      const payStatus = document.getElementById('inv-payment-status');
      if (payStatus) payStatus.value = 'Paid';

      const notes = document.getElementById('inv-notes');
      if (notes) notes.value = 'Thank you for your business!';

      const paidField = document.getElementById('inv-paid-amount-field');
      if (paidField) paidField.style.display = 'none';

      // Reset items table
      const tbody = document.getElementById('line-items-tbody');
      if (tbody) {
        tbody.innerHTML = '';
        this.addItemRow();
      }

      this.recalculate();
    },
    cancelEdit() {
      this.resetForm();
      Toast.show('Edit cancelled. Unsaved changes discarded.', 'default');
      Navigation.switchView('invoices');
    },
    loadForEdit(invoiceId) {
      const invoices = Store.getInvoices();
      const inv = invoices.find(i => i.id === invoiceId);
      if (!inv) return;

      this.editingInvoiceId = inv.id;
      this.originalInvoiceSnapshot = JSON.parse(JSON.stringify(inv));

      const titleEl = document.getElementById('invoice-form-title');
      if (titleEl) titleEl.textContent = `Edit Invoice #${inv.invoiceNumber}`;

      const btnSave = document.getElementById('btn-save-invoice');
      if (btnSave) btnSave.textContent = 'Update Invoice →';

      const btnCancel = document.getElementById('btn-cancel-edit');
      if (btnCancel) btnCancel.style.display = 'inline-flex';

      document.getElementById('inv-number').value = inv.invoiceNumber;
      document.getElementById('inv-date').value = inv.date;
      document.getElementById('inv-due-date').value = inv.dueDate || inv.date;

      this.populateCustomerDropdown();
      document.getElementById('inv-customer-select').value = inv.customerId || '';
      document.getElementById('inv-customer-name').value = inv.customerName || '';
      document.getElementById('inv-customer-phone').value = inv.customerPhone || '';
      document.getElementById('inv-customer-address').value = inv.customerAddress || '';

      document.getElementById('inv-discount-value').value = inv.discountValue || 0;
      document.getElementById('inv-discount-type').value = inv.discountType || 'percent';

      const taxSelect = document.getElementById('inv-tax-rate');
      if (['0', '5', '12', '18', '28'].includes(String(inv.taxRate))) {
        taxSelect.value = String(inv.taxRate);
        document.getElementById('inv-custom-tax').style.display = 'none';
      } else {
        taxSelect.value = 'custom';
        const customTax = document.getElementById('inv-custom-tax');
        customTax.style.display = 'block';
        customTax.value = inv.taxRate || 0;
      }

      document.getElementById('inv-payment-method').value = inv.paymentMethod || 'Cash';
      document.getElementById('inv-payment-status').value = inv.paymentStatus || 'Paid';

      const paidField = document.getElementById('inv-paid-amount-field');
      if (inv.paymentStatus === 'Partial') {
        paidField.style.display = 'flex';
        document.getElementById('inv-paid-amount').value = inv.paidAmount || 0;
      } else {
        paidField.style.display = 'none';
      }

      document.getElementById('inv-notes').value = inv.notes || '';

      // Populate items
      const tbody = document.getElementById('line-items-tbody');
      tbody.innerHTML = '';
      if (inv.items && inv.items.length > 0) {
        inv.items.forEach(item => this.addItemRow(item));
      } else {
        this.addItemRow();
      }

      Navigation.switchView('create-invoice');
      this.recalculate();
      Toast.show(`Loaded invoice #${inv.invoiceNumber} for editing`);
    },
    collectFormData() {
      const settings = Store.getSettings();
      const invoiceNumber = document.getElementById('inv-number').value.trim();
      const date = document.getElementById('inv-date').value;
      const dueDate = document.getElementById('inv-due-date').value;
      const customerId = document.getElementById('inv-customer-select').value;
      const customerName = document.getElementById('inv-customer-name').value.trim();
      const customerPhone = document.getElementById('inv-customer-phone').value.trim();
      const customerAddress = document.getElementById('inv-customer-address').value.trim();

      // Collect line items with strict quantity checks
      const rows = document.querySelectorAll('#line-items-tbody .line-item-row');
      const items = [];
      let subtotal = 0;

      rows.forEach(row => {
        const prodSelect = row.querySelector('.line-item-prod-select');
        const nameInput = row.querySelector('.line-item-name');
        const skuInput = row.querySelector('.line-item-sku');
        const qtyInput = row.querySelector('.line-item-qty');
        const priceInput = row.querySelector('.line-item-price');

        const name = nameInput ? nameInput.value.trim() : '';
        const sku = skuInput ? skuInput.value.trim() : '';
        
        // Strict positive quantity check
        const rawQty = qtyInput ? qtyInput.value.trim() : '';
        const parsedQty = parseFloat(rawQty);
        let qty = 1;
        let isQtyValid = true;

        if (!rawQty || isNaN(parsedQty) || parsedQty < 1 || !Number.isInteger(parsedQty)) {
          isQtyValid = false;
          qty = isNaN(parsedQty) ? 0 : parsedQty;
          if (qtyInput) qtyInput.style.borderColor = '#ef4444';
        } else {
          qty = parsedQty;
          if (qtyInput) qtyInput.style.borderColor = '#dfe4ec';
        }

        const price = Math.max(0, parseFloat(priceInput?.value) || 0);
        const total = isQtyValid && qty >= 1 ? qty * price : 0;
        const productId = prodSelect?.value !== 'custom' ? prodSelect?.value : null;

        if (name) {
          items.push({
            id: Utils.generateId('item_'),
            productId,
            name,
            sku,
            qty,
            isQtyValid,
            price,
            total
          });
          subtotal += total;
        }
      });

      // Discount
      const discountType = document.getElementById('inv-discount-type').value;
      const discountValue = Math.max(0, parseFloat(document.getElementById('inv-discount-value').value) || 0);
      let discountAmount = 0;
      if (discountType === 'percent') {
        discountAmount = (subtotal * discountValue) / 100;
      } else {
        discountAmount = discountValue;
      }
      if (discountAmount > subtotal) discountAmount = subtotal;

      const taxable = Math.max(0, subtotal - discountAmount);

      // Tax - strict non-negative validation
      const taxSelectVal = document.getElementById('inv-tax-rate').value;
      let taxRate = 0;
      if (taxSelectVal === 'custom') {
        const rawTax = parseFloat(document.getElementById('inv-custom-tax')?.value);
        if (isNaN(rawTax) || rawTax < 0) {
          taxRate = 0;
        } else if (rawTax > 100) {
          taxRate = 100;
        } else {
          taxRate = rawTax;
        }
      } else {
        taxRate = Math.max(0, parseFloat(taxSelectVal) || 0);
      }
      const taxAmount = (taxable * taxRate) / 100;
      const grandTotal = taxable + taxAmount;

      // Payment
      const paymentMethod = document.getElementById('inv-payment-method').value;
      const paymentStatus = document.getElementById('inv-payment-status').value;
      let paidAmount = 0;
      let balanceDue = 0;

      if (paymentStatus === 'Paid') {
        paidAmount = grandTotal;
        balanceDue = 0;
      } else if (paymentStatus === 'Pending') {
        paidAmount = 0;
        balanceDue = grandTotal;
      } else if (paymentStatus === 'Partial') {
        paidAmount = Math.max(0, parseFloat(document.getElementById('inv-paid-amount').value) || 0);
        if (paidAmount > grandTotal) paidAmount = grandTotal;
        balanceDue = Math.max(0, grandTotal - paidAmount);
      }

      const notes = document.getElementById('inv-notes').value.trim();

      return {
        invoiceNumber,
        date,
        dueDate,
        customerId,
        customerName,
        customerPhone,
        customerAddress,
        items,
        subtotal,
        discountType,
        discountValue,
        discountAmount,
        taxRate,
        taxAmount,
        grandTotal,
        paymentMethod,
        paymentStatus,
        paidAmount,
        balanceDue,
        notes
      };
    },
    recalculate() {
      const settings = Store.getSettings();
      const data = this.collectFormData();

      // Update row totals in DOM
      const rows = document.querySelectorAll('#line-items-tbody .line-item-row');
      rows.forEach(row => {
        const qty = parseFloat(row.querySelector('.line-item-qty')?.value);
        const price = Math.max(0, parseFloat(row.querySelector('.line-item-price')?.value) || 0);
        const total = !isNaN(qty) && qty >= 1 ? qty * price : 0;
        const totalEl = row.querySelector('.row-total');
        if (totalEl) totalEl.textContent = Utils.formatCurrency(total, settings.currency);
      });

      // Update Form Calculations Summary
      const summarySub = document.getElementById('calc-subtotal');
      if (summarySub) summarySub.textContent = Utils.formatCurrency(data.subtotal, settings.currency);

      const summaryDisc = document.getElementById('calc-discount');
      if (summaryDisc) summaryDisc.textContent = `-${Utils.formatCurrency(data.discountAmount, settings.currency)}`;

      const summaryTax = document.getElementById('calc-tax');
      if (summaryTax) summaryTax.textContent = Utils.formatCurrency(data.taxAmount, settings.currency);

      const summaryTotal = document.getElementById('calc-grand-total');
      if (summaryTotal) summaryTotal.textContent = Utils.formatCurrency(data.grandTotal, settings.currency);

      const summaryBalanceRow = document.getElementById('calc-balance-row');
      const summaryBalance = document.getElementById('calc-balance');
      if (summaryBalanceRow && summaryBalance) {
        if (data.paymentStatus === 'Partial' || data.paymentStatus === 'Pending') {
          summaryBalanceRow.style.display = 'flex';
          summaryBalance.textContent = Utils.formatCurrency(data.balanceDue, settings.currency);
        } else {
          summaryBalanceRow.style.display = 'none';
        }
      }

      // Update Live Side-by-Side Preview
      this.updateLivePreview(data, settings);
    },
    updateLivePreview(data, settings) {
      const previewEl = document.getElementById('live-invoice-preview');
      if (!previewEl) return;

      const itemsHtml = data.items.length > 0
        ? data.items.map(it => `
            <tr>
              <td><strong>${Utils.escapeHtml(it.name)}</strong>${it.sku ? `<br><small class="muted">${Utils.escapeHtml(it.sku)}</small>` : ''}</td>
              <td style="text-align:center">${it.qty}</td>
              <td style="text-align:right">${Utils.formatCurrency(it.price, settings.currency)}</td>
              <td style="text-align:right"><strong>${Utils.formatCurrency(it.total, settings.currency)}</strong></td>
            </tr>
          `).join('')
        : `<tr><td colspan="4" class="muted" style="text-align:center;padding:16px">No items added yet</td></tr>`;

      let statusBadgeClass = 'pending';
      if (data.paymentStatus === 'Paid') statusBadgeClass = 'paid';
      if (data.paymentStatus === 'Partial') statusBadgeClass = 'partial';

      previewEl.innerHTML = `
        <div class="invoice-paper printable-invoice">
          <div class="business-row" style="align-items:flex-start">
            <div>
              <div style="font-size:18px;font-weight:800">${Utils.escapeHtml(settings.businessName)}</div>
              <div class="muted" style="font-size:12px">${Utils.escapeHtml(settings.address)}</div>
              ${settings.phone ? `<div class="muted" style="font-size:12px">Phone: ${Utils.escapeHtml(settings.phone)}</div>` : ''}
              ${settings.gstin ? `<div class="muted" style="font-size:12px">GSTIN: ${Utils.escapeHtml(settings.gstin)}</div>` : ''}
            </div>
            <div style="text-align:right">
              <div style="font-size:18px;font-weight:900;letter-spacing:1px;color:var(--p)">TAX INVOICE</div>
              <div style="font-weight:700;font-size:13px;margin-top:4px">#${Utils.escapeHtml(data.invoiceNumber || 'INV-0000')}</div>
              <div class="status ${statusBadgeClass}" style="margin-top:6px">${Utils.escapeHtml(data.paymentStatus)}</div>
            </div>
          </div>

          <div style="display:flex;justify-content:space-between;margin-top:18px;padding-top:12px;border-top:1px solid var(--line);font-size:12px">
            <div>
              <span class="muted" style="text-transform:uppercase;font-size:10px;font-weight:800">Bill To:</span><br>
              <strong style="font-size:14px">${Utils.escapeHtml(data.customerName || 'Walk-in Customer')}</strong><br>
              ${data.customerPhone ? `<span>Phone: ${Utils.escapeHtml(data.customerPhone)}</span><br>` : ''}
              ${data.customerAddress ? `<span class="muted">${Utils.escapeHtml(data.customerAddress)}</span>` : ''}
            </div>
            <div style="text-align:right">
              <span class="muted">Date:</span> <strong>${Utils.formatDate(data.date)}</strong><br>
              <span class="muted">Due Date:</span> <strong>${Utils.formatDate(data.dueDate)}</strong><br>
              <span class="muted">Method:</span> <strong>${Utils.escapeHtml(data.paymentMethod)}</strong>
            </div>
          </div>

          <table class="invoice-list" style="margin-top:16px">
            <thead>
              <tr>
                <th>Item Description</th>
                <th style="text-align:center">Qty</th>
                <th style="text-align:right">Rate</th>
                <th style="text-align:right">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div style="display:grid;gap:6px;margin-top:14px;font-size:13px">
            <div class="business-row">
              <span class="muted">Subtotal</span>
              <b>${Utils.formatCurrency(data.subtotal, settings.currency)}</b>
            </div>
            ${data.discountAmount > 0 ? `
              <div class="business-row">
                <span class="muted">Discount (${data.discountType === 'percent' ? `${data.discountValue}%` : 'Fixed'})</span>
                <b style="color:var(--danger)">-${Utils.formatCurrency(data.discountAmount, settings.currency)}</b>
              </div>
            ` : ''}
            <div class="business-row">
              <span class="muted">GST / Tax (${data.taxRate}%)</span>
              <b>${Utils.formatCurrency(data.taxAmount, settings.currency)}</b>
            </div>
          </div>

          <div class="total">
            <span>Grand Total</span>
            <span style="color:var(--p)">${Utils.formatCurrency(data.grandTotal, settings.currency)}</span>
          </div>

          ${data.paymentStatus === 'Partial' ? `
            <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:12px">
              <span>Paid: <b>${Utils.formatCurrency(data.paidAmount, settings.currency)}</b></span>
              <span style="color:var(--warning)">Balance Due: <b>${Utils.formatCurrency(data.balanceDue, settings.currency)}</b></span>
            </div>
          ` : ''}

          ${data.notes ? `
            <div style="margin-top:16px;padding-top:10px;border-top:1px dashed var(--line);font-size:11px;color:var(--muted)">
              <strong>Notes & Terms:</strong><br>${Utils.escapeHtml(data.notes)}
            </div>
          ` : ''}
        </div>
      `;
    },
    validateInvoiceData(data) {
      const mistakes = [];
      const invalidFields = [];

      // Clear all previous mistake highlights
      document.querySelectorAll('.field-mistake').forEach(el => el.classList.remove('field-mistake'));

      // 1. Customer Name Check
      if (!data.customerName || !data.customerName.trim()) {
        mistakes.push('Customer Name is missing. Please select an existing customer or type a name (कस्टमर का नाम दर्ज करें).');
        const custNameEl = document.getElementById('inv-customer-name');
        if (custNameEl) invalidFields.push(custNameEl);
      }

      // 2. Line Items Check
      const rows = document.querySelectorAll('#line-items-tbody .line-item-row');
      if (rows.length === 0 || data.items.length === 0) {
        mistakes.push('No line items in invoice. Please click "＋ Add Item" to add products or services (बिल में कम से कम 1 आइटम जोड़ें).');
      } else {
        rows.forEach((row, idx) => {
          const nameInput = row.querySelector('.line-item-name');
          const qtyInput = row.querySelector('.line-item-qty');
          const priceInput = row.querySelector('.line-item-price');

          const name = nameInput ? nameInput.value.trim() : '';
          const rawQty = qtyInput ? qtyInput.value.trim() : '';
          const qty = parseFloat(rawQty);
          const rawPrice = priceInput ? priceInput.value.trim() : '';
          const price = parseFloat(rawPrice);

          if (!name) {
            mistakes.push(`Item #${idx + 1}: Name is empty. Please enter item name or pick a product from dropdown.`);
            if (nameInput) invalidFields.push(nameInput);
          }

          if (!rawQty || isNaN(qty) || qty < 1) {
            mistakes.push(`Item #${idx + 1} (${name || 'Item'}): Quantity is invalid (${rawQty || 'empty'}). Must be a positive number of at least 1 (मात्रा कम से कम 1 होनी चाहिए).`);
            if (qtyInput) invalidFields.push(qtyInput);
          }

          if (rawPrice === '' || isNaN(price) || price < 0) {
            mistakes.push(`Item #${idx + 1} (${name || 'Item'}): Price is invalid. Please enter a valid number.`);
            if (priceInput) invalidFields.push(priceInput);
          } else if (price === 0) {
            mistakes.push(`Item #${idx + 1} (${name || 'Item'}): Price is ₹0.00. Please enter the correct selling price (कीमत ₹0 है, सही रेट डालें).`);
            if (priceInput) invalidFields.push(priceInput);
          }
        });
      }

      // 3. Discount Check
      if (data.discountAmount > data.subtotal && data.subtotal > 0) {
        mistakes.push(`Discount (₹${data.discountAmount}) cannot exceed Subtotal (₹${data.subtotal}) (छूट कुल बिल से ज्यादा नहीं हो सकती).`);
        const discInput = document.getElementById('inv-discount-value');
        if (discInput) invalidFields.push(discInput);
      }

      // 4. Custom Tax Check
      if (document.getElementById('inv-tax-rate').value === 'custom') {
        const rawTaxVal = parseFloat(document.getElementById('inv-custom-tax')?.value);
        if (isNaN(rawTaxVal) || rawTaxVal < 0 || rawTaxVal > 100) {
          mistakes.push('Custom tax rate must be between 0% and 100% (टैक्स 0% से 100% के बीच होना चाहिए).');
          const taxInput = document.getElementById('inv-custom-tax');
          if (taxInput) invalidFields.push(taxInput);
        }
      }

      // 5. Date Consistency Check
      if (data.date && data.dueDate && data.dueDate < data.date) {
        mistakes.push(`Due Date (${data.dueDate}) cannot be earlier than Invoice Date (${data.date}) (ड्यू डेट बिल की तारीख से पहले नहीं हो सकती).`);
        const dueInput = document.getElementById('inv-due-date');
        if (dueInput) invalidFields.push(dueInput);
      }

      // 6. Partial Payment Check
      if (data.paymentStatus === 'Partial') {
        const rawPaid = parseFloat(document.getElementById('inv-paid-amount')?.value);
        if (isNaN(rawPaid) || rawPaid <= 0) {
          mistakes.push('Partial payment status selected, but Paid Amount is ₹0.00. Please enter the amount paid (भुगतान की गई राशि दर्ज करें).');
          const paidInput = document.getElementById('inv-paid-amount');
          if (paidInput) invalidFields.push(paidInput);
        } else if (rawPaid > data.grandTotal) {
          mistakes.push(`Paid amount (₹${rawPaid}) exceeds Grand Total (₹${data.grandTotal}) (भुगतान राशि कुल बिल से ज्यादा नहीं हो सकती).`);
          const paidInput = document.getElementById('inv-paid-amount');
          if (paidInput) invalidFields.push(paidInput);
        }
      }

      // 7. Duplicate Invoice Number Check
      const invoices = Store.getInvoices();
      const duplicateInv = invoices.find(i =>
        i.invoiceNumber === data.invoiceNumber && i.id !== this.editingInvoiceId
      );
      if (duplicateInv) {
        mistakes.push(`Invoice number "${data.invoiceNumber}" already exists. Please enter a unique invoice number.`);
        const invNumInput = document.getElementById('inv-number');
        if (invNumInput) invalidFields.push(invNumInput);
      }

      return {
        isValid: mistakes.length === 0,
        mistakes,
        invalidFields
      };
    },
    async saveInvoice(isDraft = false) {
      const data = this.collectFormData();
      const validation = this.validateInvoiceData(data);
      const alertBox = document.getElementById('invoice-mistake-alert');
      const alertList = document.getElementById('invoice-mistake-list');

      if (!validation.isValid) {
        // Highlight all mistaken fields
        validation.invalidFields.forEach(field => {
          if (field) field.classList.add('field-mistake');
        });

        // Focus on first invalid field
        if (validation.invalidFields.length > 0 && validation.invalidFields[0]) {
          validation.invalidFields[0].focus();
        }

        // Show mistake alert box with list of mistakes
        if (alertList) {
          alertList.innerHTML = `<ul style="margin:4px 0 0 16px;padding:0">${validation.mistakes.map(m => `<li style="margin-bottom:3px">${Utils.escapeHtml(m)}</li>`).join('')}</ul>`;
        }
        if (alertBox) {
          alertBox.style.display = 'block';
          alertBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        Toast.show('⚠️ Something is not good! Please fix the highlighted mistakes.', 'error');
        return;
      }

      // Clear alert box on success
      if (alertBox) alertBox.style.display = 'none';

      // If Customer is new (not in customer list), auto-save customer
      let customerId = data.customerId;
      if (!customerId) {
        const customers = Store.getCustomers();
        const existing = customers.find(c => c.name.toLowerCase() === data.customerName.toLowerCase());
        if (existing) {
          customerId = existing.id;
        } else {
          const newCust = {
            id: Utils.generateId('cust_'),
            name: data.customerName,
            phone: data.customerPhone || 'N/A',
            email: '',
            address: data.customerAddress || '',
            createdAt: Utils.todayYMD()
          };
          customers.push(newCust);
          Store.saveCustomers(customers);
          customerId = newCust.id;

          if (AuthController.isAuthenticated()) {
            const activeBizId = AuthController.getActiveBusinessId();
            ApiClient.createCustomer(activeBizId, newCust).catch(() => {});
          }
        }
      }

      // If authenticated, persist to cloud
      if (AuthController.isAuthenticated()) {
        const activeBizId = AuthController.getActiveBusinessId();
        try {
          const payload = {
            ...data,
            customerId,
            paymentStatus: isDraft ? 'Draft' : data.paymentStatus
          };

          if (this.editingInvoiceId) {
            const res = await ApiClient.updateInvoice(activeBizId, this.editingInvoiceId, payload);
            if (res.invoice) {
              Toast.show(`Invoice #${res.invoice.invoice_number || data.invoiceNumber} updated successfully!`, 'success');
              await AuthController.syncFromCloud(activeBizId);
              this.resetForm();
              DashboardController.render();
              if (typeof SalesAnalysisController !== 'undefined') SalesAnalysisController.render();
              Navigation.switchView('invoices');
              return;
            }
          } else {
            const res = await ApiClient.createInvoice(activeBizId, payload);
            if (res.invoice) {
              Toast.show(`Invoice #${res.invoice.invoice_number || data.invoiceNumber} generated successfully!`, 'success');
              await AuthController.syncFromCloud(activeBizId);
              this.resetForm();
              DashboardController.render();
              if (typeof SalesAnalysisController !== 'undefined') SalesAnalysisController.render();
              Navigation.switchView('invoices');
              return;
            }
          }
        } catch (err) {
          console.warn('Cloud invoice save issue, falling back to local store', err);
        }
      }

      // Stock adjustment logic (Local fallback / Demo mode)
      if (!isDraft) {
        const products = Store.getProducts();

        if (this.editingInvoiceId && this.originalInvoiceSnapshot) {
          (this.originalInvoiceSnapshot.items || []).forEach(oldIt => {
            if (oldIt.productId) {
              const prod = products.find(p => p.id === oldIt.productId);
              if (prod && prod.type === 'product') {
                prod.stock = (prod.stock || 0) + (oldIt.qty || 0);
              }
            }
          });

          data.items.forEach(newIt => {
            if (newIt.productId) {
              const prod = products.find(p => p.id === newIt.productId);
              if (prod && prod.type === 'product') {
                prod.stock = Math.max(0, (prod.stock || 0) - (newIt.qty || 0));
              }
            }
          });
        } else {
          data.items.forEach(it => {
            if (it.productId) {
              const prod = products.find(p => p.id === it.productId);
              if (prod && prod.type === 'product') {
                prod.stock = Math.max(0, (prod.stock || 0) - it.qty);
              }
            }
          });
        }
        Store.saveProducts(products);
      }

      if (this.editingInvoiceId) {
        const idx = invoices.findIndex(i => i.id === this.editingInvoiceId);
        if (idx !== -1) {
          const updatedInvoice = {
            ...data,
            id: this.editingInvoiceId,
            invoiceNumber: this.originalInvoiceSnapshot ? this.originalInvoiceSnapshot.invoiceNumber : data.invoiceNumber,
            customerId,
            paymentStatus: isDraft ? 'Draft' : data.paymentStatus,
            createdAt: this.originalInvoiceSnapshot ? this.originalInvoiceSnapshot.createdAt : new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          invoices[idx] = updatedInvoice;
          Store.saveInvoices(invoices);
          Toast.show(`Invoice #${updatedInvoice.invoiceNumber} updated successfully!`, 'success');
        }
      } else {
        const newInvoice = {
          ...data,
          id: Utils.generateId('inv_'),
          customerId,
          paymentStatus: isDraft ? 'Draft' : data.paymentStatus,
          createdAt: new Date().toISOString()
        };
        invoices.push(newInvoice);
        Store.saveInvoices(invoices);

        // Advance invoice sequence number in settings
        settings.nextNumber = (parseInt(settings.nextNumber, 10) || 1000) + 1;
        Store.saveSettings(settings);

        Toast.show(`Invoice #${data.invoiceNumber} generated successfully!`, 'success');
      }

      // Cleanly reset edit state and redirect to invoices history
      this.resetForm();
      DashboardController.render();
      if (typeof SalesAnalysisController !== 'undefined') SalesAnalysisController.render();
      Navigation.switchView('invoices');
    },
    shareWhatsApp() {
      const data = this.collectFormData();
      const settings = Store.getSettings();
      const text = `Invoice #${data.invoiceNumber} from ${settings.businessName}\nAmount: ${Utils.formatCurrency(data.grandTotal, settings.currency)}\nStatus: ${data.paymentStatus}\nThank you!`;
      const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
    },
    shareEmail() {
      const data = this.collectFormData();
      const settings = Store.getSettings();
      const subject = `Invoice #${data.invoiceNumber} from ${settings.businessName}`;
      const body = `Dear ${data.customerName || 'Customer'},\n\nPlease find the details of your invoice #${data.invoiceNumber}.\nAmount: ${Utils.formatCurrency(data.grandTotal, settings.currency)}\nStatus: ${data.paymentStatus}\nDue Date: ${Utils.formatDate(data.dueDate)}\n\nThank you for your business!`;
      window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }
  };

  // Global window functions for inline row events
  window.invoiceItemProductChanged = (rowId, productId) => InvoiceController.onItemProductChanged(rowId, productId);
  window.removeInvoiceItemRow = (rowId) => InvoiceController.removeItemRow(rowId);
  window.invoiceRecalculate = () => InvoiceController.recalculate();

  // --- INVOICES LIST & PREVIEW CONTROLLER ---
  const InvoicesListController = {
    init() {
      const searchInput = document.getElementById('invoices-search');
      if (searchInput) {
        searchInput.addEventListener('input', () => this.render());
      }
      const statusFilter = document.getElementById('invoices-status-filter');
      if (statusFilter) {
        statusFilter.addEventListener('change', () => this.render());
      }
    },
    render() {
      const tbody = document.getElementById('invoices-tbody');
      if (!tbody) return;

      const invoices = Store.getInvoices();
      const settings = Store.getSettings();
      const query = (document.getElementById('invoices-search')?.value || '').toLowerCase().trim();
      const statusFilter = document.getElementById('invoices-status-filter')?.value || 'all';

      const filtered = invoices.filter(inv => {
        const matchesQuery = (inv.invoiceNumber || '').toLowerCase().includes(query) ||
                             (inv.customerName || '').toLowerCase().includes(query);
        const matchesStatus = statusFilter === 'all' || inv.paymentStatus === statusFilter;
        return matchesQuery && matchesStatus;
      });

      if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="empty-state"><div class="empty-state-icon">▤</div><h3>No invoices found</h3><p>Create your first invoice using the "+ Create Invoice" button.</p></td></tr>`;
        return;
      }

      // Sort newest first
      filtered.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));

      tbody.innerHTML = filtered.map(inv => {
        let statusClass = 'pending';
        if (inv.paymentStatus === 'Paid') statusClass = 'paid';
        if (inv.paymentStatus === 'Partial') statusClass = 'partial';
        if (inv.paymentStatus === 'Draft') statusClass = 'draft';

        const itemCount = inv.items ? inv.items.length : 1;

        return `
          <tr>
            <td><strong style="color:var(--p);cursor:pointer" onclick="window.viewInvoice('${inv.id}')">#${Utils.escapeHtml(inv.invoiceNumber)}</strong></td>
            <td><strong>${Utils.escapeHtml(inv.customerName || 'N/A')}</strong></td>
            <td>${Utils.formatDate(inv.date)}</td>
            <td>${itemCount} item(s)</td>
            <td><strong>${Utils.formatCurrency(inv.grandTotal, settings.currency)}</strong></td>
            <td><span class="status ${statusClass}">${Utils.escapeHtml(inv.paymentStatus)}</span></td>
            <td>
              <div class="actions" style="justify-content:flex-start">
                <button class="btn btn-sm" onclick="window.viewInvoice('${inv.id}')">View</button>
                <button class="btn btn-sm" onclick="window.editInvoice('${inv.id}')">Edit</button>
                <button class="btn btn-sm danger" onclick="window.deleteInvoice('${inv.id}')">Delete</button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    },
    view(id) {
      const invoices = Store.getInvoices();
      const settings = Store.getSettings();
      const inv = invoices.find(i => i.id === id);
      if (!inv) return;

      const modalBody = document.getElementById('modal-invoice-preview-body');
      if (!modalBody) return;

      let statusBadgeClass = 'pending';
      if (inv.paymentStatus === 'Paid') statusBadgeClass = 'paid';
      if (inv.paymentStatus === 'Partial') statusBadgeClass = 'partial';
      if (inv.paymentStatus === 'Draft') statusBadgeClass = 'draft';

      const itemsHtml = (inv.items || []).map(it => `
        <tr>
          <td><strong>${Utils.escapeHtml(it.name)}</strong>${it.sku ? `<br><small class="muted">${Utils.escapeHtml(it.sku)}</small>` : ''}</td>
          <td style="text-align:center">${it.qty}</td>
          <td style="text-align:right">${Utils.formatCurrency(it.price, settings.currency)}</td>
          <td style="text-align:right"><strong>${Utils.formatCurrency(it.total, settings.currency)}</strong></td>
        </tr>
      `).join('');

      modalBody.innerHTML = `
        <div class="invoice-paper printable-invoice">
          <div class="business-row" style="align-items:flex-start">
            <div>
              <div style="font-size:20px;font-weight:800">${Utils.escapeHtml(settings.businessName)}</div>
              <div class="muted" style="font-size:13px">${Utils.escapeHtml(settings.address)}</div>
              ${settings.phone ? `<div class="muted" style="font-size:13px">Phone: ${Utils.escapeHtml(settings.phone)}</div>` : ''}
              ${settings.gstin ? `<div class="muted" style="font-size:13px">GSTIN: ${Utils.escapeHtml(settings.gstin)}</div>` : ''}
            </div>
            <div style="text-align:right">
              <div style="font-size:20px;font-weight:900;letter-spacing:1px;color:var(--p)">TAX INVOICE</div>
              <div style="font-weight:800;font-size:14px;margin-top:4px">#${Utils.escapeHtml(inv.invoiceNumber)}</div>
              <div class="status ${statusBadgeClass}" style="margin-top:6px">${Utils.escapeHtml(inv.paymentStatus)}</div>
            </div>
          </div>

          <div style="display:flex;justify-content:space-between;margin-top:20px;padding-top:14px;border-top:1px solid var(--line);font-size:13px">
            <div>
              <span class="muted" style="text-transform:uppercase;font-size:10px;font-weight:800">Bill To:</span><br>
              <strong style="font-size:15px">${Utils.escapeHtml(inv.customerName || 'Walk-in Customer')}</strong><br>
              ${inv.customerPhone ? `<span>Phone: ${Utils.escapeHtml(inv.customerPhone)}</span><br>` : ''}
              ${inv.customerEmail ? `<span>Email: ${Utils.escapeHtml(inv.customerEmail)}</span><br>` : ''}
              ${inv.customerAddress ? `<span class="muted">${Utils.escapeHtml(inv.customerAddress)}</span>` : ''}
            </div>
            <div style="text-align:right">
              <span class="muted">Date:</span> <strong>${Utils.formatDate(inv.date)}</strong><br>
              <span class="muted">Due Date:</span> <strong>${Utils.formatDate(inv.dueDate || inv.date)}</strong><br>
              <span class="muted">Payment Method:</span> <strong>${Utils.escapeHtml(inv.paymentMethod || 'N/A')}</strong>
            </div>
          </div>

          <table class="invoice-list" style="margin-top:18px">
            <thead>
              <tr>
                <th>Item Description</th>
                <th style="text-align:center">Qty</th>
                <th style="text-align:right">Rate</th>
                <th style="text-align:right">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div style="display:grid;gap:7px;margin-top:16px;font-size:13px">
            <div class="business-row">
              <span class="muted">Subtotal</span>
              <b>${Utils.formatCurrency(inv.subtotal, settings.currency)}</b>
            </div>
            ${inv.discountAmount > 0 ? `
              <div class="business-row">
                <span class="muted">Discount</span>
                <b style="color:var(--danger)">-${Utils.formatCurrency(inv.discountAmount, settings.currency)}</b>
              </div>
            ` : ''}
            <div class="business-row">
              <span class="muted">GST / Tax (${inv.taxRate || 0}%)</span>
              <b>${Utils.formatCurrency(inv.taxAmount, settings.currency)}</b>
            </div>
          </div>

          <div class="total">
            <span>Grand Total</span>
            <span style="color:var(--p)">${Utils.formatCurrency(inv.grandTotal, settings.currency)}</span>
          </div>

          ${inv.paymentStatus === 'Partial' ? `
            <div style="display:flex;justify-content:space-between;margin-top:10px;font-size:13px;padding-top:8px;border-top:1px dashed var(--line)">
              <span>Paid Amount: <b>${Utils.formatCurrency(inv.paidAmount, settings.currency)}</b></span>
              <span style="color:var(--warning)">Balance Due: <b>${Utils.formatCurrency(inv.balanceDue, settings.currency)}</b></span>
            </div>
          ` : ''}

          ${inv.notes ? `
            <div style="margin-top:18px;padding-top:12px;border-top:1px dashed var(--line);font-size:12px;color:var(--muted)">
              <strong>Notes & Terms:</strong><br>${Utils.escapeHtml(inv.notes)}
            </div>
          ` : ''}
        </div>
      `;

      Modal.open('modal-invoice-preview');
    },
    async delete(id) {
      const invoices = Store.getInvoices();
      const inv = invoices.find(i => i.id === id);
      if (!inv) return;

      if (confirm(`Are you sure you want to delete invoice #${inv.invoiceNumber}? This action cannot be undone.`)) {
        if (AuthController.isAuthenticated()) {
          const activeBizId = AuthController.getActiveBusinessId();
          try {
            await ApiClient.deleteInvoice(activeBizId, id);
            Toast.show(`Invoice #${inv.invoiceNumber} deleted`, 'success');
            await AuthController.syncFromCloud(activeBizId);
            this.render();
            DashboardController.render();
            if (typeof SalesAnalysisController !== 'undefined') SalesAnalysisController.render();
            return;
          } catch (err) {
            console.warn('Cloud invoice deletion issue', err);
          }
        }

        // Restore stock for products in deleted invoice (Local / Demo fallback)
        if (inv.items && inv.items.length > 0) {
          const products = Store.getProducts();
          inv.items.forEach(item => {
            if (item.productId) {
              const prod = products.find(p => p.id === item.productId);
              if (prod && prod.type === 'product') {
                prod.stock = (prod.stock || 0) + (item.qty || 0);
              }
            }
          });
          Store.saveProducts(products);
        }

        const updated = invoices.filter(i => i.id !== id);
        Store.saveInvoices(updated);
        Toast.show(`Invoice #${inv.invoiceNumber} deleted`, 'success');
        this.render();
        DashboardController.render();
        if (typeof SalesAnalysisController !== 'undefined') SalesAnalysisController.render();
      }
    }
  };

  window.viewInvoice = (id) => InvoicesListController.view(id);
  window.editInvoice = (id) => InvoiceController.loadForEdit(id);
  window.deleteInvoice = (id) => InvoicesListController.delete(id);
  window.Store = Store;
  window.InvoiceController = InvoiceController;

  // Dedicated modal print function to prevent ghost elements
  window.printInvoiceModal = () => {
    document.body.classList.add('printing-modal');
    window.print();
  };

  window.addEventListener('afterprint', () => {
    document.body.classList.remove('printing-modal');
  });

  // Global mobile toggle
  window.toggleMenu = () => {
    document.getElementById('sidebar').classList.toggle('open');
  };

  // Close modals on backdrop click
  window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-backdrop')) {
      Modal.closeAll();
    }
  });

  // Close on Escape key
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      Modal.closeAll();
    }
  });

  // --- AUTH CONTROLLER ---
  const AuthController = {
    currentUser: null,
    currentBusiness: null,
    currentBusinesses: [],

    isAuthenticated() {
      return !!this.currentUser;
    },

    getActiveBusinessId() {
      if (this.currentBusiness && this.currentBusiness.id) return this.currentBusiness.id;
      if (this.currentBusinesses && this.currentBusinesses.length > 0) return this.currentBusinesses[0].id;
      return currentProfile !== 'default' ? currentProfile : null;
    },

    async checkSession() {
      try {
        const data = await ApiClient.fetchMe();
        if (data.success && data.user) {
          await this.setSession(data.user, data.business, data.businesses);
        }
      } catch (e) {
        // Running offline or local file mode
      }
    },

    async setSession(user, business, businesses) {
      this.currentUser = user;
      this.currentBusiness = business || (businesses && businesses[0]) || null;
      this.currentBusinesses = businesses || [];

      const btnAuth = document.getElementById('btn-open-auth');
      const badge = document.getElementById('auth-user-badge');
      const nameEl = document.getElementById('user-display-name');
      const overlay = document.getElementById('auth-overlay');

      if (user && business) {
        if (overlay) overlay.classList.add('hidden');
        if (btnAuth) btnAuth.style.display = 'none';
        if (badge) badge.style.display = 'flex';
        if (nameEl) nameEl.textContent = `👤 ${user.fullName || user.email}`;

        // Switch to authenticated user's business profile
        const userProfiles = (businesses && businesses.length > 0)
          ? businesses.map(b => ({ id: b.id, name: b.name }))
          : [{ id: business.id, name: business.name }];
        Store.saveProfiles(userProfiles);

        currentProfile = business.id;
        localStorage.setItem('billflow_active_profile', business.id);

        // Ensure clean, fresh isolated storage for this user's business
        if (!localStorage.getItem(storageKey('settings'))) {
          localStorage.setItem(storageKey('settings'), JSON.stringify(Normalizer.settings(business)));
        }
        if (!localStorage.getItem(storageKey('products'))) {
          localStorage.setItem(storageKey('products'), JSON.stringify([]));
        }
        if (!localStorage.getItem(storageKey('customers'))) {
          localStorage.setItem(storageKey('customers'), JSON.stringify([]));
        }
        if (!localStorage.getItem(storageKey('invoices'))) {
          localStorage.setItem(storageKey('invoices'), JSON.stringify([]));
        }

        // Refresh all UI views immediately to reflect the authenticated business data
        if (typeof SettingsController !== 'undefined' && SettingsController.refreshAllDataViews) {
          SettingsController.renderProfileDropdown();
          SettingsController.refreshAllDataViews();
        }

        // Fetch user's business data from cloud API
        await this.syncFromCloud(business.id);
      } else {
        if (overlay) overlay.classList.remove('hidden');
        if (btnAuth) btnAuth.style.display = 'inline-block';
        if (badge) badge.style.display = 'none';

        // Reset to default clean state on logout
        currentProfile = DEFAULT_PROFILE;
        localStorage.setItem('billflow_active_profile', DEFAULT_PROFILE);
        if (typeof SettingsController !== 'undefined' && SettingsController.refreshAllDataViews) {
          SettingsController.renderProfileDropdown();
          SettingsController.refreshAllDataViews();
        }
      }
    },

    async syncFromCloud(businessId) {
      const bizId = businessId || this.getActiveBusinessId();
      if (!this.currentUser || !bizId || bizId === 'default') return;

      try {
        const [prodsRes, custsRes, invsRes] = await Promise.all([
          ApiClient.fetchProducts(bizId).catch(() => null),
          ApiClient.fetchCustomers(bizId).catch(() => null),
          ApiClient.fetchInvoices(bizId).catch(() => null)
        ]);

        if (prodsRes && Array.isArray(prodsRes.products)) {
          const normProducts = prodsRes.products.map(Normalizer.product).filter(Boolean);
          Store.saveProducts(normProducts);
        }

        if (custsRes && Array.isArray(custsRes.customers)) {
          const normCustomers = custsRes.customers.map(Normalizer.customer).filter(Boolean);
          Store.saveCustomers(normCustomers);
        }

        if (invsRes && Array.isArray(invsRes.invoices)) {
          const normInvoices = invsRes.invoices.map(Normalizer.invoice).filter(Boolean);
          Store.saveInvoices(normInvoices);
        }

        if (typeof SettingsController !== 'undefined' && SettingsController.refreshAllDataViews) {
          SettingsController.renderProfileDropdown();
          SettingsController.refreshAllDataViews();
        }
      } catch (err) {
        console.warn('Cloud sync issue', err);
      }
    },

    init() {
      const overlay = document.getElementById('auth-overlay');
      const overlayTabLogin = document.getElementById('overlay-tab-login');
      const overlayTabSignup = document.getElementById('overlay-tab-signup');
      const overlayFormLogin = document.getElementById('overlay-form-login');
      const overlayFormSignup = document.getElementById('overlay-form-signup');
      const btnDemoMode = document.getElementById('btn-demo-mode');

      const btnOpenAuth = document.getElementById('btn-open-auth');
      const tabLogin = document.getElementById('tab-auth-login');
      const tabSignup = document.getElementById('tab-auth-signup');
      const formLogin = document.getElementById('form-login');
      const formSignup = document.getElementById('form-signup');
      const btnLogout = document.getElementById('btn-logout');

      // Overlay tab switching
      if (overlayTabLogin && overlayTabSignup) {
        overlayTabLogin.addEventListener('click', () => {
          overlayTabLogin.classList.add('active');
          overlayTabSignup.classList.remove('active');
          if (overlayFormLogin) overlayFormLogin.classList.add('active');
          if (overlayFormSignup) overlayFormSignup.classList.remove('active');
        });

        overlayTabSignup.addEventListener('click', () => {
          overlayTabSignup.classList.add('active');
          overlayTabLogin.classList.remove('active');
          if (overlayFormSignup) overlayFormSignup.classList.add('active');
          if (overlayFormLogin) overlayFormLogin.classList.remove('active');
        });
      }

      // Guest / Demo mode explorer
      if (btnDemoMode) {
        btnDemoMode.addEventListener('click', () => {
          if (overlay) overlay.classList.add('hidden');
          Toast.show('Entered Demo Workspace. Create an account anytime to save your data safely.', 'info');
        });
      }

      // Overlay Login submit
      if (overlayFormLogin) {
        overlayFormLogin.addEventListener('submit', async (e) => {
          e.preventDefault();
          const email = document.getElementById('overlay-login-email').value.trim();
          const password = document.getElementById('overlay-login-password').value;
          const submitBtn = document.getElementById('overlay-btn-login');

          try {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Logging in...';

            const data = await ApiClient.login(email, password);
            if (data.success) {
              Toast.show(`Welcome back, ${data.user.fullName || data.user.email}!`, 'success');
              await this.setSession(data.user, data.business, data.businesses);
              overlayFormLogin.reset();
            } else {
              Toast.show(data.error || 'Login failed', 'error');
            }
          } catch (err) {
            Toast.show('Network error logging in', 'error');
          } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Log In to Workspace →';
          }
        });
      }

      // Overlay Signup submit
      if (overlayFormSignup) {
        overlayFormSignup.addEventListener('submit', async (e) => {
          e.preventDefault();
          const fullName = document.getElementById('overlay-signup-name').value.trim();
          const businessName = document.getElementById('overlay-signup-biz').value.trim();
          const email = document.getElementById('overlay-signup-email').value.trim();
          const password = document.getElementById('overlay-signup-password').value;
          const submitBtn = document.getElementById('overlay-btn-signup');

          try {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Creating account...';

            const data = await ApiClient.signup(fullName, businessName, email, password);
            if (data.success) {
              Toast.show('Account created successfully! Welcome to BillFlow.', 'success');
              await this.setSession(data.user, data.business, data.businesses);
              overlayFormSignup.reset();
            } else {
              Toast.show(data.error || 'Signup failed', 'error');
            }
          } catch (err) {
            Toast.show('Network error creating account', 'error');
          } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Create Account & Enter →';
          }
        });
      }

      // Modal auth handlers
      if (btnOpenAuth) {
        btnOpenAuth.addEventListener('click', () => {
          Modal.open('modal-auth');
        });
      }

      if (tabLogin && tabSignup) {
        tabLogin.addEventListener('click', () => {
          tabLogin.style.borderBottomColor = 'var(--p)';
          tabLogin.style.color = 'var(--text)';
          tabSignup.style.borderBottomColor = 'transparent';
          tabSignup.style.color = 'var(--muted)';
          formLogin.style.display = 'block';
          formSignup.style.display = 'none';
          document.getElementById('auth-modal-title').textContent = 'Log In to BillFlow';
        });

        tabSignup.addEventListener('click', () => {
          tabSignup.style.borderBottomColor = 'var(--p)';
          tabSignup.style.color = 'var(--text)';
          tabLogin.style.borderBottomColor = 'transparent';
          tabLogin.style.color = 'var(--muted)';
          formSignup.style.display = 'block';
          formLogin.style.display = 'none';
          document.getElementById('auth-modal-title').textContent = 'Create BillFlow Account';
        });
      }

      if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
          e.preventDefault();
          const email = document.getElementById('login-email').value.trim();
          const password = document.getElementById('login-password').value;
          const submitBtn = document.getElementById('btn-submit-login');

          try {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Logging in...';

            const data = await ApiClient.login(email, password);
            if (data.success) {
              Toast.show(`Welcome back, ${data.user.fullName || data.user.email}!`, 'success');
              await this.setSession(data.user, data.business, data.businesses);
              Modal.close('modal-auth');
              formLogin.reset();
            } else {
              Toast.show(data.error || 'Login failed', 'error');
            }
          } catch (err) {
            Toast.show('Network error logging in', 'error');
          } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Log In →';
          }
        });
      }

      if (formSignup) {
        formSignup.addEventListener('submit', async (e) => {
          e.preventDefault();
          const fullName = document.getElementById('signup-name').value.trim();
          const businessName = document.getElementById('signup-biz-name').value.trim();
          const email = document.getElementById('signup-email').value.trim();
          const password = document.getElementById('signup-password').value;
          const submitBtn = document.getElementById('btn-submit-signup');

          try {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Creating account...';

            const data = await ApiClient.signup(fullName, businessName, email, password);
            if (data.success) {
              Toast.show('Account created successfully!', 'success');
              await this.setSession(data.user, data.business, data.businesses);
              Modal.close('modal-auth');
              formSignup.reset();
            } else {
              Toast.show(data.error || 'Signup failed', 'error');
            }
          } catch (err) {
            Toast.show('Network error creating account', 'error');
          } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Create Account →';
          }
        });
      }

      if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
          try {
            await ApiClient.logout();
            await this.setSession(null, null, []);
            Toast.show('Logged out successfully', 'success');
          } catch (err) {
            await this.setSession(null, null, []);
          }
        });
      }

      this.checkSession();
    }
  };

  // --- AI BILLING ASSISTANT CONTROLLER ---
  const AiBillingController = {
    initialized: false,
    activeDraft: null,

    init() {
      if (this.initialized) return;
      this.initialized = true;

      const btnSubmit = document.getElementById('ai-btn-submit');
      const inputPrompt = document.getElementById('ai-prompt-input');

      if (btnSubmit) {
        btnSubmit.addEventListener('click', () => this.handlePromptSubmit());
      }

      if (inputPrompt) {
        inputPrompt.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.handlePromptSubmit();
          }
        });
      }

      // Quick Chips
      document.querySelectorAll('.ai-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          const query = chip.getAttribute('data-query');
          if (inputPrompt) {
            inputPrompt.value = query;
            this.handlePromptSubmit();
          }
        });
      });



      // Draft Actions
      const btnCancelDraft = document.getElementById('ai-btn-cancel-draft');
      const btnDiscardBottom = document.getElementById('ai-btn-discard-bottom');
      if (btnCancelDraft) btnCancelDraft.addEventListener('click', () => this.discardDraft());
      if (btnDiscardBottom) btnDiscardBottom.addEventListener('click', () => this.discardDraft());

      const btnEditManual = document.getElementById('ai-btn-edit-manual');
      if (btnEditManual) btnEditManual.addEventListener('click', () => this.editInManualForm());

      const btnConfirm = document.getElementById('ai-btn-confirm-invoice');
      if (btnConfirm) btnConfirm.addEventListener('click', () => this.confirmDraft());

      const selPayment = document.getElementById('ai-draft-payment-method');
      if (selPayment) {
        selPayment.addEventListener('change', (e) => {
          if (this.activeDraft) {
            this.activeDraft.paymentMethod = e.target.value;
          }
        });
      }

      const inputDiscount = document.getElementById('ai-draft-discount');
      if (inputDiscount) {
        inputDiscount.addEventListener('input', (e) => {
          const disc = Math.max(0, parseFloat(e.target.value) || 0);
          if (this.activeDraft) {
            this.activeDraft.discountAmount = disc;
            this.activeDraft.discountValue = disc;
            this.recalculateDraft();
          }
        });
      }
    },

    async handlePromptSubmit() {
      const inputPrompt = document.getElementById('ai-prompt-input');
      const prompt = (inputPrompt ? inputPrompt.value : '').trim();
      if (!prompt) {
        Toast.show('Please enter stationery items and rates sold', 'error');
        return;
      }

      const inputCustName = document.getElementById('ai-cust-name-input');
      const customerName = (inputCustName ? inputCustName.value : '').trim();

      const inputCustPhone = document.getElementById('ai-cust-phone-input');
      const customerPhone = (inputCustPhone ? inputCustPhone.value : '').trim();

      const btnSubmit = document.getElementById('ai-btn-submit');
      const textSpan = btnSubmit ? btnSubmit.querySelector('.btn-text') : null;
      const spinnerSpan = btnSubmit ? btnSubmit.querySelector('.btn-spinner') : null;

      if (btnSubmit) btnSubmit.disabled = true;
      if (textSpan) textSpan.style.display = 'none';
      if (spinnerSpan) spinnerSpan.style.display = 'inline';

      // Hide previous results
      const infoCard = document.getElementById('ai-info-card');
      const ambCard = document.getElementById('ai-ambiguity-card');
      const draftCard = document.getElementById('ai-draft-card');
      if (infoCard) infoCard.style.display = 'none';
      if (ambCard) ambCard.style.display = 'none';
      if (draftCard) draftCard.style.display = 'none';

      const activeBizId = AuthController.getActiveBusinessId() || 'default';

      try {
        let res;
        if (AuthController.isAuthenticated()) {
          res = await ApiClient.sendAiQuery(activeBizId, prompt, customerName, customerPhone);
        } else {
          res = this.localAiSimulation(prompt, customerName, customerPhone);
        }

        this.renderResponse(res, prompt);
      } catch (err) {
        console.error('AI Query Error:', err);
        Toast.show('Failed to connect to AI Assistant', 'error');
      } finally {
        if (btnSubmit) btnSubmit.disabled = false;
        if (textSpan) textSpan.style.display = 'inline';
        if (spinnerSpan) spinnerSpan.style.display = 'none';
      }
    },

    renderResponse(res, originalPrompt) {
      if (!res || !res.intent) {
        Toast.show(res?.error || 'No response from AI', 'error');
        return;
      }

      // 1. Informational queries
      if (['LOW_STOCK_QUERY', 'CUSTOMER_HISTORY_QUERY', 'PRODUCT_SEARCH_QUERY', 'UNKNOWN_OR_EMPTY'].includes(res.intent)) {
        const infoCard = document.getElementById('ai-info-card');
        const infoTitle = document.getElementById('ai-info-title');
        const infoMsg = document.getElementById('ai-info-message');
        const infoDetails = document.getElementById('ai-info-details');

        if (infoTitle) {
          infoTitle.textContent = res.intent === 'LOW_STOCK_QUERY' ? 'Low Stock Report'
            : res.intent === 'CUSTOMER_HISTORY_QUERY' ? 'Customer Purchase History'
            : res.intent === 'PRODUCT_SEARCH_QUERY' ? 'Product Catalog Search'
            : 'AI Assistant';
        }

        if (infoMsg) infoMsg.textContent = res.reply || '';
        if (infoDetails) infoDetails.innerHTML = '';

        if (res.data && res.data.items && Array.isArray(res.data.items) && infoDetails) {
          infoDetails.innerHTML = `
            <div class="table-responsive" style="margin-top:10px">
              <table class="ai-items-table">
                <thead>
                  <tr><th>Product / Book</th><th>SKU</th><th>Stock</th><th style="text-align:right">Price</th></tr>
                </thead>
                <tbody>
                  ${res.data.items.map(p => `
                    <tr>
                      <td><strong>${Utils.escapeHtml(p.name)}</strong></td>
                      <td><code>${Utils.escapeHtml(p.sku)}</code></td>
                      <td><span class="status pending">${p.stock} left</span></td>
                      <td style="text-align:right">₹${Number(p.price).toFixed(2)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `;
        } else if (res.data && res.data.matches && Array.isArray(res.data.matches) && infoDetails) {
          infoDetails.innerHTML = `
            <div class="table-responsive" style="margin-top:10px">
              <table class="ai-items-table">
                <thead>
                  <tr><th>Product / Book</th><th>SKU</th><th>Available Stock</th><th style="text-align:right">Price</th></tr>
                </thead>
                <tbody>
                  ${res.data.matches.map(p => `
                    <tr>
                      <td><strong>${Utils.escapeHtml(p.name)}</strong></td>
                      <td><code>${Utils.escapeHtml(p.sku)}</code></td>
                      <td>${p.stock} units</td>
                      <td style="text-align:right">₹${Number(p.price).toFixed(2)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `;
        }

        if (infoCard) infoCard.style.display = 'block';
        return;
      }

      // 2. Ambiguity resolution
      if (res.intent === 'AMBIGUITY_RESOLUTION') {
        const ambCard = document.getElementById('ai-ambiguity-card');
        const ambList = document.getElementById('ai-ambiguity-list');
        if (ambList) ambList.innerHTML = '';

        const options = res.data?.options || [];
        options.forEach(opt => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'ai-ambiguity-btn';
          btn.innerHTML = `
            <span class="ai-ambiguity-title">${Utils.escapeHtml(opt.name)}</span>
            <span class="ai-ambiguity-meta">Price: ₹${Number(opt.price).toFixed(2)} | Stock: ${opt.stock} units</span>
          `;
          btn.addEventListener('click', () => {
            const promptInput = document.getElementById('ai-prompt-input');
            if (promptInput) {
              promptInput.value = `${opt.name} bill`;
              this.handlePromptSubmit();
            }
          });
          if (ambList) ambList.appendChild(btn);
        });

        if (ambCard) ambCard.style.display = 'block';
        return;
      }

      // 3. Invoice Draft Created
      if (res.intent === 'INVOICE_DRAFT_CREATED' && res.data?.draft) {
        this.activeDraft = res.data.draft;
        this.renderDraft(this.activeDraft);
      }
    },

    renderDraft(draft) {
      const draftCard = document.getElementById('ai-draft-card');
      if (!draftCard) return;

      // Customer
      const custNameEl = document.getElementById('ai-draft-cust-name');
      const custPhoneEl = document.getElementById('ai-draft-cust-phone');
      const custStatusEl = document.getElementById('ai-draft-cust-status');

      if (custNameEl) custNameEl.textContent = draft.customerName || 'Counter Customer';
      if (custPhoneEl) custPhoneEl.textContent = draft.customerPhone || '— (Walk-in)';
      if (custStatusEl) {
        custStatusEl.innerHTML = draft.isNewCustomer
          ? '<span class="status" style="background:#fef3c7;color:#92400e">New Customer</span>'
          : '<span class="status" style="background:#ecfdf5;color:#047857">Existing Account</span>';
      }

      // Payment Method
      const selPayment = document.getElementById('ai-draft-payment-method');
      if (selPayment) selPayment.value = draft.paymentMethod || 'Cash';

      // Discount
      const inputDiscount = document.getElementById('ai-draft-discount');
      if (inputDiscount) inputDiscount.value = draft.discountAmount || 0;

      // Items Table
      const tbody = document.getElementById('ai-draft-items-tbody');
      if (tbody) {
        tbody.innerHTML = (draft.items || []).map((it, idx) => {
          const isCustom = !it.productId || it.sku === 'CUSTOM' || Number(it.price) === 0;
          const priceDisplay = isCustom
            ? `<input type="number" min="0" step="any" value="${Number(it.price) || 0}" style="width:90px;text-align:right;padding:4px 8px;border:1.5px solid #f59e0b;border-radius:4px;font-weight:700" oninput="window.updateAiDraftItem(${idx}, 'price', this.value)" placeholder="Set ₹">`
            : `₹${Number(it.price).toFixed(2)}`;

          const customTag = isCustom
            ? `<span class="tag" style="background:#fef3c7;color:#92400e;font-size:10px;margin-left:6px">✎ Uncataloged</span>`
            : '';

          return `
            <tr>
              <td>
                <strong>${Utils.escapeHtml(it.name)}</strong>${customTag}
              </td>
              <td><code>${Utils.escapeHtml(it.sku || '—')}</code></td>
              <td style="text-align:center">
                <input type="number" min="1" step="1" value="${it.qty}" style="width:60px;text-align:center;padding:4px;border:1px solid var(--border);border-radius:4px;font-weight:700" oninput="window.updateAiDraftItem(${idx}, 'qty', this.value)">
              </td>
              <td style="text-align:right">${priceDisplay}</td>
              <td style="text-align:right"><strong id="ai-draft-row-total-${idx}">₹${Number(it.total).toFixed(2)}</strong></td>
            </tr>
          `;
        }).join('');
      }

      this.recalculateDraft();
      draftCard.style.display = 'block';
      draftCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    },

    recalculateDraft() {
      if (!this.activeDraft) return;

      let subtotal = 0;
      (this.activeDraft.items || []).forEach(it => {
        subtotal += Number(it.total) || 0;
      });

      const disc = Math.min(subtotal, Math.max(0, parseFloat(this.activeDraft.discountAmount) || 0));
      const taxRate = Number(this.activeDraft.taxRate) || 0;
      const taxable = Math.max(0, subtotal - disc);
      const taxAmount = Math.round((taxable * taxRate / 100) * 100) / 100;
      const grandTotal = Math.max(0, Math.round((taxable + taxAmount) * 100) / 100);

      this.activeDraft.subtotal = subtotal;
      this.activeDraft.discountAmount = disc;
      this.activeDraft.grandTotal = grandTotal;
      this.activeDraft.taxAmount = taxAmount;

      const subtotalEl = document.getElementById('ai-draft-subtotal');
      const discEl = document.getElementById('ai-draft-discount-val');
      const taxEl = document.getElementById('ai-draft-tax');
      const grandEl = document.getElementById('ai-draft-grand-total');

      if (subtotalEl) subtotalEl.textContent = `₹${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
      if (discEl) discEl.textContent = `-₹${disc.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
      if (taxEl) taxEl.textContent = `₹${taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
      if (grandEl) grandEl.textContent = `₹${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    },

    discardDraft() {
      this.activeDraft = null;
      const draftCard = document.getElementById('ai-draft-card');
      if (draftCard) draftCard.style.display = 'none';
      Toast.show('Draft discarded. No invoice was created.', 'default');
    },

    editInManualForm() {
      if (!this.activeDraft) return;

      const draft = this.activeDraft;
      InvoiceController.resetForm();

      const nameInput = document.getElementById('inv-customer-name');
      const phoneInput = document.getElementById('inv-customer-phone');
      const addressInput = document.getElementById('inv-customer-address');
      const statusSelect = document.getElementById('inv-payment-status');
      const methodSelect = document.getElementById('inv-payment-method');
      const notesInput = document.getElementById('inv-notes');

      if (nameInput) nameInput.value = draft.customerName || '';
      if (phoneInput) phoneInput.value = draft.customerPhone || '';
      if (addressInput) addressInput.value = draft.customerAddress || '';
      if (statusSelect) statusSelect.value = 'Paid';
      if (methodSelect) methodSelect.value = draft.paymentMethod || 'Cash';
      if (notesInput) notesInput.value = draft.notes || '';

      const tbody = document.getElementById('line-items-tbody');
      if (tbody) {
        tbody.innerHTML = '';
        (draft.items || []).forEach(it => {
          InvoiceController.addItemRow({
            productId: it.productId,
            name: it.name,
            sku: it.sku,
            qty: it.qty,
            price: it.price
          });
        });
      }

      this.discardDraft();
      Navigation.switchView('create-invoice');
      Toast.show('Draft loaded into Detailed Invoice Form for review', 'success');
    },

    async confirmDraft() {
      if (!this.activeDraft) return;

      const draft = this.activeDraft;
      const draftMistakes = [];

      if (!draft.customerName || !draft.customerName.trim()) {
        draftMistakes.push('Customer Name is required (कस्टमर का नाम आवश्यक है).');
      }

      if (!draft.items || draft.items.length === 0) {
        draftMistakes.push('No items in draft. Please add sold stationery items (ड्राफ्ट में कम से कम 1 आइटम होना जरूरी है).');
      } else {
        draft.items.forEach((it, idx) => {
          const p = parseFloat(it.price);
          const q = parseInt(it.qty, 10);
          if (isNaN(q) || q < 1) {
            draftMistakes.push(`Item #${idx + 1} ("${it.name}"): Quantity is invalid (${it.qty}). Must be at least 1.`);
          }
          if (isNaN(p) || p < 0) {
            draftMistakes.push(`Item #${idx + 1} ("${it.name}"): Price is invalid.`);
          } else if (p === 0) {
            draftMistakes.push(`Item #${idx + 1} ("${it.name}"): Price is ₹0.00. Please enter the rate in the price box above before confirming (रेट ₹0 है, सही कीमत डालें).`);
          }
        });
      }

      const alertBox = document.getElementById('ai-draft-mistake-alert');
      const alertList = document.getElementById('ai-draft-mistake-list');

      if (draftMistakes.length > 0) {
        if (alertList) {
          alertList.innerHTML = `<ul style="margin:4px 0 0 16px;padding:0">${draftMistakes.map(m => `<li style="margin-bottom:3px">${Utils.escapeHtml(m)}</li>`).join('')}</ul>`;
        }
        if (alertBox) {
          alertBox.style.display = 'block';
          alertBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        Toast.show('⚠️ Something is not good! Please fix the highlighted issues in the draft.', 'error');
        return;
      }

      if (alertBox) alertBox.style.display = 'none';

      const settings = Store.getSettings();
      const activeBizId = AuthController.getActiveBusinessId() || 'default';
      const btnConfirm = document.getElementById('ai-btn-confirm-invoice');

      if (btnConfirm) {
        btnConfirm.disabled = true;
        btnConfirm.textContent = '⏳ Creating Invoice...';
      }

      const invoicePayload = {
        customerId: draft.customerId || null,
        customerName: draft.customerName || 'Counter Customer',
        customerPhone: draft.customerPhone || '',
        customerEmail: draft.customerEmail || '',
        customerAddress: draft.customerAddress || '',
        invoiceNumber: `${settings.invoicePrefix}${settings.nextNumber}`,
        date: Utils.todayYMD(),
        dueDate: Utils.addDays(Utils.todayYMD(), 7),
        subtotal: draft.subtotal,
        discountType: 'fixed',
        discountValue: draft.discountAmount || 0,
        discountAmount: draft.discountAmount || 0,
        taxRate: draft.taxRate || 0,
        taxAmount: draft.taxAmount || 0,
        grandTotal: draft.grandTotal,
        paymentMethod: draft.paymentMethod || 'Cash',
        paymentStatus: 'Paid',
        paidAmount: draft.grandTotal,
        balanceDue: 0,
        notes: draft.notes || 'AI Counter Bill',
        items: (draft.items || []).map(it => ({
          productId: it.productId,
          name: it.name,
          sku: it.sku || '',
          qty: it.qty,
          price: it.price,
          total: it.total
        }))
      };

      try {
        if (AuthController.isAuthenticated()) {
          const res = await ApiClient.createInvoice(activeBizId, invoicePayload);
          if (res.invoice) {
            const norm = Normalizer.invoice(res.invoice);
            const invoices = Store.getInvoices();
            invoices.unshift(norm);
            Store.saveInvoices(invoices);

            // Deduct stock in store
            const products = Store.getProducts();
            (draft.items || []).forEach(it => {
              if (it.productId) {
                const p = products.find(prod => prod.id === it.productId);
                if (p && p.type === 'product') p.stock = Math.max(0, (p.stock || 0) - it.qty);
              }
            });
            Store.saveProducts(products);

            settings.nextNumber = (Number(settings.nextNumber) || 1001) + 1;
            Store.saveSettings(settings);

            Toast.show(`Invoice ${norm.invoiceNumber} created successfully!`, 'success');
            document.getElementById('ai-draft-card').style.display = 'none';
            this.activeDraft = null;

            DashboardController.render();
            if (typeof SalesAnalysisController !== 'undefined') SalesAnalysisController.render();

            InvoicePreviewModal.open(norm);
            return;
          }
        }

        // Local Store Save
        const newInvoice = {
          ...invoicePayload,
          id: Utils.generateId('inv_'),
          createdAt: new Date().toISOString()
        };

        const invoices = Store.getInvoices();
        invoices.unshift(newInvoice);
        Store.saveInvoices(invoices);

        // Deduct stock
        const products = Store.getProducts();
        (draft.items || []).forEach(it => {
          if (it.productId) {
            const p = products.find(prod => prod.id === it.productId);
            if (p && p.type === 'product') p.stock = Math.max(0, (p.stock || 0) - it.qty);
          }
        });
        Store.saveProducts(products);

        settings.nextNumber = (Number(settings.nextNumber) || 1001) + 1;
        Store.saveSettings(settings);

        Toast.show(`Invoice ${newInvoice.invoiceNumber} created successfully!`, 'success');
        document.getElementById('ai-draft-card').style.display = 'none';
        this.activeDraft = null;

        DashboardController.render();
        if (typeof SalesAnalysisController !== 'undefined') SalesAnalysisController.render();

        InvoicePreviewModal.open(newInvoice);

      } catch (err) {
        console.error('Invoice Creation Failed:', err);
        Toast.show('Failed to save invoice', 'error');
      } finally {
        if (btnConfirm) {
          btnConfirm.disabled = false;
          btnConfirm.textContent = '✓ Confirm & Create Invoice →';
        }
      }
    },

    localAiSimulation(prompt, explicitCustName = '', explicitCustPhone = '') {
      const products = Store.getProducts();
      const customers = Store.getCustomers();
      const lower = prompt.toLowerCase();

      if (lower.includes('low stock') || lower.includes('kam stock') || lower.includes('कम स्टॉक')) {
        const items = products.filter(p => p.type === 'product' && (p.stock || 0) <= 10);
        return {
          intent: 'LOW_STOCK_QUERY',
          reply: `Found ${items.length} low stock product(s) in catalog.`,
          data: { items }
        };
      }

      // Quick Hindi/Devanagari Normalization
      let text = prompt.trim();
      let paymentMethod = 'Cash';
      if (lower.includes('upi') || lower.includes('gpay') || lower.includes('paytm') || lower.includes('यूपीआई')) {
        paymentMethod = 'UPI';
      }

      let customerName = explicitCustName || 'Counter Customer';
      let customerPhone = explicitCustPhone || '';

      const custMatch = text.match(/^([^\d,:;\(\)]+?)\s*(?:ko|se|ne|को|ने)/i);
      if (custMatch && !explicitCustName) customerName = custMatch[1].trim();

      const matchedCustomer = customers.find(c => 
        c.name.toLowerCase().includes(customerName.toLowerCase()) ||
        (customerPhone && c.phone && c.phone.includes(customerPhone))
      ) || null;

      if (matchedCustomer && !explicitCustName) customerName = matchedCustomer.name;
      if (matchedCustomer && !customerPhone) customerPhone = matchedCustomer.phone || '';

      // Extract items
      let cleanText = text
        .replace(/^.+?\b(?:ko|se|ne|को|ने)\b[:\s]*/i, '')
        .replace(/(?:,\s*)?(?:cash|upi|online|नकद|यूपीआई)\.?$/i, '')
        .replace(/(?:diye|diya|hai|दिए|दिया|दी)\.?$/i, '')
        .trim();

      const segments = cleanText.split(/\s*(?:,\s*|\baur\b|\band\b|\bऔर\b|\+|\n)\s*/i);
      const items = [];

      for (const seg of segments) {
        let trimmed = seg.trim();
        if (!trimmed) continue;

        let qty = 1;
        const leadingQty = trimmed.match(/^(\d+|दो|तीन|चार|पांच|२|३|५)\s*(?:x|\s*pcs)?\s+(.+)$/i);
        if (leadingQty) {
          const rawQ = leadingQty[1];
          if (rawQ === 'दो' || rawQ === '२') qty = 2;
          else if (rawQ === 'तीन' || rawQ === '३') qty = 3;
          else if (rawQ === 'चार' || rawQ === '४') qty = 4;
          else if (rawQ === 'पांच' || rawQ === '५') qty = 5;
          else qty = parseInt(rawQ, 10) || 1;
          trimmed = leadingQty[2].trim();
        }

        // Extract rate / price from segment e.g. "rs.100 per", "50 per", "70 me", "10 me", "@ 50", "75"
        let specifiedPrice = null;
        const pMatch = trimmed.match(/(?:@|rate|price|rs\.?|₹|रुपये|रुपए|रु|rupaye|rupiya|rupay|inr|\bin\b|\bme\b|\bmein\b|में)\s*(\d+(?:\.\d+)?)(?:\s*(?:per|each|\/pc|\/piece|\/unit|\/item|प्रति|प्रत्येक|ka|ki|ke|me|mein|रुपये|रुपए|रु))?/i) ||
                       trimmed.match(/(\d+(?:\.\d+)?)\s*(?:rs|rupees|rupaye|rupiya|rupay|inr|रुपये|रुपए|रु|ka|ki|ke|me|mein|में|per|each|\/pc|\/piece|\/unit|\/item|प्रति|प्रत्येक)(?:\s*(?:per|each|\/pc|\/piece|\/unit|\/item|प्रति|प्रत्येक))?/i) ||
                       trimmed.match(/(?:\s+)(\d+(?:\.\d+)?)$/i);
        if (pMatch) {
          specifiedPrice = parseFloat(pMatch[1]) || 0;
          trimmed = trimmed.substring(0, pMatch.index).trim();
        }

        const cleanTerm = trimmed
          .replace(/\b(rs|rupees|rupaye|rupiya|rupay|inr|me|mein|ka|ki|ke|rate|price|per|each|pc|pcs|piece|pieces|unit|units|item|items|प्रति|प्रत्येक)\b/gi, ' ')
          .replace(/^[^\w\u0900-\u097F]+|[^\w\u0900-\u097F]+$/g, '')
          .trim();

        const tLower = cleanTerm.toLowerCase();
        let foundProd = products.find(p => 
          tLower.includes(p.name.toLowerCase()) || 
          (p.name.toLowerCase().includes('math') && (tLower.includes('math') || tLower.includes('गणित'))) ||
          (p.name.toLowerCase().includes('physic') && (tLower.includes('physic') || tLower.includes('भौतिक'))) ||
          (p.name.toLowerCase().includes('register') && (tLower.includes('register') || tLower.includes('रजिस्टर'))) ||
          (p.name.toLowerCase().includes('copy') && (tLower.includes('copy') || tLower.includes('कॉपी') || tLower.includes('notebook'))) ||
          (p.name.toLowerCase().includes('notebook') && (tLower.includes('copy') || tLower.includes('कॉपी') || tLower.includes('notebook'))) ||
          (p.name.toLowerCase().includes('pen') && (tLower.includes('pen') || tLower.includes('पेन')))
        );

        const price = specifiedPrice !== null ? specifiedPrice : (foundProd ? Number(foundProd.price) || 0 : 50);

        if (foundProd) {
          items.push({
            productId: foundProd.id,
            name: foundProd.name,
            sku: foundProd.sku || '',
            qty: qty,
            price: price,
            total: price * qty
          });
        } else {
          const customName = (cleanTerm || trimmed).split(/\s+/).filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') || 'Item';
          items.push({
            productId: null,
            name: customName,
            sku: 'CUSTOM',
            qty: qty,
            price: price,
            total: price * qty
          });
        }
      }

      const subtotal = items.reduce((s, it) => s + it.total, 0);

      return {
        intent: 'INVOICE_DRAFT_CREATED',
        reply: `Draft bill ready for ${customerName}: ${items.length} item(s) totalling ₹${subtotal.toLocaleString('en-IN')}. Please review and confirm below.`,
        data: {
          draft: {
            customerId: matchedCustomer ? matchedCustomer.id : null,
            customerName: matchedCustomer ? matchedCustomer.name : customerName,
            customerPhone: customerPhone,
            isNewCustomer: !matchedCustomer,
            items: items,
            subtotal,
            discountAmount: 0,
            taxRate: 0,
            taxAmount: 0,
            grandTotal: subtotal,
            paymentMethod: paymentMethod,
            notes: `AI Counter Bill generated from prompt: "${prompt}"`
          }
        }
      };
    }
  };

  window.updateAiDraftItem = function (idx, field, value) {
    if (!AiBillingController.activeDraft || !AiBillingController.activeDraft.items || !AiBillingController.activeDraft.items[idx]) return;
    const item = AiBillingController.activeDraft.items[idx];

    if (field === 'qty') {
      item.qty = Math.max(1, parseInt(value, 10) || 1);
    } else if (field === 'price') {
      item.price = Math.max(0, parseFloat(value) || 0);
    }

    item.total = Math.round(item.qty * item.price * 100) / 100;
    const rowTotEl = document.getElementById(`ai-draft-row-total-${idx}`);
    if (rowTotEl) rowTotEl.textContent = `₹${item.total.toFixed(2)}`;

    AiBillingController.recalculateDraft();
  };

  const ThemeManager = {
    init() {
      const savedTheme = localStorage.getItem('billflow_theme') || 'light';
      this.setTheme(savedTheme);

      const btn = document.getElementById('btn-theme-toggle');
      if (btn) {
        btn.addEventListener('click', () => {
          const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
          this.setTheme(isDark ? 'light' : 'dark');
        });
      }
    },

    setTheme(theme) {
      const icon = document.getElementById('theme-icon');
      const label = document.getElementById('theme-label');
      if (theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('billflow_theme', 'dark');
        if (icon) icon.textContent = '☀️';
        if (label) label.textContent = 'Light';
      } else {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('billflow_theme', 'light');
        if (icon) icon.textContent = '🌙';
        if (label) label.textContent = 'Dark';
      }
    }
  };

  window.toggleSidebar = function (forceState) {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    const isMobile = window.innerWidth <= 768;

    if (isMobile) {
      if (sidebar) {
        let isOpen;
        if (typeof forceState === 'boolean') {
          isOpen = forceState;
          if (forceState) sidebar.classList.add('open');
          else sidebar.classList.remove('open');
        } else {
          isOpen = sidebar.classList.toggle('open');
        }
        if (backdrop) {
          if (isOpen) backdrop.classList.add('show');
          else backdrop.classList.remove('show');
        }
        document.body.style.overflow = isOpen ? 'hidden' : '';
      }
      return;
    }

    // On laptop and desktop screens: keep sidebar permanently visible and open
    document.body.classList.remove('sidebar-collapsed');
    if (sidebar) sidebar.classList.remove('open');
    if (backdrop) backdrop.classList.remove('show');
    document.body.style.overflow = '';
    localStorage.removeItem('billflow_sidebar_collapsed');
  };

  window.toggleMenu = function () {
    window.toggleSidebar();
  };

  window.toggleHowToUse = function (forceState) {
    const box = document.getElementById('ai-guide-box');
    const arrow = document.getElementById('how-to-use-arrow');
    if (!box) return;

    let show;
    if (typeof forceState === 'boolean') {
      show = forceState;
    } else {
      show = box.style.display === 'none' || !box.style.display;
    }

    box.style.display = show ? 'block' : 'none';
    if (arrow) arrow.textContent = show ? '▲' : '▼';
  };

  // ============================================================
  // VOICE BILLING MATCHER (OFFLINE SMART NLP & FUZZY MATCHING)
  // ============================================================
  const VoiceBillingMatcher = {
    DEV_DIGITS: {
      '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
      '५': '5', '६': '6', '७': '7', '८': '8', '९': '9'
    },

    HINDI_NUMBERS: {
      'ek': 1, 'ik': 1, 'one': 1, 'एक': 1,
      'do': 2, 'two': 2, 'दो': 2, '२': 2,
      'teen': 3, 'tin': 3, 'three': 3, 'तीन': 3, '३': 3,
      'chaar': 4, 'char': 4, 'four': 4, 'चार': 4, '४': 4,
      'paanch': 5, 'panch': 5, 'five': 5, 'पांच': 5, 'पाँच': 5, '५': 5,
      'chhah': 6, 'chhe': 6, 'six': 6, 'छह': 6, 'छ:': 6, '६': 6,
      'saat': 7, 'seven': 7, 'सात': 7, '७': 7,
      'aath': 8, 'eight': 8, 'आठ': 8, '८': 8,
      'nau': 9, 'nine': 9, 'नौ': 9, '९': 9,
      'das': 10, 'ten': 10, 'दस': 10,
      'gyarah': 11, 'eleven': 11, 'ग्यारह': 11,
      'barah': 12, 'twelve': 12, 'बारह': 12, 'darjan': 12, 'dozen': 12, 'दर्जन': 12,
      'terah': 13, 'thirteen': 13, 'तेरह': 13,
      'chaudah': 14, 'fourteen': 14, 'चौदह': 14,
      'pandrah': 15, 'fifteen': 15, 'पंद्रह': 15,
      'solah': 16, 'sixteen': 16, 'सोलह': 16,
      'satrah': 17, 'seventeen': 17, 'सत्रह': 17,
      'atharah': 18, 'eighteen': 18, 'अट्ठारह': 18,
      'unnis': 19, 'nineteen': 19, 'उन्नीस': 19,
      'bees': 20, 'twenty': 20, 'बीस': 20,
      'pachees': 25, 'पच्चीस': 25,
      'tees': 30, 'thirty': 30, 'तीस': 30,
      'paintees': 35, 'पैंतीस': 35,
      'chalis': 40, 'forty': 40, 'चालीस': 40,
      'pachaas': 50, 'fifty': 50, 'पचास': 50,
      'saath': 60, 'sixty': 60, 'साठ': 60,
      'sattar': 70, 'seventy': 70, 'सत्तर': 70,
      'assi': 80, 'eighty': 80, 'अस्सी': 80,
      'nabbe': 90, 'ninety': 90, 'नब्बे': 90,
      'sau': 100, 'hundred': 100, 'सौ': 100
    },

    SYNONYMS: {
      'register': ['रजिस्टर', 'notebook', 'copy', 'कॉपी', 'khata'],
      'copy': ['कॉपी', 'notebook', 'register', 'रजिस्टर', 'rough'],
      'pen': ['पेन', 'ball pen', 'gel pen', 'reynolds', 'cello', 'pilot', 'flair', 'कलम'],
      'pencil': ['पेंसिल', 'apsara', 'natraj', 'lead'],
      'file': ['फाइल', 'practical file', 'folder', 'plastic file', 'cobra file'],
      'maths': ['math', 'गणित', 'ncert maths', 'mathematics'],
      'physics': ['भौतिकी', 'भौतिक विज्ञान', 'ncert physics', 'pradeep'],
      'chemistry': ['रसायन', 'रसायन विज्ञान', 'ncert chemistry'],
      'biology': ['जीव विज्ञान', 'ncert biology'],
      'eraser': ['रबड़', 'rubber', 'eraser'],
      'scale': ['रूलर', 'ruler', 'scale', 'inch tape'],
      'color': ['रंग', 'crayon', 'sketch', 'paint', 'oil pastel'],
      'calculator': ['कैलकुलेटर', 'casio', 'citizen'],
      'book': ['किताब', 'pustak', 'पुस्तक', 'textbook', 'guide']
    },

    normalizeText(raw) {
      if (!raw) return '';
      let text = String(raw).trim();
      // Replace devanagari numerals
      text = text.replace(/[०-९]/g, d => this.DEV_DIGITS[d] || d);
      return text;
    },

    fuzzyScore(term, productName) {
      const t = term.toLowerCase().trim();
      const p = productName.toLowerCase().trim();

      if (t === p) return 1.0;
      if (p.includes(t)) return 0.85 + (t.length / p.length) * 0.1;
      if (t.includes(p)) return 0.80;

      const tWords = t.split(/\s+/).filter(w => w.length > 1);
      const pWords = p.split(/\s+/).filter(w => w.length > 1);
      if (tWords.length === 0 || pWords.length === 0) return 0;

      let matchedWords = 0;
      for (const tw of tWords) {
        if (pWords.some(pw => pw.includes(tw) || tw.includes(pw))) {
          matchedWords++;
        } else {
          // Check synonym match
          for (const [key, list] of Object.entries(this.SYNONYMS)) {
            if ((tw === key || list.includes(tw)) && (p.includes(key) || list.some(syn => p.includes(syn)))) {
              matchedWords += 0.85;
              break;
            }
          }
        }
      }

      return (matchedWords / tWords.length) * 0.9;
    },

    parseSpokenBill(rawPrompt, catalog, customers, explicitCustName = '', explicitCustPhone = '') {
      const prompt = this.normalizeText(rawPrompt);
      const lower = prompt.toLowerCase();

      // 1. Payment Method Detection
      let paymentMethod = 'Cash';
      let isPaymentSpoken = false;

      if (/(?:upi|gpay|google pay|phonepe|paytm|online|qr code|qr|यूपीआई)/i.test(prompt)) {
        paymentMethod = 'UPI';
        isPaymentSpoken = true;
      } else if (/(?:card|debit card|credit card|pos card|कार्ड)/i.test(prompt)) {
        paymentMethod = 'Card';
        isPaymentSpoken = true;
      } else if (/(?:udhaar|udhari|baaki|baki|khata|pending|उधार|खाता)/i.test(prompt)) {
        paymentMethod = 'Pending';
        isPaymentSpoken = true;
      } else if (/(?:bank transfer|neft|rtgs|imps|बैंक)/i.test(prompt)) {
        paymentMethod = 'Bank Transfer';
        isPaymentSpoken = true;
      } else if (/(?:cash|nagad|नकद|रोकड़ा|rokad)/i.test(prompt)) {
        paymentMethod = 'Cash';
        isPaymentSpoken = true;
      }

      // 2. Customer Detection
      let customerName = (explicitCustName || '').trim();
      let customerPhone = (explicitCustPhone || '').trim();
      let isSpokenCustomerFound = false;
      let spokenCustomerName = '';

      if (!customerName) {
        const custMatch = prompt.match(/^([a-zA-Z\u0900-\u097F\s\.]+?)\s*(?:ko|se|ne|को|ने|khatte me|khate me|का|के नाम)\b/i) ||
                          prompt.match(/(?:ko|se|ne|को|ने)\s+([a-zA-Z\u0900-\u097F\s\.]+)$/i);
        if (custMatch) {
          spokenCustomerName = custMatch[1].trim();
          customerName = spokenCustomerName;
        }
      }

      let matchedCustomer = null;
      if (customerName) {
        const cLower = customerName.toLowerCase();
        matchedCustomer = customers.find(c =>
          c.name.toLowerCase() === cLower ||
          c.name.toLowerCase().includes(cLower) ||
          cLower.includes(c.name.toLowerCase()) ||
          (customerPhone && c.phone && c.phone.includes(customerPhone))
        ) || null;
      }

      if (matchedCustomer) {
        customerName = matchedCustomer.name;
        if (!customerPhone) customerPhone = matchedCustomer.phone || '';
        isSpokenCustomerFound = true;
      } else if (!customerName) {
        customerName = 'Walk-in Customer';
      }

      const isUnregistered = spokenCustomerName && !matchedCustomer;

      // 3. Discount Detection
      let discountAmount = 0;
      const discMatch = prompt.match(/(\d+(?:\.\d+)?)\s*(?:%|percent|प्रतिशत)?\s*(?:discount|off|kam|chhoot|छूट|कम)/i) ||
                        prompt.match(/(?:discount|off|kam|chhoot|छूट|कम)\s*(\d+(?:\.\d+)?)/i);
      if (discMatch) {
        discountAmount = parseFloat(discMatch[1]) || 0;
      }

      // 4. Clean sentence for item segmentation
      let cleanText = prompt
        .replace(/^.+?\b(?:ko|se|ne|को|ने|khatte me|khate me|का|के नाम)\b[:\s]*/i, '')
        .replace(/\b(?:ko|se|ne|को|ने)\s+[a-zA-Z\u0900-\u097F\s\.]+$/i, '')
        .replace(/(?:,\s*)?(?:cash|nagad|नकद|रोकड़ा|rokad|upi|gpay|paytm|phonepe|card|udhaar|udhari|baaki|pending|online)\.?$/i, '')
        .replace(/\b(?:\d+(?:\.\d+)?\s*(?:discount|off|kam|chhoot|छूट|कम)|discount\s*\d+)\b/gi, '')
        .replace(/(?:diye|diya|hai|दिए|दिया|दी|de do|becha)\.?$/i, '')
        .trim();

      const segments = cleanText.split(/\s*(?:,\s*|\baur\b|\band\b|\bऔर\b|\bfir\b|\bphir\b|\bsaath me\b|\+|\n)\s*/i);
      const items = [];
      const ambiguityList = [];

      for (let i = 0; i < segments.length; i++) {
        let seg = segments[i].trim();
        if (!seg || seg.length < 2) continue;

        // A. Extract Quantity
        let qty = 1;
        const qMatch = seg.match(/^(\d+(?:\.\d+)?|[a-zA-Z\u0900-\u097F]+)\s*(?:x|pcs|piece|pieces|pkt|packet|nug|पीस|पैकेट|नग)?\s+(.+)$/i);
        if (qMatch) {
          const rawQ = qMatch[1].toLowerCase().trim();
          if (this.HINDI_NUMBERS[rawQ]) {
            qty = this.HINDI_NUMBERS[rawQ];
            seg = qMatch[2].trim();
          } else if (!isNaN(parseFloat(rawQ)) && isFinite(rawQ)) {
            qty = parseFloat(rawQ) || 1;
            seg = qMatch[2].trim();
          }
        }

        // B. Extract Spoken Rate / Price
        let spokenPrice = null;
        const pMatch = seg.match(/(?:@|rate|price|rs\.?|₹|रुपये|रुपए|रु|rupaye|rupiya|rupay|inr|\bin\b|\bme\b|\bmein\b|में)\s*(\d+(?:\.\d+)?)(?:\s*(?:per|each|\/pc|\/piece|\/unit|\/item|प्रति|प्रत्येक|ka|ki|ke|me|mein|रुपये|रुपए|रु))?/i) ||
                       seg.match(/(\d+(?:\.\d+)?)\s*(?:rs|rupees|rupaye|rupiya|rupay|inr|रुपये|रुपए|रु|ka|ki|ke|me|mein|में|per|each|\/pc|\/piece|\/unit|\/item|प्रति|प्रत्येक)(?:\s*(?:per|each|\/pc|\/piece|\/unit|\/item|प्रति|प्रत्येक))?/i) ||
                       seg.match(/(?:\s+)(\d+(?:\.\d+)?)$/i);
        if (pMatch) {
          spokenPrice = parseFloat(pMatch[1]) || 0;
          seg = seg.substring(0, pMatch.index).trim();
        }

        // C. Clean Search Term
        const cleanTerm = seg
          .replace(/\b(rs|rupees|rupaye|rupiya|rupay|inr|me|mein|ka|ki|ke|rate|price|per|each|pc|pcs|piece|pieces|unit|units|item|items|प्रति|प्रत्येक|वाला|वाली|वाले|wala|wali|wale)\b/gi, ' ')
          .replace(/^[^\w\u0900-\u097F]+|[^\w\u0900-\u097F]+$/g, '')
          .trim();

        if (!cleanTerm) continue;

        // D. Fuzzy Matching Against Catalog
        const scoredProds = catalog.map(p => ({
          product: p,
          score: this.fuzzyScore(cleanTerm, p.name)
        })).filter(entry => entry.score >= 0.45)
          .sort((a, b) => b.score - a.score);

        let selectedProduct = null;
        let isAmbiguous = false;
        let candidateOptions = [];

        if (scoredProds.length === 1 && scoredProds[0].score >= 0.55) {
          selectedProduct = scoredProds[0].product;
        } else if (scoredProds.length > 1) {
          if (scoredProds[0].score >= 0.75 && (scoredProds[0].score - scoredProds[1].score) >= 0.18) {
            selectedProduct = scoredProds[0].product;
          } else {
            isAmbiguous = true;
            candidateOptions = scoredProds.slice(0, 4).map(e => e.product);
            selectedProduct = scoredProds[0].product; // default to top candidate
          }
        }

        // E. Price Conflict & Applied Price
        let appliedPrice = 0;
        let hasPriceConflict = false;
        let catalogPrice = 0;

        if (selectedProduct) {
          catalogPrice = Number(selectedProduct.price) || 0;
          if (spokenPrice !== null && Math.abs(spokenPrice - catalogPrice) > 0.01) {
            hasPriceConflict = true;
            appliedPrice = spokenPrice; // user spoke a specific price
          } else {
            appliedPrice = spokenPrice !== null ? spokenPrice : catalogPrice;
          }
        } else {
          appliedPrice = spokenPrice !== null ? spokenPrice : 0;
        }

        // F. Stock Validation
        let hasInsufficientStock = false;
        let availableStock = 0;
        if (selectedProduct && selectedProduct.type === 'product') {
          availableStock = parseInt(selectedProduct.stock, 10) || 0;
          if (qty > availableStock) {
            hasInsufficientStock = true;
          }
        }

        const itemObj = {
          productId: selectedProduct ? selectedProduct.id : null,
          name: selectedProduct ? selectedProduct.name : (cleanTerm.charAt(0).toUpperCase() + cleanTerm.slice(1)),
          sku: selectedProduct ? (selectedProduct.sku || '') : 'CUSTOM',
          qty: qty,
          price: appliedPrice,
          total: Math.round(qty * appliedPrice * 100) / 100,
          catalogPrice: catalogPrice,
          spokenPrice: spokenPrice,
          hasPriceConflict: hasPriceConflict,
          isAmbiguous: isAmbiguous,
          candidateOptions: candidateOptions,
          ambiguousTerm: cleanTerm,
          isUncataloged: !selectedProduct,
          hasInsufficientStock: hasInsufficientStock,
          availableStock: availableStock,
          costPrice: selectedProduct ? (Number(selectedProduct.costPrice) || (appliedPrice * 0.7)) : (appliedPrice * 0.7)
        };

        items.push(itemObj);

        if (isAmbiguous) {
          ambiguityList.push({
            itemIndex: items.length - 1,
            term: cleanTerm,
            options: candidateOptions
          });
        }
      }

      const subtotal = items.reduce((s, it) => s + (it.total || 0), 0);
      const grandTotal = Math.max(0, subtotal - discountAmount);

      return {
        customer: matchedCustomer,
        customerName: customerName,
        customerPhone: customerPhone,
        isUnregistered: isUnregistered,
        spokenCustomerName: spokenCustomerName,
        items: items,
        ambiguityList: ambiguityList,
        subtotal: subtotal,
        discountAmount: discountAmount,
        grandTotal: grandTotal,
        paymentMethod: paymentMethod,
        isPaymentSpoken: isPaymentSpoken
      };
    }
  };

  // ============================================================
  // VOICE BILLING CONTROLLER (COUNTER ASSISTANT)
  // ============================================================
  const VoiceBillingController = {
    recognition: null,
    isListening: false,
    currentLang: 'hi-IN',
    activeDraft: null,
    audioContext: null,
    analyser: null,
    microphoneStream: null,
    animFrameId: null,
    targetInput: 'voice', // 'voice' or 'ai'
    countdownTimer: null,
    secondsRemaining: 20,
    TOTAL_SECONDS: 20,

    init() {
      this.bindEvents();
      this.initSpeechEngine();
    },

    initSpeechEngine() {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        console.warn('Web Speech API is not supported in this browser.');
        const statusLabel = document.getElementById('voice-status-label');
        if (statusLabel) {
          statusLabel.innerHTML = '⚠️ <em>Speech recognition is supported in Google Chrome, Edge, and Android Chrome. You can also type or use sample chips below.</em>';
        }
        return;
      }

      try {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.maxAlternatives = 1;
        this.recognition.lang = this.currentLang;

        this.recognition.onstart = () => {
          this.isListening = true;
          this.updateListeningUI(true);
          this.startAudioVisualizer();
        };

        this.recognition.onresult = (event) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript + ' ';
            } else {
              interimTranscript += transcript;
            }
          }

          const isVoiceTarget = this.targetInput === 'voice';
          const textarea = document.getElementById(isVoiceTarget ? 'voice-transcript-textarea' : 'ai-prompt-input');
          const interimBox = document.getElementById('voice-live-interim-box');
          const interimText = document.getElementById('voice-interim-text');

          if (interimTranscript) {
            if (interimBox && interimText && isVoiceTarget) {
              interimBox.style.display = 'block';
              interimText.textContent = `"${interimTranscript.trim()}"`;
            }
          }

          if (finalTranscript) {
            if (textarea) {
              const prev = textarea.value.trim();
              textarea.value = prev ? `${prev}, ${finalTranscript.trim()}` : finalTranscript.trim();
            }
            if (interimBox && interimText && isVoiceTarget) {
              interimText.textContent = `"${finalTranscript.trim()}"`;
            }
          }
        };

        this.recognition.onerror = (event) => {
          console.warn('Speech recognition event error:', event.error);
          if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            Toast.show('Microphone access denied. Please allow microphone in browser.', 'error');
            const statusLabel = document.getElementById('voice-status-label');
            if (statusLabel) {
              statusLabel.innerHTML = '<span style="color:#ef4444">⚠️ Mic permission denied. Please allow microphone in browser settings.</span>';
            }
            this.stopListening();
          }
        };

        this.recognition.onend = () => {
          // If still within active 20s window, keep listening
          if (this.isListening && this.secondsRemaining > 0) {
            setTimeout(() => {
              if (this.isListening && this.secondsRemaining > 0) {
                try { this.recognition.start(); } catch (e) {}
              }
            }, 100);
            return;
          }

          this.isListening = false;
          this.updateListeningUI(false);
          this.stopAudioVisualizer();

          const interimBox = document.getElementById('voice-live-interim-box');
          if (interimBox) interimBox.style.display = 'none';

          if (this.targetInput === 'voice') {
            const textarea = document.getElementById('voice-transcript-textarea');
            if (textarea && textarea.value.trim().length >= 3) {
              this.processVoiceBill();
            }
          } else if (this.targetInput === 'ai') {
            const aiPrompt = document.getElementById('ai-prompt-input');
            if (aiPrompt && aiPrompt.value.trim().length >= 3) {
              if (typeof AiBillingController !== 'undefined') {
                AiBillingController.handlePromptSubmit();
              }
            }
          }
        };
      } catch (e) {
        console.warn('Speech Engine init exception:', e);
      }
    },

    async startAudioVisualizer() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.microphoneStream = stream;
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        this.audioContext = new AudioCtx();
        const source = this.audioContext.createMediaStreamSource(stream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 64;
        source.connect(this.analyser);

        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        const bars = document.querySelectorAll('.voice-wave-bars .wave-bar');

        const updateBars = () => {
          if (!this.isListening || !this.analyser) return;
          this.analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
          const avg = sum / dataArray.length;

          bars.forEach((bar, idx) => {
            const val = (dataArray[idx * 2] || avg) / 255;
            const height = Math.max(6, Math.min(30, val * 35));
            bar.style.height = `${height}px`;
            bar.style.opacity = Math.max(0.4, val * 1.5);
          });

          this.animFrameId = requestAnimationFrame(updateBars);
        };
        updateBars();
      } catch (err) {
        console.warn('Audio visualizer stream fallback', err);
      }
    },

    stopAudioVisualizer() {
      if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
      if (this.microphoneStream) {
        this.microphoneStream.getTracks().forEach(t => t.stop());
        this.microphoneStream = null;
      }
      if (this.audioContext && this.audioContext.state !== 'closed') {
        try { this.audioContext.close(); } catch (e) {}
      }
    },

    bindEvents() {
      // Main Mic button in Voice Counter
      const btnMic = document.getElementById('btn-voice-mic-main');
      if (btnMic && !btnMic.dataset.bound) {
        btnMic.dataset.bound = 'true';
        btnMic.addEventListener('click', () => {
          this.targetInput = 'voice';
          this.toggleListening();
        });
      }

      // Early Stop / Done button in Countdown Box
      const btnStopEarly = document.getElementById('btn-voice-stop-early');
      if (btnStopEarly && !btnStopEarly.dataset.bound) {
        btnStopEarly.dataset.bound = 'true';
        btnStopEarly.addEventListener('click', () => {
          this.stopListening();
        });
      }

      // Mic button in AI Billing prompt bar
      const btnAiMic = document.getElementById('ai-btn-mic-prompt');
      if (btnAiMic && !btnAiMic.dataset.bound) {
        btnAiMic.dataset.bound = 'true';
        btnAiMic.addEventListener('click', () => {
          this.targetInput = 'ai';
          this.toggleListening();
        });
      }

      // Language Switcher
      const btnHi = document.getElementById('voice-lang-hi');
      const btnEn = document.getElementById('voice-lang-en');
      if (btnHi && !btnHi.dataset.bound) {
        btnHi.dataset.bound = 'true';
        btnHi.addEventListener('click', () => this.setLanguage('hi-IN'));
      }
      if (btnEn && !btnEn.dataset.bound) {
        btnEn.dataset.bound = 'true';
        btnEn.addEventListener('click', () => this.setLanguage('en-IN'));
      }

      // Clear & Manual Generate Buttons
      const btnClear = document.getElementById('btn-voice-clear');
      if (btnClear && !btnClear.dataset.bound) {
        btnClear.dataset.bound = 'true';
        btnClear.addEventListener('click', () => {
          const textarea = document.getElementById('voice-transcript-textarea');
          if (textarea) textarea.value = '';
          const interimBox = document.getElementById('voice-live-interim-box');
          if (interimBox) interimBox.style.display = 'none';
          this.discardDraft();
        });
      }

      const btnGen = document.getElementById('btn-voice-generate-manual');
      if (btnGen && !btnGen.dataset.bound) {
        btnGen.dataset.bound = 'true';
        btnGen.addEventListener('click', () => this.processVoiceBill());
      }

      // Quick Chips
      document.querySelectorAll('.voice-chip').forEach(chip => {
        if (!chip.dataset.bound) {
          chip.dataset.bound = 'true';
          chip.addEventListener('click', (e) => {
            const prompt = e.currentTarget.getAttribute('data-speak') || '';
            const textarea = document.getElementById('voice-transcript-textarea');
            if (textarea) textarea.value = prompt;
            this.processVoiceBill();
          });
        }
      });

      // Draft Actions
      const btnDiscard = document.getElementById('voice-btn-discard-draft');
      if (btnDiscard && !btnDiscard.dataset.bound) {
        btnDiscard.dataset.bound = 'true';
        btnDiscard.addEventListener('click', () => this.discardDraft());
      }

      const btnConfirm = document.getElementById('voice-btn-confirm-invoice');
      if (btnConfirm && !btnConfirm.dataset.bound) {
        btnConfirm.dataset.bound = 'true';
        btnConfirm.addEventListener('click', () => this.confirmDraft());
      }

      const btnEditManual = document.getElementById('voice-btn-edit-manual');
      if (btnEditManual && !btnEditManual.dataset.bound) {
        btnEditManual.dataset.bound = 'true';
        btnEditManual.addEventListener('click', () => this.editInManualForm());
      }

      const btnThermal = document.getElementById('voice-btn-thermal-print');
      if (btnThermal && !btnThermal.dataset.bound) {
        btnThermal.dataset.bound = 'true';
        btnThermal.addEventListener('click', () => {
          if (this.activeDraft) {
            ThermalReceiptController.openModal(this.activeDraft);
          }
        });
      }

      const btnWhatsapp = document.getElementById('voice-btn-share-whatsapp');
      if (btnWhatsapp && !btnWhatsapp.dataset.bound) {
        btnWhatsapp.dataset.bound = 'true';
        btnWhatsapp.addEventListener('click', () => this.shareWhatsApp());
      }

      // Payment & Discount in Voice Draft
      const selPayment = document.getElementById('voice-draft-payment-method');
      if (selPayment && !selPayment.dataset.bound) {
        selPayment.dataset.bound = 'true';
        selPayment.addEventListener('change', (e) => {
          if (this.activeDraft) this.activeDraft.paymentMethod = e.target.value;
        });
      }

      const inputDiscount = document.getElementById('voice-draft-discount');
      if (inputDiscount && !inputDiscount.dataset.bound) {
        inputDiscount.dataset.bound = 'true';
        inputDiscount.addEventListener('input', (e) => {
          const disc = Math.max(0, parseFloat(e.target.value) || 0);
          if (this.activeDraft) {
            this.activeDraft.discountAmount = disc;
            this.activeDraft.discountValue = disc;
            this.recalculateDraft();
          }
        });
      }
    },

    setLanguage(lang) {
      this.currentLang = lang;
      if (this.recognition) this.recognition.lang = lang;
      document.querySelectorAll('.voice-lang-btn').forEach(b => {
        if (b.getAttribute('data-lang') === lang) b.classList.add('active');
        else b.classList.remove('active');
      });
      Toast.show(lang === 'hi-IN' ? 'Language set to Hindi (हिंदी)' : 'Language set to English / Hinglish', 'default');
    },

    toggleListening() {
      if (this.isListening) {
        this.stopListening();
      } else {
        this.startListening();
      }
    },

    async startListening() {
      if (!this.recognition) {
        this.initSpeechEngine();
        if (!this.recognition) {
          Toast.show('Speech recognition is not supported in this browser. Please use Chrome or Edge.', 'error');
          return;
        }
      }

      this.isListening = true;
      this.secondsRemaining = this.TOTAL_SECONDS;
      this.startCountdownTimer();

      try {
        this.recognition.start();
      } catch (e) {
        console.warn('Speech start retry:', e);
        try {
          this.recognition.stop();
          setTimeout(() => {
            if (this.isListening) this.recognition.start();
          }, 150);
        } catch (err) {}
      }
    },

    startCountdownTimer() {
      if (this.countdownTimer) clearInterval(this.countdownTimer);

      const countBox = document.getElementById('voice-countdown-box');
      const timerText = document.getElementById('voice-timer-text');
      const progBar = document.getElementById('voice-timer-progress-bar');

      if (countBox && this.targetInput === 'voice') {
        countBox.style.display = 'block';
      }

      if (timerText) {
        timerText.textContent = `⏱️ ${this.secondsRemaining}s remaining... (बोलते रहें)`;
      }
      if (progBar) {
        progBar.style.width = '100%';
      }

      this.countdownTimer = setInterval(() => {
        this.secondsRemaining--;

        if (timerText) {
          timerText.textContent = `⏱️ ${this.secondsRemaining}s remaining... (बोलते रहें)`;
        }
        if (progBar) {
          const pct = Math.max(0, (this.secondsRemaining / this.TOTAL_SECONDS) * 100);
          progBar.style.width = `${pct}%`;
        }

        const aiMicBtn = document.getElementById('ai-btn-mic-prompt');
        if (aiMicBtn && this.targetInput === 'ai') {
          aiMicBtn.innerHTML = `🔴 <span>Listening (${this.secondsRemaining}s)</span>`;
        }

        if (this.secondsRemaining <= 0) {
          clearInterval(this.countdownTimer);
          this.countdownTimer = null;
          this.stopListening();
        }
      }, 1000);
    },

    stopListening() {
      this.isListening = false;
      this.secondsRemaining = 0;

      if (this.countdownTimer) {
        clearInterval(this.countdownTimer);
        this.countdownTimer = null;
      }

      const countBox = document.getElementById('voice-countdown-box');
      if (countBox) countBox.style.display = 'none';

      if (this.recognition) {
        try { this.recognition.stop(); } catch (e) {}
      }

      this.updateListeningUI(false);
      this.stopAudioVisualizer();

      const interimBox = document.getElementById('voice-live-interim-box');
      if (interimBox) interimBox.style.display = 'none';

      if (this.targetInput === 'voice') {
        const textarea = document.getElementById('voice-transcript-textarea');
        if (textarea && textarea.value.trim().length >= 3) {
          this.processVoiceBill();
        }
      } else if (this.targetInput === 'ai') {
        const aiPrompt = document.getElementById('ai-prompt-input');
        if (aiPrompt && aiPrompt.value.trim().length >= 3) {
          if (typeof AiBillingController !== 'undefined') {
            AiBillingController.handlePromptSubmit();
          }
        }
      }
    },

    updateListeningUI(listening) {
      const btn = document.getElementById('btn-voice-mic-main');
      const label = document.getElementById('voice-status-label');
      const waveBars = document.getElementById('voice-wave-bars');
      const icon = document.getElementById('voice-mic-icon');
      const aiMicBtn = document.getElementById('ai-btn-mic-prompt');

      if (listening) {
        if (btn) btn.classList.add('listening');
        if (icon) icon.textContent = '🔴';
        if (label) label.textContent = 'Listening (20s Window)... आराम से पूरा बोलें';
        if (waveBars) waveBars.style.display = 'flex';
        if (aiMicBtn) {
          aiMicBtn.style.background = '#fee2e2';
          aiMicBtn.style.borderColor = '#ef4444';
          aiMicBtn.style.color = '#b91c1c';
          aiMicBtn.innerHTML = '🔴 <span>Listening (20s)...</span>';
        }
      } else {
        if (btn) btn.classList.remove('listening');
        if (icon) icon.textContent = '🎙️';
        if (label) label.textContent = 'Tap Microphone to Speak / 20 सेकंड तक आराम से बोलें';
        if (waveBars) waveBars.style.display = 'none';
        if (aiMicBtn) {
          aiMicBtn.style.background = '#ede9fe';
          aiMicBtn.style.borderColor = '#c4b5fd';
          aiMicBtn.style.color = '#7c3aed';
          aiMicBtn.innerHTML = '🎙️ <span>Speak</span>';
        }
      }
    },

    async processVoiceBill() {
      const textarea = document.getElementById('voice-transcript-textarea');
      let prompt = textarea ? textarea.value.trim() : '';
      if (!prompt) {
        Toast.show('Please speak or type the items sold', 'warning');
        return;
      }

      const inputCustName = document.getElementById('voice-cust-name-input');
      const explicitName = (inputCustName ? inputCustName.value : '').trim();

      const inputCustPhone = document.getElementById('voice-cust-phone-input');
      const explicitPhone = (inputCustPhone ? inputCustPhone.value : '').trim();

      const statusLabel = document.getElementById('voice-status-label');
      if (statusLabel) statusLabel.textContent = '⏳ Processing speech into bill...';

      // 1. Process locally using VoiceBillingMatcher (High accuracy, offline resilient)
      const catalog = Store.getProducts();
      const customers = Store.getCustomers();
      const parsed = VoiceBillingMatcher.parseSpokenBill(prompt, catalog, customers, explicitName, explicitPhone);

      if (parsed.items && parsed.items.length > 0) {
        this.activeDraft = {
          customerId: parsed.customer ? parsed.customer.id : null,
          customerName: parsed.customerName || 'Walk-in Customer',
          customerPhone: parsed.customerPhone || '',
          isExistingCustomer: !parsed.isUnregistered && parsed.customerName !== 'Walk-in Customer',
          isUnregistered: parsed.isUnregistered,
          spokenCustomerName: parsed.spokenCustomerName,
          items: parsed.items,
          ambiguityList: parsed.ambiguityList || [],
          subtotal: parsed.subtotal,
          discountAmount: parsed.discountAmount || 0,
          discountValue: parsed.discountAmount || 0,
          taxRate: 0,
          taxAmount: 0,
          grandTotal: parsed.grandTotal,
          paymentMethod: parsed.paymentMethod || 'Cash',
          isPaymentSpoken: parsed.isPaymentSpoken,
          paymentStatus: 'Paid',
          rawPrompt: prompt
        };

        this.renderDraft(this.activeDraft);
        if (statusLabel) statusLabel.textContent = '✓ Bill Draft Ready! Review items below.';
        Toast.show('Bill generated from speech!', 'success');
        return;
      }

      if (statusLabel) statusLabel.textContent = 'Tap Microphone to Speak / बोलने के लिए माइक दबाएं';
      Toast.show('Could not identify items from speech. Try: "5 register 100 me, 2 pen 10 me, cash"', 'warning');
    },

    renderDraft(draft) {
      const card = document.getElementById('voice-draft-card');
      const tbody = document.getElementById('voice-draft-table-body');
      const ambCard = document.getElementById('voice-ambiguity-card');
      const ambList = document.getElementById('voice-ambiguity-list');
      const conflictContainer = document.getElementById('voice-conflict-container');
      if (!card || !tbody) return;

      // 1. Render Ambiguity Resolvers (if any items match multiple catalog products)
      if (ambCard && ambList) {
        if (draft.ambiguityList && draft.ambiguityList.length > 0) {
          ambList.innerHTML = '';
          draft.ambiguityList.forEach(amb => {
            const item = draft.items[amb.itemIndex];
            const groupDiv = document.createElement('div');
            groupDiv.style.marginBottom = '8px';
            groupDiv.innerHTML = `<div style="font-size:12px;font-weight:700;color:var(--muted);margin-bottom:4px">Choices for "${Utils.escapeHtml(amb.term)}":</div>`;

            amb.options.forEach(opt => {
              const btn = document.createElement('button');
              btn.type = 'button';
              btn.className = 'voice-ambiguity-btn';
              btn.innerHTML = `
                <div>
                  <span class="voice-ambiguity-title">${Utils.escapeHtml(opt.name)}</span>
                  <span style="font-size:11px;color:var(--muted);margin-left:6px">SKU: ${Utils.escapeHtml(opt.sku || '—')}</span>
                </div>
                <div class="voice-ambiguity-meta">
                  <span style="font-weight:800;color:#059669">₹${Number(opt.price).toFixed(2)}</span>
                  <span class="status" style="font-size:10px;padding:2px 6px">${opt.stock} in stock</span>
                </div>
              `;
              btn.addEventListener('click', () => {
                this.resolveAmbiguity(amb.itemIndex, opt);
              });
              groupDiv.appendChild(btn);
            });

            // Keep custom option
            const btnCustom = document.createElement('button');
            btnCustom.type = 'button';
            btnCustom.className = 'voice-ambiguity-btn';
            btnCustom.style.background = '#f8fafc';
            btnCustom.style.borderStyle = 'dashed';
            btnCustom.innerHTML = `
              <div>
                <span class="voice-ambiguity-title">✎ Keep as Uncataloged "${Utils.escapeHtml(amb.term)}"</span>
              </div>
              <span class="muted" style="font-size:11px">Set price manually</span>
            `;
            btnCustom.addEventListener('click', () => {
              this.keepAmbiguousAsCustom(amb.itemIndex, amb.term);
            });
            groupDiv.appendChild(btnCustom);

            ambList.appendChild(groupDiv);
          });
          ambCard.style.display = 'block';
        } else {
          ambCard.style.display = 'none';
        }
      }

      // 2. Render Conflict & Smart Assistance Banners
      if (conflictContainer) {
        conflictContainer.innerHTML = '';
        let hasAlerts = false;

        // A. Price Conflict Banners
        draft.items.forEach((it, idx) => {
          if (it.hasPriceConflict) {
            hasAlerts = true;
            const b = document.createElement('div');
            b.className = 'voice-conflict-banner price-conflict';
            b.innerHTML = `
              <div class="voice-conflict-header">
                <span>⚡</span>
                <span style="color:#92400e"><strong>Price Conflict on "${Utils.escapeHtml(it.name)}":</strong> Spoken ₹${it.spokenPrice} vs Catalog ₹${it.catalogPrice}</span>
              </div>
              <div class="voice-conflict-actions">
                <button type="button" class="voice-conflict-btn btn-catalog" onclick="window.VoiceBillingController.resolvePriceConflict(${idx}, ${it.catalogPrice})">✓ Use Catalog Price (₹${it.catalogPrice})</button>
                <button type="button" class="voice-conflict-btn btn-spoken" onclick="window.VoiceBillingController.resolvePriceConflict(${idx}, ${it.spokenPrice})">✓ Use Spoken Price (₹${it.spokenPrice})</button>
              </div>
            `;
            conflictContainer.appendChild(b);
          }
        });

        // B. Unregistered Customer Banner
        if (draft.isUnregistered && draft.spokenCustomerName) {
          hasAlerts = true;
          const b = document.createElement('div');
          b.className = 'voice-conflict-banner customer-alert';
          b.innerHTML = `
            <div class="voice-conflict-header">
              <span>👤</span>
              <span style="color:#1e40af"><strong>Customer "${Utils.escapeHtml(draft.spokenCustomerName)}" is not registered in your directory.</strong></span>
            </div>
            <div class="voice-conflict-actions">
              <button type="button" class="voice-conflict-btn btn-action" onclick="window.VoiceBillingController.registerCustomerPrompt('${Utils.escapeHtml(draft.spokenCustomerName)}')">＋ Add "${Utils.escapeHtml(draft.spokenCustomerName)}" to Customers</button>
              <button type="button" class="voice-conflict-btn btn-secondary-opt" onclick="window.VoiceBillingController.keepWalkInCustomer()">Continue as Walk-in Customer</button>
            </div>
          `;
          conflictContainer.appendChild(b);
        }

        // C. Missing Payment Method Selector
        if (!draft.isPaymentSpoken) {
          hasAlerts = true;
          const b = document.createElement('div');
          b.className = 'voice-conflict-banner payment-alert';
          b.innerHTML = `
            <div class="voice-conflict-header">
              <span>💳</span>
              <span style="color:#9d174d"><strong>Payment method was not spoken:</strong> Quick select payment mode:</span>
            </div>
            <div class="voice-conflict-actions">
              <button type="button" class="voice-conflict-btn ${draft.paymentMethod === 'Cash' ? 'btn-action' : 'btn-secondary-opt'}" onclick="window.VoiceBillingController.setPaymentMethod('Cash')">💵 Cash (नकद)</button>
              <button type="button" class="voice-conflict-btn ${draft.paymentMethod === 'UPI' ? 'btn-action' : 'btn-secondary-opt'}" onclick="window.VoiceBillingController.setPaymentMethod('UPI')">📱 UPI / QR</button>
              <button type="button" class="voice-conflict-btn ${draft.paymentMethod === 'Card' ? 'btn-action' : 'btn-secondary-opt'}" onclick="window.VoiceBillingController.setPaymentMethod('Card')">💳 Card</button>
              <button type="button" class="voice-conflict-btn ${draft.paymentMethod === 'Pending' ? 'btn-action' : 'btn-secondary-opt'}" onclick="window.VoiceBillingController.setPaymentMethod('Pending')">📒 Udhaar / Pending</button>
            </div>
          `;
          conflictContainer.appendChild(b);
        }

        // D. Insufficient Stock Warning
        draft.items.forEach((it, idx) => {
          if (it.hasInsufficientStock) {
            hasAlerts = true;
            const b = document.createElement('div');
            b.className = 'voice-conflict-banner stock-alert';
            b.innerHTML = `
              <div class="voice-conflict-header">
                <span>⚠️</span>
                <span style="color:#991b1b"><strong>Insufficient Stock for "${Utils.escapeHtml(it.name)}":</strong> Requested ${it.qty} pcs, but only ${it.availableStock} pcs available.</span>
              </div>
              <div class="voice-conflict-actions">
                <button type="button" class="voice-conflict-btn btn-catalog" onclick="window.VoiceBillingController.adjustItemQty(${idx}, ${it.availableStock})">Adjust to Available (${it.availableStock} pcs)</button>
                <button type="button" class="voice-conflict-btn btn-secondary-opt" onclick="window.VoiceBillingController.dismissStockWarning(${idx})">Keep Requested (${it.qty} pcs)</button>
              </div>
            `;
            conflictContainer.appendChild(b);
          }
        });

        // E. Uncataloged Item Notice
        draft.items.forEach((it, idx) => {
          if (it.isUncataloged && it.name !== 'Item') {
            hasAlerts = true;
            const b = document.createElement('div');
            b.className = 'voice-conflict-banner';
            b.style.background = '#fefce8';
            b.style.border = '1.5px solid #eab308';
            b.innerHTML = `
              <div class="voice-conflict-header">
                <span>📦</span>
                <span style="color:#854d0e"><strong>Item "${Utils.escapeHtml(it.name)}" is uncataloged:</strong> Price set to ₹${it.price}.</span>
              </div>
              <div class="voice-conflict-actions">
                <button type="button" class="voice-conflict-btn btn-action" onclick="window.VoiceBillingController.addUncatalogedToCatalog(${idx})">＋ Add "${Utils.escapeHtml(it.name)}" to Catalog (₹${it.price})</button>
                <button type="button" class="voice-conflict-btn btn-secondary-opt" onclick="window.VoiceBillingController.dismissUncatalogedNotice(${idx})">Keep as One-Time Item</button>
              </div>
            `;
            conflictContainer.appendChild(b);
          }
        });

        conflictContainer.style.display = hasAlerts ? 'flex' : 'none';
      }

      // 3. Render Table Rows
      tbody.innerHTML = '';
      (draft.items || []).forEach((it, idx) => {
        const tr = document.createElement('tr');

        let badges = '';
        if (it.productId) {
          badges += `<span class="tag" style="background:#ecfdf5;color:#047857;font-size:10px;margin-left:6px">Catalog</span>`;
        } else {
          badges += `<span class="tag" style="background:#fef3c7;color:#92400e;font-size:10px;margin-left:6px">Uncataloged</span>`;
        }
        if (it.hasPriceConflict) {
          badges += `<span class="tag" style="background:#fffbeb;color:#b45309;font-size:10px;margin-left:4px">⚡ Price Spoken ₹${it.price}</span>`;
        }
        if (it.hasInsufficientStock) {
          badges += `<span class="tag" style="background:#fef2f2;color:#b91c1c;font-size:10px;margin-left:4px">⚠️ Low Stock (${it.availableStock})</span>`;
        }

        tr.innerHTML = `
          <td>
            <strong>${Utils.escapeHtml(it.name)}</strong>
            ${badges}
          </td>
          <td style="text-align:center">
            <input type="number" min="1" class="qty-input" value="${it.qty}" oninput="window.VoiceBillingController.updateItemQty(${idx}, this.value)" style="width:65px;padding:4px;text-align:center;border:1px solid var(--line);border-radius:4px;font-weight:700">
          </td>
          <td style="text-align:right">
            <input type="number" min="0" step="any" class="price-input" value="${it.price}" oninput="window.VoiceBillingController.updateItemPrice(${idx}, this.value)" style="width:85px;padding:4px;text-align:right;border:1px solid var(--line);border-radius:4px;font-weight:700">
          </td>
          <td style="text-align:right" id="voice-row-total-${idx}"><strong>${Utils.formatCurrency(it.total, '₹')}</strong></td>
          <td style="text-align:center">
            <button type="button" class="btn-icon danger" onclick="window.VoiceBillingController.removeItem(${idx})" title="Remove Item">✕</button>
          </td>
        `;
        tbody.appendChild(tr);
      });

      const selPayment = document.getElementById('voice-draft-payment-method');
      if (selPayment) selPayment.value = draft.paymentMethod || 'Cash';

      const inputDiscount = document.getElementById('voice-draft-discount');
      if (inputDiscount) inputDiscount.value = draft.discountAmount || 0;

      const metaText = document.getElementById('voice-draft-meta-text');
      if (metaText) {
        const custType = draft.isExistingCustomer ? 'Existing Customer' : (draft.isUnregistered ? 'Unregistered Customer' : 'Walk-in');
        metaText.textContent = `Customer: ${draft.customerName || 'Walk-in'} (${custType}) • ${draft.items.length} item(s) • Payment: ${draft.paymentMethod || 'Cash'}`;
      }

      this.recalculateDraft();
      card.style.display = 'block';
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    },

    resolveAmbiguity(itemIndex, chosenProduct) {
      if (!this.activeDraft || !this.activeDraft.items[itemIndex]) return;
      const item = this.activeDraft.items[itemIndex];
      item.productId = chosenProduct.id;
      item.name = chosenProduct.name;
      item.sku = chosenProduct.sku || '';
      item.catalogPrice = Number(chosenProduct.price) || 0;
      item.isAmbiguous = false;
      item.isUncataloged = false;

      // check price conflict
      if (item.spokenPrice !== null && Math.abs(item.spokenPrice - item.catalogPrice) > 0.01) {
        item.hasPriceConflict = true;
        item.price = item.spokenPrice;
      } else {
        item.hasPriceConflict = false;
        item.price = item.catalogPrice;
      }
      item.total = Math.round(item.qty * item.price * 100) / 100;

      // remove from ambiguity list
      if (this.activeDraft.ambiguityList) {
        this.activeDraft.ambiguityList = this.activeDraft.ambiguityList.filter(a => a.itemIndex !== itemIndex);
      }

      Toast.show(`Applied "${chosenProduct.name}" to draft!`, 'success');
      this.renderDraft(this.activeDraft);
    },

    keepAmbiguousAsCustom(itemIndex, term) {
      if (!this.activeDraft || !this.activeDraft.items[itemIndex]) return;
      const item = this.activeDraft.items[itemIndex];
      item.isAmbiguous = false;
      item.isUncataloged = true;
      if (this.activeDraft.ambiguityList) {
        this.activeDraft.ambiguityList = this.activeDraft.ambiguityList.filter(a => a.itemIndex !== itemIndex);
      }
      this.renderDraft(this.activeDraft);
    },

    resolvePriceConflict(itemIndex, chosenPrice) {
      if (!this.activeDraft || !this.activeDraft.items[itemIndex]) return;
      const item = this.activeDraft.items[itemIndex];
      item.price = Number(chosenPrice) || 0;
      item.hasPriceConflict = false;
      item.total = Math.round(item.qty * item.price * 100) / 100;
      Toast.show(`Price set to ₹${item.price} for "${item.name}"`, 'success');
      this.renderDraft(this.activeDraft);
    },

    setPaymentMethod(method) {
      if (!this.activeDraft) return;
      this.activeDraft.paymentMethod = method;
      this.activeDraft.isPaymentSpoken = true;
      Toast.show(`Payment mode set to ${method}`, 'default');
      this.renderDraft(this.activeDraft);
    },

    registerCustomerPrompt(name) {
      if (!this.activeDraft) return;
      const phone = this.activeDraft.customerPhone || '';
      const customers = Store.getCustomers();
      const newCust = {
        id: Utils.generateId('cust_'),
        name: name,
        phone: phone,
        email: '',
        address: '',
        notes: 'Added from Voice Billing counter',
        createdAt: new Date().toISOString()
      };

      customers.unshift(newCust);
      Store.saveCustomers(customers);

      if (AuthController.isAuthenticated()) {
        const activeBizId = AuthController.getActiveBusinessId();
        ApiClient.createCustomer(activeBizId, newCust).catch(e => console.warn('Cloud customer save error', e));
      }

      this.activeDraft.customerId = newCust.id;
      this.activeDraft.customerName = newCust.name;
      this.activeDraft.isUnregistered = false;
      this.activeDraft.isExistingCustomer = true;

      Toast.show(`Customer "${newCust.name}" registered successfully!`, 'success');
      this.renderDraft(this.activeDraft);
    },

    keepWalkInCustomer() {
      if (!this.activeDraft) return;
      this.activeDraft.isUnregistered = false;
      this.renderDraft(this.activeDraft);
    },

    adjustItemQty(itemIndex, newQty) {
      this.updateItemQty(itemIndex, newQty);
      if (this.activeDraft && this.activeDraft.items[itemIndex]) {
        this.activeDraft.items[itemIndex].hasInsufficientStock = false;
        this.renderDraft(this.activeDraft);
      }
    },

    dismissStockWarning(itemIndex) {
      if (!this.activeDraft || !this.activeDraft.items[itemIndex]) return;
      this.activeDraft.items[itemIndex].hasInsufficientStock = false;
      this.renderDraft(this.activeDraft);
    },

    addUncatalogedToCatalog(itemIndex) {
      if (!this.activeDraft || !this.activeDraft.items[itemIndex]) return;
      const item = this.activeDraft.items[itemIndex];
      const products = Store.getProducts();
      const newProd = {
        id: Utils.generateId('prod_'),
        name: item.name,
        sku: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
        price: Number(item.price) || 0,
        costPrice: Number(item.price) * 0.7,
        stock: 50,
        type: 'product',
        category: 'General',
        createdAt: new Date().toISOString()
      };

      products.unshift(newProd);
      Store.saveProducts(products);

      if (AuthController.isAuthenticated()) {
        const activeBizId = AuthController.getActiveBusinessId();
        ApiClient.createProduct(activeBizId, newProd).catch(e => console.warn('Cloud product save error', e));
      }

      item.productId = newProd.id;
      item.sku = newProd.sku;
      item.isUncataloged = false;

      Toast.show(`Added "${newProd.name}" to Catalog at ₹${newProd.price}!`, 'success');
      this.renderDraft(this.activeDraft);
    },

    dismissUncatalogedNotice(itemIndex) {
      if (!this.activeDraft || !this.activeDraft.items[itemIndex]) return;
      this.activeDraft.items[itemIndex].isUncataloged = false;
      this.renderDraft(this.activeDraft);
    },

    updateItemQty(idx, val) {
      if (!this.activeDraft || !this.activeDraft.items[idx]) return;
      const qty = Math.max(1, parseInt(val, 10) || 1);
      const item = this.activeDraft.items[idx];
      item.qty = qty;
      item.total = Math.round(qty * (item.price || 0) * 100) / 100;
      const totalEl = document.getElementById(`voice-row-total-${idx}`);
      if (totalEl) totalEl.innerHTML = `<strong>${Utils.formatCurrency(item.total, '₹')}</strong>`;
      this.recalculateDraft();
    },

    updateItemPrice(idx, val) {
      if (!this.activeDraft || !this.activeDraft.items[idx]) return;
      const price = Math.max(0, parseFloat(val) || 0);
      const item = this.activeDraft.items[idx];
      item.price = price;
      item.total = Math.round((item.qty || 1) * price * 100) / 100;
      const totalEl = document.getElementById(`voice-row-total-${idx}`);
      if (totalEl) totalEl.innerHTML = `<strong>${Utils.formatCurrency(item.total, '₹')}</strong>`;
      this.recalculateDraft();
    },

    removeItem(idx) {
      if (!this.activeDraft || !this.activeDraft.items) return;
      this.activeDraft.items.splice(idx, 1);
      if (this.activeDraft.items.length === 0) {
        this.discardDraft();
      } else {
        this.renderDraft(this.activeDraft);
      }
    },

    recalculateDraft() {
      if (!this.activeDraft) return;
      const subtotal = (this.activeDraft.items || []).reduce((s, it) => s + (it.total || 0), 0);
      const discount = Math.min(subtotal, Math.max(0, this.activeDraft.discountAmount || 0));
      const grandTotal = Math.max(0, subtotal - discount);

      this.activeDraft.subtotal = subtotal;
      this.activeDraft.discountAmount = discount;
      this.activeDraft.grandTotal = grandTotal;

      const elSub = document.getElementById('voice-draft-subtotal');
      const elDisc = document.getElementById('voice-draft-discount-val');
      const elTotal = document.getElementById('voice-draft-grand-total');

      if (elSub) elSub.textContent = Utils.formatCurrency(subtotal, '₹');
      if (elDisc) elDisc.textContent = `-${Utils.formatCurrency(discount, '₹')}`;
      if (elTotal) elTotal.textContent = Utils.formatCurrency(grandTotal, '₹');
    },

    discardDraft() {
      this.activeDraft = null;
      const card = document.getElementById('voice-draft-card');
      const ambCard = document.getElementById('voice-ambiguity-card');
      const conflictContainer = document.getElementById('voice-conflict-container');
      if (card) card.style.display = 'none';
      if (ambCard) ambCard.style.display = 'none';
      if (conflictContainer) conflictContainer.style.display = 'none';
      const statusLabel = document.getElementById('voice-status-label');
      if (statusLabel) statusLabel.textContent = 'Tap Microphone to Speak / 20 सेकंड तक आराम से बोलें';
    },

    async confirmDraft() {
      if (!this.activeDraft || !this.activeDraft.items || this.activeDraft.items.length === 0) {
        Toast.show('No items in draft to confirm', 'error');
        return;
      }

      const settings = Store.getSettings();
      const invoiceData = {
        customerId: this.activeDraft.customerId || null,
        invoiceNumber: `${settings.invoicePrefix}${settings.nextNumber}`,
        date: Utils.todayYMD(),
        dueDate: Utils.todayYMD(),
        customerName: this.activeDraft.customerName || 'Walk-in Customer',
        customerPhone: this.activeDraft.customerPhone || '',
        customerAddress: '',
        items: this.activeDraft.items.map(it => ({
          productId: it.productId || null,
          name: it.name,
          sku: it.sku || '',
          qty: it.qty,
          price: it.price,
          costPrice: it.costPrice || (it.price * 0.7),
          total: it.total
        })),
        subtotal: this.activeDraft.subtotal,
        discountType: 'fixed',
        discountValue: this.activeDraft.discountAmount || 0,
        discountAmount: this.activeDraft.discountAmount || 0,
        taxRate: 0,
        taxAmount: 0,
        grandTotal: this.activeDraft.grandTotal,
        paymentMethod: this.activeDraft.paymentMethod || 'Cash',
        paymentStatus: this.activeDraft.paymentMethod === 'Pending' ? 'Pending' : 'Paid',
        paidAmount: this.activeDraft.paymentMethod === 'Pending' ? 0 : this.activeDraft.grandTotal,
        balanceDue: this.activeDraft.paymentMethod === 'Pending' ? this.activeDraft.grandTotal : 0,
        notes: `Generated via Voice Counter Assistant ("${this.activeDraft.rawPrompt || ''}")`
      };

      if (AuthController.isAuthenticated()) {
        const activeBizId = AuthController.getActiveBusinessId();
        try {
          const res = await ApiClient.createInvoice(activeBizId, invoiceData);
          if (res.invoice) {
            settings.nextNumber = (Number(settings.nextNumber) || 1001) + 1;
            Store.saveSettings(settings);

            // Deduct stock in store
            const products = Store.getProducts();
            (this.activeDraft.items || []).forEach(it => {
              if (it.productId) {
                const p = products.find(prod => prod.id === it.productId);
                if (p && p.type === 'product') p.stock = Math.max(0, (p.stock || 0) - it.qty);
              }
            });
            Store.saveProducts(products);

            await AuthController.syncFromCloud(activeBizId);
            Toast.show(`Invoice #${res.invoice.invoiceNumber || res.invoice.invoice_number} created successfully!`, 'success');
            this.discardDraft();
            const textarea = document.getElementById('voice-transcript-textarea');
            if (textarea) textarea.value = '';
            DashboardController.render();
            InvoicesListController.render();
            if (typeof SalesAnalysisController !== 'undefined') SalesAnalysisController.render();
            return;
          }
        } catch (err) {
          console.warn('Cloud invoice save error', err);
        }
      }

      // Local store save
      const invoices = Store.getInvoices();
      const newInv = {
        id: Utils.generateId('inv_'),
        ...invoiceData,
        createdAt: new Date().toISOString()
      };
      invoices.unshift(newInv);
      Store.saveInvoices(invoices);

      // Deduct stock in local catalog
      const products = Store.getProducts();
      (this.activeDraft.items || []).forEach(it => {
        if (it.productId) {
          const p = products.find(prod => prod.id === it.productId);
          if (p && p.type === 'product') p.stock = Math.max(0, (p.stock || 0) - it.qty);
        }
      });
      Store.saveProducts(products);

      settings.nextNumber = (Number(settings.nextNumber) || 1001) + 1;
      Store.saveSettings(settings);

      Toast.show(`Invoice #${newInv.invoiceNumber} created successfully!`, 'success');
      this.discardDraft();
      const textarea = document.getElementById('voice-transcript-textarea');
      if (textarea) textarea.value = '';
      DashboardController.render();
      InvoicesListController.render();
      if (typeof SalesAnalysisController !== 'undefined') SalesAnalysisController.render();
      InvoicePreviewModal.open(newInv);
    },

    editInManualForm() {
      if (!this.activeDraft) return;
      InvoiceController.resetForm();

      const custName = document.getElementById('inv-customer-name');
      const custPhone = document.getElementById('inv-customer-phone');
      if (custName) custName.value = this.activeDraft.customerName || '';
      if (custPhone) custPhone.value = this.activeDraft.customerPhone || '';

      const discVal = document.getElementById('inv-discount-value');
      if (discVal) discVal.value = this.activeDraft.discountAmount || 0;

      const payMethod = document.getElementById('inv-payment-method');
      if (payMethod) payMethod.value = this.activeDraft.paymentMethod || 'Cash';

      const tbody = document.getElementById('line-items-tbody');
      if (tbody) {
        tbody.innerHTML = '';
        (this.activeDraft.items || []).forEach(it => {
          InvoiceController.addItemRow({
            productId: it.productId || 'custom',
            name: it.name,
            sku: it.sku || '',
            qty: it.qty,
            price: it.price
          });
        });
      }

      InvoiceController.recalculate();
      Navigation.switchView('create-invoice');
      Toast.show('Loaded voice draft into detailed invoice editor', 'default');
    },

    shareWhatsApp() {
      if (!this.activeDraft) return;
      const settings = Store.getSettings();
      let text = `*${settings.businessName} - Counter Bill*\n\n`;
      text += `Customer: ${this.activeDraft.customerName || 'Customer'}\n`;
      text += `--------------------------\n`;
      (this.activeDraft.items || []).forEach((it, idx) => {
        text += `${idx + 1}. ${it.name} x ${it.qty} = ₹${it.total}\n`;
      });
      text += `--------------------------\n`;
      text += `*Total Amount: ₹${this.activeDraft.grandTotal}*\n`;
      text += `Payment Mode: ${this.activeDraft.paymentMethod || 'Cash'}\n\n`;
      text += `Thank you for your visit!`;

      const phone = (this.activeDraft.customerPhone || '').replace(/\D/g, '');
      const waUrl = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(waUrl, '_blank');
    }
  };

  // ============================================================
  // THERMAL POS RECEIPT PRINTER CONTROLLER (80mm / 58mm)
  // ============================================================
  const ThermalReceiptController = {
    activeInvoiceData: null,
    currentRollWidth: '80',

    init() {
      const btn80 = document.getElementById('thermal-size-80');
      const btn58 = document.getElementById('thermal-size-58');
      if (btn80 && !btn80.dataset.bound) {
        btn80.dataset.bound = 'true';
        btn80.addEventListener('click', () => this.setRollWidth('80'));
      }
      if (btn58 && !btn58.dataset.bound) {
        btn58.dataset.bound = 'true';
        btn58.addEventListener('click', () => this.setRollWidth('58'));
      }

      const btnPrint = document.getElementById('btn-print-thermal-action');
      if (btnPrint && !btnPrint.dataset.bound) {
        btnPrint.dataset.bound = 'true';
        btnPrint.addEventListener('click', () => this.printSlip());
      }
    },

    setRollWidth(width) {
      this.currentRollWidth = width;
      const paper = document.getElementById('thermal-paper-content');
      if (paper) {
        paper.className = `thermal-paper size-${width}mm`;
      }
      document.querySelectorAll('.thermal-size-btn').forEach(b => {
        if (b.getAttribute('data-width') === width) b.classList.add('active');
        else b.classList.remove('active');
      });
    },

    openModal(invoiceOrDraft) {
      if (!invoiceOrDraft) return;
      this.activeInvoiceData = invoiceOrDraft;
      this.renderThermalPaper(invoiceOrDraft);
      Modal.open('modal-thermal-receipt');
    },

    openModalFromActiveInvoice() {
      const invoices = Store.getInvoices();
      if (InvoiceController.editingInvoiceId) {
        const inv = invoices.find(i => i.id === InvoiceController.editingInvoiceId);
        if (inv) return this.openModal(inv);
      }
      const data = InvoiceController.collectFormData();
      if (data && data.items && data.items.length > 0) {
        return this.openModal(data);
      }
      if (invoices.length > 0) {
        return this.openModal(invoices[0]);
      }
      Toast.show('No invoice data available to print POS slip', 'error');
    },

    renderThermalPaper(data) {
      const container = document.getElementById('thermal-paper-content');
      if (!container) return;

      const settings = Store.getSettings();
      const items = data.items || [];
      const totalAmount = data.grandTotal || data.totalAmount || 0;
      const subtotal = data.subtotal || totalAmount;
      const discount = data.discountAmount || 0;
      const tax = data.taxAmount || 0;
      const custName = data.customerName || 'Walk-in Customer';
      const custPhone = data.customerPhone || '';
      const invNum = data.invoiceNumber || 'REC-POS';
      const dateStr = data.date || Utils.todayYMD();
      const pmtMethod = data.paymentMethod || 'Cash';

      const itemsRowsHtml = items.map(it => `
        <tr>
          <td>
            <strong>${Utils.escapeHtml(it.name)}</strong>
          </td>
          <td style="text-align:center">${it.qty}</td>
          <td style="text-align:right">₹${it.price}</td>
          <td style="text-align:right"><strong>₹${it.total}</strong></td>
        </tr>
      `).join('');

      container.innerHTML = `
        <div class="thermal-header">
          <div class="thermal-biz-title">${Utils.escapeHtml(settings.businessName || 'BILLFLOW STORE')}</div>
          ${settings.address ? `<div style="font-size:11px;margin-top:2px">${Utils.escapeHtml(settings.address)}</div>` : ''}
          ${settings.phone ? `<div style="font-size:11px">Ph: ${Utils.escapeHtml(settings.phone)}</div>` : ''}
          ${settings.gstin ? `<div style="font-size:11px">GSTIN: ${Utils.escapeHtml(settings.gstin)}</div>` : ''}
        </div>

        <div class="thermal-divider"></div>

        <div class="thermal-row" style="font-weight:700">
          <span>TAX INVOICE / POS RECEIPT</span>
          <span>#${Utils.escapeHtml(invNum)}</span>
        </div>
        <div class="thermal-row" style="font-size:11px">
          <span>Date: ${Utils.formatDate(dateStr)}</span>
          <span>Time: ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
        </div>
        <div class="thermal-row" style="font-size:11px">
          <span>Customer: <b>${Utils.escapeHtml(custName)}</b></span>
          ${custPhone ? `<span>${Utils.escapeHtml(custPhone)}</span>` : ''}
        </div>

        <div class="thermal-divider"></div>

        <table class="thermal-table">
          <thead>
            <tr>
              <th style="text-align:left">Item</th>
              <th style="text-align:center">Qty</th>
              <th style="text-align:right">Rate</th>
              <th style="text-align:right">Amt</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRowsHtml}
          </tbody>
        </table>

        <div class="thermal-divider"></div>

        <div class="thermal-row">
          <span>Subtotal:</span>
          <span>₹${Number(subtotal).toFixed(2)}</span>
        </div>
        ${discount > 0 ? `
          <div class="thermal-row">
            <span>Discount:</span>
            <span>-₹${Number(discount).toFixed(2)}</span>
          </div>
        ` : ''}
        ${tax > 0 ? `
          <div class="thermal-row">
            <span>GST / Tax:</span>
            <span>₹${Number(tax).toFixed(2)}</span>
          </div>
        ` : ''}

        <div class="thermal-double-divider"></div>

        <div class="thermal-row thermal-total-row">
          <span>TOTAL AMOUNT:</span>
          <span>₹${Number(totalAmount).toFixed(2)}</span>
        </div>

        <div class="thermal-double-divider"></div>

        <div class="thermal-row" style="font-size:11px">
          <span>Payment Mode:</span>
          <span><b>${Utils.escapeHtml(pmtMethod)}</b></span>
        </div>
        <div class="thermal-row" style="font-size:11px">
          <span>Status:</span>
          <span><b>PAID ✓</b></span>
        </div>

        <div class="thermal-footer">
          <div style="font-weight:700">*** THANK YOU! VISIT AGAIN ***</div>
          <div style="font-size:10px;margin-top:3px;color:#666">BillFlow Point of Sale</div>
        </div>
      `;
    },

    printSlip() {
      document.body.classList.add('printing-thermal');
      window.print();
      setTimeout(() => {
        document.body.classList.remove('printing-thermal');
      }, 500);
    }
  };

  window.AuthController = AuthController;
  window.AiBillingController = AiBillingController;
  window.VoiceBillingController = VoiceBillingController;
  window.ThermalReceiptController = ThermalReceiptController;
  window.SalesAnalysisController = SalesAnalysisController;
  window.ThemeManager = ThemeManager;

  // --- BOOTSTRAP APP ON DOM READY ---
  document.addEventListener('DOMContentLoaded', () => {
    ThemeManager.init();

    // Ensure on laptop / desktop screen the full sidebar is always open and never collapsed
    document.body.classList.remove('sidebar-collapsed');
    localStorage.removeItem('billflow_sidebar_collapsed');

    Navigation.init();
    AuthController.init();
    SettingsController.init();
    SettingsController.loadSettings();
    ProductController.init();
    CustomerController.init();
    InvoiceController.init();
    InvoicesListController.init();
    AiBillingController.init();
    VoiceBillingController.init();
    ThermalReceiptController.init();
    SalesAnalysisController.init();
    DashboardController.render();
    SalesAnalysisController.render();
  });

})();
