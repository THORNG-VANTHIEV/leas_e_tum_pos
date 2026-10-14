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
            return 'border-rose-500/80 bg-rose-950/20 shadow-rose-950/40 ring-1 ring-rose-500/40';
        }
        if (elapsedMinutes >= 10) {
            return 'border-amber-500/70 bg-amber-950/20 shadow-amber-950/30';
        }
        return 'border-zinc-800 bg-zinc-900/90 shadow-black/40';
    };

    const getTimerBadge = (elapsedMinutes: number) => {
        const mins = Math.max(0, elapsedMinutes);
        if (mins >= 20) {
            return (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse whitespace-nowrap shrink-0">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span>{mins} នាទី (យឺត)</span>
                </div>
            );
        }
        if (mins >= 10) {
            return (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 whitespace-nowrap shrink-0">
                    <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>{mins} នាទី</span>
                </div>
            );
        }
        return (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 whitespace-nowrap shrink-0">
                <Timer className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{mins} នាទី</span>
            </div>
        );
    };

    return (
        <AppLayout title="Kitchen Display (KDS)">
            <Head title="Kitchen Display (KDS) — ផ្ទាំងផ្ទះបាយ" />

            <div className="space-y-6 pb-12">
                {/* Fixed / Sticky Header */}
                <div className="sticky top-0 z-30 -mx-4 -mt-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 py-3.5 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                                <ChefHat className="w-5 h-5" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
                                    Kitchen Display (KDS)
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                                        ផ្ទះបាយផ្ទាល់
                                    </span>
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
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-all ${
                                    soundEnabled
                                        ? 'bg-zinc-800 text-zinc-200 border-zinc-700 hover:bg-zinc-750'
                                        : 'bg-zinc-900/60 text-zinc-400 border-zinc-800'
                                }`}
                                title="សំឡេងប្រាប់ដំណឹង (Sound Alert)"
                            >
                                {soundEnabled ? (
                                    <>
                                        <Volume2 className="w-4 h-4 text-emerald-400" />
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
                                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 flex items-center gap-1.5 transition-all"
                            >
                                <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                                <span>ផ្ទុកឡើងវិញ</span>
                            </button>

                            <button
                                onClick={toggleFullscreen}
                                className="p-2 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-all"
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
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all border flex items-center gap-2 ${
                                filter === 'active'
                                    ? 'bg-amber-500 text-zinc-950 border-amber-400 font-semibold shadow-sm shadow-amber-500/30'
                                    : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-850'
                            }`}
                        >
                            <span>កំពុងដំណើរការទាំងអស់</span>
                            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20">
                                {counts.pending + counts.cooking + counts.ready}
                            </span>
                        </button>

                        <button
                            onClick={() => handleFilterChange('pending')}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all border flex items-center gap-2 ${
                                filter === 'pending'
                                    ? 'bg-rose-500 text-white border-rose-400 font-semibold shadow-sm'
                                    : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-850'
                            }`}
                        >
                            <Flame className="w-3.5 h-3.5 text-rose-400" />
                            <span>រង់ចាំចម្អិន</span>
                            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500/20 text-rose-300">
                                {counts.pending}
                            </span>
                        </button>

                        <button
                            onClick={() => handleFilterChange('cooking')}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all border flex items-center gap-2 ${
                                filter === 'cooking'
                                    ? 'bg-amber-600 text-white border-amber-500 font-semibold shadow-sm'
                                    : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-850'
                            }`}
                        >
                            <UtensilsCrossed className="w-3.5 h-3.5 text-amber-400" />
                            <span>កំពុងចម្អិន</span>
                            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/20 text-amber-300">
                                {counts.cooking}
                            </span>
                        </button>

                        <button
                            onClick={() => handleFilterChange('ready')}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all border flex items-center gap-2 ${
                                filter === 'ready'
                                    ? 'bg-emerald-600 text-white border-emerald-500 font-semibold shadow-sm'
                                    : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-850'
                            }`}
                        >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>ឆ្អិនរួចរាល់ (រង់ចាំលើក)</span>
                            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300">
                                {counts.ready}
                            </span>
                        </button>

                        <button
                            onClick={() => handleFilterChange('served')}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all border flex items-center gap-2 ${
                                filter === 'served'
                                    ? 'bg-blue-600 text-white border-blue-500 font-semibold shadow-sm'
                                    : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-850'
                            }`}
                        >
                            <Coffee className="w-3.5 h-3.5 text-blue-400" />
                            <span>បានលើកជូនថ្ងៃនេះ</span>
                            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-500/20 text-blue-300">
                                {counts.served_today}
                            </span>
                        </button>
                    </div>
                </div>

                {/* Orders Ticket Grid */}
                {orders.length === 0 ? (
                    <div className="py-24 text-center border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/30">
                        <div className="w-16 h-16 rounded-2xl bg-zinc-800/80 border border-zinc-700 flex items-center justify-center mx-auto mb-4 text-zinc-500">
                            <ChefHat className="w-8 h-8" />
                        </div>
                        <h3 className="text-base font-semibold text-zinc-300">គ្មានការកុម្ម៉ង់ក្នុងជួរផ្ទះបាយទេ</h3>
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

                            return (
                                <div
                                    key={order.id}
                                    className={`flex flex-col justify-between rounded-xl border p-4 transition-all duration-200 shadow-lg ${getUrgencyClass(
                                        order.elapsed_minutes
                                    )}`}
                                >
                                    <div>
                                        {/* Card Header: Table & Timer */}
                                        <div className="flex items-start justify-between gap-2 border-b border-zinc-800/80 pb-3 mb-3">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                                    <span className="text-base font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20 whitespace-nowrap">
                                                        {order.reference_identifier}
                                                    </span>
                                                    <span className="text-xs text-zinc-400 font-mono whitespace-nowrap shrink-0">
                                                        #{order.document_number.slice(-6)}
                                                    </span>
                                                </div>
                                                <div className="text-[11px] text-zinc-400 mt-1 flex items-center gap-2 truncate">
                                                    <span className="whitespace-nowrap">បុគ្គលិក: {order.creator_name}</span>
                                                    {order.customer_name && (
                                                        <span className="text-amber-300 font-medium truncate">
                                                            • {order.customer_name}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {getTimerBadge(order.elapsed_minutes)}
                                        </div>

                                        {/* Special Order Note */}
                                        {order.note && (
                                            <div className="mb-3 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                                                <span className="font-semibold">ចំណាំ: </span>
                                                {order.note}
                                            </div>
                                        )}

                                        {/* Items List */}
                                        <div className="space-y-2 mb-4">
                                            {order.items.map((item) => (
                                                <div
                                                    key={item.id}
                                                    className="flex items-start justify-between gap-3 py-1 px-1.5 rounded-lg hover:bg-zinc-800/40 transition-colors"
                                                >
                                                    <div className="flex items-start gap-2.5">
                                                        <span className="w-6 h-6 rounded-md bg-zinc-800 border border-zinc-700 text-amber-300 font-bold text-xs flex items-center justify-center shrink-0">
                                                            {item.quantity}
                                                        </span>
                                                        <div>
                                                            <p className="text-sm font-semibold text-zinc-100 leading-tight">
                                                                {item.product_name}
                                                            </p>
                                                            {item.product_name_en && (
                                                                <p className="text-[11px] text-zinc-400 leading-tight">
                                                                    {item.product_name_en}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <span className="text-xs text-zinc-400 font-mono shrink-0">
                                                        {item.unit}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="pt-3 border-t border-zinc-800/80 mt-2">
                                        {isPending && (
                                            <button
                                                disabled={updatingId === order.id}
                                                onClick={() => handleUpdateStatus(order.id, 'cooking')}
                                                className="w-full py-2.5 px-3 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-zinc-950 flex items-center justify-center gap-2 transition-all shadow-md shadow-amber-500/20 disabled:opacity-50"
                                            >
                                                <Flame className="w-4 h-4" />
                                                <span>ចាប់ផ្ដើមធ្វើ (Start Cooking)</span>
                                            </button>
                                        )}

                                        {isCooking && (
                                            <button
                                                disabled={updatingId === order.id}
                                                onClick={() => handleUpdateStatus(order.id, 'ready')}
                                                className="w-full py-2.5 px-3 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50"
                                            >
                                                <CheckCircle2 className="w-4 h-4" />
                                                <span>ឆ្អិនរួចរាល់ (Mark Ready)</span>
                                            </button>
                                        )}

                                        {isReady && (
                                            <button
                                                disabled={updatingId === order.id}
                                                onClick={() => handleUpdateStatus(order.id, 'served')}
                                                className="w-full py-2.5 px-3 rounded-lg text-xs font-semibold bg-blue-500 hover:bg-blue-400 text-white flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-500/20 disabled:opacity-50"
                                            >
                                                <Check className="w-4 h-4" />
                                                <span>បានលើកជូនភ្ញៀវ (Mark Served)</span>
                                            </button>
                                        )}

                                        {isServed && (
                                            <div className="w-full py-2 px-3 rounded-lg text-xs font-medium bg-zinc-800/60 text-zinc-400 border border-zinc-700/50 flex items-center justify-center gap-1.5">
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
