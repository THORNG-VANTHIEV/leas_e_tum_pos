import React, { useState, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import { AppLayout } from '@/layouts/app-layout';
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
    ArrowRight,
    ShoppingBag,
    Loader2,
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
            return 'kds-card-urgent border-rose-500/80 bg-white dark:bg-rose-950/20 shadow-sm dark:shadow-rose-950/40 ring-1 ring-rose-500/40';
        }
        if (elapsedMinutes >= 10) {
            return 'kds-card-warning border-amber-500/70 bg-white dark:bg-amber-950/20 shadow-sm dark:shadow-amber-950/30 ring-1 ring-amber-500/20';
        }
        return 'kds-card-normal border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 shadow-sm dark:shadow-black/40';
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

    return (
        <AppLayout title="Kitchen Display (KDS)">
            <Head title="Kitchen Display (KDS) — ផ្ទាំងផ្ទះបាយ" />

            <div className="space-y-6 pb-12">
                {/* Fixed / Sticky Header */}
                <div className="kds-topbar sticky top-0 z-30 -mx-4 -mt-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 py-3.5 bg-white/95 dark:bg-zinc-950/90 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800/80 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                                <ChefHat className="w-5 h-5" />
                            </div>
                            <div>
                                <h1 className="kds-topbar-title text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                                    Kitchen Display (KDS)
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 font-semibold">
                                        ផ្ទះបាយផ្ទាល់
                                    </span>
                                </h1>
                                <p className="kds-topbar-sub text-xs text-zinc-500 dark:text-zinc-400">
                                    គ្រប់គ្រងលំដាប់លំហូរចម្អិនម្ហូប និងជូនភ្ញៀវតាមតុក្នុងពេលវេលាពិត
                                </p>
                            </div>
                        </div>

                        {/* Top Utility Controls */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setSoundEnabled(!soundEnabled)}
                                className={`kds-util-btn px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-all ${
                                    soundEnabled
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700 dark:hover:bg-zinc-750'
                                        : 'bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-900/60 dark:text-zinc-400 dark:border-zinc-800'
                                }`}
                                title="សំឡេងប្រាប់ដំណឹង (Sound Alert)"
                            >
                                {soundEnabled ? (
                                    <>
                                        <Volume2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                        <span>សំឡេង បើក</span>
                                    </>
                                ) : (
                                    <>
                                        <VolumeX className="w-4 h-4 text-zinc-400" />
                                        <span>សំឡេង បិទ</span>
                                    </>
                                )}
                            </button>

                            <button
                                onClick={() => router.reload()}
                                className="kds-util-btn px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 dark:border-zinc-700 flex items-center gap-1.5 transition-all"
                            >
                                <RefreshCw className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                <span>ផ្ទុកឡើងវិញ</span>
                            </button>

                            <button
                                onClick={toggleFullscreen}
                                className="kds-util-btn p-2 rounded-lg text-xs font-medium bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300 dark:border-zinc-700 transition-all"
                                title="ពង្រីកពេញអេក្រង់ (Fullscreen)"
                            >
                                <Maximize2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Filter Tabs & Counters Bar */}
                    <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1 scrollbar-none">
                        <button
                            onClick={() => handleFilterChange('active')}
                            className={`kds-filter-tab px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border flex items-center gap-2 ${
                                filter === 'active'
                                    ? 'active bg-amber-500 text-zinc-950 border-amber-500 shadow-sm shadow-amber-500/25'
                                    : 'bg-white hover:bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-800 dark:hover:bg-zinc-850'
                            }`}
                        >
                            <span>កំពុងដំណើរការទាំងអស់</span>
                            <span className={`kds-tab-badge px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                                filter === 'active' ? 'bg-black/20 text-zinc-950' : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                            }`}>
                                {counts.pending + counts.cooking + counts.ready}
                            </span>
                        </button>

                        <button
                            onClick={() => handleFilterChange('pending')}
                            className={`kds-filter-tab px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border flex items-center gap-2 ${
                                filter === 'pending'
                                    ? 'active bg-rose-600 text-white border-rose-500 shadow-sm shadow-rose-600/25'
                                    : 'bg-white hover:bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-800 dark:hover:bg-zinc-850'
                            }`}
                        >
                            <Flame className={`w-3.5 h-3.5 ${filter === 'pending' ? 'text-white' : 'text-rose-500'}`} />
                            <span>រង់ចាំចម្អិន</span>
                            <span className={`kds-tab-badge px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                                filter === 'pending' ? 'bg-white/20 text-white' : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-transparent'
                            }`}>
                                {counts.pending}
                            </span>
                        </button>

                        <button
                            onClick={() => handleFilterChange('cooking')}
                            className={`kds-filter-tab px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border flex items-center gap-2 ${
                                filter === 'cooking'
                                    ? 'active bg-amber-600 text-white border-amber-500 shadow-sm shadow-amber-600/25'
                                    : 'bg-white hover:bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-800 dark:hover:bg-zinc-850'
                            }`}
                        >
                            <UtensilsCrossed className={`w-3.5 h-3.5 ${filter === 'cooking' ? 'text-white' : 'text-amber-500'}`} />
                            <span>កំពុងចម្អិន</span>
                            <span className={`kds-tab-badge px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                                filter === 'cooking' ? 'bg-white/20 text-white' : 'bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-transparent'
                            }`}>
                                {counts.cooking}
                            </span>
                        </button>

                        <button
                            onClick={() => handleFilterChange('ready')}
                            className={`kds-filter-tab px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border flex items-center gap-2 ${
                                filter === 'ready'
                                    ? 'active bg-emerald-600 text-white border-emerald-500 shadow-sm shadow-emerald-600/25'
                                    : 'bg-white hover:bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-800 dark:hover:bg-zinc-850'
                            }`}
                        >
                            <CheckCircle2 className={`w-3.5 h-3.5 ${filter === 'ready' ? 'text-white' : 'text-emerald-500'}`} />
                            <span>ឆ្អិនរួចរាល់ (រង់ចាំលើក)</span>
                            <span className={`kds-tab-badge px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                                filter === 'ready' ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-transparent'
                            }`}>
                                {counts.ready}
                            </span>
                        </button>

                        <button
                            onClick={() => handleFilterChange('served')}
                            className={`kds-filter-tab px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border flex items-center gap-2 ${
                                filter === 'served'
                                    ? 'active bg-blue-600 text-white border-blue-500 shadow-sm shadow-blue-600/25'
                                    : 'bg-white hover:bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-800 dark:hover:bg-zinc-850'
                            }`}
                        >
                            <Coffee className={`w-3.5 h-3.5 ${filter === 'served' ? 'text-white' : 'text-blue-500'}`} />
                            <span>បានលើកជូនថ្ងៃនេះ</span>
                            <span className={`kds-tab-badge px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                                filter === 'served' ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-transparent'
                            }`}>
                                {counts.served_today}
                            </span>
                        </button>
                    </div>
                </div>

                {/* Orders Ticket Grid */}
                {orders.length === 0 ? (
                    <div className="py-24 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/30">
                        <div className="w-16 h-16 rounded-2xl bg-zinc-150 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center mx-auto mb-4 text-zinc-400 dark:text-zinc-500">
                            <ChefHat className="w-8 h-8" />
                        </div>
                        <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-300">គ្មានការកុម្ម៉ង់ក្នុងជួរផ្ទះបាយទេ</h3>
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
                                    className={`flex flex-col justify-between rounded-xl border p-4 transition-all duration-200 shadow-sm ${getUrgencyClass(
                                        order.elapsed_minutes
                                    )}`}
                                >
                                    <div>
                                        {/* Card Header: Two-Row Architecture preventing overlap */}
                                        <div className="kds-card-divider border-b border-zinc-200 dark:border-zinc-800/80 pb-3 mb-3">
                                            {/* Row 1: Table Badge on Left, Timer Badge on Right */}
                                            <div className="flex items-center justify-between gap-2 mb-2">
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                    {isTakeaway ? (
                                                        <span className="kds-table-badge inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black tracking-wide bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 truncate shadow-2xs">
                                                            <ShoppingBag className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                                                            <span className="truncate">{order.reference_identifier}</span>
                                                        </span>
                                                    ) : (
                                                        <span className="kds-table-badge inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black tracking-wide bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 truncate shadow-2xs">
                                                            <UtensilsCrossed className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                                                            <span className="truncate">{order.reference_identifier}</span>
                                                        </span>
                                                    )}
                                                </div>
                                                {getTimerBadge(order.elapsed_minutes)}
                                            </div>

                                            {/* Row 2: Document / Order # Pill & Server/Customer Info */}
                                            <div className="flex items-center justify-between gap-2 text-xs">
                                                <span className="kds-doc-badge font-mono font-bold text-[11px] px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-zinc-800/90 dark:text-zinc-300 dark:border-zinc-700/60 shrink-0">
                                                    #{order.document_number}
                                                </span>
                                                <div className="kds-card-meta text-[11px] text-zinc-500 dark:text-zinc-400 truncate text-right">
                                                    <span>បុគ្គលិក: <strong className="font-semibold text-zinc-800 dark:text-zinc-300">{order.creator_name}</strong></span>
                                                    {order.customer_name && (
                                                        <span className="text-amber-700 dark:text-amber-300 font-semibold truncate ml-1">
                                                            • {order.customer_name}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Special Order Note */}
                                        {order.note && (
                                            <div className="mb-3 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs font-medium">
                                                <span className="font-bold">ចំណាំ: </span>
                                                {order.note}
                                            </div>
                                        )}

                                        {/* Items List */}
                                        <div className="space-y-2 mb-4">
                                            {order.items.map((item) => (
                                                <div
                                                    key={item.id}
                                                    className="flex items-start justify-between gap-3 py-1.5 px-2 rounded-lg hover:bg-zinc-100/70 dark:hover:bg-zinc-800/40 transition-colors"
                                                >
                                                    <div className="flex items-start gap-2.5 min-w-0">
                                                        <span className="kds-qty-badge w-7 h-7 rounded-lg bg-amber-500 text-zinc-950 font-black font-mono text-xs flex items-center justify-center shrink-0 shadow-2xs">
                                                            {item.quantity}
                                                        </span>
                                                        <div className="min-w-0">
                                                            <p className="kds-item-name text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-snug">
                                                                {item.product_name}
                                                            </p>
                                                            {item.product_name_en && (
                                                                <p className="kds-item-sub text-[11px] font-medium text-zinc-500 dark:text-zinc-400 leading-tight">
                                                                    {item.product_name_en}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <span className="kds-unit-badge text-xs font-mono font-medium text-zinc-600 dark:text-zinc-400 px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 shrink-0">
                                                        {item.unit}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="kds-card-divider pt-3 border-t border-zinc-200 dark:border-zinc-800/80 mt-2">
                                        {isPending && (
                                            <button
                                                disabled={updatingId === order.id}
                                                onClick={() => handleUpdateStatus(order.id, 'cooking')}
                                                className="w-full py-2.5 px-3 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 active:scale-[0.99] text-zinc-950 flex items-center justify-center gap-2 transition-all shadow-sm shadow-amber-500/20 border border-amber-400 disabled:opacity-50"
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
                                                className="w-full py-2.5 px-3 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white flex items-center justify-center gap-2 transition-all shadow-sm shadow-emerald-600/20 border border-emerald-500 disabled:opacity-50"
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
                                                className="w-full py-2.5 px-3 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white flex items-center justify-center gap-2 transition-all shadow-sm shadow-blue-600/20 border border-blue-500 disabled:opacity-50"
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
                                            <div className="w-full py-2 px-3 rounded-xl text-xs font-medium bg-zinc-100 text-zinc-600 border border-zinc-200 dark:bg-zinc-800/60 dark:text-zinc-400 dark:border-zinc-700/50 flex items-center justify-center gap-1.5">
                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
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
