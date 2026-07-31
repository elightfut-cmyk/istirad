import { useState } from 'react';
import DashboardLayout from '../../../layouts/DashboardLayout';
import { supabase } from '../../../lib/supabase';
import { LayoutDashboard, ShoppingBag, Wallet, Gift, Heart, AlertTriangle, Send } from 'lucide-react';
import { useAuthStore } from '../../../store/useAuthStore';
import toast from 'react-hot-toast';

export default function MerchantComplaints() {
  const { user } = useAuthStore();
  const [complaintType, setComplaintType] = useState('تأخر الطلب');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      toast.error('يرجى كتابة تفاصيل الشكوى');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Save to database
      const { error } = await supabase
        .from('complaints')
        .insert([{
          merchant_id: user?.id,
          complaint_type: complaintType,
          message: message,
          status: 'pending'
        }]);

      if (error) throw error;

      // 2. Send to Telegram
      // The user wants it sent to ID: 161542111
      const TELEGRAM_BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN || '';
      const TELEGRAM_CHAT_ID = '161542111';

      if (TELEGRAM_BOT_TOKEN) {
        const text = `🚨 *شكوى جديدة من تاجر*\n\n*التاجر:* ${user?.name}\n*الشركة:* ${user?.company_name || 'غير محدد'}\n*رقم الهاتف:* ${user?.phone || 'غير محدد'}\n*نوع الشكوى:* ${complaintType}\n*التفاصيل:*\n${message}`;
        
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: text,
            parse_mode: 'Markdown'
          })
        }).catch(err => console.error('Error sending to Telegram:', err));
      } else {
        console.warn('Telegram Bot Token not configured.');
      }

      toast.success('تم إرسال الشكوى بنجاح وسيتم مراجعتها في أقرب وقت');
      setMessage('');
      setComplaintType('تأخر الطلب');
    } catch (error) {
      console.error('Error submitting complaint:', error);
      toast.error('حدث خطأ أثناء إرسال الشكوى');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout
      title="الشكاوى والمقترحات"
      sidebarLinks={[
        { label: 'الرئيسية', href: '/merchant', icon: <LayoutDashboard size={20} /> },
        { label: 'السوق', href: '/merchant/marketplace', icon: <ShoppingBag size={20} /> },
        { label: 'طلباتي', href: '/merchant/orders', icon: <ShoppingBag size={20} /> },
        { label: 'المحفظة', href: '/merchant/wallet', icon: <Wallet size={20} /> },
        { label: 'الإحالات', href: '/merchant/referrals', icon: <Gift size={20} /> },
        { label: 'المفضلة', href: '/merchant/wishlist', icon: <Heart size={20} /> },
        { label: 'الشكاوى', href: '/merchant/complaints', icon: <AlertTriangle size={20} /> },
      ]}
    >
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-orange-50 p-6 border-b border-orange-100 flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-100 text-orange-500 rounded-xl flex items-center justify-center">
              <AlertTriangle size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900">تقديم شكوى أو استفسار</h2>
              <p className="text-gray-600 mt-1">نحن هنا لمساعدتك. يرجى تزويدنا بالتفاصيل لنتمكن من حل المشكلة في أسرع وقت.</p>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                نوع الشكوى / الموضوع
              </label>
              <select
                value={complaintType}
                onChange={(e) => setComplaintType(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-colors"
                required
              >
                <option value="تأخر الطلب">تأخر الطلب</option>
                <option value="مشكلة في الدفع">مشكلة في الدفع</option>
                <option value="مشكلة في المنتج">مشكلة في المنتج</option>
                <option value="اقتراح تطوير">اقتراح تطوير</option>
                <option value="شكوى عن مورد">شكوى عن مورد</option>
                <option value="أخرى">أخرى</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                التفاصيل
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full h-40 px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-colors resize-none"
                placeholder="يرجى كتابة كافة التفاصيل المتعلقة بمشكلتك ليتسنى لنا مساعدتك بشكل أفضل..."
                required
              />
            </div>
            
            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-orange-500 text-white px-8 py-3 rounded-xl font-bold hover:bg-orange-600 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    جاري الإرسال...
                  </>
                ) : (
                  <>
                    <Send size={20} className="rotate-180" />
                    إرسال الشكوى
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
