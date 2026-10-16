import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Head, router } from '@inertiajs/react';
import { AppLayout } from '@/layouts/app-layout';
import { Card } from '@/components/ui/card';
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
    ArrowLeft,
    Check,
    MapPin,
    CreditCard,
    Crown,
    Star,
    ShieldCheck,
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

const TIER_CONFIG: Record<
    string,
    { nameKh: string; color: string; badge: string; gradient: string; perk: string; discount: string }
> = {
    standard: {
        nameKh: 'Standard (ធម្មតា)',
        color: 'text-slate-500',
        badge: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20',
        gradient: 'from-slate-800 via-slate-900 to-zinc-950',
        perk: 'សន្សំពិន្ទុ 1x មូលដ្ឋាន (1$ = 1 pt)',
        discount: 'អត្រាតម្លៃទូទៅក្នុងហាង',
    },
    silver: {
        nameKh: 'Silver (ប្រាក់)',
        color: 'text-sky-500',
        badge: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
        gradient: 'from-slate-700 via-sky-950 to-zinc-950',
        perk: 'សន្សំពិន្ទុ 1.2x (1$ = 1.2 pts)',
        discount: 'បញ្ចុះតម្លៃ 3% លើមុខម្ហូប',
    },
    gold: {
        nameKh: 'Gold (មាស)',
        color: 'text-amber-500',
        badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
        gradient: 'from-amber-900/60 via-zinc-900 to-amber-950/70',
        perk: 'សន្សំពិន្ទុ 1.5x (1$ = 1.5 pts)',
        discount: 'បញ្ចុះតម្លៃ 5% លើមុខម្ហូប & កាដូថ្ងៃកំណើត',
    },
    vip: {
        nameKh: 'VIP (ពិសេស)',
        color: 'text-purple-500',
        badge: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
        gradient: 'from-purple-950 via-zinc-900 to-zinc-950',
        perk: 'សន្សំពិន្ទុ 2x (1$ = 2 pts)',
        discount: 'បញ្ចុះតម្លៃ 10% & អាទិភាពកក់តុមុនគេ',
    },
};

export default function CustomersIndex({ customers, metrics, filters }: CustomersProps) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [selectedTier, setSelectedTier] = useState(filters.tier || 'all');

    // Modals state
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [pointsCustomer, setPointsCustomer] = useState<Customer | null>(null);

    // Scroll lock and Esc key listener
    useEffect(() => {
        if (!mounted || typeof document === 'undefined') return;
        if (showCreateModal || editingCustomer || pointsCustomer) {
            const originalOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.key === 'Escape') {
                    setShowCreateModal(false);
                    setEditingCustomer(null);
                    setPointsCustomer(null);
                }
            };
            window.addEventListener('keydown', handleKeyDown);
            return () => {
                document.body.style.overflow = originalOverflow;
                window.removeEventListener('keydown', handleKeyDown);
            };
        }
    }, [showCreateModal, editingCustomer, pointsCustomer, mounted]);

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
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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

                    {/* Metric Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                        <Card className="bg-zinc-900/70 border-zinc-800/80 p-4 rounded-2xl relative overflow-hidden">
                            <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                                <span>Total Customers / អតិថិជនសរុប</span>
                                <Users className="w-4 h-4 text-sky-400" />
                            </div>
                            <div className="text-xl sm:text-2xl font-bold text-white font-mono">
                                {metrics.total_customers}
                            </div>
                            <div className="text-xs text-sky-400/90 font-khmer mt-1">
                                {metrics.total_customers} នាក់បានចុះឈ្មោះ
                            </div>
                        </Card>

                        <Card className="bg-zinc-900/70 border-zinc-800/80 p-4 rounded-2xl relative overflow-hidden">
                            <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                                <span>VIP & Gold / សមាជិកពិសេស</span>
                                <Sparkles className="w-4 h-4 text-purple-400" />
                            </div>
                            <div className="text-xl sm:text-2xl font-bold text-white font-mono">
                                {metrics.vip_customers + metrics.gold_customers}
                            </div>
                            <div className="text-xs text-purple-400/90 font-khmer mt-1">
                                VIP: {metrics.vip_customers} នាក់ • Gold: {metrics.gold_customers} នាក់
                            </div>
                        </Card>

                        <Card className="bg-zinc-900/70 border-zinc-800/80 p-4 rounded-2xl relative overflow-hidden">
                            <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                                <span>Total Points / ពិន្ទុសន្សំបច្ចុប្បន្ន</span>
                                <Coins className="w-4 h-4 text-amber-400" />
                            </div>
                            <div className="text-xl sm:text-2xl font-bold text-white font-mono">
                                {metrics.total_points.toLocaleString()}
                            </div>
                            <div className="text-xs text-amber-400/90 font-khmer mt-1">
                                ពិន្ទុអតិថិជនសរុប (Pts)
                            </div>
                        </Card>

                        <Card className="bg-zinc-900/70 border-zinc-800/80 p-4 rounded-2xl relative overflow-hidden">
                            <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                                <span>Total Spent / ចំណូលសរុប</span>
                                <TrendingUp className="w-4 h-4 text-emerald-400" />
                            </div>
                            <div className="text-xl sm:text-2xl font-bold text-white font-mono">
                                ${Number(metrics.total_spent_usd || 0).toFixed(2)}
                            </div>
                            <div className="text-xs text-emerald-400 font-mono font-medium mt-1">
                                ≈ {Math.round(Number(metrics.total_spent_usd || 0) * 4100).toLocaleString()} ៛
                            </div>
                        </Card>
                    </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    {/* Search Form */}
                    <form onSubmit={handleSearch} className="relative w-full sm:w-80 md:w-96">
                        <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="ស្វែងរកតាមឈ្មោះ, លេខទូរស័ព្ទ, ឬអ៊ីមែល..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full h-9 pl-9 pr-8 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-amber-500 transition-all font-khmer"
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
                                            : 'bg-zinc-900 border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-850'
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
                <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/70 overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-zinc-950/60 border-b border-zinc-800 text-zinc-500 dark:text-zinc-400 uppercase font-mono text-[10px] whitespace-nowrap tracking-wider">
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
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-800 shadow-2xs">
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
                                                        className="p-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white border border-zinc-800 transition-all cursor-pointer shadow-2xs active:scale-95"
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
                    <div className="px-4 py-2.5 bg-zinc-950/60 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                        <span>
                            បង្ហាញ {customers.data.length} ក្នុងចំណោម {customers.total || customers.data.length} អតិថិជន
                        </span>
                        <span className="text-[11px] text-zinc-400">Customers CRM Register</span>
                    </div>
                </div>

                {/* Create Customer Modal (Full-Workspace 2-Column Layout) */}
                {mounted && showCreateModal && createPortal(
                    <div
                        className="fixed inset-y-0 right-0 left-0 md:left-[var(--sidebar-width,16rem)] z-50 flex flex-col bg-zinc-50 dark:bg-zinc-950 overflow-hidden select-none animate-in fade-in duration-150 h-screen"
                        onWheel={(e) => e.stopPropagation()}
                    >
                        {/* Top Header Bar */}
                        <div className="shrink-0 h-16 px-4 sm:px-6 border-b border-slate-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md flex items-center justify-between z-10 shadow-xs">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
                                    <UserPlus className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-base font-bold text-slate-900 dark:text-zinc-100 font-khmer">
                                            ចុះឈ្មោះអតិថិជនថ្មី
                                        </h2>
                                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-medium">
                                            New Customer CRM
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-zinc-400 font-khmer">
                                        បញ្ចូលព័ត៌មានអតិថិជន និងរៀបចំកម្រិតសមាជិកភាព Loyalty
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => setShowCreateModal(false)}
                                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-950 dark:hover:text-white transition-all shadow-xs cursor-pointer"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                <span className="font-khmer">ត្រឡប់ក្រោយ</span>
                                <span className="hidden sm:inline-block ml-1 px-1.5 py-0.5 text-[10px] uppercase font-mono rounded bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400">
                                    Esc
                                </span>
                            </button>
                        </div>

                        {/* Form Workspace Content */}
                        <form onSubmit={handleCreateSubmit} className="flex-1 min-h-0 flex flex-col">
                            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6">
                                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5">
                                    {/* Left Column: Personal Info & Tier (7 cols) */}
                                    <div className="lg:col-span-7 space-y-4">
                                        {/* Contact & Identity Details */}
                                        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs space-y-3.5">
                                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5 font-khmer">
                                                <Users className="w-4 h-4 text-amber-500" />
                                                ព័ត៌មានអត្តសញ្ញាណអតិថិជន
                                            </h3>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                                <div className="sm:col-span-2">
                                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-300 mb-1 font-khmer">
                                                        ឈ្មោះអតិថិជន *
                                                    </label>
                                                    <input
                                                        type="text"
                                                        required
                                                        placeholder="ឧ. សុខ សុវណ្ណ ឬ Mr. John"
                                                        value={createForm.name}
                                                        onChange={(e) =>
                                                            setCreateForm({ ...createForm, name: e.target.value })
                                                        }
                                                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500 font-khmer transition-all"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-300 mb-1 font-khmer">
                                                        លេខទូរស័ព្ទ (Phone Number)
                                                    </label>
                                                    <div className="relative">
                                                        <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                                        <input
                                                            type="text"
                                                            placeholder="012 345 678"
                                                            value={createForm.phone}
                                                            onChange={(e) =>
                                                                setCreateForm({ ...createForm, phone: e.target.value })
                                                            }
                                                            className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm font-mono text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500 transition-all"
                                                        />
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-300 mb-1 font-khmer">
                                                        អ៊ីមែល (Email)
                                                    </label>
                                                    <div className="relative">
                                                        <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                                        <input
                                                            type="email"
                                                            placeholder="customer@email.com"
                                                            value={createForm.email}
                                                            onChange={(e) =>
                                                                setCreateForm({ ...createForm, email: e.target.value })
                                                            }
                                                            className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm font-mono text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500 transition-all"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="sm:col-span-2">
                                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-300 mb-1 font-khmer">
                                                        អាសយដ្ឋាន / ទីតាំងដឹកជញ្ជូន
                                                    </label>
                                                    <div className="relative">
                                                        <MapPin className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                                                        <input
                                                            type="text"
                                                            placeholder="ឧ. ផ្ទះលេខ ១២ ផ្លូវ ២០០ រាជធានីភ្នំពេញ..."
                                                            value={createForm.address}
                                                            onChange={(e) =>
                                                                setCreateForm({ ...createForm, address: e.target.value })
                                                            }
                                                            className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500 font-khmer transition-all"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Membership Tier Picker */}
                                        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs space-y-3">
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5 font-khmer">
                                                    <Award className="w-4 h-4 text-amber-500" />
                                                    កម្រិតសមាជិកភាព (Membership Tier) *
                                                </label>
                                                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 font-khmer">
                                                    {TIER_CONFIG[createForm.tier]?.nameKh}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                                {Object.entries(TIER_CONFIG).map(([tierKey, config]) => {
                                                    const isSelected = createForm.tier === tierKey;
                                                    return (
                                                        <button
                                                            key={tierKey}
                                                            type="button"
                                                            onClick={() => setCreateForm({ ...createForm, tier: tierKey })}
                                                            className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between min-h-[82px] cursor-pointer ${
                                                                isSelected
                                                                    ? 'bg-amber-500/10 border-amber-500 ring-1 ring-amber-500/30 shadow-xs'
                                                                    : 'bg-slate-50 dark:bg-zinc-950/60 border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 hover:bg-slate-100/70 dark:hover:bg-zinc-800/40'
                                                            }`}
                                                        >
                                                            <div className="flex items-center justify-between w-full">
                                                                <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-400 dark:text-zinc-500">
                                                                    {tierKey}
                                                                </span>
                                                                {isSelected && (
                                                                    <Check className="w-3.5 h-3.5 text-amber-500" />
                                                                )}
                                                            </div>
                                                            <div>
                                                                <div className="text-xs font-bold font-khmer text-slate-900 dark:text-zinc-100">
                                                                    {config.nameKh}
                                                                </div>
                                                                <div className="text-[10px] text-slate-500 dark:text-zinc-400 font-khmer mt-0.5 line-clamp-1">
                                                                    {config.discount}
                                                                </div>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Notes & Special Preferences */}
                                        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs space-y-2">
                                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 font-khmer">
                                                ចំណាំពិសេស / ចំណង់ចំណូលចិត្ត (Preferences & Notes)
                                            </label>
                                            <textarea
                                                rows={2}
                                                placeholder="ឧ. ចូលចិត្តហឹរតិច, តុជិតកញ្ចក់, អាឡែកហ្ស៊ីអាហារសមុទ្រ..."
                                                value={createForm.notes}
                                                onChange={(e) =>
                                                    setCreateForm({ ...createForm, notes: e.target.value })
                                                }
                                                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500 font-khmer transition-all"
                                            />
                                        </div>
                                    </div>

                                    {/* Right Column: Live Membership Loyalty Card Preview (5 cols) */}
                                    <div className="lg:col-span-5 space-y-4">
                                        {/* Loyalty Card Visual Display */}
                                        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5 font-khmer">
                                                    <CreditCard className="w-4 h-4 text-amber-500" />
                                                    ប័ណ្ណសមាជិកភាពឌីជីថល (Live Preview)
                                                </span>
                                                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-bold">
                                                    ACTIVE
                                                </span>
                                            </div>

                                            {/* Stylized VIP Card */}
                                            <div
                                                className={`relative rounded-2xl p-5 text-white overflow-hidden shadow-xl border border-white/10 bg-linear-to-br ${
                                                    TIER_CONFIG[createForm.tier]?.gradient || 'from-slate-800 to-zinc-950'
                                                }`}
                                            >
                                                {/* Ambient Glow */}
                                                <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-amber-500/20 blur-2xl pointer-events-none" />

                                                <div className="relative z-10 flex items-start justify-between mb-8">
                                                    <div>
                                                        <div className="text-[11px] uppercase tracking-widest text-amber-400 font-mono font-bold">
                                                            LEASHAL ETUM POS
                                                        </div>
                                                        <div className="text-xs text-white/70 font-khmer">
                                                            ប័ណ្ណសមាជិកភាពអតិថិជន
                                                        </div>
                                                    </div>
                                                    <div className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase bg-white/10 backdrop-blur-md border border-white/20 text-amber-300">
                                                        {createForm.tier.toUpperCase()} TIER
                                                    </div>
                                                </div>

                                                <div className="relative z-10 space-y-2">
                                                    <div className="text-lg sm:text-xl font-bold tracking-wide truncate">
                                                        {createForm.name || 'ឈ្មោះអតិថិជន'}
                                                    </div>
                                                    <div className="flex items-center justify-between text-xs text-white/70 font-mono">
                                                        <span>{createForm.phone || '012 XXX XXX'}</span>
                                                        <span className="text-amber-400 font-bold">0 pts</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Tier Privileges Summary */}
                                        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs space-y-3">
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5 font-khmer">
                                                <Sparkles className="w-4 h-4 text-amber-500" />
                                                អត្ថប្រយោជន៍កម្រិត {TIER_CONFIG[createForm.tier]?.nameKh}
                                            </h4>

                                            <div className="space-y-2.5 text-xs">
                                                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 flex items-start gap-2.5">
                                                    <Coins className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                                    <div>
                                                        <span className="font-bold text-slate-900 dark:text-zinc-100 font-khmer">អត្រាសន្សំពិន្ទុ:</span>
                                                        <p className="text-slate-500 dark:text-zinc-400 font-khmer mt-0.5">
                                                            {TIER_CONFIG[createForm.tier]?.perk}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 flex items-start gap-2.5">
                                                    <Award className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                                    <div>
                                                        <span className="font-bold text-slate-900 dark:text-zinc-100 font-khmer">ការបញ្ចុះតម្លៃពិសេស:</span>
                                                        <p className="text-slate-500 dark:text-zinc-400 font-khmer mt-0.5">
                                                            {TIER_CONFIG[createForm.tier]?.discount}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Bottom Fixed Action Footer */}
                            <div className="shrink-0 p-4 sm:px-6 border-t border-slate-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg z-10">
                                <div className="text-xs text-slate-500 dark:text-zinc-400 flex items-center gap-2 font-khmer">
                                    <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                                    <span>
                                        ទិន្នន័យអតិថិជននឹងត្រូវភ្ជាប់ជាមួយប្រព័ន្ធ POS ដើម្បីសន្សំពិន្ទុ និងផ្ដល់ការបញ្ចុះតម្លៃស្វ័យប្រវត្តិ
                                    </span>
                                </div>

                                <div className="flex items-center justify-end gap-2.5">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateModal(false)}
                                        className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 transition-all cursor-pointer font-khmer"
                                    >
                                        បោះបង់
                                    </button>
                                    <button
                                        type="submit"
                                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-md shadow-amber-500/20 transition-all cursor-pointer font-khmer"
                                    >
                                        <CheckCircle2 className="w-4 h-4" />
                                        <span>រក្សាទុកអតិថិជន</span>
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>,
                    document.body
                )}

                {/* Edit Customer Modal (Full-Workspace 2-Column Layout) */}
                {mounted && editingCustomer && createPortal(
                    <div
                        className="fixed inset-y-0 right-0 left-0 md:left-[var(--sidebar-width,16rem)] z-50 flex flex-col bg-zinc-50 dark:bg-zinc-950 overflow-hidden select-none animate-in fade-in duration-150 h-screen"
                        onWheel={(e) => e.stopPropagation()}
                    >
                        {/* Top Header Bar */}
                        <div className="shrink-0 h-16 px-4 sm:px-6 border-b border-slate-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md flex items-center justify-between z-10 shadow-xs">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
                                    <Edit2 className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-base font-bold text-slate-900 dark:text-zinc-100 font-khmer">
                                            កែប្រែព័ត៌មានអតិថិជន
                                        </h2>
                                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-medium">
                                            ID #{editingCustomer.id}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-zinc-400 font-khmer">
                                        ធ្វើបច្ចុប្បន្នភាពព័ត៌មានទំនាក់ទំនង និងកម្រិតសមាជិកភាព
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => setEditingCustomer(null)}
                                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-950 dark:hover:text-white transition-all shadow-xs cursor-pointer"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                <span className="font-khmer">ត្រឡប់ក្រោយ</span>
                                <span className="hidden sm:inline-block ml-1 px-1.5 py-0.5 text-[10px] uppercase font-mono rounded bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400">
                                    Esc
                                </span>
                            </button>
                        </div>

                        {/* Form Workspace Content */}
                        <form onSubmit={handleEditSubmit} className="flex-1 min-h-0 flex flex-col">
                            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6">
                                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5">
                                    {/* Left Column: Editable Fields (7 cols) */}
                                    <div className="lg:col-span-7 space-y-4">
                                        {/* Contact & Identity Details */}
                                        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs space-y-3.5">
                                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5 font-khmer">
                                                <Users className="w-4 h-4 text-amber-500" />
                                                ព័ត៌មានអត្តសញ្ញាណ
                                            </h3>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                                <div className="sm:col-span-2">
                                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-300 mb-1 font-khmer">
                                                        ឈ្មោះអតិថិជន *
                                                    </label>
                                                    <input
                                                        type="text"
                                                        required
                                                        value={editForm.name}
                                                        onChange={(e) =>
                                                            setEditForm({ ...editForm, name: e.target.value })
                                                        }
                                                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500 font-khmer transition-all"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-300 mb-1 font-khmer">
                                                        លេខទូរស័ព្ទ
                                                    </label>
                                                    <div className="relative">
                                                        <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                                        <input
                                                            type="text"
                                                            value={editForm.phone}
                                                            onChange={(e) =>
                                                                setEditForm({ ...editForm, phone: e.target.value })
                                                            }
                                                            className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm font-mono text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500 transition-all"
                                                        />
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-300 mb-1 font-khmer">
                                                        អ៊ីមែល
                                                    </label>
                                                    <div className="relative">
                                                        <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                                        <input
                                                            type="email"
                                                            value={editForm.email}
                                                            onChange={(e) =>
                                                                setEditForm({ ...editForm, email: e.target.value })
                                                            }
                                                            className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm font-mono text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500 transition-all"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="sm:col-span-2">
                                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-300 mb-1 font-khmer">
                                                        អាសយដ្ឋាន
                                                    </label>
                                                    <div className="relative">
                                                        <MapPin className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                                                        <input
                                                            type="text"
                                                            value={editForm.address}
                                                            onChange={(e) =>
                                                                setEditForm({ ...editForm, address: e.target.value })
                                                            }
                                                            className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500 font-khmer transition-all"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Membership Tier Picker */}
                                        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs space-y-3">
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5 font-khmer">
                                                    <Award className="w-4 h-4 text-amber-500" />
                                                    កម្រិតសមាជិកភាព *
                                                </label>
                                                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 font-khmer">
                                                    {TIER_CONFIG[editForm.tier]?.nameKh}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                                {Object.entries(TIER_CONFIG).map(([tierKey, config]) => {
                                                    const isSelected = editForm.tier === tierKey;
                                                    return (
                                                        <button
                                                            key={tierKey}
                                                            type="button"
                                                            onClick={() => setEditForm({ ...editForm, tier: tierKey })}
                                                            className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between min-h-[82px] cursor-pointer ${
                                                                isSelected
                                                                    ? 'bg-amber-500/10 border-amber-500 ring-1 ring-amber-500/30 shadow-xs'
                                                                    : 'bg-slate-50 dark:bg-zinc-950/60 border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 hover:bg-slate-100/70 dark:hover:bg-zinc-800/40'
                                                            }`}
                                                        >
                                                            <div className="flex items-center justify-between w-full">
                                                                <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-400 dark:text-zinc-500">
                                                                    {tierKey}
                                                                </span>
                                                                {isSelected && (
                                                                    <Check className="w-3.5 h-3.5 text-amber-500" />
                                                                )}
                                                            </div>
                                                            <div>
                                                                <div className="text-xs font-bold font-khmer text-slate-900 dark:text-zinc-100">
                                                                    {config.nameKh}
                                                                </div>
                                                                <div className="text-[10px] text-slate-500 dark:text-zinc-400 font-khmer mt-0.5 line-clamp-1">
                                                                    {config.discount}
                                                                </div>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Notes */}
                                        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs space-y-2">
                                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 font-khmer">
                                                ចំណាំពិសេស / Preferences
                                            </label>
                                            <textarea
                                                rows={2}
                                                value={editForm.notes}
                                                onChange={(e) =>
                                                    setEditForm({ ...editForm, notes: e.target.value })
                                                }
                                                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500 font-khmer transition-all"
                                            />
                                        </div>
                                    </div>

                                    {/* Right Column: Customer Card & History Stats (5 cols) */}
                                    <div className="lg:col-span-5 space-y-4">
                                        {/* Membership Card Preview */}
                                        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5 font-khmer">
                                                    <CreditCard className="w-4 h-4 text-amber-500" />
                                                    ប័ណ្ណសមាជិកភាពឌីជីថល
                                                </span>
                                                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold">
                                                    VERIFIED
                                                </span>
                                            </div>

                                            <div
                                                className={`relative rounded-2xl p-5 text-white overflow-hidden shadow-xl border border-white/10 bg-linear-to-br ${
                                                    TIER_CONFIG[editForm.tier]?.gradient || 'from-slate-800 to-zinc-950'
                                                }`}
                                            >
                                                <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-amber-500/20 blur-2xl pointer-events-none" />

                                                <div className="relative z-10 flex items-start justify-between mb-8">
                                                    <div>
                                                        <div className="text-[11px] uppercase tracking-widest text-amber-400 font-mono font-bold">
                                                            LEASHAL ETUM POS
                                                        </div>
                                                        <div className="text-xs text-white/70 font-khmer">
                                                            ប័ណ្ណសមាជិកភាពអតិថិជន
                                                        </div>
                                                    </div>
                                                    <div className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase bg-white/10 backdrop-blur-md border border-white/20 text-amber-300">
                                                        {editForm.tier.toUpperCase()} TIER
                                                    </div>
                                                </div>

                                                <div className="relative z-10 space-y-2">
                                                    <div className="text-lg sm:text-xl font-bold tracking-wide truncate">
                                                        {editForm.name || editingCustomer.name}
                                                    </div>
                                                    <div className="flex items-center justify-between text-xs text-white/70 font-mono">
                                                        <span>{editForm.phone || editingCustomer.phone || '-'}</span>
                                                        <span className="text-amber-400 font-bold">
                                                            {editingCustomer.loyalty_points} pts
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Customer Historical Stats */}
                                        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs space-y-3">
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5 font-khmer">
                                                <TrendingUp className="w-4 h-4 text-amber-500" />
                                                ស្ថិតិការប្រើប្រាស់ & ប្រវត្តិទិញ
                                            </h4>

                                            <div className="grid grid-cols-3 gap-2 text-center">
                                                <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800">
                                                    <div className="text-lg font-bold font-mono text-amber-600 dark:text-amber-400">
                                                        {editingCustomer.loyalty_points}
                                                    </div>
                                                    <div className="text-[10px] text-slate-500 dark:text-zinc-400 font-khmer mt-0.5">
                                                        ពិន្ទុសន្សំ
                                                    </div>
                                                </div>
                                                <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800">
                                                    <div className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                                                        ${Number(editingCustomer.total_spent_usd || 0).toFixed(2)}
                                                    </div>
                                                    <div className="text-[10px] text-slate-500 dark:text-zinc-400 font-khmer mt-0.5">
                                                        ចំណាយសរុប
                                                    </div>
                                                </div>
                                                <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800">
                                                    <div className="text-lg font-bold font-mono text-sky-600 dark:text-sky-400">
                                                        {editingCustomer.visits_count || 0}
                                                    </div>
                                                    <div className="text-[10px] text-slate-500 dark:text-zinc-400 font-khmer mt-0.5">
                                                        ចំនួនលើកមកញ៉ាំ
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Bottom Fixed Action Footer */}
                            <div className="shrink-0 p-4 sm:px-6 border-t border-slate-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg z-10">
                                <div className="text-xs text-slate-500 dark:text-zinc-400 flex items-center gap-2 font-khmer">
                                    <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                                    <span>
                                        ការកែប្រែកម្រិតសមាជិកភាពនឹងចូលជាធរមានភ្លាមៗសម្រាប់ការបញ្ជាទិញបន្ទាប់
                                    </span>
                                </div>

                                <div className="flex items-center justify-end gap-2.5">
                                    <button
                                        type="button"
                                        onClick={() => setEditingCustomer(null)}
                                        className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 transition-all cursor-pointer font-khmer"
                                    >
                                        បោះបង់
                                    </button>
                                    <button
                                        type="submit"
                                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-md shadow-amber-500/20 transition-all cursor-pointer font-khmer"
                                    >
                                        <CheckCircle2 className="w-4 h-4" />
                                        <span>រក្សាទុកការកែប្រែ</span>
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>,
                    document.body
                )}

                {/* Adjust Loyalty Points Full-Workspace Suite */}
                {mounted && pointsCustomer && createPortal(
                    <div
                        className="fixed inset-y-0 right-0 left-0 md:left-[var(--sidebar-width,16rem)] z-50 flex flex-col bg-zinc-50 dark:bg-zinc-950 overflow-hidden select-none animate-in fade-in duration-150 h-screen"
                        onWheel={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="px-6 py-3.5 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between shrink-0 shadow-xs">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-xs shrink-0">
                                    <Coins className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-base font-bold text-zinc-900 dark:text-white font-khmer">
                                            កែសម្រួលពិន្ទុសន្សំអតិថិជន
                                        </h3>
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 font-mono">
                                            Points Adjustment
                                        </span>
                                    </div>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-khmer">
                                        អតិថិជន៖ <strong className="text-zinc-900 dark:text-white">{pointsCustomer.name}</strong> • សមតុល្យបច្ចុប្បន្ន៖ <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{pointsCustomer.loyalty_points} pts</span>
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setPointsCustomer(null)}
                                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-950 dark:hover:text-white transition-all cursor-pointer font-khmer text-xs font-semibold shadow-xs group"
                                title="ត្រឡប់ក្រោយ (Esc)"
                            >
                                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform text-amber-600 dark:text-amber-400" />
                                <span>ត្រឡប់ក្រោយ</span>
                            </button>
                        </div>

                        {/* Body - 2 Columns (7 / 5) */}
                        <form onSubmit={handlePointsSubmit} className="flex flex-col flex-1 min-h-0 overflow-y-auto">
                            <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1">
                                {/* LEFT COLUMN: Points Adjustment Form (7 cols) */}
                                <div className="lg:col-span-7 space-y-4">
                                    {/* Stepper Card */}
                                    <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-xs">
                                        <div className="flex items-center gap-2 text-xs font-bold text-zinc-800 dark:text-zinc-200 font-khmer pb-1 border-b border-zinc-100 dark:border-zinc-800">
                                            <Coins className="w-4 h-4 text-amber-500" />
                                            <span>កំណត់ចំនួនពិន្ទុកែសម្រួល / Points Adjustment Quantity</span>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setPointsAdjustment((prev) => prev - 10)}
                                                    className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 hover:bg-rose-500/10 hover:text-rose-500 dark:hover:bg-rose-500/10 dark:hover:text-rose-400 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-xs"
                                                    title="ដក 10 ពិន្ទុ"
                                                >
                                                    <Minus className="w-5 h-5" />
                                                </button>
                                                <div className="relative flex-1">
                                                    <input
                                                        type="number"
                                                        value={pointsAdjustment}
                                                        onChange={(e) => setPointsAdjustment(Number(e.target.value))}
                                                        className="w-full h-12 px-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-2xl text-center text-xl font-bold font-mono text-amber-600 dark:text-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                                                    />
                                                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-zinc-400">
                                                        pts
                                                    </span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setPointsAdjustment((prev) => prev + 10)}
                                                    className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 hover:bg-emerald-500/10 hover:text-emerald-500 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-xs"
                                                    title="បន្ថែម 10 ពិន្ទុ"
                                                >
                                                    <Plus className="w-5 h-5" />
                                                </button>
                                            </div>

                                            {/* Quick Increment Pills */}
                                            <div className="space-y-1.5 pt-1">
                                                <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 font-khmer block">
                                                    ចុចជ្រើសរើសបរិមាណរហ័ស (Quick Delta Values)៖
                                                </span>
                                                <div className="flex flex-wrap gap-2">
                                                    {[-100, -50, -25, -10, 10, 25, 50, 100, 250, 500].map((val) => (
                                                        <button
                                                            key={val}
                                                            type="button"
                                                            onClick={() => setPointsAdjustment(val)}
                                                            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
                                                                pointsAdjustment === val
                                                                    ? val > 0
                                                                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-xs'
                                                                        : 'bg-rose-500 text-white border-rose-500 shadow-xs'
                                                                    : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-amber-500/50'
                                                            }`}
                                                        >
                                                            {val > 0 ? `+${val}` : val}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Reason Card with Quick Presets */}
                                    <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-xs">
                                        <div className="flex items-center justify-between pb-1 border-b border-zinc-100 dark:border-zinc-800">
                                            <div className="flex items-center gap-2 text-xs font-bold text-zinc-800 dark:text-zinc-200 font-khmer">
                                                <Edit2 className="w-4 h-4 text-amber-500" />
                                                <span>មូលហេតុនៃការកែប្រែ (Adjustment Reason)</span>
                                                <span className="text-rose-500">*</span>
                                            </div>
                                        </div>

                                        <input
                                            type="text"
                                            required
                                            value={pointsReason}
                                            onChange={(e) => setPointsReason(e.target.value)}
                                            placeholder="ឧទាហរណ៍៖ កាដូលួងចិត្តអតិថិជន, រង្វាន់ខួបកំណើត VIP..."
                                            className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 font-khmer transition-all"
                                        />

                                        {/* Quick Reason Presets */}
                                        <div className="space-y-1.5 pt-1">
                                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 font-khmer">
                                                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                                <span>គំរូមូលហេតុរហ័ស (Quick Presets)៖</span>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {[
                                                    'កាដូលួងចិត្តអតិថិជន (Customer Courtesy)',
                                                    'រង្វាន់ពិសេសសម្រាប់អតិថិជន VIP (VIP Bonus)',
                                                    'កែតម្រូវកំហុសឆ្គងបច្ចេកទេស (Correction of Discrepancy)',
                                                    'បំពេញបន្ថែមពីកម្មវិធីប្រូម៉ូសិន (Campaign Promotion)',
                                                ].map((preset, idx) => (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        onClick={() => setPointsReason(preset)}
                                                        className="px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/90 hover:border-amber-500/40 hover:bg-amber-500/5 text-zinc-700 dark:text-zinc-300 text-[11px] font-khmer transition-all cursor-pointer text-left"
                                                    >
                                                        {preset}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Security & Audit Notice */}
                                    <div className="p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 space-y-1.5 text-xs">
                                        <div className="flex items-center gap-2 font-bold text-zinc-800 dark:text-zinc-200 font-khmer">
                                            <ShieldCheck className="w-4 h-4 text-amber-500" />
                                            <span>កំណត់ហេតុសវនកម្ម (Audit Log Verification)</span>
                                        </div>
                                        <p className="text-zinc-600 dark:text-zinc-400 text-[11px] font-khmer leading-relaxed">
                                            រាល់ការបន្ថែម ឬដកពិន្ទុ នឹងត្រូវរក្សាទុកក្នុងប្រវត្តិគណនីអតិថិជន និងប្រព័ន្ធសវនកម្មរដ្ឋបាលជាអចិន្ត្រៃយ៍ ដើម្បីភាពច្បាស់លាស់ និងតម្លាភាពក្នុងការគ្រប់គ្រង។
                                        </p>
                                    </div>
                                </div>

                                {/* RIGHT COLUMN: Membership Pass & Points Transition (5 cols) */}
                                <div className="lg:col-span-5 space-y-4">
                                    <div className="sticky top-4 space-y-4">
                                        {/* Digital Member Card */}
                                        <div className={`rounded-2xl border p-5 space-y-4 shadow-sm relative overflow-hidden bg-gradient-to-br ${TIER_CONFIG[pointsCustomer.tier]?.gradient || 'from-zinc-800 to-zinc-950'} border-amber-500/30 text-white`}>
                                            {/* Watermark */}
                                            <div className="absolute -right-6 -bottom-6 opacity-10 pointer-events-none">
                                                <Award className="w-40 h-40 text-amber-400" />
                                            </div>

                                            {/* Top Banner */}
                                            <div className="flex items-center justify-between border-b border-white/10 pb-3">
                                                <div className="space-y-0.5">
                                                    <span className="text-[10px] font-mono tracking-widest uppercase text-white/70">
                                                        LOYALTY MEMBERSHIP CARD
                                                    </span>
                                                    <h4 className="text-sm font-bold text-white font-khmer">
                                                        {pointsCustomer.name}
                                                    </h4>
                                                </div>
                                                <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-white/10 text-amber-300 border border-white/20">
                                                    {pointsCustomer.tier} TIER
                                                </span>
                                            </div>

                                            {/* Transition Display */}
                                            <div className="p-4 rounded-xl bg-black/40 border border-white/10 grid grid-cols-2 gap-3 text-center">
                                                <div className="space-y-0.5 border-r border-white/10 pr-2">
                                                    <span className="text-[10px] text-white/60 font-khmer block">ពិន្ទុបច្ចុប្បន្ន</span>
                                                    <span className="text-lg font-bold font-mono text-white">
                                                        {pointsCustomer.loyalty_points}
                                                    </span>
                                                    <span className="text-[10px] text-white/40 font-mono block">pts</span>
                                                </div>
                                                <div className="space-y-0.5 pl-2">
                                                    <span className="text-[10px] text-amber-300 font-khmer block">ពិន្ទុក្រោយកែប្រែ</span>
                                                    <span className="text-lg font-bold font-mono text-amber-400">
                                                        {Math.max(0, pointsCustomer.loyalty_points + pointsAdjustment)}
                                                    </span>
                                                    <span className="text-[10px] text-amber-300/60 font-mono block">pts</span>
                                                </div>
                                            </div>

                                            {/* Delta indicator */}
                                            <div className="flex items-center justify-between text-xs font-mono px-1">
                                                <span className="text-white/70 font-khmer">ការប្រែប្រួលសុទ្ធ (Net Delta)៖</span>
                                                <span className={`font-bold ${pointsAdjustment >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                    {pointsAdjustment >= 0 ? `+${pointsAdjustment}` : pointsAdjustment} pts
                                                </span>
                                            </div>

                                            {/* Details Grid */}
                                            <div className="space-y-2 text-xs border-t border-white/10 pt-3">
                                                <div className="flex items-center justify-between text-white/70">
                                                    <span className="font-khmer">លេខទូរស័ព្ទ៖</span>
                                                    <span className="text-white font-mono">{pointsCustomer.phone || '—'}</span>
                                                </div>
                                                <div className="flex items-center justify-between text-white/70">
                                                    <span className="font-khmer">អត្ថប្រយោជន៍កម្រិត៖</span>
                                                    <span className="text-amber-300 text-[11px] font-khmer">{TIER_CONFIG[pointsCustomer.tier]?.perk || '—'}</span>
                                                </div>
                                                <div className="flex items-center justify-between text-white/70">
                                                    <span className="font-khmer">តម្លៃប្តូរប្រហាក់ប្រហែល៖</span>
                                                    <span className="text-emerald-400 font-mono font-bold">
                                                        ≈ ${(Math.max(0, pointsCustomer.loyalty_points + pointsAdjustment) * 0.01).toFixed(2)} USD
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer Bar */}
                            <div className="px-6 py-3.5 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between shrink-0 shadow-sm">
                                <div className="text-xs text-zinc-500 font-khmer hidden sm:flex items-center gap-2">
                                    <kbd className="px-2 py-0.5 text-[10px] font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded border border-zinc-300 dark:border-zinc-700">
                                        Esc
                                    </kbd>
                                    <span>ដើម្បីត្រឡប់ក្រោយ / បោះបង់</span>
                                </div>

                                <div className="flex items-center gap-3 ml-auto">
                                    <button
                                        type="button"
                                        onClick={() => setPointsCustomer(null)}
                                        className="px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-xs font-semibold font-khmer transition-all cursor-pointer shadow-xs"
                                    >
                                        បោះបង់
                                    </button>

                                    <button
                                        type="submit"
                                        disabled={!pointsReason.trim()}
                                        className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold font-khmer shadow-sm hover:shadow-amber-500/30 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Coins className="w-4 h-4" />
                                        <span>អនុវត្តការកែប្រែពិន្ទុ (Save Points Adjustment)</span>
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
