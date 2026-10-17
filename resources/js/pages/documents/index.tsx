import React, { useState } from 'react';
import { AppLayout } from '@/layouts/app-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link, router, usePage } from '@inertiajs/react';
import { PageProps } from '@/types';
import { OrderSourceBadge, isDeliveryPlatform } from '@/components/order-source';
import {
    Search,
    Plus,
    ReceiptText,
    ArrowUpRight,
    Users,
    CheckCircle2,
    Calendar,
    Clock,
    FileText,
    Printer,
} from 'lucide-react';
import { CashierFilter, CashierOption } from '@/components/cashier-filter';
import { DocumentStatusBadge } from '@/components/document-status';

interface DocumentRecord {
    id: number;
    provisional_order: number;
    sequence_no: number | null;
    document_number: string | null;
    business_date: string;
    event_time: string;
    reference_identifier: string | null;
    order_source: string | null;
    external_order_ref: string | null;
    unit_count: number;
    source_total: string;
    source_total_verified: boolean;
    grand_total: string;
    amount_received: string;
    change_amount: string;
    payment_method: string;
    status: 'draft' | 'review' | 'finalized' | 'void';
    creator: { id: number; name: string; username: string };
    period: { id: number; code: string; name: string };
    items_count?: number;
}

interface IndexProps {
    documents: {
        data: DocumentRecord[];
        current_page: number;
        last_page: number;
        total: number;
    };
    filters: {
        search?: string;
        status?: string;
        cashier_id?: string;
    };
    cashiers: CashierOption[];
    active_period: {
        id: number;
        code: string;
        name: string;
    } | null;
}

export default function DocumentIndex({ documents, filters, active_period, cashiers }: IndexProps) {
    const { business } = usePage<PageProps>().props;

    const [search, setSearch] = useState(filters.search || '');
    const [status, setStatus] = useState(filters.status || '');

    const applyFilter = (newStatus?: string) => {
        router.get(
            '/invoices',
            {
                search: search || undefined,
                status: newStatus !== undefined ? newStatus : status || undefined,
                cashier_id: filters.cashier_id || undefined,
            },
            { preserveState: true, preserveScroll: true }
        );
    };

    return (
        <AppLayout title="បញ្ជីវិក្កយបត្រ">
            <div className="space-y-6">
                {/* Fixed / Sticky Header & Filter Controls */}
                <div className="sticky top-14 md:top-0 z-20 bg-zinc-950/95 backdrop-blur-xl -mt-6 pt-6 pb-4 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 border-b border-zinc-800/80 space-y-4 shadow-xs">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2.5">
                                <ReceiptText className="w-6 h-6 text-emerald-400" />
                                <h1 className="text-2xl font-bold tracking-tight text-white font-khmer">
                                    បញ្ជីវិក្កយបត្រ
                                </h1>
                                <span className="font-mono text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                                    សរុប {documents.total}
                                </span>
                            </div>
                            <p className="text-xs text-zinc-400 mt-1">
                                ស្វែងរកវិក្កយបត្រតាមលេខ ឬលេខតុ។ ការកម្មង់ដែលមិនទាន់គិតប្រាក់ (ព្រាង) នៅខាងក្រោមគេ។
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <CashierFilter
                                cashiers={cashiers}
                                value={filters.cashier_id}
                                query={{ search: search || undefined, status: status || undefined }}
                            />
                            <Link href="/invoices/print-range">
                                <Button variant="outline" size="md" className="border-zinc-700 hover:border-zinc-600 text-zinc-200">
                                    <Printer className="w-4 h-4 mr-1.5 text-emerald-400" />
                                    <span className="font-khmer">ព្រីនជាបាច់</span>
                                </Button>
                            </Link>
                            <Link href="/invoices/create">
                                <Button size="md" className="shadow-lg shadow-emerald-500/20">
                                    <Plus className="w-4 h-4" />
                                    <span className="font-khmer">កម្មង់ថ្មី (F2)</span>
                                </Button>
                            </Link>
                        </div>
                    </div>

                    {/* Filters Bar */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                        <div className="relative w-full sm:w-80">
                            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && applyFilter()}
                                placeholder="ស្វែងរកលេខវិក្កយបត្រ, លេខតុ..."
                                className="w-full pl-9 pr-3 py-1.5 text-xs text-zinc-100 bg-zinc-950 border border-zinc-800 rounded-lg outline-none focus:border-emerald-500"
                            />
                        </div>

                        {/* Status Tabs */}
                        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
                            {[
                                { id: '', label: 'ទាំងអស់' },
                                { id: 'draft', label: 'ព្រាង' },
                                { id: 'review', label: 'កំពុងពិនិត្យ' },
                                { id: 'finalized', label: 'បានគិតប្រាក់' },
                                { id: 'void', label: 'Void' },
                            ].map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => {
                                        setStatus(t.id);
                                        applyFilter(t.id);
                                    }}
                                    className={`px-2.5 py-1 rounded text-xs font-semibold font-khmer whitespace-nowrap transition-all cursor-pointer ${
                                        status === t.id
                                            ? 'bg-zinc-800 text-emerald-400 border border-zinc-700'
                                            : 'text-zinc-400 hover:text-zinc-200'
                                    }`}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Documents Table */}
                <Card className="p-0 overflow-hidden border-zinc-800">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-zinc-950/80 border-b border-zinc-800 text-zinc-400 font-khmer text-[11px]">
                                <tr>
                                    <th className="px-4 py-3">លេខវិក្កយបត្រ</th>
                                    <th className="px-4 py-3">វគ្គ</th>
                                    <th className="px-4 py-3">កាលបរិច្ឆេទ & ម៉ោង</th>
                                    <th className="px-4 py-3">លេខតុ</th>
                                    <th className="px-4 py-3">ភ្ញៀវ</th>
                                    <th className="px-4 py-3">សរុប</th>
                                    <th className="px-4 py-3">ផ្ទៀងផ្ទាត់ក្រដាស</th>
                                    <th className="px-4 py-3">ស្ថានភាព</th>
                                    <th className="px-4 py-3">អ្នកគិតប្រាក់</th>
                                    <th className="px-4 py-3 text-right">សកម្មភាព</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/60 font-mono text-[11px]">
                                {documents.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="py-12 text-center text-xs text-zinc-500 font-sans">
                                            <span className="font-khmer">មិនទាន់មានវិក្កយបត្រទេ។ ចុច</span> <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">F2</kbd> <span className="font-khmer">ដើម្បីកម្មង់លើកដំបូង។</span>
                                        </td>
                                    </tr>
                                ) : (
                                    documents.data.map((doc) => {
                                        return (
                                            <tr key={doc.id} className="hover:bg-zinc-900/40 transition-colors">
                                                <td className="px-4 py-3 font-semibold text-white">
                                                    {doc.document_number ? (
                                                        <span className="text-emerald-400">{doc.document_number}</span>
                                                    ) : (
                                                        <span className="text-zinc-500 italic font-khmer">ព្រាង #{doc.id}</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-zinc-400">
                                                    {doc.period?.code}
                                                </td>
                                                <td className="px-4 py-3 text-zinc-400">
                                                    {doc.business_date} {doc.event_time}
                                                </td>
                                                <td className="px-4 py-3 font-bold text-zinc-200">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <span>{doc.reference_identifier || '—'}</span>
                                                        {isDeliveryPlatform(doc.order_source) && (
                                                            <OrderSourceBadge source={doc.order_source} externalRef={doc.external_order_ref} />
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-teal-400 font-semibold">
                                                    {doc.unit_count} <span className="font-khmer">នាក់</span>
                                                </td>
                                                <td className="px-4 py-3 font-bold text-white text-xs">
                                                    {business.currency_symbol}
                                                    {doc.grand_total}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {doc.source_total_verified ? (
                                                        <Badge variant="emerald">
                                                            <CheckCircle2 className="w-3 h-3" />
                                                            <span className="font-khmer">ត្រូវគ្នា</span>
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="zinc"><span className="font-khmer">មិនទាន់ផ្ទៀងផ្ទាត់</span></Badge>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-[10px]">
                                                    <DocumentStatusBadge status={doc.status} />
                                                </td>
                                                <td className="px-4 py-3 text-zinc-400">
                                                    {doc.creator?.username}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <Link href={`/invoices/${doc.id}`}>
                                                        <Button size="sm" variant="ghost">
                                                            <span className="font-khmer">មើល</span>
                                                            <ArrowUpRight className="w-3 h-3" />
                                                        </Button>
                                                    </Link>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </AppLayout>
    );
}
