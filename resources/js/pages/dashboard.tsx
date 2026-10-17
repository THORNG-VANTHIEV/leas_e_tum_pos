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
    TrendingUp,
    Shield,
    Activity,
    Settings,
    Clock,
} from 'lucide-react';
import { useExchangeRate } from '@/components/currency';
import { CashierFilter, CashierOption } from '@/components/cashier-filter';

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
    cashiers: CashierOption[];
    filters: { cashier_id: number | null };
}

export default function Dashboard({ stats, system_metrics, cashiers, filters }: DashboardProps) {
    const exchangeRate = useExchangeRate();
    const { auth, business } = usePage<PageProps>().props;
    const user = auth.user;

    return (
        <AppLayout title="ផ្ទាំងសង្ខេប">
            <div className="space-y-6">
                {/* Fixed / Sticky Header */}
                <div className="sticky top-14 md:top-0 z-20 bg-zinc-950/95 backdrop-blur-xl -mt-6 pt-6 pb-4 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 border-b border-zinc-800/80 space-y-4 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-bold tracking-tight text-white font-khmer">
                                    ផ្ទាំងសង្ខេប
                                </h1>
                                <Badge variant={cashiers.length > 0 ? 'emerald' : 'sky'}>
                                    {cashiers.length === 0
                                        ? 'ការលក់របស់ខ្ញុំ'
                                        : filters.cashier_id
                                          ? `@${cashiers.find((c) => c.id === Number(filters.cashier_id))?.username ?? ''}`
                                          : 'ទាំងហាង'}
                                </Badge>
                            </div>
                            <p className="text-xs text-zinc-400 mt-1 font-khmer">
                                សូមស្វាគមន៍ <span className="text-zinc-200 font-medium">{user?.name}</span>
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <CashierFilter cashiers={cashiers} value={filters.cashier_id} />
                            {user?.role === 'admin' && (
                                <Link href="/settings">
                                    <Button variant="secondary" size="sm">
                                        <Settings className="w-4 h-4 text-zinc-400" />
                                        <span className="font-khmer">ការកំណត់</span>
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
                                    <span className="text-xs font-khmer text-emerald-400 font-semibold">
                                        វគ្គលក់
                                    </span>
                                    {stats.active_period ? (
                                        <Badge variant="emerald"><span className="font-khmer">កំពុងបើក</span></Badge>
                                    ) : (
                                        <Badge variant="amber"><span className="font-khmer">មិនទាន់បើក</span></Badge>
                                    )}
                                </div>
                                <h3 className="text-lg font-bold text-white mt-0.5 font-khmer">
                                    {stats.active_period ? stats.active_period.name : 'មិនមានវគ្គកំពុងបើកទេ'}
                                </h3>
                                <p className="text-xs text-zinc-400 mt-0.5 font-khmer">
                                    {stats.active_period
                                        ? `លេខកូដ: ${stats.active_period.code} • ពី ${stats.active_period.start_date} ដល់ ${stats.active_period.end_date}`
                                        : 'សូមបើកវគ្គនៅទំព័រ វគ្គ & ការបិទបញ្ជី ដើម្បីចាប់ផ្ដើមលក់។ លេខវិក្កយបត្រផ្លូវការត្រូវបានផ្ដល់ពេលបិទបញ្ជីវគ្គ។'}
                                </p>
                            </div>
                        </div>

                        {user?.role === 'admin' && (
                            <Link href="/settings/periods">
                                <Button variant="primary" size="sm">
                                    <span className="font-khmer">គ្រប់គ្រងវគ្គ</span>
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
                            <span className="font-khmer">ចំណូលសរុប (បានគិតប្រាក់)</span>
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
                            ≈ {Math.round((parseFloat(stats.gross_revenue) || 0) * exchangeRate).toLocaleString()} ៛ (អត្រា 1$ = {exchangeRate.toLocaleString()}៛)
                        </p>
                    </Card>

                    {/* Documents Count */}
                    <Card className="p-4 border-zinc-800 bg-zinc-900/60">
                        <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
                            <span className="font-khmer">វិក្កយបត្រទាំងអស់</span>
                            <ReceiptText className="w-4 h-4 text-sky-400" />
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl font-bold font-mono text-white">
                                {stats.documents_count}
                            </span>
                            <span className="text-xs text-zinc-400 font-khmer">សន្លឹក</span>
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-1 font-khmer">រួមទាំងព្រាង និង Void</p>
                    </Card>

                    {/* Guests / Unit Count */}
                    <Card className="p-4 border-zinc-800 bg-zinc-900/60">
                        <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
                            <span className="font-khmer">ភ្ញៀវ</span>
                            <Users className="w-4 h-4 text-teal-400" />
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl font-bold font-mono text-white">
                                {stats.unit_count}
                            </span>
                            <span className="text-xs text-zinc-400 font-khmer">នាក់</span>
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-1 font-khmer">ចំនួនភ្ញៀវសរុប</p>
                    </Card>

                    {/* Voids Count */}
                    <Card className="p-4 border-zinc-800 bg-zinc-900/60">
                        <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
                            <span className="font-khmer">វិក្កយបត្រ Void</span>
                            <AlertTriangle className="w-4 h-4 text-rose-400" />
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl font-bold font-mono text-white">
                                {stats.void_count}
                            </span>
                            <span className="text-xs text-rose-400 font-khmer">សន្លឹក</span>
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-1 font-khmer">លេខវិក្កយបត្រនៅរក្សាទុក</p>
                    </Card>
                </div>

                {/* System & Audit Section (Admin View) */}
                {user?.role === 'admin' && system_metrics && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* System Health / Summary */}
                        <Card className="p-5 space-y-4">
                            <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
                                <Shield className="w-4 h-4 text-emerald-400" />
                                <h3 className="text-sm font-bold text-white font-khmer">
                                    គណនី & ប្រព័ន្ធ
                                </h3>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
                                    <div className="text-xs text-zinc-400 font-khmer">គណនីបុគ្គលិកសកម្ម</div>
                                    <div className="font-mono text-sm font-semibold text-emerald-400">
                                        {system_metrics.active_users} / {system_metrics.total_users}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
                                    <div className="text-xs text-zinc-400 font-khmer">សាខា</div>
                                    <div className="font-mono text-sm font-semibold text-white">
                                        {system_metrics.total_locations}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
                                    <div className="text-xs text-zinc-400 font-khmer">កំណត់ត្រា Audit</div>
                                    <Badge variant="emerald"><span className="font-khmer">មិនអាចកែ ឬលុបបាន</span></Badge>
                                </div>
                            </div>
                        </Card>

                        {/* Recent Activity Audit Feed */}
                        <Card className="lg:col-span-2 p-5 space-y-3">
                            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                                <div className="flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-sky-400" />
                                    <h3 className="text-sm font-bold text-white font-khmer">
                                        សកម្មភាពថ្មីៗ (Audit)
                                    </h3>
                                </div>
                                <span className="text-[11px] font-khmer text-zinc-500">ចុងក្រោយ</span>
                            </div>

                            <div className="divide-y divide-zinc-800/60">
                                {system_metrics.recent_audits.length === 0 ? (
                                    <div className="py-6 text-center text-xs text-zinc-500 font-khmer">
                                        មិនទាន់មានសកម្មភាពទេ។
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
                                                        <span className="font-khmer">ដោយ</span> {audit.actor_name}
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
