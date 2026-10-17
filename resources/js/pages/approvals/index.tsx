import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AppLayout } from '@/layouts/app-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useForm, usePage } from '@inertiajs/react';
import { PageProps } from '@/types';
import {
    ShieldCheck,
    Clock,
    User as UserIcon,
    AlertCircle,
    CheckCircle2,
    XCircle,
    ReceiptText,
    FileText,
    ArrowLeft,
    Sparkles,
    Check,
    AlertTriangle,
    Hash,
    Calendar,
    Lock,
    ShieldAlert,
    KeyRound,
} from 'lucide-react';
import { tr } from '@/locales/tr';

interface ApprovalItem {
    id: number;
    request_type: string;
    target_type: string;
    target_id: number;
    reason: string;
    requested_changes?: Record<string, unknown> | null;
    status: 'pending' | 'approved' | 'rejected' | 'expired' | 'used';
    requested_by: number;
    requester: { id: number; name: string; username: string };
    reviewer?: { id: number; name: string; username: string } | null;
    review_note?: string | null;
    reviewed_at?: string | null;
    expires_at?: string | null;
    used_at?: string | null;
    created_at: string;
    document?: { id: number; document_number: string | null; reference_identifier: string | null } | null;
}

interface ApprovalsPageProps {
    approvals: ApprovalItem[];
}

export default function ApprovalsIndex({ approvals }: ApprovalsPageProps) {
    const { auth } = usePage<PageProps>().props;
    const user = auth.user;
    const isAdmin = user?.role === 'admin';

    const [mounted, setMounted] = useState(false);
    const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected' | 'used' | 'expired'>('pending');
    const [selectedApproval, setSelectedApproval] = useState<ApprovalItem | null>(null);
    const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');

    const approveForm = useForm({ review_note: 'Approved by administrator' });
    const rejectForm = useForm({ review_note: '' });

    useEffect(() => {
        setMounted(true);
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && selectedApproval) {
                setSelectedApproval(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedApproval]);

    useEffect(() => {
        if (selectedApproval) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [selectedApproval]);

    const getRequestTypeMeta = (type: string) => {
        switch (type) {
            case 'price_override':
                return {
                    labelKh: 'កែប្រែតម្លៃលក់ពិសេស',
                    labelEn: 'Price Override',
                    badgeVariant: 'amber' as const,
                    color: 'text-amber-500 dark:text-amber-400',
                    bgColor: 'bg-amber-500/10',
                    borderColor: 'border-amber-500/20',
                };
            case 'void':
                return {
                    labelKh: 'បោះបង់វិក្កយបត្រសម្រេច',
                    labelEn: 'Void Document',
                    badgeVariant: 'rose' as const,
                    color: 'text-rose-500 dark:text-rose-400',
                    bgColor: 'bg-rose-500/10',
                    borderColor: 'border-rose-500/20',
                };
            case 'edit_finalized':
                return {
                    labelKh: 'កែប្រែឯកសារដែលបានបិទបញ្ជី',
                    labelEn: 'Edit Finalized',
                    badgeVariant: 'sky' as const,
                    color: 'text-sky-500 dark:text-sky-400',
                    bgColor: 'bg-sky-500/10',
                    borderColor: 'border-sky-500/20',
                };
            case 'reopen_period':
                return {
                    labelKh: 'បើកការិយបរិច្ឆេទគណនេយ្យឡើងវិញ',
                    labelEn: 'Reopen Period',
                    badgeVariant: 'indigo' as const,
                    color: 'text-indigo-500 dark:text-indigo-400',
                    bgColor: 'bg-indigo-500/10',
                    borderColor: 'border-indigo-500/20',
                };
            default:
                return {
                    labelKh: type.replace('_', ' '),
                    labelEn: type.replace('_', ' '),
                    badgeVariant: 'neutral' as const,
                    color: 'text-zinc-500 dark:text-zinc-400',
                    bgColor: 'bg-zinc-500/10',
                    borderColor: 'border-zinc-500/20',
                };
        }
    };

    const tabConfig = [
        { key: 'pending', labelKh: 'រង់ចាំពិនិត្យ', labelEn: 'Pending', count: approvals.filter((a) => a.status === 'pending').length },
        { key: 'approved', labelKh: 'បានអនុម័ត', labelEn: 'Approved', count: approvals.filter((a) => a.status === 'approved').length },
        { key: 'rejected', labelKh: 'បានបដិសេធ', labelEn: 'Rejected', count: approvals.filter((a) => a.status === 'rejected').length },
        { key: 'used', labelKh: 'បានប្រើប្រាស់', labelEn: 'Used', count: approvals.filter((a) => a.status === 'used').length },
        { key: 'expired', labelKh: 'ផុតកំណត់', labelEn: 'Expired', count: approvals.filter((a) => a.status === 'expired').length },
    ] as const;

    const filtered = approvals.filter((a) => {
        if (activeTab === 'pending') return a.status === 'pending';
        if (activeTab === 'approved') return a.status === 'approved';
        if (activeTab === 'rejected') return a.status === 'rejected';
        if (activeTab === 'used') return a.status === 'used';
        if (activeTab === 'expired') return a.status === 'expired';
        return true;
    });

    const submitApprove = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedApproval) return;
        approveForm.post(`/approvals/${selectedApproval.id}/approve`, {
            onSuccess: () => {
                setSelectedApproval(null);
            },
        });
    };

    const submitReject = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedApproval) return;
        rejectForm.post(`/approvals/${selectedApproval.id}/reject`, {
            onSuccess: () => {
                setSelectedApproval(null);
            },
        });
    };

    const approvePresets = [
        tr('អនុម័តសម្រាប់ការបញ្ចុះតម្លៃពិសេសអតិថិជន VIP'),
        tr('អនុម័តបោះបង់វិក្កយបត្រតាមការស្នើសុំជាក់ស្តែង'),
        tr('អនុម័តកែប្រែទិន្នន័យដោយមានការផ្ទៀងផ្ទាត់ត្រឹមត្រូវ'),
        'Approved by administrator - Verified authentic',
    ];

    const rejectPresets = [
        tr('បដិសេធដោយសារមិនមានឯកសារយោងគ្រប់គ្រាន់'),
        tr('បដិសេធ៖ ព័ត៌មានស្នើសុំមិនស្របតាមគោលការណ៍ហាង'),
        tr('បដិសេធ៖ តម្លៃស្នើសុំទាបជាងតម្លៃដើមផលិតផល'),
        'Rejected by administrator - Insufficient justification',
    ];

    const isApproving = actionType === 'approve';
    const currentForm = isApproving ? approveForm : rejectForm;

    return (
        <AppLayout title={tr("ប្រព័ន្ធគ្រប់គ្រងការអនុម័តលើកលែង (Approvals Inbox)")}>
            <div className="space-y-6">
                {/* Fixed / Sticky Header & Tabs Controls */}
                <div className="sticky top-14 md:top-0 z-20 bg-zinc-950/95 backdrop-blur-xl -mt-6 pt-6 pb-4 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 border-b border-zinc-800/80 space-y-4 shadow-xs">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-xs">
                                    <ShieldCheck className="w-5 h-5" />
                                </div>
                                <div>
                                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-khmer flex items-center gap-2.5">
                                        <span>{tr('ប្រព័ន្ធគ្រប់គ្រងការអនុម័តលើកលែង')}</span>
                                        <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-normal">
                                            {approvals.filter((a) => a.status === 'pending').length} {tr('រង់ចាំ')}
                                        </span>
                                    </h1>
                                    <p className="text-xs text-zinc-400 mt-0.5 font-khmer">
                                        {tr('Invariant INV-06: ការអនុញ្ញាតកម្រិតរដ្ឋបាលលើប្រតិបត្តិការបញ្ចុះតម្លៃ, បោះបង់វិក្កយបត្រ និងការបើកការិយបរិច្ឆេទគណនេយ្យ')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tabs Filter */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                        {tabConfig.map((tab) => {
                            const isActive = activeTab === tab.key;
                            return (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer font-khmer flex items-center gap-2 shrink-0 ${
                                        isActive
                                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-xs'
                                            : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent'
                                    }`}
                                >
                                    <span>{tab.labelKh}</span>
                                    <span className="font-mono text-[10px] opacity-70">
                                        ({tab.count})
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Approvals Cards */}
                <div className="space-y-3">
                    {filtered.length === 0 ? (
                        <div className="py-16 text-center rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 space-y-3">
                            <div className="w-12 h-12 rounded-2xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center mx-auto text-zinc-400">
                                <ShieldCheck className="w-6 h-6" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-sm font-bold text-white font-khmer">{tr('មិនមានសំណើក្នុងស្ថានភាពនេះទេ')}</h3>
                                <p className="text-xs text-zinc-500 font-khmer">
                                    ពុំមានសំណើអនុម័តដែលត្រូវពិនិត្យក្នុងផ្នែក '{activeTab}' នោះឡើយ
                                </p>
                            </div>
                        </div>
                    ) : (
                        filtered.map((item) => {
                            const typeMeta = getRequestTypeMeta(item.request_type);
                            return (
                                <div
                                    key={item.id}
                                    className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700/80 transition-all shadow-xs space-y-4"
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
                                        <div className="flex flex-wrap items-center gap-2.5">
                                            <span
                                                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase font-khmer border ${typeMeta.bgColor} ${typeMeta.color} ${typeMeta.borderColor}`}
                                            >
                                                {typeMeta.labelKh}
                                            </span>
                                            <span className="text-xs font-bold text-white font-mono">
                                                Target: {item.target_type} #{item.target_id}
                                            </span>
                                            {item.document && (
                                                <span className="text-xs text-emerald-400 font-mono px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                                                    {item.document.document_number || `Draft #${item.document.id}`}
                                                    {item.document.reference_identifier ? ` • ${tr('តុ')} ${item.document.reference_identifier}` : ''}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                                            <span className="flex items-center gap-1.5">
                                                <UserIcon className="w-3.5 h-3.5 text-zinc-500" />
                                                <span>{tr('ស្នើសុំដោយ៖')} <strong className="text-zinc-200">{item.requester.username}</strong></span>
                                            </span>
                                            <span className="text-zinc-600">•</span>
                                            <span className="flex items-center gap-1 text-zinc-400">
                                                <Clock className="w-3.5 h-3.5 text-zinc-500" />
                                                <span>{item.created_at ? item.created_at.replace('T', ' ').slice(0, 19) : ''}</span>
                                            </span>
                                        </div>
                                    </div>

                                    <div className="text-xs text-zinc-300 rounded-xl bg-zinc-950/60 p-3.5 border border-zinc-800/60 space-y-1">
                                        <span className="text-zinc-400 font-medium font-khmer block text-[11px]">{tr('មូលហេតុនៃការស្នើសុំ (Reason)៖')}</span>
                                        <p className="text-zinc-200 italic font-sans text-xs">
                                            "{item.reason}"
                                        </p>
                                    </div>

                                    {/* Review Details if Reviewed */}
                                    {item.reviewed_at && (
                                        <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 text-xs font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                            <div className="space-x-2">
                                                <span className="text-zinc-500">{tr('ពិនិត្យដោយ៖')}</span>
                                                <span className="text-emerald-400 font-semibold">{item.reviewer?.username || 'Admin'}</span>
                                                <span className="text-zinc-600">|</span>
                                                <span className="text-zinc-500">{tr('កំណត់ចំណាំ៖')}</span>
                                                <span className="text-zinc-300 italic font-sans">"{item.review_note}"</span>
                                            </div>
                                            {item.expires_at && (
                                                <div className="text-amber-400 flex items-center gap-1.5 text-[11px] shrink-0 font-mono">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    <span>{tr('ផុតកំណត់៖')} {item.expires_at.replace('T', ' ').slice(0, 19)}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Admin Action Buttons */}
                                    {isAdmin && item.status === 'pending' && (
                                        <div className="pt-1 flex items-center justify-end gap-2.5">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedApproval(item);
                                                    setActionType('reject');
                                                    rejectForm.setData('review_note', '');
                                                }}
                                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs font-semibold font-khmer transition-all cursor-pointer shadow-xs"
                                            >
                                                <XCircle className="w-3.5 h-3.5" />
                                                <span>{tr('បដិសេធ (Reject)')}</span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedApproval(item);
                                                    setActionType('approve');
                                                    approveForm.setData('review_note', 'Approved by administrator');
                                                }}
                                                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold font-khmer shadow-sm hover:shadow-emerald-600/30 transition-all cursor-pointer"
                                            >
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                <span>{tr('ពិនិត្យ & អនុម័ត (Review & Approve)')}</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* FULL-WORKSPACE DECISION SUITE */}
                {selectedApproval && mounted && createPortal(
                    <div
                        className="fixed inset-y-0 right-0 left-0 md:left-[var(--sidebar-width,16rem)] z-50 flex flex-col bg-zinc-50 dark:bg-zinc-950 overflow-hidden select-none animate-in fade-in duration-150 h-screen"
                        onWheel={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="px-6 py-3.5 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between shrink-0 shadow-xs">
                            <div className="flex items-center gap-3">
                                <div
                                    className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-xs shrink-0 border ${
                                        isApproving
                                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                                            : 'bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400'
                                    }`}
                                >
                                    {isApproving ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-base font-bold text-zinc-900 dark:text-white font-khmer">
                                            {isApproving ? tr('ពិនិត្យ និងយល់ព្រមអនុម័តសំណើ') : tr('ពិនិត្យ និងបដិសេធសំណើលើកលែង')}
                                        </h3>
                                        <span
                                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase font-mono border ${
                                                isApproving
                                                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                                                    : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20'
                                            }`}
                                        >
                                            Request #{selectedApproval.id}
                                        </span>
                                    </div>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-khmer">
                                        {isApproving
                                            ? tr('ផ្ដល់សិទ្ធិអនុញ្ញាត 30 នាទី សម្រាប់ប្រតិបត្តិការពិសេសនេះ')
                                            : tr('បដិសេធសំណើ និងបញ្ឈប់រាល់ការអនុញ្ញាតមិនប្រក្រតី')}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedApproval(null)}
                                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-950 dark:hover:text-white transition-all cursor-pointer font-khmer text-xs font-semibold shadow-xs group"
                                title={tr("ត្រឡប់ក្រោយ (Esc)")}
                            >
                                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform text-emerald-600 dark:text-emerald-400" />
                                <span>{tr('ត្រឡប់ក្រោយ')}</span>
                            </button>
                        </div>

                        {/* Body - 2 Columns (7 / 5) */}
                        <form
                            onSubmit={isApproving ? submitApprove : submitReject}
                            className="flex flex-col flex-1 min-h-0 overflow-y-auto"
                        >
                            <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1">
                                {/* LEFT COLUMN: Actions & Notes (7 cols) */}
                                <div className="lg:col-span-7 space-y-4">
                                    {/* Action Selector */}
                                    <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-xs">
                                        <div className="flex items-center gap-2 text-xs font-bold text-zinc-800 dark:text-zinc-200 font-khmer pb-1 border-b border-zinc-100 dark:border-zinc-800">
                                            <KeyRound className="w-4 h-4 text-emerald-500" />
                                            <span>{tr('ការសម្រេចចិត្ត / Decision Action')}</span>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setActionType('approve');
                                                    if (!approveForm.data.review_note) {
                                                        approveForm.setData('review_note', 'Approved by administrator');
                                                    }
                                                }}
                                                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                                                    isApproving
                                                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-950 dark:text-white shadow-xs ring-2 ring-emerald-500/20'
                                                        : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between w-full">
                                                    <div className="flex items-center gap-2 font-bold font-khmer text-xs">
                                                        <CheckCircle2 className={`w-4 h-4 ${isApproving ? 'text-emerald-500' : 'text-zinc-400'}`} />
                                                        <span>{tr('យល់ព្រមអនុម័ត (Approve)')}</span>
                                                    </div>
                                                    {isApproving && (
                                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                                    )}
                                                </div>
                                                <p className="text-[11px] font-khmer text-zinc-500 dark:text-zinc-400 leading-relaxed">
                                                    {tr('ផ្ដល់សិទ្ធិសុពលភាព 30 នាទី សម្រាប់ដំណើរការប្រតិបត្តិការនេះ (One-time token)')}
                                                </p>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setActionType('reject')}
                                                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                                                    !isApproving
                                                        ? 'bg-rose-500/10 border-rose-500 text-rose-950 dark:text-white shadow-xs ring-2 ring-rose-500/20'
                                                        : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between w-full">
                                                    <div className="flex items-center gap-2 font-bold font-khmer text-xs">
                                                        <XCircle className={`w-4 h-4 ${!isApproving ? 'text-rose-500' : 'text-zinc-400'}`} />
                                                        <span>{tr('បដិសេធសំណើ (Reject)')}</span>
                                                    </div>
                                                    {!isApproving && (
                                                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                                                    )}
                                                </div>
                                                <p className="text-[11px] font-khmer text-zinc-500 dark:text-zinc-400 leading-relaxed">
                                                    {tr('បដិសេធសំណើ និងទប់ស្កាត់រាល់ការអនុញ្ញាតមិនប្រក្រតីភ្លាមៗ')}
                                                </p>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Administrative Note */}
                                    <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-xs">
                                        <div className="flex items-center justify-between pb-1 border-b border-zinc-100 dark:border-zinc-800">
                                            <div className="flex items-center gap-2 text-xs font-bold text-zinc-800 dark:text-zinc-200 font-khmer">
                                                <FileText className="w-4 h-4 text-emerald-500" />
                                                <span>{tr('កំណត់ចំណាំរដ្ឋបាល (Administrative Note)')}</span>
                                                <span className="text-rose-500">*</span>
                                            </div>
                                            <span className="text-[10px] text-zinc-400 font-mono">
                                                {currentForm.data.review_note.length} {tr('តួអក្សរ')}
                                            </span>
                                        </div>

                                        <div>
                                            <textarea
                                                required
                                                rows={4}
                                                value={currentForm.data.review_note}
                                                onChange={(e) => currentForm.setData('review_note', e.target.value)}
                                                placeholder={
                                                    isApproving
                                                        ? tr('ឧទាហរណ៍៖ អនុម័តសម្រាប់ការបញ្ចុះតម្លៃពិសេសអតិថិជន VIP...')
                                                        : tr('ឧទាហរណ៍៖ បដិសេធដោយសារមិនមានឯកសារយោងគ្រប់គ្រាន់...')
                                                }
                                                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder-zinc-400 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all font-sans"
                                            />
                                            {currentForm.errors.review_note && (
                                                <p className="text-rose-500 text-xs mt-1 font-khmer">{currentForm.errors.review_note}</p>
                                            )}
                                        </div>

                                        {/* Quick Presets */}
                                        <div className="space-y-2 pt-1">
                                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 font-khmer">
                                                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                                <span>{tr('ជ្រើសរើសកំណត់ចំណាំរហ័ស (Quick Presets)៖')}</span>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {(isApproving ? approvePresets : rejectPresets).map((preset, idx) => (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        onClick={() => currentForm.setData('review_note', preset)}
                                                        className="px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/90 hover:border-emerald-500/40 hover:bg-emerald-500/5 text-zinc-700 dark:text-zinc-300 text-[11px] font-khmer transition-all cursor-pointer text-left"
                                                    >
                                                        {preset}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Security & Audit Notice */}
                                    <div className="p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 space-y-2 text-xs">
                                        <div className="flex items-center gap-2 font-bold text-zinc-800 dark:text-zinc-200 font-khmer">
                                            <Lock className="w-4 h-4 text-emerald-500" />
                                            <span>{tr('គោលការណ៍សុវត្ថិភាព INV-06 (Security & Audit Compliance)')}</span>
                                        </div>
                                        <p className="text-zinc-600 dark:text-zinc-400 text-[11px] font-khmer leading-relaxed">
                                            {tr('រាល់ការសម្រេចចិត្តអនុម័ត នឹងត្រូវកត់ត្រាចូលក្នុងប្រព័ន្ធសវនកម្ម (Audit Log) ជាអចិន្ត្រៃយ៍ រួមទាំងឈ្មោះអ្នកអនុម័ត, អាសយដ្ឋាន IP និងពេលវេលាជាក់ស្តែង។ សំណើដែលបានអនុម័តមានសុពលភាពត្រឹមតែ 30 នាទីប៉ុណ្ណោះ។')}
                                        </p>
                                    </div>
                                </div>

                                {/* RIGHT COLUMN: Live Authorization Passport (5 cols) */}
                                <div className="lg:col-span-5 space-y-4">
                                    <div className="sticky top-4 space-y-4">
                                        {/* Digital Security Passport Card */}
                                        <div
                                            className={`rounded-2xl border p-5 space-y-4 shadow-sm relative overflow-hidden ${
                                                isApproving
                                                    ? 'bg-gradient-to-br from-emerald-950/40 via-zinc-900 to-zinc-950 border-emerald-500/30'
                                                    : 'bg-gradient-to-br from-rose-950/40 via-zinc-900 to-zinc-950 border-rose-500/30'
                                            }`}
                                        >
                                            {/* Watermark Seal */}
                                            <div className="absolute -right-6 -bottom-6 opacity-10 pointer-events-none">
                                                {isApproving ? (
                                                    <ShieldCheck className="w-40 h-40 text-emerald-400" />
                                                ) : (
                                                    <XCircle className="w-40 h-40 text-rose-400" />
                                                )}
                                            </div>

                                            {/* Passport Top Banner */}
                                            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                                                <div className="space-y-0.5">
                                                    <span className="text-[10px] font-mono tracking-widest uppercase text-zinc-400">
                                                        {tr('ការអនុម័ត')}
                                                    </span>
                                                    <h4 className="text-sm font-bold text-white font-mono">
                                                        SEC-{selectedApproval.id.toString().padStart(6, '0')}
                                                    </h4>
                                                </div>
                                                <span
                                                    className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border shadow-xs ${
                                                        isApproving
                                                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                                            : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                                    }`}
                                                >
                                                    {isApproving ? tr('រួចរាល់អនុម័ត') : tr('រង់ចាំបដិសេធ')}
                                                </span>
                                            </div>

                                            {/* Details Grid */}
                                            <div className="space-y-3 text-xs font-mono">
                                                <div className="flex items-center justify-between text-zinc-400 pb-1.5 border-b border-zinc-800/50">
                                                    <span className="font-khmer">{tr('ប្រភេទសំណើ៖')}</span>
                                                    <span className="text-white font-bold uppercase">
                                                        {selectedApproval.request_type.replace('_', ' ')}
                                                    </span>
                                                </div>

                                                <div className="flex items-center justify-between text-zinc-400 pb-1.5 border-b border-zinc-800/50">
                                                    <span className="font-khmer">{tr('គោលដៅអនុម័ត៖')}</span>
                                                    <span className="text-emerald-400 font-semibold">
                                                        {selectedApproval.target_type} #{selectedApproval.target_id}
                                                    </span>
                                                </div>

                                                {selectedApproval.document && (
                                                    <div className="flex items-center justify-between text-zinc-400 pb-1.5 border-b border-zinc-800/50">
                                                        <span className="font-khmer">{tr('ឯកសារយោង៖')}</span>
                                                        <span className="text-white">
                                                            {selectedApproval.document.document_number || `Draft #${selectedApproval.document.id}`}
                                                            {selectedApproval.document.reference_identifier ? ` (${tr('តុ')} ${selectedApproval.document.reference_identifier})` : ''}
                                                        </span>
                                                    </div>
                                                )}

                                                <div className="flex items-center justify-between text-zinc-400 pb-1.5 border-b border-zinc-800/50">
                                                    <span className="font-khmer">{tr('អ្នកស្នើសុំ៖')}</span>
                                                    <span className="text-zinc-200">
                                                        {selectedApproval.requester.name} (@{selectedApproval.requester.username})
                                                    </span>
                                                </div>

                                                <div className="flex items-center justify-between text-zinc-400 pb-1.5 border-b border-zinc-800/50">
                                                    <span className="font-khmer">{tr('កាលបរិច្ឆេទស្នើសុំ៖')}</span>
                                                    <span className="text-zinc-300">
                                                        {selectedApproval.created_at ? selectedApproval.created_at.replace('T', ' ').slice(0, 19) : '—'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Reason Box */}
                                            <div className="rounded-xl bg-zinc-950/70 border border-zinc-800 p-3 space-y-1">
                                                <span className="text-[11px] font-semibold text-zinc-400 font-khmer block">
                                                    {tr('មូលហេតុស្នើសុំពីបុគ្គលិក (Original Reason)៖')}
                                                </span>
                                                <p className="text-xs text-zinc-200 italic font-sans">
                                                    "{selectedApproval.reason}"
                                                </p>
                                            </div>

                                            {/* Changes Payload preview if any */}
                                            {selectedApproval.requested_changes && (
                                                <div className="rounded-xl bg-zinc-950/70 border border-zinc-800 p-3 space-y-1.5">
                                                    <span className="text-[11px] font-semibold text-zinc-400 font-khmer block">
                                                        {tr('ទិន្នន័យផ្លាស់ប្តូរ (Requested Payload)៖')}
                                                    </span>
                                                    <pre className="text-[11px] text-emerald-400 font-mono overflow-x-auto whitespace-pre-wrap">
                                                        {JSON.stringify(selectedApproval.requested_changes, null, 2)}
                                                    </pre>
                                                </div>
                                            )}

                                            {/* 30-min Window simulation / Rejection mark */}
                                            <div className="pt-2">
                                                {isApproving ? (
                                                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs">
                                                        <div className="flex items-center gap-2 text-emerald-400 font-khmer font-semibold">
                                                            <Clock className="w-4 h-4 shrink-0 animate-pulse" />
                                                            <span>{tr('សុពលភាពអនុវត្ត៖ 30 នាទី')}</span>
                                                        </div>
                                                        <span className="font-mono text-[10px] text-emerald-300">{tr('ប្រើបានតែម្តង')}</span>
                                                    </div>
                                                ) : (
                                                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between text-xs">
                                                        <div className="flex items-center gap-2 text-rose-400 font-khmer font-semibold">
                                                            <XCircle className="w-4 h-4 shrink-0" />
                                                            <span>{tr('ស្ថានភាព៖ បដិសេធចោល')}</span>
                                                        </div>
                                                        <span className="font-mono text-[10px] text-rose-300">{tr('បដិសេធ')}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Passport Token Footer */}
                                            <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[10px] font-mono text-zinc-500">
                                                <span>FINGERPRINT: AUTH-{selectedApproval.id}-{(selectedApproval.id * 837261).toString(16).toUpperCase()}</span>
                                                <span>AUDIT: ACTIVE</span>
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
                                    <span>{tr('ដើម្បីត្រឡប់ក្រោយ / បោះបង់')}</span>
                                </div>

                                <div className="flex items-center gap-3 ml-auto">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedApproval(null)}
                                        className="px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-xs font-semibold font-khmer transition-all cursor-pointer shadow-xs"
                                    >
                                        {tr('បោះបង់')}
                                    </button>

                                    <button
                                        type="submit"
                                        disabled={currentForm.processing || (!isApproving && currentForm.data.review_note.trim().length < 3)}
                                        className={`px-6 py-2 rounded-xl text-white text-xs font-bold font-khmer shadow-sm transition-all cursor-pointer flex items-center gap-2 ${
                                            isApproving
                                                ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                                                : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
                                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                                    >
                                        {isApproving ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                        <span>
                                            {currentForm.processing
                                                ? tr('កំពុងដំណើរការ...')
                                                : isApproving
                                                ? tr('បញ្ជាក់ការយល់ព្រមអនុម័ត (Confirm 30-Min Window)')
                                                : tr('បញ្ជាក់ការបដិសេធសំណើ (Confirm Reject)')}
                                        </span>
                                    </button>
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
