/**
 * Send Order Notification API Route
 * Notifies a printer via email when a new order is placed (QS or WI)
 *
 * POST /api/send-order-notification
 * Body: { type: 'quick_store' | 'website_integration', orderId: string }
 * Auth: Bearer token (service key or user JWT)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { initSentry, Sentry } from './lib/sentry.js';
import {
  qsOrderNotificationEmail,
  wiOrderNotificationEmail,
} from './lib/email-templates.js';

function getServiceClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase config');
  return createClient(url, key);
}

function getAllowedOrigin(req: VercelRequest): string | null {
  const origin = req.headers.origin;
  if (!origin) return null;
  if (origin === 'https://dtflayout.com' || origin === 'http://localhost:5173') return origin;
  if (/^https:\/\/[\w-]+\.dtflayout\.com$/.test(origin)) return origin;
  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  initSentry();

  const allowedOrigin = getAllowedOrigin(req);
  if (allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return allowedOrigin ? res.status(200).end() : res.status(403).json({ error: 'Origin not allowed' });
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { type, orderId } = req.body || {};

    if (!type || !orderId) {
      return res.status(400).json({ success: false, error: 'type and orderId are required' });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.error('[OrderNotification] Missing RESEND_API_KEY');
      return res.status(500).json({ success: false, error: 'Email service not configured' });
    }

    const supabase = getServiceClient();
    const resend = new Resend(resendApiKey);

    if (type === 'quick_store') {
      await handleQSNotification(supabase, resend, orderId);
    } else if (type === 'website_integration') {
      await handleWINotification(supabase, resend, orderId);
    } else {
      return res.status(400).json({ success: false, error: 'Invalid type' });
    }

    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error('[OrderNotification] Error:', err);
    Sentry?.captureException(err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

async function handleQSNotification(supabase: any, resend: Resend, orderId: string) {
  // Fetch order with store info
  const { data: order, error } = await supabase
    .from('quick_store_orders')
    .select(`
      id, order_code, customer_name, sheet_count, total_area_sq_inches,
      total_price, currency,
      quick_stores!inner(id, store_name, slug, user_id)
    `)
    .eq('id', orderId)
    .single();

  if (error || !order) {
    console.error('[OrderNotification] QS order not found:', error);
    return;
  }

  // Get printer's email from auth
  const { data: userData } = await supabase.auth.admin.getUserById(order.quick_stores.user_id);
  const printerEmail = userData?.user?.email;

  if (!printerEmail) {
    console.error('[OrderNotification] Printer email not found');
    return;
  }

  const html = qsOrderNotificationEmail({
    storeName: order.quick_stores.store_name,
    orderCode: order.order_code,
    customerName: order.customer_name,
    sheetCount: order.sheet_count,
    totalArea: `${Math.round(order.total_area_sq_inches).toLocaleString()} sq.in`,
    totalPrice: Number(order.total_price).toFixed(2),
    currency: order.currency === 'USD' ? '$' : order.currency === 'INR' ? '₹' : order.currency,
    dashboardUrl: `https://dtflayout.com/quick-store/orders`,
  });

  const { error: emailError } = await resend.emails.send({
    from: 'DTF Layout <noreply@dtflayout.com>',
    to: [printerEmail],
    subject: `New order ${order.order_code} on ${order.quick_stores.store_name}`,
    html,
  });

  if (emailError) {
    console.error('[OrderNotification] Resend error:', emailError);
    Sentry?.captureException(emailError);
  }
}

async function handleWINotification(supabase: any, resend: Resend, orderId: string) {
  // Fetch design with printer info
  const { data: design, error } = await supabase
    .from('designs')
    .select(`
      id, design_code, sheet_count, total_price, currency,
      customer_email, printer_id,
      printer_products!inner(product_name)
    `)
    .eq('id', orderId)
    .single();

  if (error || !design) {
    console.error('[OrderNotification] WI design not found:', error);
    return;
  }

  // Get printer's email — printers table has user_id
  const { data: printer } = await supabase
    .from('printers')
    .select('user_id')
    .eq('id', design.printer_id)
    .single();

  if (!printer) {
    console.error('[OrderNotification] Printer not found');
    return;
  }

  const { data: userData } = await supabase.auth.admin.getUserById(printer.user_id);
  const printerEmail = userData?.user?.email;

  if (!printerEmail) {
    console.error('[OrderNotification] Printer email not found');
    return;
  }

  const html = wiOrderNotificationEmail({
    designCode: design.design_code,
    sheetCount: design.sheet_count,
    totalPrice: Number(design.total_price).toFixed(2),
    currency: design.currency === 'USD' ? '$' : design.currency === 'INR' ? '₹' : design.currency,
    customerEmail: design.customer_email,
    productName: design.printer_products?.product_name || 'Gang Sheet',
    dashboardUrl: `https://dtflayout.com/orders`,
  });

  const { error: emailError } = await resend.emails.send({
    from: 'DTF Layout <noreply@dtflayout.com>',
    to: [printerEmail],
    subject: `New design order ${design.design_code}`,
    html,
  });

  if (emailError) {
    console.error('[OrderNotification] Resend error:', emailError);
    Sentry?.captureException(emailError);
  }
}
