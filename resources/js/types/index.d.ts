export type UserRole = 'admin' | 'cashier' | 'supervisor';

export interface User {
    id: number;
    name: string;
    username: string;
    role: UserRole;
    is_active: boolean;
    last_login_at?: string | null;
    locations?: {
        id: number;
        code: string;
        name_primary: string;
        is_default: boolean;
    }[];
}

export interface BusinessSettings {
    business_name_primary: string;
    business_name_secondary?: string | null;
    address?: string | null;
    address_primary?: string | null;
    phone?: string | null;
    vat_number?: string | null;
    currency_code: string;
    currency_symbol: string;
    decimal_places: number;
    timezone: string;
    document_language: string;
    document_footer?: string | null;
    print_settings?: {
        format?: string;
        show_guest_count?: boolean;
        show_item_quantity?: boolean;
        show_tax?: boolean;
    } | null;
    entry_settings?: {
        require_source_total?: boolean;
        show_event_time?: boolean;
    } | null;
    font_settings?: {
        primary_font?: string;
        khmer_font?: string;
    } | null;
}

export interface FlashMessages {
    success?: string | null;
    error?: string | null;
    warning?: string | null;
    info?: string | null;
}

export type PageProps<T extends Record<string, unknown> = Record<string, unknown>> = T & {
    auth: {
        user: User | null;
    };
    business: BusinessSettings;
    flash: FlashMessages;
    errors: Record<string, string>;
    csrf_token?: string;
};
