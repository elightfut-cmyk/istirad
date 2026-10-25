import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Building2, MapPin, ShieldCheck, Star, Award, 
  CheckCircle2, ArrowRight, Store, Clock, ExternalLink,
  LayoutDashboard, ShoppingBag, CreditCard, DollarSign, Users, Package
} from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import SupplierBadge, { SupplierTier } from '../../components/SupplierBadge';
import SupplierReviewsList from '../../components/SupplierReviewsList';
import { supplierReviewService, SupplierReview } from '../../services/supplierReviewService';
import { getSupplierRatingInfo } from '../../utils/supplierUtils';

export default function SupplierPublicProfile() {
  const { supplierId } = useParams<{ supplierId?: string }>();
  const { user } = useAuthStore();
  const { formatCurrency } = useSettingsStore();
  const navigate = useNavigate();

  const targetSupplierId = supplierId || user?.id;

  const [supplier, setSupplier] = useState<any>(null);
  const [reviews, setReviews] = useState<SupplierReview[]>([]);
  const [completedOrdersCount, setCompletedOrdersCount] = useState<number>(0);
  const [supplierProducts, setSupplierProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (targetSupplierId) {
      loadProfileData(targetSupplierId);
    }
  }, [targetSupplierId]);

  const loadProfileData = async (id: string) => {
    setLoading(true);
    try {
      // 1. Fetch supplier profile from users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select(`
          id,
          name,
          company_name,
          email,
          phone,
          address,
          created_at,
          verification_badge
        `)
        .eq('id', id)
        .single();

      if (userError) throw userError;
      setSupplier(userData);

      // 2. Fetch completed orders count
      const { count: ordersCount } = await supabase
        .from('supplier_bids')
        .select('id', { count: 'exact', head: true })
        .eq('supplier_id', id)
        .or('shipping_status.eq.delivered,status.eq.accepted');

      setCompletedOrdersCount(ordersCount || 0);

      // 3. Fetch reviews
      const reviewsData = await supplierReviewService.getSupplierReviews(id);
      setReviews(reviewsData);

      // 4. Fetch supplier's listed products in marketplace
      const { data: prods } = await supabase
        .from('products')
        .select('*')
        .eq('supplier_id', id)
        .limit(6);

      setSupplierProducts(prods || []);
    } catch (err) {
      console.error('Error loading supplier profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalReviews = reviews.length;
  const avgRating = reviews.length > 0
    ? Number((reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / reviews.length).toFixed(1))
    : 0;
  const ratingInfo = getSupplierRatingInfo(supplier?.verification_badge, avgRating, totalReviews);
  const tier = ratingInfo.tier as SupplierTier;

  // Rating breakdown
  const ratingCounts = [5, 4, 3, 2, 1].map((stars) => {
    const count = reviews.filter((r) => r.rating === stars).length;
    const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
    return { stars, count, percentage };
  });

  const tierDescriptions: Record<string, { title: string; desc: string; nextCriteria?: string }> = {
    PLATINUM: {
      title: 'تصنيف بلاتيني (Platinum Supplier)',
      desc: 'أعلى رتبة موثوقية في المنصة. مورد معتمد نفذ أكثر من 50 طلبية بنجاح وحافظ على تقييم أعلى من 4.8.',
    },
    GOLD: {
      title: 'تصنيف ذهبي (Gold Supplier)',
      desc: 'مورد ذهبي متميز نفذ أكثر من 20 طلبية ناجحة وحاصل على تقييم ممتاز أعلى من 4.5.',
      nextCriteria: 'للوصول إلى البلاتيني: إتمام 50 طلبية مع تقييم أعلى من 4.8.',
    },
    SILVER: {
      title: 'تصنيف فضي (Silver Supplier)',
      desc: 'مورد فضي معتمد أثبت جدارته بتنفيذ أكثر من 5 طلبيات بتقييم أعلى من 4.0.',
      nextCriteria: 'للوصول إلى الذهبي: إتمام 20 طلبية مع تقييم أعلى من 4.5.',
    },
    NEW: {
      title: 'مورد جديد (New Supplier)',
      desc: 'مورد مسجل حديثاً في المنصة يخضع لمعايير الجودة والمتابعة المستمرة.',
      nextCriteria: 'للوصول إلى الفضي: إتمام 5 طلبيات مع تقييم أعلى من 4.0.',
    },
  };

  const currentTierInfo = tierDescriptions[tier] || tierDescriptions.NEW;

  const merchantLinks = [
    { label: 'الرئيسية', href: '/merchant', icon: <LayoutDashboard size={20} /> },
    { label: 'تصفح المنتجات', href: '/merchant/marketplace', icon: <Store size={20} /> },
    { label: 'طلباتي', href: '/merchant/orders', icon: <ShoppingBag size={20} /> },
    { label: 'المحفظة', href: '/merchant/wallet', icon: <CreditCard size={20} /> },
  ];

  const supplierLinks = [
    { label: 'الرئيسية', href: '/supplier', icon: <LayoutDashboard size={20} /> },
    { label: 'منتجاتي', href: '/supplier/products', icon: <Package size={20} /> },
    { label: 'الطلبات الواردة', href: '/supplier/orders', icon: <ShoppingBag size={20} /> },
    { label: 'المالية', href: '/supplier/financials', icon: <DollarSign size={20} /> },
  ];

  const adminLinks = [
    { label: 'الرئيسية', href: '/admin', icon: <LayoutDashboard size={20} /> },
    { label: 'المستخدمين', href: '/admin/users', icon: <Users size={20} /> },
    { label: 'الطلبات', href: '/admin/orders', icon: <ShoppingBag size={20} /> },
  ];

  const activeSidebarLinks = user?.role === 'supplier' 
    ? supplierLinks 
    : user?.role === 'admin' 
    ? adminLinks 
    : merchantLinks;

  return (
    <DashboardLayout title="بروفايل المورد وتقييمات الثقة" sidebarLinks={activeSidebarLinks}>
      <div className="max-w-6xl mx-auto space-y-6 font-['Tajawal'] pb-12">
        {/* Back Navigation */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition cursor-pointer"
        >
          <ArrowRight size={18} />
          <span>الرجوع</span>
        </button>

        {loading ? (
          <div className="bg-white dark:bg-gray-800 p-12 rounded-3xl text-center text-gray-400">
            جاري تحميل بروفايل المورد...
          </div>
        ) : !supplier ? (
          <div className="bg-white dark:bg-gray-800 p-12 rounded-3xl text-center">
            <Building2 size={48} className="mx-auto text-gray-300 mb-3" />
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">
              المورد غير موجود أو لم يتم العثور على بياناته
            </h3>
          </div>
        ) : (
          <>
            {/* Header Hero Card */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 dark:border-gray-700/80 relative overflow-hidden">
              <div className="absolute top-0 right-0 left-0 h-2 bg-gradient-to-r from-amber-400 via-[#4f46e5] to-cyan-400" />

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-start sm:items-center gap-4 sm:gap-6">
                  {/* Avatar Emblem */}
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-indigo-900 via-[#4f46e5] to-purple-600 text-white flex items-center justify-center font-black text-2xl sm:text-3xl shadow-lg shadow-indigo-500/20 flex-shrink-0">
                    {(supplier.company_name || supplier.name || 'م').charAt(0).toUpperCase()}
                  </div>

                  <div>
                    <div className="flex items-center flex-wrap gap-3 mb-1">
                      <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
                        {supplier.company_name || supplier.name}
                      </h2>
                      {supplier.verification_badge && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          <ShieldCheck size={14} className="text-blue-600" />
                          <span>موثق رسمياً</span>
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-2">
                      {supplier.address && (
                        <span className="flex items-center gap-1.5">
                          <MapPin size={15} className="text-gray-400" />
                          {supplier.address}
                        </span>
                      )}
                      <span className="flex items-center gap-1.5">
                        <Clock size={15} className="text-gray-400" />
                        عضو منذ {new Date(supplier.created_at).toLocaleDateString('ar-DZ', { year: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tier and Badge */}
                <div className="flex flex-col sm:items-end gap-2">
                  <SupplierBadge
                    tier={tier}
                    rating={avgRating}
                    totalReviews={totalReviews}
                    showName={false}
                    size="lg"
                    clickable={false}
                  />
                  <span className="text-xs text-gray-400 sm:text-left">
                    نظام تقييم مبني على الطلبيات المكتملة فقط
                  </span>
                </div>
              </div>
            </div>

            {/* Tier Status & Trust Banner */}
            <div className={`p-6 rounded-3xl border ${
              tier === 'PLATINUM' 
                ? 'bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-cyan-500/40 text-cyan-200' 
                : tier === 'GOLD'
                ? 'bg-gradient-to-r from-amber-50 to-yellow-50/70 border-amber-300 dark:from-amber-950/40 dark:to-yellow-950/30 dark:border-amber-700/50 text-amber-900 dark:text-amber-200'
                : tier === 'SILVER'
                ? 'bg-gradient-to-r from-slate-100 to-gray-100 border-slate-300 dark:from-slate-800 dark:to-gray-800 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                : 'bg-emerald-50/70 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-200'
            }`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="font-extrabold text-base sm:text-lg flex items-center gap-2">
                    <Award size={20} />
                    {currentTierInfo.title}
                  </h4>
                  <p className="text-sm opacity-90 leading-relaxed max-w-2xl">
                    {currentTierInfo.desc}
                  </p>
                  {currentTierInfo.nextCriteria && (
                    <p className="text-xs font-semibold opacity-80 pt-1">
                      📌 {currentTierInfo.nextCriteria}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-center px-4 py-2 bg-white/70 dark:bg-black/30 rounded-2xl border border-black/10 dark:border-white/10">
                    <span className="block text-xl font-black">{completedOrdersCount}</span>
                    <span className="text-[11px] font-bold opacity-80">طلبيات مكتملة</span>
                  </div>
                  <div className="text-center px-4 py-2 bg-white/70 dark:bg-black/30 rounded-2xl border border-black/10 dark:border-white/10">
                    <span className="block text-xl font-black">{totalReviews}</span>
                    <span className="text-[11px] font-bold opacity-80">تقييمات موثقة</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Ratings Overview & Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Overall Score */}
              <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center text-center">
                <span className="text-xs font-bold text-gray-400 mb-2">متوسط التقييم العام</span>
                <div className="text-5xl font-black text-gray-900 dark:text-white mb-2">
                  {avgRating > 0 ? avgRating.toFixed(1) : '0.0'}
                </div>
                <div className="flex items-center gap-1 text-amber-400 fill-amber-400 mb-2" dir="ltr">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      size={20}
                      className={s <= Math.round(avgRating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 dark:text-gray-700'}
                    />
                  ))}
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  مبني على {totalReviews} تقييم حقيقي
                </span>
              </div>

              {/* Breakdown Bars */}
              <div className="md:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 flex flex-col justify-center space-y-2.5">
                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                  توزيع تقييمات التجار
                </h4>
                {ratingCounts.map(({ stars, count, percentage }) => (
                  <div key={stars} className="flex items-center gap-3 text-xs">
                    <span className="w-12 font-bold text-gray-600 dark:text-gray-300 flex items-center gap-1">
                      <span>{stars}</span>
                      <Star size={12} className="text-amber-400 fill-amber-400" />
                    </span>
                    <div className="flex-1 h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-400 to-[#4f46e5] rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="w-10 text-left font-bold text-gray-500 dark:text-gray-400">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Supplier Listed Products (if any) */}
            {supplierProducts.length > 0 && (
              <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-3xl border border-gray-100 dark:border-gray-700">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Store size={22} className="text-[#4f46e5]" />
                    منتجات هذا المورد في السوق
                  </h3>
                  <Link
                    to="/merchant/marketplace"
                    className="text-xs font-bold text-[#4f46e5] hover:underline flex items-center gap-1"
                  >
                    <span>تصفح كل المنتجات</span>
                    <ExternalLink size={14} />
                  </Link>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  {supplierProducts.map((p) => (
                    <div
                      key={p.id}
                      className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-3 border border-gray-100 dark:border-gray-800 flex flex-col justify-between"
                    >
                      <div className="aspect-square rounded-xl overflow-hidden mb-2 bg-white dark:bg-gray-800">
                        <img
                          src={p.image_url || '/placeholder.png'}
                          alt={p.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <h5 className="font-bold text-xs text-gray-900 dark:text-white truncate mb-1" title={p.title}>
                        {p.title}
                      </h5>
                      <span className="font-black text-xs text-[#4f46e5]">
                        {formatCurrency(p.price)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Supplier Reviews List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <CheckCircle2 size={22} className="text-emerald-500" />
                  تقييمات التجار الموثقة ({reviews.length})
                </h3>
              </div>

              <SupplierReviewsList
                reviews={reviews}
                isLoading={false}
                supplierName={supplier.company_name || supplier.name}
              />
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
