const { sendContactFormEmail } = require('./mailer');
const {
  getSupabaseAdmin,
  createProjectInquiry,
  uploadInquiryAttachment,
  createNotificationDelivery,
  claimNotificationDelivery,
  updateNotificationDelivery
} = require('./supabase-server');

async function processContactSubmission({ inquiryData, emailData, attachment }) {
  const inquiry = await createProjectInquiry(inquiryData);

  if (inquiry.isNew && attachment?.data && typeof attachment.data === 'string' && attachment.data.length <= 4_000_000) {
    const match = attachment.data.match(/^data:(application\/pdf|image\/(?:png|jpeg|webp));base64,(.+)$/);
    if (match) {
      await uploadInquiryAttachment({
        inquiryId: inquiry.id,
        fileName: String(attachment.name || 'project-attachment').slice(0, 120),
        contentType: match[1],
        buffer: Buffer.from(match[2], 'base64')
      });
    }
  }

  const delivery = await createNotificationDelivery(inquiry.id);
  if (delivery.status === 'delivered' && delivery.provider_id) {
    return { inquiry, delivery, alreadyDelivered: true };
  }

  const claim = await claimNotificationDelivery(delivery.id);
  if (!claim) return { inquiry, delivery, alreadyProcessing: true };

  try {
    const providerDelivery = await sendContactFormEmail({ ...emailData, referenceId: inquiry.reference_id });
    const completed = await updateNotificationDelivery(delivery.id, {
      status: 'delivered',
      provider_id: providerDelivery.id || null,
      delivered_at: new Date().toISOString()
    });
    return { inquiry, delivery: completed };
  } catch (error) {
    await updateNotificationDelivery(delivery.id, {
      status: 'failed',
      last_error: String(error.message || 'Notification delivery failed').slice(0, 500)
    });
    return { inquiry, delivery: { ...delivery, status: 'failed' }, deliveryError: error };
  }
}

async function retryInquiryNotification(inquiryId) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from('project_inquiries').select('*').eq('id', inquiryId).single();
  if (error) throw error;
  return processContactSubmission({
    inquiryData: data,
    emailData: {
      name: data.full_name,
      email: data.email,
      subject: data.project_title,
      service: data.project_type,
      message: data.description,
      budget: data.budget,
      timeline: data.timeline,
      websiteUrl: data.current_website_url,
      contactMethod: data.preferred_contact_method === 'whatsapp' ? 'WhatsApp' : 'Email',
      whatsapp: data.phone
    }
  });
}

module.exports = { processContactSubmission, retryInquiryNotification };
