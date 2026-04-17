/**
 * POST /api/send-contact
 * Receives contact form data and sends an email to dtflayout@gmail.com via Resend.
 * Tags the email subject with [DTF Layout Contact Form] for easy filtering.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';

const RECIPIENT_EMAIL = 'dtflayout@gmail.com';
const FROM_EMAIL = 'DTF Layout Contact <noreply@dtflayout.com>';

const SUBJECT_LABELS: Record<string, string> = {
  general: 'General Inquiry',
  setup: 'Setup & Onboarding Help',
  billing: 'Billing & Credits',
  bug: 'Bug Report',
  feature: 'Feature Request',
  integration: 'Website Integration Help',
  quickstore: 'Quick Store Help',
  other: 'Other',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.error('[SendContact] Missing RESEND_API_KEY');
    return res.status(500).json({ error: 'Email service not configured' });
  }

  const { name, email, subject, message } = req.body || {};

  // Validate required fields
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }
  if (!email || !email.trim()) {
    return res.status(400).json({ error: 'Email is required' });
  }
  // Basic email format check
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const subjectLabel = SUBJECT_LABELS[subject] || 'General Inquiry';
  const subjectLine = `[DTF Layout Contact Form] ${subjectLabel} — from ${name.trim()}`;

  // Build HTML email body
  const htmlBody = `
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 24px;">
      <div style="background: linear-gradient(135deg, #4F46E5, #7C3AED); padding: 20px 24px; border-radius: 12px 12px 0 0;">
        <h2 style="color: #fff; margin: 0; font-size: 18px; font-weight: 700;">📩 New Contact Form Submission</h2>
      </div>
      <div style="background: #fff; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; font-size: 13px; color: #6b7280; font-weight: 600; width: 100px;">Name</td>
            <td style="padding: 8px 0; font-size: 14px; color: #111827;">${escapeHtml(name.trim())}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-size: 13px; color: #6b7280; font-weight: 600;">Email</td>
            <td style="padding: 8px 0; font-size: 14px; color: #111827;"><a href="mailto:${escapeHtml(email.trim())}" style="color: #4F46E5;">${escapeHtml(email.trim())}</a></td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-size: 13px; color: #6b7280; font-weight: 600;">Subject</td>
            <td style="padding: 8px 0; font-size: 14px; color: #111827;">${escapeHtml(subjectLabel)}</td>
          </tr>
        </table>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
        <div style="font-size: 13px; color: #6b7280; font-weight: 600; margin-bottom: 8px;">Message</div>
        <div style="font-size: 14px; color: #111827; line-height: 1.6; white-space: pre-wrap; background: #f9fafb; padding: 14px; border-radius: 8px; border: 1px solid #f3f4f6;">${escapeHtml(message.trim())}</div>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
        <p style="font-size: 11px; color: #9ca3af; margin: 0;">This email was sent from the DTF Layout contact form at dtflayout.com/contact</p>
      </div>
    </div>
  `;

  try {
    const resend = new Resend(resendApiKey);

    const { error: emailError } = await resend.emails.send({
      from: FROM_EMAIL,
      to: RECIPIENT_EMAIL,
      replyTo: email.trim(),
      subject: subjectLine,
      html: htmlBody,
      tags: [
        { name: 'source', value: 'contact-form' },
        { name: 'category', value: subject || 'general' },
      ],
    });

    if (emailError) {
      console.error('[SendContact] Resend error:', emailError);
      return res.status(500).json({ error: 'Failed to send message. Please try again.' });
    }

    console.log(`[SendContact] Email sent: ${subjectLabel} from ${email.trim()}`);
    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error('[SendContact] Unexpected error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
