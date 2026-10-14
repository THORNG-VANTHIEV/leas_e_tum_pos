import React from 'react';
import { AppLayout } from '@/layouts/app-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link, usePage } from '@inertiajs/react';
import { PageProps } from '@/types';
import {
    ReceiptText,
    ArrowLeft,
    Plus,
    Printer,
    FileText,
    CheckCircle2,
    Calendar,
    Clock,
    User as UserIcon,
    Store,
    Utensils,
    ShieldCheck,
} from 'lucide-react';

interface DocumentShowProps {
    document: {
        id: number;
        provisional_order: number;
        sequence_no: number | null;
        document_number: string | null;
        business_date: string;
        event_time: string;
        reference_identifier: string | null;
        unit_count: number;
        source_total: string;
        source_total_verified: boolean;
        subtotal: string;
        tax_amount: string;
        discount_amount: string;
        grand_total: string;
        amount_received: string;
        change_amount: string;
        payment_method: string;
        status: 'draft' | 'review' | 'finalized' | 'void';
        note: string | null;
        creator: { name: string; username: string };
        period: { code: string; name: string };
        items: {
            id: number;
            line_position: number;
            category_type_snapshot: string;
            product_name_primary_snapshot: string;
            product_name_secondary_snapshot: string | null;
            unit_snapshot: string;
            quantity: number;
            unit_price: string;
            line_total: string;
            is_primary_package_snapshot: boolean;
        }[];
    };
}

export default function DocumentShow({ document: doc }: DocumentShowProps) {
    const { business } = usePage<PageProps>().props;

    return (
        <AppLayout title={`Invoice ${doc.document_number || `Draft #${doc.id}`}`}>
            <div className="max-w-3xl mx-auto space-y-6">
                {/* Fixed / Sticky Actions Toolbar */}
                <div className="sticky top-14 md:top-0 z-20 bg-zinc-950/95 backdrop-blur-xl -mt-6 pt-6 pb-4 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 border-b border-zinc-800/80 shadow-xs">
                    <div className="flex items-center justify-between gap-4">
                        <Link href="/invoices">
                            <Button variant="ghost" size="sm">
                                <ArrowLeft className="w-4 h-4" />
                                <span>Back to Register</span>
                            </Button>
                        </Link>

                        <div className="flex items-center gap-2">
                            <Link href={`/invoices/${doc.id}/preview/80mm`}>
                                <Button size="sm" variant="outline" className="border-zinc-700 hover:bg-zinc-800 text-zinc-300">
                                    <Printer className="w-4 h-4 mr-1.5" />
                                    <span>80mm Slip</span>
                                </Button>
                            </Link>
                            <Link href={`/invoices/${doc.id}/preview/a5`}>
                                <Button size="sm" variant="outline" className="border-zinc-700 hover:bg-zinc-800 text-zinc-300">
                                    <FileText className="w-4 h-4 mr-1.5" />
                                    <span>A5 Invoice</span>
                                </Button>
                            </Link>
                            <Link href="/invoices/create">
                                <Button size="sm" variant="primary">
                                    <Plus className="w-4 h-4 mr-1.5" />
                                    <span>New Order (F2)</span>
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Printable Receipt Card */}
                <Card className="p-8 bg-zinc-900/90 border-zinc-800 shadow-2xl relative overflow-hidden space-y-6 font-sans">
                    {/* Watermark / Status Badge */}
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                                    <ReceiptText className="w-5 h-5" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold tracking-tight text-white">
                                        {business.business_name_primary}
                                    </h1>
                                    <p className="text-xs text-zinc-400 font-khmer">
                                        {business.business_name_secondary}
                                    </p>
                                </div>
                            </div>
                            <div className="text-xs text-zinc-500 mt-2">
                                {business.address_primary} • Tel: {business.phone}
                            </div>
                        </div>

                        <div className="text-right space-y-1">
                            <Badge
                                variant={
                                    doc.status === 'finalized'
                                        ? 'emerald'
                                        : doc.status === 'void'
                                        ? 'rose'
                                        : 'amber'
                                }
                                className="uppercase font-mono text-xs px-3 py-1"
                            >
                                {doc.status === 'draft' ? 'Draft Document' : doc.status}
                            </Badge>
                            <div className="font-mono text-xs text-zinc-400">
                                {doc.document_number ? (
                                    <span className="text-emerald-400 font-bold text-sm">
                                        {doc.document_number}
                                    </span>
                                ) : (
                                    <span>Draft #{doc.id} (Order #{doc.provisional_order})</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Metadata Strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-zinc-100/90 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800 text-xs font-mono">
                        <div>
                            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block uppercase font-sans font-semibold">Period</span>
                            <span className="text-zinc-900 dark:text-zinc-100 font-bold">{doc.period.code}</span>
                        </div>
                        <div>
                            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block uppercase font-sans font-semibold">Date & Time</span>
                            <span className="text-zinc-800 dark:text-zinc-200 font-medium">
                                {doc.business_date} {doc.event_time}
                            </span>
                        </div>
                        <div>
                            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block uppercase font-sans font-semibold">Table / Ref #</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold font-sans">
                                {doc.reference_identifier || '—'}
                            </span>
                        </div>
                        <div>
                            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block uppercase font-sans font-semibold">Cashier</span>
                            <span className="text-zinc-800 dark:text-zinc-200 font-medium">{doc.creator.username}</span>
                        </div>
                    </div>

                    {/* Immutable Line Items Table */}
                    <div className="space-y-3">
                        <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-between pb-1 border-b border-zinc-800">
                            <span>Snapshot Line Items</span>
                            <span className="text-teal-400 font-mono">{doc.unit_count} guests total</span>
                        </div>

                        <table className="w-full text-left text-xs">
                            <thead className="text-[10px] font-mono uppercase text-zinc-500 border-b border-zinc-800/80">
                                <tr>
                                    <th className="py-2">Item Description (Snapshot)</th>
                                    <th className="py-2 text-center">Qty</th>
                                    <th className="py-2 text-right">Price</th>
                                    <th className="py-2 text-right">Line Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/60 font-mono text-[11px]">
                                {doc.items.map((item) => (
                                    <tr key={item.id}>
                                        <td className="py-2.5 font-sans">
                                            <div className="font-semibold text-zinc-200">
                                                {item.product_name_primary_snapshot}
                                            </div>
                                            {item.product_name_secondary_snapshot && (
                                                <div className="text-[11px] text-zinc-400 font-khmer">
                                                    {item.product_name_secondary_snapshot}
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-2.5 text-center text-zinc-300">
                                            {item.quantity} {item.unit_snapshot}
                                        </td>
                                        <td className="py-2.5 text-right text-zinc-400">
                                            {business.currency_symbol}
                                            {item.unit_price}
                                        </td>
                                        <td className="py-2.5 text-right font-bold text-white">
                                            {business.currency_symbol}
                                            {item.line_total}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Totals & Settlement Summary */}
                    <div className="pt-4 border-t border-zinc-800 flex flex-col sm:flex-row sm:items-start justify-between gap-6">
                        {/* Reconciliation Pill */}
                        <div className="space-y-2 text-xs max-w-sm">
                            <span className="text-[10px] uppercase font-mono text-zinc-500 block">
                                Invariant Reconciliation
                            </span>
                            <div className="p-3 rounded-lg bg-zinc-100/90 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800 space-y-1">
                                <div className="flex items-center justify-between">
                                    <span className="text-zinc-600 dark:text-zinc-400">Physical Source Total:</span>
                                    <span className="font-mono font-bold text-zinc-900 dark:text-white">
                                        {business.currency_symbol}
                                        {doc.source_total}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5 pt-1 text-[11px]">
                                    {doc.source_total_verified ? (
                                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                                             <CheckCircle2 className="w-3.5 h-3.5" />
                                             <span>Strictly Balanced ($0.00 Variance)</span>
                                        </span>
                                    ) : (
                                        <span className="text-zinc-500 dark:text-zinc-400">Not independently verified</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Financial Calculation Column */}
                        <div className="w-full sm:w-64 space-y-2 text-xs">
                            <div className="flex items-center justify-between text-zinc-400">
                                <span>Subtotal</span>
                                <span className="font-mono text-zinc-200">
                                    {business.currency_symbol}
                                    {doc.subtotal}
                                </span>
                            </div>

                            {parseFloat(doc.discount_amount) > 0 && (
                                <div className="flex items-center justify-between text-zinc-400">
                                    <span>Discount</span>
                                    <span className="font-mono text-rose-400">
                                        -{business.currency_symbol}
                                        {doc.discount_amount}
                                    </span>
                                </div>
                            )}

                            <div className="flex items-center justify-between text-base font-bold text-white pt-2 border-t border-zinc-800">
                                <div>
                                    <span>Grand Total</span>
                                    <div className="text-[11px] font-normal text-zinc-400 font-khmer">
                                        សរុបជាប្រាក់រៀល
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="font-mono text-emerald-400 text-lg">
                                        {business.currency_symbol}
                                        {doc.grand_total}
                                    </span>
                                    <div className="text-xs font-mono text-emerald-400/80 font-khmer">
                                        ≈ {Math.round((parseFloat(doc.grand_total) || 0) * 4100).toLocaleString()} ៛
                                    </div>
                                </div>
                            </div>

                            <div className="pt-2 border-t border-zinc-800/60 space-y-1.5 text-zinc-400">
                                <div className="flex items-center justify-between">
                                    <span>Tendered ({doc.payment_method})</span>
                                    <span className="font-mono text-zinc-200">
                                        {business.currency_symbol}
                                        {doc.amount_received}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between font-semibold text-emerald-400">
                                    <span>Change Given / ប្រាក់អាប់</span>
                                    <div className="text-right">
                                        <span className="font-mono">
                                            {business.currency_symbol}
                                            {doc.change_amount}
                                        </span>
                                        {parseFloat(doc.change_amount) > 0 && (
                                            <span className="block text-[10px] font-normal text-zinc-400 font-khmer">
                                                ≈ {Math.round(parseFloat(doc.change_amount) * 4100).toLocaleString()} ៛
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Receipt Footer */}
                    <div className="text-center pt-4 border-t border-zinc-800/80 text-xs text-zinc-500 space-y-1">
                        <div>{business.document_footer || 'Thank you for dining with us!'}</div>
                        <div className="text-[10px] font-mono text-zinc-600">
                            Immutable Snapshot Recorded • Integer-Cents Persistence
                        </div>
                    </div>
                </Card>
            </div>
        </AppLayout>
    );
}
