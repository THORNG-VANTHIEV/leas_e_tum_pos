import { useState } from 'react';
import { router } from '@inertiajs/react';
import { ChefHat, RefreshCw } from 'lucide-react';
import { tr } from '@/locales/tr';

interface ReprintKitchenTicketButtonProps {
    documentId: number;
    className?: string;
    /** 'menu' renders a plain row for dropdown menus */
    variant?: 'button' | 'menu';
}

/**
 * Sends the order's latest kitchen ticket to the cashier printer again (lost or jammed slip).
 * The server answers with a print job that the layout's PrintQueue prints right away.
 */
export function ReprintKitchenTicketButton({ documentId, className = '', variant = 'button' }: ReprintKitchenTicketButtonProps) {
    const [isSending, setIsSending] = useState(false);

    const reprint = () => {
        setIsSending(true);
        router.post(
            `/invoices/${documentId}/kitchen-ticket/reprint`,
            {},
            {
                preserveScroll: true,
                preserveState: true,
                onFinish: () => setIsSending(false),
            },
        );
    };

    return (
        <button
            type="button"
            onClick={reprint}
            disabled={isSending}
            title={tr('ព្រីនបុងចុងភៅចុងក្រោយម្តងទៀត (ពេលបុងបាត់ ឬម៉ាស៊ីនព្រីនជាប់ក្រដាស)')}
            className={`${
                variant === 'menu'
                    ? 'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs text-zinc-200 hover:bg-zinc-800'
                    : 'inline-flex items-center justify-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold'
            } font-khmer whitespace-nowrap transition-all cursor-pointer disabled:opacity-50 ${className}`}
        >
            {isSending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ChefHat className="w-3.5 h-3.5 text-amber-400" />}
            <span>{tr('ព្រីនបុងចុងភៅម្តងទៀត')}</span>
        </button>
    );
}
