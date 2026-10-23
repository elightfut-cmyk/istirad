import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
  dir?: 'rtl' | 'ltr';
  className?: string;
  headerClassName?: string;
}

const sizeClasses: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
  full: 'max-w-4xl',
};

/**
 * Non-Blocking Portal-based Modal Component
 * 
 * Architectural Highlights:
 * 1. Uses React Portal (document.body) to isolate rendering from parent component lifecycles.
 * 2. Never blocks the React Main Thread or child/parent useEffect hooks (such as push notification registration).
 * 3. Clean keyboard (Escape) & backdrop dismissal with automatic scroll-lock cleanup.
 * 4. Tailwind CSS styling with smooth entrance animations and full Dark/RTL support.
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  dir = 'rtl',
  className = '',
  headerClassName = '',
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Keyboard accessibility: Escape key listener
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEscape, onClose]);

  // Non-blocking body scroll lock with restore
  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  // Return null if modal is closed or SSR
  if (!isOpen || typeof document === 'undefined') {
    return null;
  }

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      dir={dir}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
    >
      {/* Non-blocking backdrop overlay */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={() => {
          if (closeOnBackdropClick) {
            onClose();
          }
        }}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div
        ref={modalRef}
        className={`relative w-full ${sizeClasses[size]} bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700/80 p-6 sm:p-8 z-10 overflow-hidden transition-all transform animate-in fade-in zoom-in-95 duration-200 ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        {showCloseButton && (
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق النافذة"
            className="absolute top-4 left-4 p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/60 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <X size={20} />
          </button>
        )}

        {/* Modal Header */}
        {(title || description) && (
          <div className={`mb-5 ${headerClassName}`}>
            {title && (
              <h3 className="text-xl font-black text-gray-900 dark:text-white leading-tight">
                {title}
              </h3>
            )}
            {description && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {description}
              </p>
            )}
          </div>
        )}

        {/* Modal Body */}
        <div className="relative">
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default Modal;
