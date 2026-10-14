import React, { useState } from 'react';
import { Head, Link, usePage, router } from '@inertiajs/react';
import { PageProps } from '@/types';
import { Printer, ArrowLeft, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DocumentPrintProps {
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
    };
}

export default function Preview80mm({ document: doc }: DocumentPrintProps) {
    const { business } = usePage<PageProps>().props;
    const [isPrinting, setIsPrinting] = useState(false);

    const isReprint = (doc.print_logs && doc.print_logs.length > 0) || false;

    const handlePrint = () => {
        setIsPrinting(true);
        const requestId = crypto.randomUUID();

        router.post(
            `/invoices/${doc.id}/print-requests`,
            {
                format: '80mm',
                request_id: requestId,
            },
            {
                preserveScroll: true,
                onFinish: () => {
                    setIsPrinting(false);
                    setTimeout(() => {
                        window.print();
                    }, 100);
                },
            }
        );
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-900 py-6 px-4 selection:bg-zinc-200">
            <Head title={`80mm Receipt - ${doc.document_number || `Draft #${doc.id}`}`} />

            {/* Print styles injected for precise 80mm continuous thermal slip */}
            <style>{`
                @media print {
                    @page {
                        margin: 0;
                        size: 80mm auto;
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
                    .receipt-container {
                        width: 78mm !important;
                        max-width: 78mm !important;
                        margin: 0 auto !important;
                        padding: 4mm !important;
                        box-shadow: none !important;
                        border: none !important;
                        background: #fff !important;
                        color: #000 !important;
                    }
                }
            `}</style>

            {/* Top Toolbar (Hidden when printing) */}
            <div className="no-print max-w-md mx-auto mb-6 flex items-center justify-between gap-3 bg-zinc-900/90 p-3 rounded-xl border border-zinc-800 backdrop-blur-md shadow-xl">
                <Link href={`/invoices/${doc.id}`}>
                    <Button variant="ghost" size="sm" className="text-zinc-300 hover:text-white">
                        <ArrowLeft className="w-4 h-4 mr-1.5" />
                        <span>Invoice</span>
                    </Button>
                </Link>

                <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400 font-mono">80mm Thermal</span>
                    <Button
                        size="sm"
                        onClick={handlePrint}
                        disabled={isPrinting}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-md shadow-emerald-950"
                    >
                        {isPrinting ? (
                            <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" />
                        ) : (
                            <Printer className="w-4 h-4 mr-1.5" />
                        )}
                        <span>{isPrinting ? 'Recording...' : 'Print Slip'}</span>
                    </Button>
                </div>
            </div>

            {/* 80mm Thermal Receipt Canvas */}
            <div className="receipt-container max-w-[340px] mx-auto bg-white text-black p-5 rounded-lg shadow-2xl font-mono text-[12px] leading-tight space-y-3">
                {/* Header / Brand */}
                <div className="text-center space-y-1 pb-3 border-b border-dashed border-zinc-400">
                    {isReprint && (
                        <div className="inline-block px-2 py-0.5 mb-1 text-[10px] font-bold tracking-widest uppercase border border-black rounded">
                            *** DUPLICATE / REPRINT ***
                        </div>
                    )}
                    <h1 className="text-base font-bold tracking-tight uppercase">
                        {business.business_name_primary || 'លៀសហាល អ៉ីទុម'}
                    </h1>
                    {business.business_name_secondary && (
                        <div className="text-xs font-khmer font-bold">
                            {business.business_name_secondary}
                        </div>
                    )}
                    {(business.address || business.address_primary) && (
                        <div className="text-[11px] text-zinc-700 leading-snug">
                            {business.address || business.address_primary}
                        </div>
                    )}
                    {business.phone && (
                        <div className="text-[11px] text-zinc-700">
                            TEL: {business.phone}
                        </div>
                    )}
                    {business.vat_number && (
                        <div className="text-[10px] text-zinc-600">
                            VAT/TIN: {business.vat_number}
                        </div>
                    )}
                </div>

                {/* Meta details */}
                <div className="space-y-1 text-[11px] pb-2 border-b border-dashed border-zinc-400">
                    <div className="flex justify-between">
                        <span className="text-zinc-600">RECEIPT NO:</span>
                        <span className="font-bold">
                            {doc.document_number || `DRAFT-${String(doc.provisional_order).padStart(4, '0')}`}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-zinc-600">DATE & TIME:</span>
                        <span>{doc.business_date} {doc.event_time.slice(0, 5)}</span>
                    </div>
                    {doc.reference_identifier && (
                        <div className="flex justify-between">
                            <span className="text-zinc-600">TABLE / REF:</span>
                            <span className="font-bold">{doc.reference_identifier}</span>
                        </div>
                    )}
                    <div className="flex justify-between">
                        <span className="text-zinc-600">CASHIER:</span>
                        <span>{doc.creator.name}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-zinc-600">GUEST PAX / UNITS:</span>
                        <span>{doc.unit_count}</span>
                    </div>
                </div>

                {/* Line Items Table */}
                <div className="space-y-1.5 pb-3 border-b border-dashed border-zinc-400">
                    <div className="flex justify-between text-[11px] font-bold text-zinc-700 pb-1 border-b border-zinc-300">
                        <span>ITEM / QTY</span>
                        <span>AMOUNT</span>
                    </div>

                    {doc.items.map((item) => (
                        <div key={item.id} className="space-y-0.5">
                            <div className="flex justify-between font-sans text-[12px] font-semibold text-black">
                                <span className="leading-tight">
                                    {item.product_name_primary_snapshot}
                                    {item.product_name_secondary_snapshot && (
                                        <span className="block text-[11px] text-zinc-600 font-khmer">
                                            {item.product_name_secondary_snapshot}
                                        </span>
                                    )}
                                </span>
                                <span className="font-mono text-[12px] shrink-0 font-bold">
                                    {business.currency_symbol}{item.line_total}
                                </span>
                            </div>
                            <div className="flex justify-between text-[11px] text-zinc-600 font-mono">
                                <span>
                                    {item.quantity} {item.unit_snapshot} × {business.currency_symbol}{item.unit_price}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Financial Totals */}
                <div className="space-y-1 text-[12px] pb-3 border-b border-dashed border-zinc-400">
                    <div className="flex justify-between">
                        <span>SUBTOTAL:</span>
                        <span>{business.currency_symbol}{doc.subtotal}</span>
                    </div>

                    {parseFloat(doc.tax_amount) > 0 && (
                        <div className="flex justify-between text-[11px] text-zinc-600">
                            <span>TAX:</span>
                            <span>{business.currency_symbol}{doc.tax_amount}</span>
                        </div>
                    )}

                    {parseFloat(doc.discount_amount) > 0 && (
                        <div className="flex justify-between text-[11px] text-zinc-600">
                            <span>DISCOUNT:</span>
                            <span>-{business.currency_symbol}{doc.discount_amount}</span>
                        </div>
                    )}

                    <div className="flex justify-between items-baseline text-[14px] font-bold pt-1.5 border-t border-zinc-300">
                        <span>TOTAL DUE / សរុប:</span>
                        <div className="text-right">
                            <div>{business.currency_symbol}{doc.grand_total}</div>
                            <div className="text-[12px] font-normal text-zinc-700 font-khmer">
                                {Math.round((parseFloat(doc.grand_total) || 0) * 4100).toLocaleString()} ៛
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-between pt-1 text-[11px] text-zinc-600">
                        <span>TENDERED ({doc.payment_method.toUpperCase()}):</span>
                        <span>{business.currency_symbol}{doc.amount_received}</span>
                    </div>

                    <div className="flex justify-between font-bold text-[12px]">
                        <span>CHANGE / ប្រាក់អាប់:</span>
                        <div className="text-right">
                            <span>{business.currency_symbol}{doc.change_amount}</span>
                            {parseFloat(doc.change_amount) > 0 && (
                                <span className="block text-[11px] font-normal text-zinc-600 font-khmer">
                                    ≈ {Math.round(parseFloat(doc.change_amount) * 4100).toLocaleString()} ៛
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer Notes */}
                <div className="text-center pt-2 space-y-1 text-[11px] text-zinc-600">
                    <div>{business.document_footer || 'Thank you for dining with us! សូមអរគុណ!'}</div>
                    <div className="text-[9px] text-zinc-500 tracking-wider font-sans font-medium">
                        លៀសហាល អ៉ីទុម POS • LEASHAL ETUM
                    </div>
                </div>
            </div>
        </div>
    );
}
