import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { AppLayout } from '@/layouts/app-layout';
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
    Sparkles,
    Armchair,
    Receipt,
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
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                        <Users className="w-3 h-3 text-amber-400" />
                        មានភ្ញៀវ
                    </span>
                );
            case 'reserved':
                return (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1">
                        <CalendarCheck className="w-3 h-3 text-purple-400" />
                        កក់ទុក
                    </span>
                );
            default:
                return (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
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
                                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-zinc-950 flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all"
                            >
                                <PlusCircle className="w-4 h-4" />
                                <span>+ បន្ថែមតុថ្មី</span>
                            </button>
                        </div>
                    </div>

                    {/* KPI Metrics Summary Strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                        <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800/80">
                            <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> តុទំនេរ (Available)
                            </span>
                            <p className="text-lg font-bold text-emerald-300 mt-0.5">
                                {metrics.available_tables}{' '}
                                <span className="text-xs text-zinc-500 font-normal">/ {metrics.total_tables} តុ</span>
                            </p>
                        </div>
                        <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800/80">
                            <span className="text-[11px] text-amber-400 flex items-center gap-1">
                                <Users className="w-3.5 h-3.5" /> តុមានភ្ញៀវ (Occupied)
                            </span>
                            <p className="text-lg font-bold text-amber-300 mt-0.5">
                                {metrics.occupied_tables} តុ
                            </p>
                        </div>
                        <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800/80">
                            <span className="text-[11px] text-purple-400 flex items-center gap-1">
                                <CalendarCheck className="w-3.5 h-3.5" /> តុកក់ទុក (Reserved)
                            </span>
                            <p className="text-lg font-bold text-purple-300 mt-0.5">
                                {metrics.reserved_tables} តុ
                            </p>
                        </div>
                        <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800/80">
                            <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                                <Armchair className="w-3.5 h-3.5 text-zinc-400" /> ចំណុះកៅអីសរុប
                            </span>
                            <p className="text-lg font-bold text-zinc-100 mt-0.5">
                                {metrics.total_capacity} កៅអី
                            </p>
                        </div>
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
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg font-bold text-zinc-100 font-mono">
                                                    {table.code}
                                                </span>
                                                <div className="flex items-center gap-1 text-[11px] text-zinc-400 bg-zinc-800/80 px-1.5 py-0.5 rounded border border-zinc-700">
                                                    {getShapeIcon(table.shape)}
                                                    <span>{table.capacity} កៅអី</span>
                                                </div>
                                            </div>
                                            <p className="text-xs font-medium text-amber-400 mt-0.5">
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
                                            className="w-full py-2 px-3 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-amber-400 border border-zinc-700 hover:border-amber-500/40 flex items-center justify-center gap-1.5 transition-all"
                                        >
                                            <ShoppingBag className="w-3.5 h-3.5" />
                                            <span>បើកការបញ្ជាទិញ (POS Order)</span>
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
                {showAddModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-2xl">
                            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
                                <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                                    <PlusCircle className="w-5 h-5 text-amber-400" />
                                    បន្ថែមតុថ្មីក្នុងប្លង់
                                </h3>
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <form onSubmit={handleAddSubmit} className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-zinc-300 mb-1">
                                            កូដតុ * (Code)
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="ឧ. T-15"
                                            value={addForm.code}
                                            onChange={(e) => setAddForm({ ...addForm, code: e.target.value })}
                                            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 uppercase focus:outline-none focus:border-amber-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-zinc-300 mb-1">
                                            ឈ្មោះតុ * (Name)
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="ឧ. តុ 15"
                                            value={addForm.name}
                                            onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                                            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                                        តំបន់ / ផ្នែក * (Zone)
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        list="zone-list"
                                        placeholder="Main Dining / VIP Room / Outdoor"
                                        value={addForm.zone}
                                        onChange={(e) => setAddForm({ ...addForm, zone: e.target.value })}
                                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                                    />
                                    <datalist id="zone-list">
                                        {zones.map((z) => (
                                            <option key={z} value={z} />
                                        ))}
                                    </datalist>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-zinc-300 mb-1">
                                            ចំនួនកៅអី (Capacity)
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="50"
                                            required
                                            value={addForm.capacity}
                                            onChange={(e) =>
                                                setAddForm({ ...addForm, capacity: Number(e.target.value) })
                                            }
                                            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-zinc-300 mb-1">
                                            រាងតុ (Shape)
                                        </label>
                                        <select
                                            value={addForm.shape}
                                            onChange={(e) =>
                                                setAddForm({
                                                    ...addForm,
                                                    shape: e.target.value as 'square' | 'rectangle' | 'round',
                                                })
                                            }
                                            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                                        >
                                            <option value="square">ការ៉េ (Square)</option>
                                            <option value="rectangle">ចតុកោណកែង (Rectangle)</option>
                                            <option value="round">មូល (Round)</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
                                    <button
                                        type="button"
                                        onClick={() => setShowAddModal(false)}
                                        className="px-3.5 py-2 rounded-xl text-xs text-zinc-300 hover:bg-zinc-800"
                                    >
                                        បោះបង់
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-zinc-950"
                                    >
                                        បង្កើតតុ
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
