import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AppLayout } from '@/layouts/app-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link, useForm, usePage } from '@inertiajs/react';
import { PageProps } from '@/types';
import {
    ShieldCheck,
    CheckCircle2,
    AlertTriangle,
    ArrowLeft,
    Lock,
    Sparkles,
    Calendar,
    Hash,
    Layers,
    Users,
    Receipt,
    Check,
    FileCheck2,
    Database,
} from 'lucide-react';
import { tr } from '@/locales/tr';

interface ReviewDocument {
    id: number;
    provisional_order: number;
    business_date: string;
    event_time: string;
    reference_identifier: string | null;
    unit_count: number;
    source_total: string;
    source_total_verified: boolean;
    grand_total: string;
    creator: { id: number; username: string };
    items: { id: number; product_name_primary_snapshot: string; quantity: number }[];
}

interface PeriodReviewProps {
    period: {
        id: number;
        code: string;
        name: string;
        document_prefix: string;
        starting_sequence: number;
        last_sequence_no: number;
        entry_settings_snapshot?: { require_source_total?: boolean } | null;
    };
    documents: ReviewDocument[];
}

export default function PeriodReview({ period, documents }: PeriodReviewProps) {
    const { business } = usePage<PageProps>().props;
    const [confirmModal, setConfirmModal] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [confirmedAcknowledged, setConfirmedAcknowledged] = useState(false);

    const finalizeForm = useForm({});

    useEffect(() => {
        setMounted(true);
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && confirmModal) {
                setConfirmModal(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [confirmModal]);

    useEffect(() => {
        if (confirmModal) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [confirmModal]);

    const handleFinalize = (e: React.FormEvent) => {
        e.preventDefault();
        finalizeForm.post(`/settings/periods/${period.id}/finalize`, {
            onFinish: () => setConfirmModal(false),
        });
    };

    const requireSource = period.entry_settings_snapshot?.require_source_total ?? true;
    const unverifiedDocs = documents.filter((d) => !d.source_total_verified);
    const hasVarianceDiscrepancy = requireSource && unverifiedDocs.length > 0;

    const totalAmount = documents.reduce((sum, d) => sum + (parseFloat(d.grand_total) || 0), 0);
    const totalGuests = documents.reduce((sum, d) => sum + (d.unit_count || 0), 0);
    const firstSeq = period.starting_sequence;
    const lastSeq = period.starting_sequence + Math.max(documents.length - 1, 0);
    const firstDocNumber = documents.length > 0 ? `${period.document_prefix}-${period.code}-${String(firstSeq).padStart(4, '0')}` : '—';
    const lastDocNumber = documents.length > 0 ? `${period.document_prefix}-${period.code}-${String(lastSeq).padStart(4, '0')}` : '—';

    return (
        <AppLayout title={`${tr('ត្រួតពិនិត្យ និងបិទបញ្ជី')} ${period.code}`}>
            <div className="space-y-6">
                {/* Header Toolbar */}
                <div className="pb-3 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link href="/settings/periods">
                            <button
                                type="button"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold font-khmer shadow-xs transition-all cursor-pointer"
                            >
                                <ArrowLeft className="w-4 h-4 text-emerald-500" />
                                <span>{tr('បញ្ជីការិយបរិច្ឆេទ')}</span>
                            </button>
                        </Link>
                        <div>
                            <div className="flex items-center gap-2.5">
                                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white font-khmer">
                                    {tr('ត្រួតពិនិត្យ និងបិទបញ្ជីគណនេយ្យ')}
                                </h1>
                                <Badge variant="amber" className="font-mono text-[10px] uppercase">
                                    {tr('កំពុងពិនិត្យ (ឈប់លក់)')}
                                </Badge>
                            </div>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 font-khmer">
                                {tr('ការិយបរិច្ឆេទ')} <span className="text-zinc-900 dark:text-white font-mono font-bold">{period.code}</span> ({period.name}{tr(') • ឯកសារព្រាងសរុប៖')} {documents.length}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        disabled={hasVarianceDiscrepancy || documents.length === 0}
                        onClick={() => {
                            setConfirmedAcknowledged(false);
                            setConfirmModal(true);
                        }}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold font-khmer shadow-sm hover:shadow-emerald-600/30 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Lock className="w-4 h-4" />
                        <span>{tr('បិទបញ្ជី និងបោះត្រាលេខរៀង (')}{documents.length} {tr('ឯកសារ)')}</span>
                    </button>
                </div>

                {/* Variance Assertion Banner */}
                {hasVarianceDiscrepancy ? (
                    <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-200 text-xs flex items-start gap-3 shadow-xs">
                        <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <div className="font-bold text-sm font-khmer">
                                {tr('មិនអាចបិទបញ្ជីបានទេ៖ មានឯកសារចំនួន')} {unverifiedDocs.length} {tr('មិនទាន់ផ្ទៀងផ្ទាត់សាច់ប្រាក់')}
                            </div>
                            <p className="text-rose-300/90 font-khmer leading-relaxed">
                                {tr('ការិយបរិច្ឆេទនេះតម្រូវឱ្យមានការផ្ទៀងផ្ទាត់ផ្ទៀងផ្ទាត់ចំនួនទឹកប្រាក់ប្រភពដើម (Source-Total Reconciliation) ជាមុនសិន។ រាល់ឯកសារព្រាងទាំងអស់ត្រូវតែមានទិន្នន័យផ្ទៀងផ្ទាត់ត្រឹមត្រូវ មុនពេលប្រព័ន្ធអាចបោះត្រាលេខរៀងវិក្កយបត្រផ្លូវការ។')}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                                <CheckCircle2 className="w-5 h-5" />
                            </div>
                            <div>
                                <span className="font-bold text-sm font-khmer block text-white">
                                    {tr('ឯកសារព្រាងទាំង')} {documents.length} {tr('បានផ្ទៀងផ្ទាត់រួចរាល់ និងត្រៀមបោះត្រាលេខរៀងផ្លូវការ')}
                                </span>
                                <div className="text-[11px] text-emerald-300/80 font-mono mt-0.5">
                                    {tr('គម្រោងលេខរៀង៖')} {firstDocNumber} {tr('ដល់')} {lastDocNumber}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Planned Sequential Order Table */}
                <Card className="p-0 overflow-hidden border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-zinc-100 dark:bg-zinc-950/80 border-b border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono uppercase text-[10px]">
                                <tr>
                                    <th className="px-4 py-3 font-khmer">{tr('គម្រោងលេខផ្លូវការ')}</th>
                                    <th className="px-4 py-3 font-khmer">{tr('លេខព្រាង (Draft)')}</th>
                                    <th className="px-4 py-3 font-khmer">{tr('កាលបរិច្ឆេទ & ម៉ោង')}</th>
                                    <th className="px-4 py-3 font-khmer">{tr('តុ / សម្គាល់')}</th>
                                    <th className="px-4 py-3 font-khmer">{tr('ភ្ញៀវ')}</th>
                                    <th className="px-4 py-3 font-khmer">{tr('សរុបចុងក្រោយ')}</th>
                                    <th className="px-4 py-3 font-khmer">{tr('ការផ្ទៀងផ្ទាត់')}</th>
                                    <th className="px-4 py-3 font-khmer">{tr('អ្នកបញ្ចូល')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60 font-mono text-[11px]">
                                {documents.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="py-12 text-center text-zinc-400 font-khmer">
                                            {tr('មិនមានឯកសារព្រាងនៅក្នុងការិយបរិច្ឆេទនេះទេ')}
                                        </td>
                                    </tr>
                                ) : (
                                    documents.map((doc, idx) => {
                                        const plannedSeq = period.starting_sequence + idx;
                                        const plannedNumber = `${period.document_prefix}-${period.code}-${String(plannedSeq).padStart(4, '0')}`;
                                        return (
                                            <tr key={doc.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors">
                                                <td className="px-4 py-3 font-bold text-emerald-600 dark:text-emerald-400">
                                                    {plannedNumber}
                                                </td>
                                                <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">
                                                    Draft #{doc.id} (Ord: {doc.provisional_order})
                                                </td>
                                                <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                                                    {doc.business_date} {doc.event_time}
                                                </td>
                                                <td className="px-4 py-3 font-bold text-zinc-900 dark:text-white font-sans">
                                                    {doc.reference_identifier || '—'}
                                                </td>
                                                <td className="px-4 py-3 text-teal-600 dark:text-teal-400">
                                                    {doc.unit_count} pax
                                                </td>
                                                <td className="px-4 py-3 font-bold text-zinc-900 dark:text-white">
                                                    {business.currency_symbol}
                                                    {parseFloat(doc.grand_total).toLocaleString()}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {doc.source_total_verified ? (
                                                        <Badge variant="emerald" className="text-[10px]">{tr('ផ្ទៀងផ្ទាត់ $0.00')}</Badge>
                                                    ) : (
                                                        <Badge variant="rose" className="text-[10px]">{tr('មិនទាន់ផ្ទៀងផ្ទាត់')}</Badge>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">
                                                    {doc.creator?.username}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>

                {/* FULL-WORKSPACE FINALIZE PERIOD SUITE */}
                {confirmModal && mounted && createPortal(
                    <div
                        className="fixed inset-y-0 right-0 left-0 md:left-[var(--sidebar-width,16rem)] z-50 flex flex-col bg-zinc-50 dark:bg-zinc-950 overflow-hidden select-none animate-in fade-in duration-150 h-screen"
                        onWheel={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="px-6 py-3.5 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between shrink-0 shadow-xs">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-xs shrink-0">
                                    <Lock className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-base font-bold text-zinc-900 dark:text-white font-khmer">
                                            {tr('បិទបញ្ជីគណនេយ្យ និងបោះត្រាលេខរៀងវិក្កយបត្រ')}
                                        </h3>
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-mono">
                                            Period {period.code}
                                        </span>
                                    </div>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-khmer">
                                        {tr('ប្រតិបត្តិការបិទបញ្ជីអចិន្ត្រៃយ៍ និងចេញលេខកូដវិក្កយបត្រជាប់គ្នាគ្មានចន្លោះ (Gapless Finalization)')}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setConfirmModal(false)}
                                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-950 dark:hover:text-white transition-all cursor-pointer font-khmer text-xs font-semibold shadow-xs group"
                                title={tr("ត្រឡប់ក្រោយ (Esc)")}
                            >
                                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform text-emerald-600 dark:text-emerald-400" />
                                <span>{tr('ត្រឡប់ក្រោយ')}</span>
                            </button>
                        </div>

                        {/* Body - 2 Columns (7 / 5) */}
                        <form onSubmit={handleFinalize} className="flex flex-col flex-1 min-h-0 overflow-y-auto">
                            <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1">
                                {/* LEFT COLUMN: Protocol Assertions & Confirmation (7 cols) */}
                                <div className="lg:col-span-7 space-y-4">
                                    {/* Period Identity Card */}
                                    <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-xs">
                                        <div className="flex items-center gap-2 text-xs font-bold text-zinc-800 dark:text-zinc-200 font-khmer pb-1 border-b border-zinc-100 dark:border-zinc-800">
                                            <Database className="w-4 h-4 text-emerald-500" />
                                            <span>{tr('ព័ត៌មានការិយបរិច្ឆេទគណនេយ្យ / Accounting Period Protocol')}</span>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
                                            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-1">
                                                <span className="text-[10px] text-zinc-400 font-khmer block">{tr('កូដការិយបរិច្ឆេទ')}</span>
                                                <span className="font-bold text-zinc-900 dark:text-white text-sm">{period.code}</span>
                                            </div>
                                            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-1">
                                                <span className="text-[10px] text-zinc-400 font-khmer block">{tr('បុព្វបទលេខវិក្កយបត្រ')}</span>
                                                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">{period.document_prefix}</span>
                                            </div>
                                            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-1">
                                                <span className="text-[10px] text-zinc-400 font-khmer block">{tr('ចំនួនឯកសារព្រាង')}</span>
                                                <span className="font-bold text-zinc-900 dark:text-white text-sm">{documents.length} {tr('ឯកសារ')}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Domain Engine Assertions */}
                                    <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-xs">
                                        <div className="flex items-center gap-2 text-xs font-bold text-zinc-800 dark:text-zinc-200 font-khmer pb-1 border-b border-zinc-100 dark:border-zinc-800">
                                            <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                            <span>{tr('ការធានាសុវត្ថិភាពតាមប្រព័ន្ធ Domain Engine')}</span>
                                        </div>

                                        <div className="space-y-3 text-xs">
                                            <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-start gap-3">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                                <div className="space-y-0.5">
                                                    <span className="font-bold text-zinc-900 dark:text-white font-khmer">
                                                        {tr('បោះត្រាលេខវិក្កយបត្រជាប់គ្នាគ្មានចន្លោះ (Gapless Sequence)')}
                                                    </span>
                                                    <p className="text-zinc-500 dark:text-zinc-400 font-khmer text-[11px] leading-relaxed">
                                                        {tr('ប្រព័ន្ធនឹងបោះត្រាលេខរៀងវិក្កយបត្រផ្លូវការពី')} {firstDocNumber} {tr('រហូតដល់')} {lastDocNumber} {tr('ដោយគ្មានការរំលងលេខណាមួយឡើយ។')}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-start gap-3">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                                <div className="space-y-0.5">
                                                    <span className="font-bold text-zinc-900 dark:text-white font-khmer">
                                                        {tr('ប្រតិបត្តិការចាក់សោទិន្នន័យ MySQL Row-Lock Transaction')}
                                                    </span>
                                                    <p className="text-zinc-500 dark:text-zinc-400 font-khmer text-[11px] leading-relaxed">
                                                        {tr('គ្រប់ឯកសារទាំងអស់ត្រូវគណនាឡើងវិញដោយស្វ័យប្រវត្តិតាមរយៈ Domain Engine ដើម្បីធានាភាពសុក្រឹត 100% នៃទិន្នន័យគណនេយ្យ។')}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-start gap-3">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                                <div className="space-y-0.5">
                                                    <span className="font-bold text-zinc-900 dark:text-white font-khmer">
                                                        {tr('ចាក់សោការកែប្រែជាអចិន្ត្រៃយ៍ (Immutable Record Freezing)')}
                                                    </span>
                                                    <p className="text-zinc-500 dark:text-zinc-400 font-khmer text-[11px] leading-relaxed">
                                                        {tr('ក្រោយការបិទបញ្ជី ការកែប្រែ ឬលុបឯកសារទាំងនេះត្រូវបានហាមឃាត់ដាច់ខាត លុះត្រាតែមានការអនុញ្ញាតពិសេសពីអ្នកគ្រប់គ្រង (Admin Exception Approval)។')}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Acknowledgment Checkbox */}
                                    <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-3">
                                        <label className="flex items-start gap-3 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={confirmedAcknowledged}
                                                onChange={(e) => setConfirmedAcknowledged(e.target.checked)}
                                                className="w-4 h-4 mt-0.5 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500/30"
                                            />
                                            <div className="space-y-0.5">
                                                <span className="text-xs font-bold text-zinc-900 dark:text-white font-khmer">
                                                    {tr('ខ្ញុំបានផ្ទៀងផ្ទាត់ និងយល់ព្រមបិទបញ្ជីជាផ្លូវការ')}
                                                </span>
                                                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-khmer leading-relaxed">
                                                    {tr('ខ្ញុំយល់ថាប្រតិបត្តិការនេះមិនអាចត្រឡប់ក្រោយវិញបានទេ ហើយរាល់ឯកសារព្រាងទាំងអស់នឹងត្រូវចាក់សោជាអចិន្ត្រៃយ៍។')}
                                                </p>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                {/* RIGHT COLUMN: Batch Certificate Passport (5 cols) */}
                                <div className="lg:col-span-5 space-y-4">
                                    <div className="sticky top-4 space-y-4">
                                        {/* Digital Certificate Card */}
                                        <div className="rounded-2xl border p-5 space-y-4 shadow-sm relative overflow-hidden bg-gradient-to-br from-emerald-950/40 via-zinc-900 to-zinc-950 border-emerald-500/30">
                                            {/* Watermark Seal */}
                                            <div className="absolute -right-6 -bottom-6 opacity-10 pointer-events-none">
                                                <FileCheck2 className="w-40 h-40 text-emerald-400" />
                                            </div>

                                            {/* Top Banner */}
                                            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                                                <div className="space-y-0.5">
                                                    <span className="text-[10px] font-mono tracking-widest uppercase text-zinc-400">
                                                        {tr('សង្ខេបការបិទបញ្ជី')}
                                                    </span>
                                                    <h4 className="text-sm font-bold text-white font-mono">
                                                        PERIOD-{period.code}
                                                    </h4>
                                                </div>
                                                <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs">
                                                    {tr('រួចរាល់')}
                                                </span>
                                            </div>

                                            {/* Batch Metrics Grid */}
                                            <div className="space-y-3 text-xs font-mono">
                                                <div className="flex items-center justify-between text-zinc-400 pb-1.5 border-b border-zinc-800/50">
                                                    <span className="font-khmer">{tr('ការិយបរិច្ឆេទ៖')}</span>
                                                    <span className="text-white font-bold">{period.name}</span>
                                                </div>

                                                <div className="flex items-center justify-between text-zinc-400 pb-1.5 border-b border-zinc-800/50">
                                                    <span className="font-khmer">{tr('ជួរលេខវិក្កយបត្រ៖')}</span>
                                                    <span className="text-emerald-400 font-semibold">
                                                        {firstSeq} → {lastSeq}
                                                    </span>
                                                </div>

                                                <div className="flex items-center justify-between text-zinc-400 pb-1.5 border-b border-zinc-800/50">
                                                    <span className="font-khmer">{tr('លេខចាប់ផ្ដើម៖')}</span>
                                                    <span className="text-white font-bold">{firstDocNumber}</span>
                                                </div>

                                                <div className="flex items-center justify-between text-zinc-400 pb-1.5 border-b border-zinc-800/50">
                                                    <span className="font-khmer">{tr('លេខបញ្ចប់៖')}</span>
                                                    <span className="text-white font-bold">{lastDocNumber}</span>
                                                </div>

                                                <div className="flex items-center justify-between text-zinc-400 pb-1.5 border-b border-zinc-800/50">
                                                    <span className="font-khmer">{tr('ចំនួនភ្ញៀវសរុប៖')}</span>
                                                    <span className="text-teal-400 font-bold">{totalGuests} {tr('នាក់')}</span>
                                                </div>

                                                <div className="flex items-center justify-between text-zinc-400 pb-1.5 border-b border-zinc-800/50">
                                                    <span className="font-khmer">{tr('ចំណូលសរុបក្នុងបញ្ជី៖')}</span>
                                                    <span className="text-emerald-400 font-bold text-sm">
                                                        {business.currency_symbol}
                                                        {totalAmount.toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Sample Stamping Preview */}
                                            <div className="rounded-xl bg-zinc-950/70 border border-zinc-800 p-3 space-y-2">
                                                <span className="text-[11px] font-semibold text-zinc-400 font-khmer block">
                                                    {tr('គំរូឯកសារបោះត្រាដំបូង (First 3 Documents)៖')}
                                                </span>
                                                <div className="space-y-1.5 text-[11px] font-mono">
                                                    {documents.slice(0, 3).map((doc, idx) => (
                                                        <div key={doc.id} className="flex items-center justify-between text-zinc-300">
                                                            <span className="text-emerald-400 font-bold">
                                                                {period.document_prefix}-{period.code}-{String(period.starting_sequence + idx).padStart(4, '0')}
                                                            </span>
                                                            <span className="text-zinc-500">Draft #{doc.id}</span>
                                                            <span className="text-white">
                                                                {business.currency_symbol}{parseFloat(doc.grand_total).toLocaleString()}
                                                            </span>
                                                        </div>
                                                    ))}
                                                    {documents.length > 3 && (
                                                        <div className="text-[10px] text-zinc-500 italic pt-1 text-center font-khmer">
                                                            {tr('... និង')} {documents.length - 3} {tr('ឯកសារផ្សេងទៀត')}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Security Certificate Footer */}
                                            <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[10px] font-mono text-zinc-500">
                                                <span>STAMP: ATOMIC-{period.code}-{documents.length}</span>
                                                <span>AUDIT: ACTIVE</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer Bar */}
                            <div className="px-6 py-3.5 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between shrink-0 shadow-sm">
                                <div className="text-xs text-zinc-500 font-khmer hidden sm:flex items-center gap-2">
                                    <kbd className="px-2 py-0.5 text-[10px] font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded border border-zinc-300 dark:border-zinc-700">
                                        Esc
                                    </kbd>
                                    <span>{tr('ដើម្បីត្រឡប់ក្រោយ / បោះបង់')}</span>
                                </div>

                                <div className="flex items-center gap-3 ml-auto">
                                    <button
                                        type="button"
                                        onClick={() => setConfirmModal(false)}
                                        className="px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-xs font-semibold font-khmer transition-all cursor-pointer shadow-xs"
                                    >
                                        {tr('បោះបង់')}
                                    </button>

                                    <button
                                        type="submit"
                                        disabled={finalizeForm.processing || !confirmedAcknowledged}
                                        className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold font-khmer shadow-sm hover:shadow-emerald-600/30 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Lock className="w-4 h-4" />
                                        <span>
                                            {finalizeForm.processing
                                                ? tr('កំពុងបោះត្រាលេខរៀង...')
                                                : tr('បញ្ជាក់ការបិទបញ្ជី និងបោះត្រាលេខរៀង (Confirm & Stamp Sequence)')}
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>,
                    document.body
                )}
            </div>
        </AppLayout>
    );
}
