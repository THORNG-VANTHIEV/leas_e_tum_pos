import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
    size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', disabled, ...props }, ref) => {
        const variants = {
            primary: 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold shadow-lg shadow-emerald-500/20 active:translate-y-0.5',
            secondary: 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-medium border border-zinc-700/60',
            danger: 'bg-rose-600 hover:bg-rose-500 text-white font-semibold shadow-lg shadow-rose-600/20',
            ghost: 'hover:bg-zinc-800 text-zinc-300 hover:text-white',
            outline: 'border border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white',
        };

        const sizes = {
            sm: 'px-2.5 py-1.5 text-xs rounded-md',
            md: 'px-4 py-2 text-sm rounded-lg',
            lg: 'px-5 py-2.5 text-base rounded-lg',
        };

        return (
            <button
                ref={ref}
                disabled={disabled}
                className={cn(
                    'inline-flex items-center justify-center gap-2 transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none',
                    variants[variant],
                    sizes[size],
                    className
                )}
                {...props}
            />
        );
    }
);
Button.displayName = 'Button';
