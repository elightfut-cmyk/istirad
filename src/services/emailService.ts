import { supabase } from '../lib/supabase';
import { useSettingsStore } from '../store/useSettingsStore';

interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export interface NewBidEmailParams {
  merchantEmail?: string;
  merchantName?: string;
  merchantId: string;
  supplierName: string;
  tenderTitle: string;
  quantity: number;
  itemPrice: number;
  totalPrice: number;
  advancePercentage: number;
  advanceAmount: number;
  notes?: string;
}

export interface BidUpdatedEmailParams {
  merchantEmail?: string;
  merchantName?: string;
  merchantId: string;
  supplierName: string;
  tenderTitle: string;
  quantity: number;
  itemPrice: number;
  totalPrice: number;
  advancePercentage: number;
  notes?: string;
}

export interface PriceAcceptedEmailParams {
  merchantEmail?: string;
  merchantName?: string;
  merchantId: string;
  supplierName: string;
  tenderTitle: string;
  quantity: number;
  agreedPricePerItem: number;
  agreedTotal: number;
  advancePercentage: number;
}

export interface PriceRejectedEmailParams {
  merchantEmail?: string;
  merchantName?: string;
  merchantId: string;
  supplierName: string;
  tenderTitle: string;
  quantity: number;
  initialPricePerItem?: number;
}

export interface SupplierInterestEmailParams {
  merchantEmail?: string;
  merchantName?: string;
  merchantId: string;
  supplierName: string;
  tenderTitle: string;
  quantity?: number;
}

export interface ShippingUpdateEmailParams {
  merchantEmail?: string;
  merchantName?: string;
  merchantId: string;
  supplierName: string;
  tenderTitle: string;
  statusText: string;
}

export interface PaymentReminderEmailParams {
  merchantEmail?: string;
  merchantName?: string;
  merchantId: string;
  supplierName: string;
  tenderTitle: string;
  typeDesc: string;
}

const formatNumber = (num: number) => {
  try {
    return useSettingsStore.getState().formatCurrency(num);
  } catch {
    return `${Number(num || 0).toLocaleString('ar-DZ')} دج`;
  }
};

/**
 * Sends an email using the internal /api/send-email endpoint (Vercel Serverless Function & Vite dev server)
 */
export async function sendEmail(payload: EmailPayload): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.warn('Failed to send email:', data.error || res.statusText);
      return { success: false, error: data.error || 'Failed to send email' };
    }

    return { success: true, id: data.id };
  } catch (err: any) {
    console.error('Network or server error sending email:', err);
    return { success: false, error: err?.message || 'Network error' };
  }
}

/**
 * Resolves merchant email and name if not already provided
 */
async function resolveMerchantInfo(merchantId: string, email?: string, name?: string): Promise<{ email: string | null; name: string }> {
  if (email && email.includes('@')) {
    return { email, name: name || 'التاجر العزيز' };
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('email, name, company_name')
      .eq('id', merchantId)
      .single();

    if (error || !data) {
      console.warn('Could not find merchant email for id:', merchantId, error);
      return { email: null, name: name || 'التاجر العزيز' };
    }

    return {
      email: data.email || null,
      name: data.company_name || data.name || name || 'التاجر العزيز',
    };
  } catch (e) {
    console.error('Error fetching merchant details:', e);
    return { email: null, name: name || 'التاجر العزيز' };
  }
}

/**
 * Generates modern, branded HTML for transactional emails
 */
function buildEmailTemplate({
  title,
  badgeText,
  badgeColor,
  merchantName,
  introText,
  detailsRows,
  notes,
  ctaText,
  ctaUrl,
  closingText,
}: {
  title: string;
  badgeText: string;
  badgeColor: { bg: string; text: string; border: string };
  merchantName: string;
  introText: string;
  detailsRows: { label: string; value: string; highlight?: boolean }[];
  notes?: string;
  ctaText: string;
  ctaUrl: string;
  closingText?: string;
}): string {
  const rowsHtml = detailsRows
    .map(
      (r) => `
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 14px; font-weight: 500;">
          ${r.label}
        </td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: ${
          r.highlight ? '#4f46e5' : '#0f172a'
        }; font-size: 15px; font-weight: ${r.highlight ? '700' : '600'}; text-align: left;" dir="ltr">
          ${r.value}
        </td>
      </tr>
    `
    )
    .join('');

  const notesHtml = notes
    ? `
      <div style="margin-top: 20px; background-color: #f8fafc; border-right: 4px solid #4f46e5; border-radius: 8px; padding: 14px 18px; text-align: right;">
        <span style="display: block; font-size: 13px; font-weight: 700; color: #475569; margin-bottom: 4px;">ملاحظات المورد:</span>
        <p style="margin: 0; font-size: 14px; color: #334155; line-height: 1.6;">${notes}</p>
      </div>
    `
    : '';

  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, Tahoma, sans-serif; direction: rtl; text-align: right; color: #0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 30px 15px;">
    <tr>
      <td align="center">
        <!-- Container -->
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.03); border: 1px solid #e2e8f0;" cellpadding="0" cellspacing="0">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%); padding: 32px 28px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 900; letter-spacing: -0.5px;">منصة جيبها-jiibha</h1>
              <p style="margin: 6px 0 0; color: #c7d2fe; font-size: 14px; font-weight: 500;">بوابة التجارة والاستيراد المباشر والمناقصات</p>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding: 36px 30px;">

              <!-- Status Badge -->
              <div style="margin-bottom: 20px;">
                <span style="display: inline-block; background-color: ${badgeColor.bg}; color: ${badgeColor.text}; border: 1px solid ${badgeColor.border}; padding: 6px 14px; border-radius: 9999px; font-size: 13px; font-weight: 700;">
                  ${badgeText}
                </span>
              </div>

              <!-- Greeting -->
              <h2 style="margin: 0 0 12px; color: #0f172a; font-size: 20px; font-weight: 800;">
                مرحباً ${merchantName}،
              </h2>

              <p style="margin: 0 0 24px; color: #334155; font-size: 15px; line-height: 1.7;">
                ${introText}
              </p>

              <!-- Details Table Card -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin-bottom: 24px;">
                <tbody>
                  ${rowsHtml}
                </tbody>
              </table>

              ${notesHtml}

              <!-- Call To Action Button -->
              <div style="text-align: center; margin: 34px 0 20px;">
                <a href="${ctaUrl}" target="_blank" style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 14px 36px; border-radius: 12px; font-size: 16px; font-weight: 700; text-decoration: none; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.35);">
                  ${ctaText}
                </a>
              </div>

              ${
                closingText
                  ? `<p style="margin: 20px 0 0; color: #64748b; font-size: 13px; text-align: center; line-height: 1.6;">${closingText}</p>`
                  : ''
              }

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 30px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0 0 8px; font-size: 13px; color: #64748b; font-weight: 600;">
                منصة جيبها للوساطة التجارية والاستيراد - jiibha.com
              </p>
              <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                هذا البريد الإلكتروني أُرسل تلقائياً لإعلامك بتحديثات مناقصتك. إذا كان لديك أي استفسار، تواصل معنا عبر <a href="mailto:contact@jiibha.com" style="color: #4f46e5; text-decoration: none;">contact@jiibha.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * 1. Notify merchant when a supplier submits a new bid
 */
export async function notifyMerchantNewBid(params: NewBidEmailParams) {
  const { email, name } = await resolveMerchantInfo(params.merchantId, params.merchantEmail, params.merchantName);
  if (!email) return;

  const html = buildEmailTemplate({
    title: `عرض سعر جديد على مناقصتك: ${params.tenderTitle}`,
    badgeText: '🏷️ عرض سعر جديد من مورد',
    badgeColor: { bg: '#e0e7ff', text: '#3730a3', border: '#c7d2fe' },
    merchantName: name,
    introText: `تلقيت عرض سعر جديد من المورد <strong>${params.supplierName}</strong> بخصوص مناقصتك (<strong>${params.tenderTitle}</strong>). يمكنك الاطلاع على تفاصيل العرض أدناه والقبول أو التفاوض فوراً.`,
    detailsRows: [
      { label: 'عنوان المناقصة', value: params.tenderTitle },
      { label: 'اسم المورد', value: params.supplierName },
      { label: 'الكمية المطلوبة', value: `${params.quantity} قطعة` },
      { label: 'سعر القطعة الواحدة', value: formatNumber(params.itemPrice), highlight: true },
      { label: 'السعر الإجمالي للعرض', value: formatNumber(params.totalPrice), highlight: true },
      { label: 'نسبة الدفعة المقدمة (عربون)', value: `${params.advancePercentage}% (${formatNumber(params.advanceAmount)})` },
    ],
    notes: params.notes,
    ctaText: 'عرض المناقصة والرد على العرض',
    ctaUrl: 'https://jiibha.com/merchant/orders',
    closingText: 'يرجى مراجعة العرض واتخاذ القرار المناسب لحجز بضاعتك قبل انتهاء صلاحية العرض.',
  });

  return sendEmail({
    to: email,
    subject: `عرض سعر جديد على مناقصتك: ${params.tenderTitle}`,
    html,
  });
}

/**
 * 2. Notify merchant when a supplier updates an existing bid
 */
export async function notifyMerchantBidUpdated(params: BidUpdatedEmailParams) {
  const { email, name } = await resolveMerchantInfo(params.merchantId, params.merchantEmail, params.merchantName);
  if (!email) return;

  const html = buildEmailTemplate({
    title: `تعديل عرض سعر على مناقصتك: ${params.tenderTitle}`,
    badgeText: '✏️ تم تعديل عرض السعر',
    badgeColor: { bg: '#f3e8ff', text: '#6b21a8', border: '#e9d5ff' },
    merchantName: name,
    introText: `قام المورد <strong>${params.supplierName}</strong> بتعديل تفاصيل عرضه على مناقصتك (<strong>${params.tenderTitle}</strong>). فيما يلي تفاصيل العرض المحدث:`,
    detailsRows: [
      { label: 'عنوان المناقصة', value: params.tenderTitle },
      { label: 'اسم المورد', value: params.supplierName },
      { label: 'الكمية المطلوبة', value: `${params.quantity} قطعة` },
      { label: 'سعر القطعة المحدث', value: formatNumber(params.itemPrice), highlight: true },
      { label: 'السعر الإجمالي المحدث', value: formatNumber(params.totalPrice), highlight: true },
      { label: 'نسبة العربون', value: `${params.advancePercentage}%` },
    ],
    notes: params.notes,
    ctaText: 'مراجعة العرض المحدث',
    ctaUrl: 'https://jiibha.com/merchant/orders',
    closingText: 'يمكنك قبول العرض ودفع العربون أو طلب تفاوض جديد من لوحة التحكم.',
  });

  return sendEmail({
    to: email,
    subject: `تعديل عرض سعر على مناقصتك: ${params.tenderTitle}`,
    html,
  });
}

/**
 * 3. Notify merchant when supplier accepts merchant's proposed price
 */
export async function notifyMerchantPriceAccepted(params: PriceAcceptedEmailParams) {
  const { email, name } = await resolveMerchantInfo(params.merchantId, params.merchantEmail, params.merchantName);
  if (!email) return;

  const advanceAmount = (params.agreedTotal * params.advancePercentage) / 100;

  const html = buildEmailTemplate({
    title: `تهانينا! وافق المورد على سعرك المقترح: ${params.tenderTitle}`,
    badgeText: '✅ تمت الموافقة على السعر المقترح',
    badgeColor: { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' },
    merchantName: name,
    introText: `خبر سار! وافق المورد <strong>${params.supplierName}</strong> على السعر الذي اقترحته لمناقصتك (<strong>${params.tenderTitle}</strong>). الصفقة بانتظار دفعك للعربون للبدء الفوري بالتنفيذ.`,
    detailsRows: [
      { label: 'عنوان المناقصة', value: params.tenderTitle },
      { label: 'اسم المورد', value: params.supplierName },
      { label: 'الكمية المطلوبة', value: `${params.quantity} قطعة` },
      { label: 'السعر المتفق عليه (للقطعة)', value: formatNumber(params.agreedPricePerItem), highlight: true },
      { label: 'إجمالي الصفقة', value: formatNumber(params.agreedTotal), highlight: true },
      { label: 'العربون المطلوب دفعه', value: `${params.advancePercentage}% (${formatNumber(advanceAmount)})` },
    ],
    ctaText: 'دفع العربون وتأكيد الصفقة الآن',
    ctaUrl: 'https://jiibha.com/merchant/orders',
    closingText: 'لتأكيد الصفقة مع المورد، يرجى دفع العربون عبر محفظتك أو بوابة الدفع الإلكتروني.',
  });

  return sendEmail({
    to: email,
    subject: `🎉 وافق المورد على السعر المقترح لمناقصتك: ${params.tenderTitle}`,
    html,
  });
}

/**
 * 4. Notify merchant when supplier rejects merchant's proposed price
 */
export async function notifyMerchantPriceRejected(params: PriceRejectedEmailParams) {
  const { email, name } = await resolveMerchantInfo(params.merchantId, params.merchantEmail, params.merchantName);
  if (!email) return;

  const html = buildEmailTemplate({
    title: `رد المورد بخصوص السعر المقترح لمناقصتك: ${params.tenderTitle}`,
    badgeText: '⚠️ لم يتم قبول السعر المقترح',
    badgeColor: { bg: '#fee2e2', text: '#b91c1c', border: '#fecaca' },
    merchantName: name,
    introText: `نود إعلامك بأن المورد <strong>${params.supplierName}</strong> لم يتمكن من قبول السعر المقترح لمناقصتك (<strong>${params.tenderTitle}</strong>).`,
    detailsRows: [
      { label: 'عنوان المناقصة', value: params.tenderTitle },
      { label: 'اسم المورد', value: params.supplierName },
      { label: 'الكمية', value: `${params.quantity} قطعة` },
      { label: 'حالة العرض', value: 'عاد العرض إلى سعره الأصلي الأول' },
    ],
    ctaText: 'مراجعة خيارات العرض المتاحة',
    ctaUrl: 'https://jiibha.com/merchant/orders',
    closingText: 'ما زال بإمكانك قبول العرض الأصلي للمورد أو انتظار عروض من موردين آخرين.',
  });

  return sendEmail({
    to: email,
    subject: `رد المورد بخصوص السعر المقترح لمناقصتك: ${params.tenderTitle}`,
    html,
  });
}

/**
 * 5. Notify merchant when a supplier shows interest and starts searching for their product
 */
export async function notifyMerchantSupplierInterest(params: SupplierInterestEmailParams) {
  const { email, name } = await resolveMerchantInfo(params.merchantId, params.merchantEmail, params.merchantName);
  if (!email) return;

  const html = buildEmailTemplate({
    title: `مورد مهتم بمناقصتك وجاري البحث: ${params.tenderTitle}`,
    badgeText: '🔍 مورد يبحث عن منتجك حالياً',
    badgeColor: { bg: '#ffedd5', text: '#c2410c', border: '#fed7aa' },
    merchantName: name,
    introText: `قام المورد <strong>${params.supplierName}</strong> بإعلامنا بأنه مهتم بمناقصتك (<strong>${params.tenderTitle}</strong>) ويبحث حالياً في الصين عن أفضل مصنع وأفضل سعر لك.`,
    detailsRows: [
      { label: 'عنوان المناقصة', value: params.tenderTitle },
      { label: 'اسم المورد المهتم', value: params.supplierName },
      { label: 'الحالة', value: 'جاري البحث والتفاوض مع المصانع' },
    ],
    ctaText: 'متابعة المناقصة في لوحة التحكم',
    ctaUrl: 'https://jiibha.com/merchant/orders',
    closingText: 'ستتلقى إشعاراً وإيميل فور قيام المورد بإدراج عرضه الرسمي.',
  });

  return sendEmail({
    to: email,
    subject: `🔍 مورد مهتم بمناقصتك: ${params.tenderTitle}`,
    html,
  });
}

/**
 * 6. Notify merchant when supplier updates shipping status
 */
export async function notifyMerchantShippingUpdate(params: ShippingUpdateEmailParams) {
  const { email, name } = await resolveMerchantInfo(params.merchantId, params.merchantEmail, params.merchantName);
  if (!email) return;

  const html = buildEmailTemplate({
    title: `تحديث حالة الشحن لطلبك: ${params.tenderTitle}`,
    badgeText: '🚚 تحديث حالة الشحن',
    badgeColor: { bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd' },
    merchantName: name,
    introText: `قام المورد <strong>${params.supplierName}</strong> بتحديث حالة الشحن الخاصة بطلبك (<strong>${params.tenderTitle}</strong>).`,
    detailsRows: [
      { label: 'عنوان الطلب', value: params.tenderTitle },
      { label: 'اسم المورد', value: params.supplierName },
      { label: 'حالة الشحن الحالية', value: params.statusText, highlight: true },
    ],
    ctaText: 'متابعة مسار الشحن',
    ctaUrl: 'https://jiibha.com/merchant/orders',
    closingText: 'يمكنك دائماً متابعة تفاصيل الطلب والشحن مباشرة من حسابك في المنصة.',
  });

  return sendEmail({
    to: email,
    subject: `🚚 تحديث حالة الشحن: ${params.tenderTitle} (${params.statusText})`,
    html,
  });
}

/**
 * 7. Notify merchant when payment reminder is sent by supplier
 */
export async function notifyMerchantPaymentReminder(params: PaymentReminderEmailParams) {
  const { email, name } = await resolveMerchantInfo(params.merchantId, params.merchantEmail, params.merchantName);
  if (!email) return;

  const html = buildEmailTemplate({
    title: `تذكير بالدفع للطلب: ${params.tenderTitle}`,
    badgeText: '⏰ تذكير بالدفع',
    badgeColor: { bg: '#fef3c7', text: '#b45309', border: '#fde68a' },
    merchantName: name,
    introText: `يود المورد <strong>${params.supplierName}</strong> تذكيرك بـ <strong>${params.typeDesc}</strong> للطلب (<strong>${params.tenderTitle}</strong>) لمواصلة إجراءات الشحن والتسليم دون تأخير.`,
    detailsRows: [
      { label: 'عنوان الطلب', value: params.tenderTitle },
      { label: 'اسم المورد', value: params.supplierName },
      { label: 'الإجراء المطلوب', value: params.typeDesc, highlight: true },
    ],
    ctaText: 'دفع المبلغ وإكمال الطلب',
    ctaUrl: 'https://jiibha.com/merchant/orders',
    closingText: 'الدفع السريع يضمن سرعة تسليم شحنتك وتجنب أي تأخير.',
  });

  return sendEmail({
    to: email,
    subject: `⏰ تذكير بالدفع لطلبك: ${params.tenderTitle}`,
    html,
  });
}
