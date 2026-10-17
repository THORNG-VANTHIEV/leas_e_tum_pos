import { Badge } from '@/components/ui/badge';

export type DocumentStatusValue = 'draft' | 'review' | 'finalized' | 'void';

// Mirrors App\Enums\DocumentStatus
export const DOCUMENT_STATUS_LABELS: Record<DocumentStatusValue, string> = {
    draft: 'ព្រាង / កំពុងកម្មង់',
    review: 'កំពុងពិនិត្យ',
    finalized: 'បានគិតប្រាក់',
    void: 'បានលុបចោល (Void)',
};

const STATUS_VARIANTS: Record<DocumentStatusValue, 'zinc' | 'amber' | 'emerald' | 'rose'> = {
    draft: 'zinc',
    review: 'amber',
    finalized: 'emerald',
    void: 'rose',
};

export function documentStatusLabel(status: string): string {
    return DOCUMENT_STATUS_LABELS[status as DocumentStatusValue] ?? status;
}

export function DocumentStatusBadge({ status }: { status: string }) {
    return (
        <Badge variant={STATUS_VARIANTS[status as DocumentStatusValue] ?? 'zinc'}>
            <span className="font-khmer normal-case">{documentStatusLabel(status)}</span>
        </Badge>
    );
}

/** Bilingual payment method names, used on screen and on printed receipts */
export const PAYMENT_METHOD_LABELS: Record<string, string> = {
    cash: 'សាច់ប្រាក់ / Cash',
    khqr: 'KHQR',
    qr_transfer: 'ផ្ទេរតាម QR / QR Transfer',
    card: 'កាត / Card',
    app: 'បង់តាម App / Paid via App',
};

export function paymentMethodLabel(method: string | null | undefined): string {
    if (!method) {
        return '—';
    }

    return PAYMENT_METHOD_LABELS[method] ?? method.toUpperCase();
}
