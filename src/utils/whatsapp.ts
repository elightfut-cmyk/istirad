export function cleanPhoneNumber(phone?: string | null): string {
  if (!phone) return '';
  
  // Remove spaces, dashes, brackets, dots
  let cleaned = phone.trim().replace(/[\s\-\(\)\.]/g, '');

  // Handle + prefix
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  } else if (cleaned.startsWith('00')) {
    cleaned = cleaned.substring(2);
  } else if (/^0[567]\d{8}$/.test(cleaned)) {
    // Algerian mobile number: 05/06/07 followed by 8 digits (10 digits total)
    cleaned = '213' + cleaned.substring(1);
  } else if (/^0[1-489]\d{7,8}$/.test(cleaned)) {
    // Algerian landline / fixed line
    cleaned = '213' + cleaned.substring(1);
  } else if (/^[567]\d{8}$/.test(cleaned)) {
    // Algerian 9-digit mobile missing the leading 0
    cleaned = '213' + cleaned;
  }

  // Retain only digits
  return cleaned.replace(/\D/g, '');
}

/**
 * Returns a direct WhatsApp chat URL for a phone number.
 * Supports Algerian local numbers (05, 06, 07...), international numbers (+213, +86, etc.).
 * Optional prefilled message text.
 */
export function formatWhatsAppUrl(phone?: string | null, text?: string): string {
  const cleaned = cleanPhoneNumber(phone);
  if (!cleaned) return '';

  const baseUrl = `https://wa.me/${cleaned}`;
  if (text && text.trim()) {
    return `${baseUrl}?text=${encodeURIComponent(text.trim())}`;
  }
  return baseUrl;
}

/**
 * Formats a phone number for clean readability.
 * E.g. Algerian 10-digit number: 0555 12 34 56
 */
export function formatPhoneDisplay(phone?: string | null): string {
  if (!phone) return '';
  const trimmed = phone.trim();
  // If it's a 10-digit Algerian number like 0551234567
  if (/^0[567]\d{8}$/.test(trimmed)) {
    return `${trimmed.slice(0, 4)} ${trimmed.slice(4, 6)} ${trimmed.slice(6, 8)} ${trimmed.slice(8, 10)}`;
  }
  return trimmed;
}
