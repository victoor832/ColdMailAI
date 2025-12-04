'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { Button } from './button';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    className?: string;
    size?: 'default' | 'lg' | 'xl' | 'full';
}

export function Modal({ isOpen, onClose, title, children, className, size = 'default' }: ModalProps) {
    const overlayRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const sizeClasses = {
        default: 'max-w-lg max-h-[85vh]',
        lg: 'max-w-2xl max-h-[85vh]',
        xl: 'max-w-4xl max-h-[85vh]',
        full: 'max-w-[95vw] h-[90vh]',
    };

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                ref={overlayRef}
                className="absolute inset-0"
                onClick={onClose}
            />
            <div className={cn(
                "relative bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full flex flex-col animate-in zoom-in-95 duration-200",
                sizeClasses[size],
                className
            )}>
                <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
                    <h2 className="text-lg font-semibold">{title}</h2>
                    <Button
                        variant="secondary"
                        onClick={onClose}
                        className="h-8 w-8 p-0 !border-0 hover:bg-slate-100 dark:hover:bg-slate-800 text-2xl leading-none flex items-center justify-center"
                    >
                        <span className="sr-only">Close</span>
                        ×
                    </Button>
                </div>
                <div className="p-6 overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>,
        document.body
    );
}
