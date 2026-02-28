import React, { useEffect } from 'react';
import { X } from 'lucide-react';

const Modal = ({
    isOpen,
    onClose,
    title,
    description,
    children,
    size = 'md',
    showClose = true
}) => {
    const sizes = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        full: 'max-w-4xl',
    };

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 dark:bg-black/60"
                onClick={onClose}
            />

            {/* Modal */}
            <div className={`
                relative bg-white dark:bg-gray-800 w-full ${sizes[size]}
                rounded-xl shadow-xl border border-gray-200 dark:border-gray-700
                animate-scale-in overflow-hidden
                max-h-[calc(100vh-2rem)] overflow-y-auto
            `}>
                {/* Header */}
                {(title || showClose) && (
                    <div className="flex items-start justify-between p-5 pb-0">
                        <div>
                            {title && (
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
                            )}
                            {description && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
                            )}
                        </div>
                        {showClose && (
                            <button
                                onClick={onClose}
                                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors -mt-0.5 -mr-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                                <X size={18} />
                            </button>
                        )}
                    </div>
                )}

                {/* Content */}
                <div className="p-5">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal;
