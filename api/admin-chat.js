const { authenticate } = require('./admin-auth');
const { checkRateLimit } = require('../lib/security');
const { sendEmail } = require('../lib/mailer');

function formatDate(value) {
  return value ? new Date(value).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }) : 'Unknown date';
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function renderInquiry(inquiry, deliveries) {
  const fields = [
    ['Reference ID', inquiry.reference_id],
    ['Client', inquiry.full_name],
    ['Email', inquiry.email],
    ['Requested service', inquiry.project_type],
    ['Project', inquiry.project_title],
    ['Description', inquiry.description],
    ['Submitted', formatDate(inquiry.created_at)],
    ['Status', inquiry.status],
    ['Last updated', formatDate(inquiry.updated_at)],
    ['Permitted admin notes', inquiry.admin_notes],
    ['Notification delivery', deliveries.length ? deliveries.map(item => `${item.delivery_type || 'notification'}: ${item.status || 'unknown'}${item.delivered_at ? ` at ${formatDate(item.delivered_at)}` : ''}`).join('; ') : 'No delivery record']
  ].filter(([, value]) => value != null && String(value).trim());

  return {
    text: fields.map(([label, value]) => `${label}: ${String(value).trim()}`).join('\n'),
    html: `<section style="padding:18px 0;border-bottom:1px solid #342327"><h2 style="margin:0 0 12px;color:#ff596b;font-size:16px">${escapeHtml(inquiry.reference_id || 'Inquiry')}</h2>${fields.map(([label, value]) => `<p style="margin:6px 0;color:#eee"><strong style="color:#ff9aa4">${escapeHtml(label)}:</strong> ${escapeHtml(value)}</p>`).join('')}</section>`
  };
}

module.exports = async function handler(req, res) {
  const auth = await authenticate(req);
  if (!auth) return res.status(401).json({ success: false, error: 'Administrator authentication required.' });
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed.' });

  const message = typeof req.body?.message === 'string' ? req.body.message.trim().slice(0, 1000) : '';
  if (!message) return res.status(400).json({ success: false, error: 'Please enter a request.' });

  const wantsHistory = /client history|client inquiries|all clients|all inquiries|lead history|project history|saved inquiry data|inquiry history/i.test(message);
  if (!wantsHistory) {
    return res.status(200).json({ success: true, reply: 'I can securely email the client inquiry history to your verified administrator email. Try: “Give me the client history and saved inquiry data.”' });
  }
  if (!auth.user.email || !auth.user.email_confirmed_at) {
    return res.status(403).json({ success: false, error: 'A verified administrator email is required to receive this report.' });
  }

  const rateLimit = checkRateLimit(`admin-history-report:${auth.user.id}`, 3, 15 * 60 * 1000);
  if (!rateLimit.allowed) return res.status(429).json({ success: false, error: 'Report requests are temporarily limited. Please try again later.' });

  try {
    const { data, error } = await auth.admin
      .from('project_inquiries')
      .select('id, reference_id, full_name, email, project_type, project_title, description, status, admin_notes, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) throw error;
    const inquiries = data || [];
    const inquiryIds = inquiries.map(inquiry => inquiry.reference_id).filter(Boolean);
    let deliveriesByInquiry = new Map();
    if (inquiryIds.length) {
      const { data: deliveries, error: deliveryError } = await auth.admin
        .from('notification_deliveries')
        .select('inquiry_id, delivery_type, status, delivered_at, updated_at')
        .in('inquiry_id', inquiries.map(inquiry => inquiry.id).filter(Boolean));
      if (deliveryError) throw deliveryError;
      deliveriesByInquiry = new Map();
      for (const delivery of deliveries || []) {
        const entries = deliveriesByInquiry.get(delivery.inquiry_id) || [];
        entries.push(delivery);
        deliveriesByInquiry.set(delivery.inquiry_id, entries);
      }
    }

    const records = inquiries.map(inquiry => renderInquiry(inquiry, deliveriesByInquiry.get(inquiry.id) || []));
    const generatedAt = formatDate(new Date().toISOString());
    const text = [
      'H.X.S.N DIGITAL TECHNOLOGIES — CONFIDENTIAL CLIENT INQUIRY HISTORY',
      `Generated: ${generatedAt}`,
      `Records included: ${inquiries.length}${inquiries.length === 200 ? ' (latest 200)' : ''}`,
      'Newsletter subscriber records are excluded.',
      '',
      ...(records.length ? records.map(record => record.text) : ['No client inquiries are currently saved.'])
    ].join('\n\n');
    const html = `<div style="max-width:760px;margin:auto;padding:24px;background:#100c0d;color:#f5eeee;font:14px/1.6 Arial,sans-serif"><p style="color:#ff596b;font-weight:bold;letter-spacing:.12em">H.X.S.N DIGITAL TECHNOLOGIES</p><h1 style="font-size:22px">Confidential client inquiry history</h1><p>Generated ${escapeHtml(generatedAt)} · ${inquiries.length} records${inquiries.length === 200 ? ' (latest 200)' : ''}</p><p style="color:#bbb">Newsletter subscriber records are excluded.</p>${records.map(record => record.html).join('') || '<p>No client inquiries are currently saved.</p>'}</div>`;

    await sendEmail({
      to: auth.user.email,
      subject: 'Confidential client inquiry history — H.X.S.N',
      text,
      html
    });

    return res.status(200).json({
      success: true,
      reportSent: true,
      reply: 'The client inquiry report was accepted by the email provider and sent to your verified administrator email. Inquiry details are not displayed in this session.'
    });
  } catch (error) {
    console.error('[v0] Admin history report failed:', error.message);
    return res.status(502).json({ success: false, error: 'Unable to send the client inquiry report. No delivery confirmation was issued.' });
  }
};
