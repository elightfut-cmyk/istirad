import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plane, 
  Ship, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Plus, 
  Edit3, 
  Trash2, 
  Scale, 
  DollarSign, 
  Package, 
  Sparkles,
  X,
  Upload,
  Search,
  Tag
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/useAuthStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { 
  profitableAirProductsService, 
  ProfitableAirProduct,
  DEFAULT_PROFITABLE_AIR_PRODUCTS 
} from '../services/profitableAirProductsService';

interface ProfitableAirProductsSectionProps {
  title?: string;
  subtitle?: string;
  onSelectProduct?: (product: ProfitableAirProduct) => void;
}

export default function ProfitableAirProductsSection({
  title,
  subtitle,
  onSelectProduct
}: ProfitableAirProductsSectionProps) {
  const { user } = useAuthStore();
  const { exchangeRate } = useSettingsStore();

  const isAdmin = user?.role === 'admin' || user?.email === 'madaniameur26@gmail.com';

  const [products, setProducts] = useState<ProfitableAirProduct[]>(DEFAULT_PROFITABLE_AIR_PRODUCTS);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<'all' | 'green' | 'red'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State for Admin Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<ProfitableAirProduct> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState('إلكترونيات');
  const [formPlatform, setFormPlatform] = useState<'1688' | 'Alibaba' | 'Taobao' | 'AliExpress' | 'Other'>('1688');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formPriceUsd, setFormPriceUsd] = useState<number | ''>(5);
  const [formPriceDzd, setFormPriceDzd] = useState<number | ''>(1150);
  const [formWeightKg, setFormWeightKg] = useState<number | ''>(0.2);
  const [formShippingCostDzd, setFormShippingCostDzd] = useState<number | ''>(700);
  const [formFinalCostDzd, setFormFinalCostDzd] = useState<number | ''>(1850);
  const [formSellingPriceDzd, setFormSellingPriceDzd] = useState<number | ''>(3900);
  const [formProfitDzd, setFormProfitDzd] = useState<number | ''>(2050);
  const [formStatusColor, setFormStatusColor] = useState<'green' | 'red'>('green');
  const [formBadge, setFormBadge] = useState('');
  const [formAdminNote, setFormAdminNote] = useState('');

  // Load Products
  const loadProducts = async (force = false) => {
    try {
      const data = await profitableAirProductsService.getProducts(force);
      setProducts(data);
    } catch (e) {
      console.error('Failed to load air products:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // Filter Categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (p.isActive === false && !isAdmin) return false;
      if (filterTab !== 'all' && p.statusColor !== filterTab) return false;
      if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = p.title?.toLowerCase().includes(q);
        const matchNote = p.adminNote?.toLowerCase().includes(q);
        const matchCat = p.category?.toLowerCase().includes(q);
        if (!matchTitle && !matchNote && !matchCat) return false;
      }
      return true;
    });
  }, [products, filterTab, selectedCategory, searchQuery, isAdmin]);

  // Counts
  const greenCount = useMemo(() => products.filter(p => p.statusColor === 'green').length, [products]);
  const redCount = useMemo(() => products.filter(p => p.statusColor === 'red').length, [products]);

  // Open Modal to Add
  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setFormTitle('');
    setFormCategory('إلكترونيات');
    setFormPlatform('1688');
    setFormImageUrl('');
    setFormPriceUsd(4);
    setFormPriceDzd(920);
    setFormWeightKg(0.15);
    setFormShippingCostDzd(525);
    setFormFinalCostDzd(1445);
    setFormSellingPriceDzd(3200);
    setFormProfitDzd(1755);
    setFormStatusColor('green');
    setFormBadge('منتج رابح ✈️');
    setFormAdminNote('منتج خفيف بهامش ربح ممتاز وسريع الدوران للشحن الجوي.');
    setIsModalOpen(true);
  };

  // Open Modal to Edit
  const handleOpenEditModal = (p: ProfitableAirProduct) => {
    setEditingProduct(p);
    setFormTitle(p.title);
    setFormCategory(p.category);
    setFormPlatform(p.sourcePlatform);
    setFormImageUrl(p.imageUrl);
    setFormPriceUsd(p.priceUsd);
    setFormPriceDzd(p.priceDzd);
    setFormWeightKg(p.weightKg);
    setFormShippingCostDzd(p.shippingCostDzd);
    setFormFinalCostDzd(p.finalCostDzd);
    setFormSellingPriceDzd(p.sellingPriceDzd);
    setFormProfitDzd(p.profitDzd);
    setFormStatusColor(p.statusColor);
    setFormBadge(p.adminBadge || '');
    setFormAdminNote(p.adminNote);
    setIsModalOpen(true);
  };

  // Auto Calculations in Form
  const handleUsdChange = (val: number) => {
    setFormPriceUsd(val);
    const rate = exchangeRate || 230;
    const dzd = Math.round(val * rate);
    setFormPriceDzd(dzd);
    recalcTotal(dzd, formShippingCostDzd || 0, formSellingPriceDzd || 0);
  };

  const handleWeightChange = (weight: number) => {
    setFormWeightKg(weight);
    // Estimated air shipping: approx 3500 DZD per kg
    const estShipping = Math.round(weight * 3500);
    setFormShippingCostDzd(estShipping);
    recalcTotal(formPriceDzd || 0, estShipping, formSellingPriceDzd || 0);
  };

  const recalcTotal = (dzdPrice: number, shipping: number, selling: number) => {
    const finalCost = dzdPrice + shipping;
    setFormFinalCostDzd(finalCost);
    if (selling > 0) {
      setFormProfitDzd(selling - finalCost);
    }
  };

  // Image Upload via Cloudinary
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    setUploadingImage(true);
    const toastId = toast.loading('جاري رفع صورة المنتج...');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'jiibha');

      const res = await fetch('https://api.cloudinary.com/v1_1/xvhtji4c/image/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('فشل رفع الصورة إلى الخادم');
      const data = await res.json();
      setFormImageUrl(data.secure_url);
      toast.success('تم رفع الصورة بنجاح!', { id: toastId });
    } catch (err: any) {
      toast.error(err.message || 'خطأ في الرفع', { id: toastId });
    } finally {
      setUploadingImage(false);
    }
  };

  // Save Product
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      toast.error('يرجى إدخال اسم المنتج');
      return;
    }

    setIsSaving(true);
    const toastId = toast.loading('جاري حفظ المنتج...');

    try {
      const payload: Partial<ProfitableAirProduct> = {
        id: editingProduct?.id,
        title: formTitle.trim(),
        category: formCategory.trim() || 'عام',
        sourcePlatform: formPlatform,
        imageUrl: formImageUrl.trim() || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800',
        priceUsd: Number(formPriceUsd) || 0,
        priceDzd: Number(formPriceDzd) || 0,
        weightKg: Number(formWeightKg) || 0.1,
        shippingCostDzd: Number(formShippingCostDzd) || 0,
        finalCostDzd: Number(formFinalCostDzd) || 0,
        sellingPriceDzd: Number(formSellingPriceDzd) || 0,
        profitDzd: Number(formProfitDzd) || 0,
        statusColor: formStatusColor,
        adminBadge: formBadge.trim() || (formStatusColor === 'green' ? 'منتج رابح ✈️' : 'تكلفة مرتفعة - بحري ⚠️'),
        adminNote: formAdminNote.trim(),
        isActive: true
      };

      const res = await profitableAirProductsService.saveProduct(payload);
      if (!res.success) throw new Error('فشل حفظ المنتج في قاعدة البيانات');

      toast.success(editingProduct ? 'تم تعديل المنتج بنجاح' : 'تمت إضافة المنتج بنجاح', { id: toastId });
      setIsModalOpen(false);
      await loadProducts(true);
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء الحفظ', { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Product
  const handleDeleteProduct = async (id: string, name: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف مثال المنتج: "${name}"؟`)) return;
    const toastId = toast.loading('جاري الحذف...');
    try {
      const res = await profitableAirProductsService.deleteProduct(id);
      if (!res.success) throw new Error('فشل الحذف');
      toast.success('تم حذف المنتج بنجاح', { id: toastId });
      await loadProducts(true);
    } catch (e: any) {
      toast.error(e.message || 'خطأ في الحذف', { id: toastId });
    }
  };

  return (
    <section className="relative overflow-hidden py-10 px-4 sm:px-6 lg:px-8 my-8 rounded-3xl bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border border-slate-800 text-white shadow-2xl">
      {/* Decorative luxury background glow */}
      <div className="absolute top-0 right-1/4 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 translate-y-1/2 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto space-y-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-800/80 pb-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 text-emerald-300 text-xs sm:text-sm font-bold shadow-inner">
              <Sparkles size={16} className="text-emerald-400 animate-pulse" />
              <span>دليل الجدوى الذكي | الشحن الجوي السريع</span>
            </div>
            
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white leading-tight">
              {title || 'منتجات رابحة في الشحن الجوي مقابل منتجات يُفضّل تجنبها'}
            </h2>
            
            <p className="text-slate-400 text-xs sm:text-sm md:text-base max-w-3xl leading-relaxed">
              {subtitle || 'أمثلة حقيقية ومدروسة بالأرقام تكشف لك أسرار التجارة: ما هي المنتجات التي تضاعف أرباحك في الشحن الجوي في 7-10 أيام، وما هي المنتجات التي يلتهم الشحن الجوي هامش ربحها بسبب وزنها أو حجمها ويجب استيرادها بحرياً.'}
            </p>
          </div>

          {/* Admin Action Button */}
          {isAdmin && (
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={handleOpenAddModal}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-emerald-900/30 transition-all flex items-center gap-2 text-xs sm:text-sm active:scale-95 border border-emerald-400/30"
              >
                <Plus size={16} />
                <span>إضافة منتج للشحن الجوي (الأدمن)</span>
              </button>
            </div>
          )}
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between bg-slate-900/80 p-3 sm:p-4 rounded-2xl border border-slate-800 backdrop-blur-md">
          {/* Main Status Filter Tabs */}
          <div className="flex items-center gap-1.5 sm:gap-2 p-1 bg-slate-950/70 rounded-xl border border-slate-800/80 overflow-x-auto">
            <button
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                filterTab === 'all'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <span>جميع الأمثلة</span>
              <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.5 rounded-full">{products.length}</span>
            </button>

            <button
              onClick={() => setFilterTab('green')}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                filterTab === 'green'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30'
                  : 'text-emerald-400/80 hover:text-emerald-300 hover:bg-emerald-950/30'
              }`}
            >
              <Plane size={15} />
              <span>منتجات رابحة (شحن جوي)</span>
              <span className="bg-emerald-950 text-emerald-300 border border-emerald-500/30 text-[10px] px-1.5 py-0.5 rounded-full">{greenCount}</span>
            </button>

            <button
              onClick={() => setFilterTab('red')}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                filterTab === 'red'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-900/30'
                  : 'text-rose-400/80 hover:text-rose-300 hover:bg-rose-950/30'
              }`}
            >
              <Ship size={15} />
              <span>غير مناسبة (الأفضل بحري)</span>
              <span className="bg-rose-950 text-rose-300 border border-rose-500/30 text-[10px] px-1.5 py-0.5 rounded-full">{redCount}</span>
            </button>
          </div>

          {/* Search & Category Filter */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-60">
              <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="ابحث عن منتج أو تصنيف..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {categories.length > 0 && (
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="all">كل التصنيفات</option>
                {categories.map((cat, i) => (
                  <option key={i} value={cat}>{cat}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Product Cards Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-96 bg-slate-900 rounded-2xl border border-slate-800" />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/50 rounded-2xl border border-slate-800 space-y-3">
            <Package size={40} className="mx-auto text-slate-500" />
            <h3 className="text-lg font-bold text-slate-300">لا توجد منتجات تطابق الفرز الحالي</h3>
            <p className="text-sm text-slate-500">قم بتغيير خيارات التصفية أو البحث لعرض باقي الأمثلة.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => {
              const isGreen = product.statusColor === 'green';

              return (
                <div
                  key={product.id}
                  className={`group relative rounded-2xl overflow-hidden transition-all duration-300 flex flex-col justify-between ${
                    isGreen
                      ? 'bg-gradient-to-b from-slate-900 via-slate-900/90 to-emerald-950/20 border border-emerald-500/30 hover:border-emerald-500/70 shadow-[0_10px_30px_rgba(16,185,129,0.08)] hover:shadow-[0_20px_40px_rgba(16,185,129,0.2)]'
                      : 'bg-gradient-to-b from-slate-900 via-slate-900/90 to-rose-950/20 border border-rose-500/30 hover:border-rose-500/70 shadow-[0_10px_30px_rgba(244,63,94,0.08)] hover:shadow-[0_20px_40px_rgba(244,63,94,0.2)]'
                  }`}
                >
                  {/* Card Top: Image & Badges */}
                  <div>
                    <div className="relative h-52 w-full overflow-hidden bg-slate-950">
                      <img
                        src={product.imageUrl}
                        alt={product.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />

                      {/* Source Platform Badge */}
                      <div className="absolute top-3 right-3 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-lg text-xs font-bold text-white border border-white/10 flex items-center gap-1 shadow-md">
                        <Tag size={12} className="text-amber-400" />
                        <span>منصة {product.sourcePlatform}</span>
                      </div>

                      {/* Status / Advice Badge */}
                      <div className="absolute top-3 left-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black shadow-md ${
                          isGreen
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-emerald-900/50'
                            : 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-rose-900/50'
                        }`}>
                          {isGreen ? <Plane size={13} /> : <Ship size={13} />}
                          <span>{product.adminBadge || (isGreen ? 'رابح في الجوي ✈️' : 'الأفضل بحري ⚠️')}</span>
                        </span>
                      </div>

                      {/* Weight Floating Badge */}
                      <div className="absolute bottom-3 right-3 bg-slate-900/90 backdrop-blur-md px-2.5 py-1 rounded-lg text-xs font-bold text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5 shadow-md">
                        <Scale size={13} />
                        <span>الوزن: {product.weightKg} كغ</span>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-5 space-y-4">
                      {/* Title & Category */}
                      <div>
                        <div className="text-[11px] font-bold text-slate-400 mb-1 flex items-center gap-1">
                          <span>{product.category}</span>
                        </div>
                        <h3 className="text-base font-bold text-white leading-snug line-clamp-2 group-hover:text-cyan-300 transition-colors">
                          {product.title}
                        </h3>
                      </div>

                      {/* Financial Breakdown Grid */}
                      <div className="bg-slate-950/80 rounded-xl p-3.5 border border-slate-800/80 space-y-2 text-xs">
                        {/* Purchase Price */}
                        <div className="flex items-center justify-between text-slate-300 border-b border-slate-800/60 pb-1.5">
                          <span className="text-slate-400 flex items-center gap-1">
                            <DollarSign size={13} className="text-amber-400" />
                            سعر الشراء بالصين:
                          </span>
                          <span className="font-bold text-white">
                            ${product.priceUsd.toFixed(2)} <span className="text-slate-400 text-[10px]">({product.priceDzd.toLocaleString()} دج)</span>
                          </span>
                        </div>

                        {/* Air Shipping Cost */}
                        <div className="flex items-center justify-between text-slate-300 border-b border-slate-800/60 pb-1.5">
                          <span className="text-slate-400 flex items-center gap-1">
                            <Plane size={13} className={isGreen ? "text-emerald-400" : "text-rose-400"} />
                            تكلفة الشحن الجوي:
                          </span>
                          <span className={`font-bold ${isGreen ? "text-emerald-300" : "text-rose-400"}`}>
                            {product.shippingCostDzd.toLocaleString()} دج
                          </span>
                        </div>

                        {/* Landed Cost in Algeria */}
                        <div className="flex items-center justify-between text-slate-300 border-b border-slate-800/60 pb-1.5">
                          <span className="text-slate-400 flex items-center gap-1">
                            <Package size={13} className="text-cyan-400" />
                            التكلفة الإجمالية الواصلة:
                          </span>
                          <span className="font-black text-cyan-300">
                            {product.finalCostDzd.toLocaleString()} دج
                          </span>
                        </div>

                        {/* Local Market Price */}
                        <div className="flex items-center justify-between text-slate-300">
                          <span className="text-slate-400">سعر البيع في الجزائر:</span>
                          <span className="font-bold text-slate-200">
                            {product.sellingPriceDzd.toLocaleString()} دج
                          </span>
                        </div>
                      </div>

                      {/* Profit Margin / Risk Result Pill */}
                      <div className={`p-3 rounded-xl border flex items-center justify-between ${
                        isGreen
                          ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                          : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                      }`}>
                        <div className="flex items-center gap-2">
                          {isGreen ? (
                            <TrendingUp size={18} className="text-emerald-400" />
                          ) : (
                            <AlertTriangle size={18} className="text-rose-400" />
                          )}
                          <span className="text-xs font-bold">
                            {isGreen ? 'هامش الربح الصافي المتوقع:' : 'تقييم الشحن الجوي لهذا المنتج:'}
                          </span>
                        </div>
                        <span className="text-sm font-black">
                          {isGreen
                            ? `+${product.profitDzd.toLocaleString()} دج`
                            : 'غير مجدٍ (خسارة)'}
                        </span>
                      </div>

                      {/* Admin Note / Merchant Advice */}
                      {product.adminNote && (
                        <div className={`p-3 rounded-xl text-xs leading-relaxed border ${
                          isGreen
                            ? 'bg-slate-950/90 border-emerald-500/20 text-slate-300'
                            : 'bg-slate-950/90 border-rose-500/20 text-slate-300'
                        }`}>
                          <div className="flex items-center gap-1.5 font-bold mb-1">
                            {isGreen ? (
                              <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                            ) : (
                              <AlertTriangle size={14} className="text-rose-400 shrink-0" />
                            )}
                            <span className={isGreen ? 'text-emerald-300' : 'text-rose-300'}>
                              {isGreen ? 'توجيه ونصيحة الأدمن للتاجر:' : 'تنبيه الأدمن (خطر الشحن الجوي):'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-300/90">{product.adminNote}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="p-5 pt-0 border-t border-slate-800/80 mt-2">
                    <div className="pt-4 flex items-center gap-2">
                      {/* Action for Merchant */}
                      <button
                        onClick={() => {
                          if (onSelectProduct) {
                            onSelectProduct(product);
                          } else {
                            window.location.href = `/merchant/marketplace?search=${encodeURIComponent(product.title)}`;
                          }
                        }}
                        className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md active:scale-95 ${
                          isGreen
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                        }`}
                      >
                        {isGreen ? (
                          <>
                            <Plane size={14} />
                            <span>استورد مثل هذا المنتج جوياً</span>
                          </>
                        ) : (
                          <>
                            <Ship size={14} />
                            <span>طلب شحن بحري بديل (LCL)</span>
                          </>
                        )}
                      </button>

                      {/* Admin Edit/Delete Controls */}
                      {isAdmin && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEditModal(product)}
                            title="تعديل هذا المنتج"
                            className="p-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-xl transition border border-slate-700"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product.id, product.title)}
                            title="حذف هذا المنتج"
                            className="p-2 bg-slate-800 hover:bg-rose-900/50 text-rose-400 rounded-xl transition border border-slate-700"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Admin Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Sparkles size={20} className="text-emerald-400" />
                <h3 className="text-lg font-bold text-white">
                  {editingProduct ? 'تعديل مثال منتج الشحن الجوي' : 'إضافة مثال جديد لمنتج الشحن الجوي'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              
              {/* Product Title */}
              <div>
                <label className="block text-slate-300 font-bold mb-1">اسم المنتج *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: ساعة ذكية Ultra Smart Watch T800"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Category & Platform */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">التصنيف</label>
                  <input
                    type="text"
                    placeholder="مثال: إلكترونيات، عناية شخصية..."
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">المنصة الصينية</label>
                  <select
                    value={formPlatform}
                    onChange={(e: any) => setFormPlatform(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="1688">1688</option>
                    <option value="Alibaba">Alibaba</option>
                    <option value="Taobao">Taobao</option>
                    <option value="AliExpress">AliExpress</option>
                    <option value="Other">منصة أخرى</option>
                  </select>
                </div>
              </div>

              {/* Image Input + Cloudinary Upload */}
              <div>
                <label className="block text-slate-300 font-bold mb-1">صورة المنتج</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="رابط الصورة المباشر (https://...)"
                    value={formImageUrl}
                    onChange={(e) => setFormImageUrl(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 text-xs"
                  />
                  <label className="bg-slate-800 hover:bg-slate-700 text-cyan-300 px-3 py-2 rounded-xl cursor-pointer flex items-center gap-1.5 border border-slate-700 transition">
                    <Upload size={14} />
                    <span>{uploadingImage ? 'جاري الرفع...' : 'رفع صورة'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                      className="hidden"
                    />
                  </label>
                </div>
                {formImageUrl && (
                  <div className="mt-2 w-20 h-20 rounded-lg overflow-hidden border border-slate-700 bg-slate-950">
                    <img src={formImageUrl} alt="معاينة" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              {/* Financial Inputs Row 1: USD, DZD, Weight */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">السعر بالدولار ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formPriceUsd}
                    onChange={(e) => handleUsdChange(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">المقابل بالدينار (دج)</label>
                  <input
                    type="number"
                    value={formPriceDzd}
                    onChange={(e) => {
                      const dzd = parseFloat(e.target.value) || 0;
                      setFormPriceDzd(dzd);
                      recalcTotal(dzd, formShippingCostDzd || 0, formSellingPriceDzd || 0);
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">الوزن التقديري (كغ) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formWeightKg}
                    onChange={(e) => handleWeightChange(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Financial Inputs Row 2: Shipping, Landed, Selling Price */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">ثمن الشحن الجوي (دج)</label>
                  <input
                    type="number"
                    value={formShippingCostDzd}
                    onChange={(e) => {
                      const ship = parseFloat(e.target.value) || 0;
                      setFormShippingCostDzd(ship);
                      recalcTotal(formPriceDzd || 0, ship, formSellingPriceDzd || 0);
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">الثمن النهائي واصلاً للجزائر (دج)</label>
                  <input
                    type="number"
                    value={formFinalCostDzd}
                    onChange={(e) => setFormFinalCostDzd(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-emerald-400 font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">سعر البيع المقترح محلياً (دج)</label>
                  <input
                    type="number"
                    value={formSellingPriceDzd}
                    onChange={(e) => {
                      const sell = parseFloat(e.target.value) || 0;
                      setFormSellingPriceDzd(sell);
                      setFormProfitDzd(sell - (formFinalCostDzd || 0));
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Status Color Selection (Crucial Requirement: Admin Chooses Green or Red) */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                <label className="block text-slate-300 font-bold">
                  لون البطاقة وتقييم المنتج (يحدده الأدمن) *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <label className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition ${
                    formStatusColor === 'green'
                      ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 shadow-md'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}>
                    <input
                      type="radio"
                      name="statusColor"
                      value="green"
                      checked={formStatusColor === 'green'}
                      onChange={() => {
                        setFormStatusColor('green');
                        if (!formBadge || formBadge.includes('بحري')) setFormBadge('منتج رابح ✈️');
                      }}
                      className="accent-emerald-500"
                    />
                    <div>
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
                        <span>بطاقة خضراء (مناسب ورابح للشحن الجوي)</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">هامش ربح ممتاز، وزن خفيف، سريع التوصيل والدوران.</p>
                    </div>
                  </label>

                  <label className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition ${
                    formStatusColor === 'red'
                      ? 'bg-rose-950/60 border-rose-500 text-rose-300 shadow-md'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}>
                    <input
                      type="radio"
                      name="statusColor"
                      value="red"
                      checked={formStatusColor === 'red'}
                      onChange={() => {
                        setFormStatusColor('red');
                        if (!formBadge || formBadge.includes('رابح')) setFormBadge('تكلفة مرتفعة - الأفضل بحري ⚠️');
                      }}
                      className="accent-rose-500"
                    />
                    <div>
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block animate-pulse"></span>
                        <span>بطاقة حمراء (تكلفة مرتفعة / غير مناسب للجوي)</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">وزن ثقيل أو حجم كبير، الشحن الجوي يجعله خاسراً، الأفضل شحن بحري.</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Custom Badge Text */}
              <div>
                <label className="block text-slate-300 font-bold mb-1">نص الشارة العلوية (اختياري)</label>
                <input
                  type="text"
                  placeholder="مثال: منتج رابح جداً ✈️✨ أو تنبيه شحن بحري 🚢"
                  value={formBadge}
                  onChange={(e) => setFormBadge(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Admin Note / Merchant Advice */}
              <div>
                <label className="block text-slate-300 font-bold mb-1">نصيحة وتوجيه الأدمن للتاجر *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="اكتب توجيهاً واضحاً للتاجر يوضح لماذا هذا المنتج رابح في الشحن الجوي، أو لماذا يجب تجنب شحنه جوياً وشحنه بحرياً..."
                  value={formAdminNote}
                  onChange={(e) => setFormAdminNote(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 leading-relaxed"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold transition flex items-center gap-1.5 shadow-lg shadow-emerald-950 disabled:opacity-50"
                >
                  {isSaving ? 'جاري الحفظ...' : (editingProduct ? 'حفظ التعديلات' : 'إضافة المنتج فوراً')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
