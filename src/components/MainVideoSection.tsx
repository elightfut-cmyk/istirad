import { useSettingsStore } from '../store/useSettingsStore';

export default function MainVideoSection() {
  const { mainVideoTitle, mainVideoUrl, mainVideoDescription, mainVideoActive } = useSettingsStore();

  if (!mainVideoActive || !mainVideoUrl) {
    return null;
  }

  // extract youtube video id if possible
  const getEmbedUrl = (url: string) => {
    try {
      if (url.includes('youtube.com/watch?v=')) {
        const videoId = new URL(url).searchParams.get('v');
        return `https://www.youtube.com/embed/${videoId}`;
      }
      if (url.includes('youtu.be/')) {
        const videoId = url.split('youtu.be/')[1].split('?')[0];
        return `https://www.youtube.com/embed/${videoId}`;
      }
      return url; // fallback
    } catch {
      return url;
    }
  };

  return (
    <section className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm overflow-hidden relative p-8">
      <div className="w-full max-w-4xl mx-auto text-center relative z-10">
        <h2 className="text-3xl lg:text-4xl font-black mb-8 text-gray-900 dark:text-white relative inline-block">
          {mainVideoTitle}
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-1/2 h-1 bg-gradient-to-r from-transparent via-[#4f46e5] to-transparent rounded-full"></div>
        </h2>
        
        <div className="relative w-full overflow-hidden rounded-2xl shadow-xl aspect-video border-4 border-gray-100 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 mb-6">
          <iframe
            className="absolute top-0 left-0 w-full h-full"
            src={getEmbedUrl(mainVideoUrl)}
            title="Video player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>
        
        {mainVideoDescription && (
          <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-gray-900/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-700">
            {mainVideoDescription}
          </p>
        )}
      </div>
    </section>
  );
}
