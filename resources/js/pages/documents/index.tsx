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
    };
    active_period: {
        id: number;
        code: string;
        name: string;
    } | null;
}

export default function DocumentIndex({ documents, filters, active_period }: IndexProps) {
    const { business } = usePage<PageProps>().props;

    const [search, setSearch] = useState(filters.search || '');
    const [status, setStatus] = useState(filters.status || '');

    const applyFilter = (newStatus?: string) => {
        router.get(
            '/invoices',
            {
                search: search || undefined,
                status: newStatus !== undefined ? newStatus : status || undefined,
            },
            { preserveState: true, preserveScroll: true }
        );
    };

    return (
        <AppLayout title="Document Register">
            <div className="space-y-6">
                {/* Fixed / Sticky Header & Filter Controls */}
                <div className="sticky top-14 md:top-0 z-20 bg-zinc-950/95 backdrop-blur-xl -mt-6 pt-6 pb-4 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 border-b border-zinc-800/80 space-y-4 shadow-xs">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2.5">
                                <ReceiptText className="w-6 h-6 text-emerald-400" />
                                <h1 className="text-2xl font-bold tracking-tight text-white">
                                    Document Register
                                </h1>
                                <span className="font-mono text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                                    {documents.total} total
                                </span>
                            </div>
                            <p className="text-xs text-zinc-400 mt-1">
                                Searchable invoice ledger. Unfinalized drafts remain pinned at the bottom for pending cashier review.
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <Link href="/invoices/print-range">
                                <Button variant="outline" size="md" className="border-zinc-700 hover:border-zinc-600 text-zinc-200">
                                    <Printer className="w-4 h-4 mr-1.5 text-emerald-400" />
                                    <span>Print Range</span>
                                </Button>
                            </Link>
                            <Link href="/invoices/create">
                                <Button size="md" className="shadow-lg shadow-emerald-500/20">
                                    <Plus className="w-4 h-4" />
                                    <span>New POS Order (F2)</span>
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
                                placeholder="Filter by doc #, table #..."
                                className="w-full pl-9 pr-3 py-1.5 text-xs text-zinc-100 bg-zinc-950 border border-zinc-800 rounded-lg outline-none focus:border-emerald-500"
                            />
                        </div>

                        {/* Status Tabs */}
                        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
                            {[
                                { id: '', label: 'All' },
                                { id: 'draft', label: 'Drafts' },
                                { id: 'review', label: 'Review' },
                                { id: 'finalized', label: 'Finalized' },
                                { id: 'void', label: 'Voided' },
                            ].map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => {
                                        setStatus(t.id);
                                        applyFilter(t.id);
                                    }}
                                    className={`px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
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
                            <thead className="bg-zinc-950/80 border-b border-zinc-800 text-zinc-400 font-mono uppercase text-[10px]">
                                <tr>
                                    <th className="px-4 py-3">Doc # / Ref</th>
                                    <th className="px-4 py-3">Period</th>
                                    <th className="px-4 py-3">Date & Time</th>
                                    <th className="px-4 py-3">Table #</th>
                                    <th className="px-4 py-3">Guests</th>
                                    <th className="px-4 py-3">Total Amount</th>
                                    <th className="px-4 py-3">Source Reconciliation</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Cashier</th>
                                    <th className="px-4 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/60 font-mono text-[11px]">
                                {documents.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="py-12 text-center text-xs text-zinc-500 font-sans">
                                            No documents found. Press <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">F2</kbd> to enter your first order.
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
                                                        <span className="text-zinc-500 italic">Draft #{doc.id}</span>
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
                                                    {doc.unit_count} pax
                                                </td>
                                                <td className="px-4 py-3 font-bold text-white text-xs">
                                                    {business.currency_symbol}
                                                    {doc.grand_total}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {doc.source_total_verified ? (
                                                        <Badge variant="emerald">
                                                            <CheckCircle2 className="w-3 h-3" />
                                                            <span>Balanced $0.00</span>
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="zinc">Unverified</Badge>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 uppercase text-[10px]">
                                                    <Badge
                                                        variant={
                                                            doc.status === 'finalized'
                                                                ? 'emerald'
                                                                : doc.status === 'review'
                                                                ? 'amber'
                                                                : doc.status === 'void'
                                                                ? 'rose'
                                                                : 'zinc'
                                                        }
                                                    >
                                                        {doc.status}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3 text-zinc-400">
                                                    {doc.creator?.username}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <Link href={`/invoices/${doc.id}`}>
                                                        <Button size="sm" variant="ghost">
                                                            <span>View</span>
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
