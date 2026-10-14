import React from 'react';
import { cn } from './button';

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
    children,
    className,
    ...props
}) => {
    return (
        <div
            className={cn(
                'glass-panel rounded-xl p-5 shadow-xl transition-all duration-200',
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
};
