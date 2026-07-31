import React from 'react';

interface InvoiceDocumentProps {
  orderId: string;
  merchantName: string;
  supplierName: string;
  paymentStatus: 'deposit_paid' | 'fully_paid';
  formatCurrency: (amount: number) => string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  advancePercentage: number;
}

const InvoiceDocument: React.FC<InvoiceDocumentProps> = ({
  orderId,
  merchantName,
  supplierName,
  paymentStatus,
  formatCurrency,
  itemName,
  quantity,
  unitPrice,
  totalPrice,
  advancePercentage
}) => {
  const date = new Date().toLocaleDateString('ar-DZ');
  
  const depositAmount = (totalPrice * advancePercentage) / 100;
  const remainingAmount = totalPrice - depositAmount;

  return (
    <div id={`invoice-${orderId}`} className="bg-white p-8 w-[800px] text-right font-sans mx-auto absolute -top-[10000px] left-[-10000px]" dir="rtl" style={{ color: '#000', direction: 'rtl' }}>
      {/* Header */}
      <div className="flex justify-between items-start border-b-2 border-gray-200 pb-6 mb-6">
        <div>
          <h1 className="text-4xl font-black text-[#4f46e5] mb-2">جيبها-jiibha</h1>
          <p className="text-gray-500 text-sm">المنصة الأولى للربط التجاري B2B</p>
        </div>
        <div className="text-left">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">فاتورة شراء</h2>
          <p className="text-gray-600 font-bold">رقم الطلب: #{orderId.slice(0, 8)}</p>
          <p className="text-gray-500 text-sm">التاريخ: {date}</p>
        </div>
      </div>

      {/* Info Section */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-bold text-gray-800 mb-3 border-b pb-2">معلومات التاجر (المشتري)</h3>
          <p className="font-bold text-gray-700">{merchantName}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-bold text-gray-800 mb-3 border-b pb-2">معلومات المورد (البائع)</h3>
          <p className="font-bold text-gray-700">{supplierName}</p>
        </div>
      </div>

      {/* Invoice Status Banner */}
      <div className={`p-4 rounded-lg mb-8 text-center font-bold text-lg border-2 ${
        paymentStatus === 'fully_paid' 
          ? 'bg-green-50 text-green-700 border-green-200' 
          : 'bg-orange-50 text-orange-700 border-orange-200'
      }`}>
        {paymentStatus === 'fully_paid' ? 'حالة الفاتورة: تم دفع المبلغ كاملاً' : 'حالة الفاتورة: تم دفع العربون فقط'}
      </div>

      {/* Items Table */}
      <table className="w-full mb-8 border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-3 text-right font-bold text-gray-700 border border-gray-200">المنتج</th>
            <th className="p-3 text-center font-bold text-gray-700 border border-gray-200">الكمية</th>
            <th className="p-3 text-center font-bold text-gray-700 border border-gray-200">سعر الوحدة</th>
            <th className="p-3 text-left font-bold text-gray-700 border border-gray-200">المجموع</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="p-3 border border-gray-200">{itemName}</td>
            <td className="p-3 text-center border border-gray-200">{quantity}</td>
            <td className="p-3 text-center border border-gray-200">{formatCurrency(unitPrice)}</td>
            <td className="p-3 text-left border border-gray-200 font-bold">{formatCurrency(totalPrice)}</td>
          </tr>
        </tbody>
      </table>

      {/* Summary */}
      <div className="flex justify-end">
        <div className="w-1/2 bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="flex justify-between mb-4 border-b pb-4">
            <span className="font-bold text-gray-800">المجموع الإجمالي:</span>
            <span className="font-bold text-lg text-[#4f46e5]">{formatCurrency(totalPrice)}</span>
          </div>
          
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">العربون المدفوع ({advancePercentage}%):</span>
            <span className="font-bold text-green-600">{formatCurrency(depositAmount)}</span>
          </div>
          <div className="flex justify-between font-bold text-lg">
            <span>المبلغ المتبقي:</span>
            <span className={paymentStatus === 'fully_paid' ? 'text-gray-400 line-through' : 'text-red-600'}>
              {formatCurrency(remainingAmount)}
            </span>
          </div>
          {paymentStatus === 'fully_paid' && (
            <div className="flex justify-between font-bold text-lg mt-2 text-green-600">
              <span>تم دفع المتبقي:</span>
              <span>{formatCurrency(remainingAmount)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer Note */}
      <div className="mt-12 text-center text-gray-400 text-sm border-t pt-4">
        هذه الفاتورة تم إصدارها إلكترونياً من منصة جيبها ولا تحتاج لتوقيع.
      </div>
    </div>
  );
};

export default InvoiceDocument;
