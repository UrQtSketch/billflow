const { getAuthUser, verifyBusinessAccess } = require('../../_lib/auth');
const { getPool, query, memoryStore } = require('../../_lib/db');
const { sendJson, sendError } = require('../../_lib/response');

module.exports = async function handler(req, res) {
  const authUser = getAuthUser(req);
  if (!authUser) {
    return sendError(res, 401, 'Unauthorized — Please log in');
  }

  const { id } = req.query || {};
  const businessId = req.query?.businessId || authUser.activeBusinessId;

  if (!id || !businessId) {
    return sendError(res, 400, 'Customer ID and Business ID are required');
  }

  const hasAccess = await verifyBusinessAccess(authUser.userId, businessId);
  if (!hasAccess) {
    return sendError(res, 403, 'Forbidden — Access denied to this business');
  }

  const pool = getPool();

  try {
    if (pool) {
      const custRes = await query('SELECT * FROM customers WHERE id = $1 AND business_id = $2', [id, businessId]);
      if (!custRes || custRes.rows.length === 0) {
        return sendError(res, 404, 'Customer not found');
      }
      const customer = custRes.rows[0];

      const invsRes = await query(
        'SELECT * FROM invoices WHERE business_id = $1 AND (customer_id = $2 OR LOWER(customer_name) = LOWER($3)) ORDER BY invoice_date DESC, created_at DESC',
        [businessId, customer.id, customer.name]
      );
      const invoices = invsRes.rows || [];

      const totalBilled = invoices.reduce((sum, inv) => sum + parseFloat(inv.grand_total || 0), 0);
      const totalPaid = invoices.reduce((sum, inv) => sum + parseFloat(inv.paid_amount || 0), 0);
      const totalOutstanding = invoices.reduce((sum, inv) => sum + parseFloat(inv.balance_due || 0), 0);

      return sendJson(res, 200, {
        customer,
        invoices,
        stats: {
          invoiceCount: invoices.length,
          totalBilled,
          totalPaid,
          totalOutstanding
        }
      });
    } else {
      const customer = memoryStore.customers.find(c => c.id === id && c.business_id === businessId);
      if (!customer) {
        return sendError(res, 404, 'Customer not found');
      }

      const invoices = memoryStore.invoices.filter(i =>
        i.business_id === businessId &&
        (i.customer_id === customer.id || (i.customer_name && i.customer_name.toLowerCase() === customer.name.toLowerCase()))
      );

      const totalBilled = invoices.reduce((sum, inv) => sum + (parseFloat(inv.grand_total) || 0), 0);
      const totalPaid = invoices.reduce((sum, inv) => sum + (parseFloat(inv.paid_amount) || 0), 0);
      const totalOutstanding = invoices.reduce((sum, inv) => sum + (parseFloat(inv.balance_due) || 0), 0);

      return sendJson(res, 200, {
        customer,
        invoices,
        stats: {
          invoiceCount: invoices.length,
          totalBilled,
          totalPaid,
          totalOutstanding
        }
      });
    }
  } catch (err) {
    console.error('Customer History Error:', err);
    return sendError(res, 500, 'Error retrieving customer billing history');
  }
};
