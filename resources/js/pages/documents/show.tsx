import React, { useState } from 'react';
import { AppLayout } from '@/layouts/app-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link, useForm, usePage } from '@inertiajs/react';
import { PageProps } from '@/types';
import { OrderSourceBadge, isDeliveryPlatform } from '@/components/order-source';
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
    Ban,
    Pencil,
    MoreHorizontal,
    Trash2,
} from 'lucide-react';
import { useExchangeRate } from '@/components/currency';
import { ReprintKitchenTicketButton } from '@/components/reprint-kitchen-ticket-button';
import { DocumentStatusBadge, paymentMethodLabel } from '@/components/document-status';
import { tr } from '@/locales/tr';

interface DocumentShowProps {
    can_edit?: boolean;
    can_delete?: boolean;
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
        kitchen_tickets_count: number;
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

export default function DocumentShow({ document: doc, can_edit = false, can_delete = false }: DocumentShowProps) {
    const exchangeRate = useExchangeRate();
    const { business, auth } = usePage<PageProps>().props;

    // Only admins and supervisors may void a finalized invoice (mirrors route middleware)
    const canVoid = doc.status === 'finalized' && ['admin', 'supervisor'].includes(auth.user?.role ?? '');
    const [showVoidModal, setShowVoidModal] = useState(false);
    const voidForm = useForm({ reason: '' });

    const submitVoid = (e: React.FormEvent) => {
        e.preventDefault();
        voidForm.post(`/invoices/${doc.id}/void`, {
            preserveScroll: true,
            onSuccess: () => {
                setShowVoidModal(false);
                voidForm.reset();
            },
        });
    };

    // Managers may correct a paid invoice in the POS, or move it to the trash, while its period is open
    const [showTrashModal, setShowTrashModal] = useState(false);
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const trashForm = useForm({ reason: '' });

    const submitTrash = (e: React.FormEvent) => {
        e.preventDefault();
        trashForm.delete(`/invoices/${doc.id}`, {
            onSuccess: () => setShowTrashModal(false),
        });
    };

    return (
        <AppLayout title={`${tr('វិក្កយបត្រ')} ${doc.document_number || `${tr('ព្រាង #')}${doc.id}`}`}>
            <div className="max-w-3xl mx-auto space-y-6">
                {/* Fixed / Sticky Actions Toolbar: print first, corrections tucked into the "more" menu */}
                <div className="sticky top-14 md:top-0 z-20 bg-zinc-950/95 backdrop-blur-xl -mt-6 pt-6 pb-4 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 border-b border-zinc-800/80 shadow-xs">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <Link href="/invoices" className="inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-300 hover:text-white font-khmer whitespace-nowrap">
                            <ArrowLeft className="w-4 h-4" />
                            <span>{tr('បញ្ជីវិក្កយបត្រ')}</span>
                        </Link>

                        <div className="flex items-center gap-2">
                            {/* Print */}
                            <div className="inline-flex rounded-xl border border-zinc-700 overflow-hidden">
                                <Link
                                    href={`/invoices/${doc.id}/preview/80mm`}
                                    className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-semibold text-zinc-200 hover:bg-zinc-800 whitespace-nowrap"
                                >
                                    <Printer className="w-4 h-4 text-emerald-400" />
                                    <span>80mm</span>
                                </Link>
                                <Link
                                    href={`/invoices/${doc.id}/preview/a5`}
                                    className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-semibold text-zinc-200 hover:bg-zinc-800 border-l border-zinc-700 whitespace-nowrap"
                                >
                                    <FileText className="w-4 h-4 text-sky-400" />
                                    <span>A5</span>
                                </Link>
                            </div>

                            {can_edit && (
                                <Link
                                    href={`/invoices/create?edit_invoice=${doc.id}`}
                                    className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-sky-500/40 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:bg-sky-500/10 font-khmer whitespace-nowrap"
                                >
                                    <Pencil className="w-4 h-4" />
                                    <span>{tr('កែ')}</span>
                                </Link>
                            )}

                            {/* More actions */}
                            {(doc.kitchen_tickets_count > 0 || canVoid || can_delete) && (
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setShowMoreMenu((open) => !open)}
                                        className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-zinc-700 text-zinc-300 hover:bg-zinc-800 cursor-pointer"
                                        title={tr('សកម្មភាពផ្សេងទៀត')}
                                    >
                                        <MoreHorizontal className="w-4 h-4" />
                                    </button>
                                    {showMoreMenu && (
                                        <>
                                            <div className="fixed inset-0 z-30" onClick={() => setShowMoreMenu(false)} />
                                            <div className="absolute right-0 mt-2 z-40 w-56 p-1.5 rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl">
                                                {doc.kitchen_tickets_count > 0 && <ReprintKitchenTicketButton documentId={doc.id} variant="menu" />}
                                                {canVoid && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setShowMoreMenu(false);
                                                            setShowVoidModal(true);
                                                        }}
                                                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs text-rose-500 hover:bg-rose-500/10 font-khmer cursor-pointer"
                                                    >
                                                        <Ban className="w-3.5 h-3.5" />
                                                        <span>{tr('លុបចោល (Void)')}</span>
                                                    </button>
                                                )}
                                                {can_delete && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setShowMoreMenu(false);
                                                            setShowTrashModal(true);
                                                        }}
                                                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs text-rose-500 hover:bg-rose-500/10 font-khmer cursor-pointer"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                        <span>{tr('ដាក់ធុងសំរាម')}</span>
                                                    </button>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            <Link
                                href="/invoices/create"
                                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold font-khmer whitespace-nowrap shadow-sm"
                            >
                                <Plus className="w-4 h-4" />
                                <span>{tr('កម្មង់ថ្មី')}</span>
                                <kbd className="hidden sm:inline text-[10px] font-mono opacity-80">F2</kbd>
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
                                <img src={business.logo_url} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
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
                                {business.address_primary} {tr('• ទូរស័ព្ទ:')} {business.phone}
                            </div>
                        </div>

                        <div className="text-right space-y-1">
                            <DocumentStatusBadge status={doc.status} />
                            <div className="font-mono text-xs text-zinc-400">
                                {doc.document_number ? (
                                    <span className="text-emerald-400 font-bold text-sm">
                                        {doc.document_number}
                                    </span>
                                ) : (
                                    <span className="font-khmer">{tr('ព្រាង #')}{doc.id} {tr('(ការកម្មង់ #')}{doc.provisional_order})</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Metadata Strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-zinc-100/90 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800 text-xs font-mono">
                        <div>
                            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block font-khmer font-semibold">{tr('វគ្គ')}</span>
                            <span className="text-zinc-900 dark:text-zinc-100 font-bold">{doc.period.code}</span>
                        </div>
                        <div>
                            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block font-khmer font-semibold">{tr('កាលបរិច្ឆេទ & ម៉ោង')}</span>
                            <span className="text-zinc-800 dark:text-zinc-200 font-medium">
                                {doc.business_date} {doc.event_time}
                            </span>
                        </div>
                        <div>
                            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block font-khmer font-semibold">{tr('លេខតុ')}</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold font-sans">
                                {doc.reference_identifier || '—'}
                            </span>
                        </div>
                        <div>
                            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block font-khmer font-semibold">{tr('កម្មង់ពី')}</span>
                            <OrderSourceBadge
                                source={doc.order_source}
                                externalRef={isDeliveryPlatform(doc.order_source) ? doc.external_order_ref : null}
                            />
                        </div>
                        <div>
                            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block font-khmer font-semibold">{tr('អ្នកគិតប្រាក់')}</span>
                            <span className="text-zinc-800 dark:text-zinc-200 font-medium">{doc.creator.username}</span>
                        </div>
                    </div>

                    {/* Immutable Line Items Table */}
                    <div className="space-y-3">
                        <div className="text-xs font-bold text-zinc-400 font-khmer flex items-center justify-between pb-1 border-b border-zinc-800">
                            <span>{tr('មុខទំនិញ')}</span>
                            <span className="text-teal-400">{tr('ភ្ញៀវ')} {doc.unit_count} {tr('នាក់')}</span>
                        </div>

                        <table className="w-full text-left text-xs">
                            <thead className="text-[11px] font-khmer text-zinc-500 border-b border-zinc-800/80">
                                <tr>
                                    <th className="py-2">{tr('មុខទំនិញ')}</th>
                                    <th className="py-2 text-center">{tr('ចំនួន')}</th>
                                    <th className="py-2 text-right">{tr('តម្លៃ')}</th>
                                    <th className="py-2 text-right">{tr('សរុប')}</th>
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
                            <span className="text-[11px] font-khmer text-zinc-500 block">
                                {tr('ផ្ទៀងផ្ទាត់ជាមួយក្រដាសកម្មង់')}
                            </span>
                            <div className="p-3 rounded-lg bg-zinc-100/90 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800 space-y-1">
                                <div className="flex items-center justify-between">
                                    <span className="text-zinc-600 dark:text-zinc-400 font-khmer">{tr('សរុបតាមក្រដាស:')}</span>
                                    <span className="font-mono font-bold text-zinc-900 dark:text-white">
                                        {business.currency_symbol}
                                        {doc.source_total}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5 pt-1 text-[11px]">
                                    {doc.source_total_verified ? (
                                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                                             <CheckCircle2 className="w-3.5 h-3.5" />
                                             <span className="font-khmer">{tr('ត្រូវគ្នា (ខុសគ្នា $0.00)')}</span>
                                        </span>
                                    ) : (
                                        <span className="text-zinc-500 dark:text-zinc-400 font-khmer">{tr('មិនទាន់ផ្ទៀងផ្ទាត់')}</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Financial Calculation Column */}
                        <div className="w-full sm:w-64 space-y-2 text-xs">
                            <div className="flex items-center justify-between text-zinc-400">
                                <span className="font-khmer">{tr('សរុបរង')}</span>
                                <span className="font-mono text-zinc-200">
                                    {business.currency_symbol}
                                    {doc.subtotal}
                                </span>
                            </div>

                            {parseFloat(doc.discount_amount) > 0 && (
                                <div className="flex items-center justify-between text-zinc-400">
                                    <span className="font-khmer">{tr('បញ្ចុះតម្លៃ')}</span>
                                    <span className="font-mono text-rose-400">
                                        -{business.currency_symbol}
                                        {doc.discount_amount}
                                    </span>
                                </div>
                            )}

                            <div className="flex items-center justify-between text-base font-bold text-white pt-2 border-t border-zinc-800">
                                <div>
                                    <span className="font-khmer">{tr('សរុបរួម')}</span>
                                    <div className="text-[11px] font-normal text-zinc-400 font-khmer">
                                        {tr('សរុបជាប្រាក់រៀល')}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="font-mono text-emerald-400 text-lg">
                                        {business.currency_symbol}
                                        {doc.grand_total}
                                    </span>
                                    <div className="text-xs font-mono text-emerald-400/80 font-khmer">
                                        ≈ {Math.round((parseFloat(doc.grand_total) || 0) * exchangeRate).toLocaleString()} {tr('៛')}
                                    </div>
                                </div>
                            </div>

                            <div className="pt-2 border-t border-zinc-800/60 space-y-1.5 text-zinc-400">
                                <div className="flex items-center justify-between">
                                    <span className="font-khmer">{tr('ប្រាក់ទទួល (')}{paymentMethodLabel(doc.payment_method)})</span>
                                    <span className="font-mono text-zinc-200">
                                        {business.currency_symbol}
                                        {doc.amount_received}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between font-semibold text-emerald-400">
                                    <span className="font-khmer">{tr('ប្រាក់អាប់')}</span>
                                    <div className="text-right">
                                        <span className="font-mono">
                                            {business.currency_symbol}
                                            {doc.change_amount}
                                        </span>
                                        {parseFloat(doc.change_amount) > 0 && (
                                            <span className="block text-[10px] font-normal text-zinc-400 font-khmer">
                                                ≈ {Math.round(parseFloat(doc.change_amount) * exchangeRate).toLocaleString()} {tr('៛')}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Receipt Footer */}
                    <div className="text-center pt-4 border-t border-zinc-800/80 text-xs text-zinc-500 space-y-1">
                        <div>{business.document_footer || tr('សូមអរគុណ! Thank you for dining with us!')}</div>
                        <div className="text-[10px] font-mono text-zinc-600">
                            <span className="font-khmer">{tr('ទិន្នន័យវិក្កយបត្រត្រូវបានរក្សាទុក មិនអាចកែប្រែបាន')}</span>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Void Confirmation Modal */}
            {showVoidModal && (
                <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <form
                        onSubmit={submitVoid}
                        className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-6 space-y-4"
                    >
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                                <Ban className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-zinc-900 dark:text-white font-khmer">
                                    {tr('លុបចោលវិក្កយបត្រ')} {doc.document_number}?
                                </h3>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-khmer mt-1 leading-relaxed">
                                    {tr('វិក្កយបត្រនឹងត្រូវបានសម្គាល់ថា VOID ហើយលែងរាប់ក្នុងចំណូល។ លេខវិក្កយបត្ររក្សាទុកដដែល ហើយសកម្មភាពនេះមិនអាចត្រឡប់វិញបានទេ។')}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 font-khmer">
                                {tr('មូលហេតុ')} <span className="text-rose-500">*</span>
                            </label>
                            <textarea
                                value={voidForm.data.reason}
                                onChange={(e) => voidForm.setData('reason', e.target.value)}
                                rows={3}
                                maxLength={255}
                                autoFocus
                                placeholder={tr("ឧ. គិតលុយខុសតុ / ភ្ញៀវបោះបង់ការកម្មង់")}
                                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 font-khmer focus:outline-none focus:border-rose-500"
                            />
                            {voidForm.errors.reason && (
                                <p className="text-xs text-rose-500">{voidForm.errors.reason}</p>
                            )}
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setShowVoidModal(false);
                                    voidForm.reset();
                                    voidForm.clearErrors();
                                }}
                            >
                                <span className="font-khmer">{tr('បោះបង់')}</span>
                            </Button>
                            <Button
                                type="submit"
                                variant="danger"
                                size="sm"
                                disabled={voidForm.processing || voidForm.data.reason.trim().length < 3}
                            >
                                <Ban className="w-4 h-4 mr-1.5" />
                                <span className="font-khmer">{tr('បញ្ជាក់ការលុបចោល')}</span>
                            </Button>
                        </div>
                    </form>
                </div>
            )}

            {/* Move to trash */}
            {showTrashModal && (
                <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <form
                        onSubmit={submitTrash}
                        className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-6 space-y-4"
                    >
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                                <Trash2 className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-zinc-900 dark:text-white font-khmer">
                                    {tr('ដាក់វិក្កយបត្រ')} {doc.document_number} {tr('ក្នុងធុងសំរាម?')}
                                </h3>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-khmer mt-1 leading-relaxed">
                                    {tr('វិក្កយបត្រនឹងបាត់ពីបញ្ជី របាយការណ៍ និងការបិទវេន។ លេខវិក្កយបត្រនៅដដែល ហើយ Admin/Supervisor អាចស្ដារវិញបានពីផ្ទាំង "ធុងសំរាម" ក្នុងបញ្ជីវិក្កយបត្រ។')}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 font-khmer">
                                {tr('មូលហេតុ')} <span className="text-rose-500">*</span>
                            </label>
                            <textarea
                                value={trashForm.data.reason}
                                onChange={(e) => trashForm.setData('reason', e.target.value)}
                                rows={3}
                                maxLength={255}
                                autoFocus
                                placeholder={tr('ឧ. វិក្កយបត្រសាកល្បង / គិតប្រាក់ស្ទួន')}
                                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 font-khmer focus:outline-none focus:border-rose-500"
                            />
                            {trashForm.errors.reason && <p className="text-xs text-rose-500">{trashForm.errors.reason}</p>}
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                            <Button type="button" variant="outline" size="sm" onClick={() => setShowTrashModal(false)}>
                                <span className="font-khmer">{tr('បោះបង់')}</span>
                            </Button>
                            <Button type="submit" variant="danger" size="sm" disabled={trashForm.processing || trashForm.data.reason.trim().length < 3}>
                                <Trash2 className="w-4 h-4 mr-1.5" />
                                <span className="font-khmer">{tr('ដាក់ធុងសំរាម')}</span>
                            </Button>
                        </div>
                    </form>
                </div>
            )}
        </AppLayout>
    );
}
