import { useState, useEffect } from 'react';
import { LayoutDashboard, Store, Package, CreditCard, ArrowUpRight, ArrowDownLeft, X, Clock, Heart, Users, Copy, CheckCircle2 } from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useSettingsStore } from '../../store/useSettingsStore';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';

export default function MerchantWallet() {
  const { formatCurrency, exchangeRate } = useSettingsStore();
  const { user } = useAuthStore();
  
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [topupAmount, setTopupAmount] = useState<number>(0);
  const [topupCurrency, setTopupCurrency] = useState<'USD' | 'EUR'>('USD');
  const [paymentMethod, setPaymentMethod] = useState<'redotpay' | 'binance'>('redotpay');
  const [transactionId, setTransactionId] = useState('');
  const [processing, setProcessing] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Hardcoded exchange rates for topup simulation
  const EUR_TO_DZD = 150; // Just an example rate for EUR
  
  useEffect(() => {
    fetchTransactions();
  }, [user]);

  const fetchTransactions = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('merchant_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error(error);
        return;
      }
      setTransactions(data || []);

      // Also refresh the user profile to get the latest wallet balance
      const { data: updatedUser } = await supabase.from('users').select('*').eq('id', user.id).single();
      if (updatedUser) {
        useAuthStore.getState().setUser(updatedUser);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || topupAmount <= 0 || !transactionId.trim()) {
      alert('يرجى تعبئة جميع الحقول بشكل صحيح');
      return;
    }
    
    setProcessing(true);
    
    try {
      const { error } = await supabase.from('manual_payments').insert({
        merchant_id: user.id,
        amount: topupCurrency === 'USD' ? topupAmount * exchangeRate : topupAmount * EUR_TO_DZD,
        payment_method: paymentMethod + ' - ' + topupCurrency,
        transaction_id: transactionId.trim()
      });

      if (error) throw error;
      
      alert('تم إرسال طلب الشحن للمراجعة من الإدارة. سيتم إضافة الرصيد فور التأكد من التحويل.');
      setShowTopupModal(false);
      setTopupAmount(0);
      setTransactionId('');
    } catch (error) {
      console.error(error);
      alert('حدث خطأ أثناء إرسال طلب الشحن');
    } finally {
      setProcessing(false);
    }
  };

  const handleConvertPoints = async () => {
    if (!user || !user.loyalty_points) return;
    const minConversion = useSettingsStore.getState().loyaltyPointsMinConversion;
    if (user.loyalty_points < minConversion) {
      alert(`الحد الأدنى للتحويل هو ${minConversion} نقطة`);
      return;
    }

    if (confirm(`هل أنت متأكد أنك تريد تحويل ${user.loyalty_points} نقطة إلى رصيد في محفظتك؟`)) {
      setProcessing(true);
      try {
        const { data, error } = await supabase.rpc('convert_loyalty_points_to_wallet', { 
          p_user_id: user.id, 
          p_points: user.loyalty_points 
        });

        if (error) throw error;

        if (data && data.success) {
          alert('تم تحويل النقاط بنجاح!');
          // reload user
          const { data: updatedUser } = await supabase.from('users').select('*').eq('id', user.id).single();
          if (updatedUser) {
            useAuthStore.getState().setUser(updatedUser);
          }
          fetchTransactions();
        } else {
          alert(data?.message || 'حدث خطأ أثناء تحويل النقاط');
        }
      } catch (error) {
        console.error(error);
        alert('حدث خطأ أثناء تحويل النقاط');
      } finally {
        setProcessing(false);
      }
    }
  };

  const availableBalance = user?.wallet_balance || 0;

  const totalPayments = transactions.reduce((acc, curr) => {
    if (curr.type === 'payment') return acc + curr.amount;
    return acc;
  }, 0);

  const totalRefunds = transactions.reduce((acc, curr) => {
    if (curr.type === 'refund') return acc + curr.amount;
    return acc;
  }, 0);

  return (
    <DashboardLayout
      title="المحفظة المالية"
      sidebarLinks={[
        { label: 'الرئيسية', href: '/merchant', icon: <LayoutDashboard size={20} /> },
        { label: 'تصفح المنتجات', href: '/merchant/marketplace', icon: <Store size={20} /> },
        { label: 'طلباتي', href: '/merchant/orders', icon: <Package size={20} /> },
        { label: 'المحفظة', href: '/merchant/wallet', icon: <CreditCard size={20} /> },
        { label: 'نظام الإحالة', href: '/merchant/referrals', icon: <Users size={20} /> },
        { label: 'المفضلة', href: '/merchant/wishlist', icon: <Heart size={20} /> },
      ]}
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-[#065f46] text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <h3 className="text-green-100 text-sm font-medium">الرصيد المتاح</h3>
          <p className="text-4xl font-black mt-2">{formatCurrency(availableBalance)}</p>
          <button 
            onClick={() => setShowTopupModal(true)}
            className="mt-6 bg-white text-[#065f46] px-4 py-2 rounded-xl text-sm font-bold hover:bg-green-50 transition-colors w-full"
          >
            شحن الرصيد
          </button>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-gray-500 text-sm font-medium">إجمالي المدفوعات</h3>
              <p className="text-2xl font-bold mt-1 text-gray-800">{formatCurrency(totalPayments)}</p>
            </div>
            <div className="bg-red-50 p-2 rounded-lg text-red-600">
              <ArrowUpRight size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-gray-500 text-sm font-medium">المستردات</h3>
              <p className="text-2xl font-bold mt-1 text-gray-800">{formatCurrency(totalRefunds)}</p>
            </div>
            <div className="bg-green-50 p-2 rounded-lg text-green-600">
              <ArrowDownLeft size={20} />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 p-6 rounded-2xl shadow-sm border border-orange-100 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-orange-800 text-sm font-medium">نقاط الولاء</h3>
              <p className="text-3xl font-bold mt-1 text-orange-600">{user?.loyalty_points || 0}</p>
            </div>
            <div className="bg-orange-100 p-2 rounded-lg text-orange-600">
              <Heart size={20} />
            </div>
          </div>
          <p className="text-xs text-orange-700 mt-2 opacity-80">
            يمكنك تحويل نقاطك إلى رصيد بعد بلوغ الحد الأدنى ({useSettingsStore.getState().loyaltyPointsMinConversion} نقطة).
          </p>
          <button 
            onClick={handleConvertPoints}
            className="mt-4 bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-orange-700 transition-colors w-full disabled:opacity-50"
            disabled={processing || (user?.loyalty_points || 0) < useSettingsStore.getState().loyaltyPointsMinConversion}
          >
            تحويل إلى رصيد
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-6">سجل العمليات</h2>
        {loading ? (
          <div className="text-center py-12 text-gray-500">جاري تحميل السجل...</div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <CreditCard size={48} className="mx-auto mb-4 opacity-20" />
            <p>لا توجد عمليات مالية سابقة.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition gap-4">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl shrink-0 ${
                    tx.type === 'deposit' ? 'bg-blue-50 text-blue-600' :
                    tx.type === 'refund' ? 'bg-green-50 text-green-600' :
                    'bg-red-50 text-red-600'
                  }`}>
                    {tx.type === 'deposit' ? <ArrowDownLeft size={24} /> : 
                     tx.type === 'refund' ? <ArrowDownLeft size={24} /> : 
                     <ArrowUpRight size={24} />}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">
                      {tx.type === 'deposit' ? 'شحن رصيد' : 
                       tx.type === 'refund' ? 'استرداد مبلغ' : 
                       'دفع عربون طلب'}
                    </h4>
                    <p className="text-sm text-gray-500 flex flex-wrap items-center gap-1 mt-1">
                      <Clock size={14} className="shrink-0" />
                      <span className="whitespace-nowrap">{new Date(tx.created_at).toLocaleDateString('ar-MA')}</span>
                      {tx.description && <span className="mr-0 sm:mr-2 sm:border-r sm:pr-2 w-full sm:w-auto mt-1 sm:mt-0">{tx.description}</span>}
                    </p>
                  </div>
                </div>
                <div className={`font-black text-lg sm:text-right mr-16 sm:mr-0 ${
                  tx.type === 'payment' ? 'text-red-600' : 'text-green-600'
                }`}>
                  {tx.type === 'payment' ? '-' : '+'}{formatCurrency(tx.amount)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Topup Modal */}
      {showTopupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowTopupModal(false)} className="absolute top-4 left-4 text-gray-400 hover:text-gray-600">
              <X size={24} />
            </button>
            <h2 className="text-xl font-bold text-gray-900 mb-6">شحن رصيد المحفظة</h2>
            <form onSubmit={handleTopup} className="space-y-4">
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-sm text-blue-800 mb-4">
                استخدم العملة الصعبة (الدولار أو الأورو) لشحن رصيدك. سيتم تحويله تلقائياً ليظهر بعملة المنصة (دينار جزائري).
              </div>
              
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">طريقة الدفع</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-[#065f46] focus:border-[#065f46]"
                  >
                    <option value="redotpay">RedotPay</option>
                    <option value="binance">Binance Pay</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">العملة</label>
                  <select
                    value={topupCurrency}
                    onChange={(e) => setTopupCurrency(e.target.value as 'USD' | 'EUR')}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-[#065f46] focus:border-[#065f46]"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">المبلغ المرسل</label>
                <input 
                  type="number" min="1" step="0.01" required
                  value={topupAmount || ''}
                  onChange={(e) => setTopupAmount(parseFloat(e.target.value) || 0)}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-[#065f46] focus:border-[#065f46]"
                  placeholder="مثال: 1000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">رقم المعاملة (TxID) أو الـ ID</label>
                <input 
                  type="text" required
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-[#065f46] focus:border-[#065f46]"
                  placeholder="أدخل رقم المعاملة للتحقق"
                />
              </div>

              <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl text-sm text-orange-800 my-4">
                <strong>تعليمات الدفع:</strong><br />
                <div className="flex items-center gap-2 mt-2 mb-2">
                  <span>- أرسل المبلغ إلى {paymentMethod === 'redotpay' ? 'ID' : 'Binance Pay ID'}:</span>
                  <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-orange-200">
                    <span className="font-bold font-mono">{paymentMethod === 'redotpay' ? '1320881144' : '1054805981'}</span>
                    <button 
                      type="button"
                      onClick={() => handleCopy(paymentMethod === 'redotpay' ? '1320881144' : '1054805981')}
                      className="text-gray-500 hover:text-orange-600 transition"
                      title="نسخ المعرف"
                    >
                      {copied ? <CheckCircle2 size={16} className="text-green-600" /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>
                - قم بنسخ رقم المعاملة (TxID) والصقه في الحقل أعلاه<br />
                - سيتم مراجعة الدفعة وإضافة الرصيد في أقرب وقت.
              </div>

              {topupAmount > 0 && (
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex justify-between items-center">
                  <span className="text-gray-600 font-medium">الرصيد التقديري بالدينار:</span>
                  <span className="font-black text-xl text-[#065f46]">
                    {topupCurrency === 'USD' 
                      ? `${(topupAmount * exchangeRate).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")} دج` 
                      : `${(topupAmount * EUR_TO_DZD).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")} دج`}
                  </span>
                </div>
              )}

              <div className="pt-4">
                <button 
                  type="submit" 
                  disabled={processing || topupAmount <= 0}
                  className="w-full bg-[#065f46] text-white py-3 rounded-xl font-bold hover:bg-[#044c38] transition disabled:opacity-50"
                >
                  {processing ? 'جاري المعالجة...' : 'تأكيد ودفع'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
