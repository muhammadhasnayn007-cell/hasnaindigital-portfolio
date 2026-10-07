// Email Delivery Engine for Hasnain Digital Marketer
// Supports Resend API and standard SMTP with inline CSS templates and CID logo attachments.
const fs = require('fs');
const path = require('path');
const { escapeHtml } = require('./security');

// Fallback embedded base64 logo
const FALLBACK_LOGO_BASE64 = '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';

function getLogoAttachment() {
  try {
    const localLogoPath = path.join(process.cwd(), 'images', 'logo.png');
    if (fs.existsSync(localLogoPath)) {
      const buffer = fs.readFileSync(localLogoPath);
      return {
        filename: 'hasnain-logo.png',
        content: buffer,
        base64: buffer.toString('base64'),
        cid: 'hasnain_logo'
      };
    }
  } catch (err) {
    // Fallback if filesystem access is restricted in serverless
  }

  return {
    filename: 'hasnain-logo.png',
    content: Buffer.from(FALLBACK_LOGO_BASE64, 'base64'),
    base64: FALLBACK_LOGO_BASE64,
    cid: 'hasnain_logo'
  };
}

/**
 * Builds the Contact Form HTML email with the logo placed neatly at the bottom-right corner.
 */
function buildContactEmailHtml({ name, email, subject, service, message, siteUrl }) {
  const publicLogoUrl = `${siteUrl.replace(/\/+$/, '')}/images/logo.png`;
  const formattedDate = new Date().toLocaleString('en-US', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'UTC'
  }) + ' (UTC)';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Project Enquiry &mdash; H.X.S.N Digital Marketer</title>
</head>
<body style="margin:0;padding:28px 14px;background-color:#070506;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#f0ece8;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:620px;margin:0 auto;background-color:#120e10;border:1px solid #292124;border-radius:18px;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,0.65);">
    <!-- Header banner -->
    <tr>
      <td style="padding:28px 32px;background:linear-gradient(135deg,#231317 0%,#130e10 100%);border-bottom:1px solid #2d2024;">
        <span style="display:inline-block;padding:4px 12px;background:rgba(227,19,27,0.16);border:1px solid rgba(227,19,27,0.4);border-radius:999px;font-size:11px;font-weight:700;color:#ff4d5a;letter-spacing:1.2px;text-transform:uppercase;">New Portfolio Enquiry</span>
        <h1 style="margin:12px 0 0 0;font-size:22px;line-height:1.3;font-weight:700;color:#ffffff;">${escapeHtml(subject)}</h1>
      </td>
    </tr>

    <!-- Body content -->
    <tr>
      <td style="padding:32px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;border-collapse:collapse;">
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #1e171a;font-size:11px;text-transform:uppercase;letter-spacing:1.2px;color:#8f8280;font-weight:700;width:120px;">Client Name</td>
            <td style="padding:10px 0;border-bottom:1px solid #1e171a;font-size:15px;color:#ffffff;font-weight:600;">${escapeHtml(name)}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #1e171a;font-size:11px;text-transform:uppercase;letter-spacing:1.2px;color:#8f8280;font-weight:700;">Email Address</td>
            <td style="padding:10px 0;border-bottom:1px solid #1e171a;font-size:15px;color:#ff4d5a;">
              <a href="mailto:${escapeHtml(email)}" style="color:#ff4d5a;text-decoration:none;font-weight:600;">${escapeHtml(email)}</a>
              <span style="display:inline-block;margin-left:8px;font-size:11px;color:#7e7472;">(Reply-To configured)</span>
            </td>
          </tr>
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #1e171a;font-size:11px;text-transform:uppercase;letter-spacing:1.2px;color:#8f8280;font-weight:700;">Service</td>
            <td style="padding:10px 0;border-bottom:1px solid #1e171a;font-size:15px;color:#d5ccc6;font-weight:500;">${escapeHtml(service)}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #1e171a;font-size:11px;text-transform:uppercase;letter-spacing:1.2px;color:#8f8280;font-weight:700;">Received</td>
            <td style="padding:10px 0;border-bottom:1px solid #1e171a;font-size:13px;color:#a89f9b;">${formattedDate}</td>
          </tr>
        </table>

        <!-- Message container -->
        <div style="padding:22px;background-color:#0a0809;border:1px solid #261d21;border-radius:12px;margin-bottom:32px;">
          <p style="margin:0 0 10px 0;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#8f8280;font-weight:700;">Message Details</p>
          <div style="font-size:15px;line-height:1.75;color:#e8e0da;white-space:pre-wrap;word-break:break-word;">${escapeHtml(message)}</div>
        </div>

        <!-- Footer table with logo neatly at the bottom-right corner -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #261d21;padding-top:22px;">
          <tr>
            <td align="left" style="vertical-align:middle;">
              <strong style="display:block;font-size:13px;color:#ffffff;letter-spacing:0.5px;">H.X.S.N Digital Marketer</strong>
              <span style="display:block;font-size:11px;color:#7e7472;margin-top:2px;">Web Developer &bull; Python Developer &bull; UI/UX &bull; SEO Specialist</span>
            </td>
            <td align="right" style="vertical-align:middle;text-align:right;">
              <a href="${siteUrl}" target="_blank" style="display:inline-block;text-decoration:none;">
                <img src="cid:hasnain_logo" onerror="this.onerror=null;this.src='${publicLogoUrl}';" alt="H.X.S.N Digital Marketer Logo" width="48" height="48" style="display:block;border-radius:10px;border:1px solid #3d272b;background-color:#0a0809;" />
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Builds the Private AI Lead Notification HTML email for Hasnain.
 * Dispatched confidentially when a visitor has a qualified project inquiry with Hasnain's Assistant.
 */
function buildAiLeadEmailHtml({ name, email, service, projectType, requirements, timeline, summary, priority, recommendedAction, siteUrl }) {
  const publicLogoUrl = `${siteUrl.replace(/\/+$/, '')}/images/logo.png`;
  const formattedDate = new Date().toLocaleString('en-US', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'UTC'
  }) + ' (UTC)';

  const priorityColor = priority === 'High-Priority Lead' ? '#ff3344' : '#48c78e';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Client Lead &mdash; Hasnain's Assistant</title>
</head>
<body style="margin:0;padding:28px 14px;background-color:#070506;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#f0ece8;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:620px;margin:0 auto;background-color:#120e10;border:1px solid #292124;border-radius:18px;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,0.65);">
    <!-- Private Banner Header -->
    <tr>
      <td style="padding:28px 32px;background:linear-gradient(135deg,#24161a 0%,#150e11 100%);border-bottom:1px solid #2d2024;">
        <span style="display:inline-block;padding:4px 12px;background:rgba(227,19,27,0.18);border:1px solid rgba(227,19,27,0.45);border-radius:999px;font-size:11px;font-weight:700;color:#ff4d5a;letter-spacing:1.2px;text-transform:uppercase;">Private Lead Alert &bull; Hasnain's Assistant</span>
        <h1 style="margin:12px 0 0 0;font-size:22px;line-height:1.3;font-weight:700;color:#ffffff;">New Client Lead Detected</h1>
      </td>
    </tr>

    <!-- Body content -->
    <tr>
      <td style="padding:32px;">
        <div style="display:inline-block;padding:5px 12px;border-radius:6px;background-color:rgba(255,255,255,0.06);border:1px solid ${priorityColor};font-size:12px;font-weight:700;color:${priorityColor};margin-bottom:20px;">
          Lead Priority: ${escapeHtml(priority || 'Qualified Lead')}
        </div>

        <!-- Client & Inquiry Summary -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;border-collapse:collapse;">
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #1e171a;font-size:11px;text-transform:uppercase;letter-spacing:1.2px;color:#8f8280;font-weight:700;width:130px;">Client Name</td>
            <td style="padding:10px 0;border-bottom:1px solid #1e171a;font-size:15px;color:#ffffff;font-weight:600;">${escapeHtml(name || 'Not provided yet')}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #1e171a;font-size:11px;text-transform:uppercase;letter-spacing:1.2px;color:#8f8280;font-weight:700;">Client Email</td>
            <td style="padding:10px 0;border-bottom:1px solid #1e171a;font-size:15px;color:#ff4d5a;">
              ${email ? `<a href="mailto:${escapeHtml(email)}" style="color:#ff4d5a;text-decoration:none;font-weight:600;">${escapeHtml(email)}</a>` : '<span style="color:#8f8280;">Pending handoff to contact form</span>'}
            </td>
          </tr>
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #1e171a;font-size:11px;text-transform:uppercase;letter-spacing:1.2px;color:#8f8280;font-weight:700;">Interested Service</td>
            <td style="padding:10px 0;border-bottom:1px solid #1e171a;font-size:15px;color:#ffffff;font-weight:500;">${escapeHtml(service || 'General Project')}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #1e171a;font-size:11px;text-transform:uppercase;letter-spacing:1.2px;color:#8f8280;font-weight:700;">Project Type</td>
            <td style="padding:10px 0;border-bottom:1px solid #1e171a;font-size:15px;color:#d5ccc6;">${escapeHtml(projectType || 'Custom Inquiry')}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #1e171a;font-size:11px;text-transform:uppercase;letter-spacing:1.2px;color:#8f8280;font-weight:700;">Timeline</td>
            <td style="padding:10px 0;border-bottom:1px solid #1e171a;font-size:14px;color:#d5ccc6;">${escapeHtml(timeline || 'Flexible / Not stated')}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #1e171a;font-size:11px;text-transform:uppercase;letter-spacing:1.2px;color:#8f8280;font-weight:700;">Detected At</td>
            <td style="padding:10px 0;border-bottom:1px solid #1e171a;font-size:13px;color:#a89f9b;">${formattedDate}</td>
          </tr>
        </table>

        <!-- AI Assistant Summary Box -->
        <div style="padding:20px;background-color:#0b0809;border:1px solid #2a1f23;border-radius:12px;margin-bottom:20px;">
          <p style="margin:0 0 8px 0;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#ff4d5a;font-weight:700;">AI Conversation Summary</p>
          <p style="margin:0;font-size:14px;line-height:1.65;color:#e8e0da;">${escapeHtml(summary || requirements || 'Client initiated inquiry via Hasnain\'s Assistant.')}</p>
        </div>

        <!-- Recommended Action Box -->
        <div style="padding:16px 20px;background-color:rgba(72,199,142,0.08);border:1px solid rgba(72,199,142,0.3);border-radius:12px;margin-bottom:32px;">
          <p style="margin:0 0 4px 0;font-size:11px;text-transform:uppercase;letter-spacing:1.2px;color:#48c78e;font-weight:700;">Recommended Next Step</p>
          <p style="margin:0;font-size:13px;color:#d5f3e4;">${escapeHtml(recommendedAction || 'Review client requirements and reach out directly or await contact form submission.')}</p>
        </div>

        <!-- Footer table with logo at bottom-right -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #261d21;padding-top:22px;">
          <tr>
            <td align="left" style="vertical-align:middle;">
              <strong style="display:block;font-size:13px;color:#ffffff;letter-spacing:0.5px;">Hasnain's Assistant</strong>
              <span style="display:block;font-size:11px;color:#7e7472;margin-top:2px;">Private Lead Qualification System</span>
            </td>
            <td align="right" style="vertical-align:middle;text-align:right;">
              <a href="${siteUrl}" target="_blank" style="display:inline-block;text-decoration:none;">
                <img src="cid:hasnain_logo" onerror="this.onerror=null;this.src='${publicLogoUrl}';" alt="H.X.S.N Digital Marketer Logo" width="48" height="48" style="display:block;border-radius:10px;border:1px solid #3d272b;background-color:#0a0809;" />
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Sends an email using either Resend API or SMTP (Nodemailer)
 */
async function sendEmail({ to, replyTo, subject, html }) {
  const recipient = to || process.env.CONTACT_EMAIL || 'muhammadhasnayn007@gmail.com';
  const logo = getLogoAttachment();
  let resendError = null;

  // 1. Resend API
  if (process.env.RESEND_API_KEY) {
    const fromEmail =
      process.env.RESEND_FROM ||
      'H.X.S.N Digital Marketer <onboarding@resend.dev>';

    const payload = {
      from: fromEmail,
      to: [recipient],
      reply_to: replyTo || undefined,
      subject,
      html,
      attachments: [
        {
          filename: logo.filename,
          content: logo.base64,
          content_id: logo.cid,
          content_type: 'image/png'
        }
      ]
    };

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.id) {
        return {
          provider: 'resend',
          id: data.id
        };
      }

      console.error('RESEND ERROR:', {
        status: res.status,
        response: data
      });

      resendError = new Error(
        data.message ||
        data.error ||
        `Resend delivery failed with status ${res.status}`
      );
    } catch (err) {
      console.error('RESEND NETWORK ERROR:', err.message);
      resendError = err;
    }
  }

  // 2. SMTP / Nodemailer (Fallback if Resend failed or not configured)
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 465,
      secure: (process.env.SMTP_SECURE === 'true') || (!process.env.SMTP_PORT || process.env.SMTP_PORT === '465'),
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    const info = await transporter.sendMail({
      from: `"H.X.S.N Digital Marketer" <${process.env.SMTP_USER}>`,
      to: recipient,
      replyTo: replyTo || undefined,
      subject,
      html,
      attachments: [
        {
          filename: logo.filename,
          content: logo.content,
          cid: logo.cid
        }
      ]
    });

    return { provider: 'smtp', id: info.messageId };
  }

  if (resendError) {
    throw resendError;
  }

  throw new Error('No email service configured. Please set RESEND_API_KEY or SMTP credentials in environment.');
}

/**
 * Dispatch Contact Form email
 */
async function sendContactFormEmail({ name, email, subject, service, message }) {
  const siteUrl = process.env.SITE_URL || 'https://hasnaindigitalmarketer.com';
  const html = buildContactEmailHtml({ name, email, subject, service, message, siteUrl });
  const emailSubject = `[Portfolio Enquiry] ${subject} - from ${name}`;

  return await sendEmail({
    to: process.env.CONTACT_EMAIL || 'muhammadhasnayn007@gmail.com',
    replyTo: email,
    subject: emailSubject,
    html
  });
}

/**
 * Dispatch Private AI Lead Notification to Hasnain
 */
async function sendPrivateLeadAlert({ name, email, service, projectType, requirements, timeline, summary, priority, recommendedAction }) {
  const siteUrl = process.env.SITE_URL || 'https://hasnaindigitalmarketer.com';
  const html = buildAiLeadEmailHtml({
    name,
    email,
    service,
    projectType,
    requirements,
    timeline,
    summary,
    priority,
    recommendedAction,
    siteUrl
  });
  const emailSubject = `New Client Lead — Hasnain's Assistant: ${service || 'Project Inquiry'}`;

  return await sendEmail({
    to: process.env.CONTACT_EMAIL || 'muhammadhasnayn007@gmail.com',
    replyTo: email || undefined,
    subject: emailSubject,
    html
  });
}

module.exports = {
  sendEmail,
  sendContactFormEmail,
  sendPrivateLeadAlert,
  buildContactEmailHtml,
  buildAiLeadEmailHtml
};
