import React, { useState } from 'react';
import { CustomWindowCard } from '../../store/useSettingsStore';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { ChevronUp, ChevronDown, Trash2, Plus, Image as ImageIcon } from 'lucide-react';

interface Props {
  localSettings: any;
  setLocalSettings: React.Dispatch<React.SetStateAction<any>>;
}

export default function AdminCustomFeaturesSettings({ localSettings, setLocalSettings }: Props) {
  const [uploadingImage, setUploadingImage] = useState(false);
  const [newNewsItem, setNewNewsItem] = useState('');

  const handleNewsItemAdd = () => {
    if (newNewsItem.trim()) {
      setLocalSettings((prev: any) => ({
        ...prev,
        newsTickerItems: [...prev.newsTickerItems, newNewsItem.trim()]
      }));
      setNewNewsItem('');
    }
  };

  const handleNewsItemRemove = (index: number) => {
    setLocalSettings((prev: any) => ({
      ...prev,
      newsTickerItems: prev.newsTickerItems.filter((_: any, i: number) => i !== index)
    }));
  };

  const handleAddCard = () => {
    const newCard: CustomWindowCard = {
      id: Math.random().toString(36).substring(2),
      title: 'عنوان جديد',
      subtitle: 'وصف قصير',
      imageUrl: '',
      buttonText: 'اضغط هنا',
      buttonUrl: '#',
      layoutOrder: ['image', 'title', 'subtitle', 'button']
    };
    setLocalSettings((prev: any) => ({
      ...prev,
      customWindowCards: [...prev.customWindowCards, newCard]
    }));
  };

  const handleUpdateCard = (index: number, field: keyof CustomWindowCard, value: any) => {
    setLocalSettings((prev: any) => {
      const newCards = [...prev.customWindowCards];
      newCards[index] = { ...newCards[index], [field]: value };
      return { ...prev, customWindowCards: newCards };
    });
  };

  const handleRemoveCard = (index: number) => {
    setLocalSettings((prev: any) => ({
      ...prev,
      customWindowCards: prev.customWindowCards.filter((_: any, i: number) => i !== index)
    }));
  };

  const moveCard = (index: number, direction: 'up' | 'down') => {
    setLocalSettings((prev: any) => {
      const newCards = [...prev.customWindowCards];
      if (direction === 'up' && index > 0) {
        [newCards[index - 1], newCards[index]] = [newCards[index], newCards[index - 1]];
      } else if (direction === 'down' && index < newCards.length - 1) {
        [newCards[index + 1], newCards[index]] = [newCards[index], newCards[index + 1]];
      }
      return { ...prev, customWindowCards: newCards };
    });
  };

  const moveLayoutElement = (cardIndex: number, elementIndex: number, direction: 'up' | 'down') => {
    setLocalSettings((prev: any) => {
      const newCards = [...prev.customWindowCards];
      const layout = [...newCards[cardIndex].layoutOrder];
      if (direction === 'up' && elementIndex > 0) {
        [layout[elementIndex - 1], layout[elementIndex]] = [layout[elementIndex], layout[elementIndex - 1]];
      } else if (direction === 'down' && elementIndex < layout.length - 1) {
        [layout[elementIndex + 1], layout[elementIndex]] = [layout[elementIndex], layout[elementIndex + 1]];
      }
      newCards[cardIndex] = { ...newCards[cardIndex], layoutOrder: layout };
      return { ...prev, customWindowCards: newCards };
    });
  };

  const handleCardImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, cardIndex: number) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return;
      const file = e.target.files[0];
      setUploadingImage(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `card_${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('platform_assets')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('platform_assets').getPublicUrl(fileName);
      handleUpdateCard(cardIndex, 'imageUrl', data.publicUrl);
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('حدث خطأ أثناء رفع الصورة.');
    } finally {
      setUploadingImage(false);
    }
  };

  const layoutLabels: Record<string, string> = {
    image: 'الصورة',
    title: 'العنوان',
    subtitle: 'الوصف',
    button: 'الزر'
  };

  return (
    <div className="space-y-8 mt-8 border-t pt-8">
      {/* News Ticker */}
      <div>
        <div className="flex items-center justify-between mb-4 border-b pb-2">
          <h3 className="text-lg font-bold text-gray-800">شريط آخر الأخبار</h3>
          <label className="flex items-center cursor-pointer">
            <div className="relative">
              <input 
                type="checkbox" 
                className="sr-only" 
                checked={localSettings.newsTickerActive}
                onChange={(e) => setLocalSettings((prev: any) => ({ ...prev, newsTickerActive: e.target.checked }))}
              />
              <div className={`block w-14 h-8 rounded-full transition-colors ${localSettings.newsTickerActive ? 'bg-[#4f46e5]' : 'bg-gray-300'}`}></div>
              <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${localSettings.newsTickerActive ? 'transform translate-x-6' : ''}`}></div>
            </div>
            <span className="mr-3 font-medium text-gray-700">تفعيل الشريط</span>
          </label>
        </div>
        
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="أضف خبراً جديداً..."
            value={newNewsItem}
            onChange={(e) => setNewNewsItem(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleNewsItemAdd()}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:ring-[#4f46e5]"
          />
          <button onClick={handleNewsItemAdd} className="px-4 py-2 bg-[#4f46e5] text-white rounded-xl font-bold">
            إضافة
          </button>
        </div>
        
        <div className="space-y-2">
          {localSettings.newsTickerItems.map((item: string, index: number) => (
            <div key={index} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border">
              <span>{item}</span>
              <button onClick={() => handleNewsItemRemove(index)} className="text-red-500 hover:text-red-700">
                <Trash2 size={18} />
              </button>
            </div>
          ))}
          {localSettings.newsTickerItems.length === 0 && <p className="text-sm text-gray-500">لا توجد أخبار مضافة.</p>}
        </div>
      </div>

      {/* YouTube Playlist */}
      <div>
        <div className="flex items-center justify-between mb-4 border-b pb-2">
          <h3 className="text-lg font-bold text-gray-800">قائمة فيديوهات يوتيوب</h3>
          <label className="flex items-center cursor-pointer">
            <div className="relative">
              <input 
                type="checkbox" 
                className="sr-only" 
                checked={localSettings.youtubePlaylistActive}
                onChange={(e) => setLocalSettings((prev: any) => ({ ...prev, youtubePlaylistActive: e.target.checked }))}
              />
              <div className={`block w-14 h-8 rounded-full transition-colors ${localSettings.youtubePlaylistActive ? 'bg-[#4f46e5]' : 'bg-gray-300'}`}></div>
              <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${localSettings.youtubePlaylistActive ? 'transform translate-x-6' : ''}`}></div>
            </div>
            <span className="mr-3 font-medium text-gray-700">تفعيل القائمة</span>
          </label>
        </div>
        <div className="mb-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">رابط الفيديو أو القائمة (URL أو ID)</label>
          <input
            type="text"
            value={localSettings.youtubePlaylistUrl}
            onChange={(e) => setLocalSettings((prev: any) => ({ ...prev, youtubePlaylistUrl: e.target.value }))}
            placeholder="مثال: https://www.youtube.com/embed/videoseries?list=..."
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-[#4f46e5]"
          />
          <p className="text-xs text-gray-500 mt-1">يفضل وضع رابط التضمين (Embed URL) لضمان العمل الصحيح.</p>
        </div>
      </div>

      {/* Custom Window / Cards Slider */}
      <div>
        <div className="flex items-center justify-between mb-4 border-b pb-2">
          <h3 className="text-lg font-bold text-gray-800">النافذة المخصصة (البطاقات)</h3>
          <div className="flex gap-4 items-center">
            <button onClick={handleAddCard} className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700">
              <Plus size={16} /> إضافة بطاقة
            </button>
            <label className="flex items-center cursor-pointer">
              <div className="relative">
                <input 
                  type="checkbox" 
                  className="sr-only" 
                  checked={localSettings.customWindowActive}
                  onChange={(e) => setLocalSettings((prev: any) => ({ ...prev, customWindowActive: e.target.checked }))}
                />
                <div className={`block w-14 h-8 rounded-full transition-colors ${localSettings.customWindowActive ? 'bg-[#4f46e5]' : 'bg-gray-300'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${localSettings.customWindowActive ? 'transform translate-x-6' : ''}`}></div>
              </div>
              <span className="mr-3 font-medium text-gray-700">تفعيل النافذة</span>
            </label>
          </div>
        </div>

        <div className="space-y-6">
          {localSettings.customWindowCards.map((card: CustomWindowCard, cardIndex: number) => (
            <div key={card.id} className="bg-gray-50 p-5 rounded-2xl border border-gray-200 flex gap-4">
              <div className="flex flex-col items-center justify-center gap-2 border-l pl-4">
                <button onClick={() => moveCard(cardIndex, 'up')} disabled={cardIndex === 0} className="p-1 text-gray-500 hover:text-[#4f46e5] disabled:opacity-30">
                  <ChevronUp size={24} />
                </button>
                <span className="font-bold text-gray-400">{cardIndex + 1}</span>
                <button onClick={() => moveCard(cardIndex, 'down')} disabled={cardIndex === localSettings.customWindowCards.length - 1} className="p-1 text-gray-500 hover:text-[#4f46e5] disabled:opacity-30">
                  <ChevronDown size={24} />
                </button>
              </div>

              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">العنوان</label>
                  <input type="text" value={card.title} onChange={(e) => handleUpdateCard(cardIndex, 'title', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">الوصف</label>
                  <input type="text" value={card.subtitle} onChange={(e) => handleUpdateCard(cardIndex, 'subtitle', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">نص الزر</label>
                  <input type="text" value={card.buttonText} onChange={(e) => handleUpdateCard(cardIndex, 'buttonText', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">رابط الزر</label>
                  <input type="text" value={card.buttonUrl} onChange={(e) => handleUpdateCard(cardIndex, 'buttonUrl', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" dir="ltr" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">الصورة</label>
                  <div className="flex gap-2">
                    <input type="text" value={card.imageUrl} onChange={(e) => handleUpdateCard(cardIndex, 'imageUrl', e.target.value)} placeholder="رابط الصورة..." className="flex-1 px-3 py-2 border rounded-lg text-sm" dir="ltr" />
                    <label className="flex items-center justify-center px-4 py-2 bg-gray-200 rounded-lg cursor-pointer hover:bg-gray-300 transition-colors">
                      <ImageIcon size={18} className="mr-2" /> رفع
                      <input type="file" accept="image/*" onChange={(e) => handleCardImageUpload(e, cardIndex)} className="hidden" disabled={uploadingImage} />
                    </label>
                  </div>
                </div>
              </div>

              {/* Element Ordering (Drag & Drop replacement using Up/Down arrows) */}
              <div className="w-48 bg-white p-3 rounded-xl border border-gray-200">
                <h4 className="text-xs font-bold text-gray-600 mb-2 text-center">ترتيب العناصر (السحب)</h4>
                <div className="space-y-1">
                  {card.layoutOrder.map((element, elIndex) => (
                    <div key={element} className="flex items-center justify-between bg-gray-100 px-2 py-1.5 rounded-lg text-xs font-medium">
                      <span>{layoutLabels[element]}</span>
                      <div className="flex flex-col">
                        <button onClick={() => moveLayoutElement(cardIndex, elIndex, 'up')} disabled={elIndex === 0} className="text-gray-500 hover:text-black disabled:opacity-20"><ChevronUp size={14}/></button>
                        <button onClick={() => moveLayoutElement(cardIndex, elIndex, 'down')} disabled={elIndex === card.layoutOrder.length - 1} className="text-gray-500 hover:text-black disabled:opacity-20"><ChevronDown size={14}/></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-center">
                <button onClick={() => handleRemoveCard(cardIndex)} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200" title="حذف البطاقة">
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          ))}
          {localSettings.customWindowCards.length === 0 && (
            <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-2xl border border-dashed">
              لم تقم بإضافة أي بطاقات بعد.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
