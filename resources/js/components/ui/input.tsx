import React from 'react';
import { cn } from './button';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, label, error, id, ...props }, ref) => {
        return (
            <div className="w-full space-y-1.5">
                {label && (
                    <label htmlFor={id} className="block text-xs font-medium text-zinc-400">
                        {label}
                    </label>
                )}
                <input
                    ref={ref}
                    id={id}
                    className={cn(
                        'w-full px-3.5 py-2 text-sm text-zinc-100 bg-zinc-900/90 border rounded-lg outline-none transition-all placeholder:text-zinc-600',
                        error
                            ? 'border-rose-500/80 focus:ring-2 focus:ring-rose-500/30'
                            : 'border-zinc-800 focus:border-emerald-500/80 focus:ring-2 focus:ring-emerald-500/20',
                        className
                    )}
                    {...props}
                />
                {error && <p className="text-xs text-rose-400 font-medium">{error}</p>}
            </div>
        );
    }
);
Input.displayName = 'Input';
