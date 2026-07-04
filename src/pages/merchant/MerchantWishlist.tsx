import { useState, useEffect } from 'react';
import { Store, Search, ShoppingCart, Heart, Trash2, X, Users, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { useSettingsStore } from '../../store/useSettingsStore';

export default function MerchantWishlist() {
  const { user } = useAuthStore();
  const { formatCurrency } = useSettingsStore();
  const navigate = useNavigate();
  
  const [wishlistItems, setWishlistItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Order Modal State
  const [orderingProduct, setOrderingProduct] = useState<any | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [submittingOrder, setSubmittingOrder] = useState(false);

  useEffect(() => {
    if (user) {
      fetchWishlist();
    }
    
    const handleRefresh = () => {
      if (user) fetchWishlist();
    };
    window.addEventListener('refresh_data', handleRefresh);
    return () => window.removeEventListener('refresh_data', handleRefresh);
  }, [user]);

  const fetchWishlist = async () => {
    try {
      const { data, error } = await supabase
        .from('merchant_wishlist')
        .select(`
          product_id,
          products (
            id, title, description, price, advance_percentage, discount_price, images, moq, supplier_id, created_at, status,
            supplier:users!supplier_id(company_name)
          )
        `)
        .eq('merchant_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setWishlistItems(data || []);
    } catch (error) {
      console.error('Error fetching wishlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeFromWishlist = async (productId: string) => {
    if (!user) return;
    try {
      // Optimistic update
      setWishlistItems(prev => prev.filter(item => item.product_id !== productId));
      
      const { error } = await supabase
        .from('merchant_wishlist')
        .delete()
        .eq('merchant_id', user.id)
        .eq('product_id', productId);
        
      if (error) throw error;
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      fetchWishlist(); // Revert on error
    }
  };

  const handleOpenOrderModal = (product: any) => {
    setOrderingProduct(product);
    setQuantity(product.moq || 1);
  };

  const submitOrder = async () => {
    if (!user || !orderingProduct) return;
    setSubmittingOrder(true);

    try {
      // 1. Create a Custom Request
      const { data: requestData, error: reqError } = await supabase.from('custom_requests').insert({
        merchant_id: user.id,
        title: orderingProduct.title,
        description: `طلب شراء مباشر للمنتج (${orderingProduct.title}) بالكمية المحددة.`,
        quantity: quantity,
        image_url: orderingProduct.images && orderingProduct.images.length > 0 ? orderingProduct.images[0] : null,
        status: 'open',
        request_type: 'direct'
      }).select('id').single();

      if (reqError) throw reqError;

      const discountedPrice = orderingProduct.discount_price > 0 && orderingProduct.discount_price < orderingProduct.price
        ? orderingProduct.discount_price
        : orderingProduct.price;
      const totalPrice = discountedPrice * quantity;
      const { error: bidError } = await supabase.from('supplier_bids').insert({
        request_id: requestData.id,
        supplier_id: orderingProduct.supplier_id,
        price: totalPrice,
        advance_percentage: orderingProduct.advance_percentage || 20,
        status: 'pending'
      });

      if (bidError) throw bidError;

      alert('تم إنشاء الطلب بنجاح! سيتم تحويلك إلى صفحة طلباتك لإتمام دفع العربون.');
      navigate('/merchant/orders');

    } catch (error) {
      console.error('Error creating order:', error);
      alert('حدث خطأ أثناء تقديم الطلب.');
    } finally {
      setSubmittingOrder(false);
      setOrderingProduct(null);
    }
  };

  return (
    <DashboardLayout
      title="المفضلة"
      sidebarLinks={[
        { label: 'الرئيسية', href: '/merchant', icon: <Store size={20} /> },
        { label: 'تصفح المنتجات', href: '/merchant/marketplace', icon: <Search size={20} /> },
        { label: 'طلباتي', href: '/merchant/orders', icon: <ShoppingCart size={20} /> },
        { label: 'المحفظة', href: '/merchant/wallet', icon: <CreditCard size={20} /> },
        { label: 'نظام الإحالة', href: '/merchant/referrals', icon: <Users size={20} /> },
        { label: 'المفضلة', href: '/merchant/wishlist', icon: <Heart size={20} /> },
      ]}
    >
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-800">منتجاتي المفضلة</h2>
        <p className="text-gray-500 text-sm mt-1">المنتجات التي قمت بحفظها للعودة إليها لاحقاً.</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">جاري تحميل المفضلة...</div>
      ) : wishlistItems.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
            <Heart size={32} className="text-gray-300" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">قائمة المفضلة فارغة</h3>
          <p className="text-gray-500 max-w-md mb-6">لم تقم بحفظ أي منتجات حتى الآن. تصفح السوق واضغط على أيقونة القلب لحفظ المنتجات التي تعجبك.</p>
          <button
            onClick={() => navigate('/merchant/marketplace')}
            className="px-6 py-3 bg-[#4f46e5] text-white font-bold rounded-xl hover:bg-[#4338ca] transition-colors"
          >
            الذهاب لسوق المنتجات
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {wishlistItems.map((item) => {
            const product = item.products;
            if (!product) return null;

            return (
              <div key={item.product_id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 group flex flex-col transition-all hover:shadow-lg hover:-translate-y-1">
                <div className="h-48 bg-gray-50 relative overflow-hidden flex items-center justify-center p-2">
                  <button 
                    onClick={(e) => { e.stopPropagation(); removeFromWishlist(product.id); }}
                    className="absolute top-3 left-3 z-10 p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-sm hover:bg-white transition-colors group/btn"
                    title="إزالة من المفضلة"
                  >
                    <Trash2 size={20} className="text-gray-400 group-hover/btn:text-red-500 transition-colors" />
                  </button>
                  {product.images && product.images.length > 0 ? (
                    <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">لا توجد صورة</div>
                  )}
                </div>

                <div className="p-5 flex-1 flex flex-col">
                  <h4 className="font-bold text-gray-800 text-lg line-clamp-1 mb-2">{product.title}</h4>
                  <p className="text-sm text-gray-500 line-clamp-2 mb-4 flex-1">
                    {product.description}
                  </p>

                  <div className="flex items-center gap-1 mb-4 bg-orange-50 w-full sm:w-max px-2 py-1 rounded-md">
                    <Store size={14} className="text-orange-500" />
                    <span className="text-xs text-orange-700">{product.supplier?.company_name || 'مورد غير معروف'}</span>
                  </div>

                  <div className="flex items-end justify-between pt-4 border-t border-gray-50 mt-auto">
                    <div>
                      <p className="text-xs text-gray-400 mb-1">سعر الجملة</p>
                      {product.discount_price > 0 && product.discount_price < product.price ? (
                        <div className="flex flex-col">
                          <span className="text-xs text-gray-400 line-through">{formatCurrency(product.price)}</span>
                          <div className="flex items-center gap-2">
                            <p className="font-black text-[#4f46e5] text-xl">{formatCurrency(product.discount_price)}</p>
                            <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded font-bold">-{Math.round(((product.price - product.discount_price) / product.price) * 100)}%</span>
                          </div>
                        </div>
                      ) : (
                        <p className="font-black text-[#4f46e5] text-xl">{formatCurrency(product.price)}</p>
                      )}
                    </div>
                    <div className="text-left">
                      <p className="text-xs text-gray-400 mb-1">أقل كمية (MOQ)</p>
                      <p className="font-bold text-gray-700 bg-gray-100 px-3 py-1 rounded-lg inline-block">{product.moq} وحدة</p>
                    </div>
                  </div>

                  <button 
                    onClick={() => handleOpenOrderModal(product)}
                    className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 border-2 border-[#4f46e5] text-[#4f46e5] font-bold rounded-xl hover:bg-[#4f46e5] hover:text-white transition-colors"
                  >
                    <ShoppingCart size={18} />
                    <span>إضافة للطلب</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Order Modal */}
      {orderingProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 relative">
            <button 
              onClick={() => setOrderingProduct(null)}
              className="absolute top-4 left-4 text-gray-400 hover:text-gray-600"
            >
              <X size={24} />
            </button>
            
            <h2 className="text-xl font-bold text-gray-900 mb-6">تأكيد طلب المنتج</h2>
            
            <div className="mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
              <h3 className="font-bold text-lg mb-2">{orderingProduct.title}</h3>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm text-gray-500">السعر للوحدة:</span>
                {orderingProduct.discount_price > 0 && orderingProduct.discount_price < orderingProduct.price ? (
                  <>
                    <span className="text-sm text-gray-400 line-through">{formatCurrency(orderingProduct.price)}</span>
                    <span className="font-bold text-[#4f46e5]">{formatCurrency(orderingProduct.discount_price)}</span>
                  </>
                ) : (
                  <span className="font-bold text-gray-800">{formatCurrency(orderingProduct.price)}</span>
                )}
              </div>
              <p className="text-sm text-gray-500 mb-1">المورد: <span className="font-bold text-gray-800">{orderingProduct.supplier?.company_name}</span></p>
              <p className="text-sm text-gray-500 mb-1">أقل كمية للبيع (MOQ): <span className="font-bold text-orange-600">{orderingProduct.moq} وحدة</span></p>
              <p className="text-sm text-gray-500">نسبة العربون: <span className="font-bold text-red-600">{orderingProduct.advance_percentage || 20}%</span></p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">الكمية المطلوبة</label>
              <input 
                type="number" 
                min={orderingProduct.moq}
                max={999999}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                className={`w-full p-3 border rounded-xl focus:ring-[#4f46e5] focus:border-[#4f46e5] ${quantity < orderingProduct.moq ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
              />
              {quantity < orderingProduct.moq && (
                <p className="text-red-500 text-xs mt-2">لا يمكنك طلب أقل من {orderingProduct.moq} وحدة (شرط المورد).</p>
              )}
            </div>

            <div className="flex justify-between items-center mb-6 pt-4 border-t border-gray-100">
              <span className="font-bold text-gray-700">الإجمالي:</span>
              <span className="font-black text-[#4f46e5] text-2xl">
                {formatCurrency(quantity * (orderingProduct.discount_price > 0 && orderingProduct.discount_price < orderingProduct.price
                  ? orderingProduct.discount_price 
                  : orderingProduct.price))}
              </span>
            </div>

            <button 
              onClick={submitOrder}
              disabled={submittingOrder || quantity < orderingProduct.moq}
              className="w-full bg-[#4f46e5] text-white py-3 rounded-xl font-bold hover:bg-[#4338ca] transition disabled:opacity-50"
            >
              {submittingOrder ? 'جاري المعالجة...' : 'تأكيد الطلب والانتقال للدفع'}
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
