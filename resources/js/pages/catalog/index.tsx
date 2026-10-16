import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
    Image as ImageIcon,
    ChevronDown,
    Hash,
    RefreshCw,
    ArrowLeft,
    UploadCloud,
    CheckCircle2,
    AlertCircle,
    Trash2,
    FolderUp,
    Loader2,
    ShieldCheck,
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
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    const [productModalOpen, setProductModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    const [unitModalOpen, setUnitModalOpen] = useState(false);
    const [editingUnit, setEditingUnit] = useState<Unit | null>(null);

    const [categoryModalOpen, setCategoryModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);

    // Lock background scrolling when any modal is open
    useEffect(() => {
        const isAnyModalOpen = productModalOpen || unitModalOpen || categoryModalOpen;
        if (!isAnyModalOpen) return;

        const originalBodyOverflow = document.body.style.overflow;
        const originalHtmlOverflow = document.documentElement.style.overflow;
        const originalBodyOverscroll = document.body.style.overscrollBehavior;

        // Prevent layout shift from scrollbar disappearing
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        const originalBodyPaddingRight = document.body.style.paddingRight;
        if (scrollbarWidth > 0) {
            document.body.style.paddingRight = `${scrollbarWidth}px`;
        }

        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overscrollBehavior = 'none';

        return () => {
            document.body.style.overflow = originalBodyOverflow;
            document.documentElement.style.overflow = originalHtmlOverflow;
            document.body.style.overscrollBehavior = originalBodyOverscroll;
            document.body.style.paddingRight = originalBodyPaddingRight;
        };
    }, [productModalOpen, unitModalOpen, categoryModalOpen]);

    // Product Form
    const productForm = useForm<{
        category_id: number;
        unit_id: number;
        sku: string;
        name_primary: string;
        name_secondary: string;
        unit_price: string;
        image_url: string;
        is_primary_package: boolean;
        sort_order: number;
        is_active: boolean;
    }>({
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

    // Local Machine Image Upload States
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
    const [isDraggingOver, setIsDraggingOver] = useState(false);

    const handleFileSelect = async (file: File) => {
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setUploadError('សូមជ្រើសរើសឯកសារជារូបភាព (PNG, JPG, WEBP, GIF)');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setUploadError('ទំហំរូបភាពធំបំផុតគឺ 5MB');
            return;
        }

        setUploadError(null);
        setIsUploadingImage(true);
        setUploadedFileName(file.name);

        // Instant snappy preview
        const localPreviewUrl = URL.createObjectURL(file);
        productForm.setData('image_url', localPreviewUrl);

        try {
            const formData = new FormData();
            formData.append('image', file);

            const token = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content;
            const res = await fetch('/catalog/upload-image', {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': token || '',
                    'Accept': 'application/json',
                },
                body: formData,
            });

            const data = await res.json();
            if (res.ok && data.url) {
                productForm.setData('image_url', data.url);
            } else {
                setUploadError(data.message || data.error || 'ការ Upload រូបភាពមិនបានជោគជ័យ');
            }
        } catch (err: any) {
            setUploadError(err.message || 'មានបញ្ហាបណ្តាញពេល Upload រូបភាព');
        } finally {
            setIsUploadingImage(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

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
        setUploadedFileName(null);
        setUploadError(null);
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
        setUploadedFileName(null);
        setUploadError(null);
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
                    <Card className="p-4 bg-zinc-900/70 border-zinc-800/80 rounded-2xl relative overflow-hidden">
                        <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                            <span>Total Items / មុខទំនិញសរុប</span>
                            <Utensils className="w-4 h-4 text-amber-400" />
                        </div>
                        <div className="text-xl sm:text-2xl font-bold text-white font-mono">
                            {products.length}
                        </div>
                        <div className="text-xs text-emerald-400/90 font-khmer mt-1">
                            {activeProductsCount} កំពុងដាក់លក់សកម្ម
                        </div>
                    </Card>

                    <Card className="p-4 bg-zinc-900/70 border-zinc-800/80 rounded-2xl relative overflow-hidden">
                        <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                            <span>Categories / ប្រភេទមុខទំនិញ</span>
                            <Tags className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div className="text-xl sm:text-2xl font-bold text-white font-mono">
                            {categories.length}
                        </div>
                        <div className="text-xs text-zinc-400 font-khmer mt-1">
                            ក្រុមមុខម្ហូប និងភេសជ្ជៈ
                        </div>
                    </Card>

                    <Card className="p-4 bg-zinc-900/70 border-zinc-800/80 rounded-2xl relative overflow-hidden">
                        <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                            <span>Units / ខ្នាតរង្វាស់</span>
                            <Scale className="w-4 h-4 text-teal-400" />
                        </div>
                        <div className="text-xl sm:text-2xl font-bold text-white font-mono">
                            {units.length}
                        </div>
                        <div className="text-xs text-teal-400/90 font-khmer mt-1">
                            ខ្នាតគិត កំប៉ុង/ចាន/គីឡូ
                        </div>
                    </Card>

                    <Card className="p-4 bg-zinc-900/70 border-zinc-800/80 rounded-2xl relative overflow-hidden">
                        <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                            <span>Exchange Rate / អត្រាប្តូរប្រាក់</span>
                            <DollarSign className="w-4 h-4 text-purple-400" />
                        </div>
                        <div className="text-xl sm:text-2xl font-bold text-white font-mono">
                            {exchange_rate.toLocaleString()} ៛
                        </div>
                        <div className="text-xs text-purple-400/90 font-khmer mt-1">
                            អត្រាគិតលុយ 1 USD
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
                                    <thead className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-400 uppercase font-mono text-[10px] whitespace-nowrap tracking-wider">
                                        <tr>
                                            <th className="px-4 py-3 whitespace-nowrap">SKU</th>
                                            <th className="px-4 py-3 whitespace-nowrap">Product Name / ឈ្មោះមុខទំនិញ</th>
                                            <th className="px-4 py-3 whitespace-nowrap">Category / ប្រភេទ</th>
                                            <th className="px-4 py-3 whitespace-nowrap">Unit / ឯកតា</th>
                                            <th className="px-4 py-3 text-right whitespace-nowrap">Unit Price / តម្លៃ</th>
                                            <th className="px-4 py-3 text-center whitespace-nowrap">Status / ស្ថានភាព</th>
                                            <th className="px-4 py-3 text-right whitespace-nowrap">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-800/60">
                                        {filteredProducts.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="px-4 py-12 text-center text-zinc-500">
                                                    រកមិនឃើញមុខទំនិញដែលត្រូវនឹងការស្វែងរកទេ
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredProducts.map((p) => {
                                                const priceUSD = parseFloat(p.unit_price);
                                                const priceKHR = Math.round(priceUSD * exchange_rate);

                                                return (
                                                    <tr key={p.id} className="hover:bg-zinc-800/40 transition-colors">
                                                        <td className="px-4 py-3 font-mono text-zinc-400 whitespace-nowrap">
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
                                                                    <div className="font-semibold text-zinc-900 dark:text-white font-khmer text-sm">
                                                                        {p.name_primary}
                                                                    </div>
                                                                    {p.name_secondary && (
                                                                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                                                                            {p.name_secondary}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap">
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold font-khmer whitespace-nowrap bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                                                                {p.category.name_primary}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap">
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
                                                        <td className="px-4 py-3 text-right font-mono whitespace-nowrap">
                                                            <div className="font-bold text-amber-600 dark:text-amber-300">
                                                                ${priceUSD.toFixed(2)}
                                                            </div>
                                                            <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                                                                {priceKHR.toLocaleString()} ៛
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-center whitespace-nowrap">
                                                            <button
                                                                onClick={() => handleToggleProduct(p)}
                                                                title="Click to toggle status"
                                                                className="cursor-pointer"
                                                            >
                                                                {p.is_active ? (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 whitespace-nowrap">
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                                        Active
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-800 text-zinc-500 border border-zinc-700/60 whitespace-nowrap">
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-500"></span>
                                                                        Inactive
                                                                    </span>
                                                                )}
                                                            </button>
                                                        </td>
                                                        <td className="px-4 py-3 text-right whitespace-nowrap">
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
                                    <thead className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-400 uppercase font-mono text-[10px] whitespace-nowrap tracking-wider">
                                        <tr>
                                            <th className="px-4 py-3 whitespace-nowrap">Code / លេខកូដ</th>
                                            <th className="px-4 py-3 whitespace-nowrap">Primary Name / ឈ្មោះខ្មែរ</th>
                                            <th className="px-4 py-3 whitespace-nowrap">Secondary Name / ឈ្មោះអង់គ្លេស</th>
                                            <th className="px-4 py-3 text-center whitespace-nowrap">Items Count / មុខទំនិញ</th>
                                            <th className="px-4 py-3 text-center whitespace-nowrap">Status / ស្ថានភាព</th>
                                            <th className="px-4 py-3 text-right whitespace-nowrap">Actions</th>
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
                                                    <span
                                                        className={`catalog-count-pill ${
                                                            (u.products_count || 0) > 0
                                                                ? 'is-positive-sky'
                                                                : 'is-zero'
                                                        }`}
                                                    >
                                                        {u.products_count || 0} items
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <button
                                                        onClick={() => handleToggleUnit(u)}
                                                        className="cursor-pointer"
                                                    >
                                                        {u.is_active ? (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                                Active
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-800 text-zinc-500 border border-zinc-700/60">
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
                                    <thead className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-400 uppercase font-mono text-[10px] whitespace-nowrap tracking-wider">
                                        <tr>
                                            <th className="px-4 py-3 whitespace-nowrap">Code / លេខកូដ</th>
                                            <th className="px-4 py-3 whitespace-nowrap">Category Name / ឈ្មោះប្រភេទ</th>
                                            <th className="px-4 py-3 whitespace-nowrap">Secondary Name / ឈ្មោះអង់គ្លេស</th>
                                            <th className="px-4 py-3 whitespace-nowrap">Type / ប្រភេទ</th>
                                            <th className="px-4 py-3 text-center whitespace-nowrap">Items Count / មុខទំនិញ</th>
                                            <th className="px-4 py-3 text-center whitespace-nowrap">Status / ស្ថានភាព</th>
                                            <th className="px-4 py-3 text-right whitespace-nowrap">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-800/60">
                                        {categories.map((c) => (
                                            <tr key={c.id} className="hover:bg-zinc-800/40 transition-colors">
                                                <td className="px-4 py-3">
                                                    <span className="px-2 py-0.5 rounded-md font-mono text-[11px] font-bold bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/20">
                                                        {c.code}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 font-khmer text-sm font-semibold text-zinc-900 dark:text-white">
                                                    {c.name_primary}
                                                </td>
                                                <td className="px-4 py-3 font-khmer text-xs font-medium text-zinc-600 dark:text-zinc-400">
                                                    {c.name_secondary || '—'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/20">
                                                        {c.category_type}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center font-mono">
                                                    <span
                                                        className={`catalog-count-pill ${
                                                            (c.products_count || 0) > 0
                                                                ? 'is-positive-teal'
                                                                : 'is-zero'
                                                        }`}
                                                    >
                                                        {c.products_count || 0} items
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <button
                                                        onClick={() => handleToggleCategory(c)}
                                                        className="cursor-pointer"
                                                    >
                                                        {c.is_active ? (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                                Active
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-800 text-zinc-500 border border-zinc-700/60">
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
            {productModalOpen && mounted && createPortal(
                <div
                    className="fixed inset-y-0 right-0 left-0 md:left-[var(--sidebar-width,16rem)] z-50 flex flex-col bg-zinc-950/75 backdrop-blur-md animate-in fade-in duration-200 overscroll-contain"
                    onWheel={(e) => e.stopPropagation()}
                >
                    <div className="relative w-full h-full bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col transition-all duration-200">
                        {/* Header */}
                        <div className="px-6 py-3.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/60 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-xs shrink-0">
                                    <Package className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-base font-bold text-zinc-900 dark:text-white font-khmer">
                                            {editingProduct ? 'កែប្រែព័ត៌មានមុខទំនិញ' : 'បន្ថែមមុខទំនិញថ្មី'}
                                        </h3>
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 font-mono">
                                            {editingProduct ? 'Edit Product' : 'New Product'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-khmer">
                                        {editingProduct ? editingProduct.name_primary : 'បំពេញព័ត៌មានមុខម្ហូប ភេសជ្ជៈ រូបភាព និងតម្លៃលក់សម្រាប់ប្រព័ន្ធ POS'}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setProductModalOpen(false)}
                                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-950 dark:hover:text-white transition-all cursor-pointer font-khmer text-xs font-semibold shadow-xs group"
                                title="ត្រឡប់ក្រោយ (Esc)"
                            >
                                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform text-amber-500" />
                                <span>ត្រឡប់ក្រោយ</span>
                            </button>
                        </div>

                        {/* Form Body - 2 Columns (6 / 6) */}
                        <form onSubmit={handleProductSubmit} className="flex flex-col flex-1 min-h-0 overflow-y-auto">
                            <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1">
                                {/* LEFT COLUMN: Basic Info, Price/SKU, Settings (6 cols) */}
                                <div className="lg:col-span-6 space-y-3.5">
                                    {/* Section 1: General Info */}
                                    <div className="p-4 rounded-2xl bg-zinc-50/70 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800/80 space-y-3">
                                        <div className="flex items-center gap-2 text-xs font-bold text-zinc-800 dark:text-zinc-200 font-khmer">
                                            <Utensils className="w-3.5 h-3.5 text-amber-500" />
                                            <span>ព័ត៌មានទូទៅនៃមុខទំនិញ / General Information</span>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1 font-khmer">
                                                    ឈ្មោះមុខទំនិញជាភាសាខ្មែរ <span className="text-rose-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={productForm.data.name_primary}
                                                    onChange={(e) => productForm.setData('name_primary', e.target.value)}
                                                    placeholder="ឧ. លៀសហាលរសជាតិដើម"
                                                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 font-khmer focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                                                    required
                                                />
                                                {productForm.errors.name_primary && (
                                                    <p className="text-[11px] text-rose-500 font-khmer mt-0.5">{productForm.errors.name_primary}</p>
                                                )}
                                            </div>

                                            <div>
                                                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1 font-khmer">
                                                    ឈ្មោះជាភាសាអង់គ្លេស (Optional)
                                                </label>
                                                <input
                                                    type="text"
                                                    value={productForm.data.name_secondary}
                                                    onChange={(e) => productForm.setData('name_secondary', e.target.value)}
                                                    placeholder="e.g. Sun-dried Clams Original"
                                                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5">
                                            <div>
                                                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1 font-khmer">
                                                    ប្រភេទមុខទំនិញ (Category) <span className="text-rose-500">*</span>
                                                </label>
                                                <div className="relative">
                                                    <select
                                                        value={productForm.data.category_id}
                                                        onChange={(e) => productForm.setData('category_id', parseInt(e.target.value))}
                                                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white font-khmer focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 appearance-none cursor-pointer pr-9"
                                                        required
                                                    >
                                                        {categories.map((c) => (
                                                            <option key={c.id} value={c.id}>
                                                                {c.name_primary} {c.name_secondary ? `(${c.name_secondary})` : ''}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3 top-2.5 pointer-events-none" />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1 font-khmer">
                                                    ឯកតាគិត (Unit) <span className="text-rose-500">*</span>
                                                </label>
                                                <div className="relative">
                                                    <select
                                                        value={productForm.data.unit_id}
                                                        onChange={(e) => productForm.setData('unit_id', parseInt(e.target.value))}
                                                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white font-khmer focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 appearance-none cursor-pointer pr-9"
                                                        required
                                                    >
                                                        {units.map((u) => (
                                                            <option key={u.id} value={u.id}>
                                                                {u.name_primary} {u.name_secondary && u.name_secondary.toLowerCase() !== u.name_primary.toLowerCase() ? `• ${u.name_secondary}` : ''}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3 top-2.5 pointer-events-none" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section 2: Pricing & SKU */}
                                    <div className="p-4 rounded-2xl bg-zinc-50/70 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800/80 space-y-3">
                                        <div className="flex items-center gap-2 text-xs font-bold text-zinc-800 dark:text-zinc-200 font-khmer">
                                            <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                                            <span>តម្លៃលក់ និងលេខកូដទំនិញ / Pricing & Identification</span>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1 font-khmer">
                                                    តម្លៃលក់ឯកតា (USD) <span className="text-rose-500">*</span>
                                                </label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                        <span className="text-sm font-bold text-amber-600 dark:text-amber-400 font-mono">$</span>
                                                    </div>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        value={productForm.data.unit_price}
                                                        onChange={(e) => productForm.setData('unit_price', e.target.value)}
                                                        placeholder="0.00"
                                                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-xl pl-7 pr-3 py-2 text-sm font-mono font-bold text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                                                        required
                                                    />
                                                </div>
                                                <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-mono font-semibold text-xs">
                                                        ≈ {Math.round((parseFloat(productForm.data.unit_price) || 0) * exchange_rate).toLocaleString()} ៛
                                                    </span>
                                                    <span className="text-[10px] text-zinc-400 font-khmer">
                                                        ($1 = {exchange_rate.toLocaleString()}៛)
                                                    </span>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1 font-khmer">
                                                    លេខកូដសម្គាល់ (SKU / Barcode)
                                                </label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                        <Hash className="w-3.5 h-3.5 text-zinc-400" />
                                                    </div>
                                                    <input
                                                        type="text"
                                                        value={productForm.data.sku}
                                                        onChange={(e) => productForm.setData('sku', e.target.value)}
                                                        placeholder="ឧ. ETUM-20"
                                                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-xl pl-8 pr-3 py-2 text-xs font-mono text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                                                    />
                                                </div>
                                                <p className="text-[10px] text-zinc-400 font-khmer mt-1">
                                                    {productForm.errors.sku ? (
                                                        <span className="text-rose-500">{productForm.errors.sku}</span>
                                                    ) : (
                                                        'ស្រេចចិត្ត សម្រាប់ស្កេន ឬកត់ត្រា'
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section 3: Status Toggle */}
                                    <div
                                        onClick={() => productForm.setData('is_active', !productForm.data.is_active)}
                                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none flex items-center justify-between ${
                                            productForm.data.is_active
                                                ? 'bg-emerald-500/10 border-emerald-500/40 ring-1 ring-emerald-500/20'
                                                : 'bg-zinc-50/70 dark:bg-zinc-900/40 border-[#cbd5e1] dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                                                productForm.data.is_active
                                                    ? 'bg-emerald-500 text-white shadow-xs'
                                                    : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                                            }`}>
                                                <Check className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <span className="block text-xs font-bold text-zinc-900 dark:text-white font-khmer">
                                                    ស្ថានភាពមុខទំនិញ (Product Status)
                                                </span>
                                                <span className="block text-[11px] text-zinc-500 dark:text-zinc-400 font-khmer">
                                                    {productForm.data.is_active ? 'បើកដំណើរការលក់លើប្រព័ន្ធ POS (Active)' : 'ផ្អាកលក់បណ្តោះអាសន្នលើប្រព័ន្ធ POS (Inactive)'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                                            productForm.data.is_active ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-700'
                                        }`}>
                                            <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                                                productForm.data.is_active ? 'translate-x-5' : 'translate-x-0'
                                            }`} />
                                        </div>
                                    </div>
                                </div>

                                {/* RIGHT COLUMN: Product Media (Local Upload Only) */}
                                <div className="lg:col-span-6 flex flex-col p-4 sm:p-5 rounded-2xl bg-zinc-50/70 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800/80">
                                    {/* Section Header */}
                                    <div className="flex items-center justify-between pb-3 border-b border-zinc-200/70 dark:border-zinc-800/70 mb-3.5 shrink-0">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
                                                <ImageIcon className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <span className="text-xs font-bold text-zinc-900 dark:text-white font-khmer block">
                                                    រូបភាពមុខម្ហូប / Product Image
                                                </span>
                                                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-khmer block">
                                                    ផ្ទុកឡើងរូបភាពទំនិញពីកុំព្យូទ័ររបស់អ្នក
                                                </span>
                                            </div>
                                        </div>

                                        {productForm.data.image_url && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    productForm.setData('image_url', '');
                                                    setUploadedFileName(null);
                                                    setUploadError(null);
                                                }}
                                                className="text-xs text-rose-500 hover:text-rose-600 font-khmer flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-rose-500/10 transition-colors cursor-pointer border border-rose-500/20"
                                                title="ដករូបភាពចេញ"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                                <span>ដករូបភាព</span>
                                            </button>
                                        )}
                                    </div>

                                    {/* Hidden File Input */}
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp,image/gif"
                                        className="hidden"
                                        onChange={(e) => {
                                            if (e.target.files && e.target.files[0]) {
                                                handleFileSelect(e.target.files[0]);
                                            }
                                        }}
                                    />

                                    {/* Main Content Area */}
                                    <div className="flex-1 flex flex-col min-h-0 justify-center">
                                        {productForm.data.image_url ? (
                                            /* Selected / Uploaded Image View */
                                            <div className="flex flex-col items-center justify-between flex-1 gap-3.5 p-4 rounded-2xl bg-white dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80">
                                                <div className="relative w-full flex-1 min-h-[220px] max-h-[300px] rounded-2xl bg-zinc-100 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800/80 flex items-center justify-center p-3 overflow-hidden shadow-inner group">
                                                    <img
                                                        src={productForm.data.image_url}
                                                        alt="Product Preview"
                                                        className="max-h-[250px] max-w-full object-contain rounded-xl shadow-md transition-transform group-hover:scale-102"
                                                        onError={(e) => {
                                                            (e.target as HTMLElement).style.display = 'none';
                                                        }}
                                                    />
                                                    <div className="absolute top-3 right-3 bg-emerald-500 text-white rounded-full p-1 shadow-md flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-khmer font-bold">
                                                        <Check className="w-3 h-3 stroke-[3]" />
                                                        <span>បានជ្រើសរើស</span>
                                                    </div>
                                                </div>

                                                {/* Footer Controls for current image */}
                                                <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-zinc-200/70 dark:border-zinc-800/70">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <div className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
                                                            <CheckCircle2 className="w-4 h-4" />
                                                        </div>
                                                        <div className="truncate">
                                                            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block truncate">
                                                                {uploadedFileName || 'រូបភាពមុខម្ហូប (Product Photo)'}
                                                            </span>
                                                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-khmer block">
                                                                រួចរាល់សម្រាប់បង្ហាញលើប្រព័ន្ធ POS
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            onClick={() => fileInputRef.current?.click()}
                                                            className="border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 font-khmer text-xs rounded-xl h-8 px-3 cursor-pointer"
                                                        >
                                                            <UploadCloud className="w-3.5 h-3.5 mr-1" />
                                                            <span>ប្តូររូបថ្មី</span>
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            /* Empty State: Big Interactive Drag & Drop Box */
                                            <div
                                                onDragOver={(e) => {
                                                    e.preventDefault();
                                                    setIsDraggingOver(true);
                                                }}
                                                onDragLeave={() => setIsDraggingOver(false)}
                                                onDrop={(e) => {
                                                    e.preventDefault();
                                                    setIsDraggingOver(false);
                                                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                                        handleFileSelect(e.dataTransfer.files[0]);
                                                    }
                                                }}
                                                onClick={() => fileInputRef.current?.click()}
                                                className={`flex-1 min-h-[280px] sm:min-h-[320px] flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center relative group ${
                                                    isDraggingOver
                                                        ? 'border-amber-500 bg-amber-500/10 ring-4 ring-amber-500/20 scale-[0.99]'
                                                        : 'border-[#cbd5e1] dark:border-zinc-700 hover:border-amber-500/60 hover:bg-amber-500/5 bg-white/60 dark:bg-zinc-900/40'
                                                }`}
                                            >
                                                {isUploadingImage ? (
                                                    <div className="flex flex-col items-center gap-2 py-6">
                                                        <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
                                                        <span className="text-sm font-bold text-amber-600 dark:text-amber-400 font-khmer">
                                                            កំពុងផ្ទុកឡើងរូបភាពពីកុំព្យូទ័រ...
                                                        </span>
                                                        <span className="text-xs text-zinc-400 font-mono">Uploading image, please wait...</span>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mb-3.5 group-hover:scale-110 group-hover:bg-amber-500/15 transition-all shadow-sm">
                                                            <UploadCloud className="w-8 h-8 stroke-[1.75]" />
                                                        </div>

                                                        <h4 className="text-sm font-bold text-zinc-900 dark:text-white font-khmer mb-1">
                                                            ចុចទីនេះដើម្បី Upload ឬ អូសទម្លាក់រូបភាពពីកុំព្យូទ័រ
                                                        </h4>
                                                        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-khmer max-w-sm mb-4">
                                                            ជ្រើសរើសរូបភាពមុខម្ហូប ឬភេសជ្ជៈ ដើម្បីបង្ហាញក្នុងប្រព័ន្ធលក់ POS
                                                        </p>

                                                        <div className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold font-khmer text-xs shadow-md shadow-amber-500/20 inline-flex items-center gap-2 transition-transform group-hover:scale-105">
                                                            <FolderUp className="w-4 h-4" />
                                                            <span>ជ្រើសរើសរូបភាពពីម៉ាស៊ីន (Browse)</span>
                                                        </div>

                                                        <div className="mt-5 flex items-center justify-center gap-3 text-[10px] text-zinc-400 dark:text-zinc-500 font-khmer border-t border-[#cbd5e1] dark:border-zinc-800/60 pt-3 w-full max-w-xs">
                                                            <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 font-mono">
                                                                PNG, JPG, WEBP
                                                            </span>
                                                            <span>•</span>
                                                            <span>ធំបំផុត 5MB</span>
                                                            <span>•</span>
                                                            <span>ទំហំ 1:1 (ការ៉េ)</span>
                                                        </div>
                                                    </>
                                                )}

                                                {uploadError && (
                                                    <div className="mt-3 text-xs text-rose-500 font-khmer flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/20 px-3 py-1 rounded-xl">
                                                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                                        <span>{uploadError}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Pinned Footer Actions */}
                            <div className="px-6 py-3.5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/90 dark:bg-zinc-900/80 flex items-center justify-between gap-3 shrink-0">
                                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-khmer hidden sm:inline-block">
                                    <span className="text-rose-500 font-bold">*</span> ចាំបាច់ត្រូវបំពេញ
                                </span>

                                <div className="flex items-center gap-2.5 ml-auto">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setProductModalOpen(false)}
                                        className="border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-khmer px-4 py-2 rounded-xl text-xs"
                                    >
                                        បោះបង់ (Cancel)
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={productForm.processing}
                                        className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold font-khmer px-5 py-2 rounded-xl text-xs shadow-md shadow-amber-500/20 inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                    >
                                        {productForm.processing ? (
                                            <>
                                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                <span>កំពុងរក្សាទុក...</span>
                                            </>
                                        ) : editingProduct ? (
                                            <>
                                                <Check className="w-3.5 h-3.5" />
                                                <span>រក្សាទុកការកែប្រែ</span>
                                            </>
                                        ) : (
                                            <>
                                                <Plus className="w-3.5 h-3.5" />
                                                <span>បង្កើតមុខទំនិញថ្មី</span>
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* Unit Modal (Full-Workspace 2-Column Suite) */}
            {unitModalOpen && mounted && createPortal(
                <div
                    className="fixed inset-y-0 right-0 left-0 md:left-[var(--sidebar-width,16rem)] z-50 flex flex-col bg-zinc-50 dark:bg-zinc-950 overflow-hidden select-none animate-in fade-in duration-150 h-screen"
                    onWheel={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="px-6 py-3.5 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between shrink-0 shadow-xs">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-xs shrink-0">
                                <Scale className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-base font-bold text-zinc-900 dark:text-white font-khmer">
                                        {editingUnit ? 'កែប្រែឯកតាគិតទំនិញ' : 'បន្ថែមឯកតាគិតថ្មី'}
                                    </h3>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-mono">
                                        {editingUnit ? 'Edit Unit' : 'New Unit of Measurement'}
                                    </span>
                                </div>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-khmer">
                                    {editingUnit ? editingUnit.name_primary : 'កំណត់ឯកតាគិតសម្រាប់មុខម្ហូប ភេសជ្ជៈ និងការលក់ក្នុងប្រព័ន្ធ POS'}
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setUnitModalOpen(false)}
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-950 dark:hover:text-white transition-all cursor-pointer font-khmer text-xs font-semibold shadow-xs group"
                            title="ត្រឡប់ក្រោយ (Esc)"
                        >
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform text-emerald-600 dark:text-emerald-400" />
                            <span>ត្រឡប់ក្រោយ</span>
                        </button>
                    </div>

                    {/* Body - 2 Columns (7 / 5) */}
                    <form onSubmit={handleUnitSubmit} className="flex flex-col flex-1 min-h-0 overflow-y-auto">
                        <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1">
                            {/* LEFT COLUMN: Inputs (7 cols) */}
                            <div className="lg:col-span-7 space-y-4">
                                <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-xs">
                                    <div className="flex items-center gap-2 text-xs font-bold text-zinc-800 dark:text-zinc-200 font-khmer pb-1 border-b border-zinc-100 dark:border-zinc-800">
                                        <Scale className="w-4 h-4 text-emerald-500" />
                                        <span>ព័ត៌មានឯកតាគិត / Measurement Unit Identity</span>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1 font-khmer">
                                            កូដឯកតា (Unit Code) <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={unitForm.data.code}
                                            onChange={(e) => unitForm.setData('code', e.target.value)}
                                            placeholder="e.g. CAN, PLATE, SET, BOTTLE"
                                            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs font-mono uppercase font-bold text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                            required
                                        />
                                        {unitForm.errors.code && (
                                            <p className="text-[11px] text-rose-500 font-khmer mt-1">{unitForm.errors.code}</p>
                                        )}
                                        <div className="flex items-center gap-1.5 mt-2">
                                            <span className="text-[11px] text-zinc-400 font-khmer">កូដគំរូ:</span>
                                            {['PLATE', 'CAN', 'BOTTLE', 'GLASS', 'SET', 'BOWL'].map((sample) => (
                                                <button
                                                    key={sample}
                                                    type="button"
                                                    onClick={() => unitForm.setData('code', sample)}
                                                    className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-emerald-500 transition cursor-pointer"
                                                >
                                                    {sample}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1 font-khmer">
                                                ឈ្មោះឯកតាជាភាសាខ្មែរ <span className="text-rose-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={unitForm.data.name_primary}
                                                onChange={(e) => unitForm.setData('name_primary', e.target.value)}
                                                placeholder="ឧ. ចាន, កំប៉ុង, ដប, កែវ"
                                                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs font-khmer text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1 font-khmer">
                                                ឈ្មោះជាភាសាអង់គ្លេស (Optional)
                                            </label>
                                            <input
                                                type="text"
                                                value={unitForm.data.name_secondary}
                                                onChange={(e) => unitForm.setData('name_secondary', e.target.value)}
                                                placeholder="e.g. Plate, Can, Bottle, Glass"
                                                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                            />
                                        </div>
                                    </div>

                                    {/* Quick Preset Buttons */}
                                    <div>
                                        <label className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5 font-khmer">
                                            គំរូឯកតាពេញនិយម (Quick Unit Presets)
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {[
                                                { code: 'PLATE', kh: 'ចាន', en: 'Plate' },
                                                { code: 'CAN', kh: 'កំប៉ុង', en: 'Can' },
                                                { code: 'BOTTLE', kh: 'ដប', en: 'Bottle' },
                                                { code: 'GLASS', kh: 'កែវ', en: 'Glass' },
                                                { code: 'SET', kh: 'ឈុត', en: 'Set' },
                                                { code: 'PORTION', kh: 'ចំណែក', en: 'Portion' },
                                            ].map((preset) => (
                                                <button
                                                    key={preset.code}
                                                    type="button"
                                                    onClick={() => {
                                                        unitForm.setData({
                                                            code: preset.code,
                                                            name_primary: preset.kh,
                                                            name_secondary: preset.en,
                                                        });
                                                    }}
                                                    className="px-2.5 py-1.5 rounded-lg text-xs bg-zinc-50 dark:bg-zinc-800 hover:bg-emerald-500/10 hover:border-emerald-500/30 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-khmer transition cursor-pointer"
                                                >
                                                    {preset.kh} ({preset.code})
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT COLUMN: Live Simulation Preview (5 cols) */}
                            <div className="lg:col-span-5 space-y-4">
                                <div className="rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 shadow-lg space-y-4 relative overflow-hidden">
                                    <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600" />

                                    <div className="flex items-center justify-between pt-1">
                                        <div className="flex items-center gap-2">
                                            <Sparkles className="w-4 h-4 text-emerald-500" />
                                            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-mono">
                                                Unit Display Simulation
                                            </span>
                                        </div>
                                        <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                            {unitForm.data.code || 'UNIT'}
                                        </span>
                                    </div>

                                    {/* Menu Card Pricing Preview */}
                                    <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-3">
                                        <div className="text-[11px] font-bold text-zinc-500 font-khmer uppercase tracking-wider">
                                            ការបង្ហាញលើបញ្ជីមុខម្ហូប POS:
                                        </div>
                                        <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                                            <div>
                                                <div className="text-xs font-bold text-zinc-900 dark:text-white font-khmer">
                                                    លៀសឆាអ៉ីទុមពិសេស
                                                </div>
                                                <div className="text-[11px] text-zinc-400 font-mono">
                                                    SKU: POS-001
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-bold text-amber-500 font-mono">
                                                    $2.50
                                                </div>
                                                <div className="text-[11px] text-zinc-500 font-khmer">
                                                    / {unitForm.data.name_primary || 'ឯកតា'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Receipt Line Item Simulation */}
                                    <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-2 font-mono text-xs">
                                        <div className="text-[11px] font-bold text-zinc-500 font-khmer uppercase tracking-wider">
                                            ការបោះពុម្ពលើវិក្កយបត្រ (Receipt Line):
                                        </div>
                                        <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-dashed border-zinc-300 dark:border-zinc-800 text-[11px] text-zinc-700 dark:text-zinc-300 space-y-1 font-khmer">
                                            <div className="flex justify-between font-bold">
                                                <span>លៀសឆាអ៉ីទុមពិសេស</span>
                                                <span className="font-mono">$5.00</span>
                                            </div>
                                            <div className="flex justify-between text-zinc-400 text-[10px]">
                                                <span>2 {unitForm.data.name_primary || 'ឯកតា'} x $2.50</span>
                                                <span className="font-mono">20,500 ៛</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-3.5 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between shrink-0 shadow-lg">
                            <div className="text-xs text-zinc-500 dark:text-zinc-400 font-khmer flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                <span>{editingUnit ? 'កំពុងកែសម្រួលឯកតាគិត' : 'កំពុងបង្កើតឯកតាគិតថ្មី'}</span>
                            </div>
                            <div className="flex items-center gap-2.5">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setUnitModalOpen(false)}
                                    className="border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-khmer text-xs rounded-xl h-10 px-5 cursor-pointer"
                                >
                                    បោះបង់ (Cancel)
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={unitForm.processing}
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold font-khmer text-xs rounded-xl h-10 px-6 shadow-md shadow-emerald-600/20 cursor-pointer flex items-center gap-2"
                                >
                                    {unitForm.processing ? (
                                        'កំពុងរក្សាទុក...'
                                    ) : (
                                        <>
                                            <Check className="w-4 h-4" />
                                            <span>{editingUnit ? 'កែប្រែឯកតា' : 'រក្សាទុកឯកតា'}</span>
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </form>
                </div>,
                document.body
            )}

            {/* Category Modal (Full-Workspace 2-Column Suite) */}
            {categoryModalOpen && mounted && createPortal(
                <div
                    className="fixed inset-y-0 right-0 left-0 md:left-[var(--sidebar-width,16rem)] z-50 flex flex-col bg-zinc-50 dark:bg-zinc-950 overflow-hidden select-none animate-in fade-in duration-150 h-screen"
                    onWheel={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="px-6 py-3.5 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between shrink-0 shadow-xs">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-600 dark:text-teal-400 shadow-xs shrink-0">
                                <Tags className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-base font-bold text-zinc-900 dark:text-white font-khmer">
                                        {editingCategory ? 'កែប្រែប្រភេទមុខទំនិញ' : 'បន្ថែមប្រភេទមុខទំនិញថ្មី'}
                                    </h3>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/20 font-mono">
                                        {editingCategory ? 'Edit Category' : 'New POS Category'}
                                    </span>
                                </div>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-khmer">
                                    {editingCategory ? editingCategory.name_primary : 'រៀបចំប្រភេទមុខម្ហូប ភេសជ្ជៈ និងទំនិញដើម្បីបង្ហាញលើផ្ទាំងប៊ូតុង POS ឱ្យងាយស្រួលរក'}
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setCategoryModalOpen(false)}
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-950 dark:hover:text-white transition-all cursor-pointer font-khmer text-xs font-semibold shadow-xs group"
                            title="ត្រឡប់ក្រោយ (Esc)"
                        >
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform text-teal-600 dark:text-teal-400" />
                            <span>ត្រឡប់ក្រោយ</span>
                        </button>
                    </div>

                    {/* Body - 2 Columns (7 / 5) */}
                    <form onSubmit={handleCategorySubmit} className="flex flex-col flex-1 min-h-0 overflow-y-auto">
                        <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1">
                            {/* LEFT COLUMN: Inputs (7 cols) */}
                            <div className="lg:col-span-7 space-y-4">
                                <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-xs">
                                    <div className="flex items-center gap-2 text-xs font-bold text-zinc-800 dark:text-zinc-200 font-khmer pb-1 border-b border-zinc-100 dark:border-zinc-800">
                                        <Tags className="w-4 h-4 text-teal-500" />
                                        <span>ព័ត៌មានប្រភេទមុខទំនិញ / Category Details</span>
                                    </div>

                                    {/* Category Type selector cards */}
                                    <div>
                                        <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2 font-khmer">
                                            ចំណាត់ថ្នាក់ចម្បង (Category Classification) <span className="text-rose-500">*</span>
                                        </label>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                            {[
                                                { type: 'food', label: 'ម្ហូបអាហារ (Food)', icon: Utensils, desc: 'ម្ហូប & ស៊ុប' },
                                                { type: 'beverage', label: 'ភេសជ្ជៈ (Beverage)', icon: Wine, desc: 'ទឹកក្រូច & ស្រាបៀរ' },
                                                { type: 'package', label: 'កញ្ចប់ (Package)', icon: Package, desc: 'ឈុត & កញ្ចប់' },
                                                { type: 'general', label: 'ទូទៅ (General)', icon: Tags, desc: 'មុខទំនិញផ្សេងៗ' },
                                            ].map((item) => {
                                                const Icon = item.icon;
                                                const isSelected = categoryForm.data.category_type === item.type;
                                                return (
                                                    <button
                                                        key={item.type}
                                                        type="button"
                                                        onClick={() => categoryForm.setData('category_type', item.type)}
                                                        className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                                                            isSelected
                                                                ? 'bg-teal-500/15 border-teal-500 text-teal-700 dark:text-teal-300 shadow-sm'
                                                                : 'bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-teal-400/40'
                                                        }`}
                                                    >
                                                        <Icon className="w-5 h-5 mb-1.5 text-teal-500" />
                                                        <div className="text-xs font-bold font-khmer">{item.label}</div>
                                                        <div className="text-[10px] text-zinc-400 font-khmer">{item.desc}</div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1 font-khmer">
                                                កូដប្រភេទ (Code) <span className="text-rose-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={categoryForm.data.code}
                                                onChange={(e) => categoryForm.setData('code', e.target.value)}
                                                placeholder="e.g. SOUPS, CLAMS, BEV"
                                                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs font-mono uppercase font-bold text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                                                required
                                            />
                                            {categoryForm.errors.code && (
                                                <p className="text-[11px] text-rose-500 font-khmer mt-1">{categoryForm.errors.code}</p>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1 font-khmer">
                                                ឈ្មោះប្រភេទជាភាសាខ្មែរ <span className="text-rose-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={categoryForm.data.name_primary}
                                                onChange={(e) => categoryForm.setData('name_primary', e.target.value)}
                                                placeholder="ឧ. លៀស & គ្រឿងសមុទ្រ"
                                                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs font-khmer text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1 font-khmer">
                                            ឈ្មោះជាភាសាអង់គ្លេស (English Optional)
                                        </label>
                                        <input
                                            type="text"
                                            value={categoryForm.data.name_secondary}
                                            onChange={(e) => categoryForm.setData('name_secondary', e.target.value)}
                                            placeholder="e.g. Clams & Seafood"
                                            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                                        />
                                    </div>

                                    {/* Category Presets */}
                                    <div>
                                        <label className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5 font-khmer">
                                            គំរូប្រភេទពេញនិយម (Quick Category Presets)
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {[
                                                { code: 'CLAMS', kh: 'លៀស & ងាវស្រស់', en: 'Clams & Shellfish', type: 'food' },
                                                { code: 'BEVERAGE', kh: 'ភេសជ្ជៈ & ទឹកក្រូច', en: 'Beverages & Soft Drinks', type: 'beverage' },
                                                { code: 'SNACKS', kh: 'គ្រឿងក្លែម & បំពង', en: 'Appetizers & Fried', type: 'food' },
                                                { code: 'RICE', kh: 'បាយ & មីឆា', en: 'Rice & Fried Noodles', type: 'food' },
                                            ].map((preset) => (
                                                <button
                                                    key={preset.code}
                                                    type="button"
                                                    onClick={() => {
                                                        categoryForm.setData({
                                                            code: preset.code,
                                                            name_primary: preset.kh,
                                                            name_secondary: preset.en,
                                                            category_type: preset.type,
                                                        });
                                                    }}
                                                    className="px-2.5 py-1.5 rounded-lg text-xs bg-zinc-50 dark:bg-zinc-800 hover:bg-teal-500/10 hover:border-teal-500/30 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-khmer transition cursor-pointer"
                                                >
                                                    {preset.kh}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT COLUMN: Live POS Screen Category Tab Preview (5 cols) */}
                            <div className="lg:col-span-5 space-y-4">
                                <div className="rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 shadow-lg space-y-4 relative overflow-hidden">
                                    <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-600" />

                                    <div className="flex items-center justify-between pt-1">
                                        <div className="flex items-center gap-2">
                                            <Sparkles className="w-4 h-4 text-teal-500" />
                                            <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400 font-mono">
                                                POS Menu Tab Preview
                                            </span>
                                        </div>
                                        <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-600 border border-teal-500/20 uppercase">
                                            {categoryForm.data.category_type}
                                        </span>
                                    </div>

                                    {/* POS Filter Tab Mock */}
                                    <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-3">
                                        <div className="text-[11px] font-bold text-zinc-500 font-khmer uppercase tracking-wider">
                                            ប៊ូតុងប្រភេទលើអេក្រង់ POS:
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <div className="px-3.5 py-2 rounded-xl bg-amber-500 text-zinc-950 font-bold font-khmer text-xs shadow-md shadow-amber-500/20 flex items-center gap-1.5">
                                                <Tags className="w-3.5 h-3.5" />
                                                <span>{categoryForm.data.name_primary || 'ឈ្មោះប្រភេទ'}</span>
                                            </div>
                                            <div className="px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-khmer text-xs">
                                                មុខទំនិញទាំងអស់
                                            </div>
                                        </div>
                                    </div>

                                    {/* KDS Dispatch Note */}
                                    <div className="p-3.5 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-xs text-teal-800 dark:text-teal-300 space-y-1.5">
                                        <div className="font-bold flex items-center gap-1.5 font-khmer">
                                            <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                                            <span>ការបញ្ជូនទៅផ្ទះបាយស្វ័យប្រវត្ត (KDS Routing)</span>
                                        </div>
                                        <p className="text-[11px] text-teal-700/90 dark:text-teal-300/80 leading-relaxed font-khmer">
                                            ប្រភេទម្ហូប (Food) នឹងត្រូវបញ្ជូនទៅកាន់អេក្រង់ចុងភៅ KDS ផ្ទះបាយដោយស្វ័យប្រវត្តិ។ ចំណែកឯភេសជ្ជៈ (Beverage) នឹងត្រូវបញ្ជូនទៅកាន់បញ្ជរភេសជ្ជៈ។
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-3.5 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between shrink-0 shadow-lg">
                            <div className="text-xs text-zinc-500 dark:text-zinc-400 font-khmer flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
                                <span>{editingCategory ? 'កំពុងកែសម្រួលប្រភេទមុខទំនិញ' : 'កំពុងបង្កើតប្រភេទមុខទំនិញថ្មី'}</span>
                            </div>
                            <div className="flex items-center gap-2.5">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setCategoryModalOpen(false)}
                                    className="border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-khmer text-xs rounded-xl h-10 px-5 cursor-pointer"
                                >
                                    បោះបង់ (Cancel)
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={categoryForm.processing}
                                    className="bg-teal-600 hover:bg-teal-500 text-white font-bold font-khmer text-xs rounded-xl h-10 px-6 shadow-md shadow-teal-600/20 cursor-pointer flex items-center gap-2"
                                >
                                    {categoryForm.processing ? (
                                        'កំពុងរក្សាទុក...'
                                    ) : (
                                        <>
                                            <Check className="w-4 h-4" />
                                            <span>{editingCategory ? 'កែប្រែប្រភេទ' : 'រក្សាទុកប្រភេទ'}</span>
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </form>
                </div>,
                document.body
            )}
        </AppLayout>
    );
}
