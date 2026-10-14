import React, { useState } from 'react';
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

export default function SettingsIndex({
    settings,
    users,
    locations,
    audits,
}: SettingsPageProps) {
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
    const locForm = useForm({
        code: '',
        name_primary: '',
        name_secondary: '',
        address: '',
    });

    const submitLocation = (e: React.FormEvent) => {
        e.preventDefault();
        locForm.post('/settings/locations', {
            onSuccess: () => {
                setShowLocModal(false);
                locForm.reset();
            },
        });
    };

    // New User Modal State
    const [showUserModal, setShowUserModal] = useState(false);
    const userForm = useForm({
        name: '',
        username: '',
        password: '',
        role: 'cashier',
        location_ids: [locations[0]?.id || 1],
    });

    const submitUser = (e: React.FormEvent) => {
        e.preventDefault();
        userForm.post('/settings/users', {
            onSuccess: () => {
                setShowUserModal(false);
                userForm.reset();
            },
        });
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

                {/* TAB: Invoice & Print Designer (80mm / A4) */}
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
                            <Button size="sm" onClick={() => setShowLocModal(true)}>
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
                                    </div>
                                    <div className="text-xs text-zinc-500 pt-2 border-t border-zinc-800/80 flex items-center justify-between">
                                        <span>{loc.address || 'No physical address specified'}</span>
                                        <span className="font-mono">{loc.users_count} assigned staff</span>
                                    </div>
                                </Card>
                            ))}
                        </div>

                        {/* Modal: Add Location */}
                        {showLocModal && (
                            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                                <Card className="w-full max-w-md p-6 space-y-4 bg-zinc-900 border-zinc-800">
                                    <h3 className="text-base font-bold text-white">Create New Branch Location</h3>
                                    <form onSubmit={submitLocation} className="space-y-3">
                                        <Input
                                            id="loc_code"
                                            label="Location Code (e.g. LOC-02)"
                                            value={locForm.data.code}
                                            onChange={(e) => locForm.setData('code', e.target.value)}
                                            error={locForm.errors.code}
                                            required
                                        />
                                        <Input
                                            id="loc_name_primary"
                                            label="Name (Primary / English)"
                                            value={locForm.data.name_primary}
                                            onChange={(e) =>
                                                locForm.setData('name_primary', e.target.value)
                                            }
                                            error={locForm.errors.name_primary}
                                            required
                                        />
                                        <Input
                                            id="loc_name_secondary"
                                            label="Name (Secondary / Khmer)"
                                            value={locForm.data.name_secondary}
                                            onChange={(e) =>
                                                locForm.setData('name_secondary', e.target.value)
                                            }
                                            error={locForm.errors.name_secondary}
                                        />
                                        <Input
                                            id="loc_address"
                                            label="Address / Floor"
                                            value={locForm.data.address}
                                            onChange={(e) => locForm.setData('address', e.target.value)}
                                            error={locForm.errors.address}
                                        />
                                        <div className="flex justify-end gap-2 pt-2">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                onClick={() => setShowLocModal(false)}
                                            >
                                                Cancel
                                            </Button>
                                            <Button type="submit" disabled={locForm.processing}>
                                                Create Location
                                            </Button>
                                        </div>
                                    </form>
                                </Card>
                            </div>
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
                            <Button size="sm" onClick={() => setShowUserModal(true)}>
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
                                                            !isSelf && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() => setArchiveTarget(u)}
                                                                    className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                                                                >
                                                                    <Archive className="w-3.5 h-3.5" />
                                                                    <span>Archive</span>
                                                                </Button>
                                                            )
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </Card>

                        {/* Modal: Create User */}
                        {showUserModal && (
                            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                                <Card className="w-full max-w-md p-6 space-y-4 bg-zinc-900 border-zinc-800">
                                    <h3 className="text-base font-bold text-white">Create Staff Account</h3>
                                    <form onSubmit={submitUser} className="space-y-3">
                                        <Input
                                            id="staff_name"
                                            label="Full Name"
                                            value={userForm.data.name}
                                            onChange={(e) => userForm.setData('name', e.target.value)}
                                            error={userForm.errors.name}
                                            required
                                        />
                                        <Input
                                            id="staff_username"
                                            label="Username"
                                            value={userForm.data.username}
                                            onChange={(e) =>
                                                userForm.setData('username', e.target.value)
                                            }
                                            error={userForm.errors.username}
                                            required
                                        />
                                        <Input
                                            id="staff_password"
                                            label="Initial Password"
                                            type="password"
                                            value={userForm.data.password}
                                            onChange={(e) =>
                                                userForm.setData('password', e.target.value)
                                            }
                                            error={userForm.errors.password}
                                            required
                                        />
                                        <div className="space-y-1.5">
                                            <label className="block text-xs font-medium text-zinc-400">
                                                Role
                                            </label>
                                            <select
                                                value={userForm.data.role}
                                                onChange={(e) => userForm.setData('role', e.target.value)}
                                                className="w-full px-3.5 py-2 text-sm text-zinc-100 bg-zinc-950 border border-zinc-800 rounded-lg outline-none focus:border-emerald-500"
                                            >
                                                <option value="cashier">Cashier / Operator</option>
                                                <option value="supervisor">Supervisor</option>
                                                <option value="admin">Administrator</option>
                                            </select>
                                        </div>

                                        <div className="flex justify-end gap-2 pt-2">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                onClick={() => setShowUserModal(false)}
                                            >
                                                Cancel
                                            </Button>
                                            <Button type="submit" disabled={userForm.processing}>
                                                Create Account
                                            </Button>
                                        </div>
                                    </form>
                                </Card>
                            </div>
                        )}

                        {/* Modal: Archive User Confirmation */}
                        {archiveTarget && (
                            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                                <Card className="w-full max-w-md p-6 space-y-4 bg-zinc-900 border-zinc-800">
                                    <div className="flex items-center gap-2 text-rose-400">
                                        <AlertCircle className="w-5 h-5" />
                                        <h3 className="text-base font-bold">
                                            Archive Staff Member: {archiveTarget.username}
                                        </h3>
                                    </div>
                                    <p className="text-xs text-zinc-400">
                                        Per invariant INV-07, historical operators are never deleted. Archiving deactivates account login while preserving full audit history.
                                    </p>
                                    <form onSubmit={submitArchive} className="space-y-3">
                                        <div className="space-y-1.5">
                                            <label className="block text-xs font-medium text-zinc-300">
                                                Mandatory Archive Reason / មូលហេតុ
                                            </label>
                                            <textarea
                                                required
                                                value={archiveForm.data.reason}
                                                onChange={(e) =>
                                                    archiveForm.setData('reason', e.target.value)
                                                }
                                                placeholder="e.g. Resigned on 2026-10-13, completed clearance."
                                                className="w-full px-3 py-2 text-xs text-zinc-100 bg-zinc-950 border border-zinc-800 rounded-lg outline-none focus:border-rose-500"
                                                rows={3}
                                            />
                                            {archiveForm.errors.reason && (
                                                <p className="text-xs text-rose-400">
                                                    {archiveForm.errors.reason}
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex justify-end gap-2 pt-2">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                onClick={() => setArchiveTarget(null)}
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                type="submit"
                                                variant="danger"
                                                disabled={archiveForm.processing}
                                            >
                                                Confirm Archive
                                            </Button>
                                        </div>
                                    </form>
                                </Card>
                            </div>
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
                                <Database className="w-5 h-5 text-emerald-400" />
                                Full-Data Backup and Recoverable Restore Engine
                            </h2>
                            <p className="text-xs text-zinc-400">
                                Invariant INV-04: Deterministic, staged backup archives with per-table SHA-256 checksums and automated emergency recovery points.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Card 1: Full System Backup Export */}
                            <Card className="p-6 space-y-5 border-zinc-800 bg-zinc-900/40">
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                            <Download className="w-4 h-4 text-emerald-400" />
                                            System Backup Archive
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
                                    <h4 className="font-semibold text-zinc-300 mb-2">Included 14 Authoritative Tables:</h4>
                                    <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px] text-zinc-400">
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

                                <div className="text-xs text-zinc-400 space-y-1">
                                    <p>• Automatically signs each table payload with SHA-256 cryptographic hashes.</p>
                                    <p>• Logs audit trail event <code className="text-emerald-400 font-mono">backup.exported</code>.</p>
                                </div>

                                <form action="/settings/backup" method="POST" className="pt-2">
                                    <input
                                        type="hidden"
                                        name="_token"
                                        value={(document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || ''}
                                    />
                                    <Button
                                        type="submit"
                                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-lg shadow-emerald-950/40"
                                    >
                                        <Download className="w-4 h-4 mr-2" />
                                        Download Full System Backup (.zip)
                                    </Button>
                                </form>
                            </Card>

                            {/* Card 2: Disaster Recovery Restore */}
                            <Card className="p-6 space-y-5 border-zinc-800 bg-zinc-900/40">
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                            <UploadCloud className="w-4 h-4 text-amber-400" />
                                            Disaster Recovery Restore
                                        </h3>
                                        <p className="text-xs text-zinc-400">
                                            Restore database tables from a verified V2.0 backup archive ZIP.
                                        </p>
                                    </div>
                                    <Badge variant="amber" className="text-[10px] font-mono">
                                        Atomic Transaction
                                    </Badge>
                                </div>

                                {/* Danger Warning Banner */}
                                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200/90 text-xs space-y-1.5">
                                    <div className="flex items-center gap-2 font-bold text-amber-300">
                                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                                        <span>Atomicity & Safety Boundary</span>
                                    </div>
                                    <p className="text-[11px] leading-relaxed text-amber-200/80">
                                        Live database tables will be atomically replaced in dependency order. A pre-restore emergency snapshot will be captured to <code className="font-mono text-[10px] bg-zinc-950 px-1 py-0.5 rounded">storage/app/backups/recovery_points/</code> prior to replacement.
                                    </p>
                                </div>

                                {/* File Input */}
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-zinc-300 block">
                                        Select Backup Archive File (.zip):
                                    </label>
                                    <input
                                        type="file"
                                        accept=".zip"
                                        onChange={(e) => {
                                            setRestoreFile(e.target.files?.[0] || null);
                                            setInspectResult(null);
                                        }}
                                        className="w-full text-xs text-zinc-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-zinc-800 file:text-zinc-200 hover:file:bg-zinc-700 cursor-pointer bg-zinc-950 p-2 rounded-xl border border-zinc-800"
                                    />
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-3 pt-1">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={!restoreFile || isInspecting}
                                        onClick={handleInspectArchive}
                                        className="flex-1 text-xs border-zinc-700 hover:bg-zinc-800 text-zinc-200"
                                    >
                                        <ShieldCheck className="w-4 h-4 mr-1.5 text-blue-400" />
                                        <span>{isInspecting ? 'Inspecting...' : 'Preflight Inspect Archive'}</span>
                                    </Button>

                                    <Button
                                        type="button"
                                        disabled={!restoreFile || isRestoring}
                                        onClick={() => setShowRestoreConfirm(true)}
                                        className="flex-1 text-xs bg-rose-600 hover:bg-rose-500 text-white font-semibold"
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
                                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                                                : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                                        }`}
                                    >
                                        {inspectResult.valid ? (
                                            <>
                                                <div className="flex items-center gap-2 font-bold text-emerald-300">
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                                    <span>Preflight Integrity Verification Passed</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-zinc-300 pt-1">
                                                    <div>Manifest: V{inspectResult.format_version}</div>
                                                    <div>Tables: {inspectResult.tables_count} verified</div>
                                                    <div>Total Records: {inspectResult.total_rows}</div>
                                                    <div>Generated: {inspectResult.generated_at?.substring(0, 19)}</div>
                                                </div>
                                                <div className="text-[10px] text-emerald-400 font-mono mt-1">
                                                    ✓ All SHA-256 checksums match expected manifest digests.
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="flex items-center gap-2 font-bold text-rose-300">
                                                    <AlertCircle className="w-4 h-4 text-rose-400" />
                                                    <span>Archive Verification Failed</span>
                                                </div>
                                                <p className="text-[11px] text-rose-200">
                                                    {inspectResult.error || 'The uploaded file does not comply with V2.0 blueprint standards.'}
                                                </p>
                                            </>
                                        )}
                                    </div>
                                )}
                            </Card>
                        </div>

                        {/* Recovery Architecture Specs Reference */}
                        <Card className="p-6 border-zinc-800 bg-zinc-950/50 space-y-3">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-mono flex items-center gap-2">
                                <FileArchive className="w-4 h-4 text-emerald-400" />
                                Specification 11: Referential Integrity Guarantees
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-zinc-400 leading-relaxed">
                                <div className="space-y-1">
                                    <h4 className="font-semibold text-zinc-200">Foreign Key Safe Deletion Order:</h4>
                                    <p className="font-mono text-[11px] text-zinc-500">
                                        print_logs → revisions → items → approvals → documents → periods → products → categories → units → user_locations → locations → audits → settings → users
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <h4 className="font-semibold text-zinc-200">Parent-First Insertion Order:</h4>
                                    <p className="font-mono text-[11px] text-zinc-500">
                                        users → settings → locations → user_locations → units → categories → products → periods → documents → items → approvals → revisions → audits → print_logs
                                    </p>
                                </div>
                            </div>
                        </Card>
                    </div>
                )}

                {/* Restore Confirmation Modal */}
                {showRestoreConfirm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <Card className="max-w-md w-full p-6 space-y-4 border-rose-600/40 bg-zinc-950 shadow-2xl animate-in fade-in zoom-in-95">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center shrink-0">
                                    <AlertTriangle className="w-5 h-5 text-rose-400" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-white">
                                        Confirm Destructive Database Restore
                                    </h3>
                                    <p className="text-xs text-zinc-400">
                                        Archive: {restoreFile?.name}
                                    </p>
                                </div>
                            </div>

                            <p className="text-xs text-zinc-300 leading-relaxed">
                                Are you sure you want to replace live data? All existing database tables will be cleared and replaced with the contents of this archive. An emergency recovery point will be saved first to disk.
                            </p>

                            <div className="flex items-center justify-end gap-3 pt-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={isRestoring}
                                    onClick={() => setShowRestoreConfirm(false)}
                                    className="border-zinc-700 text-zinc-300"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    disabled={isRestoring}
                                    onClick={handleExecuteRestore}
                                    className="bg-rose-600 hover:bg-rose-500 text-white font-semibold"
                                >
                                    {isRestoring ? 'Restoring Database...' : 'Yes, Replace Database Now'}
                                </Button>
                            </div>
                        </Card>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
