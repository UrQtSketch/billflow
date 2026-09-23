const { getAuthUser, verifyBusinessAccess } = require('./_lib/auth');
const { getPool, query, initSchema, memoryStore } = require('./_lib/db');
const { sendJson, sendError, getQueryParams } = require('./_lib/response');

module.exports = async function handler(req, res) {
  const authUser = getAuthUser(req);
  if (!authUser) return sendError(res, 401, 'Unauthorized — Please log in');

  const queryParams = getQueryParams(req);
  const businessId = queryParams.businessId || authUser.activeBusinessId;
  if (!businessId) return sendError(res, 400, 'Business ID is required');

  const hasAccess = await verifyBusinessAccess(authUser.userId, businessId, authUser);
  if (!hasAccess) return sendError(res, 403, 'Forbidden — Access denied');

  const pool = getPool();
  if (pool) await initSchema();

  try {
    const clientToday = queryParams.date || new Date().toISOString().split('T')[0];
    const utcToday = new Date().toISOString().split('T')[0];

    if (pool) {
      const invRes = await query('SELECT * FROM invoices WHERE business_id = $1 ORDER BY invoice_date DESC, created_at DESC', [businessId]);
      const invoices = invRes.rows || [];

      const bizRes = await query('SELECT * FROM businesses WHERE id = $1', [businessId]);
      const business = (bizRes.rows && bizRes.rows[0]) || {};

      const prodRes = await query('SELECT * FROM products WHERE business_id = $1', [businessId]);
      const products = prodRes.rows || [];

      const todayInvoices = invoices.filter(i => {
        const invDate = i.invoice_date instanceof Date ? i.invoice_date.toISOString().split('T')[0] : String(i.invoice_date).split('T')[0];
        return invDate === clientToday || invDate === utcToday;
      });

      const todaySales = todayInvoices.reduce((sum, i) => sum + parseFloat(i.grand_total || 0), 0);
      const totalPaid = invoices.reduce((sum, i) => sum + parseFloat(i.paid_amount || 0), 0);
      const totalPending = invoices.reduce((sum, i) => sum + parseFloat(i.balance_due || 0), 0);
      const lowStockProducts = products.filter(p => p.type === 'product' && (parseInt(p.stock, 10) || 0) <= 10);

      return sendJson(res, 200, {
        stats: {
          todaySales,
          totalInvoices: invoices.length,
          paidAmount: totalPaid,
          pendingAmount: totalPending,
          currency: business.currency || '₹',
          lowStockCount: lowStockProducts.length
        },
        recentInvoices: invoices.slice(0, 5),
        lowStockProducts
      });
    } else {
      const invoices = memoryStore.invoices.filter(i => i.business_id === businessId);
      const business = memoryStore.businesses.find(b => b.id === businessId) || {};
      const products = memoryStore.products.filter(p => p.business_id === businessId);

      const todayInvoices = invoices.filter(i => {
        const invDate = String(i.invoice_date || i.date || '').split('T')[0];
        return invDate === clientToday || invDate === utcToday;
      });
      const todaySales = todayInvoices.reduce((sum, i) => sum + (parseFloat(i.grand_total) || 0), 0);
      const totalPaid = invoices.reduce((sum, i) => sum + (parseFloat(i.paid_amount) || 0), 0);
      const totalPending = invoices.reduce((sum, i) => sum + (parseFloat(i.balance_due) || 0), 0);
      const lowStockProducts = products.filter(p => p.type === 'product' && (p.stock || 0) <= 10);

      return sendJson(res, 200, {
        stats: {
          todaySales,
          totalInvoices: invoices.length,
          paidAmount: totalPaid,
          pendingAmount: totalPending,
          currency: business.currency || '₹',
          lowStockCount: lowStockProducts.length
        },
        recentInvoices: invoices.slice(0, 5),
        lowStockProducts
      });
    }
  } catch (err) {
    return sendError(res, 500, 'Error retrieving dashboard metrics');
  }
};
