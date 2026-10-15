import React, { useState } from 'react';
import { AppLayout } from '@/layouts/app-layout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Head, useForm, router } from '@inertiajs/react';
import {
    Truck,
    Plus,
    Search,
    Edit2,
    ToggleLeft,
    ToggleRight,
    Users,
    Receipt,
    DollarSign,
    Calendar,
    Phone,
    MapPin,
    FileText,
    CheckCircle2,
    Clock,
    XCircle,
    X,
    PlusCircle,
    Trash2,
    Eye,
    Filter,
    ShoppingBag,
    ArrowUpDown,
    Check,
} from 'lucide-react';

interface Supplier {
    id: number;
    name: string;
    contact_person?: string | null;
    phone?: string | null;
    address?: string | null;
    notes?: string | null;
    is_active: boolean;
    purchases_count?: number;
}

interface PurchaseItem {
    id: number;
    product_id?: number | null;
    item_name: string;
    unit_name: string;
    quantity: string | number;
    unit_cost: string | number;
    total_cost: string | number;
    notes?: string | null;
}

interface Purchase {
    id: number;
    purchase_number: string;
    supplier_id?: number | null;
    period_id?: number | null;
    purchase_date: string;
    status: 'received' | 'pending' | 'cancelled';
    subtotal: string | number;
    discount_amount: string | number;
    tax_amount: string | number;
    total_amount: string | number;
    reference_note?: string | null;
    notes?: string | null;
    supplier?: Supplier | null;
    creator?: { id: number; name: string } | null;
    items: PurchaseItem[];
}

interface PaginatedData<T> {
    data: T[];
    current_page: number;
    last_page: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
}

interface Product {
    id: number;
    name_primary: string;
    name_secondary?: string | null;
    unit?: { id: number; name_primary: string } | null;
}

interface Unit {
    id: number;
    name_primary: string;
    code: string;
}

interface PurchasesProps {
    purchases: PaginatedData<Purchase>;
    suppliers: Supplier[];
    products: Product[];
    units: Unit[];
    exchange_rate: number;
    metrics: {
        total_purchases_usd: number;
        this_month_purchases_usd: number;
        active_suppliers_count: number;
        total_purchases_count: number;
    };
}

type TabType = 'purchases' | 'suppliers';

interface LineItemForm {
    product_id: string;
    item_name: string;
    unit_name: string;
    quantity: number;
    unit_cost: number;
    notes: string;
}

export default function PurchasesIndex({
    purchases,
    suppliers,
    products,
    units,
    exchange_rate,
    metrics,
}: PurchasesProps) {
    const [activeTab, setActiveTab] = useState<TabType>('purchases');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [supplierFilter, setSupplierFilter] = useState<string>('all');

    // Modals state
    const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
    const [viewPurchaseModal, setViewPurchaseModal] = useState<Purchase | null>(null);
    const [supplierModalOpen, setSupplierModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

    // Format money helpers
    const formatUsd = (val: number | string) => {
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return `$${(num || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const formatKhr = (usdVal: number | string) => {
        const num = typeof valToNum(usdVal) === 'number' ? valToNum(usdVal) : 0;
        const khr = Math.round(num * exchange_rate);
        return `${khr.toLocaleString('en-US')} ៛`;
    };

    const valToNum = (val: number | string) => {
        return typeof val === 'string' ? parseFloat(val) || 0 : val || 0;
    };

    const formatDateOnly = (dateStr: string | null | undefined) => {
        if (!dateStr) return '—';
        return dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.split(' ')[0];
    };

    // Purchase Order Form
    const purchaseForm = useForm({
        supplier_id: '',
        purchase_date: new Date().toISOString().split('T')[0],
        status: 'received',
        reference_note: '',
        notes: '',
        discount_amount: 0,
        tax_amount: 0,
        items: [
            {
                product_id: '',
                item_name: '',
                unit_name: 'កំប៉ុង',
                quantity: 1,
                unit_cost: 0,
                notes: '',
            },
        ] as LineItemForm[],
    });

    const addLineItem = () => {
        purchaseForm.setData('items', [
            ...purchaseForm.data.items,
            {
                product_id: '',
                item_name: '',
                unit_name: 'កំប៉ុង',
                quantity: 1,
                unit_cost: 0,
                notes: '',
            },
        ]);
    };

    const removeLineItem = (index: number) => {
        if (purchaseForm.data.items.length <= 1) return;
        const newItems = purchaseForm.data.items.filter((_, i) => i !== index);
        purchaseForm.setData('items', newItems);
    };

    const updateLineItem = (index: number, field: keyof LineItemForm, value: any) => {
        const newItems = [...purchaseForm.data.items];
        newItems[index] = { ...newItems[index], [field]: value };

        // If product selected, auto-fill item name and unit
        if (field === 'product_id' && value) {
            const prod = products.find((p) => String(p.id) === String(value));
            if (prod) {
                newItems[index].item_name = prod.name_primary;
                if (prod.unit) {
                    newItems[index].unit_name = prod.unit.name_primary;
                }
            }
        }

        purchaseForm.setData('items', newItems);
    };

    // Calculate purchase order modal totals
    const formSubtotal = purchaseForm.data.items.reduce(
        (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unit_cost) || 0),
        0
    );
    const formDiscount = Number(purchaseForm.data.discount_amount) || 0;
    const formTax = Number(purchaseForm.data.tax_amount) || 0;
    const formTotal = Math.max(0, formSubtotal + formTax - formDiscount);

    const handleCreatePurchase = (e: React.FormEvent) => {
        e.preventDefault();
        purchaseForm.post('/purchases', {
            onSuccess: () => {
                setPurchaseModalOpen(false);
                purchaseForm.reset();
            },
        });
    };

    // Quick status updater
    const handleQuickStatusChange = (purchaseId: number, newStatus: string) => {
        router.patch(
            `/purchases/${purchaseId}/status`,
            { status: newStatus },
            {
                preserveScroll: true,
                onSuccess: () => {
                    if (viewPurchaseModal && viewPurchaseModal.id === purchaseId) {
                        setViewPurchaseModal((prev) =>
                            prev ? { ...prev, status: newStatus as any } : null
                        );
                    }
                },
            }
        );
    };

    // Supplier Form
    const supplierForm = useForm({
        name: '',
        contact_person: '',
        phone: '',
        address: '',
        notes: '',
        is_active: true,
    });

    const openSupplierModal = (supp?: Supplier) => {
        if (supp) {
            setEditingSupplier(supp);
            supplierForm.setData({
                name: supp.name,
                contact_person: supp.contact_person || '',
                phone: supp.phone || '',
                address: supp.address || '',
                notes: supp.notes || '',
                is_active: supp.is_active,
            });
        } else {
            setEditingSupplier(null);
            supplierForm.reset();
            supplierForm.setData({
                name: '',
                contact_person: '',
                phone: '',
                address: '',
                notes: '',
                is_active: true,
            });
        }
        setSupplierModalOpen(true);
    };

    const handleSupplierSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingSupplier) {
            supplierForm.patch(`/purchases/suppliers/${editingSupplier.id}`, {
                onSuccess: () => setSupplierModalOpen(false),
            });
        } else {
            supplierForm.post('/purchases/suppliers', {
                onSuccess: () => setSupplierModalOpen(false),
            });
        }
    };

    const handleToggleSupplier = (suppId: number) => {
        router.post(`/purchases/suppliers/${suppId}/toggle`, {}, { preserveScroll: true });
    };

    // Filter purchases
    const filteredPurchases = purchases.data.filter((p) => {
        const matchesSearch =
            p.purchase_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (p.supplier?.name && p.supplier.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (p.reference_note && p.reference_note.toLowerCase().includes(searchQuery.toLowerCase())) ||
            p.items.some((item) => item.item_name.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
        const matchesSupplier =
            supplierFilter === 'all' || String(p.supplier_id) === String(supplierFilter);

        return matchesSearch && matchesStatus && matchesSupplier;
    });

    // Filter suppliers
    const filteredSuppliers = suppliers.filter((s) => {
        return (
            s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (s.contact_person && s.contact_person.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (s.phone && s.phone.includes(searchQuery)) ||
            (s.address && s.address.toLowerCase().includes(searchQuery.toLowerCase()))
        );
    });

    return (
        <AppLayout title="Purchases & Suppliers — លៀសហាល អ៉ីទុម">
            <div className="space-y-6">
                {/* Fixed / Sticky Header & Quick Actions */}
                <div className="sticky top-14 md:top-0 z-20 bg-zinc-950/95 backdrop-blur-xl -mt-6 pt-6 pb-4 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 border-b border-zinc-800/80 space-y-4 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                                    <Truck className="w-5 h-5" />
                                </div>
                                <div>
                                    <h1 className="text-xl sm:text-2xl font-bold text-white font-khmer leading-snug py-0.5">
                                        ការទិញចូល & អ្នកផ្គត់ផ្គង់
                                    </h1>
                                    <p className="text-xs text-zinc-400 font-mono mt-0.5">
                                        Purchases, Inventory Inbound & Supplier Relations • Rate: $1 = {exchange_rate.toLocaleString()} ៛
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2.5">
                            <Button
                                onClick={() => openSupplierModal()}
                                variant="outline"
                                className="bg-zinc-900 border-zinc-700/80 hover:bg-zinc-800 text-zinc-200 text-xs gap-1.5 cursor-pointer shadow-sm"
                            >
                                <Users className="w-4 h-4 text-emerald-400" />
                                <span>អ្នកផ្គត់ផ្គង់ (Supplier)</span>
                            </Button>
                            <Button
                                onClick={() => {
                                    purchaseForm.reset();
                                    setPurchaseModalOpen(true);
                                }}
                                className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs gap-1.5 shadow-lg shadow-amber-500/20 cursor-pointer"
                            >
                                <Plus className="w-4 h-4 stroke-[3]" />
                                <span>កត់ត្រាទិញចូល (New Purchase)</span>
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Top Metrics Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <Card className="bg-zinc-900/70 border-zinc-800/80 p-4 rounded-2xl relative overflow-hidden">
                        <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                            <span>Total Purchases / ចំណាយសរុប</span>
                            <DollarSign className="w-4 h-4 text-amber-400" />
                        </div>
                        <div className="text-xl sm:text-2xl font-bold text-white font-mono">
                            {formatUsd(metrics.total_purchases_usd)}
                        </div>
                        <div className="text-xs text-emerald-400 font-mono font-medium mt-1">
                            ≈ {formatKhr(metrics.total_purchases_usd)}
                        </div>
                    </Card>

                    <Card className="bg-zinc-900/70 border-zinc-800/80 p-4 rounded-2xl relative overflow-hidden">
                        <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                            <span>This Month / ទិញខែនេះ</span>
                            <Calendar className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div className="text-xl sm:text-2xl font-bold text-white font-mono">
                            {formatUsd(metrics.this_month_purchases_usd)}
                        </div>
                        <div className="text-xs text-zinc-400 font-mono mt-1">
                            ≈ {formatKhr(metrics.this_month_purchases_usd)}
                        </div>
                    </Card>

                    <Card className="bg-zinc-900/70 border-zinc-800/80 p-4 rounded-2xl relative overflow-hidden">
                        <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                            <span>Active Suppliers / អ្នកផ្គត់ផ្គង់</span>
                            <Users className="w-4 h-4 text-teal-400" />
                        </div>
                        <div className="text-xl sm:text-2xl font-bold text-white font-mono">
                            {metrics.active_suppliers_count}
                        </div>
                        <div className="text-xs text-teal-400/90 font-khmer mt-1">
                            {suppliers.length} ដៃគូផ្គត់ផ្គង់សរុប
                        </div>
                    </Card>

                    <Card className="bg-zinc-900/70 border-zinc-800/80 p-4 rounded-2xl relative overflow-hidden">
                        <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                            <span>Purchase Bills / វិក្កយបត្រ</span>
                            <Receipt className="w-4 h-4 text-purple-400" />
                        </div>
                        <div className="text-xl sm:text-2xl font-bold text-white font-mono">
                            {metrics.total_purchases_count}
                        </div>
                        <div className="text-xs text-purple-400/90 font-khmer mt-1">
                            បានកត់ត្រាក្នុងប្រព័ន្ធ
                        </div>
                    </Card>
                </div>

                {/* Tabs & Search Navigation Header */}
                <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-3 sm:p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        {/* Tabs */}
                        <div className="flex items-center gap-1.5 p-1 bg-zinc-950/80 border border-zinc-800 rounded-xl w-fit">
                            <button
                                type="button"
                                onClick={() => setActiveTab('purchases')}
                                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                                    activeTab === 'purchases'
                                        ? 'bg-amber-500 text-zinc-950 shadow-md font-bold'
                                        : 'text-zinc-400 hover:text-white'
                                }`}
                            >
                                <Receipt className="w-3.5 h-3.5" />
                                <span>វិក្កយបត្រទិញចូល ({purchases.total})</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('suppliers')}
                                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                                    activeTab === 'suppliers'
                                        ? 'bg-amber-500 text-zinc-950 shadow-md font-bold'
                                        : 'text-zinc-400 hover:text-white'
                                }`}
                            >
                                <Users className="w-3.5 h-3.5" />
                                <span>អ្នកផ្គត់ផ្គង់ ({suppliers.length})</span>
                            </button>
                        </div>

                        {/* Search Input */}
                        <div className="relative w-full sm:w-72">
                            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                            <Input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={
                                    activeTab === 'purchases'
                                        ? 'ស្វែងរកលេខប័ណ្ណ, ឈ្មោះទំនិញ...'
                                        : 'ស្វែងរកឈ្មោះ, លេខទូរស័ព្ទ...'
                                }
                                className="pl-9 h-9 bg-zinc-950/90 border-zinc-800 text-xs text-white rounded-xl placeholder:text-zinc-500"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Filter bar for purchases */}
                    {activeTab === 'purchases' && (
                        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-800/60 text-xs text-zinc-400">
                            <span className="flex items-center gap-1 text-[11px] font-mono uppercase text-zinc-500">
                                <Filter className="w-3 h-3" /> Filters:
                            </span>

                            {/* Status filter */}
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-zinc-300 focus:outline-none focus:border-amber-500 cursor-pointer"
                            >
                                <option value="all">ស្ថានភាពទាំងអស់ (All Status)</option>
                                <option value="received">ទទួលបានរួច (Received)</option>
                                <option value="pending">រង់ចាំ (Pending)</option>
                                <option value="cancelled">បានលុបចោល (Cancelled)</option>
                            </select>

                            {/* Supplier filter */}
                            <select
                                value={supplierFilter}
                                onChange={(e) => setSupplierFilter(e.target.value)}
                                className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-zinc-300 focus:outline-none focus:border-amber-500 cursor-pointer max-w-[200px] truncate"
                            >
                                <option value="all">អ្នកផ្គត់ផ្គង់ទាំងអស់ (All Suppliers)</option>
                                {suppliers.map((s) => (
                                    <option key={s.id} value={s.id.toString()}>
                                        {s.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* TAB 1: PURCHASES INVOICES */}
                {activeTab === 'purchases' && (
                    <Card className="bg-zinc-900/60 border-zinc-800/80 rounded-2xl overflow-hidden shadow-xl">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="border-b border-zinc-800/80 bg-zinc-950/60 text-zinc-400 font-mono text-[11px] uppercase">
                                        <th className="py-3 px-4">Purchase #</th>
                                        <th className="py-3 px-4">Supplier / អ្នកផ្គត់ផ្គង់</th>
                                        <th className="py-3 px-4">Date / កាលបរិច្ឆេទ</th>
                                        <th className="py-3 px-4">Items / ទំនិញ</th>
                                        <th className="py-3 px-4 text-right">Total ($ / ៛)</th>
                                        <th className="py-3 px-4 text-center">Status</th>
                                        <th className="py-3 px-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800/40 text-zinc-300">
                                    {filteredPurchases.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="py-12 text-center text-zinc-500">
                                                <div className="flex flex-col items-center justify-center gap-2">
                                                    <Truck className="w-8 h-8 text-zinc-600" />
                                                    <p className="font-khmer text-sm">មិនមានទិន្នន័យការទិញចូលទេ</p>
                                                    <p className="text-xs font-mono text-zinc-600">
                                                        No purchase records found matching your filters.
                                                    </p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredPurchases.map((purchase) => {
                                            const totalNum = valToNum(purchase.total_amount);
                                            return (
                                                <tr
                                                    key={purchase.id}
                                                    className="hover:bg-zinc-800/30 transition-colors group"
                                                >
                                                    <td className="py-3 px-4">
                                                        <div className="font-mono font-bold text-amber-400">
                                                            {purchase.purchase_number}
                                                        </div>
                                                        {purchase.reference_note && (
                                                            <div className="text-[10px] text-zinc-500 font-mono">
                                                                Ref: {purchase.reference_note}
                                                            </div>
                                                        )}
                                                    </td>

                                                    <td className="py-3 px-4">
                                                        <div className="font-semibold text-white font-khmer">
                                                            {purchase.supplier?.name || (
                                                                <span className="text-zinc-500 font-sans italic">
                                                                    ទូទៅ (Walk-in / Cash)
                                                                </span>
                                                            )}
                                                        </div>
                                                        {purchase.supplier?.phone && (
                                                            <div className="text-[10px] text-zinc-500 font-mono">
                                                                {purchase.supplier.phone}
                                                            </div>
                                                        )}
                                                    </td>

                                                    <td className="py-3 px-4 font-mono text-zinc-300 text-xs">
                                                        {formatDateOnly(purchase.purchase_date)}
                                                    </td>

                                                    <td className="py-3 px-4 max-w-xs">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-mono text-xs font-semibold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                                                                {purchase.items.length} មុខ
                                                            </span>
                                                            <span className="text-zinc-400 truncate text-[11px]">
                                                                {purchase.items
                                                                    .map((i) => i.item_name)
                                                                    .slice(0, 2)
                                                                    .join(', ')}
                                                                {purchase.items.length > 2 ? '...' : ''}
                                                            </span>
                                                        </div>
                                                    </td>

                                                    <td className="py-3 px-4 text-right">
                                                        <div className="font-mono font-bold text-white text-sm">
                                                            {formatUsd(totalNum)}
                                                        </div>
                                                        <div className="font-mono text-[11px] text-emerald-400">
                                                            {formatKhr(totalNum)}
                                                        </div>
                                                    </td>

                                                    <td className="py-3 px-4 text-center">
                                                        {purchase.status === 'received' && (
                                                            <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] uppercase font-mono">
                                                                <CheckCircle2 className="w-3 h-3 mr-1" /> Received
                                                            </Badge>
                                                        )}
                                                        {purchase.status === 'pending' && (
                                                            <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] uppercase font-mono">
                                                                <Clock className="w-3 h-3 mr-1" /> Pending
                                                            </Badge>
                                                        )}
                                                        {purchase.status === 'cancelled' && (
                                                            <Badge className="bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[10px] uppercase font-mono">
                                                                <XCircle className="w-3 h-3 mr-1" /> Cancelled
                                                            </Badge>
                                                        )}
                                                    </td>

                                                    <td className="py-3 px-4 text-right">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => setViewPurchaseModal(purchase)}
                                                                className="h-7 px-2.5 rounded-lg border-zinc-700 bg-zinc-800/90 text-zinc-300 hover:text-white hover:bg-zinc-700 text-xs gap-1.5 cursor-pointer shadow-sm transition"
                                                                title="View Details"
                                                            >
                                                                <Eye className="w-3.5 h-3.5 text-amber-400" />
                                                                <span>មើលប័ណ្ណ</span>
                                                            </Button>

                                                            {purchase.status === 'pending' && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() =>
                                                                        handleQuickStatusChange(
                                                                            purchase.id,
                                                                            'received'
                                                                        )
                                                                    }
                                                                    className="h-7 px-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 text-xs cursor-pointer"
                                                                    title="Mark Received"
                                                                >
                                                                    <Check className="w-3.5 h-3.5" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {purchases.last_page > 1 && (
                            <div className="p-3 bg-zinc-950/80 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
                                <div>
                                    Showing page {purchases.current_page} of {purchases.last_page} ({purchases.total} records)
                                </div>
                                <div className="flex items-center gap-1">
                                    {purchases.links.map((link, idx) => (
                                        <button
                                            key={idx}
                                            disabled={!link.url || link.active}
                                            onClick={() => link.url && router.visit(link.url)}
                                            className={`px-2.5 py-1 rounded text-xs transition-colors ${
                                                link.active
                                                    ? 'bg-amber-500 text-zinc-950 font-bold'
                                                    : link.url
                                                    ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300'
                                                    : 'text-zinc-600 cursor-not-allowed'
                                            }`}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </Card>
                )}

                {/* TAB 2: SUPPLIERS DIRECTORY */}
                {activeTab === 'suppliers' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredSuppliers.length === 0 ? (
                            <div className="col-span-full py-12 text-center text-zinc-500 bg-zinc-900/40 rounded-2xl border border-zinc-800">
                                <Users className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                                <p className="font-khmer text-sm">មិនមានអ្នកផ្គត់ផ្គង់ត្រូវតាមការស្វែងរកទេ</p>
                                <Button
                                    onClick={() => openSupplierModal()}
                                    variant="outline"
                                    className="mt-3 text-xs bg-zinc-900 border-zinc-700 gap-1.5"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>បន្ថែមអ្នកផ្គត់ផ្គង់ថ្មី</span>
                                </Button>
                            </div>
                        ) : (
                            filteredSuppliers.map((supplier) => (
                                <Card
                                    key={supplier.id}
                                    className="bg-zinc-900/70 border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between hover:border-zinc-700 transition-all shadow-md group"
                                >
                                    <div className="space-y-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <h3 className="font-bold text-white text-sm font-khmer leading-snug group-hover:text-amber-400 transition-colors">
                                                    {supplier.name}
                                                </h3>
                                                {supplier.contact_person && (
                                                    <div className="text-xs text-zinc-400 mt-0.5">
                                                        តំណាង: {supplier.contact_person}
                                                    </div>
                                                )}
                                            </div>
                                            <Badge
                                                className={`text-[10px] font-mono uppercase ${
                                                    supplier.is_active
                                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                        : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                                                }`}
                                            >
                                                {supplier.is_active ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </div>

                                        <div className="space-y-1.5 text-xs text-zinc-400">
                                            {supplier.phone && (
                                                <div className="flex items-center gap-2">
                                                    <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                                    <span className="font-mono text-zinc-300">
                                                        {supplier.phone}
                                                    </span>
                                                </div>
                                            )}
                                            {supplier.address && (
                                                <div className="flex items-start gap-2">
                                                    <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                                                    <span className="text-zinc-400 line-clamp-2">
                                                        {supplier.address}
                                                    </span>
                                                </div>
                                            )}
                                            {supplier.notes && (
                                                <div className="text-[11px] text-zinc-500 bg-zinc-950/60 p-2 rounded-lg border border-zinc-850 italic">
                                                    {supplier.notes}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="pt-3 mt-3 border-t border-zinc-800/60 flex items-center justify-between text-xs">
                                        <div className="font-mono text-[11px] text-zinc-500">
                                            ទិញបាន: <span className="text-white font-bold">{supplier.purchases_count || 0}</span> លើក
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => handleToggleSupplier(supplier.id)}
                                                title={supplier.is_active ? 'ផ្អាកដំណើរការ' : 'បើកដំណើរការ'}
                                                className={`p-1.5 rounded-lg border transition-colors ${
                                                    supplier.is_active
                                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                                                        : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-zinc-200'
                                                }`}
                                            >
                                                {supplier.is_active ? (
                                                    <ToggleRight className="w-4 h-4" />
                                                ) : (
                                                    <ToggleLeft className="w-4 h-4" />
                                                )}
                                            </button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => openSupplierModal(supplier)}
                                                className="h-8 px-2.5 text-zinc-300 hover:text-white hover:bg-zinc-800 text-xs gap-1 cursor-pointer"
                                            >
                                                <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                                                <span>កែប្រែ</span>
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            ))
                        )}
                    </div>
                )}

                {/* MODAL 1: CREATE PURCHASE ORDER */}
                {purchaseModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
                        <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
                            {/* Modal Header */}
                            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                                        <Truck className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-bold text-white font-khmer">
                                            កត់ត្រាការទិញចូលស្តុកថ្មី (New Purchase Order)
                                        </h2>
                                        <p className="text-xs text-zinc-400 font-mono">
                                            Enter inbound goods, quantities, and supplier costs
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setPurchaseModalOpen(false)}
                                    className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <form onSubmit={handleCreatePurchase} className="flex-1 overflow-y-auto p-6 space-y-6">
                                {/* Supplier, Date, Status Row */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-zinc-300 mb-1 font-khmer">
                                            អ្នកផ្គត់ផ្គង់ (Supplier)
                                        </label>
                                        <select
                                            value={purchaseForm.data.supplier_id}
                                            onChange={(e) =>
                                                purchaseForm.setData('supplier_id', e.target.value)
                                            }
                                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                                        >
                                            <option value="">ទូទៅ / គ្មាន (Walk-in Cash Purchase)</option>
                                            {suppliers.map((s) => (
                                                <option key={s.id} value={s.id}>
                                                    {s.name} {s.phone ? `(${s.phone})` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-zinc-300 mb-1 font-khmer">
                                            កាលបរិច្ឆេទ (Date)
                                        </label>
                                        <Input
                                            type="date"
                                            value={purchaseForm.data.purchase_date}
                                            onChange={(e) =>
                                                purchaseForm.setData('purchase_date', e.target.value)
                                            }
                                            className="h-9 bg-zinc-900 border-zinc-800 text-xs text-white rounded-xl"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-zinc-300 mb-1 font-khmer">
                                            ស្ថានភាព (Status)
                                        </label>
                                        <select
                                            value={purchaseForm.data.status}
                                            onChange={(e) =>
                                                purchaseForm.setData('status', e.target.value as any)
                                            }
                                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                                        >
                                            <option value="received">ទទួលបានទំនិញរួច (Received)</option>
                                            <option value="pending">កំពុងរង់ចាំ (Pending)</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Reference Note */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-zinc-300 mb-1 font-khmer">
                                            លេខប័ណ្ណយោង / វិក្កយបត្រអ្នកលក់ (Reference #)
                                        </label>
                                        <Input
                                            value={purchaseForm.data.reference_note}
                                            onChange={(e) =>
                                                purchaseForm.setData('reference_note', e.target.value)
                                            }
                                            placeholder="ឧ. INV-KK-9021 ឬ CP-DO-4821"
                                            className="h-9 bg-zinc-900 border-zinc-800 text-xs text-white rounded-xl"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-zinc-300 mb-1 font-khmer">
                                            កំណត់សម្គាល់ (Notes)
                                        </label>
                                        <Input
                                            value={purchaseForm.data.notes}
                                            onChange={(e) =>
                                                purchaseForm.setData('notes', e.target.value)
                                            }
                                            placeholder="ឧ. ចូលស្តុកទូកកក ឬ ឃ្លាំងស្ងួត"
                                            className="h-9 bg-zinc-900 border-zinc-800 text-xs text-white rounded-xl"
                                        />
                                    </div>
                                </div>

                                {/* LINE ITEMS BUILDER */}
                                <div className="space-y-3 pt-2">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xs font-bold font-mono uppercase text-amber-400 tracking-wider flex items-center gap-2">
                                            <ShoppingBag className="w-3.5 h-3.5" />
                                            Line Items / មុខទំនិញទិញចូល
                                        </h3>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={addLineItem}
                                            className="h-7 px-2.5 text-xs bg-zinc-900 border-zinc-700 text-amber-400 hover:bg-zinc-800 gap-1 cursor-pointer"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            <span>បន្ថែមជួរទំនិញ</span>
                                        </Button>
                                    </div>

                                    <div className="border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-950/80">
                                        <table className="w-full text-left text-xs border-collapse">
                                            <thead>
                                                <tr className="bg-zinc-900/80 text-zinc-400 font-mono text-[11px] uppercase border-b border-zinc-800">
                                                    <th className="py-2.5 px-3">Quick Product</th>
                                                    <th className="py-2.5 px-3">Item Name / ឈ្មោះទំនិញ *</th>
                                                    <th className="py-2.5 px-3 w-28">Unit / ឯកតា</th>
                                                    <th className="py-2.5 px-3 w-24">Qty / ចំនួន</th>
                                                    <th className="py-2.5 px-3 w-28">Cost / ថ្លៃដើម ($)</th>
                                                    <th className="py-2.5 px-3 text-right w-28">Total ($)</th>
                                                    <th className="py-2.5 px-3 w-10"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                                                {purchaseForm.data.items.map((item, idx) => {
                                                    const lineTotal =
                                                        (Number(item.quantity) || 0) *
                                                        (Number(item.unit_cost) || 0);
                                                    return (
                                                        <tr key={idx} className="hover:bg-zinc-900/30">
                                                            {/* Quick pick from Catalog */}
                                                            <td className="py-2 px-3">
                                                                <select
                                                                    value={item.product_id}
                                                                    onChange={(e) =>
                                                                        updateLineItem(
                                                                            idx,
                                                                            'product_id',
                                                                            e.target.value
                                                                        )
                                                                    }
                                                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:border-amber-500"
                                                                >
                                                                    <option value="">-- ជ្រើសមុខទំនិញ --</option>
                                                                    {products.map((p) => (
                                                                        <option key={p.id} value={p.id}>
                                                                            {p.name_primary}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            </td>

                                                            {/* Custom or Selected Item Name */}
                                                            <td className="py-2 px-3">
                                                                <Input
                                                                    value={item.item_name}
                                                                    onChange={(e) =>
                                                                        updateLineItem(
                                                                            idx,
                                                                            'item_name',
                                                                            e.target.value
                                                                        )
                                                                    }
                                                                    placeholder="ឈ្មោះទំនិញ..."
                                                                    className="h-8 bg-zinc-900 border-zinc-800 text-xs text-white rounded-lg"
                                                                    required
                                                                />
                                                            </td>

                                                            {/* Unit */}
                                                            <td className="py-2 px-3">
                                                                <Input
                                                                    value={item.unit_name}
                                                                    onChange={(e) =>
                                                                        updateLineItem(
                                                                            idx,
                                                                            'unit_name',
                                                                            e.target.value
                                                                        )
                                                                    }
                                                                    placeholder="កំប៉ុង, ចាន..."
                                                                    className="h-8 bg-zinc-900 border-zinc-800 text-xs text-white rounded-lg"
                                                                />
                                                            </td>

                                                            {/* Quantity */}
                                                            <td className="py-2 px-3">
                                                                <Input
                                                                    type="number"
                                                                    step="any"
                                                                    min="0.01"
                                                                    value={item.quantity}
                                                                    onChange={(e) =>
                                                                        updateLineItem(
                                                                            idx,
                                                                            'quantity',
                                                                            parseFloat(e.target.value) || 0
                                                                        )
                                                                    }
                                                                    className="h-8 bg-zinc-900 border-zinc-800 text-xs text-white rounded-lg font-mono"
                                                                    required
                                                                />
                                                            </td>

                                                            {/* Unit Cost */}
                                                            <td className="py-2 px-3">
                                                                <Input
                                                                    type="number"
                                                                    step="0.01"
                                                                    min="0"
                                                                    value={item.unit_cost}
                                                                    onChange={(e) =>
                                                                        updateLineItem(
                                                                            idx,
                                                                            'unit_cost',
                                                                            parseFloat(e.target.value) || 0
                                                                        )
                                                                    }
                                                                    className="h-8 bg-zinc-900 border-zinc-800 text-xs text-white rounded-lg font-mono"
                                                                    required
                                                                />
                                                            </td>

                                                            {/* Line Total */}
                                                            <td className="py-2 px-3 text-right font-mono font-bold text-amber-400">
                                                                ${lineTotal.toFixed(2)}
                                                            </td>

                                                            {/* Delete line */}
                                                            <td className="py-2 px-3 text-center">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeLineItem(idx)}
                                                                    disabled={
                                                                        purchaseForm.data.items.length <= 1
                                                                    }
                                                                    className="text-zinc-500 hover:text-rose-400 disabled:opacity-30 disabled:hover:text-zinc-500 cursor-pointer"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Financial Summary Breakdown */}
                                <div className="p-4 bg-zinc-900/80 rounded-2xl border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-4 text-xs">
                                        <div>
                                            <label className="block text-zinc-400 text-[11px] mb-1">
                                                បញ្ចុះតម្លៃ / Discount ($)
                                            </label>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={purchaseForm.data.discount_amount}
                                                onChange={(e) =>
                                                    purchaseForm.setData(
                                                        'discount_amount',
                                                        parseFloat(e.target.value) || 0
                                                    )
                                                }
                                                className="w-24 h-8 bg-zinc-950 border-zinc-800 text-xs text-white rounded-lg font-mono"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-zinc-400 text-[11px] mb-1">
                                                ពន្ធ / Tax ($)
                                            </label>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={purchaseForm.data.tax_amount}
                                                onChange={(e) =>
                                                    purchaseForm.setData(
                                                        'tax_amount',
                                                        parseFloat(e.target.value) || 0
                                                    )
                                                }
                                                className="w-24 h-8 bg-zinc-950 border-zinc-800 text-xs text-white rounded-lg font-mono"
                                            />
                                        </div>
                                    </div>

                                    <div className="text-right space-y-0.5">
                                        <div className="text-xs text-zinc-400">
                                            Subtotal: <span className="font-mono text-zinc-200">${formSubtotal.toFixed(2)}</span>
                                        </div>
                                        <div className="text-lg font-bold text-amber-400 font-mono">
                                            Total: ${formTotal.toFixed(2)}
                                        </div>
                                        <div className="text-xs text-emerald-400 font-mono font-semibold">
                                            ≈ {formatKhr(formTotal)}
                                        </div>
                                    </div>
                                </div>

                                {/* Modal Actions */}
                                <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => setPurchaseModalOpen(false)}
                                        className="text-zinc-400 hover:text-white"
                                    >
                                        បោះបង់ (Cancel)
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={purchaseForm.processing}
                                        className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold px-6 shadow-lg shadow-amber-500/20"
                                    >
                                        {purchaseForm.processing ? 'កំពុងរក្សាទុក...' : 'កត់ត្រាទិញចូល (Save Purchase)'}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* MODAL 2: VIEW PURCHASE DETAIL INVOICE */}
                {viewPurchaseModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
                        <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
                            {/* Modal Header */}
                            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-base font-bold text-white font-mono">
                                            {viewPurchaseModal.purchase_number}
                                        </h2>
                                        <Badge
                                            className={`text-[10px] font-mono uppercase ${
                                                viewPurchaseModal.status === 'received'
                                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                                    : viewPurchaseModal.status === 'pending'
                                                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                                            }`}
                                        >
                                            {viewPurchaseModal.status}
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-zinc-400 font-khmer mt-0.5">
                                        ព័ត៌មានលម្អិតប័ណ្ណទិញចូលទំនិញ
                                    </p>
                                </div>
                                <button
                                    onClick={() => setViewPurchaseModal(null)}
                                    className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="p-6 space-y-5 overflow-y-auto">
                                <div className="grid grid-cols-2 gap-4 text-xs bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800">
                                    <div>
                                        <span className="text-zinc-500 block mb-0.5 font-khmer">អ្នកផ្គត់ផ្គង់:</span>
                                        <span className="font-bold text-white font-khmer">
                                            {viewPurchaseModal.supplier?.name || 'ទូទៅ (Walk-in Cash)'}
                                        </span>
                                        {viewPurchaseModal.supplier?.phone && (
                                            <span className="block font-mono text-zinc-400 mt-0.5">
                                                {viewPurchaseModal.supplier.phone}
                                            </span>
                                        )}
                                    </div>

                                    <div>
                                        <span className="text-zinc-500 block mb-0.5 font-khmer">កាលបរិច្ឆេទ & យោង:</span>
                                        <span className="font-mono text-zinc-300 block">
                                            Date: {formatDateOnly(viewPurchaseModal.purchase_date)}
                                        </span>
                                        {viewPurchaseModal.reference_note && (
                                            <span className="font-mono text-amber-400 block mt-0.5">
                                                Ref: {viewPurchaseModal.reference_note}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Items table */}
                                <div className="border border-zinc-800 rounded-2xl overflow-hidden">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead>
                                            <tr className="bg-zinc-900/80 text-zinc-400 font-mono text-[11px] uppercase border-b border-zinc-800">
                                                <th className="py-2.5 px-3">មុខទំនិញ (Item)</th>
                                                <th className="py-2.5 px-3 text-center">ចំនួន (Qty)</th>
                                                <th className="py-2.5 px-3 text-right">ថ្លៃឯកតា (Cost)</th>
                                                <th className="py-2.5 px-3 text-right">សរុប (Total)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                                            {viewPurchaseModal.items.map((item) => (
                                                <tr key={item.id} className="hover:bg-zinc-900/30">
                                                    <td className="py-2.5 px-3 font-khmer text-white font-semibold">
                                                        {item.item_name}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-center font-mono">
                                                        {item.quantity} {item.unit_name}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-right font-mono text-zinc-400">
                                                        {formatUsd(item.unit_cost)}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-400">
                                                        {formatUsd(item.total_cost)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Total summary */}
                                <div className="p-4 bg-zinc-900/80 rounded-2xl border border-zinc-800 flex items-center justify-between text-xs">
                                    <div className="space-y-1 text-zinc-400">
                                        <div>Subtotal: {formatUsd(viewPurchaseModal.subtotal)}</div>
                                        {valToNum(viewPurchaseModal.discount_amount) > 0 && (
                                            <div>Discount: -{formatUsd(viewPurchaseModal.discount_amount)}</div>
                                        )}
                                        {valToNum(viewPurchaseModal.tax_amount) > 0 && (
                                            <div>Tax: +{formatUsd(viewPurchaseModal.tax_amount)}</div>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xl font-bold font-mono text-white">
                                            {formatUsd(viewPurchaseModal.total_amount)}
                                        </div>
                                        <div className="text-xs font-mono text-emerald-400 font-bold">
                                            ≈ {formatKhr(viewPurchaseModal.total_amount)}
                                        </div>
                                    </div>
                                </div>

                                {/* Status actions */}
                                <div className="flex items-center justify-between pt-2">
                                    <div className="flex items-center gap-2">
                                        {viewPurchaseModal.status === 'pending' && (
                                            <Button
                                                size="sm"
                                                onClick={() =>
                                                    handleQuickStatusChange(
                                                        viewPurchaseModal.id,
                                                        'received'
                                                    )
                                                }
                                                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs gap-1"
                                            >
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                <span>ដាក់ជា ទទួលបានរួច (Mark Received)</span>
                                            </Button>
                                        )}
                                        {viewPurchaseModal.status !== 'cancelled' && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() =>
                                                    handleQuickStatusChange(
                                                        viewPurchaseModal.id,
                                                        'cancelled'
                                                    )
                                                }
                                                className="border-rose-800/80 text-rose-400 hover:bg-rose-500/10 text-xs gap-1"
                                            >
                                                <XCircle className="w-3.5 h-3.5" />
                                                <span>លុបចោលប័ណ្ណ (Cancel Bill)</span>
                                            </Button>
                                        )}
                                    </div>

                                    <Button
                                        variant="ghost"
                                        onClick={() => setViewPurchaseModal(null)}
                                        className="text-zinc-400 hover:text-white text-xs"
                                    >
                                        បិទ (Close)
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL 3: ADD / EDIT SUPPLIER */}
                {supplierModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
                        <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden my-auto">
                            {/* Modal Header */}
                            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
                                        <Users className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-bold text-white font-khmer">
                                            {editingSupplier
                                                ? 'កែប្រែអ្នកផ្គត់ផ្គង់ (Edit Supplier)'
                                                : 'បន្ថែមអ្នកផ្គត់ផ្គង់ថ្មី (New Supplier)'}
                                        </h2>
                                        <p className="text-xs text-zinc-400 font-mono">
                                            Vendor contact and supply profile
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSupplierModalOpen(false)}
                                    className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Modal Form */}
                            <form onSubmit={handleSupplierSubmit} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-300 mb-1 font-khmer">
                                        ឈ្មោះដេប៉ូ / ក្រុមហ៊ុនផ្គត់ផ្គង់ (Supplier Name) *
                                    </label>
                                    <Input
                                        value={supplierForm.data.name}
                                        onChange={(e) => supplierForm.setData('name', e.target.value)}
                                        placeholder="ឧ. ដេប៉ូលៀស & គ្រឿងសមុទ្រ កោះកុង"
                                        className="h-9 bg-zinc-900 border-zinc-800 text-xs text-white rounded-xl"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-zinc-300 mb-1 font-khmer">
                                            អ្នកទំនាក់ទំនង (Contact Person)
                                        </label>
                                        <Input
                                            value={supplierForm.data.contact_person}
                                            onChange={(e) =>
                                                supplierForm.setData('contact_person', e.target.value)
                                            }
                                            placeholder="ឧ. អ្នកស្រី ចាន់ណា"
                                            className="h-9 bg-zinc-900 border-zinc-800 text-xs text-white rounded-xl"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-zinc-300 mb-1 font-khmer">
                                            លេខទូរស័ព្ទ (Phone)
                                        </label>
                                        <Input
                                            value={supplierForm.data.phone}
                                            onChange={(e) =>
                                                supplierForm.setData('phone', e.target.value)
                                            }
                                            placeholder="012 345 678"
                                            className="h-9 bg-zinc-900 border-zinc-800 text-xs text-white rounded-xl font-mono"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-zinc-300 mb-1 font-khmer">
                                        អាសយដ្ឋាន (Address)
                                    </label>
                                    <Input
                                        value={supplierForm.data.address}
                                        onChange={(e) =>
                                            supplierForm.setData('address', e.target.value)
                                        }
                                        placeholder="ផ្សារអូរឫស្សី, ភ្នំពេញ..."
                                        className="h-9 bg-zinc-900 border-zinc-800 text-xs text-white rounded-xl"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-zinc-300 mb-1 font-khmer">
                                        កំណត់សម្គាល់ (Notes)
                                    </label>
                                    <Input
                                        value={supplierForm.data.notes}
                                        onChange={(e) =>
                                            supplierForm.setData('notes', e.target.value)
                                        }
                                        placeholder="ផ្គត់ផ្គង់លៀសហាលស្រស់, មឹក, បង្គា..."
                                        className="h-9 bg-zinc-900 border-zinc-800 text-xs text-white rounded-xl"
                                    />
                                </div>

                                <div className="flex items-center gap-2 pt-1">
                                    <input
                                        type="checkbox"
                                        id="supplier_active_toggle"
                                        checked={supplierForm.data.is_active}
                                        onChange={(e) =>
                                            supplierForm.setData('is_active', e.target.checked)
                                        }
                                        className="rounded border-zinc-700 bg-zinc-900 text-amber-500 focus:ring-amber-500"
                                    />
                                    <label
                                        htmlFor="supplier_active_toggle"
                                        className="text-xs text-zinc-300 font-khmer cursor-pointer"
                                    >
                                        បើកដំណើរការដៃគូផ្គត់ផ្គង់នេះ (Active Supplier)
                                    </label>
                                </div>

                                <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => setSupplierModalOpen(false)}
                                        className="text-zinc-400 hover:text-white"
                                    >
                                        បោះបង់ (Cancel)
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={supplierForm.processing}
                                        className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold px-5"
                                    >
                                        {supplierForm.processing
                                            ? 'កំពុងរក្សាទុក...'
                                            : editingSupplier
                                            ? 'កែប្រែអ្នកផ្គត់ផ្គង់'
                                            : 'បន្ថែមអ្នកផ្គត់ផ្គង់'}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
