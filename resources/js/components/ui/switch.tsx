import React from 'react';
import { cn } from './button';

export interface SwitchProps {
    id?: string;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    disabled?: boolean;
    className?: string;
    ariaLabel?: string;
    name?: string;
}

export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
    (
        {
            id,
            checked,
            onCheckedChange,
            disabled = false,
            className,
            ariaLabel,
            name,
        },
        ref
    ) => {
        return (
            <label
                htmlFor={id}
                className={cn(
                    'relative inline-flex items-center select-none shrink-0',
                    disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
                    className
                )}
            >
                <input
                    ref={ref}
                    type="checkbox"
                    id={id}
                    name={name}
                    checked={checked}
                    disabled={disabled}
                    aria-label={ariaLabel}
                    onChange={(e) => onCheckedChange(e.target.checked)}
                    className="sr-only peer"
                />
                <div
                    className={cn(
                        'w-11 h-6 rounded-full p-0.5 transition-colors duration-200 ease-in-out',
                        'peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-500 peer-focus-visible:ring-offset-2',
                        'ring-1 ring-inset ring-black/10 dark:ring-white/10',
                        checked
                            ? 'bg-emerald-500 hover:bg-emerald-600'
                            : 'bg-zinc-700 hover:bg-zinc-600'
                    )}
                >
                    <div
                        className={cn(
                            'w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 ease-in-out',
                            checked ? 'translate-x-5' : 'translate-x-0'
                        )}
                    />
                </div>
            </label>
        );
    }
);

Switch.displayName = 'Switch';
