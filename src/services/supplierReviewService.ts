import { supabase } from '../lib/supabase';
import { sendNotification } from '../store/useNotificationStore';

export type SupplierTier = 'NEW' | 'SILVER' | 'GOLD' | 'PLATINUM';

export interface SupplierReview {
  id: string;
  supplier_id: string;
  merchant_id: string;
  order_id: string;
  rating: number;
  comment?: string | null;
  created_at: string;
  merchant?: {
    name?: string;
    company_name?: string;
  };
  order?: {
    id?: string;
    custom_requests?: {
      title?: string;
    };
  };
}

export interface SupplierStats {
  average_rating: number;
  total_reviews: number;
  supplier_tier: SupplierTier;
  rating_distribution?: Record<number, number>;
}

export const supplierReviewService = {
  /**
   * Submit a review for a completed order
   */
  async submitReview({
    orderId,
    supplierId,
    merchantId,
    rating,
    comment,
  }: {
    orderId: string;
    supplierId: string;
    merchantId: string;
    rating: number;
    comment?: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. Try RPC function first (high security & atomic)
      const { data: rpcData, error: rpcError } = await supabase.rpc('submit_supplier_review', {
        p_order_id: orderId,
        p_rating: rating,
        p_comment: comment?.trim() || null,
      });

      if (!rpcError && rpcData?.success) {
        // Send in-app notification to the supplier
        try {
          await sendNotification(
            supplierId,
            'تقييم جديد ⭐',
            `حصلت على تقييم جديد (${rating}/5 نجوم) لطلبك المكتمل.`,
            'info'
          );
        } catch (notifErr) {
          console.warn('Could not send notification to supplier:', notifErr);
        }

        return { success: true };
      }

      // 2. Direct insert fallback if RPC not yet created in Supabase
      const { error: insertError } = await supabase.from('supplier_reviews').insert({
        order_id: orderId,
        supplier_id: supplierId,
        merchant_id: merchantId,
        rating,
        comment: comment?.trim() || null,
      });

      if (insertError) {
        if (insertError.code === '23505') {
          return { success: false, error: 'لقد قمت بتقييم هذه الطلبية مسبقاً.' };
        }
        return { success: false, error: insertError.message || 'فشل إرسال التقييم' };
      }

      // Notify supplier
      try {
        await sendNotification(
          supplierId,
          'تقييم جديد ⭐',
          `حصلت على تقييم جديد (${rating}/5 نجوم) لطلبك المكتمل.`,
          'info'
        );
      } catch {}

      return { success: true };
    } catch (err: any) {
      console.error('Error submitting supplier review:', err);
      return { success: false, error: err.message || 'حدث خطأ غير متوقع أثناء إرسال التقييم' };
    }
  },

  /**
   * Fetch reviews for a specific supplier
   */
  async getSupplierReviews(supplierId: string): Promise<SupplierReview[]> {
    try {
      const { data, error } = await supabase
        .from('supplier_reviews')
        .select(`
          id,
          supplier_id,
          merchant_id,
          order_id,
          rating,
          comment,
          created_at,
          merchant:users!merchant_id (
            name,
            company_name
          )
        `)
        .eq('supplier_id', supplierId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data as SupplierReview[]) || [];
    } catch (err) {
      console.error('Error fetching supplier reviews:', err);
      return [];
    }
  },

  /**
   * Fetch a merchant's review for a specific order
   */
  async getOrderReview(merchantId: string, orderId: string): Promise<SupplierReview | null> {
    try {
      const { data, error } = await supabase
        .from('supplier_reviews')
        .select('*')
        .eq('merchant_id', merchantId)
        .eq('order_id', orderId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return (data as SupplierReview) || null;
    } catch (err) {
      console.error('Error checking order review:', err);
      return null;
    }
  },

  /**
   * Mark an order as delivered by the supplier ("تم تسليم السلعة")
   */
  async markOrderDelivered(orderId: string, merchantId?: string, supplierName?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const now = new Date().toISOString();
      const updateData: any = {
        shipping_status: 'delivered',
        is_fully_paid: true,
        order_status: 'COMPLETED',
        delivered_at: now,
      };

      const { error } = await supabase
        .from('supplier_bids')
        .update(updateData)
        .eq('id', orderId);

      if (error) throw error;

      if (merchantId) {
        sendNotification(
          merchantId,
          'تم تسليم السلعة! 🎉',
          `قام المورد ${supplierName || ''} بتأكيد تسليم السلعة واكتمال طلبك. يُرجى تقييم تجربتك مع المورد.`,
          'success'
        );
      }

      return { success: true };
    } catch (err: any) {
      console.error('Error marking order delivered:', err);
      return { success: false, error: err.message || 'حدث خطأ أثناء تأكيد تسليم السلعة' };
    }
  },
};
