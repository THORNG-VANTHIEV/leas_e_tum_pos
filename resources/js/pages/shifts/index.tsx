import React from 'react';
import { router, useForm } from '@inertiajs/react';
import { AppLayout } from '@/layouts/app-layout';
import { Card } from '@/components/ui/card';
import { CashierFilter, CashierOption } from '@/components/cashier-filter';
import { Banknote, Lock, LogOut, PlayCircle } from 'lucide-react';
import { tr } from '@/locales/tr';

interface ShiftSummary {
    opening_float_usd: string;
    cash_sales_usd: string;
    cash_sales_count: number;
    cash_in_usd: string;
    cash_out_usd: string;
    cash_expenses_usd: string;
    expected_cash_usd: string;
}

interface ClosedShift {
    id: number;
    opened_at: string;
    closed_at: string;
    opening_float_usd: string;
    expected_cash_usd: string;
    counted_total_usd: string;
    counted_usd: string;
    counted_khr: number;
    variance_usd: string;
    note: string | null;
    user: { id: number; name: string; username: string };
}

interface ShiftsPageProps {
    current_shift: { id: number; opened_at: string; summary: ShiftSummary } | null;
    history: { data: ClosedShift[]; current_page: number; last_page: number };
    exchange_rate: number;
    cashiers: CashierOption[];
    filters: { cashier_id: number | null };
}

const money = (value: string | number) => `$${Number(value).toFixed(2)}`;

function VarianceBadge({ variance }: { variance: number }) {
    if (Math.abs(variance) < 0.005) {
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-khmer">{tr('ត្រូវគ្នា')}</span>;
    }

    return variance < 0 ? (
        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 font-khmer">{tr('ខ្វះ')} {money(Math.abs(variance))}</span>
    ) : (
        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 font-khmer">{tr('លើស')} {money(variance)}</span>
    );
}

export default function ShiftsIndex({ current_shift: currentShift, history, exchange_rate: exchangeRate, cashiers, filters }: ShiftsPageProps) {
    const openForm = useForm({ opening_float_usd: '0' });
    const closeForm = useForm({ counted_usd: '', counted_khr: '', note: '' });

    const countedTotal = (parseFloat(closeForm.data.counted_usd) || 0) + (parseInt(closeForm.data.counted_khr, 10) || 0) / exchangeRate;
    const expected = currentShift ? parseFloat(currentShift.summary.expected_cash_usd) : 0;
    const hasCount = closeForm.data.counted_usd !== '' || closeForm.data.counted_khr !== '';

    const inputClass =
        'w-full h-10 px-3 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500';

    return (
        <AppLayout title={tr("វេន & បិទថតបេឡា")}>
            <div className="max-w-5xl mx-auto space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white font-khmer">{tr('វេន & បិទថតបេឡា')}</h1>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-khmer mt-1">
                            {tr('បើកវេនជាមួយលុយដើម ហើយនៅចុងវេន រាប់លុយក្នុងថត ដើម្បីដឹងថាខ្វះ ឬលើស។')}
                        </p>
                    </div>
                    <CashierFilter cashiers={cashiers} value={filters.cashier_id} />
                </div>

                {!currentShift ? (
                    <Card className="p-5 space-y-4">
                        <div className="flex items-center gap-2">
                            <PlayCircle className="w-5 h-5 text-emerald-500" />
                            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 font-khmer">{tr('បើកវេនថ្មី')}</h2>
                        </div>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                openForm.post('/shifts/open', { preserveScroll: true });
                            }}
                            className="flex flex-col sm:flex-row sm:items-end gap-3"
                        >
                            <label className="flex-1 space-y-1.5">
                                <span className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 font-khmer">{tr('លុយដើមក្នុងថត (Opening Float, USD)')}</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={openForm.data.opening_float_usd}
                                    onChange={(e) => openForm.setData('opening_float_usd', e.target.value)}
                                    className={inputClass}
                                />
                                {openForm.errors.opening_float_usd && <span className="text-xs text-rose-500">{openForm.errors.opening_float_usd}</span>}
                            </label>
                            <button
                                type="submit"
                                disabled={openForm.processing}
                                className="h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold font-khmer cursor-pointer disabled:opacity-50"
                            >
                                {tr('បើកវេន')}
                            </button>
                        </form>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <Card className="p-5 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Banknote className="w-5 h-5 text-amber-500" />
                                    <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 font-khmer">{tr('វេនកំពុងបើក')}</h2>
                                </div>
                                <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">{tr('ចាប់ពី')} {currentShift.opened_at}</span>
                            </div>
                            {[
                                [tr('លុយដើម (Opening float)'), `+ ${money(currentShift.summary.opening_float_usd)}`],
                                [`${tr('លក់ជាសាច់ប្រាក់')} (${currentShift.summary.cash_sales_count} ${tr('វិក្កយបត្រ')})`, `+ ${money(currentShift.summary.cash_sales_usd)}`],
                                [tr('លុយបញ្ចូលថត (Cash in)'), `+ ${money(currentShift.summary.cash_in_usd)}`],
                                [tr('លុយដកចេញ (Drops / Pay-out)'), `− ${money(currentShift.summary.cash_out_usd)}`],
                                [tr('ចំណាយពីថតបេឡា'), `− ${money(currentShift.summary.cash_expenses_usd)}`],
                            ].map(([label, value]) => (
                                <div key={label} className="flex items-center justify-between text-xs">
                                    <span className="text-zinc-600 dark:text-zinc-400 font-khmer">{label}</span>
                                    <span className="font-mono text-zinc-900 dark:text-zinc-100">{value}</span>
                                </div>
                            ))}
                            <div className="flex items-center justify-between pt-3 border-t border-zinc-200 dark:border-zinc-800">
                                <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 font-khmer">{tr('លុយគួរមានក្នុងថត')}</span>
                                <span className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400">{money(currentShift.summary.expected_cash_usd)}</span>
                            </div>
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-khmer">
                                KHQR, កាត និង tr("បង់តាម App") មិនចូលថតបេឡាទេ ដូច្នេះមិនត្រូវបានរាប់។
                            </p>
                        </Card>

                        <Card className="p-5 space-y-3">
                            <div className="flex items-center gap-2">
                                <Lock className="w-5 h-5 text-rose-500" />
                                <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 font-khmer">{tr('រាប់លុយ & បិទវេន')}</h2>
                            </div>
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    closeForm.post('/shifts/close', { preserveScroll: true, onSuccess: () => closeForm.reset() });
                                }}
                                className="space-y-3"
                            >
                                <div className="grid grid-cols-2 gap-3">
                                    <label className="space-y-1.5">
                                        <span className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 font-khmer">{tr('ដុល្លារ (USD)')}</span>
                                        <input type="number" step="0.01" min="0" required value={closeForm.data.counted_usd} onChange={(e) => closeForm.setData('counted_usd', e.target.value)} className={inputClass} />
                                        {closeForm.errors.counted_usd && <span className="text-xs text-rose-500">{closeForm.errors.counted_usd}</span>}
                                    </label>
                                    <label className="space-y-1.5">
                                        <span className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 font-khmer">{tr('រៀល (KHR)')}</span>
                                        <input type="number" step="100" min="0" value={closeForm.data.counted_khr} onChange={(e) => closeForm.setData('counted_khr', e.target.value)} className={inputClass} />
                                        <span className="block text-[11px] text-zinc-500 font-mono">1$ = {exchangeRate.toLocaleString()}{tr('៛')}</span>
                                    </label>
                                </div>
                                <label className="block space-y-1.5">
                                    <span className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 font-khmer">{tr('កំណត់សម្គាល់')}</span>
                                    <input type="text" maxLength={500} value={closeForm.data.note} onChange={(e) => closeForm.setData('note', e.target.value)} className={`${inputClass} font-khmer`} />
                                </label>
                                {hasCount && (
                                    <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs">
                                        <span className="font-khmer text-zinc-700 dark:text-zinc-300">
                                            {tr('រាប់បាន')} <strong className="font-mono">{money(countedTotal)}</strong>
                                        </span>
                                        <VarianceBadge variance={countedTotal - expected} />
                                    </div>
                                )}
                                <button
                                    type="submit"
                                    disabled={closeForm.processing}
                                    className="w-full h-10 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold font-khmer cursor-pointer disabled:opacity-50"
                                >
                                    {tr('បិទវេន')}
                                </button>
                            </form>
                        </Card>
                    </div>
                )}

                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={() => router.post('/logout')}
                        className="inline-flex items-center gap-2 h-9 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-khmer cursor-pointer"
                    >
                        <LogOut className="w-4 h-4" />
                        {tr('ប្តូរអ្នកប្រើ (Logout)')}
                    </button>
                </div>

                <Card className="p-0 overflow-hidden">
                    <div className="px-5 py-3 border-b border-zinc-200 dark:border-zinc-800 text-sm font-bold text-zinc-900 dark:text-zinc-100 font-khmer">
                        {tr('ប្រវត្តិវេន')}
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead className="text-left text-zinc-500 dark:text-zinc-400 font-khmer">
                                <tr>
                                    <th className="px-4 py-2">{tr('បិទនៅ')}</th>
                                    <th className="px-4 py-2">{tr('បុគ្គលិក')}</th>
                                    <th className="px-4 py-2 text-right">{tr('គួរមាន')}</th>
                                    <th className="px-4 py-2 text-right">{tr('រាប់បាន')}</th>
                                    <th className="px-4 py-2 text-right">{tr('លទ្ធផល')}</th>
                                    <th className="px-4 py-2">{tr('កំណត់សម្គាល់')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                                {history.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-8 text-center text-zinc-500 font-khmer">{tr('មិនទាន់មានវេនដែលបានបិទទេ')}</td>
                                    </tr>
                                ) : (
                                    history.data.map((shift) => (
                                        <tr key={shift.id}>
                                            <td className="px-4 py-2 font-mono text-zinc-700 dark:text-zinc-300">{shift.closed_at.slice(0, 16).replace('T', ' ')}</td>
                                            <td className="px-4 py-2 text-zinc-900 dark:text-zinc-100">{shift.user.name}</td>
                                            <td className="px-4 py-2 text-right font-mono">{money(shift.expected_cash_usd)}</td>
                                            <td className="px-4 py-2 text-right font-mono">
                                                {money(shift.counted_total_usd)}
                                                {shift.counted_khr > 0 && (
                                                    <span className="block text-[10px] text-zinc-500">
                                                        {money(shift.counted_usd)} + {shift.counted_khr.toLocaleString()}{tr('៛')}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-2 text-right">
                                                <VarianceBadge variance={parseFloat(shift.variance_usd)} />
                                            </td>
                                            <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400 font-khmer">{shift.note || '—'}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </AppLayout>
    );
}
