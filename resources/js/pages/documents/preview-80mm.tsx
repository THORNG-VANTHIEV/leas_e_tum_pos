import React, { useState } from 'react';
import { Head, Link, usePage, router } from '@inertiajs/react';
import { PageProps } from '@/types';
import { Printer, ArrowLeft, RefreshCw, CheckCircle2, QrCode, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatOrderSource, isDeliveryPlatform } from '@/components/order-source';
import { useAutoPrint } from '@/components/print-queue';
import { paymentMethodLabel } from '@/components/document-status';

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

export default function Preview80mm({ document: doc }: DocumentPrintProps) {
    const { business } = usePage<PageProps>().props;
    const [isPrinting, setIsPrinting] = useState(false);

    const printOpts = business.print_settings || {};
    const showLogo = printOpts.show_logo ?? true;
    const showBusinessName = printOpts.show_business_name ?? true;
    const headerTitleEn = printOpts.header_title_en || 'RECEIPT';
    const headerTitleKm = printOpts.header_title_km || 'វិក្កយបត្រ';
    const showAddress = printOpts.show_address ?? true;
    const showPhone = printOpts.show_phone ?? true;
    const showVatTin = printOpts.show_vat_tin ?? true;
    const showCashier = printOpts.show_cashier ?? true;
    const showTableRef = printOpts.show_table_ref ?? true;
    const showGuestCount = printOpts.show_guest_count ?? true;
    const showDateTime = printOpts.show_datetime ?? true;
    const showBarcode = printOpts.show_barcode ?? true;
    const showItemKhmerName = printOpts.show_item_khmer_name ?? true;
    const showItemUnit = printOpts.show_item_unit ?? true;
    const showItemQuantity = printOpts.show_item_quantity ?? true;
    const showItemSku = printOpts.show_item_sku ?? false;
    const showSubtotal = printOpts.show_subtotal ?? true;
    const showDiscount = printOpts.show_discount ?? true;
    const showTax = printOpts.show_tax ?? false;
    const showDualCurrency = printOpts.show_dual_currency ?? true;
    const exchangeRate = business.exchange_rate_khr || printOpts.exchange_rate_khr || 4000;
    const showPaymentMethod = printOpts.show_payment_method ?? true;
    const showChange = printOpts.show_change ?? true;
    const showQrPayment = printOpts.show_qr_payment ?? true;
    const qrPaymentText = printOpts.qr_payment_text || 'ស្កេនដើម្បីបង់ / Scan to Pay';
    const qrCodeImage = printOpts.qr_code_image;
    const qrBankName = printOpts.qr_bank_name || 'Bakong KHQR';
    const qrAccountName = printOpts.qr_account_name;
    const qrAccountNumber = printOpts.qr_account_number;
    const showWifi = printOpts.show_wifi_info ?? true;
    const wifiSsid = printOpts.wifi_ssid || 'Leashal-Etum-Guest';
    const wifiPassword = printOpts.wifi_password || 'welcome2026';
    const policyNote = printOpts.policy_note;

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

    // Opened by the POS print queue right after checkout: log the print and print immediately
    useAutoPrint(handlePrint);

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-900 py-6 px-4 selection:bg-zinc-200">
            <Head title={`វិក្កយបត្រ 80mm - ${doc.document_number || `ព្រាង #${doc.id}`}`} />

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
                        <span className="font-khmer">វិក្កយបត្រ</span>
                    </Button>
                </Link>

                <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400 font-khmer">ក្រដាស 80mm</span>
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
                        <span className="font-khmer">{isPrinting ? 'កំពុងកត់ត្រា...' : 'ព្រីន'}</span>
                    </Button>
                </div>
            </div>

            {/* 80mm Thermal Receipt Canvas */}
            <div className="receipt-container max-w-[340px] mx-auto bg-white text-black p-5 rounded-lg shadow-2xl font-mono text-[12px] leading-tight space-y-3">
                {/* Header / Brand */}
                <div className="text-center space-y-1 pb-3 border-b border-dashed border-zinc-400">
                    {isReprint && (
                        <div className="inline-block px-2 py-0.5 mb-1 text-[10px] font-bold tracking-widest uppercase border border-black rounded">
                            <span className="font-khmer">*** ព្រីនឡើងវិញ / REPRINT ***</span>
                        </div>
                    )}
                    {showLogo && (
                        <div className="w-9 h-9 mx-auto rounded-full bg-black text-white flex items-center justify-center font-bold text-xs mb-1">
                            LE
                        </div>
                    )}
                    {showBusinessName && (
                        <>
                            <h1 className="text-base font-bold tracking-tight uppercase">
                                {business.business_name_primary || 'លៀសហាល អ៉ីទុម'}
                            </h1>
                            {business.business_name_secondary && (
                                <div className="text-xs font-khmer font-bold">
                                    {business.business_name_secondary}
                                </div>
                            )}
                        </>
                    )}
                    <div className="pt-0.5">
                        <span className="font-bold text-[12px] uppercase">{headerTitleEn}</span>
                        {headerTitleKm && (
                            <span className="block text-[11px] font-khmer">{headerTitleKm}</span>
                        )}
                    </div>
                    {showAddress && (business.address || business.address_primary) && (
                        <div className="text-[11px] text-zinc-700 leading-snug">
                            {business.address || business.address_primary}
                        </div>
                    )}
                    {showPhone && business.phone && (
                        <div className="text-[11px] text-zinc-700">
                            <span className="font-khmer">ទូរស័ព្ទ / TEL:</span> {business.phone}
                        </div>
                    )}
                    {showVatTin && (business.vat_number || business.tax_identifier) && (
                        <div className="text-[10px] text-zinc-600">
                            VAT/TIN: {business.vat_number || business.tax_identifier}
                        </div>
                    )}
                </div>

                {/* Delivery app banner — always printed so packers and riders can match the bag */}
                {isDeliveryPlatform(doc.order_source) && (
                    <div className="my-2 border-2 border-black rounded px-2 py-1.5 text-center">
                        <div className="text-[15px] font-black uppercase tracking-wide font-khmer">
                            {formatOrderSource(doc.order_source)}
                        </div>
                        {doc.external_order_ref && (
                            <div className="text-[12px] font-bold"><span className="font-khmer">លេខកម្មង់ / ORDER #:</span> {doc.external_order_ref}</div>
                        )}
                    </div>
                )}

                {/* Meta details */}
                <div className="space-y-1 text-[11px] pb-2 border-b border-dashed border-zinc-400">
                    <div className="flex justify-between">
                        <span className="text-zinc-600 font-khmer">កម្មង់ពី / FROM:</span>
                        <span className="font-bold font-khmer">{formatOrderSource(doc.order_source)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-zinc-600 font-khmer">លេខវិក្កយបត្រ / NO:</span>
                        <span className="font-bold">
                            {doc.document_number || `DRAFT-${String(doc.provisional_order).padStart(4, '0')}`}
                        </span>
                    </div>
                    {showDateTime && (
                        <div className="flex justify-between">
                            <span className="text-zinc-600 font-khmer">កាលបរិច្ឆេទ / DATE:</span>
                            <span>{doc.business_date} {doc.event_time.slice(0, 5)}</span>
                        </div>
                    )}
                    {showTableRef && doc.reference_identifier && (
                        <div className="flex justify-between">
                            <span className="text-zinc-600 font-khmer">តុ / TABLE:</span>
                            <span className="font-bold">{doc.reference_identifier}</span>
                        </div>
                    )}
                    {showCashier && (
                        <div className="flex justify-between">
                            <span className="text-zinc-600 font-khmer">អ្នកគិតប្រាក់ / CASHIER:</span>
                            <span>{doc.creator.name}</span>
                        </div>
                    )}
                    {showGuestCount && (
                        <div className="flex justify-between">
                            <span className="text-zinc-600 font-khmer">ភ្ញៀវ / GUESTS:</span>
                            <span>{doc.unit_count}</span>
                        </div>
                    )}
                </div>

                {/* Line Items Table */}
                <div className="space-y-1.5 pb-3 border-b border-dashed border-zinc-400">
                    <div className="flex justify-between text-[11px] font-bold text-zinc-700 pb-1 border-b border-zinc-300">
                        <span className="font-khmer">មុខទំនិញ / ITEM</span>
                        <span className="font-khmer">ទឹកប្រាក់ / AMOUNT</span>
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
                    {showSubtotal && (
                        <div className="flex justify-between">
                            <span className="font-khmer">សរុបរង / SUBTOTAL:</span>
                            <span>{business.currency_symbol}{doc.subtotal}</span>
                        </div>
                    )}

                    {showTax && parseFloat(doc.tax_amount) > 0 && (
                        <div className="flex justify-between text-[11px] text-zinc-600">
                            <span className="font-khmer">ពន្ធ / TAX:</span>
                            <span>{business.currency_symbol}{doc.tax_amount}</span>
                        </div>
                    )}

                    {showDiscount && parseFloat(doc.discount_amount) > 0 && (
                        <div className="flex justify-between text-[11px] text-zinc-600">
                            <span className="font-khmer">បញ្ចុះតម្លៃ / DISCOUNT:</span>
                            <span>-{business.currency_symbol}{doc.discount_amount}</span>
                        </div>
                    )}

                    <div className="flex justify-between items-baseline text-[14px] font-bold pt-1.5 border-t border-zinc-300">
                        <span className="font-khmer">សរុប / TOTAL:</span>
                        <div className="text-right">
                            <div>{business.currency_symbol}{doc.grand_total}</div>
                            {showDualCurrency && (
                                <div className="text-[12px] font-normal text-zinc-700 font-khmer">
                                    {Math.round((parseFloat(doc.grand_total) || 0) * exchangeRate).toLocaleString()} ៛
                                </div>
                            )}
                        </div>
                    </div>

                    {showPaymentMethod && (
                        <div className="flex justify-between pt-1 text-[11px] text-zinc-600">
                            <span className="font-khmer">ប្រាក់ទទួល / PAID ({paymentMethodLabel(doc.payment_method)}):</span>
                            <span>{business.currency_symbol}{doc.amount_received}</span>
                        </div>
                    )}

                    {showChange && (
                        <div className="flex justify-between font-bold text-[12px]">
                            <span className="font-khmer">ប្រាក់អាប់ / CHANGE:</span>
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

                {/* KHQR & Wi-Fi if enabled */}
                {showQrPayment && (
                    <div className="text-center p-2 rounded border border-zinc-300 bg-zinc-50 space-y-1">
                        <div className="text-[10px] font-bold text-zinc-800 uppercase flex items-center justify-center gap-1">
                            <QrCode className="w-3.5 h-3.5 text-rose-600" />
                            <span className="font-khmer">{qrPaymentText}</span>
                        </div>
                        {qrCodeImage ? (
                            <div className="w-28 h-28 mx-auto bg-white p-1 border border-zinc-300 rounded flex items-center justify-center">
                                <img
                                    src={qrCodeImage}
                                    alt="Payment KHQR"
                                    className="w-full h-full object-contain"
                                />
                            </div>
                        ) : (
                            <div className="w-20 h-20 mx-auto bg-white p-1 border-2 border-dashed border-zinc-300 rounded flex flex-col items-center justify-center text-zinc-400">
                                <QrCode className="w-6 h-6 text-zinc-400 stroke-1" />
                                <span className="text-[7px] text-zinc-400 mt-0.5">Bakong KHQR</span>
                            </div>
                        )}
                        <div className="text-[8px] text-zinc-500 font-sans">
                            {qrBankName}
                        </div>
                        {(qrAccountName || qrAccountNumber) && (
                            <div className="text-[8px] text-zinc-700 font-mono">
                                {qrAccountName && <span className="font-semibold">{qrAccountName}</span>}
                                {qrAccountName && qrAccountNumber && <span> • </span>}
                                {qrAccountNumber && <span>{qrAccountNumber}</span>}
                            </div>
                        )}
                    </div>
                )}

                {showWifi && (
                    <div className="p-1.5 rounded border border-dashed border-zinc-300 text-[10px] text-center space-y-0.5">
                        <div className="font-bold text-zinc-800 flex items-center justify-center gap-1">
                            <Wifi className="w-3 h-3 text-sky-600" />
                            <span className="font-khmer">វ៉ាយហ្វាយ / FREE WI-FI</span>
                        </div>
                        <div className="text-zinc-600">
                            SSID: <span className="font-bold">{wifiSsid}</span> | <span className="font-khmer">លេខសម្ងាត់ / Pass:</span> <span className="font-mono">{wifiPassword}</span>
                        </div>
                    </div>
                )}

                {/* Footer Notes */}
                <div className="text-center pt-2 space-y-1 text-[11px] text-zinc-600">
                    {policyNote && (
                        <div className="text-[9px] text-zinc-500 font-khmer italic">
                            {policyNote}
                        </div>
                    )}
                    <div><span className="font-khmer">{business.document_footer || 'សូមអរគុណ! Thank you for dining with us!'}</span></div>
                    <div className="text-[9px] text-zinc-500 tracking-wider font-sans font-medium">
                        លៀសហាល អ៉ីទុម POS • LEASHAL ETUM
                    </div>
                </div>
            </div>
        </div>
    );
}
