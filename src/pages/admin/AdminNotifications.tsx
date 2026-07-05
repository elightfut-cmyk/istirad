import { useState } from 'react';
import { LayoutDashboard, ShoppingBag, Users, Send, MessageSquare, Ticket } from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { supabase } from '../../lib/supabase';

export default function AdminNotifications() {
  const [message, setMessage] = useState('');
  const [targetAudience, setTargetAudience] = useState<'all' | 'merchant' | 'supplier'>('all');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: number; failed: number } | null>(null);

  const handleSend = async () => {
    if (!message.trim()) {
      alert('الرجاء كتابة رسالة أولاً.');
      return;
    }

    if (!window.confirm('هل أنت متأكد من إرسال هذه الرسالة عبر تلغرام؟')) return;

    setSending(true);
    setSendResult(null);

    try {
      // Fetch users with valid telegram_chat_id
      let query = supabase
        .from('users')
        .select('telegram_chat_id, name')
        .not('telegram_chat_id', 'is', null)
        .neq('telegram_chat_id', '');

      if (targetAudience !== 'all') {
        query = query.eq('role', targetAudience);
      }

      const { data: users, error } = await query;

      if (error) throw error;

      if (!users || users.length === 0) {
        alert('لا يوجد مستخدمين لديهم معرف تلغرام (Chat ID) في هذه الفئة.');
        setSending(false);
        return;
      }

      let successCount = 0;
      let failCount = 0;

      const botToken = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
      if (!botToken) {
        alert('مفتاح بوت التلغرام غير موجود في ملف .env');
        setSending(false);
        return;
      }

      for (const user of users) {
        try {
          const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: user.telegram_chat_id,
              text: message,
              parse_mode: 'HTML'
            })
          });

          if (res.ok) {
            successCount++;
          } else {
            console.error('Failed to send to', user.name, await res.text());
            failCount++;
          }
        } catch (e) {
          console.error('Error sending to', user.name, e);
          failCount++;
        }
      }

      setSendResult({ success: successCount, failed: failCount });
      if (successCount > 0) setMessage('');

    } catch (error) {
      console.error('Error in broadcasting:', error);
      alert('حدث خطأ أثناء جلب المستخدمين.');
    } finally {
      setSending(false);
    }
  };

  return (
    <DashboardLayout
      title="الإشعارات التسويقية (تلغرام)"
      sidebarLinks={[
        { label: 'الرئيسية', href: '/admin', icon: <LayoutDashboard size={20} /> },
        { label: 'المستخدمين', href: '/admin/users', icon: <Users size={20} /> },
        { label: 'الطلبات العامة', href: '/admin/orders', icon: <ShoppingBag size={20} /> },
        { label: 'الكوبونات', href: '/admin/coupons', icon: <Ticket size={20} /> },
        { label: 'الإشعارات (تلغرام)', href: '/admin/notifications', icon: <MessageSquare size={20} /> },
      ]}
    >
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 max-w-3xl">
        <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <MessageSquare className="text-blue-500" />
          إرسال إشعار عبر تلغرام
        </h2>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">الفئة المستهدفة</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="audience" 
                  value="all" 
                  checked={targetAudience === 'all'} 
                  onChange={() => setTargetAudience('all')}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <span>الجميع</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="audience" 
                  value="merchant" 
                  checked={targetAudience === 'merchant'} 
                  onChange={() => setTargetAudience('merchant')}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <span>التجار فقط</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="audience" 
                  value="supplier" 
                  checked={targetAudience === 'supplier'} 
                  onChange={() => setTargetAudience('supplier')}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <span>الموردون فقط</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">نص الرسالة</label>
            <textarea
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="اكتب رسالتك هنا..."
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 resize-none bg-gray-50 focus:bg-white"
            />
            <p className="text-xs text-gray-500 mt-2">
              يمكنك استخدام تنسيق HTML البسيط مثل &lt;b&gt;نص عريض&lt;/b&gt; أو &lt;i&gt;نص مائل&lt;/i&gt;.
            </p>
          </div>

          <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
            <button
              onClick={handleSend}
              disabled={sending || !message.trim()}
              className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {sending ? 'جاري الإرسال...' : (
                <>
                  <Send size={18} />
                  إرسال الآن
                </>
              )}
            </button>

            {sendResult && (
              <div className="text-sm font-medium">
                <span className="text-green-600">✅ نجح: {sendResult.success}</span>
                <span className="mx-2 text-gray-300">|</span>
                <span className="text-red-600">❌ فشل: {sendResult.failed}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
