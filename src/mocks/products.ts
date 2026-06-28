export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  moq: number;
  category: string;
  supplierName: string;
  rating: number;
  imageUrl: string;
}

export const mockProducts: Product[] = [
  {
    id: '1',
    title: 'سماعات رأس لاسلكية احترافية',
    description: 'سماعات بلوتوث 5.2 مع خاصية إلغاء الضوضاء النشطة، بطارية تدوم 40 ساعة.',
    price: 45.00,
    moq: 50,
    category: 'إلكترونيات',
    supplierName: 'مصنع التقنية الحديثة',
    rating: 4.8,
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  },
  {
    id: '2',
    title: 'طقم حقائب سفر 3 قطع',
    description: 'حقائب سفر صلبة مصنوعة من البولي كربونات مقاومة للكسر مع عجلات 360 درجة.',
    price: 120.00,
    moq: 20,
    category: 'أزياء وإكسسوارات',
    supplierName: 'شركة السفر الذكي',
    rating: 4.5,
    imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  },
  {
    id: '3',
    title: 'خلاط كهربائي صناعي متعدد الاستخدام',
    description: 'خلاط بقوة 2000 واط مع شفرات من التيتانيوم، مثالي للمطاعم والمقاهي.',
    price: 85.00,
    moq: 10,
    category: 'أجهزة منزلية',
    supplierName: 'مصنع الأجهزة المتقدمة',
    rating: 4.9,
    imageUrl: 'https://images.unsplash.com/photo-1585515320310-259814833e62?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  },
  {
    id: '4',
    title: 'ساعات ذكية رياضية مقاومة للماء',
    description: 'ساعة ذكية بشاشة AMOLED ومستشعر نبضات القلب وتتبع الأكسجين في الدم.',
    price: 25.50,
    moq: 100,
    category: 'إلكترونيات',
    supplierName: 'شركة الإلكترونيات الذكية',
    rating: 4.6,
    imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  },
  {
    id: '5',
    title: 'ماكينة صنع القهوة الاسبريسو',
    description: 'ماكينة احترافية مع مضخة 15 بار ومبخر للحليب الأوتوماتيكي.',
    price: 150.00,
    moq: 5,
    category: 'أجهزة منزلية',
    supplierName: 'مورد معدات المقاهي',
    rating: 4.7,
    imageUrl: 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  },
  {
    id: '6',
    title: 'أحذية رياضية خفيفة الوزن',
    description: 'أحذية مصممة للجري والرياضة بنسيج يسمح بالتهوية ونعل ممتص للصدمات.',
    price: 18.00,
    moq: 200,
    category: 'أزياء وإكسسوارات',
    supplierName: 'مصنع الأناقة',
    rating: 4.3,
    imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  }
];

export const categories = ['الكل', 'إلكترونيات', 'أجهزة منزلية', 'أزياء وإكسسوارات', 'أدوات مكتبية'];
