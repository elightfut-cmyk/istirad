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
    <div 
      id={`invoice-${orderId}`} 
      className="bg-white p-8 w-[800px] text-right font-sans mx-auto" 
      dir="rtl" 
      style={{ 
        color: '#000', 
        direction: 'rtl', 
        display: 'none',
      }}
    >
      {/* Header */}
      <div className="flex justify-between items-start pb-6 mb-6" style={{ borderBottom: '2px solid #e5e7eb' }}>
        <div>
          <h1 className="text-4xl font-black mb-2" style={{ color: '#4f46e5' }}>جيبها-jiibha</h1>
          <p className="text-sm" style={{ color: '#6b7280' }}>المنصة الأولى للربط التجاري B2B</p>
        </div>
        <div className="text-left">
          <h2 className="text-3xl font-bold mb-2" style={{ color: '#1f2937' }}>فاتورة شراء</h2>
          <p className="font-bold" style={{ color: '#4b5563' }}>رقم الطلب: #{orderId.slice(0, 8)}</p>
          <p className="text-sm" style={{ color: '#6b7280' }}>التاريخ: {date}</p>
        </div>
      </div>

      {/* Info Section */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div className="p-4 rounded-lg" style={{ backgroundColor: '#f9fafb' }}>
          <h3 className="text-lg font-bold mb-3 pb-2" style={{ color: '#1f2937', borderBottom: '1px solid #e5e7eb' }}>معلومات التاجر (المشتري)</h3>
          <p className="font-bold" style={{ color: '#374151' }}>{merchantName}</p>
        </div>
        <div className="p-4 rounded-lg" style={{ backgroundColor: '#f9fafb' }}>
          <h3 className="text-lg font-bold mb-3 pb-2" style={{ color: '#1f2937', borderBottom: '1px solid #e5e7eb' }}>معلومات المورد (البائع)</h3>
          <p className="font-bold" style={{ color: '#374151' }}>{supplierName}</p>
        </div>
      </div>

      {/* Invoice Status Banner */}
      <div 
        className="p-4 rounded-lg mb-8 text-center font-bold text-lg"
        style={{
          backgroundColor: paymentStatus === 'fully_paid' ? '#f0fdf4' : '#fff7ed',
          color: paymentStatus === 'fully_paid' ? '#15803d' : '#c2410c',
          border: `2px solid ${paymentStatus === 'fully_paid' ? '#bbf7d0' : '#fed7aa'}`
        }}
      >
        {paymentStatus === 'fully_paid' ? 'حالة الفاتورة: تم دفع المبلغ كاملاً' : 'حالة الفاتورة: تم دفع العربون فقط'}
      </div>

      {/* Items Table */}
      <table className="w-full mb-8 border-collapse">
        <thead>
          <tr style={{ backgroundColor: '#f3f4f6' }}>
            <th className="p-3 text-right font-bold" style={{ color: '#374151', border: '1px solid #e5e7eb' }}>المنتج</th>
            <th className="p-3 text-center font-bold" style={{ color: '#374151', border: '1px solid #e5e7eb' }}>الكمية</th>
            <th className="p-3 text-center font-bold" style={{ color: '#374151', border: '1px solid #e5e7eb' }}>سعر الوحدة</th>
            <th className="p-3 text-left font-bold" style={{ color: '#374151', border: '1px solid #e5e7eb' }}>المجموع</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="p-3" style={{ border: '1px solid #e5e7eb', color: '#1f2937' }}>{itemName}</td>
            <td className="p-3 text-center" style={{ border: '1px solid #e5e7eb', color: '#1f2937' }}>{quantity}</td>
            <td className="p-3 text-center" style={{ border: '1px solid #e5e7eb', color: '#1f2937' }}>{formatCurrency(unitPrice)}</td>
            <td className="p-3 text-left font-bold" style={{ border: '1px solid #e5e7eb', color: '#1f2937' }}>{formatCurrency(totalPrice)}</td>
          </tr>
        </tbody>
      </table>

      {/* Summary */}
      <div className="flex justify-end">
        <div className="w-1/2 p-4 rounded-lg" style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}>
          <div className="flex justify-between mb-4 pb-4" style={{ borderBottom: '1px solid #e5e7eb' }}>
            <span className="font-bold" style={{ color: '#1f2937' }}>المجموع الإجمالي:</span>
            <span className="font-bold text-lg" style={{ color: '#4f46e5' }}>{formatCurrency(totalPrice)}</span>
          </div>
          
          <div className="flex justify-between mb-2">
            <span style={{ color: '#4b5563' }}>العربون المدفوع ({advancePercentage}%):</span>
            <span className="font-bold" style={{ color: '#16a34a' }}>{formatCurrency(depositAmount)}</span>
          </div>
          <div className="flex justify-between font-bold text-lg">
            <span style={{ color: '#1f2937' }}>المبلغ المتبقي:</span>
            <span 
              className={paymentStatus === 'fully_paid' ? 'line-through' : ''} 
              style={{ color: paymentStatus === 'fully_paid' ? '#9ca3af' : '#dc2626' }}
            >
              {formatCurrency(remainingAmount)}
            </span>
          </div>
          {paymentStatus === 'fully_paid' && (
            <div className="flex justify-between font-bold text-lg mt-2" style={{ color: '#16a34a' }}>
              <span>تم دفع المتبقي:</span>
              <span>{formatCurrency(remainingAmount)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer Note */}
      <div className="mt-12 text-center text-sm pt-4" style={{ color: '#9ca3af', borderTop: '1px solid #e5e7eb' }}>
        هذه الفاتورة تم إصدارها إلكترونياً من منصة جيبها ولا تحتاج لتوقيع.
      </div>
    </div>
  );
};

export default InvoiceDocument;
