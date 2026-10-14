import React, { useState, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import { AppLayout } from '@/layouts/app-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
    ChefHat,
    Clock,
    Flame,
    CheckCircle2,
    UtensilsCrossed,
    RefreshCw,
    Volume2,
    VolumeX,
    Maximize2,
    Check,
    Timer,
    AlertTriangle,
    Coffee,
    ShoppingBag,
    Loader2,
    Scale,
    Sparkles,
} from 'lucide-react';

interface KdsItem {
    id: number;
    product_name: string;
    product_name_en: string;
    quantity: number;
    unit: string;
    kitchen_status: string;
}

interface KdsOrder {
    id: number;
    document_number: string;
    reference_identifier: string;
    kitchen_status: 'pending' | 'cooking' | 'ready' | 'served';
    kitchen_started_at: string | null;
    kitchen_ready_at: string | null;
    kitchen_served_at: string | null;
    created_at: string;
    time_ago: string;
    elapsed_minutes: number;
    unit_count: number;
    note: string | null;
    creator_name: string;
    customer_name: string | null;
    items: KdsItem[];
}

interface KdsProps {
    orders: KdsOrder[];
    counts: {
        pending: number;
        cooking: number;
        ready: number;
        served_today: number;
    };
    currentFilter: string;
}

export default function KdsIndex({ orders, counts, currentFilter }: KdsProps) {
    const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
    const [filter, setFilter] = useState<string>(currentFilter);
    const [updatingId, setUpdatingId] = useState<number | null>(null);

    // Auto-poll KDS every 12 seconds to keep live orders synced
    useEffect(() => {
        const interval = setInterval(() => {
            router.reload({ only: ['orders', 'counts'] });
        }, 12000);
        return () => clearInterval(interval);
    }, []);

    const playNotificationSound = () => {
        if (!soundEnabled) return;
        try {
            const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
            osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.4);
        } catch {
            // AudioContext fallback
        }
    };

    const handleUpdateStatus = (orderId: number, nextStatus: 'cooking' | 'ready' | 'served') => {
        setUpdatingId(orderId);
        playNotificationSound();
        router.post(
            `/kds/orders/${orderId}/status`,
            { status: nextStatus },
            {
                preserveScroll: true,
                onFinish: () => setUpdatingId(null),
            }
        );
    };

    const handleFilterChange = (newFilter: string) => {
        setFilter(newFilter);
        router.get('/kds', { status: newFilter }, { preserveState: true, preserveScroll: true });
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
        } else {
            document.exitFullscreen().catch(() => {});
        }
    };

    const getUrgencyClass = (elapsedMinutes: number) => {
        if (elapsedMinutes >= 20) {
            return 'kds-card-urgent border-rose-500/50 bg-rose-500/5 ring-1 ring-rose-500/30 shadow-lg shadow-rose-950/20';
        }
        if (elapsedMinutes >= 10) {
            return 'kds-card-warning border-amber-500/40 bg-amber-500/5 ring-1 ring-amber-500/20 shadow-md shadow-amber-950/15';
        }
        return 'kds-card-normal border-zinc-800/80 bg-zinc-900/60 hover:border-zinc-700/80 shadow-md shadow-black/20';
    };

    const getTimerBadge = (elapsedMinutes: number) => {
        const mins = Math.max(0, elapsedMinutes);
        if (mins >= 20) {
            return (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40 animate-pulse whitespace-nowrap shrink-0 shadow-2xs">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                    <span>{mins} នាទី (យឺត)</span>
                </div>
            );
        }
        if (mins >= 10) {
            return (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30 whitespace-nowrap shrink-0 shadow-2xs">
                    <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>{mins} នាទី</span>
                </div>
            );
        }
        return (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30 whitespace-nowrap shrink-0 shadow-2xs">
                <Timer className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{mins} នាទី</span>
            </div>
        );
    };

    const totalActiveOrders = counts.pending + counts.cooking + counts.ready;

    return (
        <AppLayout title="Kitchen Display (KDS) — ផ្ទាំងផ្ទះបាយ">
            <Head title="Kitchen Display (KDS) — ផ្ទាំងផ្ទះបាយ" />

            <div className="space-y-6 pb-16">
                {/* Fixed / Sticky Header Synchronized with Catalog & Dashboard */}
                <div className="sticky top-14 md:top-0 z-20 bg-zinc-950/95 backdrop-blur-xl -mt-6 pt-6 pb-4 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 border-b border-zinc-800/80 space-y-4 shadow-xs">
                    {/* Header Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
                                    <span className="p-2.5 bg-gradient-to-tr from-amber-600 to-amber-500 rounded-2xl text-zinc-950 shadow-md shadow-amber-500/20 shrink-0">
                                        <ChefHat className="w-5 h-5 stroke-[2.5]" />
                                    </span>
                                    <span>Kitchen Display (KDS)</span>
                                </h1>
                                <Badge variant="amber" className="text-xs">
                                    ផ្ទាំងផ្ទះបាយ
                                </Badge>
                                {totalActiveOrders > 0 && (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                        {totalActiveOrders} Live
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-zinc-400 mt-1">
                                គ្រប់គ្រងលំដាប់លំហូរចម្អិនម្ហូប និងជូនភ្ញៀវតាមតុក្នុងពេលវេលាពិត • Real-Time Kitchen Workflow & Dispatch
                            </p>
                        </div>

                        {/* Top Utility Controls */}
                        <div className="flex items-center gap-2">
                            <Button
                                variant={soundEnabled ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setSoundEnabled(!soundEnabled)}
                                className={`gap-1.5 cursor-pointer text-xs rounded-xl ${
                                    soundEnabled
                                        ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20'
                                        : 'text-zinc-400'
                                }`}
                                title="សំឡេងប្រាប់ដំណឹង (Sound Alert)"
                            >
                                {soundEnabled ? (
                                    <>
                                        <Volume2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                        <span>សំឡេង បើក</span>
                                    </>
                                ) : (
                                    <>
                                        <VolumeX className="w-4 h-4 text-zinc-400 shrink-0" />
                                        <span>សំឡេង បិទ</span>
                                    </>
                                )}
                            </Button>

                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => router.reload()}
                                className="gap-1.5 cursor-pointer text-xs rounded-xl"
                                title="ផ្ទុកឡើងវិញ (Reload)"
                            >
                                <RefreshCw className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                <span>ផ្ទុកឡើងវិញ</span>
                            </Button>

                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={toggleFullscreen}
                                className="p-2 cursor-pointer rounded-xl"
                                title="ពង្រីកពេញអេក្រង់ (Fullscreen)"
                            >
                                <Maximize2 className="w-4 h-4 text-zinc-300" />
                            </Button>
                        </div>
                    </div>

                    {/* Unified Filter Tabs Switcher */}
                    <div className="flex items-center gap-1.5 p-1 bg-zinc-900 border border-zinc-800 rounded-2xl w-fit overflow-x-auto max-w-full scrollbar-none shadow-xs">
                        <button
                            type="button"
                            onClick={() => handleFilterChange('active')}
                            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                                filter === 'active'
                                    ? 'bg-amber-500 text-zinc-950 font-bold shadow-md shadow-amber-500/20'
                                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                            }`}
                        >
                            <Sparkles className="w-3.5 h-3.5 shrink-0" />
                            <span>កំពុងដំណើរការទាំងអស់</span>
                            <span
                                className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
                                    filter === 'active'
                                        ? 'bg-zinc-950/20 text-zinc-950'
                                        : 'bg-zinc-800 text-zinc-300 border border-zinc-700/60'
                                }`}
                            >
                                {totalActiveOrders}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => handleFilterChange('pending')}
                            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                                filter === 'pending'
                                    ? 'bg-rose-600 text-white font-bold shadow-md shadow-rose-600/20'
                                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                            }`}
                        >
                            <Flame className={`w-3.5 h-3.5 shrink-0 ${filter === 'pending' ? 'text-white' : 'text-rose-400'}`} />
                            <span>រង់ចាំចម្អិន</span>
                            <span
                                className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
                                    filter === 'pending'
                                        ? 'bg-white/20 text-white'
                                        : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                                }`}
                            >
                                {counts.pending}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => handleFilterChange('cooking')}
                            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                                filter === 'cooking'
                                    ? 'bg-amber-600 text-white font-bold shadow-md shadow-amber-600/20'
                                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                            }`}
                        >
                            <UtensilsCrossed className={`w-3.5 h-3.5 shrink-0 ${filter === 'cooking' ? 'text-white' : 'text-amber-400'}`} />
                            <span>កំពុងចម្អិន</span>
                            <span
                                className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
                                    filter === 'cooking'
                                        ? 'bg-white/20 text-white'
                                        : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                }`}
                            >
                                {counts.cooking}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => handleFilterChange('ready')}
                            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                                filter === 'ready'
                                    ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/20'
                                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                            }`}
                        >
                            <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${filter === 'ready' ? 'text-white' : 'text-emerald-400'}`} />
                            <span>ឆ្អិនរួចរាល់ (រង់ចាំលើក)</span>
                            <span
                                className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
                                    filter === 'ready'
                                        ? 'bg-white/20 text-white'
                                        : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                }`}
                            >
                                {counts.ready}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => handleFilterChange('served')}
                            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                                filter === 'served'
                                    ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/20'
                                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                            }`}
                        >
                            <Coffee className={`w-3.5 h-3.5 shrink-0 ${filter === 'served' ? 'text-white' : 'text-blue-400'}`} />
                            <span>បានលើកជូនថ្ងៃនេះ</span>
                            <span
                                className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
                                    filter === 'served'
                                        ? 'bg-white/20 text-white'
                                        : 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                                }`}
                            >
                                {counts.served_today}
                            </span>
                        </button>
                    </div>
                </div>

                {/* Key Metrics KPI Cards Row - Synchronized with Catalog & Dashboard */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                    <Card
                        onClick={() => handleFilterChange('active')}
                        className={`p-3.5 bg-zinc-900/60 border-zinc-800/80 flex items-center justify-between cursor-pointer hover:border-amber-500/40 transition-all ${
                            filter === 'active' ? 'ring-1 ring-amber-500/40 border-amber-500/40 bg-amber-500/5' : ''
                        }`}
                    >
                        <div>
                            <div className="text-[10.5px] font-mono text-zinc-400 uppercase tracking-wide">កំពុងដំណើរការ</div>
                            <div className="text-xl font-bold text-white mt-0.5">
                                {totalActiveOrders}
                                <span className="text-xs text-amber-400 font-normal ml-1 font-khmer">សំបុត្រ</span>
                            </div>
                        </div>
                        <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                            <ChefHat className="w-4 h-4" />
                        </div>
                    </Card>

                    <Card
                        onClick={() => handleFilterChange('pending')}
                        className={`p-3.5 bg-zinc-900/60 border-zinc-800/80 flex items-center justify-between cursor-pointer hover:border-rose-500/40 transition-all ${
                            filter === 'pending' ? 'ring-1 ring-rose-500/40 border-rose-500/40 bg-rose-500/5' : ''
                        }`}
                    >
                        <div>
                            <div className="text-[10.5px] font-mono text-rose-400 uppercase tracking-wide">រង់ចាំចម្អិន</div>
                            <div className="text-xl font-bold text-white mt-0.5">
                                {counts.pending}
                                <span className="text-xs text-rose-400 font-normal ml-1 font-khmer">បន្ទាន់</span>
                            </div>
                        </div>
                        <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                            <Flame className="w-4 h-4" />
                        </div>
                    </Card>

                    <Card
                        onClick={() => handleFilterChange('cooking')}
                        className={`p-3.5 bg-zinc-900/60 border-zinc-800/80 flex items-center justify-between cursor-pointer hover:border-amber-500/40 transition-all ${
                            filter === 'cooking' ? 'ring-1 ring-amber-500/40 border-amber-500/40 bg-amber-500/5' : ''
                        }`}
                    >
                        <div>
                            <div className="text-[10.5px] font-mono text-amber-400 uppercase tracking-wide">កំពុងចម្អិន</div>
                            <div className="text-xl font-bold text-white mt-0.5">
                                {counts.cooking}
                                <span className="text-xs text-amber-400 font-normal ml-1 font-khmer">លើចង្ក្រាន</span>
                            </div>
                        </div>
                        <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                            <UtensilsCrossed className="w-4 h-4" />
                        </div>
                    </Card>

                    <Card
                        onClick={() => handleFilterChange('ready')}
                        className={`p-3.5 bg-zinc-900/60 border-zinc-800/80 flex items-center justify-between cursor-pointer hover:border-emerald-500/40 transition-all ${
                            filter === 'ready' ? 'ring-1 ring-emerald-500/40 border-emerald-500/40 bg-emerald-500/5' : ''
                        }`}
                    >
                        <div>
                            <div className="text-[10.5px] font-mono text-emerald-400 uppercase tracking-wide">ឆ្អិនរួចរាល់</div>
                            <div className="text-xl font-bold text-white mt-0.5">
                                {counts.ready}
                                <span className="text-xs text-emerald-400 font-normal ml-1 font-khmer">រង់ចាំលើក</span>
                            </div>
                        </div>
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                            <CheckCircle2 className="w-4 h-4" />
                        </div>
                    </Card>

                    <Card
                        onClick={() => handleFilterChange('served')}
                        className={`p-3.5 bg-zinc-900/60 border-zinc-800/80 flex items-center justify-between cursor-pointer hover:border-blue-500/40 transition-all col-span-2 sm:col-span-1 ${
                            filter === 'served' ? 'ring-1 ring-blue-500/40 border-blue-500/40 bg-blue-500/5' : ''
                        }`}
                    >
                        <div>
                            <div className="text-[10.5px] font-mono text-blue-400 uppercase tracking-wide">លើកជូនថ្ងៃនេះ</div>
                            <div className="text-xl font-bold text-white mt-0.5">
                                {counts.served_today}
                                <span className="text-xs text-blue-400 font-normal ml-1 font-khmer">សរុប</span>
                            </div>
                        </div>
                        <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                            <Coffee className="w-4 h-4" />
                        </div>
                    </Card>
                </div>

                {/* Orders Ticket Grid */}
                {orders.length === 0 ? (
                    <div className="py-24 text-center border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/30">
                        <div className="w-16 h-16 rounded-2xl bg-zinc-800/80 border border-zinc-700 flex items-center justify-center mx-auto mb-4 text-zinc-500">
                            <ChefHat className="w-8 h-8" />
                        </div>
                        <h3 className="text-base font-semibold text-zinc-200">គ្មានការកុម្ម៉ង់ក្នុងជួរផ្ទះបាយទេ</h3>
                        <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                            នៅពេលមានការបញ្ជាទិញថ្មីពីបញ្ជរ POS ឬតុភ្ញៀវ សំបុត្រម្ហូបនឹងបង្ហាញនៅទីនេះដោយស្វ័យប្រវត្តិ
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {orders.map((order) => {
                            const isPending = order.kitchen_status === 'pending';
                            const isCooking = order.kitchen_status === 'cooking';
                            const isReady = order.kitchen_status === 'ready';
                            const isServed = order.kitchen_status === 'served';
                            const isTakeaway =
                                order.reference_identifier.toLowerCase().includes('takeaway') ||
                                order.reference_identifier.includes('ខ្ចប់');

                            return (
                                <div
                                    key={order.id}
                                    className={`flex flex-col justify-between rounded-2xl border p-4 transition-all duration-200 ${getUrgencyClass(
                                        order.elapsed_minutes
                                    )}`}
                                >
                                    <div>
                                        {/* Card Header: Two-Row Architecture preventing overlap */}
                                        <div className="kds-card-divider border-b border-zinc-800/80 pb-3 mb-3">
                                            {/* Row 1: Table Badge on Left, Timer Badge on Right */}
                                            <div className="flex items-center justify-between gap-2 mb-2">
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                    {isTakeaway ? (
                                                        <span className="kds-table-badge inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black tracking-wide bg-amber-500/15 text-amber-300 border border-amber-500/30 truncate shadow-2xs">
                                                            <ShoppingBag className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                                            <span className="truncate">{order.reference_identifier}</span>
                                                        </span>
                                                    ) : (
                                                        <span className="kds-table-badge inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black tracking-wide bg-amber-500/15 text-amber-300 border border-amber-500/30 truncate shadow-2xs">
                                                            <UtensilsCrossed className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                                            <span className="truncate">{order.reference_identifier}</span>
                                                        </span>
                                                    )}
                                                </div>
                                                {getTimerBadge(order.elapsed_minutes)}
                                            </div>

                                            {/* Row 2: Document / Order # Pill & Server/Customer Info */}
                                            <div className="flex items-center justify-between gap-2 text-xs">
                                                <span className="kds-doc-badge font-mono font-bold text-[11px] px-2 py-0.5 rounded-md bg-zinc-800/90 text-zinc-300 border border-zinc-700/60 shrink-0">
                                                    #{order.document_number}
                                                </span>
                                                <div className="kds-card-meta text-[11px] text-zinc-400 truncate text-right">
                                                    <span>បុគ្គលិក: <strong className="font-semibold text-zinc-300">{order.creator_name}</strong></span>
                                                    {order.customer_name && (
                                                        <span className="text-amber-300 font-semibold truncate ml-1">
                                                            • {order.customer_name}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Special Order Note */}
                                        {order.note && (
                                            <div className="mb-3 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium">
                                                <span className="font-bold">ចំណាំ: </span>
                                                {order.note}
                                            </div>
                                        )}

                                        {/* Items List */}
                                        <div className="space-y-2 mb-4">
                                            {order.items.map((item) => (
                                                <div
                                                    key={item.id}
                                                    className="flex items-start justify-between gap-2.5 py-1.5 px-2 rounded-xl hover:bg-zinc-800/40 transition-colors"
                                                >
                                                    <div className="flex items-start gap-2.5 min-w-0">
                                                        <span className="kds-qty-badge w-7 h-7 rounded-lg bg-amber-500 text-zinc-950 font-black font-mono text-xs flex items-center justify-center shrink-0 shadow-sm shadow-amber-500/20">
                                                            {item.quantity}
                                                        </span>
                                                        <div className="min-w-0">
                                                            <p className="kds-item-name text-sm font-bold text-zinc-100 leading-snug">
                                                                {item.product_name}
                                                            </p>
                                                            {item.product_name_en && (
                                                                <p className="kds-item-sub text-[11px] font-medium text-zinc-400 leading-tight">
                                                                    {item.product_name_en}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Unit Badge Synchronized with Catalog */}
                                                    <div className="catalog-unit-badge inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium whitespace-nowrap bg-sky-50 text-sky-800 border border-sky-200/90 shadow-2xs dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-500/30 shrink-0">
                                                        <Scale className="w-3 h-3 text-sky-600 dark:text-sky-400 shrink-0" />
                                                        <span className="font-semibold tracking-tight">{item.unit}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="kds-card-divider pt-3 border-t border-zinc-800/80 mt-2">
                                        {isPending && (
                                            <button
                                                disabled={updatingId === order.id}
                                                onClick={() => handleUpdateStatus(order.id, 'cooking')}
                                                className="w-full py-2.5 px-3 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 active:scale-[0.99] text-zinc-950 flex items-center justify-center gap-2 transition-all shadow-md shadow-amber-500/20 border border-amber-400 disabled:opacity-50 cursor-pointer"
                                            >
                                                {updatingId === order.id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
                                                ) : (
                                                    <Flame className="w-4 h-4 text-zinc-950" />
                                                )}
                                                <span>ចាប់ផ្ដើមធ្វើ (Start Cooking)</span>
                                            </button>
                                        )}

                                        {isCooking && (
                                            <button
                                                disabled={updatingId === order.id}
                                                onClick={() => handleUpdateStatus(order.id, 'ready')}
                                                className="w-full py-2.5 px-3 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 active:scale-[0.99] text-white flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20 border border-emerald-500 disabled:opacity-50 cursor-pointer"
                                            >
                                                {updatingId === order.id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                                                ) : (
                                                    <CheckCircle2 className="w-4 h-4 text-white" />
                                                )}
                                                <span>ឆ្អិនរួចរាល់ (Mark Ready)</span>
                                            </button>
                                        )}

                                        {isReady && (
                                            <button
                                                disabled={updatingId === order.id}
                                                onClick={() => handleUpdateStatus(order.id, 'served')}
                                                className="w-full py-2.5 px-3 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 active:scale-[0.99] text-white flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-600/20 border border-blue-500 disabled:opacity-50 cursor-pointer"
                                            >
                                                {updatingId === order.id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                                                ) : (
                                                    <Check className="w-4 h-4 text-white" />
                                                )}
                                                <span>បានលើកជូនភ្ញៀវ (Mark Served)</span>
                                            </button>
                                        )}

                                        {isServed && (
                                            <div className="w-full py-2 px-3 rounded-xl text-xs font-medium bg-zinc-800/60 text-zinc-400 border border-zinc-700/50 flex items-center justify-center gap-1.5">
                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                                <span>បានបញ្ចប់ការលើកម្ហូបជូន</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}

