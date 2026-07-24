import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LayoutDashboard, Store, Package, CreditCard, Plus, Clock, BadgeCheck, CheckCircle2, XCircle, Link as LinkIcon, Image as ImageIcon, Upload, Wallet, Trash2, MessageCircle, Edit, Heart } from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { sendNotification } from '../../store/useNotificationStore';
import { createChargilyCheckout } from '../../lib/chargily';
import toast from 'react-hot-toast';
import OrderProgressBar from '../../components/OrderProgressBar';
import TermsOfUseModal from '../../components/TermsOfUseModal';
import CountdownCircle from '../../components/CountdownCircle';

export default function MerchantOrders() {
  const { user } = useAuthStore();
  const { formatCurrency, minQuantity, exchangeRate } = useSettingsStore();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);

  const [showNegotiationModal, setShowNegotiationModal] = useState(false);
  const [negotiationBid, setNegotiationBid] = useState<any>(null);
  const [negotiatedPrice, setNegotiatedPrice] = useState<number>(0);
  const [negotiating, setNegotiating] = useState(false);
  const [cancellingDealId, setCancellingDealId] = useState<string | null>(null);

  const closeModal = () => {
    setShowModal(false);
    setEditingRequestId(null);
    setFormData({ title: '', description: '', quantity: minQuantity, image_url: '', product_link: '', notes: '' });
    setImageFile(null);
  };
  
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showTosModal, setShowTosModal] = useState(false);
  const [pendingPaymentData, setPendingPaymentData] = useState<any>(null);
  const [selectedBidForPayment, setSelectedBidForPayment] = useState<any>(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [isProcessingWalletPayment, setIsProcessingWalletPayment] = useState(false);


  const [formData, setFormData] = useState({ 
    title: '', 
    description: '', 
    quantity: minQuantity, 
    image_url: '',
    product_link: '',
    notes: ''
  });

  const [paymentNotification, setPaymentNotification] = useState<{ type: 'success' | 'failure', message: string } | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    // Check for payment callback status
    const pStatus = searchParams.get('payment');
    const pSupplierId = searchParams.get('supplier_id');
    const pType = searchParams.get('type');
    
    if (pStatus && user) {
      if (pStatus === 'success') {
        setPaymentNotification({ type: 'success', message: '✅ تمت عملية الدفع بنجاح! سيتم تأكيد طلبك قريباً.' });
        // Notifications and referral commissions have been moved to the Chargily webhook
        // to ensure they trigger even if the user closes the window.

      } else if (pStatus === 'failure') {
        setPaymentNotification({ type: 'failure', message: '❌ لم تكتمل عملية الدفع، أو قمت بإلغائها.' });
        if (pSupplierId && user) {
          const paymentDesc = pType === 'remaining' ? 'المبلغ المتبقي' : 'العربون';
          sendNotification(pSupplierId, 'فشل الدفع', `فشلت عملية الدفع من التاجر ${user.name} للطلب.`, 'warning');
          sendNotification(user.id, 'فشل الدفع', `لم تكتمل عملية الدفع الخاصة بـ ${paymentDesc}.`, 'error');
        }
      }
      searchParams.delete('payment');
      setSearchParams(searchParams);
      
      // Auto dismiss after 10 seconds
      setTimeout(() => setPaymentNotification(null), 10000);
    }
  }, [user, searchParams, setSearchParams]);

  useEffect(() => {
    if (user) {
      fetchRequests();
      fetchWalletBalance();
    }
    
    const handleRefresh = () => {
      if (user) {
        fetchRequests();
        fetchWalletBalance();
      }
    };
    window.addEventListener('refresh_data', handleRefresh);
    return () => window.removeEventListener('refresh_data', handleRefresh);
  }, [user]);

  const fetchWalletBalance = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.from('users').select('wallet_balance').eq('id', user.id).single();
      if (data && !error) {
        setWalletBalance(data.wallet_balance || 0);
      }
    } catch (error) {
      console.error('Wallet fetch error', error);
    }
  };


  const fetchRequests = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('custom_requests')
        .select(`
          id, title, description, quantity, image_url, product_link, notes, status, request_type, created_at, merchant_id, coupon_id,
          supplier_bids (
            id, supplier_id, price, cost_price, advance_percentage, notes, status, shipping_status, created_at, deposit_paid_at, is_fully_paid, allow_negotiation, negotiated_price, negotiated_by,
            supplier:users(name, company_name, phone, verification_badge)
          )
        `)
        .eq('merchant_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.product_link) {
      toast.error('يجب إدخال رابط المنتج.');
      return;
    }

    if (formData.quantity < minQuantity) {
      toast(`الحد الأدنى للكمية المسموح بها هو ${minQuantity} وحدة.`, { icon: 'ℹ️' });
      return;
    }

    setCreating(true);
    try {
      let finalImageUrl = formData.image_url;

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('products')
          .upload(filePath, imageFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('products')
          .getPublicUrl(filePath);

        finalImageUrl = publicUrl;
      }

      const requestData = {
        title: formData.title,
        description: formData.description,
        quantity: formData.quantity,
        image_url: finalImageUrl || null,
        product_link: formData.product_link || null,
        notes: formData.notes || null,
      };

      if (editingRequestId) {
        const { error } = await supabase.from('custom_requests').update(requestData).eq('id', editingRequestId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('custom_requests').insert({
          merchant_id: user.id,
          ...requestData
        });
        if (error) throw error;
        // Notify suppliers and admins
        sendNotification('all_suppliers', 'مناقصة جديدة', `تم طرح مناقصة جديدة: ${formData.title} بكمية ${formData.quantity}`, 'info');
        sendNotification('all_admins', 'مناقصة جديدة', `قام التاجر ${user.name} بطرح مناقصة جديدة: ${formData.title}`, 'info');
      }
      closeModal();
      fetchRequests();
    } catch (error) {
      console.error(error);
      toast.error(editingRequestId ? 'حدث خطأ أثناء تعديل الطلب' : 'حدث خطأ أثناء إنشاء الطلب');
    } finally {
      setCreating(false);
    }
  };

  const handleEditRequest = (req: any) => {
    setEditingRequestId(req.id);
    setFormData({
      title: req.title,
      description: req.description,
      quantity: req.quantity,
      image_url: req.image_url || '',
      product_link: req.product_link || '',
      notes: req.notes || ''
    });
    setImageFile(null);
    setShowModal(true);
  };

  const handleDeleteRequest = async (reqId: string) => {
    if (!window.confirm('هل أنت متأكد من رغبتك في حذف هذا الطلب من السجل؟ لا يمكن التراجع عن هذه الخطوة.')) return;
    try {
      const { error } = await supabase.from('custom_requests').delete().eq('id', reqId);
      if (error) throw error;
      setRequests(requests.filter(r => r.id !== reqId));
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء محاولة حذف الطلب. يرجى التأكد من الصلاحيات.');
    }
  };

  const [paymentType, setPaymentType] = useState<'advance' | 'remaining'>('advance');
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponDiscountAmount, setCouponDiscountAmount] = useState(0);
  const [existingCouponId, setExistingCouponId] = useState<string | null>(null);

  const openPaymentModal = (bid: any, reqId: string, type: 'advance' | 'remaining' = 'advance', existingCoupon: string | null = null) => {
    const currentUser = useAuthStore.getState().user;
    if (!currentUser?.has_accepted_tos) {
      setPendingPaymentData({ bid, reqId, type, existingCoupon });
      setShowTosModal(true);
      return;
    }
    
    setSelectedBidForPayment({ ...bid, reqId });
    setPaymentType(type);
    setExistingCouponId(existingCoupon);
    setCouponCode('');
    setCouponError(null);
    setAppliedCoupon(null);
    setCouponDiscountAmount(0);
    setShowPaymentModal(true);
  };

  const handleTosAccepted = () => {
    setShowTosModal(false);
    if (pendingPaymentData) {
      openPaymentModal(
        pendingPaymentData.bid, 
        pendingPaymentData.reqId, 
        pendingPaymentData.type, 
        pendingPaymentData.existingCoupon
      );
      setPendingPaymentData(null);
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    try {
      const { data, error } = await supabase.from('coupons').select('*').eq('code', couponCode.toUpperCase()).eq('is_active', true).single();
      if (error || !data) {
        setCouponError('كود الكوبون غير صحيح أو غير مفعل');
        setAppliedCoupon(null);
        setCouponDiscountAmount(0);
        return;
      }
      
      const req = requests.find(r => r.id === selectedBidForPayment.reqId);
      const quantity = req?.quantity || 1;
      const { data: settings } = await supabase.from('platform_settings').select('profit_fixed_amount, profit_percentage').single();
      const fixedAmount = settings?.profit_fixed_amount ?? 100;
      const percentage = settings?.profit_percentage ?? 5;
      
      const price = selectedBidForPayment.price;
      const platformProfit = (quantity * fixedAmount) + (price * (percentage / 100));
      
      const discount = platformProfit * (data.discount_percentage / 100);
      
      setAppliedCoupon(data);
      setCouponDiscountAmount(discount);
      setCouponError(null);
    } catch (error) {
      setCouponError('حدث خطأ أثناء التحقق من الكوبون');
    }
  };

  const handleWalletPayment = async () => {
    if (!selectedBidForPayment || !user || isProcessingWalletPayment) return;
    setIsProcessingWalletPayment(true);
    
    let amountToPay = 0;
    if (paymentType === 'advance') {
      amountToPay = (selectedBidForPayment.price * (selectedBidForPayment.advance_percentage / 100)) - couponDiscountAmount;
    } else {
      amountToPay = selectedBidForPayment.price - (selectedBidForPayment.price * (selectedBidForPayment.advance_percentage / 100)) - couponDiscountAmount;
    }

    const amountToPayUSD = amountToPay / exchangeRate;

    if (walletBalance < amountToPayUSD) {
      toast.error('رصيد المحفظة غير كافٍ. يرجى شحن الرصيد أولاً من صفحة المحفظة.');
      setIsProcessingWalletPayment(false);
      return;
    }

    try {
      const { error: walletError } = await supabase.from('wallet_transactions').insert({
        merchant_id: user.id,
        amount: amountToPayUSD,
        type: 'payment',
        reference_id: selectedBidForPayment.id,
        description: paymentType === 'advance' ? 'دفع عربون طلب' : 'دفع المبلغ المتبقي لطلب'
      });
      if (walletError) throw walletError;

      if (paymentType === 'advance') {
        await supabase.from('supplier_bids').update({ status: 'accepted' }).eq('id', selectedBidForPayment.id);
        const requestUpdate: any = { status: 'closed' };
        await supabase.from('custom_requests').update(requestUpdate).eq('id', selectedBidForPayment.reqId);
        await supabase.rpc('grant_loyalty_points', { p_user_id: user.id });
        sendNotification(selectedBidForPayment.supplier_id, 'قبول العرض ودفع العربون', `قام التاجر ${user.name} بقبول عرضك ودفع العربون لطلبك`, 'success');
        sendNotification(user.id, 'تم الدفع بنجاح', `تم دفع العربون وقبول عرض المورد من محفظتك لطلبك`, 'success');
        sendNotification('all_admins', 'عملية دفع جديدة', `قام التاجر ${user.name} بدفع العربون لطلب من المحفظة`, 'info');
      } else {
        await supabase.from('supplier_bids').update({ is_fully_paid: true }).eq('id', selectedBidForPayment.id);
        sendNotification(selectedBidForPayment.supplier_id, 'دفع المبلغ المتبقي', `قام التاجر ${user.name} بدفع المبلغ المتبقي لطلبك`, 'success');
        sendNotification(user.id, 'تم الدفع بنجاح', `تم دفع المبلغ المتبقي للمورد من محفظتك لطلبك`, 'success');
        sendNotification('all_admins', 'عملية دفع جديدة', `قام التاجر ${user.name} بدفع المبلغ المتبقي لطلب من المحفظة`, 'info');
      }

      if (appliedCoupon) {
        await supabase.from('custom_requests').update({ coupon_id: appliedCoupon.id }).eq('id', selectedBidForPayment.reqId);
        const { error: rpcError } = await supabase.rpc('increment_coupon_usage', { p_coupon_id: appliedCoupon.id });
        if (rpcError) {
          const { data } = await supabase.from('coupons').select('usage_count').eq('id', appliedCoupon.id).single();
          if (data) {
            await supabase.from('coupons').update({ usage_count: data.usage_count + 1 }).eq('id', appliedCoupon.id);
          }
        }
      }

      // Commission Logic (Easiest Option: on successful wallet payment)
      if (user && user.referred_by && !user.has_made_first_order) {
        const commission = 2000;
        
        if (commission > 0) {
          await supabase.rpc('grant_referral_commission', {
            p_referrer_id: user.referred_by,
            p_referred_id: user.id,
            p_commission_amount: commission,
            p_description: `عمولة إحالة لطلب جديد بقيمة ${formatCurrency(commission)}`
          });
          sendNotification(user.referred_by, 'عمولة إحالة جديدة', `تهانينا! حصلت على عمولة إحالة بقيمة ${formatCurrency(commission)} لإتمام التاجر المدعو أول طلب له.`, 'success');
          useAuthStore.getState().setUser({ ...user, has_made_first_order: true });
        }
      }

      // Sync balance with the users table directly so the rest of the app sees the correct balance
      await supabase.from('users').update({ wallet_balance: walletBalance - amountToPay }).eq('id', user.id);
      useAuthStore.getState().setUser({ ...user, wallet_balance: walletBalance - amountToPay });

      toast.success(paymentType === 'advance' ? 'تم الدفع من المحفظة بنجاح!' : 'تم دفع المبلغ المتبقي من المحفظة بنجاح!');
      setShowPaymentModal(false);
      
      // Optimistic updates
      setWalletBalance(prev => prev - amountToPay);
      setRequests(requests.map(req => {
        if (req.id === selectedBidForPayment.reqId) {
          return {
            ...req,
            status: paymentType === 'advance' ? 'closed' : req.status,
            supplier_bids: req.supplier_bids?.map((bid: any) => 
              bid.id === selectedBidForPayment.id 
                ? { 
                    ...bid, 
                    status: paymentType === 'advance' ? 'accepted' : bid.status, 
                    is_fully_paid: paymentType === 'remaining' ? true : bid.is_fully_paid,
                    deposit_paid_at: paymentType === 'advance' ? new Date().toISOString() : bid.deposit_paid_at
                  } 
                : bid
            )
          };
        }
        return req;
      }));
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء الدفع من المحفظة.');
    } finally {
      setIsProcessingWalletPayment(false);
    }
  };

  const handleChargilyPayment = async () => {
    if (!selectedBidForPayment) return;
    try {
      let amountToPay = 0;
      if (paymentType === 'advance') {
        amountToPay = (selectedBidForPayment.price * (selectedBidForPayment.advance_percentage / 100)) - couponDiscountAmount;
      } else {
        amountToPay = selectedBidForPayment.price - (selectedBidForPayment.price * (selectedBidForPayment.advance_percentage / 100)) - couponDiscountAmount;
      }
      
      const amountInDzd = Math.round(amountToPay);

      const checkoutUrl = await createChargilyCheckout(
        amountInDzd > 0 ? amountInDzd : 100, 
        window.location.origin + `/merchant/orders?payment=success&supplier_id=${selectedBidForPayment.supplier_id}&type=${paymentType}&bid_price=${selectedBidForPayment.price}&bid_cost=${selectedBidForPayment.cost_price || 0}`,
        window.location.origin + `/merchant/orders?payment=failure&supplier_id=${selectedBidForPayment.supplier_id}&type=${paymentType}`,
        { bid_id: selectedBidForPayment.id, request_id: selectedBidForPayment.reqId, payment_type: paymentType, coupon_id: appliedCoupon ? appliedCoupon.id : null },
        { 
          name: (user && (user.name || user.company_name)) ? (user.name || user.company_name || '') : 'زبون منصة جيبها-jiibha', 
          email: (user && user.email) ? user.email : 'customer@isttirad.com', 
          phone: (user && user.phone) ? user.phone : undefined 
        }
      );

      window.location.href = checkoutUrl;
      
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء معالجة القبول والدفع');
    }
  };

  const handleCancelDeal = async (bidId: string) => {
    if (!window.confirm('هل أنت متأكد من رغبتك في إلغاء هذه الصفقة؟ سيتم استرجاع العربون إلى محفظتك.')) return;
    setCancellingDealId(bidId);
    try {
      // 1. Get bid info
      const { data: bidData, error: bidError } = await supabase.from('supplier_bids').select('*, custom_requests(merchant_id, request_type)').eq('id', bidId).single();
      if (bidError || !bidData) throw new Error('Bid not found');

      if (bidData.status === 'cancelled') {
        if (bidData.request_id) {
          const isDirect = bidData.custom_requests?.request_type === 'direct';
          await supabase.from('custom_requests').update({ status: isDirect ? 'cancelled' : 'open' }).eq('id', bidData.request_id);
        }
        toast.error('هذه الصفقة ملغاة بالفعل');
        setCancellingDealId(null);
        fetchRequests();
        return;
      }

      const depositAmount = (bidData.price * bidData.advance_percentage) / 100;

      // 2. Update bid and request status
      const { error: bidUpdateError } = await supabase.from('supplier_bids').update({ status: 'cancelled' }).eq('id', bidId);
      if (bidUpdateError) throw bidUpdateError;
      
      if (bidData.request_id) {
        const isDirect = bidData.custom_requests?.request_type === 'direct';
        const { error: reqUpdateError } = await supabase.from('custom_requests').update({ status: isDirect ? 'cancelled' : 'open' }).eq('id', bidData.request_id);
        if (reqUpdateError) throw reqUpdateError;
      }

      // 3. Refund the merchant's wallet
      await supabase.from('wallet_transactions').insert({
        merchant_id: user?.id,
        amount: depositAmount,
        type: 'refund',
        description: 'استرجاع العربون لإلغاء الصفقة خلال 24 ساعة'
      });
      await supabase.from('users').update({
        wallet_balance: walletBalance + depositAmount
      }).eq('id', user?.id);

      // Notify
      sendNotification(bidData.supplier_id, 'إلغاء صفقة', `قام التاجر ${user?.name} بإلغاء الصفقة.`, 'error');

      toast.success('تم إلغاء الصفقة واسترجاع العربون بنجاح');
      fetchRequests();
      fetchWalletBalance();
    } catch (err) {
      console.error(err);
      toast.error('حدث خطأ أثناء إلغاء الصفقة');
    } finally {
      setCancellingDealId(null);
    }
  };

  const handleRejectBid = async (bidId: string, supplierId: string) => {
    try {
      const { error } = await supabase.from('supplier_bids').update({ status: 'rejected' }).eq('id', bidId);
      if (error) throw error;
      sendNotification(supplierId, 'تم رفض العرض', `تم رفض عرضك من قبل التاجر.`, 'info');
      toast.success('تم رفض العرض بنجاح');
      fetchRequests();
    } catch (error) {
      toast.error('حدث خطأ أثناء رفض العرض');
    }
  };

  const handleProposePriceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!negotiationBid || negotiatedPrice <= 0) return;
    setNegotiating(true);
    try {
      // Negotiated price is per unit
      const { error } = await supabase.from('supplier_bids').update({
        negotiated_price: negotiatedPrice,
        negotiated_by: 'merchant'
      }).eq('id', negotiationBid.id);

      if (error) throw error;
      sendNotification(negotiationBid.supplier_id, 'اقتراح سعر جديد', `قام التاجر ${user?.name || ''} باقتراح سعر جديد لعرضك: ${formatCurrency(negotiatedPrice)} للقطعة الواحدة.`, 'info');
      toast.success('تم إرسال السعر المقترح بنجاح');
      setShowNegotiationModal(false);
      setNegotiationBid(null);
      setNegotiatedPrice(0);
      fetchRequests();
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء إرسال السعر المقترح');
    } finally {
      setNegotiating(false);
    }
  };

  const [activeTab, setActiveTab] = useState<'custom' | 'direct'>('direct');

  const customRequests = requests.filter(req => req.request_type !== 'direct');
  const directOrders = requests.filter(req => req.request_type === 'direct');

  return (
    <DashboardLayout
      title="طلباتي والمناقصات"
      sidebarLinks={[
        { label: 'الرئيسية', href: '/merchant', icon: <LayoutDashboard size={20} /> },
        { label: 'تصفح المنتجات', href: '/merchant/marketplace', icon: <Store size={20} /> },
        { label: 'طلباتي', href: '/merchant/orders', icon: <Package size={20} /> },
        { label: 'المحفظة', href: '/merchant/wallet', icon: <CreditCard size={20} /> },
        { label: 'المفضلة', href: '/merchant/wishlist', icon: <Heart size={20} /> },
      ]}
    >
      {paymentNotification && (
        <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 shadow-sm border ${
          paymentNotification.type === 'success' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          {paymentNotification.type === 'success' ? <CheckCircle2 size={24} className="text-green-600 flex-shrink-0" /> : <XCircle size={24} className="text-red-600 flex-shrink-0" />}
          <p className="font-bold">{paymentNotification.message}</p>
          <button onClick={() => setPaymentNotification(null)} className={`mr-auto transition ${paymentNotification.type === 'success' ? 'text-green-500 hover:text-green-700' : 'text-red-500 hover:text-red-700'}`}>
            <XCircle size={20} />
          </button>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">إدارة الطلبات</h2>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-[#4f46e5] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#4338ca] transition"
        >
          <Plus size={20} />
          إنشاء مناقصة جديدة
        </button>
      </div>

      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('direct')}
          className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors ${
            activeTab === 'direct' ? 'border-[#4f46e5] text-[#4f46e5]' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          الطلبات المباشرة
        </button>
        <button
          onClick={() => setActiveTab('custom')}
          className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors ${
            activeTab === 'custom' ? 'border-[#4f46e5] text-[#4f46e5]' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          المناقصات المفتوحة
        </button>
      </div>

      <div className="space-y-6">
        {loading ? (
          <div className="text-center py-12 text-gray-500">جاري التحميل...</div>
        ) : activeTab === 'direct' ? (
          directOrders.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl shadow-sm border border-gray-100 text-center">
              <Package size={48} className="mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-bold text-gray-800 mb-2">لا توجد طلبات مباشرة</h3>
              <p className="text-gray-500">تصفح سوق المنتجات واطلب مباشرة من الموردين.</p>
            </div>
          ) : (
            directOrders.map(req => {
              const bid = req.supplier_bids?.[0]; // Direct orders only have 1 bid
              return (
                <div key={req.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-6 border-b border-gray-100 bg-gray-50 flex flex-col md:flex-row justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-lg text-gray-900">{req.title.replace('طلب مباشر: ', '')}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${req.status === 'cancelled' ? 'bg-red-100 text-red-700' : req.status === 'open' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                          {req.status === 'cancelled' ? 'ملغاة' : req.status === 'open' ? 'في انتظار الدفع' : (bid?.shipping_status === 'delivered' ? 'تمت الإجراءات وانتهت المعاملة' : (bid?.is_fully_paid ? 'تم دفع المبلغ كاملا' : 'تم دفع العربون'))}
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm mb-4">{req.description}</p>
                      
                      <div className="flex flex-wrap items-center gap-4 text-sm bg-white p-3 rounded-xl border border-gray-100 w-full sm:w-max">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">السعر الإجمالي:</span>
                          <span className="font-bold text-lg text-[#4f46e5]">{formatCurrency(bid?.price || 0)}</span>
                        </div>
                        <div className="w-px h-6 bg-gray-200"></div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">الكمية:</span>
                          <span className="font-bold">{req.quantity}</span>
                        </div>
                        <div className="w-px h-6 bg-gray-200"></div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">المورد:</span>
                          <span className="font-bold">{bid?.supplier?.company_name || 'غير معروف'}</span>
                        </div>
                      </div>
                    </div>
                    {req.image_url && (
                      <div className="w-24 h-24 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0 bg-white p-1">
                        <img src={req.image_url} alt="صورة المنتج" className="w-full h-full object-cover" />
                      </div>
                    )}
                    {(req.status === 'open' || (bid?.shipping_status === 'delivered' && bid?.is_fully_paid)) && (
                      <button 
                        onClick={() => handleDeleteRequest(req.id)}
                        className="text-gray-400 hover:text-red-600 transition p-2 bg-white rounded-lg border border-gray-100 shadow-sm"
                        title="حذف الطلب"
                      >
                        <Trash2 size={20} />
                      </button>
                    )}
                  </div>
                  
                  {req.status === 'open' && bid && bid.status === 'pending' && (
                    <div className="p-4 bg-white border-t border-gray-100 flex justify-between items-center">
                      <div>
                        <p className="text-sm text-gray-500">العربون المطلوب ({bid.advance_percentage}%):</p>
                        <p className="font-black text-xl text-red-600">
                          {formatCurrency((bid.price * bid.advance_percentage) / 100)}
                        </p>
                      </div>
                      <button 
                        onClick={() => openPaymentModal(bid, req.id, 'advance', req.coupon_id)}
                        className="bg-[#4f46e5] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#4338ca] transition shadow-sm"
                      >
                        دفع العربون
                      </button>
                    </div>
                  )}
                  {req.status === 'closed' && (
                    <div className="p-4 bg-green-50 border-t border-green-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-green-800 font-bold">
                          <CheckCircle2 size={20} />
                          {bid?.shipping_status === 'delivered' ? 'تمت الإجراءات وانتهت المعاملة' : (bid?.is_fully_paid ? 'تم دفع المبلغ كاملا في انتظار إتمام الإجراءات' : 'تم تأكيد الطلب ودفع العربون بنجاح. تواصل مع المورد لاستكمال الإجراءات.')}
                        </div>
                        {bid && (
                          <>
                            {bid.deposit_paid_at ? (
                              <CountdownCircle 
                                depositPaidAt={bid.deposit_paid_at} 
                                onCancel={() => handleCancelDeal(bid.id)}
                                cancelling={cancellingDealId === bid.id}
                              />
                            ) : (
                              <div className="bg-red-50 p-4 rounded-xl mt-2 border border-red-200">
                                <p className="text-red-700 text-sm mb-2 font-bold">لم يتم تسجيل وقت دفع العربون في النظام (ربما بسبب دفعه قبل التحديث).</p>
                                <button 
                                  onClick={async () => {
                                    await supabase.from('supplier_bids').update({ deposit_paid_at: new Date().toISOString() }).eq('id', bid.id);
                                    window.location.reload();
                                  }}
                                  className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-700"
                                >
                                  إصلاح وتفعيل العداد الآن
                                </button>
                              </div>
                            )}
                            <div className={`flex flex-col gap-2 text-sm bg-white p-3 rounded-lg shadow-sm border w-full sm:w-max mt-2 ${bid.is_fully_paid || bid.shipping_status === 'delivered' ? 'border-green-100' : 'border-red-100'}`}>
                            <div className="flex justify-between items-center gap-4">
                              <span className="text-gray-600 font-medium">المبلغ المتبقي:</span>
                              <span className={`font-bold ${bid.is_fully_paid || bid.shipping_status === 'delivered' ? 'text-green-600' : 'text-red-600'}`}>
                                {bid.is_fully_paid || bid.shipping_status === 'delivered' ? formatCurrency(0) : formatCurrency(bid.price - (bid.price * bid.advance_percentage / 100))}
                              </span>
                            </div>
                            {(!bid.is_fully_paid && bid.shipping_status !== 'delivered') && (
                              <button 
                                onClick={() => openPaymentModal(bid, req.id, 'remaining', req.coupon_id)}
                                className="mt-1 bg-[#4f46e5] text-white py-1.5 px-3 rounded-md font-bold text-xs hover:bg-[#4338ca] w-full text-center"
                              >
                                دفع المتبقي
                              </button>
                            )}
                          </div>
                          </>
                        )}
                      </div>
                      
                      {bid && bid.shipping_status && (
                        <div className="flex flex-col sm:flex-row gap-3 items-center">
                          <a 
                            href={`https://wa.me/${bid.supplier?.phone || '+213000000000'}?text=${encodeURIComponent(`مرحباً، أتواصل معك بخصوص الطلب المباشر رقم: ${req.id}`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-green-700 transition w-full sm:w-auto justify-center"
                          >
                            <MessageCircle size={18} />
                            تواصل مع المورد (واتساب)
                          </a>
                          <div className="flex items-center gap-2 text-sm bg-white px-4 py-2 rounded-lg shadow-sm border border-green-100 w-full sm:w-auto justify-center">
                            <div className="w-full">
                              <OrderProgressBar bidId={bid.id} currentStatus={bid.shipping_status || 'pending_in_china'} />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )
        ) : (
          customRequests.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl shadow-sm border border-gray-100 text-center">
              <Package size={48} className="mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-bold text-gray-800 mb-2">لا توجد مناقصات بعد</h3>
              <p className="text-gray-500">قم بإنشاء طلب استيراد جديد ليتنافس عليه الموردون.</p>
            </div>
          ) : (
            customRequests.map(req => (
              <div key={req.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50 flex flex-col md:flex-row justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-lg text-gray-900">{req.title}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${req.status === 'open' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                        {req.status === 'open' ? 'مفتوح للعروض' : (req.supplier_bids?.some((b:any) => b.shipping_status === 'delivered') ? 'تم دفع المبلغ كاملا' : 'مغلق (تمت الصفقة)')}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mb-2">{req.description}</p>
                    {req.notes && (
                      <p className="text-gray-500 text-xs mb-3 italic">ملاحظات: {req.notes}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <span className="font-bold text-[#4f46e5] bg-green-50 px-2 py-1 rounded">الكمية: {req.quantity} وحدة</span>
                      {req.product_link && (
                        <a href={req.product_link} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline">
                          <LinkIcon size={14} /> رابط المنتج
                        </a>
                      )}
                    </div>
                  </div>
                  {req.image_url && (
                    <div className="w-24 h-24 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0 bg-white p-1">
                      <img src={req.image_url} alt="صورة توضيحية" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex flex-col items-end justify-between md:ml-auto">
                    {(req.status === 'open' || req.supplier_bids?.some((b:any) => b.shipping_status === 'delivered' && b.is_fully_paid)) && (
                      <div className="flex gap-2 mb-2">
                        {req.status === 'open' && (
                          <button 
                            onClick={() => handleEditRequest(req)}
                            className="text-gray-400 hover:text-blue-600 transition p-2 bg-white rounded-lg border border-gray-100 shadow-sm"
                            title="تعديل الطلب"
                          >
                            <Edit size={20} />
                          </button>
                        )}
                        <button 
                          onClick={() => handleDeleteRequest(req.id)}
                          className="text-gray-400 hover:text-red-600 transition p-2 bg-white rounded-lg border border-gray-100 shadow-sm"
                          title="حذف الطلب"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    )}
                    <div className="text-left text-sm text-gray-500">
                      <Clock size={16} className="inline mr-1" />
                      {new Date(req.created_at).toLocaleString('en-GB', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                    </div>
                  </div>
                </div>
                
                <div className="p-6">
                  <h4 className="font-bold text-gray-700 mb-4">العروض المقدمة من الموردين ({req.supplier_bids?.length || 0})</h4>
                  {req.supplier_bids?.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {req.supplier_bids.map((bid: any) => (
                        <div key={bid.id} className={`border rounded-xl p-4 relative ${bid.status === 'accepted' ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                          {bid.status === 'accepted' && (
                            <div className="absolute top-3 left-3 text-green-600"><CheckCircle2 size={24} /></div>
                          )}
                          <div className="flex items-center gap-1 mb-1">
                            <h5 className="font-bold text-gray-900">{bid.supplier?.company_name}</h5>
                            {bid.supplier?.verification_badge === 'blue' && (
                              <span title="مورد موثق"><BadgeCheck size={18} className="text-blue-500" fill="currentColor" color="white" /></span>
                            )}
                            {bid.supplier?.verification_badge === 'gold' && (
                              <span title="مورد مميز (VIP)"><BadgeCheck size={18} className="text-yellow-500" fill="currentColor" color="white" /></span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mb-4">{bid.supplier?.name}</p>
                          
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm text-gray-600">سعر القطعة الواحدة:</span>
                            <span className="font-bold text-gray-800">{formatCurrency(bid.price / (req.quantity || 1))}</span>
                          </div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-gray-600">السعر الإجمالي:</span>
                            <span className="font-black text-[#4f46e5]">{formatCurrency(bid.price)}</span>
                          </div>
                          <div className="flex justify-between items-center mb-4">
                            <span className="text-sm text-gray-600">الدفعة المقدمة (العربون):</span>
                            <span className="font-bold bg-orange-100 text-orange-800 px-2 py-0.5 rounded text-sm">
                              {formatCurrency((bid.price * bid.advance_percentage) / 100)} ({bid.advance_percentage}%)
                            </span>
                          </div>
                          
                          {bid.notes && (
                            <div className="text-sm text-gray-600 bg-white p-3 rounded-lg border border-gray-100 mb-4">
                              "{bid.notes}"
                            </div>
                          )}

                          {req.status === 'open' && bid.status === 'pending' && (!bid.negotiated_by || bid.negotiated_by === 'supplier_rejected') && (
                            <div className="flex flex-col sm:flex-row gap-2 mt-4">
                              <button 
                                onClick={() => openPaymentModal(bid, req.id, 'advance', req.coupon_id)}
                                className="flex-1 py-2 bg-[#4f46e5] text-white rounded-lg font-bold text-sm hover:bg-[#4338ca] transition"
                              >
                                قبول العرض
                              </button>
                              {bid.negotiated_by !== 'supplier_rejected' && (
                                <button 
                                  onClick={() => {
                                    setNegotiationBid(bid);
                                    setShowNegotiationModal(true);
                                  }}
                                  className="flex-1 py-2 bg-orange-50 text-orange-600 border border-orange-200 rounded-lg font-bold text-sm hover:bg-orange-100 transition"
                                >
                                  اقتراح سعر
                                </button>
                              )}
                              <button 
                                onClick={() => {
                                  if(confirm('هل أنت متأكد من رفض هذا العرض؟')) {
                                    handleRejectBid(bid.id, bid.supplier_id);
                                  }
                                }}
                                className="flex-1 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg font-bold text-sm hover:bg-red-100 transition"
                              >
                                رفض
                              </button>
                            </div>
                          )}
                          
                          {bid.status === 'rejected' && (
                            <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm font-bold border border-red-100 flex items-center justify-center gap-2">
                              <XCircle size={18} />
                              تم رفض هذا العرض
                            </div>
                          )}
                          {bid.negotiated_by === 'merchant' && bid.status === 'pending' && (
                            <div className="mt-4 p-3 bg-orange-50 text-orange-700 rounded-lg text-sm font-bold border border-orange-100 text-center">
                              لقد قمت باقتراح سعر جديد ({formatCurrency(bid.negotiated_price)} للقطعة) وفي انتظار رد المورد.
                            </div>
                          )}
                          {bid.negotiated_by === 'supplier_rejected' && bid.status === 'pending' && (
                            <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm font-bold border border-red-100 text-center">
                              رفض المورد سعرك المقترح. يمكنك الآن قبول السعر الأول أو رفض العرض نهائياً.
                            </div>
                          )}
                          {bid.negotiated_by === 'supplier_accepted' && bid.status === 'pending' && (
                            <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm font-bold border border-green-100 text-center">
                              وافق المورد على السعر المقترح. يمكنك الآن الدفع والتأكيد.
                              <button 
                                onClick={() => openPaymentModal(bid, req.id, 'advance', req.coupon_id)}
                                className="mt-2 block w-full py-2 bg-green-600 text-white rounded-lg font-bold text-sm hover:bg-green-700 transition"
                              >
                                دفع العربون
                              </button>
                            </div>
                          )}
                          
                          {bid.status === 'accepted' && (
                            <div className="mt-4 pt-4 border-t border-gray-100">
                              {bid.deposit_paid_at ? (
                                <CountdownCircle 
                                  depositPaidAt={bid.deposit_paid_at} 
                                  onCancel={() => handleCancelDeal(bid.id)}
                                  cancelling={cancellingDealId === bid.id}
                                />
                              ) : (
                                <div className="bg-red-50 p-4 rounded-xl mb-4 border border-red-200">
                                  <p className="text-red-700 text-sm mb-2 font-bold">لم يتم تسجيل وقت دفع العربون في النظام (ربما بسبب دفعه قبل التحديث).</p>
                                  <button 
                                    onClick={async () => {
                                      await supabase.from('supplier_bids').update({ deposit_paid_at: new Date().toISOString() }).eq('id', bid.id);
                                      window.location.reload();
                                    }}
                                    className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-700"
                                  >
                                    إصلاح وتفعيل العداد الآن
                                  </button>
                                </div>
                              )}
                              <div className={`flex flex-col gap-2 mb-3 bg-white p-3 rounded-lg border ${bid.is_fully_paid || bid.shipping_status === 'delivered' ? 'border-green-100' : 'border-red-100'}`}>
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-gray-600">المبلغ المتبقي:</span>
                                  <span className={`font-bold ${bid.is_fully_paid || bid.shipping_status === 'delivered' ? 'text-green-600' : 'text-red-600'}`}>
                                    {bid.is_fully_paid || bid.shipping_status === 'delivered' ? formatCurrency(0) : formatCurrency(bid.price - (bid.price * bid.advance_percentage / 100))}
                                  </span>
                                </div>
                                {(!bid.is_fully_paid && bid.shipping_status !== 'delivered') && (
                                  <button 
                                    onClick={() => openPaymentModal(bid, req.id, 'remaining', req.coupon_id)}
                                    className="mt-1 bg-[#4f46e5] text-white py-2 px-3 rounded-md font-bold text-sm hover:bg-[#4338ca] w-full text-center"
                                  >
                                    دفع المتبقي
                                  </button>
                                )}
                              </div>
                              <div className="w-full mb-4">
                                <OrderProgressBar bidId={bid.id} currentStatus={bid.shipping_status || 'pending_in_china'} />
                              </div>
                              <div className="flex flex-col gap-3">
                                <a 
                                  href={`https://wa.me/${bid.supplier?.phone || '+213000000000'}?text=${encodeURIComponent(`مرحباً، أتواصل معك بخصوص عرضك على مناقصة رقم: ${req.id}`)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-green-700 transition w-full sm:w-max justify-center"
                                >
                                  <MessageCircle size={18} />
                                  تواصل عبر الواتساب
                                </a>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400 text-sm">في انتظار عروض الموردين...</p>
                  )}
                </div>
              </div>
            ))
          )
        )}
      </div>

      {/* Modal for Creating Request */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col relative overflow-hidden">
            <div className="p-6 overflow-y-auto w-full">
              <button onClick={closeModal} className="absolute top-4 left-4 text-gray-400 hover:text-gray-700 bg-white rounded-full p-1 z-10">
                <XCircle size={24} />
              </button>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">{editingRequestId ? 'تعديل المناقصة' : 'إنشاء مناقصة / طلب جديد'}</h2>
            <form onSubmit={handleCreateRequest} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">اسم السلعة المطلوبة</label>
                <input 
                  type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-[#4f46e5] focus:border-[#4f46e5] bg-gray-50 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">التفاصيل والمواصفات</label>
                <textarea 
                  required rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-[#4f46e5] focus:border-[#4f46e5] bg-gray-50 focus:bg-white"
                />
              </div>

              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <p className="text-xs text-blue-800 font-bold mb-3">يجب إدخال رابط المنتج لتوضيح طلبك للموردين (ويمكن إضافة صورة كخيار إضافي).</p>
                <div className="space-y-3">
                  <div className="relative">
                    <LinkIcon className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      type="url" required value={formData.product_link} onChange={e => setFormData({...formData, product_link: e.target.value})}
                      placeholder="رابط المنتج (مثال من علي بابا وغيرها)..."
                      className="w-full pr-10 pl-3 py-2 border border-gray-300 rounded-xl focus:ring-[#4f46e5] focus:border-[#4f46e5]"
                    />
                  </div>
                  <div className="relative">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:bg-gray-50 transition cursor-pointer relative">
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setImageFile(e.target.files[0]);
                              setFormData({...formData, image_url: ''});
                            }
                          }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div className="flex flex-col items-center gap-2">
                          <Upload className="text-gray-400" size={24} />
                          <span className="text-sm font-medium text-gray-600">
                            {imageFile ? imageFile.name : 'اختر صورة من جهازك...'}
                          </span>
                        </div>
                      </div>
                      <div className="text-gray-400 font-bold">أو</div>
                      <div className="flex-1 relative">
                        <ImageIcon className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                          type="url" 
                          value={formData.image_url} 
                          onChange={e => {
                            setFormData({...formData, image_url: e.target.value});
                            setImageFile(null);
                          }}
                          placeholder="الصق رابط صورة..."
                          className="w-full pr-10 pl-3 py-4 border border-gray-300 rounded-xl focus:ring-[#4f46e5] focus:border-[#4f46e5]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">الكمية المطلوبة</label>
                  <input 
                    type="number" required min={minQuantity} value={formData.quantity} onChange={e => setFormData({...formData, quantity: parseInt(e.target.value)})}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-[#4f46e5] focus:border-[#4f46e5] bg-gray-50 focus:bg-white"
                  />
                  <p className="text-xs text-gray-500 mt-1">الحد الأدنى الذي حددته الإدارة هو {minQuantity}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ملاحظات إضافية (اختياري)</label>
                <textarea 
                  rows={2} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-[#4f46e5] focus:border-[#4f46e5] bg-gray-50 focus:bg-white"
                  placeholder="شروط خاصة، ألوان معينة، الخ..."
                />
              </div>

              <div className="pt-4 flex gap-4">
                <button type="submit" disabled={creating} className="flex-1 bg-[#4f46e5] text-white py-3 rounded-xl font-bold hover:bg-[#4338ca] transition disabled:opacity-50">
                  {creating ? 'جاري الحفظ...' : (editingRequestId ? 'حفظ التعديلات' : 'نشر الطلب للموردين')}
                </button>
                <button type="button" onClick={closeModal} className="px-6 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition">
                  إلغاء
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      {showTosModal && (
        <TermsOfUseModal 
          onAccept={handleTosAccepted} 
          onClose={() => setShowTosModal(false)} 
        />
      )}

      {/* Payment Method Modal */}
      {showPaymentModal && selectedBidForPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] p-4 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 relative">
              <button onClick={() => setShowPaymentModal(false)} className="absolute top-4 left-4 text-gray-400 hover:text-gray-700">
                <XCircle size={24} />
              </button>
            <h2 className="text-xl font-bold text-gray-900 mb-6">طريقة دفع العربون</h2>
            
            <div className="bg-gray-50 p-4 rounded-xl mb-6 text-center">
              <p className="text-gray-500 mb-1">المبلغ المطلوب {paymentType === 'remaining' ? '(باقي الدفعة)' : ''}</p>
              <p className="text-3xl font-black text-gray-900">
                {paymentType === 'advance' 
                  ? formatCurrency((selectedBidForPayment.price * (selectedBidForPayment.advance_percentage / 100)) - couponDiscountAmount)
                  : formatCurrency(selectedBidForPayment.price - (selectedBidForPayment.price * (selectedBidForPayment.advance_percentage / 100)) - couponDiscountAmount)}
              </p>
              {couponDiscountAmount > 0 && (
                <p className="text-green-600 text-sm font-bold mt-2">
                  تم خصم {formatCurrency(couponDiscountAmount)} من عمولة المنصة بفضل الكوبون!
                </p>
              )}
            </div>

            {!existingCouponId && !appliedCoupon && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">هل لديك كود ترويجي (كوبون)؟</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="أدخل الكوبون هنا..."
                    className="flex-1 p-3 border border-gray-300 rounded-xl focus:ring-[#4f46e5] focus:outline-none uppercase"
                  />
                  <button
                    onClick={handleApplyCoupon}
                    className="bg-gray-900 text-white px-4 py-2 rounded-xl font-bold hover:bg-gray-800 transition"
                  >
                    تطبيق
                  </button>
                </div>
                {couponError && <p className="text-red-500 text-sm mt-2">{couponError}</p>}
              </div>
            )}

            <div className="space-y-4">
              <button 
                onClick={handleWalletPayment}
                disabled={isProcessingWalletPayment}
                className={`w-full flex items-center justify-between p-4 border border-gray-200 rounded-xl transition group ${isProcessingWalletPayment ? 'opacity-50 cursor-not-allowed' : 'hover:border-[#4f46e5] hover:bg-green-50'}`}
              >
                <div className="flex items-center gap-3">
                  <div className="bg-green-100 p-2 rounded-lg text-green-700 group-hover:bg-[#4f46e5] group-hover:text-white transition">
                    <Wallet size={24} />
                  </div>
                  <div className="text-right">
                    <h3 className="font-bold text-gray-900">الدفع من المحفظة</h3>
                    <p className="text-sm text-gray-500">الرصيد المتاح: <span className="font-bold text-green-600">{formatCurrency(walletBalance)}</span></p>
                  </div>
                </div>
              </button>

              <button 
                onClick={handleChargilyPayment}
                className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-2 rounded-lg text-blue-700 group-hover:bg-blue-600 group-hover:text-white transition">
                    <CreditCard size={24} />
                  </div>
                  <div className="text-right">
                    <h3 className="font-bold text-gray-900">البطاقة البنكية / الذهبية</h3>
                    <p className="text-sm text-gray-500">الدفع عبر منصة Chargily الآمنة</p>
                  </div>
                </div>
              </button>
            </div>
            </div>
          </div>
        </div>
      )}

      {/* Negotiation Modal */}
      {showNegotiationModal && negotiationBid && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] p-4 flex items-center justify-center">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 relative">
            <button onClick={() => { setShowNegotiationModal(false); setNegotiationBid(null); setNegotiatedPrice(0); }} className="absolute top-4 left-4 text-gray-400 hover:text-gray-700">
              <XCircle size={24} />
            </button>
            <h2 className="text-xl font-bold text-gray-900 mb-6">اقتراح سعر جديد</h2>
            
            <div className="bg-orange-50 p-4 rounded-xl mb-6 text-sm text-orange-800 border border-orange-100">
              <p>سعر المورد الحالي: <strong>{formatCurrency(negotiationBid.price / (requests.find(r => r.id === negotiationBid.request_id || r.supplier_bids?.some((b:any) => b.id === negotiationBid.id))?.quantity || 1))}</strong> للقطعة الواحدة.</p>
            </div>

            <form onSubmit={handleProposePriceSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">السعر المقترح للقطعة الواحدة (DZD)</label>
                <input 
                  type="number" step="0.01" required min="0.01"
                  value={negotiatedPrice || ''} 
                  onChange={e => setNegotiatedPrice(parseFloat(e.target.value) || 0)}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-[#4f46e5] focus:border-[#4f46e5] bg-gray-50"
                  placeholder="أدخل سعرك المقترح هنا..."
                />
              </div>

              <div className="pt-4 flex gap-4">
                <button type="submit" disabled={negotiating || !negotiatedPrice} className="flex-1 bg-orange-600 text-white py-3 rounded-xl font-bold hover:bg-orange-700 transition disabled:opacity-50">
                  {negotiating ? 'جاري الإرسال...' : 'إرسال الاقتراح'}
                </button>
                <button type="button" onClick={() => { setShowNegotiationModal(false); setNegotiationBid(null); setNegotiatedPrice(0); }} className="px-6 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
