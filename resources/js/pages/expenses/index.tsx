import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Head, router, usePage } from '@inertiajs/react';
import { PageProps } from '@/types';
import { AppLayout } from '@/layouts/app-layout';
import { Card } from '@/components/ui/card';
import {
    WalletCards,
    PlusCircle,
    Download,
    ArrowDownRight,
    ArrowUpRight,
    Banknote,
    Receipt,
    Calendar,
    Layers,
    DollarSign,
    Lock,
    X,
    Filter,
    Shield,
    TrendingDown,
    ArrowLeft,
    CheckCircle2,
    Check,
    Coins,
    CreditCard,
    Building2,
    Sparkles,
    Tag,
    Clock,
    FileText,
    Pencil,
    Trash2,
} from 'lucide-react';
import { CashierFilter, CashierOption } from '@/components/cashier-filter';

interface ExpenseItem {
    id: number;
    category: string;
    title: string;
    description: string | null;
    amount_usd: string | number;
    amount_khr: number;
    payment_method: string;
    paid_to: string | null;
    receipt_reference: string | null;
    expense_date: string;
    created_at: string;
    creator?: { name: string };
}

interface DrawerLogItem {
    id: number;
    type: string;
    amount_usd: string | number;
    amount_khr: number;
    reason: string | null;
    created_at: string;
    user?: { name: string };
}

interface ExpensesProps {
    expenses: {
        data: ExpenseItem[];
        current_page: number;
        last_page: number;
        total: number;
    };
    drawerLogs: DrawerLogItem[];
    activePeriod: { id: number; period_number: string } | null;
    exchangeRate: number;
    metrics: {
        total_usd: number;
        total_khr: number;
        today_usd: number;
        today_khr: number;
        today_drops_usd: number;
        today_cash_in_usd: number;
        category_breakdown: Record<string, { total_usd: string | number; count: number }>;
    };
    filters: {
        category: string;
        date_from: string;
        date_to: string;
        cashier_id: number | null;
    };
    cashiers: CashierOption[];
}

const CATEGORY_MAP: Record<string, { nameKh: string; color: string }> = {
    utilities: { nameKh: 'ថ្លៃទឹក & ភ្លើង', color: 'text-sky-400 bg-sky-500/10 border-sky-500/30' },
    supplies: { nameKh: 'សម្ភារៈប្រើប្រាស់ & ខ្ចប់', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
    staff_meal: { nameKh: 'ម្ហូបអាហារបុគ្គលិក', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
    rent: { nameKh: 'ថ្លៃជួលទីតាំង', color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
    maintenance: { nameKh: 'ជួសជុល & ថែទាំ', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' },
    transport: { nameKh: 'ថ្លៃដឹកជញ្ជូន', color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30' },
    marketing: { nameKh: 'ផ្សព្វផ្សាយ & ទីផ្សារ', color: 'text-pink-400 bg-pink-500/10 border-pink-500/30' },
    other: { nameKh: 'ចំណាយផ្សេងៗ', color: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/30' },
};

const COMMON_EXPENSE_TITLES: Record<string, string[]> = {
    utilities: ['ថ្លៃទឹក & ភ្លើង EDC', 'ថ្លៃអ៊ីនធឺណិត (WiFi)', 'ថ្លៃដកសំរាមប្រចាំខែ'],
    supplies: ['ទិញសម្ភារៈខ្ចប់ & ថង់', 'ទិញក្រដាសជូតមាត់ & សាប៊ូ', 'ទិញស្រោមដៃ & ប្រអប់'],
    staff_meal: ['ម្ហូបអាហារបុគ្គលិកថ្ងៃត្រង់', 'ភេសជ្ជៈ & កាហ្វេបុគ្គលិក', 'អាហារសម្រន់ពេលល្ងាច'],
    rent: ['ថ្លៃជួលទីតាំងហាង', 'ថ្លៃជួលឃ្លាំងស្តុក'],
    maintenance: ['ជួសជុលម៉ាស៊ីនត្រជាក់', 'ជួសជុលប្រព័ន្ធទឹក & បង្គន់', 'ថែទាំឧបករណ៍ POS & Printer'],
    transport: ['ថ្លៃដឹកជញ្ជូន PassApp / Grab', 'ថ្លៃសាំងដឹកជញ្ជូនបន្ទាន់'],
    marketing: ['ផ្សព្វផ្សាយ Facebook Boost', 'បោះពុម្ពបដា & Menu ផ្សព្វផ្សាយ'],
    other: ['ទិញទឹកកកបន្ថែមបន្ទាន់', 'ចំណាយចៃដន្យផ្សេងៗ'],
};

export default function ExpensesIndex({
    expenses,
    drawerLogs,
    activePeriod,
    exchangeRate,
    metrics,
    filters,
    cashiers,
}: ExpensesProps) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    const [activeTab, setActiveTab] = useState<'expenses' | 'drawer'>('expenses');
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [showDrawerModal, setShowDrawerModal] = useState(false);

    // Edit / delete (admin & supervisor only — mirrors route middleware)
    const { auth } = usePage<PageProps>().props;
    const canManageExpenses = ['admin', 'supervisor'].includes(auth.user?.role ?? '');
    const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);
    const [deletingExpense, setDeletingExpense] = useState<ExpenseItem | null>(null);

    // Scroll lock and Esc key listener
    useEffect(() => {
        if (!mounted || typeof document === 'undefined') return;
        if (showExpenseModal || showDrawerModal) {
            const originalOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.key === 'Escape') {
                    setShowExpenseModal(false);
                    setShowDrawerModal(false);
                }
            };
            window.addEventListener('keydown', handleKeyDown);
            return () => {
                document.body.style.overflow = originalOverflow;
                window.removeEventListener('keydown', handleKeyDown);
            };
        }
    }, [showExpenseModal, showDrawerModal, mounted]);

    // Filter states
    const [selectedCategory, setSelectedCategory] = useState(filters.category || 'all');
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');

    const formatUsd = (val: number | string | undefined | null) => {
        const num = typeof val === 'string' ? parseFloat(val) || 0 : val || 0;
        return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    // Expense Form
    const emptyExpenseForm = () => ({
        category: 'utilities',
        title: '',
        description: '',
        amount_usd: '',
        amount_khr: '',
        payment_method: 'cash_drawer',
        paid_to: '',
        receipt_reference: '',
        expense_date: new Date().toISOString().split('T')[0],
    });
    const [expenseForm, setExpenseForm] = useState(emptyExpenseForm);

    const openCreateExpense = () => {
        setEditingExpenseId(null);
        setExpenseForm(emptyExpenseForm());
        setShowExpenseModal(true);
    };

    const openEditExpense = (item: ExpenseItem) => {
        setEditingExpenseId(item.id);
        setExpenseForm({
            category: item.category,
            title: item.title,
            description: item.description ?? '',
            amount_usd: String(item.amount_usd),
            amount_khr: String(item.amount_khr),
            payment_method: item.payment_method,
            paid_to: item.paid_to ?? '',
            receipt_reference: item.receipt_reference ?? '',
            expense_date: item.expense_date,
        });
        setShowExpenseModal(true);
    };

    const confirmDeleteExpense = () => {
        if (!deletingExpense) return;
        router.delete(`/expenses/${deletingExpense.id}`, {
            preserveScroll: true,
            onFinish: () => setDeletingExpense(null),
        });
    };

    // Drawer Log Form
    const [drawerForm, setDrawerForm] = useState({
        type: 'cash_drop',
        amount_usd: '',
        amount_khr: '',
        reason: '',
    });

    const addExpenseAmount = (val: number) => {
        const cur = parseFloat(expenseForm.amount_usd) || 0;
        handleUsdChange((cur + val).toFixed(2));
    };

    const resetExpenseAmount = () => {
        setExpenseForm({
            ...expenseForm,
            amount_usd: '',
            amount_khr: '',
        });
    };

    const handleUsdChange = (val: string) => {
        const num = parseFloat(val) || 0;
        setExpenseForm({
            ...expenseForm,
            amount_usd: val,
            amount_khr: String(Math.round(num * exchangeRate)),
        });
    };

    const handleKhrChange = (val: string) => {
        const num = parseInt(val, 10) || 0;
        setExpenseForm({
            ...expenseForm,
            amount_khr: val,
            amount_usd: (num / exchangeRate).toFixed(2),
        });
    };

    const handleDrawerUsdChange = (val: string) => {
        const num = parseFloat(val) || 0;
        setDrawerForm({
            ...drawerForm,
            amount_usd: val,
            amount_khr: String(Math.round(num * exchangeRate)),
        });
    };

    const handleFilterSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/expenses', {
            category: selectedCategory,
            date_from: dateFrom,
            date_to: dateTo,
            cashier_id: filters.cashier_id || undefined,
        }, { preserveState: true });
    };

    const handleExpenseSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const options = {
            preserveScroll: true,
            onSuccess: () => {
                setShowExpenseModal(false);
                setEditingExpenseId(null);
                setExpenseForm(emptyExpenseForm());
            },
        };

        if (editingExpenseId) {
            router.patch(`/expenses/${editingExpenseId}`, expenseForm, options);
            return;
        }

        router.post('/expenses', expenseForm, {
            ...options,
        });
    };

    const handleDrawerSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.post('/expenses/drawer-log', drawerForm, {
            onSuccess: () => {
                setShowDrawerModal(false);
                setDrawerForm({
                    type: 'cash_drop',
                    amount_usd: '',
                    amount_khr: '',
                    reason: '',
                });
            },
        });
    };

    return (
        <AppLayout title="ចំណាយ & ថតបេឡា">
            <Head title="Cash & Expenses — ចំណាយ & ថតបេឡា" />

            <div className="space-y-6 pb-12">
                {/* Fixed / Sticky Header */}
                <div className="sticky top-0 z-30 -mx-4 -mt-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 py-3.5 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                                <WalletCards className="w-5 h-5" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
                                    ចំណាយ & ថតបេឡា
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-medium">
                                        ចំណាយ & ថតបេឡា
                                    </span>
                                </h1>
                                <p className="text-xs text-zinc-400">
                                    កត់ត្រាចំណាយប្រតិបត្តិការទូទៅ និងគ្រប់គ្រងចរន្តសាច់ប្រាក់ចេញចូលថតបេឡា
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <CashierFilter cashiers={cashiers} value={filters.cashier_id} query={{ category: filters.category, date_from: filters.date_from || undefined, date_to: filters.date_to || undefined }} />
                            <button
                                onClick={() => setShowDrawerModal(true)}
                                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 flex items-center gap-1.5 transition-all cursor-pointer"
                            >
                                <Lock className="w-4 h-4 text-amber-400" />
                                <span>ចលនាថតបេឡា</span>
                            </button>

                            <button
                                onClick={openCreateExpense}
                                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-zinc-950 flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
                            >
                                <PlusCircle className="w-4 h-4" />
                                <span>កត់ត្រាចំណាយថ្មី</span>
                            </button>

                            <a
                                href="/expenses/export/csv"
                                className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-all"
                                title="ទាញយក CSV"
                            >
                                <Download className="w-4 h-4" />
                            </a>
                        </div>
                    </div>
                </div>

                {/* Top Metrics Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <Card className="bg-zinc-900/70 border-zinc-800/80 p-4 rounded-2xl relative overflow-hidden">
                        <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                            <span>Today's Expenses / ចំណាយថ្ងៃនេះ</span>
                            <DollarSign className="w-4 h-4 text-amber-400" />
                        </div>
                        <div className="text-xl sm:text-2xl font-bold text-white font-mono">
                            {formatUsd(metrics.today_usd)}
                        </div>
                        <div className="text-xs text-emerald-400 font-mono font-medium mt-1">
                            ≈ {(metrics.today_khr || 0).toLocaleString()} ៛
                        </div>
                    </Card>

                    <Card className="bg-zinc-900/70 border-zinc-800/80 p-4 rounded-2xl relative overflow-hidden">
                        <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                            <span>Total Expenses / ចំណាយសរុប</span>
                            <Calendar className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div className="text-xl sm:text-2xl font-bold text-white font-mono">
                            {formatUsd(metrics.total_usd)}
                        </div>
                        <div className="text-xs text-zinc-400 font-mono mt-1">
                            ≈ {(metrics.total_khr || 0).toLocaleString()} ៛
                        </div>
                    </Card>

                    <Card className="bg-zinc-900/70 border-zinc-800/80 p-4 rounded-2xl relative overflow-hidden">
                        <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                            <span>Cash Drop / ទម្លាក់ចូលទូដែក</span>
                            <ArrowDownRight className="w-4 h-4 text-teal-400" />
                        </div>
                        <div className="text-xl sm:text-2xl font-bold text-white font-mono">
                            {formatUsd(metrics.today_drops_usd)}
                        </div>
                        <div className="text-xs text-teal-400/90 font-khmer mt-1">
                            ប្រតិបត្តិការថ្ងៃនេះ
                        </div>
                    </Card>

                    <Card className="bg-zinc-900/70 border-zinc-800/80 p-4 rounded-2xl relative overflow-hidden">
                        <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                            <span>Cash In / ថែមប្រាក់ចូលបេឡា</span>
                            <ArrowUpRight className="w-4 h-4 text-purple-400" />
                        </div>
                        <div className="text-xl sm:text-2xl font-bold text-white font-mono">
                            {formatUsd(metrics.today_cash_in_usd)}
                        </div>
                        <div className="text-xs text-purple-400/90 font-khmer mt-1">
                            ប្រតិបត្តិការថ្ងៃនេះ
                        </div>
                    </Card>
                </div>

                {/* Tab Navigation */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setActiveTab('expenses')}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all border cursor-pointer ${
                            activeTab === 'expenses'
                                ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-sm font-bold'
                                : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-850'
                        }`}
                    >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>បញ្ជីចំណាយប្រតិបត្តិការ ({expenses.total})</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('drawer')}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all border cursor-pointer ${
                            activeTab === 'drawer'
                                ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-sm font-bold'
                                : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-850'
                        }`}
                    >
                        <Lock className="w-3.5 h-3.5" />
                        <span>កំណត់ត្រាថតបេឡា ({drawerLogs.length})</span>
                    </button>
                </div>

                {/* Tab 1: Expenses Ledger */}
                {activeTab === 'expenses' && (
                    <div className="space-y-4">
                        {/* Filters */}
                        <form
                            onSubmit={handleFilterSubmit}
                            className="flex flex-wrap items-center justify-between gap-3 bg-zinc-900/60 p-3 rounded-xl border border-zinc-800"
                        >
                            <div className="flex flex-wrap items-center gap-2">
                                <select
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                    className="px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                                >
                                    <option value="all">គ្រប់ប្រភេទចំណាយទាំងអស់</option>
                                    {Object.entries(CATEGORY_MAP).map(([key, val]) => (
                                        <option key={key} value={key}>
                                            {val.nameKh}
                                        </option>
                                    ))}
                                </select>

                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    className="px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                                />
                                <span className="text-xs text-zinc-500">ដល់</span>
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    className="px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                                />

                                <button
                                    type="submit"
                                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg text-xs font-medium"
                                >
                                    ចម្រោះ
                                </button>
                            </div>
                        </form>

                        {/* Table */}
                        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/70 overflow-hidden shadow-lg">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-zinc-950/60 text-zinc-400 border-b border-zinc-800 uppercase text-[10px] tracking-wider">
                                        <tr>
                                            <th className="py-3 px-4">កាលបរិច្ឆេទ</th>
                                            <th className="py-3 px-4">ប្រភេទ</th>
                                            <th className="py-3 px-4">ចំណងជើងចំណាយ</th>
                                            <th className="py-3 px-4">ចំនួនទឹកប្រាក់</th>
                                            <th className="py-3 px-4">វិធីទូទាត់</th>
                                            <th className="py-3 px-4">អ្នកទទួល / បុង</th>
                                            <th className="py-3 px-4">កត់ត្រាដោយ</th>
                                            {canManageExpenses && <th className="py-3 px-4 text-right">សកម្មភាព</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-800/60 text-zinc-200">
                                        {expenses.data.length === 0 ? (
                                            <tr>
                                                <td colSpan={canManageExpenses ? 8 : 7} className="py-12 text-center text-zinc-500">
                                                    មិនទាន់មានទិន្នន័យចំណាយត្រូវបានកត់ត្រាទេ
                                                </td>
                                            </tr>
                                        ) : (
                                            expenses.data.map((item) => {
                                                const cat = CATEGORY_MAP[item.category] || {
                                                    nameKh: item.category,
                                                    color: 'text-zinc-400 bg-zinc-800 border-zinc-700',
                                                };
                                                return (
                                                    <tr key={item.id} className="hover:bg-zinc-800/40 transition-colors">
                                                        <td className="py-3 px-4 font-mono text-zinc-400">
                                                            {item.expense_date}
                                                        </td>
                                                        <td className="py-3 px-4 whitespace-nowrap">
                                                            <span
                                                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium font-khmer whitespace-nowrap border ${cat.color}`}
                                                            >
                                                                {cat.nameKh}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            <div className="font-semibold text-zinc-100">{item.title}</div>
                                                            {item.description && (
                                                                <div className="text-[11px] text-zinc-400 mt-0.5">
                                                                    {item.description}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="py-3 px-4 font-mono">
                                                            <div className="font-bold text-rose-400 text-sm">
                                                                ${Number(item.amount_usd).toFixed(2)}
                                                            </div>
                                                            <div className="text-[11px] text-zinc-400">
                                                                ៛{Number(item.amount_khr).toLocaleString()}
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-4 text-zinc-300">
                                                            {item.payment_method === 'cash_drawer'
                                                                ? 'ថតបេឡា (Cash)'
                                                                : item.payment_method === 'petty_cash'
                                                                ? 'ប្រាក់ចំណាយតូចតាច'
                                                                : item.payment_method}
                                                        </td>
                                                        <td className="py-3 px-4 text-zinc-400">
                                                            {item.paid_to || '-'}
                                                            {item.receipt_reference && (
                                                                <span className="block text-[10px] text-zinc-500 font-mono">
                                                                    បុង: #{item.receipt_reference}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="py-3 px-4 text-zinc-400">
                                                            {item.creator?.name || 'Staff'}
                                                        </td>
                                                        {canManageExpenses && (
                                                            <td className="py-3 px-4">
                                                                <div className="flex items-center justify-end gap-1">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => openEditExpense(item)}
                                                                        title="កែប្រែ (Edit)"
                                                                        className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-500 hover:bg-amber-500/10 transition-colors cursor-pointer"
                                                                    >
                                                                        <Pencil className="w-3.5 h-3.5" />
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setDeletingExpense(item)}
                                                                        title="លុប (Delete)"
                                                                        className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        )}
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab 2: Cash Drawer Logs */}
                {activeTab === 'drawer' && (
                    <div className="space-y-4">
                        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/70 overflow-hidden shadow-lg">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-zinc-950/60 text-zinc-400 border-b border-zinc-800 uppercase text-[10px] tracking-wider">
                                        <tr>
                                            <th className="py-3 px-4">ពេលវេលា</th>
                                            <th className="py-3 px-4">ប្រភេទចលនា</th>
                                            <th className="py-3 px-4">ចំនួនទឹកប្រាក់</th>
                                            <th className="py-3 px-4">មូលហេតុ / កំណត់ត្រា</th>
                                            <th className="py-3 px-4">ប្រតិបត្តិករ</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-800/60 text-zinc-200">
                                        {drawerLogs.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="py-12 text-center text-zinc-500">
                                                    មិនទាន់មានកំណត់ត្រាថតបេឡាទេ
                                                </td>
                                            </tr>
                                        ) : (
                                            drawerLogs.map((log) => {
                                                const isDrop = log.type === 'cash_drop' || log.type === 'pay_out';
                                                return (
                                                    <tr key={log.id} className="hover:bg-zinc-800/40 transition-colors">
                                                        <td className="py-3 px-4 font-mono text-zinc-400">
                                                            {new Date(log.created_at).toLocaleString('en-US', {
                                                                month: 'short',
                                                                day: 'numeric',
                                                                hour: '2-digit',
                                                                minute: '2-digit',
                                                            })}
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            <span
                                                                className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                                                                    isDrop
                                                                        ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                                                                        : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                                                }`}
                                                            >
                                                                {log.type === 'cash_drop'
                                                                    ? 'ទម្លាក់ចូលទូដែក (Cash Drop)'
                                                                    : log.type === 'cash_in'
                                                                    ? 'ថែមប្រាក់ចូលបេឡា (Cash In)'
                                                                    : log.type === 'opening_float'
                                                                    ? 'ប្រាក់បម្រុងដើមគ្រា (Float)'
                                                                    : log.type}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-4 font-mono">
                                                            <div className="font-bold text-sm text-zinc-100">
                                                                ${Number(log.amount_usd).toFixed(2)}
                                                            </div>
                                                            <div className="text-[11px] text-zinc-400">
                                                                ៛{Number(log.amount_khr).toLocaleString()}
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-4 text-zinc-300">{log.reason || '-'}</td>
                                                        <td className="py-3 px-4 text-zinc-400">
                                                            {log.user?.name || 'Cashier'}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal: New Expense (Full-Workspace 2-Column Layout) */}
                {mounted && showExpenseModal && createPortal(
                    <div
                        className="fixed inset-y-0 right-0 left-0 md:left-[var(--sidebar-width,16rem)] z-50 flex flex-col bg-zinc-50 dark:bg-zinc-950 overflow-hidden select-none animate-in fade-in duration-150 h-screen"
                        onWheel={(e) => e.stopPropagation()}
                    >
                        {/* Top Header Bar */}
                        <div className="shrink-0 h-16 px-4 sm:px-6 border-b border-slate-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md flex items-center justify-between z-10 shadow-xs">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
                                    <Receipt className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-base font-bold text-slate-900 dark:text-zinc-100 font-khmer">
                                            {editingExpenseId ? 'កែប្រែចំណាយ' : 'កត់ត្រាចំណាយប្រតិបត្តិការថ្មី'}
                                        </h2>
                                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-medium">
                                            {editingExpenseId ? `កែចំណាយ #${editingExpenseId}` : 'ចំណាយថ្មី'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-zinc-400 font-khmer">
                                        កត់ត្រាចំណាយប្រតិបត្តិការទូទៅ ឬកាត់ចេញពីថតបេឡា • វេនបច្ចុប្បន្ន:{' '}
                                        <span className="font-semibold text-slate-700 dark:text-zinc-300">
                                            {activePeriod?.period_number || 'ទូទៅ'}
                                        </span>
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => setShowExpenseModal(false)}
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
                        <form onSubmit={handleExpenseSubmit} className="flex-1 min-h-0 flex flex-col">
                            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6">
                                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5">
                                    {/* Left Column: Category & Details (7 cols) */}
                                    <div className="lg:col-span-7 space-y-4">
                                        {/* Category Picker Card */}
                                        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs">
                                            <div className="flex items-center justify-between mb-3">
                                                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-2 font-khmer">
                                                    <Tag className="w-4 h-4 text-amber-500" />
                                                    ជ្រើសរើសប្រភេទចំណាយ *
                                                </label>
                                                <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold font-khmer">
                                                    {CATEGORY_MAP[expenseForm.category]?.nameKh || 'ចំណាយទូទៅ'}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                {Object.entries(CATEGORY_MAP).map(([key, val]) => {
                                                    const isSelected = expenseForm.category === key;
                                                    return (
                                                        <button
                                                            key={key}
                                                            type="button"
                                                            onClick={() => setExpenseForm({ ...expenseForm, category: key })}
                                                            className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between min-h-[72px] cursor-pointer ${
                                                                isSelected
                                                                    ? 'bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400 shadow-xs ring-1 ring-amber-500/30'
                                                                    : 'bg-slate-50 dark:bg-zinc-950/60 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:border-slate-300 dark:hover:border-zinc-700 hover:bg-slate-100/70 dark:hover:bg-zinc-800/40'
                                                            }`}
                                                        >
                                                            <div className="flex items-center justify-between w-full">
                                                                <span className="text-[10px] font-mono uppercase text-slate-400 dark:text-zinc-500">
                                                                    {key}
                                                                </span>
                                                                {isSelected && (
                                                                    <Check className="w-3.5 h-3.5 text-amber-500" />
                                                                )}
                                                            </div>
                                                            <div className="text-xs font-semibold leading-tight font-khmer mt-1">
                                                                {val.nameKh}
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Expense Title & Quick Suggestions */}
                                        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs space-y-3">
                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1.5 font-khmer">
                                                    ចំណងជើងចំណាយ / បរិយាយសង្ខេប *
                                                </label>
                                                <input
                                                    type="text"
                                                    required
                                                    placeholder="ឧ. ថ្លៃទឹក & ភ្លើង ប្រចាំសប្ដាហ៍..."
                                                    value={expenseForm.title}
                                                    onChange={(e) =>
                                                        setExpenseForm({ ...expenseForm, title: e.target.value })
                                                    }
                                                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500 font-khmer transition-all"
                                                />
                                            </div>

                                            {/* Quick common suggestions based on selected category */}
                                            {COMMON_EXPENSE_TITLES[expenseForm.category] && (
                                                <div>
                                                    <div className="text-[11px] text-slate-400 dark:text-zinc-500 mb-1.5 flex items-center gap-1 font-khmer">
                                                        <Sparkles className="w-3 h-3 text-amber-500" />
                                                        <span>ចំណងជើងពេញនិយម (ចុចដើម្បីបំពេញ):</span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {COMMON_EXPENSE_TITLES[expenseForm.category].map((title) => (
                                                            <button
                                                                key={title}
                                                                type="button"
                                                                onClick={() => setExpenseForm({ ...expenseForm, title })}
                                                                className={`px-2.5 py-1 rounded-lg text-xs font-khmer border transition-all cursor-pointer ${
                                                                    expenseForm.title === title
                                                                        ? 'bg-amber-500 text-zinc-950 border-amber-500 font-bold'
                                                                        : 'bg-slate-100 dark:bg-zinc-800/70 border-slate-200 dark:border-zinc-700/60 text-slate-700 dark:text-zinc-300 hover:border-amber-500/50 hover:text-amber-600 dark:hover:text-amber-400'
                                                                }`}
                                                            >
                                                                {title}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Payment Method Selector */}
                                        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs space-y-3">
                                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 font-khmer">
                                                ប្រភពទូទាត់សាច់ប្រាក់ (Payment Source) *
                                            </label>

                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setExpenseForm({ ...expenseForm, payment_method: 'cash_drawer' })}
                                                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                                                        expenseForm.payment_method === 'cash_drawer'
                                                            ? 'bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/30'
                                                            : 'bg-slate-50 dark:bg-zinc-950/60 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:border-slate-300 dark:hover:border-zinc-700'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <WalletCards className="w-4 h-4 text-amber-500" />
                                                        <span className="text-xs font-bold font-khmer">ថតបេឡា (Drawer)</span>
                                                    </div>
                                                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-tight font-khmer">
                                                        កាត់ចេញពីសាច់ប្រាក់វេនផ្ទាល់
                                                    </p>
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => setExpenseForm({ ...expenseForm, payment_method: 'petty_cash' })}
                                                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                                                        expenseForm.payment_method === 'petty_cash'
                                                            ? 'bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/30'
                                                            : 'bg-slate-50 dark:bg-zinc-950/60 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:border-slate-300 dark:hover:border-zinc-700'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Coins className="w-4 h-4 text-emerald-500" />
                                                        <span className="text-xs font-bold font-khmer">ប្រាក់រាយ (Petty Cash)</span>
                                                    </div>
                                                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-tight font-khmer">
                                                        កាត់ពីមូលនិធិបម្រុងបន្ទាន់
                                                    </p>
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => setExpenseForm({ ...expenseForm, payment_method: 'bank_khqr' })}
                                                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                                                        expenseForm.payment_method === 'bank_khqr'
                                                            ? 'bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/30'
                                                            : 'bg-slate-50 dark:bg-zinc-950/60 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:border-slate-300 dark:hover:border-zinc-700'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <CreditCard className="w-4 h-4 text-sky-500" />
                                                        <span className="text-xs font-bold font-khmer">ធនាគារ / KHQR</span>
                                                    </div>
                                                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-tight font-khmer">
                                                        ផ្ទេរប្រាក់តាមគណនីធនាគារ
                                                    </p>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Description / Notes */}
                                        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs">
                                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1.5 font-khmer">
                                                បរិយាយបន្ថែម / កំណត់សម្គាល់ (Description)
                                            </label>
                                            <textarea
                                                rows={2}
                                                placeholder="ព័ត៌មានលម្អិតបន្ថែម ឬលេខទូរស័ព្ទអ្នកផ្គត់ផ្គង់..."
                                                value={expenseForm.description}
                                                onChange={(e) =>
                                                    setExpenseForm({ ...expenseForm, description: e.target.value })
                                                }
                                                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500 font-khmer transition-all"
                                            />
                                        </div>
                                    </div>

                                    {/* Right Column: Financial & Voucher (5 cols) */}
                                    <div className="lg:col-span-5 space-y-4">
                                        {/* Financial Hero Card */}
                                        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs space-y-4">
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5 font-khmer">
                                                    <DollarSign className="w-4 h-4" />
                                                    ចំនួនទឹកប្រាក់ចំណាយ (Amount) *
                                                </label>
                                                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700">
                                                    1$ = {exchangeRate.toLocaleString()} ៛
                                                </span>
                                            </div>

                                            <div className="space-y-3">
                                                {/* USD Input */}
                                                <div>
                                                    <span className="block text-[11px] font-medium text-slate-500 dark:text-zinc-400 mb-1">
                                                        ទឹកប្រាក់គិតជាដុល្លារ (USD)
                                                    </span>
                                                    <div className="relative">
                                                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-bold font-mono text-slate-400 dark:text-zinc-500">
                                                            $
                                                        </span>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            required
                                                            placeholder="0.00"
                                                            value={expenseForm.amount_usd}
                                                            onChange={(e) => handleUsdChange(e.target.value)}
                                                            className="w-full pl-8 pr-4 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xl font-bold font-mono text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500 transition-all"
                                                        />
                                                    </div>
                                                </div>

                                                {/* KHR Input */}
                                                <div>
                                                    <span className="block text-[11px] font-medium text-slate-500 dark:text-zinc-400 mb-1">
                                                        ទឹកប្រាក់គិតជារៀល (KHR)
                                                    </span>
                                                    <div className="relative">
                                                        <input
                                                            type="number"
                                                            placeholder="0"
                                                            value={expenseForm.amount_khr}
                                                            onChange={(e) => handleKhrChange(e.target.value)}
                                                            className="w-full pl-4 pr-10 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-lg font-bold font-mono text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500 transition-all"
                                                        />
                                                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-bold font-mono text-slate-400 dark:text-zinc-500">
                                                            ៛
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Quick Amount Increment Buttons */}
                                            <div>
                                                <div className="text-[11px] text-slate-400 dark:text-zinc-500 mb-1.5 font-khmer">
                                                    បន្ថែមទឹកប្រាក់រហ័ស (Quick Pills):
                                                </div>
                                                <div className="grid grid-cols-4 gap-1.5">
                                                    {[5, 10, 20, 50].map((amt) => (
                                                        <button
                                                            key={amt}
                                                            type="button"
                                                            onClick={() => addExpenseAmount(amt)}
                                                            className="py-1.5 px-2 rounded-lg text-xs font-mono font-bold bg-slate-100 dark:bg-zinc-800 hover:bg-amber-500/20 hover:text-amber-600 dark:hover:text-amber-400 border border-slate-200 dark:border-zinc-700 transition-all cursor-pointer"
                                                        >
                                                            +${amt}
                                                        </button>
                                                    ))}
                                                </div>
                                                <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => addExpenseAmount(100)}
                                                        className="py-1.5 px-2 rounded-lg text-xs font-mono font-bold bg-slate-100 dark:bg-zinc-800 hover:bg-amber-500/20 hover:text-amber-600 dark:hover:text-amber-400 border border-slate-200 dark:border-zinc-700 transition-all cursor-pointer"
                                                    >
                                                        +$100
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={resetExpenseAmount}
                                                        className="py-1.5 px-2 rounded-lg text-xs font-khmer text-slate-500 hover:text-rose-500 bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 transition-all cursor-pointer"
                                                    >
                                                        កំណត់ឡើងវិញ
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Payee & Voucher Card */}
                                        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs space-y-3">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1 font-khmer">
                                                        បង់ជូន (Paid To)
                                                    </label>
                                                    <input
                                                        type="text"
                                                        placeholder="ឧ. អគ្គិសនីកម្ពុជា"
                                                        value={expenseForm.paid_to}
                                                        onChange={(e) =>
                                                            setExpenseForm({ ...expenseForm, paid_to: e.target.value })
                                                        }
                                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500 font-khmer transition-all"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1 font-khmer">
                                                        កាលបរិច្ឆេទចំណាយ *
                                                    </label>
                                                    <input
                                                        type="date"
                                                        required
                                                        value={expenseForm.expense_date}
                                                        onChange={(e) =>
                                                            setExpenseForm({ ...expenseForm, expense_date: e.target.value })
                                                        }
                                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500 font-mono transition-all"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1 font-khmer">
                                                    លេខវិក្កយបត្រ / បុងយោង (Receipt Ref #)
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="ឧ. EDC-99120 ឬ INV-2026-001"
                                                    value={expenseForm.receipt_reference}
                                                    onChange={(e) =>
                                                        setExpenseForm({ ...expenseForm, receipt_reference: e.target.value })
                                                    }
                                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500 font-mono transition-all"
                                                />
                                            </div>
                                        </div>

                                        {/* Real-Time Impact Summary */}
                                        <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-xs space-y-2">
                                            <div className="flex items-center justify-between font-khmer">
                                                <span className="text-slate-500 dark:text-zinc-400">ផលប៉ះពាល់លើបេឡា:</span>
                                                <span className="font-bold text-amber-600 dark:text-amber-400">
                                                    {expenseForm.payment_method === 'cash_drawer'
                                                        ? 'ដកចេញពីសាច់ប្រាក់ថតបេឡា'
                                                        : expenseForm.payment_method === 'petty_cash'
                                                        ? 'កាត់ពីសាច់ប្រាក់រាយ'
                                                        : 'ទូទាត់ធនាគារ (មិនប៉ះពាល់បេឡា)'}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between pt-2 border-t border-amber-500/10">
                                                <span className="text-slate-500 dark:text-zinc-400 font-khmer">សរុបចំណាយ:</span>
                                                <span className="text-base font-bold font-mono text-slate-900 dark:text-zinc-100">
                                                    {formatUsd(expenseForm.amount_usd || 0)}{' '}
                                                    <span className="text-xs font-normal text-slate-400">
                                                        (≈ {Number(expenseForm.amount_khr || 0).toLocaleString()} ៛)
                                                    </span>
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Bottom Fixed Action Footer */}
                            <div className="shrink-0 p-4 sm:px-6 border-t border-slate-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg z-10">
                                <div className="text-xs text-slate-500 dark:text-zinc-400 flex items-center gap-2 font-khmer">
                                    <Shield className="w-4 h-4 text-emerald-500 shrink-0" />
                                    <span>
                                        រាល់ការកត់ត្រានឹងត្រូវធ្វើបច្ចុប្បន្នភាពចូលក្នុងរបាយការណ៍បិទវេន និងរបាយការណ៍ចំណេញខាតភ្លាមៗ
                                    </span>
                                </div>

                                <div className="flex items-center justify-end gap-2.5">
                                    <button
                                        type="button"
                                        onClick={() => setShowExpenseModal(false)}
                                        className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 transition-all cursor-pointer font-khmer"
                                    >
                                        បោះបង់
                                    </button>
                                    <button
                                        type="submit"
                                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-md shadow-amber-500/20 transition-all cursor-pointer font-khmer"
                                    >
                                        <CheckCircle2 className="w-4 h-4" />
                                        <span>{editingExpenseId ? 'រក្សាទុកការកែប្រែ' : 'រក្សាទុកចំណាយ'}</span>
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>,
                    document.body
                )}

                {/* Modal: Delete Expense Confirmation */}
                {mounted && deletingExpense && createPortal(
                    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-6 space-y-4">
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                                    <Trash2 className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-zinc-900 dark:text-white font-khmer">
                                        លុបចំណាយនេះមែនទេ?
                                    </h3>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-khmer mt-1 leading-relaxed">
                                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">{deletingExpense.title}</span>{' '}
                                        ({formatUsd(deletingExpense.amount_usd)} • {deletingExpense.expense_date}) នឹងត្រូវលុបចេញពីរបាយការណ៍។ ព័ត៌មានដើមត្រូវបានរក្សាទុកក្នុង Audit Trail។
                                    </p>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setDeletingExpense(null)}
                                    className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 transition cursor-pointer font-khmer"
                                >
                                    បោះបង់
                                </button>
                                <button
                                    type="button"
                                    onClick={confirmDeleteExpense}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition cursor-pointer font-khmer"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    <span>លុបចំណាយ</span>
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

                {/* Modal: Cash Drawer Movement Full-Workspace Suite */}
                {mounted && showDrawerModal && createPortal(
                    <div
                        className="fixed inset-y-0 right-0 left-0 md:left-[var(--sidebar-width,16rem)] z-50 flex flex-col bg-zinc-50 dark:bg-zinc-950 overflow-hidden select-none animate-in fade-in duration-150 h-screen"
                        onWheel={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="px-6 py-3.5 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between shrink-0 shadow-xs">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-xs shrink-0">
                                    <Lock className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-base font-bold text-zinc-900 dark:text-white font-khmer">
                                            កត់ត្រាចលនាសាច់ប្រាក់ក្នុងថតបេឡា
                                        </h3>
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 font-mono">
                                            ដាក់/ដកលុយពីថតបេឡា
                                        </span>
                                    </div>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-khmer">
                                        ទម្លាក់ចូលទូដែក (Cash Drop), បន្ថែមប្រាក់បម្រុង (Cash In), ឬដកសាច់ប្រាក់បន្ទាន់ (Pay Out)
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowDrawerModal(false)}
                                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-950 dark:hover:text-white transition-all cursor-pointer font-khmer text-xs font-semibold shadow-xs group"
                                title="ត្រឡប់ក្រោយ (Esc)"
                            >
                                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform text-amber-600 dark:text-amber-400" />
                                <span>ត្រឡប់ក្រោយ</span>
                            </button>
                        </div>

                        {/* Body - 2 Columns (7 / 5) */}
                        <form onSubmit={handleDrawerSubmit} className="flex flex-col flex-1 min-h-0 overflow-y-auto">
                            <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1">
                                {/* LEFT COLUMN: Form Inputs (7 cols) */}
                                <div className="lg:col-span-7 space-y-4">
                                    {/* Operation Type Selector Cards */}
                                    <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-xs">
                                        <div className="flex items-center gap-2 text-xs font-bold text-zinc-800 dark:text-zinc-200 font-khmer pb-1 border-b border-zinc-100 dark:border-zinc-800">
                                            <Layers className="w-4 h-4 text-amber-500" />
                                            <span>ជ្រើសរើសប្រភេទប្រតិបត្តិការថតបេឡា / Drawer Movement Type</span>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {[
                                                {
                                                    key: 'cash_drop',
                                                    labelKh: 'ទម្លាក់ចូលទូដែក (Cash Drop)',
                                                    desc: 'ផ្ទេរសាច់ប្រាក់លើសចូលទូដែកសុវត្ថិភាព',
                                                    icon: ArrowDownRight,
                                                    color: 'text-amber-500',
                                                    activeBg: 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/20',
                                                },
                                                {
                                                    key: 'cash_in',
                                                    labelKh: 'បន្ថែមប្រាក់បម្រុង (Cash In)',
                                                    desc: 'បន្ថែមក្រដាសប្រាក់អាប់ចូលថតបេឡា',
                                                    icon: ArrowUpRight,
                                                    color: 'text-emerald-500',
                                                    activeBg: 'bg-emerald-500/10 border-emerald-500 ring-2 ring-emerald-500/20',
                                                },
                                                {
                                                    key: 'opening_float',
                                                    labelKh: 'ប្រាក់បម្រុងដើមគ្រា (Opening Float)',
                                                    desc: 'កំណត់ប្រាក់ដំបូងសម្រាប់បើកវេនលក់',
                                                    icon: Sparkles,
                                                    color: 'text-sky-500',
                                                    activeBg: 'bg-sky-500/10 border-sky-500 ring-2 ring-sky-500/20',
                                                },
                                                {
                                                    key: 'pay_out',
                                                    labelKh: 'ដកសាច់ប្រាក់បន្ទាន់ (Pay Out)',
                                                    desc: 'ទូទាត់ចំណាយបន្ទាន់ផ្ទាល់ពីថតបេឡា',
                                                    icon: Banknote,
                                                    color: 'text-rose-500',
                                                    activeBg: 'bg-rose-500/10 border-rose-500 ring-2 ring-rose-500/20',
                                                },
                                            ].map((opt) => {
                                                const Icon = opt.icon;
                                                const isSelected = drawerForm.type === opt.key;
                                                return (
                                                    <button
                                                        key={opt.key}
                                                        type="button"
                                                        onClick={() => setDrawerForm({ ...drawerForm, type: opt.key })}
                                                        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                                                            isSelected
                                                                ? opt.activeBg
                                                                : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700'
                                                        }`}
                                                    >
                                                        <div className="flex items-center justify-between w-full">
                                                            <div className="flex items-center gap-2 font-bold font-khmer text-xs">
                                                                <Icon className={`w-4 h-4 ${isSelected ? opt.color : 'text-zinc-400'}`} />
                                                                <span className={isSelected ? 'text-zinc-900 dark:text-white' : ''}>
                                                                    {opt.labelKh}
                                                                </span>
                                                            </div>
                                                            {isSelected && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
                                                        </div>
                                                        <p className="text-[11px] font-khmer text-zinc-500 dark:text-zinc-400">
                                                            {opt.desc}
                                                        </p>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Amount Card with Quick Amounts */}
                                    <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-xs">
                                        <div className="flex items-center gap-2 text-xs font-bold text-zinc-800 dark:text-zinc-200 font-khmer pb-1 border-b border-zinc-100 dark:border-zinc-800">
                                            <DollarSign className="w-4 h-4 text-amber-500" />
                                            <span>ចំនួនទឹកប្រាក់ទូទាត់ (Amount)</span>
                                            <span className="text-rose-500">*</span>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1 font-khmer">
                                                    ចំនួនទឹកប្រាក់ (USD)
                                                </label>
                                                <div className="relative">
                                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold font-mono text-zinc-400">
                                                        $
                                                    </span>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        required
                                                        placeholder="0.00"
                                                        value={drawerForm.amount_usd}
                                                        onChange={(e) => handleDrawerUsdChange(e.target.value)}
                                                        className="w-full pl-8 pr-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm font-bold font-mono text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1 font-khmer">
                                                    ចំនួនទឹកប្រាក់ (KHR - ប្តូរស្វ័យប្រវត្ត)
                                                </label>
                                                <div className="relative">
                                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold font-mono text-zinc-400">
                                                        ៛
                                                    </span>
                                                    <input
                                                        type="number"
                                                        readOnly
                                                        value={drawerForm.amount_khr}
                                                        className="w-full pl-8 pr-3.5 py-2.5 bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-300 dark:border-zinc-700/60 rounded-xl text-sm font-bold font-mono text-zinc-500 dark:text-zinc-400 cursor-not-allowed"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Quick Amount Pills */}
                                        <div className="space-y-1.5 pt-1">
                                            <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 font-khmer block">
                                                ចុចជ្រើសរើសចំនួនទឹកប្រាក់រហ័ស (Quick Presets)៖
                                            </span>
                                            <div className="flex flex-wrap gap-2">
                                                {['10', '20', '50', '100', '200', '500'].map((amt) => (
                                                    <button
                                                        key={amt}
                                                        type="button"
                                                        onClick={() => handleDrawerUsdChange(amt)}
                                                        className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
                                                            drawerForm.amount_usd === amt
                                                                ? 'bg-amber-500 text-zinc-950 border-amber-500 shadow-xs'
                                                                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-amber-500/50'
                                                        }`}
                                                    >
                                                        ${amt} USD
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Reason Card with Quick Presets */}
                                    <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-xs">
                                        <div className="flex items-center gap-2 text-xs font-bold text-zinc-800 dark:text-zinc-200 font-khmer pb-1 border-b border-zinc-100 dark:border-zinc-800">
                                            <FileText className="w-4 h-4 text-amber-500" />
                                            <span>មូលហេតុ / កំណត់សម្គាល់ (Reason & Notes)</span>
                                        </div>

                                        <input
                                            type="text"
                                            placeholder="ឧ. ដកផ្ទេរចូលទូដែកពេលល្ងាច..."
                                            value={drawerForm.reason}
                                            onChange={(e) => setDrawerForm({ ...drawerForm, reason: e.target.value })}
                                            className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 font-khmer transition-all"
                                        />

                                        {/* Reason Presets */}
                                        <div className="space-y-1.5 pt-1">
                                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 font-khmer">
                                                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                                <span>គំរូកំណត់សម្គាល់រហ័ស (Quick Presets)៖</span>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {[
                                                    'ដកផ្ទេរចូលទូដែកពេលល្ងាច (Drop to safe)',
                                                    'បន្ថែមក្រដាសប្រាក់រាយសម្រាប់អាប់ (Small bills)',
                                                    'ប្រាក់បម្រុងសម្រាប់បើកវេនលក់ (Opening float)',
                                                    'ដកសាច់ប្រាក់បន្ទាន់ទិញសម្ភារហាង (Emergency payout)',
                                                ].map((preset, idx) => (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        onClick={() => setDrawerForm({ ...drawerForm, reason: preset })}
                                                        className="px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/90 hover:border-amber-500/40 hover:bg-amber-500/5 text-zinc-700 dark:text-zinc-300 text-[11px] font-khmer transition-all cursor-pointer text-left"
                                                    >
                                                        {preset}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* RIGHT COLUMN: Digital Voucher Preview (5 cols) */}
                                <div className="lg:col-span-5 space-y-4">
                                    <div className="sticky top-4 space-y-4">
                                        {/* Cash Voucher Card */}
                                        <div className="rounded-2xl border p-5 space-y-4 shadow-sm relative overflow-hidden bg-gradient-to-br from-amber-950/40 via-zinc-900 to-zinc-950 border-amber-500/30 text-white">
                                            {/* Watermark */}
                                            <div className="absolute -right-6 -bottom-6 opacity-10 pointer-events-none">
                                                <Lock className="w-40 h-40 text-amber-400" />
                                            </div>

                                            {/* Top Banner */}
                                            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                                                <div className="space-y-0.5">
                                                    <span className="text-[10px] font-mono tracking-widest uppercase text-zinc-400">
                                                        ប័ណ្ណថតបេឡា
                                                    </span>
                                                    <h4 className="text-sm font-bold text-white font-mono">
                                                        LOG-DRAWER
                                                    </h4>
                                                </div>
                                                <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs">
                                                    {drawerForm.type.replace('_', ' ')}
                                                </span>
                                            </div>

                                            {/* Primary Amount Display */}
                                            <div className="p-4 rounded-xl bg-black/40 border border-zinc-800 text-center space-y-1">
                                                <span className="text-[10px] text-zinc-400 font-khmer block uppercase tracking-wider">
                                                    ទឹកប្រាក់ប្រតិបត្តិការសរុប
                                                </span>
                                                <div className="text-2xl font-bold font-mono text-amber-400">
                                                    ${parseFloat(drawerForm.amount_usd || '0').toFixed(2)} USD
                                                </div>
                                                <div className="text-xs font-mono text-zinc-400">
                                                    ≈ {(parseFloat(drawerForm.amount_khr || '0')).toLocaleString()} KHR
                                                </div>
                                            </div>

                                            {/* Voucher Details */}
                                            <div className="space-y-2.5 text-xs font-mono border-t border-zinc-800/80 pt-3">
                                                <div className="flex items-center justify-between text-zinc-400">
                                                    <span className="font-khmer">ការិយបរិច្ឆេទ / វេនលក់៖</span>
                                                    <span className="text-white font-semibold">
                                                        {activePeriod ? `Period #${activePeriod.period_number}` : 'វេនលក់បច្ចុប្បន្ន'}
                                                    </span>
                                                </div>

                                                <div className="flex items-center justify-between text-zinc-400">
                                                    <span className="font-khmer">អត្រាប្តូរប្រាក់យោង៖</span>
                                                    <span className="text-zinc-200">
                                                        1$ = {exchangeRate.toLocaleString()} ៛
                                                    </span>
                                                </div>

                                                <div className="flex items-center justify-between text-zinc-400">
                                                    <span className="font-khmer">កំណត់សម្គាល់៖</span>
                                                    <span className="text-zinc-300 truncate max-w-[180px] font-sans">
                                                        {drawerForm.reason || '—'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Voucher Footer */}
                                            <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[10px] font-mono text-zinc-500">
                                                <span>AUDIT: DRAWER_TRANSACTION</span>
                                                <span>រួចរាល់</span>
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
                                        onClick={() => setShowDrawerModal(false)}
                                        className="px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-xs font-semibold font-khmer transition-all cursor-pointer shadow-xs"
                                    >
                                        បោះបង់
                                    </button>

                                    <button
                                        type="submit"
                                        disabled={!drawerForm.amount_usd || parseFloat(drawerForm.amount_usd) <= 0}
                                        className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold font-khmer shadow-sm hover:shadow-amber-500/30 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Lock className="w-4 h-4" />
                                        <span>កត់ត្រាចលនាសាច់ប្រាក់ (Confirm Movement)</span>
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
