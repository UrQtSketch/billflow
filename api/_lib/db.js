const { Pool } = require('pg');

let pool = null;

function getPool() {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return null;
  }

  pool = new Pool({
    connectionString,
    ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
  });

  return pool;
}

// Memory fallback store for local development when DATABASE_URL is not yet set
const memoryStore = {
  users: [],
  businesses: [],
  products: [],
  customers: [],
  invoices: [],
  invoice_items: []
};

async function query(text, params = []) {
  const p = getPool();
  if (p) {
    return p.query(text, params);
  }
  return null;
}

async function initSchema() {
  const p = getPool();
  if (!p) return;

  const ddl = `
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      full_name VARCHAR(100) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS businesses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(150) NOT NULL,
      owner_name VARCHAR(100),
      phone VARCHAR(30),
      address TEXT,
      gstin VARCHAR(30),
      invoice_prefix VARCHAR(10) DEFAULT 'INV-',
      next_number INT DEFAULT 1001,
      currency VARCHAR(5) DEFAULT '₹',
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      name VARCHAR(200) NOT NULL,
      type VARCHAR(20) NOT NULL CHECK (type IN ('product', 'service')),
      sku VARCHAR(100),
      price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      stock INT DEFAULT 0,
      category VARCHAR(100) DEFAULT 'General',
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS customers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      name VARCHAR(150) NOT NULL,
      phone VARCHAR(30),
      email VARCHAR(255),
      address TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
      invoice_number VARCHAR(50) NOT NULL,
      customer_name VARCHAR(150) NOT NULL,
      customer_phone VARCHAR(30),
      customer_email VARCHAR(255),
      customer_address TEXT,
      invoice_date DATE NOT NULL,
      due_date DATE,
      subtotal DECIMAL(12,2) NOT NULL,
      discount_type VARCHAR(10) CHECK (discount_type IN ('percent', 'fixed')),
      discount_value DECIMAL(12,2) DEFAULT 0.00,
      discount_amount DECIMAL(12,2) DEFAULT 0.00,
      tax_rate DECIMAL(5,2) DEFAULT 0.00,
      tax_amount DECIMAL(12,2) DEFAULT 0.00,
      grand_total DECIMAL(12,2) NOT NULL,
      payment_method VARCHAR(30) DEFAULT 'Cash',
      payment_status VARCHAR(20) NOT NULL CHECK (payment_status IN ('Paid', 'Pending', 'Partial', 'Draft')),
      paid_amount DECIMAL(12,2) DEFAULT 0.00,
      balance_due DECIMAL(12,2) DEFAULT 0.00,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT unique_business_invoice_number UNIQUE (business_id, invoice_number)
    );

    CREATE TABLE IF NOT EXISTS invoice_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      product_id UUID REFERENCES products(id) ON DELETE SET NULL,
      name VARCHAR(200) NOT NULL,
      sku VARCHAR(100),
      qty INT NOT NULL CHECK (qty > 0),
      price DECIMAL(12,2) NOT NULL,
      total DECIMAL(12,2) NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_businesses_owner ON businesses(owner_id);
    CREATE INDEX IF NOT EXISTS idx_products_business ON products(business_id);
    CREATE INDEX IF NOT EXISTS idx_customers_business ON customers(business_id);
    CREATE INDEX IF NOT EXISTS idx_invoices_business ON invoices(business_id);
    CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);
  `;

  await p.query(ddl);
}

module.exports = {
  getPool,
  query,
  initSchema,
  memoryStore
};
