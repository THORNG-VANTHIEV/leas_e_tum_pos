import React, { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { AppLayout } from '@/layouts/app-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PageProps } from '@/types';
import {
    BarChart3,
    DollarSign,
    Receipt,
    Users,
    Download,
    Filter,
    RotateCcw,
    Calendar,
    Clock,
    ArrowUpRight,
    ArrowDownRight,
    TrendingUp,
    TrendingDown,
    WalletCards,
    Truck,
    Ban,
    AlertTriangle,
    Eye,
    Scale,
    FileSpreadsheet,
    PieChart,
    Layers,
} from 'lucide-react';
import { useExchangeRate } from '@/components/currency';
import { OrderSourceBadge } from '@/components/order-source';
import { DocumentStatusBadge } from '@/components/document-status';
import { tr } from '@/locales/tr';

const CATEGORY_MAP: Record<string, { nameKh: string; color: string }> = {
    utilities: { nameKh: tr('ថ្លៃទឹក-ភ្លើង-សំរាម'), color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
    supplies: { nameKh: tr('សម្ភារៈប្រើប្រាស់ក្នុងហាង'), color: 'text-sky-400 bg-sky-500/10 border-sky-500/30' },
    marketing: { nameKh: tr('ផ្សព្វផ្សាយ & ទីផ្សារ'), color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
    maintenance: { nameKh: tr('ជួសជុល & ថែទាំ'), color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' },
    salaries: { nameKh: tr('ប្រាក់បៀវត្សរ៍ & ឧបត្ថម្ភ'), color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
    petty_cash: { nameKh: tr('ចំណាយរាយកំប៉ិកកំប៉ុក'), color: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/30' },
    inventory: { nameKh: tr('ទំនិញ & គ្រឿងផ្សំបន្ទាន់'), color: 'text-teal-400 bg-teal-500/10 border-teal-500/30' },
    transport: { nameKh: tr('ដឹកជញ្ជូន & ធ្វើដំណើរ'), color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30' },
    other: { nameKh: tr('ចំណាយផ្សេងៗ'), color: 'text-zinc-400 bg-zinc-800 border-zinc-700' },
};

interface ReportsPageProps {
    metrics: {
        gross_sales: string;
        discounts: string;
        net_sales: string;
        tax_collected: string;
        invoiced_total: string;
        cash_tendered: string;
        change_given: string;
        net_cash_received: string;
        total_documents: number;
        total_units: number;
        void_count: number;
        void_value: string;
        open_orders_count: number;
        open_orders_value: string;
        unverified_count: number;
    };
    financialSummary?: {
        gross_sales: string;
        discounts: string;
        net_sales: string;
        operating_expenses: number;
        operating_expenses_khr: number;
        stock_purchases: number;
        total_outgoing: number;
        net_profit: number;
        profit_margin_pct: number;
        expense_categories: {
            category: string;
            count: number;
            total_usd: number;
            total_khr: number;
        }[];
        expenses_count: number;
        purchases_count: number;
    };
    cashierBreakdown: {
        cashier_id: number;
        name: string;
        document_count: number;
        gross_sales: string;
        net_sales: string;
        change_sum: string;
        net_cash: string;
    }[];
    documents: {
        id: number;
        provisional_order: number;
        sequence_no: number | null;
        document_number: string | null;
        business_date: string;
        event_time: string;
        reference_identifier: string | null;
        unit_count: number;
        grand_total: string;
        subtotal: string;
        source_total: string;
        source_total_verified: boolean;
        payment_method: string;
        status: 'draft' | 'review' | 'finalized' | 'void';
        creator: { name: string };
        period: { code: string };
    }[];
    periods: { id: number; code: string; name: string; status: string }[];
    cashiers: { id: number; name: string; username: string }[];
    sales_by_source: { source: string; count: number; total: string }[];
    sales_by_payment: { method: string; count: number; total: string }[];
    filters: {
        period_id: string | null;
        start_date: string | null;
        end_date: string | null;
        cashier_id: string | null;
    };
}

const PAYMENT_LABELS: Record<string, string> = {
    cash: tr('សាច់ប្រាក់ (Cash) — ក្នុងថតបេឡា'),
    khqr: 'KHQR',
    qr_transfer: 'QR Transfer',
    card: tr('កាត (Card)'),
    app: tr('បង់តាម App — រង់ចាំ App ផ្ទេរ'),
};

export default function ReportsIndex({
    metrics,
    financialSummary,
    cashierBreakdown,
    documents,
    periods,
    cashiers,
    filters,
    sales_by_source: salesBySource,
    sales_by_payment: salesByPayment,
}: ReportsPageProps) {
    const exchangeRate = useExchangeRate();
    const { auth, business } = usePage<PageProps>().props;
    // Admins and supervisors see every cashier and can filter by one (mirrors User::canViewAllRecords)
    const canViewAll = ['admin', 'supervisor'].includes(auth.user?.role ?? '');

    const [activeTab, setActiveTab] = useState<'sales' | 'pnl'>('sales');
    const [periodId, setPeriodId] = useState(filters.period_id || '');
    const [startDate, setStartDate] = useState(filters.start_date || '');
    const [endDate, setEndDate] = useState(filters.end_date || '');
    const [cashierId, setCashierId] = useState(filters.cashier_id || '');

    const isProfitable = (financialSummary?.net_profit ?? 0) >= 0;

    const handleApplyFilters = () => {
        router.get(
            '/reports',
            {
                period_id: periodId || undefined,
                start_date: startDate || undefined,
                end_date: endDate || undefined,
                cashier_id: cashierId || undefined,
            },
            { preserveState: true }
        );
    };

    const handleReset = () => {
        setPeriodId('');
        setStartDate('');
        setEndDate('');
        setCashierId('');
        router.get('/reports');
    };

    const handleExportCsv = () => {
        const params = new URLSearchParams();
        if (periodId) params.append('period_id', periodId);
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        if (cashierId) params.append('cashier_id', cashierId);

        window.location.href = `/reports/export/csv?${params.toString()}`;
    };

    return (
        <AppLayout title={tr("របាយការណ៍")}>
            <Head title={tr("របាយការណ៍")} />

            <div className="space-y-6">
                {/* Fixed / Sticky Header & Filter Controls */}
                <div className="sticky top-14 md:top-0 z-20 bg-zinc-950/95 backdrop-blur-xl -mt-6 pt-6 pb-4 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 border-b border-zinc-800/80 space-y-4 shadow-xs">
                    {/* Header & Export Actions */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                                    <BarChart3 className="w-5 h-5" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold tracking-tight text-white font-khmer">
                                        {tr('របាយការណ៍ការលក់')}
                                    </h1>
                                    <p className="text-xs text-zinc-400 font-khmer">
                                        {canViewAll
                                            ? tr('សង្ខេបហិរញ្ញវត្ថុទាំងហាង និងតាមបុគ្គលិក')
                                            : tr('ការលក់ និងប្រវត្តិវិក្កយបត្ររបស់ខ្ញុំ')}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                onClick={handleExportCsv}
                                variant="outline"
                                size="sm"
                                className="border-zinc-800 hover:bg-zinc-800 text-zinc-200"
                            >
                                <Download className="w-4 h-4 mr-1.5 text-teal-400" />
                                <span className="font-khmer">{tr('ទាញយក CSV')}</span>
                            </Button>
                        </div>
                    </div>

                    {/* Filter Controls Card */}
                    <Card className="p-4 sm:p-5 bg-zinc-900/80 border-zinc-750/70 dark:border-zinc-800/80 rounded-2xl shadow-xs backdrop-blur-xl">
                        {/* Header inside card */}
                        <div className="flex items-center justify-between pb-3 mb-3.5 border-b border-zinc-800/60">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-600 dark:text-teal-400">
                                    <Filter className="w-3.5 h-3.5" />
                                </div>
                                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 font-khmer">
                                    {tr('តម្រងស្វែងរកទិន្នន័យ')}
                                </span>
                                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                                    / Filter
                                </span>
                            </div>
                            {(periodId || startDate || endDate || cashierId) && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30">
                                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                                    <span className="font-khmer">{tr('កំពុងច្រោះ')}</span>
                                </span>
                            )}
                        </div>

                        {/* Form Controls Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
                            {/* Period */}
                            <div className={`${canViewAll ? 'lg:col-span-3' : 'lg:col-span-4'} space-y-1.5`}>
                                <label className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-mono">
                                    <Clock className="w-3 h-3 text-teal-500" />
                                    <span className="font-khmer">{tr('វគ្គ')}</span>
                                </label>
                                <div className="relative">
                                    <select
                                        value={periodId}
                                        onChange={(e) => setPeriodId(e.target.value)}
                                        className="w-full h-9.5 bg-zinc-950 border border-zinc-700/60 dark:border-zinc-800 rounded-xl px-3 text-xs text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition-all cursor-pointer font-khmer shadow-2xs"
                                    >
                                        <option value="">{tr('គ្រប់វគ្គទាំងអស់ (All Periods)')}</option>
                                        {periods.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.code} - {p.name} ({p.status})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* From Date */}
                            <div className={`${canViewAll ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-1.5`}>
                                <label className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-mono">
                                    <Calendar className="w-3 h-3 text-teal-500" />
                                    <span className="font-khmer">{tr('ចាប់ពីថ្ងៃ')}</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full h-9.5 px-3 bg-zinc-950 border border-zinc-700/60 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition-all cursor-pointer font-mono shadow-2xs"
                                    />
                                </div>
                            </div>

                            {/* To Date */}
                            <div className={`${canViewAll ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-1.5`}>
                                <label className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-mono">
                                    <Calendar className="w-3 h-3 text-teal-500" />
                                    <span className="font-khmer">{tr('ដល់ថ្ងៃ')}</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="w-full h-9.5 px-3 bg-zinc-950 border border-zinc-700/60 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition-all cursor-pointer font-mono shadow-2xs"
                                    />
                                </div>
                            </div>

                            {/* Cashier (Admin Only) */}
                            {canViewAll && (
                                <div className="lg:col-span-3 space-y-1.5">
                                    <label className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-mono">
                                        <Users className="w-3 h-3 text-teal-500" />
                                        <span className="font-khmer">{tr('បុគ្គលិក')}</span>
                                    </label>
                                    <div className="relative">
                                        <select
                                            value={cashierId}
                                            onChange={(e) => setCashierId(e.target.value)}
                                            className="w-full h-9.5 bg-zinc-950 border border-zinc-700/60 dark:border-zinc-800 rounded-xl px-3 text-xs text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition-all cursor-pointer font-khmer shadow-2xs"
                                        >
                                            <option value="">{tr('គ្រប់បេឡាករទាំងអស់ (All Cashiers)')}</option>
                                            {cashiers.map((c) => (
                                                <option key={c.id} value={c.id}>
                                                    {c.name} (@{c.username})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className={`${canViewAll ? 'lg:col-span-2' : 'lg:col-span-2'} flex items-center gap-2 pt-1 sm:pt-0`}>
                                <Button
                                    size="sm"
                                    onClick={handleApplyFilters}
                                    className="flex-1 h-9.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl shadow-xs font-medium cursor-pointer transition-all active:scale-[0.98] text-xs gap-1.5"
                                >
                                    <Filter className="w-3.5 h-3.5" />
                                    <span className="font-khmer">{tr('ច្រោះ')}</span>
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleReset}
                                    title={tr("សម្អាតតម្រង")}
                                    className="h-9.5 px-3 border-zinc-700/60 dark:border-zinc-800 bg-zinc-800/60 hover:bg-zinc-700/60 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white rounded-xl cursor-pointer transition-all text-xs gap-1.5 shadow-2xs"
                                >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline font-khmer">{tr('សម្អាត')}</span>
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* View Mode Switcher: Sales Register vs Profit & Loss */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-3">
                    <div className="flex items-center gap-2 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
                        <button
                            type="button"
                            onClick={() => setActiveTab('sales')}
                            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                activeTab === 'sales'
                                    ? 'bg-white dark:bg-zinc-800 text-teal-600 dark:text-teal-400 shadow-xs'
                                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                            }`}
                        >
                            <Receipt className="w-3.5 h-3.5" />
                            <span>{tr('របាយការណ៍លក់ & វិក្កយបត្រ (Sales Register)')}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('pnl')}
                            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                activeTab === 'pnl'
                                    ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                            }`}
                        >
                            <Scale className="w-3.5 h-3.5" />
                            <span>{tr('សង្ខេបចំណូល-ចំណាយ & ចំណេញសុទ្ធ (Profit & Loss / P&L)')}</span>
                        </button>
                    </div>

                    {financialSummary && (
                        <div className="flex items-center gap-2 text-xs">
                            <span className="text-zinc-500 font-khmer">{tr('ស្ថានភាពទូទៅ:')}</span>
                            <Badge
                                variant={isProfitable ? 'emerald' : 'rose'}
                                className="font-mono text-[11px] px-2.5 py-0.5"
                            >
                                {isProfitable ? '+' : ''}{financialSummary.profit_margin_pct}% Margin
                            </Badge>
                        </div>
                    )}
                </div>

                {activeTab === 'sales' ? (
                    <>
                        {/* KPI Metrics Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Gross Sales */}
                    <Card className="p-4 bg-zinc-900/70 border-zinc-800/80 rounded-2xl flex flex-col justify-between relative overflow-hidden">
                        <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                            <span className="font-khmer">{tr('ចំណូលសរុប')}</span>
                            <DollarSign className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div className="mt-2">
                            <div className="text-xl sm:text-2xl font-bold font-mono text-white">
                                {business.currency_symbol}{metrics.gross_sales}
                            </div>
                            <div className="text-xs text-emerald-400 font-mono font-medium mt-1">
                                ≈ {Math.round((parseFloat(metrics.gross_sales) || 0) * exchangeRate).toLocaleString()} {tr('៛')}
                            </div>
                            <div className="text-[11px] text-zinc-400 font-khmer mt-1">
                                {tr('បញ្ចុះតម្លៃ: -')}{business.currency_symbol}{metrics.discounts}
                            </div>
                        </div>
                    </Card>

                    {/* Net Sales */}
                    <Card className="p-4 bg-zinc-900/70 border-zinc-800/80 rounded-2xl flex flex-col justify-between relative overflow-hidden">
                        <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                            <span className="font-khmer">{tr('ចំណូលសុទ្ធ')}</span>
                            <ArrowUpRight className="w-4 h-4 text-teal-400" />
                        </div>
                        <div className="mt-2">
                            <div className="text-xl sm:text-2xl font-bold font-mono text-white">
                                {business.currency_symbol}{metrics.net_sales}
                            </div>
                            <div className="text-xs text-teal-400 font-mono font-medium mt-1">
                                ≈ {Math.round((parseFloat(metrics.net_sales) || 0) * exchangeRate).toLocaleString()} {tr('៛')}
                            </div>
                            <div className="text-[11px] text-zinc-400 font-khmer mt-1">
                                {tr('ពន្ធកត់ត្រា:')} {business.currency_symbol}{metrics.tax_collected}
                            </div>
                        </div>
                    </Card>

                    {/* Cash Collected & Change */}
                    <Card className="p-4 bg-zinc-900/70 border-zinc-800/80 rounded-2xl flex flex-col justify-between relative overflow-hidden">
                        <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                            <span className="font-khmer">{tr('សាច់ប្រាក់ក្នុងថតបេឡា')}</span>
                            <Receipt className="w-4 h-4 text-amber-400" />
                        </div>
                        <div className="mt-2">
                            <div className="text-xl sm:text-2xl font-bold font-mono text-white">
                                {business.currency_symbol}{metrics.net_cash_received}
                            </div>
                            <div className="text-xs text-amber-400 font-mono font-medium mt-1">
                                ≈ {Math.round((parseFloat(metrics.net_cash_received) || 0) * exchangeRate).toLocaleString()} {tr('៛')}
                            </div>
                            <div className="text-[11px] text-zinc-400 font-khmer mt-1">
                                {tr('ទទួល:')} {business.currency_symbol}{metrics.cash_tendered} {tr('• អាប់:')} {business.currency_symbol}{metrics.change_given}
                            </div>
                        </div>
                    </Card>

                    {/* Volume & Exceptions */}
                    <Card className="p-4 bg-zinc-900/70 border-zinc-800/80 rounded-2xl flex flex-col justify-between relative overflow-hidden">
                        <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                            <span className="font-khmer">{tr('វិក្កយបត្រ & ភ្ញៀវ')}</span>
                            <Users className="w-4 h-4 text-purple-400" />
                        </div>
                        <div className="mt-2">
                            <div className="text-xl sm:text-2xl font-bold font-mono text-white">
                                {metrics.total_documents} <span className="text-xs font-normal text-zinc-400 font-khmer">{tr('សន្លឹក')}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-purple-400/90 font-khmer mt-1">
                                <span>{metrics.total_units} {tr('ភ្ញៀវសរុប (Pax)')}</span>
                                {metrics.void_count > 0 && (
                                    <span className="text-rose-400 font-semibold font-mono">
                                        {metrics.void_count} Void
                                    </span>
                                )}
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Reconciliation Notice Banner */}
                {metrics.unverified_count > 0 && (
                    <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                            <span className="font-khmer">
                                <strong>{tr('ត្រូវពិនិត្យ:')}</strong> {tr('វិក្កយបត្រ')} {metrics.unverified_count} {tr('សន្លឹក មិនទាន់ផ្ទៀងផ្ទាត់ជាមួយក្រដាសកម្មង់។')}
                            </span>
                        </div>
                    </div>
                )}

                {/* Held tables not paid yet: not part of sales until checkout */}
                {metrics.open_orders_count > 0 && (
                    <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-700 dark:text-sky-300 text-xs flex items-center gap-2.5 font-khmer">
                        <Users className="w-4 h-4 shrink-0" />
                        <span>
                            {tr('មានការកម្មង់កំពុងបើក (មិនទាន់គិតប្រាក់)')} <strong className="font-mono">{metrics.open_orders_count}</strong> {tr('ចំនួន សរុប')} <strong className="font-mono">${metrics.open_orders_value}</strong> {tr('— មិនទាន់រាប់ក្នុងចំណូលទេ។')}
                        </span>
                    </div>
                )}

                {/* Sales by channel and by payment method (reconcile delivery app payouts and the cash drawer) */}
                {(salesBySource.length > 0 || salesByPayment.length > 0) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card className="p-4 bg-zinc-900/70 border-zinc-800/80 rounded-2xl space-y-2">
                            <h3 className="text-xs font-bold text-zinc-200 font-khmer">{tr('ការលក់តាមប្រភព (Sales by Channel)')}</h3>
                            {salesBySource.map((row) => (
                                <div key={row.source} className="flex items-center justify-between text-xs">
                                    <OrderSourceBadge source={row.source} />
                                    <span className="font-mono text-zinc-300">
                                        {row.count} × · <strong className="text-zinc-100">${row.total}</strong>
                                    </span>
                                </div>
                            ))}
                        </Card>
                        <Card className="p-4 bg-zinc-900/70 border-zinc-800/80 rounded-2xl space-y-2">
                            <h3 className="text-xs font-bold text-zinc-200 font-khmer">{tr('ការលក់តាមវិធីបង់ប្រាក់ (Sales by Payment)')}</h3>
                            {salesByPayment.map((row) => (
                                <div key={row.method} className="flex items-center justify-between text-xs">
                                    <span className="font-khmer text-zinc-300">{PAYMENT_LABELS[row.method] ?? row.method.toUpperCase()}</span>
                                    <span className="font-mono text-zinc-300">
                                        {row.count} × · <strong className="text-zinc-100">${row.total}</strong>
                                    </span>
                                </div>
                            ))}
                        </Card>
                    </div>
                )}

                {/* Cashier Breakdown Table (Admin Only) */}
                {canViewAll && cashierBreakdown.length > 0 && (
                    <div className="space-y-3">
                        <h2 className="text-sm font-bold tracking-tight text-zinc-200 font-khmer">
                            {tr('ការលក់តាមបុគ្គលិក')}
                        </h2>
                        <Card className="overflow-hidden bg-zinc-900/80 border-zinc-800">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-zinc-950/80 text-zinc-400 border-b border-zinc-800 font-mono">
                                        <th className="p-3">{tr('បុគ្គលិក')}</th>
                                        <th className="p-3 text-center">{tr('វិក្កយបត្រ')}</th>
                                        <th className="p-3 text-right">{tr('ចំណូលសរុប')}</th>
                                        <th className="p-3 text-right">{tr('ចំណូលសុទ្ធ')}</th>
                                        <th className="p-3 text-right">{tr('ប្រាក់អាប់')}</th>
                                        <th className="p-3 text-right">{tr('សាច់ប្រាក់សុទ្ធ')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800/60 font-sans">
                                    {cashierBreakdown.map((row) => (
                                        <tr key={row.cashier_id} className="hover:bg-zinc-800/30">
                                            <td className="p-3 font-semibold text-white">
                                                {row.name}
                                            </td>
                                            <td className="p-3 text-center font-mono text-zinc-300">
                                                {row.document_count}
                                            </td>
                                            <td className="p-3 text-right font-mono text-emerald-400">
                                                {business.currency_symbol}{row.gross_sales}
                                            </td>
                                            <td className="p-3 text-right font-mono text-teal-400 font-semibold">
                                                {business.currency_symbol}{row.net_sales}
                                            </td>
                                            <td className="p-3 text-right font-mono text-zinc-400">
                                                {business.currency_symbol}{row.change_sum}
                                            </td>
                                            <td className="p-3 text-right font-mono text-amber-400 font-bold">
                                                {business.currency_symbol}{row.net_cash}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </Card>
                    </div>
                )}

                {/* Recent Documents in Report Scope */}
                <div className="space-y-3">
                    <h2 className="text-sm font-bold text-zinc-200 font-khmer">
                        Document Register Preview (Latest {documents.length})
                    </h2>
                    <Card className="overflow-hidden bg-zinc-900/80 border-zinc-800">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-zinc-950/80 text-zinc-400 border-b border-zinc-800 font-mono">
                                    <th className="p-3">{tr('លេខវិក្កយបត្រ')}</th>
                                    <th className="p-3">{tr('ស្ថានភាព')}</th>
                                    <th className="p-3">{tr('កាលបរិច្ឆេទ')}</th>
                                    <th className="p-3">{tr('តុ')}</th>
                                    <th className="p-3">{tr('អ្នកគិតប្រាក់')}</th>
                                    <th className="p-3 text-center">{tr('ភ្ញៀវ')}</th>
                                    <th className="p-3 text-right">{tr('សរុប')}</th>
                                    <th className="p-3 text-right">{tr('សកម្មភាព')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/60 font-sans">
                                {documents.map((doc) => (
                                    <tr key={doc.id} className="hover:bg-zinc-800/30">
                                        <td className="p-3 font-mono font-bold text-white">
                                            {doc.document_number || `${tr('ព្រាង #')}${String(doc.provisional_order).padStart(4, '0')}`}
                                        </td>
                                        <td className="p-3">
                                            <DocumentStatusBadge status={doc.status} />
                                        </td>
                                        <td className="p-3 font-mono text-zinc-400">
                                            {doc.business_date} {doc.event_time.slice(0, 5)}
                                        </td>
                                        <td className="p-3 text-zinc-300">
                                            {doc.reference_identifier || '—'}
                                        </td>
                                        <td className="p-3 text-zinc-300">
                                            {doc.creator.name}
                                        </td>
                                        <td className="p-3 text-center font-mono text-zinc-400">
                                            {doc.unit_count}
                                        </td>
                                        <td className="p-3 text-right font-mono font-bold text-emerald-400">
                                            {business.currency_symbol}{doc.grand_total}
                                        </td>
                                        <td className="p-3 text-right">
                                            <Link href={`/invoices/${doc.id}`}>
                                                <Button size="sm" variant="ghost" className="h-7 px-2 text-zinc-400 hover:text-white">
                                                    <Eye className="w-3.5 h-3.5 mr-1" />
                                                    <span className="font-khmer">{tr('មើល')}</span>
                                                </Button>
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Card>
                </div>
                    </>
                ) : (
                    <div className="space-y-6">
                        {/* P&L KPI Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Card 1: Net Revenue */}
                            <Card className="p-4 bg-zinc-900/70 border-zinc-800/80 rounded-2xl flex flex-col justify-between relative overflow-hidden">
                                <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                                    <span className="font-medium">{tr('1. Net Revenue / ចំណូលលក់សុទ្ធ')}</span>
                                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                                </div>
                                <div className="mt-2">
                                    <div className="text-2xl font-bold font-mono text-emerald-400">
                                        {business.currency_symbol}{financialSummary?.net_sales ?? metrics.net_sales}
                                    </div>
                                    <div className="text-xs text-zinc-400 font-mono font-medium mt-1">
                                        ≈ {Math.round((parseFloat(financialSummary?.net_sales ?? metrics.net_sales) || 0) * exchangeRate).toLocaleString()} {tr('៛')}
                                    </div>
                                    <div className="text-[11px] text-zinc-500 font-khmer mt-2 pt-2 border-t border-zinc-800/80 flex items-center justify-between">
                                        <span>{tr('លក់ដុល:')} {business.currency_symbol}{financialSummary?.gross_sales ?? metrics.gross_sales}</span>
                                        <span className="text-rose-400">{tr('បញ្ចុះតម្លៃ: -')}{business.currency_symbol}{financialSummary?.discounts ?? metrics.discounts}</span>
                                    </div>
                                </div>
                            </Card>

                            {/* Card 2: Operating Expenses */}
                            <Card className="p-4 bg-zinc-900/70 border-zinc-800/80 rounded-2xl flex flex-col justify-between relative overflow-hidden">
                                <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                                    <span className="font-medium">{tr('2. Operating Expenses / ចំណាយប្រតិបត្តិការ')}</span>
                                    <WalletCards className="w-4 h-4 text-amber-400" />
                                </div>
                                <div className="mt-2">
                                    <div className="text-2xl font-bold font-mono text-amber-400">
                                        {business.currency_symbol}{(financialSummary?.operating_expenses ?? 0).toFixed(2)}
                                    </div>
                                    <div className="text-xs text-zinc-400 font-mono font-medium mt-1">
                                        ≈ {(financialSummary?.operating_expenses_khr ?? 0).toLocaleString()} {tr('៛')}
                                    </div>
                                    <div className="text-[11px] text-zinc-500 font-khmer mt-2 pt-2 border-t border-zinc-800/80 flex items-center justify-between">
                                        <span>{financialSummary?.expenses_count ?? 0} {tr('ប័ណ្ណចំណាយកត់ត្រា')}</span>
                                        <Link href="/expenses" className="text-amber-400 hover:underline">
                                            {tr('មើលបញ្ជី')} &rarr;
                                        </Link>
                                    </div>
                                </div>
                            </Card>

                            {/* Card 3: Stock Purchases */}
                            <Card className="p-4 bg-zinc-900/70 border-zinc-800/80 rounded-2xl flex flex-col justify-between relative overflow-hidden">
                                <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                                    <span className="font-medium">{tr('3. Stock Purchases / ទិញចូលស្តុក')}</span>
                                    <Truck className="w-4 h-4 text-sky-400" />
                                </div>
                                <div className="mt-2">
                                    <div className="text-2xl font-bold font-mono text-sky-400">
                                        {business.currency_symbol}{(financialSummary?.stock_purchases ?? 0).toFixed(2)}
                                    </div>
                                    <div className="text-xs text-zinc-400 font-mono font-medium mt-1">
                                        ≈ {Math.round((financialSummary?.stock_purchases ?? 0) * exchangeRate).toLocaleString()} {tr('៛')}
                                    </div>
                                    <div className="text-[11px] text-zinc-500 font-khmer mt-2 pt-2 border-t border-zinc-800/80 flex items-center justify-between">
                                        <span>{financialSummary?.purchases_count ?? 0} {tr('វិក្កយបត្រទិញ')}</span>
                                        <Link href="/purchases" className="text-sky-400 hover:underline">
                                            {tr('មើលស្តុក')} &rarr;
                                        </Link>
                                    </div>
                                </div>
                            </Card>

                            {/* Card 4: Net Operating Profit */}
                            <Card className={`p-4 rounded-2xl flex flex-col justify-between relative overflow-hidden border ${
                                isProfitable
                                    ? 'bg-emerald-950/20 border-emerald-500/30'
                                    : 'bg-rose-950/20 border-rose-500/30'
                            }`}>
                                <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                                    <span className="font-medium">{tr('4. Net Profit / ចំណេញសុទ្ធ')}</span>
                                    {isProfitable ? (
                                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                                    ) : (
                                        <TrendingDown className="w-4 h-4 text-rose-400" />
                                    )}
                                </div>
                                <div className="mt-2">
                                    <div className={`text-2xl font-bold font-mono ${
                                        isProfitable ? 'text-emerald-400' : 'text-rose-400'
                                    }`}>
                                        {isProfitable ? '+' : ''}{business.currency_symbol}{(financialSummary?.net_profit ?? 0).toFixed(2)}
                                    </div>
                                    <div className="text-xs text-zinc-400 font-mono font-medium mt-1">
                                        ≈ {Math.round((financialSummary?.net_profit ?? 0) * exchangeRate).toLocaleString()} {tr('៛')}
                                    </div>
                                    <div className="text-[11px] font-khmer mt-2 pt-2 border-t border-zinc-800/80 flex items-center justify-between">
                                        <span className={isProfitable ? 'text-emerald-400 font-medium' : 'text-rose-400 font-medium'}>
                                            {isProfitable ? tr('ចំណេញ (Profitable)') : tr('ខាត (Operating Loss)')}
                                        </span>
                                        <span className="font-mono font-bold text-zinc-300">
                                            {financialSummary?.profit_margin_pct ?? 0}%
                                        </span>
                                    </div>
                                </div>
                            </Card>
                        </div>

                        {/* Financial Statement & Breakdown Layout */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* P&L Comparative Statement (2 Cols) */}
                            <div className="lg:col-span-2 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <FileSpreadsheet className="w-4 h-4 text-teal-400" />
                                        <h2 className="text-sm font-bold text-zinc-200 font-khmer">
                                            {tr('របាយការណ៍ចំណេញ-ខាត (Profit & Loss)')}
                                        </h2>
                                    </div>
                                    <span className="text-[11px] text-zinc-400 font-khmer">
                                        {tr('វគ្គ:')} {periods.find(p => String(p.id) === String(periodId))?.name || tr('គ្រប់វគ្គ')}
                                    </span>
                                </div>

                                <Card className="overflow-hidden bg-zinc-900/80 border-zinc-800">
                                    <table className="w-full text-left border-collapse text-xs">
                                        <thead>
                                            <tr className="bg-zinc-950/80 text-zinc-400 border-b border-zinc-800 font-mono">
                                                <th className="p-3">{tr('ប្រតិបត្តិការ')}</th>
                                                <th className="p-3 text-right">{tr('ដុល្លារ ($)')}</th>
                                                <th className="p-3 text-right">{tr('រៀល (៛)')}</th>
                                                <th className="p-3 text-right">{tr('% នៃចំណូលសុទ្ធ')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-800/60 font-sans">
                                            {/* Section 1: Revenue */}
                                            <tr className="bg-zinc-800/20 font-semibold text-zinc-300">
                                                <td colSpan={4} className="p-2.5 px-3 text-[11px] uppercase tracking-wider text-teal-400">
                                                    {tr('1. Operating Revenues / ចំណូលពីអាជីវកម្ម')}
                                                </td>
                                            </tr>
                                            <tr className="hover:bg-zinc-800/30">
                                                <td className="p-3 pl-6 text-zinc-300">
                                                    {tr('Gross Sales / ចំណូលលក់ដុលសរុប (')}{metrics.total_documents} {tr('វិក្កយបត្រ)')}
                                                </td>
                                                <td className="p-3 text-right font-mono text-zinc-200">
                                                    {business.currency_symbol}{financialSummary?.gross_sales ?? metrics.gross_sales}
                                                </td>
                                                <td className="p-3 text-right font-mono text-zinc-400">
                                                    {Math.round((parseFloat(financialSummary?.gross_sales ?? metrics.gross_sales) || 0) * exchangeRate).toLocaleString()} {tr('៛')}
                                                </td>
                                                <td className="p-3 text-right font-mono text-zinc-400">
                                                    —
                                                </td>
                                            </tr>
                                            <tr className="hover:bg-zinc-800/30">
                                                <td className="p-3 pl-6 text-rose-400">
                                                    {tr('(-) Customer Discounts & Vouchers / បញ្ចុះតម្លៃ')}
                                                </td>
                                                <td className="p-3 text-right font-mono text-rose-400">
                                                    -{business.currency_symbol}{financialSummary?.discounts ?? metrics.discounts}
                                                </td>
                                                <td className="p-3 text-right font-mono text-rose-400/80">
                                                    -{Math.round((parseFloat(financialSummary?.discounts ?? metrics.discounts) || 0) * exchangeRate).toLocaleString()} {tr('៛')}
                                                </td>
                                                <td className="p-3 text-right font-mono text-rose-400/80">
                                                    {((parseFloat(financialSummary?.discounts ?? metrics.discounts) || 0) / (parseFloat(financialSummary?.net_sales ?? metrics.net_sales) || 1) * 100).toFixed(1)}%
                                                </td>
                                            </tr>
                                            <tr className="bg-teal-950/20 font-semibold border-b border-zinc-800">
                                                <td className="p-3 pl-6 text-teal-300">
                                                    {tr('= Net Sales Revenue / ចំណូលលក់សុទ្ធ')}
                                                </td>
                                                <td className="p-3 text-right font-mono text-teal-300 font-bold">
                                                    {business.currency_symbol}{financialSummary?.net_sales ?? metrics.net_sales}
                                                </td>
                                                <td className="p-3 text-right font-mono text-teal-300">
                                                    {Math.round((parseFloat(financialSummary?.net_sales ?? metrics.net_sales) || 0) * exchangeRate).toLocaleString()} {tr('៛')}
                                                </td>
                                                <td className="p-3 text-right font-mono text-teal-300 font-bold">
                                                    100.0%
                                                </td>
                                            </tr>

                                            {/* Section 2: Stock Purchases */}
                                            <tr className="bg-zinc-800/20 font-semibold text-zinc-300">
                                                <td colSpan={4} className="p-2.5 px-3 text-[11px] uppercase tracking-wider text-sky-400">
                                                    {tr('2. Stock & Inventory Purchases / ថ្លៃដើមទិញស្តុក & គ្រឿងផ្សំ')}
                                                </td>
                                            </tr>
                                            <tr className="hover:bg-zinc-800/30">
                                                <td className="p-3 pl-6 text-zinc-300">
                                                    {tr('Stock Restocking & Purchases / វិក្កយបត្រទិញចូលស្តុក (')}{financialSummary?.purchases_count ?? 0} {tr('លើក)')}
                                                </td>
                                                <td className="p-3 text-right font-mono text-sky-400">
                                                    {business.currency_symbol}{(financialSummary?.stock_purchases ?? 0).toFixed(2)}
                                                </td>
                                                <td className="p-3 text-right font-mono text-zinc-400">
                                                    {Math.round((financialSummary?.stock_purchases ?? 0) * exchangeRate).toLocaleString()} {tr('៛')}
                                                </td>
                                                <td className="p-3 text-right font-mono text-zinc-400">
                                                    {((financialSummary?.stock_purchases ?? 0) / (parseFloat(financialSummary?.net_sales ?? metrics.net_sales) || 1) * 100).toFixed(1)}%
                                                </td>
                                            </tr>

                                            {/* Section 3: Operating Expenses */}
                                            <tr className="bg-zinc-800/20 font-semibold text-zinc-300">
                                                <td colSpan={4} className="p-2.5 px-3 text-[11px] uppercase tracking-wider text-amber-400">
                                                    {tr('3. Operating Expenses / ចំណាយប្រតិបត្តិការទូទៅ')}
                                                </td>
                                            </tr>
                                            {financialSummary?.expense_categories && financialSummary.expense_categories.length > 0 ? (
                                                financialSummary.expense_categories.map((cat) => {
                                                    const info = CATEGORY_MAP[cat.category] || { nameKh: cat.category, color: 'text-zinc-400' };
                                                    return (
                                                        <tr key={cat.category} className="hover:bg-zinc-800/30">
                                                            <td className="p-3 pl-6 text-zinc-300">
                                                                <span className="font-khmer">{info.nameKh}</span>
                                                                <span className="text-[11px] text-zinc-500 font-mono ml-2">({cat.category} • {cat.count} {tr('លើក)')}</span>
                                                            </td>
                                                            <td className="p-3 text-right font-mono text-amber-300">
                                                                {business.currency_symbol}{cat.total_usd.toFixed(2)}
                                                            </td>
                                                            <td className="p-3 text-right font-mono text-zinc-400">
                                                                {cat.total_khr.toLocaleString()} {tr('៛')}
                                                            </td>
                                                            <td className="p-3 text-right font-mono text-zinc-400">
                                                                {(cat.total_usd / (parseFloat(financialSummary?.net_sales ?? metrics.net_sales) || 1) * 100).toFixed(1)}%
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            ) : (
                                                <tr>
                                                    <td colSpan={4} className="p-3 pl-6 text-zinc-500 italic">
                                                        {tr('គ្មានចំណាយប្រតិបត្តិការកត់ត្រាក្នុងកំឡុងពេលនេះឡើយ')}
                                                    </td>
                                                </tr>
                                            )}
                                            <tr className="bg-amber-950/20 font-semibold border-b border-zinc-800">
                                                <td className="p-3 pl-6 text-amber-300">
                                                    {tr('= Total Operating Expenses / សរុបចំណាយប្រតិបត្តិការ')}
                                                </td>
                                                <td className="p-3 text-right font-mono text-amber-300 font-bold">
                                                    {business.currency_symbol}{(financialSummary?.operating_expenses ?? 0).toFixed(2)}
                                                </td>
                                                <td className="p-3 text-right font-mono text-amber-300">
                                                    {(financialSummary?.operating_expenses_khr ?? 0).toLocaleString()} {tr('៛')}
                                                </td>
                                                <td className="p-3 text-right font-mono text-amber-300 font-bold">
                                                    {((financialSummary?.operating_expenses ?? 0) / (parseFloat(financialSummary?.net_sales ?? metrics.net_sales) || 1) * 100).toFixed(1)}%
                                                </td>
                                            </tr>

                                            {/* Section 4: Total Outgoing */}
                                            <tr className="bg-zinc-950/60 font-semibold">
                                                <td className="p-3 text-zinc-300">
                                                    {tr('4. Total Outgoing / ចំណាយ & ថ្លៃដើមសរុប (Purchases + Expenses)')}
                                                </td>
                                                <td className="p-3 text-right font-mono text-rose-400 font-bold text-sm">
                                                    {business.currency_symbol}{(financialSummary?.total_outgoing ?? 0).toFixed(2)}
                                                </td>
                                                <td className="p-3 text-right font-mono text-rose-400">
                                                    {Math.round((financialSummary?.total_outgoing ?? 0) * exchangeRate).toLocaleString()} {tr('៛')}
                                                </td>
                                                <td className="p-3 text-right font-mono text-rose-400 font-bold">
                                                    {((financialSummary?.total_outgoing ?? 0) / (parseFloat(financialSummary?.net_sales ?? metrics.net_sales) || 1) * 100).toFixed(1)}%
                                                </td>
                                            </tr>

                                            {/* Section 5: Net Operating Profit */}
                                            <tr className={`font-bold text-sm ${
                                                isProfitable
                                                    ? 'bg-emerald-950/50 text-emerald-300 border-t-2 border-emerald-500/50'
                                                    : 'bg-rose-950/50 text-rose-300 border-t-2 border-rose-500/50'
                                            }`}>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        <Scale className="w-5 h-5 shrink-0" />
                                                        <div>
                                                            <div>{tr('5. NET OPERATING PROFIT / ចំណេញប្រតិបត្តិការសុទ្ធ')}</div>
                                                            <div className="text-[11px] font-normal opacity-80 font-khmer mt-0.5">
                                                                {tr('(ចំណូលលក់សុទ្ធ - ចំណាយទិញស្តុក - ចំណាយប្រតិបត្តិការ)')}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-right font-mono text-base font-black">
                                                    {isProfitable ? '+' : ''}{business.currency_symbol}{(financialSummary?.net_profit ?? 0).toFixed(2)}
                                                </td>
                                                <td className="p-4 text-right font-mono">
                                                    {Math.round((financialSummary?.net_profit ?? 0) * exchangeRate).toLocaleString()} {tr('៛')}
                                                </td>
                                                <td className="p-4 text-right font-mono text-base font-black">
                                                    {financialSummary?.profit_margin_pct ?? 0}%
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </Card>
                            </div>

                            {/* Expense Category Distribution & Quick Links (1 Col) */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <PieChart className="w-4 h-4 text-amber-400" />
                                    <h2 className="text-sm font-bold text-zinc-200 font-khmer">
                                        <span className="font-khmer">{tr('ចំណាយតាមប្រភេទ')}</span>
                                    </h2>
                                </div>

                                <Card className="p-4 bg-zinc-900/80 border-zinc-800 space-y-4">
                                    {financialSummary?.expense_categories && financialSummary.expense_categories.length > 0 ? (
                                        financialSummary.expense_categories.map((cat) => {
                                            const info = CATEGORY_MAP[cat.category] || { nameKh: cat.category, color: 'text-zinc-400 bg-zinc-800 border-zinc-700' };
                                            const totalExpense = financialSummary.operating_expenses || 1;
                                            const pct = Math.round((cat.total_usd / totalExpense) * 100);

                                            return (
                                                <div key={cat.category} className="space-y-1.5">
                                                    <div className="flex items-center justify-between text-xs">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-khmer font-medium text-zinc-200">
                                                                {info.nameKh}
                                                            </span>
                                                            <span className="text-[10px] text-zinc-500 font-mono">
                                                                ({cat.count})
                                                            </span>
                                                        </div>
                                                        <div className="text-right font-mono">
                                                            <span className="font-bold text-zinc-200">
                                                                {business.currency_symbol}{cat.total_usd.toFixed(2)}
                                                            </span>
                                                            <span className="text-zinc-500 text-[10px] ml-1.5">
                                                                ({pct}%)
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-amber-400 rounded-full transition-all"
                                                            style={{ width: `${Math.min(pct, 100)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="text-center py-6 text-xs text-zinc-500 font-khmer">
                                            {tr('មិនមានការបែងចែកប្រភេទចំណាយទេ')}
                                        </div>
                                    )}

                                    <div className="pt-3 border-t border-zinc-800 space-y-2">
                                        <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider font-mono">
                                            <span className="font-khmer">{tr('ទៅកាន់')}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <Link href="/expenses">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="w-full h-8 text-xs border-zinc-700/60 bg-zinc-800/60 hover:bg-zinc-700 text-zinc-300 gap-1.5 justify-start cursor-pointer"
                                                >
                                                    <WalletCards className="w-3.5 h-3.5 text-amber-400" />
                                                    <span>{tr('គ្រប់គ្រងចំណាយ')}</span>
                                                </Button>
                                            </Link>
                                            <Link href="/purchases">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="w-full h-8 text-xs border-zinc-700/60 bg-zinc-800/60 hover:bg-zinc-700 text-zinc-300 gap-1.5 justify-start cursor-pointer"
                                                >
                                                    <Truck className="w-3.5 h-3.5 text-sky-400" />
                                                    <span>{tr('ទិញចូលស្តុក')}</span>
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
