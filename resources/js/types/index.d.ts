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
    exchange_rate_khr?: number;
    business_name_primary: string;
    logo_url: string;
    business_name_secondary?: string | null;
    address?: string | null;
    address_primary?: string | null;
    phone?: string | null;
    vat_number?: string | null;
    tax_identifier?: string | null;
    currency_code: string;
    currency_symbol: string;
    decimal_places: number;
    timezone: string;
    document_language: string;
    document_footer?: string | null;
    print_settings?: {
        default_format?: '80mm' | 'a5';
        format?: string;
        show_logo?: boolean;
        show_business_name?: boolean;
        header_title_en?: string;
        header_title_km?: string;
        header_subtitle?: string;
        show_address?: boolean;
        show_phone?: boolean;
        show_vat_tin?: boolean;
        show_cashier?: boolean;
        show_table_ref?: boolean;
        show_guest_count?: boolean;
        show_datetime?: boolean;
        show_customer_info?: boolean;
        show_barcode?: boolean;
        show_item_khmer_name?: boolean;
        show_item_unit?: boolean;
        show_item_quantity?: boolean;
        show_item_sku?: boolean;
        item_density?: 'compact' | 'normal' | 'spacious';
        show_subtotal?: boolean;
        show_tax?: boolean;
        show_discount?: boolean;
        show_dual_currency?: boolean;
        exchange_rate_khr?: number;
        show_payment_method?: boolean;
        show_change?: boolean;
        footer_text?: string;
        policy_note?: string;
        show_qr_payment?: boolean;
        qr_payment_text?: string;
        qr_code_image?: string;
        qr_bank_name?: string;
        qr_account_name?: string;
        qr_account_number?: string;
        show_wifi_info?: boolean;
        wifi_ssid?: string;
        wifi_password?: string;
        show_signature_blocks?: boolean;
        [key: string]: any;
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
    print_jobs?: PrintJobBatch | null;
}

export interface PrintJobBatch {
    token: string;
    jobs: { type: 'kitchen_ticket' | 'receipt'; url: string }[];
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
