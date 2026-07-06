import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const CHARGILY_SECRET_KEY = Deno.env.get('CHARGILY_SECRET_KEY') || ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function verifySignature(signature: string, payload: string, secret: string) {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  )

  const signatureBytes = new Uint8Array(signature.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || [])

  const isValid = await crypto.subtle.verify(
    'HMAC',
    key,
    signatureBytes,
    encoder.encode(payload)
  )

  return isValid
}

async function notify(userId: string, title: string, message: string, type: string) {
  try {
    if (userId === 'all_admins') {
      const { data: admins } = await supabase.from('users').select('id').eq('role', 'admin');
      if (admins && admins.length > 0) {
        await supabase.from('notifications').insert(admins.map(a => ({ user_id: a.id, title, message, type })));
      }
    } else if (userId) {
      await supabase.from('notifications').insert({ user_id: userId, title, message, type });
    }
  } catch (err) {
    console.error('Notify error:', err);
  }
}

serve(async (req) => {
  try {
    const signature = req.headers.get('signature')
    
    if (!signature) {
      return new Response('Missing signature', { status: 400 })
    }

    const payloadText = await req.text()
    
    const isValid = await verifySignature(signature, payloadText, CHARGILY_SECRET_KEY)
    if (!isValid) {
      console.error('Invalid signature')
      return new Response('Invalid signature', { status: 403 })
    }

    const event = JSON.parse(payloadText)
    console.log('Received event:', event.type)

    if (event.type === 'checkout.paid') {
      const checkout = event.data
      const metadata = checkout.metadata

      if (metadata && metadata.bid_id && metadata.request_id) {
        
        // Fetch bid and merchant info for notifications and commissions
        const { data: bidData } = await supabase.from('supplier_bids').select('supplier_id, price, cost_price').eq('id', metadata.bid_id).single();
        const { data: reqData } = await supabase.from('custom_requests').select('merchant_id, quantity').eq('id', metadata.request_id).single();
        
        let merchantName = 'التاجر';
        let merchantData = null;
        if (reqData && reqData.merchant_id) {
          const { data: user } = await supabase.from('users').select('*').eq('id', reqData.merchant_id).single();
          if (user) {
            merchantName = user.name || user.company_name || 'التاجر';
            merchantData = user;
          }
        }
        
        const supplierId = bidData?.supplier_id;
        const merchantId = reqData?.merchant_id;

        // 1. Mark bid as accepted (if it was an advance payment)
        if (metadata.payment_type === 'advance') {
          await supabase.from('supplier_bids').update({ status: 'accepted' }).eq('id', metadata.bid_id)
          
          const requestUpdate: any = { status: 'closed' }
          if (metadata.coupon_id) {
            requestUpdate.coupon_id = metadata.coupon_id
            await supabase.rpc('increment_coupon_usage', { p_coupon_id: metadata.coupon_id })
          }

          await supabase.from('custom_requests').update(requestUpdate).eq('id', metadata.request_id)
          
          if (merchantId) {
            await supabase.rpc('grant_loyalty_points', { p_user_id: merchantId })
          }
          
          await notify(supplierId, 'نجاح الدفع', `قام ${merchantName} بدفع العربون لطلبك عبر بوابة الدفع.`, 'success');
          await notify(merchantId, 'نجاح الدفع', `تمت عملية دفع العربون للمورد بنجاح عبر بوابة الدفع.`, 'success');
          await notify('all_admins', 'عملية دفع جديدة', `قام التاجر ${merchantName} بدفع العربون لطلب عبر بوابة الدفع`, 'info');
        } 
        // 2. Or mark bid as fully paid (if it was a remaining payment)
        else if (metadata.payment_type === 'remaining') {
          await supabase.from('supplier_bids').update({ is_fully_paid: true }).eq('id', metadata.bid_id)
          
          await notify(supplierId, 'نجاح الدفع', `قام ${merchantName} بدفع المبلغ المتبقي لطلبك عبر بوابة الدفع.`, 'success');
          await notify(merchantId, 'نجاح الدفع', `تمت عملية دفع المبلغ المتبقي للمورد بنجاح عبر بوابة الدفع.`, 'success');
          await notify('all_admins', 'عملية دفع جديدة', `قام التاجر ${merchantName} بدفع المبلغ المتبقي لطلب عبر بوابة الدفع`, 'info');
        }
        
        // Referral Commission Logic
        if (merchantData && merchantData.referred_by && !merchantData.has_made_first_order) {
           const commission = 2000;
           
           if (commission > 0) {
             const { error: commError } = await supabase.rpc('grant_referral_commission', {
               p_referrer_id: merchantData.referred_by,
               p_referred_id: merchantId,
               p_commission_amount: commission,
               p_description: `عمولة إحالة لطلب جديد بقيمة ${commission}`
             });
             if (!commError) {
                await notify(merchantData.referred_by, 'عمولة إحالة جديدة', `تهانينا! حصلت على عمولة إحالة بقيمة ${commission} لإتمام التاجر المدعو أول طلب له.`, 'success');
                await supabase.from('users').update({ has_made_first_order: true }).eq('id', merchantId);
             }
           }
        }
        
        console.log('Successfully processed payment for bid:', metadata.bid_id)
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    console.error('Webhook error:', error.message)
    return new Response('Webhook error', { status: 500 })
  }
})
