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

    const getTierBadge = (tier: string) => {
        switch (tier) {
            case 'vip':
                return (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                        VIP
                    </span>
                );
            case 'gold':
                return (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 text-amber-400" />
                        Gold
                    </span>
                );
            case 'silver':
                return (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-zinc-700/60 text-zinc-300 border border-zinc-600 flex items-center gap-1">
                        Silver
                    </span>
                );
            default:
                return (
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-800 text-zinc-400 border border-zinc-700 flex items-center gap-1">
                        Standard
                    </span>
                );
        }
    };

    return (
        <AppLayout title="Customers & Loyalty (CRM)">
            <Head title="Customers & Loyalty (CRM) — អតិថិជន & ពិន្ទុសន្សំ" />

            <div className="space-y-6 pb-12">
                {/* Fixed / Sticky Header */}
                <div className="sticky top-0 z-30 -mx-4 -mt-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 py-3.5 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80 shadow-md">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
                                <Users className="w-5 h-5" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
                                    Customers & Loyalty (CRM)
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-medium">
                                        ប្រព័ន្ធសមាជិក
                                    </span>
                                </h1>
                                <p className="text-xs text-zinc-400">
                                    គ្រប់គ្រងប្រវត្តិអតិថិជន ពិន្ទុសន្សំ Loyalty Rewards និងកម្រិតសមាជិក VIP
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-zinc-950 flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all"
                            >
                                <UserPlus className="w-4 h-4" />
                                <span>ចុះឈ្មោះអតិថិជនថ្មី</span>
                            </button>
                        </div>
                    </div>

                    {/* KPI Metrics Summary Strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                        <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800/80">
                            <span className="text-[11px] text-zinc-400">អតិថិជនសរុប</span>
                            <p className="text-lg font-bold text-zinc-100 mt-0.5">{metrics.total_customers}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800/80">
                            <span className="text-[11px] text-purple-400 flex items-center gap-1">
                                <Sparkles className="w-3 h-3" /> សមាជិក VIP & Gold
                            </span>
                            <p className="text-lg font-bold text-purple-300 mt-0.5">
                                {metrics.vip_customers + metrics.gold_customers}
                            </p>
                        </div>
                        <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800/80">
                            <span className="text-[11px] text-amber-400 flex items-center gap-1">
                                <Coins className="w-3 h-3" /> ពិន្ទុសន្សំសរុប
                            </span>
                            <p className="text-lg font-bold text-amber-300 mt-0.5">
                                {metrics.total_points.toLocaleString()} pts
                            </p>
                        </div>
                        <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800/80">
                            <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" /> ចំណូលសរុប
                            </span>
                            <p className="text-lg font-bold text-emerald-300 mt-0.5">
                                ${metrics.total_spent_usd.toFixed(2)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <form onSubmit={handleSearch} className="relative w-full sm:w-80">
                        <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="ស្វែងរកតាមឈ្មោះ, លេខទូរស័ព្ទ..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-amber-500"
                        />
                    </form>

                    <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1">
                        {['all', 'vip', 'gold', 'silver', 'standard'].map((t) => (
                            <button
                                key={t}
                                onClick={() => handleTierFilter(t)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all border ${
                                    selectedTier === t
                                        ? 'bg-amber-500 text-zinc-950 border-amber-400 font-semibold'
                                        : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-850'
                                }`}
                            >
                                {t === 'all' ? 'ទាំងអស់' : t.toUpperCase()}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Customers Table */}
                <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/70 overflow-hidden shadow-lg">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-zinc-950/60 text-zinc-400 border-b border-zinc-800 uppercase text-[10px] tracking-wider">
                                <tr>
                                    <th className="py-3 px-4">ឈ្មោះអតិថិជន</th>
                                    <th className="py-3 px-4">កម្រិត (Tier)</th>
                                    <th className="py-3 px-4">ពិន្ទុសន្សំ (Points)</th>
                                    <th className="py-3 px-4">ចំណាយសរុប</th>
                                    <th className="py-3 px-4">ចំនួនមកញ៉ាំ</th>
                                    <th className="py-3 px-4">កំណត់ចំណាំ</th>
                                    <th className="py-3 px-4 text-right">សកម្មភាព</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/60 text-zinc-200">
                                {customers.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-12 text-center text-zinc-500">
                                            រកមិនឃើញទិន្នន័យអតិថិជនទេ
                                        </td>
                                    </tr>
                                ) : (
                                    customers.data.map((c) => (
                                        <tr key={c.id} className="hover:bg-zinc-800/40 transition-colors">
                                            <td className="py-3 px-4">
                                                <div className="font-semibold text-zinc-100">{c.name}</div>
                                                <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-0.5">
                                                    {c.phone && (
                                                        <span className="flex items-center gap-1">
                                                            <Phone className="w-3 h-3 text-zinc-500" />
                                                            {c.phone}
                                                        </span>
                                                    )}
                                                    {c.email && (
                                                        <span className="flex items-center gap-1">
                                                            <Mail className="w-3 h-3 text-zinc-500" />
                                                            {c.email}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-3 px-4">{getTierBadge(c.tier)}</td>
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-amber-300 font-mono text-sm">
                                                        {c.loyalty_points}
                                                    </span>
                                                    <button
                                                        onClick={() => {
                                                            setPointsCustomer(c);
                                                            setPointsAdjustment(10);
                                                        }}
                                                        className="px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] border border-zinc-700"
                                                        title="កែប្រែពិន្ទុ (Adjust Points)"
                                                    >
                                                        + / -
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 font-mono font-medium text-emerald-400">
                                                ${Number(c.total_spent_usd).toFixed(2)}
                                            </td>
                                            <td className="py-3 px-4 font-mono text-zinc-300">
                                                {c.visits_count} ដង
                                            </td>
                                            <td className="py-3 px-4 text-zinc-400 max-w-xs truncate">
                                                {c.notes || '-'}
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        onClick={() => openEditModal(c)}
                                                        className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-all"
                                                        title="កែប្រែ"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => router.post(`/customers/${c.id}/toggle`)}
                                                        className={`p-1.5 rounded-lg border text-xs transition-all ${
                                                            c.is_active
                                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                                                                : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                                                        }`}
                                                        title={c.is_active ? 'កំពុងសកម្ម' : 'អសកម្ម'}
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
                </div>

                {/* Create Customer Modal */}
                {showCreateModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-2xl">
                            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
                                <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                                    <UserPlus className="w-5 h-5 text-amber-400" />
                                    ចុះឈ្មោះអតិថិជនថ្មី
                                </h3>
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <form onSubmit={handleCreateSubmit} className="space-y-3">
                                <div>
                                    <label className="block text-xs font-medium text-zinc-300 mb-1">ឈ្មោះអតិថិជន *</label>
                                    <input
                                        type="text"
                                        required
                                        value={createForm.name}
                                        onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                                        placeholder="ឧ. សុខ សុវណ្ណ"
                                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-300 mb-1">លេខទូរស័ព្ទ</label>
                                    <input
                                        type="text"
                                        value={createForm.phone}
                                        onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                                        placeholder="ឧ. 012 345 678"
                                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-300 mb-1">អ៊ីមែល (ប្រសិនបើមាន)</label>
                                    <input
                                        type="email"
                                        value={createForm.email}
                                        onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                                        placeholder="customer@email.com"
                                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-300 mb-1">កម្រិតសមាជិក (Tier)</label>
                                    <select
                                        value={createForm.tier}
                                        onChange={(e) => setCreateForm({ ...createForm, tier: e.target.value })}
                                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                                    >
                                        <option value="standard">Standard (ធម្មតា)</option>
                                        <option value="silver">Silver (ប្រាក់)</option>
                                        <option value="gold">Gold (មាស)</option>
                                        <option value="vip">VIP (ពិសេស)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-300 mb-1">ចំណាំពិសេស</label>
                                    <textarea
                                        rows={2}
                                        value={createForm.notes}
                                        onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                                        placeholder="ចំណង់ចំណូលចិត្ត ឬព័ត៌មានបន្ថែម..."
                                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                                    />
                                </div>

                                <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateModal(false)}
                                        className="px-3.5 py-2 rounded-xl text-xs text-zinc-300 hover:bg-zinc-800"
                                    >
                                        បោះបង់
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-zinc-950"
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
                        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-2xl">
                            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
                                <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                                    <Edit2 className="w-5 h-5 text-amber-400" />
                                    កែប្រែព័ត៌មានអតិថិជន
                                </h3>
                                <button
                                    onClick={() => setEditingCustomer(null)}
                                    className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <form onSubmit={handleEditSubmit} className="space-y-3">
                                <div>
                                    <label className="block text-xs font-medium text-zinc-300 mb-1">ឈ្មោះអតិថិជន *</label>
                                    <input
                                        type="text"
                                        required
                                        value={editForm.name}
                                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-300 mb-1">លេខទូរស័ព្ទ</label>
                                    <input
                                        type="text"
                                        value={editForm.phone}
                                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-300 mb-1">កម្រិតសមាជិក (Tier)</label>
                                    <select
                                        value={editForm.tier}
                                        onChange={(e) => setEditForm({ ...editForm, tier: e.target.value })}
                                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                                    >
                                        <option value="standard">Standard (ធម្មតា)</option>
                                        <option value="silver">Silver (ប្រាក់)</option>
                                        <option value="gold">Gold (មាស)</option>
                                        <option value="vip">VIP (ពិសេស)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-300 mb-1">ចំណាំ</label>
                                    <textarea
                                        rows={2}
                                        value={editForm.notes}
                                        onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                                    />
                                </div>

                                <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
                                    <button
                                        type="button"
                                        onClick={() => setEditingCustomer(null)}
                                        className="px-3.5 py-2 rounded-xl text-xs text-zinc-300 hover:bg-zinc-800"
                                    >
                                        បោះបង់
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-zinc-950"
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
                        <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-2xl">
                            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
                                <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                                    <Coins className="w-5 h-5 text-amber-400" />
                                    កែប្រែពិន្ទុសន្សំ
                                </h3>
                                <button
                                    onClick={() => setPointsCustomer(null)}
                                    className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <p className="text-xs text-zinc-400 mb-3">
                                អតិថិជន: <strong className="text-zinc-200">{pointsCustomer.name}</strong> (បច្ចុប្បន្ន:{' '}
                                <span className="text-amber-400 font-mono font-bold">{pointsCustomer.loyalty_points} pts</span>)
                            </p>

                            <form onSubmit={handlePointsSubmit} className="space-y-3">
                                <div>
                                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                                        ចំនួនពិន្ទុ (+ បន្ថែម ឬ - ដកចេញ)
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setPointsAdjustment((prev) => prev - 10)}
                                            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700"
                                        >
                                            <Minus className="w-4 h-4" />
                                        </button>
                                        <input
                                            type="number"
                                            value={pointsAdjustment}
                                            onChange={(e) => setPointsAdjustment(Number(e.target.value))}
                                            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-center text-sm font-bold font-mono text-amber-300 focus:outline-none focus:border-amber-500"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setPointsAdjustment((prev) => prev + 10)}
                                            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-300 mb-1">មូលហេតុ</label>
                                    <input
                                        type="text"
                                        value={pointsReason}
                                        onChange={(e) => setPointsReason(e.target.value)}
                                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                                    />
                                </div>

                                <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
                                    <button
                                        type="button"
                                        onClick={() => setPointsCustomer(null)}
                                        className="px-3.5 py-2 rounded-xl text-xs text-zinc-300 hover:bg-zinc-800"
                                    >
                                        បោះបង់
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-zinc-950"
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
