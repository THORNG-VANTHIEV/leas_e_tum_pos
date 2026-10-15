import React, { useState, useEffect, useRef } from 'react';
import { AppLayout } from '@/layouts/app-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { router, usePage } from '@inertiajs/react';
import { PageProps } from '@/types';
import { useTranslation } from '@/context/language-context';
import {
    Search,
    Plus,
    Minus,
    Trash2,
    DollarSign,
    CheckCircle2,
    Coins,
    CreditCard,
    QrCode,
    Utensils,
    ShoppingBag,
    Users,
    Clock,
    Printer,
    Sparkles,
    X,
    ChevronLeft,
    ChevronRight,
    ArrowRight,
    Store,
    Receipt,
    Maximize,
    Minimize,
} from 'lucide-react';

interface ProductItem {
    id: number;
    sku: string | null;
    name_primary: string;
    name_secondary: string | null;
    unit_price: string;
    image_url?: string | null;
    is_primary_package: boolean;
    unit: { id: number; name_primary: string };
    category_id: number;
}

interface Category {
    id: number;
    code: string;
    name_primary: string;
    name_secondary: string | null;
    category_type: string;
    products: ProductItem[];
}

interface OrderLine {
    product_id: number;
    name_primary: string;
    name_secondary?: string | null;
    unit_name: string;
    unit_price: string;
    image_url?: string | null;
    quantity: number;
    is_primary_package: boolean;
}

interface ActiveTableItem {
    id: number;
    product_id: number;
    name_primary: string;
    quantity: number;
    unit_price: string;
    line_total: string;
}

interface ActiveTable {
    id: number;
    table_identifier: string;
    grand_total: string;
    unit_count: number;
    note?: string | null;
    created_at: string;
    updated_at: string;
    items: ActiveTableItem[];
}

interface CustomerOption {
    id: number;
    name: string;
    phone: string | null;
    tier: string;
    loyalty_points: number;
}

interface CreateProps {
    period: {
        id: number;
        code: string;
        name: string;
        start_date: string;
        end_date: string;
        entry_settings?: {
            require_source_total?: boolean;
            show_event_time?: boolean;
        } | null;
    };
    categories: Category[];
    products: ProductItem[];
    active_tables?: ActiveTable[];
    tables_list?: string[];
    customers?: CustomerOption[];
    initial_table?: string;
    exchange_rate?: number;
}

export default function DocumentCreate({
    period,
    categories,
    products,
    active_tables = [],
    tables_list = ['តុ ០១', 'តុ ០២', 'តុ ០៣', 'តុ ០៤', 'តុ ០៥', 'តុ ០៦', 'តុ ០៧', 'តុ ០៨', 'តុ ០៩', 'តុ ១០', 'តុ ១១', 'តុ ១២'],
    customers = [],
    initial_table = '',
    exchange_rate = 4100,
}: CreateProps) {
    const { business } = usePage<PageProps>().props;
    const { language, t, getName, getSecondaryName } = useTranslation();

    // Terminal states
    const [orderMode, setOrderMode] = useState<'takeaway' | 'dine_in'>(initial_table ? 'dine_in' : 'takeaway');
    const [selectedTable, setSelectedTable] = useState<string>(initial_table || tables_list[0] || 'តុ ០១');
    const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
    const [currentDraftId, setCurrentDraftId] = useState<number | null>(null);

    const [selectedCategory, setSelectedCategory] = useState<number | 'all'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [lines, setLines] = useState<OrderLine[]>([]);

    // Discount & Payment
    const [discountType, setDiscountType] = useState<'none' | 'percent' | 'amount'>('none');
    const [discountValue, setDiscountValue] = useState<string>('0');

    // Modals
    const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
    const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
    const [isTablesModalOpen, setIsTablesModalOpen] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'khqr' | 'card'>('cash');
    const [amountReceived, setAmountReceived] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fullscreen state & toggle
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
        } else {
            document.exitFullscreen().catch(() => {});
        }
    };

    const searchInputRef = useRef<HTMLInputElement>(null);

    // Sub-menu category bar auto-scroller & navigation state
    const categoryContainerRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);
    const [isDraggingCategory, setIsDraggingCategory] = useState(false);
    const [dragStartX, setDragStartX] = useState(0);
    const [dragScrollLeft, setDragScrollLeft] = useState(0);
    const [hasDragged, setHasDragged] = useState(false);

    const updateCategoryScrollState = () => {
        if (!categoryContainerRef.current) return;
        const { scrollLeft, scrollWidth, clientWidth } = categoryContainerRef.current;
        setCanScrollLeft(scrollLeft > 4);
        setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
    };

    useEffect(() => {
        updateCategoryScrollState();
        window.addEventListener('resize', updateCategoryScrollState);
        return () => window.removeEventListener('resize', updateCategoryScrollState);
    }, [categories]);

    const scrollCategories = (direction: 'left' | 'right', amount: number = 240) => {
        if (!categoryContainerRef.current) return;
        categoryContainerRef.current.scrollBy({
            left: direction === 'left' ? -amount : amount,
            behavior: 'smooth',
        });
        setTimeout(updateCategoryScrollState, 300);
    };

    // Auto-scroll the clicked sub-menu tab smoothly into view (centered)
    const handleCategoryClick = (catId: number | 'all', e: React.MouseEvent<HTMLButtonElement>) => {
        if (hasDragged) {
            setHasDragged(false);
            return;
        }
        setSelectedCategory(catId);
        e.currentTarget.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'center',
        });
        setTimeout(updateCategoryScrollState, 350);
    };

    // Handle clicking near or on the sub menu container edges to scroll
    const handleCategoryContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (hasDragged) {
            setHasDragged(false);
            return;
        }
        if ((e.target as HTMLElement).closest('button')) return;
        if (!categoryContainerRef.current) return;

        const rect = categoryContainerRef.current.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const width = rect.width;

        if (clickX < width * 0.35) {
            scrollCategories('left', 260);
        } else if (clickX > width * 0.65) {
            scrollCategories('right', 260);
        }
    };

    // Mouse wheel horizontal scroll support
    const handleCategoryWheel = (e: React.WheelEvent<HTMLDivElement>) => {
        if (!categoryContainerRef.current) return;
        if (e.deltaY !== 0 && e.deltaX === 0) {
            categoryContainerRef.current.scrollLeft += e.deltaY;
            updateCategoryScrollState();
        }
    };

    // Mouse drag-to-scroll
    const handleCategoryMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!categoryContainerRef.current) return;
        setIsDraggingCategory(true);
        setHasDragged(false);
        setDragStartX(e.pageX - categoryContainerRef.current.offsetLeft);
        setDragScrollLeft(categoryContainerRef.current.scrollLeft);
    };

    const handleCategoryMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isDraggingCategory || !categoryContainerRef.current) return;
        const x = e.pageX - categoryContainerRef.current.offsetLeft;
        const delta = x - dragStartX;
        if (Math.abs(delta) > 5) {
            setHasDragged(true);
            categoryContainerRef.current.scrollLeft = dragScrollLeft - delta * 1.3;
            updateCategoryScrollState();
        }
    };

    const handleCategoryMouseUp = () => {
        setIsDraggingCategory(false);
    };

    // Keyboard shortcuts: / to search, F2 to checkout, Escape to close modals
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === '/' && document.activeElement !== searchInputRef.current && !isCheckoutModalOpen) {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
            if (e.key === 'F2') {
                e.preventDefault();
                if (lines.length > 0) {
                    openCheckoutModal();
                }
            }
            if (e.key === 'Escape') {
                setIsCheckoutModalOpen(false);
                setIsTablesModalOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [lines, isCheckoutModalOpen]);

    // Financial calculations
    const calculateTotals = () => {
        let subtotalCents = 0;
        let totalItems = 0;

        lines.forEach((l) => {
            const priceCents = Math.round(parseFloat(l.unit_price) * 100);
            subtotalCents += priceCents * l.quantity;
            totalItems += l.quantity;
        });

        let discountCents = 0;
        if (discountType === 'percent') {
            const pct = parseFloat(discountValue) || 0;
            discountCents = Math.round(subtotalCents * (pct / 100));
        } else if (discountType === 'amount') {
            discountCents = Math.round((parseFloat(discountValue) || 0) * 100);
        }

        discountCents = Math.min(discountCents, subtotalCents);
        const grandTotalCents = Math.max(0, subtotalCents - discountCents);

        const subtotalUSD = (subtotalCents / 100).toFixed(2);
        const discountUSD = (discountCents / 100).toFixed(2);
        const grandTotalUSD = (grandTotalCents / 100).toFixed(2);

        const grandTotalKHR = Math.round((grandTotalCents / 100) * exchange_rate);
        const subtotalKHR = Math.round((subtotalCents / 100) * exchange_rate);

        // Cash Tender calculation
        const tenderInput = parseFloat(amountReceived || '0');
        const tenderCents = isNaN(tenderInput) ? 0 : Math.round(tenderInput * 100);
        const changeCents = Math.max(0, tenderCents - grandTotalCents);
        const changeUSD = (changeCents / 100).toFixed(2);
        const changeKHR = Math.round((changeCents / 100) * exchange_rate);
        const isSufficient = tenderCents >= grandTotalCents;

        return {
            subtotalUSD,
            discountUSD,
            grandTotalUSD,
            subtotalKHR,
            grandTotalKHR,
            totalItems,
            changeUSD,
            changeKHR,
            isSufficient,
            tenderInput,
        };
    };

    const totals = calculateTotals();

    // Cart actions
    const addProduct = (p: ProductItem) => {
        setLines((prev) => {
            const existing = prev.find((item) => item.product_id === p.id);
            if (existing) {
                return prev.map((item) =>
                    item.product_id === p.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [
                ...prev,
                {
                    product_id: p.id,
                    name_primary: p.name_primary,
                    name_secondary: p.name_secondary,
                    unit_name: p.unit.name_primary,
                    unit_price: p.unit_price,
                    image_url: p.image_url,
                    quantity: 1,
                    is_primary_package: p.is_primary_package,
                },
            ];
        });
    };

    const updateQuantity = (productId: number, delta: number) => {
        setLines((prev) =>
            prev
                .map((item) => {
                    if (item.product_id === productId) {
                        const newQty = item.quantity + delta;
                        return newQty > 0 ? { ...item, quantity: newQty } : null;
                    }
                    return item;
                })
                .filter(Boolean) as OrderLine[]
        );
    };

    const removeLine = (productId: number) => {
        setLines((prev) => prev.filter((item) => item.product_id !== productId));
    };

    const clearCart = () => {
        setLines([]);
        setCurrentDraftId(null);
        setDiscountType('none');
        setDiscountValue('0');
        setAmountReceived('');
    };

    // Load active table into terminal
    const handleSelectActiveTable = (table: ActiveTable) => {
        setOrderMode('dine_in');
        setSelectedTable(table.table_identifier);
        setCurrentDraftId(table.id);

        const loadedLines: OrderLine[] = table.items.map((it) => {
            const matchedProduct = products.find((p) => p.id === it.product_id);
            return {
                product_id: it.product_id,
                name_primary: it.name_primary,
                name_secondary: matchedProduct?.name_secondary || null,
                unit_name: matchedProduct?.unit.name_primary || 'ចាន',
                unit_price: it.unit_price,
                quantity: it.quantity,
                is_primary_package: matchedProduct?.is_primary_package ?? false,
            };
        });

        setLines(loadedLines);
        setIsTablesModalOpen(false);
    };

    // Hold / Save Dine-in Table Order
    const handleHoldTable = () => {
        if (lines.length === 0) return;

        setIsSubmitting(true);
        router.post(
            '/invoices/hold-table',
            {
                table_identifier: selectedTable,
                document_id: currentDraftId,
                discount_amount: totals.discountUSD,
                items: lines.map((l) => ({ product_id: l.product_id, quantity: l.quantity })),
            },
            {
                onSuccess: () => {
                    setIsSubmitting(false);
                    clearCart();
                },
                onError: () => {
                    setIsSubmitting(false);
                },
            }
        );
    };

    // Cancel / Void open table draft
    const handleCancelTable = (tableId: number) => {
        if (!confirm('តើអ្នកពិតជាចង់លុបចោលការកុម្ម៉ង់តុនេះមែនទេ?')) return;

        router.delete(`/invoices/${tableId}/cancel-table`, {
            onSuccess: () => {
                if (currentDraftId === tableId) {
                    clearCart();
                }
            },
        });
    };

    // Open Checkout Modal
    const openCheckoutModal = () => {
        if (lines.length === 0) return;
        setAmountReceived(totals.grandTotalUSD);
        setPaymentMethod('cash');
        setIsCheckoutModalOpen(true);
    };

    // Confirm Settlement & Checkout
    const handleConfirmCheckout = () => {
        if (lines.length === 0 || isSubmitting) return;

        const tableName = orderMode === 'takeaway' ? 'ខ្ចប់ (Takeaway)' : selectedTable;

        setIsSubmitting(true);
        router.post(
            '/invoices/checkout',
            {
                table_identifier: tableName,
                customer_id: selectedCustomerId,
                document_id: currentDraftId,
                payment_method: paymentMethod,
                amount_received: paymentMethod === 'cash' ? (amountReceived || totals.grandTotalUSD) : totals.grandTotalUSD,
                discount_amount: totals.discountUSD,
                items: lines.map((l) => ({ product_id: l.product_id, quantity: l.quantity })),
            },
            {
                onSuccess: () => {
                    setIsSubmitting(false);
                    setIsCheckoutModalOpen(false);
                },
                onError: () => {
                    setIsSubmitting(false);
                },
            }
        );
    };

    // Filter items
    const filteredProducts = products.filter((p) => {
        const matchesCategory =
            selectedCategory === 'all' || p.category_id === selectedCategory;
        const matchesSearch =
            searchQuery.trim() === '' ||
            p.name_primary.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (p.name_secondary && p.name_secondary.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesCategory && matchesSearch;
    });

    const activeTablesCount = active_tables.length;

    return (
        <AppLayout title="ប្រព័ន្ធ POS - លៀសហាល អ៉ីទុម">
            <div className="flex flex-col h-full w-full min-h-0 bg-slate-950 text-slate-100 overflow-hidden select-none">
                {/* POS Top Operational Bar */}
                <div className="bg-slate-900/90 backdrop-blur border-b border-slate-800 px-4 sm:px-6 py-2 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        {/* Order Mode Switcher */}
                        <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
                            <button
                                type="button"
                                onClick={() => {
                                    setOrderMode('takeaway');
                                    setCurrentDraftId(null);
                                }}
                                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                    orderMode === 'takeaway'
                                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                                        : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                                }`}
                            >
                                <ShoppingBag className="w-3.5 h-3.5" />
                                {t('pos.order_type_takeaway')}
                            </button>
                            <button
                                type="button"
                                onClick={() => setOrderMode('dine_in')}
                                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                    orderMode === 'dine_in'
                                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                                        : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                                }`}
                            >
                                <Utensils className="w-3.5 h-3.5" />
                                {t('pos.order_type_dine_in')}
                            </button>
                        </div>

                        {/* Dine-in Table Selector */}
                        {orderMode === 'dine_in' && (
                            <div className="flex items-center gap-2">
                                <select
                                    value={selectedTable}
                                    onChange={(e) => {
                                        setSelectedTable(e.target.value);
                                        // If selecting table that has active draft, associate it
                                        const found = active_tables.find(
                                            (t) => t.table_identifier === e.target.value
                                        );
                                        if (found) {
                                            handleSelectActiveTable(found);
                                        } else {
                                            setCurrentDraftId(null);
                                        }
                                    }}
                                    className="bg-slate-800 border border-amber-500/40 text-amber-300 rounded-lg px-3 py-1.5 text-xs font-bold focus:ring-1 focus:ring-amber-500"
                                >
                                    {tables_list.map((tbl) => (
                                        <option key={tbl} value={tbl}>
                                            {tbl} {active_tables.some((t) => t.table_identifier === tbl) ? '🔴 (មានភ្ញៀវ)' : '🟢'}
                                        </option>
                                    ))}
                                </select>

                                {currentDraftId && (
                                    <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-xs">
                                        កែប្រែតុ #{currentDraftId}
                                    </Badge>
                                )}
                            </div>
                        )}

                        {/* Accounting Shift / Period Context */}
                        {period?.name && (
                            <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-800/60 border border-slate-700/50 text-[11px] text-slate-400 font-mono">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                <span className="truncate max-w-[220px]">{period.name}</span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Occupied Tables Counter */}
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setIsTablesModalOpen(true)}
                            className="relative border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white text-xs gap-2 cursor-pointer"
                        >
                            <Users className="w-3.5 h-3.5 text-amber-400" />
                            {t('pos.select_table')} ({tables_list.length})
                            {activeTablesCount > 0 && (
                                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-red-500 text-white">
                                    {activeTablesCount} {language === 'km' ? 'កំពុងញ៉ាំ' : 'occupied'}
                                </span>
                            )}
                        </Button>

                        {/* Search Bar */}
                        <div className="relative w-64">
                            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                            <Input
                                ref={searchInputRef}
                                type="text"
                                placeholder={t('pos.search_placeholder')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 h-9 bg-slate-800/80 border-slate-700 text-slate-100 placeholder:text-slate-500 text-xs rounded-xl focus:border-amber-500"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        {/* Fullscreen Mode Button */}
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={toggleFullscreen}
                            className={`border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white text-xs gap-1.5 cursor-pointer px-2.5 h-9 shrink-0 ${
                                isFullscreen ? 'text-amber-400 border-amber-500/50 bg-amber-500/10' : ''
                            }`}
                            title={isFullscreen ? 'ចេញពីពេញអេក្រង់ (Exit Fullscreen)' : 'ពង្រីកពេញអេក្រង់ (Fullscreen)'}
                        >
                            {isFullscreen ? <Minimize className="w-4 h-4 text-amber-400" /> : <Maximize className="w-4 h-4" />}
                            <span className="hidden xl:inline text-[11px] font-medium">
                                {isFullscreen ? (language === 'km' ? 'បង្រួម' : 'Exit') : (language === 'km' ? 'ពេញអេក្រង់' : 'Fullscreen')}
                            </span>
                        </Button>
                    </div>
                </div>

                {/* Main POS Grid Layout */}
                <div className="flex-1 min-h-0 grid grid-cols-12 gap-0 overflow-hidden relative">
                    {/* Catalog Section (Full width on mobile/tablet, 7-8 cols on desktop) */}
                    <div className="col-span-12 lg:col-span-7 xl:col-span-8 flex flex-col h-full min-h-0 border-r border-slate-800 bg-slate-950/60 overflow-hidden pb-16 lg:pb-0">
                        {/* Category Navigation Tabs with Smooth Auto-Scroll & Edge Controls */}
                        <div className="relative border-b border-slate-800/80 bg-slate-900/40 select-none group/catbar overflow-hidden shrink-0">
                            {/* Left Scroll Navigation Button & Gradient Mask */}
                            {canScrollLeft && (
                                <div className="absolute left-0 inset-y-0 z-10 flex items-center bg-gradient-to-r from-slate-950 via-slate-950/90 to-transparent pr-6 pl-2 pointer-events-auto">
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            scrollCategories('left');
                                        }}
                                        title="រមូរទៅឆ្វេង / Scroll Left"
                                        className="w-7 h-7 rounded-lg bg-slate-800/90 hover:bg-amber-500 hover:text-slate-950 text-slate-300 border border-slate-700/80 flex items-center justify-center shadow-lg transition-all cursor-pointer hover:scale-105 active:scale-95"
                                    >
                                        <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
                                    </button>
                                </div>
                            )}

                            {/* Scrollable Sub-Menu Container */}
                            <div
                                ref={categoryContainerRef}
                                onScroll={updateCategoryScrollState}
                                onWheel={handleCategoryWheel}
                                onMouseDown={handleCategoryMouseDown}
                                onMouseMove={handleCategoryMouseMove}
                                onMouseUp={handleCategoryMouseUp}
                                onMouseLeave={handleCategoryMouseUp}
                                onClick={handleCategoryContainerClick}
                                className={`px-6 py-2.5 flex items-center gap-2 overflow-x-auto shrink-0 scrollbar-none scroll-smooth ${
                                    isDraggingCategory ? 'cursor-grabbing' : 'cursor-pointer'
                                }`}
                            >
                                <button
                                    type="button"
                                    onClick={(e) => handleCategoryClick('all', e)}
                                    className={`px-4 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 shrink-0 cursor-pointer active:scale-95 ${
                                        selectedCategory === 'all'
                                            ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold scale-[1.02]'
                                            : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white'
                                    }`}
                                >
                                    🍽️ {t('pos.all_categories')} ({products.length})
                                </button>
                                {categories.map((cat) => (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        onClick={(e) => handleCategoryClick(cat.id, e)}
                                        className={`px-4 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 shrink-0 cursor-pointer active:scale-95 ${
                                            selectedCategory === cat.id
                                                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold scale-[1.02]'
                                                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white'
                                        }`}
                                    >
                                        {getName(cat)} ({cat.products.length})
                                    </button>
                                ))}
                            </div>

                            {/* Right Scroll Navigation Button & Gradient Mask */}
                            {canScrollRight && (
                                <div className="absolute right-0 inset-y-0 z-10 flex items-center bg-gradient-to-l from-slate-950 via-slate-950/90 to-transparent pl-6 pr-2 pointer-events-auto">
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            scrollCategories('right');
                                        }}
                                        title="រមូរទៅស្តាំ / Scroll Right"
                                        className="w-7 h-7 rounded-lg bg-slate-800/90 hover:bg-amber-500 hover:text-slate-950 text-slate-300 border border-slate-700/80 flex items-center justify-center shadow-lg transition-all cursor-pointer hover:scale-105 active:scale-95"
                                    >
                                        <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Product Cards Grid */}
                        <div className="flex-1 min-h-0 p-4 overflow-y-auto">
                            {filteredProducts.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center text-slate-500">
                                    <Utensils className="w-12 h-12 stroke-[1.2] mb-3 text-slate-600" />
                                    <p className="text-sm font-medium">រកមិនឃើញមុខម្ហូបដែលត្រូវនឹងការស្វែងរកទេ</p>
                                    <p className="text-xs text-slate-600 mt-1">សូមសាកល្បងវាយពាក្យគន្លឹះផ្សេងទៀត</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3.5">
                                    {filteredProducts.map((product) => {
                                        const cartItem = lines.find((l) => l.product_id === product.id);
                                        const priceUSD = parseFloat(product.unit_price);
                                        const priceKHR = Math.round(priceUSD * exchange_rate);

                                        return (
                                            <div
                                                key={product.id}
                                                onClick={() => addProduct(product)}
                                                className={`group relative flex flex-col justify-between p-3 rounded-2xl bg-zinc-900/95 border cursor-pointer transition-all duration-200 select-none hover:scale-[1.02] hover:shadow-xl hover:shadow-amber-500/10 ${
                                                    cartItem
                                                        ? 'border-amber-500 bg-amber-500/10 shadow-md shadow-amber-500/15 ring-1 ring-amber-500/40'
                                                        : 'border-zinc-800/90 hover:border-zinc-700 bg-zinc-900/80'
                                                }`}
                                            >
                                                {/* In-cart Quantity Badge */}
                                                {cartItem && (
                                                    <span className="absolute -top-2 -right-2 z-10 bg-amber-500 text-zinc-950 font-black text-xs px-2.5 py-0.5 rounded-full shadow-lg border-2 border-zinc-950 animate-in zoom-in-50">
                                                        x{cartItem.quantity}
                                                    </span>
                                                )}

                                                <div>
                                                    {/* Food Image Header */}
                                                    <div className="relative w-full h-28 sm:h-32 mb-2.5 rounded-xl overflow-hidden bg-zinc-950/80 border border-zinc-800/80 shrink-0">
                                                        {product.image_url ? (
                                                            <img
                                                                src={product.image_url}
                                                                alt={product.name_primary}
                                                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-108"
                                                                loading="lazy"
                                                                onError={(e) => {
                                                                    (e.target as HTMLElement).style.display = 'none';
                                                                }}
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900 text-amber-400/50">
                                                                <Utensils className="w-8 h-8 stroke-[1.4]" />
                                                                <span className="text-[10px] text-zinc-500 mt-1">លៀសហាល អ៉ីទុម</span>
                                                            </div>
                                                        )}
                                                        <span className="absolute bottom-1.5 left-1.5 text-[10px] px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-zinc-200 font-medium border border-white/10">
                                                            {getName(product.unit)}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-start justify-between gap-1 mb-0.5">
                                                        <h3 className={`font-bold text-xs sm:text-sm text-zinc-100 group-hover:text-amber-400 line-clamp-1 leading-normal py-0.5 ${language === 'km' ? 'font-khmer' : ''}`}>
                                                            {getName(product)}
                                                        </h3>
                                                    </div>
                                                    {getSecondaryName(product) && (
                                                        <p className={`text-[10px] text-zinc-400 line-clamp-1 mb-2 ${language === 'km' ? '' : 'font-khmer'}`}>
                                                            {getSecondaryName(product)}
                                                        </p>
                                                    )}
                                                </div>

                                                <div className="pt-2 border-t border-zinc-800/60 flex items-end justify-between mt-auto">
                                                    <div>
                                                        <div className="text-amber-400 font-extrabold text-sm sm:text-base tracking-tight font-mono">
                                                            ${priceUSD.toFixed(2)}
                                                        </div>
                                                        <div className="text-[10px] text-zinc-400 font-medium font-mono">
                                                            {priceKHR.toLocaleString()} ៛
                                                        </div>
                                                    </div>
                                                    <span className="text-[10px] px-2 py-0.5 rounded-lg bg-zinc-800 text-amber-300 font-semibold border border-zinc-700/60 group-hover:bg-amber-500 group-hover:text-zinc-950 transition-colors">
                                                        + {language === 'km' ? 'ថែម' : 'Add'}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Cart Tray & Settlement Sidebar (Drawer on mobile/tablet, right 4-5 cols on desktop) */}
                    <div className={`col-span-12 lg:col-span-5 xl:col-span-4 flex flex-col h-full min-h-0 bg-zinc-950 border-l border-zinc-800 shadow-2xl overflow-hidden select-none z-40 transition-all ${
                        isMobileCartOpen
                            ? 'fixed inset-0 lg:static lg:inset-auto flex'
                            : 'hidden lg:flex'
                    }`}>
                        {/* Cart Header */}
                        <div className="px-3.5 sm:px-4 py-2.5 sm:py-3 border-b border-zinc-800 bg-zinc-900/90 backdrop-blur-md flex items-center justify-between gap-2 shrink-0">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shadow-md transition-all shrink-0 ${
                                    orderMode === 'takeaway'
                                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-amber-500/10'
                                        : 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30 shadow-teal-500/10'
                                }`}>
                                    {orderMode === 'takeaway' ? (
                                        <ShoppingBag className="w-4 h-4 stroke-[2.2]" />
                                    ) : (
                                        <Utensils className="w-4 h-4 stroke-[2.2]" />
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                        <h2 className="font-bold text-xs sm:text-sm text-zinc-100 font-khmer whitespace-nowrap leading-normal py-0.5">
                                            {orderMode === 'takeaway' ? (language === 'km' ? 'កុម្ម៉ង់ខ្ចប់' : 'Takeaway Order') : selectedTable}
                                        </h2>
                                        {orderMode === 'dine_in' && (
                                            <span className="text-[9px] sm:text-[10px] font-mono uppercase px-1.5 py-0.5 rounded-full font-bold border shrink-0 bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30">
                                                {language === 'km' ? 'ញ៉ាំនៅហាង' : 'DINE-IN'}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[10px] sm:text-[11px] text-zinc-400 font-mono mt-0.5 whitespace-nowrap truncate">
                                        {totals.totalItems} {language === 'km' ? 'មុខក្នុងកន្ត្រក' : 'items'} • {lines.reduce((acc, l) => acc + l.quantity, 0)} {language === 'km' ? 'ចំនួន' : 'qty'}
                                    </p>
                                </div>
                            </div>

                            {/* Right Side: Currency Exchange Rate Badge, Clear Button & Mobile Close Button */}
                            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-zinc-800/80 border border-zinc-700/80 text-amber-600 dark:text-amber-300 font-mono text-[11px] sm:text-xs font-bold shadow-sm whitespace-nowrap shrink-0">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 shrink-0" />
                                    <span>$1 = {exchange_rate.toLocaleString()}៛</span>
                                </div>

                                {lines.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={clearCart}
                                        title={t('pos.clear_order')}
                                        className="p-1.5 sm:px-2 sm:py-1 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-200 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 flex items-center gap-1 transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span className="font-khmer text-[11px] hidden xl:inline">{t('pos.clear_order')}</span>
                                    </button>
                                )}

                                <button
                                    type="button"
                                    onClick={() => setIsMobileCartOpen(false)}
                                    title="បិទកន្ត្រក (Close)"
                                    className="lg:hidden p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 bg-zinc-800 border border-zinc-700 transition cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Cart Lines List */}
                        <div className="flex-1 min-h-0 p-3 sm:p-4 overflow-y-auto space-y-2.5">
                            {lines.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center px-4 relative">
                                    {/* Subtle Ambient Radial Glow */}
                                    <div className="absolute w-44 h-44 rounded-full bg-amber-500/5 blur-3xl pointer-events-none" />

                                    {/* Icon with glowing ring */}
                                    <div className="relative mb-4">
                                        <div className="w-20 h-20 rounded-3xl bg-gradient-to-b from-zinc-800/80 to-zinc-900/90 border border-zinc-700/60 flex items-center justify-center shadow-2xl shadow-black/40 relative">
                                            <ShoppingBag className="w-9 h-9 text-amber-400/80 stroke-[1.6]" />
                                            <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                                                <Sparkles className="w-3 h-3 text-amber-300" />
                                            </span>
                                        </div>
                                    </div>

                                    {/* Typography */}
                                    <h3 className="text-sm font-bold text-zinc-100 font-khmer">
                                        {t('pos.cart_empty_title')}
                                    </h3>
                                    <p className="text-xs text-zinc-400 font-khmer mt-1 max-w-[240px] leading-relaxed">
                                        {t('pos.cart_empty_desc')}
                                    </p>

                                    {/* Micro Shortcuts Badge */}
                                    <div className="mt-5 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/80 border border-zinc-800 text-[11px] text-zinc-400 font-mono">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                        <span>Terminal Ready • Press [F2] for Checkout</span>
                                    </div>
                                </div>
                            ) : (
                                lines.map((item) => {
                                    const unitPriceUSD = parseFloat(item.unit_price);
                                    const lineTotalUSD = (unitPriceUSD * item.quantity).toFixed(2);
                                    const lineTotalKHR = Math.round(parseFloat(lineTotalUSD) * exchange_rate);

                                    return (
                                        <div
                                            key={item.product_id}
                                            className="pos-cart-item p-2.5 sm:p-3 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 hover:border-zinc-700/80 hover:bg-zinc-850/90 flex items-center justify-between gap-2.5 group transition-all shadow-sm"
                                        >
                                            {item.image_url && (
                                                <div className="pos-cart-img-wrap w-10 h-10 sm:w-11 sm:h-11 rounded-xl overflow-hidden shrink-0 border border-zinc-700/60 bg-zinc-800 shadow-xs">
                                                    <img
                                                        src={item.image_url}
                                                        alt={item.name_primary}
                                                        className="w-full h-full object-cover"
                                                        loading="lazy"
                                                    />
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <h4 className={`font-bold text-xs sm:text-sm text-zinc-100 group-hover:text-amber-500 transition-colors truncate leading-normal py-0.5 ${language === 'km' ? 'font-khmer' : ''}`}>
                                                    {getName(item)}
                                                </h4>
                                                <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-zinc-400 font-mono">
                                                    <span className="text-zinc-300 font-semibold">${unitPriceUSD.toFixed(2)}</span>
                                                    <span>/</span>
                                                    <span className="text-zinc-400">{item.unit_name}</span>
                                                </div>
                                            </div>

                                            {/* Stepper Buttons */}
                                            <div className="pos-cart-stepper flex items-center gap-1 bg-zinc-800 p-1 rounded-xl border border-zinc-700/80 shrink-0 shadow-inner">
                                                <button
                                                    type="button"
                                                    onClick={() => updateQuantity(item.product_id, -1)}
                                                    className="w-6 h-6 sm:w-6.5 sm:h-6.5 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 transition active:scale-90 cursor-pointer"
                                                    title="Decrease"
                                                >
                                                    <Minus className="w-3.5 h-3.5" />
                                                </button>
                                                <span className="w-7 text-center font-bold text-xs sm:text-sm text-zinc-100 font-mono">
                                                    {item.quantity}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => updateQuantity(item.product_id, 1)}
                                                    className="w-6 h-6 sm:w-6.5 sm:h-6.5 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 transition active:scale-90 cursor-pointer"
                                                    title="Increase"
                                                >
                                                    <Plus className="w-3.5 h-3.5" />
                                                </button>
                                            </div>

                                            {/* Line Total */}
                                            <div className="text-right min-w-[70px] sm:min-w-[76px] shrink-0">
                                                <div className="font-bold text-xs sm:text-sm text-amber-400 font-mono">
                                                    ${lineTotalUSD}
                                                </div>
                                                <div className="text-[10px] text-emerald-400 font-mono font-medium">
                                                    {lineTotalKHR.toLocaleString()} ៛
                                                </div>
                                            </div>

                                            {/* Remove Line */}
                                            <button
                                                type="button"
                                                onClick={() => removeLine(item.product_id)}
                                                className="pos-cart-remove-btn text-zinc-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-500/10 transition cursor-pointer shrink-0"
                                                title="Remove"
                                            >
                                                <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                            </button>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Bill Summary & Settlement Controls */}
                        <div className="p-3.5 sm:p-4 border-t border-zinc-800 bg-zinc-900/90 backdrop-blur-md shrink-0 space-y-3">
                            {/* Fast Discount Chips */}
                            <div className="flex items-center justify-between text-xs gap-1.5 flex-wrap sm:flex-nowrap">
                                <span className="text-zinc-400 text-xs font-khmer flex items-center gap-1.5 whitespace-nowrap">
                                    <span>{t('pos.discount_label')}</span>
                                    <span className="text-[10px] text-zinc-500 font-mono uppercase">Discount</span>
                                </span>
                                <div className="pos-discount-bar flex items-center gap-0.5 sm:gap-1 bg-zinc-800 p-0.5 sm:p-1 rounded-xl border border-zinc-700/80 shrink-0">
                                    {[
                                        { label: '0%', type: 'none', val: '0' },
                                        { label: '5%', type: 'percent', val: '5' },
                                        { label: '10%', type: 'percent', val: '10' },
                                        { label: '15%', type: 'percent', val: '15' },
                                    ].map((d) => {
                                        const active =
                                            d.type === 'none'
                                                ? discountType === 'none'
                                                : discountType === 'percent' && discountValue === d.val;
                                        return (
                                            <button
                                                key={d.label}
                                                type="button"
                                                onClick={() => {
                                                    setDiscountType(d.type as any);
                                                    setDiscountValue(d.val);
                                                }}
                                                className={`pos-discount-chip-inactive px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[10px] sm:text-[11px] font-bold font-mono transition-all cursor-pointer whitespace-nowrap ${
                                                    active
                                                        ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20 scale-105'
                                                        : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/80'
                                                }`}
                                            >
                                                {d.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Subtotal & Discount Calculation Rows */}
                            <div className="space-y-1.5 text-xs text-zinc-400 px-1 font-mono">
                                <div className="flex justify-between items-center">
                                    <span className="text-zinc-400 font-khmer">{t('pos.subtotal_label')}:</span>
                                    <span className="text-zinc-100 font-bold">
                                        ${totals.subtotalUSD} <span className="text-zinc-400 text-[11px]">({totals.subtotalKHR.toLocaleString()} ៛)</span>
                                    </span>
                                </div>
                                {parseFloat(totals.discountUSD) > 0 && (
                                    <div className="flex justify-between items-center text-emerald-400">
                                        <span className="font-khmer">{t('pos.discount_label')}:</span>
                                        <span className="font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                            -${totals.discountUSD}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Luxury Grand Total Banner */}
                            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-orange-500/15 border border-amber-500/35 flex items-center justify-between shadow-lg shadow-black/10 dark:shadow-black/30 backdrop-blur-md relative overflow-hidden">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-amber-600 dark:text-amber-400 font-black">
                                        <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                        <span>{t('pos.grand_total')}</span>
                                    </div>
                                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/25 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                        <span>៛</span>
                                        <span>{totals.grandTotalKHR.toLocaleString()}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 font-mono tracking-tight drop-shadow-sm">
                                        ${totals.grandTotalUSD}
                                    </div>
                                </div>
                            </div>

                            {/* Pinned Checkout & Actions Button */}
                            <div className="grid grid-cols-2 gap-2 pt-0.5">
                                {orderMode === 'dine_in' && (
                                    <Button
                                        type="button"
                                        onClick={handleHoldTable}
                                        disabled={lines.length === 0 || isSubmitting}
                                        variant="outline"
                                        className="h-11 rounded-xl border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold text-xs gap-1.5 transition-all shadow-md cursor-pointer active:scale-98"
                                    >
                                        <Clock className="w-4 h-4 stroke-[2.2]" />
                                        <span>{t('pos.hold_order')}</span>
                                    </Button>
                                )}

                                <button
                                    type="button"
                                    onClick={openCheckoutModal}
                                    disabled={lines.length === 0 || isSubmitting}
                                    className={`h-11 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xl cursor-pointer active:scale-[0.98] ${
                                        orderMode === 'takeaway' ? 'col-span-2' : ''
                                    } ${
                                        lines.length === 0 || isSubmitting
                                            ? 'bg-zinc-800/80 text-zinc-400 border border-zinc-700/60 cursor-not-allowed shadow-none'
                                            : orderMode === 'takeaway'
                                            ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-zinc-950 font-black shadow-amber-500/25 border border-amber-300/40'
                                            : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-black shadow-emerald-600/25 border border-emerald-400/30'
                                    }`}
                                >
                                    <Receipt className="w-4 h-4 stroke-[2.5]" />
                                    <span className="font-khmer text-xs">{t('pos.checkout')}</span>
                                    <kbd className={`font-mono text-[10px] px-1.5 py-0.5 rounded leading-none ${
                                        lines.length === 0
                                            ? 'bg-zinc-800 text-zinc-400'
                                            : 'bg-black/20 text-zinc-950 font-bold border border-black/10'
                                    }`}>
                                        F2
                                    </kbd>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mobile Floating Order Bar (Visible only on < lg screens) */}
                <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 p-2.5 sm:p-3 bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-800/90 flex items-center justify-between shadow-2xl">
                    <div
                        className="flex items-center gap-2.5 cursor-pointer min-w-0"
                        onClick={() => setIsMobileCartOpen(true)}
                    >
                        <div className="relative w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                            <ShoppingBag className="w-5 h-5" />
                            {lines.length > 0 && (
                                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-zinc-950 font-black text-[10px] flex items-center justify-center border-2 border-zinc-950">
                                    {lines.reduce((acc, l) => acc + l.quantity, 0)}
                                </span>
                            )}
                        </div>
                        <div className="min-w-0">
                            <div className="text-[11px] text-zinc-400 font-khmer truncate">
                                {lines.length} {language === 'km' ? 'មុខក្នុងកន្ត្រក' : 'items'}
                            </div>
                            <div className="text-sm font-black text-amber-400 font-mono flex items-center gap-1.5">
                                <span>${totals.grandTotalUSD}</span>
                                <span className="text-[11px] text-emerald-400 font-normal">({totals.grandTotalKHR.toLocaleString()} ៛)</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <Button
                            type="button"
                            size="sm"
                            onClick={() => setIsMobileCartOpen(true)}
                            className="h-9 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-medium text-xs font-khmer cursor-pointer"
                        >
                            {language === 'km' ? 'មើលកន្ត្រក' : 'View Cart'}
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            onClick={openCheckoutModal}
                            disabled={lines.length === 0}
                            className="h-9 px-3.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-zinc-950 font-black text-xs font-khmer shadow-md shadow-amber-500/20 cursor-pointer disabled:opacity-50"
                        >
                            {language === 'km' ? 'ទូទាត់ប្រាក់' : 'Checkout'}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Instant Checkout & Payment Modal */}
            {isCheckoutModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
                    <div className="bg-zinc-900 border border-zinc-700/80 rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl shadow-black/80 text-zinc-100 animate-in zoom-in-95 duration-150">
                        {/* Modal Header */}
                        <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                                    <Receipt className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                                        {t('pos.payment_title')}
                                    </h3>
                                    <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1.5">
                                        <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-medium">
                                            {orderMode === 'takeaway' ? t('pos.order_type_takeaway') : selectedTable}
                                        </span>
                                        <span>•</span>
                                        <span>{totals.totalItems} {language === 'km' ? 'មុខទំនិញ' : 'items'}</span>
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsCheckoutModalOpen(false)}
                                className="text-zinc-400 hover:text-white p-2 rounded-xl hover:bg-zinc-800 transition cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 flex-1 min-h-0 overflow-y-auto">
                            {/* Grand Total Display */}
                            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-orange-500/15 border border-amber-500/35 flex items-center justify-between shadow-inner">
                                <div className="space-y-1">
                                    <span className="text-xs text-amber-400 font-semibold block tracking-wide">
                                        {t('pos.grand_total')} (TOTAL DUE):
                                    </span>
                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono font-bold text-sm">
                                        <span>៛</span>
                                        <span>{totals.grandTotalKHR.toLocaleString()}</span>
                                    </div>
                                </div>
                                <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-amber-400 drop-shadow">
                                    ${totals.grandTotalUSD}
                                </div>
                            </div>

                            {/* Customer & Loyalty Selector */}
                            <div className="p-3.5 rounded-2xl bg-zinc-800/60 border border-zinc-700/60 space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                                        <Users className="w-3.5 h-3.5 text-purple-400" />
                                        <span>{language === 'km' ? 'អតិថិជន & សន្សំពិន្ទុ' : 'Customer Loyalty'}:</span>
                                    </label>
                                    {selectedCustomerId && (
                                        <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                                            +{Math.floor(parseFloat(totals.grandTotalUSD))} {t('pos.tier_points')}
                                        </span>
                                    )}
                                </div>
                                <select
                                    value={selectedCustomerId || ''}
                                    onChange={(e) => setSelectedCustomerId(e.target.value ? Number(e.target.value) : null)}
                                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                                >
                                    <option value="">-- {t('pos.guest_customer')} --</option>
                                    {customers.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name} {c.phone ? `(${c.phone})` : ''} — {c.tier.toUpperCase()} ({c.loyalty_points} {t('pos.tier_points')})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Payment Method Selector */}
                            <div>
                                <label className="text-xs font-semibold text-zinc-300 block mb-2.5">
                                    {t('pos.payment_method')}:
                                </label>
                                <div className="grid grid-cols-3 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod('cash')}
                                        className={`p-3.5 rounded-2xl border text-center font-bold text-xs flex flex-col items-center gap-2 transition cursor-pointer ${
                                            paymentMethod === 'cash'
                                                ? 'bg-gradient-to-b from-amber-400 to-amber-500 text-zinc-950 border-amber-300 shadow-lg shadow-amber-500/25 ring-2 ring-amber-400/50'
                                                : 'bg-zinc-800/80 border-zinc-700/80 text-zinc-300 hover:bg-zinc-750 hover:border-zinc-600'
                                        }`}
                                    >
                                        <Coins className="w-5 h-5" />
                                        <span>{t('pos.pay_cash')}</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod('khqr')}
                                        className={`p-3.5 rounded-2xl border text-center font-bold text-xs flex flex-col items-center gap-2 transition cursor-pointer ${
                                            paymentMethod === 'khqr'
                                                ? 'bg-gradient-to-b from-rose-500 to-rose-600 text-white border-rose-400 shadow-lg shadow-rose-600/25 ring-2 ring-rose-400/50'
                                                : 'bg-zinc-800/80 border-zinc-700/80 text-zinc-300 hover:bg-zinc-750 hover:border-zinc-600'
                                        }`}
                                    >
                                        <QrCode className="w-5 h-5" />
                                        <span>{t('pos.pay_khqr')}</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod('card')}
                                        className={`p-3.5 rounded-2xl border text-center font-bold text-xs flex flex-col items-center gap-2 transition cursor-pointer ${
                                            paymentMethod === 'card'
                                                ? 'bg-gradient-to-b from-sky-500 to-blue-600 text-white border-sky-400 shadow-lg shadow-blue-600/25 ring-2 ring-sky-400/50'
                                                : 'bg-zinc-800/80 border-zinc-700/80 text-zinc-300 hover:bg-zinc-750 hover:border-zinc-600'
                                        }`}
                                    >
                                        <CreditCard className="w-5 h-5" />
                                        <span>{t('pos.pay_card')}</span>
                                    </button>
                                </div>
                            </div>

                            {/* Cash Tender Calculation */}
                            {paymentMethod === 'cash' && (
                                <div className="space-y-4 pt-1">
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="text-xs font-semibold text-zinc-300">
                                                ប្រាក់ទទួលពីអតិថិជន (Amount Tendered):
                                            </label>
                                            {amountReceived && (
                                                <span className="text-xs font-mono font-bold text-emerald-400">
                                                    ≈ {(Math.round(parseFloat(amountReceived || '0') * exchange_rate)).toLocaleString()} ៛
                                                </span>
                                            )}
                                        </div>
                                        <div className="relative">
                                            <DollarSign className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
                                            <Input
                                                type="number"
                                                step="0.01"
                                                value={amountReceived}
                                                onChange={(e) => setAmountReceived(e.target.value)}
                                                className="pl-9 h-11 text-base font-bold bg-zinc-800/90 border-zinc-700 text-white rounded-xl focus:border-amber-500"
                                            />
                                        </div>
                                    </div>

                                    {/* Quick Cash Chips */}
                                    <div className="space-y-2">
                                        <span className="text-[11px] text-zinc-400 block font-medium">ប្រាក់ដុល្លារ ($ USD):</span>
                                        <div className="flex flex-wrap gap-2">
                                            {[
                                                { label: 'Exact ($)', val: totals.grandTotalUSD },
                                                { label: '$5', val: '5.00' },
                                                { label: '$10', val: '10.00' },
                                                { label: '$20', val: '20.00' },
                                                { label: '$50', val: '50.00' },
                                                { label: '$100', val: '100.00' },
                                            ].map((btn) => {
                                                const isSelected = parseFloat(amountReceived || '0') === parseFloat(btn.val);
                                                return (
                                                    <button
                                                        key={btn.label}
                                                        type="button"
                                                        onClick={() => setAmountReceived(btn.val)}
                                                        className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all cursor-pointer ${
                                                            isSelected
                                                                ? 'bg-amber-400 text-zinc-950 border-amber-300 shadow-md shadow-amber-400/20'
                                                                : 'bg-zinc-800 hover:bg-zinc-700/80 text-zinc-200 border-zinc-700'
                                                        }`}
                                                    >
                                                        {btn.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <span className="text-[11px] text-zinc-400 block font-medium">ប្រាក់រៀល (៛ KHR):</span>
                                        <div className="flex flex-wrap gap-2">
                                            {[
                                                { label: `${totals.grandTotalKHR.toLocaleString()} ៛`, val: totals.grandTotalUSD },
                                                { label: '10,000 ៛', val: (10000 / exchange_rate).toFixed(2) },
                                                { label: '20,000 ៛', val: (20000 / exchange_rate).toFixed(2) },
                                                { label: '50,000 ៛', val: (50000 / exchange_rate).toFixed(2) },
                                                { label: '100,000 ៛', val: (100000 / exchange_rate).toFixed(2) },
                                            ].map((btn) => {
                                                const isSelected = parseFloat(amountReceived || '0') === parseFloat(btn.val);
                                                return (
                                                    <button
                                                        key={btn.label}
                                                        type="button"
                                                        onClick={() => setAmountReceived(btn.val)}
                                                        className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all cursor-pointer ${
                                                            isSelected
                                                                ? 'bg-emerald-400 text-zinc-950 border-emerald-300 shadow-md shadow-emerald-400/20'
                                                                : 'bg-zinc-800 hover:bg-zinc-700/80 text-emerald-400 border-zinc-700'
                                                        }`}
                                                    >
                                                        {btn.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Change Calculation Box */}
                                    <div className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                                        parseFloat(totals.changeUSD) > 0
                                            ? 'bg-emerald-950/30 border-emerald-500/35 shadow-md shadow-emerald-950/20'
                                            : parseFloat(amountReceived || '0') < parseFloat(totals.grandTotalUSD) && parseFloat(amountReceived || '0') > 0
                                            ? 'bg-amber-950/30 border-amber-500/35'
                                            : 'bg-zinc-950/80 border-zinc-800'
                                    }`}>
                                        <div>
                                            <span className="text-xs font-semibold block text-zinc-300">
                                                {parseFloat(amountReceived || '0') < parseFloat(totals.grandTotalUSD) && parseFloat(amountReceived || '0') > 0
                                                    ? 'នៅខ្វះ (Remaining Balance):'
                                                    : 'ប្រាក់អាប់ជូនអតិថិជន (Change Due):'}
                                            </span>
                                            <span className="text-xs font-mono font-semibold text-zinc-400">
                                                {parseFloat(amountReceived || '0') < parseFloat(totals.grandTotalUSD) && parseFloat(amountReceived || '0') > 0
                                                    ? `${Math.round((parseFloat(totals.grandTotalUSD) - parseFloat(amountReceived || '0')) * exchange_rate).toLocaleString()} ៛`
                                                    : `${totals.changeKHR.toLocaleString()} ៛`}
                                            </span>
                                        </div>
                                        <div className={`text-2xl font-black font-mono ${
                                            parseFloat(totals.changeUSD) > 0
                                                ? 'text-emerald-400'
                                                : parseFloat(amountReceived || '0') < parseFloat(totals.grandTotalUSD) && parseFloat(amountReceived || '0') > 0
                                                ? 'text-amber-400'
                                                : 'text-zinc-400'
                                        }`}>
                                            {parseFloat(amountReceived || '0') < parseFloat(totals.grandTotalUSD) && parseFloat(amountReceived || '0') > 0
                                                ? `-$${(parseFloat(totals.grandTotalUSD) - parseFloat(amountReceived || '0')).toFixed(2)}`
                                                : `$${totals.changeUSD}`}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* KHQR Bakong Card */}
                            {paymentMethod === 'khqr' && (
                                <div className="p-6 rounded-2xl bg-rose-950/20 border border-rose-500/30 flex flex-col items-center text-center space-y-3">
                                    <div className="px-3 py-1 bg-rose-600 rounded-xl text-white font-black text-xs tracking-wider shadow-md shadow-rose-600/30">
                                        KHQR • BAKONG
                                    </div>
                                    <div className="w-40 h-40 bg-white p-2.5 rounded-2xl shadow-xl flex items-center justify-center">
                                        <div className="w-full h-full border-2 border-slate-900 border-dashed rounded-xl flex flex-col items-center justify-center text-slate-900">
                                            <QrCode className="w-16 h-16 text-slate-900 mb-1" />
                                            <span className="text-[10px] font-bold">ស្កេនដើម្បីទូទាត់</span>
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-sm text-white">លៀសហាល អ៉ីទុម</h4>
                                        <p className="text-xs text-rose-300 mt-0.5 font-mono font-bold">
                                            ${totals.grandTotalUSD} ({totals.grandTotalKHR.toLocaleString()} ៛)
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 sm:p-5 border-t border-zinc-800 bg-zinc-950/60 flex items-center justify-end gap-3 shrink-0">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsCheckoutModalOpen(false)}
                                className="h-11 px-5 rounded-xl border-zinc-700 bg-zinc-800/90 text-zinc-300 hover:bg-zinc-700 hover:text-white transition font-medium text-xs cursor-pointer"
                            >
                                {t('common.back', 'ថយក្រោយ')}
                            </Button>
                            <Button
                                type="button"
                                onClick={handleConfirmCheckout}
                                disabled={isSubmitting}
                                className="h-11 px-6 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-zinc-950 font-black text-xs shadow-lg shadow-amber-500/25 border border-amber-300/40 transition active:scale-[0.98] cursor-pointer"
                            >
                                <Printer className="w-4 h-4 mr-2" />
                                {isSubmitting ? t('common.loading', 'កំពុងដំណើរការ...') : t('pos.confirm_payment')}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Active Tables Overview Modal */}
            {isTablesModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
                    <div className="bg-zinc-900 border border-zinc-700/80 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl shadow-black/80 text-zinc-100 animate-in zoom-in-95 duration-150">
                        {/* Header */}
                        <div className="p-5 sm:p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                                    <Utensils className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                                        តារាងតុទាំងអស់ក្នុងហាង
                                        <span className="text-[11px] font-normal text-zinc-400">(Table Layout)</span>
                                    </h3>
                                    <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-2">
                                        <span className="inline-flex items-center gap-1 text-amber-400 font-semibold">
                                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                                            {activeTablesCount} តុ កំពុងទទួលភ្ញៀវ
                                        </span>
                                        <span>•</span>
                                        <span>{tables_list.length} តុសរុប</span>
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsTablesModalOpen(false)}
                                className="text-zinc-400 hover:text-white p-2 rounded-xl hover:bg-zinc-800 transition cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Tables Grid */}
                        <div className="p-6 max-h-[60vh] overflow-y-auto">
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                                {tables_list.map((tbl) => {
                                    const activeDoc = active_tables.find((t) => t.table_identifier === tbl);
                                    const isCurrentSelected = orderMode === 'dine_in' && selectedTable === tbl;

                                    return (
                                        <div
                                            key={tbl}
                                            onClick={() => {
                                                if (activeDoc) {
                                                    handleSelectActiveTable(activeDoc);
                                                } else {
                                                    setOrderMode('dine_in');
                                                    setSelectedTable(tbl);
                                                    setCurrentDraftId(null);
                                                    setIsTablesModalOpen(false);
                                                }
                                            }}
                                            className={`p-4 rounded-2xl border flex flex-col justify-between transition-all select-none cursor-pointer group hover:scale-[1.02] ${
                                                activeDoc
                                                    ? 'bg-gradient-to-b from-amber-500/15 to-amber-500/5 border-amber-500/40 text-zinc-100 shadow-md shadow-amber-500/10 hover:border-amber-400'
                                                    : 'bg-zinc-950/70 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900/80'
                                            } ${isCurrentSelected ? 'ring-2 ring-amber-400 shadow-amber-500/20' : ''}`}
                                        >
                                            <div className="flex items-start justify-between mb-3">
                                                <div>
                                                    <h4 className="font-bold text-sm text-white group-hover:text-amber-300 transition-colors">
                                                        {tbl}
                                                    </h4>
                                                    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold mt-0.5 ${
                                                        activeDoc ? 'text-amber-400' : 'text-emerald-400'
                                                    }`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${
                                                            activeDoc ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
                                                        }`} />
                                                        {activeDoc ? 'មានភ្ញៀវ' : 'ទំនេរ'}
                                                    </span>
                                                </div>
                                                <div className={`p-2 rounded-xl ${
                                                    activeDoc ? 'bg-amber-500/20 text-amber-300' : 'bg-zinc-800 text-zinc-500'
                                                }`}>
                                                    <Utensils className="w-4 h-4" />
                                                </div>
                                            </div>

                                            {activeDoc ? (
                                                <div className="space-y-2.5 pt-2 border-t border-amber-500/20">
                                                    <div>
                                                        <div className="font-mono font-black text-base text-amber-400">
                                                            ${parseFloat(activeDoc.grand_total).toFixed(2)}
                                                        </div>
                                                        <div className="text-[11px] text-zinc-400">
                                                            {activeDoc.items.length} មុខ • {activeDoc.created_at}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-1.5 pt-1" onClick={(e) => e.stopPropagation()}>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSelectActiveTable(activeDoc)}
                                                            className="flex-1 py-1.5 rounded-lg bg-amber-500 text-zinc-950 font-bold text-xs hover:bg-amber-400 transition cursor-pointer"
                                                        >
                                                            បើកតុ
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleCancelTable(activeDoc.id)}
                                                            className="p-1.5 rounded-lg bg-zinc-800 text-rose-400 hover:bg-rose-500/20 transition cursor-pointer"
                                                            title="លុបចោលតុ"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="pt-2 border-t border-zinc-800/80">
                                                    <div className="text-[11px] text-zinc-400 py-1 text-center font-medium group-hover:text-zinc-200 transition-colors">
                                                        ចុចដើម្បីជ្រើសរើសតុ
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 sm:p-5 border-t border-zinc-800 bg-zinc-950/60 flex items-center justify-end">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsTablesModalOpen(false)}
                                className="h-10 px-5 rounded-xl border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white transition font-medium text-xs cursor-pointer"
                            >
                                បិទ
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
