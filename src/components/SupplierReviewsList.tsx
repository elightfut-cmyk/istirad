import { Star, ShieldCheck, Calendar } from 'lucide-react';
import { SupplierReview } from '../services/supplierReviewService';

export interface SupplierReviewsListProps {
  reviews: SupplierReview[];
  isLoading?: boolean;
  supplierName?: string;
}

export default function SupplierReviewsList({
  reviews,
  isLoading = false,
}: SupplierReviewsListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 animate-pulse space-y-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
              <div className="space-y-1.5 flex-1">
                <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
            </div>
            <div className="h-3 w-3/4 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 p-8 sm:p-12 rounded-3xl border border-gray-100 dark:border-gray-700 text-center">
        <div className="w-16 h-16 bg-amber-50 dark:bg-amber-950/40 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-200 dark:border-amber-700/50">
          <Star size={32} />
        </div>
        <h4 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">
          لا توجد تقييمات مسجلة بعد
        </h4>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
          يتم إضافة التقييمات حصرياً من قِبل التجار بعد استلام بضائعهم وتأكيد تسليم الطلبية لضمان النزاهة والموثوقية التامة.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((rev) => {
        const merchantName = rev.merchant?.company_name || rev.merchant?.name || 'تاجر معتمد';
        const dateFormatted = new Date(rev.created_at).toLocaleDateString('ar-DZ', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });

        return (
          <div
            key={rev.id}
            className="bg-white dark:bg-gray-800 p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-100 dark:border-gray-700/80 shadow-xs hover:shadow-md transition-shadow duration-200"
          >
            {/* Header: Merchant info + Verified Badge + Date */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                {/* Avatar Icon */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#4f46e5] to-indigo-700 text-white flex items-center justify-center font-bold text-sm shadow-xs flex-shrink-0">
                  {merchantName.charAt(0).toUpperCase()}
                </div>

                <div>
                  <div className="flex items-center flex-wrap gap-2">
                    <h5 className="font-bold text-gray-900 dark:text-white text-sm sm:text-base">
                      {merchantName}
                    </h5>

                    {/* Verified Purchase Badge */}
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/50">
                      <ShieldCheck size={13} className="text-emerald-600 dark:text-emerald-400" />
                      <span>مشتري مؤكد (Verified Purchase)</span>
                    </span>
                  </div>

                  {/* Relative / absolute date */}
                  <span className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                    <Calendar size={12} />
                    {dateFormatted}
                  </span>
                </div>
              </div>

              {/* Stars */}
              <div className="flex items-center gap-1 bg-amber-50/80 dark:bg-amber-950/30 px-3 py-1.5 rounded-xl border border-amber-200/60 dark:border-amber-700/40 self-start sm:self-center" dir="ltr">
                {[1, 2, 3, 4, 5].map((starIdx) => (
                  <Star
                    key={starIdx}
                    size={16}
                    className={
                      starIdx <= rev.rating
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-gray-200 dark:text-gray-700'
                    }
                  />
                ))}
                <span className="font-bold text-amber-700 dark:text-amber-300 text-xs ml-1">
                  {rev.rating}.0
                </span>
              </div>
            </div>

            {/* Review Comment Text */}
            {rev.comment ? (
              <div className="bg-gray-50/80 dark:bg-gray-900/60 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 text-gray-700 dark:text-gray-200 text-sm leading-relaxed">
                <p className="whitespace-pre-line">{rev.comment}</p>
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">
                (قام المشتري بتقييم المورد بـ {rev.rating} نجوم بدون إضافة تعليق نصي)
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
