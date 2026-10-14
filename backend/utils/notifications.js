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

module.exports = {
  generateIcsCalendar,
  generateGoogleCalendarUrl,
  sendTransactionalEmail
};
