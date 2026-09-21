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
    const range = (queryParams.range || '7days').toLowerCase(); // today, 7days, 30days, this_month, all
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    let invoices = [];
    let products = [];
    let business = {};

    if (pool) {
      const invRes = await query('SELECT * FROM invoices WHERE business_id = $1 ORDER BY invoice_date DESC, created_at DESC', [businessId]);
      invoices = invRes.rows || [];

      // Fetch items for accurate product cost/margin analysis
      const itemsRes = await query(`
        SELECT ii.*, p.cost_price, p.category 
        FROM invoice_items ii 
        JOIN invoices inv ON ii.invoice_id = inv.id 
        LEFT JOIN products p ON ii.product_id = p.id 
        WHERE inv.business_id = $1
      `, [businessId]);
      const allItems = itemsRes.rows || [];

      // Attach items to corresponding invoices
      const itemsByInvoice = {};
      allItems.forEach(it => {
        if (!itemsByInvoice[it.invoice_id]) itemsByInvoice[it.invoice_id] = [];
        itemsByInvoice[it.invoice_id].push(it);
      });
      invoices.forEach(inv => {
        inv.items = itemsByInvoice[inv.id] || [];
      });

      const bizRes = await query('SELECT * FROM businesses WHERE id = $1', [businessId]);
      business = (bizRes.rows && bizRes.rows[0]) || {};

      const prodRes = await query('SELECT * FROM products WHERE business_id = $1', [businessId]);
      products = prodRes.rows || [];
    } else {
      invoices = memoryStore.invoices.filter(i => i.business_id === businessId);
      products = memoryStore.products.filter(p => p.business_id === businessId);
      business = memoryStore.businesses.find(b => b.id === businessId) || {};
    }

    const clientDate = queryParams.date || now.toISOString().split('T')[0];
    const utcDate = now.toISOString().split('T')[0];

    // Filter invoices by range
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

    const startDateStr = startDate.toISOString().split('T')[0];

    const filteredInvoices = invoices.filter(inv => {
      const invDate = inv.invoice_date instanceof Date ? inv.invoice_date.toISOString().split('T')[0] : String(inv.invoice_date || inv.date || '').split('T')[0];
      if (!invDate) return false;
      if (range === 'today') {
        return invDate === clientDate || invDate === utcDate;
      }
      if (range === 'this_month') {
        const cMonth = clientDate.substring(0, 7);
        const uMonth = utcDate.substring(0, 7);
        return invDate.startsWith(cMonth) || invDate.startsWith(uMonth);
      }
      if (range === 'all') {
        return true;
      }
      return invDate >= startDateStr;
    });

    // Compute Aggregated Business Analytics
    let totalSales = 0;
    let totalPaid = 0;
    let totalPending = 0;
    let totalCost = 0;
    let productSalesMap = {};
    let paymentMethodMap = { Cash: 0, UPI: 0, 'Bank Transfer': 0, Card: 0, Cheque: 0, Other: 0 };
    let dailyMap = {};

    filteredInvoices.forEach(inv => {
      const invDate = inv.invoice_date instanceof Date ? inv.invoice_date.toISOString().split('T')[0] : String(inv.invoice_date || inv.date).split('T')[0];
      const gTotal = parseFloat(inv.grand_total || inv.grandTotal || 0);
      const paid = parseFloat(inv.paid_amount || inv.paidAmount || 0);
      const due = parseFloat(inv.balance_due || inv.balanceDue || 0);

      totalSales += gTotal;
      totalPaid += paid;
      totalPending += due;

      const pMethod = inv.payment_method || inv.paymentMethod || 'Cash';
      if (paymentMethodMap[pMethod] !== undefined) {
        paymentMethodMap[pMethod] += gTotal;
      } else {
        paymentMethodMap['Other'] += gTotal;
      }

      // Calculate cost & profit for invoice items
      let invoiceCost = 0;
      const items = inv.items || [];
      if (items.length > 0) {
        items.forEach(it => {
          const qty = parseInt(it.qty, 10) || 1;
          const price = parseFloat(it.price || 0);
          const total = parseFloat(it.total || price * qty);
          const prod = products.find(p => p.id === (it.product_id || it.productId));
          const unitCost = prod && prod.cost_price !== undefined ? parseFloat(prod.cost_price) : (price * 0.70); // default 30% margin if cost not set
          const itemCost = unitCost * qty;
          invoiceCost += itemCost;

          // Track top products
          const pName = it.name || (prod ? prod.name : 'Unknown Product');
          if (!productSalesMap[pName]) {
            productSalesMap[pName] = { name: pName, qty: 0, revenue: 0, profit: 0 };
          }
          productSalesMap[pName].qty += qty;
          productSalesMap[pName].revenue += total;
          productSalesMap[pName].profit += (total - itemCost);
        });
      } else {
        // Fallback estimated cost (70% cost, 30% margin)
        invoiceCost = gTotal * 0.70;
      }

      totalCost += invoiceCost;
      const netProfit = gTotal - invoiceCost;

      // Group by date
      if (!dailyMap[invDate]) {
        dailyMap[invDate] = {
          date: invDate,
          invoicesCount: 0,
          sales: 0,
          cost: 0,
          profit: 0
        };
      }
      dailyMap[invDate].invoicesCount += 1;
      dailyMap[invDate].sales += gTotal;
      dailyMap[invDate].cost += invoiceCost;
      dailyMap[invDate].profit += netProfit;
    });

    const netProfit = totalSales - totalCost;
    const profitMargin = totalSales > 0 ? ((netProfit / totalSales) * 100) : 0;
    const avgOrderValue = filteredInvoices.length > 0 ? (totalSales / filteredInvoices.length) : 0;

    // Convert dailyMap to sorted array
    const dailyTrend = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

    // Top selling products sorted by revenue
    const topProducts = Object.values(productSalesMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);

    return sendJson(res, 200, {
      range,
      currency: business.currency || '₹',
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
    });
  } catch (err) {
    console.error('Analytics error:', err);
    return sendError(res, 500, 'Error calculating business sales analytics');
  }
};
