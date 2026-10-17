import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AppLayout } from '@/layouts/app-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { router, usePage } from '@inertiajs/react';
import { PageProps } from '@/types';
import { useTranslation } from '@/context/language-context';
import { ORDER_SOURCES, OrderSourceBadge, OrderSourceValue, getOrderSource, isDeliveryPlatform } from '@/components/order-source';
import { paymentMethodName } from '@/components/document-status';
import {
    Bike,
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
    ArrowLeft,
    Check,
    Store,
    Receipt,
    Maximize,
    Minimize,
    ChevronDown,
    Banknote,
    ShieldCheck,
    AlertCircle,
    Calendar,
    Building2,
    Tag,
} from 'lucide-react';
import { tr } from '@/locales/tr';

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
    exchange_rate = 4000,
}: CreateProps) {
    const { business } = usePage<PageProps>().props;
    const { language, t, getName, getSecondaryName } = useTranslation();

    // Terminal states
    const [orderMode, setOrderMode] = useState<'takeaway' | 'dine_in'>(initial_table ? 'dine_in' : 'takeaway');
    const [selectedTable, setSelectedTable] = useState<string>(initial_table || tables_list[0] || tr('តុ ០១'));
    const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
    const [currentDraftId, setCurrentDraftId] = useState<number | null>(null);

    // Takeaway order source (walk-in or delivery app) and the app's own order number
    const [orderSource, setOrderSource] = useState<OrderSourceValue>('walk_in');
    const [externalOrderRef, setExternalOrderRef] = useState<string>('');
    const effectiveOrderSource: OrderSourceValue = orderMode === 'dine_in' ? 'walk_in' : orderSource;

    const [selectedCategory, setSelectedCategory] = useState<number | 'all'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [lines, setLines] = useState<OrderLine[]>([]);

    // Discount & Payment
    const [discountType, setDiscountType] = useState<'none' | 'percent' | 'amount'>('none');
    const [discountValue, setDiscountValue] = useState<string>('0');

    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    // Modals
    const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
    const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
    const [isTablesModalOpen, setIsTablesModalOpen] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'khqr' | 'card' | 'app'>('cash');
    const [amountReceived, setAmountReceived] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [checkoutError, setCheckoutError] = useState<string | null>(null);
    const [tableFilter, setTableFilter] = useState<'all' | 'occupied' | 'vacant' | 'indoor' | 'vip' | 'garden'>('all');
    const [inspectedTable, setInspectedTable] = useState<string | null>(null);

    // Scroll lock for modals
    useEffect(() => {
        if (!mounted || typeof document === 'undefined') return;
        if (isCheckoutModalOpen || isTablesModalOpen) {
            const originalOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = originalOverflow;
            };
        }
    }, [isCheckoutModalOpen, isTablesModalOpen, mounted]);

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
                unit_name: matchedProduct?.unit.name_primary || tr('ចាន'),
                unit_price: it.unit_price,
                quantity: it.quantity,
                is_primary_package: matchedProduct?.is_primary_package ?? false,
            };
        });

        setLines(loadedLines);
        setIsTablesModalOpen(false);
    };

    // Opened from the floor plan (?table_ref=): resume that table's open order instead of starting an empty cart,
    // otherwise holding the table again would replace the dishes already ordered
    useEffect(() => {
        if (!initial_table) return;
        const openOrder = active_tables.find((t) => t.table_identifier === initial_table);
        if (openOrder) {
            handleSelectActiveTable(openOrder);
        }
    }, []);

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
        if (!confirm(tr('តើអ្នកពិតជាចង់លុបចោលការកុម្ម៉ង់តុនេះមែនទេ?'))) return;

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
        setPaymentMethod(isDeliveryPlatform(effectiveOrderSource) ? 'app' : 'cash');
        setCheckoutError(null);
        setIsCheckoutModalOpen(true);
    };

    // Confirm Settlement & Checkout
    const handleConfirmCheckout = () => {
        if (lines.length === 0 || isSubmitting) return;

        const tableName = orderMode === 'takeaway' ? 'ខ្ចប់ (Takeaway)' : selectedTable;

        setIsSubmitting(true);
        setCheckoutError(null);
        router.post(
            '/invoices/checkout',
            {
                table_identifier: tableName,
                order_source: effectiveOrderSource,
                external_order_ref: isDeliveryPlatform(effectiveOrderSource) ? externalOrderRef.trim() || null : null,
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
                onError: (errors) => {
                    setIsSubmitting(false);
                    setCheckoutError(Object.values(errors)[0] ?? tr('មិនអាចគិតប្រាក់បានទេ។ សូមពិនិត្យព័ត៌មានម្តងទៀត។'));
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
        <AppLayout title={tr("ប្រព័ន្ធ POS - លៀសហាល អ៉ីទុម")}>
            <div className="flex flex-col h-full w-full min-h-0 bg-slate-950 text-slate-100 overflow-hidden select-none">
                {/* POS Top Operational Bar */}
                <div className="bg-slate-900/95 backdrop-blur border-b border-slate-800 px-3 sm:px-5 py-2 flex items-center justify-between shrink-0 gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                        {/* Order Mode Switcher */}
                        <div className="flex items-center bg-slate-800/90 p-0.5 rounded-xl border border-slate-700/70 h-9 shrink-0 overflow-hidden">
                            <button
                                type="button"
                                onClick={() => {
                                    setOrderMode('takeaway');
                                    setCurrentDraftId(null);
                                }}
                                className={`flex items-center gap-1.5 px-3 h-7.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                    orderMode === 'takeaway'
                                        ? 'bg-amber-500 text-slate-950 shadow-xs font-bold'
                                        : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                                }`}
                            >
                                <ShoppingBag className="w-3.5 h-3.5" />
                                <span>{t('pos.order_type_takeaway')}</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setOrderMode('dine_in')}
                                className={`flex items-center gap-1.5 px-3 h-7.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                    orderMode === 'dine_in'
                                        ? 'bg-amber-500 text-slate-950 shadow-xs font-bold'
                                        : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                                }`}
                            >
                                <Utensils className="w-3.5 h-3.5" />
                                <span>{t('pos.order_type_dine_in')}</span>
                            </button>
                        </div>

                        {/* Dine-in Unified Table Selector */}
                        {orderMode === 'dine_in' && (
                            <div className="flex items-center h-9 rounded-xl border border-slate-700/80 bg-slate-800/90 text-xs shadow-xs divide-x divide-slate-700/70 shrink-0 overflow-hidden">
                                {/* Quick Table Dropdown */}
                                <div className="relative flex items-center h-full rounded-l-xl">
                                    <div className="pl-2.5 pr-1 text-amber-400">
                                        <Utensils className="w-3.5 h-3.5" />
                                    </div>
                                    <select
                                        value={selectedTable}
                                        onChange={(e) => {
                                            setSelectedTable(e.target.value);
                                            const found = active_tables.find(
                                                (t) => t.table_identifier === e.target.value
                                            );
                                            if (found) {
                                                handleSelectActiveTable(found);
                                            } else {
                                                setCurrentDraftId(null);
                                            }
                                        }}
                                        className="h-full bg-transparent pl-1 pr-6 text-xs font-bold text-amber-300 border-none outline-none appearance-none cursor-pointer focus:ring-0"
                                    >
                                        {tables_list.map((tbl) => {
                                            const isOccupied = active_tables.some((t) => t.table_identifier === tbl);
                                            return (
                                                <option key={tbl} value={tbl} className="bg-slate-900 text-slate-100">
                                                    {tbl} {isOccupied ? tr('🔴 (មានភ្ញៀវ)') : tr('🟢 (ទំនេរ)')}
                                                </option>
                                            );
                                        })}
                                    </select>
                                    <ChevronDown className="w-3 h-3 text-amber-400/80 absolute right-1.5 pointer-events-none" />
                                </div>

                                {/* Active Draft Indicator if editing active table */}
                                {currentDraftId && (
                                    <div className="h-full flex items-center px-2.5 bg-amber-500/15 text-amber-300 text-[11px] font-mono font-bold whitespace-nowrap">
                                        {tr('កែប្រែ #')}{currentDraftId}
                                    </div>
                                )}

                                {/* Floor Plan Visual Modal Trigger */}
                                <button
                                    type="button"
                                    onClick={() => setIsTablesModalOpen(true)}
                                    title={tr("មើលប្លង់តុទាំងអស់ (Floor Table Map)")}
                                    className="h-full px-2.5 flex items-center gap-1.5 bg-transparent hover:bg-slate-700/50 text-slate-300 hover:text-white transition cursor-pointer whitespace-nowrap text-xs font-medium rounded-r-xl"
                                >
                                    <Users className="w-3.5 h-3.5 text-amber-400" />
                                    <span className="hidden sm:inline">{tr('ប្លង់តុ (')}{tables_list.length})</span>
                                    {activeTablesCount > 0 && (
                                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white leading-none">
                                            {activeTablesCount}
                                        </span>
                                    )}
                                </button>
                            </div>
                        )}

                        {/* Takeaway Mode Table Map Quick Access */}
                        {orderMode === 'takeaway' && (
                            <button
                                type="button"
                                onClick={() => setIsTablesModalOpen(true)}
                                className="h-9 px-3 rounded-xl border border-slate-700/80 bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-medium flex items-center gap-2 cursor-pointer shadow-xs transition shrink-0 overflow-hidden"
                                title={tr("មើលប្លង់តុ (Floor Table Map)")}
                            >
                                <Users className="w-3.5 h-3.5 text-amber-400" />
                                <span>{t('pos.select_table')} ({tables_list.length})</span>
                                {activeTablesCount > 0 && (
                                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-500 text-white leading-none">
                                        {activeTablesCount} {language === 'km' ? 'កំពុងញ៉ាំ' : 'occupied'}
                                    </span>
                                )}
                            </button>
                        )}

                        {/* Accounting Shift / Period Context */}
                        {period?.name && (
                            <div className="hidden xl:flex items-center gap-2 px-3 h-9 rounded-xl bg-slate-800/60 border border-slate-700/50 text-[11px] text-slate-400 font-mono shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                <span className="truncate max-w-[200px]">{period.name}</span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">

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
                            title={isFullscreen ? tr('ចេញពីពេញអេក្រង់ (Exit Fullscreen)') : tr('ពង្រីកពេញអេក្រង់ (Fullscreen)')}
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
                                        title={tr("រមូរទៅឆ្វេង / Scroll Left")}
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
                                        title={tr("រមូរទៅស្តាំ / Scroll Right")}
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
                                    <p className="text-sm font-medium">{tr('រកមិនឃើញមុខម្ហូបដែលត្រូវនឹងការស្វែងរកទេ')}</p>
                                    <p className="text-xs text-slate-600 mt-1">{tr('សូមសាកល្បងវាយពាក្យគន្លឹះផ្សេងទៀត')}</p>
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
                                                                <span className="text-[10px] text-zinc-500 mt-1">{tr('លៀសហាល អ៉ីទុម')}</span>
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
                                                            {priceKHR.toLocaleString()} {tr('៛')}
                                                        </div>
                                                    </div>
                                                    <span className="text-[10px] px-2 py-0.5 rounded-lg bg-zinc-800 text-amber-300 font-semibold border border-zinc-700/60 group-hover:bg-amber-500 group-hover:text-zinc-950 transition-colors inline-flex items-center gap-1">
                                                        <Plus className="w-2.5 h-2.5 stroke-[2.5]" />
                                                        <span>{language === 'km' ? 'ថែម' : 'Add'}</span>
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
                                        {isDeliveryPlatform(effectiveOrderSource) && (
                                            <OrderSourceBadge source={effectiveOrderSource} className="shrink-0" />
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
                                    <span>$1 = {exchange_rate.toLocaleString()}{tr('៛')}</span>
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
                                    title={tr("បិទកន្ត្រក (Close)")}
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
                                        <span>{tr('រួចរាល់ • ចុច [F2] ដើម្បីគិតប្រាក់')}</span>
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
                                                    title={tr("បន្ថយ")}
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
                                                    title={tr("បន្ថែម")}
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
                                                    {lineTotalKHR.toLocaleString()} {tr('៛')}
                                                </div>
                                            </div>

                                            {/* Remove Line */}
                                            <button
                                                type="button"
                                                onClick={() => removeLine(item.product_id)}
                                                className="pos-cart-remove-btn text-zinc-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-500/10 transition cursor-pointer shrink-0"
                                                title={tr("ដកចេញ")}
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
                                    <span className="text-[10px] text-zinc-500 font-mono uppercase">{tr('បញ្ចុះតម្លៃ')}</span>
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
                                    <span className="text-zinc-100 font-bold font-mono">
                                        ${totals.subtotalUSD} <span className="text-zinc-400 text-[11px]">({totals.subtotalKHR.toLocaleString()} {tr('៛)')}</span>
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
                                        <span>{tr('៛')}</span>
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
                                <span className="text-[11px] text-emerald-400 font-normal">({totals.grandTotalKHR.toLocaleString()} {tr('៛)')}</span>
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

            {/* Instant Checkout & Payment Modal (Full-Workspace 2-Column Suite) */}
            {mounted && isCheckoutModalOpen && createPortal(
                <div
                    className="fixed inset-y-0 right-0 left-0 md:left-[var(--sidebar-width,16rem)] z-50 flex flex-col bg-zinc-50 dark:bg-zinc-950 overflow-hidden select-none animate-in fade-in duration-150 h-screen"
                    onWheel={(e) => e.stopPropagation()}
                >
                    {/* Top Header */}
                    <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-sm">
                                <Receipt className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 dark:text-zinc-100 font-khmer">
                                    {tr('គិតប្រាក់')}
                                </h2>
                                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400 font-khmer">
                                    <span className="font-semibold text-slate-700 dark:text-zinc-300">
                                        {orderMode === 'takeaway' ? tr('ខ្ចប់') : `${tr('តុ៖')} ${selectedTable}`}
                                    </span>
                                    {isDeliveryPlatform(effectiveOrderSource) && (
                                        <OrderSourceBadge source={effectiveOrderSource} externalRef={externalOrderRef.trim() || null} />
                                    )}
                                    <span>•</span>
                                    <span>{totals.totalItems} {tr('មុខទំនិញ')}</span>
                                    <span>•</span>
                                    <span className="font-mono">
                                        1$ = {exchange_rate.toLocaleString()}៛
                                    </span>
                                </div>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => setIsCheckoutModalOpen(false)}
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-950 dark:hover:text-white transition-all cursor-pointer font-khmer shadow-sm"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span>{tr('ត្រឡប់ក្រោយ')}</span>
                            <kbd className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono hidden sm:inline ml-1">
                                Esc
                            </kbd>
                        </button>
                    </div>

                    {/* 2-Column Body */}
                    <div className="flex-1 min-h-0 overflow-y-auto p-6 md:p-8">
                        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
                            {/* Left Column: Payment & Tender Controls (7 cols) */}
                            <div className="lg:col-span-7 space-y-6">
                                {/* Grand Total Highlight Banner */}
                                <div className="px-6 py-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-4">
                                    <span className="text-sm font-bold text-amber-700 dark:text-amber-400 font-khmer">
                                        {tr('សរុបត្រូវបង់')}
                                    </span>
                                    <div className="text-right leading-tight">
                                        <div className="text-4xl font-bold font-mono text-amber-600 dark:text-amber-400">
                                            ${totals.grandTotalUSD}
                                        </div>
                                        <div className="mt-1 text-sm font-mono font-semibold text-slate-500 dark:text-zinc-400">
                                            {totals.grandTotalKHR.toLocaleString()} ៛
                                        </div>
                                    </div>
                                </div>

                                {/* Section 0: Order Source (Takeaway only — walk-in or delivery app) */}
                                {orderMode === 'takeaway' && (
                                    <div className="bg-white dark:bg-zinc-900/90 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-3">
                                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800/80">
                                            <div className="flex items-center gap-2">
                                                <Bike className="w-4 h-4 text-amber-500" />
                                                <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100 font-khmer">
                                                    {tr('ប្រភពការកម្មង់')}
                                                </h3>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                                            {ORDER_SOURCES.map((source) => {
                                                const isSelected = orderSource === source.value;
                                                return (
                                                    <button
                                                        key={source.value}
                                                        type="button"
                                                        onClick={() => {
                                                            setOrderSource(source.value);
                                                            // App orders are normally paid through the app; walk-in falls back to cash
                                                            setPaymentMethod(source.value === 'walk_in' ? 'cash' : 'app');
                                                        }}
                                                        className={`h-11 px-2 rounded-xl border text-xs font-bold transition cursor-pointer font-khmer truncate ${
                                                            isSelected
                                                                ? `${source.badgeClass} ring-2 ring-current/20 shadow-sm`
                                                                : 'bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:border-slate-300 dark:hover:border-zinc-700'
                                                        }`}
                                                    >
                                                        {language === 'km' ? source.labelKm : source.label}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {isDeliveryPlatform(orderSource) && (
                                            <div className="space-y-1.5">
                                                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 font-khmer">
                                                    {tr('លេខកម្មង់របស់ App')} <span className="font-normal text-slate-400">(App Order #)</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={externalOrderRef}
                                                    onChange={(e) => setExternalOrderRef(e.target.value)}
                                                    maxLength={40}
                                                    placeholder={tr("ឧ. f7k2-x9pq")}
                                                    className="w-full h-10 px-3.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 transition-all"
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Section 1: Payment Method Selection */}
                                <div className="bg-white dark:bg-zinc-900/90 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-3">
                                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800/80">
                                        <div className="flex items-center gap-2">
                                            <Coins className="w-4 h-4 text-amber-500" />
                                            <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100 font-khmer">
                                                {tr('វិធីបង់ប្រាក់')}
                                            </h3>
                                        </div>
                                    </div>

                                    <div className={`grid gap-3 ${isDeliveryPlatform(effectiveOrderSource) ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}>
                                        <button
                                            type="button"
                                            onClick={() => setPaymentMethod('cash')}
                                            className={`p-4 rounded-xl border text-center font-bold text-xs flex flex-col items-center gap-2 transition cursor-pointer font-khmer ${
                                                paymentMethod === 'cash'
                                                    ? 'bg-amber-500/15 border-amber-500 text-amber-700 dark:text-amber-300 ring-2 ring-amber-500/20 shadow-md'
                                                    : 'bg-slate-50 dark:bg-zinc-950/60 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:border-slate-300 dark:hover:border-zinc-700'
                                            }`}
                                        >
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                                paymentMethod === 'cash' ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20' : 'bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400'
                                            }`}>
                                                <Coins className="w-5 h-5" />
                                            </div>
                                            <span className="font-bold">{tr('សាច់ប្រាក់')}</span>
                                            <span className="text-[10px] font-normal text-slate-500 dark:text-zinc-400">{tr('ដុល្លារ & រៀល')}</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setPaymentMethod('khqr')}
                                            className={`p-4 rounded-xl border text-center font-bold text-xs flex flex-col items-center gap-2 transition cursor-pointer font-khmer ${
                                                paymentMethod === 'khqr'
                                                    ? 'bg-rose-500/15 border-rose-500 text-rose-700 dark:text-rose-300 ring-2 ring-rose-500/20 shadow-md'
                                                    : 'bg-slate-50 dark:bg-zinc-950/60 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:border-slate-300 dark:hover:border-zinc-700'
                                            }`}
                                        >
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                                paymentMethod === 'khqr' ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20' : 'bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400'
                                            }`}>
                                                <QrCode className="w-5 h-5" />
                                            </div>
                                            <span className="font-bold">KHQR</span>
                                            <span className="text-[10px] font-normal text-slate-500 dark:text-zinc-400">{tr('ស្កេនទូរស័ព្ទ')}</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setPaymentMethod('card')}
                                            className={`p-4 rounded-xl border text-center font-bold text-xs flex flex-col items-center gap-2 transition cursor-pointer font-khmer ${
                                                paymentMethod === 'card'
                                                    ? 'bg-sky-500/15 border-sky-500 text-sky-700 dark:text-sky-300 ring-2 ring-sky-500/20 shadow-md'
                                                    : 'bg-slate-50 dark:bg-zinc-950/60 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:border-slate-300 dark:hover:border-zinc-700'
                                            }`}
                                        >
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                                paymentMethod === 'card' ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20' : 'bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400'
                                            }`}>
                                                <CreditCard className="w-5 h-5" />
                                            </div>
                                            <span className="font-bold">{tr('កាត')}</span>
                                            <span className="text-[10px] font-normal text-slate-500 dark:text-zinc-400">{tr('ម៉ាស៊ីនកាត')}</span>
                                        </button>

                                        {/* Delivery apps collect the money and pay the shop later: not cash in the drawer */}
                                        {isDeliveryPlatform(effectiveOrderSource) && (
                                            <button
                                                type="button"
                                                onClick={() => setPaymentMethod('app')}
                                                className={`p-4 rounded-xl border text-center font-bold text-xs flex flex-col items-center gap-2 transition cursor-pointer font-khmer ${
                                                    paymentMethod === 'app'
                                                        ? 'bg-pink-500/15 border-pink-500 text-pink-700 dark:text-pink-300 ring-2 ring-pink-500/20 shadow-md'
                                                        : 'bg-slate-50 dark:bg-zinc-950/60 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:border-slate-300 dark:hover:border-zinc-700'
                                                }`}
                                            >
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                                    paymentMethod === 'app' ? 'bg-pink-600 text-white shadow-md shadow-pink-600/20' : 'bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400'
                                                }`}>
                                                    <Bike className="w-5 h-5" />
                                                </div>
                                                <span className="font-bold">{tr('បង់តាម App')}</span>
                                                <span className="text-[10px] font-normal text-slate-500 dark:text-zinc-400">{tr('App ផ្ទេរលុយក្រោយ')}</span>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Section 2: Customer & Loyalty Points */}
                                <div className="bg-white dark:bg-zinc-900/90 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-3">
                                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800/80">
                                        <div className="flex items-center gap-2">
                                            <Users className="w-4 h-4 text-amber-500" />
                                            <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100 font-khmer">
                                                {tr('អតិថិជន & ពិន្ទុ')}
                                            </h3>
                                        </div>
                                        {selectedCustomerId && (
                                            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30 font-khmer">
                                                +{Math.floor(parseFloat(totals.grandTotalUSD))} {tr('ពិន្ទុនឹងទទួលបាន')}
                                            </span>
                                        )}
                                    </div>

                                    <select
                                        value={selectedCustomerId || ''}
                                        onChange={(e) => setSelectedCustomerId(e.target.value ? Number(e.target.value) : null)}
                                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500 font-khmer cursor-pointer transition-all"
                                    >
                                        <option value="">{tr('ភ្ញៀវទូទៅ (មិនសន្សំពិន្ទុ)')}</option>
                                        {customers.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.name} {c.phone ? `(${c.phone})` : ''} — {c.tier.toUpperCase()} · {c.loyalty_points} {tr('ពិន្ទុ')}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Section 3: Tender Execution (CASH) */}
                                {paymentMethod === 'cash' && (
                                    <div className="bg-white dark:bg-zinc-900/90 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
                                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800/80">
                                            <div className="flex items-center gap-2">
                                                <Banknote className="w-4 h-4 text-amber-500" />
                                                <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100 font-khmer">
                                                    {tr('ប្រាក់ទទួល')}
                                                </h3>
                                            </div>
                                            {amountReceived && (
                                                <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                                    ≈ {(Math.round(parseFloat(amountReceived || '0') * exchange_rate)).toLocaleString()} ៛
                                                </span>
                                            )}
                                        </div>

                                        {/* Tender Input */}
                                        <div className="relative">
                                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-base font-mono">
                                                $
                                            </span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={amountReceived}
                                                onChange={(e) => setAmountReceived(e.target.value)}
                                                placeholder="0.00"
                                                className="w-full pl-9 pr-4 py-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-lg font-black font-mono text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500 transition-all"
                                            />
                                        </div>

                                        {/* Quick USD Chips */}
                                        <div className="space-y-1.5">
                                            <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400 font-khmer">
                                                {tr('ដុល្លារ')}
                                            </span>
                                            <div className="flex flex-wrap gap-2">
                                                {[
                                                    { label: `${tr('គ្រប់ចំនួន')} $${totals.grandTotalUSD}`, val: totals.grandTotalUSD },
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
                                                                    ? 'bg-amber-500 text-zinc-950 border-amber-500 shadow-md shadow-amber-500/20'
                                                                    : 'bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:border-amber-500/40'
                                                            }`}
                                                        >
                                                            {btn.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Quick KHR Chips */}
                                        <div className="space-y-1.5">
                                            <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400 font-khmer">
                                                {tr('រៀល')}
                                            </span>
                                            <div className="flex flex-wrap gap-2">
                                                {[
                                                    { label: `${tr('គ្រប់ចំនួន')} ${totals.grandTotalKHR.toLocaleString()} ៛`, val: totals.grandTotalUSD },
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
                                                                    ? 'bg-emerald-500 text-zinc-950 border-emerald-500 shadow-md shadow-emerald-500/20'
                                                                    : 'bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:border-emerald-500/40'
                                                            }`}
                                                        >
                                                            {btn.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Change Due Box */}
                                        <div className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
                                            parseFloat(totals.changeUSD) > 0
                                                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-500/40 shadow-sm'
                                                : parseFloat(amountReceived || '0') < parseFloat(totals.grandTotalUSD) && parseFloat(amountReceived || '0') > 0
                                                ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-500/40'
                                                : 'bg-slate-50 dark:bg-zinc-950/60 border-slate-200 dark:border-zinc-800'
                                        }`}>
                                            <div>
                                                <span className="text-xs font-bold block text-slate-800 dark:text-zinc-200 font-khmer">
                                                    {parseFloat(amountReceived || '0') < parseFloat(totals.grandTotalUSD) && parseFloat(amountReceived || '0') > 0
                                                        ? tr('នៅខ្វះ')
                                                        : tr('ប្រាក់អាប់')}
                                                </span>
                                                <span className="text-xs font-mono font-semibold text-slate-500 dark:text-zinc-400">
                                                    {parseFloat(amountReceived || '0') < parseFloat(totals.grandTotalUSD) && parseFloat(amountReceived || '0') > 0
                                                        ? `${Math.round((parseFloat(totals.grandTotalUSD) - parseFloat(amountReceived || '0')) * exchange_rate).toLocaleString()} ៛`
                                                        : `${totals.changeKHR.toLocaleString()} ៛`}
                                                </span>
                                            </div>
                                            <div className={`text-2xl font-black font-mono ${
                                                parseFloat(totals.changeUSD) > 0
                                                    ? 'text-emerald-600 dark:text-emerald-400'
                                                    : parseFloat(amountReceived || '0') < parseFloat(totals.grandTotalUSD) && parseFloat(amountReceived || '0') > 0
                                                    ? 'text-amber-600 dark:text-amber-400'
                                                    : 'text-slate-400 dark:text-zinc-500'
                                            }`}>
                                                {parseFloat(amountReceived || '0') < parseFloat(totals.grandTotalUSD) && parseFloat(amountReceived || '0') > 0
                                                    ? `-$${(parseFloat(totals.grandTotalUSD) - parseFloat(amountReceived || '0')).toFixed(2)}`
                                                    : `$${totals.changeUSD}`}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Section 3: KHQR Live Terminal */}
                                {paymentMethod === 'khqr' && (
                                    <div className="bg-white dark:bg-zinc-900/90 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm flex flex-col items-center text-center space-y-4">
                                        <div className="px-3.5 py-1 bg-rose-600 rounded-full text-white font-black text-xs tracking-wider shadow-md shadow-rose-600/30">
                                            KHQR • BAKONG
                                        </div>
                                        <div className="w-48 h-48 bg-white p-3 rounded-2xl shadow-xl border-2 border-slate-200 dark:border-zinc-700 flex items-center justify-center relative">
                                            <div className="w-full h-full border-2 border-slate-900 border-dashed rounded-xl flex flex-col items-center justify-center text-slate-900">
                                                <QrCode className="w-20 h-20 text-slate-900 mb-1" />
                                                <span className="text-[10px] font-bold font-khmer">{tr('ស្កេនដើម្បីទូទាត់')}</span>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <h4 className="font-bold text-base text-slate-900 dark:text-zinc-100 font-khmer">
                                                {business.business_name_primary}
                                            </h4>
                                            <p className="text-sm text-rose-600 dark:text-rose-400 font-mono font-bold">
                                                ${totals.grandTotalUSD} ({totals.grandTotalKHR.toLocaleString()} ៛)
                                            </p>
                                            <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-khmer pt-1">
                                                {tr('គាំទ្ររាល់កម្មវិធីធនាគារទាំងអស់ (ABA, Acleda, Canadia, Bakong...)')}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Section 3: Card Terminal Ready */}
                                {paymentMethod === 'card' && (
                                    <div className="bg-white dark:bg-zinc-900/90 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm flex flex-col items-center text-center space-y-4">
                                        <div className="w-16 h-16 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-500 shadow-md">
                                            <CreditCard className="w-8 h-8" />
                                        </div>
                                        <div className="space-y-1 max-w-sm">
                                            <h4 className="font-bold text-base text-slate-900 dark:text-zinc-100 font-khmer">
                                                {tr('ម៉ាស៊ីនឆូតកាតត្រៀមរួចរាល់')}
                                            </h4>
                                            <p className="text-xs text-slate-500 dark:text-zinc-400 font-khmer">
                                                {tr('សូមឆូតកាត ឬប៉ះកាតលើម៉ាស៊ីនកាត។')}
                                            </p>
                                            <div className="flex items-center justify-center gap-2 pt-2 text-[10px] font-mono text-sky-600 dark:text-sky-400 font-bold">
                                                <span>VISA</span> • <span>MASTERCARD</span> • <span>UNIONPAY</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Right Column: Live Digital Receipt / Bill Preview (5 cols) */}
                            <div className="lg:col-span-5 space-y-6">
                                <div className="bg-white dark:bg-zinc-900/90 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
                                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800/80">
                                        <div className="flex items-center gap-2">
                                            <Receipt className="w-4 h-4 text-amber-500" />
                                            <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100 font-khmer">
                                                {tr('មើលវិក្កយបត្រជាមុន')}
                                            </h3>
                                        </div>
                                    </div>

                                    {/* Digital Thermal Paper Receipt Card */}
                                    <div className="p-5 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 shadow-inner font-mono text-xs text-slate-800 dark:text-zinc-200 space-y-4">
                                        {/* Receipt Header */}
                                        <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-300 dark:border-zinc-700">
                                            <h4 className="font-bold text-sm text-slate-900 dark:text-white font-khmer">
                                                {business.business_name_primary}
                                            </h4>
                                            <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-khmer">
                                                {tr('វិក្កយបត្រ')}
                                            </p>
                                            <div className="text-[10px] text-slate-500 dark:text-zinc-400 flex items-center justify-between pt-1">
                                                <span>{new Date().toISOString().slice(0, 10)}</span>
                                                <span>{orderMode === 'takeaway' ? tr('ខ្ចប់') : selectedTable}</span>
                                            </div>
                                            <div className="text-[10px] text-slate-500 dark:text-zinc-400 flex items-center justify-between">
                                                <span className="font-khmer">{tr('កម្មង់ពី')}</span>
                                                <span className="font-bold text-slate-900 dark:text-zinc-100">
                                                    {language === 'km' ? getOrderSource(effectiveOrderSource).labelKm : getOrderSource(effectiveOrderSource).label}
                                                    {isDeliveryPlatform(effectiveOrderSource) && externalOrderRef.trim() && ` #${externalOrderRef.trim()}`}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Itemized Table */}
                                        <div className="max-h-48 overflow-y-auto space-y-2 divide-y divide-slate-200 dark:divide-zinc-800/60 pr-1">
                                            {lines.map((item, idx) => (
                                                <div key={idx} className="pt-2 first:pt-0 flex items-start justify-between text-xs">
                                                    <div className="min-w-0 flex-1 pr-2">
                                                        <div className="font-semibold text-slate-900 dark:text-zinc-100 truncate font-khmer">
                                                            {getName(item)}
                                                        </div>
                                                        <div className="text-[10px] text-slate-500 dark:text-zinc-400">
                                                            {item.quantity} x ${parseFloat(item.unit_price).toFixed(2)}
                                                        </div>
                                                    </div>
                                                    <div className="font-bold text-slate-900 dark:text-zinc-100 shrink-0">
                                                        ${(parseFloat(item.unit_price) * item.quantity).toFixed(2)}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Subtotals & Grand Total */}
                                        <div className="pt-3 border-t border-dashed border-slate-300 dark:border-zinc-700 space-y-1.5 text-xs">
                                            <div className="flex items-center justify-between text-slate-600 dark:text-zinc-400">
                                                <span className="font-khmer">{tr('សរុបរង')}</span>
                                                <span>${totals.subtotalUSD}</span>
                                            </div>

                                            {parseFloat(totals.discountUSD) > 0 && (
                                                <div className="flex items-center justify-between text-rose-600 dark:text-rose-400">
                                                    <span className="font-khmer">{tr('បញ្ចុះតម្លៃ')}</span>
                                                    <span>-${totals.discountUSD}</span>
                                                </div>
                                            )}

                                            <div className="pt-2 flex items-baseline justify-between text-base font-bold text-slate-900 dark:text-white">
                                                <span className="font-khmer">{tr('សរុប')}</span>
                                                <span className="text-amber-600 dark:text-amber-400 font-mono">${totals.grandTotalUSD}</span>
                                            </div>
                                            <div className="flex items-center justify-end text-xs font-semibold text-slate-500 dark:text-zinc-400">
                                                <span>{totals.grandTotalKHR.toLocaleString()} ៛</span>
                                            </div>
                                        </div>

                                        {/* Payment Tender on Receipt */}
                                        <div className="pt-3 border-t border-dashed border-slate-300 dark:border-zinc-700 space-y-1 text-[11px] text-slate-600 dark:text-zinc-400">
                                            <div className="flex items-center justify-between">
                                                <span className="font-khmer">{tr('វិធីបង់ប្រាក់')}</span>
                                                <span className="font-bold text-slate-800 dark:text-zinc-200 font-khmer">{paymentMethodName(paymentMethod)}</span>
                                            </div>
                                            {paymentMethod === 'cash' && (
                                                <>
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-khmer">{tr('ប្រាក់ទទួល')}</span>
                                                        <span>${amountReceived || totals.grandTotalUSD}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between font-bold text-emerald-600 dark:text-emerald-400">
                                                        <span className="font-khmer">{tr('ប្រាក់អាប់')}</span>
                                                        <span>${totals.changeUSD} ({totals.changeKHR.toLocaleString()} ៛)</span>
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        {/* Receipt Footer Message */}
                                        <div className="pt-3 border-t border-slate-300 dark:border-zinc-700 text-center text-[10px] text-slate-500 dark:text-zinc-400 font-khmer">
                                            {business.document_footer || tr('សូមអរគុណ! សូមអញ្ជើញមកពិសាម្តងទៀត')}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="shrink-0 flex items-center justify-between px-6 py-3.5 border-t border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                        {checkoutError ? (
                            <div role="alert" className="text-xs font-semibold text-rose-600 dark:text-rose-400 font-khmer">
                                {checkoutError}
                            </div>
                        ) : (
                        <div className="hidden sm:flex items-center gap-3">
                            <span className="text-xs text-slate-500 dark:text-zinc-400 font-khmer">
                                {tr('វិធីបង់ប្រាក់')}: <strong className="text-slate-800 dark:text-zinc-200">{paymentMethodName(paymentMethod)}</strong>
                            </span>
                            <span className="text-slate-300 dark:text-zinc-700">•</span>
                            <span className="text-xs text-slate-500 dark:text-zinc-400 font-khmer">
                                {tr('សរុបត្រូវបង់')}: <strong className="text-amber-600 dark:text-amber-400 font-mono">${totals.grandTotalUSD}</strong> <span className="font-mono">({totals.grandTotalKHR.toLocaleString()} ៛)</span>
                            </span>
                        </div>
                        )}

                        <div className="flex items-center gap-2.5 ml-auto">
                            <button
                                type="button"
                                onClick={() => setIsCheckoutModalOpen(false)}
                                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all cursor-pointer font-khmer"
                            >
                                {tr('ថយក្រោយ')}
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmCheckout}
                                disabled={isSubmitting || (paymentMethod === 'cash' && parseFloat(amountReceived || '0') < parseFloat(totals.grandTotalUSD))}
                                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-zinc-950 font-black text-xs shadow-lg shadow-amber-500/25 border border-amber-300/40 transition active:scale-[0.98] cursor-pointer font-khmer disabled:opacity-50"
                            >
                                <Printer className="w-4 h-4" />
                                <span>{isSubmitting ? tr('កំពុងដំណើរការ...') : tr('បញ្ជាក់ការទូទាត់ & ចេញវិក្កយបត្រ')}</span>
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Active Tables Overview Full-Workspace Suite */}
            {mounted && isTablesModalOpen && createPortal(
                <div
                    className="fixed inset-y-0 right-0 left-0 md:left-[var(--sidebar-width,16rem)] z-50 flex flex-col bg-zinc-50 dark:bg-zinc-950 overflow-hidden select-none animate-in fade-in duration-150 h-screen"
                    onWheel={(e) => e.stopPropagation()}
                >
                    {/* Header Bar */}
                    <div className="h-16 px-6 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between shrink-0 shadow-xs">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
                                <Utensils className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 font-khmer">
                                        {tr('តារាងប្លង់តុ និងការគ្រប់គ្រងភ្ញៀវ (Floor & Table Management Suite)')}
                                    </h2>
                                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                        {tr('ញ៉ាំនៅហាង')}
                                    </span>
                                </div>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-khmer flex items-center gap-2">
                                    <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold">
                                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                                        {activeTablesCount} {tr('តុ កំពុងទទួលភ្ញៀវ (Occupied)')}
                                    </span>
                                    <span>•</span>
                                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                        {tables_list.length - activeTablesCount} {tr('តុទំនេរ (Vacant)')}
                                    </span>
                                    <span>•</span>
                                    <span>{tables_list.length} {tr('តុសរុប (Total)')}</span>
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => setIsTablesModalOpen(false)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-xs font-semibold font-khmer transition-all cursor-pointer shadow-xs"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span>{tr('ត្រឡប់ក្រោយ')}</span>
                        </button>
                    </div>

                    {/* Content Area - 2 Columns */}
                    {(() => {
                        const filteredTables = tables_list.filter((tbl) => {
                            const isOccupied = active_tables.some((t) => t.table_identifier === tbl);
                            if (tableFilter === 'occupied') return isOccupied;
                            if (tableFilter === 'vacant') return !isOccupied;
                            if (tableFilter === 'indoor') return tbl.includes('តុ') && !tbl.includes('សួន');
                            if (tableFilter === 'vip') return tbl.toLowerCase().includes('vip');
                            if (tableFilter === 'garden') return tbl.includes('សួន') || tbl.toLowerCase().includes('garden');
                            return true;
                        });

                        const focusedTableName = inspectedTable || (orderMode === 'dine_in' ? selectedTable : null) || tables_list[0] || 'តុ 01';
                        const activeFocusedTable = active_tables.find((t) => t.table_identifier === focusedTableName);
                        const isFocusedOccupied = !!activeFocusedTable;
                        const floorTotalUSD = active_tables.reduce((sum, t) => sum + parseFloat(t.grand_total || '0'), 0);
                        const floorTotalKHR = Math.round(floorTotalUSD * exchange_rate);

                        return (
                            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                                {/* Left Column: Zone Filters & Table Cards Grid */}
                                <div className="w-full lg:w-7/12 p-6 lg:p-8 space-y-5 overflow-y-auto">
                                    {/* Filter Pills */}
                                    <div className="flex flex-wrap items-center gap-2 pb-1">
                                        {[
                                            { id: 'all', label: `${tr('តុទាំងអស់')} (${tables_list.length})` },
                                            { id: 'occupied', label: `${tr('កំពុងទទួលភ្ញៀវ')} (${activeTablesCount})` },
                                            { id: 'vacant', label: `${tr('តុទំនេរ')} (${tables_list.length - activeTablesCount})` },
                                            { id: 'indoor', label: tr('សាលធំ (Indoor)') },
                                            { id: 'vip', label: tr('បន្ទប់ VIP') },
                                            { id: 'garden', label: tr('សួនក្រៅ (Outdoor)') },
                                        ].map((tab) => (
                                            <button
                                                key={tab.id}
                                                type="button"
                                                onClick={() => setTableFilter(tab.id as any)}
                                                className={`px-3 py-1.5 rounded-xl text-xs font-bold font-khmer transition-all cursor-pointer ${
                                                    tableFilter === tab.id
                                                        ? 'bg-amber-500 text-zinc-950 shadow-sm shadow-amber-500/20'
                                                        : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                                                }`}
                                            >
                                                {tab.label}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Tables Grid */}
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                                        {filteredTables.map((tbl) => {
                                            const activeDoc = active_tables.find((t) => t.table_identifier === tbl);
                                            const isCurrentSelected = orderMode === 'dine_in' && selectedTable === tbl;
                                            const isInspected = focusedTableName === tbl;

                                            return (
                                                <div
                                                    key={tbl}
                                                    onClick={() => {
                                                        setInspectedTable(tbl);
                                                    }}
                                                    className={`p-4 rounded-2xl border flex flex-col justify-between transition-all select-none cursor-pointer group hover:scale-[1.01] ${
                                                        activeDoc
                                                            ? 'bg-gradient-to-b from-amber-500/10 to-amber-500/5 border-amber-500/40 text-zinc-900 dark:text-zinc-100 shadow-xs hover:border-amber-400'
                                                            : 'bg-white dark:bg-zinc-900/90 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-xs'
                                                    } ${isInspected ? 'ring-2 ring-amber-500 shadow-md shadow-amber-500/15' : ''} ${
                                                        isCurrentSelected ? 'border-amber-500' : ''
                                                    }`}
                                                >
                                                    <div className="flex items-start justify-between mb-3">
                                                        <div>
                                                            <div className="flex items-center gap-1.5">
                                                                <h4 className="font-bold text-sm text-zinc-900 dark:text-white group-hover:text-amber-500 transition-colors">
                                                                    {tbl}
                                                                </h4>
                                                                {isCurrentSelected && (
                                                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                                                        {tr('កំពុងប្រើ')}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold mt-1 font-khmer ${
                                                                activeDoc ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-emerald-600 dark:text-emerald-400'
                                                            }`}>
                                                                <span className={`w-1.5 h-1.5 rounded-full ${
                                                                    activeDoc ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
                                                                }`} />
                                                                {activeDoc ? tr('មានភ្ញៀវ') : tr('ទំនេរ')}
                                                            </span>
                                                        </div>
                                                        <div className={`p-2 rounded-xl ${
                                                            activeDoc
                                                                ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300'
                                                                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                                                        }`}>
                                                            <Utensils className="w-4 h-4" />
                                                        </div>
                                                    </div>

                                                    {activeDoc ? (
                                                        <div className="space-y-2 pt-2 border-t border-amber-500/20">
                                                            <div className="flex items-baseline justify-between">
                                                                <span className="font-mono font-black text-base text-amber-600 dark:text-amber-400">
                                                                    ${parseFloat(activeDoc.grand_total).toFixed(2)}
                                                                </span>
                                                                <span className="text-[10.5px] text-zinc-500 dark:text-zinc-400 font-khmer">
                                                                    {activeDoc.items.length} {tr('មុខ')}
                                                                </span>
                                                            </div>

                                                            <div className="flex items-center gap-1.5 pt-1" onClick={(e) => e.stopPropagation()}>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleSelectActiveTable(activeDoc)}
                                                                    className="flex-1 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-xs transition cursor-pointer font-khmer flex items-center justify-center gap-1"
                                                                >
                                                                    <span>{tr('បើកតុ')}</span>
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleCancelTable(activeDoc.id)}
                                                                    className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-rose-500 hover:bg-rose-500/20 transition cursor-pointer"
                                                                    title={tr("លុបចោលតុ")}
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setOrderMode('dine_in');
                                                                    setSelectedTable(tbl);
                                                                    setCurrentDraftId(null);
                                                                    setIsTablesModalOpen(false);
                                                                }}
                                                                className="w-full py-1.5 text-center text-[11px] font-bold text-zinc-600 dark:text-zinc-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition font-khmer bg-zinc-50 dark:bg-zinc-800/50 hover:bg-emerald-500/10 rounded-lg cursor-pointer"
                                                            >
                                                                {tr('ជ្រើសរើសតុនេះ')}
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Right Column: Selected Table Details */}
                                <div className="w-full lg:w-5/12 p-6 lg:p-8 bg-zinc-50 dark:bg-zinc-900/80 border-t lg:border-t-0 lg:border-l border-zinc-200 dark:border-zinc-800 flex flex-col overflow-y-auto">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between gap-3 pb-4 border-b border-zinc-200 dark:border-zinc-800">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                                                    <Utensils className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white font-khmer">
                                                        {tr('ព័ត៌មានតុ')}
                                                    </h3>
                                                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block">
                                                        {tr('ព័ត៌មានតុ')}
                                                    </span>
                                                </div>
                                            </div>
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold font-khmer border ${
                                                isFocusedOccupied
                                                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                                                    : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                                            }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${isFocusedOccupied ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                                                {isFocusedOccupied ? tr('មានភ្ញៀវ') : tr('ទំនេរ')}
                                            </span>
                                        </div>

                                        {/* Focused Table Card */}
                                        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800/90 shadow-xs dark:shadow-none space-y-3 text-xs">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-khmer block">{tr('តុដែលកំពុងមើល (Selected)')}</span>
                                                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white font-khmer">{focusedTableName}</h3>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-khmer block">{tr('តំបន់ (Zone)')}</span>
                                                    <span className="text-amber-600 dark:text-amber-400 font-bold font-khmer">
                                                        {focusedTableName.toLowerCase().includes('vip')
                                                            ? tr('បន្ទប់ VIP')
                                                            : focusedTableName.includes('សួន')
                                                            ? tr('សួនក្រៅ')
                                                            : tr('សាលធំ')}
                                                    </span>
                                                </div>
                                            </div>

                                            {isFocusedOccupied && activeFocusedTable ? (
                                                <div className="space-y-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                                                    <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400 text-xs">
                                                        <span className="font-khmer">{tr('លេខកូដវិក្កយបត្រ៖')}</span>
                                                        <span className="text-amber-600 dark:text-amber-400 font-bold font-mono">#TBL-DRAFT-{activeFocusedTable.id}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400 text-xs">
                                                        <span className="font-khmer">{tr('ពេលអង្គុយ៖')}</span>
                                                        <span className="text-zinc-800 dark:text-zinc-200 font-medium font-mono">{activeFocusedTable.created_at}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400 text-xs">
                                                        <span className="font-khmer">{tr('ទឹកប្រាក់សរុប៖')}</span>
                                                        <span className="text-emerald-600 dark:text-emerald-400 font-black text-sm font-mono">
                                                            ${parseFloat(activeFocusedTable.grand_total).toFixed(2)}
                                                        </span>
                                                    </div>

                                                    {/* Ordered Items Preview */}
                                                    <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800/80">
                                                        <span className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase font-sans font-bold block mb-1.5">
                                                            {tr('មុខម្ហូបដែលបានកុម្ម៉ង់ (')}{activeFocusedTable.items.length} {tr('មុខ)៖')}
                                                        </span>
                                                        <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                                                            {activeFocusedTable.items.map((item, idx) => (
                                                                <div key={idx} className="flex items-center justify-between py-1 border-b border-zinc-100 dark:border-zinc-800/40 text-[11px]">
                                                                    <div className="min-w-0 pr-2">
                                                                        <span className="text-zinc-800 dark:text-zinc-200 font-khmer truncate block font-medium">
                                                                            {item.name_primary}
                                                                        </span>
                                                                        <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
                                                                            x{item.quantity} • ${parseFloat(item.unit_price).toFixed(2)}
                                                                        </span>
                                                                    </div>
                                                                    <span className="font-mono text-zinc-900 dark:text-zinc-300 font-bold shrink-0">
                                                                        ${parseFloat(item.line_total).toFixed(2)}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="py-4 text-center space-y-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                                                    <div className="w-11 h-11 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-xs">
                                                        <Check className="w-5 h-5 stroke-[2.5]" />
                                                    </div>
                                                    <p className="text-xs font-bold text-zinc-800 dark:text-zinc-100 font-khmer">
                                                        {tr('តុនេះទំនេរ រួចរាល់សម្រាប់ទទួលភ្ញៀវថ្មីភ្លាមៗ')}
                                                    </p>
                                                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-khmer leading-relaxed">
                                                        {tr('ចុចលើប៊ូតុងខាងក្រោមដើម្បីកំណត់តុនេះសម្រាប់វិក្កយបត្របច្ចុប្បន្ន')}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Floor Summary: occupied tables & open bills */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="p-4 rounded-2xl bg-white dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800/90 shadow-xs dark:shadow-none space-y-2">
                                                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-khmer block">
                                                    {tr('តុមានភ្ញៀវ')}
                                                </span>
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-xl font-bold text-amber-600 dark:text-amber-400 font-mono">
                                                        {activeTablesCount}
                                                    </span>
                                                    <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                                                        / {tables_list.length}
                                                    </span>
                                                </div>
                                                <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                                                    <div
                                                        className="bg-amber-500 h-full rounded-full transition-all duration-500"
                                                        style={{ width: `${Math.round((activeTablesCount / (tables_list.length || 1)) * 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                            <div className="p-4 rounded-2xl bg-white dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800/90 shadow-xs dark:shadow-none space-y-2">
                                                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-khmer block">
                                                    {tr('វិក្កយបត្រមិនទាន់ទូទាត់')}
                                                </span>
                                                <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono block">
                                                    ${floorTotalUSD.toFixed(2)}
                                                </span>
                                                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono block">
                                                    ≈ {floorTotalKHR.toLocaleString()} {tr('៛')}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Hold Table Tip */}
                                        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5">
                                            <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                            <p className="text-zinc-700 dark:text-zinc-300 font-khmer text-xs leading-relaxed">
                                                {tr('ចុច')} <span className="font-bold text-amber-700 dark:text-amber-400">{t('pos.hold_order')}</span> {tr('ដើម្បីទុកការកម្មង់របស់តុនេះ។ អាចកម្មង់បន្ថែម ឬគិតប្រាក់នៅពេលក្រោយបាន ដោយមិនបាត់ទិន្នន័យ។')}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {/* Footer Bar */}
                    <div className="px-6 py-3.5 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between shrink-0 shadow-sm">
                        <div className="text-xs text-zinc-500 font-khmer hidden sm:flex items-center gap-2">
                            <kbd className="px-2 py-0.5 text-[10px] font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded border border-zinc-300 dark:border-zinc-700">
                                Esc
                            </kbd>
                            <span>{tr('ដើម្បីត្រឡប់ក្រោយ / បោះបង់')}</span>
                        </div>

                        <div className="flex items-center gap-3 ml-auto">
                            <button
                                type="button"
                                onClick={() => setIsTablesModalOpen(false)}
                                className="px-5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-xs font-semibold font-khmer transition-all cursor-pointer shadow-xs"
                            >
                                {tr('បោះបង់')}
                            </button>

                            {(() => {
                                const focusedTableName = inspectedTable || (orderMode === 'dine_in' ? selectedTable : null) || tables_list[0] || 'តុ 01';
                                const activeFocusedTable = active_tables.find((t) => t.table_identifier === focusedTableName);

                                return activeFocusedTable ? (
                                    <button
                                        type="button"
                                        onClick={() => handleSelectActiveTable(activeFocusedTable)}
                                        className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold font-khmer shadow-sm hover:shadow-amber-500/20 transition-all cursor-pointer flex items-center gap-2"
                                    >
                                        <Utensils className="w-4 h-4" />
                                        <span>{tr('បើកវិក្កយបត្រ')} {focusedTableName}</span>
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setOrderMode('dine_in');
                                            setSelectedTable(focusedTableName);
                                            setCurrentDraftId(null);
                                            setIsTablesModalOpen(false);
                                        }}
                                        className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold font-khmer shadow-sm hover:shadow-emerald-600/20 transition-all cursor-pointer flex items-center gap-2"
                                    >
                                        <Check className="w-4 h-4" />
                                        <span>{tr('ជ្រើសរើស')} {focusedTableName}</span>
                                    </button>
                                );
                            })()}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </AppLayout>
    );
}
