export type OrderSourceValue = 'walk_in' | 'foodpanda' | 'grab' | 'nham24' | 'wownow' | 'other';
import { tr } from '@/locales/tr';

interface OrderSourceOption {
    value: OrderSourceValue;
    label: string;
    labelKm: string;
    badgeClass: string;
}

// Mirrors App\Enums\OrderSource
export const ORDER_SOURCES: OrderSourceOption[] = [
    {
        value: 'walk_in',
        label: 'Walk-in',
        labelKm: tr('ហាង'),
        badgeClass: 'bg-zinc-500/15 text-zinc-700 dark:text-zinc-300 border-zinc-500/30',
    },
    {
        value: 'foodpanda',
        label: 'foodpanda',
        labelKm: 'foodpanda',
        badgeClass: 'bg-pink-500/15 text-pink-600 dark:text-pink-400 border-pink-500/30',
    },
    {
        value: 'grab',
        label: 'Grab',
        labelKm: 'Grab',
        badgeClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    },
    {
        value: 'nham24',
        label: 'Nham24',
        labelKm: 'Nham24',
        badgeClass: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30',
    },
    {
        value: 'wownow',
        label: 'WOWNOW',
        labelKm: 'WOWNOW',
        badgeClass: 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30',
    },
    {
        value: 'other',
        label: 'Other App',
        labelKm: tr('App ផ្សេងៗ'),
        badgeClass: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30',
    },
];

export function getOrderSource(value: string | null | undefined): OrderSourceOption {
    return ORDER_SOURCES.find((s) => s.value === value) ?? ORDER_SOURCES[0];
}

export function isDeliveryPlatform(value: string | null | undefined): boolean {
    return getOrderSource(value).value !== 'walk_in';
}

/**
 * Bilingual label for printed receipts, e.g. "foodpanda" or "ហាង (Walk-in)".
 */
export function formatOrderSource(value: string | null | undefined): string {
    const source = getOrderSource(value);

    return source.labelKm === source.label ? source.label : `${source.labelKm} (${source.label})`;
}

interface OrderSourceBadgeProps {
    source: string | null | undefined;
    externalRef?: string | null;
    className?: string;
}

export function OrderSourceBadge({ source, externalRef, className = '' }: OrderSourceBadgeProps) {
    const option = getOrderSource(source);

    return (
        <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap font-khmer ${option.badgeClass} ${className}`}
        >
            {formatOrderSource(option.value)}
            {externalRef && <span className="font-mono font-semibold">#{externalRef}</span>}
        </span>
    );
}
