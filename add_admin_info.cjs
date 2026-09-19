const fs = require('fs');
const file = 'src/pages/admin/AdminRequests.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('Calculator')) {
  content = content.replace("Ticket } from 'lucide-react';", "Ticket, Calculator } from 'lucide-react';");
}

const infoCard = `
        <div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100 mb-6">
          <h2 className="text-lg font-bold text-indigo-900 mb-3 flex items-center gap-2">
            <Calculator className="text-[#4f46e5]" size={20} />
            كيف يتم حساب الأسعار والفوائد؟
          </h2>
          <div className="text-sm text-indigo-800 leading-relaxed space-y-2">
            <p><strong>1. السعر الخام:</strong> هو السعر الصافي الذي يطلبه المورد (سعر القطعة الخام × الكمية).</p>
            <p><strong>2. السعر بالفائدة (للتاجر):</strong> السعر الخام + <strong>نسبة ربح المنصة</strong> + <strong>رسوم ثابتة ({formatCurrency(settings.orderFixedFee)})</strong>.</p>
            <p><strong>3. شرائح نسبة الربح المطبقة (على السعر الخام الإجمالي):</strong></p>
            <ul className="list-disc list-inside mr-4 mb-2">
              <li>أقل من 100 ألف دج: <strong>{settings.markupTier1Percentage}%</strong></li>
              <li>حتى 500 ألف دج: <strong>{settings.markupTier2Percentage}%</strong></li>
              <li>حتى 2 مليون دج: <strong>{settings.markupTier3Percentage}%</strong></li>
              <li>أكثر من 2 مليون دج: <strong>{settings.markupTier4Percentage}%</strong></li>
            </ul>
            <div className="mt-3 p-3 bg-white border border-indigo-100 rounded-lg text-indigo-800 font-medium">
              <span className="font-bold text-indigo-900">عملية الحساب العكسي (عند تفاوض التاجر):</span><br />
              عندما يقترح التاجر سعراً نهائياً (بالفائدة)، تقوم المنصة بخصم الرسوم الثابتة ({formatCurrency(settings.orderFixedFee)}) أولاً، ثم تقوم باختبار عكسي لتحديد شريحة الربح الأصلية التي ينتمي إليها المبلغ، ومن ثم تستخرج <strong>السعر الخام</strong> لتعرضه على المورد.
            </div>
          </div>
        </div>
`;

content = content.replace(
  '<div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">',
  infoCard + '\n        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">'
);

fs.writeFileSync(file, content);
console.log('done');
