import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AppLayout } from '@/layouts/app-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
    ArrowLeft,
    Building2,
    Sparkles,
    FileText,
    Hash,
    ShieldCheck,
    AlertCircle,
    X,
    ChevronRight,
    CalendarDays,
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
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

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

    // Calculate duration in days
    const durationDays = Math.max(
        1,
        Math.round(
            (new Date(createForm.data.end_date).getTime() - new Date(createForm.data.start_date).getTime()) /
                (1000 * 60 * 60 * 24)
        )
    );

    // Preset duration setter
    const setPresetDuration = (days: number) => {
        const start = new Date(createForm.data.start_date || Date.now());
        const end = new Date(start.getTime() + days * 86400000);
        createForm.setData('end_date', end.toISOString().slice(0, 10));
    };

    // Sample sequence preview generator
    const getSampleSequence = (offset: number) => {
        const num = (Number(createForm.data.starting_sequence) || 1) + offset;
        const prefix = createForm.data.document_prefix || 'INV';
        const code = createForm.data.code || 'P01';
        return `${prefix}-${code}-${String(num).padStart(4, '0')}`;
    };

    const selectedLocation = locations.find((l) => l.id === createForm.data.location_id) || locations[0];

    // Scroll lock and Esc key listener
    useEffect(() => {
        if (!mounted || typeof document === 'undefined') return;
        if (showCreateModal) {
            const originalOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.key === 'Escape') {
                    setShowCreateModal(false);
                }
            };
            window.addEventListener('keydown', handleKeyDown);
            return () => {
                document.body.style.overflow = originalOverflow;
                window.removeEventListener('keydown', handleKeyDown);
            };
        }
    }, [showCreateModal, mounted]);

    const activateForm = useForm({});
    const reviewForm = useForm({});

    const handleActivate = (id: number) => {
        activateForm.post(`/settings/periods/${id}/activate`);
    };

    const handleReview = (id: number) => {
        reviewForm.post(`/settings/periods/${id}/review`);
    };

    return (
        <AppLayout title="វគ្គលក់">
            <div className="space-y-6">
                {/* Fixed / Sticky Header */}
                <div className="sticky top-14 md:top-0 z-20 bg-zinc-950/95 backdrop-blur-xl -mt-6 pt-6 pb-4 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 border-b border-zinc-800/80 space-y-4 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2.5">
                                <Calendar className="w-6 h-6 text-emerald-400" />
                                <h1 className="text-2xl font-bold tracking-tight text-white">
                                    វគ្គលក់ & ការបិទបញ្ជី
                                </h1>
                            </div>
                            <p className="text-xs text-zinc-400 mt-1">
                                បើកវគ្គដើម្បីលក់ ដាក់ពិនិត្យ រួចបិទបញ្ជីដើម្បីផ្ដល់លេខវិក្កយបត្រផ្លូវការតាមលំដាប់ ដោយមិនរំលងលេខ។
                            </p>
                        </div>

                        <Button size="sm" onClick={() => setShowCreateModal(true)}>
                            <Plus className="w-4 h-4" />
                            <span>បង្កើតវគ្គថ្មី</span>
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
                                            <div className="text-zinc-500 text-[10px]">សរុប</div>
                                            <div className="font-bold text-white">{p.total_docs}</div>
                                        </div>
                                        <div>
                                            <div className="text-amber-400 text-[10px]">ព្រាង</div>
                                            <div className="font-bold text-amber-300">{p.draft_docs}</div>
                                        </div>
                                        <div>
                                            <div className="text-emerald-400 text-[10px]">មានលេខ</div>
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
                                            <span>បើកសម្រាប់លក់</span>
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
                                                <span>ពិនិត្យ & បិទបញ្ជី</span>
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

                {/* Modal: Create Period (Full-Workspace 2-Column Layout) */}
                {mounted && showCreateModal && createPortal(
                    <div
                        className="fixed inset-y-0 right-0 left-0 md:left-[var(--sidebar-width,16rem)] z-50 flex flex-col bg-zinc-50 dark:bg-zinc-950 overflow-hidden select-none animate-in fade-in duration-150 h-screen"
                        onWheel={(e) => e.stopPropagation()}
                    >
                        {/* Top Header */}
                        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-sm">
                                    <Calendar className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-lg font-bold text-slate-900 dark:text-zinc-100 font-khmer">
                                            បង្កើតវគ្គគណនេយ្យថ្មី
                                        </h2>
                                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                            INV-05 & INV-02
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-zinc-400 font-khmer">
                                        Create Accounting Period & Sequence Stamping — លៀសហាល អ៉ីទុម POS
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => setShowCreateModal(false)}
                                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-950 dark:hover:text-white transition-all cursor-pointer font-khmer shadow-sm"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                <span>ត្រឡប់ក្រោយ</span>
                                <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono hidden sm:inline ml-1">
                                    (Esc)
                                </span>
                            </button>
                        </div>

                        {/* Form Body - 2 Columns */}
                        <form onSubmit={submitCreate} className="flex-1 min-h-0 flex flex-col">
                            <div className="flex-1 min-h-0 overflow-y-auto p-6 md:p-8">
                                <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
                                    {/* Left Column (7 cols) */}
                                    <div className="lg:col-span-7 space-y-6">
                                        {/* Section 1: Period Identity */}
                                        <div className="bg-white dark:bg-zinc-900/90 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
                                            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-zinc-800/80">
                                                <Building2 className="w-4 h-4 text-amber-500" />
                                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-zinc-100 font-khmer">
                                                    ព័ត៌មានទូទៅនៃវគ្គគណនេយ្យ (Period General Information)
                                                </h3>
                                            </div>

                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-300 mb-1.5 font-khmer">
                                                        សាខាអនុវត្ត (Branch Location) *
                                                    </label>
                                                    <select
                                                        value={createForm.data.location_id}
                                                        onChange={(e) => createForm.setData('location_id', Number(e.target.value))}
                                                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500 transition-all font-khmer cursor-pointer"
                                                    >
                                                        {locations.map((l) => (
                                                            <option key={l.id} value={l.id}>
                                                                {l.code} - {l.name_primary}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    {createForm.errors.location_id && (
                                                        <p className="text-[11px] text-rose-500 mt-1">{createForm.errors.location_id}</p>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-300 mb-1.5 font-khmer">
                                                            កូដសម្គាល់វគ្គ (Period Code) *
                                                        </label>
                                                        <input
                                                            type="text"
                                                            required
                                                            placeholder="ឧ. P01 ឬ P02"
                                                            value={createForm.data.code}
                                                            onChange={(e) => createForm.setData('code', e.target.value.toUpperCase().trim())}
                                                            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm font-mono font-bold text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500 transition-all"
                                                        />
                                                        {createForm.errors.code && (
                                                            <p className="text-[11px] text-rose-500 mt-1">{createForm.errors.code}</p>
                                                        )}
                                                    </div>

                                                    <div>
                                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-300 mb-1.5 font-khmer">
                                                            ឈ្មោះវគ្គ / បរិយាយ (Period Name) *
                                                        </label>
                                                        <input
                                                            type="text"
                                                            required
                                                            placeholder="ឧ. វគ្គគណនេយ្យខែតុលា ២០២៦"
                                                            value={createForm.data.name}
                                                            onChange={(e) => createForm.setData('name', e.target.value)}
                                                            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500 transition-all font-khmer"
                                                        />
                                                        {createForm.errors.name && (
                                                            <p className="text-[11px] text-rose-500 mt-1">{createForm.errors.name}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Section 2: Date Range & Duration */}
                                        <div className="bg-white dark:bg-zinc-900/90 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
                                            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800/80">
                                                <div className="flex items-center gap-2">
                                                    <CalendarDays className="w-4 h-4 text-amber-500" />
                                                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-zinc-100 font-khmer">
                                                        កាលបរិច្ឆេទប្រតិបត្តិការ (Operating Date Range) *
                                                    </h3>
                                                </div>
                                                <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                                    {durationDays} ថ្ងៃ (Days)
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-300 mb-1.5 font-khmer">
                                                        ថ្ងៃចាប់ផ្ដើម (Start Date) *
                                                    </label>
                                                    <input
                                                        type="date"
                                                        required
                                                        value={createForm.data.start_date}
                                                        onChange={(e) => createForm.setData('start_date', e.target.value)}
                                                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm font-mono text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500 transition-all"
                                                    />
                                                    {createForm.errors.start_date && (
                                                        <p className="text-[11px] text-rose-500 mt-1">{createForm.errors.start_date}</p>
                                                    )}
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-300 mb-1.5 font-khmer">
                                                        ថ្ងៃបញ្ចប់ (End Date) *
                                                    </label>
                                                    <input
                                                        type="date"
                                                        required
                                                        value={createForm.data.end_date}
                                                        onChange={(e) => createForm.setData('end_date', e.target.value)}
                                                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm font-mono text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500 transition-all"
                                                    />
                                                    {createForm.errors.end_date && (
                                                        <p className="text-[11px] text-rose-500 mt-1">{createForm.errors.end_date}</p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Quick Presets */}
                                            <div>
                                                <span className="block text-[11px] text-slate-500 dark:text-zinc-400 font-khmer mb-2">
                                                    រយៈពេលកំណត់រហ័ស (Quick Duration Presets)៖
                                                </span>
                                                <div className="flex flex-wrap gap-2">
                                                    {[
                                                        { label: '+7 ថ្ងៃ (1 សប្ដាហ៍)', days: 7 },
                                                        { label: '+15 ថ្ងៃ (កន្លះខែ)', days: 15 },
                                                        { label: '+30 ថ្ងៃ (1 ខែ)', days: 30 },
                                                        { label: '+60 ថ្ងៃ (2 ខែ)', days: 60 },
                                                        { label: '+90 ថ្ងៃ (1 ត្រីមាស)', days: 90 },
                                                    ].map((preset) => (
                                                        <button
                                                            key={preset.days}
                                                            type="button"
                                                            onClick={() => setPresetDuration(preset.days)}
                                                            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 hover:bg-amber-500/10 hover:border-amber-500/40 hover:text-amber-600 dark:hover:text-amber-400 text-xs font-semibold text-slate-600 dark:text-zinc-300 transition-all cursor-pointer font-khmer"
                                                        >
                                                            {preset.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Section 3: Sequential Invoicing */}
                                        <div className="bg-white dark:bg-zinc-900/90 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
                                            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-zinc-800/80">
                                                <Hash className="w-4 h-4 text-amber-500" />
                                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-zinc-100 font-khmer">
                                                    ការកំណត់លេខរៀងវិក្កយបត្រ (Sequential Invoicing Setup)
                                                </h3>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-300 mb-1.5 font-khmer">
                                                        បុព្វបទលេខវិក្កយបត្រ (Document Prefix) *
                                                    </label>
                                                    <input
                                                        type="text"
                                                        required
                                                        placeholder="e.g. INV"
                                                        value={createForm.data.document_prefix}
                                                        onChange={(e) => createForm.setData('document_prefix', e.target.value.toUpperCase().trim())}
                                                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm font-mono font-bold text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500 transition-all"
                                                    />
                                                    <div className="flex items-center gap-1.5 mt-2">
                                                        {['INV', 'POS', 'REC', 'BILL'].map((pfx) => (
                                                            <button
                                                                key={pfx}
                                                                type="button"
                                                                onClick={() => createForm.setData('document_prefix', pfx)}
                                                                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                                                                    createForm.data.document_prefix === pfx
                                                                        ? 'bg-amber-500 text-zinc-950 border-amber-500'
                                                                        : 'bg-slate-100 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400'
                                                                }`}
                                                            >
                                                                {pfx}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    {createForm.errors.document_prefix && (
                                                        <p className="text-[11px] text-rose-500 mt-1">{createForm.errors.document_prefix}</p>
                                                    )}
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-300 mb-1.5 font-khmer">
                                                        លេខរៀងចាប់ផ្ដើម (Starting Sequence #) *
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        max={9999}
                                                        required
                                                        value={createForm.data.starting_sequence}
                                                        onChange={(e) => createForm.setData('starting_sequence', Number(e.target.value))}
                                                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm font-mono font-bold text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500 transition-all"
                                                    />
                                                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1.5 font-khmer">
                                                        ជាទូទៅកំណត់ចាប់ផ្ដើមពីលេខ 1 សម្រាប់វគ្គថ្មី
                                                    </p>
                                                    {createForm.errors.starting_sequence && (
                                                        <p className="text-[11px] text-rose-500 mt-1">{createForm.errors.starting_sequence}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Column (5 cols) */}
                                    <div className="lg:col-span-5 space-y-6">
                                        {/* Period Passport Card */}
                                        <div className="bg-white dark:bg-zinc-900/90 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
                                            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800/80">
                                                <div className="flex items-center gap-2">
                                                    <Sparkles className="w-4 h-4 text-amber-500" />
                                                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-zinc-100 font-khmer">
                                                        ទិដ្ឋភាពវគ្គគណនេយ្យ (Period Passport)
                                                    </h3>
                                                </div>
                                                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                                    មើលជាមុន
                                                </span>
                                            </div>

                                            {/* Card Display */}
                                            <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950 via-zinc-900 to-zinc-950 border border-emerald-500/20 shadow-xl text-white relative overflow-hidden">
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                                        <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">
                                                            LEASHAL ETUM POS
                                                        </span>
                                                    </div>
                                                    <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                                        ព្រាង
                                                    </span>
                                                </div>

                                                <div className="space-y-1 mb-5">
                                                    <div className="text-3xl font-black font-mono text-emerald-400 tracking-tight">
                                                        {createForm.data.code || 'P01'}
                                                    </div>
                                                    <h4 className="text-sm font-bold text-white truncate font-khmer">
                                                        {createForm.data.name || 'ឈ្មោះវគ្គគណនេយ្យ'}
                                                    </h4>
                                                    <p className="text-xs text-zinc-400 font-khmer">
                                                        សាខា៖ <strong className="text-zinc-200">{selectedLocation?.name_primary || 'Main Branch'}</strong> ({selectedLocation?.code})
                                                    </p>
                                                </div>

                                                <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80 space-y-2 mb-4">
                                                    <div className="flex items-center justify-between text-[11px] text-zinc-400">
                                                        <span>កាលបរិច្ឆេទដំណើរការ</span>
                                                        <span className="font-mono text-zinc-200">
                                                            {createForm.data.start_date || 'YYYY-MM-DD'} → {createForm.data.end_date || 'YYYY-MM-DD'}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-zinc-800/60">
                                                        <span>រយៈពេលសរុប</span>
                                                        <span className="font-semibold text-emerald-400 font-mono">
                                                            {durationDays} ថ្ងៃប្រតិបត្តិការ
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Live Invoicing Sequence Numbers Simulation */}
                                                <div>
                                                    <span className="block text-[10px] font-mono uppercase text-zinc-400 mb-2">
                                                        ទម្រង់លេខវិក្កយបត្របន្តបន្ទាប់ (Gapless Numbering):
                                                    </span>
                                                    <div className="space-y-1.5 font-mono text-xs">
                                                        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-emerald-300">
                                                            <span className="text-zinc-500 text-[10px]">វិក្កយបត្រទី ១</span>
                                                            <span className="font-bold">{getSampleSequence(0)}</span>
                                                        </div>
                                                        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-emerald-300/80">
                                                            <span className="text-zinc-500 text-[10px]">វិក្កយបត្រទី ២</span>
                                                            <span className="font-bold">{getSampleSequence(1)}</span>
                                                        </div>
                                                        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-emerald-300/60">
                                                            <span className="text-zinc-500 text-[10px]">វិក្កយបត្រទី ៣</span>
                                                            <span className="font-bold">{getSampleSequence(2)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Lifecycle & Invariants */}
                                        <div className="bg-white dark:bg-zinc-900/90 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
                                            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-zinc-800/80">
                                                <Shield className="w-4 h-4 text-amber-500" />
                                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-zinc-100 font-khmer">
                                                    វដ្ដជីវិតវគ្គគណនេយ្យ (Period Lifecycle)
                                                </h3>
                                            </div>

                                            {/* 4 Step Stepper */}
                                            <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] font-mono">
                                                <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold">
                                                    1. DRAFT
                                                    <span className="block text-[9px] font-normal font-khmer mt-0.5">បង្កើតព្រាង</span>
                                                </div>
                                                <div className="p-2 rounded-lg bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400">
                                                    2. ACTIVE
                                                    <span className="block text-[9px] font-normal font-khmer mt-0.5">លក់ & កត់ត្រា</span>
                                                </div>
                                                <div className="p-2 rounded-lg bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400">
                                                    3. REVIEW
                                                    <span className="block text-[9px] font-normal font-khmer mt-0.5">ចាក់សោពិនិត្យ</span>
                                                </div>
                                                <div className="p-2 rounded-lg bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400">
                                                    4. CLOSED
                                                    <span className="block text-[9px] font-normal font-khmer mt-0.5">បិទ & ចុះលេខ</span>
                                                </div>
                                            </div>

                                            <div className="space-y-2 pt-2">
                                                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-300 font-khmer flex items-start gap-2">
                                                    <ShieldCheck className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                                    <span>
                                                        <strong>Invariant INV-05:</strong> វគ្គគណនេយ្យគ្រប់គ្រងការចេញវិក្កយបត្រ Draft និងត្រូវចាក់សោបង្កក មុនពេលប្រព័ន្ធចុះលេខរៀងវិក្កយបត្រផ្លូវការ។
                                                    </span>
                                                </div>
                                                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-700 dark:text-emerald-300 font-khmer flex items-start gap-2">
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                                    <span>
                                                        <strong>Invariant INV-02:</strong> លេខវិក្កយបត្រមិនអាចរំលង (Gapless) និងមិនអាចកែប្រែបានឡើយ ក្រោយពេល Finalize ជោគជ័យ។
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Bottom Action Footer */}
                            <div className="shrink-0 flex items-center justify-between px-6 py-3.5 border-t border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                                <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400 font-khmer">
                                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                    <span>វគ្គគណនេយ្យថ្មីនឹងស្ថិតក្នុងស្ថានភាព Draft រហូតដល់អ្នកគ្រប់គ្រងចុច Activate</span>
                                </div>

                                <div className="flex items-center gap-2.5 ml-auto">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateModal(false)}
                                        className="px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all cursor-pointer font-khmer"
                                    >
                                        បោះបង់
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={createForm.processing}
                                        className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold shadow-md shadow-amber-500/20 hover:shadow-amber-500/30 transition-all cursor-pointer font-khmer disabled:opacity-50"
                                    >
                                        <Calendar className="w-4 h-4" />
                                        <span>{createForm.processing ? 'កំពុងបង្កើត...' : 'រក្សាទុកវគ្គគណនេយ្យ'}</span>
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
