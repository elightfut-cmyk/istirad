import { useSettingsStore } from '../store/useSettingsStore';

export async function createChargilyCheckout(amountInDZD: number, successUrl: string, failureUrl: string, metadata: any, customerData?: { name: string; email: string; phone?: string }) {
  const { chargilyLiveKey } = useSettingsStore.getState();
  
  const isLive = !!chargilyLiveKey && chargilyLiveKey.trim().length > 0;
  
  const secretKey = isLive 
    ? chargilyLiveKey 
    : import.meta.env.VITE_CHARGILY_SECRET_KEY;
    
  const baseUrl = isLive 
    ? 'https://pay.chargily.net/api/v2' 
    : 'https://pay.chargily.net/test/api/v2';
  
  if (!secretKey) {
    throw new Error('Chargily Secret Key is missing');
  }

  const webhookUrl = import.meta.env.VITE_CHARGILY_WEBHOOK_URL; // Supabase Edge Function URL

  let customer_id = undefined;

  if (customerData) {
    try {
      const payload: any = {
        name: customerData.name || 'Unknown',
        email: customerData.email,
      };
      if (customerData.phone && customerData.phone.trim() !== '') {
        payload.phone = customerData.phone;
      }

      const custRes = await fetch(`${baseUrl}/customers`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });
      if (custRes.ok) {
        const custData = await custRes.json();
        customer_id = custData.id;
      }
    } catch (e) {
      console.warn('Failed to create Chargily customer', e);
    }
  }

  const response = await fetch(`${baseUrl}/checkouts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: amountInDZD,
      currency: 'dzd',
      success_url: successUrl,
      failure_url: failureUrl,
      webhook_endpoint: webhookUrl || undefined,
      metadata: metadata,
      customer_id: customer_id,
    })
  });

  if (!response.ok) {
    const err = await response.text();
    console.error('Chargily API Error:', err);
    throw new Error('فشل في إنشاء رابط الدفع عبر Chargily');
  }

  const data = await response.json();
  return data.checkout_url;
}
