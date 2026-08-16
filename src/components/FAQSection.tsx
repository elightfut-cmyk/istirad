import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const faqs = [
  {
    question: 'كيف يمكنني البدء في استخدام جيبها؟',
    answer: 'يمكنك البدء بالتسجيل كتاجر جديد، وتأكيد حسابك، ثم البدء في استيراد المنتجات وعرضها في متجرك بكل سهولة.',
  },
  {
    question: 'ما هي طرق الدفع المتاحة؟',
    answer: 'نوفر طرق دفع متعددة وآمنة تناسب احتياجاتك، بما في ذلك البطاقات الائتمانية والتحويل البنكي.',
  },
  {
    question: 'كيف يتم شحن الطلبات؟',
    answer: 'نحن نتعاون مع أفضل شركات الشحن لضمان وصول طلباتك بأسرع وقت وأقل تكلفة.',
  },
  {
    question: 'هل يمكنني إرجاع المنتجات؟',
    answer: 'نعم، نوفر سياسة إرجاع مرنة تسمح لك بإرجاع المنتجات غير المطابقة للمواصفات خلال فترة محددة.',
  }
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="py-16 bg-white" id="faq">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">الأسئلة الشائعة</h2>
          <p className="text-lg text-gray-600">إليك بعض الإجابات على الأسئلة التي قد تراودك</p>
        </div>
        
        <div className="max-w-3xl mx-auto divide-y divide-gray-200">
          {faqs.map((faq, index) => (
            <div key={index} className="py-6">
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="flex w-full items-center justify-between text-right focus:outline-none"
              >
                <span className="text-lg font-medium text-gray-900">{faq.question}</span>
                {openIndex === index ? (
                  <ChevronUp className="h-5 w-5 text-indigo-600 ml-2" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400 ml-2" />
                )}
              </button>
              {openIndex === index && (
                <div className="mt-4 pr-7">
                  <p className="text-base text-gray-600">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
