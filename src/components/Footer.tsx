import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Store, Facebook, Twitter, Instagram, Linkedin, Mail, Phone, MapPin } from 'lucide-react';

interface Page {
  id: string;
  title: string;
  slug: string;
}

export default function Footer() {
  const [pages, setPages] = useState<Page[]>([]);

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    try {
      const { data, error } = await supabase
        .from('pages')
        .select('id, title, slug')
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (data) setPages(data);
    } catch (error) {
      console.error('Error fetching pages:', error);
    }
  };

  return (
    <footer className="bg-white border-t border-gray-200 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Brand & About */}
          <div className="col-span-1 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-6">
              <div className="w-10 h-10 bg-[#4f46e5] rounded-xl flex items-center justify-center text-white">
                <Store size={24} />
              </div>
              <span className="text-2xl font-black text-[#4f46e5]">جيبها-jiibha</span>
            </Link>
            <p className="text-gray-600 mb-6">
              المنصة الأولى للربط التجاري B2B. استورد منتجاتك بكل سهولة وأمان من الصين إلى باب منزلك.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-[#4f46e5] hover:text-white transition-colors">
                <Facebook size={20} />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-[#4f46e5] hover:text-white transition-colors">
                <Twitter size={20} />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-[#4f46e5] hover:text-white transition-colors">
                <Instagram size={20} />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-[#4f46e5] hover:text-white transition-colors">
                <Linkedin size={20} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-6 relative inline-block">
              روابط سريعة
              <span className="absolute -bottom-2 right-0 w-1/2 h-1 bg-[#4f46e5] rounded-full"></span>
            </h3>
            <ul className="space-y-4">
              <li>
                <Link to="/" className="text-gray-600 hover:text-[#4f46e5] transition-colors flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                  الرئيسية
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-gray-600 hover:text-[#4f46e5] transition-colors flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                  تسجيل الدخول
                </Link>
              </li>
              <li>
                <Link to="/register" className="text-gray-600 hover:text-[#4f46e5] transition-colors flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                  انضم إلينا
                </Link>
              </li>
            </ul>
          </div>

          {/* Dynamic Pages */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-6 relative inline-block">
              معلومات تهمك
              <span className="absolute -bottom-2 right-0 w-1/2 h-1 bg-[#4f46e5] rounded-full"></span>
            </h3>
            <ul className="space-y-4">
              {pages.map((page) => (
                <li key={page.id}>
                  <Link to={`/page/${page.slug}`} className="text-gray-600 hover:text-[#4f46e5] transition-colors flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                    {page.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-6 relative inline-block">
              تواصل معنا
              <span className="absolute -bottom-2 right-0 w-1/2 h-1 bg-[#4f46e5] rounded-full"></span>
            </h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 text-gray-600">
                <MapPin size={20} className="text-[#4f46e5] shrink-0 mt-0.5" />
                <span>الجزائر العاصمة، الجزائر</span>
              </li>
              <li className="flex items-center gap-3 text-gray-600">
                <Phone size={20} className="text-[#4f46e5] shrink-0" />
                <span dir="ltr">+213 (0) 555 55 55 55</span>
              </li>
              <li className="flex items-center gap-3 text-gray-600">
                <Mail size={20} className="text-[#4f46e5] shrink-0" />
                <span>contact@jiibha.com</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-gray-500 text-sm">
            جميع الحقوق محفوظة &copy; {new Date().getFullYear()} منصة جيبها.
          </p>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>صنع بكل حب في الجزائر</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
