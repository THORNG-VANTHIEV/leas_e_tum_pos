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
    Receipt,
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

    const formatElapsed = (mins: number) => {
        if (mins < 1) return 'ទើបកុម្ម៉ង់';
        if (mins < 60) return `${mins} នាទី`;
        const hours = Math.floor(mins / 60);
        const rem = mins % 60;
        if (hours < 24) {
            return rem > 0 ? `${hours} ម៉ោង ${rem} ន` : `${hours} ម៉ោង`;
        }
        const days = Math.floor(hours / 24);
        return `${days} ថ្ងៃមុន`;
    };

    const getCardStyle = (status: string) => {
        switch (status) {
            case 'cooking':
                return 'bg-zinc-900/90 border-amber-500/60 ring-1 ring-amber-500/20 shadow-xs';
            case 'ready':
                return 'bg-zinc-900/90 border-emerald-500/60 ring-1 ring-emerald-500/20 shadow-xs';
            case 'served':
                return 'bg-zinc-900/60 border-zinc-800/80 opacity-75';
            default: // pending
                return 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700 shadow-xs';
        }
    };

    const getStatusBadge = (status: 'pending' | 'cooking' | 'ready' | 'served') => {
        switch (status) {
            case 'cooking':
                return (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center gap-1 whitespace-nowrap shrink-0">
                        <UtensilsCrossed className="w-3 h-3 text-amber-400 shrink-0" />
                        កំពុងធ្វើ
                    </span>
                );
            case 'ready':
                return (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1 whitespace-nowrap shrink-0">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                        ឆ្អិនរួចរាល់
                    </span>
                );
            case 'served':
                return (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-zinc-800 text-zinc-400 border border-zinc-700 flex items-center gap-1 whitespace-nowrap shrink-0">
                        <Coffee className="w-3 h-3 text-zinc-400 shrink-0" />
                        លើកជូនរួច
                    </span>
                );
            default: // pending
                return (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center gap-1 whitespace-nowrap shrink-0">
                        <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                        រង់ចាំ
                    </span>
                );
        }
    };

    const totalActiveOrders = counts.pending + counts.cooking + counts.ready;

    return (
        <AppLayout title="Kitchen Display (KDS) — ផ្ទាំងផ្ទះបាយ">
            <Head title="Kitchen Display (KDS) — ផ្ទាំងផ្ទះបាយ" />

            <div className="space-y-6 pb-12">
                {/* Fixed / Sticky Header Synchronized with Floor & Tables Style */}
                <div className="sticky top-0 z-30 -mx-4 -mt-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 py-3.5 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                                <ChefHat className="w-5 h-5 stroke-[2.5]" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
                                    Kitchen Display (KDS)
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                                        ផ្ទាំងផ្ទះបាយ
                                    </span>
                                    {totalActiveOrders > 0 && (
                                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                            {totalActiveOrders} Live
                                        </span>
                                    )}
                                </h1>
                                <p className="text-xs text-zinc-400">
                                    គ្រប់គ្រងលំដាប់លំហូរចម្អិនម្ហូប និងជូនភ្ញៀវតាមតុក្នុងពេលវេលាពិត
                                </p>
                            </div>
                        </div>

                        {/* Top Utility Controls */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setSoundEnabled(!soundEnabled)}
                                className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
                                    soundEnabled
                                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                                        : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
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
                            </button>

                            <button
                                onClick={() => router.reload()}
                                className="px-3 py-2 rounded-xl text-xs font-semibold bg-zinc-900 text-zinc-300 border border-zinc-800 hover:bg-zinc-850 flex items-center gap-1.5 transition-all cursor-pointer"
                                title="ផ្ទុកឡើងវិញ (Reload)"
                            >
                                <RefreshCw className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                <span>ផ្ទុកឡើងវិញ</span>
                            </button>

                            <button
                                onClick={toggleFullscreen}
                                className="p-2 rounded-xl text-xs font-semibold bg-zinc-900 text-zinc-300 border border-zinc-800 hover:bg-zinc-850 flex items-center transition-all cursor-pointer"
                                title="ពង្រីកពេញអេក្រង់ (Fullscreen)"
                            >
                                <Maximize2 className="w-4 h-4 text-zinc-300" />
                            </button>
                        </div>
                    </div>

                    {/* KPI Metrics Summary Strip (Exact Floor & Tables Architecture) */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 mt-4">
                        <div
                            onClick={() => handleFilterChange('active')}
                            className={`p-3 rounded-xl border transition-all cursor-pointer ${
                                filter === 'active'
                                    ? 'bg-zinc-900 border-amber-500/60 ring-1 ring-amber-500/20 shadow-xs'
                                    : 'bg-zinc-900/80 border-zinc-800/80 hover:border-zinc-700'
                            }`}
                        >
                            <span className="text-[11px] text-amber-400 flex items-center gap-1.5 font-medium">
                                <ChefHat className="w-3.5 h-3.5 text-amber-400" /> កំពុងដំណើរការ (Active)
                            </span>
                            <p className="text-lg font-bold text-amber-300 mt-1">
                                {totalActiveOrders}{' '}
                                <span className="text-xs text-zinc-500 font-normal">សំបុត្រ</span>
                            </p>
                        </div>

                        <div
                            onClick={() => handleFilterChange('pending')}
                            className={`p-3 rounded-xl border transition-all cursor-pointer ${
                                filter === 'pending'
                                    ? 'bg-zinc-900 border-amber-500/60 ring-1 ring-amber-500/20 shadow-xs'
                                    : 'bg-zinc-900/80 border-zinc-800/80 hover:border-zinc-700'
                            }`}
                        >
                            <span className="text-[11px] text-amber-400 flex items-center gap-1.5 font-medium">
                                <Clock className="w-3.5 h-3.5 text-amber-400" /> រង់ចាំចម្អិន (Pending)
                            </span>
                            <p className="text-lg font-bold text-amber-300 mt-1">
                                {counts.pending}{' '}
                                <span className="text-xs text-zinc-500 font-normal">សំបុត្រ</span>
                            </p>
                        </div>

                        <div
                            onClick={() => handleFilterChange('cooking')}
                            className={`p-3 rounded-xl border transition-all cursor-pointer ${
                                filter === 'cooking'
                                    ? 'bg-zinc-900 border-amber-500/60 ring-1 ring-amber-500/20 shadow-xs'
                                    : 'bg-zinc-900/80 border-zinc-800/80 hover:border-zinc-700'
                            }`}
                        >
                            <span className="text-[11px] text-amber-400 flex items-center gap-1.5 font-medium">
                                <UtensilsCrossed className="w-3.5 h-3.5 text-amber-400" /> កំពុងចម្អិន (Cooking)
                            </span>
                            <p className="text-lg font-bold text-amber-300 mt-1">
                                {counts.cooking}{' '}
                                <span className="text-xs text-zinc-500 font-normal">លើចង្ក្រាន</span>
                            </p>
                        </div>

                        <div
                            onClick={() => handleFilterChange('ready')}
                            className={`p-3 rounded-xl border transition-all cursor-pointer ${
                                filter === 'ready'
                                    ? 'bg-zinc-900 border-emerald-500/60 ring-1 ring-emerald-500/20 shadow-xs'
                                    : 'bg-zinc-900/80 border-zinc-800/80 hover:border-zinc-700'
                            }`}
                        >
                            <span className="text-[11px] text-emerald-400 flex items-center gap-1.5 font-medium">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> ឆ្អិនរួចរាល់ (Ready)
                            </span>
                            <p className="text-lg font-bold text-emerald-300 mt-1">
                                {counts.ready}{' '}
                                <span className="text-xs text-zinc-500 font-normal">រង់ចាំលើក</span>
                            </p>
                        </div>

                        <div
                            onClick={() => handleFilterChange('served')}
                            className={`p-3 rounded-xl border transition-all cursor-pointer col-span-2 sm:col-span-1 ${
                                filter === 'served'
                                    ? 'bg-zinc-900 border-zinc-700 ring-1 ring-zinc-700/50 shadow-xs'
                                    : 'bg-zinc-900/80 border-zinc-800/80 hover:border-zinc-700'
                            }`}
                        >
                            <span className="text-[11px] text-zinc-400 flex items-center gap-1.5 font-medium">
                                <Coffee className="w-3.5 h-3.5 text-zinc-400" /> លើកជូនថ្ងៃនេះ (Served)
                            </span>
                            <p className="text-lg font-bold text-zinc-300 mt-1">
                                {counts.served_today}{' '}
                                <span className="text-xs text-zinc-500 font-normal">សរុប</span>
                            </p>
                        </div>
                    </div>

                    {/* Status Filter Pills (Matching Floor & Tables Zone Pills) */}
                    <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1 scrollbar-none">
                        <button
                            onClick={() => handleFilterChange('active')}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border cursor-pointer ${
                                filter === 'active'
                                    ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-sm font-bold'
                                    : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-850'
                            }`}
                        >
                            គ្រប់ការកុម្ម៉ង់ទាំងអស់ ({totalActiveOrders})
                        </button>
                        <button
                            onClick={() => handleFilterChange('pending')}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border cursor-pointer ${
                                filter === 'pending'
                                    ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-sm font-bold'
                                    : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-850'
                            }`}
                        >
                            រង់ចាំចម្អិន ({counts.pending})
                        </button>
                        <button
                            onClick={() => handleFilterChange('cooking')}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border cursor-pointer ${
                                filter === 'cooking'
                                    ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-sm font-bold'
                                    : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-850'
                            }`}
                        >
                            កំពុងចម្អិន ({counts.cooking})
                        </button>
                        <button
                            onClick={() => handleFilterChange('ready')}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border cursor-pointer ${
                                filter === 'ready'
                                    ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-sm font-bold'
                                    : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-850'
                            }`}
                        >
                            ឆ្អិនរួចរាល់ ({counts.ready})
                        </button>
                        <button
                            onClick={() => handleFilterChange('served')}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border cursor-pointer ${
                                filter === 'served'
                                    ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-sm font-bold'
                                    : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-850'
                            }`}
                        >
                            បានលើកជូនថ្ងៃនេះ ({counts.served_today})
                        </button>
                    </div>
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
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
                                    className={`rounded-2xl border p-4 flex flex-col justify-between transition-all duration-200 shadow-lg ${getCardStyle(
                                        order.kitchen_status
                                    )}`}
                                >
                                    <div>
                                        {/* Top Card Info: Distinct Title row + Badge, No Overlap */}
                                        <div className="flex items-center justify-between gap-2 mb-1.5">
                                            <div className="min-w-0 flex-1">
                                                <h3
                                                    className="text-base font-bold text-zinc-100 font-mono tracking-tight truncate leading-tight"
                                                    title={order.reference_identifier}
                                                >
                                                    {order.reference_identifier}
                                                </h3>
                                            </div>
                                            <div className="shrink-0">
                                                {getStatusBadge(order.kitchen_status)}
                                            </div>
                                        </div>

                                        {/* Row 2: Doc Number & Order Context */}
                                        <div className="flex items-center gap-1.5 text-xs mb-2.5 min-w-0">
                                            <div className="flex items-center gap-1 text-[11px] text-zinc-400 bg-zinc-800/80 px-1.5 py-0.5 rounded border border-zinc-700 font-mono shrink-0">
                                                <Receipt className="w-3 h-3 text-zinc-400" />
                                                <span>#{order.document_number}</span>
                                            </div>
                                            <span className="text-zinc-500 text-xs shrink-0">•</span>
                                            <p className="text-xs font-medium text-amber-400 truncate min-w-0 flex-1">
                                                {order.customer_name ? `ភ្ញៀវ: ${order.customer_name}` : (isTakeaway ? 'ការកុម្ម៉ង់ខ្ចប់' : 'ការកុម្ម៉ង់ក្នុងហាង')}
                                            </p>
                                        </div>

                                        {/* Server & Elapsed Time Row */}
                                        <div className="text-[11px] text-zinc-400 mb-3 flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 shrink-0" />
                                                <span className="truncate">
                                                    អ្នកកត់: <strong className="font-medium text-zinc-300">{order.creator_name || 'បុគ្គលិក'}</strong>
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0 font-medium text-[11px] text-zinc-400">
                                                <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                                                <span>{formatElapsed(order.elapsed_minutes)}</span>
                                            </div>
                                        </div>

                                        {/* Order Note if any */}
                                        {order.note && (
                                            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-3 text-xs text-amber-300 font-medium">
                                                <span className="font-bold">ចំណាំ: </span>
                                                {order.note}
                                            </div>
                                        )}

                                        {/* Items Details Container (Identical to active_order details in Floor card) */}
                                        <div className="p-2.5 rounded-xl bg-zinc-800/50 border border-zinc-800 mb-3 text-xs space-y-1.5">
                                            <div className="flex items-center justify-between text-zinc-300 font-semibold border-b border-zinc-700/60 pb-1.5">
                                                <span className="flex items-center gap-1 text-zinc-200">
                                                    <UtensilsCrossed className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                                    <span>មុខម្ហូបត្រូវធ្វើ</span>
                                                </span>
                                                <span className="font-mono text-[10px] text-zinc-400">
                                                    {order.items.reduce((sum, it) => sum + it.quantity, 0)} ចាន ({order.items.length} មុខ)
                                                </span>
                                            </div>

                                            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5 scrollbar-thin">
                                                {order.items.map((item) => (
                                                    <div
                                                        key={item.id}
                                                        className="flex items-center justify-between gap-2 text-xs py-0.5"
                                                    >
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <span className="w-5 h-5 rounded bg-amber-500/20 text-amber-400 font-bold font-mono text-[11px] flex items-center justify-center shrink-0 border border-amber-500/30">
                                                                {item.quantity}
                                                            </span>
                                                            <div className="min-w-0">
                                                                <p className="font-semibold text-zinc-100 truncate leading-tight">
                                                                    {item.product_name}
                                                                </p>
                                                                {item.product_name_en && (
                                                                    <p className="text-[10px] text-zinc-400 truncate leading-tight">
                                                                        {item.product_name_en}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 font-mono shrink-0">
                                                            {item.unit}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons & Quick Status Switches */}
                                    <div className="space-y-2 pt-2 border-t border-zinc-800/80">
                                        {/* Primary Progress Action Button */}
                                        {isPending && (
                                            <button
                                                disabled={updatingId === order.id}
                                                onClick={() => handleUpdateStatus(order.id, 'cooking')}
                                                className="w-full py-2.5 px-3 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-zinc-950 flex items-center justify-center gap-1.5 transition-all shadow-md shadow-amber-500/20 cursor-pointer"
                                            >
                                                {updatingId === order.id ? (
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-950" />
                                                ) : (
                                                    <UtensilsCrossed className="w-3.5 h-3.5 text-zinc-950" />
                                                )}
                                                <span>ចាប់ផ្ដើមធ្វើ (Start Cooking)</span>
                                            </button>
                                        )}

                                        {isCooking && (
                                            <button
                                                disabled={updatingId === order.id}
                                                onClick={() => handleUpdateStatus(order.id, 'ready')}
                                                className="w-full py-2.5 px-3 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
                                            >
                                                {updatingId === order.id ? (
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-950" />
                                                ) : (
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-zinc-950" />
                                                )}
                                                <span>ឆ្អិនរួចរាល់ (Mark Ready)</span>
                                            </button>
                                        )}

                                        {isReady && (
                                            <button
                                                disabled={updatingId === order.id}
                                                onClick={() => handleUpdateStatus(order.id, 'served')}
                                                className="w-full py-2.5 px-3 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-amber-400 border border-zinc-700 hover:border-amber-500/40 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                                            >
                                                {updatingId === order.id ? (
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                ) : (
                                                    <Coffee className="w-3.5 h-3.5 text-amber-400" />
                                                )}
                                                <span>បានលើកជូន (Mark Served)</span>
                                            </button>
                                        )}

                                        {isServed && (
                                            <div className="w-full py-2 px-3 rounded-xl text-xs font-medium bg-zinc-800/60 text-zinc-400 border border-zinc-700/50 flex items-center justify-center gap-1.5">
                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                                <span>បានលើកជូនរួចរាល់</span>
                                            </div>
                                        )}

                                        {/* Quick Status Toggle pills */}
                                        <div className="flex items-center justify-between gap-1 text-[10px]">
                                            <button
                                                onClick={() => handleUpdateStatus(order.id, 'pending')}
                                                className={`flex-1 py-1 rounded-lg border transition-all text-center cursor-pointer ${
                                                    isPending
                                                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold'
                                                        : 'text-zinc-500 hover:text-zinc-300 border-transparent hover:bg-zinc-800'
                                                }`}
                                            >
                                                រង់ចាំ
                                            </button>
                                            <button
                                                onClick={() => handleUpdateStatus(order.id, 'cooking')}
                                                className={`flex-1 py-1 rounded-lg border transition-all text-center cursor-pointer ${
                                                    isCooking
                                                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold'
                                                        : 'text-zinc-500 hover:text-zinc-300 border-transparent hover:bg-zinc-800'
                                                }`}
                                            >
                                                ចម្អិន
                                            </button>
                                            <button
                                                onClick={() => handleUpdateStatus(order.id, 'ready')}
                                                className={`flex-1 py-1 rounded-lg border transition-all text-center cursor-pointer ${
                                                    isReady
                                                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-semibold'
                                                        : 'text-zinc-500 hover:text-zinc-300 border-transparent hover:bg-zinc-800'
                                                }`}
                                            >
                                                ឆ្អិន
                                            </button>
                                            <button
                                                onClick={() => handleUpdateStatus(order.id, 'served')}
                                                className={`flex-1 py-1 rounded-lg border transition-all text-center cursor-pointer ${
                                                    isServed
                                                        ? 'bg-zinc-800 text-zinc-300 border-zinc-700 font-semibold'
                                                        : 'text-zinc-500 hover:text-zinc-300 border-transparent hover:bg-zinc-800'
                                                }`}
                                            >
                                                លើកជូន
                                            </button>
                                        </div>
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

