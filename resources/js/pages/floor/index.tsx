import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Head, Link, router } from '@inertiajs/react';
import { AppLayout } from '@/layouts/app-layout';
import { Card } from '@/components/ui/card';
import {
    LayoutGrid,
    PlusCircle,
    Users,
    Clock,
    Circle,
    Square,
    RectangleHorizontal,
    ShoppingBag,
    CheckCircle2,
    CalendarCheck,
    X,
    Armchair,
    Receipt,
    Hash,
    Utensils,
    MapPin,
    Minus,
    Plus,
    Eye,
} from 'lucide-react';

interface ActiveOrder {
    id: number;
    document_number: string;
    grand_total: number;
    item_count: number;
    created_at: string;
    elapsed_minutes: number;
    server_name: string;
}

interface TableItem {
    id: number;
    code: string;
    name: string;
    zone: string;
    capacity: number;
    shape: 'square' | 'rectangle' | 'round';
    status: 'available' | 'occupied' | 'reserved';
    sort_order: number;
    active_order: ActiveOrder | null;
}

interface FloorProps {
    tables: TableItem[];
    zones: string[];
    currentZone: string;
    metrics: {
        total_tables: number;
        available_tables: number;
        occupied_tables: number;
        reserved_tables: number;
        total_capacity: number;
    };
}

export default function FloorIndex({ tables, zones, currentZone, metrics }: FloorProps) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    const [selectedZone, setSelectedZone] = useState<string>(currentZone);
    const [showAddModal, setShowAddModal] = useState(false);
    const [addForm, setAddForm] = useState({
        code: '',
        name: '',
        zone: zones[0] || 'Main Dining',
        capacity: 4,
        shape: 'square',
    });

    const handleZoneChange = (zone: string) => {
        setSelectedZone(zone);
        router.get('/tables', { zone }, { preserveState: true });
    };

    const handleUpdateStatus = (tableId: number, status: 'available' | 'occupied' | 'reserved') => {
        router.patch(`/tables/${tableId}/status`, { status }, { preserveScroll: true });
    };

    const handleAddSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.post('/tables', addForm, {
            onSuccess: () => {
                setShowAddModal(false);
                setAddForm({
                    code: '',
                    name: '',
                    zone: zones[0] || 'Main Dining',
                    capacity: 4,
                    shape: 'square',
                });
            },
        });
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'occupied':
                return (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 whitespace-nowrap shrink-0">
                        <Users className="w-3 h-3 text-amber-400 shrink-0" />
                        មានភ្ញៀវ
                    </span>
                );
            case 'reserved':
                return (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1 whitespace-nowrap shrink-0">
                        <CalendarCheck className="w-3 h-3 text-purple-400 shrink-0" />
                        កក់ទុក
                    </span>
                );
            default:
                return (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 whitespace-nowrap shrink-0">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                        ទំនេរ
                    </span>
                );
        }
    };

    const getShapeIcon = (shape: string) => {
        switch (shape) {
            case 'round':
                return <Circle className="w-3.5 h-3.5 text-zinc-400" />;
            case 'rectangle':
                return <RectangleHorizontal className="w-3.5 h-3.5 text-zinc-400" />;
            default:
                return <Square className="w-3.5 h-3.5 text-zinc-400" />;
        }
    };

    return (
        <AppLayout title="Floor & Tables">
            <Head title="Floor & Tables — ប្លង់តុ & ការគ្រប់គ្រងតុ" />

            <div className="space-y-6 pb-12">
                {/* Fixed / Sticky Header */}
                <div className="sticky top-0 z-30 -mx-4 -mt-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 py-3.5 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                                <LayoutGrid className="w-5 h-5" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
                                    Floor & Tables
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                                        ប្លង់តុ
                                    </span>
                                </h1>
                                <p className="text-xs text-zinc-400">
                                    គ្រប់គ្រងស្ថានភាពតុ ការអង្គុយ និងការបើកវិក្កយបត្រតាមតំបន់
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-zinc-950 flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
                            >
                                <PlusCircle className="w-4 h-4" />
                                <span>បន្ថែមតុថ្មី</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Top Metrics Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <Card className="bg-zinc-900/70 border-zinc-800/80 p-4 rounded-2xl relative overflow-hidden">
                        <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                            <span>Available Tables / តុទំនេរ</span>
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div className="text-xl sm:text-2xl font-bold text-white font-mono">
                            {metrics.available_tables}
                        </div>
                        <div className="text-xs text-emerald-400/90 font-khmer mt-1">
                            {metrics.total_tables} តុសរុបក្នុងហាង
                        </div>
                    </Card>

                    <Card className="bg-zinc-900/70 border-zinc-800/80 p-4 rounded-2xl relative overflow-hidden">
                        <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                            <span>Occupied Tables / តុមានភ្ញៀវ</span>
                            <Users className="w-4 h-4 text-amber-400" />
                        </div>
                        <div className="text-xl sm:text-2xl font-bold text-white font-mono">
                            {metrics.occupied_tables}
                        </div>
                        <div className="text-xs text-amber-400/90 font-khmer mt-1">
                            កំពុងទទួលភ្ញៀវពិសារ
                        </div>
                    </Card>

                    <Card className="bg-zinc-900/70 border-zinc-800/80 p-4 rounded-2xl relative overflow-hidden">
                        <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                            <span>Reserved Tables / តុកក់ទុក</span>
                            <CalendarCheck className="w-4 h-4 text-purple-400" />
                        </div>
                        <div className="text-xl sm:text-2xl font-bold text-white font-mono">
                            {metrics.reserved_tables}
                        </div>
                        <div className="text-xs text-purple-400/90 font-khmer mt-1">
                            មានការកក់ទុកជាមុន
                        </div>
                    </Card>

                    <Card className="bg-zinc-900/70 border-zinc-800/80 p-4 rounded-2xl relative overflow-hidden">
                        <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                            <span>Total Capacity / ចំណុះកៅអីសរុប</span>
                            <Armchair className="w-4 h-4 text-teal-400" />
                        </div>
                        <div className="text-xl sm:text-2xl font-bold text-white font-mono">
                            {metrics.total_capacity}
                        </div>
                        <div className="text-xs text-teal-400/90 font-khmer mt-1">
                            កៅអីអង្គុយសរុបទាំងអស់
                        </div>
                    </Card>
                </div>

                    {/* Zone Filter Pills */}
                    <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1 scrollbar-none">
                        <button
                            onClick={() => handleZoneChange('all')}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${
                                selectedZone === 'all'
                                    ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-sm'
                                    : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-850'
                            }`}
                        >
                            គ្រប់តំបន់ទាំងអស់ ({tables.length})
                        </button>
                        {zones.map((z) => (
                            <button
                                key={z}
                                onClick={() => handleZoneChange(z)}
                                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${
                                    selectedZone === z
                                        ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-sm'
                                        : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-850'
                                }`}
                            >
                                {z}
                            </button>
                        ))}
                    </div>

                {/* Table Cards Visual Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {tables.map((table) => {
                        const isOccupied = table.status === 'occupied';
                        const isReserved = table.status === 'reserved';
                        const isAvailable = table.status === 'available';

                        return (
                            <div
                                key={table.id}
                                className={`rounded-2xl border p-4 flex flex-col justify-between transition-all duration-200 shadow-lg ${
                                    isOccupied
                                        ? 'bg-zinc-900/90 border-amber-500/60 ring-1 ring-amber-500/20 shadow-amber-950/20'
                                        : isReserved
                                        ? 'bg-zinc-900/90 border-purple-500/50 shadow-purple-950/20'
                                        : 'bg-zinc-900/70 border-zinc-800 hover:border-zinc-700 shadow-black/30'
                                }`}
                            >
                                <div>
                                    {/* Top Card Info */}
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="text-lg font-bold text-zinc-100 font-mono whitespace-nowrap">
                                                    {table.code}
                                                </span>
                                                <div className="flex items-center gap-1 text-[11px] text-zinc-400 bg-zinc-800/80 px-1.5 py-0.5 rounded border border-zinc-700 whitespace-nowrap shrink-0">
                                                    {getShapeIcon(table.shape)}
                                                    <span className="whitespace-nowrap">{table.capacity} កៅអី</span>
                                                </div>
                                            </div>
                                            <p className="text-xs font-medium text-amber-400 mt-0.5 truncate">
                                                {table.name}
                                            </p>
                                        </div>
                                        {getStatusBadge(table.status)}
                                    </div>

                                    <div className="text-[11px] text-zinc-400 mb-3 flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                                        <span>{table.zone}</span>
                                    </div>

                                    {/* Active Order Details (if occupied) */}
                                    {table.active_order ? (
                                        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-3 text-xs space-y-1">
                                            <div className="flex items-center justify-between text-amber-300 font-semibold">
                                                <span>សរុប: ${table.active_order.grand_total.toFixed(2)}</span>
                                                <span className="font-mono text-[10px] text-zinc-400">
                                                    {table.active_order.item_count} មុខ
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between text-[11px] text-zinc-400">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3 text-amber-400" />
                                                    {table.active_order.elapsed_minutes} នាទី
                                                </span>
                                                <span>{table.active_order.server_name}</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="py-4 text-center text-zinc-500 text-xs border border-dashed border-zinc-800 rounded-xl mb-3">
                                            តុទំនេរ ត្រៀមទទួលភ្ញៀវ
                                        </div>
                                    )}
                                </div>

                                {/* Action Buttons */}
                                <div className="space-y-2 pt-2 border-t border-zinc-800/80">
                                    {isOccupied && table.active_order ? (
                                        <Link
                                            href={`/invoices/${table.active_order.id}`}
                                            className="w-full py-2 px-3 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-zinc-950 flex items-center justify-center gap-1.5 transition-all shadow-md shadow-amber-500/20"
                                        >
                                            <Receipt className="w-3.5 h-3.5" />
                                            <span>គិតលុយ / មើលវិក្កយបត្រ</span>
                                        </Link>
                                    ) : (
                                        <Link
                                            href={`/invoices/create?table_ref=${encodeURIComponent(table.name)}`}
                                            className="w-full py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-amber-400 border border-zinc-700 hover:border-amber-500/40 flex items-center justify-center gap-2.5 transition-all shadow-sm group"
                                        >
                                            <ShoppingBag className="w-4 h-4 shrink-0 text-amber-400 group-hover:scale-110 transition-transform" />
                                            <div className="flex flex-col items-center text-center">
                                                <span className="text-xs font-semibold font-khmer leading-tight">បើកការបញ្ជាទិញ</span>
                                                <span className="text-[10px] text-amber-400/80 font-mono font-medium tracking-tight leading-tight">(POS Order)</span>
                                            </div>
                                        </Link>
                                    )}

                                    {/* Quick Status Toggle */}
                                    <div className="flex items-center justify-between gap-1 text-[10px]">
                                        <button
                                            onClick={() => handleUpdateStatus(table.id, 'available')}
                                            className={`flex-1 py-1 rounded-lg border transition-all ${
                                                isAvailable
                                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-semibold'
                                                    : 'text-zinc-500 hover:text-zinc-300 border-transparent hover:bg-zinc-800'
                                            }`}
                                        >
                                            ទំនេរ
                                        </button>
                                        <button
                                            onClick={() => handleUpdateStatus(table.id, 'occupied')}
                                            className={`flex-1 py-1 rounded-lg border transition-all ${
                                                isOccupied
                                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold'
                                                    : 'text-zinc-500 hover:text-zinc-300 border-transparent hover:bg-zinc-800'
                                            }`}
                                        >
                                            មានភ្ញៀវ
                                        </button>
                                        <button
                                            onClick={() => handleUpdateStatus(table.id, 'reserved')}
                                            className={`flex-1 py-1 rounded-lg border transition-all ${
                                                isReserved
                                                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 font-semibold'
                                                    : 'text-zinc-500 hover:text-zinc-300 border-transparent hover:bg-zinc-800'
                                            }`}
                                        >
                                            កក់ទុក
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Add Table Modal */}
                {showAddModal && mounted && createPortal(
                    <div className="fixed inset-0 z-50 overflow-y-auto bg-white dark:bg-zinc-950 animate-in fade-in duration-200">
                        <div
                            className="flex min-h-full items-center justify-center p-4 sm:p-6 text-center"
                            onClick={(e) => {
                                if (e.target === e.currentTarget) setShowAddModal(false);
                            }}
                        >
                            <div className="w-full max-w-4xl text-left bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-7 shadow-2xl shadow-zinc-900/10 dark:shadow-black/60 ring-1 ring-zinc-900/5 dark:ring-white/10 space-y-6 animate-in zoom-in-95 duration-200 mx-auto my-auto">
                            {/* Modal Header */}
                            <div className="flex items-start justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800/80">
                                <div className="flex items-center gap-3">
                                    <div className="w-11 h-11 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0 shadow-xs">
                                        <PlusCircle className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                                            បន្ថែមតុថ្មីក្នុងប្លង់ (New Floor Table)
                                        </h3>
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-khmer mt-0.5">
                                            កំណត់កូដ ឈ្មោះ ចំនួនកៅអី រូបរាង និងទីតាំងសម្រាប់តុថ្មី
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                                    aria-label="Close"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleAddSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                                    {/* Left Column: Form Controls (7 cols) */}
                                    <div className="lg:col-span-7 space-y-4">
                                        {/* Row 1: Code and Name */}
                                        <div className="grid grid-cols-2 gap-3.5">
                                            <div className="space-y-1.5">
                                                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                                                    កូដតុ * <span className="font-normal text-zinc-400 font-mono">(Code)</span>
                                                </label>
                                                <div className="relative">
                                                    <Hash className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-3 pointer-events-none" />
                                                    <input
                                                        type="text"
                                                        required
                                                        placeholder="T-15"
                                                        value={addForm.code}
                                                        onChange={(e) => setAddForm({ ...addForm, code: e.target.value.toUpperCase() })}
                                                        className="w-full pl-9 pr-3 h-10 bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition shadow-2xs"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                                                    ឈ្មោះតុ * <span className="font-normal text-zinc-400">(Name)</span>
                                                </label>
                                                <div className="relative">
                                                    <Utensils className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-3 pointer-events-none" />
                                                    <input
                                                        type="text"
                                                        required
                                                        placeholder="ឧ. តុ ១៥"
                                                        value={addForm.name}
                                                        onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                                                        className="w-full pl-9 pr-3 h-10 bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition shadow-2xs"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Row 2: Zone with quick select pills */}
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                                                    តំបន់ / ផ្នែក * <span className="font-normal text-zinc-400 font-mono">(Zone)</span>
                                                </label>
                                                <span className="text-[11px] text-zinc-400 font-khmer">ជ្រើសរើស ឬវាយបញ្ចូលថ្មី</span>
                                            </div>
                                            <div className="relative">
                                                <MapPin className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-3 pointer-events-none" />
                                                <input
                                                    type="text"
                                                    required
                                                    list="zone-list"
                                                    placeholder="Main Dining / VIP Room / Outdoor"
                                                    value={addForm.zone}
                                                    onChange={(e) => setAddForm({ ...addForm, zone: e.target.value })}
                                                    className="w-full pl-9 pr-3 h-10 bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition shadow-2xs"
                                                />
                                                <datalist id="zone-list">
                                                    {zones.map((z) => (
                                                        <option key={z} value={z} />
                                                    ))}
                                                </datalist>
                                            </div>
                                            {zones.length > 0 && (
                                                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                                    {zones.map((z) => {
                                                        const isActive = addForm.zone === z;
                                                        return (
                                                            <button
                                                                key={z}
                                                                type="button"
                                                                onClick={() => setAddForm({ ...addForm, zone: z })}
                                                                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                                                                    isActive
                                                                        ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                                                                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                                                                }`}
                                                            >
                                                                {z}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>

                                        {/* Row 3: Shape Selector (Visual Cards) */}
                                        <div className="space-y-1.5">
                                            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                                                រាងតុ <span className="font-normal text-zinc-400 font-mono">(Table Shape)</span>
                                            </label>
                                            <div className="grid grid-cols-3 gap-2.5">
                                                {[
                                                    { id: 'square', label: 'ការ៉េ', sub: 'Square', icon: Square },
                                                    { id: 'rectangle', label: 'ចតុកោណ', sub: 'Rectangle', icon: RectangleHorizontal },
                                                    { id: 'round', label: 'រង្វង់មូល', sub: 'Round', icon: Circle },
                                                ].map((s) => {
                                                    const Icon = s.icon;
                                                    const isSelected = addForm.shape === s.id;
                                                    return (
                                                        <button
                                                            key={s.id}
                                                            type="button"
                                                            onClick={() => setAddForm({ ...addForm, shape: s.id as 'square' | 'rectangle' | 'round' })}
                                                            className={`p-2.5 rounded-2xl border flex flex-col items-center justify-center gap-1 transition cursor-pointer select-none ${
                                                                isSelected
                                                                    ? 'border-amber-500 bg-amber-500/10 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold shadow-xs ring-1 ring-amber-500/30'
                                                                    : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700'
                                                            }`}
                                                        >
                                                            <Icon className="w-4 h-4" />
                                                            <span className="text-xs">{s.label}</span>
                                                            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">{s.sub}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Row 4: Capacity (Seating Stepper & Preset Pills) */}
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                                                    ចំនួនកៅអី <span className="font-normal text-zinc-400 font-mono">(Seating Capacity)</span>
                                                </label>
                                                <span className="text-[11px] text-zinc-400 font-mono">{addForm.capacity} Pax</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {/* Stepper */}
                                                <div className="flex items-center h-10 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/80 overflow-hidden shadow-2xs shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={() => setAddForm({ ...addForm, capacity: Math.max(1, addForm.capacity - 1) })}
                                                        className="w-9 h-full flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800 transition cursor-pointer"
                                                        title="បន្ថយ ១"
                                                    >
                                                        <Minus className="w-3.5 h-3.5" />
                                                    </button>
                                                    <div className="w-14 text-center font-mono font-bold text-sm text-zinc-900 dark:text-white flex items-center justify-center gap-1">
                                                        <span>{addForm.capacity}</span>
                                                        <span className="text-[10px] font-normal text-zinc-400 font-khmer">កៅអី</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setAddForm({ ...addForm, capacity: Math.min(50, addForm.capacity + 1) })}
                                                        className="w-9 h-full flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800 transition cursor-pointer"
                                                        title="បន្ថែម ១"
                                                    >
                                                        <Plus className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>

                                                {/* Quick presets */}
                                                <div className="grid grid-cols-5 gap-1.5 flex-1">
                                                    {[2, 4, 6, 8, 12].map((num) => (
                                                        <button
                                                            key={num}
                                                            type="button"
                                                            onClick={() => setAddForm({ ...addForm, capacity: num })}
                                                            className={`h-10 rounded-xl text-xs font-semibold font-mono transition cursor-pointer border ${
                                                                addForm.capacity === num
                                                                    ? 'bg-amber-500 border-amber-500 text-slate-950 font-bold shadow-xs'
                                                                    : 'bg-zinc-50 dark:bg-zinc-950/60 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700'
                                                            }`}
                                                        >
                                                            {num}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Column: Live Interactive Floor Simulation (5 cols) */}
                                    <div className="lg:col-span-5 flex flex-col justify-between bg-zinc-50 dark:bg-zinc-950/70 border border-zinc-200 dark:border-zinc-800/90 rounded-2xl p-4.5 sm:p-5 relative overflow-hidden">
                                        {/* Top Header of Preview */}
                                        <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-zinc-200 dark:border-zinc-800">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 text-amber-500 flex items-center justify-center">
                                                    <Eye className="w-3.5 h-3.5" />
                                                </div>
                                                <span className="text-xs font-bold text-zinc-900 dark:text-white font-khmer">
                                                    ទិដ្ឋភាពប្លង់ជាក់ស្តែង (Floor Preview)
                                                </span>
                                            </div>
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1 font-khmer">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                តុទំនេរ (New)
                                            </span>
                                        </div>

                                        {/* Interactive Visual Floor Simulator */}
                                        <div className="my-auto py-6 sm:py-8 flex flex-col items-center justify-center relative rounded-xl bg-white dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/70 shadow-inner overflow-hidden min-h-[220px]">
                                            {/* Floor dot grid background */}
                                            <div className="absolute inset-0 opacity-40 dark:opacity-20 pointer-events-none bg-[radial-gradient(#9ca3af_1px,transparent_1px)] dark:bg-[radial-gradient(#52525b_1px,transparent_1px)] [background-size:14px_14px]" />

                                            {/* Table Element with Shape and Animated Surroundings */}
                                            <div className="relative z-10 flex items-center justify-center">
                                                <div className="relative flex items-center justify-center p-6">
                                                    {/* Table Center Body */}
                                                    <div
                                                        className={`transition-all duration-300 flex flex-col items-center justify-center shadow-lg border-2 border-amber-500/80 bg-amber-500/15 text-center relative z-10 ${
                                                            addForm.shape === 'round'
                                                                ? 'w-28 h-28 rounded-full'
                                                                : addForm.shape === 'rectangle'
                                                                ? 'w-36 h-22 rounded-2xl'
                                                                : 'w-26 h-26 rounded-2xl'
                                                        }`}
                                                    >
                                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-extrabold bg-zinc-900 text-amber-400 border border-amber-500/40 shadow-xs mb-1 uppercase tracking-wider">
                                                            {addForm.code || 'CODE'}
                                                        </span>
                                                        <span className="font-bold text-xs text-zinc-900 dark:text-white px-2 truncate max-w-[120px]">
                                                            {addForm.name || 'ឈ្មោះតុ'}
                                                        </span>
                                                        <span className="text-[10px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1 font-mono mt-0.5">
                                                            <Users className="w-3 h-3 text-amber-500" />
                                                            {addForm.capacity} Seats
                                                        </span>
                                                    </div>

                                                    {/* Chairs around Round Table */}
                                                    {addForm.shape === 'round' && (
                                                        <div className="absolute inset-0 pointer-events-none">
                                                            {Array.from({ length: Math.min(addForm.capacity, 12) }).map((_, i, arr) => {
                                                                const angle = (i / arr.length) * 2 * Math.PI - Math.PI / 2;
                                                                const r = 68;
                                                                const cx = 86 + r * Math.cos(angle);
                                                                const cy = 86 + r * Math.sin(angle);
                                                                return (
                                                                    <div
                                                                        key={i}
                                                                        className="absolute w-3 h-3 rounded-full bg-amber-500/40 border border-amber-500/80 shadow-xs transition-all duration-300"
                                                                        style={{
                                                                            left: `${cx}px`,
                                                                            top: `${cy}px`,
                                                                            transform: 'translate(-50%, -50%)',
                                                                        }}
                                                                    />
                                                                );
                                                            })}
                                                        </div>
                                                    )}

                                                    {/* Chairs around Square/Rectangle Table */}
                                                    {addForm.shape !== 'round' && (
                                                        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between items-center py-1.5 px-3">
                                                            {/* Top Chairs */}
                                                            <div className="flex gap-2">
                                                                {Array.from({ length: Math.ceil(Math.min(addForm.capacity, 10) / 2) }).map((_, i) => (
                                                                    <div key={`top-${i}`} className="w-3.5 h-2 rounded-t-md bg-amber-500/40 border border-amber-500/80 shadow-2xs" />
                                                                ))}
                                                            </div>
                                                            {/* Bottom Chairs */}
                                                            <div className="flex gap-2">
                                                                {Array.from({ length: Math.floor(Math.min(addForm.capacity, 10) / 2) }).map((_, i) => (
                                                                    <div key={`bot-${i}`} className="w-3.5 h-2 rounded-b-md bg-amber-500/40 border border-amber-500/80 shadow-2xs" />
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="text-[11px] text-zinc-400 mt-2 font-khmer">
                                                {addForm.zone || 'គ្រប់តំបន់ទាំងអស់'}
                                            </div>
                                        </div>

                                        {/* Bottom Metadata Summary in Right Column */}
                                        <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800 grid grid-cols-3 gap-2 text-center">
                                            <div className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800">
                                                <div className="text-[10px] text-zinc-400 font-khmer">តំបន់</div>
                                                <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate mt-0.5">
                                                    {addForm.zone || 'N/A'}
                                                </div>
                                            </div>
                                            <div className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800">
                                                <div className="text-[10px] text-zinc-400 font-khmer">រូបរាង</div>
                                                <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200 mt-0.5 font-khmer">
                                                    {addForm.shape === 'round' ? 'រង្វង់' : addForm.shape === 'rectangle' ? 'ចតុកោណ' : 'ការ៉េ'}
                                                </div>
                                            </div>
                                            <div className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800">
                                                <div className="text-[10px] text-zinc-400 font-khmer">កៅអី</div>
                                                <div className="text-xs font-bold text-amber-500 font-mono mt-0.5">
                                                    {addForm.capacity} Pax
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Modal Actions (Footer) */}
                                <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
                                    <div className="text-xs text-zinc-400 hidden sm:flex items-center gap-1.5 font-khmer">
                                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                                        តុថ្មីនឹងបង្ហាញនៅលើប្លង់ភ្លាមៗបន្ទាប់ពីបង្កើត
                                    </div>
                                    <div className="flex items-center gap-2.5 ml-auto">
                                        <button
                                            type="button"
                                            onClick={() => setShowAddModal(false)}
                                            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 transition cursor-pointer"
                                        >
                                            បោះបង់
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition cursor-pointer shadow-md shadow-amber-500/20 flex items-center gap-1.5 active:scale-[0.98]"
                                        >
                                            <PlusCircle className="w-4 h-4" />
                                            <span>បង្កើតតុថ្មី</span>
                                        </button>
                                    </div>
                                </div>
                            </form>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
            </div>
        </AppLayout>
    );
}
