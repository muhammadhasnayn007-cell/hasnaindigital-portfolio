const { authenticate } = require('./admin-auth');
const { checkRateLimit, isValidEmail } = require('../lib/security');
const { sendEmail } = require('../lib/mailer');

const REPORT_LIMIT = 50;

function formatDate(value) {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not recorded' : date.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' });
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function cleanField(value, maxLength = 2000) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function detectReportRequest(message) {
  const hasAction = /\b(send|email|mail|give\s+me|prepare|create|generate|retrieve|show|get)\b/i.test(message);
  const hasReport = /\b(report|history|records?|list|saved\s+(?:client|inquiry|subscriber)?\s*data)\b/i.test(message);
  const inquiryRequest = /\b(client|customer|inquiries?|leads?|projects?)\b/i.test(message);
  const subscriberRequest = /\b(newsletter|subscribers?|subscriptions?)\b/i.test(message);

  if (!hasAction || !hasReport || (!inquiryRequest && !subscriberRequest)) return null;
  if (inquiryRequest && subscriberRequest) return 'ambiguous';
  return subscriberRequest ? 'subscribers' : 'inquiries';
}

function renderInquiry(inquiry, deliveries) {
  const deliverySummary = deliveries.length
    ? deliveries.map(item => `${cleanField(item.delivery_type, 80) || 'notification'}: ${cleanField(item.status, 80) || 'unknown'}${item.delivered_at ? ` at ${formatDate(item.delivered_at)}` : ''}`).join('; ')
    : 'No delivery record';
  const fields = [
    ['Reference ID', cleanField(inquiry.reference_id, 120)],
    ['Client', cleanField(inquiry.full_name, 160)],
    ['Email', cleanField(inquiry.email, 254)],
    ['Requested service', cleanField(inquiry.project_type, 120)],
    ['Project', cleanField(inquiry.project_title, 240)],
    ['Description', cleanField(inquiry.description, 4000)],
    ['Submitted', formatDate(inquiry.created_at)],
    ['Status', cleanField(inquiry.status, 80)],
    ['Last updated', formatDate(inquiry.updated_at)],
    ['Permitted admin notes', cleanField(inquiry.admin_notes, 2000)],
    ['Notification delivery', deliverySummary]
  ].filter(([, value]) => value);

  return {
    text: fields.map(([label, value]) => `${label}: ${value}`).join('\n'),
    html: `<section style="padding:18px 0;border-bottom:1px solid #342327"><h2 style="margin:0 0 12px;color:#ff596b;font-size:16px">${escapeHtml(inquiry.reference_id || 'Inquiry')}</h2>${fields.map(([label, value]) => `<p style="margin:6px 0;color:#eee;white-space:pre-wrap"><strong style="color:#ff9aa4">${escapeHtml(label)}:</strong> ${escapeHtml(value)}</p>`).join('')}</section>`
  };
}

function renderSubscriber(subscriber) {
  const fields = [
    ['Email', cleanField(subscriber.email, 254)],
    ['Subscription status', cleanField(subscriber.status, 40)],
    ['Consent recorded', formatDate(subscriber.consent_at)],
    ['Subscription confirmed', formatDate(subscriber.confirmed_at)],
    ['Unsubscribed', formatDate(subscriber.unsubscribed_at)]
  ].filter(([, value]) => value);

  return {
    text: fields.map(([label, value]) => `${label}: ${value}`).join('\n'),
    html: `<section style="padding:16px 0;border-bottom:1px solid #342327">${fields.map(([label, value]) => `<p style="margin:6px 0;color:#eee"><strong style="color:#ff9aa4">${escapeHtml(label)}:</strong> ${escapeHtml(value)}</p>`).join('')}</section>`
  };
}

async function sendOwnerReport({ recipient, subject, heading, records, generatedAt, excludedNote }) {
  const text = [
    `H.X.S.N DIGITAL TECHNOLOGIES — CONFIDENTIAL ${heading.toUpperCase()}`,
    `Generated: ${generatedAt}`,
    `Latest ${records.length} records included (maximum ${REPORT_LIMIT}).`,
    excludedNote,
    '',
    ...(records.length ? records.map(record => record.text) : ['No matching records are currently saved.'])
  ].join('\n\n');
  const html = `<div style="max-width:760px;margin:auto;padding:24px;background:#100c0d;color:#f5eeee;font:14px/1.6 Arial,sans-serif"><p style="color:#ff596b;font-weight:bold;letter-spacing:.12em">H.X.S.N DIGITAL TECHNOLOGIES</p><h1 style="font-size:22px">${escapeHtml(heading)}</h1><p>Generated ${escapeHtml(generatedAt)} · latest ${records.length} records (maximum ${REPORT_LIMIT})</p><p style="color:#bbb">${escapeHtml(excludedNote)}</p>${records.map(record => record.html).join('') || '<p>No matching records are currently saved.</p>'}</div>`;
  const delivery = await sendEmail({ to: recipient, subject, text, html });
  if (!delivery?.provider || !delivery?.id) throw new Error('Email provider did not confirm acceptance.');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed.' });
  const auth = await authenticate(req);
  if (!auth) return res.status(401).json({ success: false, error: 'Administrator authentication required.' });

  const message = typeof req.body?.message === 'string' ? req.body.message.trim().slice(0, 1000) : '';
  if (!message) return res.status(400).json({ success: false, error: 'Please enter a request.' });

  const chatLimit = checkRateLimit(`admin-chat:${auth.user.id}`, 20, 60_000);
  if (!chatLimit.allowed) return res.status(429).json({ success: false, error: 'Too many assistant requests. Please try again shortly.' });

  const reportType = detectReportRequest(message);
  if (!reportType) {
    return res.status(200).json({
      success: true,
      reply: 'For privacy, request one report at a time: “Give me the client history and saved inquiry data” or “Email me the newsletter subscriber report.”'
    });
  }
  if (reportType === 'ambiguous') {
    return res.status(200).json({ success: true, reply: 'Please request client inquiries or newsletter subscribers separately. Subscriber details are never added to client inquiry reports.' });
  }

  const ownerEmail = process.env.CONTACT_EMAIL?.trim();
  if (!ownerEmail || !isValidEmail(ownerEmail)) {
    return res.status(503).json({ success: false, error: 'The owner report destination is not configured.' });
  }
  if (!auth.user.email || !auth.user.email_confirmed_at || auth.user.email.toLowerCase() !== ownerEmail.toLowerCase()) {
    return res.status(403).json({ success: false, error: 'Sign in with the verified owner administrator account configured for portfolio reports.' });
  }

  const reportLimit = checkRateLimit(`admin-report:${auth.user.id}`, 3, 15 * 60 * 1000);
  if (!reportLimit.allowed) return res.status(429).json({ success: false, error: 'Report requests are temporarily limited. Please try again later.' });

  try {
    const generatedAt = formatDate(new Date().toISOString());
    if (reportType === 'inquiries') {
      const { data, error } = await auth.admin
        .from('project_inquiries')
        .select('id, reference_id, full_name, email, project_type, project_title, description, status, admin_notes, created_at, updated_at')
        .order('created_at', { ascending: false })
        .limit(REPORT_LIMIT);
      if (error) throw error;
      const inquiries = data || [];
      const inquiryIds = inquiries.map(inquiry => inquiry.id).filter(Boolean);
      let deliveriesByInquiry = new Map();
      if (inquiryIds.length) {
        const { data: deliveries, error: deliveryError } = await auth.admin
          .from('notification_deliveries')
          .select('inquiry_id, delivery_type, status, delivered_at')
          .in('inquiry_id', inquiryIds)
          .limit(REPORT_LIMIT * 4);
        if (deliveryError) throw deliveryError;
        deliveriesByInquiry = new Map();
        for (const delivery of deliveries || []) {
          const entries = deliveriesByInquiry.get(delivery.inquiry_id) || [];
          entries.push(delivery);
          deliveriesByInquiry.set(delivery.inquiry_id, entries);
        }
      }
      const records = inquiries.map(inquiry => renderInquiry(inquiry, deliveriesByInquiry.get(inquiry.id) || []));
      await sendOwnerReport({
        recipient: ownerEmail,
        subject: 'Confidential client inquiry report — H.X.S.N',
        heading: 'Client inquiry history',
        records,
        generatedAt,
        excludedNote: 'Newsletter subscriber records are reported separately and are not included.'
      });
    } else {
      const { data, error } = await auth.admin
        .from('newsletter_subscribers')
        .select('email, status, consent_at, confirmed_at, unsubscribed_at, created_at')
        .order('created_at', { ascending: false })
        .limit(REPORT_LIMIT);
      if (error) throw error;
      const records = (data || []).map(renderSubscriber);
      await sendOwnerReport({
        recipient: ownerEmail,
        subject: 'Confidential newsletter subscriber report — H.X.S.N',
        heading: 'Newsletter subscriber management',
        records,
        generatedAt,
        excludedNote: 'Client inquiry records are reported separately and are not included.'
      });
    }

    return res.status(200).json({
      success: true,
      reportSent: true,
      reply: 'The requested report was accepted by the email provider and sent to the verified owner email. Private record details are not displayed in this session.'
    });
  } catch (error) {
    console.error('[v0] Admin report delivery failed:', error?.name || 'Error');
    return res.status(502).json({ success: false, error: 'Unable to send the requested report. No delivery confirmation was issued.' });
  }
};
