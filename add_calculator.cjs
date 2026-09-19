const fs = require('fs');
const file = 'src/pages/admin/AdminRequests.tsx';
let content = fs.readFileSync(file, 'utf8');

// Update imports
if (!content.includes('calculateSupplierPriceFromFinal')) {
  content = content.replace(
    "import { calculateFinalPrice } from '../../utils/profitCalculator';",
    "import { calculateFinalPrice, calculateSupplierPriceFromFinal } from '../../utils/profitCalculator';"
  );
}

// Add state to the component
if (!content.includes('calcMode')) {
  const stateInsert = `
  const [calcMode, setCalcMode] = useState<'rawToFinal' | 'finalToRaw'>('rawToFinal');
  const [calcAmount, setCalcAmount] = useState<number | ''>('');
  const [calcQty, setCalcQty] = useState<number>(1);
`;
  content = content.replace("const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);", "const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);\n" + stateInsert);
}

// Create the Calculator JSX
const calcJSX = `
        {/* Calculator Widget */}
        <div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100 mb-6">
          <h2 className="text-lg font-bold text-indigo-900 mb-4 flex items-center gap-2">
            <Calculator className="text-[#4f46e5]" size={20} />
            آلة حاسبة تفاعلية للفوائد والأسعار
          </h2>
          
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <label className="block text-sm font-bold text-indigo-900 mb-2">نوع العملية</label>
              <select 
                className="w-full p-3 rounded-xl border border-indigo-200 text-indigo-900 focus:ring-[#4f46e5]"
                value={calcMode}
                onChange={(e) => setCalcMode(e.target.value as any)}
              >
                <option value="rawToFinal">حساب السعر للتاجر (انطلاقاً من سعر المورد الخام)</option>
                <option value="finalToRaw">حساب السعر للمورد (انطلاقاً من السعر النهائي للتاجر)</option>
              </select>
            </div>
            
            <div className="flex-1">
              <label className="block text-sm font-bold text-indigo-900 mb-2">
                {calcMode === 'rawToFinal' ? 'سعر القطعة الخام (دج)' : 'السعر النهائي للقطعة (دج)'}
              </label>
              <input 
                type="number" min="0" step="0.01"
                className="w-full p-3 rounded-xl border border-indigo-200 focus:ring-[#4f46e5]"
                value={calcAmount}
                onChange={(e) => setCalcAmount(parseFloat(e.target.value) || '')}
                placeholder="أدخل السعر هنا..."
              />
            </div>
            
            <div className="w-full md:w-32">
              <label className="block text-sm font-bold text-indigo-900 mb-2">الكمية</label>
              <input 
                type="number" min="1"
                className="w-full p-3 rounded-xl border border-indigo-200 focus:ring-[#4f46e5]"
                value={calcQty}
                onChange={(e) => setCalcQty(parseInt(e.target.value) || 1)}
              />
            </div>
          </div>
          
          {calcAmount !== '' && Number(calcAmount) > 0 && (
            <div className="bg-white p-5 rounded-xl border border-indigo-200 shadow-sm">
              {calcMode === 'rawToFinal' ? (() => {
                const finalPricing = calculateFinalPrice(Number(calcAmount), calcQty, settings);
                return (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">السعر الإجمالي الخام:</p>
                      <p className="font-bold">{formatCurrency(finalPricing.supplierTotal)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">نسبة المنصة المطبقة:</p>
                      <p className="font-bold text-orange-600">{(finalPricing.markupPercentage * 100).toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">رسوم الطلب الثابتة:</p>
                      <p className="font-bold">{formatCurrency(settings.orderFixedFee)}</p>
                    </div>
                    <div className="md:col-span-3 pt-3 border-t border-gray-100 flex justify-between items-center bg-indigo-50/30 p-3 rounded-lg">
                      <span className="font-bold text-indigo-900">السعر النهائي للتاجر (للقطعة):</span>
                      <span className="text-xl font-black text-[#4f46e5]">{formatCurrency(finalPricing.finalItemPrice)}</span>
                    </div>
                  </div>
                );
              })() : (() => {
                const rawUnitPrice = calculateSupplierPriceFromFinal(Number(calcAmount), calcQty, settings);
                const finalPricing = calculateFinalPrice(rawUnitPrice, calcQty, settings);
                return (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">السعر النهائي الإجمالي:</p>
                      <p className="font-bold">{formatCurrency(Number(calcAmount) * calcQty)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">ربح المنصة الإجمالي (تقريبي):</p>
                      <p className="font-bold text-orange-600">{formatCurrency(finalPricing.platformProfit)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">رسوم الطلب الثابتة المخصومة:</p>
                      <p className="font-bold">{formatCurrency(settings.orderFixedFee)}</p>
                    </div>
                    <div className="md:col-span-3 pt-3 border-t border-gray-100 flex justify-between items-center bg-green-50/50 p-3 rounded-lg border-green-100">
                      <span className="font-bold text-green-900">السعر الصافي (الخام) للمورد (للقطعة):</span>
                      <span className="text-xl font-black text-green-700">{formatCurrency(rawUnitPrice)}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
`;

// Replace the old infoCard
const regex = /<div className="bg-indigo-50\/50 p-6 rounded-2xl border border-indigo-100 mb-6">[\s\S]*?<\/div>\s*<\/div>/;
content = content.replace(regex, calcJSX);

fs.writeFileSync(file, content);
console.log('done');
