import { useState, useEffect, useMemo } from 'react';
import { Store, Search, Filter, ShoppingCart, X, Heart, Users, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { useSettingsStore } from '../../store/useSettingsStore';

// We fetch categories dynamically if available, otherwise just use 'الكل'

export default function Marketplace() {
  const { user } = useAuthStore();
  const { formatCurrency, productCategories } = useSettingsStore();
  const navigate = useNavigate();
  
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>(['الكل']);
  const [loading, setLoading] = useState(true);
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [maxPrice, setMaxPrice] = useState<number>(5000);

  // Order Modal State
  const [orderingProduct, setOrderingProduct] = useState<any | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [submittingOrder, setSubmittingOrder] = useState(false);

  useEffect(() => {
    setCategories(['الكل', ...(productCategories || [])]);
  }, [productCategories]);

  useEffect(() => {
    fetchProducts();
    if (user) fetchWishlist();
    
    const handleRefresh = () => {
      fetchProducts();
      if (user) fetchWishlist();
    };
    window.addEventListener('refresh_data', handleRefresh);
    return () => window.removeEventListener('refresh_data', handleRefresh);
  }, [user]);

  const fetchWishlist = async () => {
    try {
      const { data, error } = await supabase
        .from('merchant_wishlist')
        .select('product_id')
        .eq('merchant_id', user!.id);
      
      if (error) throw error;
      setWishlistIds((data || []).map(item => item.product_id));
    } catch (error) {
      console.error('Error fetching wishlist:', error);
    }
  };

  const toggleWishlist = async (productId: string) => {
    if (!user) return;
    try {
      const isWished = wishlistIds.includes(productId);
      if (isWished) {
        setWishlistIds(prev => prev.filter(id => id !== productId));
        await supabase
          .from('merchant_wishlist')
          .delete()
          .eq('merchant_id', user.id)
          .eq('product_id', productId);
      } else {
        setWishlistIds(prev => [...prev, productId]);
        await supabase
          .from('merchant_wishlist')
          .insert({ merchant_id: user.id, product_id: productId });
      }
    } catch (error) {
      console.error('Error toggling wishlist:', error);
      fetchWishlist();
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id, title, description, price, cost_price, advance_percentage, discount_price, images, moq, supplier_id, created_at, status, category,
          supplier:users!supplier_id(company_name)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setProducts(data || []);

      // Extract unique categories (if we had category names instead of IDs, but here we'll just mock it or skip)
      // For now, let's just stick to the fallback categories since category_id might be used.
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const title = product.title || '';
      const desc = product.description || '';
      const matchesSearch = title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        desc.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === 'الكل' || product.category === selectedCategory; 
      const matchesPrice = product.price <= maxPrice;

      return matchesSearch && matchesCategory && matchesPrice;
    });
  }, [products, searchQuery, selectedCategory, maxPrice]);

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
      const totalCostPrice = (orderingProduct.cost_price || 0) * quantity;
      
      const { error: bidError } = await supabase.from('supplier_bids').insert({
        request_id: requestData.id,
        supplier_id: orderingProduct.supplier_id,
        price: totalPrice,
        cost_price: totalCostPrice,
        advance_percentage: orderingProduct.advance_percentage || 20,
        status: 'pending'
      });

      if (bidError) throw bidError;

      // Notify Admins
      import('../../store/useNotificationStore').then(({ sendNotification }) => {
         sendNotification('all_admins', 'مناقصة جديدة', `قام التاجر ${user.name} بإنشاء طلب شراء مباشر للمنتج ${orderingProduct.title}`, 'info');
      });

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
      title="تصفح المنتجات"
      sidebarLinks={[
        { label: 'الرئيسية', href: '/merchant', icon: <Store size={20} /> },
        { label: 'تصفح المنتجات', href: '/merchant/marketplace', icon: <Search size={20} /> },
        { label: 'طلباتي', href: '/merchant/orders', icon: <ShoppingCart size={20} /> },
        { label: 'المحفظة', href: '/merchant/wallet', icon: <CreditCard size={20} /> },
        { label: 'نظام الإحالة', href: '/merchant/referrals', icon: <Users size={20} /> },
        { label: 'المفضلة', href: '/merchant/wishlist', icon: <Heart size={20} /> },
      ]}
    >
      <div className="flex flex-col md:flex-row gap-6">
        {/* Filters Sidebar */}
        <div className="w-full md:w-64 flex-shrink-0">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 sticky top-4">
            <div className="flex items-center gap-2 mb-6 text-[#065f46]">
              <Filter size={20} />
              <h3 className="font-bold text-lg">الفلاتر</h3>
            </div>

            <div className="mb-6">
              <h4 className="font-bold text-gray-700 mb-3 text-sm">الفئة</h4>
              <div className="space-y-2">
                {categories.map((cat) => (
                  <label key={cat} className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedCategory === cat ? 'bg-[#065f46] border-[#065f46]' : 'border-gray-300 group-hover:border-[#065f46]'}`}>
                      {selectedCategory === cat && <div className="w-2.5 h-2.5 bg-white rounded-sm"></div>}
                    </div>
                    <input
                      type="radio"
                      name="category"
                      className="hidden"
                      checked={selectedCategory === cat}
                      onChange={() => setSelectedCategory(cat)}
                    />
                    <span className={`text-sm ${selectedCategory === cat ? 'font-bold text-[#065f46]' : 'text-gray-600 group-hover:text-gray-900'}`}>{cat}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-bold text-gray-700 text-sm">أقصى سعر</h4>
                <span className="text-xs font-bold text-[#065f46] bg-green-50 px-2 py-1 rounded">{formatCurrency(maxPrice)}</span>
              </div>
              <input
                type="range"
                min="10"
                max="10000"
                step="100"
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-full accent-[#065f46]"
              />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col gap-6">
          {/* Search Bar */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="ابحث عن المنتجات، الموردين..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pr-12 pl-4 py-3 border border-transparent bg-gray-50 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#065f46] focus:border-transparent transition-all sm:text-sm"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-500">جاري تحميل المنتجات...</div>
          ) : (
            <>
              {/* Products Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map((product) => (
                  <div key={product.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 group flex flex-col transition-all hover:shadow-lg hover:-translate-y-1">
                    <div className="h-48 bg-gray-50 relative overflow-hidden flex items-center justify-center p-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleWishlist(product.id); }}
                        className="absolute top-3 left-3 z-10 p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-sm hover:bg-white transition-colors"
                        title={wishlistIds.includes(product.id) ? "إزالة من المفضلة" : "إضافة للمفضلة"}
                      >
                        <Heart size={20} className={wishlistIds.includes(product.id) ? "fill-red-500 text-red-500" : "text-gray-400"} />
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

                      <div className="flex items-center gap-1 mb-4 bg-orange-50 w-max px-2 py-1 rounded-md">
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
                                <p className="font-black text-[#065f46] text-xl">{formatCurrency(product.discount_price)}</p>
                                <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded font-bold">-{Math.round(((product.price - product.discount_price) / product.price) * 100)}%</span>
                              </div>
                            </div>
                          ) : (
                            <p className="font-black text-[#065f46] text-xl">{formatCurrency(product.price)}</p>
                          )}
                        </div>
                        <div className="text-left">
                          <p className="text-xs text-gray-400 mb-1">أقل كمية (MOQ)</p>
                          <p className="font-bold text-gray-700 bg-gray-100 px-3 py-1 rounded-lg inline-block">{product.moq} وحدة</p>
                        </div>
                      </div>

                      <button 
                        onClick={() => handleOpenOrderModal(product)}
                        className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 border-2 border-[#065f46] text-[#065f46] font-bold rounded-xl hover:bg-[#065f46] hover:text-white transition-colors"
                      >
                        <ShoppingCart size={18} />
                        <span>إضافة للطلب</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {filteredProducts.length === 0 && (
                <div className="bg-white p-12 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                    <Search size={32} className="text-gray-300" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">لم يتم العثور على منتجات</h3>
                  <p className="text-gray-500 max-w-md">عذراً، لا توجد منتجات تطابق معايير البحث والفلترة الخاصة بك.</p>
                  <button
                    onClick={() => { setSearchQuery(''); setSelectedCategory('الكل'); setMaxPrice(5000); }}
                    className="mt-6 px-6 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
                  >
                    إعادة ضبط الفلاتر
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

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
                    <span className="font-bold text-[#065f46]">{formatCurrency(orderingProduct.discount_price)}</span>
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
                className={`w-full p-3 border rounded-xl focus:ring-[#065f46] focus:border-[#065f46] ${quantity < orderingProduct.moq ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
              />
              {quantity < orderingProduct.moq && (
                <p className="text-red-500 text-xs mt-2">لا يمكنك طلب أقل من {orderingProduct.moq} وحدة (شرط المورد).</p>
              )}
            </div>

            <div className="flex justify-between items-center mb-6 pt-4 border-t border-gray-100">
              <span className="font-bold text-gray-700">الإجمالي:</span>
              <span className="font-black text-[#065f46] text-2xl">
                {formatCurrency(quantity * (orderingProduct.discount_price > 0 && orderingProduct.discount_price < orderingProduct.price
                  ? orderingProduct.discount_price 
                  : orderingProduct.price))}
              </span>
            </div>

            <button 
              onClick={submitOrder}
              disabled={submittingOrder || quantity < orderingProduct.moq}
              className="w-full bg-[#065f46] text-white py-3 rounded-xl font-bold hover:bg-[#044c38] transition disabled:opacity-50"
            >
              {submittingOrder ? 'جاري المعالجة...' : 'تأكيد الطلب والانتقال للدفع'}
            </button>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}
