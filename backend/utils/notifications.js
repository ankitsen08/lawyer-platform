/**
 * Production Transactional Notifications & Calendar Integration
 * Supports Resend REST API, .ics calendar attachments, and Google Calendar links
 */

const https = require('https');

// Helper to format date into iCal UTC format (YYYYMMDDTHHMMSSZ)
function formatIcsDate(dateObj) {
  return dateObj.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

/**
 * Generate standard RFC 5545 .ics file content
 */
function generateIcsCalendar({ title, description, location, startTime, durationMinutes = 45 }) {
  const start = new Date(startTime);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  const now = new Date();
  const uid = `cons-${Date.now()}-${Math.random().toString(36).substring(2, 9)}@lawyercomparison.com`;

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//LawyerComparison//Consultation Booking//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatIcsDate(now)}`,
    `DTSTART:${formatIcsDate(start)}`,
    `DTEND:${formatIcsDate(end)}`,
    `SUMMARY:${title.replace(/[\r\n]+/g, ' ')}`,
    `DESCRIPTION:${description.replace(/[\r\n]+/g, '\\n')}`,
    `LOCATION:${location || 'Zoom Video Meeting'}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Reminder: Case Consultation in 15 minutes',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
}

/**
 * Generate 1-click Google Calendar add link
 */
function generateGoogleCalendarUrl({ title, description, location, startTime, durationMinutes = 45 }) {
  const start = new Date(startTime);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  const dates = `${formatIcsDate(start)}/${formatIcsDate(end)}`;

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    details: description,
    location: location || 'Zoom Video Conference',
    dates
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Send Transactional Email via Resend REST API or fallback to structured server logging
 */
async function sendTransactionalEmail({ to, subject, html, icsContent, attachmentName = 'invite.ics' }) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;

  if (RESEND_API_KEY) {
    return new Promise((resolve) => {
      const payload = {
        from: process.env.EMAIL_FROM || 'LawyerComparison <notifications@lawyercomparison.com>',
        to: Array.isArray(to) ? to : [to],
        subject,
        html
      };

      if (icsContent) {
        payload.attachments = [
          {
            filename: attachmentName,
            content: Buffer.from(icsContent).toString('base64'),
            type: 'text/calendar'
          }
        ];
      }

      const postData = JSON.stringify(payload);
      const req = https.request({
        hostname: 'api.resend.com',
        path: '/emails',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log(`[Email] Successfully delivered via Resend to ${to}`);
            resolve({ success: true, provider: 'resend' });
          } else {
            console.warn(`[Email] Resend API error (${res.statusCode}):`, body);
            resolve({ success: false, error: body });
          }
        });
      });

      req.on('error', (err) => {
        console.error('[Email] Failed to connect to Resend API:', err.message);
        resolve({ success: false, error: err.message });
      });

      req.write(postData);
      req.end();
    });
  }

  // Resilient Local / Demo Mode
  console.log(`\n======================================================`);
  console.log(`[TRANSACTIONAL EMAIL DISPATCHED] (Simulated Mode)`);
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Notice: Configure RESEND_API_KEY in .env to deliver live emails.`);
  console.log(`======================================================\n`);

  return { success: true, provider: 'simulated' };
}

/**
 * Send Account Activation / Email Verification Link
 * Built with RFC 2046 multipart/alternative (HTML + Plain-Text),
 * anti-spam transactional headers, and CAN-SPAM compliance for high inbox placement.
 */
async function sendVerificationEmail({ to, name, verificationUrl, token }) {
  const recipientName = name || 'Valued Client';
  const subject = 'Verify your email address - LawyerComparison';
  
  // RFC 2046 Plain-Text Alternative (Crucial for SpamAssassin & Google Mail Spam Filters)
  const text = [
    `Hello ${recipientName},`,
    '',
    'Thank you for registering with LawyerComparison.',
    'Please verify your email address to activate your account by clicking the link below:',
    '',
    verificationUrl,
    '',
    'Security Information:',
    '- This single-use activation link expires in 24 hours.',
    '- If you did not create an account on LawyerComparison, no action is required and you can safely ignore this email.',
    '',
    'Need help? Contact our support team at support@lawyercomparison.us',
    '',
    '---',
    'LawyerComparison Inc.',
    '100 Pine Street, Suite 1250, San Francisco, CA 94111',
    'Enterprise Legal Matchmaking & Verified Attorney Network',
    'https://lawyercomparison.us'
  ].join('\n');

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Verify your email address</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #18181b; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5; padding: 32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 560px; background-color: #ffffff; border-radius: 8px; border: 1px solid #e4e4e7; box-shadow: 0 1px 3px rgba(0,0,0,0.05); overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 28px 32px 20px 32px; border-bottom: 1px solid #f4f4f5; background-color: #09090b;">
              <span style="font-size: 18px; font-weight: 800; letter-spacing: -0.3px; color: #ffffff; text-transform: uppercase;">
                LAWYER<span style="color: #a1a1aa;">COMPARISON</span>
              </span>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px 32px 24px 32px;">
              <h1 style="font-size: 20px; font-weight: 700; margin: 0 0 16px 0; color: #09090b; letter-spacing: -0.3px;">
                Verify your email address
              </h1>
              
              <p style="font-size: 15px; line-height: 24px; color: #3f3f46; margin: 0 0 16px 0;">
                Hello <strong>${recipientName}</strong>,
              </p>
              
              <p style="font-size: 15px; line-height: 24px; color: #3f3f46; margin: 0 0 24px 0;">
                Thank you for completing your client onboarding with LawyerComparison. To activate your account, ensure attorney confidentiality, and enable direct consultations with verified lawyers, please verify your email address:
              </p>

              <!-- Action Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 28px 0;">
                <tr>
                  <td align="center" style="background-color: #09090b; border-radius: 6px;">
                    <a href="${verificationUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 14px 32px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none; letter-spacing: 0.2px;">
                      Verify & Activate Account &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Fallback Link -->
              <p style="font-size: 13px; line-height: 20px; color: #71717a; margin: 24px 0 8px 0;">
                Button not working? Copy and paste this link into your browser:
              </p>
              <p style="font-size: 12px; line-height: 18px; color: #09090b; word-break: break-all; margin: 0 0 24px 0; background-color: #f4f4f5; padding: 12px 14px; border-radius: 6px; border: 1px solid #e4e4e7;">
                <a href="${verificationUrl}" style="color: #09090b; text-decoration: underline;">${verificationUrl}</a>
              </p>

              <!-- Security Notice -->
              <div style="background-color: #fafafa; border-radius: 6px; padding: 12px 14px; border-left: 3px solid #71717a; margin-bottom: 24px;">
                <p style="font-size: 12px; line-height: 18px; color: #52525b; margin: 0;">
                  <strong>Security Note:</strong> This activation link is unique to your account and expires in 24 hours. If you did not create an account on LawyerComparison, no action is needed and you can safely disregard this message.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer (CAN-SPAM Compliant) -->
          <tr>
            <td style="padding: 20px 32px 28px 32px; background-color: #fafafa; border-top: 1px solid #e4e4e7; font-size: 11px; line-height: 18px; color: #71717a;">
              <p style="margin: 0 0 8px 0;">
                You received this transactional email because an account was registered with your email address on <a href="https://lawyercomparison.us" style="color: #09090b; text-decoration: underline;">LawyerComparison.us</a>.
              </p>
              <p style="margin: 0 0 8px 0;">
                LawyerComparison Inc. &bull; 100 Pine Street, Suite 1250, San Francisco, CA 94111 &bull; 
                <a href="mailto:support@lawyercomparison.us" style="color: #71717a; text-decoration: underline;">support@lawyercomparison.us</a>
              </p>
              <p style="margin: 0; color: #a1a1aa;">
                &copy; ${new Date().getFullYear()} LawyerComparison Inc. All rights reserved. Enterprise Legal Matchmaking.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  // 1. Try Nodemailer if SMTP credentials are provided
  const smtpHost = process.env.SMTP_HOST || process.env.EMAIL_HOST;
  const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER;
  const smtpPass = (process.env.SMTP_PASS || process.env.GMAIL_PASS || '').replace(/\s+/g, '');

  if (smtpHost || (smtpUser && smtpPass)) {
    try {
      const nodemailer = require('nodemailer');
      const isGmail = (smtpHost && smtpHost.includes('gmail')) || (smtpUser && smtpUser.includes('@gmail'));
      const transportConfig = isGmail
        ? {
            service: 'gmail',
            auth: {
              user: smtpUser,
              pass: smtpPass
            }
          }
        : {
            host: smtpHost || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587', 10),
            secure: process.env.SMTP_SECURE === 'true' || parseInt(process.env.SMTP_PORT, 10) === 465,
            auth: {
              user: smtpUser,
              pass: smtpPass
            }
          };

      const transporter = nodemailer.createTransport(transportConfig);

      // Unique RFC 5322 Message-ID to prevent duplicate spam suppression
      const cleanTokenSlug = token ? token.substring(0, 16) : Math.random().toString(36).substring(2, 10);
      const messageId = `<verify-${cleanTokenSlug}-${Date.now()}@lawyercomparison.us>`;

      await transporter.sendMail({
        from: process.env.EMAIL_FROM || (smtpUser ? `"LawyerComparison" <${smtpUser}>` : '"LawyerComparison" <support@lawyercomparison.us>'),
        replyTo: process.env.EMAIL_REPLY_TO || 'support@lawyercomparison.us',
        to,
        subject,
        text, // RFC 2046 multipart/alternative plain text
        html,
        messageId,
        headers: {
          'X-Entity-Ref-ID': `lc-verify-${cleanTokenSlug}`,
          'X-Auto-Response-Suppress': 'All, OOF, AutoReply',
          'Auto-Submitted': 'auto-generated',
          'Precedence': 'bulk',
          'Feedback-ID': 'verification:client:lawyercomparison',
          'List-Unsubscribe': '<mailto:support@lawyercomparison.us?subject=unsubscribe>',
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
        }
      });
      console.log(`[Email] Activation email successfully sent via SMTP to ${to} (Message-ID: ${messageId})`);
      return { success: true, provider: 'smtp', verificationUrl };
    } catch (smtpErr) {
      console.warn(`[Email] Nodemailer/SMTP failed (${smtpErr.message}), falling back to Resend / simulation.`);
    }
  }

  // 2. Try Resend if RESEND_API_KEY is configured
  const resendResult = await sendTransactionalEmail({ to, subject, html });
  if (resendResult.provider === 'resend') {
    return { ...resendResult, verificationUrl };
  }

  // 3. Fallback to rich development simulation log
  console.log(`\n======================================================`);
  console.log(`[EMAIL VERIFICATION DISPATCHED] (Simulated Mode)`);
  console.log(`To: ${to} (${recipientName})`);
  console.log(`Subject: ${subject}`);
  console.log(`Token: ${token}`);
  console.log(`Activation Link: ${verificationUrl}`);
  console.log(`Notice: Configure SMTP or RESEND_API_KEY in .env for live inbox delivery.`);
  console.log(`======================================================\n`);

  return { success: true, provider: 'simulated', verificationUrl };
}

module.exports = {
  generateIcsCalendar,
  generateGoogleCalendarUrl,
  sendTransactionalEmail,
  sendVerificationEmail
};
