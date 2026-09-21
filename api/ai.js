const { getAuthUser, verifyBusinessAccess } = require('./_lib/auth');
const { getPool, query, initSchema, memoryStore } = require('./_lib/db');
const { sendJson, sendError, getQueryParams } = require('./_lib/response');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendError(res, 405, 'Method Not Allowed — Use POST');
  }

  const authUser = getAuthUser(req);
  if (!authUser) {
    return sendError(res, 401, 'Unauthorized — Please log in');
  }

  const queryParams = getQueryParams(req);
  const businessId = queryParams.businessId || authUser.activeBusinessId;
  if (!businessId) {
    return sendError(res, 400, 'Business ID is required');
  }

  const hasAccess = await verifyBusinessAccess(authUser.userId, businessId, authUser);
  if (!hasAccess) {
    return sendError(res, 403, 'Forbidden — Access denied');
  }

  const pool = getPool();
  if (pool) await initSchema();

  // Parse Body
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) {}
  }
  if (!body && req.readable) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    body = JSON.parse(Buffer.concat(chunks).toString() || '{}');
  }

  const prompt = (body && body.prompt ? String(body.prompt) : '').trim();
  const explicitCustomerName = (body && body.customerName ? String(body.customerName) : '').trim();
  const explicitCustomerPhone = (body && body.customerPhone ? String(body.customerPhone) : '').trim();

  if (!prompt) {
    return sendError(res, 400, 'Please provide a prompt or natural language command.');
  }

  try {
    // 1. Fetch authenticated user's catalog and customers (Strict tenant isolation)
    let products = [];
    let customers = [];
    let recentInvoices = [];

    if (pool) {
      const prodRes = await query('SELECT * FROM products WHERE business_id = $1 ORDER BY name ASC', [businessId]);
      products = prodRes.rows || [];

      const custRes = await query('SELECT * FROM customers WHERE business_id = $1 ORDER BY name ASC', [businessId]);
      customers = custRes.rows || [];

      const invRes = await query(`
        SELECT i.*, 
               COALESCE(json_agg(json_build_object(
                 'id', it.id, 'productId', it.product_id, 'name', it.name,
                 'sku', it.sku, 'qty', it.qty, 'price', it.price, 'total', it.total
               )) FILTER (WHERE it.id IS NOT NULL), '[]') as items
        FROM invoices i
        LEFT JOIN invoice_items it ON i.id = it.invoice_id
        WHERE i.business_id = $1
        GROUP BY i.id ORDER BY i.created_at DESC LIMIT 50
      `, [businessId]);
      recentInvoices = invRes.rows || [];
    } else {
      products = memoryStore.products.filter(p => p.business_id === businessId);
      customers = memoryStore.customers.filter(c => c.business_id === businessId);
      recentInvoices = memoryStore.invoices.filter(i => i.business_id === businessId);
    }

    const lowerPrompt = prompt.toLowerCase();

    // -------------------------------------------------------------
    // INTENT 1: LOW STOCK QUERY
    // Examples: "kaunsi books low stock mein hain?", "low stock dikhao", "कम स्टॉक वाली किताबें दिखाओ", "out of stock"
    // -------------------------------------------------------------
    if (
      lowerPrompt.includes('low stock') || 
      lowerPrompt.includes('kam stock') || 
      lowerPrompt.includes('कम स्टॉक') ||
      lowerPrompt.includes('khatam hone') || 
      lowerPrompt.includes('खत्म') ||
      lowerPrompt.includes('out of stock')
    ) {
      const lowStockItems = products.filter(p => p.type === 'product' && (parseInt(p.stock, 10) || 0) <= 10);
      return sendJson(res, 200, {
        intent: 'LOW_STOCK_QUERY',
        reply: lowStockItems.length > 0
          ? `Found ${lowStockItems.length} product(s) with low stock (10 or fewer units available):`
          : 'Great news! All products in your catalog currently have adequate stock (more than 10 units).',
        data: {
          items: lowStockItems.map(p => ({
            id: p.id,
            name: p.name,
            sku: p.sku || '—',
            stock: parseInt(p.stock, 10) || 0,
            price: parseFloat(p.price) || 0,
            category: p.category || 'General'
          }))
        }
      });
    }

    // -------------------------------------------------------------
    // INTENT 2: CUSTOMER PURCHASE HISTORY QUERY
    // Examples: "Rahul ne last time kya kharida tha?", "Amit purchase history", "राहुल का पुराना बिल"
    // -------------------------------------------------------------
    if (
      lowerPrompt.includes('last time') || 
      lowerPrompt.includes('pichli baar') || 
      lowerPrompt.includes('पिछली बार') ||
      lowerPrompt.includes('kya kharida') || 
      lowerPrompt.includes('क्या खरीदा') ||
      lowerPrompt.includes('purchase history') || 
      lowerPrompt.includes('purana bill') ||
      lowerPrompt.includes('पुराना बिल') ||
      lowerPrompt.includes('last bill')
    ) {
      let matchedCust = null;
      for (const cust of customers) {
        const custTokens = cust.name.toLowerCase().split(/\s+/);
        if (custTokens.some(tok => tok.length >= 3 && lowerPrompt.includes(tok))) {
          matchedCust = cust;
          break;
        }
      }

      if (!matchedCust) {
        for (const inv of recentInvoices) {
          const invCustTokens = (inv.customer_name || '').toLowerCase().split(/\s+/);
          if (invCustTokens.some(tok => tok.length >= 3 && lowerPrompt.includes(tok))) {
            matchedCust = { id: inv.customer_id, name: inv.customer_name, phone: inv.customer_phone };
            break;
          }
        }
      }

      if (!matchedCust) {
        return sendJson(res, 200, {
          intent: 'CUSTOMER_HISTORY_QUERY',
          reply: `Could not find a customer matching that name in your records.`,
          data: { found: false }
        });
      }

      const custInvoices = recentInvoices.filter(i => 
        (i.customer_id && i.customer_id === matchedCust.id) || 
        (i.customer_name && i.customer_name.toLowerCase() === matchedCust.name.toLowerCase())
      );

      if (custInvoices.length === 0) {
        return sendJson(res, 200, {
          intent: 'CUSTOMER_HISTORY_QUERY',
          reply: `Found customer "${matchedCust.name}", but there are no past invoices recorded for them yet.`,
          data: { customer: matchedCust, invoices: [] }
        });
      }

      const latest = custInvoices[0];
      const itemsPurchased = (latest.items || []).map(it => `${it.name || 'Item'} (×${it.qty || 1})`).join(', ');

      return sendJson(res, 200, {
        intent: 'CUSTOMER_HISTORY_QUERY',
        reply: `Last purchase by "${matchedCust.name}" on ${latest.invoice_date || latest.date} (Invoice: ${latest.invoice_number}): ${itemsPurchased || 'No item details'} for Total: Rs. ${parseFloat(latest.grand_total || 0).toLocaleString('en-IN')}`,
        data: {
          customer: matchedCust,
          lastInvoice: latest,
          totalInvoicesCount: custInvoices.length
        }
      });
    }

    // -------------------------------------------------------------
    // INTENT 3: STOCK AVAILABILITY / PRICE INQUIRY
    // Examples: "NCERT Physics 12th kitni bachi hai?", "गणित की किताब का क्या भाव है?", "RD Sharma price kya hai?"
    // -------------------------------------------------------------
    const isStockInquiry = (
      lowerPrompt.includes('kitni bachi') || 
      lowerPrompt.includes('kitna bacha') || 
      lowerPrompt.includes('kitna stock') || 
      lowerPrompt.includes('कितना बचा') ||
      lowerPrompt.includes('कितनी बची') ||
      lowerPrompt.includes('स्टॉक') ||
      lowerPrompt.includes('stock check') || 
      lowerPrompt.includes('available hai') || 
      lowerPrompt.includes('price kya hai') || 
      lowerPrompt.includes('भाव क्या है') ||
      lowerPrompt.includes('क्या भाव है') ||
      lowerPrompt.includes('क्या रेट है') ||
      lowerPrompt.includes('रेट क्या है') ||
      lowerPrompt.includes('kitne ka hai') ||
      lowerPrompt.includes('kitne ki hai') ||
      lowerPrompt.includes('bhav') ||
      lowerPrompt.includes('भाव') ||
      (lowerPrompt.includes('price') && !lowerPrompt.includes('diye') && !lowerPrompt.includes('bill')) ||
      (lowerPrompt.includes('dikhao') && !lowerPrompt.includes('bill') && !lowerPrompt.includes('draft')) ||
      (lowerPrompt.includes('दिखाओ') && !lowerPrompt.includes('बिल')) ||
      lowerPrompt.includes('books dikhao')
    );

    if (isStockInquiry && !lowerPrompt.includes('diye') && !lowerPrompt.includes('दिए') && !lowerPrompt.includes('becha') && !lowerPrompt.includes('bill') && !lowerPrompt.includes('बिल') && !lowerPrompt.includes('de do')) {
      const matches = findMatchingProducts(prompt, products);

      if (matches.length === 0) {
        return sendJson(res, 200, {
          intent: 'PRODUCT_SEARCH_QUERY',
          reply: `No products matching your search were found in your catalog.`,
          data: { matches: [] }
        });
      }

      if (matches.length === 1) {
        const p = matches[0];
        const stockMsg = p.type === 'service' 
          ? 'This is a service (no physical inventory tracking).'
          : `Current Available Stock: ${p.stock} units.`;
        return sendJson(res, 200, {
          intent: 'PRODUCT_SEARCH_QUERY',
          reply: `Found "${p.name}" (SKU: ${p.sku || '—'}): Price is Rs. ${parseFloat(p.price).toLocaleString('en-IN')}. ${stockMsg}`,
          data: { matches: [p] }
        });
      }

      return sendJson(res, 200, {
        intent: 'PRODUCT_SEARCH_QUERY',
        reply: `Found ${matches.length} matching items in your catalog:`,
        data: {
          matches: matches.map(p => ({
            id: p.id,
            name: p.name,
            sku: p.sku || '—',
            price: parseFloat(p.price),
            stock: parseInt(p.stock, 10) || 0,
            category: p.category || 'General'
          }))
        }
      });
    }

    // -------------------------------------------------------------
    // INTENT 4: NATURAL LANGUAGE BILL CREATION (INVOICE DRAFT)
    // -------------------------------------------------------------
    const explicitCustomer = (explicitCustomerName || explicitCustomerPhone) 
      ? { name: explicitCustomerName, phone: explicitCustomerPhone }
      : null;

    const draftResult = parseBillCommand(prompt, products, customers, explicitCustomer);

    if (draftResult.ambiguity) {
      return sendJson(res, 200, {
        intent: 'AMBIGUITY_RESOLUTION',
        reply: `I found multiple matching products for "${draftResult.ambiguousTerm}". Which book/item do you mean?`,
        data: {
          ambiguousTerm: draftResult.ambiguousTerm,
          options: draftResult.matchingOptions,
          partialDraft: draftResult.partialDraft
        }
      });
    }

    if (draftResult.items.length === 0) {
      return sendJson(res, 200, {
        intent: 'UNKNOWN_OR_EMPTY',
        reply: `Could not identify any stationery items or products from your message. Please specify items and quantity/rates (e.g. "2 register 70 me, 5 pen 10 me").`,
        data: { prompt }
      });
    }

    // Calculate Draft Line Items with real catalog or explicit pricing
    let subtotal = 0;
    const lineItems = draftResult.items.map(item => {
      const price = parseFloat(item.product.price) || 0;
      const qty = parseInt(item.qty, 10) || 1;
      const lineTotal = Math.round(price * qty * 100) / 100;
      subtotal += lineTotal;

      return {
        productId: item.product.id,
        name: item.product.name,
        sku: item.product.sku || '',
        qty: qty,
        price: price,
        total: lineTotal,
        availableStock: parseInt(item.product.stock, 10) || 0
      };
    });

    const cleanTaxRate = draftResult.taxRate || 0;
    const taxAmount = Math.round((subtotal * cleanTaxRate / 100) * 100) / 100;
    const discountAmount = draftResult.discountAmount || 0;
    const grandTotal = Math.max(0, Math.round((subtotal - discountAmount + taxAmount) * 100) / 100);

    const finalCustomerName = draftResult.customerName || (draftResult.customer ? draftResult.customer.name : 'Counter Customer');
    const finalCustomerPhone = draftResult.customerPhone || (draftResult.customer ? draftResult.customer.phone : '');

    const draft = {
      customerId: draftResult.customer ? draftResult.customer.id : null,
      customerName: finalCustomerName,
      customerPhone: finalCustomerPhone,
      customerAddress: draftResult.customerAddress || (draftResult.customer ? draftResult.customer.address : ''),
      isNewCustomer: !draftResult.customer,
      items: lineItems,
      subtotal: subtotal,
      discountType: 'fixed',
      discountValue: discountAmount,
      discountAmount: discountAmount,
      taxRate: cleanTaxRate,
      taxAmount: taxAmount,
      grandTotal: grandTotal,
      paymentMethod: draftResult.paymentMethod || 'Cash',
      paymentStatus: 'Paid',
      paidAmount: grandTotal,
      balanceDue: 0,
      notes: `AI Counter Draft generated from prompt: "${prompt}"`,
      rawPrompt: prompt
    };

    return sendJson(res, 200, {
      intent: 'INVOICE_DRAFT_CREATED',
      reply: `Draft bill ready for ${draft.customerName}: ${lineItems.length} item(s) totalling Rs. ${grandTotal.toLocaleString('en-IN')}. Please review and confirm below.`,
      data: {
        draft: draft
      }
    });

  } catch (err) {
    console.error('AI Processing Error:', err);
    return sendError(res, 500, 'Error processing AI natural language request');
  }
};

// -------------------------------------------------------------
// HELPER: HINDI / HINGLISH TO ENGLISH NORMALIZATION DICTIONARIES
// -------------------------------------------------------------
const DEVANAGARI_DIGITS = {
  '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
  '५': '5', '६': '6', '७': '7', '८': '8', '९': '9'
};

const HINDI_WORD_NUMBERS = {
  'एक': 1, 'ik': 1, 'ek': 1, 'one': 1,
  'दो': 2, 'do': 2, 'two': 2,
  'तीन': 3, 'teen': 3, 'tin': 3, 'three': 3,
  'चार': 4, 'char': 4, 'chaar': 4, 'four': 4,
  'पाँच': 5, 'पांच': 5, 'panch': 5, 'paanch': 5, 'five': 5,
  'छह': 6, 'छः': 6, 'chhah': 6, 'che': 6, 'chhe': 6, 'six': 6,
  'सात': 7, 'saat': 7, 'sat': 7, 'seven': 7,
  'आठ': 8, 'aath': 8, 'ath': 8, 'eight': 8,
  'नौ': 9, 'nau': 9, 'nine': 9,
  'दस': 10, 'das': 10, 'ten': 10,
  'ग्यारह': 11, 'gyarah': 11, 'बारह': 12, 'barah': 12,
  'तेरह': 13, 'terah': 13, 'चौदह': 14, 'chaudah': 14,
  'पंद्रह': 15, 'pandrah': 15, 'सोलह': 16, 'solah': 16,
  'सत्रह': 17, 'satrah': 17, 'अठारह': 18, 'atharah': 18,
  'उन्नीस': 19, 'unnees': 19, 'बीस': 20, 'bees': 20,
  'पच्चीस': 25, 'pachees': 25, 'तीस': 30, 'tees': 30,
  'चालीस': 40, 'chalis': 40, 'पचास': 50, 'pachaas': 50,
  'सौ': 100, 'sau': 100
};

const HINDI_TERMS_DICTIONARY = {
  'एनसीईआरटी': 'ncert', 'एनसीइआरटी': 'ncert', 'ncert': 'ncert',
  'सीबीएसई': 'cbse', 'cbse': 'cbse',
  'आईसीएसई': 'icse', 'icse': 'icse',
  'गणित': 'maths', 'मैथ्स': 'maths', 'मैथ': 'maths', 'हिसाब': 'maths',
  'भौतिकी': 'physics', 'फिजिक्स': 'physics',
  'रसायन': 'chemistry', 'केमिस्ट्री': 'chemistry',
  'जीवविज्ञान': 'biology', 'बायोलॉजी': 'biology',
  'विज्ञान': 'science', 'साइंस': 'science',
  'अंग्रेजी': 'english', 'अंग्रेज़ी': 'english', 'इंग्लिश': 'english',
  'हिंदी': 'hindi', 'हिन्दी': 'hindi',
  'इतिहास': 'history', 'हिस्ट्री': 'history',
  'भूगोल': 'geography', 'ज्योग्राफी': 'geography',
  'अर्थशास्त्र': 'economics', 'इकोनॉमिक्स': 'economics',
  'कक्षा': 'class', 'क्लास': 'class', 'जमात': 'class',
  'भाग': 'part',
  'रजिस्टर': 'register', 'रजिस्टार': 'register',
  'कॉपी': 'notebook', 'कापी': 'notebook', 'नोटबुक': 'notebook',
  'कलम': 'pen', 'पेन': 'pen', 'पेन्स': 'pen', 'पैन': 'pen',
  'पेंसिल': 'pencil', 'पेन्सिल': 'pencil',
  'रबर': 'eraser', 'इरेज़र': 'eraser', 'इरेजर': 'eraser',
  'शार्पनर': 'sharpener', 'कटर': 'sharpener',
  'स्केल': 'scale', 'फुटा': 'scale', 'पटरी': 'scale',
  'कैलकुलेटर': 'calculator',
  'किताब': 'book', 'किताबें': 'book', 'पुस्तक': 'book', 'पुस्तकें': 'book',
  'प्रैक्टिकल': 'practical', 'फाइल': 'file', 'फ़ाइल': 'file',
  'और': 'aur', 'तथा': 'aur', 'एवं': 'aur', 'व': 'aur',
  'में': 'me', 'मे': 'me', 'का': 'ka', 'की': 'ki', 'के': 'ke', 'से': 'se',
  'नकद': 'cash', 'रोकड़': 'cash',
  'यूपीआई': 'upi'
};

function normalizeHindi(text) {
  let str = String(text || '');
  str = str.replace(/[०-९]/g, d => DEVANAGARI_DIGITS[d] || d);
  const tokens = str.split(/(\s+|[,.:;।!?()\[\]{}])/);
  const normalizedTokens = tokens.map(tok => {
    const trimmed = tok.trim();
    if (!trimmed) return tok;
    const lower = trimmed.toLowerCase();
    if (HINDI_WORD_NUMBERS[lower] !== undefined) return String(HINDI_WORD_NUMBERS[lower]);
    if (HINDI_TERMS_DICTIONARY[lower]) return HINDI_TERMS_DICTIONARY[lower];
    return tok;
  });
  return normalizedTokens.join('').replace(/\s+/g, ' ').trim();
}

// -------------------------------------------------------------
// HELPER: PRODUCT MATCHING LOGIC
// -------------------------------------------------------------
function findMatchingProducts(queryStr, products) {
  const normQuery = normalizeHindi(queryStr);
  const normTerm = normQuery.toLowerCase()
    .replace(/[,.?!;।]/g, ' ')
    .replace(/s\b/g, '') // remove plurals
    .replace(/\b(ko|aur|and|tatha|evam|va|diye|diya|de do|becha|sold|hai|hain|bache|bachi|kitni|kitna|ka|ki|ke|in|of|th|std|books|book|dikhao|price|bhav|kya|dijiye|chahiye)\b/gi, ' ')
    .trim();

  const words = normTerm.split(/\s+/).filter(w => w.length >= 2);
  if (words.length === 0) return [];

  const results = [];
  for (const prod of products) {
    const pName = (prod.name || '').toLowerCase();
    const pSku = (prod.sku || '').toLowerCase();
    const pCat = (prod.category || '').toLowerCase();

    let score = 0;
    for (const w of words) {
      if (pName.includes(w)) score += 20;
      if (pSku.includes(w)) score += 25;
      if (w === 'ncert' && pName.includes('ncert')) score += 35;
      if (w === 'cbse' && (pName.includes('cbse') || pCat.includes('cbse'))) score += 30;
      if ((w === 'math' || w === 'maths') && (pName.includes('mathematic') || pName.includes('math'))) score += 35;
      if (w === 'physic' && pName.includes('physic')) score += 35;
      if (w === 'chemistr' && pName.includes('chemistr')) score += 35;
      if (w === 'biolog' && pName.includes('biolog')) score += 35;
      if (w === 'scienc' && pName.includes('scienc')) score += 25;
      if (w === 'register' && pName.includes('register')) score += 35;
      if (w === 'notebook' && (pName.includes('notebook') || pName.includes('register'))) score += 25;
      if (w === 'pen' && pName.includes('pen')) score += 35;
      if (w === 'pencil' && pName.includes('pencil')) score += 35;
      // Match exact class numbers
      if (/^\d+$/.test(w) && (pName.includes(`class ${w}`) || pName.includes(`${w}th`) || pName.includes(` ${w} `) || pName.endsWith(` ${w}`))) {
        score += 40;
      }
    }

    if (score >= 25) {
      results.push({ ...prod, matchScore: score });
    }
  }

  results.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
  return results;
}

// -------------------------------------------------------------
// HELPER: NATURAL LANGUAGE BILL PARSER (HINDI / HINGLISH / ENGLISH)
// -------------------------------------------------------------
function parseBillCommand(prompt, products, customers, explicitCustomer = null) {
  let text = prompt.trim();

  // 1. Payment Method Detection & Extraction
  let paymentMethod = 'Cash';
  const payMatch = text.match(/(?:,\s*|\s+)?(?:payment\s+mode\s+|payment\s+is\s+|payment\s+|via\s+|se\s+pay\s+kiya\s+|pay\s+kiya\s+|mode\s+)?(cash|upi|gpay|google\s*pay|phonepe|paytm|online|card|debit|credit|bank\s*transfer|neft|rtgs|नकद|रोकड़|यूपीआई|कार्ड|गूगल\s*पे|फोनपे|पेटीएम|उधार)(?:\s+se\s+pay\s+kiya|\s+se\s+pay|\s+pay\s+kiya|\s+se|\s+paid|\s+mein|\s+me)?(?=[,\.;।\n]|$)/i);
  
  if (payMatch) {
    const rawPay = payMatch[1].toLowerCase();
    if (rawPay.includes('upi') || rawPay.includes('gpay') || rawPay.includes('google') || rawPay.includes('phonepe') || rawPay.includes('paytm') || rawPay.includes('online') || rawPay.includes('यूपीआई') || rawPay.includes('गूगल') || rawPay.includes('फोनपे') || rawPay.includes('पेटीएम')) {
      paymentMethod = 'UPI';
    } else if (rawPay.includes('card') || rawPay.includes('debit') || rawPay.includes('credit') || rawPay.includes('कार्ड')) {
      paymentMethod = 'Card';
    } else if (rawPay.includes('bank') || rawPay.includes('neft') || rawPay.includes('rtgs')) {
      paymentMethod = 'Bank Transfer';
    } else {
      paymentMethod = 'Cash';
    }
    text = (text.substring(0, payMatch.index) + ' ' + text.substring(payMatch.index + payMatch[0].length)).trim();
  }

  // 2. Discount Detection & Extraction
  let discountAmount = 0;
  const discRegex = /(?:,\s*|\s+)?(?:discount|choot|छूट|डिस्काउंट|off|disc)\s*(?:of|is|rs\.?|₹|रुपये)?\s*(\d+(?:\.\d+)?)/i;
  const discRegexAlt = /(?:,\s*|\s+)?(\d+(?:\.\d+)?)\s*(?:rs|रुपये|₹|percent|%)?\s*(?:discount|choot|छूट|डिस्काउंट|off)/i;
  
  let discMatch = text.match(discRegex) || text.match(discRegexAlt);
  if (discMatch) {
    discountAmount = parseFloat(discMatch[1]) || 0;
    text = (text.substring(0, discMatch.index) + ' ' + text.substring(discMatch.index + discMatch[0].length)).trim();
  }

  // 3. Customer Detection & Stripping
  let resolvedCustomer = null;
  let customerName = explicitCustomer?.name || '';
  let customerPhone = explicitCustomer?.phone || '';

  const custPrefixMatch = text.match(/^([^\d,:;\(\)]+?)\s*(?:ko\s+diye|ko|se|ke\s+liye|ne|को\s+दिए|को|के\s+लिए|ने)\s*[:,\s]*/i) ||
                          text.match(/^(?:bill\s+to|customer|for|ग्राहक)\s*([^\d,:;\(\)]+?)\s*[:,\s]+/i);

  if (custPrefixMatch) {
    const extractedName = custPrefixMatch[1].trim().replace(/\b(shri|ji|bhai|mr|mrs|dr|श्री|जी|भाई)\b/gi, '').trim();
    if (!customerName) customerName = extractedName;
    text = text.substring(custPrefixMatch[0].length).trim();
  }

  if (customerName) {
    resolvedCustomer = customers.find(c => 
      c.name.toLowerCase().includes(customerName.toLowerCase()) || 
      customerName.toLowerCase().includes(c.name.toLowerCase()) ||
      (customerPhone && c.phone && c.phone.includes(customerPhone))
    ) || null;
    if (resolvedCustomer && !explicitCustomer?.name) customerName = resolvedCustomer.name;
    if (resolvedCustomer && !customerPhone) customerPhone = resolvedCustomer.phone || '';
  }

  if (!resolvedCustomer && !customerName) {
    for (const c of customers) {
      if (text.toLowerCase().includes(c.name.toLowerCase())) {
        resolvedCustomer = c;
        customerName = c.name;
        customerPhone = c.phone || '';
        break;
      }
    }
  }

  // Clean trailing action verbs & punctuation
  text = text.replace(/(?:diye|diya|de do|becha|beche|hai|hain|दिए|दिया|बेचा|बेचे|दी|दीं|लिया|चाहिए|करा|करो)\.?$/i, '').trim();
  text = text.replace(/[,\.;।]+$/, '').trim();

  // 4. Multi-item Splitting
  const normText = normalizeHindi(text);

  // Split by "aur", "and", "plus", ",", "+", "।", "\n"
  const rawSegments = normText.split(/\s*(?:,\s*|\baur\b|\band\b|\bplus\b|\+|\n|;|।)\s*/i);

  const matchedItems = [];

  for (const seg of rawSegments) {
    let trimmed = seg.trim();
    if (!trimmed) continue;

    // Clean common fillers
    trimmed = trimmed.replace(/\b(diye|diya|de do|hai|hain|wali|wale|bhi)\b/gi, ' ').replace(/\s+/g, ' ').trim();
    if (!trimmed) continue;

    let qty = 1;
    let itemTerm = trimmed;

    // Check leading quantity
    const leadingQty = trimmed.match(/^(\d+)(?:x|\s*pcs|\s*units|\s*pieces|\s*नग|\s*पीस)?\s+(.+)$/i);
    if (leadingQty) {
      qty = parseInt(leadingQty[1], 10) || 1;
      itemTerm = leadingQty[2].trim();
    }

    // Extract price / rate if specified per item (e.g. "rs.100 per", "50 per", "70 me", "10 me", "@ 180", "50 rs", "60 rupaye", "register 75")
    let specifiedPrice = null;
    const pricePattern = /(?:@|rate|price|rs\.?|₹|रुपये|रुपए|रु|rupaye|rupiya|rupay|inr|\bin\b|\bme\b|\bmein\b)\s*(\d+(?:\.\d+)?)(?:\s*(?:per|each|\/pc|\/piece|\/unit|\/item|प्रति|प्रत्येक|ka|ki|ke|me|mein|रुपये|रुपए|रु))?/i;
    const pricePatternSuffix = /(\d+(?:\.\d+)?)\s*(?:rs|rupees|rupaye|rupiya|rupay|inr|रुपये|रुपए|रु|ka|ki|ke|me|mein|per|each|\/pc|\/piece|\/unit|\/item|प्रति|प्रत्येक)(?:\s*(?:per|each|\/pc|\/piece|\/unit|\/item|प्रति|प्रत्येक))?/i;
    const priceTrailingNum = /(?:\s+)(\d+(?:\.\d+)?)$/i;

    let pMatch = itemTerm.match(pricePattern) || itemTerm.match(pricePatternSuffix);
    if (!pMatch && leadingQty && !/(?:class|std|grade|part|vol|pack|of|भाग)\s+\d+$/i.test(itemTerm)) {
      pMatch = itemTerm.match(priceTrailingNum);
    }

    if (pMatch) {
      specifiedPrice = parseFloat(pMatch[1]) || 0;
      itemTerm = itemTerm.substring(0, pMatch.index).trim();
    } else if (!leadingQty) {
      const trailingQty = trimmed.match(/^(.+?)(?<!\bclass|\bstd|\bgrade|\bpart|\bvol|\bpack|\bof|\bभाग)\s+(\d+)(?:x|\s*pcs|\s*units|\s*pieces|\s*नग|\s*पीस)?$/i);
      if (trailingQty) {
        qty = parseInt(trailingQty[2], 10) || 1;
        itemTerm = trailingQty[1].trim();
      }
    }

    // Clean item term of any dangling price words
    const cleanSearchTerm = itemTerm
      .replace(/\b(rs|rupees|rupaye|rupiya|rupay|inr|me|mein|ka|ki|ke|rate|price|per|each|pc|pcs|piece|pieces|unit|units|item|items|प्रति|प्रत्येक)\b/gi, ' ')
      .replace(/^[^\w\u0900-\u097F]+|[^\w\u0900-\u097F]+$/g, '')
      .trim();

    const matches = findMatchingProducts(cleanSearchTerm, products);
    if (matches.length === 0) {
      const cleanItemName = cleanSearchTerm
        .split(/\s+/)
        .filter(Boolean)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');

      if (cleanItemName.length >= 2) {
        matchedItems.push({
          product: {
            id: null,
            name: cleanItemName,
            sku: 'CUSTOM',
            price: specifiedPrice !== null ? specifiedPrice : 0,
            stock: 0,
            isCustom: true
          },
          qty: qty
        });
      }
      continue;
    }

    if (matches.length === 1) {
      const prod = matches[0];
      const finalPrice = specifiedPrice !== null ? specifiedPrice : parseFloat(prod.price) || 0;
      matchedItems.push({
        product: {
          ...prod,
          price: finalPrice
        },
        qty
      });
    } else {
      const top = matches[0];
      const second = matches[1];
      if (top.matchScore >= 35 && top.matchScore > second.matchScore * 1.25) {
        const finalPrice = specifiedPrice !== null ? specifiedPrice : parseFloat(top.price) || 0;
        matchedItems.push({
          product: {
            ...top,
            price: finalPrice
          },
          qty
        });
      } else {
        return {
          ambiguity: true,
          ambiguousTerm: cleanSearchTerm || itemTerm,
          matchingOptions: matches.slice(0, 4).map(p => ({
            id: p.id,
            name: p.name,
            sku: p.sku || '—',
            price: specifiedPrice !== null ? specifiedPrice : parseFloat(p.price),
            stock: parseInt(p.stock, 10) || 0
          })),
          partialDraft: {
            customer: resolvedCustomer,
            customerName: customerName || 'Counter Customer',
            customerPhone: customerPhone || '',
            paymentMethod,
            resolvedItems: matchedItems
          }
        };
      }
    }
  }

  return {
    ambiguity: false,
    customer: resolvedCustomer,
    customerName: customerName || (resolvedCustomer ? resolvedCustomer.name : 'Counter Customer'),
    customerPhone: customerPhone || (resolvedCustomer ? resolvedCustomer.phone : ''),
    paymentMethod,
    items: matchedItems,
    discountAmount,
    taxRate: 0
  };
}



