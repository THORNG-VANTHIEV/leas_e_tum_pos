import React, { useState } from 'react';
import { Head, Link, usePage, router } from '@inertiajs/react';
import { PageProps } from '@/types';
import {
    Printer,
    ArrowLeft,
    FileText,
    Filter,
    Layers,
    DollarSign,
    Calendar,
    CheckCircle2,
    Clock,
    User as UserIcon,
    AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatOrderSource, isDeliveryPlatform } from '@/components/order-source';

interface DocumentItem {
    id: number;
    provisional_order: number;
    sequence_no: number | null;
    document_number: string | null;
    business_date: string;
    event_time: string;
    reference_identifier: string | null;
    order_source: string | null;
    external_order_ref: string | null;
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
    period: { id: number; code: string; name: string };
    print_logs?: { id: number; print_type: string; created_at: string }[];
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
}

interface PreviewRangeProps {
    documents: DocumentItem[];
    range: {
        start_sequence: number;
        end_sequence: number;
        period_id: number | null;
        count: number;
        total_amount: string;
        min_available_sequence: number;
        max_available_sequence: number;
    };
    format: '80mm' | 'a5';
    periods: { id: number; code: string; name: string; status: string }[];
}

export default function PreviewRange({
    documents,
    range,
    format: initialFormat,
    periods,
}: PreviewRangeProps) {
    const { business } = usePage<PageProps>().props;
    const [format, setFormat] = useState<'80mm' | 'a5'>(initialFormat || '80mm');
    const [startSeq, setStartSeq] = useState<number | string>(range.start_sequence || 1);
    const [endSeq, setEndSeq] = useState<number | string>(range.end_sequence || 50);
    const [selectedPeriod, setSelectedPeriod] = useState<number | string>(range.period_id || '');
    const [isPrinting, setIsPrinting] = useState(false);

    const handleFilter = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/invoices/print-range',
            {
                start_sequence: startSeq,
                end_sequence: endSeq,
                period_id: selectedPeriod || undefined,
                format,
            },
            { preserveState: true }
        );
    };

    const handlePrintBatch = () => {
        setIsPrinting(true);
        const batchRequestId = crypto.randomUUID();

        router.post(
            '/invoices/print-range/print-requests',
            {
                batch_request_id: batchRequestId,
                format,
                start_sequence: Number(startSeq) || undefined,
                end_sequence: Number(endSeq) || undefined,
                period_id: selectedPeriod ? Number(selectedPeriod) : undefined,
            },
            {
                preserveScroll: true,
                onFinish: () => {
                    setIsPrinting(false);
                    setTimeout(() => {
                        window.print();
                    }, 150);
                },
            }
        );
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 py-6 px-4 selection:bg-emerald-500/30 selection:text-emerald-300">
            <Head title={`Continuous Range Print (${documents.length} Invoices)`} />

            {/* Hardware Print Stylesheets for Continuous Multi-Document Rolls and A5 Pages */}
            <style>{`
                @media print {
                    @page {
                        margin: ${format === '80mm' ? '0' : '8mm'};
                        size: ${format === '80mm' ? '80mm auto' : 'A5 portrait'};
                    }
                    body {
                        margin: 0;
                        padding: 0;
                        background: #fff !important;
                        color: #000 !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                    .print-slip-80mm {
                        width: 78mm !important;
                        max-width: 78mm !important;
                        margin: 0 auto !important;
                        padding: 4mm !important;
                        box-shadow: none !important;
                        border: none !important;
                        background: #fff !important;
                        color: #000 !important;
                        page-break-after: always;
                        break-after: page;
                    }
                    .print-slip-a5 {
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 4mm !important;
                        box-shadow: none !important;
                        border: none !important;
                        background: #fff !important;
                        color: #000 !important;
                        page-break-after: always;
                        break-after: page;
                    }
                }
            `}</style>

            {/* Top Toolbar (Hidden During Physical Print) */}
            <div className="no-print max-w-5xl mx-auto mb-6 space-y-4 sticky top-2 z-30">
                <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-900/90 p-4 rounded-2xl border border-zinc-800 backdrop-blur-md shadow-2xl">
                    <div className="flex items-center gap-3">
                        <Link href="/invoices">
                            <Button variant="ghost" size="sm" className="text-zinc-300 hover:text-white">
                                <ArrowLeft className="w-4 h-4 mr-1.5" />
                                <span>Invoices Register</span>
                            </Button>
                        </Link>
                        <div className="h-5 w-[1px] bg-zinc-800" />
                        <div>
                            <h1 className="text-sm font-bold text-white flex items-center gap-2">
                                <Layers className="w-4 h-4 text-emerald-400" />
                                Continuous Range Printing
                            </h1>
                            <p className="text-xs text-zinc-400">
                                Deterministic batch #{range.start_sequence} - #{range.end_sequence} ({documents.length} finalized documents)
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Format Switcher */}
                        <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs font-medium">
                            <button
                                type="button"
                                onClick={() => setFormat('80mm')}
                                className={`px-3 py-1.5 rounded-lg transition-all ${
                                    format === '80mm'
                                        ? 'bg-emerald-500/20 text-emerald-400 font-semibold shadow-sm'
                                        : 'text-zinc-400 hover:text-white'
                                }`}
                            >
                                80mm Thermal
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormat('a5')}
                                className={`px-3 py-1.5 rounded-lg transition-all ${
                                    format === 'a5'
                                        ? 'bg-emerald-500/20 text-emerald-400 font-semibold shadow-sm'
                                        : 'text-zinc-400 hover:text-white'
                                }`}
                            >
                                A5 Invoice
                            </button>
                        </div>

                        {/* Print Trigger Button */}
                        <Button
                            size="sm"
                            disabled={documents.length === 0 || isPrinting}
                            onClick={handlePrintBatch}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-lg shadow-emerald-950/50 cursor-pointer"
                        >
                            <Printer className="w-4 h-4 mr-1.5" />
                            <span>{isPrinting ? 'Recording...' : `Print Batch (${documents.length})`}</span>
                        </Button>
                    </div>
                </div>

                {/* Filter and Range Selector Toolbar */}
                <form
                    onSubmit={handleFilter}
                    className="flex flex-wrap items-center justify-between gap-3 bg-zinc-900/60 p-3.5 rounded-xl border border-zinc-800/80 text-xs"
                >
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                            <span className="text-zinc-400">Start Sequence:</span>
                            <Input
                                type="number"
                                min={1}
                                value={startSeq}
                                onChange={(e) => setStartSeq(e.target.value)}
                                className="w-24 h-8 bg-zinc-950 border-zinc-700 text-center font-mono text-xs"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-zinc-400">End Sequence:</span>
                            <Input
                                type="number"
                                min={1}
                                value={endSeq}
                                onChange={(e) => setEndSeq(e.target.value)}
                                className="w-24 h-8 bg-zinc-950 border-zinc-700 text-center font-mono text-xs"
                            />
                        </div>
                        {periods.length > 0 && (
                            <div className="flex items-center gap-2">
                                <span className="text-zinc-400">Period:</span>
                                <select
                                    value={selectedPeriod}
                                    onChange={(e) => setSelectedPeriod(e.target.value)}
                                    className="h-8 bg-zinc-950 border border-zinc-700 rounded-lg px-2 text-zinc-200 text-xs focus:ring-1 focus:ring-emerald-500"
                                >
                                    <option value="">All Finalized Periods</option>
                                    {periods.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.code} - {p.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <Button type="submit" variant="outline" size="sm" className="h-8 border-zinc-700 text-xs">
                            <Filter className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                            Apply Range
                        </Button>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-mono">
                        <span className="text-zinc-400">
                            Available: <strong className="text-white">#{range.min_available_sequence}</strong> to <strong className="text-white">#{range.max_available_sequence}</strong>
                        </span>
                        <span className="text-zinc-400">
                            Batch Total: <strong className="text-emerald-400">${range.total_amount}</strong>
                        </span>
                    </div>
                </form>
            </div>

            {/* Empty State */}
            {documents.length === 0 && (
                <div className="max-w-md mx-auto my-16 p-8 text-center bg-zinc-900/40 rounded-2xl border border-zinc-800">
                    <AlertCircle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
                    <h3 className="text-base font-bold text-white mb-1">No Finalized Documents Found</h3>
                    <p className="text-xs text-zinc-400 mb-4">
                        There are no finalized documents matching sequence range #{startSeq} to #{endSeq}.
                    </p>
                    <Link href="/invoices">
                        <Button variant="outline" size="sm">
                            Return to Invoices Register
                        </Button>
                    </Link>
                </div>
            )}

            {/* 80mm Multi-Slip Output Container */}
            {documents.length > 0 && format === '80mm' && (
                <div className="max-w-md mx-auto space-y-8">
                    {documents.map((doc, idx) => {
                        const isReprint = (doc.print_logs && doc.print_logs.length > 0) || false;
                        return (
                            <div key={doc.id} className="relative">
                                {/* Slip Index Indicator (Hidden When Printing) */}
                                <div className="no-print mb-2 flex items-center justify-between text-[11px] text-zinc-500 font-mono px-2">
                                    <span>Slip #{idx + 1} of {documents.length}</span>
                                    <span>Doc {doc.document_number} (Seq #{doc.sequence_no})</span>
                                </div>

                                <div className="print-slip-80mm bg-white text-zinc-900 rounded-lg shadow-2xl p-5 border border-zinc-200/50 font-sans">
                                    {/* Brand Header */}
                                    <div className="text-center pb-3 border-b border-dashed border-zinc-300">
                                        <h2 className="text-base font-black tracking-tight text-zinc-950 font-sans">
                                            {business.business_name_primary || 'លៀសហាល អ៉ីទុម'}
                                        </h2>
                                        {business.business_name_secondary && (
                                            <p className="text-[11px] font-semibold text-zinc-600">
                                                {business.business_name_secondary}
                                            </p>
                                        )}
                                        {business.address_primary && (
                                            <p className="text-[10px] text-zinc-500 mt-1 leading-tight">
                                                {business.address_primary}
                                            </p>
                                        )}
                                        {business.phone && (
                                            <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                                                Tel: {business.phone}
                                            </p>
                                        )}
                                    </div>

                                    {/* Document Meta */}
                                    <div className="py-2.5 border-b border-dashed border-zinc-300 text-[11px] space-y-1 font-mono">
                                        <div className="flex justify-between items-center">
                                            <span className="text-zinc-500">Invoice No:</span>
                                            <span className="font-bold text-zinc-950">{doc.document_number}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-zinc-500">Seq #:</span>
                                            <span className="font-semibold text-zinc-800">#{doc.sequence_no}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-zinc-500">Date/Time:</span>
                                            <span className="text-zinc-800">{doc.business_date} {doc.event_time}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-zinc-500">Cashier:</span>
                                            <span className="text-zinc-800">{doc.creator.name}</span>
                                        </div>
                                        {doc.reference_identifier && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-zinc-500">Table / Ref:</span>
                                                <span className="font-semibold text-zinc-800">{doc.reference_identifier}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between items-center">
                                            <span className="text-zinc-500">Order From:</span>
                                            <span className="font-semibold text-zinc-800 font-khmer">
                                                {formatOrderSource(doc.order_source)}
                                                {isDeliveryPlatform(doc.order_source) && doc.external_order_ref && ` #${doc.external_order_ref}`}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Line Items Table */}
                                    <div className="py-3 border-b border-dashed border-zinc-300">
                                        <table className="w-full text-[11px]">
                                            <thead>
                                                <tr className="border-b border-zinc-200 text-zinc-600 font-medium pb-1">
                                                    <th className="text-left pb-1 font-semibold">Item</th>
                                                    <th className="text-center pb-1 w-10 font-semibold">Qty</th>
                                                    <th className="text-right pb-1 w-14 font-semibold">Price</th>
                                                    <th className="text-right pb-1 w-16 font-semibold">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-zinc-100">
                                                {doc.items.map((item) => (
                                                    <tr key={item.id} className="align-top">
                                                        <td className="py-1.5 pr-1 font-medium text-zinc-900 leading-snug">
                                                            {item.product_name_primary_snapshot}
                                                            {item.product_name_secondary_snapshot && (
                                                                <span className="block text-[9px] text-zinc-500 font-normal">
                                                                    {item.product_name_secondary_snapshot}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="py-1.5 text-center font-mono text-zinc-800">
                                                            {item.quantity}
                                                        </td>
                                                        <td className="py-1.5 text-right font-mono text-zinc-700">
                                                            ${Number(item.unit_price).toFixed(2)}
                                                        </td>
                                                        <td className="py-1.5 text-right font-mono font-semibold text-zinc-950">
                                                            ${Number(item.line_total).toFixed(2)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Financial Totals */}
                                    <div className="py-2.5 border-b border-dashed border-zinc-300 text-[11px] space-y-1 font-mono">
                                        <div className="flex justify-between text-zinc-600">
                                            <span>Subtotal:</span>
                                            <span>${Number(doc.subtotal).toFixed(2)}</span>
                                        </div>
                                        {Number(doc.discount_amount) > 0 && (
                                            <div className="flex justify-between text-rose-600">
                                                <span>Discount:</span>
                                                <span>-${Number(doc.discount_amount).toFixed(2)}</span>
                                            </div>
                                        )}
                                        {Number(doc.tax_amount) > 0 && (
                                            <div className="flex justify-between text-zinc-600">
                                                <span>Tax (VAT):</span>
                                                <span>+${Number(doc.tax_amount).toFixed(2)}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between items-baseline text-base font-black text-zinc-950 pt-1.5 border-t border-zinc-200">
                                            <span>GRAND TOTAL / សរុប:</span>
                                            <div className="text-right">
                                                <div>${Number(doc.grand_total).toFixed(2)}</div>
                                                <div className="text-[11px] font-normal text-zinc-600 font-khmer">
                                                    {Math.round(Number(doc.grand_total) * 4100).toLocaleString()} ៛
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex justify-between text-zinc-700 pt-1">
                                            <span>Cash Received:</span>
                                            <span>${Number(doc.amount_received).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between font-bold text-zinc-900">
                                            <span>Change Due / ប្រាក់អាប់:</span>
                                            <div className="text-right">
                                                <span>${Number(doc.change_amount).toFixed(2)}</span>
                                                {Number(doc.change_amount) > 0 && (
                                                    <span className="block text-[10px] font-normal text-zinc-600 font-khmer">
                                                        ≈ {Math.round(Number(doc.change_amount) * 4100).toLocaleString()} ៛
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Thermal Slip Footer */}
                                    <div className="pt-3 text-center text-[10px] text-zinc-500 space-y-1">
                                        <p className="font-semibold text-zinc-700">
                                            {business.document_footer || 'សូមអរគុណ! Thank you for your visit!'}
                                        </p>
                                        <p className="font-mono text-[9px] text-zinc-400">
                                            Period: {doc.period.code} • Batch Print
                                        </p>
                                        {isReprint && (
                                            <div className="inline-block mt-1 px-2 py-0.5 border border-zinc-400 text-zinc-600 font-mono text-[9px] uppercase tracking-wider font-bold">
                                                REPRINT
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Tear Line Separator (Visible in preview, hidden in print) */}
                                {idx < documents.length - 1 && (
                                    <div className="no-print my-6 flex items-center justify-center gap-3 text-zinc-600">
                                        <div className="h-[1px] flex-1 border-b border-dashed border-zinc-700" />
                                        <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                                            ✂ Continuous Roll Cut Line
                                        </span>
                                        <div className="h-[1px] flex-1 border-b border-dashed border-zinc-700" />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* A5 Multi-Invoice Output Container */}
            {documents.length > 0 && format === 'a5' && (
                <div className="max-w-4xl mx-auto space-y-12">
                    {documents.map((doc, idx) => {
                        const isReprint = (doc.print_logs && doc.print_logs.length > 0) || false;
                        return (
                            <div key={doc.id} className="relative">
                                {/* Sheet Index Indicator (Hidden When Printing) */}
                                <div className="no-print mb-2 flex items-center justify-between text-[11px] text-zinc-500 font-mono px-2">
                                    <span>A5 Sheet #{idx + 1} of {documents.length}</span>
                                    <span>Invoice #{doc.document_number} (Seq #{doc.sequence_no})</span>
                                </div>

                                <div className="print-slip-a5 bg-white text-zinc-900 rounded-xl shadow-2xl p-8 border border-zinc-200 font-sans min-h-[580px] flex flex-col justify-between">
                                    {/* Header Section */}
                                    <div>
                                        <div className="flex justify-between items-start pb-6 border-b-2 border-zinc-900">
                                            <div>
                                                <h2 className="text-xl font-black text-zinc-950 font-sans">
                                                    {business.business_name_primary || 'លៀសហាល អ៉ីទុម'}
                                                </h2>
                                                {business.business_name_secondary && (
                                                    <p className="text-xs font-bold text-zinc-700">
                                                        {business.business_name_secondary}
                                                    </p>
                                                )}
                                                {business.address_primary && (
                                                    <p className="text-xs text-zinc-600 mt-1 max-w-sm">
                                                        {business.address_primary}
                                                    </p>
                                                )}
                                                {business.phone && (
                                                    <p className="text-xs text-zinc-600 font-mono">
                                                        Tel: {business.phone}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="text-right">
                                                <div className="inline-block bg-zinc-900 text-white text-xs font-mono font-bold px-3 py-1 rounded">
                                                    COMMERCIAL INVOICE
                                                </div>
                                                <div className="mt-2 text-xs font-mono space-y-0.5">
                                                    <p className="font-bold text-sm text-zinc-950">{doc.document_number}</p>
                                                    <p className="text-zinc-600">Seq: #{doc.sequence_no}</p>
                                                    <p className="text-zinc-600">Date: {doc.business_date}</p>
                                                    <p className="text-zinc-600">Time: {doc.event_time}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Meta Information Bar */}
                                        <div className="grid grid-cols-3 gap-4 py-3 border-b border-zinc-200 text-xs font-mono bg-zinc-50 px-3 my-4 rounded">
                                            <div>
                                                <span className="text-zinc-500 block text-[10px]">CASHIER</span>
                                                <span className="font-semibold text-zinc-900">{doc.creator.name}</span>
                                            </div>
                                            <div>
                                                <span className="text-zinc-500 block text-[10px]">PERIOD / BATCH</span>
                                                <span className="font-semibold text-zinc-900">{doc.period.code}</span>
                                            </div>
                                            <div>
                                                <span className="text-zinc-500 block text-[10px]">TABLE / REFERENCE</span>
                                                <span className="font-semibold text-zinc-900">{doc.reference_identifier || '—'}</span>
                                            </div>
                                            <div>
                                                <span className="text-zinc-500 block text-[10px]">ORDER FROM</span>
                                                <span className="font-semibold text-zinc-900 font-khmer">
                                                    {formatOrderSource(doc.order_source)}
                                                    {isDeliveryPlatform(doc.order_source) && doc.external_order_ref && ` #${doc.external_order_ref}`}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Line Items Table */}
                                        <table className="w-full text-xs mt-4">
                                            <thead>
                                                <tr className="border-b-2 border-zinc-800 text-zinc-800 font-semibold uppercase text-[10px]">
                                                    <th className="text-left py-2">#</th>
                                                    <th className="text-left py-2">Description / Name</th>
                                                    <th className="text-center py-2">Unit</th>
                                                    <th className="text-center py-2">Qty</th>
                                                    <th className="text-right py-2">Unit Price</th>
                                                    <th className="text-right py-2">Line Total</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-zinc-200">
                                                {doc.items.map((item, i) => (
                                                    <tr key={item.id} className="align-middle">
                                                        <td className="py-2 text-zinc-500 font-mono text-[11px]">{i + 1}</td>
                                                        <td className="py-2 font-medium text-zinc-900">
                                                            {item.product_name_primary_snapshot}
                                                            {item.product_name_secondary_snapshot && (
                                                                <span className="block text-[10px] text-zinc-500">
                                                                    {item.product_name_secondary_snapshot}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="py-2 text-center text-zinc-600">{item.unit_snapshot}</td>
                                                        <td className="py-2 text-center font-mono font-semibold">{item.quantity}</td>
                                                        <td className="py-2 text-right font-mono text-zinc-700">${Number(item.unit_price).toFixed(2)}</td>
                                                        <td className="py-2 text-right font-mono font-bold text-zinc-950">${Number(item.line_total).toFixed(2)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Bottom Summary & Signatures */}
                                    <div className="pt-6">
                                        <div className="flex justify-end">
                                            <div className="w-64 space-y-1.5 text-xs font-mono">
                                                <div className="flex justify-between text-zinc-600">
                                                    <span>Subtotal:</span>
                                                    <span>${Number(doc.subtotal).toFixed(2)}</span>
                                                </div>
                                                {Number(doc.discount_amount) > 0 && (
                                                    <div className="flex justify-between text-rose-600">
                                                        <span>Discount:</span>
                                                        <span>-${Number(doc.discount_amount).toFixed(2)}</span>
                                                    </div>
                                                )}
                                                {Number(doc.tax_amount) > 0 && (
                                                    <div className="flex justify-between text-zinc-600">
                                                        <span>VAT / Tax:</span>
                                                        <span>+${Number(doc.tax_amount).toFixed(2)}</span>
                                                    </div>
                                                )}
                                                <div className="flex justify-between items-baseline text-base font-black text-zinc-950 pt-2 border-t-2 border-zinc-900">
                                                    <span>TOTAL DUE / សរុប:</span>
                                                    <div className="text-right">
                                                        <div>${Number(doc.grand_total).toFixed(2)}</div>
                                                        <div className="text-xs font-normal text-zinc-600 font-khmer">
                                                            ≈ {Math.round(Number(doc.grand_total) * 4100).toLocaleString()} ៛
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Signature Blocks */}
                                        <div className="grid grid-cols-2 gap-8 pt-10 mt-8 border-t border-dashed border-zinc-300 text-center text-xs">
                                            <div>
                                                <div className="h-14 border-b border-zinc-400" />
                                                <p className="mt-2 font-medium text-zinc-700">រៀបចំដោយ / Prepared By</p>
                                                <p className="text-[10px] text-zinc-500 font-mono">{doc.creator.name}</p>
                                            </div>
                                            <div>
                                                <div className="h-14 border-b border-zinc-400" />
                                                <p className="mt-2 font-medium text-zinc-700">អ្នកទទួល / Received By</p>
                                                <p className="text-[10px] text-zinc-500 font-mono">Customer Signature</p>
                                            </div>
                                        </div>

                                        {/* Footer Notice */}
                                        <div className="mt-6 pt-3 border-t border-zinc-200 text-center text-[10px] text-zinc-500">
                                            <p>{business.document_footer || 'សូមអរគុណ! Thank you for your business!'}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Page Break Spacer (Hidden in print) */}
                                {idx < documents.length - 1 && (
                                    <div className="no-print my-8 flex items-center justify-center gap-3 text-zinc-600">
                                        <div className="h-[1px] flex-1 border-b border-dashed border-zinc-700" />
                                        <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                                            Page Break Between A5 Documents
                                        </span>
                                        <div className="h-[1px] flex-1 border-b border-dashed border-zinc-700" />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
