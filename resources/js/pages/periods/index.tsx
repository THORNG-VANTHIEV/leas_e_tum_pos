import React, { useState } from 'react';
import { AppLayout } from '@/layouts/app-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Link, useForm } from '@inertiajs/react';
import {
    Calendar,
    Plus,
    CheckCircle2,
    Lock,
    ArrowUpRight,
    Shield,
    Clock,
} from 'lucide-react';

interface PeriodRecord {
    id: number;
    code: string;
    name: string;
    start_date: string;
    end_date: string;
    document_prefix: string;
    starting_sequence: number;
    last_sequence_no: number;
    status: 'draft' | 'active' | 'review' | 'closed';
    location: { id: number; code: string; name_primary: string };
    creator: { id: number; username: string };
    total_docs: number;
    draft_docs: number;
    finalized_docs: number;
}

interface PeriodsPageProps {
    periods: PeriodRecord[];
    locations: { id: number; code: string; name_primary: string }[];
}

export default function PeriodsIndex({ periods, locations }: PeriodsPageProps) {
    const [showCreateModal, setShowCreateModal] = useState(false);

    const createForm = useForm({
        location_id: locations[0]?.id || 1,
        code: `P${String(periods.length + 1).padStart(2, '0')}`,
        name: `Accounting Period ${periods.length + 1}`,
        start_date: new Date().toISOString().slice(0, 10),
        end_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
        document_prefix: 'INV',
        starting_sequence: 1,
    });

    const submitCreate = (e: React.FormEvent) => {
        e.preventDefault();
        createForm.post('/settings/periods', {
            onSuccess: () => setShowCreateModal(false),
        });
    };

    const activateForm = useForm({});
    const reviewForm = useForm({});

    const handleActivate = (id: number) => {
        activateForm.post(`/settings/periods/${id}/activate`);
    };

    const handleReview = (id: number) => {
        reviewForm.post(`/settings/periods/${id}/review`);
    };

    return (
        <AppLayout title="Accounting Periods Lifecycle">
            <div className="space-y-6">
                {/* Fixed / Sticky Header */}
                <div className="sticky top-14 md:top-0 z-20 bg-zinc-950/95 backdrop-blur-xl -mt-6 pt-6 pb-4 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 border-b border-zinc-800/80 space-y-4 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2.5">
                                <Calendar className="w-6 h-6 text-emerald-400" />
                                <h1 className="text-2xl font-bold tracking-tight text-white">
                                    Batch Accounting Periods
                                </h1>
                            </div>
                            <p className="text-xs text-zinc-400 mt-1">
                                Invariant INV-05: Accounting periods control draft entry and freeze before gapless sequence allocation.
                            </p>
                        </div>

                        <Button size="sm" onClick={() => setShowCreateModal(true)}>
                            <Plus className="w-4 h-4" />
                            <span>Create Draft Period</span>
                        </Button>
                    </div>
                </div>

                {/* Periods Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {periods.map((p) => {
                        return (
                            <Card key={p.id} className="p-5 space-y-4 flex flex-col justify-between">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-sm font-bold text-white bg-zinc-800 px-2.5 py-1 rounded border border-zinc-700">
                                                {p.code}
                                            </span>
                                            <span className="text-xs text-zinc-400 font-mono">
                                                {p.location?.code}
                                            </span>
                                        </div>

                                        <Badge
                                            variant={
                                                p.status === 'active'
                                                    ? 'emerald'
                                                    : p.status === 'review'
                                                    ? 'amber'
                                                    : p.status === 'closed'
                                                    ? 'zinc'
                                                    : 'sky'
                                            }
                                        >
                                            {p.status}
                                        </Badge>
                                    </div>

                                    <div>
                                        <h3 className="text-sm font-bold text-zinc-100">{p.name}</h3>
                                        <p className="text-xs text-zinc-400 font-mono mt-0.5">
                                            {p.start_date} → {p.end_date}
                                        </p>
                                    </div>

                                    {/* Counters */}
                                    <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-zinc-950/70 border border-zinc-800/80 font-mono text-[11px] text-center">
                                        <div>
                                            <div className="text-zinc-500 text-[10px]">TOTAL</div>
                                            <div className="font-bold text-white">{p.total_docs}</div>
                                        </div>
                                        <div>
                                            <div className="text-amber-400 text-[10px]">DRAFTS</div>
                                            <div className="font-bold text-amber-300">{p.draft_docs}</div>
                                        </div>
                                        <div>
                                            <div className="text-emerald-400 text-[10px]">STAMPED</div>
                                            <div className="font-bold text-emerald-300">
                                                #{p.last_sequence_no}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                                    {p.status === 'draft' && (
                                        <Button
                                            size="sm"
                                            variant="primary"
                                            className="w-full"
                                            onClick={() => handleActivate(p.id)}
                                        >
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            <span>Activate for Entry</span>
                                        </Button>
                                    )}

                                    {p.status === 'active' && (
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            className="w-full text-amber-400"
                                            onClick={() => handleReview(p.id)}
                                        >
                                            <Lock className="w-3.5 h-3.5" />
                                            <span>Lock & Review ({p.draft_docs} drafts)</span>
                                        </Button>
                                    )}

                                    {p.status === 'review' && (
                                        <Link href={`/periods/${p.id}/review`} className="w-full">
                                            <Button size="sm" variant="primary" className="w-full">
                                                <span>Review & Finalize</span>
                                                <ArrowUpRight className="w-3.5 h-3.5" />
                                            </Button>
                                        </Link>
                                    )}

                                    {p.status === 'closed' && (
                                        <div className="text-xs text-zinc-500 font-mono py-1 w-full text-center">
                                            Closed • Numbers #{p.starting_sequence} to #{p.last_sequence_no}
                                        </div>
                                    )}
                                </div>
                            </Card>
                        );
                    })}
                </div>

                {/* Modal: Create Period */}
                {showCreateModal && (
                    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                        <Card className="w-full max-w-md p-6 space-y-4 bg-zinc-900 border-zinc-800">
                            <h3 className="text-base font-bold text-white">Create New Accounting Period</h3>
                            <form onSubmit={submitCreate} className="space-y-3 text-xs">
                                <div className="space-y-1">
                                    <label className="text-zinc-400">Branch Location</label>
                                    <select
                                        value={createForm.data.location_id}
                                        onChange={(e) =>
                                            createForm.setData('location_id', Number(e.target.value))
                                        }
                                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white"
                                    >
                                        {locations.map((l) => (
                                            <option key={l.id} value={l.id}>
                                                {l.code} - {l.name_primary}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <Input
                                    id="period_code"
                                    label="Period Code (e.g. P02)"
                                    value={createForm.data.code}
                                    onChange={(e) => createForm.setData('code', e.target.value)}
                                    error={createForm.errors.code}
                                    required
                                />

                                <Input
                                    id="period_name"
                                    label="Period Name / Description"
                                    value={createForm.data.name}
                                    onChange={(e) => createForm.setData('name', e.target.value)}
                                    error={createForm.errors.name}
                                    required
                                />

                                <div className="grid grid-cols-2 gap-3">
                                    <Input
                                        id="start_date"
                                        label="Start Date"
                                        type="date"
                                        value={createForm.data.start_date}
                                        onChange={(e) =>
                                            createForm.setData('start_date', e.target.value)
                                        }
                                        required
                                    />
                                    <Input
                                        id="end_date"
                                        label="End Date"
                                        type="date"
                                        value={createForm.data.end_date}
                                        onChange={(e) =>
                                            createForm.setData('end_date', e.target.value)
                                        }
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <Input
                                        id="doc_prefix"
                                        label="Document Prefix"
                                        value={createForm.data.document_prefix}
                                        onChange={(e) =>
                                            createForm.setData('document_prefix', e.target.value)
                                        }
                                    />
                                    <Input
                                        id="start_seq"
                                        label="Starting Sequence #"
                                        type="number"
                                        value={createForm.data.starting_sequence}
                                        onChange={(e) =>
                                            createForm.setData(
                                                'starting_sequence',
                                                Number(e.target.value)
                                            )
                                        }
                                    />
                                </div>

                                <div className="flex justify-end gap-2 pt-2">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => setShowCreateModal(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={createForm.processing}>
                                        Save Draft Period
                                    </Button>
                                </div>
                            </form>
                        </Card>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
