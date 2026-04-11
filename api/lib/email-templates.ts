/**
 * Shared email templates for DTF Layout
 * Design system: Indigo primary (#4F46E5), clean minimal style
 * All templates use system fonts (Google Fonts unreliable in email clients)
 */

const BRAND = {
  name: 'DTF Layout',
  url: 'https://dtflayout.com',
  color: '#4F46E5',       // indigo-600
  colorLight: '#EEF2FF',  // indigo-50
  colorDark: '#3730A3',   // indigo-800
  textDark: '#111827',     // gray-900
  textMuted: '#6B7280',   // gray-500
  textLight: '#9CA3AF',   // gray-400
  border: '#E5E7EB',      // gray-200
  bgLight: '#F9FAFB',     // gray-50
  fontStack: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
};

/**
 * Wrap email content in a consistent branded layout
 */
export function emailWrapper(content: string, options?: { hideFooter?: boolean }): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>DTF Layout</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F3F4F6; font-family: ${BRAND.fontStack}; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F3F4F6;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 36px 24px; border-bottom: 1px solid ${BRAND.border};">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <a href="${BRAND.url}" style="text-decoration: none; font-size: 20px; font-weight: 800; color: ${BRAND.color}; letter-spacing: -0.5px;">
                      DTF Layout
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 36px;">
              ${content}
            </td>
          </tr>
          ${options?.hideFooter ? '' : `
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 36px; background-color: ${BRAND.bgLight}; border-top: 1px solid ${BRAND.border};">
              <p style="margin: 0; font-size: 12px; color: ${BRAND.textLight}; line-height: 18px;">
                &copy; ${new Date().getFullYear()} DTF Layout &middot;
                <a href="${BRAND.url}" style="color: ${BRAND.textLight}; text-decoration: underline;">dtflayout.com</a>
              </p>
              <p style="margin: 6px 0 0; font-size: 12px; color: ${BRAND.textLight}; line-height: 18px;">
                Questions? Reach us at <a href="mailto:support@dtflayout.com" style="color: ${BRAND.color}; text-decoration: none;">support@dtflayout.com</a>
              </p>
            </td>
          </tr>
          `}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

/**
 * Primary CTA button
 */
export function ctaButton(text: string, url: string): string {
  return `
<table role="presentation" cellspacing="0" cellpadding="0" style="margin: 28px 0;">
  <tr>
    <td style="background-color: ${BRAND.color}; border-radius: 10px;">
      <a href="${url}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 15px; font-weight: 600; color: #FFFFFF; text-decoration: none; letter-spacing: 0.2px;">
        ${text}
      </a>
    </td>
  </tr>
</table>`.trim();
}

/**
 * Heading
 */
export function heading(text: string): string {
  return `<h1 style="margin: 0 0 8px; font-size: 22px; font-weight: 700; color: ${BRAND.textDark}; line-height: 30px;">${text}</h1>`;
}

/**
 * Paragraph
 */
export function paragraph(text: string): string {
  return `<p style="margin: 0 0 16px; font-size: 15px; color: ${BRAND.textMuted}; line-height: 24px;">${text}</p>`;
}

/**
 * Info card / highlighted box
 */
export function infoBox(content: string): string {
  return `
<div style="background-color: ${BRAND.colorLight}; border-radius: 12px; padding: 20px 24px; margin: 20px 0;">
  ${content}
</div>`.trim();
}

/**
 * Key-value row for info boxes
 */
export function kvRow(label: string, value: string): string {
  return `
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 8px;">
  <tr>
    <td style="font-size: 13px; color: ${BRAND.textMuted}; padding: 2px 0; width: 40%;">${label}</td>
    <td style="font-size: 14px; color: ${BRAND.textDark}; font-weight: 600; padding: 2px 0; text-align: right;">${value}</td>
  </tr>
</table>`.trim();
}

/**
 * Large code display (for OTPs)
 */
export function codeBlock(code: string): string {
  return `
<div style="background-color: ${BRAND.bgLight}; border: 1px solid ${BRAND.border}; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
  <span style="font-size: 36px; font-weight: 700; letter-spacing: 10px; color: ${BRAND.textDark}; font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;">
    ${code}
  </span>
</div>`.trim();
}

/**
 * Muted note text
 */
export function note(text: string): string {
  return `<p style="margin: 0; font-size: 13px; color: ${BRAND.textLight}; line-height: 20px;">${text}</p>`;
}

// ─── Pre-built email templates ────────────────────────────────────────

/**
 * Supabase Auth: Confirm Signup (also serves as Welcome email)
 * Use in Supabase Dashboard → Authentication → Email Templates → Confirm signup
 * Variables: {{ .ConfirmationURL }}
 */
export function getConfirmSignupTemplate(): string {
  const content = `
    ${heading('Welcome to DTF Layout!')}
    ${paragraph("You're one click away from streamlining your DTF printing workflow. Confirm your email to get started with your free trial.")}
    ${ctaButton('Confirm my email', '{{ .ConfirmationURL }}')}
    ${infoBox(`
      <p style="margin: 0 0 4px; font-size: 14px; font-weight: 600; color: ${BRAND.textDark};">What&rsquo;s included in your free trial:</p>
      <p style="margin: 0; font-size: 13px; color: ${BRAND.textMuted}; line-height: 22px;">
        &bull; 20,000 sq. inches of gang sheet creation<br/>
        &bull; Website Integration for your store<br/>
        &bull; Quick Store &mdash; your branded storefront<br/>
        &bull; No credit card required
      </p>
    `)}
    ${note("If you didn&rsquo;t create an account on DTF Layout, you can safely ignore this email.")}
  `;
  return emailWrapper(content);
}

/**
 * Supabase Auth: Reset Password
 * Variables: {{ .ConfirmationURL }}
 */
export function getResetPasswordTemplate(): string {
  const content = `
    ${heading('Reset your password')}
    ${paragraph("We received a request to reset the password for your DTF Layout account. Click the button below to choose a new password.")}
    ${ctaButton('Reset password', '{{ .ConfirmationURL }}')}
    ${note("This link expires in 1 hour. If you didn&rsquo;t request a password reset, no action is needed &mdash; your account is safe.")}
  `;
  return emailWrapper(content);
}

/**
 * Quick Store: Customer OTP
 */
export function otpEmail(otpCode: string, storeName: string): string {
  const content = `
    ${heading('Your verification code')}
    ${paragraph(`Enter this code to sign in to <strong>${storeName}</strong>`)}
    ${codeBlock(otpCode)}
    ${note("This code expires in 10 minutes. If you didn&rsquo;t request this, you can safely ignore this email.")}
  `;
  return emailWrapper(content);
}

/**
 * Order notification to printer — Quick Store
 */
export function qsOrderNotificationEmail(params: {
  storeName: string;
  orderCode: string;
  customerName: string;
  sheetCount: number;
  totalArea: string;
  totalPrice: string;
  currency: string;
  dashboardUrl: string;
}): string {
  const content = `
    ${heading('New order received!')}
    ${paragraph(`You have a new order on <strong>${params.storeName}</strong>.`)}
    ${infoBox(`
      ${kvRow('Order', `<span style="font-family: monospace;">${params.orderCode}</span>`)}
      ${kvRow('Customer', params.customerName)}
      ${kvRow('Sheets', String(params.sheetCount))}
      ${kvRow('Total area', params.totalArea)}
      ${kvRow('Amount', `${params.currency} ${params.totalPrice}`)}
    `)}
    ${ctaButton('View order', params.dashboardUrl)}
    ${note("You&rsquo;re receiving this because a customer placed an order on your Quick Store.")}
  `;
  return emailWrapper(content);
}

/**
 * Order notification to printer — Website Integration
 */
export function wiOrderNotificationEmail(params: {
  designCode: string;
  sheetCount: number;
  totalPrice: string;
  currency: string;
  customerEmail: string | null;
  productName: string;
  dashboardUrl: string;
}): string {
  const content = `
    ${heading('New design order received!')}
    ${paragraph(`A customer just submitted a gang sheet order${params.customerEmail ? ` from <strong>${params.customerEmail}</strong>` : ''}.`)}
    ${infoBox(`
      ${kvRow('Design code', `<span style="font-family: monospace;">${params.designCode}</span>`)}
      ${kvRow('Product', params.productName)}
      ${kvRow('Sheets', String(params.sheetCount))}
      ${kvRow('Amount', `${params.currency} ${params.totalPrice}`)}
    `)}
    ${ctaButton('View in dashboard', params.dashboardUrl)}
    ${note("You&rsquo;re receiving this because a customer submitted an order via your Website Integration.")}
  `;
  return emailWrapper(content);
}

export { BRAND };
