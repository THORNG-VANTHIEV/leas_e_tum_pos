import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AppLayout } from '@/layouts/app-layout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Head, useForm, router, usePage } from '@inertiajs/react';
import { PageProps } from '@/types';
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
    Package,
    ArrowUpDown,
    Check,
    ArrowLeft,
    Building2,
    Sparkles,
    ShieldCheck,
    Tag,
    Pencil,
} from 'lucide-react';
import { CashierFilter, CashierOption } from '@/components/cashier-filter';

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
    filters: { cashier_id: number | null };
    cashiers: CashierOption[];
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
    filters,
    cashiers,
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
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Prevent background page from scrolling when modal is open
    useEffect(() => {
        if (purchaseModalOpen || viewPurchaseModal !== null || supplierModalOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [purchaseModalOpen, viewPurchaseModal, supplierModalOpen]);

    // ESC key to close active modal
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (purchaseModalOpen) setPurchaseModalOpen(false);
                if (viewPurchaseModal) setViewPurchaseModal(null);
                if (supplierModalOpen) setSupplierModalOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [purchaseModalOpen, viewPurchaseModal, supplierModalOpen]);

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

    // Edit purchase (admin & supervisor only — mirrors route middleware)
    const { auth } = usePage<PageProps>().props;
    const canEditPurchases = ['admin', 'supervisor'].includes(auth.user?.role ?? '');
    const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);

    const openNewPurchase = () => {
        setEditingPurchase(null);
        purchaseForm.reset();
        purchaseForm.clearErrors();
        setPurchaseModalOpen(true);
    };

    const openEditPurchase = (purchase: Purchase) => {
        setEditingPurchase(purchase);
        purchaseForm.clearErrors();
        purchaseForm.setData({
            supplier_id: purchase.supplier_id ? String(purchase.supplier_id) : '',
            purchase_date: formatDateOnly(purchase.purchase_date),
            status: purchase.status,
            reference_note: purchase.reference_note ?? '',
            notes: purchase.notes ?? '',
            discount_amount: Number(purchase.discount_amount) || 0,
            tax_amount: Number(purchase.tax_amount) || 0,
            items: purchase.items.map((item) => ({
                product_id: item.product_id ? String(item.product_id) : '',
                item_name: item.item_name,
                unit_name: item.unit_name,
                quantity: Number(item.quantity) || 0,
                unit_cost: Number(item.unit_cost) || 0,
                notes: item.notes ?? '',
            })),
        });
        setViewPurchaseModal(null);
        setPurchaseModalOpen(true);
    };

    const handleCreatePurchase = (e: React.FormEvent) => {
        e.preventDefault();
        const options = {
            preserveScroll: true,
            onSuccess: () => {
                setPurchaseModalOpen(false);
                setEditingPurchase(null);
                purchaseForm.reset();
            },
        };

        if (editingPurchase) {
            purchaseForm.patch(`/purchases/${editingPurchase.id}`, options);
            return;
        }

        purchaseForm.post('/purchases', options);
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
                            <CashierFilter cashiers={cashiers} value={filters.cashier_id} />
                            <Button
                                onClick={() => openSupplierModal()}
                                variant="outline"
                                className="bg-zinc-900 border-zinc-700/80 hover:bg-zinc-800 text-zinc-200 text-xs gap-1.5 cursor-pointer shadow-sm"
                            >
                                <Users className="w-4 h-4 text-emerald-400" />
                                <span>អ្នកផ្គត់ផ្គង់ (Supplier)</span>
                            </Button>
                            <Button
                                onClick={openNewPurchase}
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
                            <table className="w-full table-fixed text-left text-xs border-collapse">
                                <thead>
                                    <tr className="border-b border-zinc-800/80 bg-zinc-950/60 text-zinc-400 font-mono text-[11px] uppercase">
                                        <th className="py-3 px-3 sm:px-4 w-[14%] whitespace-nowrap">លេខការទិញ</th>
                                        <th className="py-3 px-3 sm:px-4 w-[20%]">Supplier / អ្នកផ្គត់ផ្គង់</th>
                                        <th className="py-3 px-3 sm:px-4 w-[11%] whitespace-nowrap">Date / កាលបរិច្ឆេទ</th>
                                        <th className="py-3 px-3 sm:px-4 w-[26%]">Items / ទំនិញ</th>
                                        <th className="py-3 px-3 sm:px-4 w-[11%] text-right whitespace-nowrap">Total ($ / ៛)</th>
                                        <th className="py-3 px-3 sm:px-4 w-[12%] text-center whitespace-nowrap">ស្ថានភាព</th>
                                        <th className="py-3 px-3 sm:px-4 w-[6%] text-center whitespace-nowrap">សកម្មភាព</th>
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
                                                        រកមិនឃើញការទិញចូលទេ។
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
                                                    <td className="py-3 px-3 sm:px-4 whitespace-nowrap">
                                                        <div className="font-mono font-bold text-amber-400 whitespace-nowrap">
                                                            {purchase.purchase_number}
                                                        </div>
                                                        {purchase.reference_note && (
                                                            <div className="text-[10px] text-zinc-500 font-mono truncate">
                                                                Ref: {purchase.reference_note}
                                                            </div>
                                                        )}
                                                    </td>

                                                    <td className="py-3 px-3 sm:px-4">
                                                        <div className="font-semibold text-white font-khmer truncate" title={purchase.supplier?.name || ''}>
                                                            {purchase.supplier?.name || (
                                                                <span className="text-zinc-500 font-sans italic">
                                                                    ទូទៅ (Walk-in / Cash)
                                                                </span>
                                                            )}
                                                        </div>
                                                        {purchase.supplier?.phone && (
                                                            <div className="text-[10px] text-zinc-500 font-mono truncate">
                                                                {purchase.supplier.phone}
                                                            </div>
                                                        )}
                                                    </td>

                                                    <td className="py-3 px-3 sm:px-4 font-mono text-zinc-300 text-xs whitespace-nowrap">
                                                        {formatDateOnly(purchase.purchase_date)}
                                                    </td>

                                                    <td className="py-3 px-3 sm:px-4">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <span className="shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-zinc-800/90 text-amber-300 border border-zinc-700/70 font-mono text-xs font-semibold shadow-xs">
                                                                <Package className="w-3.5 h-3.5 text-amber-400" />
                                                                <span>{purchase.items.length} មុខ</span>
                                                            </span>
                                                            <span
                                                                className="text-zinc-300 truncate text-xs font-khmer min-w-0"
                                                                title={purchase.items
                                                                    .map((i) => `${i.item_name} (x${i.quantity || 1} ${i.unit_name || ''})`)
                                                                    .join('\n')}
                                                            >
                                                                {purchase.items.map((i) => i.item_name).join(', ')}
                                                            </span>
                                                        </div>
                                                    </td>

                                                    <td className="py-3 px-3 sm:px-4 text-right whitespace-nowrap">
                                                        <div className="font-mono font-bold text-white text-sm">
                                                            {formatUsd(totalNum)}
                                                        </div>
                                                        <div className="font-mono text-[11px] text-emerald-400">
                                                            {formatKhr(totalNum)}
                                                        </div>
                                                    </td>

                                                    <td className="py-3 px-3 sm:px-4 text-center whitespace-nowrap">
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

                                                    <td className="py-3 px-3 sm:px-4 text-center whitespace-nowrap">
                                                        <div className="flex items-center justify-center gap-1.5">
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => setViewPurchaseModal(purchase)}
                                                                className="h-7 w-7 p-0 rounded-lg border-zinc-700 bg-zinc-800/90 text-zinc-300 hover:text-white hover:bg-zinc-700 hover:border-zinc-600 inline-flex items-center justify-center cursor-pointer shadow-sm transition"
                                                                title="មើលប័ណ្ណលម្អិត / View Purchase Bill"
                                                            >
                                                                <Eye className="w-3.5 h-3.5 text-amber-400" />
                                                            </Button>

                                                            {canEditPurchases && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() => openEditPurchase(purchase)}
                                                                    className="h-7 w-7 p-0 text-zinc-400 hover:text-amber-500 hover:bg-amber-500/10 rounded-lg inline-flex items-center justify-center cursor-pointer"
                                                                    title="កែប្រែ (Edit)"
                                                                >
                                                                    <Pencil className="w-3.5 h-3.5" />
                                                                </Button>
                                                            )}

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
                                                                    className="h-7 w-7 p-0 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-lg inline-flex items-center justify-center cursor-pointer"
                                                                    title="បានទទួលទំនិញ"
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
                                                {supplier.is_active ? 'សកម្ម' : 'បិទ'}
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

                {/* MODAL 1: CREATE PURCHASE ORDER - FULL WORKSPACE */}
                {purchaseModalOpen && mounted && createPortal(
                    <div
                        className="fixed inset-y-0 right-0 left-0 md:left-[var(--sidebar-width,16rem)] z-50 flex flex-col bg-zinc-950/75 backdrop-blur-md animate-in fade-in duration-200 overscroll-contain"
                        onWheel={(e) => e.stopPropagation()}
                    >
                        <div className="relative w-full h-full bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col transition-all duration-200">
                            {/* Modal Header */}
                            <div className="px-6 py-3.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/60 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-xs shrink-0">
                                        <Truck className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-base font-bold text-zinc-900 dark:text-white font-khmer">
                                                {editingPurchase ? `កែប្រែការទិញចូល #${editingPurchase.purchase_number}` : 'កត់ត្រាការទិញចូលស្តុកថ្មី'}
                                            </h3>
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 font-mono">
                                                {editingPurchase ? 'កែការទិញចូល' : 'ការទិញចូលថ្មី'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-khmer">
                                            បញ្ចូលព័ត៌មានអ្នកផ្គត់ផ្គង់ កាលបរិច្ឆេទ និងបញ្ជីមុខទំនិញទិញចូលស្តុក POS
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setPurchaseModalOpen(false)}
                                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-950 dark:hover:text-white transition-all cursor-pointer font-khmer text-xs font-semibold shadow-xs group"
                                    title="ត្រឡប់ក្រោយ (Esc)"
                                >
                                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform text-amber-500" />
                                    <span>ត្រឡប់ក្រោយ</span>
                                </button>
                            </div>

                            {/* Form Body - 2 Columns (4 / 8) */}
                            <form onSubmit={handleCreatePurchase} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                                <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-0 overflow-y-auto lg:overflow-hidden">
                                    {/* LEFT COLUMN: Order Details & Financials (4 cols on lg) */}
                                    <div className="lg:col-span-4 flex flex-col gap-3.5 overflow-y-auto pr-1">
                                        {/* Card 1: ព័ត៌មានទូទៅនៃការទិញ */}
                                        <div className="p-4 rounded-2xl bg-zinc-50/70 dark:bg-zinc-900/40 border border-[#cbd5e1] dark:border-zinc-800/80 space-y-3 shrink-0">
                                            <div className="flex items-center gap-2 text-xs font-bold text-zinc-800 dark:text-zinc-200 font-khmer">
                                                <Receipt className="w-3.5 h-3.5 text-amber-500" />
                                                <span>ព័ត៌មានការទិញ / Order Info</span>
                                            </div>

                                            <div className="space-y-2.5">
                                                <div>
                                                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1 font-khmer">
                                                        អ្នកផ្គត់ផ្គង់ (Supplier)
                                                    </label>
                                                    <select
                                                        value={purchaseForm.data.supplier_id}
                                                        onChange={(e) => purchaseForm.setData('supplier_id', e.target.value)}
                                                        className="w-full h-9 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 font-khmer transition-all cursor-pointer"
                                                    >
                                                        <option value="">ទូទៅ / គ្មាន (Walk-in Cash Purchase)</option>
                                                        {suppliers.map((s) => (
                                                            <option key={s.id} value={s.id}>
                                                                {s.name} {s.phone ? `(${s.phone})` : ''}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className="grid grid-cols-2 gap-2.5">
                                                    <div>
                                                        <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1 font-khmer">
                                                            កាលបរិច្ឆេទ (Date) <span className="text-rose-500">*</span>
                                                        </label>
                                                        <input
                                                            type="date"
                                                            value={purchaseForm.data.purchase_date}
                                                            onChange={(e) => purchaseForm.setData('purchase_date', e.target.value)}
                                                            className="w-full h-9 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500 font-mono transition-all"
                                                            required
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1 font-khmer">
                                                            ស្ថានភាព (Status)
                                                        </label>
                                                        <select
                                                            value={purchaseForm.data.status}
                                                            onChange={(e) => purchaseForm.setData('status', e.target.value as any)}
                                                            className="w-full h-9 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500 font-khmer transition-all cursor-pointer"
                                                        >
                                                            <option value="received">ទទួលបានរួច (Received)</option>
                                                            <option value="pending">កំពុងរង់ចាំ (Pending)</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1 font-khmer">
                                                        លេខប័ណ្ណយោង / វិក្កយបត្រ (Ref #)
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={purchaseForm.data.reference_note}
                                                        onChange={(e) => purchaseForm.setData('reference_note', e.target.value)}
                                                        placeholder="ឧ. INV-KK-9021 ឬ CP-DO-4821"
                                                        className="w-full h-9 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs font-mono text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-amber-500 transition-all"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1 font-khmer">
                                                        កំណត់សម្គាល់ (Notes)
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={purchaseForm.data.notes}
                                                        onChange={(e) => purchaseForm.setData('notes', e.target.value)}
                                                        placeholder="ឧ. ចូលស្តុកទូកកក ឬ ឃ្លាំងស្ងួត"
                                                        className="w-full h-9 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 font-khmer focus:outline-none focus:border-amber-500 transition-all"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Card 2: សង្ខេបហិរញ្ញវត្ថុ (Financial Summary) */}
                                        <div className="p-4 rounded-2xl bg-zinc-50/70 dark:bg-zinc-900/40 border border-[#cbd5e1] dark:border-zinc-800/80 space-y-3 shrink-0">
                                            <div className="flex items-center gap-2 text-xs font-bold text-zinc-800 dark:text-zinc-200 font-khmer">
                                                <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                                                <span>សង្ខេបហិរញ្ញវត្ថុ / Financial Summary</span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2.5">
                                                <div>
                                                    <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1 font-khmer">
                                                        បញ្ចុះតម្លៃ / Discount ($)
                                                    </label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        value={purchaseForm.data.discount_amount}
                                                        onChange={(e) => purchaseForm.setData('discount_amount', parseFloat(e.target.value) || 0)}
                                                        className="w-full h-9 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-zinc-900 dark:text-white font-mono focus:outline-none focus:border-amber-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1 font-khmer">
                                                        ពន្ធ / Tax ($)
                                                    </label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        value={purchaseForm.data.tax_amount}
                                                        onChange={(e) => purchaseForm.setData('tax_amount', parseFloat(e.target.value) || 0)}
                                                        className="w-full h-9 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-zinc-900 dark:text-white font-mono focus:outline-none focus:border-amber-500"
                                                    />
                                                </div>
                                            </div>

                                            <div className="pt-2 border-t border-zinc-200/80 dark:border-zinc-800/80 space-y-1.5">
                                                <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400 font-khmer">
                                                    <span>សរុបដើមគ្រា (Subtotal):</span>
                                                    <span className="font-mono font-semibold text-zinc-900 dark:text-white">${formSubtotal.toFixed(2)}</span>
                                                </div>
                                                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                                                    <div>
                                                        <span className="text-xs font-bold text-amber-700 dark:text-amber-300 font-khmer block">
                                                            ទឹកប្រាក់សរុប (Grand Total)
                                                        </span>
                                                        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                                                            ≈ {formatKhr(formTotal)}
                                                        </span>
                                                    </div>
                                                    <span className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400">
                                                        ${formTotal.toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* RIGHT COLUMN: Line Items Builder (8 cols on lg) */}
                                    <div className="lg:col-span-8 flex flex-col p-4 sm:p-5 rounded-2xl bg-zinc-50/70 dark:bg-zinc-900/40 border border-[#cbd5e1] dark:border-zinc-800/80 min-h-0">
                                        {/* Table Header Controls */}
                                        <div className="flex items-center justify-between pb-3 border-b border-zinc-200/80 dark:border-zinc-800/80 mb-3 shrink-0">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
                                                    <ShoppingBag className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <span className="text-xs font-bold text-zinc-900 dark:text-white font-khmer block">
                                                        មុខទំនិញទិញចូល (Inbound Line Items)
                                                    </span>
                                                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-khmer block">
                                                        មានសរុប {purchaseForm.data.items.length} មុខទំនិញ
                                                    </span>
                                                </div>
                                            </div>

                                            <Button
                                                type="button"
                                                size="sm"
                                                onClick={addLineItem}
                                                className="h-8 px-3 text-xs bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold font-khmer rounded-xl gap-1.5 shadow-sm shadow-amber-500/20 cursor-pointer"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                                <span>បន្ថែមជួរទំនិញ (Add Row)</span>
                                            </Button>
                                        </div>

                                        {/* Line Items Table Container */}
                                        <div className="flex-1 min-h-[220px] border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-950/80 flex flex-col">
                                            <div className="overflow-x-auto flex-1 min-h-0">
                                                <table className="w-full text-left text-xs border-collapse">
                                                    <thead className="sticky top-0 z-10 bg-zinc-100 dark:bg-zinc-900/95 border-b border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono text-[11px] uppercase whitespace-nowrap">
                                                        <tr>
                                                            <th className="py-2.5 px-3 w-48">មុខទំនិញ</th>
                                                            <th className="py-2.5 px-3">Item Name / ឈ្មោះទំនិញ *</th>
                                                            <th className="py-2.5 px-3 w-28">Unit / ឯកតា</th>
                                                            <th className="py-2.5 px-3 w-24">Qty / ចំនួន</th>
                                                            <th className="py-2.5 px-3 w-28">Cost / ថ្លៃដើម ($)</th>
                                                            <th className="py-2.5 px-3 text-right w-28">សរុប ($)</th>
                                                            <th className="py-2.5 px-3 w-10 text-center"></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60 text-zinc-700 dark:text-zinc-300">
                                                        {purchaseForm.data.items.map((item, idx) => {
                                                            const lineTotal = (Number(item.quantity) || 0) * (Number(item.unit_cost) || 0);
                                                            return (
                                                                <tr key={idx} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors">
                                                                    {/* Quick pick from Catalog */}
                                                                    <td className="py-2 px-2.5">
                                                                        <select
                                                                            value={item.product_id}
                                                                            onChange={(e) => updateLineItem(idx, 'product_id', e.target.value)}
                                                                            className="w-full h-8 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 text-xs text-zinc-900 dark:text-zinc-300 focus:outline-none focus:border-amber-500 cursor-pointer truncate"
                                                                        >
                                                                            <option value="">-- រើសមុខទំនិញ --</option>
                                                                            {products.map((p) => (
                                                                                <option key={p.id} value={p.id}>
                                                                                    {p.name_primary}
                                                                                </option>
                                                                            ))}
                                                                        </select>
                                                                    </td>

                                                                    {/* Item Name */}
                                                                    <td className="py-2 px-2.5">
                                                                        <input
                                                                            type="text"
                                                                            value={item.item_name}
                                                                            onChange={(e) => updateLineItem(idx, 'item_name', e.target.value)}
                                                                            placeholder="ឈ្មោះទំនិញ..."
                                                                            className="w-full h-8 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 text-xs text-zinc-900 dark:text-white font-khmer focus:outline-none focus:border-amber-500"
                                                                            required
                                                                        />
                                                                    </td>

                                                                    {/* Unit */}
                                                                    <td className="py-2 px-2.5">
                                                                        <input
                                                                            type="text"
                                                                            value={item.unit_name}
                                                                            onChange={(e) => updateLineItem(idx, 'unit_name', e.target.value)}
                                                                            placeholder="កំប៉ុង, ចាន..."
                                                                            className="w-full h-8 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 text-xs text-zinc-900 dark:text-white font-khmer focus:outline-none focus:border-amber-500"
                                                                        />
                                                                    </td>

                                                                    {/* Quantity */}
                                                                    <td className="py-2 px-2.5">
                                                                        <input
                                                                            type="number"
                                                                            step="any"
                                                                            min="0.01"
                                                                            value={item.quantity}
                                                                            onChange={(e) => updateLineItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                                                                            className="w-full h-8 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 text-xs text-zinc-900 dark:text-white font-mono focus:outline-none focus:border-amber-500"
                                                                            required
                                                                        />
                                                                    </td>

                                                                    {/* Unit Cost */}
                                                                    <td className="py-2 px-2.5">
                                                                        <input
                                                                            type="number"
                                                                            step="0.01"
                                                                            min="0"
                                                                            value={item.unit_cost}
                                                                            onChange={(e) => updateLineItem(idx, 'unit_cost', parseFloat(e.target.value) || 0)}
                                                                            className="w-full h-8 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 text-xs text-zinc-900 dark:text-white font-mono focus:outline-none focus:border-amber-500"
                                                                            required
                                                                        />
                                                                    </td>

                                                                    {/* Line Total */}
                                                                    <td className="py-2 px-3 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                                                                        ${lineTotal.toFixed(2)}
                                                                    </td>

                                                                    {/* Delete Line */}
                                                                    <td className="py-2 px-2 text-center">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => removeLineItem(idx)}
                                                                            disabled={purchaseForm.data.items.length <= 1}
                                                                            className="p-1 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 disabled:opacity-20 disabled:hover:text-zinc-400 disabled:hover:bg-transparent cursor-pointer transition-colors"
                                                                            title="លុបជួរនេះ"
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
                                    </div>
                                </div>

                                {/* Modal Actions Footer */}
                                <div className="px-6 py-3.5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/60 flex items-center justify-between shrink-0">
                                    <div className="text-xs text-zinc-500 dark:text-zinc-400 font-khmer hidden sm:block">
                                        * សូមពិនិត្យបញ្ជីមុខទំនិញ និងថ្លៃដើមឱ្យបានត្រឹមត្រូវមុននឹងចុចកត់ត្រាចូលស្តុក
                                    </div>
                                    <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setPurchaseModalOpen(false)}
                                            className="border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-khmer text-xs rounded-xl h-9 px-4 cursor-pointer"
                                        >
                                            បោះបង់ (Cancel)
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={purchaseForm.processing}
                                            className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold font-khmer text-xs rounded-xl h-9 px-5 shadow-md shadow-amber-500/20 inline-flex items-center gap-2 cursor-pointer"
                                        >
                                            <Truck className="w-4 h-4" />
                                            <span>{purchaseForm.processing ? 'កំពុងរក្សាទុក...' : editingPurchase ? 'រក្សាទុកការកែប្រែ (Save)' : 'កត់ត្រាទិញចូលស្តុក (Save)'}</span>
                                        </Button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>,
                    document.body
                )}

                {/* MODAL 2: VIEW PURCHASE DETAIL INVOICE */}
                {mounted && viewPurchaseModal && createPortal(
                    <div className="fixed inset-y-0 right-0 left-0 md:left-[var(--sidebar-width,16rem)] z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/75 backdrop-blur-sm overflow-y-auto">
                        <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
                            {/* Modal Header */}
                            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/60">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-base font-bold text-zinc-900 dark:text-white font-mono">
                                            {viewPurchaseModal.purchase_number}
                                        </h2>
                                        <Badge
                                            className={`text-[10px] font-mono uppercase ${
                                                viewPurchaseModal.status === 'received'
                                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                                    : viewPurchaseModal.status === 'pending'
                                                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                                                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                                            }`}
                                        >
                                            {viewPurchaseModal.status}
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-khmer mt-0.5">
                                        ព័ត៌មានលម្អិតប័ណ្ណទិញចូលទំនិញ
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setViewPurchaseModal(null)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-khmer font-medium transition-colors shadow-xs cursor-pointer"
                                    title="ត្រឡប់ក្រោយ (Esc)"
                                >
                                    <ArrowLeft className="w-3.5 h-3.5" />
                                    <span>ត្រឡប់ក្រោយ</span>
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="p-6 space-y-5 overflow-y-auto">
                                <div className="grid grid-cols-2 gap-4 text-xs bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                                    <div>
                                        <span className="text-zinc-500 block mb-0.5 font-khmer">អ្នកផ្គត់ផ្គង់:</span>
                                        <span className="font-bold text-zinc-900 dark:text-white font-khmer">
                                            {viewPurchaseModal.supplier?.name || 'ទូទៅ (Walk-in Cash)'}
                                        </span>
                                        {viewPurchaseModal.supplier?.phone && (
                                            <span className="block font-mono text-zinc-500 dark:text-zinc-400 mt-0.5">
                                                {viewPurchaseModal.supplier.phone}
                                            </span>
                                        )}
                                    </div>

                                    <div>
                                        <span className="text-zinc-500 block mb-0.5 font-khmer">កាលបរិច្ឆេទ & យោង:</span>
                                        <span className="font-mono text-zinc-700 dark:text-zinc-300 block">
                                            Date: {formatDateOnly(viewPurchaseModal.purchase_date)}
                                        </span>
                                        {viewPurchaseModal.reference_note && (
                                            <span className="font-mono text-amber-600 dark:text-amber-400 block mt-0.5">
                                                Ref: {viewPurchaseModal.reference_note}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Items table */}
                                <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead>
                                            <tr className="bg-zinc-100 dark:bg-zinc-900/80 text-zinc-600 dark:text-zinc-400 font-mono text-[11px] uppercase border-b border-zinc-200 dark:border-zinc-800">
                                                <th className="py-2.5 px-3">មុខទំនិញ (Item)</th>
                                                <th className="py-2.5 px-3 text-center">ចំនួន (Qty)</th>
                                                <th className="py-2.5 px-3 text-right">ថ្លៃឯកតា (Cost)</th>
                                                <th className="py-2.5 px-3 text-right">សរុប (Total)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60 text-zinc-700 dark:text-zinc-300">
                                            {viewPurchaseModal.items.map((item) => (
                                                <tr key={item.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/30">
                                                    <td className="py-2.5 px-3 font-khmer text-zinc-900 dark:text-white font-semibold">
                                                        {item.item_name}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-center font-mono">
                                                        {item.quantity} {item.unit_name}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-right font-mono text-zinc-500 dark:text-zinc-400">
                                                        {formatUsd(item.unit_cost)}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                                                        {formatUsd(item.total_cost)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Total summary */}
                                <div className="p-4 bg-zinc-50 dark:bg-zinc-900/80 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs">
                                    <div className="space-y-1 text-zinc-500 dark:text-zinc-400">
                                        <div>Subtotal: {formatUsd(viewPurchaseModal.subtotal)}</div>
                                        {valToNum(viewPurchaseModal.discount_amount) > 0 && (
                                            <div>Discount: -{formatUsd(viewPurchaseModal.discount_amount)}</div>
                                        )}
                                        {valToNum(viewPurchaseModal.tax_amount) > 0 && (
                                            <div>Tax: +{formatUsd(viewPurchaseModal.tax_amount)}</div>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xl font-bold font-mono text-zinc-900 dark:text-white">
                                            {formatUsd(viewPurchaseModal.total_amount)}
                                        </div>
                                        <div className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-bold">
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
                                                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs gap-1 cursor-pointer"
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
                                                className="border-rose-300 dark:border-rose-800/80 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-xs gap-1 cursor-pointer"
                                            >
                                                <XCircle className="w-3.5 h-3.5" />
                                                <span>លុបចោលប័ណ្ណ (Cancel Bill)</span>
                                            </Button>
                                        )}
                                    </div>

                                    <Button
                                        variant="ghost"
                                        onClick={() => setViewPurchaseModal(null)}
                                        className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white text-xs cursor-pointer"
                                    >
                                        បិទ (Close)
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

                {/* MODAL 3: ADD / EDIT SUPPLIER (Full-Workspace 2-Column Layout) */}
                {mounted && supplierModalOpen && createPortal(
                    <div
                        className="fixed inset-y-0 right-0 left-0 md:left-[var(--sidebar-width,16rem)] z-50 flex flex-col bg-zinc-50 dark:bg-zinc-950 overflow-hidden select-none animate-in fade-in duration-150 h-screen"
                        onWheel={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="px-6 py-3.5 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between shrink-0 shadow-xs">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-600 dark:text-teal-400 shadow-xs shrink-0">
                                    <Truck className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-base font-bold text-zinc-900 dark:text-white font-khmer">
                                            {editingSupplier
                                                ? 'កែប្រែព័ត៌មានអ្នកផ្គត់ផ្គង់'
                                                : 'បន្ថែមអ្នកផ្គត់ផ្គង់ថ្មី'}
                                        </h2>
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/20 font-mono">
                                            {editingSupplier ? 'កែអ្នកផ្គត់ផ្គង់' : 'អ្នកផ្គត់ផ្គង់ថ្មី'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-khmer">
                                        {editingSupplier
                                            ? editingSupplier.name
                                            : 'បង្កើត និងកត់ត្រាប្រវត្តិដៃគូផ្គត់ផ្គង់ទំនិញ គ្រឿងទេស និងគ្រឿងសមុទ្រសម្រាប់ស្តុក'}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSupplierModalOpen(false)}
                                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-950 dark:hover:text-white transition-all cursor-pointer font-khmer text-xs font-semibold shadow-xs group"
                                title="ត្រឡប់ក្រោយ (Esc)"
                            >
                                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform text-teal-600 dark:text-teal-400" />
                                <span>ត្រឡប់ក្រោយ</span>
                            </button>
                        </div>

                        {/* Workspace Body - 2 Columns (7 / 5) */}
                        <form onSubmit={handleSupplierSubmit} className="flex flex-col flex-1 min-h-0 overflow-y-auto">
                            <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1">
                                {/* LEFT COLUMN: Form Inputs (7 cols) */}
                                <div className="lg:col-span-7 space-y-4">
                                    {/* Section 1: Business Identity */}
                                    <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-3.5 shadow-xs">
                                        <div className="flex items-center gap-2 text-xs font-bold text-zinc-800 dark:text-zinc-200 font-khmer pb-1 border-b border-zinc-100 dark:border-zinc-800">
                                            <Building2 className="w-4 h-4 text-teal-500" />
                                            <span>ព័ត៌មានដេប៉ូ & អាជីវកម្មផ្គត់ផ្គង់ / Vendor Profile</span>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1 font-khmer">
                                                ឈ្មោះដេប៉ូ / ក្រុមហ៊ុនផ្គត់ផ្គង់ (Supplier Name) <span className="text-rose-500">*</span>
                                            </label>
                                            <Input
                                                value={supplierForm.data.name}
                                                onChange={(e) => supplierForm.setData('name', e.target.value)}
                                                placeholder="ឧ. ដេប៉ូលៀស & គ្រឿងសមុទ្រ កោះកុង"
                                                className="h-10 bg-zinc-50 dark:bg-zinc-950 border-zinc-300 dark:border-zinc-800 text-sm font-semibold text-zinc-900 dark:text-white rounded-xl focus:border-teal-500"
                                                required
                                            />
                                        </div>

                                        {/* Supply Categories Quick Suggestion */}
                                        <div>
                                            <label className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5 font-khmer">
                                                ប្រភេទមុខទំនិញផ្គត់ផ្គង់ចម្បង (Supply Category)
                                            </label>
                                            <div className="flex flex-wrap gap-1.5">
                                                {[
                                                    'លៀសហាលស្រស់ & គ្រឿងសមុទ្រ',
                                                    'ភេសជ្ជៈ & ទឹកក្រូច',
                                                    'សាច់គោ & សាច់មាន់',
                                                    'បន្លែស្រស់ & គ្រឿងទេស',
                                                    'សម្ភារវេចខ្ចប់ & ថង់',
                                                ].map((cat) => {
                                                    const isSelected = supplierForm.data.notes.includes(cat);
                                                    return (
                                                        <button
                                                            key={cat}
                                                            type="button"
                                                            onClick={() => {
                                                                if (isSelected) {
                                                                    supplierForm.setData(
                                                                        'notes',
                                                                        supplierForm.data.notes
                                                                            .replace(cat, '')
                                                                            .replace(/,\s*,/g, ',')
                                                                            .trim()
                                                                    );
                                                                } else {
                                                                    supplierForm.setData(
                                                                        'notes',
                                                                        supplierForm.data.notes
                                                                            ? `${supplierForm.data.notes}, ${cat}`
                                                                            : cat
                                                                    );
                                                                }
                                                            }}
                                                            className={`px-2.5 py-1 rounded-lg text-[11px] font-khmer font-medium transition cursor-pointer border ${
                                                                isSelected
                                                                    ? 'bg-teal-500/15 border-teal-500/40 text-teal-700 dark:text-teal-300 font-bold'
                                                                    : 'bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-teal-400/50'
                                                            }`}
                                                        >
                                                            + {cat}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section 2: Contact & Location */}
                                    <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-3.5 shadow-xs">
                                        <div className="flex items-center gap-2 text-xs font-bold text-zinc-800 dark:text-zinc-200 font-khmer pb-1 border-b border-zinc-100 dark:border-zinc-800">
                                            <Users className="w-4 h-4 text-teal-500" />
                                            <span>ព័ត៌មានទំនាក់ទំនង & ទីតាំង / Contact & Address</span>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                            <div>
                                                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1 font-khmer">
                                                    អ្នកទំនាក់ទំនង (Contact Person)
                                                </label>
                                                <div className="relative">
                                                    <Input
                                                        value={supplierForm.data.contact_person}
                                                        onChange={(e) =>
                                                            supplierForm.setData('contact_person', e.target.value)
                                                        }
                                                        placeholder="ឧ. អ្នកស្រី ចាន់ណា"
                                                        className="h-9.5 pl-8.5 bg-zinc-50 dark:bg-zinc-950 border-zinc-300 dark:border-zinc-800 text-xs text-zinc-900 dark:text-white rounded-xl focus:border-teal-500"
                                                    />
                                                    <Users className="w-4 h-4 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1 font-khmer">
                                                    លេខទូរស័ព្ទ (Phone Number)
                                                </label>
                                                <div className="relative">
                                                    <Input
                                                        value={supplierForm.data.phone}
                                                        onChange={(e) =>
                                                            supplierForm.setData('phone', e.target.value)
                                                        }
                                                        placeholder="012 345 678"
                                                        className="h-9.5 pl-8.5 bg-zinc-50 dark:bg-zinc-950 border-zinc-300 dark:border-zinc-800 text-xs text-zinc-900 dark:text-white rounded-xl font-mono focus:border-teal-500"
                                                    />
                                                    <Phone className="w-4 h-4 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1 font-khmer">
                                                អាសយដ្ឋាន / ទីតាំងដេប៉ូ (Depot Address)
                                            </label>
                                            <div className="relative">
                                                <Input
                                                    value={supplierForm.data.address}
                                                    onChange={(e) =>
                                                        supplierForm.setData('address', e.target.value)
                                                    }
                                                    placeholder="ឧ. ផ្សារអូរឫស្សី, រាជធានីភ្នំពេញ..."
                                                    className="h-9.5 pl-8.5 bg-zinc-50 dark:bg-zinc-950 border-zinc-300 dark:border-zinc-800 text-xs text-zinc-900 dark:text-white rounded-xl focus:border-teal-500"
                                                />
                                                <MapPin className="w-4 h-4 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1 font-khmer">
                                                កំណត់សម្គាល់បន្ថែម (Notes & Delivery Schedule)
                                            </label>
                                            <textarea
                                                value={supplierForm.data.notes}
                                                onChange={(e) =>
                                                    supplierForm.setData('notes', e.target.value)
                                                }
                                                rows={2}
                                                placeholder="ឧ. ដឹកជញ្ជូនរៀងរាល់ព្រឹកម៉ោង ៦:០០, លក្ខខណ្ឌទូទាត់ប្រចាំសប្តាហ៍..."
                                                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 text-xs text-zinc-900 dark:text-white rounded-xl p-2.5 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 resize-none font-khmer"
                                            />
                                        </div>
                                    </div>

                                    {/* Section 3: Status Toggle */}
                                    <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between shadow-xs">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                                                supplierForm.data.is_active
                                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                                            }`}>
                                                <ShieldCheck className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-bold text-zinc-900 dark:text-white font-khmer">
                                                    ស្ថានភាពដៃគូផ្គត់ផ្គង់ (Active Partner)
                                                </h4>
                                                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-khmer">
                                                    អនុញ្ញាតឱ្យជ្រើសរើសក្នុងបញ្ជីបញ្ជាទិញទំនិញចូលស្តុក (PO)
                                                </p>
                                            </div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                id="supplier_active_toggle_ws"
                                                checked={supplierForm.data.is_active}
                                                onChange={(e) =>
                                                    supplierForm.setData('is_active', e.target.checked)
                                                }
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-teal-500"></div>
                                        </label>
                                    </div>
                                </div>

                                {/* RIGHT COLUMN: Live Supplier Passport Preview (5 cols) */}
                                <div className="lg:col-span-5 space-y-4">
                                    <div className="rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 shadow-lg space-y-4 relative overflow-hidden">
                                        {/* Decorative top gradient */}
                                        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-600" />

                                        <div className="flex items-center justify-between pt-1">
                                            <div className="flex items-center gap-2">
                                                <Sparkles className="w-4 h-4 text-teal-500" />
                                                <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400 font-mono">
                                                    ព័ត៌មានអ្នកផ្គត់ផ្គង់
                                                </span>
                                            </div>
                                            <Badge
                                                variant={supplierForm.data.is_active ? 'emerald' : 'zinc'}
                                                className="font-khmer text-[10px]"
                                            >
                                                {supplierForm.data.is_active ? '● កំពុងសកម្ម' : '○ ផ្អាកដំណើរការ'}
                                            </Badge>
                                        </div>

                                        {/* Supplier Card Header */}
                                        <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 space-y-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-2xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-600 dark:text-teal-400 font-bold text-lg shadow-xs shrink-0 font-mono">
                                                    {supplierForm.data.name
                                                        ? supplierForm.data.name.slice(0, 2).toUpperCase()
                                                        : 'SP'}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white font-khmer truncate">
                                                        {supplierForm.data.name || 'ឈ្មោះអ្នកផ្គត់ផ្គង់ / ដេប៉ូ'}
                                                    </h3>
                                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-khmer truncate">
                                                        {supplierForm.data.contact_person
                                                            ? `តំណាង: ${supplierForm.data.contact_person}`
                                                            : 'មិនទាន់មានអ្នកទំនាក់ទំនង'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60 text-xs">
                                                <div className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                                                    <div className="text-[10px] text-zinc-400 font-khmer">លេខទូរស័ព្ទ</div>
                                                    <div className="font-mono font-bold text-zinc-900 dark:text-white truncate">
                                                        {supplierForm.data.phone || '---'}
                                                    </div>
                                                </div>
                                                <div className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                                                    <div className="text-[10px] text-zinc-400 font-khmer">ទីតាំងដេប៉ូ</div>
                                                    <div className="text-zinc-900 dark:text-white font-khmer truncate text-[11px]">
                                                        {supplierForm.data.address || '---'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Supply Categories & Notes Breakdown */}
                                        <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 space-y-2">
                                            <div className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 font-khmer">
                                                ទំនិញផ្គត់ផ្គង់ & កំណត់សម្គាល់ (Supply & Terms):
                                            </div>
                                            <p className="text-xs text-zinc-600 dark:text-zinc-400 font-khmer leading-relaxed">
                                                {supplierForm.data.notes || 'មិនទាន់មានកំណត់សម្គាល់បន្ថែម...'}
                                            </p>
                                        </div>

                                        {/* System Integration Note */}
                                        <div className="p-3.5 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-xs text-teal-800 dark:text-teal-300 space-y-1.5">
                                            <div className="font-bold flex items-center gap-1.5 font-khmer">
                                                <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                                                <span>ការតភ្ជាប់ស្តុកស្វ័យប្រវត្តិ (Inventory Sync)</span>
                                            </div>
                                            <p className="text-[11px] text-teal-700/90 dark:text-teal-300/80 leading-relaxed font-khmer">
                                                រាល់ពេលបង្កើតប័ណ្ណទិញចូលស្តុក (Purchase Orders) អ្នកអាចជ្រើសរើសដេប៉ូនេះដោយផ្ទាល់ដើម្បីកត់ត្រាតម្លៃដើមទំនិញ និងរបាយការណ៍សវនកម្ម។
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Workspace Footer */}
                            <div className="px-6 py-3.5 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between shrink-0 shadow-lg">
                                <div className="text-xs text-zinc-500 dark:text-zinc-400 font-khmer flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
                                    <span>{editingSupplier ? 'កំពុងកែសម្រួលព័ត៌មានអ្នកផ្គត់ផ្គង់' : 'កំពុងបង្កើតអ្នកផ្គត់ផ្គង់ថ្មី'}</span>
                                </div>
                                <div className="flex items-center gap-2.5">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setSupplierModalOpen(false)}
                                        className="border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-khmer text-xs rounded-xl h-10 px-5 cursor-pointer"
                                    >
                                        បោះបង់ (Cancel)
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={supplierForm.processing}
                                        className="bg-teal-600 hover:bg-teal-500 text-white font-bold font-khmer text-xs rounded-xl h-10 px-6 shadow-md shadow-teal-600/20 cursor-pointer flex items-center gap-2"
                                    >
                                        {supplierForm.processing ? (
                                            'កំពុងរក្សាទុក...'
                                        ) : (
                                            <>
                                                <Check className="w-4 h-4" />
                                                <span>{editingSupplier ? 'កែប្រែអ្នកផ្គត់ផ្គង់' : 'រក្សាទុកអ្នកផ្គត់ផ្គង់'}</span>
                                            </>
                                        )}
                                    </Button>
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
