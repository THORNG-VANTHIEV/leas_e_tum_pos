import { Badge } from '@/components/ui/badge';
import { tr } from '@/locales/tr';

export type DocumentStatusValue = 'draft' | 'review' | 'finalized' | 'void';

// Mirrors App\Enums\DocumentStatus
export const DOCUMENT_STATUS_LABELS: Record<DocumentStatusValue, string> = {
    draft: tr('ព្រាង / កំពុងកម្មង់'),
    review: tr('កំពុងពិនិត្យ'),
    finalized: tr('បានគិតប្រាក់'),
    void: tr('បានលុបចោល (Void)'),
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
    cash: tr('សាច់ប្រាក់ / Cash'),
    khqr: 'KHQR',
    qr_transfer: tr('ផ្ទេរតាម QR / QR Transfer'),
    card: tr('កាត / Card'),
    app: tr('បង់តាម App / Paid via App'),
};

export function paymentMethodLabel(method: string | null | undefined): string {
    if (!method) {
        return '—';
    }

    return PAYMENT_METHOD_LABELS[method] ?? method.toUpperCase();
}
