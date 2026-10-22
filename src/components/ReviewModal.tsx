import { useState } from 'react';
import { Star, X, Send, Loader2, Sparkles, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { supplierReviewService } from '../services/supplierReviewService';

export interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  supplierId: string;
  merchantId: string;
  supplierName?: string;
  orderTitle?: string;
  onSuccess?: () => void;
}

const RATING_LABELS: Record<number, { text: string; color: string }> = {
  1: { text: 'تجربة سيئة 😞', color: 'text-red-500' },
  2: { text: 'دون المستوى المطلوب 😕', color: 'text-orange-500' },
  3: { text: 'تجربة مقبولة ومتوسطة 😐', color: 'text-yellow-600' },
  4: { text: 'تجربة جيدة جداً وموثوقة 👍', color: 'text-lime-600' },
  5: { text: 'ممتازة وخدمة استثنائية! 🌟', color: 'text-amber-500 font-extrabold' },
};

export default function ReviewModal({
  isOpen,
  onClose,
  orderId,
  supplierId,
  merchantId,
  supplierName = 'المورد',
  orderTitle,
  onSuccess,
}: ReviewModalProps) {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const currentDisplayRating = hoverRating || rating;
  const ratingInfo = RATING_LABELS[currentDisplayRating] || RATING_LABELS[5];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating || rating < 1 || rating > 5) {
      toast.error('يرجى اختيار عدد النجوم لتقييم المورد (من 1 إلى 5).');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await supplierReviewService.submitReview({
        orderId,
        supplierId,
        merchantId,
        rating,
        comment,
      });

      if (result.success) {
        toast.success('تم إرسال تقييمك بنجاح! شكراً لمساهمتك في زيادة الموثوقية 🌟');
        onSuccess?.();
        onClose();
      } else {
        toast.error(result.error || 'فشل إرسال التقييم، يرجى المحاولة لاحقاً');
      }
    } catch (err: any) {
      console.error('Error submitting review:', err);
      toast.error(err.message || 'حدث خطأ أثناء إرسال التقييم');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn font-['Tajawal'] select-none">
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden transform transition-all">
        {/* Header Ribbon / Glow */}
        <div className="h-2 bg-gradient-to-r from-amber-400 via-[#4f46e5] to-emerald-400"></div>

        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-5 left-5 p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 bg-gray-100 dark:bg-gray-800 rounded-full transition-colors disabled:opacity-50"
          aria-label="إغلاق"
        >
          <X size={20} />
        </button>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8">
          {/* Badge & Title */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700/50 mb-3 shadow-xs">
              <Sparkles size={14} className="text-amber-500 animate-spin" style={{ animationDuration: '3s' }} />
              <span>تقييم مشتري مؤكد (Verified Purchase)</span>
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white mb-2 leading-tight">
              كيف كانت تجربتك مع هذا المورد؟
            </h3>

            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
              أنت تقيّم المعاملة المكتملة مع المورد{' '}
              <strong className="text-gray-800 dark:text-gray-200">{supplierName}</strong>
              {orderTitle && (
                <span className="block mt-1 text-xs text-[#4f46e5] font-semibold truncate">
                  ({orderTitle})
                </span>
              )}
            </p>
          </div>

          {/* Interactive Star Rating */}
          <div className="bg-gray-50 dark:bg-gray-800/60 rounded-2xl p-5 mb-6 border border-gray-100 dark:border-gray-800 text-center">
            <div className="flex items-center justify-center gap-2 sm:gap-3 mb-3 direction-ltr" dir="ltr">
              {[1, 2, 3, 4, 5].map((starValue) => {
                const isSelected = starValue <= (hoverRating || rating);
                return (
                  <button
                    key={starValue}
                    type="button"
                    onClick={() => setRating(starValue)}
                    onMouseEnter={() => setHoverRating(starValue)}
                    onMouseLeave={() => setHoverRating(null)}
                    className="p-1 sm:p-1.5 rounded-xl transition-all duration-150 focus:outline-none hover:scale-125 active:scale-95 cursor-pointer"
                    aria-label={`${starValue} نجوم`}
                  >
                    <Star
                      size={36}
                      className={`transition-colors duration-200 ${
                        isSelected
                          ? 'text-amber-400 fill-amber-400 drop-shadow-[0_2px_8px_rgba(251,191,36,0.5)]'
                          : 'text-gray-300 dark:text-gray-600 hover:text-amber-200'
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            {/* Dynamic Emotion Label */}
            <p className={`text-sm font-bold transition-all duration-200 ${ratingInfo.color}`}>
              {ratingInfo.text}
            </p>
          </div>

          {/* Comment Textarea */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <MessageSquare size={16} className="text-[#4f46e5]" />
                ملاحظاتك وتعليقك على الخدمة
              </span>
              <span className="text-xs font-normal text-gray-400">اختياري</span>
            </label>
            <textarea
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="شاركنا تفاصيل تجربتك من حيث جودة البضاعة، دقة المواعيد، وسرعة التوصيل لمساعدة باقي التجار..."
              maxLength={600}
              className="w-full p-4 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent focus:bg-white dark:focus:bg-gray-900 transition-all text-gray-900 dark:text-gray-100 placeholder-gray-400"
            />
            <div className="flex justify-between items-center text-[11px] text-gray-400 mt-1.5 px-1">
              <span>تقييمك محمي وخاضع لمعايير الشفافية</span>
              <span>{comment.length} / 600</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 bg-[#4f46e5] hover:bg-[#4338ca] text-white py-3.5 px-6 rounded-2xl font-bold text-sm shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all active:scale-98 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>جاري إرسال التقييم...</span>
                </>
              ) : (
                <>
                  <Send size={18} className="rtl:rotate-180" />
                  <span>إرسال التقييم</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="py-3.5 px-5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-2xl font-bold text-sm transition-colors cursor-pointer"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
