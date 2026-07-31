import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ArrowRight, PackageSearch } from 'lucide-react';
import Footer from '../../components/Footer';

interface PageData {
  title: string;
  content: string;
}

export default function PageViewer() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      fetchPage(slug);
    }
  }, [slug]);

  const fetchPage = async (pageSlug: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pages')
        .select('title, content')
        .eq('slug', pageSlug)
        .eq('is_active', true)
        .single();

      if (error) throw error;
      if (data) setPage(data);
    } catch (error) {
      console.error('Error fetching page:', error);
      setPage(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f0] flex flex-col font-['Tajawal'] text-[#1a1a1a]">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#4f46e5] rounded-xl flex items-center justify-center text-white">
              <PackageSearch size={24} />
            </div>
            <span className="text-2xl font-black text-[#4f46e5]"><span className="hidden sm:inline">جيبها-</span>jiibha</span>
          </Link>
          <Link to="/" className="flex items-center gap-2 text-gray-600 hover:text-[#4f46e5] font-medium transition-colors">
            <ArrowRight size={20} />
            العودة للرئيسية
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-12 sm:px-6 lg:px-8">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-[#4f46e5] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : page ? (
          <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-gray-100">
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-8 pb-6 border-b border-gray-100">
              {page.title}
            </h1>
            <div 
              className="prose prose-lg prose-indigo max-w-none text-gray-600 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: page.content }}
            />
          </div>
        ) : (
          <div className="text-center py-20">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">الصفحة غير موجودة</h2>
            <p className="text-gray-600 mb-8">عذراً، لم نتمكن من العثور على الصفحة التي تبحث عنها.</p>
            <Link to="/" className="bg-[#4f46e5] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#4338ca] transition-colors inline-block">
              العودة للرئيسية
            </Link>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
