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
      document.querySelectorAll('.nav button[data-view]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const view = btn.getAttribute('data-view');
          // If entering create-invoice or navigating away while in edit mode, reset form
          if (view === 'create-invoice') {
            InvoiceController.resetForm();
          } else if (InvoiceController.editingInvoiceId) {
            InvoiceController.resetForm();
          }
          this.switchView(view);
          if (window.innerWidth <= 720) {
            document.getElementById('sidebar').classList.remove('open');
          }
        });
      });

      // Header action buttons
      const btnAddCustomer = document.getElementById('header-btn-customer');
      if (btnAddCustomer) {
        btnAddCustomer.addEventListener('click', () => CustomerController.openAddModal());
      }
      const btnCreateInvoice = document.getElementById('header-btn-invoice');
      if (btnCreateInvoice) {
        btnCreateInvoice.addEventListener('click', () => {
          InvoiceController.resetForm();
          this.switchView('create-invoice');
        });
      }
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
      }

      document.querySelectorAll('.nav button').forEach(b => {
        if (b.getAttribute('data-view') === viewName) {
          b.classList.add('active');
        } else {
          b.classList.remove('active');
        }
      });

      // Trigger view renders
      if (viewName === 'dashboard') DashboardController.render();
      if (viewName === 'invoices') InvoicesListController.render();
      if (viewName === 'customers') CustomerController.renderList();
      if (viewName === 'products') ProductController.renderList();
      if (viewName === 'settings') SettingsController.loadSettings();
      if (viewName === 'create-invoice') InvoiceController.syncFormWithSettings();

      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // --- DASHBOARD CONTROLLER ---
  const DashboardController = {
    render() {
      const invoices = Store.getInvoices();
      const settings = Store.getSettings();
      const today = Utils.todayYMD();

      let todaySales = 0;
      let totalPaid = 0;
      let totalPending = 0;
      let totalCount = invoices.length;

      invoices.forEach(inv => {
        if (inv.date === today) {
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
        profileSelect.addEventListener('change', (e) => {
          Store.switchProfile(e.target.value);
          const p = Store.getProfiles().find(x => x.id === e.target.value);
          Toast.show(`Switched to business profile: ${p ? p.name : e.target.value}`, 'success');
          this.refreshAllDataViews();
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
        formNewProfile.addEventListener('submit', (e) => {
          e.preventDefault();
          const nameInput = document.getElementById('new-profile-name');
          const name = nameInput ? nameInput.value.trim() : '';
          if (!name) {
            Toast.show('Profile name is required', 'error');
            return;
          }
          Store.createProfile(name);
          Modal.close('modal-new-profile');
          this.renderProfileDropdown();
          this.refreshAllDataViews();
          Toast.show(`Created and switched to business profile: "${name}"`, 'success');
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
    saveSettings() {
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
      document.getElementById('prod-stock').value = product.stock || 0;

      const stockField = document.getElementById('prod-stock-field');
      if (stockField) {
        stockField.style.display = product.type === 'service' ? 'none' : 'flex';
      }

      Modal.open('modal-product');
    },
    saveProduct() {
      const name = document.getElementById('prod-name').value.trim();
      const type = document.getElementById('prod-type').value;
      const sku = document.getElementById('prod-sku').value.trim();
      const category = document.getElementById('prod-category').value.trim() || 'General';
      const price = parseFloat(document.getElementById('prod-price').value) || 0;
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
        const index = products.findIndex(p => p.id === this.editingId);
        if (index !== -1) {
          products[index] = { ...products[index], name, type, sku, category, price, stock };
          Store.saveProducts(products);
          Toast.show('Item updated successfully', 'success');
        }
      } else {
        const newProduct = {
          id: Utils.generateId('prod_'),
          name,
          type,
          sku,
          category,
          price,
          stock
        };
        products.push(newProduct);
        Store.saveProducts(products);
        Toast.show('Item added to catalog', 'success');
      }

      Modal.close('modal-product');
      this.renderList();
      InvoiceController.populateProductDropdowns();
    },
    delete(id) {
      const products = Store.getProducts();
      const prod = products.find(p => p.id === id);
      if (!prod) return;

      if (confirm(`Are you sure you want to delete "${prod.name}"?`)) {
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
    saveCustomer() {
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
        const index = customers.findIndex(c => c.id === this.editingId);
        if (index !== -1) {
          customers[index] = { ...customers[index], name, phone, email, address };
          Store.saveCustomers(customers);
          Toast.show('Customer updated successfully', 'success');
        }
      } else {
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
    delete(id) {
      const customers = Store.getCustomers();
      const customer = customers.find(c => c.id === id);
      if (!customer) return;

      if (confirm(`Are you sure you want to delete customer "${customer.name}"?`)) {
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
    saveInvoice(isDraft = false) {
      const data = this.collectFormData();
      const settings = Store.getSettings();

      if (!data.customerName) {
        Toast.show('Please select or specify a customer', 'error');
        document.getElementById('inv-customer-name')?.focus();
        return;
      }

      if (data.items.length === 0) {
        Toast.show('Please add at least one line item with a name', 'error');
        return;
      }

      // Strict validation for positive integer quantities
      const invalidQtyItem = data.items.find(it => isNaN(it.qty) || it.qty < 1 || !Number.isInteger(it.qty) || !it.isQtyValid);
      if (invalidQtyItem) {
        Toast.show('Quantity must be a positive whole number (minimum 1) for all items', 'error');
        return;
      }

      // Strict validation for custom tax
      if (document.getElementById('inv-tax-rate').value === 'custom') {
        const rawTaxVal = parseFloat(document.getElementById('inv-custom-tax')?.value);
        if (isNaN(rawTaxVal) || rawTaxVal < 0 || rawTaxVal > 100) {
          Toast.show('Custom tax rate must be between 0% and 100%', 'error');
          document.getElementById('inv-custom-tax')?.focus();
          return;
        }
      }

      if (data.grandTotal < 0) {
        Toast.show('Grand total cannot be negative', 'error');
        return;
      }

      const invoices = Store.getInvoices();

      // Prevent duplicate invoice numbers
      const duplicateInv = invoices.find(i =>
        i.invoiceNumber === data.invoiceNumber && i.id !== this.editingInvoiceId
      );
      if (duplicateInv) {
        Toast.show(`Invoice number "${data.invoiceNumber}" already exists. Please use a unique number.`, 'error');
        document.getElementById('inv-number')?.focus();
        return;
      }

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
        }
      }

      // Stock adjustment logic
      if (!isDraft) {
        const products = Store.getProducts();

        if (this.editingInvoiceId && this.originalInvoiceSnapshot) {
          // In edit mode: restore old quantities first, then deduct new quantities
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
          // In new invoice mode: deduct quantities
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
    delete(id) {
      const invoices = Store.getInvoices();
      const inv = invoices.find(i => i.id === id);
      if (!inv) return;

      if (confirm(`Are you sure you want to delete invoice #${inv.invoiceNumber}? This action cannot be undone.`)) {
        // Restore stock for products in deleted invoice
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

  // --- BOOTSTRAP APP ON DOM READY ---
  document.addEventListener('DOMContentLoaded', () => {
    Navigation.init();
    SettingsController.init();
    SettingsController.loadSettings();
    ProductController.init();
    CustomerController.init();
    InvoiceController.init();
    InvoicesListController.init();
    DashboardController.render();
  });

})();
