import React, { useState } from 'react';
import { AppLayout } from '@/layouts/app-layout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Head, useForm, router } from '@inertiajs/react';
import {
    Package,
    Plus,
    Search,
    Edit2,
    ToggleLeft,
    ToggleRight,
    Utensils,
    Scale,
    Tags,
    Sparkles,
    Check,
    X,
    Filter,
    DollarSign,
    Layers,
    Coffee,
    Wine,
} from 'lucide-react';

interface Unit {
    id: number;
    code: string;
    name_primary: string;
    name_secondary?: string | null;
    sort_order: number;
    is_active: boolean;
    products_count?: number;
}

interface ProductCategory {
    id: number;
    code: string;
    name_primary: string;
    name_secondary?: string | null;
    category_type: string;
    sort_order: number;
    is_active: boolean;
    products_count?: number;
}

interface Product {
    id: number;
    category_id: number;
    unit_id: number;
    sku?: string | null;
    name_primary: string;
    name_secondary?: string | null;
    unit_price: string;
    image_url?: string | null;
    is_primary_package: boolean;
    sort_order: number;
    is_active: boolean;
    category: ProductCategory;
    unit: Unit;
}

interface CatalogProps {
    products: Product[];
    categories: ProductCategory[];
    units: Unit[];
    exchange_rate: number;
}

type TabType = 'products' | 'units' | 'categories';

export default function CatalogIndex({
    products,
    categories,
    units,
    exchange_rate,
}: CatalogProps) {
    const [activeTab, setActiveTab] = useState<TabType>(() => {
        if (typeof window !== 'undefined') {
            const saved = sessionStorage.getItem('catalog_active_tab') as TabType;
            if (saved && ['products', 'units', 'categories'].includes(saved)) {
                return saved;
            }
        }
        return 'products';
    });

    const handleTabChange = (tab: TabType) => {
        setActiveTab(tab);
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('catalog_active_tab', tab);
        }
    };
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

    // Modals state
    const [productModalOpen, setProductModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    const [unitModalOpen, setUnitModalOpen] = useState(false);
    const [editingUnit, setEditingUnit] = useState<Unit | null>(null);

    const [categoryModalOpen, setCategoryModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);

    // Product Form
    const productForm = useForm({
        category_id: categories[0]?.id || 1,
        unit_id: units[0]?.id || 1,
        sku: '',
        name_primary: '',
        name_secondary: '',
        unit_price: '1.00',
        image_url: '',
        is_primary_package: false,
        sort_order: 0,
        is_active: true,
    });

    // Unit Form
    const unitForm = useForm({
        code: '',
        name_primary: '',
        name_secondary: '',
        sort_order: 0,
        is_active: true,
    });

    // Category Form
    const categoryForm = useForm({
        code: '',
        name_primary: '',
        name_secondary: '',
        category_type: 'food',
        sort_order: 0,
        is_active: true,
    });

    // Handle Product Modal Open
    const openAddProductModal = () => {
        setEditingProduct(null);
        productForm.reset();
        productForm.setData({
            category_id: categories[0]?.id || 1,
            unit_id: units[0]?.id || 1,
            sku: '',
            name_primary: '',
            name_secondary: '',
            unit_price: '1.00',
            image_url: '',
            is_primary_package: false,
            sort_order: 0,
            is_active: true,
        });
        setProductModalOpen(true);
    };

    const openEditProductModal = (product: Product) => {
        setEditingProduct(product);
        productForm.setData({
            category_id: product.category_id,
            unit_id: product.unit_id,
            sku: product.sku || '',
            name_primary: product.name_primary,
            name_secondary: product.name_secondary || '',
            unit_price: product.unit_price,
            image_url: product.image_url || '',
            is_primary_package: product.is_primary_package,
            sort_order: product.sort_order,
            is_active: product.is_active,
        });
        setProductModalOpen(true);
    };

    const handleProductSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingProduct) {
            productForm.patch(`/catalog/products/${editingProduct.id}`, {
                preserveScroll: true,
                onSuccess: () => setProductModalOpen(false),
            });
        } else {
            productForm.post('/catalog/products', {
                preserveScroll: true,
                onSuccess: () => setProductModalOpen(false),
            });
        }
    };

    const handleToggleProduct = (product: Product) => {
        router.post(`/catalog/products/${product.id}/toggle`, {}, { preserveScroll: true });
    };

    // Handle Unit Modal Open
    const openAddUnitModal = () => {
        setEditingUnit(null);
        unitForm.reset();
        unitForm.setData({
            code: '',
            name_primary: '',
            name_secondary: '',
            sort_order: 0,
            is_active: true,
        });
        setUnitModalOpen(true);
    };

    const openEditUnitModal = (unit: Unit) => {
        setEditingUnit(unit);
        unitForm.setData({
            code: unit.code,
            name_primary: unit.name_primary,
            name_secondary: unit.name_secondary || '',
            sort_order: unit.sort_order,
            is_active: unit.is_active,
        });
        setUnitModalOpen(true);
    };

    const handleUnitSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingUnit) {
            unitForm.patch(`/catalog/units/${editingUnit.id}`, {
                preserveScroll: true,
                onSuccess: () => setUnitModalOpen(false),
            });
        } else {
            unitForm.post('/catalog/units', {
                preserveScroll: true,
                onSuccess: () => setUnitModalOpen(false),
            });
        }
    };

    const handleToggleUnit = (unit: Unit) => {
        router.post(`/catalog/units/${unit.id}/toggle`, {}, { preserveScroll: true });
    };

    // Handle Category Modal Open
    const openAddCategoryModal = () => {
        setEditingCategory(null);
        categoryForm.reset();
        categoryForm.setData({
            code: '',
            name_primary: '',
            name_secondary: '',
            category_type: 'food',
            sort_order: 0,
            is_active: true,
        });
        setCategoryModalOpen(true);
    };

    const openEditCategoryModal = (cat: ProductCategory) => {
        setEditingCategory(cat);
        categoryForm.setData({
            code: cat.code,
            name_primary: cat.name_primary,
            name_secondary: cat.name_secondary || '',
            category_type: cat.category_type,
            sort_order: cat.sort_order,
            is_active: cat.is_active,
        });
        setCategoryModalOpen(true);
    };

    const handleCategorySubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingCategory) {
            categoryForm.patch(`/catalog/categories/${editingCategory.id}`, {
                preserveScroll: true,
                onSuccess: () => setCategoryModalOpen(false),
            });
        } else {
            categoryForm.post('/catalog/categories', {
                preserveScroll: true,
                onSuccess: () => setCategoryModalOpen(false),
            });
        }
    };

    const handleToggleCategory = (cat: ProductCategory) => {
        router.post(`/catalog/categories/${cat.id}/toggle`, {}, { preserveScroll: true });
    };

    // Filtered Products
    const filteredProducts = products.filter((p) => {
        const matchesCategory = categoryFilter === 'all' || p.category_id.toString() === categoryFilter;
        const matchesStatus =
            statusFilter === 'all' ||
            (statusFilter === 'active' && p.is_active) ||
            (statusFilter === 'inactive' && !p.is_active);
        const query = searchQuery.toLowerCase().trim();
        const matchesSearch =
            !query ||
            p.name_primary.toLowerCase().includes(query) ||
            (p.name_secondary && p.name_secondary.toLowerCase().includes(query)) ||
            (p.sku && p.sku.toLowerCase().includes(query));
        return matchesCategory && matchesStatus && matchesSearch;
    });

    const activeProductsCount = products.filter((p) => p.is_active).length;

    return (
        <AppLayout title="Items, Units & Categories / មុខទំនិញ និងឯកតា">
            <Head title="Items & Units Catalog" />

            <div className="space-y-6 pb-16">
                {/* Fixed / Sticky Header & Tabs Switcher */}
                <div className="sticky top-14 md:top-0 z-20 bg-zinc-950/95 backdrop-blur-xl -mt-6 pt-6 pb-4 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 border-b border-zinc-800/80 space-y-4 shadow-xs">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
                                    <span className="p-2.5 bg-gradient-to-tr from-amber-600 to-amber-500 rounded-2xl text-zinc-950 shadow-md shadow-amber-500/20 shrink-0">
                                        <Package className="w-5 h-5 stroke-[2.5]" />
                                    </span>
                                    <span>Items & Units Catalog</span>
                                </h1>
                                <Badge variant="emerald" className="text-xs">
                                    មុខទំនិញ & ឯកតា
                                </Badge>
                            </div>
                            <p className="text-xs text-zinc-400 mt-1">
                                Manage live POS menu products, prices, measurement units, and item categories for លៀសហាល អ៉ីទុម.
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            {activeTab === 'products' && (
                                <Button
                                    onClick={openAddProductModal}
                                    className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs gap-1.5 shadow-md shadow-amber-500/20 rounded-xl px-4 py-2.5 cursor-pointer transition-all active:scale-[0.98]"
                                >
                                    <Plus className="w-4 h-4 stroke-[2.5]" />
                                    New Product / បន្ថែមមុខទំនិញ
                                </Button>
                            )}
                            {activeTab === 'units' && (
                                <Button
                                    onClick={openAddUnitModal}
                                    className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs gap-1.5 shadow-md shadow-emerald-500/20 rounded-xl px-4 py-2.5 cursor-pointer transition-all active:scale-[0.98]"
                                >
                                    <Plus className="w-4 h-4 stroke-[2.5]" />
                                    New Unit / បន្ថែមឯកតា
                                </Button>
                            )}
                            {activeTab === 'categories' && (
                                <Button
                                    onClick={openAddCategoryModal}
                                    className="bg-teal-500 hover:bg-teal-400 text-zinc-950 font-bold text-xs gap-1.5 shadow-md shadow-teal-500/20 rounded-xl px-4 py-2.5 cursor-pointer transition-all active:scale-[0.98]"
                                >
                                    <Plus className="w-4 h-4 stroke-[2.5]" />
                                    New Category / បន្ថែមប្រភេទ
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Tabs Switcher - Rounded Container & Pills */}
                    <div className="flex items-center gap-1.5 p-1 bg-zinc-900 border border-zinc-800 rounded-2xl w-fit overflow-x-auto max-w-full scrollbar-none shadow-xs">
                        <button
                            type="button"
                            onClick={() => handleTabChange('products')}
                            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                                activeTab === 'products'
                                    ? 'bg-amber-500 text-zinc-950 font-bold shadow-md shadow-amber-500/20'
                                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                            }`}
                        >
                            <Utensils className="w-3.5 h-3.5 shrink-0" />
                            <span>Products & Dishes / មុខទំនិញ</span>
                            <span
                                className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
                                    activeTab === 'products'
                                        ? 'bg-zinc-950/20 text-zinc-950'
                                        : 'bg-zinc-800 text-zinc-300 border border-zinc-700/60'
                                }`}
                            >
                                {products.length}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => handleTabChange('units')}
                            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                                activeTab === 'units'
                                    ? 'bg-emerald-500 text-zinc-950 font-bold shadow-md shadow-emerald-500/20'
                                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                            }`}
                        >
                            <Scale className="w-3.5 h-3.5 shrink-0" />
                            <span>Units of Measure / ឯកតា</span>
                            <span
                                className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
                                    activeTab === 'units'
                                        ? 'bg-zinc-950/20 text-zinc-950'
                                        : 'bg-zinc-800 text-zinc-300 border border-zinc-700/60'
                                }`}
                            >
                                {units.length}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => handleTabChange('categories')}
                            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                                activeTab === 'categories'
                                    ? 'bg-teal-500 text-zinc-950 font-bold shadow-md shadow-teal-500/20'
                                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                            }`}
                        >
                            <Tags className="w-3.5 h-3.5 shrink-0" />
                            <span>Categories / ប្រភេទមុខទំនិញ</span>
                            <span
                                className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
                                    activeTab === 'categories'
                                        ? 'bg-zinc-950/20 text-zinc-950'
                                        : 'bg-zinc-800 text-zinc-300 border border-zinc-700/60'
                                }`}
                            >
                                {categories.length}
                            </span>
                        </button>
                    </div>
                </div>

                {/* Key Metrics Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="p-4 bg-zinc-900/60 border-zinc-800/80 flex items-center justify-between">
                        <div>
                            <div className="text-[11px] font-mono text-zinc-400 uppercase">Total Items</div>
                            <div className="text-xl font-bold text-white mt-1">
                                {products.length} <span className="text-xs text-emerald-400 font-normal">({activeProductsCount} Active)</span>
                            </div>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                            <Utensils className="w-5 h-5" />
                        </div>
                    </Card>

                    <Card className="p-4 bg-zinc-900/60 border-zinc-800/80 flex items-center justify-between">
                        <div>
                            <div className="text-[11px] font-mono text-zinc-400 uppercase">Categories</div>
                            <div className="text-xl font-bold text-white mt-1">{categories.length}</div>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                            <Tags className="w-5 h-5" />
                        </div>
                    </Card>

                    <Card className="p-4 bg-zinc-900/60 border-zinc-800/80 flex items-center justify-between">
                        <div>
                            <div className="text-[11px] font-mono text-zinc-400 uppercase">Measurement Units</div>
                            <div className="text-xl font-bold text-white mt-1">{units.length}</div>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                            <Scale className="w-5 h-5" />
                        </div>
                    </Card>

                    <Card className="p-4 bg-zinc-900/60 border-zinc-800/80 flex items-center justify-between">
                        <div>
                            <div className="text-[11px] font-mono text-zinc-400 uppercase">POS Exchange Rate</div>
                            <div className="text-sm font-bold text-amber-300 font-mono mt-1">
                                1 USD = {exchange_rate.toLocaleString()} ៛
                            </div>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                            <DollarSign className="w-5 h-5" />
                        </div>
                    </Card>
                </div>

                {/* Tab 1: Products */}
                {activeTab === 'products' && (
                    <div className="space-y-4">
                        {/* Filters Bar */}
                        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-zinc-900/60 border border-zinc-800/80 p-3 rounded-xl">
                            <div className="flex flex-1 items-center gap-3 w-full sm:w-auto">
                                <div className="relative flex-1 max-w-sm">
                                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
                                    <Input
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="ស្វែងរកតាមឈ្មោះ ឬ SKU..."
                                        className="pl-9 bg-zinc-950 border-zinc-800 text-xs h-9"
                                    />
                                </div>

                                <select
                                    value={categoryFilter}
                                    onChange={(e) => setCategoryFilter(e.target.value)}
                                    className="bg-zinc-950 border border-zinc-800 text-zinc-300 rounded-lg px-3 py-1.5 text-xs h-9 focus:ring-1 focus:ring-amber-500"
                                >
                                    <option value="all">គ្រប់ប្រភេទទាំងអស់ (All)</option>
                                    {categories.map((c) => (
                                        <option key={c.id} value={c.id.toString()}>
                                            {c.name_primary}
                                        </option>
                                    ))}
                                </select>

                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value as any)}
                                    className="bg-zinc-950 border border-zinc-800 text-zinc-300 rounded-lg px-3 py-1.5 text-xs h-9 focus:ring-1 focus:ring-amber-500"
                                >
                                    <option value="all">គ្រប់ស្ថានភាព</option>
                                    <option value="active">សកម្ម (Active)</option>
                                    <option value="inactive">អសកម្ម (Inactive)</option>
                                </select>
                            </div>

                            <div className="text-xs text-zinc-400 font-mono">
                                Showing {filteredProducts.length} of {products.length}
                            </div>
                        </div>

                        {/* Products Table */}
                        <Card className="bg-zinc-900/40 border-zinc-800/80 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-400 uppercase font-mono text-[10px]">
                                        <tr>
                                            <th className="px-4 py-3">SKU</th>
                                            <th className="px-4 py-3">Product Name / ឈ្មោះមុខទំនិញ</th>
                                            <th className="px-4 py-3">Category / ប្រភេទ</th>
                                            <th className="px-4 py-3">Unit / ឯកតា</th>
                                            <th className="px-4 py-3 text-right">Unit Price / តម្លៃ</th>
                                            <th className="px-4 py-3 text-center">Package / កញ្ចប់</th>
                                            <th className="px-4 py-3 text-center">Status / ស្ថានភាព</th>
                                            <th className="px-4 py-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-800/60">
                                        {filteredProducts.length === 0 ? (
                                            <tr>
                                                <td colSpan={8} className="px-4 py-12 text-center text-zinc-500">
                                                    រកមិនឃើញមុខទំនិញដែលត្រូវនឹងការស្វែងរកទេ
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredProducts.map((p) => {
                                                const priceUSD = parseFloat(p.unit_price);
                                                const priceKHR = Math.round(priceUSD * exchange_rate);

                                                return (
                                                    <tr key={p.id} className="hover:bg-zinc-800/40 transition-colors">
                                                        <td className="px-4 py-3 font-mono text-zinc-400">
                                                            {p.sku || '—'}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-11 h-11 rounded-xl bg-zinc-800 border border-zinc-700/80 overflow-hidden shrink-0 flex items-center justify-center">
                                                                    {p.image_url ? (
                                                                        <img
                                                                            src={p.image_url}
                                                                            alt={p.name_primary}
                                                                            className="w-full h-full object-cover"
                                                                            loading="lazy"
                                                                            onError={(e) => {
                                                                                (e.target as HTMLElement).style.display = 'none';
                                                                            }}
                                                                        />
                                                                    ) : (
                                                                        <Utensils className="w-5 h-5 text-zinc-500" />
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <div className="font-semibold text-white font-khmer text-sm">
                                                                        {p.name_primary}
                                                                    </div>
                                                                    {p.name_secondary && (
                                                                        <div className="text-[11px] text-zinc-400">
                                                                            {p.name_secondary}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                                {p.category.name_primary}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="catalog-unit-badge inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all bg-sky-50 text-sky-800 border border-sky-200/90 shadow-2xs dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-500/30">
                                                                <Scale className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                                                                <span className="font-semibold tracking-tight">{p.unit.name_primary}</span>
                                                                {p.unit.name_secondary && p.unit.name_secondary.toLowerCase() !== p.unit.name_primary.toLowerCase() && (
                                                                    <span className="catalog-unit-sec text-[11px] font-khmer text-sky-600/90 dark:text-sky-300/80">
                                                                        • {p.unit.name_secondary}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-mono">
                                                            <div className="font-bold text-amber-300">
                                                                ${priceUSD.toFixed(2)}
                                                            </div>
                                                            <div className="text-[10px] text-zinc-400">
                                                                {priceKHR.toLocaleString()} ៛
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            {p.is_primary_package ? (
                                                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                                                                    Buffet Pax
                                                                </span>
                                                            ) : (
                                                                <span className="text-zinc-600 font-mono">—</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <button
                                                                onClick={() => handleToggleProduct(p)}
                                                                title="Click to toggle status"
                                                                className="cursor-pointer"
                                                            >
                                                                {p.is_active ? (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                                                        Active
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-800 text-zinc-500 border border-zinc-700">
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-500"></span>
                                                                        Inactive
                                                                    </span>
                                                                )}
                                                            </button>
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => openEditProductModal(p)}
                                                                className="h-7 text-xs border-zinc-700 bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 cursor-pointer"
                                                            >
                                                                <Edit2 className="w-3.5 h-3.5 mr-1" />
                                                                Edit
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <div className="px-4 py-2.5 bg-zinc-950/60 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400 font-mono">
                                <span>បង្ហាញ {filteredProducts.length} ក្នុងចំណោម {products.length} មុខទំនិញសរុប</span>
                                <span className="text-zinc-500 text-[11px]">លៀសហាល អ៉ីទុម POS Menu</span>
                            </div>
                        </Card>
                    </div>
                )}

                {/* Tab 2: Units */}
                {activeTab === 'units' && (
                    <div className="space-y-4">
                        <Card className="bg-zinc-900/40 border-zinc-800/80 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-400 uppercase font-mono text-[10px]">
                                        <tr>
                                            <th className="px-4 py-3">Code / លេខកូដ</th>
                                            <th className="px-4 py-3">Primary Name / ឈ្មោះខ្មែរ</th>
                                            <th className="px-4 py-3">Secondary Name / ឈ្មោះអង់គ្លេស</th>
                                            <th className="px-4 py-3 text-center">Items Count / មុខទំនិញ</th>
                                            <th className="px-4 py-3 text-center">Status / ស្ថានភាព</th>
                                            <th className="px-4 py-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-800/60">
                                        {units.map((u) => (
                                            <tr key={u.id} className="hover:bg-zinc-800/40 transition-colors">
                                                <td className="px-4 py-3">
                                                    <span className="px-2 py-0.5 rounded-md font-mono text-[11px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                                                        {u.code}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-md bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
                                                            <Scale className="w-3.5 h-3.5" />
                                                        </div>
                                                        <span className="font-khmer text-sm font-bold text-zinc-900 dark:text-white">
                                                            {u.name_primary}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 font-khmer text-xs font-medium text-zinc-600 dark:text-zinc-400">
                                                    {u.name_secondary || '—'}
                                                </td>
                                                <td className="px-4 py-3 text-center font-mono">
                                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">
                                                        {u.products_count || 0} items
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <button
                                                        onClick={() => handleToggleUnit(u)}
                                                        className="cursor-pointer"
                                                    >
                                                        {u.is_active ? (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                                                Active
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-800 text-zinc-500 border border-zinc-700">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-zinc-500"></span>
                                                                Inactive
                                                            </span>
                                                        )}
                                                    </button>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => openEditUnitModal(u)}
                                                        className="h-7 text-xs border-zinc-700 bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 cursor-pointer"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5 mr-1" />
                                                        Edit
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="px-4 py-2.5 bg-zinc-950/60 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400 font-mono">
                                <span>បង្ហាញ {units.length} ឯកតារង្វាស់សរុប</span>
                                <span className="text-zinc-500 text-[11px]">Units of Measurement</span>
                            </div>
                        </Card>
                    </div>
                )}

                {/* Tab 3: Categories */}
                {activeTab === 'categories' && (
                    <div className="space-y-4">
                        <Card className="bg-zinc-900/40 border-zinc-800/80 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-400 uppercase font-mono text-[10px]">
                                        <tr>
                                            <th className="px-4 py-3">Code / លេខកូដ</th>
                                            <th className="px-4 py-3">Category Name / ឈ្មោះប្រភេទ</th>
                                            <th className="px-4 py-3">Secondary Name / ឈ្មោះអង់គ្លេស</th>
                                            <th className="px-4 py-3">Type / ប្រភេទ</th>
                                            <th className="px-4 py-3 text-center">Items Count / មុខទំនិញ</th>
                                            <th className="px-4 py-3 text-center">Status / ស្ថានភាព</th>
                                            <th className="px-4 py-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-800/60">
                                        {categories.map((c) => (
                                            <tr key={c.id} className="hover:bg-zinc-800/40 transition-colors">
                                                <td className="px-4 py-3 font-mono font-bold text-amber-300">
                                                    {c.code}
                                                </td>
                                                <td className="px-4 py-3 font-khmer text-sm font-semibold text-white">
                                                    {c.name_primary}
                                                </td>
                                                <td className="px-4 py-3 text-zinc-400">
                                                    {c.name_secondary || '—'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-teal-500/10 text-teal-400 border border-teal-500/20">
                                                        {c.category_type}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center font-mono">
                                                    <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-xs">
                                                        {c.products_count || 0} items
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <button
                                                        onClick={() => handleToggleCategory(c)}
                                                        className="cursor-pointer"
                                                    >
                                                        {c.is_active ? (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                                                Active
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-800 text-zinc-500 border border-zinc-700">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-zinc-500"></span>
                                                                Inactive
                                                            </span>
                                                        )}
                                                    </button>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => openEditCategoryModal(c)}
                                                        className="h-7 text-xs border-zinc-700 bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 cursor-pointer"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5 mr-1" />
                                                        Edit
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="px-4 py-2.5 bg-zinc-950/60 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400 font-mono">
                                <span>បង្ហាញ {categories.length} ប្រភេទមុខទំនិញសរុប</span>
                                <span className="text-zinc-500 text-[11px]">Item Categories</span>
                            </div>
                        </Card>
                    </div>
                )}
            </div>

            {/* Product Modal */}
            {productModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-6 overflow-hidden">
                        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                            <div>
                                <h3 className="text-base font-bold text-white font-khmer">
                                    {editingProduct ? 'កែប្រែមុខទំនិញ / Edit Product' : 'បន្ថែមមុខទំនិញថ្មី / New Product'}
                                </h3>
                                <p className="text-xs text-zinc-400">
                                    {editingProduct ? editingProduct.name_primary : 'បំពេញព័ត៌មានមុខម្ហូប/ភេសជ្ជៈ'}
                                </p>
                            </div>
                            <button
                                onClick={() => setProductModalOpen(false)}
                                className="p-1 rounded-lg text-zinc-400 hover:text-white cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleProductSubmit} className="space-y-4 pt-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                                        Category / ប្រភេទ *
                                    </label>
                                    <select
                                        value={productForm.data.category_id}
                                        onChange={(e) => productForm.setData('category_id', parseInt(e.target.value))}
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:ring-1 focus:ring-amber-500"
                                        required
                                    >
                                        {categories.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.name_primary}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                                        Unit / ឯកតា *
                                    </label>
                                    <select
                                        value={productForm.data.unit_id}
                                        onChange={(e) => productForm.setData('unit_id', parseInt(e.target.value))}
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:ring-1 focus:ring-amber-500"
                                        required
                                    >
                                        {units.map((u) => (
                                            <option key={u.id} value={u.id}>
                                                {u.name_primary} {u.name_secondary && u.name_secondary.toLowerCase() !== u.name_primary.toLowerCase() ? `• ${u.name_secondary}` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                                        SKU Code (Optional)
                                    </label>
                                    <Input
                                        value={productForm.data.sku}
                                        onChange={(e) => productForm.setData('sku', e.target.value)}
                                        placeholder="e.g. ETUM-20"
                                        className="bg-zinc-900 border-zinc-800 text-xs font-mono"
                                    />
                                    {productForm.errors.sku && (
                                        <div className="text-[10px] text-rose-400 mt-1">{productForm.errors.sku}</div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                                        Unit Price / តម្លៃ (USD) *
                                    </label>
                                    <div className="relative">
                                        <DollarSign className="w-4 h-4 absolute left-2.5 top-2.5 text-zinc-500" />
                                        <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={productForm.data.unit_price}
                                            onChange={(e) => productForm.setData('unit_price', e.target.value)}
                                            placeholder="0.00"
                                            className="bg-zinc-900 border-zinc-800 text-xs pl-8 font-mono font-bold text-amber-300"
                                            required
                                        />
                                    </div>
                                    <div className="text-[10px] text-zinc-400 font-mono mt-1">
                                        ≈ {Math.round((parseFloat(productForm.data.unit_price) || 0) * exchange_rate).toLocaleString()} ៛
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                                    Primary Name / ឈ្មោះមុខទំនិញជាភាសាខ្មែរ *
                                </label>
                                <Input
                                    value={productForm.data.name_primary}
                                    onChange={(e) => productForm.setData('name_primary', e.target.value)}
                                    placeholder="ឧ. លៀសហាលរសជាតិដើម"
                                    className="bg-zinc-900 border-zinc-800 text-xs font-khmer"
                                    required
                                />
                                {productForm.errors.name_primary && (
                                    <div className="text-[10px] text-rose-400 mt-1">{productForm.errors.name_primary}</div>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                                    Secondary Name / ឈ្មោះជាភាសាអង់គ្លេស (Optional)
                                </label>
                                <Input
                                    value={productForm.data.name_secondary}
                                    onChange={(e) => productForm.setData('name_secondary', e.target.value)}
                                    placeholder="e.g. Sun-dried Clams Original"
                                    className="bg-zinc-900 border-zinc-800 text-xs"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                                    Product Image URL / តំណភ្ជាប់រូបភាពម្ហូប (Image URL)
                                </label>
                                <div className="flex items-center gap-3">
                                    <div className="w-14 h-14 rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
                                        {productForm.data.image_url ? (
                                            <img
                                                src={productForm.data.image_url}
                                                alt="Preview"
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    (e.target as HTMLElement).style.display = 'none';
                                                }}
                                            />
                                        ) : (
                                            <Utensils className="w-6 h-6 text-zinc-600" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <Input
                                            value={productForm.data.image_url}
                                            onChange={(e) => productForm.setData('image_url', e.target.value)}
                                            placeholder="https://images.unsplash.com/... ឬ /images/..."
                                            className="bg-zinc-900 border-zinc-800 text-xs font-mono"
                                        />
                                        <span className="text-[10px] text-zinc-500 block mt-1">
                                            បញ្ចូលតំណភ្ជាប់រូបភាព HTTPS ឬទីតាំងរូបភាពក្នុងប្រព័ន្ធ
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                                <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300">
                                    <input
                                        type="checkbox"
                                        checked={productForm.data.is_primary_package}
                                        onChange={(e) => productForm.setData('is_primary_package', e.target.checked)}
                                        className="rounded border-zinc-700 bg-zinc-800 text-amber-500 focus:ring-amber-500"
                                    />
                                    <span>Buffet / Primary Package (កញ្ចប់អាហារប៊ូហ្វេ)</span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300">
                                    <input
                                        type="checkbox"
                                        checked={productForm.data.is_active}
                                        onChange={(e) => productForm.setData('is_active', e.target.checked)}
                                        className="rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-emerald-500"
                                    />
                                    <span>Active (សកម្ម)</span>
                                </label>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setProductModalOpen(false)}
                                    className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={productForm.processing}
                                    className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold"
                                >
                                    {editingProduct ? 'Save Changes' : 'Create Product'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Unit Modal */}
            {unitModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-6 overflow-hidden">
                        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                            <div>
                                <h3 className="text-base font-bold text-white font-khmer">
                                    {editingUnit ? 'កែប្រែឯកតា / Edit Unit' : 'បន្ថែមឯកតាថ្មី / New Unit'}
                                </h3>
                                <p className="text-xs text-zinc-400">
                                    Measurement Unit definition
                                </p>
                            </div>
                            <button
                                onClick={() => setUnitModalOpen(false)}
                                className="p-1 rounded-lg text-zinc-400 hover:text-white cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleUnitSubmit} className="space-y-4 pt-4">
                            <div>
                                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                                    Unit Code (e.g. CAN, PLATE, SET) *
                                </label>
                                <Input
                                    value={unitForm.data.code}
                                    onChange={(e) => unitForm.setData('code', e.target.value)}
                                    placeholder="e.g. CUP"
                                    className="bg-zinc-900 border-zinc-800 text-xs font-mono uppercase font-bold"
                                    required
                                />
                                {unitForm.errors.code && (
                                    <div className="text-[10px] text-rose-400 mt-1">{unitForm.errors.code}</div>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                                    Primary Name / ឈ្មោះខ្មែរ *
                                </label>
                                <Input
                                    value={unitForm.data.name_primary}
                                    onChange={(e) => unitForm.setData('name_primary', e.target.value)}
                                    placeholder="ឧ. កែវ"
                                    className="bg-zinc-900 border-zinc-800 text-xs font-khmer"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                                    Secondary Name / ឈ្មោះអង់គ្លេស (Optional)
                                </label>
                                <Input
                                    value={unitForm.data.name_secondary}
                                    onChange={(e) => unitForm.setData('name_secondary', e.target.value)}
                                    placeholder="e.g. Cup / Glass"
                                    className="bg-zinc-900 border-zinc-800 text-xs"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setUnitModalOpen(false)}
                                    className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={unitForm.processing}
                                    className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold"
                                >
                                    {editingUnit ? 'Save Changes' : 'Create Unit'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Category Modal */}
            {categoryModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-6 overflow-hidden">
                        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                            <div>
                                <h3 className="text-base font-bold text-white font-khmer">
                                    {editingCategory ? 'កែប្រែប្រភេទ / Edit Category' : 'បន្ថែមប្រភេទថ្មី / New Category'}
                                </h3>
                                <p className="text-xs text-zinc-400">
                                    Menu category categorization
                                </p>
                            </div>
                            <button
                                onClick={() => setCategoryModalOpen(false)}
                                className="p-1 rounded-lg text-zinc-400 hover:text-white cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCategorySubmit} className="space-y-4 pt-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                                        Code (e.g. DRINKS) *
                                    </label>
                                    <Input
                                        value={categoryForm.data.code}
                                        onChange={(e) => categoryForm.setData('code', e.target.value)}
                                        placeholder="e.g. SOUPS"
                                        className="bg-zinc-900 border-zinc-800 text-xs font-mono uppercase font-bold"
                                        required
                                    />
                                    {categoryForm.errors.code && (
                                        <div className="text-[10px] text-rose-400 mt-1">{categoryForm.errors.code}</div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                                        Type / ប្រភេទ *
                                    </label>
                                    <select
                                        value={categoryForm.data.category_type}
                                        onChange={(e) => categoryForm.setData('category_type', e.target.value)}
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:ring-1 focus:ring-amber-500"
                                        required
                                    >
                                        <option value="food">Food (ម្ហូប)</option>
                                        <option value="beverage">Beverage (ភេសជ្ជៈ)</option>
                                        <option value="package">Package (កញ្ចប់)</option>
                                        <option value="general">General (ទូទៅ)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                                    Primary Name / ឈ្មោះខ្មែរ *
                                </label>
                                <Input
                                    value={categoryForm.data.name_primary}
                                    onChange={(e) => categoryForm.setData('name_primary', e.target.value)}
                                    placeholder="ឧ. ស៊ុប & មី"
                                    className="bg-zinc-900 border-zinc-800 text-xs font-khmer"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                                    Secondary Name / ឈ្មោះអង់គ្លេស (Optional)
                                </label>
                                <Input
                                    value={categoryForm.data.name_secondary}
                                    onChange={(e) => categoryForm.setData('name_secondary', e.target.value)}
                                    placeholder="e.g. Soups & Noodles"
                                    className="bg-zinc-900 border-zinc-800 text-xs"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setCategoryModalOpen(false)}
                                    className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={categoryForm.processing}
                                    className="bg-teal-500 hover:bg-teal-400 text-zinc-950 font-bold"
                                >
                                    {editingCategory ? 'Save Changes' : 'Create Category'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
