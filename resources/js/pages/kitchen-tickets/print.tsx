import React from 'react';
import { Head } from '@inertiajs/react';
import { Printer } from 'lucide-react';
import { formatOrderSource, isDeliveryPlatform } from '@/components/order-source';
import { useAutoPrint } from '@/components/print-queue';
import { tr } from '@/locales/tr';

interface TicketLine {
    product_id: number;
    name: string;
    name_secondary: string | null;
    unit: string;
    quantity: number;
    type: 'add' | 'cancel';
}

interface KitchenTicketPrintProps {
    ticket: {
        id: number;
        ticket_no: number;
        lines: TicketLine[];
        created_at: string;
        cashier: string | null;
        table: string;
        order_source: string;
        external_order_ref: string | null;
        document_number: string | null;
        note: string | null;
        is_reprint: boolean;
    };
}

export default function KitchenTicketPrint({ ticket }: KitchenTicketPrintProps) {
    useAutoPrint();

    const additions = ticket.lines.filter((line) => line.type === 'add');
    const cancellations = ticket.lines.filter((line) => line.type === 'cancel');
    const isAddOn = ticket.ticket_no > 1;

    return (
        <div className="min-h-screen bg-zinc-100 py-6 px-4">
            <Head title={`Kitchen Ticket #${ticket.ticket_no} - ${ticket.table}`} />

            <style>{`
                @media print {
                    @page { margin: 0; size: 80mm auto; }
                    body { margin: 0; padding: 0; background: #fff !important; }
                    .no-print { display: none !important; }
                    .kitchen-ticket { width: 78mm !important; max-width: 78mm !important; box-shadow: none !important; border: none !important; margin: 0 !important; }
                }
            `}</style>

            <div className="no-print max-w-[340px] mx-auto mb-4 flex justify-end">
                <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold cursor-pointer"
                >
                    <Printer className="w-4 h-4" />
                    <span className="font-khmer">{tr('ព្រីនបុងចុងភៅ')}</span>
                </button>
            </div>

            <div className="kitchen-ticket max-w-[340px] mx-auto bg-white text-black p-4 shadow-xl font-sans space-y-3">
                {/* Header */}
                <div className="text-center border-b-2 border-black pb-2 space-y-1">
                    <div className="text-[13px] font-bold uppercase tracking-wide">
                        <span className="font-khmer">បុងចុងភៅ</span> · KITCHEN #{ticket.ticket_no}
                    </div>
                    {ticket.is_reprint && (
                        <div className="border-2 border-black bg-black text-white px-2 py-0.5 text-[13px] font-black font-khmer">
                            *** ព្រីនឡើងវិញ / REPRINT ***
                        </div>
                    )}
                    {isAddOn && (
                        <div className="inline-block border-2 border-black px-2 text-[13px] font-black font-khmer">
                            កម្មង់បន្ថែម (ADD-ON)
                        </div>
                    )}
                    <div className="text-[26px] font-black leading-tight font-khmer">{ticket.table}</div>
                    {isDeliveryPlatform(ticket.order_source) && (
                        <div className="text-[15px] font-black uppercase">
                            {formatOrderSource(ticket.order_source)}
                            {ticket.external_order_ref && ` #${ticket.external_order_ref}`}
                        </div>
                    )}
                    <div className="text-[11px] font-mono">
                        {ticket.created_at}
                        {ticket.cashier && ` · ${ticket.cashier}`}
                        {ticket.document_number && ` · ${ticket.document_number}`}
                    </div>
                </div>

                {/* Dishes to cook */}
                {additions.length > 0 && (
                    <div className="space-y-2">
                        {additions.map((line) => (
                            <div key={`add-${line.product_id}`} className="flex items-start gap-2">
                                <span className="text-[22px] font-black font-mono leading-none min-w-[2.5rem]">
                                    {line.quantity}×
                                </span>
                                <div className="min-w-0">
                                    <div className="text-[18px] font-bold leading-snug font-khmer">{line.name}</div>
                                    <div className="text-[11px] text-zinc-700">
                                        {line.name_secondary && `${line.name_secondary} · `}
                                        {line.unit}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Cancelled dishes */}
                {cancellations.length > 0 && (
                    <div className="border-t-2 border-dashed border-black pt-2 space-y-1.5">
                        <div className="text-[14px] font-black font-khmer">✕ បោះបង់ (CANCEL)</div>
                        {cancellations.map((line) => (
                            <div key={`cancel-${line.product_id}`} className="flex items-start gap-2 line-through">
                                <span className="text-[18px] font-black font-mono leading-none min-w-[2.5rem]">
                                    {line.quantity}×
                                </span>
                                <span className="text-[16px] font-bold font-khmer">{line.name}</span>
                            </div>
                        ))}
                    </div>
                )}

                {ticket.note && (
                    <div className="border-t-2 border-dashed border-black pt-2 text-[14px] font-bold font-khmer">
                        សម្គាល់៖ {ticket.note}
                    </div>
                )}

                <div className="border-t border-black pt-1 text-center text-[10px] font-mono">
                    {additions.reduce((sum, line) => sum + line.quantity, 0)} item(s) to cook
                </div>
            </div>
        </div>
    );
}
