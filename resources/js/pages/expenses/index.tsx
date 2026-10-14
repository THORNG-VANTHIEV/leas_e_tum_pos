import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { AppLayout } from '@/layouts/app-layout';
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
} from 'lucide-react';

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
    };
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

export default function ExpensesIndex({
    expenses,
    drawerLogs,
    activePeriod,
    exchangeRate,
    metrics,
    filters,
}: ExpensesProps) {
    const [activeTab, setActiveTab] = useState<'expenses' | 'drawer'>('expenses');
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [showDrawerModal, setShowDrawerModal] = useState(false);

    // Filter states
    const [selectedCategory, setSelectedCategory] = useState(filters.category || 'all');
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');

    // Expense Form
    const [expenseForm, setExpenseForm] = useState({
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

    // Drawer Log Form
    const [drawerForm, setDrawerForm] = useState({
        type: 'cash_drop',
        amount_usd: '',
        amount_khr: '',
        reason: '',
    });

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
        }, { preserveState: true });
    };

    const handleExpenseSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.post('/expenses', expenseForm, {
            onSuccess: () => {
                setShowExpenseModal(false);
                setExpenseForm({
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
            },
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
        <AppLayout title="Cash & Expenses">
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
                                    Cash & Expenses
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
                            <button
                                onClick={() => setShowDrawerModal(true)}
                                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 flex items-center gap-1.5 transition-all"
                            >
                                <Lock className="w-4 h-4 text-amber-400" />
                                <span>ចលនាថតបេឡា</span>
                            </button>

                            <button
                                onClick={() => setShowExpenseModal(true)}
                                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-zinc-950 flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all"
                            >
                                <PlusCircle className="w-4 h-4" />
                                <span>+ កត់ត្រាចំណាយថ្មី</span>
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

                    {/* KPI Metrics Summary Strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                        <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800/80">
                            <span className="text-[11px] text-zinc-400">ចំណាយថ្ងៃនេះ (USD)</span>
                            <p className="text-lg font-bold text-rose-400 mt-0.5">
                                ${metrics.today_usd.toFixed(2)}
                            </p>
                            <span className="text-[10px] text-zinc-500 font-mono">
                                ៛{metrics.today_khr.toLocaleString()}
                            </span>
                        </div>
                        <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800/80">
                            <span className="text-[11px] text-zinc-400">ចំណាយសរុប (USD)</span>
                            <p className="text-lg font-bold text-zinc-100 mt-0.5">
                                ${metrics.total_usd.toFixed(2)}
                            </p>
                            <span className="text-[10px] text-zinc-500 font-mono">
                                ៛{metrics.total_khr.toLocaleString()}
                            </span>
                        </div>
                        <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800/80">
                            <span className="text-[11px] text-amber-400 flex items-center gap-1">
                                <ArrowDownRight className="w-3.5 h-3.5 text-amber-400" />
                                ទម្លាក់ចូលទូដែក (Cash Drop)
                            </span>
                            <p className="text-lg font-bold text-amber-300 mt-0.5">
                                ${metrics.today_drops_usd.toFixed(2)}
                            </p>
                            <span className="text-[10px] text-zinc-500 font-mono">ថ្ងៃនេះ</span>
                        </div>
                        <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800/80">
                            <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                                ថែមប្រាក់ចូលបេឡា (Cash In)
                            </span>
                            <p className="text-lg font-bold text-emerald-300 mt-0.5">
                                ${metrics.today_cash_in_usd.toFixed(2)}
                            </p>
                            <span className="text-[10px] text-zinc-500 font-mono">ថ្ងៃនេះ</span>
                        </div>
                    </div>

                    {/* Tab Navigation */}
                    <div className="flex items-center gap-2 mt-3 border-t border-zinc-800/80 pt-2.5">
                        <button
                            onClick={() => setActiveTab('expenses')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all border ${
                                activeTab === 'expenses'
                                    ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-sm'
                                    : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-850'
                            }`}
                        >
                            <Receipt className="w-3.5 h-3.5" />
                            <span>បញ្ជីចំណាយប្រតិបត្តិការ ({expenses.total})</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('drawer')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all border ${
                                activeTab === 'drawer'
                                    ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-sm'
                                    : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-850'
                            }`}
                        >
                            <Lock className="w-3.5 h-3.5" />
                            <span>កំណត់ត្រាថតបេឡា ({drawerLogs.length})</span>
                        </button>
                    </div>
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
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-800/60 text-zinc-200">
                                        {expenses.data.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="py-12 text-center text-zinc-500">
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
                                                        <td className="py-3 px-4">
                                                            <span
                                                                className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${cat.color}`}
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
                                                                ? 'Petty Cash'
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

                {/* Modal: New Expense */}
                {showExpenseModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                        <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-2xl">
                            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
                                <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                                    <PlusCircle className="w-5 h-5 text-amber-400" />
                                    កត់ត្រាចំណាយប្រតិបត្តិការថ្មី
                                </h3>
                                <button
                                    onClick={() => setShowExpenseModal(false)}
                                    className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <form onSubmit={handleExpenseSubmit} className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-zinc-300 mb-1">
                                            ប្រភេទចំណាយ *
                                        </label>
                                        <select
                                            value={expenseForm.category}
                                            onChange={(e) =>
                                                setExpenseForm({ ...expenseForm, category: e.target.value })
                                            }
                                            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                                        >
                                            {Object.entries(CATEGORY_MAP).map(([key, val]) => (
                                                <option key={key} value={key}>
                                                    {val.nameKh}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-zinc-300 mb-1">
                                            កាលបរិច្ឆេទ *
                                        </label>
                                        <input
                                            type="date"
                                            required
                                            value={expenseForm.expense_date}
                                            onChange={(e) =>
                                                setExpenseForm({ ...expenseForm, expense_date: e.target.value })
                                            }
                                            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                                        ចំណងជើងចំណាយ / បរិយាយ *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="ឧ. ថ្លៃទឹក & ភ្លើង ប្រចាំសប្ដាហ៍"
                                        value={expenseForm.title}
                                        onChange={(e) =>
                                            setExpenseForm({ ...expenseForm, title: e.target.value })
                                        }
                                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                                    <div>
                                        <label className="block text-xs font-medium text-amber-400 mb-1">
                                            ចំនួនទឹកប្រាក់ (USD) *
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            required
                                            placeholder="0.00"
                                            value={expenseForm.amount_usd}
                                            onChange={(e) => handleUsdChange(e.target.value)}
                                            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm font-bold font-mono text-zinc-100 focus:outline-none focus:border-amber-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-amber-400 mb-1">
                                            ចំនួនទឹកប្រាក់ (KHR)
                                        </label>
                                        <input
                                            type="number"
                                            placeholder="0"
                                            value={expenseForm.amount_khr}
                                            onChange={(e) => handleKhrChange(e.target.value)}
                                            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm font-bold font-mono text-zinc-100 focus:outline-none focus:border-amber-500"
                                        />
                                    </div>
                                    <div className="col-span-2 text-[11px] text-zinc-500">
                                        អត្រាប្ដូរប្រាក់ប្រព័ន្ធ: 1 USD = {exchangeRate.toLocaleString()} ៛
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-zinc-300 mb-1">
                                            វិធីដកប្រាក់
                                        </label>
                                        <select
                                            value={expenseForm.payment_method}
                                            onChange={(e) =>
                                                setExpenseForm({ ...expenseForm, payment_method: e.target.value })
                                            }
                                            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                                        >
                                            <option value="cash_drawer">ថតបេឡា (Cash Drawer)</option>
                                            <option value="petty_cash">កញ្ចប់សាច់ប្រាក់រាយ (Petty Cash)</option>
                                            <option value="bank_khqr">KHQR / ធនាគារ</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-zinc-300 mb-1">
                                            បង់ជូន (Paid To)
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="ឧ. អគ្គិសនីកម្ពុជា"
                                            value={expenseForm.paid_to}
                                            onChange={(e) =>
                                                setExpenseForm({ ...expenseForm, paid_to: e.target.value })
                                            }
                                            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                                        លេខវិក្កយបត្រ / បុងយោង
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="ឧ. EDC-99120"
                                        value={expenseForm.receipt_reference}
                                        onChange={(e) =>
                                            setExpenseForm({ ...expenseForm, receipt_reference: e.target.value })
                                        }
                                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                                    />
                                </div>

                                <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
                                    <button
                                        type="button"
                                        onClick={() => setShowExpenseModal(false)}
                                        className="px-3.5 py-2 rounded-xl text-xs text-zinc-300 hover:bg-zinc-800"
                                    >
                                        បោះបង់
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-zinc-950"
                                    >
                                        រក្សាទុកចំណាយ
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Modal: Cash Drawer Movement */}
                {showDrawerModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-2xl">
                            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
                                <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                                    <Lock className="w-5 h-5 text-amber-400" />
                                    ចលនាសាច់ប្រាក់ក្នុងថតបេឡា
                                </h3>
                                <button
                                    onClick={() => setShowDrawerModal(false)}
                                    className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <form onSubmit={handleDrawerSubmit} className="space-y-3">
                                <div>
                                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                                        ប្រភេទប្រតិបត្តិការ *
                                    </label>
                                    <select
                                        value={drawerForm.type}
                                        onChange={(e) => setDrawerForm({ ...drawerForm, type: e.target.value })}
                                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                                    >
                                        <option value="cash_drop">ទម្លាក់ចូលទូដែក (Cash Drop to Safe)</option>
                                        <option value="cash_in">បន្ថែមប្រាក់ចូលបេឡា (Cash In / Float In)</option>
                                        <option value="opening_float">ប្រាក់បម្រុងដើមគ្រា (Opening Float)</option>
                                        <option value="pay_out">ដកសាច់ប្រាក់បន្ទាន់ (Pay Out)</option>
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                                    <div>
                                        <label className="block text-xs font-medium text-amber-400 mb-1">
                                            ចំនួនទឹកប្រាក់ (USD) *
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            required
                                            placeholder="0.00"
                                            value={drawerForm.amount_usd}
                                            onChange={(e) => handleDrawerUsdChange(e.target.value)}
                                            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm font-bold font-mono text-zinc-100 focus:outline-none focus:border-amber-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-amber-400 mb-1">
                                            ចំនួនទឹកប្រាក់ (KHR)
                                        </label>
                                        <input
                                            type="number"
                                            readOnly
                                            value={drawerForm.amount_khr}
                                            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm font-bold font-mono text-zinc-400"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                                        មូលហេតុ / កំណត់សម្គាល់
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="ឧ. ដកផ្ទេរចូលទូដែកពេលល្ងាច"
                                        value={drawerForm.reason}
                                        onChange={(e) => setDrawerForm({ ...drawerForm, reason: e.target.value })}
                                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                                    />
                                </div>

                                <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
                                    <button
                                        type="button"
                                        onClick={() => setShowDrawerModal(false)}
                                        className="px-3.5 py-2 rounded-xl text-xs text-zinc-300 hover:bg-zinc-800"
                                    >
                                        បោះបង់
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-zinc-950"
                                    >
                                        កត់ត្រាចលនា
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
