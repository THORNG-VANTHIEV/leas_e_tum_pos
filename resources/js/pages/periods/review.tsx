import React, { useState } from 'react';
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
} from 'lucide-react';

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

    const finalizeForm = useForm({});

    const handleFinalize = () => {
        finalizeForm.post(`/settings/periods/${period.id}/finalize`, {
            onFinish: () => setConfirmModal(false),
        });
    };

    const requireSource = period.entry_settings_snapshot?.require_source_total ?? true;
    const unverifiedDocs = documents.filter((d) => !d.source_total_verified);
    const hasVarianceDiscrepancy = requireSource && unverifiedDocs.length > 0;

    return (
        <AppLayout title={`Review Period ${period.code}`}>
            <div className="space-y-6">
                {/* Header Toolbar */}
                <div className="pb-2 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link href="/settings/periods">
                            <Button variant="ghost" size="sm">
                                <ArrowLeft className="w-4 h-4" />
                                <span>Periods</span>
                            </Button>
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-bold tracking-tight text-white">
                                    Period Review & Sequential Finalization
                                </h1>
                                <Badge variant="amber">Review (Entry Frozen)</Badge>
                            </div>
                            <p className="text-xs text-zinc-400 mt-0.5">
                                Period <span className="text-white font-mono font-bold">{period.code}</span> ({period.name}) • Total Drafts: {documents.length}
                            </p>
                        </div>
                    </div>

                    <Button
                        variant="primary"
                        disabled={hasVarianceDiscrepancy || documents.length === 0}
                        onClick={() => setConfirmModal(true)}
                        className="shadow-lg shadow-emerald-500/20"
                    >
                        <Lock className="w-4 h-4" />
                        <span>Atomically Finalize Period ({documents.length} Docs)</span>
                    </Button>
                </div>

                {/* Variance Assertion Banner */}
                {hasVarianceDiscrepancy ? (
                    <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                        <div>
                            <div className="font-bold text-sm">
                                Variance Reconciliation Blocked: {unverifiedDocs.length} Unverified Drafts
                            </div>
                            <p className="mt-1 text-rose-300/90">
                                This period requires verified physical source-total reconciliation. All drafts must have matching source totals before gapless sequence numbers can be assigned.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-200 text-xs flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                            <div>
                                <span className="font-bold text-sm">
                                    All {documents.length} Draft Documents Reconciled & Ready for Gapless Finalization
                                </span>
                                <div className="text-[11px] text-emerald-300/80">
                                    Sequence planned: {period.document_prefix}-{period.code}-
                                    {String(period.starting_sequence).padStart(4, '0')} to{' '}
                                    {period.document_prefix}-{period.code}-
                                    {String(period.starting_sequence + documents.length - 1).padStart(4, '0')}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Planned Sequential Order Table */}
                <Card className="p-0 overflow-hidden border-zinc-800">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-zinc-950/80 border-b border-zinc-800 text-zinc-400 font-mono uppercase text-[10px]">
                                <tr>
                                    <th className="px-4 py-3">Planned Seq #</th>
                                    <th className="px-4 py-3">Draft ID</th>
                                    <th className="px-4 py-3">Date & Time</th>
                                    <th className="px-4 py-3">Table / Ref #</th>
                                    <th className="px-4 py-3">Guests</th>
                                    <th className="px-4 py-3">Grand Total</th>
                                    <th className="px-4 py-3">Reconciliation</th>
                                    <th className="px-4 py-3">Operator</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/60 font-mono text-[11px]">
                                {documents.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="py-10 text-center text-zinc-500 font-sans">
                                            No draft documents in this period.
                                        </td>
                                    </tr>
                                ) : (
                                    documents.map((doc, idx) => {
                                        const plannedSeq = period.starting_sequence + idx;
                                        const plannedNumber = `${period.document_prefix}-${period.code}-${String(plannedSeq).padStart(4, '0')}`;
                                        return (
                                            <tr key={doc.id} className="hover:bg-zinc-900/40">
                                                <td className="px-4 py-3 font-bold text-emerald-400">
                                                    {plannedNumber}
                                                </td>
                                                <td className="px-4 py-3 text-zinc-400">
                                                    Draft #{doc.id} (Ord: {doc.provisional_order})
                                                </td>
                                                <td className="px-4 py-3 text-zinc-300">
                                                    {doc.business_date} {doc.event_time}
                                                </td>
                                                <td className="px-4 py-3 font-bold text-white font-sans">
                                                    {doc.reference_identifier || '—'}
                                                </td>
                                                <td className="px-4 py-3 text-teal-400">
                                                    {doc.unit_count} pax
                                                </td>
                                                <td className="px-4 py-3 font-bold text-white">
                                                    {business.currency_symbol}
                                                    {doc.grand_total}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {doc.source_total_verified ? (
                                                        <Badge variant="emerald">Verified $0.00</Badge>
                                                    ) : (
                                                        <Badge variant="rose">Unverified</Badge>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-zinc-400">
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

                {/* Finalize Confirmation Modal */}
                {confirmModal && (
                    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                        <Card className="w-full max-w-lg p-6 space-y-4 bg-zinc-900 border-zinc-800">
                            <div className="flex items-center gap-2.5 text-emerald-400">
                                <ShieldCheck className="w-6 h-6" />
                                <h3 className="text-base font-bold text-white">
                                    Execute Atomic Finalization for Period {period.code}?
                                </h3>
                            </div>

                            <p className="text-xs text-zinc-300 leading-relaxed">
                                This will execute <code className="text-emerald-400 font-mono">FinalizePeriodDocuments</code> inside an authoritative MySQL row lock transaction:
                            </p>

                            <ul className="text-xs text-zinc-400 space-y-1.5 list-disc pl-5">
                                <li>Recalculates all persisted mathematical totals through the domain engine.</li>
                                <li>Assigns gapless, immutable sequence numbers ({period.document_prefix}-{period.code}-0001 ..).</li>
                                <li>Closes period {period.code} to prevent further additions.</li>
                                <li>Appends immutable audit log events for all finalized documents.</li>
                            </ul>

                            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setConfirmModal(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="button"
                                    variant="primary"
                                    disabled={finalizeForm.processing}
                                    onClick={handleFinalize}
                                >
                                    {finalizeForm.processing ? 'Stamping Numbers...' : 'Confirm & Stamp Sequence'}
                                </Button>
                            </div>
                        </Card>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
