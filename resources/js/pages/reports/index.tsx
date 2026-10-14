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
    ArrowUpRight,
    Ban,
    AlertTriangle,
    Eye,
} from 'lucide-react';

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
        unverified_count: number;
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
    filters: {
        period_id: string | null;
        start_date: string | null;
        end_date: string | null;
        cashier_id: string | null;
    };
}

export default function ReportsIndex({
    metrics,
    cashierBreakdown,
    documents,
    periods,
    cashiers,
    filters,
}: ReportsPageProps) {
    const { auth, business } = usePage<PageProps>().props;
    const isAdmin = auth.user?.role === 'admin';

    const [periodId, setPeriodId] = useState(filters.period_id || '');
    const [startDate, setStartDate] = useState(filters.start_date || '');
    const [endDate, setEndDate] = useState(filters.end_date || '');
    const [cashierId, setCashierId] = useState(filters.cashier_id || '');

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
        <AppLayout title="Operational Reports & Reconciliation Hub">
            <Head title="Reports & Reconciliation" />

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
                                    <h1 className="text-xl font-bold tracking-tight text-white">
                                        Operational Reports & Sales Register
                                    </h1>
                                    <p className="text-xs text-zinc-400">
                                        {isAdmin
                                            ? 'Store-wide financial aggregation & cashier audit'
                                            : 'Personal cashier sales breakdown & register history'}
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
                                <span>Export CSV Register</span>
                            </Button>
                        </div>
                    </div>

                    {/* Filter Controls Card */}
                    <Card className="p-4 bg-zinc-900/80 border-zinc-800 backdrop-blur-xl">
                        <div className="flex flex-wrap items-end gap-3">
                            <div className="w-48 space-y-1">
                                <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                                    Period
                                </label>
                                <select
                                    value={periodId}
                                    onChange={(e) => setPeriodId(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-teal-500"
                                >
                                    <option value="">All Periods</option>
                                    {periods.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.code} - {p.name} ({p.status})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="w-36 space-y-1">
                                <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                                    From Date
                                </label>
                                <Input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="text-xs bg-zinc-950 border-zinc-800 py-1.5"
                                />
                            </div>

                            <div className="w-36 space-y-1">
                                <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                                    To Date
                                </label>
                                <Input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="text-xs bg-zinc-950 border-zinc-800 py-1.5"
                                />
                            </div>

                            {isAdmin && (
                                <div className="w-44 space-y-1">
                                    <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                                        Cashier
                                    </label>
                                    <select
                                        value={cashierId}
                                        onChange={(e) => setCashierId(e.target.value)}
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-teal-500"
                                    >
                                        <option value="">All Cashiers</option>
                                        {cashiers.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.name} (@{c.username})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="flex items-center gap-2 pt-2">
                                <Button size="sm" onClick={handleApplyFilters} className="bg-teal-600 hover:bg-teal-500 text-white">
                                    <Filter className="w-3.5 h-3.5 mr-1.5" />
                                    <span>Filter</span>
                                </Button>
                                <Button size="sm" variant="ghost" onClick={handleReset} className="text-zinc-400 hover:text-white">
                                    <RotateCcw className="w-3.5 h-3.5 mr-1" />
                                    <span>Reset</span>
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* KPI Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Gross Sales */}
                    <Card className="p-4 bg-zinc-900/80 border-zinc-800 flex flex-col justify-between">
                        <div className="flex items-center justify-between text-zinc-400">
                            <span className="text-xs font-semibold uppercase tracking-wider">Gross Sales</span>
                            <DollarSign className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div className="mt-3">
                            <div className="text-2xl font-bold font-mono text-emerald-400">
                                {business.currency_symbol}{metrics.gross_sales}
                            </div>
                            <div className="text-[11px] text-zinc-400 font-khmer mt-0.5">
                                ≈ {Math.round((parseFloat(metrics.gross_sales) || 0) * 4100).toLocaleString()} ៛
                            </div>
                            <div className="text-[11px] text-zinc-500 mt-1">
                                Discounts: -{business.currency_symbol}{metrics.discounts}
                            </div>
                        </div>
                    </Card>

                    {/* Net Sales */}
                    <Card className="p-4 bg-zinc-900/80 border-zinc-800 flex flex-col justify-between">
                        <div className="flex items-center justify-between text-zinc-400">
                            <span className="text-xs font-semibold uppercase tracking-wider">Net Sales</span>
                            <ArrowUpRight className="w-4 h-4 text-teal-400" />
                        </div>
                        <div className="mt-3">
                            <div className="text-2xl font-bold font-mono text-teal-400">
                                {business.currency_symbol}{metrics.net_sales}
                            </div>
                            <div className="text-[11px] text-zinc-400 font-khmer mt-0.5">
                                ≈ {Math.round((parseFloat(metrics.net_sales) || 0) * 4100).toLocaleString()} ៛
                            </div>
                            <div className="text-[11px] text-zinc-500 mt-1">
                                Tax recorded: {business.currency_symbol}{metrics.tax_collected}
                            </div>
                        </div>
                    </Card>

                    {/* Cash Collected & Change */}
                    <Card className="p-4 bg-zinc-900/80 border-zinc-800 flex flex-col justify-between">
                        <div className="flex items-center justify-between text-zinc-400">
                            <span className="text-xs font-semibold uppercase tracking-wider">Net Cash in Drawer</span>
                            <Receipt className="w-4 h-4 text-amber-400" />
                        </div>
                        <div className="mt-3">
                            <div className="text-2xl font-bold font-mono text-amber-400">
                                {business.currency_symbol}{metrics.net_cash_received}
                            </div>
                            <div className="text-[11px] text-zinc-400 font-khmer mt-0.5">
                                ≈ {Math.round((parseFloat(metrics.net_cash_received) || 0) * 4100).toLocaleString()} ៛
                            </div>
                            <div className="text-[11px] text-zinc-500 mt-1">
                                Tendered: {business.currency_symbol}{metrics.cash_tendered} • Change: {business.currency_symbol}{metrics.change_given}
                            </div>
                        </div>
                    </Card>

                    {/* Volume & Exceptions */}
                    <Card className="p-4 bg-zinc-900/80 border-zinc-800 flex flex-col justify-between">
                        <div className="flex items-center justify-between text-zinc-400">
                            <span className="text-xs font-semibold uppercase tracking-wider">Orders & Guests</span>
                            <Users className="w-4 h-4 text-sky-400" />
                        </div>
                        <div className="mt-3">
                            <div className="text-2xl font-bold font-mono text-zinc-100">
                                {metrics.total_documents} <span className="text-sm font-normal text-zinc-400">docs</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-1">
                                <span>{metrics.total_units} total pax/units</span>
                                {metrics.void_count > 0 && (
                                    <span className="text-rose-400 font-semibold">
                                        {metrics.void_count} voids ({business.currency_symbol}{metrics.void_value})
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
                            <span>
                                <strong>Reconciliation Alert:</strong> {metrics.unverified_count} document(s) have unverified physical source totals.
                            </span>
                        </div>
                    </div>
                )}

                {/* Cashier Breakdown Table (Admin Only) */}
                {isAdmin && cashierBreakdown.length > 0 && (
                    <div className="space-y-3">
                        <h2 className="text-sm font-bold tracking-tight text-zinc-200 uppercase tracking-wider">
                            Cashier Performance & Shift Reconciliation
                        </h2>
                        <Card className="overflow-hidden bg-zinc-900/80 border-zinc-800">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-zinc-950/80 text-zinc-400 border-b border-zinc-800 font-mono">
                                        <th className="p-3">Cashier Name</th>
                                        <th className="p-3 text-center">Docs Processed</th>
                                        <th className="p-3 text-right">Gross Sales</th>
                                        <th className="p-3 text-right">Net Sales</th>
                                        <th className="p-3 text-right">Change Given</th>
                                        <th className="p-3 text-right">Net Cash Received</th>
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
                    <h2 className="text-sm font-bold tracking-tight text-zinc-200 uppercase tracking-wider">
                        Document Register Preview (Latest {documents.length})
                    </h2>
                    <Card className="overflow-hidden bg-zinc-900/80 border-zinc-800">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-zinc-950/80 text-zinc-400 border-b border-zinc-800 font-mono">
                                    <th className="p-3">Doc #</th>
                                    <th className="p-3">Status</th>
                                    <th className="p-3">Date / Time</th>
                                    <th className="p-3">Ref</th>
                                    <th className="p-3">Cashier</th>
                                    <th className="p-3 text-center">Pax</th>
                                    <th className="p-3 text-right">Total</th>
                                    <th className="p-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/60 font-sans">
                                {documents.map((doc) => (
                                    <tr key={doc.id} className="hover:bg-zinc-800/30">
                                        <td className="p-3 font-mono font-bold text-white">
                                            {doc.document_number || `DRAFT-${String(doc.provisional_order).padStart(4, '0')}`}
                                        </td>
                                        <td className="p-3">
                                            <Badge
                                                variant={
                                                    doc.status === 'finalized'
                                                        ? 'emerald'
                                                        : doc.status === 'void'
                                                        ? 'rose'
                                                        : 'zinc'
                                                }
                                                className="text-[10px] font-mono uppercase"
                                            >
                                                {doc.status}
                                            </Badge>
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
                                                    <span>View</span>
                                                </Button>
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
