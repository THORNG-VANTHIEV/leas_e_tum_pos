import { router } from '@inertiajs/react';
import { Users } from 'lucide-react';
import { tr } from '@/locales/tr';

export interface CashierOption {
    id: number;
    name: string;
    username: string;
}

interface CashierFilterProps {
    cashiers: CashierOption[];
    value: number | string | null | undefined;
    /** Other query params of the page to keep when switching cashier */
    query?: Record<string, unknown>;
}

/**
 * Staff selector for admins/supervisors. The server sends an empty list to cashiers,
 * so nothing renders for them — they only ever see their own records.
 */
export function CashierFilter({ cashiers, value, query = {} }: CashierFilterProps) {
    if (cashiers.length === 0) {
        return null;
    }

    const handleChange = (cashierId: string) => {
        router.get(
            window.location.pathname,
            { ...query, cashier_id: cashierId || undefined },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    return (
        <label className="inline-flex items-center gap-2 h-9 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-zinc-700 dark:text-zinc-200 shadow-xs">
            <Users className="w-4 h-4 text-amber-500 shrink-0" />
            <select
                value={value ? String(value) : ''}
                onChange={(e) => handleChange(e.target.value)}
                className="bg-transparent outline-none cursor-pointer font-khmer pr-1"
                aria-label="Filter by staff"
            >
                <option value="">{tr('បុគ្គលិកទាំងអស់ (All staff)')}</option>
                {cashiers.map((cashier) => (
                    <option key={cashier.id} value={cashier.id}>
                        {cashier.name} (@{cashier.username})
                    </option>
                ))}
            </select>
        </label>
    );
}
