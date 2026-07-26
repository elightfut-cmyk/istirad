import { useRef, useEffect } from 'react';
import { Bold, Underline, Palette } from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);

  useEffect(() => {
    if (editorRef.current && !isInternalChange.current) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value || '';
      }
    }
    isInternalChange.current = false;
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      isInternalChange.current = true;
      onChange(editorRef.current.innerHTML);
    }
  };

  const execCommand = (command: string, arg?: string) => {
    document.execCommand(command, false, arg);
    editorRef.current?.focus();
    handleInput();
  };

  return (
    <div className="w-full bg-white border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-[#4f46e5]">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-gray-100 bg-gray-50 flex-wrap">
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); execCommand('bold'); }}
          className="p-1.5 text-gray-700 hover:bg-gray-200 hover:text-black rounded transition-colors"
          title="غامق"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); execCommand('underline'); }}
          className="p-1.5 text-gray-700 hover:bg-gray-200 hover:text-black rounded transition-colors"
          title="مسطر"
        >
          <Underline className="w-4 h-4" />
        </button>
        <div className="flex items-center px-2 border-r border-gray-200 relative group cursor-pointer" title="لون النص">
          <Palette className="w-4 h-4 text-gray-600" />
          <input
            type="color"
            onChange={(e) => execCommand('foreColor', e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>
      </div>
      {/* Editor Area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onBlur={handleInput}
        className="w-full min-h-[80px] max-h-[300px] overflow-y-auto p-3 outline-none text-sm leading-relaxed prose-sm"
        dir="auto"
        placeholder={placeholder}
        style={{ emptyCells: 'show' }}
      />
    </div>
  );
}
