import React, { useEffect, useState, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, usePage, router, Head } from '@inertiajs/react';
import { PageProps } from '@/types';
import {
    Lock,
    LayoutDashboard,
    ReceiptText,
    Settings,
    LogOut,
    Store,
    User as UserIcon,
    AlertCircle,
    CheckCircle2,
    X,
    PlusCircle,
    ListFilter,
    BarChart3,
    ShieldCheck,
    Menu,
    PanelLeftClose,
    PanelLeftOpen,
    Package,
    Truck,
    ChefHat,
    Users,
    WalletCards,
    LayoutGrid,
    MoreVertical,
    Moon,
    HelpCircle,
    Sun,
    Maximize,
    Minimize,
    ChevronDown,
    ChevronRight,
    ArrowLeft,
    Keyboard,
    Coins,
    Printer,
    Sparkles,
    Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/context/language-context';
import { PrintQueue } from '@/components/print-queue';
import { tr } from '@/locales/tr';

interface AppLayoutProps {
    children: React.ReactNode;
    title?: string;
}

interface NavItem {
    name: string;
    khmerName?: string;
    href: string;
    icon: React.ElementType;
    shortcut?: string;
    highlight?: boolean;
}

interface NavSubItem {
    name: string;
    khmerName?: string;
    href: string;
    icon: React.ElementType;
    shortcut?: string;
}

interface NavGroup {
    id: string;
    name: string;
    khmerName?: string;
    icon: React.ElementType;
    children: NavSubItem[];
}

type NavEntry =
    | { type: 'link'; item: NavItem }
    | { type: 'group'; group: NavGroup };

export const AppLayout: React.FC<AppLayoutProps> = ({ children, title }) => {
    const { auth, business, flash } = usePage<PageProps>().props;
    const user = auth.user;
    const [currentTime, setCurrentTime] = useState<string>(() => {
        return new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
        });
    });
    const [flashVisible, setFlashVisible] = useState<boolean>(true);

    // Show each new flash message briefly: success 3 s, errors a little longer so they can be read
    useEffect(() => {
        if (!flash?.success && !flash?.error && !flash?.warning) {
            return;
        }

        setFlashVisible(true);
        const timer = window.setTimeout(() => setFlashVisible(false), flash?.error ? 6000 : 3000);

        return () => window.clearTimeout(timer);
    }, [flash]);
    const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
    const [collapsed, setCollapsed] = useState<boolean>(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('leashal_etum_sidebar_collapsed') === 'true';
        }
        return false;
    });

    const [collapsedFlyout, setCollapsedFlyout] = useState<string | null>(null);

    const toggleCollapsed = () => {
        setCollapsedFlyout(null);
        setCollapsed((prev) => {
            const next = !prev;
            if (typeof window !== 'undefined') {
                localStorage.setItem('leashal_etum_sidebar_collapsed', String(next));
            }
            return next;
        });
    };

    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [helpModalOpen, setHelpModalOpen] = useState(false);
    const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (helpModalOpen) {
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = 'unset';
            };
        }
    }, [helpModalOpen]);
    const [isDark, setIsDark] = useState<boolean>(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('pos_theme');
            if (stored) return stored === 'dark';
            return !document.documentElement.classList.contains('light');
        }
        return true;
    });

    useEffect(() => {
        if (typeof document !== 'undefined') {
            if (isDark) {
                document.documentElement.classList.add('dark');
                document.documentElement.classList.remove('light');
                document.body.classList.add('dark');
                document.body.classList.remove('light');
                localStorage.setItem('pos_theme', 'dark');
            } else {
                document.documentElement.classList.remove('dark');
                document.documentElement.classList.add('light');
                document.body.classList.remove('dark');
                document.body.classList.add('light');
                localStorage.setItem('pos_theme', 'light');
            }
        }
    }, [isDark]);

    useEffect(() => {
        if (typeof document !== 'undefined') {
            document.documentElement.style.setProperty('--sidebar-width', collapsed ? '5rem' : '16rem');
        }
    }, [collapsed]);

    const { language, setLanguage, toggleLanguage, t, getName, getSecondaryName } = useTranslation();

    const toggleTheme = () => {
        setIsDark((prev) => !prev);
    };

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

    const getInitials = (name?: string) => {
        if (!name) return 'MA';
        const words = name.trim().split(/\s+/);
        if (words.length === 1) {
            return words[0].slice(0, 2).toUpperCase();
        }
        return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    };

    const displayRole = user?.role
        ? t(`nav.user_role_${user.role}`, user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase())
        : t('nav.user_role_cashier', 'Cashier');

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (
                userMenuOpen &&
                !target.closest('#user-profile-menu-container') &&
                !target.closest('#mobile-user-profile-menu-container')
            ) {
                setUserMenuOpen(false);
            }
            if (
                collapsedFlyout &&
                !target.closest('[data-collapsed-group]')
            ) {
                setCollapsedFlyout(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [userMenuOpen, collapsedFlyout]);

    useEffect(() => {
        const updateClock = () => {
            const now = new Date();
            setCurrentTime(
                now.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true,
                })
            );
        };
        const interval = setInterval(updateClock, 1000);
        return () => clearInterval(interval);
    }, []);

    // Global keyboard shortcuts: F2 for POS Order, Ctrl+B / Cmd+B for Sidebar Collapse, Escape to dismiss flyouts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setCollapsedFlyout(null);
                setUserMenuOpen(false);
                setHelpModalOpen(false);
                setLogoutConfirmOpen(false);
            } else if (e.key === 'F2') {
                e.preventDefault();
                router.visit('/invoices/create');
            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
                e.preventDefault();
                toggleCollapsed();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleLogout = () => {
        setUserMenuOpen(false);
        setCollapsedFlyout(null);
        setMobileMenuOpen(false);
        setLogoutConfirmOpen(true);
    };

    const confirmLogout = () => {
        setLogoutConfirmOpen(false);
        router.post('/logout');
    };

    const { url } = usePage();
    const currentPath = url.split('?')[0];
    const isPosPage = currentPath === '/invoices/create';

    const sidebarNavRef = useRef<HTMLElement>(null);

    // Track and persist sidebar scroll in sessionStorage
    const handleSidebarScroll = () => {
        if (sidebarNavRef.current) {
            sessionStorage.setItem('leashal_etum_sidebar_scroll', String(sidebarNavRef.current.scrollTop));
        }
    };

    useEffect(() => {
        setCollapsedFlyout(null);
    }, [currentPath]);

    useEffect(() => {
        if (isPosPage) {
            document.documentElement.classList.add('pos-terminal-fixed');
            document.body.classList.add('pos-terminal-fixed');
            return () => {
                document.documentElement.classList.remove('pos-terminal-fixed');
                document.body.classList.remove('pos-terminal-fixed');
            };
        }
    }, [isPosPage]);

    const isItemActive = (href: string) => {
        if (href === '/invoices/create') {
            return currentPath === '/invoices/create';
        }
        if (href === '/invoices') {
            return (
                currentPath === '/invoices' ||
                (currentPath.startsWith('/invoices/') && currentPath !== '/invoices/create' && !currentPath.startsWith('/invoices/print-range'))
            );
        }
        if (href === '/dashboard') {
            return currentPath === '/dashboard';
        }
        return currentPath === href || currentPath.startsWith(`${href}/`);
    };

    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
        if (typeof window === 'undefined') {
            return { operations: true, inventory: false, finance: false };
        }
        const path = window.location.pathname;
        let stored: Record<string, boolean> = {};
        try {
            const raw = localStorage.getItem('leashal_etum_sidebar_open_groups');
            if (raw) stored = JSON.parse(raw);
        } catch {
            stored = {};
        }

        const isOp = path.startsWith('/tables') || path.startsWith('/kds') || (path.startsWith('/invoices') && path !== '/invoices/create');
        const isInv = path.startsWith('/catalog') || path.startsWith('/purchases');
        const isFin = path.startsWith('/expenses') || path.startsWith('/shifts') || path.startsWith('/customers') || path.startsWith('/approvals');

        return {
            operations: isOp || (stored.operations !== undefined ? stored.operations : isOp),
            inventory: isInv || stored.inventory === true,
            finance: isFin || stored.finance === true,
        };
    });

    const toggleGroup = (groupId: string) => {
        setOpenGroups((prev) => {
            const next = {
                ...prev,
                [groupId]: !prev[groupId],
            };
            if (typeof window !== 'undefined') {
                try {
                    localStorage.setItem('leashal_etum_sidebar_open_groups', JSON.stringify(next));
                } catch {}
            }
            return next;
        });
    };

    const navEntries: NavEntry[] = [
        {
            type: 'link',
            item: {
                name: 'Dashboard',
                khmerName: 'ផ្ទាំងគ្រប់គ្រង',
                href: '/dashboard',
                icon: LayoutDashboard,
            },
        },
        {
            type: 'link',
            item: {
                name: 'POS Terminal',
                khmerName: 'បញ្ជរលក់ផ្ទាល់',
                href: '/invoices/create',
                icon: PlusCircle,
                shortcut: 'F2',
                highlight: true,
            },
        },
        {
            type: 'group',
            group: {
                id: 'operations',
                name: 'Store Operations',
                khmerName: 'ប្រតិបត្តិការហាង',
                icon: Store,
                children: [
                    {
                        name: 'Floor & Tables',
                        khmerName: 'ប្លង់តុ & អង្គុយ',
                        href: '/tables',
                        icon: LayoutGrid,
                    },
                    {
                        name: 'Kitchen Display (KDS)',
                        khmerName: 'ផ្ទាំងផ្ទះបាយ',
                        href: '/kds',
                        icon: ChefHat,
                    },
                    {
                        name: 'Register',
                        khmerName: 'បញ្ជីវិក្កយបត្រ',
                        href: '/invoices',
                        icon: ListFilter,
                    },
                ],
            },
        },
        {
            type: 'group',
            group: {
                id: 'inventory',
                name: 'Menu & Inventory',
                khmerName: 'មុខទំនិញ & ស្ដុក',
                icon: Package,
                children: [
                    {
                        name: 'Items & Units',
                        khmerName: 'មុខទំនិញ & ឯកតា',
                        href: '/catalog',
                        icon: Package,
                    },
                    {
                        name: 'Purchases',
                        khmerName: 'ការទិញចូល & ផ្គត់ផ្គង់',
                        href: '/purchases',
                        icon: Truck,
                    },
                ],
            },
        },
        {
            type: 'group',
            group: {
                id: 'finance',
                name: 'Finance & CRM',
                khmerName: 'ហិរញ្ញវត្ថុ & អតិថិជន',
                icon: WalletCards,
                children: [
                    {
                        name: 'Expenses',
                        khmerName: 'ចំណាយ & ថតបេឡា',
                        href: '/expenses',
                        icon: WalletCards,
                    },
                    {
                        name: 'Cash Shift',
                        khmerName: 'វេន & បិទថតបេឡា',
                        href: '/shifts',
                        icon: Lock,
                    },
                    {
                        name: 'Customers',
                        khmerName: 'អតិថិជន & ពិន្ទុ',
                        href: '/customers',
                        icon: Users,
                    },
                    {
                        name: 'Approvals',
                        khmerName: 'ការអនុម័ត',
                        href: '/approvals',
                        icon: ShieldCheck,
                    },
                ],
            },
        },
        {
            type: 'link',
            item: {
                name: 'Reports',
                khmerName: 'របាយការណ៍',
                href: '/reports',
                icon: BarChart3,
            },
        },
        ...(user?.role === 'admin'
            ? [
                  {
                      type: 'link' as const,
                      item: {
                          name: 'Settings',
                          khmerName: 'ការកំណត់',
                          href: '/settings',
                          icon: Settings,
                      },
                  },
              ]
            : []),
    ];

    // Auto-expand group if any of its children is currently active
    useEffect(() => {
        navEntries.forEach((entry) => {
            if (entry.type === 'group') {
                const hasActive = entry.group.children.some((child) => isItemActive(child.href));
                if (hasActive) {
                    setOpenGroups((prev) => {
                        if (prev[entry.group.id]) return prev;
                        const next = { ...prev, [entry.group.id]: true };
                        if (typeof window !== 'undefined') {
                            try {
                                localStorage.setItem('leashal_etum_sidebar_open_groups', JSON.stringify(next));
                            } catch {}
                        }
                        return next;
                    });
                }
            }
        });
    }, [currentPath]);

    // Restore scroll position instantly and silently without any visible scroll movement
    useLayoutEffect(() => {
        if (!sidebarNavRef.current) return;
        const savedScroll = sessionStorage.getItem('leashal_etum_sidebar_scroll');
        if (savedScroll !== null) {
            sidebarNavRef.current.scrollTop = Number(savedScroll);
        }
    }, [currentPath]);

    const renderNavLinks = (isCollapsed: boolean = false) => (
        <div className="space-y-1.5">
            {navEntries.map((entry) => {
                if (entry.type === 'link') {
                    const item = entry.item;
                    const Icon = item.icon;
                    const active = isItemActive(item.href);

                    if (isCollapsed) {
                        return (
                            <div key={item.href} className="relative group flex justify-center">
                                <Link
                                    href={item.href}
                                    data-nav-active={active ? 'true' : undefined}
                                    onClick={() => setCollapsedFlyout(null)}
                                    title={`${getName(item)}${getSecondaryName(item) ? ` (${getSecondaryName(item)})` : ''} ${
                                        item.shortcut ? `[${item.shortcut}]` : ''
                                    }`}
                                    className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all border relative ${
                                        active
                                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-md shadow-amber-500/20 ring-1 ring-amber-500/40'
                                            : item.highlight
                                            ? 'text-zinc-300 hover:text-white bg-zinc-900/60 hover:bg-zinc-800 border-zinc-800/80 hover:border-zinc-700'
                                            : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border-transparent'
                                    }`}
                                >
                                    <Icon
                                        className={`w-5 h-5 transition-transform group-hover:scale-110 ${
                                            active
                                                ? 'text-amber-400'
                                                : item.highlight
                                                ? 'text-amber-400/90'
                                                : 'text-zinc-400 group-hover:text-zinc-200'
                                        }`}
                                    />

                                    {/* Mini shortcut badge */}
                                    {item.shortcut && (
                                        <span
                                            className={`absolute -top-1 -right-1 font-mono text-[9px] font-bold px-1 rounded-full leading-tight border ${
                                                active
                                                    ? 'bg-amber-400 text-zinc-950 border-amber-300'
                                                    : 'bg-zinc-800 text-amber-400 border-zinc-700'
                                            }`}
                                        >
                                            {item.shortcut}
                                        </span>
                                    )}
                                </Link>

                                {/* Floating Tooltip flyout on hover (hidden if a group flyout is open) */}
                                <div
                                    className={`hidden ${
                                        collapsedFlyout ? '' : 'group-hover:flex'
                                    } absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-zinc-900/95 border border-zinc-700/90 rounded-xl shadow-2xl text-xs whitespace-nowrap z-50 pointer-events-none flex-col backdrop-blur-md`}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className={`font-semibold text-white ${language === 'km' ? 'font-khmer' : ''}`}>
                                            {getName(item)}
                                        </span>
                                        {item.shortcut && (
                                            <kbd className="font-mono text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                                {item.shortcut}
                                            </kbd>
                                        )}
                                    </div>
                                    {getSecondaryName(item) && (
                                        <span className={`text-[11px] text-zinc-300 mt-0.5 leading-normal ${language === 'km' ? '' : 'font-khmer'}`}>
                                            {getSecondaryName(item)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    }

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            data-nav-active={active ? 'true' : undefined}
                            onClick={() => setMobileMenuOpen(false)}
                            className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group border ${
                                active
                                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-sm font-semibold'
                                    : item.highlight
                                    ? 'text-zinc-300 hover:text-white bg-zinc-900/50 hover:bg-zinc-850 border-zinc-800/80 hover:border-zinc-700'
                                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border-transparent'
                            }`}
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                {active && (
                                    <span className="w-1.5 h-4 rounded-full bg-amber-400 shrink-0 shadow-xs shadow-amber-400/80 -ml-1" />
                                )}
                                <Icon
                                    className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                                        active
                                            ? 'text-amber-400'
                                            : item.highlight
                                            ? 'text-amber-400/80'
                                            : 'text-zinc-400 group-hover:text-zinc-200'
                                    }`}
                                />
                                <div className="flex flex-col text-left min-w-0">
                                    <span className={`leading-snug truncate ${language === 'km' ? 'font-khmer font-medium text-[12.5px]' : ''}`}>
                                        {getName(item)}
                                    </span>
                                    {getSecondaryName(item) && (
                                        <span
                                            className={`text-[11px] leading-normal mt-0.5 truncate ${language === 'km' ? '' : 'font-khmer'} ${
                                                active
                                                    ? 'text-amber-400/90 font-medium'
                                                    : 'text-zinc-400 group-hover:text-zinc-300'
                                            }`}
                                        >
                                            {getSecondaryName(item)}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {item.shortcut && (
                                <kbd
                                    className={`font-mono text-[9px] px-1.5 py-0.5 rounded leading-none shrink-0 ${
                                        active
                                            ? 'bg-amber-400 text-zinc-950 font-bold'
                                            : 'bg-zinc-800 text-amber-400 border border-zinc-700'
                                    }`}
                                >
                                    {item.shortcut}
                                </kbd>
                            )}
                        </Link>
                    );
                }

                // entry.type === 'group'
                const group = entry.group;
                const GroupIcon = group.icon;
                const isGroupActive = group.children.some((child) => isItemActive(child.href));
                const isOpen = !!openGroups[group.id];

                if (isCollapsed) {
                    const isFlyoutOpen = collapsedFlyout === group.id;

                    return (
                        <div
                            key={group.id}
                            data-collapsed-group={group.id}
                            className={`relative group flex justify-center ${
                                isFlyoutOpen ? 'z-50' : 'hover:z-50'
                            }`}
                        >
                            <button
                                type="button"
                                onClick={() => {
                                    setUserMenuOpen(false);
                                    setCollapsedFlyout((prev) => (prev === group.id ? null : group.id));
                                }}
                                aria-expanded={isFlyoutOpen}
                                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all border relative cursor-pointer ${
                                    isFlyoutOpen || isGroupActive
                                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-md shadow-amber-500/20 ring-1 ring-amber-500/40'
                                        : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border-transparent'
                                }`}
                                title={`${group.name} (${group.khmerName || ''})`}
                            >
                                <GroupIcon
                                    className={`w-5 h-5 transition-transform group-hover:scale-110 ${
                                        isFlyoutOpen || isGroupActive ? 'text-amber-400' : 'text-zinc-400 group-hover:text-zinc-200'
                                    }`}
                                />
                                {isGroupActive && (
                                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-zinc-950 shadow-xs shadow-amber-400/80" />
                                )}
                            </button>

                            {/* Minimal & Ergonomic Floating Sub-menu */}
                            <div
                                className={`${
                                    isFlyoutOpen ? 'flex' : 'hidden group-hover:flex'
                                } absolute left-full ml-3 top-1/2 -translate-y-1/2 w-60 bg-zinc-900/98 border border-zinc-700/90 rounded-2xl shadow-xl p-2 z-50 backdrop-blur-xl flex-col animate-in fade-in zoom-in-95 duration-150 before:absolute before:-left-6 before:top-0 before:bottom-0 before:w-7`}
                            >
                                {/* Little Caret Arrow pointing back to the icon */}
                                <div
                                    data-collapsed-flyout-arrow=""
                                    className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-zinc-900 border-l border-b border-zinc-700/90 rotate-45 pointer-events-none rounded-[1px]"
                                />

                                {/* Sleek Minimal Header */}
                                <div className="px-2.5 pt-1 pb-2 border-b border-zinc-800/70 flex items-center justify-between text-[11px] font-semibold tracking-wide text-zinc-400">
                                    <div className="flex items-center gap-1.5 truncate">
                                        <GroupIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                        <span className={`truncate ${language === 'km' ? 'font-khmer font-medium' : ''}`}>{getName(group)}</span>
                                    </div>
                                    {getSecondaryName(group) && (
                                        <span className={`text-[10.5px] text-zinc-500 font-normal shrink-0 ml-1.5 ${language === 'km' ? '' : 'font-khmer'}`}>
                                            {getSecondaryName(group)}
                                        </span>
                                    )}
                                </div>

                                {/* Ergonomic Clickable Submenu Items */}
                                <div className="pt-1 space-y-1">
                                    {group.children.map((child) => {
                                        const ChildIcon = child.icon;
                                        const childActive = isItemActive(child.href);
                                        return (
                                            <Link
                                                key={child.href}
                                                href={child.href}
                                                data-nav-active={childActive ? 'true' : undefined}
                                                onClick={() => {
                                                    setCollapsedFlyout(null);
                                                    setMobileMenuOpen(false);
                                                }}
                                                className={`group/item flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-all cursor-pointer ${
                                                    childActive
                                                        ? 'bg-amber-500/15 text-amber-300 font-semibold border border-amber-500/30 shadow-xs'
                                                        : 'text-zinc-300 hover:text-white hover:bg-zinc-800/80 border border-transparent font-medium'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <ChildIcon
                                                        className={`w-4 h-4 shrink-0 transition-colors ${
                                                            childActive
                                                                ? 'text-amber-400'
                                                                : 'text-zinc-400 group-hover/item:text-amber-300'
                                                        }`}
                                                    />
                                                    <div className="flex flex-col min-w-0">
                                                        <span className={`truncate leading-tight text-[12px] font-medium ${language === 'km' ? 'font-khmer' : ''}`}>
                                                            {getName(child)}
                                                        </span>
                                                        {getSecondaryName(child) && (
                                                            <span className={`truncate text-[10.5px] text-zinc-400 group-hover/item:text-zinc-300 leading-normal mt-0.5 ${language === 'km' ? '' : 'font-khmer'}`}>
                                                                {getSecondaryName(child)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {childActive ? (
                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 shadow-xs shadow-amber-400/50" />
                                                ) : (
                                                    <ChevronRight className="w-3.5 h-3.5 text-zinc-600 opacity-0 -translate-x-1 group-hover/item:opacity-80 group-hover/item:translate-x-0 group-hover/item:text-amber-300 transition-all shrink-0" />
                                                )}
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    );
                }

                return (
                    <div key={group.id} className="space-y-1">
                        {/* Group Header Button */}
                        <button
                            type="button"
                            onClick={() => toggleGroup(group.id)}
                            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group cursor-pointer border ${
                                isGroupActive
                                    ? 'text-zinc-200 bg-zinc-900/60 border-zinc-800/80'
                                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border-transparent'
                            }`}
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <GroupIcon
                                    className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-105 ${
                                        isGroupActive ? 'text-amber-400/90' : 'text-zinc-400 group-hover:text-zinc-300'
                                    }`}
                                />
                                <div className="flex flex-col text-left min-w-0">
                                    <span className={`leading-snug truncate ${language === 'km' ? 'font-khmer font-medium text-[12.5px]' : ''}`}>
                                        {getName(group)}
                                    </span>
                                    {getSecondaryName(group) && (
                                        <span className={`text-[11px] leading-normal mt-0.5 truncate text-zinc-500 group-hover:text-zinc-400 ${language === 'km' ? '' : 'font-khmer'}`}>
                                            {getSecondaryName(group)}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                <span
                                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full border ${
                                        isGroupActive
                                            ? 'bg-zinc-800 text-zinc-300 border-zinc-700/80'
                                            : 'bg-zinc-800 text-zinc-400 border-zinc-700/60'
                                    }`}
                                >
                                    {group.children.length}
                                </span>
                                <ChevronDown
                                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                                        isOpen ? 'rotate-180 text-zinc-300' : 'text-zinc-500'
                                    }`}
                                />
                            </div>
                        </button>

                        {/* Collapsible Sub-menu items */}
                        {isOpen && (
                            <div className="ml-4 pl-3 border-l-2 border-zinc-800/80 space-y-1 py-1 animate-in fade-in-50 duration-150">
                                {group.children.map((child) => {
                                    const ChildIcon = child.icon;
                                    const childActive = isItemActive(child.href);
                                    return (
                                        <Link
                                            key={child.href}
                                            href={child.href}
                                            data-nav-active={childActive ? 'true' : undefined}
                                            onClick={() => setMobileMenuOpen(false)}
                                            className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all group border ${
                                                childActive
                                                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-sm font-semibold'
                                                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border-transparent font-medium'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                {childActive && (
                                                    <span className="w-1.5 h-3.5 rounded-full bg-amber-400 shrink-0 shadow-xs shadow-amber-400/80 -ml-1" />
                                                )}
                                                <ChildIcon
                                                    className={`w-3.5 h-3.5 shrink-0 transition-transform group-hover:scale-110 ${
                                                        childActive ? 'text-amber-400' : 'text-zinc-400 group-hover:text-zinc-200'
                                                    }`}
                                                />
                                                <div className="flex flex-col text-left min-w-0">
                                                    <span className={`leading-snug truncate text-[11.5px] ${language === 'km' ? 'font-khmer' : ''}`}>
                                                        {getName(child)}
                                                    </span>
                                                    {getSecondaryName(child) && (
                                                        <span
                                                            className={`text-[10.5px] leading-normal truncate ${language === 'km' ? '' : 'font-khmer'} ${
                                                                childActive ? 'text-amber-400/90' : 'text-zinc-400 group-hover:text-zinc-300'
                                                            }`}
                                                        >
                                                            {getSecondaryName(child)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );

    const renderProfileFooter = (isMobile = false) => (
        <div
            id={isMobile ? 'mobile-user-profile-menu-container' : 'user-profile-menu-container'}
            className="p-3 border-t border-zinc-800/80 bg-zinc-950 relative"
        >
            {/* Popover User Menu when 3-dots clicked */}
            {userMenuOpen && (
                <div className="absolute bottom-[calc(100%+8px)] left-3 right-3 bg-zinc-900 border border-zinc-700/90 rounded-2xl shadow-2xl p-2 z-50 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2">
                    <div className="px-3 py-2 border-b border-zinc-800">
                        <div className="text-xs font-bold text-white truncate">{user?.name || 'Mohammed Ali'}</div>
                        <div className="text-[10px] text-zinc-400 capitalize truncate mt-0.5">{displayRole} • @{user?.username || 'cashier'}</div>
                    </div>
                    <div className="py-1">
                        <Link
                            href="/settings"
                            onClick={() => {
                                setUserMenuOpen(false);
                                if (isMobile) setMobileMenuOpen(false);
                            }}
                            className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                        >
                            <Settings className="w-3.5 h-3.5 text-zinc-400" />
                            <span>{tr('ការកំណត់ / Settings')}</span>
                        </Link>
                        <Link
                            href="/periods"
                            onClick={() => {
                                setUserMenuOpen(false);
                                if (isMobile) setMobileMenuOpen(false);
                            }}
                            className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                        >
                            <ReceiptText className="w-3.5 h-3.5 text-zinc-400" />
                            <span>{tr('វគ្គលក់ / Shifts & Sessions')}</span>
                        </Link>
                        <button
                            type="button"
                            onClick={() => {
                                setUserMenuOpen(false);
                                setHelpModalOpen(true);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors text-left cursor-pointer"
                        >
                            <HelpCircle className="w-3.5 h-3.5 text-zinc-400" />
                            <span>{tr('ជំនួយ & ផ្លូវកាត់ / Shortcuts')}</span>
                        </button>
                    </div>
                    <div className="pt-1 border-t border-zinc-800">
                        <button
                            id="logout-trigger-desktop"
                            type="button"
                            onClick={() => {
                                setUserMenuOpen(false);
                                handleLogout();
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                        >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>{tr('ចាកចេញ / Log Out')}</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Profile Card UI (Matching user reference mockup) */}
            <div className="bg-zinc-900/90 border border-zinc-800/90 rounded-2xl p-3 shadow-md">
                {/* Row 1: Circular Avatar (MA), Name & Role, 3-dots */}
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        {/* Circular Avatar with Initials */}
                        <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-xs font-bold text-zinc-100 shrink-0 shadow-inner tracking-wider">
                            {getInitials(user?.name)}
                        </div>

                        {/* Name and Role */}
                        <div className="min-w-0 flex-1">
                            <div className="text-sm font-bold text-white truncate leading-snug">
                                {user?.name || 'Mohammed Ali'}
                            </div>
                            <div className="text-xs text-zinc-400 capitalize leading-tight mt-0.5 font-medium">
                                {displayRole}
                            </div>
                        </div>
                    </div>

                    {/* Three-dots options button */}
                    <button
                        id="user-menu-trigger-desktop"
                        type="button"
                        onClick={() => setUserMenuOpen(!userMenuOpen)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
                            userMenuOpen ? 'text-white bg-zinc-800' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80'
                        }`}
                        title={tr("ជម្រើស")}
                    >
                        <MoreVertical className="w-4 h-4" />
                    </button>
                </div>

                {/* Row 2: Moon icon, Help icon, Language toggle switch */}
                <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-zinc-800/70">
                    {/* Left: Moon, Fullscreen & Help */}
                    <div className="flex items-center gap-1.5">
                        <button
                            id="theme-toggle-btn"
                            type="button"
                            onClick={toggleTheme}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                isDark ? 'text-zinc-300 hover:text-amber-400 hover:bg-zinc-800/80' : 'text-amber-500 hover:bg-amber-500/10'
                            }`}
                            title={isDark ? 'Dark Theme Active (ចុចដើម្បីប្តូរទៅ Light Mode)' : 'Light Theme Active (ចុចដើម្បីប្តូរទៅ Dark Mode)'}
                        >
                            {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                        </button>

                        <button
                            id="fullscreen-toggle-btn"
                            type="button"
                            onClick={toggleFullscreen}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                isFullscreen
                                    ? 'text-amber-400 bg-amber-500/15 border border-amber-500/30'
                                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80'
                            }`}
                            title={isFullscreen ? tr('ចេញពីពេញអេក្រង់ (Exit Fullscreen)') : tr('ពង្រីកពេញអេក្រង់ (Fullscreen)')}
                        >
                            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                        </button>

                        <button
                            type="button"
                            onClick={() => setHelpModalOpen(true)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 transition-colors cursor-pointer"
                            title={tr("Help & Shortcuts / ជំនួយ")}
                        >
                            <HelpCircle className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Right: Modern 2-Language Segmented Switch [ ខ្មែរ | EN ] */}
                    <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 shadow-xs">
                        <button
                            type="button"
                            onClick={() => setLanguage('km')}
                            className={`px-2.5 py-1 text-xs rounded-md transition-all cursor-pointer font-khmer ${
                                language === 'km'
                                    ? 'bg-amber-500 text-zinc-950 font-bold shadow-sm'
                                    : 'text-zinc-400 hover:text-zinc-200 font-medium'
                            }`}
                            title="ប្តូរទៅ ភាសាខ្មែរ"
                        >
                            ខ្មែរ
                        </button>
                        <button
                            type="button"
                            onClick={() => setLanguage('en')}
                            className={`px-2.5 py-1 text-xs rounded-md transition-all cursor-pointer font-sans ${
                                language === 'en'
                                    ? 'bg-amber-500 text-zinc-950 font-bold shadow-sm'
                                    : 'text-zinc-400 hover:text-zinc-200 font-medium'
                            }`}
                            title="Switch to English"
                        >
                            EN
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className={`bg-zinc-950 text-zinc-100 flex flex-col md:flex-row font-sans ${
            isPosPage ? 'h-screen max-h-screen overflow-hidden' : 'min-h-screen'
        }`}>
            {title && <Head title={title} />}
            <PrintQueue />

            {/* Mobile Top Header (< md screens) */}
            <header className="md:hidden sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/95 backdrop-blur-xl h-14 px-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <button
                        type="button"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white cursor-pointer"
                        aria-label={tr("បើក/បិទម៉ឺនុយ")}
                    >
                        {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                    <Link href="/dashboard" className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center">
                            <ReceiptText className="w-4 h-4 text-zinc-950 stroke-[2.5]" />
                        </div>
                        <span className="font-bold text-sm text-white font-khmer truncate max-w-[150px] leading-normal py-0.5">
                            {business.business_name_primary || 'លៀសហាល អ៉ីទុម'}
                        </span>
                    </Link>
                </div>

                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={toggleFullscreen}
                        className={`p-1.5 rounded-lg border transition-colors cursor-pointer h-8 w-8 flex items-center justify-center ${
                            isFullscreen
                                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                                : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white'
                        }`}
                        title={isFullscreen ? tr('ចេញពីពេញអេក្រង់ (Exit Fullscreen)') : tr('ពង្រីកពេញអេក្រង់ (Fullscreen)')}
                    >
                        {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                    </button>
                    <span className="text-[11px] font-mono text-emerald-400 bg-zinc-900 px-2 py-1 rounded border border-zinc-800">
                        {currentTime}
                    </span>
                    <Button
                        id="logout-trigger-mobile"
                        variant="ghost"
                        size="sm"
                        onClick={handleLogout}
                        title={tr("ចាកចេញ")}
                        className="text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 p-1.5 h-8 w-8 cursor-pointer"
                    >
                        <LogOut className="w-4 h-4" />
                    </Button>
                </div>
            </header>

            {/* Mobile Drawer Backdrop & Menu */}
            {mobileMenuOpen && (
                <div className="md:hidden fixed inset-0 z-50 flex">
                    <div
                        className="fixed inset-0 bg-black/75 backdrop-blur-sm"
                        onClick={() => setMobileMenuOpen(false)}
                    />
                    <div className="relative w-72 max-w-[85vw] bg-zinc-950 border-r border-zinc-800 h-full flex flex-col justify-between z-10 p-4">
                        <div>
                            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center">
                                        <ReceiptText className="w-4 h-4 text-zinc-950 stroke-[2.5]" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-sm text-white font-khmer">
                                            {business.business_name_primary || 'លៀសហាល អ៉ីទុម'}
                                        </span>
                                        <span className="text-[10px] text-zinc-400 font-mono">
                                            V2.0 POS
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="p-1 rounded text-zinc-400 hover:text-white"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="py-4">
                                <div className="px-2 pb-2 text-[10px] font-mono tracking-wider uppercase text-zinc-400 font-semibold">
                                    {tr('Menu / ម៉ឺនុយ')}
                                </div>
                                {renderNavLinks(false)}
                            </div>
                        </div>

                        {/* Mobile Drawer Bottom */}
                        <div className="pt-2">
                            {renderProfileFooter(true)}
                        </div>
                    </div>
                </div>
            )}

            {/* Desktop Left Sidebar (>= md screens) with Minimal Collapse Support */}
            <aside
                className={`hidden md:flex flex-col justify-between ${
                    collapsed ? 'w-20' : 'w-64'
                } shrink-0 bg-zinc-950 border-r border-zinc-800/80 h-screen sticky top-0 z-[60] select-none transition-all duration-200 ease-in-out`}
            >
                {/* Brand & Location Header / Collapse Controls */}
                {collapsed ? (
                    <div className="p-3 border-b border-zinc-800/80 flex flex-col items-center gap-2.5">
                        <Link
                            href="/dashboard"
                            title={`${business.business_name_primary || 'លៀសហាល អ៉ីទុម'} V2.0`}
                            className="group"
                        >
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                                <ReceiptText className="w-5 h-5 text-zinc-950 stroke-[2.5]" />
                            </div>
                        </Link>
                        <button
                            id="sidebar-expand-btn"
                            type="button"
                            onClick={toggleCollapsed}
                            title={tr("ពង្រីកម៉ឺនុយ / Expand sidebar (Ctrl+B)")}
                            className="p-2 rounded-xl text-zinc-400 hover:text-amber-400 hover:bg-zinc-900 border border-zinc-800 bg-zinc-900/60 shadow-sm transition-colors cursor-pointer"
                        >
                            <PanelLeftOpen className="w-4 h-4" />
                        </button>
                    </div>
                ) : (
                    <div className="p-4 border-b border-zinc-800/80">
                        <div className="flex items-center justify-between gap-2">
                            <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0 group">
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform shrink-0">
                                    <ReceiptText className="w-5 h-5 text-zinc-950 stroke-[2.5]" />
                                </div>
                                <div className="flex flex-col justify-center min-w-0 flex-1">
                                    <span className="font-bold text-white text-sm font-khmer leading-snug py-0.5 whitespace-nowrap">
                                        {business.business_name_primary || 'លៀសហាល អ៉ីទុម'}
                                    </span>
                                    <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-mono leading-tight mt-0.5">
                                        <span className="truncate">{business.business_name_secondary || 'LEASHAL ETUM POS'}</span>
                                        <span className="text-[9px] font-mono uppercase bg-emerald-500/10 text-emerald-400 px-1 py-0.2 rounded border border-emerald-500/20 whitespace-nowrap shrink-0">
                                            V2.0
                                        </span>
                                    </div>
                                </div>
                            </Link>

                            <button
                                id="sidebar-collapse-btn"
                                type="button"
                                onClick={toggleCollapsed}
                                title={tr("បង្រួមម៉ឺនុយ / Collapse sidebar (Ctrl+B)")}
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-400 hover:bg-zinc-900 border border-zinc-800/80 bg-zinc-900/60 shadow-sm transition-colors shrink-0 cursor-pointer"
                            >
                                <PanelLeftClose className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Location Badge */}
                        <div className="mt-3 flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-zinc-900/90 border border-zinc-800/80 text-xs text-zinc-400">
                            <div className="flex items-center gap-2 min-w-0">
                                <Store className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                <span className="truncate text-[11px] text-zinc-300">{tr('ហាងមេ')}</span>
                            </div>
                            <span className="font-mono text-[10px] text-zinc-400 shrink-0 bg-zinc-800/80 px-1.5 py-0.5 rounded border border-zinc-750">
                                LOC-01
                            </span>
                        </div>
                    </div>
                )}

                {/* Left Navigation Menu Links */}
                <nav
                    ref={sidebarNavRef}
                    onScroll={handleSidebarScroll}
                    className={`flex-1 ${collapsed ? 'px-2 py-3 overflow-visible' : 'px-3 py-4 overflow-y-auto overscroll-contain'} space-y-3`}
                >
                    {!collapsed && (
                        <div className="px-2 text-[10px] font-mono tracking-wider uppercase text-zinc-400 font-semibold flex items-center justify-between">
                            <span className="font-khmer">{tr('ម៉ឺនុយ')}</span>
                        </div>
                    )}
                    {renderNavLinks(collapsed)}
                </nav>

                {/* Bottom Status, Clock, User Profile & Logout */}
                {collapsed ? (
                    <div id="user-profile-menu-container" className="p-2 border-t border-zinc-800/80 space-y-2 bg-zinc-950 flex flex-col items-center relative">
                        {userMenuOpen && (
                            <div className="absolute bottom-[calc(100%+8px)] left-2 w-52 bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl p-2 z-50 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2">
                                <div className="px-3 py-2 border-b border-zinc-800">
                                    <div className="text-xs font-bold text-white truncate">{user?.name || 'Mohammed Ali'}</div>
                                    <div className="text-[10px] text-zinc-400 capitalize truncate mt-0.5">{displayRole} • @{user?.username || 'cashier'}</div>
                                </div>
                                <div className="py-1">
                                    <Link
                                        href="/settings"
                                        onClick={() => setUserMenuOpen(false)}
                                        className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                                    >
                                        <Settings className="w-3.5 h-3.5 text-zinc-400" />
                                        <span>{tr('ការកំណត់ / Settings')}</span>
                                    </Link>
                                    <Link
                                        href="/periods"
                                        onClick={() => setUserMenuOpen(false)}
                                        className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                                    >
                                        <ReceiptText className="w-3.5 h-3.5 text-zinc-400" />
                                        <span>{tr('វគ្គលក់ / Shifts')}</span>
                                    </Link>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setUserMenuOpen(false);
                                            setHelpModalOpen(true);
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors text-left cursor-pointer"
                                    >
                                        <HelpCircle className="w-3.5 h-3.5 text-zinc-400" />
                                        <span>{tr('ជំនួយ / Help')}</span>
                                    </button>
                                </div>
                                <div className="pt-1 border-t border-zinc-800">
                                    <button
                                        id="logout-trigger-collapsed"
                                        type="button"
                                        onClick={() => {
                                            setUserMenuOpen(false);
                                            handleLogout();
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                                    >
                                        <LogOut className="w-3.5 h-3.5" />
                                        <span>{tr('ចាកចេញ / Log Out')}</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Compact Avatar with Initials */}
                        <div
                            className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-xs font-bold text-zinc-100 cursor-pointer shadow-inner hover:ring-2 hover:ring-amber-500/40 transition-all tracking-wider"
                            onClick={() => {
                                setCollapsedFlyout(null);
                                setUserMenuOpen(!userMenuOpen);
                            }}
                            title={`${user?.name || 'Mohammed Ali'} (${displayRole}) - Click for menu`}
                        >
                            {getInitials(user?.name)}
                        </div>

                        {/* Compact Language Toggle (KM / EN) */}
                        <button
                            type="button"
                            onClick={toggleLanguage}
                            title={language === 'km' ? 'ប្តូរទៅ English' : 'Switch to ខ្មែរ'}
                            className="w-8 h-8 rounded-lg text-xs font-bold text-amber-400 hover:bg-zinc-800/80 flex items-center justify-center cursor-pointer transition-colors font-mono border border-zinc-800"
                        >
                            {language === 'km' ? 'ខ្មែរ' : 'EN'}
                        </button>

                        {/* Compact Moon / Sun Toggle */}
                        <button
                            id="collapsed-theme-toggle-btn"
                            type="button"
                            onClick={toggleTheme}
                            title={isDark ? tr("Dark Theme Active (ចុចសម្រាប់ Light Mode)") : tr("Light Theme Active (ចុចសម្រាប់ Dark Mode)")}
                            className="w-8 h-8 rounded-lg text-zinc-400 hover:text-amber-400 hover:bg-zinc-800/80 flex items-center justify-center cursor-pointer transition-colors"
                        >
                            {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                        </button>

                        {/* Compact Fullscreen Toggle */}
                        <button
                            id="collapsed-fullscreen-toggle-btn"
                            type="button"
                            onClick={toggleFullscreen}
                            title={isFullscreen ? tr("ចេញពីពេញអេក្រង់ (Exit Fullscreen)") : tr("ពង្រីកពេញអេក្រង់ (Fullscreen)")}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
                                isFullscreen
                                    ? 'text-amber-400 bg-amber-500/15'
                                    : 'text-zinc-400 hover:text-amber-400 hover:bg-zinc-800/80'
                            }`}
                        >
                            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                        </button>

                        {/* Compact Help Button */}
                        <button
                            type="button"
                            onClick={() => setHelpModalOpen(true)}
                            title={tr("ជំនួយ & ផ្លូវកាត់")}
                            className="w-8 h-8 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 flex items-center justify-center cursor-pointer transition-colors"
                        >
                            <HelpCircle className="w-4 h-4" />
                        </button>
                    </div>
                ) : (
                    renderProfileFooter(false)
                )}
            </aside>

            {/* Right Side: Main Content & Workspace */}
            <div className={`flex-1 flex flex-col min-w-0 ${isPosPage ? 'h-screen max-h-screen overflow-hidden' : 'min-h-screen'}`}>
                {/* Flash notification banner */}
                {flashVisible && (flash?.success || flash?.error || flash?.warning) && (
                    <div className={isPosPage ? "fixed top-3 right-4 z-50 max-w-md w-full shadow-2xl animate-in slide-in-from-top-2" : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 w-full page-transition"}>
                        {flash.success && (
                            <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-200 text-sm shadow-lg shadow-emerald-950/40">
                                <div className="flex items-center gap-2.5">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                    <span>{flash.success}</span>
                                </div>
                                <button
                                    onClick={() => setFlashVisible(false)}
                                    className="text-emerald-400 hover:text-emerald-200"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                        {flash.error && (
                            <div className="flex items-center justify-between p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/30 text-rose-200 text-sm shadow-lg shadow-rose-950/40">
                                <div className="flex items-center gap-2.5">
                                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                                    <span>{flash.error}</span>
                                </div>
                                <button
                                    onClick={() => setFlashVisible(false)}
                                    className="text-rose-400 hover:text-rose-200"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Main Content Area */}
                <main
                    className={`flex-1 min-h-0 w-full ${
                        isPosPage
                            ? 'p-0 max-w-none h-full overflow-hidden'
                            : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'
                    }`}
                >
                    <div key={currentPath} className={`page-transition ${isPosPage ? 'h-full overflow-hidden' : 'h-full'}`}>
                        {children}
                    </div>
                </main>

                {/* POS Footer (hidden on POS Terminal page for maximal workspace) */}
                {!isPosPage && (
                    <footer className="border-t border-zinc-900 bg-zinc-950/90 py-4 text-center text-xs text-zinc-600 mt-auto">
                        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
                            <div>
                                {business.business_name_primary} • {business.phone}
                            </div>
                            <div className="text-[11px] font-mono text-zinc-500">
                                © {new Date().getFullYear()} THORNG VANTHIEV. All rights reserved.
                            </div>
                        </div>
                    </footer>
                )}
            </div>

            {/* Help & POS Shortcuts Full-Workspace Suite */}
            {mounted && helpModalOpen && createPortal(
                <div
                    className="fixed inset-y-0 right-0 left-0 md:left-[var(--sidebar-width,16rem)] z-50 flex flex-col bg-zinc-50 dark:bg-zinc-950 overflow-hidden select-none animate-in fade-in duration-150 h-screen"
                    onWheel={(e) => e.stopPropagation()}
                >
                    {/* Header Bar */}
                    <div className="h-16 px-6 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between shrink-0 shadow-xs">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                                <HelpCircle className="w-5 h-5 text-amber-500" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 font-khmer">
                                        {tr('មជ្ឈមណ្ឌលជំនួយ & ផ្លូវកាត់ក្តារចុច (POS System Guide & Shortcuts)')}
                                    </h2>
                                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                        REFERENCE SUITE V2.0
                                    </span>
                                </div>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-khmer flex items-center gap-2">
                                    <span>{tr('មគ្គុទ្ទេសក៍ប្រតិបត្តិការរហ័ស • POS High-Speed Shortcuts & Operational Reference')}</span>
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => setHelpModalOpen(false)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-xs font-semibold font-khmer transition-all cursor-pointer shadow-xs"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span>{tr('ត្រឡប់ក្រោយ')}</span>
                        </button>
                    </div>

                    {/* Content Area - 2 Columns */}
                    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                        {/* Left Column: Shortcuts, Dual-Currency Guide, Thermal Printer Guide */}
                        <div className="w-full lg:w-7/12 p-6 lg:p-8 space-y-6 overflow-y-auto">
                            {/* Hotkeys Matrix */}
                            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-xs">
                                <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
                                    <div className="flex items-center gap-2">
                                        <Keyboard className="w-4 h-4 text-amber-500" />
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 font-khmer">
                                            {tr('ផ្លូវកាត់ក្តារចុចសំខាន់ៗ (Core POS Keyboard Shortcuts)')}
                                        </h4>
                                    </div>
                                    <span className="text-[10px] font-mono text-zinc-400">F2 • Esc • Ctrl+B</span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
                                        <div>
                                            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 font-khmer block">
                                                {tr('បញ្ជាទិញថ្មី (New POS Order)')}
                                            </span>
                                            <span className="text-[11px] text-zinc-500 dark:text-zinc-400">{tr('បើកផ្ទាំងគិតលុយលឿន')}</span>
                                        </div>
                                        <kbd className="px-2.5 py-1 text-xs font-mono font-bold rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                            F2
                                        </kbd>
                                    </div>

                                    <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
                                        <div>
                                            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 font-khmer block">
                                                {tr('គិតលុយ (Checkout / Pay)')}
                                            </span>
                                            <span className="text-[11px] text-zinc-500 dark:text-zinc-400">{tr('បើកផ្ទាំងទូទាត់ប្រាក់')}</span>
                                        </div>
                                        <kbd className="px-2.5 py-1 text-xs font-mono font-bold rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                            F8
                                        </kbd>
                                    </div>

                                    <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
                                        <div>
                                            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 font-khmer block">
                                                {tr('បង្រួម/ពង្រីក Sidebar')}
                                            </span>
                                            <span className="text-[11px] text-zinc-500 dark:text-zinc-400">{tr('ផ្លាស់ប្តូរទំហំម៉ឺនុយ')}</span>
                                        </div>
                                        <kbd className="px-2.5 py-1 text-xs font-mono font-bold rounded-lg bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700">
                                            Ctrl+B / ⌘+B
                                        </kbd>
                                    </div>

                                    <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
                                        <div>
                                            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 font-khmer block">
                                                {tr('ត្រឡប់ក្រោយ / បោះបង់')}
                                            </span>
                                            <span className="text-[11px] text-zinc-500 dark:text-zinc-400">{tr('បិទ Workspace ឬ Modal')}</span>
                                        </div>
                                        <kbd className="px-2.5 py-1 text-xs font-mono font-bold rounded-lg bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700">
                                            Esc
                                        </kbd>
                                    </div>
                                </div>
                            </div>

                            {/* Dual-Currency POS System Guide */}
                            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3.5 shadow-xs">
                                <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
                                    <Coins className="w-4 h-4 text-emerald-500" />
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 font-khmer">
                                        {tr('ប្រព័ន្ធគណនាលុយពីររូបិយប័ណ្ណ (Dual-Currency Pricing & Settlement)')}
                                    </h4>
                                </div>

                                <div className="space-y-3 text-xs text-zinc-600 dark:text-zinc-400 font-khmer">
                                    <p className="leading-relaxed">
                                        {tr('ប្រព័ន្ធគាំទ្រការទូទាត់ប្រាក់ដុល្លារអាមេរិក ($) និងប្រាក់រៀលកម្ពុជា (៛) ដោយស្វ័យប្រវត្តិតាមអត្រាប្តូរប្រាក់ផ្លូវការដែលបានកំណត់ក្នុង Settings។')}
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                                        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-200">
                                            <div className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 font-sans">
                                                {tr('អត្រាប្តូរប្រាក់គោល (Base Rate)')}
                                            </div>
                                            <div className="text-sm font-bold mt-0.5">1 USD = {(business?.exchange_rate_khr || 4000).toLocaleString()} KHR</div>
                                        </div>
                                        <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-900 dark:text-blue-200">
                                            <div className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 font-sans">
                                                {tr('ក្បួនបង្គត់លុយអាប់ (Rounding Policy)')}
                                            </div>
                                            <div className="text-sm font-bold mt-0.5">{tr('បង្គត់ត្រឹម ១០០ រៀល')}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Hardware & Receipt Printing Guide */}
                            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3.5 shadow-xs">
                                <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
                                    <Printer className="w-4 h-4 text-blue-500" />
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 font-khmer">
                                        {tr('ម៉ាស៊ីនព្រីនវិក្កយបត្រកម្តៅ (Thermal Printer & Hardware Support)')}
                                    </h4>
                                </div>

                                <div className="space-y-2 text-xs text-zinc-600 dark:text-zinc-400 font-khmer leading-relaxed">
                                    <p>
                                        {tr('ប្រព័ន្ធគាំទ្រម៉ាស៊ីនព្រីនប្រភេទ Thermal ESC/POS ទំហំ')} <strong>80mm</strong> {tr('(ស្ដង់ដារ) និង')} <strong>58mm</strong> {tr('(ខ្នាតតូច) ព្រមទាំងភ្ជាប់មកជាមួយ KHQR Standard QR Code សម្រាប់ការស្កេនទូទាត់ប្រាក់ភ្លាមៗ។')}
                                    </p>
                                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                                        {tr('រាល់ការបោះពុម្ពវិក្កយបត្រឡើងវិញ នឹងត្រូវបានកត់ត្រាក្នុង Append-Only Audit Stream ដោយស្វ័យប្រវត្តិ។')}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Interactive Reference Passport */}
                        <div className="w-full lg:w-5/12 p-6 lg:p-8 bg-zinc-900 border-l border-zinc-800 text-zinc-100 flex flex-col justify-between overflow-y-auto">
                            <div className="space-y-5">
                                <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                                    <div>
                                        <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">
                                            {tr('ព័ត៌មានប្រព័ន្ធ')}
                                        </span>
                                        <h3 className="text-sm font-bold font-mono text-white">
                                            LEASHAL ETUM POS
                                        </h3>
                                    </div>
                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                        {tr('ដំណើរការ')}
                                    </span>
                                </div>

                                {/* System Info Card */}
                                <div className="space-y-2.5 text-xs font-mono border-b border-zinc-800/80 pb-4">
                                    <div className="flex items-center justify-between text-zinc-400">
                                        <span className="font-khmer">{tr('កំណែប្រព័ន្ធ (Version)៖')}</span>
                                        <span className="text-amber-400 font-bold">V2.0</span>
                                    </div>
                                    <div className="flex items-center justify-between text-zinc-400">
                                        <span className="font-khmer">{tr('ឈ្មោះហាង (Business)៖')}</span>
                                        <span className="text-white font-bold font-khmer">{business.business_name_primary || 'លៀសហាល អ៉ីទុម'}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-zinc-400">
                                        <span className="font-khmer">{tr('គណនីបច្ចុប្បន្ន៖')}</span>
                                        <span className="text-zinc-200">@{user?.username || 'admin'}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-zinc-400">
                                        <span className="font-khmer">{tr('តួនាទី (Role)៖')}</span>
                                        <span className="text-emerald-400 uppercase">{user?.role || 'admin'}</span>
                                    </div>
                                </div>

                                {/* Security Invariants Status */}
                                <div className="p-3.5 rounded-xl bg-black/40 border border-zinc-800 space-y-2 text-xs font-mono">
                                    <div className="text-[10px] text-zinc-400 uppercase font-sans font-bold mb-1">
                                        {tr('ការការពារទិន្នន័យ')}
                                    </div>
                                    <div className="flex items-center justify-between text-zinc-300">
                                        <span>{tr('វិក្កយបត្រមិនអាចកែបាន:')}</span>
                                        <span className="text-emerald-400 font-bold">{tr('បើក')}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-zinc-300">
                                        <span>{tr('Backup មាន SHA-256:')}</span>
                                        <span className="text-emerald-400 font-bold">{tr('បើក')}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-zinc-300">
                                        <span>{tr('Audit មិនអាចលុបបាន:')}</span>
                                        <span className="text-emerald-400 font-bold">{tr('បើក')}</span>
                                    </div>
                                </div>

                                {/* Quick Shortcuts Reminder Box */}
                                <div className="p-4 rounded-xl bg-zinc-800/60 border border-zinc-700/80 space-y-2 text-xs">
                                    <div className="font-bold text-amber-400 font-khmer flex items-center gap-1.5">
                                        <Sparkles className="w-4 h-4" />
                                        <span>{tr('គន្លឹះប្រើប្រាស់រហ័ស (Speed Tips)')}</span>
                                    </div>
                                    <p className="text-zinc-300 font-khmer text-[11.5px] leading-relaxed">
                                        {tr('ចុច')} <strong>F2</strong> {tr('ពីគ្រប់ទីកន្លែងក្នុងប្រព័ន្ធ ដើម្បីបើកផ្ទាំងលក់ POS ភ្លាមៗ ឬចុច')} <strong>Esc</strong> {tr('ដើម្បីត្រឡប់ក្រោយវិញ។')}
                                    </p>
                                </div>
                            </div>

                            {/* Security Stamp Footer */}
                            <div className="pt-4 border-t border-zinc-800/80 flex items-center justify-between text-[10px] font-mono text-zinc-500">
                                <span>{tr('ជំនួយប្រព័ន្ធ')}</span>
                                <span>F2 = POS</span>
                            </div>
                        </div>
                    </div>

                    {/* Footer Bar */}
                    <div className="px-6 py-3.5 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between shrink-0 shadow-sm">
                        <div className="text-xs text-zinc-500 font-khmer hidden sm:flex items-center gap-2">
                            <kbd className="px-2 py-0.5 text-[10px] font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded border border-zinc-300 dark:border-zinc-700">
                                Esc
                            </kbd>
                            <span>{tr('ដើម្បីត្រឡប់ក្រោយ / បិទមគ្គុទ្ទេសក៍')}</span>
                        </div>

                        <div className="flex items-center gap-3 ml-auto">
                            <button
                                type="button"
                                onClick={() => setHelpModalOpen(false)}
                                className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 text-xs font-bold font-khmer shadow-sm hover:shadow-amber-500/20 transition-all cursor-pointer flex items-center gap-2"
                            >
                                <Check className="w-4 h-4" />
                                <span>{tr('យល់ព្រម (Acknowledge & Close)')}</span>
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
            {/* Logout Confirmation Dialog */}
            {logoutConfirmOpen && (
                <div
                    id="logout-confirm-overlay"
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setLogoutConfirmOpen(false);
                    }}
                >
                    <div
                        id="logout-confirm-dialog"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="logout-dialog-title"
                        className="relative w-full max-w-sm sm:max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden p-5 sm:p-6 text-center select-none animate-in zoom-in-95 duration-150"
                    >
                        {/* Close 'X' Button */}
                        <button
                            id="logout-confirm-close-btn"
                            type="button"
                            onClick={() => setLogoutConfirmOpen(false)}
                            title={tr("បិទ (Close)")}
                            className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition cursor-pointer"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        {/* Visual Alert Icon */}
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-500 mx-auto mb-4 shadow-lg shadow-rose-500/10">
                            <LogOut className="w-7 h-7 sm:w-8 sm:h-8 stroke-[2.2]" />
                        </div>

                        {/* Title & Description */}
                        <h3 id="logout-dialog-title" className="text-base sm:text-lg font-bold text-zinc-100 font-khmer leading-snug">
                            {t('nav.logout_confirm_title', tr('តើអ្នកពិតជាចង់ចាកចេញមែនទេ?'))}
                        </h3>
                        <p className="text-xs text-zinc-400 font-khmer mt-2 leading-relaxed">
                            {t(
                                'nav.logout_confirm_desc',
                                tr('សូមប្រាកដថាអ្នកបានរក្សាទុក ឬទូទាត់ការកុម្ម៉ង់ទាំងអស់រួចរាល់ មុនពេលចាកចេញពីប្រព័ន្ធ។')
                            )}
                        </p>

                        {/* Logged in User Card */}
                        <div className="p-3 my-4 rounded-xl bg-zinc-800/80 border border-zinc-700/80 flex items-center justify-between gap-3 text-left">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-9 h-9 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-xs font-bold text-amber-500 shrink-0 shadow-inner tracking-wider">
                                    {getInitials(user?.name)}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-bold text-zinc-100 truncate">
                                        {user?.name || 'Administrator'}
                                    </p>
                                    <p className="text-[11px] text-zinc-400 font-khmer truncate">
                                        {displayRole} • @{user?.username || 'user'}
                                    </p>
                                </div>
                            </div>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 whitespace-nowrap shrink-0">
                                {business.business_name_primary || tr('លៀសហាល')}
                            </span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2.5 pt-2">
                            <button
                                id="logout-confirm-cancel-btn"
                                type="button"
                                onClick={() => setLogoutConfirmOpen(false)}
                                className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 hover:text-zinc-100 text-xs font-semibold font-khmer transition cursor-pointer"
                            >
                                {t('nav.logout_cancel', tr('បោះបង់ (Cancel)'))}
                            </button>
                            <button
                                id="logout-confirm-proceed-btn"
                                type="button"
                                onClick={confirmLogout}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold text-xs font-khmer transition shadow-lg shadow-rose-600/30 active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                            >
                                <LogOut className="w-3.5 h-3.5" />
                                <span>{t('nav.logout_proceed', tr('ចាកចេញពីប្រព័ន្ធ'))}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
