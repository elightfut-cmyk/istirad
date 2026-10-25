import { useState, useEffect } from 'react';
import { LayoutDashboard, Package, ShoppingBag, Gavel, CheckCircle2, Link as LinkIcon, Image as ImageIcon, DollarSign, Store, User, MapPin, Phone, Eye, AlertTriangle, Plus, Trash2, Layers, ShieldCheck } from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { sendNotification } from '../../store/useNotificationStore';
import toast from 'react-hot-toast';
import { calculateFinalPrice } from '../../utils/profitCalculator';
import {
  notifyMerchantNewBid,
  notifyMerchantBidUpdated,
  notifyMerchantPriceAccepted,
  notifyMerchantPriceRejected,
  notifyMerchantSupplierInterest,
} from '../../services/emailService';
import TenderAppPromptModal from '../../components/TenderAppPromptModal';
import SupplierBadge from '../../components/SupplierBadge';
import { getSupplierRatingInfo } from '../../utils/supplierUtils';

export default function SupplierRequests() {
  const { user } = useAuthStore();
  const [showTenderAppPrompt, setShowTenderAppPrompt] = useState(true);
  const [showUnverifiedModal, setShowUnverifiedModal] = useState(false);

  const isVerifiedSupplier = Boolean(
    (user?.verification_badge && user.verification_badge !== 'none') || 
    user?.is_verified
  );
  const { 
    formatCurrency,
    markupTier1Percentage,
    markupTier2Percentage,
    markupTier3Percentage,
    markupTier4Percentage,
    orderFixedFee, shippingPricePerKilo, bidWindowExchangeRate
  } = useSettingsStore();
  
  const profitSettings = {
    markupTier1Percentage,
    markupTier2Percentage,
    markupTier3Percentage,
    markupTier4Percentage,
    orderFixedFee
  };

  const [requests, setRequests] = useState<any[]>([]);
  interface TierItem {
    quantity: number;
    cost_price: number;
  }

  const [loading, setLoading] = useState(true);
  const [biddingRequest, setBiddingRequest] = useState<any>(null);
  const [bidForm, setBidForm] = useState<{
    id: string | null;
    advance_percentage: number;
    notes: string;
    tiers: TierItem[];
  }>({
    id: null,
    advance_percentage: 20,
    notes: '',
    tiers: [{ quantity: 1, cost_price: 0 }]
  });
  const exchangeRate = useSettingsStore(state => state.exchangeRate) || 135;
  const [submitting, setSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'closed'>('all');

  useEffect(() => {
    fetchRequests();
    
    const handleRefresh = () => fetchRequests();
    window.addEventListener('refresh_data', handleRefresh);
    return () => window.removeEventListener('refresh_data', handleRefresh);
  }, [user?.id]);

  const fetchRequests = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('custom_requests')
        .select(`
          id, title, description, quantity, status, created_at, request_type, notes, image_url, product_link, merchant_id, approx_weight_grams, avg_price_china,
          merchant:users!merchant_id(name, company_name, phone, address, email),
          supplier_bids (*, supplier:users!supplier_id(id, name, company_name, verification_badge, average_rating, total_reviews)),
          supplier_interests (supplier_id)
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      const filteredData = (data || []).filter(req => req.request_type !== 'direct');
      setRequests(filteredData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenBidModal = (req: any, existingBid?: any) => {
    if (!isVerifiedSupplier) {
      setShowUnverifiedModal(true);
      toast.error('عذراً، يجب توثيق حسابك التجاري أولاً للمشاركة في المناقصات');
      return;
    }

    setBiddingRequest(req);
    if (existingBid) {
      let tiers: TierItem[] = [];
      if (existingBid.quantity_tiers && Array.isArray(existingBid.quantity_tiers) && existingBid.quantity_tiers.length > 0) {
        tiers = existingBid.quantity_tiers.map((t: any) => ({
          quantity: Number(t.quantity) || 1,
          cost_price: Number(t.cost_price) || 0,
        }));
      } else {
        const q = req.quantity || 1;
        const unitCost = existingBid.cost_price ? (existingBid.cost_price / q) : (existingBid.price / q);
        tiers = [{ quantity: q, cost_price: unitCost }];
      }
      setBidForm({
        id: existingBid.id,
        advance_percentage: existingBid.advance_percentage || 20,
        notes: existingBid.notes || '',
        tiers,
      });
    } else {
      setBidForm({
        id: null,
        advance_percentage: 20,
        notes: '',
        tiers: [{ quantity: req.quantity || 100, cost_price: 0 }],
      });
    }
  };

  const handleSubmitBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !biddingRequest) return;

    if (!isVerifiedSupplier) {
      toast.error('غير مصرح لك بتقديم عروض قبل توثيق حسابك كمورد معتمد');
      setShowUnverifiedModal(true);
      return;
    }

    if (!bidForm.tiers || bidForm.tiers.length === 0) {
      toast.error('يرجى إضافة شريحة كمية وسعر واحدة على الأقل');
      return;
    }

    for (let i = 0; i < bidForm.tiers.length; i++) {
      const t = bidForm.tiers[i];
      if (!t.quantity || t.quantity <= 0) {
        toast.error(`يرجى تحديد كمية صحيحة للشريحة رقم ${i + 1}`);
        return;
      }
      if (!t.cost_price || t.cost_price <= 0) {
        toast.error(`يرجى إدخال السعر للشريحة رقم ${i + 1}`);
        return;
      }
    }

    setSubmitting(true);
    
    // First tier serves as the base for backward-compatibility
    const baseTier = bidForm.tiers[0];
    const baseQuantity = baseTier.quantity || biddingRequest.quantity || 1;
    const baseCalculation = calculateFinalPrice(baseTier.cost_price, baseQuantity, profitSettings);
    
    const calculatedPriceTotal = baseCalculation.finalTotal;
    const calculatedCostTotal = baseTier.cost_price * baseQuantity;

    // Build structured quantity_tiers list
    const formattedTiers = bidForm.tiers.map((t) => {
      const calc = calculateFinalPrice(t.cost_price, t.quantity, profitSettings);
      return {
        quantity: t.quantity,
        cost_price: t.cost_price,
        cost_total: t.cost_price * t.quantity,
        final_item_price: calc.finalItemPrice,
        final_total: calc.finalTotal,
      };
    });

    const payload: any = {
      price: calculatedPriceTotal,
      cost_price: calculatedCostTotal,
      price_usd: calculatedPriceTotal / exchangeRate,
      cost_price_usd: calculatedCostTotal / exchangeRate,
      advance_percentage: bidForm.advance_percentage,
      notes: bidForm.notes,
      quantity_tiers: formattedTiers,
    };

    try {
      if (bidForm.id) {
        const { error } = await supabase.from('supplier_bids').update(payload).eq('id', bidForm.id);

        if (error) throw error;
        sendNotification(biddingRequest.merchant_id, 'تعديل عرض سعر', `قام ${user.name} بتعديل عرضه على مناقصتك: ${biddingRequest.title}`, 'info');

        // Send Email to Merchant via Resend
        notifyMerchantBidUpdated({
          merchantId: biddingRequest.merchant_id,
          merchantEmail: biddingRequest.merchant?.email,
          merchantName: biddingRequest.merchant?.company_name || biddingRequest.merchant?.name,
          supplierName: user.company_name || user.name,
          tenderTitle: biddingRequest.title,
          quantity: baseQuantity,
          itemPrice: baseCalculation.finalItemPrice,
          totalPrice: calculatedPriceTotal,
          advancePercentage: bidForm.advance_percentage,
          notes: bidForm.notes,
        }).catch(err => console.error('Error sending bid update email:', err));

      } else {
        const { error } = await supabase.from('supplier_bids').insert({
          ...payload,
          request_id: biddingRequest.id,
          supplier_id: user.id,
          shipping_status: biddingRequest.request_type === 'direct' ? 'processing' : 'pending_in_china'
        });

        if (error) throw error;
        sendNotification(biddingRequest.merchant_id, 'عرض سعر جديد', `تلقيت عرضاً جديداً بشرائح كميات وأسعار من ${user.name} على مناقصتك: ${biddingRequest.title}`, 'info');

        // Send Email to Merchant via Resend
        const advanceAmount = (calculatedPriceTotal * bidForm.advance_percentage) / 100;
        notifyMerchantNewBid({
          merchantId: biddingRequest.merchant_id,
          merchantEmail: biddingRequest.merchant?.email,
          merchantName: biddingRequest.merchant?.company_name || biddingRequest.merchant?.name,
          supplierName: user.company_name || user.name,
          tenderTitle: biddingRequest.title,
          quantity: baseQuantity,
          itemPrice: baseCalculation.finalItemPrice,
          totalPrice: calculatedPriceTotal,
          advancePercentage: bidForm.advance_percentage,
          advanceAmount,
          notes: bidForm.notes,
        }).catch(err => console.error('Error sending new bid email:', err));
      }
      
      await fetchRequests();
      setBiddingRequest(null);
      setBidForm({ id: null, advance_percentage: 20, notes: '', tiers: [{ quantity: 1, cost_price: 0 }] });
      toast.success(bidForm.id ? 'تم تعديل العرض بنجاح' : 'تم إرسال العرض بنجاح');
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء تقديم العرض');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptProposedPrice = async (bid: any, req: any) => {
    try {
      const selectedTier = bid.selected_tier;
      const reqQuantity = selectedTier?.quantity || req.quantity || 1;
      const merchantId = req.merchant_id;
      const newPriceTotal = bid.negotiated_price * reqQuantity;
      const updateData: any = {
        price: newPriceTotal,
        cost_price: newPriceTotal,
        price_usd: newPriceTotal / exchangeRate,
        cost_price_usd: newPriceTotal / exchangeRate,
        negotiated_price: null,
        negotiated_by: 'supplier_accepted'
      };
      if (selectedTier) {
        updateData.selected_tier = {
          ...selectedTier,
          cost_price: bid.negotiated_price,
          price: bid.negotiated_price
        };
      }
      const { error } = await supabase.from('supplier_bids').update(updateData).eq('id', bid.id);
      
      if (error) throw error;
      sendNotification(merchantId, 'تم قبول السعر المقترح', `وافق المورد ${user?.company_name || ''} على السعر المقترح، يرجى دفع العربون.`, 'success');

      // Send Email to Merchant via Resend
      notifyMerchantPriceAccepted({
        merchantId,
        merchantEmail: req.merchant?.email,
        merchantName: req.merchant?.company_name || req.merchant?.name,
        supplierName: user?.company_name || user?.name || 'المورد',
        tenderTitle: req.title,
        quantity: reqQuantity,
        agreedPricePerItem: bid.negotiated_price,
        agreedTotal: newPriceTotal,
        advancePercentage: bid.advance_percentage || 20,
      }).catch(err => console.error('Error sending price accept email:', err));

      toast.success('تم قبول السعر وتحديث العرض بنجاح');
      fetchRequests();
    } catch (error) {
      toast.error('حدث خطأ أثناء قبول السعر');
    }
  };

  const handleRejectProposedPrice = async (bidId: string, req: any) => {
    if (!window.confirm('هل أنت متأكد من رفض السعر المقترح؟ سيتم إبلاغ التاجر برفضك وسيكون أمامه خيار قبول عرضك الأول أو رفضه نهائياً.')) return;
    try {
      const merchantId = req.merchant_id;
      const { error } = await supabase.from('supplier_bids').update({
        negotiated_by: 'supplier_rejected'
      }).eq('id', bidId);
      
      if (error) throw error;
      sendNotification(merchantId, 'رفض المورد للسعر المقترح', `رفض المورد السعر المقترح وتم إعادة العرض لخياره الأول.`, 'info');

      // Send Email to Merchant via Resend
      notifyMerchantPriceRejected({
        merchantId,
        merchantEmail: req.merchant?.email,
        merchantName: req.merchant?.company_name || req.merchant?.name,
        supplierName: user?.company_name || user?.name || 'المورد',
        tenderTitle: req.title,
        quantity: req.quantity || 1,
      }).catch(err => console.error('Error sending price reject email:', err));

      toast.success('تم رفض السعر المقترح');
      fetchRequests();
    } catch (error) {
      toast.error('حدث خطأ أثناء رفض السعر المقترح');
    }
  };

  const handleIndicateInterest = async (req: any) => {
    if (!user) return;
    if (!isVerifiedSupplier) {
      setShowUnverifiedModal(true);
      toast.error('عذراً، يجب توثيق حسابك كمورد معتمد أولاً للتفاعل مع المناقصات');
      return;
    }
    const requestId = req.id;
    try {
      const { error } = await supabase.from('supplier_interests').insert({
        request_id: requestId,
        supplier_id: user.id
      });
      if (error) {
        if (error.code === '23505') { // Unique violation
          toast.success('لقد قمت بإعلام التاجر مسبقاً.');
        } else {
          throw error;
        }
      } else {
        toast.success('تم إعلام التاجر بأنك تبحث عن عرض مناسب لطلبه.');

        // Notify merchant in-app
        sendNotification(req.merchant_id, 'مورد مهتم بمناقصتك', `قام المورد ${user.company_name || user.name} بإبداء اهتمامه بمناقصتك: ${req.title} وجاري البحث عن أفضل عرض.`, 'info');

        // Send Email to Merchant via Resend
        notifyMerchantSupplierInterest({
          merchantId: req.merchant_id,
          merchantEmail: req.merchant?.email,
          merchantName: req.merchant?.company_name || req.merchant?.name,
          supplierName: user.company_name || user.name,
          tenderTitle: req.title,
          quantity: req.quantity || 1,
        }).catch(err => console.error('Error sending supplier interest email:', err));
      }
      fetchRequests();
    } catch (error) {
      toast.error('حدث خطأ أثناء المحاولة');
    }
  };

  return (
    <DashboardLayout
      title="مناقصات التجار"
      sidebarLinks={[
        { label: 'الرئيسية', href: '/supplier', icon: <LayoutDashboard size={20} /> },
        { label: 'منتجاتي', href: '/supplier/products', icon: <Package size={20} /> },
        { label: 'سوق الطلبات', href: '/supplier/requests', icon: <Gavel size={20} /> },
        { label: 'الطلبات الواردة', href: '/supplier/orders', icon: <ShoppingBag size={20} /> },
        { label: 'التقارير المالية', href: '/supplier/financials', icon: <DollarSign size={20} /> },
        { label: 'توثيق الحساب', href: '/supplier/verification', icon: <ShieldCheck size={20} /> },
      ]}
    >
      <div className="mb-6 flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">سوق الطلبات والمناقصات</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">تصفح طلبات التجار الخاصة وقدم أفضل عروضك للفوز بالصفقة.</p>
        </div>
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-full sm:w-max overflow-x-auto no-scrollbar whitespace-nowrap gap-1">
          <button onClick={() => setFilterStatus('all')} className={`px-4 py-2 text-sm font-bold rounded-md transition shrink-0 ${filterStatus === 'all' ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-200'}`}>الكل</button>
          <button onClick={() => setFilterStatus('open')} className={`px-4 py-2 text-sm font-bold rounded-md transition shrink-0 ${filterStatus === 'open' ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-200'}`}>مفتوحة</button>
          <button onClick={() => setFilterStatus('closed')} className={`px-4 py-2 text-sm font-bold rounded-md transition shrink-0 ${filterStatus === 'closed' ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-200'}`}>مغلقة</button>
        </div>
      </div>

      <div className="relative">
        {!isVerifiedSupplier && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30 border border-amber-200 dark:border-amber-800/60 p-4 rounded-2xl mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-start sm:items-center gap-3">
              <div className="p-2.5 bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 rounded-xl shrink-0">
                <ShieldCheck size={22} />
              </div>
              <div>
                <h4 className="text-sm font-black text-amber-950 dark:text-amber-200">
                  حسابك غير موثق بعد 🛡️
                </h4>
                <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                  للحفاظ على جودة التعاملات وجدية الصفقات، لا يمكن للموردين غير الموثقين المشاركة في المناقصات أو تقديم عروض الأسعار.
                </p>
              </div>
            </div>
            <a
              href="/supplier/verification"
              className="self-start sm:self-auto px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white text-xs font-black rounded-xl transition shadow-xs whitespace-nowrap"
            >
              توثيق حسابي الآن 🛡️
            </a>
          </div>
        )}

        {user?.status === 'pending' && (
          <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl mb-6 text-orange-800 flex items-center gap-3">
            <Gavel size={24} className="text-orange-600 flex-shrink-0" />
            <p className="text-sm font-bold">
              حسابك قيد المراجعة. يمكنك الاطلاع على الطلبات ولكن لا يمكنك تقديم عروض أو تفاعل حتى يتم تفعيل حسابك.
            </p>
          </div>
        )}
        <div className="space-y-6">
        {loading ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">جاري التحميل...</div>
        ) : requests.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 p-12 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 text-center">
            <Gavel size={48} className="mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">لا توجد طلبات مفتوحة حالياً</h3>
          </div>
        ) : (
          requests.filter(req => {
            if (filterStatus === 'all') return true;
            if (filterStatus === 'open') return req.status !== 'closed';
            if (filterStatus === 'closed') return req.status === 'closed' || req.status === 'cancelled';
            return true;
          }).map(req => {
            const myBid = req.supplier_bids?.find((b: any) => b.supplier_id === user?.id);
            const isClosed = req.status === 'closed';
            const activeInterests = req.supplier_interests?.filter((i: any) => !req.supplier_bids?.some((b: any) => b.supplier_id === i.supplier_id)) || [];

            return (
              <div key={req.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col">
                <div className="flex flex-col md:flex-row">
                  <div className="p-6 md:w-2/3 border-b md:border-b-0 md:border-l border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold text-xl text-gray-900 dark:text-white">{req.title}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">بواسطة التاجر: <span className="font-bold">{req.merchant?.name || 'غير معروف'} {req.merchant?.company_name ? `(${req.merchant.company_name})` : ''}</span></p>
                      </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${req.status === 'cancelled' ? 'bg-red-100 text-red-700' : isClosed ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                      {req.status === 'cancelled' ? 'ملغاة' : isClosed ? 'مغلق (تمت الصفقة)' : 'مفتوح لتلقي العروض'}
                    </span>
                  </div>

                  
                  {req.status === 'cancelled' && (
                    <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl mb-4">
                      <p className="font-bold flex items-center gap-2"><AlertTriangle size={18} /> تم إلغاء هذه المناقصة من قبل التاجر</p>
                      {req.cancellation_reason && <p className="text-sm mt-2 font-normal">سبب الإلغاء: {req.cancellation_reason}</p>}
                    </div>
                  )}
{(req.supplier_bids?.length > 0 || activeInterests.length > 0) && (
                    <div className="flex flex-col gap-2 mb-3">
                      <div className="flex flex-wrap gap-2">
                        {req.supplier_bids?.length > 0 && (
                          <span className="text-xs font-bold bg-purple-50 text-purple-700 px-2 py-1 rounded-md border border-purple-100 flex items-center gap-1">
                            <Gavel size={14} /> {req.supplier_bids.length} مورد(ين) قدموا عروضاً
                          </span>
                        )}
                        {activeInterests.length > 0 && (
                          <span className="text-xs font-bold bg-orange-50 text-orange-700 px-2 py-1 rounded-md border border-orange-100 flex items-center gap-1">
                            <Eye size={14} /> {activeInterests.length} مورد(ين) يبحثون عن المنتج
                          </span>
                        )}
                      </div>

                      {/* Competing suppliers classification display */}
                      {req.supplier_bids?.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 p-2 bg-gray-50/80 dark:bg-gray-750/50 rounded-xl border border-gray-100 dark:border-gray-700/60">
                          <span className="text-[11px] text-gray-500 dark:text-gray-400 font-bold">الموردون المتنافسون:</span>
                          {req.supplier_bids.map((b: any) => {
                            const badge = b.supplier?.verification_badge;
                            const ratingInfo = getSupplierRatingInfo(badge, b.supplier?.average_rating, b.supplier?.total_reviews);
                            return (
                              <span key={b.id} className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${ratingInfo.badgeClass}`}>
                                <span>{b.supplier?.company_name || b.supplier?.name || 'مورد'}</span>
                                <span className="font-extrabold">{ratingInfo.badgeTitle}</span>
                                {ratingInfo.hasRealRating && (
                                  <span className="text-[9px] opacity-90">({ratingInfo.ratingText} ★)</span>
                                )}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-4">{req.description}</p>
                  
                  {req.notes && (
                    <p className="text-gray-500 dark:text-gray-400 text-sm italic mb-4">ملاحظات التاجر: {req.notes}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-sm mt-4">
                    <span className="font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700">الكمية المطلوبة: {req.quantity} وحدة</span>
                    {req.approx_weight_grams > 0 && (
                      <span className="font-bold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700">الوزن التقريبي: {req.approx_weight_grams}غ</span>
                    )}
                    {req.avg_price_china > 0 && (
                      <span className="font-bold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700">سعر الصين: ${req.avg_price_china}</span>
                    )}
                    {(req.approx_weight_grams > 0 || req.avg_price_china > 0) && (
                      <span className="font-bold text-green-700 bg-green-50 px-3 py-1.5 rounded-lg border border-green-200" title="شامل تكلفة الشحن التقريبية للقطعة">
                        السعر التقريبي: {(((req.avg_price_china || 0) + ((req.approx_weight_grams || 0) / 1000) * shippingPricePerKilo) * bidWindowExchangeRate).toFixed(2)} دج
                      </span>
                    )}
                    
                    {req.product_link && (
                      <a href={req.product_link} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg transition">
                        <LinkIcon size={16} /> فتح الرابط
                      </a>
                    )}
                    {req.image_url && (
                      <a href={req.image_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-purple-600 hover:text-purple-800 bg-purple-50 px-3 py-1.5 rounded-lg transition">
                        <ImageIcon size={16} /> عرض الصورة
                      </a>
                    )}
                  </div>

                  {/* Competing Suppliers & Tiers on this Tender */}
                  {req.supplier_bids && req.supplier_bids.length > 0 && (
                    <div className="mt-4 pt-3.5 border-t border-gray-100 dark:border-gray-700/60">
                      <div className="flex items-center gap-2 mb-2">
                        <Gavel size={14} className="text-[#4f46e5]" />
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                          الموردين المشاركون بتصنيفاتهم في هذه المناقصة ({req.supplier_bids.length}):
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {req.supplier_bids.map((b: any) => {
                          const isMe = b.supplier_id === user?.id;
                          const sInfo = getSupplierRatingInfo(b.supplier?.verification_badge);
                          return (
                            <div key={b.id} className="inline-flex items-center gap-1">
                              <SupplierBadge
                                supplierId={b.supplier_id}
                                name={b.supplier?.name}
                                companyName={b.supplier?.company_name}
                                tier={sInfo.tier}
                                rating={sInfo.rating}
                                totalReviews={sInfo.totalReviews}
                                size="xs"
                                clickable={!isMe}
                              />
                              {isMe && (
                                <span className="text-[10px] bg-indigo-600 text-white font-black px-1.5 py-0.5 rounded-md">
                                  عرضك
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-6 md:w-1/3 bg-gray-50 dark:bg-gray-900 flex flex-col justify-center items-center text-center">
                  {myBid ? (
                    <div className="w-full">
                      <h4 className="font-bold text-gray-700 dark:text-gray-200 mb-4 border-b pb-2">عرضك المقدم</h4>
                        <div className="flex justify-between items-center mb-1 text-sm">
                          <span className="text-gray-600 dark:text-gray-300">سعرك الخام للقطعة:</span>
                          <span className="font-bold">{formatCurrency((myBid.cost_price || myBid.price) / (req.quantity || 1))}</span>
                        </div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-gray-600 dark:text-gray-300">إجمالي سعرك الخام:</span>
                          <span className="font-bold text-[#4f46e5]">{formatCurrency(myBid.cost_price || myBid.price)}</span>
                        </div>
                        {(myBid.cost_price && myBid.cost_price !== myBid.price) ? (
                          <div className="flex justify-between items-center text-xs mt-1 mb-2 bg-indigo-50 p-2 rounded border border-indigo-100">
                            <span className="text-gray-600 dark:text-gray-300">السعر النهائي المعروض للتاجر:</span>
                            <span className="font-bold text-[#4f46e5]">{formatCurrency(myBid.price)}</span>
                          </div>
                        ) : null}

                        {/* Display Multiple Quantity Tiers if available */}
                        {myBid.quantity_tiers && Array.isArray(myBid.quantity_tiers) && myBid.quantity_tiers.length > 0 && (
                          <div className="mt-2 mb-3 bg-indigo-50/70 dark:bg-indigo-950/40 p-2.5 rounded-xl border border-indigo-100 dark:border-indigo-900/50 text-right">
                            <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 block mb-1">
                              شرائح الكميات والأسعار المعروضة ({myBid.quantity_tiers.length}):
                            </span>
                            <div className="space-y-1">
                              {myBid.quantity_tiers.map((t: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center text-xs text-gray-700 dark:text-gray-300">
                                  <span>{t.quantity} قطعة:</span>
                                  <span className="font-bold text-[#4f46e5] dark:text-indigo-400">
                                    {formatCurrency(t.cost_price || 0)} <span className="text-[10px] text-gray-400 font-normal">/قطعة</span>
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      <div className="flex justify-between text-sm mb-4">
                        <span className="text-gray-500 dark:text-gray-400">الدفعة المقدمة:</span>
                        <span className="font-bold bg-orange-100 text-orange-800 px-2 rounded">{myBid.advance_percentage}%</span>
                      </div>
                      
                      {req.status === 'cancelled' ? (<div className="text-gray-500 dark:text-gray-400 font-medium">تم إلغاء الطلب من التاجر.</div>) : myBid.status === 'accepted' ? (
                        <div className="bg-green-100 text-green-800 p-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm">
                          <CheckCircle2 size={18} />
                          تهانينا! تم قبول عرضك وتم دفع العربون
                        </div>
                      ) : isClosed || req.status === 'cancelled' ? (
                        <div className="bg-gray-200 text-gray-600 dark:text-gray-300 p-3 rounded-xl font-bold text-sm">
                          تم إغلاق الطلب وقبول عرض مورد آخر
                        </div>
                      ) : myBid.status === 'rejected' ? (
                        <div className="bg-red-100 text-red-800 p-3 rounded-xl font-bold text-sm mb-4">
                          مرفوض: تم رفض العرض أو الصفقة مع التاجر.
                        </div>
                      ) : myBid.negotiated_by === 'merchant' ? (
                        <div className="bg-orange-50 dark:bg-orange-950/30 text-orange-900 dark:text-orange-200 p-4 rounded-xl font-bold text-sm mb-4 border border-orange-200 dark:border-orange-800 space-y-3">
                          <div className="flex items-center justify-between pb-2 border-b border-orange-200/60 dark:border-orange-800/60">
                            <span className="flex items-center gap-1.5 text-orange-800 dark:text-orange-300 font-extrabold">
                              <DollarSign size={16} />
                              اقتراح تفاوض من التاجر
                            </span>
                            <span className="text-xs bg-orange-200/80 dark:bg-orange-900/60 text-orange-900 dark:text-orange-200 px-2 py-0.5 rounded-full font-bold">
                              عربون {myBid.advance_percentage}%
                            </span>
                          </div>

                          {/* Details about chosen tier if available */}
                          {myBid.selected_tier && (
                            <div className="bg-white dark:bg-gray-800 p-2.5 rounded-lg border border-orange-200/80 dark:border-orange-800 text-xs font-normal space-y-1.5">
                              <div className="font-bold text-gray-800 dark:text-gray-100 flex items-center justify-between">
                                <span>الشريحة التي اختارها التاجر:</span>
                                <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded font-bold">
                                  {myBid.selected_tier.quantity} قطعة
                                </span>
                              </div>
                              <div className="flex justify-between text-gray-500 dark:text-gray-400">
                                <span>سعرك الأصلي لهذه الشريحة:</span>
                                <span className="font-semibold text-gray-700 dark:text-gray-200">
                                  {formatCurrency(myBid.selected_tier.cost_price || 0)} / قطعة
                                </span>
                              </div>
                            </div>
                          )}

                          <div className="bg-orange-100/70 dark:bg-orange-900/40 p-2.5 rounded-lg text-xs space-y-1">
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-gray-700 dark:text-gray-300">السعر المقترح من التاجر:</span>
                              <strong className="text-orange-800 dark:text-orange-300 text-base">
                                {formatCurrency(myBid.negotiated_price || 0)} <span className="text-xs font-normal">/ قطعة</span>
                              </strong>
                            </div>
                            <div className="flex justify-between items-center text-gray-600 dark:text-gray-400 pt-1 border-t border-orange-200/40 dark:border-orange-800/40">
                              <span>الإجمالي المقترح:</span>
                              <strong className="text-gray-900 dark:text-gray-100 font-bold">
                                {formatCurrency((myBid.negotiated_price || 0) * (myBid.selected_tier?.quantity || req.quantity || 1))}
                              </strong>
                            </div>
                          </div>

                          {myBid.customer_reply && (
                            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-orange-200 dark:border-orange-800 text-gray-700 dark:text-gray-200 font-normal text-xs">
                              <strong className="text-gray-900 dark:text-gray-100 block mb-0.5">رسالة وملاحظة التاجر:</strong>
                              <p className="whitespace-pre-line">{myBid.customer_reply}</p>
                            </div>
                          )}

                          <div className="flex gap-2 pt-1">
                            <button 
                              onClick={() => handleAcceptProposedPrice(myBid, req)}
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-bold text-sm transition shadow-sm"
                            >
                              قبول السعر المقترح
                            </button>
                            <button 
                              onClick={() => handleRejectProposedPrice(myBid.id, req)}
                              className="flex-1 bg-white dark:bg-gray-800 text-red-600 border border-red-300 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950/30 py-2 rounded-lg font-bold text-sm transition shadow-sm"
                            >
                              رفض العرض
                            </button>
                          </div>
                        </div>
                      ) : myBid.negotiated_by === 'supplier_accepted' ? (
                        <div className="bg-green-100 text-green-800 p-3 rounded-xl font-bold text-sm mb-4">
                          تم قبول السعر المقترح، في انتظار التاجر لدفع العربون.
                        </div>
                      ) : myBid.negotiated_by === 'supplier_rejected' ? (
                        <div className="bg-red-100 text-red-800 p-3 rounded-xl font-bold text-sm mb-4">
                          قمت برفض السعر المقترح، في انتظار التاجر لقبول عرضك الأول أو إلغاء الصفقة.
                        </div>
                      ) : (
                        <div className="bg-yellow-100 text-yellow-800 p-3 rounded-xl font-bold text-sm mb-4">
                          قيد المراجعة من قبل التاجر
                        </div>
                      )}

                      {!isClosed && myBid.status === 'pending' && myBid.negotiated_by !== 'merchant' && myBid.negotiated_by !== 'supplier_accepted' && myBid.negotiated_by !== 'supplier_rejected' && (
                        <button 
                          onClick={() => handleOpenBidModal(req, myBid)}
                          className="w-full bg-white dark:bg-gray-800 text-blue-600 border border-blue-200 py-2 rounded-xl font-bold hover:bg-blue-50 transition shadow-sm"
                        >
                          تعديل العرض
                        </button>
                      )}


                    </div>
                  ) : isClosed ? (
                    <div className="text-gray-500 dark:text-gray-400 font-medium">الطلب مغلق. لم تقدم عرضاً عليه.</div>
                  ) : (
                    <div className="w-full flex flex-col gap-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">قدم عرض سعر تنافسي الآن للفوز بهذه الصفقة قبل إغلاقها.</p>
                      {!isVerifiedSupplier ? (
                        <div className="w-full bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 p-3.5 rounded-xl text-center space-y-2">
                          <div className="flex items-center justify-center gap-1.5 text-xs font-black text-amber-800 dark:text-amber-300">
                            <ShieldCheck size={16} />
                            <span>المناقصة تتطلب توثيق الحساب</span>
                          </div>
                          <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
                            تقديم عروض الأسعار متاح حصرياً للموردين المعتمدين والموثقين لضمان الالتزام وحماية التجار.
                          </p>
                          <button
                            onClick={() => setShowUnverifiedModal(true)}
                            className="w-full py-2.5 px-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:opacity-95 text-white text-xs font-black rounded-xl transition shadow-xs flex items-center justify-center gap-1.5"
                          >
                            <span>توثيق حسابي لدخول المناقصة 🛡️</span>
                          </button>
                        </div>
                      ) : user?.status === 'pending' ? (
                        <div className="w-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 py-3 rounded-xl font-bold text-center text-sm border border-gray-200 dark:border-gray-700">
                          تقديم العروض متاح للموردين المعتمدين فقط
                        </div>
                      ) : (
                        <>
                          <button 
                            onClick={() => handleOpenBidModal(req)}
                            className="w-full bg-[#4f46e5] text-white py-3 rounded-xl font-bold hover:bg-[#4338ca] transition shadow-sm"
                          >
                            تقديم عرض سعر
                          </button>
                          {!req.supplier_interests?.some((i: any) => i.supplier_id === user?.id) ? (
                            <button 
                              onClick={() => handleIndicateInterest(req)}
                              className="w-full bg-orange-50 text-orange-600 border border-orange-200 py-3 rounded-xl font-bold hover:bg-orange-100 transition shadow-sm"
                            >
                              جاري البحث عن المنتج والسعر (إعلام التاجر)
                            </button>
                          ) : (
                            <div className="w-full bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 py-2 rounded-xl text-center text-sm font-bold">
                              تم إعلام التاجر باهتمامك بالطلب
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {/* Show other suppliers' bids */}
                  {req.supplier_bids && req.supplier_bids.filter((b: any) => b.supplier_id !== user?.id).length > 0 && (
                    <div className="w-full mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                      <h4 className="font-bold text-gray-700 dark:text-gray-200 mb-3 text-sm text-right">عروض الموردين الآخرين ({req.supplier_bids.filter((b: any) => b.supplier_id !== user?.id).length})</h4>
                      <div className="space-y-3">
                        {req.supplier_bids.filter((b: any) => b.supplier_id !== user?.id).map((otherBid: any) => (
                          <div key={otherBid.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-right">
                            <div className="flex justify-between items-center mb-2 border-b border-gray-100 dark:border-gray-700 pb-2">
                              <span className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2 text-sm">
                                <Store size={14} className="text-gray-400" />
                                {otherBid.supplier?.name || 'مورد'}
                              </span>
                              <SupplierBadge 
                                supplierId={otherBid.supplier_id}
                                name={otherBid.supplier?.name}
                                companyName={otherBid.supplier?.company_name}
                                tier={otherBid.supplier?.verification_badge}
                                size="xs" 
                                rating={otherBid.supplier?.average_rating} 
                                totalReviews={otherBid.supplier?.total_reviews}
                              />
                            </div>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs text-gray-500 dark:text-gray-400">سعر القطعة (الخام):</span>
                              <span className="font-bold text-sm">{formatCurrency((otherBid.cost_price || otherBid.price) / (req.quantity || 1))}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-500 dark:text-gray-400">السعر الإجمالي الخام (بنسبة عربون {otherBid.advance_percentage}%):</span>
                              <span className="font-bold text-sm text-[#4f46e5]">{formatCurrency(otherBid.cost_price || otherBid.price)}</span>
                            </div>
                            {otherBid.quantity_tiers && Array.isArray(otherBid.quantity_tiers) && otherBid.quantity_tiers.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700/60 text-xs">
                                <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 block mb-1">الشرائح المقدمة ({otherBid.quantity_tiers.length}):</span>
                                <div className="flex flex-wrap gap-1">
                                  {otherBid.quantity_tiers.map((t: any, idx: number) => (
                                    <span key={idx} className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-2 py-0.5 rounded text-[11px] font-medium">
                                      {t.quantity} ق: {formatCurrency(t.cost_price)}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {(otherBid.negotiated_by === 'merchant' || otherBid.negotiated_by === 'supplier_accepted' || otherBid.negotiated_by === 'supplier_rejected') && (
                              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 bg-orange-50/50 p-2 rounded-lg">
                                <p className="text-xs font-bold text-orange-800 mb-1">تفاوض التاجر مع هذا المورد:</p>
                                <p className="text-xs text-gray-700 dark:text-gray-200">اقترح التاجر: <strong>{formatCurrency(otherBid.negotiated_price || (otherBid.cost_price / (req.quantity || 1)) || 0)}</strong> (بنسبة عربون: <strong>{otherBid.advance_percentage}%</strong>)</p>
                                {otherBid.customer_reply && (
                                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 italic">"{otherBid.customer_reply}"</p>
                                )}
                                {otherBid.negotiated_by === 'supplier_accepted' && <p className="text-[10px] text-green-600 font-bold mt-1">قبل المورد السعر</p>}
                                {otherBid.negotiated_by === 'supplier_rejected' && <p className="text-[10px] text-red-600 font-bold mt-1">رفض المورد السعر</p>}
                                {otherBid.negotiated_by === 'merchant' && <p className="text-[10px] text-orange-600 font-bold mt-1">في انتظار رد المورد</p>}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                </div>
                
                {/* Footer for Merchant Details */}
                <div className="bg-blue-50/30 border-t border-gray-100 dark:border-gray-700 p-4 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8 flex-wrap">
                  <div className="flex items-center gap-2 text-gray-800 dark:text-gray-100">
                    <Store size={18} className="text-[#4f46e5]" />
                    <span className="font-bold text-sm">{req.merchant?.company_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                    <User size={18} className="text-gray-400" />
                    <span className="text-sm font-medium">{req.merchant?.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                    <MapPin size={18} className="text-gray-400" />
                    <span className="text-sm font-medium">{req.merchant?.address || 'غير متوفر'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                    <Phone size={18} className="text-gray-400" />
                    <span className="text-sm font-medium" dir="ltr">{req.merchant?.phone || 'غير متوفر'}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bid Modal */}
      {biddingRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col relative overflow-hidden">
            <div className="p-6 overflow-y-auto w-full">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{bidForm.id ? 'تعديل عرض السعر' : 'تقديم عرض سعر'}</h2>
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl mb-4 text-sm text-blue-800">
                <strong>ملاحظة هامة:</strong> يرجى إدخال السعر بالدينار (DZD). سيتم تحويله تلقائياً للدولار عند الحاجة.
                <br/><br/>
                <strong>توضيح بخصوص الأرباح:</strong> أرباح المنصة هي 10% من سعر البيع. وعلى هذا الأساس، أي سعر تدخله هنا سيتم إضافة 10% عليه ليظهر للتاجر (حق المنصة).
              </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 border-b pb-4">{biddingRequest.title}</p>
            
            <form onSubmit={handleSubmitBid} className="space-y-4">
              {/* Multi-tier Quantity and Pricing Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-bold text-gray-800 dark:text-gray-100">
                    شرائح الكميات والأسعار:
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const lastTier = bidForm.tiers[bidForm.tiers.length - 1];
                      const nextQty = lastTier && lastTier.quantity > 0 ? Math.round(lastTier.quantity * 2) : 200;
                      setBidForm({
                        ...bidForm,
                        tiers: [...bidForm.tiers, { quantity: nextQty, cost_price: 0 }]
                      });
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-[#4f46e5] dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-xl text-xs font-bold transition border border-indigo-200 dark:border-indigo-800 cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>إضافة شريحة كمية أخرى (+)</span>
                  </button>
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400">
                  مثال: 100 قطعة بـ 500 دج، 200 قطعة بـ 450 دج... يتيح ذلك للتاجر اختيار الكمية الأنسب لميزانيته.
                </p>

                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                  {bidForm.tiers.map((tier, idx) => {
                    const calc = tier.cost_price > 0 && tier.quantity > 0
                      ? calculateFinalPrice(tier.cost_price, tier.quantity, profitSettings)
                      : null;

                    return (
                      <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-900/70 border border-gray-200 dark:border-gray-700 rounded-xl space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-gray-700 dark:text-gray-200">
                          <span className="flex items-center gap-1">
                            <Layers size={13} className="text-[#4f46e5]" />
                            الشريحة #{idx + 1}
                          </span>
                          {bidForm.tiers.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const updated = bidForm.tiers.filter((_, i) => i !== idx);
                                setBidForm({ ...bidForm, tiers: updated });
                              }}
                              className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition"
                              title="حذف هذه الشريحة"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1">الكمية (قطعة)</label>
                            <input
                              type="number"
                              min="1"
                              required
                              value={tier.quantity || ''}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10) || 0;
                                const newTiers = [...bidForm.tiers];
                                newTiers[idx].quantity = val;
                                setBidForm({ ...bidForm, tiers: newTiers });
                              }}
                              className="w-full p-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                              placeholder="مثال: 100"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1">سعرك الخام للقطعة (DZD)</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0.01"
                              required
                              value={tier.cost_price || ''}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                const newTiers = [...bidForm.tiers];
                                newTiers[idx].cost_price = val;
                                setBidForm({ ...bidForm, tiers: newTiers });
                              }}
                              className="w-full p-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                              placeholder="مثال: 500"
                            />
                          </div>
                        </div>

                        {calc && (
                          <div className="pt-2 border-t border-gray-200 dark:border-gray-700/80 flex items-center justify-between text-xs">
                            <span className="text-gray-500 dark:text-gray-400">
                              سعر التاجر: <strong className="text-[#4f46e5] font-bold">{formatCurrency(calc.finalItemPrice)}</strong>/قطعة
                            </span>
                            <span className="text-gray-800 dark:text-gray-100 font-bold">
                              الإجمالي: {formatCurrency(calc.finalTotal)}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              

              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">نسبة الدفعة المقدمة (عربون) %</label>
                <input 
                  type="number" required min="0" max="100"
                  value={bidForm.advance_percentage} 
                  onChange={e => setBidForm({...bidForm, advance_percentage: parseInt(e.target.value)})}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-[#4f46e5] focus:border-[#4f46e5] bg-gray-50 dark:bg-gray-900"
                />
                <p className="text-xs text-gray-400 mt-1">يُدفع هذا العربون فور قبول عرضك عبر بوابة Chargily.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">ملاحظات إضافية للتاجر</label>
                <textarea 
                  rows={3} 
                  value={bidForm.notes} 
                  onChange={e => setBidForm({...bidForm, notes: e.target.value})}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-[#4f46e5] focus:border-[#4f46e5] bg-gray-50 dark:bg-gray-900"
                  placeholder="مثال: متوفر بجميع الألوان، مدة الشحن 5 أيام..."
                />
              </div>



              <div className="pt-4 flex gap-4">
                <button type="submit" disabled={submitting} className="flex-1 bg-[#4f46e5] text-white py-3 rounded-xl font-bold hover:bg-[#4338ca] transition disabled:opacity-50">
                  {submitting ? 'جاري الإرسال...' : 'تأكيد العرض'}
                </button>
                <button type="button" onClick={() => setBiddingRequest(null)} className="px-6 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 py-3 rounded-xl font-bold hover:bg-gray-200 transition">
                  إلغاء
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      {/* Unverified Supplier Warning Modal */}
      {showUnverifiedModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 border border-gray-100 dark:border-gray-700 shadow-2xl space-y-4 animate-in fade-in duration-200 text-center">
            <div className="w-14 h-14 bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mx-auto">
              <ShieldCheck size={32} />
            </div>
            <h3 className="text-lg font-black text-gray-900 dark:text-white">
              توثيق الحساب مطلوب للمشاركة في المناقصات
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              لضمان سلامة التعاملات وجودة المنتجات للتاجر، يُشترط أن يكون المورد موثقاً ومعتمداً من قبل إدارة منصة جيبها لتقديم عروض الأسعار والتنافس في المناقصات.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
              <a
                href="/supplier/verification"
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition shadow-xs text-center"
              >
                الذهاب لصفحة توثيق الحساب الآن 🛡️
              </a>
              <button
                type="button"
                onClick={() => setShowUnverifiedModal(false)}
                className="w-full sm:w-auto py-2.5 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-xl transition"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tender App Download Modal */}
      <TenderAppPromptModal
        isOpen={showTenderAppPrompt}
        onClose={() => setShowTenderAppPrompt(false)}
      />
      </div>
    </DashboardLayout>
  );
}
