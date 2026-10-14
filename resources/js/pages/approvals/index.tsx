import React, { useState } from 'react';
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
} from 'lucide-react';

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

    const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected' | 'used' | 'expired'>('pending');
    const [selectedApproval, setSelectedApproval] = useState<ApprovalItem | null>(null);
    const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);

    const approveForm = useForm({ review_note: 'Approved by administrator' });
    const rejectForm = useForm({ review_note: '' });

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
                setActionType(null);
            },
        });
    };

    const submitReject = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedApproval) return;
        rejectForm.post(`/approvals/${selectedApproval.id}/reject`, {
            onSuccess: () => {
                setSelectedApproval(null);
                setActionType(null);
            },
        });
    };

    return (
        <AppLayout title="Administrative Approvals Inbox">
            <div className="space-y-6">
                {/* Fixed / Sticky Header & Tabs Controls */}
                <div className="sticky top-14 md:top-0 z-20 bg-zinc-950/95 backdrop-blur-xl -mt-6 pt-6 pb-4 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 border-b border-zinc-800/80 space-y-4 shadow-xs">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2.5">
                                <ShieldCheck className="w-6 h-6 text-emerald-400" />
                                <h1 className="text-2xl font-bold tracking-tight text-white">
                                    Exception Approvals Inbox
                                </h1>
                                <span className="font-mono text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                                    {approvals.filter((a) => a.status === 'pending').length} pending
                                </span>
                            </div>
                            <p className="text-xs text-zinc-400 mt-1">
                                Invariant INV-06: Atomic one-time authorizations for price overrides, voids, and period re-openings.
                            </p>
                        </div>
                    </div>

                    {/* Tabs Filter */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                        {(['pending', 'approved', 'rejected', 'used', 'expired'] as const).map((tab) => {
                            const count = approvals.filter((a) => a.status === tab).length;
                            return (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                                        activeTab === tab
                                            ? 'bg-zinc-800 text-emerald-400 border border-zinc-700 shadow-sm'
                                            : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                                    }`}
                                >
                                    <span>{tab}</span>
                                    <span className="ml-1.5 font-mono text-[10px] opacity-70">
                                        ({count})
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Approvals Cards */}
                <div className="space-y-3">
                    {filtered.length === 0 ? (
                        <Card className="py-12 text-center text-xs text-zinc-500">
                            No approval requests in '{activeTab}' status.
                        </Card>
                    ) : (
                        filtered.map((item) => (
                            <Card key={item.id} className="p-4 space-y-3">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-800/80">
                                    <div className="flex items-center gap-2.5">
                                        <Badge
                                            variant={
                                                item.request_type === 'void'
                                                    ? 'rose'
                                                    : item.request_type === 'price_override'
                                                    ? 'amber'
                                                    : 'sky'
                                            }
                                            className="font-mono uppercase text-[10px]"
                                        >
                                            {item.request_type.replace('_', ' ')}
                                        </Badge>
                                        <span className="text-xs font-bold text-white">
                                            Target: {item.target_type} #{item.target_id}
                                        </span>
                                        {item.document && (
                                            <span className="text-xs text-emerald-400 font-mono">
                                                ({item.document.document_number || `Draft #${item.document.id}`}
                                                {item.document.reference_identifier ? ` - Table ${item.document.reference_identifier}` : ''})
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                                        <span>Requested by: {item.requester.username}</span>
                                        <span className="text-zinc-600">•</span>
                                        <span>{item.created_at ? item.created_at.replace('T', ' ').slice(0, 19) : ''}</span>
                                    </div>
                                </div>

                                <div className="text-xs text-zinc-300">
                                    <span className="text-zinc-500 font-medium">Reason: </span>
                                    "{item.reason}"
                                </div>

                                {/* Review Details if Reviewed */}
                                {item.reviewed_at && (
                                    <div className="p-2.5 rounded-lg bg-zinc-950/70 border border-zinc-800 text-xs font-mono flex items-center justify-between">
                                        <div>
                                            <span className="text-zinc-500">Reviewed by: </span>
                                            <span className="text-zinc-200">{item.reviewer?.username}</span>
                                            <span className="text-zinc-500 ml-2">Note: </span>
                                            <span className="text-zinc-300 italic">"{item.review_note}"</span>
                                        </div>
                                        {item.expires_at && (
                                            <div className="text-amber-400 flex items-center gap-1 text-[11px]">
                                                <Clock className="w-3.5 h-3.5" />
                                                <span>Expires: {item.expires_at.replace('T', ' ').slice(0, 19)}</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Admin Action Buttons */}
                                {isAdmin && item.status === 'pending' && (
                                    <div className="pt-2 flex justify-end gap-2">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="text-rose-400 hover:text-rose-300"
                                            onClick={() => {
                                                setSelectedApproval(item);
                                                setActionType('reject');
                                            }}
                                        >
                                            <XCircle className="w-3.5 h-3.5" />
                                            <span>Reject</span>
                                        </Button>

                                        <Button
                                            size="sm"
                                            variant="primary"
                                            onClick={() => {
                                                setSelectedApproval(item);
                                                setActionType('approve');
                                            }}
                                        >
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            <span>Approve (30 Min Window)</span>
                                        </Button>
                                    </div>
                                )}
                            </Card>
                        ))
                    )}
                </div>

                {/* Action Modal (Approve or Reject) */}
                {selectedApproval && actionType && (
                    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                        <Card className="w-full max-w-md p-6 space-y-4 bg-zinc-900 border-zinc-800">
                            <h3 className="text-base font-bold text-white capitalize">
                                {actionType} Approval Request #{selectedApproval.id}
                            </h3>

                            <form onSubmit={actionType === 'approve' ? submitApprove : submitReject} className="space-y-3">
                                <div className="space-y-1.5">
                                    <label className="text-xs text-zinc-400">Administrative Note</label>
                                    <textarea
                                        required
                                        value={actionType === 'approve' ? approveForm.data.review_note : rejectForm.data.review_note}
                                        onChange={(e) => {
                                            if (actionType === 'approve') approveForm.setData('review_note', e.target.value);
                                            else rejectForm.setData('review_note', e.target.value);
                                        }}
                                        placeholder="Add mandatory administrative review note..."
                                        className="w-full px-3 py-2 text-xs bg-zinc-950 border border-zinc-800 rounded-lg text-white"
                                        rows={3}
                                    />
                                </div>

                                <div className="flex justify-end gap-2 pt-2">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => {
                                            setSelectedApproval(null);
                                            setActionType(null);
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        variant={actionType === 'approve' ? 'primary' : 'danger'}
                                    >
                                        Confirm {actionType}
                                    </Button>
                                </div>
                            </form>
                        </Card>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
