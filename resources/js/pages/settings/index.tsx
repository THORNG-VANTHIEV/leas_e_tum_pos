import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AppLayout } from '@/layouts/app-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useForm, usePage, router } from '@inertiajs/react';
import { PageProps, User as UserType } from '@/types';
import {
    Store,
    Sliders,
    MapPin,
    Users,
    Shield,
    Plus,
    Archive,
    RotateCcw,
    Check,
    AlertCircle,
    Calendar,
    Save,
    Database,
    Download,
    UploadCloud,
    ShieldCheck,
    AlertTriangle,
    FileArchive,
    CheckCircle2,
    Printer,
    FileText,
    ArrowLeft,
    Eye,
    EyeOff,
    KeyRound,
    UserPlus,
    Building2,
    Sparkles,
    X,
    Pencil,
} from 'lucide-react';
import { InvoiceDesigner } from './components/invoice-designer';

interface SettingsPageProps {
    settings: {
        id: number;
        business_name_primary: string;
        business_name_secondary: string | null;
        address_primary: string | null;
        address_secondary: string | null;
        phone: string | null;
        tax_identifier: string | null;
        currency_code: string;
        currency_symbol: string;
        timezone: string;
        document_footer: string | null;
        entry_settings: {
            require_source_total: boolean;
            show_event_time: boolean;
        };
    };
    users: (UserType & {
        archived_at: string | null;
        archived_reason: string | null;
    })[];
    locations: {
        id: number;
        code: string;
        name_primary: string;
        name_secondary: string | null;
        address: string | null;
        is_active: boolean;
        users_count: number;
    }[];
    audits: {
        id: number;
        action: string;
        actor?: { name: string; username: string } | null;
        reason: string | null;
        ip_address: string | null;
        created_at: string;
    }[];
}

const ROLE_CONFIG: Record<
    string,
    {
        nameKh: string;
        color: string;
        badge: string;
        gradient: string;
        description: string;
        permissions: string[];
    }
> = {
    cashier: {
        nameKh: 'បេឡាករ (Cashier)',
        color: 'text-amber-500',
        badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
        gradient: 'from-amber-900/60 via-zinc-900 to-zinc-950',
        description: 'ដំណើរការបញ្ជាទិញ បោះពុម្ពវិក្កយបត្រ និងទូទាត់ប្រាក់ក្នុងវេន',
        permissions: [
            'កត់ត្រាការលក់ & បោះពុម្ពវិក្កយបត្រ POS',
            'បើក / បិទវេន និងកត់ត្រាប្រាក់ក្នុងថតបេឡា',
            'ស្កេន KHQR & ទទួលសាច់ប្រាក់',
            'មើលមុខម្ហូប & បញ្ជីតម្លៃបច្ចុប្បន្ន',
        ],
    },
    supervisor: {
        nameKh: 'ប្រធានផ្នែក (Supervisor)',
        color: 'text-sky-500',
        badge: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
        gradient: 'from-sky-950 via-zinc-900 to-zinc-950',
        description: 'ត្រួតពិនិត្យការលក់ អនុម័តការបញ្ចុះតម្លៃ និងគ្រប់គ្រងតុ',
        permissions: [
            'សិទ្ធិទាំងអស់របស់ Cashier',
            'អនុម័តការបញ្ចុះតម្លៃ & Void / លុបមុខម្ហូប',
            'ផ្ទេរតុ បញ្ចូលតុ និងបំបែកវិក្កយបត្រ',
            'មើលរបាយការណ៍លក់ប្រចាំថ្ងៃ & បិទវេន',
        ],
    },
    admin: {
        nameKh: 'អ្នកគ្រប់គ្រងប្រព័ន្ធ (Administrator)',
        color: 'text-purple-500',
        badge: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
        gradient: 'from-purple-950 via-zinc-900 to-zinc-950',
        description: 'សិទ្ធិពេញលេញលើគ្រប់ផ្នែកនៃប្រព័ន្ធ POS និងការកំណត់',
        permissions: [
            'សិទ្ធិគ្រប់គ្រងពេញលេញ (Full System Access)',
            'បង្កើត & កែប្រែមុខម្ហូប និងស្តុកទំនិញ',
            'បង្កើតគណនីបុគ្គលិក & កំណត់សិទ្ធិ',
            'គ្រប់គ្រងវគ្គគណនេយ្យ & Backup / Restore',
        ],
    },
};

const getStaffInitials = (name: string) => {
    if (!name) return 'ST';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
};

export default function SettingsIndex({
    settings,
    users,
    locations,
    audits,
}: SettingsPageProps) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    const [showPassword, setShowPassword] = useState(false);

    const { auth } = usePage<PageProps>().props;
    const currentUser = auth.user;

    const [activeTab, setActiveTab] = useState<
        'business' | 'entry' | 'invoice' | 'locations' | 'users' | 'audits' | 'backup'
    >(() => {
        if (typeof window !== 'undefined') {
            const tabParam = new URLSearchParams(window.location.search).get('tab');
            if (tabParam && ['business', 'entry', 'invoice', 'locations', 'users', 'audits', 'backup'].includes(tabParam)) {
                return tabParam as any;
            }
        }
        return 'business';
    });

    // Backup & Restore State
    const [restoreFile, setRestoreFile] = useState<File | null>(null);
    const [isInspecting, setIsInspecting] = useState(false);
    const [inspectResult, setInspectResult] = useState<{
        valid: boolean;
        format_version?: string;
        generated_at?: string;
        tables_count?: number;
        total_rows?: number;
        total_bytes?: number;
        tables?: { name: string; row_count: number; byte_size: number; checksum_valid: boolean }[];
        error?: string;
    } | null>(null);
    const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const [restoreAck, setRestoreAck] = useState(false);

    const handleInspectArchive = async () => {
        if (!restoreFile) return;
        setIsInspecting(true);
        setInspectResult(null);
        const formData = new FormData();
        formData.append('backup_file', restoreFile);

        try {
            const token = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content;
            const res = await fetch('/settings/backup/inspect', {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': token || '',
                    'Accept': 'application/json',
                },
                body: formData,
            });
            const data = await res.json();
            if (res.ok) {
                setInspectResult(data);
            } else {
                setInspectResult({ valid: false, error: data.error || 'Inspection failed.' });
            }
        } catch (err: any) {
            setInspectResult({ valid: false, error: err.message || 'Inspection network error.' });
        } finally {
            setIsInspecting(false);
        }
    };

    const handleExecuteRestore = () => {
        if (!restoreFile) return;
        setIsRestoring(true);
        const formData = new FormData();
        formData.append('backup_file', restoreFile);

        router.post('/settings/restore', formData, {
            forceFormData: true,
            onFinish: () => {
                setIsRestoring(false);
                setShowRestoreConfirm(false);
                setRestoreAck(false);
                setRestoreFile(null);
                setInspectResult(null);
            },
        });
    };

    // Business Profile Form
    const businessForm = useForm({
        business_name_primary: settings.business_name_primary || '',
        business_name_secondary: settings.business_name_secondary || '',
        address_primary: settings.address_primary || '',
        address_secondary: settings.address_secondary || '',
        phone: settings.phone || '',
        tax_identifier: settings.tax_identifier || '',
        currency_code: settings.currency_code || 'USD',
        currency_symbol: settings.currency_symbol || '$',
        timezone: settings.timezone || 'Asia/Phnom_Penh',
        document_footer: settings.document_footer || '',
    });

    const submitBusiness = (e: React.FormEvent) => {
        e.preventDefault();
        businessForm.patch('/settings/business');
    };

    // Entry Controls Form
    const entryForm = useForm({
        require_source_total: settings.entry_settings?.require_source_total ?? true,
        show_event_time: settings.entry_settings?.show_event_time ?? true,
    });

    const submitEntry = (e: React.FormEvent) => {
        e.preventDefault();
        entryForm.patch('/settings/entry-controls');
    };

    // New Location Modal State
    const [showLocModal, setShowLocModal] = useState(false);
    const [editingLocId, setEditingLocId] = useState<number | null>(null);
    const locForm = useForm({
        code: '',
        name_primary: '',
        name_secondary: '',
        address: '',
        is_active: true,
    });

    const openNewLocation = () => {
        setEditingLocId(null);
        locForm.reset();
        locForm.clearErrors();
        setShowLocModal(true);
    };

    const openEditLocation = (loc: SettingsPageProps['locations'][number]) => {
        setEditingLocId(loc.id);
        locForm.clearErrors();
        locForm.setData({
            code: loc.code,
            name_primary: loc.name_primary,
            name_secondary: loc.name_secondary ?? '',
            address: loc.address ?? '',
            is_active: loc.is_active,
        });
        setShowLocModal(true);
    };

    const submitLocation = (e: React.FormEvent) => {
        e.preventDefault();
        const options = {
            preserveScroll: true,
            onSuccess: () => {
                setShowLocModal(false);
                setEditingLocId(null);
                locForm.reset();
            },
        };

        if (editingLocId) {
            locForm.patch(`/settings/locations/${editingLocId}`, options);
            return;
        }

        locForm.post('/settings/locations', options);
    };

    // New User Modal State
    const [showUserModal, setShowUserModal] = useState(false);
    const [editingUserId, setEditingUserId] = useState<number | null>(null);
    const userForm = useForm({
        name: '',
        username: '',
        password: '',
        role: 'cashier',
        is_active: true,
        location_ids: [locations[0]?.id || 1],
    });

    const openNewUser = () => {
        setEditingUserId(null);
        userForm.reset();
        userForm.clearErrors();
        setShowUserModal(true);
    };

    const openEditUser = (u: SettingsPageProps['users'][number]) => {
        setEditingUserId(u.id);
        userForm.clearErrors();
        userForm.setData({
            name: u.name,
            username: u.username,
            password: '',
            role: u.role,
            is_active: u.is_active,
            location_ids: u.locations?.map((l) => l.id) ?? [],
        });
        setShowUserModal(true);
    };

    const submitUser = (e: React.FormEvent) => {
        e.preventDefault();
        const options = {
            preserveScroll: true,
            onSuccess: () => {
                setShowUserModal(false);
                setEditingUserId(null);
                userForm.reset();
            },
        };

        if (editingUserId) {
            userForm.patch(`/settings/users/${editingUserId}`, options);
            return;
        }

        userForm.post('/settings/users', options);
    };

    // Archive User Modal State
    const [archiveTarget, setArchiveTarget] = useState<UserType | null>(null);
    const archiveForm = useForm({
        reason: '',
    });

    const submitArchive = (e: React.FormEvent) => {
        e.preventDefault();
        if (!archiveTarget) return;
        archiveForm.post(`/settings/users/${archiveTarget.id}/archive`, {
            onSuccess: () => {
                setArchiveTarget(null);
                archiveForm.reset();
            },
        });
    };

    const restoreUser = (userId: number) => {
        router.post(`/settings/users/${userId}/restore`);
    };

    // Scroll lock and Esc key listener
    useEffect(() => {
        if (!mounted || typeof document === 'undefined') return;
        if (showUserModal || showLocModal || archiveTarget || showRestoreConfirm) {
            const originalOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.key === 'Escape') {
                    setShowUserModal(false);
                    setShowLocModal(false);
                    setArchiveTarget(null);
                    setShowRestoreConfirm(false);
                }
            };
            window.addEventListener('keydown', handleKeyDown);
            return () => {
                document.body.style.overflow = originalOverflow;
                window.removeEventListener('keydown', handleKeyDown);
            };
        }
    }, [showUserModal, showLocModal, archiveTarget, showRestoreConfirm, mounted]);

    return (
        <AppLayout title="Master Settings Hub">
            <div className="space-y-6">
                {/* Fixed / Sticky Header & Tabs Controls */}
                <div className="sticky top-14 md:top-0 z-20 bg-zinc-950/95 backdrop-blur-xl -mt-6 pt-6 pb-4 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 border-b border-zinc-800/80 space-y-4 shadow-xs">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
                                <Sliders className="w-6 h-6 text-emerald-400" />
                                <span>Master Settings Hub</span>
                            </h1>
                            <p className="text-xs text-zinc-400 mt-1">
                                System configuration, data entry policies, staff accounts, and append-only audit stream.
                            </p>
                        </div>
                    </div>

                    {/* Tabs Navigation */}
                    <div className="relative overflow-hidden">
                        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-none">
                            {[
                                { id: 'business', label: 'Business Profile', icon: Store },
                                { id: 'entry', label: 'Entry Controls', icon: Sliders },
                                { id: 'invoice', label: 'Invoice & Print Designer', icon: Printer },
                                { id: 'locations', label: `Locations (${locations.length})`, icon: MapPin },
                                { id: 'users', label: `Staff & Accounts (${users.length})`, icon: Users },
                                { id: 'audits', label: `Audit Trail (${audits.length})`, icon: Shield },
                                { id: 'backup', label: 'Backup & Restore', icon: Database },
                            ].map((tab) => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        id={`tab-${tab.id}`}
                                        onClick={() => setActiveTab(tab.id as typeof activeTab)}
                                        className={`flex items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                                            isActive
                                                ? 'bg-zinc-800 text-emerald-400 border border-zinc-700/80 shadow-sm'
                                                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                                        }`}
                                    >
                                        <Icon className="w-4 h-4" />
                                        <span>{tab.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* TAB 1: Business Profile */}
                {activeTab === 'business' && (
                    <Card className="p-6 max-w-3xl space-y-5">
                        <div>
                            <h2 className="text-base font-bold text-white">Business Profile & Letterhead</h2>
                            <p className="text-xs text-zinc-400">
                                Displayed on customer receipts, thermal 80mm prints, and A5 invoices.
                            </p>
                        </div>

                        <form onSubmit={submitBusiness} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Input
                                    id="business_name_primary"
                                    label="Primary Business Name (Khmer) / ឈ្មោះអាជីវកម្ម (ភាសាខ្មែរ)"
                                    value={businessForm.data.business_name_primary}
                                    onChange={(e) =>
                                        businessForm.setData('business_name_primary', e.target.value)
                                    }
                                    error={businessForm.errors.business_name_primary}
                                />
                                <Input
                                    id="business_name_secondary"
                                    label="Secondary Business Name (English) / ឈ្មោះអាជីវកម្ម (English)"
                                    value={businessForm.data.business_name_secondary}
                                    onChange={(e) =>
                                        businessForm.setData('business_name_secondary', e.target.value)
                                    }
                                    error={businessForm.errors.business_name_secondary}
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Input
                                    id="phone"
                                    label="Telephone / Contact"
                                    value={businessForm.data.phone}
                                    onChange={(e) => businessForm.setData('phone', e.target.value)}
                                    error={businessForm.errors.phone}
                                />
                                <Input
                                    id="tax_identifier"
                                    label="VAT / Tax Identification Number (TIN)"
                                    value={businessForm.data.tax_identifier}
                                    onChange={(e) =>
                                        businessForm.setData('tax_identifier', e.target.value)
                                    }
                                    error={businessForm.errors.tax_identifier}
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <Input
                                    id="currency_code"
                                    label="Currency Code"
                                    value={businessForm.data.currency_code}
                                    onChange={(e) =>
                                        businessForm.setData('currency_code', e.target.value)
                                    }
                                    error={businessForm.errors.currency_code}
                                />
                                <Input
                                    id="currency_symbol"
                                    label="Currency Symbol"
                                    value={businessForm.data.currency_symbol}
                                    onChange={(e) =>
                                        businessForm.setData('currency_symbol', e.target.value)
                                    }
                                    error={businessForm.errors.currency_symbol}
                                />
                                <Input
                                    id="timezone"
                                    label="System Timezone"
                                    value={businessForm.data.timezone}
                                    onChange={(e) => businessForm.setData('timezone', e.target.value)}
                                    error={businessForm.errors.timezone}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-xs font-medium text-zinc-400">
                                    Primary Address
                                </label>
                                <textarea
                                    value={businessForm.data.address_primary}
                                    onChange={(e) =>
                                        businessForm.setData('address_primary', e.target.value)
                                    }
                                    className="w-full px-3.5 py-2 text-sm text-zinc-100 bg-zinc-900/90 border border-zinc-800 rounded-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                                    rows={2}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-xs font-medium text-zinc-400">
                                    Receipt Footer Note
                                </label>
                                <input
                                    type="text"
                                    value={businessForm.data.document_footer}
                                    onChange={(e) =>
                                        businessForm.setData('document_footer', e.target.value)
                                    }
                                    className="w-full px-3.5 py-2 text-sm text-zinc-100 bg-zinc-900/90 border border-zinc-800 rounded-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                                />
                            </div>

                            <div className="flex justify-end pt-2">
                                <Button type="submit" disabled={businessForm.processing}>
                                    <Save className="w-4 h-4" />
                                    <span>Save Business Settings</span>
                                </Button>
                            </div>
                        </form>
                    </Card>
                )}

                {/* TAB 2: Entry & Reconciliation Controls */}
                {activeTab === 'entry' && (
                    <Card className="p-6 max-w-2xl space-y-6">
                        <div>
                            <h2 className="text-base font-bold text-white">
                                Strict Financial & Entry Controls
                            </h2>
                            <p className="text-xs text-zinc-400">
                                Invariant INV-03: Controls whether source total variance reconciliation is strictly enforced before saving.
                            </p>
                        </div>

                        <form onSubmit={submitEntry} className="space-y-5">
                            {/* Require source total toggle */}
                            <div className="flex items-start justify-between p-4 rounded-xl bg-zinc-950/70 border border-zinc-800 gap-4">
                                <div className="space-y-1">
                                    <label
                                        htmlFor="require_source_total"
                                        className="text-sm font-semibold text-zinc-200 cursor-pointer block"
                                    >
                                        Require Physical Source-Total Reconciliation
                                    </label>
                                    <p className="text-xs text-zinc-400">
                                        When enabled, cashier must enter old POS / paper slip total. If calculated total does not match with $0.00 variance, saving and finalization is blocked.
                                    </p>
                                </div>
                                <Switch
                                    id="require_source_total"
                                    name="require_source_total"
                                    checked={entryForm.data.require_source_total}
                                    onCheckedChange={(checked) =>
                                        entryForm.setData('require_source_total', checked)
                                    }
                                    ariaLabel="Require Physical Source-Total Reconciliation"
                                />
                            </div>

                            {/* Show sale time toggle */}
                            <div className="flex items-start justify-between p-4 rounded-xl bg-zinc-950/70 border border-zinc-800 gap-4">
                                <div className="space-y-1">
                                    <label
                                        htmlFor="show_event_time"
                                        className="text-sm font-semibold text-zinc-200 cursor-pointer block"
                                    >
                                        Record Event Sale Time
                                    </label>
                                    <p className="text-xs text-zinc-400">
                                        Includes exact time picker on high-speed entry tray to establish chronological sorting for sequence stamping.
                                    </p>
                                </div>
                                <Switch
                                    id="show_event_time"
                                    name="show_event_time"
                                    checked={entryForm.data.show_event_time}
                                    onCheckedChange={(checked) =>
                                        entryForm.setData('show_event_time', checked)
                                    }
                                    ariaLabel="Record Event Sale Time"
                                />
                            </div>

                            <div className="flex justify-end pt-2">
                                <Button type="submit" disabled={entryForm.processing}>
                                    <Save className="w-4 h-4" />
                                    <span>Save Policy Settings</span>
                                </Button>
                            </div>
                        </form>
                    </Card>
                )}

                {/* TAB: Invoice & Print Designer (80mm / A5) */}
                {activeTab === 'invoice' && (
                    <InvoiceDesigner settings={settings} />
                )}

                {/* TAB 3: Locations */}
                {activeTab === 'locations' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-base font-bold text-white">Branch Locations</h2>
                                <p className="text-xs text-zinc-400">
                                    Store branches and physical dining halls. Non-admin users are scoped to assigned branches.
                                </p>
                            </div>
                            <Button size="sm" onClick={openNewLocation}>
                                <Plus className="w-4 h-4" />
                                <span>Add Location</span>
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {locations.map((loc) => (
                                <Card key={loc.id} className="p-4 space-y-3">
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-0.5">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-xs bg-zinc-800 px-2 py-0.5 rounded text-emerald-400 font-semibold border border-zinc-700/60">
                                                    {loc.code}
                                                </span>
                                                <Badge variant={loc.is_active ? 'emerald' : 'zinc'}>
                                                    {loc.is_active ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </div>
                                            <h3 className="text-sm font-bold text-white mt-1">
                                                {loc.name_primary}
                                            </h3>
                                            {loc.name_secondary && (
                                                <div className="text-xs text-zinc-400 font-khmer">
                                                    {loc.name_secondary}
                                                </div>
                                            )}
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => openEditLocation(loc)}
                                            title="កែប្រែសាខា (Edit)"
                                            className="h-8 w-8 p-0 text-zinc-400 hover:text-amber-500 hover:bg-amber-500/10"
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                    <div className="text-xs text-zinc-500 pt-2 border-t border-zinc-800/80 flex items-center justify-between">
                                        <span>{loc.address || 'No physical address specified'}</span>
                                        <span className="font-mono">{loc.users_count} assigned staff</span>
                                    </div>
                                </Card>
                            ))}
                        </div>

                        {/* Modal: Add Location (Full-Workspace 2-Column Suite) */}
                        {mounted && showLocModal && createPortal(
                            <div
                                className="fixed inset-y-0 right-0 left-0 md:left-[var(--sidebar-width,16rem)] z-50 flex flex-col bg-zinc-50 dark:bg-zinc-950 overflow-hidden select-none animate-in fade-in duration-150 h-screen"
                                onWheel={(e) => e.stopPropagation()}
                            >
                                {/* Top Header */}
                                <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-sm">
                                            <Building2 className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h2 className="text-lg font-bold text-slate-900 dark:text-zinc-100 font-khmer">
                                                    {editingLocId ? 'កែប្រែសាខាហាង' : 'បង្កើតសាខាហាងថ្មី'}
                                                </h2>
                                                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 uppercase">
                                                    MULTI-BRANCH ENGINE
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 dark:text-zinc-400 font-khmer">
                                                កំណត់ទីតាំងសាខា កូដសម្គាល់ និងអាសយដ្ឋានសម្រាប់បែងចែកប្រតិបត្តិការ POS និងបុគ្គលិក
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowLocModal(false);
                                            locForm.reset();
                                        }}
                                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-950 dark:hover:text-white transition-all cursor-pointer font-khmer shadow-sm group"
                                        title="ត្រឡប់ក្រោយ (Esc)"
                                    >
                                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform text-amber-500" />
                                        <span>ត្រឡប់ក្រោយ</span>
                                        <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono hidden sm:inline ml-1">
                                            (Esc)
                                        </span>
                                    </button>
                                </div>

                                {/* Form Body - 2 Columns */}
                                <form onSubmit={submitLocation} className="flex-1 min-h-0 flex flex-col">
                                    <div className="flex-1 min-h-0 overflow-y-auto p-6 md:p-8">
                                        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
                                            {/* Left Column: Form Fields (7 Cols) */}
                                            <div className="lg:col-span-7 space-y-6">
                                                {/* Section 1: Branch Identification */}
                                                <div className="bg-white dark:bg-zinc-900/90 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
                                                    <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-zinc-800/80">
                                                        <Store className="w-4 h-4 text-amber-500" />
                                                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-zinc-200 font-khmer">
                                                            អត្តសញ្ញាណសាខា & កូដសម្គាល់ / Branch Identity
                                                        </h3>
                                                    </div>

                                                    <div>
                                                        <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1 font-khmer">
                                                            កូដសម្គាល់សាខា (Location Code) <span className="text-rose-500">*</span>
                                                        </label>
                                                        <input
                                                            type="text"
                                                            required
                                                            placeholder="ឧ. LOC-02"
                                                            value={locForm.data.code}
                                                            onChange={(e) => locForm.setData('code', e.target.value)}
                                                            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-mono font-bold uppercase text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                                                        />
                                                        {locForm.errors.code && (
                                                            <p className="text-[11px] text-rose-500 mt-1 font-khmer">{locForm.errors.code}</p>
                                                        )}
                                                        <div className="flex items-center gap-1.5 mt-2">
                                                            <span className="text-[11px] text-slate-400 font-khmer">កូដគំរូ:</span>
                                                            {['LOC-02', 'LOC-03', 'BRANCH-BTK', 'BRANCH-TTP'].map((sample) => (
                                                                <button
                                                                    key={sample}
                                                                    type="button"
                                                                    onClick={() => locForm.setData('code', sample)}
                                                                    className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-amber-500 transition cursor-pointer"
                                                                >
                                                                    {sample}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1 font-khmer">
                                                                ឈ្មោះសាខាជាភាសាអង់គ្លេស (English) <span className="text-rose-500">*</span>
                                                            </label>
                                                            <input
                                                                type="text"
                                                                required
                                                                placeholder="e.g. Riverside Branch"
                                                                value={locForm.data.name_primary}
                                                                onChange={(e) => locForm.setData('name_primary', e.target.value)}
                                                                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                                                            />
                                                            {locForm.errors.name_primary && (
                                                                <p className="text-[11px] text-rose-500 mt-1 font-khmer">{locForm.errors.name_primary}</p>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1 font-khmer">
                                                                ឈ្មោះសាខាជាភាសាខ្មែរ (Khmer)
                                                            </label>
                                                            <input
                                                                type="text"
                                                                placeholder="ឧ. សាខាមាត់ទន្លេ"
                                                                value={locForm.data.name_secondary}
                                                                onChange={(e) => locForm.setData('name_secondary', e.target.value)}
                                                                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-khmer transition-all"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Section 2: Address & Location */}
                                                <div className="bg-white dark:bg-zinc-900/90 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
                                                    <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-zinc-800/80">
                                                        <MapPin className="w-4 h-4 text-amber-500" />
                                                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-zinc-200 font-khmer">
                                                            អាសយដ្ឋាន & ទីតាំងប្រតិបត្តិការ / Location Address
                                                        </h3>
                                                    </div>

                                                    <div>
                                                        <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1 font-khmer">
                                                            អាសយដ្ឋានជាក់ស្ដែង (Physical Address)
                                                        </label>
                                                        <div className="relative">
                                                            <input
                                                                type="text"
                                                                placeholder="ឧ. ផ្លូវព្រះស៊ីសុវត្ថិ សង្កាត់ជ័យជំនះ ខណ្ឌដូនពេញ រាជធានីភ្នំពេញ..."
                                                                value={locForm.data.address}
                                                                onChange={(e) => locForm.setData('address', e.target.value)}
                                                                className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-khmer transition-all"
                                                            />
                                                            <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                                        </div>
                                                    </div>

                                                    {/* Quick Presets */}
                                                    <div>
                                                        <label className="block text-[11px] font-semibold text-slate-500 dark:text-zinc-400 mb-1.5 font-khmer">
                                                            គំរូទីតាំងពេញនិយម (Quick Presets)
                                                        </label>
                                                        <div className="flex flex-wrap gap-2">
                                                            {[
                                                                { code: 'LOC-TK', en: 'Toul Kork Branch', kh: 'សាខាទួលគោក', addr: 'ផ្លូវ ៣១៥ សង្កាត់បឹងកក់១ ខណ្ឌទួលគោក ភ្នំពេញ' },
                                                                { code: 'LOC-BKK', en: 'Boeung Keng Kang Branch', kh: 'សាខាបឹងកេងកង', addr: 'ផ្លូវ ៥១ កែងផ្លូវ ៣០២ បឹងកេងកង១ ភ្នំពេញ' },
                                                                { code: 'LOC-RIV', en: 'Riverside Waterfront', kh: 'សាខាមាត់ទន្លេ', addr: 'ផ្លូវព្រះស៊ីសុវត្ថិ ដូនពេញ ភ្នំពេញ' },
                                                            ].map((preset) => (
                                                                <button
                                                                    key={preset.code}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        locForm.setData({
                                                                            code: preset.code,
                                                                            name_primary: preset.en,
                                                                            name_secondary: preset.kh,
                                                                            address: preset.addr,
                                                                        });
                                                                    }}
                                                                    className="px-2.5 py-1.5 rounded-lg text-xs bg-slate-100 dark:bg-zinc-800 hover:bg-amber-500/10 hover:border-amber-500/30 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 font-khmer transition cursor-pointer"
                                                                >
                                                                    📍 {preset.kh}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Section 3: Operational Engine Note */}
                                                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3">
                                                    <ShieldCheck className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                                    <div className="space-y-1">
                                                        <h4 className="text-xs font-bold text-amber-900 dark:text-amber-300 font-khmer">
                                                            ប្រព័ន្ធបែងចែកទិន្នន័យសាខាដាច់ដោយឡែក (Branch Partitioning)
                                                        </h4>
                                                        <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 font-khmer leading-relaxed">
                                                            សាខានីមួយៗនឹងមានវេនគិតលុយ (Cash Shifts) ថតលុយ និងរបាយការណ៍លក់ដាច់ដោយឡែក ប៉ុន្តែទិន្នន័យបញ្ជីមុខម្ហូប និងអតិថិជនសមាជិក (Loyalty) នឹងត្រូវបានចែករំលែករួមគ្នាក្នុងប្រព័ន្ធកណ្តាល។
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Right Column: Live Branch Passport Preview (5 Cols) */}
                                            <div className="lg:col-span-5 space-y-6">
                                                <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xl space-y-5 sticky top-6">
                                                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                                                        <div className="flex items-center gap-2">
                                                            <Sparkles className="w-4 h-4 text-amber-500" />
                                                            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300 font-mono">
                                                                Branch Terminal Passport
                                                            </span>
                                                        </div>
                                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                                            ● READY
                                                        </span>
                                                    </div>

                                                    {/* Branch Card Preview */}
                                                    <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 space-y-4">
                                                        <div className="flex items-center justify-between">
                                                            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-sm">
                                                                <Building2 className="w-6 h-6" />
                                                            </div>
                                                            <span className="text-xs font-mono font-bold px-3 py-1 rounded-xl bg-white dark:bg-zinc-900 border border-amber-500/30 text-amber-600 dark:text-amber-400 shadow-xs">
                                                                {locForm.data.code || 'LOC-XX'}
                                                            </span>
                                                        </div>

                                                        <div>
                                                            <h3 className="text-base font-bold text-slate-900 dark:text-white font-khmer">
                                                                {locForm.data.name_secondary || locForm.data.name_primary || 'ឈ្មោះសាខាហាង'}
                                                            </h3>
                                                            <p className="text-xs text-slate-500 dark:text-zinc-400 font-mono">
                                                                {locForm.data.name_primary || 'Branch English Name'}
                                                            </p>
                                                        </div>

                                                        <div className="p-3 rounded-xl bg-white/70 dark:bg-zinc-950/70 border border-slate-200/60 dark:border-zinc-800/60 text-xs space-y-1 font-khmer">
                                                            <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                                                                អាសយដ្ឋានសាខា:
                                                            </div>
                                                            <p className="text-slate-700 dark:text-zinc-300 text-[11px] leading-relaxed">
                                                                {locForm.data.address || 'មិនទាន់បានកំណត់អាសយដ្ឋានជាក់ស្តែង...'}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Terminal Readiness Specs */}
                                                    <div className="space-y-2 text-xs">
                                                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800">
                                                            <span className="text-slate-500 dark:text-zinc-400 font-khmer">បុគ្គលិកដំបូង (Staff Assignment)</span>
                                                            <span className="font-mono font-bold text-slate-900 dark:text-white">0 Users</span>
                                                        </div>
                                                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800">
                                                            <span className="text-slate-500 dark:text-zinc-400 font-khmer">ម៉ាស៊ីន POS & ថតលុយ</span>
                                                            <span className="font-khmer font-bold text-emerald-600 dark:text-emerald-400">ស្វ័យប្រវត្ត (Auto-linked)</span>
                                                        </div>
                                                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800">
                                                            <span className="text-slate-500 dark:text-zinc-400 font-khmer">រូបិយប័ណ្ណប្រតិបត្តិការ</span>
                                                            <span className="font-mono font-bold text-slate-900 dark:text-white">USD ($) + KHR (៛)</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Footer */}
                                    <div className="shrink-0 flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md">
                                        {editingLocId ? (
                                            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-zinc-300 font-khmer cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={locForm.data.is_active}
                                                    onChange={(e) => locForm.setData('is_active', e.target.checked)}
                                                    className="w-4 h-4 accent-emerald-500"
                                                />
                                                <span>សាខាកំពុងដំណើរការ (Active)</span>
                                            </label>
                                        ) : (
                                            <div className="text-xs text-slate-500 dark:text-zinc-400 font-khmer flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                                                <span>កំពុងរៀបចំបង្កើតសាខាហាងថ្មីក្នុងប្រព័ន្ធ</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-3">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setShowLocModal(false);
                                                    locForm.reset();
                                                }}
                                                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 font-khmer transition-all cursor-pointer"
                                            >
                                                បោះបង់ (Cancel)
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={locForm.processing}
                                                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 font-khmer shadow-md shadow-amber-500/20 transition-all cursor-pointer flex items-center gap-2"
                                            >
                                                {locForm.processing ? (
                                                    'កំពុងរក្សាទុក...'
                                                ) : (
                                                    <>
                                                        <Check className="w-4 h-4" />
                                                        <span>{editingLocId ? 'រក្សាទុកការកែប្រែ' : 'បង្កើតសាខាហាង'}</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </div>,
                            document.body
                        )}
                    </div>
                )}

                {/* TAB 4: Staff & Accounts */}
                {activeTab === 'users' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-base font-bold text-white">Staff & Access Control</h2>
                                <p className="text-xs text-zinc-400">
                                    Role-based permissions (Admin, Cashier, Supervisor) and server-enforced self-protection guards.
                                </p>
                            </div>
                            <Button size="sm" onClick={openNewUser}>
                                <Plus className="w-4 h-4" />
                                <span>Create Staff Account</span>
                            </Button>
                        </div>

                        {/* Users Table */}
                        <Card className="p-0 overflow-hidden border-zinc-800">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-zinc-950/80 border-b border-zinc-800 text-zinc-400 font-mono uppercase text-[10px]">
                                        <tr>
                                            <th className="px-4 py-3">Operator Name</th>
                                            <th className="px-4 py-3">Username</th>
                                            <th className="px-4 py-3">Role</th>
                                            <th className="px-4 py-3">Status</th>
                                            <th className="px-4 py-3">Assigned Locations</th>
                                            <th className="px-4 py-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-800/60">
                                        {users.map((u) => {
                                            const isSelf = u.id === currentUser?.id;
                                            const isArchived = !!u.archived_at;
                                            return (
                                                <tr key={u.id} className="hover:bg-zinc-900/40 transition-colors">
                                                    <td className="px-4 py-3 font-semibold text-zinc-200">
                                                        <div className="flex items-center gap-2">
                                                            <span>{u.name}</span>
                                                            {isSelf && (
                                                                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30">
                                                                    You
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 font-mono text-zinc-400">
                                                        {u.username}
                                                    </td>
                                                    <td className="px-4 py-3 font-mono uppercase text-[11px]">
                                                        <Badge
                                                            variant={
                                                                u.role === 'admin'
                                                                    ? 'emerald'
                                                                    : u.role === 'supervisor'
                                                                    ? 'amber'
                                                                    : 'sky'
                                                            }
                                                        >
                                                            {u.role}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {isArchived ? (
                                                            <Badge variant="rose">Archived</Badge>
                                                        ) : u.is_active ? (
                                                            <Badge variant="emerald">Active</Badge>
                                                        ) : (
                                                            <Badge variant="zinc">Inactive</Badge>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-zinc-400 font-mono text-[11px]">
                                                        {u.locations?.map((l) => l.code).join(', ') || 'All'}
                                                    </td>
                                                    <td className="px-4 py-3 text-right space-x-1">
                                                        {isArchived ? (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => restoreUser(u.id)}
                                                            >
                                                                <RotateCcw className="w-3.5 h-3.5" />
                                                                <span>Restore</span>
                                                            </Button>
                                                        ) : (
                                                            <>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => openEditUser(u)}
                                                                className="text-zinc-400 hover:text-amber-500 hover:bg-amber-500/10"
                                                            >
                                                                <Pencil className="w-3.5 h-3.5" />
                                                                <span>Edit</span>
                                                            </Button>
                                                            {!isSelf && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() => setArchiveTarget(u)}
                                                                    className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                                                                >
                                                                    <Archive className="w-3.5 h-3.5" />
                                                                    <span>Archive</span>
                                                                </Button>
                                                            )}
                                                            </>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </Card>

                        {/* Modal: Create User (Full-Workspace 2-Column Layout) */}
                        {mounted && showUserModal && createPortal(
                            <div
                                className="fixed inset-y-0 right-0 left-0 md:left-[var(--sidebar-width,16rem)] z-50 flex flex-col bg-zinc-50 dark:bg-zinc-950 overflow-hidden select-none animate-in fade-in duration-150 h-screen"
                                onWheel={(e) => e.stopPropagation()}
                            >
                                {/* Top Header */}
                                <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-sm">
                                            <UserPlus className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h2 className="text-lg font-bold text-slate-900 dark:text-zinc-100 font-khmer">
                                                    {editingUserId ? 'កែប្រែគណនីបុគ្គលិក' : 'បង្កើតគណនីបុគ្គលិកថ្មី'}
                                                </h2>
                                                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                                    INV-07 COMPLIANT
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 dark:text-zinc-400 font-khmer">
                                                Create Staff Member & Access Role — លៀសហាល អ៉ីទុម POS
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowUserModal(false);
                                            userForm.reset();
                                        }}
                                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-950 dark:hover:text-white transition-all cursor-pointer font-khmer shadow-sm"
                                    >
                                        <ArrowLeft className="w-4 h-4" />
                                        <span>ត្រឡប់ក្រោយ</span>
                                        <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono hidden sm:inline ml-1">
                                            (Esc)
                                        </span>
                                    </button>
                                </div>

                                {/* Form Body - 2 Columns */}
                                <form onSubmit={submitUser} className="flex-1 min-h-0 flex flex-col">
                                    <div className="flex-1 min-h-0 overflow-y-auto p-6 md:p-8">
                                        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
                                            {/* Left Column: Form Fields (7 Cols) */}
                                            <div className="lg:col-span-7 space-y-6">
                                                {/* Section 1: Staff Identity */}
                                                <div className="bg-white dark:bg-zinc-900/90 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
                                                    <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-zinc-800/80">
                                                        <Users className="w-4 h-4 text-amber-500" />
                                                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-zinc-100 font-khmer">
                                                            ព័ត៌មានអត្តសញ្ញាណបុគ្គលិក (Staff Identity)
                                                        </h3>
                                                    </div>

                                                    <div className="space-y-4">
                                                        <div>
                                                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-300 mb-1.5 font-khmer">
                                                                ឈ្មោះពេញ (Full Name) *
                                                            </label>
                                                            <input
                                                                type="text"
                                                                required
                                                                placeholder="ឧ. សុខ ចិន្តា ឬ Sok Chenda"
                                                                value={userForm.data.name}
                                                                onChange={(e) => userForm.setData('name', e.target.value)}
                                                                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500 transition-all font-khmer"
                                                            />
                                                            {userForm.errors.name && (
                                                                <p className="text-[11px] text-rose-500 mt-1">{userForm.errors.name}</p>
                                                            )}
                                                        </div>

                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                            <div>
                                                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-300 mb-1.5 font-khmer">
                                                                    ឈ្មោះគណនីចូលប្រព័ន្ធ (Username) *
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    required
                                                                    placeholder="e.g. chenda.s"
                                                                    value={userForm.data.username}
                                                                    onChange={(e) =>
                                                                        userForm.setData('username', e.target.value.toLowerCase().trim())
                                                                    }
                                                                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm font-mono text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500 transition-all"
                                                                />
                                                                {userForm.errors.username && (
                                                                    <p className="text-[11px] text-rose-500 mt-1">{userForm.errors.username}</p>
                                                                )}
                                                            </div>

                                                            <div>
                                                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-300 mb-1.5 font-khmer">
                                                                    {editingUserId ? 'ពាក្យសម្ងាត់ថ្មី (ទុកទទេ បើមិនប្តូរ)' : 'ពាក្យសម្ងាត់ដំបូង (Initial Password) *'}
                                                                </label>
                                                                <div className="relative">
                                                                    <input
                                                                        type={showPassword ? 'text' : 'password'}
                                                                        required={!editingUserId}
                                                                        placeholder="យ៉ាងតិច ៦ តួអក្សរ"
                                                                        value={userForm.data.password}
                                                                        onChange={(e) =>
                                                                            userForm.setData('password', e.target.value)
                                                                        }
                                                                        className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm font-mono text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500 transition-all"
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setShowPassword(!showPassword)}
                                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                                                                    >
                                                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                                    </button>
                                                                </div>
                                                                {userForm.errors.password && (
                                                                    <p className="text-[11px] text-rose-500 mt-1">{userForm.errors.password}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Section 2: Role Selection Cards */}
                                                <div className="bg-white dark:bg-zinc-900/90 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-3">
                                                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800/80">
                                                        <div className="flex items-center gap-2">
                                                            <Shield className="w-4 h-4 text-amber-500" />
                                                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-zinc-100 font-khmer">
                                                                ជ្រើសរើសតួនាទី និងសិទ្ធិអនុញ្ញាត (Role & Permissions) *
                                                            </h3>
                                                        </div>
                                                        <span className="text-xs text-slate-400 dark:text-zinc-500 font-khmer hidden sm:inline">
                                                            ចុចលើកាតដើម្បីជ្រើសរើស
                                                        </span>
                                                    </div>

                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                        {(['cashier', 'supervisor', 'admin'] as const).map((rKey) => {
                                                            const cfg = ROLE_CONFIG[rKey];
                                                            const isSelected = userForm.data.role === rKey;
                                                            return (
                                                                <button
                                                                    key={rKey}
                                                                    type="button"
                                                                    onClick={() => userForm.setData('role', rKey)}
                                                                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                                                                        isSelected
                                                                            ? 'bg-amber-500/10 border-amber-500 text-slate-900 dark:text-zinc-100 ring-2 ring-amber-500/20 shadow-md'
                                                                            : 'bg-slate-50 dark:bg-zinc-950/60 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:border-slate-300 dark:hover:border-zinc-700'
                                                                    }`}
                                                                >
                                                                    <div className="flex items-center justify-between mb-2">
                                                                        <span className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded-md border ${cfg.badge}`}>
                                                                            {rKey}
                                                                        </span>
                                                                        {isSelected && (
                                                                            <span className="w-4 h-4 rounded-full bg-amber-500 text-zinc-950 flex items-center justify-center">
                                                                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-xs font-bold text-slate-900 dark:text-zinc-100 font-khmer mb-1">
                                                                        {cfg.nameKh}
                                                                    </div>
                                                                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-khmer line-clamp-2">
                                                                        {cfg.description}
                                                                    </p>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                {/* Section 3: Branch Location Assignment */}
                                                <div className="bg-white dark:bg-zinc-900/90 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-3">
                                                    <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-zinc-800/80">
                                                        <Building2 className="w-4 h-4 text-amber-500" />
                                                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-zinc-100 font-khmer">
                                                            សាខាអនុញ្ញាតសម្រាប់គណនីនេះ (Branch Location Assignment)
                                                        </h3>
                                                    </div>

                                                    <p className="text-xs text-slate-500 dark:text-zinc-400 font-khmer">
                                                        ជ្រើសរើសសាខាដែលបុគ្គលិកនេះមានសិទ្ធិចូលលក់ និងគ្រប់គ្រងវេន៖
                                                    </p>

                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                                        {locations.map((loc) => {
                                                            const isAssigned = userForm.data.location_ids?.includes(loc.id);
                                                            return (
                                                                <label
                                                                    key={loc.id}
                                                                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                                                                        isAssigned
                                                                            ? 'bg-amber-500/10 border-amber-500 text-slate-900 dark:text-zinc-100'
                                                                            : 'bg-slate-50 dark:bg-zinc-950/60 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:border-slate-300'
                                                                    }`}
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isAssigned}
                                                                        onChange={(e) => {
                                                                            const cur = userForm.data.location_ids || [];
                                                                            if (e.target.checked) {
                                                                                userForm.setData('location_ids', [...cur, loc.id]);
                                                                            } else {
                                                                                userForm.setData('location_ids', cur.filter((id) => id !== loc.id));
                                                                            }
                                                                        }}
                                                                        className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 border-slate-300 dark:border-zinc-700"
                                                                    />
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center gap-1.5">
                                                                            <span className="text-xs font-bold text-slate-900 dark:text-zinc-100 truncate">
                                                                                {loc.name_primary}
                                                                            </span>
                                                                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400">
                                                                                {loc.code}
                                                                            </span>
                                                                        </div>
                                                                        {loc.name_secondary && (
                                                                            <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-khmer truncate">
                                                                                {loc.name_secondary}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Right Column: Live Digital Staff ID Badge + Role Permissions Breakdown (5 Cols) */}
                                            <div className="lg:col-span-5 space-y-6">
                                                {/* Live Staff Badge */}
                                                <div className="bg-white dark:bg-zinc-900/90 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
                                                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800/80">
                                                        <div className="flex items-center gap-2">
                                                            <Sparkles className="w-4 h-4 text-amber-500" />
                                                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-zinc-100 font-khmer">
                                                                ប័ណ្ណសម្គាល់បុគ្គលិកឌីជីថល (Digital Staff Badge)
                                                            </h3>
                                                        </div>
                                                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                                            LIVE PREVIEW
                                                        </span>
                                                    </div>

                                                    {/* Badge Card Container */}
                                                    <div className={`p-5 rounded-2xl bg-gradient-to-br ${ROLE_CONFIG[userForm.data.role]?.gradient || 'from-zinc-900 to-zinc-950'} border border-slate-200/50 dark:border-zinc-700/60 shadow-xl text-white relative overflow-hidden`}>
                                                        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

                                                        <div className="flex items-center justify-between mb-6">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                                                <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">
                                                                    LEASHAL ETUM POS
                                                                </span>
                                                            </div>
                                                            <span className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded-md border ${ROLE_CONFIG[userForm.data.role]?.badge}`}>
                                                                {userForm.data.role}
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center gap-4 mb-5">
                                                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-zinc-950 font-black text-xl flex items-center justify-center shadow-lg border-2 border-white/20 shrink-0">
                                                                {getStaffInitials(userForm.data.name)}
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <h4 className="text-base font-bold text-white truncate font-khmer">
                                                                    {userForm.data.name || 'ឈ្មោះបុគ្គលិក'}
                                                                </h4>
                                                                <p className="text-xs font-mono text-zinc-400 truncate">
                                                                    @{userForm.data.username || 'username'}
                                                                </p>
                                                                <p className="text-[11px] text-amber-400 font-khmer mt-0.5">
                                                                    {ROLE_CONFIG[userForm.data.role]?.nameKh}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-zinc-400">
                                                            <div>
                                                                <span className="block text-[9px] uppercase font-mono text-zinc-500">សាខាទទួលខុសត្រូវ</span>
                                                                <span className="font-semibold text-zinc-200 font-khmer">
                                                                    {userForm.data.location_ids?.length
                                                                        ? locations
                                                                              .filter((l) => userForm.data.location_ids.includes(l.id))
                                                                              .map((l) => l.code)
                                                                              .join(', ')
                                                                        : 'គ្រប់សាខាទាំងអស់'}
                                                                </span>
                                                            </div>
                                                            <div className="text-right">
                                                                <span className="block text-[9px] uppercase font-mono text-zinc-500">ស្ថានភាពគណនី</span>
                                                                <span className="font-mono text-emerald-400 font-semibold">Active & Audited</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Role Permissions Breakdown */}
                                                <div className="bg-white dark:bg-zinc-900/90 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-3">
                                                    <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-zinc-800/80">
                                                        <KeyRound className="w-4 h-4 text-amber-500" />
                                                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-zinc-100 font-khmer">
                                                            សិទ្ធិប្រតិបត្តិការក្នុងប្រព័ន្ធ (Permission Scope)
                                                        </h3>
                                                    </div>

                                                    <ul className="space-y-2">
                                                        {ROLE_CONFIG[userForm.data.role]?.permissions.map((perm, idx) => (
                                                            <li key={idx} className="flex items-start gap-2 text-xs text-slate-700 dark:text-zinc-300 font-khmer">
                                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                                                <span>{perm}</span>
                                                            </li>
                                                        ))}
                                                    </ul>

                                                    <div className="pt-3 border-t border-slate-100 dark:border-zinc-800/80">
                                                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-300 font-khmer flex items-start gap-2">
                                                            <ShieldCheck className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                                            <span>
                                                                <strong>Invariant INV-07:</strong> រាល់សកម្មភាពរបស់បុគ្គលិក (លក់, កែប្រែ, បោះពុម្ព, បិទវេន) នឹងត្រូវកត់ត្រាស្វ័យប្រវត្តិក្នង Audit Trail ដោយមិនអាចលុបបានឡើយ។
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Fixed Action Footer */}
                                    <div className="shrink-0 flex items-center justify-between px-6 py-3.5 border-t border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                                        {editingUserId ? (
                                            <div className="space-y-0.5">
                                                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-zinc-300 font-khmer cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={userForm.data.is_active}
                                                        onChange={(e) => userForm.setData('is_active', e.target.checked)}
                                                        className="w-4 h-4 accent-emerald-500"
                                                    />
                                                    <span>គណនីកំពុងប្រើប្រាស់ (Active)</span>
                                                </label>
                                                {userForm.errors.is_active && (
                                                    <p className="text-[11px] text-rose-500">{userForm.errors.is_active}</p>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400 font-khmer">
                                                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                                <span>គណនីបុគ្គលិកថ្មីនឹងដំណើរការភ្លាមៗក្រោយបង្កើត</span>
                                            </div>
                                        )}

                                        <div className="flex items-center gap-2.5 ml-auto">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setShowUserModal(false);
                                                    userForm.reset();
                                                }}
                                                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all cursor-pointer font-khmer"
                                            >
                                                បោះបង់
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={userForm.processing}
                                                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold shadow-md shadow-amber-500/20 hover:shadow-amber-500/30 transition-all cursor-pointer font-khmer disabled:opacity-50"
                                            >
                                                <UserPlus className="w-4 h-4" />
                                                <span>{userForm.processing ? 'កំពុងរក្សាទុក...' : editingUserId ? 'រក្សាទុកការកែប្រែ' : 'បង្កើតគណនីបុគ្គលិក'}</span>
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </div>,
                            document.body
                        )}

                        {/* Modal: Archive User Full-Workspace Suite */}
                        {mounted && archiveTarget && createPortal(
                            <div
                                className="fixed inset-y-0 right-0 left-0 md:left-[var(--sidebar-width,16rem)] z-50 flex flex-col bg-zinc-50 dark:bg-zinc-950 overflow-hidden select-none animate-in fade-in duration-150 h-screen"
                                onWheel={(e) => e.stopPropagation()}
                            >
                                {/* Header */}
                                <div className="px-6 py-3.5 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between shrink-0 shadow-xs">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-xs shrink-0">
                                            <Archive className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-base font-bold text-zinc-900 dark:text-white font-khmer">
                                                    ផ្អាក និងទុកជាឯកសារគណនីបុគ្គលិក
                                                </h3>
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20 font-mono">
                                                    Deactivation Protocol
                                                </span>
                                            </div>
                                            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-khmer">
                                                បុគ្គលិក៖ <strong className="text-zinc-900 dark:text-white">{archiveTarget.name}</strong> (@{archiveTarget.username}) • តួនាទី៖ <span className="font-mono uppercase font-semibold text-rose-500">{archiveTarget.role}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setArchiveTarget(null);
                                            archiveForm.reset();
                                        }}
                                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-950 dark:hover:text-white transition-all cursor-pointer font-khmer text-xs font-semibold shadow-xs group"
                                        title="ត្រឡប់ក្រោយ (Esc)"
                                    >
                                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform text-rose-600 dark:text-rose-400" />
                                        <span>ត្រឡប់ក្រោយ</span>
                                    </button>
                                </div>

                                {/* Body - 2 Columns (7 / 5) */}
                                <form onSubmit={submitArchive} className="flex flex-col flex-1 min-h-0 overflow-y-auto">
                                    <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1">
                                        {/* LEFT COLUMN: Inputs & Reasons (7 cols) */}
                                        <div className="lg:col-span-7 space-y-4">
                                            {/* Security Policy Card */}
                                            <div className="p-4 sm:p-5 rounded-2xl bg-rose-500/5 border border-rose-500/20 space-y-3">
                                                <div className="flex items-center gap-2 text-xs font-bold text-rose-800 dark:text-rose-300 font-khmer pb-1 border-b border-rose-500/20">
                                                    <AlertTriangle className="w-4 h-4 text-rose-500" />
                                                    <span>គោលការណ៍សុវត្ថិភាព INV-07 (Append-Only Invariant)</span>
                                                </div>
                                                <p className="text-xs text-rose-700 dark:text-rose-300/90 font-khmer leading-relaxed">
                                                    គណនីបុគ្គលិកមិនត្រូវបានលុបចេញពី Database ឡើយ (Permanent Record Retention)។ ការផ្អាកនេះនឹងដកហូតសិទ្ធិចូលប្រើប្រាស់ប្រព័ន្ធ POS ភ្លាមៗ ចំណែកប្រវត្តិវិក្កយបត្រ, ការលក់, និងសវនកម្មពីមុនទាំងអស់ ត្រូវបានរក្សាទុកដដែល 100%។
                                                </p>
                                            </div>

                                            {/* Reason Textarea Card */}
                                            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-xs">
                                                <div className="flex items-center justify-between pb-1 border-b border-zinc-100 dark:border-zinc-800">
                                                    <div className="flex items-center gap-2 text-xs font-bold text-zinc-800 dark:text-zinc-200 font-khmer">
                                                        <FileText className="w-4 h-4 text-rose-500" />
                                                        <span>មូលហេតុច្បាស់លាស់នៃការផ្អាក (Mandatory Archive Reason)</span>
                                                        <span className="text-rose-500">*</span>
                                                    </div>
                                                </div>

                                                <div>
                                                    <textarea
                                                        required
                                                        rows={4}
                                                        value={archiveForm.data.reason}
                                                        onChange={(e) => archiveForm.setData('reason', e.target.value)}
                                                        placeholder="ឧទាហរណ៍៖ បុគ្គលិកឈប់ពីការងារនៅថ្ងៃទី... បានផ្ទេរការងារ និងទូទាត់ប្រាក់បំណាច់ចប់សព្វគ្រប់។"
                                                        className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white placeholder-zinc-400 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 font-khmer transition-all"
                                                    />
                                                    {archiveForm.errors.reason && (
                                                        <p className="text-xs text-rose-500 mt-1 font-khmer">{archiveForm.errors.reason}</p>
                                                    )}
                                                </div>

                                                {/* Quick Presets */}
                                                <div className="space-y-1.5 pt-1">
                                                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 font-khmer">
                                                        <Sparkles className="w-3.5 h-3.5 text-rose-500" />
                                                        <span>ជ្រើសរើសមូលហេតុគំរូរហ័ស (Quick Presets)៖</span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {[
                                                            'បុគ្គលិកឈប់ពីការងារ បានផ្ទេរភារកិច្ច និងទូទាត់ប្រាក់បំណាច់រួចរាល់',
                                                            'បញ្ចប់កិច្ចសន្យាការងារស្របតាមគោលការណ៍ហាង',
                                                            'ផ្អាកបណ្តោះអាសន្នតាមការស្នើសុំផ្ទាល់ខ្លួនរបស់បុគ្គលិក',
                                                            'ផ្អាកសិទ្ធិដោយសារការផ្ទេរភារកិច្ច ឬផ្លាស់ប្តូរផ្នែកការងារ',
                                                        ].map((preset, idx) => (
                                                            <button
                                                                key={idx}
                                                                type="button"
                                                                onClick={() => archiveForm.setData('reason', preset)}
                                                                className="px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/90 hover:border-rose-500/40 hover:bg-rose-500/5 text-zinc-700 dark:text-zinc-300 text-[11px] font-khmer transition-all cursor-pointer text-left"
                                                            >
                                                                {preset}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Restoration Notice */}
                                            <div className="p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 space-y-1.5 text-xs">
                                                <div className="flex items-center gap-2 font-bold text-zinc-800 dark:text-zinc-200 font-khmer">
                                                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                                    <span>លទ្ធភាពស្ដារឡើងវិញ (Account Restoration Option)</span>
                                                </div>
                                                <p className="text-zinc-600 dark:text-zinc-400 text-[11px] font-khmer leading-relaxed">
                                                    អ្នកគ្រប់គ្រងប្រព័ន្ធ (Admin) អាចស្ដារគណនីនេះឱ្យដំណើរការឡើងវិញបានគ្រប់ពេលវេលាពីក្នុងបញ្ជីបុគ្គលិកដែលបានផ្អាក (Archived Staff Tab)។
                                                </p>
                                            </div>
                                        </div>

                                        {/* RIGHT COLUMN: Staff Dossier & Deactivation Passport (5 cols) */}
                                        <div className="lg:col-span-5 space-y-4">
                                            <div className="sticky top-4 space-y-4">
                                                {/* Deactivation Passport Card */}
                                                <div className="rounded-2xl border p-5 space-y-4 shadow-sm relative overflow-hidden bg-gradient-to-br from-rose-950/40 via-zinc-900 to-zinc-950 border-rose-500/30 text-white">
                                                    {/* Watermark Seal */}
                                                    <div className="absolute -right-6 -bottom-6 opacity-10 pointer-events-none">
                                                        <Archive className="w-40 h-40 text-rose-400" />
                                                    </div>

                                                    {/* Top Banner */}
                                                    <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                                                        <div className="space-y-0.5">
                                                            <span className="text-[10px] font-mono tracking-widest uppercase text-zinc-400">
                                                                DEACTIVATION DOSSIER
                                                            </span>
                                                            <h4 className="text-sm font-bold text-white font-mono">
                                                                STAFF-{archiveTarget.id.toString().padStart(4, '0')}
                                                            </h4>
                                                        </div>
                                                        <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-xs">
                                                            ACTION PENDING
                                                        </span>
                                                    </div>

                                                    {/* User Details */}
                                                    <div className="space-y-2.5 text-xs font-mono border-b border-zinc-800/80 pb-3">
                                                        <div className="flex items-center justify-between text-zinc-400">
                                                            <span className="font-khmer">ឈ្មោះបុគ្គលិក៖</span>
                                                            <span className="text-white font-bold font-khmer">{archiveTarget.name}</span>
                                                        </div>
                                                        <div className="flex items-center justify-between text-zinc-400">
                                                            <span className="font-khmer">ឈ្មោះគណនី (Username)៖</span>
                                                            <span className="text-rose-400 font-bold">@{archiveTarget.username}</span>
                                                        </div>
                                                        <div className="flex items-center justify-between text-zinc-400">
                                                            <span className="font-khmer">តួនាទីបច្ចុប្បន្ន៖</span>
                                                            <span className="text-zinc-200 uppercase">{archiveTarget.role}</span>
                                                        </div>
                                                        <div className="flex items-center justify-between text-zinc-400">
                                                            <span className="font-khmer">សាខាឈរជើង៖</span>
                                                            <span className="text-emerald-400 font-khmer">
                                                                {archiveTarget.locations && archiveTarget.locations.length > 0
                                                                    ? archiveTarget.locations.map(l => l.name_primary).join(', ')
                                                                    : 'គ្រប់សាខា (All Locations)'}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Transition Status */}
                                                    <div className="p-3.5 rounded-xl bg-black/40 border border-zinc-800 flex items-center justify-between text-xs font-mono">
                                                        <div>
                                                            <span className="text-[10px] text-zinc-400 font-khmer block">ស្ថានភាពបច្ចុប្បន្ន</span>
                                                            <span className="text-emerald-400 font-bold">ACTIVE</span>
                                                        </div>
                                                        <ArrowLeft className="w-4 h-4 text-rose-400 rotate-180" />
                                                        <div className="text-right">
                                                            <span className="text-[10px] text-zinc-400 font-khmer block">ស្ថានភាពក្រោយផ្អាក</span>
                                                            <span className="text-rose-400 font-bold">ARCHIVED</span>
                                                        </div>
                                                    </div>

                                                    {/* Security Stamp Footer */}
                                                    <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[10px] font-mono text-zinc-500">
                                                        <span>AUDIT: USER_DEACTIVATION</span>
                                                        <span>PERMANENT LOGGING</span>
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
                                                onClick={() => {
                                                    setArchiveTarget(null);
                                                    archiveForm.reset();
                                                }}
                                                className="px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-xs font-semibold font-khmer transition-all cursor-pointer shadow-xs"
                                            >
                                                បោះបង់
                                            </button>

                                            <button
                                                type="submit"
                                                disabled={archiveForm.processing || !archiveForm.data.reason.trim()}
                                                className="px-6 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold font-khmer shadow-sm hover:shadow-rose-600/30 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <Archive className="w-4 h-4" />
                                                <span>
                                                    {archiveForm.processing
                                                        ? 'កំពុងផ្អាកគណនី...'
                                                        : 'បញ្ជាក់ការផ្អាកគណនីបុគ្គលិក (Execute Deactivation)'}
                                                </span>
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </div>,
                            document.body
                        )}
                    </div>
                )}

                {/* TAB 5: Audit Trail */}
                {activeTab === 'audits' && (
                    <div className="space-y-4">
                        <div>
                            <h2 className="text-base font-bold text-white">
                                Append-Only Polymorphic Audit Trail
                            </h2>
                            <p className="text-xs text-zinc-400">
                                Invariant INV-08: Historical events cannot be mutated or purged by normal application roles.
                            </p>
                        </div>

                        <Card className="p-0 overflow-hidden border-zinc-800">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-zinc-950/80 border-b border-zinc-800 text-zinc-400 font-mono uppercase text-[10px]">
                                        <tr>
                                            <th className="px-4 py-3">Timestamp</th>
                                            <th className="px-4 py-3">Action</th>
                                            <th className="px-4 py-3">Actor</th>
                                            <th className="px-4 py-3">Reason / Context</th>
                                            <th className="px-4 py-3">IP Address</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-800/60 font-mono text-[11px]">
                                        {audits.map((a) => (
                                            <tr key={a.id} className="hover:bg-zinc-900/40">
                                                <td className="px-4 py-2.5 text-zinc-400 whitespace-nowrap">
                                                    {a.created_at}
                                                </td>
                                                <td className="px-4 py-2.5 text-emerald-400 font-semibold">
                                                    {a.action}
                                                </td>
                                                <td className="px-4 py-2.5 text-zinc-300">
                                                    {a.actor?.username || 'System'}
                                                </td>
                                                <td className="px-4 py-2.5 text-zinc-400 italic">
                                                    {a.reason || '—'}
                                                </td>
                                                <td className="px-4 py-2.5 text-zinc-500">
                                                    {a.ip_address || '127.0.0.1'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </div>
                )}

                {/* TAB 6: Backup & Disaster Recovery */}
                {activeTab === 'backup' && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-base font-bold text-white flex items-center gap-2">
                                <Database className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                                <span>Full-Data Backup and Recoverable Restore Engine</span>
                            </h2>
                            <p className="text-xs text-zinc-400 mt-0.5">
                                Invariant INV-04: Deterministic, staged backup archives with per-table SHA-256 checksums and automated emergency recovery points.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Card 1: Full System Backup Export */}
                            <Card className="p-6 space-y-5 border-zinc-800 bg-zinc-900 shadow-sm">
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                            <Download className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                                            <span>System Backup Archive</span>
                                        </h3>
                                        <p className="text-xs text-zinc-400">
                                            Download a complete, self-describing archive of the live POS database.
                                        </p>
                                    </div>
                                    <Badge variant="emerald" className="text-[10px] font-mono">
                                        Format V2.0 ZIP
                                    </Badge>
                                </div>

                                <div className="space-y-2 rounded-xl bg-zinc-950/70 p-4 border border-zinc-800/80 text-xs">
                                    <h4 className="font-bold text-zinc-100 mb-2">Included 14 Authoritative Tables:</h4>
                                    <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px] text-zinc-300 font-medium">
                                        <div>• users & accounts</div>
                                        <div>• business_settings</div>
                                        <div>• locations & mappings</div>
                                        <div>• units master</div>
                                        <div>• product_categories</div>
                                        <div>• products catalog</div>
                                        <div>• accounting periods</div>
                                        <div>• documents headers</div>
                                        <div>• document_items (snapshots)</div>
                                        <div>• approval_requests</div>
                                        <div>• document_revisions</div>
                                        <div>• append-only audit_logs</div>
                                        <div>• hardware print_logs</div>
                                        <div>• format manifest.json</div>
                                    </div>
                                </div>

                                <div className="text-xs text-zinc-300 space-y-1">
                                    <p>• Automatically signs each table payload with SHA-256 cryptographic hashes.</p>
                                    <p>• Logs audit trail event <code className="text-emerald-500 dark:text-emerald-400 font-mono font-bold">backup.exported</code>.</p>
                                </div>

                                <form action="/settings/backup" method="POST" className="pt-2">
                                    <input
                                        type="hidden"
                                        name="_token"
                                        value={(document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || ''}
                                    />
                                    <Button
                                        type="submit"
                                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-md shadow-emerald-600/20"
                                    >
                                        <Download className="w-4 h-4 mr-2" />
                                        Download Full System Backup (.zip)
                                    </Button>
                                </form>
                            </Card>

                            {/* Card 2: Disaster Recovery Restore */}
                            <Card className="p-6 space-y-5 border-zinc-800 bg-zinc-900 shadow-sm">
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                            <UploadCloud className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                                            <span>Disaster Recovery Restore</span>
                                        </h3>
                                        <p className="text-xs text-zinc-400">
                                            Restore database tables from a verified V2.0 backup archive ZIP.
                                        </p>
                                    </div>
                                    <Badge variant="amber" className="text-[10px] font-mono">
                                        Atomic Transaction
                                    </Badge>
                                </div>

                                {/* Danger Warning Banner - High Contrast in Light & Dark Mode */}
                                <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/30 space-y-1.5">
                                    <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-300">
                                        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                                        <span>Atomicity & Safety Boundary</span>
                                    </div>
                                    <p className="text-[11.5px] leading-relaxed text-amber-950 dark:text-amber-200/90 font-medium">
                                        Live database tables will be atomically replaced in dependency order. A pre-restore emergency snapshot will be captured to <code className="font-mono text-[10.5px] bg-amber-500/20 dark:bg-zinc-950 text-amber-950 dark:text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30 dark:border-zinc-800 font-semibold">storage/app/backups/recovery_points/</code> prior to replacement.
                                    </p>
                                </div>

                                {/* File Input */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-zinc-100 block">
                                        Select Backup Archive File (.zip):
                                    </label>
                                    <input
                                        id="backup-file-input"
                                        type="file"
                                        accept=".zip"
                                        onChange={(e) => {
                                            setRestoreFile(e.target.files?.[0] || null);
                                            setInspectResult(null);
                                        }}
                                        className="w-full text-xs text-zinc-300 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-zinc-800 file:text-zinc-100 hover:file:bg-zinc-700 cursor-pointer bg-zinc-950 p-2 rounded-xl border border-zinc-800"
                                    />
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-3 pt-1">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={!restoreFile || isInspecting}
                                        onClick={handleInspectArchive}
                                        className="flex-1 text-xs border border-zinc-700 bg-zinc-800 text-zinc-100 hover:bg-zinc-700 font-semibold disabled:opacity-40"
                                    >
                                        <ShieldCheck className="w-4 h-4 mr-1.5 text-blue-500 dark:text-blue-400" />
                                        <span>{isInspecting ? 'Inspecting...' : 'Preflight Inspect Archive'}</span>
                                    </Button>

                                    <Button
                                        type="button"
                                        disabled={!restoreFile || isRestoring}
                                        onClick={() => setShowRestoreConfirm(true)}
                                        className="flex-1 text-xs bg-rose-600 hover:bg-rose-500 text-white font-semibold shadow-md shadow-rose-600/20 disabled:opacity-40"
                                    >
                                        <RotateCcw className="w-4 h-4 mr-1.5" />
                                        <span>Restore Database...</span>
                                    </Button>
                                </div>

                                {/* Inspection Results Card */}
                                {inspectResult && (
                                    <div
                                        className={`p-4 rounded-xl border text-xs space-y-2 ${
                                            inspectResult.valid
                                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200'
                                                : 'bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-200'
                                        }`}
                                    >
                                        {inspectResult.valid ? (
                                            <>
                                                <div className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-300">
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                                    <span>Preflight Integrity Verification Passed</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-zinc-700 dark:text-zinc-200 font-semibold pt-1">
                                                    <div>Manifest: V{inspectResult.format_version}</div>
                                                    <div>Tables: {inspectResult.tables_count} verified</div>
                                                    <div>Total Records: {inspectResult.total_rows}</div>
                                                    <div>Generated: {inspectResult.generated_at?.substring(0, 19)}</div>
                                                </div>
                                                <div className="text-[10.5px] text-emerald-700 dark:text-emerald-400 font-mono mt-1 font-bold">
                                                    ✓ All SHA-256 checksums match expected manifest digests.
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="flex items-center gap-2 font-bold text-rose-800 dark:text-rose-300">
                                                    <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                                                    <span>Archive Verification Failed</span>
                                                </div>
                                                <p className="text-[11px] text-rose-900 dark:text-rose-200 font-medium">
                                                    {inspectResult.error || 'The uploaded file does not comply with V2.0 blueprint standards.'}
                                                </p>
                                            </>
                                        )}
                                    </div>
                                )}
                            </Card>
                        </div>

                        {/* Recovery Architecture Specs Reference */}
                        <Card className="p-6 border-zinc-800 bg-zinc-950/60 space-y-3 shadow-xs">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-500 dark:text-emerald-400 font-mono flex items-center gap-2">
                                <FileArchive className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                                <span>Specification 11: Referential Integrity Guarantees</span>
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs leading-relaxed">
                                <div className="space-y-1.5">
                                    <h4 className="font-bold text-zinc-100">Foreign Key Safe Deletion Order:</h4>
                                    <p className="font-mono text-[11.5px] text-zinc-300 font-medium leading-relaxed">
                                        print_logs → revisions → items → approvals → documents → periods → products → categories → units → user_locations → locations → audits → settings → users
                                    </p>
                                </div>
                                <div className="space-y-1.5">
                                    <h4 className="font-bold text-zinc-100">Parent-First Insertion Order:</h4>
                                    <p className="font-mono text-[11.5px] text-zinc-300 font-medium leading-relaxed">
                                        users → settings → locations → user_locations → units → categories → products → periods → documents → items → approvals → revisions → audits → print_logs
                                    </p>
                                </div>
                            </div>
                        </Card>
                    </div>
                )}

                {/* Database Restore Full-Workspace Suite */}
                {mounted && showRestoreConfirm && createPortal(
                    <div
                        className="fixed inset-y-0 right-0 left-0 md:left-[var(--sidebar-width,16rem)] z-50 flex flex-col bg-zinc-50 dark:bg-zinc-950 overflow-hidden select-none animate-in fade-in duration-150 h-screen"
                        onWheel={(e) => e.stopPropagation()}
                    >
                        {/* Header Bar */}
                        <div className="h-16 px-6 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between shrink-0 shadow-xs">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center shrink-0">
                                    <Database className="w-5 h-5 text-rose-500" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 font-khmer">
                                            ស្ដារទិន្នន័យប្រព័ន្ធ និងជំនួសទិន្នន័យចាស់ (Database Restore & Rollback Protocol)
                                        </h2>
                                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                            CRITICAL OPERATION
                                        </span>
                                    </div>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-khmer flex items-center gap-2">
                                        <span>ឯកសារ៖ <span className="font-mono text-rose-600 dark:text-rose-400 font-bold">{restoreFile?.name}</span></span>
                                        <span>•</span>
                                        <span>ទំហំ៖ <span className="font-mono text-zinc-700 dark:text-zinc-300">{restoreFile?.size ? (restoreFile.size / 1024).toFixed(1) + ' KB' : 'N/A'}</span></span>
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    setShowRestoreConfirm(false);
                                    setRestoreAck(false);
                                }}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-xs font-semibold font-khmer transition-all cursor-pointer shadow-xs"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                <span>ត្រឡប់ក្រោយ</span>
                            </button>
                        </div>

                        {/* Content Area - 2 Columns */}
                        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                            {/* Left Column: Warnings, Protocol Steps & Mandatory Confirmation */}
                            <div className="w-full lg:w-7/12 p-6 lg:p-8 space-y-6 overflow-y-auto">
                                {/* Critical Warning Box */}
                                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-rose-900 dark:text-rose-200 text-xs leading-relaxed space-y-2">
                                    <div className="flex items-center gap-2 font-bold font-khmer text-rose-700 dark:text-rose-400">
                                        <AlertTriangle className="w-4 h-4 shrink-0" />
                                        <span>ការព្រមានកម្រិតខ្ពស់អំពីការជំនួសទិន្នន័យ (Destructive Rollback Warning)</span>
                                    </div>
                                    <p className="font-khmer text-zinc-700 dark:text-zinc-300 leading-relaxed">
                                        ប្រតិបត្តិការនេះនឹងធ្វើការលុបទិន្នន័យបច្ចុប្បន្នទាំងអស់ក្នុង Database (រាប់បញ្ចូលទាំងវិក្កយបត្រថ្មីៗ ប្រតិបត្តិការថតបេឡា និងទិន្នន័យអតិថិជនចុងក្រោយ) ហើយជំនួសមកវិញដោយទិន្នន័យដែលមាននៅក្នុងឯកសារ Backup នេះ។
                                    </p>
                                </div>

                                {/* Safety Pipeline & Guarantees */}
                                <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3.5 shadow-xs">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 font-khmer flex items-center gap-2">
                                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                        <span>យន្តការសុវត្ថិភាព និងលំដាប់លំដោយស្វ័យប្រវត្តិ (Safety Guarantees & Execution Pipeline)</span>
                                    </h4>

                                    <div className="space-y-2.5 text-xs text-zinc-600 dark:text-zinc-400 font-khmer">
                                        <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-100 dark:border-zinc-800/60">
                                            <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-mono font-bold text-[10px] shrink-0 mt-0.5">1</div>
                                            <div>
                                                <span className="font-bold text-zinc-900 dark:text-zinc-200 block">បង្កើតចំណុចសង្គ្រោះបន្ទាន់ស្វ័យប្រវត្តិ (Pre-Restore Emergency Snapshot)</span>
                                                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">ប្រព័ន្ធនឹងរក្សាទុក Backup ចុងក្រោយមួយដោយស្វ័យប្រវត្តិភ្លាមៗ មុនពេលចាប់ផ្ដើមលុបទិន្នន័យ។</span>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-100 dark:border-zinc-800/60">
                                            <div className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-mono font-bold text-[10px] shrink-0 mt-0.5">2</div>
                                            <div>
                                                <span className="font-bold text-zinc-900 dark:text-zinc-200 block">លុបតាមលំដាប់ Foreign Key Safe Deletion Order (Child to Parent)</span>
                                                <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">print_logs → revisions → items → approvals → documents → periods → products...</span>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-100 dark:border-zinc-800/60">
                                            <div className="w-5 h-5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-mono font-bold text-[10px] shrink-0 mt-0.5">3</div>
                                            <div>
                                                <span className="font-bold text-zinc-900 dark:text-zinc-200 block">បញ្ចូលតាមលំដាប់ Parent-First Insertion Order</span>
                                                <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">users → settings → locations → units → categories → products → documents...</span>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-100 dark:border-zinc-800/60">
                                            <div className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-mono font-bold text-[10px] shrink-0 mt-0.5">4</div>
                                            <div>
                                                <span className="font-bold text-zinc-900 dark:text-zinc-200 block">ផ្ទៀងផ្ទាត់ SHA-256 Checksum នៃរាល់ Table ទិន្នន័យ</span>
                                                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">ធានាថាទិន្នន័យមិនមានការកែប្រែ ឬខូចខាត (No File Tampering)។</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Mandatory Confirmation Checkbox */}
                                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                                    <label className="flex items-start gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={restoreAck}
                                            onChange={(e) => setRestoreAck(e.target.checked)}
                                            className="mt-0.5 w-4 h-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500 cursor-pointer"
                                        />
                                        <div className="text-xs font-khmer">
                                            <span className="font-bold text-zinc-900 dark:text-zinc-100 block">
                                                ខ្ញុំបញ្ជាក់ថាបានយល់ច្បាស់ និងយល់ព្រមជំនួសទិន្នន័យបច្ចុប្បន្ន (Mandatory Confirmation) *
                                            </span>
                                            <span className="text-zinc-600 dark:text-zinc-400 text-[11px]">
                                                ខ្ញុំយល់ថាប្រតិបត្តិការនេះមិនអាច Undo ត្រឡប់ក្រោយបានទេ ប្រសិនបើគ្មាន Emergency Snapshot។
                                            </span>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {/* Right Column: Database Rollback Live Certificate */}
                            <div className="w-full lg:w-5/12 p-6 lg:p-8 bg-zinc-900 border-l border-zinc-800 text-zinc-100 flex flex-col justify-between overflow-y-auto">
                                <div className="space-y-5">
                                    <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                                        <div>
                                            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">
                                                ROLLBACK PASSPORT
                                            </span>
                                            <h3 className="text-sm font-bold font-mono text-white">
                                                RESTORE MANIFEST CERTIFICATE
                                            </h3>
                                        </div>
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                                            restoreAck
                                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                                : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                                        }`}>
                                            {restoreAck ? 'EXECUTION READY' : 'AWAITING ACK'}
                                        </span>
                                    </div>

                                    {/* File Passport Details */}
                                    <div className="space-y-2.5 text-xs font-mono border-b border-zinc-800/80 pb-4">
                                        <div className="flex items-center justify-between text-zinc-400">
                                            <span className="font-khmer">ឯកសារស្ដារ៖</span>
                                            <span className="text-white font-bold truncate max-w-[200px]">{restoreFile?.name}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-zinc-400">
                                            <span className="font-khmer">ទំហំឯកសារ៖</span>
                                            <span className="text-zinc-200">
                                                {restoreFile?.size ? (restoreFile.size / 1024).toFixed(1) + ' KB' : 'N/A'}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-zinc-400">
                                            <span className="font-khmer">កាលបរិច្ឆេទឯកសារ៖</span>
                                            <span className="text-zinc-200">
                                                {restoreFile?.lastModified ? new Date(restoreFile.lastModified).toLocaleString('km-KH') : 'N/A'}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-zinc-400">
                                            <span className="font-khmer">ទម្រង់ម៉ានីហ្វេស៖</span>
                                            <span className="text-amber-400">
                                                {inspectResult?.format_version ? `V${inspectResult.format_version} Standard` : 'V2.0 Compatible'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Inspection Summary if available */}
                                    <div className="p-3.5 rounded-xl bg-black/40 border border-zinc-800 space-y-2 text-xs font-mono">
                                        <div className="flex items-center justify-between text-zinc-400">
                                            <span>Preflight Integrity:</span>
                                            <span className={inspectResult?.valid ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                                                {inspectResult?.valid ? 'VERIFIED (PASS)' : 'READY FOR RESTORE'}
                                            </span>
                                        </div>
                                        {inspectResult?.tables_count && (
                                            <div className="flex items-center justify-between text-zinc-400">
                                                <span>Tables in Archive:</span>
                                                <span className="text-white font-bold">{inspectResult.tables_count} Tables</span>
                                            </div>
                                        )}
                                        {inspectResult?.total_rows && (
                                            <div className="flex items-center justify-between text-zinc-400">
                                                <span>Total Data Records:</span>
                                                <span className="text-emerald-400 font-bold">{inspectResult.total_rows.toLocaleString()} Rows</span>
                                            </div>
                                        )}
                                        <div className="flex items-center justify-between text-zinc-400">
                                            <span>Emergency Snapshot:</span>
                                            <span className="text-emerald-400 font-bold">AUTOMATED (ENABLED)</span>
                                        </div>
                                    </div>

                                    {/* Transition Status */}
                                    <div className="p-3.5 rounded-xl bg-black/40 border border-zinc-800 flex items-center justify-between text-xs font-mono">
                                        <div>
                                            <span className="text-[10px] text-zinc-400 font-khmer block">ស្ថានភាពបច្ចុប្បន្ន</span>
                                            <span className="text-emerald-400 font-bold">LIVE DATABASE</span>
                                        </div>
                                        <ArrowLeft className="w-4 h-4 text-rose-400 rotate-180" />
                                        <div className="text-right">
                                            <span className="text-[10px] text-zinc-400 font-khmer block">ស្ថានភាពក្រោយស្ដារ</span>
                                            <span className="text-rose-400 font-bold">RESTORED SNAPSHOT</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Security Stamp Footer */}
                                <div className="pt-4 border-t border-zinc-800/80 flex items-center justify-between text-[10px] font-mono text-zinc-500">
                                    <span>AUDIT: DB_RESTORE_ROLLBACK</span>
                                    <span>SPEC-11 ENFORCED</span>
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
                                    disabled={isRestoring}
                                    onClick={() => {
                                        setShowRestoreConfirm(false);
                                        setRestoreAck(false);
                                    }}
                                    className="px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-xs font-semibold font-khmer transition-all cursor-pointer shadow-xs disabled:opacity-50"
                                >
                                    បោះបង់
                                </button>

                                <button
                                    type="button"
                                    disabled={isRestoring || !restoreAck}
                                    onClick={handleExecuteRestore}
                                    className="px-6 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold font-khmer shadow-sm hover:shadow-rose-600/30 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Database className="w-4 h-4" />
                                    <span>
                                        {isRestoring
                                            ? 'កំពុងស្ដារទិន្នន័យ... (Restoring Database)'
                                            : 'យល់ព្រមជំនួសទិន្នន័យ (Execute Database Restore)'}
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
            </div>
        </AppLayout>
    );
}
