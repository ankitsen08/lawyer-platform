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
 */
async function sendVerificationEmail({ to, name, verificationUrl, token }) {
  const recipientName = name || 'Valued Client';
  const subject = 'Activate Your LawyerComparison Account';
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Activate Your Account</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f7f7f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0a0a0a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f7f7f7; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #ffffff; border: 1px solid #e5e5e5; border-top: 4px solid #000000; padding: 40px 32px;">
          <tr>
            <td align="left" style="padding-bottom: 24px; border-bottom: 1px solid #f0f0f0;">
              <span style="font-size: 20px; font-weight: 800; letter-spacing: -0.5px; color: #000000; text-transform: uppercase;">Lawyer<span style="color: #737373;">Comparison</span></span>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px 0 16px 0;">
              <h1 style="font-size: 22px; font-weight: 700; margin: 0 0 12px 0; color: #0a0a0a;">Activate Your Account</h1>
              <p style="font-size: 15px; line-height: 24px; color: #404040; margin: 0 0 16px 0;">
                Hello <strong>${recipientName}</strong>,
              </p>
              <p style="font-size: 15px; line-height: 24px; color: #404040; margin: 0 0 24px 0;">
                Thank you for completing your client onboarding with LawyerComparison. To activate your account, ensure conflict check confidentiality, and enable direct consultations with verified attorneys, please verify your email address:
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 30px 0;">
                <tr>
                  <td align="center" style="background-color: #000000; border-radius: 2px;">
                    <a href="${verificationUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 13px; font-weight: 700; color: #ffffff; text-decoration: none; text-transform: uppercase; letter-spacing: 1px;">
                      Activate Account
                    </a>
                  </td>
                </tr>
              </table>
              <p style="font-size: 13px; line-height: 20px; color: #737373; margin: 24px 0 8px 0;">
                Button not working? Copy and paste this secure link into your browser:
              </p>
              <p style="font-size: 12px; line-height: 18px; color: #000000; word-break: break-all; margin: 0 0 24px 0; background: #fafafa; padding: 12px; border: 1px solid #eee;">
                <a href="${verificationUrl}" style="color: #000000; text-decoration: underline;">${verificationUrl}</a>
              </p>
              <p style="font-size: 12px; line-height: 18px; color: #a3a3a3; margin: 0; border-top: 1px solid #f0f0f0; padding-top: 16px;">
                Note: This activation link expires in 24 hours. If you did not create an account on LawyerComparison, no further action is required and you can safely disregard this message.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top: 24px; font-size: 11px; color: #a3a3a3;">
              &copy; ${new Date().getFullYear()} LawyerComparison Inc. All rights reserved. &bull; Enterprise Legal Matchmaking
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

      await transporter.sendMail({
        from: process.env.EMAIL_FROM || (smtpUser ? `"LawyerComparison" <${smtpUser}>` : '"LawyerComparison" <notifications@lawyercomparison.com>'),
        to,
        subject,
        html
      });
      console.log(`[Email] Activation email successfully sent via SMTP to ${to}`);
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
