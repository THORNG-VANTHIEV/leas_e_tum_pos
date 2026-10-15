import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { AppLayout } from '@/layouts/app-layout';
import {
    Users,
    UserPlus,
    Search,
    Award,
    Sparkles,
    Coins,
    Phone,
    Mail,
    Edit2,
    CheckCircle2,
    X,
    TrendingUp,
    ShieldAlert,
    Plus,
    Minus,
} from 'lucide-react';

interface Customer {
    id: number;
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    tier: 'standard' | 'silver' | 'gold' | 'vip';
    loyalty_points: number;
    total_spent_usd: string | number;
    visits_count: number;
    notes: string | null;
    is_active: boolean;
    documents_count?: number;
    created_at: string;
}

interface CustomersProps {
    customers: {
        data: Customer[];
        current_page: number;
        last_page: number;
        total: number;
        links: Array<{ url: string | null; label: string; active: boolean }>;
    };
    metrics: {
        total_customers: number;
        vip_customers: number;
        gold_customers: number;
        silver_customers: number;
        total_points: number;
        total_spent_usd: number;
    };
    filters: {
        search: string;
        tier: string;
    };
}

export default function CustomersIndex({ customers, metrics, filters }: CustomersProps) {
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [selectedTier, setSelectedTier] = useState(filters.tier || 'all');

    // Modals state
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [pointsCustomer, setPointsCustomer] = useState<Customer | null>(null);

    // Form states
    const [createForm, setCreateForm] = useState({
        name: '',
        phone: '',
        email: '',
        address: '',
        tier: 'standard',
        notes: '',
    });

    const [editForm, setEditForm] = useState({
        name: '',
        phone: '',
        email: '',
        address: '',
        tier: 'standard',
        notes: '',
    });

    const [pointsAdjustment, setPointsAdjustment] = useState<number>(10);
    const [pointsReason, setPointsReason] = useState<string>('ការលើកទឹកចិត្តអតិថិជនពិសេស');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/customers', { search: searchTerm, tier: selectedTier }, { preserveState: true });
    };

    const handleTierFilter = (tier: string) => {
        setSelectedTier(tier);
        router.get('/customers', { search: searchTerm, tier }, { preserveState: true });
    };

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.post('/customers', createForm, {
            onSuccess: () => {
                setShowCreateModal(false);
                setCreateForm({ name: '', phone: '', email: '', address: '', tier: 'standard', notes: '' });
            },
        });
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingCustomer) return;
        router.patch(`/customers/${editingCustomer.id}`, editForm, {
            onSuccess: () => setEditingCustomer(null),
        });
    };

    const handlePointsSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!pointsCustomer) return;
        router.post(
            `/customers/${pointsCustomer.id}/adjust-points`,
            { points: pointsAdjustment, reason: pointsReason },
            {
                onSuccess: () => setPointsCustomer(null),
            }
        );
    };

    const openEditModal = (c: Customer) => {
        setEditingCustomer(c);
        setEditForm({
            name: c.name,
            phone: c.phone || '',
            email: c.email || '',
            address: c.address || '',
            tier: c.tier,
            notes: c.notes || '',
        });
    };

    const getInitials = (name: string) => {
        if (!name) return 'C';
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
        return name.slice(0, 2).toUpperCase();
    };

    const getTierAvatar = (tier: string) => {
        switch (tier) {
            case 'vip':
                return 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30';
            case 'gold':
                return 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30';
            case 'silver':
                return 'bg-slate-500/15 text-slate-800 dark:text-slate-200 border-slate-400/40 dark:border-slate-500/40';
            default:
                return 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/25';
        }
    };

    const getTierBadge = (tier: string) => {
        switch (tier) {
            case 'vip':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 shadow-2xs">
                        <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                        <span>VIP</span>
                    </span>
                );
            case 'gold':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 shadow-2xs">
                        <Award className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span>Gold</span>
                    </span>
                );
            case 'silver':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-500/15 text-slate-800 dark:text-slate-200 border border-slate-400/40 dark:border-slate-500/40 shadow-2xs">
                        <Award className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300 shrink-0" />
                        <span>Silver</span>
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border border-zinc-500/25 shadow-2xs">
                        <span>Standard</span>
                    </span>
                );
        }
    };

    return (
        <AppLayout title="Customers & Loyalty (CRM)">
            <Head title="Customers & Loyalty (CRM) — អតិថិជន & ពិន្ទុសន្សំ" />

            <div className="space-y-6 pb-12">
                {/* Header & Metrics Strip */}
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-900/60 border border-zinc-700/60 dark:border-zinc-800/80 p-4 rounded-2xl shadow-xs">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                                <Users className="w-5 h-5" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
                                    Customers & Loyalty (CRM)
                                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 font-medium font-khmer">
                                        ប្រព័ន្ធសមាជិក
                                    </span>
                                </h1>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-khmer mt-0.5">
                                    គ្រប់គ្រងប្រវត្តិអតិថិជន ពិន្ទុសន្សំ Loyalty Rewards និងកម្រិតសមាជិក VIP
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-zinc-950 flex items-center gap-2 shadow-md shadow-amber-500/20 transition-all cursor-pointer font-khmer"
                            >
                                <UserPlus className="w-4 h-4" />
                                <span>ចុះឈ្មោះអតិថិជនថ្មី</span>
                            </button>
                        </div>
                    </div>

                    {/* KPI Metrics Summary Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {/* Card 1: Total Customers */}
                        <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-700/60 dark:border-zinc-800/80 flex items-center justify-between shadow-2xs">
                            <div>
                                <span className="text-[11px] font-mono font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
                                    អតិថិជនសរុប (Total)
                                </span>
                                <div className="flex items-baseline gap-1.5 mt-1">
                                    <span className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white">
                                        {metrics.total_customers}
                                    </span>
                                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">នាក់</span>
                                </div>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
                                <Users className="w-5 h-5" />
                            </div>
                        </div>

                        {/* Card 2: VIP & Gold Members */}
                        <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-700/60 dark:border-zinc-800/80 flex items-center justify-between shadow-2xs">
                            <div>
                                <span className="text-[11px] font-mono font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wider flex items-center gap-1">
                                    <Sparkles className="w-3 h-3" /> សមាជិក VIP & Gold
                                </span>
                                <div className="flex items-baseline gap-1.5 mt-1">
                                    <span className="text-2xl font-black tracking-tight text-purple-700 dark:text-purple-300">
                                        {metrics.vip_customers + metrics.gold_customers}
                                    </span>
                                    <span className="text-[11px] text-purple-600/80 dark:text-purple-400/80 font-mono">
                                        (V:{metrics.vip_customers} / G:{metrics.gold_customers})
                                    </span>
                                </div>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                                <Sparkles className="w-5 h-5" />
                            </div>
                        </div>

                        {/* Card 3: Total Points */}
                        <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-700/60 dark:border-zinc-800/80 flex items-center justify-between shadow-2xs">
                            <div>
                                <span className="text-[11px] font-mono font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                                    <Coins className="w-3 h-3" /> ពិន្ទុសន្សំសរុប
                                </span>
                                <div className="flex items-baseline gap-1.5 mt-1">
                                    <span className="text-2xl font-black tracking-tight text-amber-600 dark:text-amber-400">
                                        {metrics.total_points.toLocaleString()}
                                    </span>
                                    <span className="text-[11px] text-amber-600/80 dark:text-amber-400/80 font-mono">pts</span>
                                </div>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                                <Coins className="w-5 h-5" />
                            </div>
                        </div>

                        {/* Card 4: Total Spent */}
                        <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-700/60 dark:border-zinc-800/80 flex items-center justify-between shadow-2xs">
                            <div>
                                <span className="text-[11px] font-mono font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                                    <TrendingUp className="w-3 h-3" /> ចំណូលសរុប (Revenue)
                                </span>
                                <div className="flex items-baseline gap-1.5 mt-1">
                                    <span className="text-2xl font-black tracking-tight text-emerald-700 dark:text-emerald-400">
                                        ${metrics.total_spent_usd.toFixed(2)}
                                    </span>
                                    <span className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 font-mono">USD</span>
                                </div>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                                <TrendingUp className="w-5 h-5" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-zinc-900/60 border border-zinc-700/60 dark:border-zinc-800/80 p-2.5 sm:p-3 rounded-2xl shadow-xs">
                    {/* Search Form */}
                    <form onSubmit={handleSearch} className="relative w-full sm:w-80 md:w-96">
                        <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="ស្វែងរកតាមឈ្មោះ, លេខទូរស័ព្ទ, ឬអ៊ីមែល..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full h-9 pl-9 pr-8 bg-zinc-950 border border-zinc-700/60 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-all font-khmer"
                        />
                        {searchTerm && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchTerm('');
                                    router.get('/customers', { search: '', tier: selectedTier }, { preserveState: true });
                                }}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer p-0.5"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </form>

                    {/* Tier Filter Tabs with Counts */}
                    <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-0.5 scrollbar-none">
                        {[
                            { id: 'all', label: 'ទាំងអស់ (All)', count: metrics.total_customers },
                            { id: 'vip', label: 'VIP', count: metrics.vip_customers, icon: Sparkles },
                            { id: 'gold', label: 'Gold', count: metrics.gold_customers, icon: Award },
                            { id: 'silver', label: 'Silver', count: metrics.silver_customers, icon: Award },
                            {
                                id: 'standard',
                                label: 'Standard',
                                count: Math.max(
                                    0,
                                    metrics.total_customers -
                                        (metrics.vip_customers + metrics.gold_customers + metrics.silver_customers)
                                ),
                            },
                        ].map((t) => {
                            const Icon = t.icon;
                            const isActive = selectedTier === t.id;
                            return (
                                <button
                                    key={t.id}
                                    onClick={() => handleTierFilter(t.id)}
                                    className={`h-9 px-3 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer border ${
                                        isActive
                                            ? t.id === 'vip'
                                                ? 'bg-purple-600 text-white border-purple-500 shadow-xs'
                                                : t.id === 'gold'
                                                ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-xs'
                                                : t.id === 'silver'
                                                ? 'bg-slate-700 text-white border-slate-600 shadow-xs'
                                                : 'bg-amber-500 text-zinc-950 border-amber-400 shadow-xs'
                                            : 'bg-zinc-950 border-zinc-700/60 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-800/50'
                                    }`}
                                >
                                    {Icon && (
                                        <Icon
                                            className={`w-3.5 h-3.5 ${
                                                isActive
                                                    ? 'text-current'
                                                    : t.id === 'vip'
                                                    ? 'text-purple-500'
                                                    : t.id === 'gold'
                                                    ? 'text-amber-500'
                                                    : t.id === 'silver'
                                                    ? 'text-slate-500'
                                                    : 'text-zinc-400'
                                            }`}
                                        />
                                    )}
                                    <span>{t.label}</span>
                                    <span
                                        className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                                            isActive
                                                ? 'bg-black/20 text-white'
                                                : 'bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                                        }`}
                                    >
                                        {t.count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Customers Table */}
                <div className="rounded-2xl border border-zinc-700/60 dark:border-zinc-800/80 bg-zinc-900/70 overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-zinc-900/80 border-b border-zinc-700/60 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 uppercase font-mono text-[10px] whitespace-nowrap tracking-wider">
                                <tr>
                                    <th className="py-3 px-4">Customer / ឈ្មោះអតិថិជន</th>
                                    <th className="py-3 px-4">Tier / កម្រិតសមាជិក</th>
                                    <th className="py-3 px-4">Points / ពិន្ទុសន្សំ</th>
                                    <th className="py-3 px-4">Total Spent / ចំណាយសរុប</th>
                                    <th className="py-3 px-4">Visits / មកញ៉ាំ</th>
                                    <th className="py-3 px-4">Notes / ចំណាំ</th>
                                    <th className="py-3 px-4 text-right">Actions / សកម្មភាព</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/60 text-zinc-800 dark:text-zinc-200">
                                {customers.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-12 text-center text-zinc-500 font-khmer">
                                            រកមិនឃើញទិន្នន័យអតិថិជនទេ
                                        </td>
                                    </tr>
                                ) : (
                                    customers.data.map((c) => (
                                        <tr key={c.id} className="hover:bg-zinc-800/40 transition-colors">
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className={`w-9 h-9 rounded-xl font-bold font-mono text-xs flex items-center justify-center shrink-0 border shadow-2xs ${getTierAvatar(
                                                            c.tier
                                                        )}`}
                                                    >
                                                        {getInitials(c.name)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="font-bold text-zinc-900 dark:text-white font-khmer text-sm truncate">
                                                            {c.name}
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 font-mono">
                                                            {c.phone && (
                                                                <span className="flex items-center gap-1">
                                                                    <Phone className="w-3 h-3 text-zinc-400 dark:text-zinc-500" />
                                                                    {c.phone}
                                                                </span>
                                                            )}
                                                            {c.email && (
                                                                <span className="flex items-center gap-1 truncate max-w-[180px]">
                                                                    <Mail className="w-3 h-3 text-zinc-400 dark:text-zinc-500" />
                                                                    {c.email}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 whitespace-nowrap">{getTierBadge(c.tier)}</td>
                                            <td className="py-3 px-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-extrabold text-amber-600 dark:text-amber-400 font-mono text-sm">
                                                        {c.loyalty_points.toLocaleString()}
                                                    </span>
                                                    <button
                                                        onClick={() => {
                                                            setPointsCustomer(c);
                                                            setPointsAdjustment(10);
                                                        }}
                                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 transition-all cursor-pointer shadow-2xs active:scale-95"
                                                        title="កែប្រែពិន្ទុសន្សំ (Adjust Points)"
                                                    >
                                                        <Coins className="w-3 h-3 text-amber-500" />
                                                        <span>+/-</span>
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 whitespace-nowrap font-mono">
                                                <div className="font-bold text-emerald-700 dark:text-emerald-400 text-sm">
                                                    ${Number(c.total_spent_usd).toFixed(2)}
                                                </div>
                                                <div className="text-[10px] text-zinc-400 font-mono">
                                                    ≈ {Math.round(Number(c.total_spent_usd) * 4000).toLocaleString()} ៛
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 whitespace-nowrap">
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-700/60 shadow-2xs">
                                                    {c.visits_count} ដង
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 max-w-xs">
                                                {c.notes ? (
                                                    <span
                                                        className="text-zinc-700 dark:text-zinc-300 font-khmer text-xs truncate block"
                                                        title={c.notes}
                                                    >
                                                        {c.notes}
                                                    </span>
                                                ) : (
                                                    <span className="text-zinc-400 dark:text-zinc-600 font-mono text-xs">
                                                        —
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        onClick={() => openEditModal(c)}
                                                        className="p-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white border border-zinc-700/60 transition-all cursor-pointer shadow-2xs active:scale-95"
                                                        title="កែប្រែព័ត៌មាន (Edit)"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => router.post(`/customers/${c.id}/toggle`)}
                                                        className={`p-1.5 rounded-xl border text-xs transition-all cursor-pointer shadow-2xs active:scale-95 ${
                                                            c.is_active
                                                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
                                                                : 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/25'
                                                        }`}
                                                        title={c.is_active ? 'កំពុងសកម្ម (Active)' : 'អសកម្ម (Inactive)'}
                                                    >
                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="px-4 py-2.5 bg-zinc-950/60 border-t border-zinc-700/60 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                        <span>
                            បង្ហាញ {customers.data.length} ក្នុងចំណោម {customers.total || customers.data.length} អតិថិជន
                        </span>
                        <span className="text-[11px] text-zinc-400">Customers CRM Register</span>
                    </div>
                </div>

                {/* Create Customer Modal */}
                {showCreateModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                        <div className="w-full max-w-md bg-zinc-900 border border-zinc-700/60 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-2xl">
                            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
                                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 font-khmer">
                                    <UserPlus className="w-5 h-5 text-amber-500" />
                                    ចុះឈ្មោះអតិថិជនថ្មី
                                </h3>
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <form onSubmit={handleCreateSubmit} className="space-y-3.5">
                                <div>
                                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1 font-khmer">
                                        ឈ្មោះអតិថិជន *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={createForm.name}
                                        onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                                        placeholder="ឧ. សុខ សុវណ្ណ"
                                        className="w-full h-9 px-3 bg-zinc-950 border border-zinc-700/60 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-all font-khmer"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1 font-khmer">
                                        លេខទូរស័ព្ទ
                                    </label>
                                    <input
                                        type="text"
                                        value={createForm.phone}
                                        onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                                        placeholder="ឧ. 012 345 678"
                                        className="w-full h-9 px-3 bg-zinc-950 border border-zinc-700/60 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-all font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1 font-khmer">
                                        អ៊ីមែល (ប្រសិនបើមាន)
                                    </label>
                                    <input
                                        type="email"
                                        value={createForm.email}
                                        onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                                        placeholder="customer@email.com"
                                        className="w-full h-9 px-3 bg-zinc-950 border border-zinc-700/60 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-all font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1 font-khmer">
                                        កម្រិតសមាជិក (Tier)
                                    </label>
                                    <select
                                        value={createForm.tier}
                                        onChange={(e) => setCreateForm({ ...createForm, tier: e.target.value })}
                                        className="w-full h-9 px-3 bg-zinc-950 border border-zinc-700/60 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-all cursor-pointer font-khmer"
                                    >
                                        <option value="standard">Standard (ធម្មតា)</option>
                                        <option value="silver">Silver (ប្រាក់)</option>
                                        <option value="gold">Gold (មាស)</option>
                                        <option value="vip">VIP (ពិសេស)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1 font-khmer">
                                        ចំណាំពិសេស
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={createForm.notes}
                                        onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                                        placeholder="ចំណង់ចំណូលចិត្ត ឬព័ត៌មានបន្ថែម..."
                                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700/60 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-all font-khmer"
                                    />
                                </div>

                                <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateModal(false)}
                                        className="px-4 py-2 rounded-xl text-xs text-zinc-600 dark:text-zinc-300 hover:bg-zinc-800 transition-colors cursor-pointer font-khmer"
                                    >
                                        បោះបង់
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-md shadow-amber-500/20 transition-all cursor-pointer font-khmer"
                                    >
                                        រក្សាទុក
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Edit Customer Modal */}
                {editingCustomer && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                        <div className="w-full max-w-md bg-zinc-900 border border-zinc-700/60 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-2xl">
                            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
                                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 font-khmer">
                                    <Edit2 className="w-5 h-5 text-amber-500" />
                                    កែប្រែព័ត៌មានអតិថិជន
                                </h3>
                                <button
                                    onClick={() => setEditingCustomer(null)}
                                    className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <form onSubmit={handleEditSubmit} className="space-y-3.5">
                                <div>
                                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1 font-khmer">
                                        ឈ្មោះអតិថិជន *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={editForm.name}
                                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                        className="w-full h-9 px-3 bg-zinc-950 border border-zinc-700/60 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-all font-khmer"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1 font-khmer">
                                        លេខទូរស័ព្ទ
                                    </label>
                                    <input
                                        type="text"
                                        value={editForm.phone}
                                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                        className="w-full h-9 px-3 bg-zinc-950 border border-zinc-700/60 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-all font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1 font-khmer">
                                        កម្រិតសមាជិក (Tier)
                                    </label>
                                    <select
                                        value={editForm.tier}
                                        onChange={(e) => setEditForm({ ...editForm, tier: e.target.value })}
                                        className="w-full h-9 px-3 bg-zinc-950 border border-zinc-700/60 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-all cursor-pointer font-khmer"
                                    >
                                        <option value="standard">Standard (ធម្មតា)</option>
                                        <option value="silver">Silver (ប្រាក់)</option>
                                        <option value="gold">Gold (មាស)</option>
                                        <option value="vip">VIP (ពិសេស)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1 font-khmer">
                                        ចំណាំ
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={editForm.notes}
                                        onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700/60 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-all font-khmer"
                                    />
                                </div>

                                <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
                                    <button
                                        type="button"
                                        onClick={() => setEditingCustomer(null)}
                                        className="px-4 py-2 rounded-xl text-xs text-zinc-600 dark:text-zinc-300 hover:bg-zinc-800 transition-colors cursor-pointer font-khmer"
                                    >
                                        បោះបង់
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-md shadow-amber-500/20 transition-all cursor-pointer font-khmer"
                                    >
                                        កែប្រែទិន្នន័យ
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Adjust Loyalty Points Modal */}
                {pointsCustomer && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                        <div className="w-full max-w-sm bg-zinc-900 border border-zinc-700/60 dark:border-zinc-800 rounded-2xl p-5 shadow-2xl">
                            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
                                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 font-khmer">
                                    <Coins className="w-5 h-5 text-amber-500" />
                                    កែប្រែពិន្ទុសន្សំ
                                </h3>
                                <button
                                    onClick={() => setPointsCustomer(null)}
                                    className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3 font-khmer">
                                អតិថិជន: <strong className="text-zinc-900 dark:text-zinc-100">{pointsCustomer.name}</strong> (បច្ចុប្បន្ន:{' '}
                                <span className="text-amber-600 dark:text-amber-400 font-mono font-bold">{pointsCustomer.loyalty_points} pts</span>)
                            </p>

                            <form onSubmit={handlePointsSubmit} className="space-y-3.5">
                                <div>
                                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1 font-khmer">
                                        ចំនួនពិន្ទុ (+ បន្ថែម ឬ - ដកចេញ)
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setPointsAdjustment((prev) => prev - 10)}
                                            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 border border-zinc-700/60 transition-colors cursor-pointer"
                                        >
                                            <Minus className="w-4 h-4" />
                                        </button>
                                        <input
                                            type="number"
                                            value={pointsAdjustment}
                                            onChange={(e) => setPointsAdjustment(Number(e.target.value))}
                                            className="w-full h-10 px-3 bg-zinc-950 border border-zinc-700/60 dark:border-zinc-800 rounded-xl text-center text-base font-bold font-mono text-amber-600 dark:text-amber-400 focus:outline-none focus:border-amber-500"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setPointsAdjustment((prev) => prev + 10)}
                                            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 border border-zinc-700/60 transition-colors cursor-pointer"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1 font-khmer">
                                        មូលហេតុ
                                    </label>
                                    <input
                                        type="text"
                                        value={pointsReason}
                                        onChange={(e) => setPointsReason(e.target.value)}
                                        className="w-full h-9 px-3 bg-zinc-950 border border-zinc-700/60 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500 font-khmer"
                                    />
                                </div>

                                <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
                                    <button
                                        type="button"
                                        onClick={() => setPointsCustomer(null)}
                                        className="px-4 py-2 rounded-xl text-xs text-zinc-600 dark:text-zinc-300 hover:bg-zinc-800 transition-colors cursor-pointer font-khmer"
                                    >
                                        បោះបង់
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-md shadow-amber-500/20 transition-all cursor-pointer font-khmer"
                                    >
                                        អនុវត្ត
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
