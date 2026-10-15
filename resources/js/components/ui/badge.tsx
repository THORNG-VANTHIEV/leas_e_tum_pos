import React from 'react';
import { cn } from './button';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    variant?: 'emerald' | 'amber' | 'rose' | 'zinc' | 'sky';
}

export const Badge: React.FC<BadgeProps> = ({
    children,
    variant = 'zinc',
    className,
    ...props
}) => {
    const variants = {
        emerald: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-400 border-emerald-500/30 dark:border-emerald-500/20',
        amber: 'bg-amber-500/15 text-amber-900 dark:text-amber-400 border-amber-500/30 dark:border-amber-500/20',
        rose: 'bg-rose-500/15 text-rose-800 dark:text-rose-400 border-rose-500/30 dark:border-rose-500/20',
        zinc: 'bg-zinc-800 text-zinc-300 border-zinc-700/60',
        sky: 'bg-sky-500/15 text-sky-800 dark:text-sky-400 border-sky-500/30 dark:border-sky-500/20',
    };

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium rounded-full border',
                variants[variant],
                className
            )}
            {...props}
        >
            {children}
        </span>
    );
};
