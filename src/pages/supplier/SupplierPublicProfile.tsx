import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { 
  Building2, MapPin, ShieldCheck, Star, Award, 
  CheckCircle2, ArrowRight, Store, Clock, ExternalLink,
  LayoutDashboard, ShoppingBag, CreditCard, DollarSign, Users, Package,
  Sparkles, Layers, Image as ImageIcon, FileCheck, X, Edit3
} from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import SupplierBadge, { SupplierTier } from '../../components/SupplierBadge';
import SupplierReviewsList from '../../components/SupplierReviewsList';
import ReviewModal from '../../components/ReviewModal';
import { supplierReviewService, SupplierReview } from '../../services/supplierReviewService';
import { getSupplierRatingInfo } from '../../utils/supplierUtils';
import toast from 'react-hot-toast';

export default function SupplierPublicProfile() {
  const { supplierId } = useParams<{ supplierId?: string }>();
  const [searchParams] = useSearchParams();
  const paramOrderId = searchParams.get('orderId');
  const paramOrderTitle = searchParams.get('orderTitle');

  const { user } = useAuthStore();
  const { formatCurrency } = useSettingsStore();
  const navigate = useNavigate();

  const targetSupplierId = supplierId || user?.id;

  const [supplier, setSupplier] = useState<any>(null);
  const [verificationData, setVerificationData] = useState<any>(null);
  const [reviews, setReviews] = useState<SupplierReview[]>([]);
  const [completedOrdersCount, setCompletedOrdersCount] = useState<number>(0);
  const [supplierProducts, setSupplierProducts] = useState<any[]>([]);
  const [merchantBids, setMerchantBids] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Review modal state
  const [showReviewModal, setShowReviewModal] = useState<boolean>(false);
  const [activeReviewOrderId, setActiveReviewOrderId] = useState<string>('');
  const [activeReviewOrderTitle, setActiveReviewOrderTitle] = useState<string>('');

  // Warehouse images lightbox preview
  const [previewImage, setPreviewImage] = useState<string | null>(null);

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

      // 2. Fetch verified business details (from 'بروفايلي / توثيق المورد')
      const { data: verifData } = await supabase
        .from('supplier_verifications')
        .select('*')
        .eq('user_id', id)
        .maybeSingle();

      setVerificationData(verifData || null);

      // 3. Fetch completed orders count
      const { count: ordersCount } = await supabase
        .from('supplier_bids')
        .select('id', { count: 'exact', head: true })
        .eq('supplier_id', id)
        .or('shipping_status.eq.delivered,status.eq.accepted');

      setCompletedOrdersCount(ordersCount || 0);

      // 4. Fetch real supplier reviews
      const reviewsData = await supplierReviewService.getSupplierReviews(id);
      setReviews(reviewsData);

      // 5. Fetch supplier's listed products in marketplace
      const { data: prods } = await supabase
        .from('products')
        .select('*')
        .eq('supplier_id', id)
        .limit(6);

      setSupplierProducts(prods || []);

      // 6. If logged-in user is a merchant, fetch any bids/orders between this merchant and this supplier
      if (user?.id && user.id !== id) {
        const { data: mBids } = await supabase
          .from('supplier_bids')
          .select(`
            id,
            status,
            shipping_status,
            created_at,
            custom_requests!inner (
              id,
              title,
              merchant_id
            )
          `)
          .eq('supplier_id', id)
          .eq('custom_requests.merchant_id', user.id)
          .order('created_at', { ascending: false });

        setMerchantBids(mBids || []);
      }
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

  // Check if merchant already reviewed specific bid or in general
  const existingReviewForParamOrder = paramOrderId 
    ? reviews.find((r) => r.order_id === paramOrderId && r.merchant_id === user?.id)
    : null;

  const handleOpenReview = (orderIdToReview?: string, orderTitleToReview?: string) => {
    if (!user) {
      toast.error('يرجى تسجيل الدخول بحساب تاجر لتتمكن من تقييم المورد.');
      return;
    }
    if (user.id === targetSupplierId) {
      toast.error('لا يمكنك تقييم نفسك!');
      return;
    }

    // Determine target order id (from param or from merchant bids)
    const orderId = orderIdToReview || paramOrderId || merchantBids[0]?.id;
    const orderTitle = orderTitleToReview || paramOrderTitle || merchantBids[0]?.custom_requests?.title || 'طلب مناقصة';

    if (!orderId) {
      toast.error(
        'التقييم متاح للتجار بعد تقديم المورد عرضاً في مناقصة أو إتمام طلبية لضمان مصداقية التقييمات 100%!',
        { duration: 5500 }
      );
      return;
    }

    // Check if this specific order is already reviewed
    const alreadyReviewed = reviews.some((r) => r.order_id === orderId && r.merchant_id === user.id);
    if (alreadyReviewed) {
      toast.error('لقد قمت بتقييم هذه الصفقة مسبقاً! شكراً لمشاركتك رأيك 🌟');
      return;
    }

    setActiveReviewOrderId(orderId);
    setActiveReviewOrderTitle(orderTitle);
    setShowReviewModal(true);
  };

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

  const isOwnerViewingSelf = user?.id === targetSupplierId;
  const isMerchantVisitor = !isOwnerViewingSelf && user?.role === 'merchant';
  const hasTransactedBefore = merchantBids.length > 0 || Boolean(paramOrderId);

  return (
    <DashboardLayout title="بروفايل المورد ومعلومات التوثيق" sidebarLinks={activeSidebarLinks}>
      <div className="max-w-6xl mx-auto space-y-6 font-['Tajawal'] pb-12">
        {/* Top Navigation & Status */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition cursor-pointer"
          >
            <ArrowRight size={18} />
            <span>الرجوع للمناقصات والطلبات</span>
          </button>

          {isMerchantVisitor && hasTransactedBefore && (
            <button
              onClick={() => handleOpenReview()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white font-black text-xs sm:text-sm shadow-md transition-all hover:scale-102 cursor-pointer"
            >
              <Star size={16} className="fill-white" />
              <span>تقييم هذا المورد ⭐</span>
            </button>
          )}
        </div>

        {/* Self Preview Notice Banner if Supplier is checking his own profile */}
        {isOwnerViewingSelf && (
          <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-indigo-500/10 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200 font-bold">
              <Sparkles size={18} className="text-[#4f46e5] flex-shrink-0" />
              <span>هذه معاينة لبروفايلك التجاري والتوثيق كما يراه التجار عند الضغط على اسمك في المناقصات.</span>
            </div>
            <Link
              to="/supplier/verification"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white font-bold text-xs transition flex-shrink-0 shadow-sm"
            >
              <Edit3 size={14} />
              <span>تعديل بيانات التوثيق والمخزن</span>
            </Link>
          </div>
        )}

        {loading ? (
          <div className="bg-white dark:bg-gray-800 p-12 rounded-3xl text-center text-gray-400">
            جاري تحميل بروفايل المورد ومعلومات المخزن...
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

              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex items-start sm:items-center gap-4 sm:gap-6">
                  {/* Avatar Emblem */}
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-indigo-900 via-[#4f46e5] to-purple-600 text-white flex items-center justify-center font-black text-2xl sm:text-3xl shadow-lg shadow-indigo-500/20 flex-shrink-0">
                    {((verificationData?.business_name || supplier.company_name || supplier.name || 'م').charAt(0)).toUpperCase()}
                  </div>

                  <div>
                    <div className="flex items-center flex-wrap gap-3 mb-1">
                      <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
                        {verificationData?.business_name || supplier.company_name || supplier.name}
                      </h2>
                      {(verificationData?.status === 'APPROVED' || supplier.verification_badge) && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 shadow-xs">
                          <ShieldCheck size={15} className="text-blue-600" />
                          <span>موثق رسمياً في جيبها</span>
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-2">
                      {(verificationData?.location || supplier.address) && (
                        <span className="flex items-center gap-1.5">
                          <MapPin size={15} className="text-rose-500" />
                          {verificationData?.location || supplier.address}
                        </span>
                      )}
                      {verificationData?.specialty && (
                        <span className="flex items-center gap-1.5">
                          <Layers size={15} className="text-[#4f46e5]" />
                          تخصص: {verificationData.specialty}
                        </span>
                      )}
                      <span className="flex items-center gap-1.5">
                        <Clock size={15} className="text-gray-400" />
                        عضو منذ {new Date(supplier.created_at).toLocaleDateString('ar-DZ', { year: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Action & Tier Badge */}
                <div className="flex flex-col sm:items-end gap-3">
                  <SupplierBadge
                    tier={tier}
                    rating={avgRating}
                    totalReviews={totalReviews}
                    showName={false}
                    size="lg"
                    clickable={false}
                  />

                  {/* Rating / Review Action Button */}
                  {!isOwnerViewingSelf && (
                    <div className="flex items-center gap-2">
                      {existingReviewForParamOrder ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 text-xs font-bold">
                          <CheckCircle2 size={15} className="text-emerald-600" />
                          <span>تم تقييمك لهذا العرض ({existingReviewForParamOrder.rating} ⭐)</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenReview()}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white font-extrabold text-xs sm:text-sm shadow-md hover:scale-102 transition-all cursor-pointer"
                        >
                          <Star size={15} className="fill-white" />
                          <span>تقييم المورد الآن ⭐</span>
                        </button>
                      )}
                    </div>
                  )}

                  <span className="text-xs text-gray-400 sm:text-left">
                    نظام تقييم مبني على الصفقات والمناقصات المكتملة فقط
                  </span>
                </div>
              </div>
            </div>

            {/* Business Verification Details & Warehouse Showcase (from "بروفايلي") */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 dark:border-gray-700/80 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-700/70 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Building2 size={24} className="text-[#4f46e5]" />
                    <h3 className="text-xl font-black text-gray-900 dark:text-white">
                      بيانات النشاط التجاري والمخزن المعتمد
                    </h3>
                    {verificationData?.status === 'APPROVED' ? (
                      <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
                        <ShieldCheck size={14} className="text-emerald-600" />
                        <span>توثيق معتمد</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-black bg-amber-50 text-amber-700 border border-amber-200">
                        <Clock size={13} />
                        <span>بيانات قيد المراجعة</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                    المعلومات المدخلة والموثقة من قبل المورد في حسابه لضمان الشفافية ومطابقة المعايير.
                  </p>
                </div>

                {/* Quality Charter Guarantee Badge */}
                {verificationData?.charter_agreed && (
                  <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold shadow-xs">
                    <FileCheck size={18} className="text-emerald-600 flex-shrink-0" />
                    <span>ملتزم بميثاق جودة الخدمة وحماية التاجر 100%</span>
                  </div>
                )}
              </div>

              {/* Key Business Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Specialty */}
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800">
                  <span className="text-xs font-bold text-gray-400 flex items-center gap-1.5 mb-1.5">
                    <Layers size={14} className="text-[#4f46e5]" />
                    مجال التخصص والتوريد
                  </span>
                  <p className="text-sm font-extrabold text-gray-900 dark:text-white">
                    {verificationData?.specialty || 'توريد عام واستيراد تجاري'}
                  </p>
                </div>

                {/* Physical Warehouse Location */}
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800">
                  <span className="text-xs font-bold text-gray-400 flex items-center gap-1.5 mb-1.5">
                    <MapPin size={14} className="text-rose-500" />
                    المقر الفعلي والمخزن
                  </span>
                  <p className="text-sm font-extrabold text-gray-900 dark:text-white">
                    {verificationData?.location || supplier.address || 'مقر معتمد لدى المنصة'}
                  </p>
                </div>

                {/* Preparation Time */}
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800">
                  <span className="text-xs font-bold text-gray-400 flex items-center gap-1.5 mb-1.5">
                    <Clock size={14} className="text-amber-500" />
                    متوسط سرعة التجهيز والشحن
                  </span>
                  <p className="text-sm font-extrabold text-gray-900 dark:text-white">
                    {verificationData?.prep_time || 'خلال 24 إلى 48 ساعة'}
                  </p>
                </div>

                {/* Social / Store Links */}
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800">
                  <span className="text-xs font-bold text-gray-400 flex items-center gap-1.5 mb-1.5">
                    <ExternalLink size={14} className="text-cyan-500" />
                    سجل الأعمال والمتجر
                  </span>
                  {verificationData?.social_links ? (
                    <a
                      href={verificationData.social_links.startsWith('http') ? verificationData.social_links : `https://${verificationData.social_links}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-[#4f46e5] dark:text-indigo-400 hover:underline truncate block"
                      title={verificationData.social_links}
                    >
                      {verificationData.social_links}
                    </a>
                  ) : (
                    <span className="text-xs text-gray-400">لا توجد روابط خارجية مرفقة</span>
                  )}
                </div>
              </div>

              {/* Real Store and Warehouse Photos Gallery (Uploaded in بروفايلي) */}
              {verificationData?.images && Array.isArray(verificationData.images) && verificationData.images.length > 0 ? (
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-extrabold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                      <ImageIcon size={18} className="text-[#4f46e5]" />
                      معرض صور المخزن والبضاعة الحية ({verificationData.images.length} صور موثقة)
                    </h4>
                    <span className="text-xs text-gray-400">اضغط على أي صورة لتكبيرها وفحصها بدقة 🔍</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                    {verificationData.images.map((imgUrl: string, idx: number) => (
                      <div
                        key={idx}
                        onClick={() => setPreviewImage(imgUrl)}
                        className="group aspect-square rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 relative cursor-pointer hover:shadow-lg transition-all transform hover:scale-102"
                      >
                        <img
                          src={imgUrl}
                          alt={`مخزن المورد ${idx + 1}`}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                          تكبير 🔍
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-gray-50/60 dark:bg-gray-900/40 border border-dashed border-gray-200 dark:border-gray-700 text-center text-xs text-gray-400">
                  لم يقم المورد برفع صور إضافية للمخزن حتى الآن.
                </div>
              )}
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
                  مبني على {totalReviews} تقييم حقيقي من التجار
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

            {/* Supplier Listed Products in Marketplace (if any) */}
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <CheckCircle2 size={22} className="text-emerald-500" />
                  تقييمات التجار الموثقة ({reviews.length})
                </h3>

                {!isOwnerViewingSelf && (
                  <button
                    onClick={() => handleOpenReview()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white font-black text-xs sm:text-sm shadow-sm transition-all hover:scale-102 cursor-pointer self-start sm:self-auto"
                  >
                    <Star size={15} className="fill-white" />
                    <span>أضف تقييمك لهذا المورد ⭐</span>
                  </button>
                )}
              </div>

              <SupplierReviewsList
                reviews={reviews}
                isLoading={false}
                supplierName={verificationData?.business_name || supplier.company_name || supplier.name}
              />
            </div>
          </>
        )}
      </div>

      {/* Review Modal */}
      {showReviewModal && activeReviewOrderId && user && (
        <ReviewModal
          isOpen={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          orderId={activeReviewOrderId}
          supplierId={targetSupplierId!}
          merchantId={user.id}
          supplierName={verificationData?.business_name || supplier?.company_name || supplier?.name || 'المورد'}
          orderTitle={activeReviewOrderTitle}
          onSuccess={() => {
            if (targetSupplierId) {
              loadProfileData(targetSupplierId);
            }
          }}
        />
      )}

      {/* Lightbox Modal for Warehouse Photos */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-12 left-0 sm:left-auto sm:-right-12 text-white hover:text-gray-300 p-2 bg-white/10 hover:bg-white/20 rounded-full transition cursor-pointer"
              title="إغلاق"
            >
              <X size={24} />
            </button>
            <img
              src={previewImage}
              alt="صورة المخزن والسلع"
              className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl border border-white/20"
            />
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
