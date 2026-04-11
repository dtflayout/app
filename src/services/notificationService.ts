/**
 * Fire-and-forget order notification email to printer.
 * Does NOT block UI — failures are silently logged.
 */

const API_BASE = import.meta.env.PROD
  ? 'https://dtflayout.com'
  : 'http://localhost:5173';

export function notifyPrinterOfOrder(
  type: 'quick_store' | 'website_integration',
  orderId: string
): void {
  fetch(`${API_BASE}/api/send-order-notification`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, orderId }),
  }).catch((err) => {
    console.warn('[notifyPrinter] Failed to send notification:', err);
  });
}
