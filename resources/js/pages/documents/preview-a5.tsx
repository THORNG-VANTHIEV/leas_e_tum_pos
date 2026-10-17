import React, { useState } from 'react';
import { Head, Link, usePage, router } from '@inertiajs/react';
import { PageProps } from '@/types';
import { Printer, ArrowLeft, RefreshCw, FileText, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatOrderSource, isDeliveryPlatform } from '@/components/order-source';
import { paymentMethodLabel } from '@/components/document-status';
import { tr } from '@/locales/tr';

interface DocumentPrintProps {
    document: {
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

export default function PreviewA5({ document: doc }: DocumentPrintProps) {
    const { business } = usePage<PageProps>().props;
    const [isPrinting, setIsPrinting] = useState(false);

    const printOpts = business.print_settings || {};
    const showLogo = printOpts.show_logo ?? true;
    const showBusinessName = printOpts.show_business_name ?? true;
    const headerTitleEn = printOpts.header_title_en || 'INVOICE';
    const headerTitleKm = printOpts.header_title_km || 'វិក្កយបត្រ';
    const showAddress = printOpts.show_address ?? true;
    const showPhone = printOpts.show_phone ?? true;
    const showVatTin = printOpts.show_vat_tin ?? true;
    const showCashier = printOpts.show_cashier ?? true;
    const showTableRef = printOpts.show_table_ref ?? true;
    const showGuestCount = printOpts.show_guest_count ?? true;
    const showDateTime = printOpts.show_datetime ?? true;
    const showCustomerInfo = printOpts.show_customer_info ?? true;
    const showItemKhmerName = printOpts.show_item_khmer_name ?? true;
    const showItemUnit = printOpts.show_item_unit ?? true;
    const showItemQuantity = printOpts.show_item_quantity ?? true;
    const showSubtotal = printOpts.show_subtotal ?? true;
    const showDiscount = printOpts.show_discount ?? true;
    const showTax = printOpts.show_tax ?? false;
    const showDualCurrency = printOpts.show_dual_currency ?? true;
    const exchangeRate = business.exchange_rate_khr || printOpts.exchange_rate_khr || 4000;
    const showPaymentMethod = printOpts.show_payment_method ?? true;
    const showChange = printOpts.show_change ?? true;
    const showSignatureBlocks = printOpts.show_signature_blocks ?? true;
    const policyNote = printOpts.policy_note;
    const showQrPayment = printOpts.show_qr_payment ?? true;
    const qrPaymentText = printOpts.qr_payment_text || 'ស្កេនដើម្បីបង់ / Scan to Pay';
    const qrCodeImage = printOpts.qr_code_image;
    const qrBankName = printOpts.qr_bank_name || 'Bakong KHQR • Cambodia FastPay';
    const qrAccountName = printOpts.qr_account_name;
    const qrAccountNumber = printOpts.qr_account_number;

    const isReprint = (doc.print_logs && doc.print_logs.length > 0) || false;

    const handlePrint = () => {
        setIsPrinting(true);
        const requestId = crypto.randomUUID();

        router.post(
            `/invoices/${doc.id}/print-requests`,
            {
                format: 'a5',
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
            <Head title={`${tr('វិក្កយបត្រ')} A5 - ${doc.document_number || `${tr('ព្រាង #')}${doc.id}`}`} />

            {/* Print styles injected for precise A5 page format */}
            <style>{`
                @media print {
                    @page {
                        margin: 8mm;
                        size: A5 portrait;
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
                    .invoice-container {
                        width: 100% !important;
                        max-width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        box-shadow: none !important;
                        border: none !important;
                        background: #fff !important;
                        color: #000 !important;
                    }
                }
            `}</style>

            {/* Top Toolbar (Hidden when printing) */}
            <div className="no-print max-w-2xl mx-auto mb-6 flex items-center justify-between gap-3 bg-zinc-900/90 p-3 rounded-xl border border-zinc-800 backdrop-blur-md shadow-xl">
                <Link href={`/invoices/${doc.id}`}>
                    <Button variant="ghost" size="sm" className="text-zinc-300 hover:text-white">
                        <ArrowLeft className="w-4 h-4 mr-1.5" />
                        <span className="font-khmer">{tr('វិក្កយបត្រ')}</span>
                    </Button>
                </Link>

                <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400 font-khmer">{tr('ក្រដាស A5')}</span>
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
                        <span className="font-khmer">{isPrinting ? tr('កំពុងកត់ត្រា...') : tr('ព្រីន A5')}</span>
                    </Button>
                </div>
            </div>

            {/* A5 Formal Invoice Canvas */}
            <div className="invoice-container max-w-2xl mx-auto bg-white text-black p-8 rounded-lg shadow-2xl font-sans text-xs space-y-6">
                {/* Header: Company & Invoice Info */}
                <div className="flex items-start justify-between pb-4 border-b-2 border-zinc-900">
                    <div className="space-y-1">
                        {isReprint && (
                            <div className="inline-block px-2 py-0.5 mb-1 text-[10px] font-bold tracking-widest uppercase border border-black rounded font-mono">
                                <span className="font-khmer">*** ព្រីនឡើងវិញ / REPRINT ***</span>
                            </div>
                        )}
                        {showLogo && (
                            <div className="w-10 h-10 rounded-lg bg-black text-white flex items-center justify-center font-bold text-xs mb-1">
                                LE
                            </div>
                        )}
                        {showBusinessName && (
                            <>
                                <h1 className="text-xl font-bold tracking-tight text-zinc-950 uppercase">
                                    {business.business_name_primary || 'លៀសហាល អ៉ីទុម'}
                                </h1>
                                {business.business_name_secondary && (
                                    <div className="text-sm font-khmer text-zinc-700">
                                        {business.business_name_secondary}
                                    </div>
                                )}
                            </>
                        )}
                        {showAddress && (business.address || business.address_primary) && (
                            <div className="text-xs text-zinc-600 max-w-xs leading-relaxed">
                                {business.address || business.address_primary}
                            </div>
                        )}
                        {showPhone && business.phone && (
                            <div className="text-xs text-zinc-600 font-mono">
                                <span className="font-khmer">ទូរស័ព្ទ / Tel:</span> {business.phone}
                            </div>
                        )}
                        {showVatTin && (business.vat_number || business.tax_identifier) && (
                            <div className="text-xs font-semibold text-zinc-800 font-mono">
                                VAT/TIN: {business.vat_number || business.tax_identifier}
                            </div>
                        )}
                    </div>

                    <div className="text-right space-y-1">
                        <div className="inline-block px-3 py-1 bg-zinc-100 rounded text-base font-bold font-mono tracking-wider border border-zinc-300">
                            {headerTitleEn}
                        </div>
                        {headerTitleKm && (
                            <div className="text-xs font-khmer text-zinc-600">{headerTitleKm}</div>
                        )}
                        <div className="pt-2 text-xs space-y-0.5 font-mono">
                            <div>
                                <span className="text-zinc-500 font-khmer">លេខវិក្កយបត្រ / NO: </span>
                                <span className="font-bold text-zinc-950">
                                    {doc.document_number || `DRAFT-${String(doc.provisional_order).padStart(4, '0')}`}
                                </span>
                            </div>
                            {showDateTime && (
                                <div>
                                    <span className="text-zinc-500 font-khmer">កាលបរិច្ឆេទ / DATE: </span>
                                    <span>{doc.business_date} {doc.event_time.slice(0, 5)}</span>
                                </div>
                            )}
                            <div>
                                <span className="text-zinc-500 font-khmer">វគ្គ / PERIOD: </span>
                                <span>{doc.period.code}</span>
                            </div>
                            {showTableRef && doc.reference_identifier && (
                                <div>
                                    <span className="text-zinc-500 font-khmer">តុ / TABLE: </span>
                                    <span className="font-bold">{doc.reference_identifier}</span>
                                </div>
                            )}
                            <div>
                                <span className="text-zinc-500 font-khmer">កម្មង់ពី / FROM: </span>
                                <span className="font-bold font-khmer">{formatOrderSource(doc.order_source)}</span>
                            </div>
                            {isDeliveryPlatform(doc.order_source) && doc.external_order_ref && (
                                <div>
                                    <span className="text-zinc-500 font-khmer">លេខកម្មង់ App / ORDER #: </span>
                                    <span className="font-bold">{doc.external_order_ref}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sub-header meta bar */}
                <div className="grid grid-cols-3 gap-4 p-3 bg-zinc-50 rounded border border-zinc-200 text-xs">
                    {showCashier && (
                        <div>
                            <span className="text-zinc-500 block text-[10px] font-khmer">អ្នកគិតប្រាក់ / Cashier</span>
                            <span className="font-semibold text-zinc-900">{doc.creator.name}</span>
                        </div>
                    )}
                    {showGuestCount && (
                        <div>
                            <span className="text-zinc-500 block text-[10px] font-khmer">ភ្ញៀវ / Guests</span>
                            <span className="font-semibold text-zinc-900">{doc.unit_count} <span className="font-khmer">នាក់</span></span>
                        </div>
                    )}
                    <div>
                        <span className="text-zinc-500 block text-[10px] font-khmer">បង់ប្រាក់ / Payment</span>
                        <span className="font-semibold text-zinc-900 font-khmer">{paymentMethodLabel(doc.payment_method)}</span>
                    </div>
                </div>

                {/* Formal Items Table */}
                <div className="overflow-hidden border border-zinc-900 rounded">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-zinc-100 text-zinc-900 text-[11px] font-bold border-b border-zinc-900 font-khmer">
                                <th className="p-2 border-r border-zinc-300 w-10 text-center">#</th>
                                <th className="p-2 border-r border-zinc-300">មុខទំនិញ / Description</th>
                                <th className="p-2 border-r border-zinc-300 w-16 text-center">ឯកតា<br />Unit</th>
                                <th className="p-2 border-r border-zinc-300 w-16 text-center">ចំនួន<br />Qty</th>
                                <th className="p-2 border-r border-zinc-300 w-24 text-right">តម្លៃ<br />Price</th>
                                <th className="p-2 w-24 text-right">សរុប<br />Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 text-xs">
                            {doc.items.map((item, idx) => (
                                <tr key={item.id} className="hover:bg-zinc-50/50">
                                    <td className="p-2 border-r border-zinc-200 text-center font-mono text-zinc-500">
                                        {idx + 1}
                                    </td>
                                    <td className="p-2 border-r border-zinc-200">
                                        <div className="font-semibold text-zinc-900">
                                            {item.product_name_primary_snapshot}
                                        </div>
                                        {item.product_name_secondary_snapshot && (
                                            <div className="text-[11px] text-zinc-600 font-khmer">
                                                {item.product_name_secondary_snapshot}
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-2 border-r border-zinc-200 text-center font-mono text-zinc-600">
                                        {item.unit_snapshot}
                                    </td>
                                    <td className="p-2 border-r border-zinc-200 text-center font-mono font-semibold">
                                        {item.quantity}
                                    </td>
                                    <td className="p-2 border-r border-zinc-200 text-right font-mono text-zinc-700">
                                        {business.currency_symbol}{item.unit_price}
                                    </td>
                                    <td className="p-2 text-right font-mono font-bold text-zinc-950">
                                        {business.currency_symbol}{item.line_total}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Totals Summary */}
                <div className="flex justify-between items-start gap-8 pt-2">
                    <div className="flex-1 space-y-2 text-xs text-zinc-600">
                        {showQrPayment && (
                            <div className="flex items-center gap-3 p-2.5 bg-zinc-50 border border-zinc-200 rounded text-xs">
                                {qrCodeImage ? (
                                    <div className="w-20 h-20 bg-white p-1 border border-zinc-300 rounded shrink-0 flex items-center justify-center">
                                        <img
                                            src={qrCodeImage}
                                            alt="Bank KHQR"
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                ) : (
                                    <div className="w-16 h-16 bg-white p-1 border-2 border-dashed border-zinc-300 rounded shrink-0 flex flex-col items-center justify-center text-zinc-400">
                                        <QrCode className="w-6 h-6 text-zinc-400 stroke-1" />
                                        <span className="text-[7px] text-zinc-400 mt-0.5">KHQR</span>
                                    </div>
                                )}
                                <div className="space-y-0.5">
                                    <div className="font-bold text-zinc-800 uppercase flex items-center gap-1 text-[11px]">
                                        <QrCode className="w-3.5 h-3.5 text-rose-600" />
                                        <span>{qrPaymentText}</span>
                                    </div>
                                    <div className="text-[10px] text-zinc-500 font-sans">
                                        {qrBankName}
                                    </div>
                                    {(qrAccountName || qrAccountNumber) && (
                                        <div className="text-[10px] text-zinc-800 font-mono font-medium">
                                            {qrAccountName && <span>{qrAccountName}</span>}
                                            {qrAccountName && qrAccountNumber && <span> • </span>}
                                            {qrAccountNumber && <span>{qrAccountNumber}</span>}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        {policyNote && (
                            <div className="p-2 bg-zinc-50 border border-zinc-200 rounded font-khmer italic text-[11px]">
                                {policyNote}
                            </div>
                        )}
                        {doc.note && (
                            <div className="p-2 bg-zinc-50 border border-zinc-200 rounded">
                                <span className="font-bold text-zinc-700 block font-khmer">កំណត់ចំណាំ / Note:</span>
                                <span>{doc.note}</span>
                            </div>
                        )}
                        <div className="text-[11px] italic text-zinc-500">
                            <span className="font-khmer">{business.document_footer || 'សូមអរគុណ! Thank you for your business!'}</span>
                        </div>
                    </div>

                    <div className="w-64 space-y-1.5 border border-zinc-300 p-3 rounded bg-zinc-50/60 font-mono text-xs">
                        {showSubtotal && (
                            <div className="flex justify-between text-zinc-600">
                                <span className="font-khmer">សរុបរង / Subtotal:</span>
                                <span>{business.currency_symbol}{doc.subtotal}</span>
                            </div>
                        )}
                        {showTax && parseFloat(doc.tax_amount) > 0 && (
                            <div className="flex justify-between text-zinc-600">
                                <span className="font-khmer">ពន្ធ / Tax:</span>
                                <span>{business.currency_symbol}{doc.tax_amount}</span>
                            </div>
                        )}
                        {showDiscount && parseFloat(doc.discount_amount) > 0 && (
                            <div className="flex justify-between text-zinc-600">
                                <span className="font-khmer">បញ្ចុះតម្លៃ / Discount:</span>
                                <span>-{business.currency_symbol}{doc.discount_amount}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-baseline text-sm font-bold text-zinc-950 pt-1.5 border-t border-zinc-400">
                            <span className="font-khmer">សរុប / Total:</span>
                            <div className="text-right">
                                <div>{business.currency_symbol}{doc.grand_total}</div>
                                {showDualCurrency && (
                                    <div className="text-xs font-normal text-zinc-600 font-khmer">
                                        ≈ {Math.round((parseFloat(doc.grand_total) || 0) * exchangeRate).toLocaleString()} ៛
                                    </div>
                                )}
                            </div>
                        </div>
                        {showPaymentMethod && (
                            <div className="flex justify-between text-zinc-600 pt-1 border-t border-zinc-200">
                                <span className="font-khmer">ប្រាក់ទទួល / Paid:</span>
                                <span>{business.currency_symbol}{doc.amount_received}</span>
                            </div>
                        )}
                        {showChange && (
                            <div className="flex justify-between font-bold text-zinc-900">
                                <span className="font-khmer">ប្រាក់អាប់ / Change:</span>
                                <div className="text-right">
                                    <span>{business.currency_symbol}{doc.change_amount}</span>
                                    {showDualCurrency && parseFloat(doc.change_amount) > 0 && (
                                        <span className="block text-[11px] font-normal text-zinc-600 font-khmer">
                                            ≈ {Math.round(parseFloat(doc.change_amount) * exchangeRate).toLocaleString()} ៛
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Signature Blocks */}
                {showSignatureBlocks && (
                    <div className="grid grid-cols-2 gap-12 pt-8 border-t border-zinc-200 text-xs">
                        <div className="text-center space-y-12">
                            <div className="font-semibold text-zinc-800">
                                <span className="font-khmer">អ្នកគិតប្រាក់ / Cashier</span>
                            </div>
                            <div className="border-b border-zinc-400 w-48 mx-auto"></div>
                            <div className="text-[11px] text-zinc-500 font-mono">
                                {doc.creator.name}
                            </div>
                        </div>

                        <div className="text-center space-y-12">
                            <div className="font-semibold text-zinc-800">
                                <span className="font-khmer">អតិថិជន / Customer</span>
                            </div>
                            <div className="border-b border-zinc-400 w-48 mx-auto"></div>
                            <div className="text-[11px] text-zinc-500 font-mono">
                                <span className="font-khmer">ហត្ថលេខា & កាលបរិច្ឆេទ / Signature & Date</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
