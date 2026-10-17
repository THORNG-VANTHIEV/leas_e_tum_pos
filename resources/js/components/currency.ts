import { usePage } from '@inertiajs/react';
import { PageProps } from '@/types';

/**
 * Riel per US dollar from Settings (shared by HandleInertiaRequests). Use this instead of hardcoding a rate.
 */
export function useExchangeRate(): number {
    const { business } = usePage<PageProps>().props;

    return business?.exchange_rate_khr || 4000;
}
