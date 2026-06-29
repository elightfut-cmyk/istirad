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
        
        // 1. Mark bid as accepted (if it was an advance payment)
        if (metadata.payment_type === 'advance') {
          await supabase.from('supplier_bids').update({ status: 'accepted' }).eq('id', metadata.bid_id)
          const { data: reqData } = await supabase.from('custom_requests').update({ status: 'closed' }).eq('id', metadata.request_id).select('merchant_id').single()
          
          if (reqData && reqData.merchant_id) {
            await supabase.rpc('grant_loyalty_points', { p_user_id: reqData.merchant_id })
          }
        } 
        // 2. Or mark bid as fully paid (if it was a remaining payment)
        else if (metadata.payment_type === 'remaining') {
          await supabase.from('supplier_bids').update({ is_fully_paid: true }).eq('id', metadata.bid_id)
        }
        
        console.log('Successfully processed payment for bid:', metadata.bid_id)
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Webhook error:', error.message)
    return new Response('Webhook error', { status: 500 })
  }
})
