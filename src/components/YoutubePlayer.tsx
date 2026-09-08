import { useSettingsStore } from '../store/useSettingsStore';

export default function YoutubePlayer() {
  const { youtubePlaylistUrl, youtubePlaylistActive } = useSettingsStore();

  if (!youtubePlaylistActive || !youtubePlaylistUrl) {
    return null;
  }

  // Helper to extract embed url if the user pasted a standard watch URL
  const getEmbedUrl = (url: string) => {
    if (url.includes('embed')) return url;
    
    // Convert watch?v=... to embed/...
    const match = url.match(/[?&]v=([^&]+)/);
    if (match && match[1]) {
      return `https://www.youtube.com/embed/${match[1]}`;
    }
    
    // Convert playlist link (list=...)
    const listMatch = url.match(/[?&]list=([^&]+)/);
    if (listMatch && listMatch[1]) {
      return `https://www.youtube.com/embed/videoseries?list=${listMatch[1]}`;
    }

    return url;
  };

  const embedUrl = getEmbedUrl(youtubePlaylistUrl);

  return (
    <div className="w-full py-12 bg-white border-y border-gray-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900">شروحات المنصة</h2>
          <p className="text-gray-500 mt-2">تعرف على كيفية استخدام المنصة وتحقيق أقصى استفادة</p>
        </div>
        
        <div className="relative w-full overflow-hidden pt-[56.25%] rounded-2xl shadow-lg border border-gray-100">
          <iframe 
            className="absolute top-0 left-0 bottom-0 right-0 w-full h-full"
            src={embedUrl}
            title="YouTube video player" 
            frameBorder="0" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
            allowFullScreen
          ></iframe>
        </div>
      </div>
    </div>
  );
}
