import React from 'react';
import { AppLayout } from '@/layouts/app-layout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link, usePage } from '@inertiajs/react';
import { PageProps } from '@/types';
import {
    DollarSign,
    ReceiptText,
    Users,
    AlertTriangle,
    Calendar,
    ArrowUpRight,
    Shield,
    Activity,
    Settings,
    Clock,
} from 'lucide-react';

interface DashboardProps {
    stats: {
        gross_revenue: string;
        documents_count: number;
        unit_count: number;
        void_count: number;
        active_period: {
            code: string;
            name: string;
            start_date: string;
            end_date: string;
        } | null;
        is_admin: boolean;
    };
    system_metrics?: {
        total_users: number;
        active_users: number;
        total_locations: number;
        recent_audits: {
            id: number;
            action: string;
            actor_name: string;
            reason: string | null;
            created_at: string;
        }[];
    } | null;
}

export default function Dashboard({ stats, system_metrics }: DashboardProps) {
    const { auth, business } = usePage<PageProps>().props;
    const user = auth.user;

    return (
        <AppLayout title="Operational Dashboard">
            <div className="space-y-6">
                {/* Fixed / Sticky Header */}
                <div className="sticky top-14 md:top-0 z-20 bg-zinc-950/95 backdrop-blur-xl -mt-6 pt-6 pb-4 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 border-b border-zinc-800/80 space-y-4 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-bold tracking-tight text-white">
                                    Operational Dashboard
                                </h1>
                                <Badge variant={user?.role === 'admin' ? 'emerald' : 'sky'}>
                                    {user?.role === 'admin' ? 'Store-Wide View' : 'Terminal View'}
                                </Badge>
                            </div>
                            <p className="text-xs text-zinc-400 mt-1">
                                Welcome back, <span className="text-zinc-200 font-medium">{user?.name}</span> • Logged in to{' '}
                                <span className="text-emerald-400 font-mono">LOC-01 (Main Dining Hall)</span>
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            {user?.role === 'admin' && (
                                <Link href="/settings">
                                    <Button variant="secondary" size="sm">
                                        <Settings className="w-4 h-4 text-zinc-400" />
                                        <span>Master Settings</span>
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </div>
                </div>

                {/* Active Period Status Card */}
                <Card className="border-emerald-500/20 bg-gradient-to-r from-emerald-950/20 via-zinc-900/60 to-zinc-900/40 p-5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                                <Calendar className="w-6 h-6" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold">
                                        Batch Accounting Period
                                    </span>
                                    {stats.active_period ? (
                                        <Badge variant="emerald">Live Shift Active</Badge>
                                    ) : (
                                        <Badge variant="amber">No Active Shift</Badge>
                                    )}
                                </div>
                                <h3 className="text-lg font-bold text-white mt-0.5">
                                    {stats.active_period ? stats.active_period.name : 'No Active Accounting Period'}
                                </h3>
                                <p className="text-xs text-zinc-400 mt-0.5">
                                    {stats.active_period
                                        ? `Code: ${stats.active_period.code} • Date Range: ${stats.active_period.start_date} to ${stats.active_period.end_date}`
                                        : 'Accounting batches are managed in Shifts & Periods. Official gapless sequences allocate upon period finalization.'}
                                </p>
                            </div>
                        </div>

                        {user?.role === 'admin' && (
                            <Link href="/settings/periods">
                                <Button variant="primary" size="sm">
                                    <span>Manage Shifts & Periods</span>
                                    <ArrowUpRight className="w-4 h-4" />
                                </Button>
                            </Link>
                        )}
                    </div>
                </Card>

                {/* Primary Metric KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Revenue */}
                    <Card className="p-4 border-zinc-800 bg-zinc-900/60 relative overflow-hidden">
                        <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
                            <span>Gross Revenue</span>
                            <DollarSign className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl font-bold font-mono text-white">
                                {business.currency_symbol}
                                {stats.gross_revenue}
                            </span>
                            <span className="text-[10px] text-zinc-500 font-mono">{business.currency_code}</span>
                        </div>
                        <p className="text-[11px] text-emerald-400/80 font-khmer mt-1">
                            ≈ {Math.round((parseFloat(stats.gross_revenue) || 0) * 4100).toLocaleString()} ៛ (អត្រា 1$ = 4,100៛)
                        </p>
                    </Card>

                    {/* Documents Count */}
                    <Card className="p-4 border-zinc-800 bg-zinc-900/60">
                        <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
                            <span>Total Documents</span>
                            <ReceiptText className="w-4 h-4 text-sky-400" />
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl font-bold font-mono text-white">
                                {stats.documents_count}
                            </span>
                            <span className="text-xs text-zinc-400">invoices</span>
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-1">Pending reconciliation</p>
                    </Card>

                    {/* Guests / Unit Count */}
                    <Card className="p-4 border-zinc-800 bg-zinc-900/60">
                        <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
                            <span>Guests / Units</span>
                            <Users className="w-4 h-4 text-teal-400" />
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl font-bold font-mono text-white">
                                {stats.unit_count}
                            </span>
                            <span className="text-xs text-zinc-400">guests</span>
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-1">Primary package snapshot count</p>
                    </Card>

                    {/* Voids Count */}
                    <Card className="p-4 border-zinc-800 bg-zinc-900/60">
                        <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
                            <span>Void Invoices</span>
                            <AlertTriangle className="w-4 h-4 text-rose-400" />
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl font-bold font-mono text-white">
                                {stats.void_count}
                            </span>
                            <span className="text-xs text-rose-400">governed voids</span>
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-1">Retained sequence numbers</p>
                    </Card>
                </div>

                {/* System & Audit Section (Admin View) */}
                {user?.role === 'admin' && system_metrics && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* System Health / Summary */}
                        <Card className="p-5 space-y-4">
                            <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
                                <Shield className="w-4 h-4 text-emerald-400" />
                                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                                    System Access Control
                                </h3>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
                                    <div className="text-xs text-zinc-400">Active Staff Accounts</div>
                                    <div className="font-mono text-sm font-semibold text-emerald-400">
                                        {system_metrics.active_users} / {system_metrics.total_users}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
                                    <div className="text-xs text-zinc-400">Active Branch Locations</div>
                                    <div className="font-mono text-sm font-semibold text-white">
                                        {system_metrics.total_locations}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
                                    <div className="text-xs text-zinc-400">Audit Storage Strategy</div>
                                    <Badge variant="emerald">Append-Only Immutability</Badge>
                                </div>
                            </div>
                        </Card>

                        {/* Recent Activity Audit Feed */}
                        <Card className="lg:col-span-2 p-5 space-y-3">
                            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                                <div className="flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-sky-400" />
                                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                                        Recent Append-Only Audit Stream
                                    </h3>
                                </div>
                                <span className="text-[11px] font-mono text-zinc-500">Live Snapshot</span>
                            </div>

                            <div className="divide-y divide-zinc-800/60">
                                {system_metrics.recent_audits.length === 0 ? (
                                    <div className="py-6 text-center text-xs text-zinc-500">
                                        No recent audit events recorded.
                                    </div>
                                ) : (
                                    system_metrics.recent_audits.map((audit) => (
                                        <div key={audit.id} className="py-2.5 flex items-center justify-between text-xs">
                                            <div className="space-y-0.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono font-semibold text-zinc-200">
                                                        {audit.action}
                                                    </span>
                                                    <span className="text-[11px] text-zinc-500 font-mono">
                                                        by {audit.actor_name}
                                                    </span>
                                                </div>
                                                {audit.reason && (
                                                    <div className="text-[11px] text-zinc-400 italic">
                                                        "{audit.reason}"
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-zinc-500 text-[11px]">
                                                <Clock className="w-3 h-3" />
                                                <span>{audit.created_at}</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </Card>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
