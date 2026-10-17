import React, { useState, useRef } from 'react';
import { useForm, usePage } from '@inertiajs/react';
import { PageProps } from '@/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
    Printer,
    FileText,
    Save,
    RotateCcw,
    Eye,
    QrCode,
    Wifi,
    Check,
    DollarSign,
    Sparkles,
    Sliders,
    Building2,
    Calendar,
    Receipt,
    Maximize2,
    ZoomIn,
    ZoomOut,
    CheckCircle2,
    UserCheck,
    Upload,
    Trash2,
    Loader2,
} from 'lucide-react';
import { tr } from '@/locales/tr';

interface InvoiceDesignerProps {
    settings: any;
}

export const InvoiceDesigner: React.FC<InvoiceDesignerProps> = ({ settings }) => {
    const { auth } = usePage<PageProps>().props;
    const currentPrint = settings.print_settings || {};

    const [activePreviewFormat, setActivePreviewFormat] = useState<'80mm' | 'a5'>(
        (currentPrint.default_format as '80mm' | 'a5') || '80mm'
    );
    const [previewZoom, setPreviewZoom] = useState<number>(100);
    const [sampleScenario, setSampleScenario] = useState<'dine_in' | 'takeaway'>('dine_in');
    const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);
    const previewContainerRef = useRef<HTMLDivElement>(null);

    // Form state initialized with print_settings or clean defaults
    const form = useForm({
        default_format: (currentPrint.default_format as '80mm' | 'a5') || '80mm',
        show_logo: currentPrint.show_logo ?? true,
        show_business_name: currentPrint.show_business_name ?? true,
        header_title_en: currentPrint.header_title_en || 'INVOICE',
        header_title_km: currentPrint.header_title_km || 'វិក្កយបត្រ',
        header_subtitle:
            currentPrint.header_subtitle || 'Official Sales Receipt & Tax Invoice',
        show_address: currentPrint.show_address ?? true,
        show_phone: currentPrint.show_phone ?? true,
        show_vat_tin: currentPrint.show_vat_tin ?? true,
        show_cashier: currentPrint.show_cashier ?? true,
        show_table_ref: currentPrint.show_table_ref ?? true,
        show_guest_count: currentPrint.show_guest_count ?? true,
        show_datetime: currentPrint.show_datetime ?? true,
        show_customer_info: currentPrint.show_customer_info ?? true,
        show_barcode: currentPrint.show_barcode ?? true,
        show_item_khmer_name: currentPrint.show_item_khmer_name ?? true,
        show_item_unit: currentPrint.show_item_unit ?? true,
        show_item_quantity: currentPrint.show_item_quantity ?? true,
        show_item_sku: currentPrint.show_item_sku ?? false,
        item_density: (currentPrint.item_density as 'compact' | 'normal' | 'spacious') || 'normal',
        show_subtotal: currentPrint.show_subtotal ?? true,
        show_tax: currentPrint.show_tax ?? false,
        show_discount: currentPrint.show_discount ?? true,
        show_dual_currency: currentPrint.show_dual_currency ?? true,
        exchange_rate_khr: currentPrint.exchange_rate_khr ?? 4100,
        show_payment_method: currentPrint.show_payment_method ?? true,
        show_change: currentPrint.show_change ?? true,
        footer_text:
            currentPrint.footer_text ||
            settings.document_footer ||
            'Thank you for dining with us! សូមអរគុណ!',
        policy_note:
            currentPrint.policy_note ||
            'Goods sold are not returnable • ទំនិញទិញហើយមិនអាចប្តូរវិញបានទេ',
        show_qr_payment: currentPrint.show_qr_payment ?? true,
        qr_payment_text: currentPrint.qr_payment_text || 'Scan to Pay / KHQR',
        qr_code_image: currentPrint.qr_code_image || '',
        qr_bank_name: currentPrint.qr_bank_name || 'Bakong KHQR • Cambodia FastPay',
        qr_account_name: currentPrint.qr_account_name || '',
        qr_account_number: currentPrint.qr_account_number || '',
        show_wifi_info: currentPrint.show_wifi_info ?? true,
        wifi_ssid: currentPrint.wifi_ssid || 'Leashal-Etum-Guest',
        wifi_password: currentPrint.wifi_password || 'welcome2026',
        show_signature_blocks: currentPrint.show_signature_blocks ?? true,
    });

    // QR Code uploader state
    const [isUploadingQr, setIsUploadingQr] = useState(false);
    const [qrUploadError, setQrUploadError] = useState<string | null>(null);
    const qrFileInputRef = useRef<HTMLInputElement>(null);

    const handleQrFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Instant local preview
        const tempPreviewUrl = URL.createObjectURL(file);
        form.setData('qr_code_image', tempPreviewUrl);

        setIsUploadingQr(true);
        setQrUploadError(null);

        const formData = new FormData();
        formData.append('qr_image', file);

        try {
            const token = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content;
            const res = await fetch('/settings/upload-qr', {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': token || '',
                    'Accept': 'application/json',
                },
                body: formData,
            });

            const data = await res.json();
            if (res.ok && data.url) {
                form.setData('qr_code_image', data.url);
            } else {
                setQrUploadError(data.message || data.error || 'Failed to upload QR code image.');
            }
        } catch (err: any) {
            setQrUploadError(err.message || 'Network error while uploading QR code.');
        } finally {
            setIsUploadingQr(false);
            if (qrFileInputRef.current) {
                qrFileInputRef.current.value = '';
            }
        }
    };

    const handleRemoveQrCode = () => {
        form.setData('qr_code_image', '');
        setQrUploadError(null);
        if (qrFileInputRef.current) {
            qrFileInputRef.current.value = '';
        }
    };

    // Reset to defaults
    const handleResetDefaults = () => {
        if (!confirm('Are you sure you want to restore default invoice template settings?')) {
            return;
        }
        form.setData({
            default_format: '80mm',
            show_logo: true,
            show_business_name: true,
            header_title_en: 'INVOICE',
            header_title_km: 'វិក្កយបត្រ',
            header_subtitle: 'វិក្កយបត្រលក់ / Sales Receipt',
            show_address: true,
            show_phone: true,
            show_vat_tin: true,
            show_cashier: true,
            show_table_ref: true,
            show_guest_count: true,
            show_datetime: true,
            show_customer_info: true,
            show_barcode: true,
            show_item_khmer_name: true,
            show_item_unit: true,
            show_item_quantity: true,
            show_item_sku: false,
            item_density: 'normal',
            show_subtotal: true,
            show_tax: false,
            show_discount: true,
            show_dual_currency: true,
            exchange_rate_khr: 4100,
            show_payment_method: true,
            show_change: true,
            footer_text: 'Thank you for dining with us! សូមអរគុណ!',
            policy_note: 'Goods sold are not returnable • ទំនិញទិញហើយមិនអាចប្តូរវិញបានទេ',
            show_qr_payment: true,
            qr_payment_text: 'ស្កេនដើម្បីបង់ / Scan to Pay',
            qr_code_image: '',
            qr_bank_name: 'Bakong KHQR • Cambodia FastPay',
            qr_account_name: '',
            qr_account_number: '',
            show_wifi_info: true,
            wifi_ssid: 'Leashal-Etum-Guest',
            wifi_password: 'welcome2026',
            show_signature_blocks: true,
        });
    };

    // Submit handler
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.patch('/settings/print', {
            preserveScroll: true,
            onSuccess: () => {
                setSaveSuccessNotice(true);
                setTimeout(() => setSaveSuccessNotice(false), 4000);
            },
        });
    };

    // Print test preview
    const handleTestPrint = () => {
        window.print();
    };

    // Sample Invoice Data for Live Preview
    const sampleItems = [
        {
            id: 1,
            name_en: 'Buffet / Primary Package',
            name_km: 'កញ្ចប់អាហារប៊ូហ្វេធម្មតា',
            sku: 'BF-01',
            unit: 'Pax',
            qty: 4,
            price: 5.0,
            total: 20.0,
        },
        {
            id: 2,
            name_en: 'Coca Cola Can',
            name_km: 'កូកាកូឡាកំប៉ុង',
            sku: 'DR-02',
            unit: 'Can',
            qty: 3,
            price: 1.0,
            total: 3.0,
        },
        {
            id: 3,
            name_en: 'Fresh Fragrant Coconut',
            name_km: 'ដូងក្រអូបធម្មជាតិ',
            sku: 'DR-08',
            unit: 'Fruit',
            qty: 2,
            price: 1.5,
            total: 3.0,
        },
        {
            id: 4,
            name_en: 'Special Seafood Sauce',
            name_km: 'ទឹកត្រីកោះកុងពិសេស',
            sku: 'EX-01',
            unit: 'Plate',
            qty: 1,
            price: 0.5,
            total: 0.5,
        },
    ];

    const subtotal = 26.5;
    const discount = form.data.show_discount ? 1.5 : 0;
    const tax = form.data.show_tax ? 2.5 : 0;
    const grandTotal = subtotal - discount + tax;
    const grandTotalKHR = Math.round(grandTotal * (form.data.exchange_rate_khr || 4100));
    const amountReceived = 30.0;
    const changeAmount = amountReceived - grandTotal;
    const changeKHR = Math.round(changeAmount * (form.data.exchange_rate_khr || 4100));

    return (
        <div className="space-y-6">
            {/* Scoped print styles for test print */}
            <style>{`
                @media print {
                    body * {
                        visibility: hidden !important;
                    }
                    #live-invoice-print-canvas,
                    #live-invoice-print-canvas * {
                        visibility: visible !important;
                    }
                    #live-invoice-print-canvas {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        margin: 0 !important;
                        padding: ${activePreviewFormat === '80mm' ? '2mm' : '8mm'} !important;
                        width: ${activePreviewFormat === '80mm' ? '78mm' : '100%'} !important;
                        max-width: ${activePreviewFormat === '80mm' ? '78mm' : '100%'} !important;
                        box-shadow: none !important;
                        border: none !important;
                        background: #ffffff !important;
                        color: #000000 !important;
                    }
                    @page {
                        margin: 0;
                        size: ${activePreviewFormat === '80mm' ? '80mm auto' : 'A5 portrait'};
                    }
                }
            `}</style>

            {/* Header description */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-zinc-800">
                <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Printer className="w-5 h-5 text-emerald-400" />
                        <span>{tr('រចនាវិក្កយបត្រ & ព្រីន')}</span>
                    </h2>
                    <p className="text-xs text-zinc-400 mt-1">
                        {tr('កំណត់អ្វីដែលបង្ហាញលើវិក្កយបត្រ 80mm និង A5 ហើយមើលលទ្ធផលភ្លាមៗនៅខាងស្ដាំ។')}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={handleResetDefaults}
                        className="text-xs"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>{tr('កំណត់ដើមវិញ')}</span>
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        onClick={handleSubmit}
                        disabled={form.processing}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-md shadow-emerald-950 text-xs"
                    >
                        <Save className="w-3.5 h-3.5" />
                        <span>{form.processing ? tr('កំពុងរក្សាទុក...') : tr('រក្សាទុក')}</span>
                    </Button>
                </div>
            </div>

            {saveSuccessNotice && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2.5 text-xs text-emerald-400">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{tr('បានរក្សាទុក! ការព្រីនបន្ទាប់នឹងប្រើការរចនានេះ។')}</span>
                </div>
            )}

            {/* Split Grid: Left Editor (Col 7) & Right Live Preview (Col 5) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* LEFT COLUMN: Controls & Settings (7 cols) */}
                <form onSubmit={handleSubmit} className="lg:col-span-7 space-y-5">
                    {/* 1. Format & Layout Defaults */}
                    <Card className="p-4 sm:p-5 space-y-4">
                        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                            <div className="flex items-center gap-2">
                                <Receipt className="w-4 h-4 text-emerald-400" />
                                <h3 className="text-sm font-bold text-zinc-100">
                                    {tr('ក្រដាស & គម្លាតជួរ')}
                                </h3>
                            </div>
                            <span className="text-[11px] font-mono text-zinc-400">{tr('ផ្នែក 1/6')}</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                                    {tr('ទម្រង់ព្រីនលំនាំដើម')}
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            form.setData('default_format', '80mm');
                                            setActivePreviewFormat('80mm');
                                        }}
                                        className={`p-2.5 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                            form.data.default_format === '80mm'
                                                ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-bold'
                                                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                                        }`}
                                    >
                                        <Printer className="w-3.5 h-3.5" />
                                        <span>{tr('ក្រដាស 80mm')}</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            form.setData('default_format', 'a5');
                                            setActivePreviewFormat('a5');
                                        }}
                                        className={`p-2.5 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                            form.data.default_format === 'a5'
                                                ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-bold'
                                                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                                        }`}
                                    >
                                        <FileText className="w-3.5 h-3.5" />
                                        <span>{tr('វិក្កយបត្រ A5')}</span>
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                                    {tr('គម្លាតជួរមុខទំនិញ')}
                                </label>
                                <div className="grid grid-cols-3 gap-1.5">
                                    {(['compact', 'normal', 'spacious'] as const).map((density) => (
                                        <button
                                            key={density}
                                            type="button"
                                            onClick={() => form.setData('item_density', density)}
                                            className={`p-2 rounded-lg border text-[11px] font-medium capitalize text-center transition-all cursor-pointer ${
                                                form.data.item_density === density
                                                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-bold'
                                                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                                            }`}
                                        >
                                            {density}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* 2. Header & Branding */}
                    <Card className="p-4 sm:p-5 space-y-4">
                        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                            <div className="flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-emerald-400" />
                                <h3 className="text-sm font-bold text-zinc-100">
                                    {tr('ក្បាលវិក្កយបត្រ')}
                                </h3>
                            </div>
                            <span className="text-[11px] font-mono text-zinc-400">{tr('ផ្នែក 2/6')}</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Input
                                id="header_title_km"
                                label={tr("Khmer Title / ចំណងជើងភាសាខ្មែរ")}
                                value={form.data.header_title_km}
                                onChange={(e) => form.setData('header_title_km', e.target.value)}
                                placeholder={tr("វិក្កយបត្រ")}
                            />
                            <Input
                                id="header_title_en"
                                label={tr("English Title / ចំណងជើងភាសាអង់គ្លេស")}
                                value={form.data.header_title_en}
                                onChange={(e) => form.setData('header_title_en', e.target.value)}
                                placeholder="INVOICE"
                            />
                        </div>

                        <Input
                            id="header_subtitle"
                            label={tr("ចំណងជើងរង")}
                            value={form.data.header_subtitle}
                            onChange={(e) => form.setData('header_subtitle', e.target.value)}
                            placeholder={tr("វិក្កយបត្រលក់ / Sales Receipt")}
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
                                <div className="space-y-0.5">
                                    <span className="text-xs font-semibold text-zinc-200">{tr('បង្ហាញឡូហ្គោ')}</span>
                                    <p className="text-[10px] text-zinc-400">{tr('ឡូហ្គោរាងមូលរបស់ហាង')}</p>
                                </div>
                                <Switch
                                    id="show_logo"
                                    checked={form.data.show_logo}
                                    onCheckedChange={(val) => form.setData('show_logo', val)}
                                    ariaLabel="Show Logo"
                                />
                            </div>

                            <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
                                <div className="space-y-0.5">
                                    <span className="text-xs font-semibold text-zinc-200">{tr('បង្ហាញឈ្មោះហាង')}</span>
                                    <p className="text-[10px] text-zinc-400">{tr('ឈ្មោះខ្មែរ និងអង់គ្លេស')}</p>
                                </div>
                                <Switch
                                    id="show_business_name"
                                    checked={form.data.show_business_name}
                                    onCheckedChange={(val) => form.setData('show_business_name', val)}
                                    ariaLabel="Show Business Name"
                                />
                            </div>

                            <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
                                <div className="space-y-0.5">
                                    <span className="text-xs font-semibold text-zinc-200">{tr('បង្ហាញអាសយដ្ឋាន')}</span>
                                    <p className="text-[10px] text-zinc-400">{tr('អាសយដ្ឋានហាង')}</p>
                                </div>
                                <Switch
                                    id="show_address"
                                    checked={form.data.show_address}
                                    onCheckedChange={(val) => form.setData('show_address', val)}
                                    ariaLabel="Show Address"
                                />
                            </div>

                            <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
                                <div className="space-y-0.5">
                                    <span className="text-xs font-semibold text-zinc-200">{tr('បង្ហាញលេខទូរស័ព្ទ')}</span>
                                    <p className="text-[10px] text-zinc-400">{tr('លេខទំនាក់ទំនងហាង')}</p>
                                </div>
                                <Switch
                                    id="show_phone"
                                    checked={form.data.show_phone}
                                    onCheckedChange={(val) => form.setData('show_phone', val)}
                                    ariaLabel="Show Phone"
                                />
                            </div>

                            <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/80 sm:col-span-2">
                                <div className="space-y-0.5">
                                    <span className="text-xs font-semibold text-zinc-200">{tr('បង្ហាញលេខ VAT TIN')}</span>
                                    <p className="text-[10px] text-zinc-400">{tr('លេខអត្តសញ្ញាណកម្មសារពើពន្ធ')}</p>
                                </div>
                                <Switch
                                    id="show_vat_tin"
                                    checked={form.data.show_vat_tin}
                                    onCheckedChange={(val) => form.setData('show_vat_tin', val)}
                                    ariaLabel="Show VAT / TIN"
                                />
                            </div>
                        </div>
                    </Card>

                    {/* 3. Metadata & Customer */}
                    <Card className="p-4 sm:p-5 space-y-4">
                        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-emerald-400" />
                                <h3 className="text-sm font-bold text-zinc-100">
                                    {tr('ព័ត៌មានការលក់ & អតិថិជន')}
                                </h3>
                            </div>
                            <span className="text-[11px] font-mono text-zinc-400">{tr('ផ្នែក 3/6')}</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
                                <div className="space-y-0.5">
                                    <span className="text-xs font-semibold text-zinc-200">{tr('បង្ហាញឈ្មោះអ្នកគិតប្រាក់')}</span>
                                    <p className="text-[10px] text-zinc-400">{tr('អ្នកដែលគិតប្រាក់')}</p>
                                </div>
                                <Switch
                                    id="show_cashier"
                                    checked={form.data.show_cashier}
                                    onCheckedChange={(val) => form.setData('show_cashier', val)}
                                    ariaLabel="Show Cashier"
                                />
                            </div>

                            <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
                                <div className="space-y-0.5">
                                    <span className="text-xs font-semibold text-zinc-200">{tr('បង្ហាញលេខតុ')}</span>
                                    <p className="text-[10px] text-zinc-400">{tr('លេខតុ ឬស្លាកការកម្មង់')}</p>
                                </div>
                                <Switch
                                    id="show_table_ref"
                                    checked={form.data.show_table_ref}
                                    onCheckedChange={(val) => form.setData('show_table_ref', val)}
                                    ariaLabel="Show Table / Ref"
                                />
                            </div>

                            <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
                                <div className="space-y-0.5">
                                    <span className="text-xs font-semibold text-zinc-200">{tr('បង្ហាញចំនួនភ្ញៀវ')}</span>
                                    <p className="text-[10px] text-zinc-400">{tr('ចំនួនភ្ញៀវសរុប')}</p>
                                </div>
                                <Switch
                                    id="show_guest_count"
                                    checked={form.data.show_guest_count}
                                    onCheckedChange={(val) => form.setData('show_guest_count', val)}
                                    ariaLabel="Show Guest Count"
                                />
                            </div>

                            <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
                                <div className="space-y-0.5">
                                    <span className="text-xs font-semibold text-zinc-200">{tr('បង្ហាញកាលបរិច្ឆេទ & ម៉ោង')}</span>
                                    <p className="text-[10px] text-zinc-400">{tr('ថ្ងៃ និងម៉ោងលក់')}</p>
                                </div>
                                <Switch
                                    id="show_datetime"
                                    checked={form.data.show_datetime}
                                    onCheckedChange={(val) => form.setData('show_datetime', val)}
                                    ariaLabel="Show Date & Time"
                                />
                            </div>

                            <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
                                <div className="space-y-0.5">
                                    <span className="text-xs font-semibold text-zinc-200">{tr('បង្ហាញព័ត៌មានអតិថិជន')}</span>
                                    <p className="text-[10px] text-zinc-400">{tr('ឈ្មោះ & លេខទូរស័ព្ទ (A5)')}</p>
                                </div>
                                <Switch
                                    id="show_customer_info"
                                    checked={form.data.show_customer_info}
                                    onCheckedChange={(val) => form.setData('show_customer_info', val)}
                                    ariaLabel="Show Customer Info"
                                />
                            </div>

                            <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
                                <div className="space-y-0.5">
                                    <span className="text-xs font-semibold text-zinc-200">{tr('បង្ហាញបាកូដ')}</span>
                                    <p className="text-[10px] text-zinc-400">{tr('បាកូដលើវិក្កយបត្រ')}</p>
                                </div>
                                <Switch
                                    id="show_barcode"
                                    checked={form.data.show_barcode}
                                    onCheckedChange={(val) => form.setData('show_barcode', val)}
                                    ariaLabel="Show Barcode"
                                />
                            </div>
                        </div>
                    </Card>

                    {/* 4. Line Items Table Customization */}
                    <Card className="p-4 sm:p-5 space-y-4">
                        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                            <div className="flex items-center gap-2">
                                <Sliders className="w-4 h-4 text-emerald-400" />
                                <h3 className="text-sm font-bold text-zinc-100">
                                    {tr('មុខទំនិញ & ជួរឈរ')}
                                </h3>
                            </div>
                            <span className="text-[11px] font-mono text-zinc-400">{tr('ផ្នែក 4/6')}</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
                                <div className="space-y-0.5">
                                    <span className="text-xs font-semibold text-zinc-200">{tr('បង្ហាញឈ្មោះមុខទំនិញជាខ្មែរ')}</span>
                                    <p className="text-[10px] text-zinc-400">{tr('ឈ្មោះទីពីរ (ខ្មែរ)')}</p>
                                </div>
                                <Switch
                                    id="show_item_khmer_name"
                                    checked={form.data.show_item_khmer_name}
                                    onCheckedChange={(val) => form.setData('show_item_khmer_name', val)}
                                    ariaLabel="Show Khmer Item Name"
                                />
                            </div>

                            <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
                                <div className="space-y-0.5">
                                    <span className="text-xs font-semibold text-zinc-200">{tr('បង្ហាញឯកតា')}</span>
                                    <p className="text-[10px] text-zinc-400">{tr('ឧ. កំប៉ុង ចាន ដប')}</p>
                                </div>
                                <Switch
                                    id="show_item_unit"
                                    checked={form.data.show_item_unit}
                                    onCheckedChange={(val) => form.setData('show_item_unit', val)}
                                    ariaLabel="Show Item Unit"
                                />
                            </div>

                            <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
                                <div className="space-y-0.5">
                                    <span className="text-xs font-semibold text-zinc-200">{tr('បង្ហាញលេខកូដ SKU')}</span>
                                    <p className="text-[10px] text-zinc-400">{tr('លេខកូដមុខទំនិញ')}</p>
                                </div>
                                <Switch
                                    id="show_item_sku"
                                    checked={form.data.show_item_sku}
                                    onCheckedChange={(val) => form.setData('show_item_sku', val)}
                                    ariaLabel="Show Item SKU"
                                />
                            </div>

                            <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
                                <div className="space-y-0.5">
                                    <span className="text-xs font-semibold text-zinc-200">{tr('បង្ហាញចំនួន')}</span>
                                    <p className="text-[10px] text-zinc-400">{tr('ចំនួនដែលទិញ')}</p>
                                </div>
                                <Switch
                                    id="show_item_quantity"
                                    checked={form.data.show_item_quantity}
                                    onCheckedChange={(val) => form.setData('show_item_quantity', val)}
                                    ariaLabel="Show Quantity"
                                />
                            </div>
                        </div>
                    </Card>

                    {/* 5. សរុប ពន្ធ & រូបិយប័ណ្ណពីរ */}
                    <Card className="p-4 sm:p-5 space-y-4">
                        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                            <div className="flex items-center gap-2">
                                <DollarSign className="w-4 h-4 text-emerald-400" />
                                <h3 className="text-sm font-bold text-zinc-100">
                                    {tr('សរុប ពន្ធ & រូបិយប័ណ្ណពីរ')}
                                </h3>
                            </div>
                            <span className="text-[11px] font-mono text-zinc-400">{tr('ផ្នែក 5/6')}</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
                                <div className="space-y-0.5">
                                    <span className="text-xs font-semibold text-zinc-200">{tr('បង្ហាញសរុបរង')}</span>
                                    <p className="text-[10px] text-zinc-400">{tr('សរុបមុនបញ្ចុះតម្លៃ')}</p>
                                </div>
                                <Switch
                                    id="show_subtotal"
                                    checked={form.data.show_subtotal}
                                    onCheckedChange={(val) => form.setData('show_subtotal', val)}
                                    ariaLabel="Show Subtotal"
                                />
                            </div>

                            <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
                                <div className="space-y-0.5">
                                    <span className="text-xs font-semibold text-zinc-200">{tr('បង្ហាញពន្ធ (VAT)')}</span>
                                    <p className="text-[10px] text-zinc-400">{tr('ជួរពន្ធដាច់ដោយឡែក')}</p>
                                </div>
                                <Switch
                                    id="show_tax"
                                    checked={form.data.show_tax}
                                    onCheckedChange={(val) => form.setData('show_tax', val)}
                                    ariaLabel="Show Tax"
                                />
                            </div>

                            <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
                                <div className="space-y-0.5">
                                    <span className="text-xs font-semibold text-zinc-200">{tr('បង្ហាញបញ្ចុះតម្លៃ')}</span>
                                    <p className="text-[10px] text-zinc-400">{tr('ប្រូម៉ូសិន ឬបញ្ចុះតម្លៃ VIP')}</p>
                                </div>
                                <Switch
                                    id="show_discount"
                                    checked={form.data.show_discount}
                                    onCheckedChange={(val) => form.setData('show_discount', val)}
                                    ariaLabel="Show Discount"
                                />
                            </div>

                            <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
                                <div className="space-y-0.5">
                                    <span className="text-xs font-semibold text-zinc-200">{tr('បង្ហាញប្រាក់រៀល (៛)')}</span>
                                    <p className="text-[10px] text-zinc-400">{tr('សរុបជាប្រាក់រៀល')}</p>
                                </div>
                                <Switch
                                    id="show_dual_currency"
                                    checked={form.data.show_dual_currency}
                                    onCheckedChange={(val) => form.setData('show_dual_currency', val)}
                                    ariaLabel="Show Dual Currency"
                                />
                            </div>
                        </div>

                        {form.data.show_dual_currency && (
                            <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-2">
                                <Input
                                    id="exchange_rate_khr"
                                    type="number"
                                    label={tr("Exchange Rate (1 USD = X KHR) / អត្រាប្តូរប្រាក់")}
                                    value={form.data.exchange_rate_khr}
                                    onChange={(e) =>
                                        form.setData('exchange_rate_khr', parseFloat(e.target.value) || 4100)
                                    }
                                    placeholder="4100"
                                />
                                <p className="text-[11px] text-zinc-400 font-khmer">
                                    {tr('ឧទាហរណ៍៖ $25.00 គុណនឹង')} {form.data.exchange_rate_khr} = {(25 * form.data.exchange_rate_khr).toLocaleString()} {tr('៛')}
                                </p>
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
                                <div className="space-y-0.5">
                                    <span className="text-xs font-semibold text-zinc-200">{tr('បង្ហាញវិធីបង់ & ប្រាក់ទទួល')}</span>
                                    <p className="text-[10px] text-zinc-400">{tr('ឧ. សាច់ប្រាក់ $30.00 / KHQR')}</p>
                                </div>
                                <Switch
                                    id="show_payment_method"
                                    checked={form.data.show_payment_method}
                                    onCheckedChange={(val) => form.setData('show_payment_method', val)}
                                    ariaLabel="Show Payment Method"
                                />
                            </div>

                            <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
                                <div className="space-y-0.5">
                                    <span className="text-xs font-semibold text-zinc-200">{tr('បង្ហាញប្រាក់អាប់')}</span>
                                    <p className="text-[10px] text-zinc-400">{tr('ប្រាក់អាប់ជាដុល្លារ និងរៀល')}</p>
                                </div>
                                <Switch
                                    id="show_change"
                                    checked={form.data.show_change}
                                    onCheckedChange={(val) => form.setData('show_change', val)}
                                    ariaLabel="Show Change"
                                />
                            </div>
                        </div>
                    </Card>

                    {/* 6. Footer, Policies, KHQR & Wi-Fi */}
                    <Card className="p-4 sm:p-5 space-y-4">
                        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-emerald-400" />
                                <h3 className="text-sm font-bold text-zinc-100">
                                    {tr('ខាងក្រោម, KHQR & Wi-Fi')}
                                </h3>
                            </div>
                            <span className="text-[11px] font-mono text-zinc-400">{tr('ផ្នែក 6/6')}</span>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                                {tr('Thank-You Message / សារអរគុណបាតវិក្កយបត្រ')}
                            </label>
                            <textarea
                                rows={2}
                                value={form.data.footer_text}
                                onChange={(e) => form.setData('footer_text', e.target.value)}
                                className="w-full text-xs rounded-lg bg-zinc-900 border border-zinc-700/80 px-3 py-2 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                placeholder={tr("Thank you for dining with us! សូមអរគុណ!")}
                            />
                        </div>

                        <Input
                            id="policy_note"
                            label={tr("Return / Exchange Policy Notice (សេចក្តីជូនដំណឹងគោលការណ៍)")}
                            value={form.data.policy_note}
                            onChange={(e) => form.setData('policy_note', e.target.value)}
                            placeholder={tr("Goods sold are not returnable • ទំនិញទិញហើយមិនអាចប្តូរវិញបានទេ")}
                        />

                        {/* KHQR payment toggle */}
                        <div className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/80 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <QrCode className="w-4 h-4 text-rose-400" />
                                    <div>
                                        <span className="text-xs font-semibold text-zinc-200">
                                            {tr('បង្ហាញ KHQR / QR បង់ប្រាក់')}
                                        </span>
                                        <p className="text-[10px] text-zinc-400">
                                            {tr('ព្រីន QR Bakong / KHQR នៅខាងក្រោមវិក្កយបត្រ')}
                                        </p>
                                    </div>
                                </div>
                                <Switch
                                    id="show_qr_payment"
                                    checked={form.data.show_qr_payment}
                                    onCheckedChange={(val) => form.setData('show_qr_payment', val)}
                                    ariaLabel="Show QR Payment"
                                />
                            </div>

                            {form.data.show_qr_payment && (
                                <div className="space-y-3.5 pt-2 border-t border-zinc-800/80">
                                    {/* Bank QR Code Image Uploader */}
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-medium text-zinc-300">
                                                {tr('Bank QR Code Image / រូបភាព KHQR (ABA, ACLEDA, Bakong...)')}
                                            </label>
                                            {form.data.qr_code_image && (
                                                <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1 font-semibold">
                                                    <CheckCircle2 className="w-3 h-3" /> Active QR
                                                </span>
                                            )}
                                        </div>

                                        <input
                                            ref={qrFileInputRef}
                                            type="file"
                                            accept="image/png,image/jpeg,image/webp"
                                            onChange={handleQrFileSelect}
                                            className="hidden"
                                            id="qr-code-upload-input"
                                        />

                                        {form.data.qr_code_image ? (
                                            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-900 border border-zinc-700/70 shadow-inner">
                                                <div className="w-16 h-16 bg-white rounded-lg p-1 border border-zinc-600 shrink-0 flex items-center justify-center overflow-hidden shadow-xs">
                                                    <img
                                                        src={form.data.qr_code_image}
                                                        alt="Bank QR Preview"
                                                        className="w-full h-full object-contain"
                                                    />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-xs font-bold text-white truncate">
                                                        {tr('បានដាក់ QR ធនាគារ')}
                                                    </div>
                                                    <p className="text-[10px] text-zinc-400 truncate">
                                                        {tr('បង្ហាញលើវិក្កយបត្ររបស់ភ្ញៀវ')}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                            disabled={isUploadingQr}
                                                            onClick={() => qrFileInputRef.current?.click()}
                                                            className="h-7 text-xs px-2.5 gap-1 text-zinc-300 hover:text-white cursor-pointer"
                                                        >
                                                            {isUploadingQr ? (
                                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                            ) : (
                                                                <Upload className="w-3 h-3" />
                                                            )}
                                                            {tr('Change / ប្តូរ')}
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                            disabled={isUploadingQr}
                                                            onClick={handleRemoveQrCode}
                                                            className="h-7 text-xs px-2.5 gap-1 text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 border-rose-900/40 cursor-pointer"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                            {tr('Remove / យកចេញ')}
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div
                                                onClick={() => qrFileInputRef.current?.click()}
                                                className="border-2 border-dashed border-zinc-700 hover:border-amber-500/70 bg-zinc-900/50 hover:bg-zinc-900/90 rounded-xl p-4 text-center cursor-pointer transition-all group"
                                            >
                                                {isUploadingQr ? (
                                                    <div className="flex flex-col items-center justify-center py-1">
                                                        <Loader2 className="w-6 h-6 text-amber-400 animate-spin mb-1.5" />
                                                        <span className="text-xs text-zinc-300 font-medium">{tr('កំពុង upload រូប QR...')}</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center py-1">
                                                        <div className="w-9 h-9 rounded-full bg-zinc-800 group-hover:bg-amber-500/20 text-zinc-400 group-hover:text-amber-400 flex items-center justify-center mb-2 transition-all">
                                                            <Upload className="w-4 h-4" />
                                                        </div>
                                                        <div className="text-xs font-semibold text-zinc-200 group-hover:text-white">
                                                            {tr('ដាក់ QR ធនាគារ Code / រូបភាព KHQR')}
                                                        </div>
                                                        <div className="text-[10px] text-zinc-400 mt-0.5">
                                                            {tr('ចុច ឬអូសរូប QR ពី ABA, ACLEDA ឬ Bakong (PNG, JPG, WEBP)')}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {qrUploadError && (
                                            <p className="text-[11px] text-rose-400 font-medium pt-1">
                                                {qrUploadError}
                                            </p>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                        <Input
                                            id="qr_payment_text"
                                            label={tr("ចំណងជើង QR")}
                                            value={form.data.qr_payment_text}
                                            onChange={(e) => form.setData('qr_payment_text', e.target.value)}
                                            placeholder={tr("ស្កេនដើម្បីបង់ / Scan to Pay")}
                                        />

                                        <Input
                                            id="qr_bank_name"
                                            label={tr("ធនាគារ / ចំណាំ")}
                                            value={form.data.qr_bank_name}
                                            onChange={(e) => form.setData('qr_bank_name', e.target.value)}
                                            placeholder="Bakong KHQR • Cambodia FastPay"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <Input
                                            id="qr_account_name"
                                            label={tr("ឈ្មោះគណនី (មិនចាំបាច់)")}
                                            value={form.data.qr_account_name}
                                            onChange={(e) => form.setData('qr_account_name', e.target.value)}
                                            placeholder="LEASHAL ETUM"
                                        />

                                        <Input
                                            id="qr_account_number"
                                            label={tr("លេខគណនី (មិនចាំបាច់)")}
                                            value={form.data.qr_account_number}
                                            onChange={(e) => form.setData('qr_account_number', e.target.value)}
                                            placeholder="000 123 456"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Wi-Fi Details toggle */}
                        <div className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/80 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <Wifi className="w-4 h-4 text-sky-400" />
                                    <div>
                                        <span className="text-xs font-semibold text-zinc-200">
                                            {tr('បង្ហាញ Wi-Fi សម្រាប់ភ្ញៀវ')}
                                        </span>
                                        <p className="text-[10px] text-zinc-400">
                                            {tr('ឈ្មោះ Wi-Fi និងលេខសម្ងាត់សម្រាប់ភ្ញៀវ')}
                                        </p>
                                    </div>
                                </div>
                                <Switch
                                    id="show_wifi_info"
                                    checked={form.data.show_wifi_info}
                                    onCheckedChange={(val) => form.setData('show_wifi_info', val)}
                                    ariaLabel="Show Wi-Fi Info"
                                />
                            </div>

                            {form.data.show_wifi_info && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                    <Input
                                        id="wifi_ssid"
                                        label={tr("Wi-Fi SSID (ឈ្មោះបណ្តាញ)")}
                                        value={form.data.wifi_ssid}
                                        onChange={(e) => form.setData('wifi_ssid', e.target.value)}
                                        placeholder="Leashal-Etum-Guest"
                                    />
                                    <Input
                                        id="wifi_password"
                                        label={tr("Wi-Fi Password (លេខកូដសម្ងាត់)")}
                                        value={form.data.wifi_password}
                                        onChange={(e) => form.setData('wifi_password', e.target.value)}
                                        placeholder="welcome2026"
                                    />
                                </div>
                            )}
                        </div>

                        {/* A5 Signature Blocks */}
                        <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
                            <div className="flex items-center gap-2.5">
                                <UserCheck className="w-4 h-4 text-emerald-400" />
                                <div>
                                    <span className="text-xs font-semibold text-zinc-200">
                                        {tr('បង្ហាញកន្លែងហត្ថលេខា (A5)')}
                                    </span>
                                    <p className="text-[10px] text-zinc-400">
                                        Official Cashier & Customer signature lines on A5
                                    </p>
                                </div>
                            </div>
                            <Switch
                                id="show_signature_blocks"
                                checked={form.data.show_signature_blocks}
                                onCheckedChange={(val) => form.setData('show_signature_blocks', val)}
                                ariaLabel="Show Signature Blocks"
                            />
                        </div>
                    </Card>

                    {/* Submit Bar at bottom */}
                    <div className="flex justify-end gap-3 pt-2">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={handleResetDefaults}
                        >
                            <RotateCcw className="w-4 h-4" />
                            <span>{tr('កំណត់ដើមវិញ')}</span>
                        </Button>
                        <Button
                            type="submit"
                            disabled={form.processing}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-md shadow-emerald-950"
                        >
                            <Save className="w-4 h-4" />
                            <span>{form.processing ? tr('កំពុងរក្សាទុក...') : tr('រក្សាទុកការកំណត់វិក្កយបត្រ')}</span>
                        </Button>
                    </div>
                </form>

                {/* RIGHT COLUMN: Interactive Real-Time Live Preview (5 cols) */}
                <div className="lg:col-span-5 sticky top-28 space-y-4">
                    {/* Live Preview Control Toolbar */}
                    <div className="bg-zinc-900/90 backdrop-blur-md p-3 rounded-xl border border-zinc-800 flex flex-wrap items-center justify-between gap-2 shadow-lg">
                        {/* Format Switcher */}
                        <div className="inline-flex rounded-lg bg-zinc-950 p-0.5 border border-zinc-800">
                            <button
                                type="button"
                                onClick={() => setActivePreviewFormat('80mm')}
                                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                                    activePreviewFormat === '80mm'
                                        ? 'bg-emerald-500 text-zinc-950 shadow-xs'
                                        : 'text-zinc-400 hover:text-white'
                                }`}
                            >
                                <Printer className="w-3.5 h-3.5" />
                                <span>{tr('ក្រដាស 80mm')}</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setActivePreviewFormat('a5')}
                                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                                    activePreviewFormat === 'a5'
                                        ? 'bg-emerald-500 text-zinc-950 shadow-xs'
                                        : 'text-zinc-400 hover:text-white'
                                }`}
                            >
                                <FileText className="w-3.5 h-3.5" />
                                <span>{tr('វិក្កយបត្រ A5')}</span>
                            </button>
                        </div>

                        {/* Action buttons: Zoom & Print */}
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() =>
                                    setPreviewZoom((prev) => (prev > 70 ? prev - 10 : prev))
                                }
                                title={tr("បង្រួម")}
                                className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700"
                            >
                                <ZoomOut className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-[11px] font-mono text-zinc-400 px-1">
                                {previewZoom}%
                            </span>
                            <button
                                type="button"
                                onClick={() =>
                                    setPreviewZoom((prev) => (prev < 120 ? prev + 10 : prev))
                                }
                                title={tr("ពង្រីក")}
                                className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700"
                            >
                                <ZoomIn className="w-3.5 h-3.5" />
                            </button>
                            <Button
                                type="button"
                                size="sm"
                                onClick={handleTestPrint}
                                className="bg-zinc-800 hover:bg-zinc-700 text-white font-medium border border-zinc-700 ml-1 text-xs"
                                title={tr("ព្រីនសាកល្បង")}
                            >
                                <Printer className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                                <span>{tr('ព្រីនសាកល្បង')}</span>
                            </Button>
                        </div>
                    </div>

                    {/* Preview Scroll Canvas */}
                    <div
                        ref={previewContainerRef}
                        className="p-4 sm:p-6 rounded-2xl bg-zinc-950 border border-zinc-800/80 shadow-2xl overflow-y-auto max-h-[calc(100vh-14rem)] flex justify-center items-start"
                        style={{
                            backgroundImage:
                                'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)',
                            backgroundSize: '24px 24px',
                        }}
                    >
                        {/* Zoom transform container */}
                        <div
                            style={{
                                transform: `scale(${previewZoom / 100})`,
                                transformOrigin: 'top center',
                                transition: 'transform 0.15s ease-out',
                            }}
                        >
                            {/* =========================================================================
                                80MM THERMAL RECEIPT PREVIEW CANVAS
                                ========================================================================= */}
                            {activePreviewFormat === '80mm' && (
                                <div
                                    id="live-invoice-print-canvas"
                                    className="w-[320px] bg-white text-black p-4 rounded shadow-2xl font-mono text-[11px] leading-tight space-y-2.5 border border-zinc-300 relative select-none"
                                >
                                    {/* Brand / Header */}
                                    <div className="text-center space-y-1 pb-2 border-b border-dashed border-zinc-400">
                                        {form.data.show_logo && (
                                            <div className="w-10 h-10 mx-auto rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs mb-1">
                                                LE
                                            </div>
                                        )}

                                        {form.data.show_business_name && (
                                            <>
                                                <h1 className="text-sm font-bold tracking-tight uppercase">
                                                    {settings.business_name_primary || 'លៀសហាល អ៉ីទុម'}
                                                </h1>
                                                {settings.business_name_secondary && (
                                                    <div className="text-[11px] font-sans font-bold">
                                                        {settings.business_name_secondary}
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        <div className="pt-0.5">
                                            <span className="font-bold text-[12px] uppercase">
                                                {form.data.header_title_en}
                                            </span>
                                            {form.data.header_title_km && (
                                                <span className="block text-[11px] font-khmer text-zinc-700">
                                                    {form.data.header_title_km}
                                                </span>
                                            )}
                                        </div>

                                        {form.data.show_address && settings.address_primary && (
                                            <div className="text-[10px] text-zinc-600 leading-snug">
                                                {settings.address_primary}
                                            </div>
                                        )}

                                        {form.data.show_phone && settings.phone && (
                                            <div className="text-[10px] text-zinc-600">
                                                TEL: {settings.phone}
                                            </div>
                                        )}

                                        {form.data.show_vat_tin && (
                                            <div className="text-[9px] text-zinc-500 font-mono">
                                                VAT/TIN: {settings.tax_identifier || 'K001-902348512'}
                                            </div>
                                        )}
                                    </div>

                                    {/* Metadata Details */}
                                    <div className="space-y-0.5 text-[10px] pb-2 border-b border-dashed border-zinc-400">
                                        <div className="flex justify-between">
                                            <span className="text-zinc-600">លេខវិក្កយបត្រ / NO:</span>
                                            <span className="font-bold">INV-2026-0042</span>
                                        </div>

                                        {form.data.show_datetime && (
                                            <div className="flex justify-between">
                                                <span className="text-zinc-600">កាលបរិច្ឆេទ / DATE:</span>
                                                <span>2026-10-14 12:45 PM</span>
                                            </div>
                                        )}

                                        {form.data.show_table_ref && (
                                            <div className="flex justify-between">
                                                <span className="text-zinc-600">តុ / TABLE:</span>
                                                <span className="font-bold">VIP-02</span>
                                            </div>
                                        )}

                                        {form.data.show_cashier && (
                                            <div className="flex justify-between">
                                                <span className="text-zinc-600">អ្នកគិតប្រាក់ / CASHIER:</span>
                                                <span>{auth.user?.name || 'Sok Dara'}</span>
                                            </div>
                                        )}

                                        {form.data.show_guest_count && (
                                            <div className="flex justify-between">
                                                <span className="text-zinc-600">ភ្ញៀវ / GUESTS:</span>
                                                <span>4</span>
                                            </div>
                                        )}

                                        {form.data.show_barcode && (
                                            <div className="text-center pt-1.5 pb-0.5">
                                                <div className="h-6 w-36 mx-auto flex items-end justify-center gap-0.5">
                                                    {[2, 1, 3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2, 1, 3, 2, 4, 1, 2, 3, 1].map(
                                                        (h, i) => (
                                                            <div
                                                                key={i}
                                                                className="bg-black"
                                                                style={{
                                                                    width: `${h}px`,
                                                                    height: '100%',
                                                                }}
                                                            />
                                                        )
                                                    )}
                                                </div>
                                                <span className="text-[8px] text-zinc-500 tracking-widest font-mono">
                                                    *INV-2026-0042*
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Line Items Table */}
                                    <div className="space-y-1.5 pb-2 border-b border-dashed border-zinc-400">
                                        <div className="flex justify-between text-[10px] font-bold text-zinc-800 pb-0.5 border-b border-zinc-300">
                                            <span>មុខទំនិញ / ITEM</span>
                                            <span>ទឹកប្រាក់ / AMOUNT</span>
                                        </div>

                                        {sampleItems.map((item) => (
                                            <div
                                                key={item.id}
                                                className={`space-y-0.5 ${
                                                    form.data.item_density === 'compact'
                                                        ? 'py-0'
                                                        : form.data.item_density === 'spacious'
                                                        ? 'py-1'
                                                        : 'py-0.5'
                                                }`}
                                            >
                                                <div className="flex justify-between font-sans text-[11px] font-semibold text-black">
                                                    <span className="leading-tight">
                                                        {item.name_en}
                                                        {form.data.show_item_sku && (
                                                            <span className="text-[9px] text-zinc-500 block font-mono">
                                                                SKU: {item.sku}
                                                            </span>
                                                        )}
                                                        {form.data.show_item_khmer_name && (
                                                            <span className="block text-[10px] text-zinc-600 font-khmer">
                                                                {item.name_km}
                                                            </span>
                                                        )}
                                                    </span>
                                                    <span className="font-mono text-[11px] font-bold shrink-0">
                                                        ${item.total.toFixed(2)}
                                                    </span>
                                                </div>

                                                <div className="flex justify-between text-[10px] text-zinc-600 font-mono">
                                                    <span>
                                                        {form.data.show_item_quantity && `${item.qty} `}
                                                        {form.data.show_item_unit && `${item.unit} `}× $
                                                        {item.price.toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Financial Totals */}
                                    <div className="space-y-1 text-[11px] pb-2 border-b border-dashed border-zinc-400">
                                        {form.data.show_subtotal && (
                                            <div className="flex justify-between">
                                                <span>សរុបរង / SUBTOTAL:</span>
                                                <span>${subtotal.toFixed(2)}</span>
                                            </div>
                                        )}

                                        {form.data.show_discount && discount > 0 && (
                                            <div className="flex justify-between text-zinc-600 text-[10px]">
                                                <span>បញ្ចុះតម្លៃ / DISCOUNT:</span>
                                                <span>-${discount.toFixed(2)}</span>
                                            </div>
                                        )}

                                        {form.data.show_tax && (
                                            <div className="flex justify-between text-zinc-600 text-[10px]">
                                                <span>ពន្ធ / TAX (10%):</span>
                                                <span>${tax.toFixed(2)}</span>
                                            </div>
                                        )}

                                        <div className="flex justify-between items-baseline text-[13px] font-bold pt-1 border-t border-zinc-300">
                                            <span>TOTAL DUE / សរុប:</span>
                                            <div className="text-right">
                                                <div>${grandTotal.toFixed(2)}</div>
                                                {form.data.show_dual_currency && (
                                                    <div className="text-[11px] font-normal text-zinc-700 font-khmer">
                                                        ≈ {grandTotalKHR.toLocaleString()} ៛
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {form.data.show_payment_method && (
                                            <div className="flex justify-between text-[10px] text-zinc-600 pt-0.5">
                                                <span>ប្រាក់ទទួល / PAID (សាច់ប្រាក់ / Cash):</span>
                                                <span>${amountReceived.toFixed(2)}</span>
                                            </div>
                                        )}

                                        {form.data.show_change && (
                                            <div className="flex justify-between font-bold text-[11px] pt-0.5">
                                                <span>CHANGE / ប្រាក់អាប់:</span>
                                                <div className="text-right">
                                                    <span>${changeAmount.toFixed(2)}</span>
                                                    {form.data.show_dual_currency && (
                                                        <span className="block text-[10px] font-normal text-zinc-600 font-khmer">
                                                            ≈ {changeKHR.toLocaleString()} ៛
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* KHQR payment block */}
                                    {form.data.show_qr_payment && (
                                        <div className="text-center p-2 rounded-lg border border-zinc-300 bg-zinc-50 space-y-1">
                                            <div className="text-[10px] font-bold text-zinc-800 uppercase flex items-center justify-center gap-1">
                                                <QrCode className="w-3.5 h-3.5 text-rose-600" />
                                                <span>{form.data.qr_payment_text}</span>
                                            </div>
                                            {form.data.qr_code_image ? (
                                                <div className="w-24 h-24 mx-auto bg-white p-1 border border-zinc-300 rounded flex items-center justify-center shadow-xs">
                                                    <img
                                                        src={form.data.qr_code_image}
                                                        alt="Real Bank KHQR Code"
                                                        className="w-full h-full object-contain"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="w-20 h-20 mx-auto bg-white p-1 border-2 border-dashed border-zinc-300 rounded flex flex-col items-center justify-center text-zinc-400">
                                                    <QrCode className="w-6 h-6 stroke-1 text-zinc-400" />
                                                    <span className="text-[7px] text-zinc-400 mt-0.5 font-medium">ដាក់ QR ធនាគារ</span>
                                                </div>
                                            )}
                                            <div className="text-[8px] text-zinc-600 font-sans font-medium">
                                                {form.data.qr_bank_name || 'Bakong KHQR • Cambodia FastPay'}
                                            </div>
                                            {(form.data.qr_account_name || form.data.qr_account_number) && (
                                                <div className="text-[8px] text-zinc-800 font-mono font-medium">
                                                    {form.data.qr_account_name && <span>{form.data.qr_account_name}</span>}
                                                    {form.data.qr_account_name && form.data.qr_account_number && <span> • </span>}
                                                    {form.data.qr_account_number && <span>{form.data.qr_account_number}</span>}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Guest Wi-Fi block */}
                                    {form.data.show_wifi_info && (
                                        <div className="p-1.5 rounded border border-dashed border-zinc-300 text-[10px] text-center space-y-0.5">
                                            <div className="font-bold text-zinc-800 flex items-center justify-center gap-1">
                                                <Wifi className="w-3 h-3 text-sky-600" />
                                                <span>វ៉ាយហ្វាយ / FREE WI-FI</span>
                                            </div>
                                            <div className="text-zinc-600">
                                                Network: <span className="font-bold">{form.data.wifi_ssid}</span> | Pass:{' '}
                                                <span className="font-mono">{form.data.wifi_password}</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Policy & Footer Text */}
                                    <div className="text-center pt-1 space-y-1 text-[10px] text-zinc-600">
                                        {form.data.policy_note && (
                                            <div className="text-[9px] text-zinc-500 font-khmer italic">
                                                {form.data.policy_note}
                                            </div>
                                        )}
                                        <div className="font-khmer font-medium text-zinc-700">
                                            {form.data.footer_text}
                                        </div>
                                        <div className="text-[8px] text-zinc-400 tracking-wider font-sans">
                                            LEASHAL ETUM POS SYSTEM
                                        </div>
                                    </div>

                                    {/* Serrated receipt tear edge visual effect */}
                                    <div
                                        className="absolute -bottom-2 left-0 right-0 h-2 bg-white"
                                        style={{
                                            clipPath:
                                                'polygon(0% 0%, 5% 100%, 10% 0%, 15% 100%, 20% 0%, 25% 100%, 30% 0%, 35% 100%, 40% 0%, 45% 100%, 50% 0%, 55% 100%, 60% 0%, 65% 100%, 70% 0%, 75% 100%, 80% 0%, 85% 100%, 90% 0%, 95% 100%, 100% 0%)',
                                        }}
                                    />
                                </div>
                            )}

                            {/* =========================================================================
                                A5 FORMAL COMMERCIAL INVOICE PREVIEW CANVAS (148 × 210 mm)
                                ========================================================================= */}
                            {activePreviewFormat === 'a5' && (
                                <div
                                    id="live-invoice-print-canvas"
                                    className="w-[420px] min-h-[596px] bg-white text-black p-6 rounded shadow-2xl font-sans text-xs space-y-5 border border-zinc-300 select-none relative"
                                >
                                    {/* Header Letterhead */}
                                    <div className="flex items-start justify-between pb-3 border-b-2 border-zinc-900 gap-4">
                                        <div className="space-y-1">
                                            {form.data.show_logo && (
                                                <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs mb-1">
                                                    LE
                                                </div>
                                            )}

                                            {form.data.show_business_name && (
                                                <>
                                                    <h1 className="text-base font-bold tracking-tight text-zinc-950 uppercase">
                                                        {settings.business_name_primary || 'លៀសហាល អ៉ីទុម'}
                                                    </h1>
                                                    {settings.business_name_secondary && (
                                                        <div className="text-xs font-khmer text-zinc-700">
                                                            {settings.business_name_secondary}
                                                        </div>
                                                    )}
                                                </>
                                            )}

                                            {form.data.show_address && settings.address_primary && (
                                                <div className="text-[11px] text-zinc-600 leading-snug">
                                                    {settings.address_primary}
                                                </div>
                                            )}

                                            {form.data.show_phone && settings.phone && (
                                                <div className="text-[11px] text-zinc-600 font-mono">
                                                    Tel: {settings.phone}
                                                </div>
                                            )}

                                            {form.data.show_vat_tin && (
                                                <div className="text-[10px] font-semibold text-zinc-800 font-mono">
                                                    VAT/TIN: {settings.tax_identifier || 'K001-902348512'}
                                                </div>
                                            )}
                                        </div>

                                        <div className="text-right space-y-1 shrink-0">
                                            <div className="inline-block px-3 py-1 bg-zinc-100 rounded text-xs font-bold font-mono tracking-wider border border-zinc-300">
                                                {form.data.header_title_en}
                                            </div>
                                            {form.data.header_title_km && (
                                                <div className="text-[11px] font-khmer text-zinc-600">
                                                    {form.data.header_title_km}
                                                </div>
                                            )}
                                            <div className="pt-1 text-[10px] space-y-0.5 font-mono">
                                                <div>
                                                    <span className="text-zinc-500">លេខវិក្កយបត្រ / NO: </span>
                                                    <span className="font-bold text-zinc-950">INV-2026-0042</span>
                                                </div>
                                                {form.data.show_datetime && (
                                                    <div>
                                                        <span className="text-zinc-500">កាលបរិច្ឆេទ / DATE: </span>
                                                        <span>2026-10-14 12:45 PM</span>
                                                    </div>
                                                )}
                                                {form.data.show_table_ref && (
                                                    <div>
                                                        <span className="text-zinc-500">តុ / TABLE: </span>
                                                        <span className="font-bold">VIP-02</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Metadata Bar */}
                                    <div className="grid grid-cols-3 gap-3 p-2.5 bg-zinc-50 rounded border border-zinc-200 text-[11px]">
                                        {form.data.show_cashier && (
                                            <div>
                                                <span className="text-zinc-500 block text-[9px] uppercase font-mono">
                                                    អ្នកគិតប្រាក់ / Cashier
                                                </span>
                                                <span className="font-semibold text-zinc-900">
                                                    {auth.user?.name || 'Sok Dara'}
                                                </span>
                                            </div>
                                        )}

                                        {form.data.show_guest_count && (
                                            <div>
                                                <span className="text-zinc-500 block text-[9px] uppercase font-mono">
                                                    ភ្ញៀវ / Guests
                                                </span>
                                                <span className="font-semibold text-zinc-900">4 នាក់</span>
                                            </div>
                                        )}

                                        {form.data.show_customer_info && (
                                            <div>
                                                <span className="text-zinc-500 block text-[9px] uppercase font-mono">
                                                    អតិថិជន / Customer
                                                </span>
                                                <span className="font-semibold text-zinc-900">ឯកឧត្តម សុខ ចាន់ដារ៉ា</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Formal Table */}
                                    <div className="overflow-hidden border border-zinc-800 rounded">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-zinc-100 text-zinc-900 text-[10px] font-bold border-b border-zinc-800 uppercase font-mono">
                                                    <th className="p-1.5 border-r border-zinc-300 w-8 text-center">#</th>
                                                    <th className="p-1.5 border-r border-zinc-300">មុខទំនិញ / Description</th>
                                                    {form.data.show_item_unit && (
                                                        <th className="p-1.5 border-r border-zinc-300 w-12 text-center">
                                                            ឯកតា
                                                        </th>
                                                    )}
                                                    {form.data.show_item_quantity && (
                                                        <th className="p-1.5 border-r border-zinc-300 w-12 text-center">
                                                            ចំនួន
                                                        </th>
                                                    )}
                                                    <th className="p-1.5 border-r border-zinc-300 w-16 text-right">
                                                        តម្លៃ
                                                    </th>
                                                    <th className="p-1.5 w-16 text-right">សរុប</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-zinc-200 text-[10px]">
                                                {sampleItems.map((item, idx) => (
                                                    <tr
                                                        key={item.id}
                                                        className={
                                                            form.data.item_density === 'compact'
                                                                ? 'h-6'
                                                                : form.data.item_density === 'spacious'
                                                                ? 'h-10'
                                                                : 'h-8'
                                                        }
                                                    >
                                                        <td className="p-1.5 border-r border-zinc-200 text-center font-mono text-zinc-500">
                                                            {idx + 1}
                                                        </td>
                                                        <td className="p-1.5 border-r border-zinc-200">
                                                            <div className="font-semibold text-zinc-900">
                                                                {item.name_en}
                                                            </div>
                                                            {form.data.show_item_khmer_name && (
                                                                <div className="text-[9px] text-zinc-600 font-khmer">
                                                                    {item.name_km}
                                                                </div>
                                                            )}
                                                        </td>
                                                        {form.data.show_item_unit && (
                                                            <td className="p-1.5 border-r border-zinc-200 text-center font-mono text-zinc-600">
                                                                {item.unit}
                                                            </td>
                                                        )}
                                                        {form.data.show_item_quantity && (
                                                            <td className="p-1.5 border-r border-zinc-200 text-center font-mono font-semibold">
                                                                {item.qty}
                                                            </td>
                                                        )}
                                                        <td className="p-1.5 border-r border-zinc-200 text-right font-mono text-zinc-700">
                                                            ${item.price.toFixed(2)}
                                                        </td>
                                                        <td className="p-1.5 text-right font-mono font-bold text-zinc-950">
                                                            ${item.total.toFixed(2)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Totals Summary */}
                                    <div className="flex justify-between items-start gap-4 pt-1">
                                        <div className="flex-1 space-y-1.5 text-[10px] text-zinc-600">
                                            {form.data.show_qr_payment && (
                                                <div className="flex items-center gap-3 p-2 bg-zinc-50 border border-zinc-200 rounded text-[10px]">
                                                    {form.data.qr_code_image ? (
                                                        <div className="w-16 h-16 bg-white p-1 border border-zinc-300 rounded shrink-0 flex items-center justify-center">
                                                            <img
                                                                src={form.data.qr_code_image}
                                                                alt="Bank KHQR"
                                                                className="w-full h-full object-contain"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="w-16 h-16 bg-white p-1 border-2 border-dashed border-zinc-300 rounded shrink-0 flex flex-col items-center justify-center text-zinc-400">
                                                            <QrCode className="w-5 h-5 text-zinc-400" />
                                                            <span className="text-[6px] text-zinc-400 mt-0.5">KHQR</span>
                                                        </div>
                                                    )}
                                                    <div className="space-y-0.5">
                                                        <div className="font-bold text-zinc-800 uppercase flex items-center gap-1">
                                                            <QrCode className="w-3 h-3 text-rose-600" />
                                                            <span>{form.data.qr_payment_text}</span>
                                                        </div>
                                                        <div className="text-[9px] text-zinc-500 font-sans">
                                                            {form.data.qr_bank_name || 'Bakong KHQR • Cambodia FastPay'}
                                                        </div>
                                                        {(form.data.qr_account_name || form.data.qr_account_number) && (
                                                            <div className="text-[9px] text-zinc-800 font-mono font-medium">
                                                                {form.data.qr_account_name && <span>{form.data.qr_account_name}</span>}
                                                                {form.data.qr_account_name && form.data.qr_account_number && <span> • </span>}
                                                                {form.data.qr_account_number && <span>{form.data.qr_account_number}</span>}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {form.data.policy_note && (
                                                <div className="p-2 bg-zinc-50 border border-zinc-200 rounded text-[9px] font-khmer italic">
                                                    {form.data.policy_note}
                                                </div>
                                            )}

                                            <div className="font-khmer text-zinc-700">
                                                {form.data.footer_text}
                                            </div>

                                            {form.data.show_wifi_info && (
                                                <div className="text-[9px] text-zinc-500">
                                                    Wi-Fi SSID: <span className="font-semibold">{form.data.wifi_ssid}</span> | Pass:{' '}
                                                    <span className="font-mono">{form.data.wifi_password}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="w-48 space-y-1 border border-zinc-300 p-2.5 rounded bg-zinc-50/70 font-mono text-[10px]">
                                            {form.data.show_subtotal && (
                                                <div className="flex justify-between text-zinc-600">
                                                    <span>សរុបរង / Subtotal:</span>
                                                    <span>${subtotal.toFixed(2)}</span>
                                                </div>
                                            )}
                                            {form.data.show_discount && (
                                                <div className="flex justify-between text-zinc-600">
                                                    <span>បញ្ចុះតម្លៃ / Discount:</span>
                                                    <span>-${discount.toFixed(2)}</span>
                                                </div>
                                            )}
                                            {form.data.show_tax && (
                                                <div className="flex justify-between text-zinc-600">
                                                    <span>ពន្ធ / Tax (10%):</span>
                                                    <span>${tax.toFixed(2)}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between items-baseline text-xs font-bold text-zinc-950 pt-1 border-t border-zinc-300">
                                                <span>សរុប / Total:</span>
                                                <div className="text-right">
                                                    <div>${grandTotal.toFixed(2)}</div>
                                                    {form.data.show_dual_currency && (
                                                        <div className="text-[10px] font-normal text-zinc-600 font-khmer">
                                                            ≈ {grandTotalKHR.toLocaleString()} ៛
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            {form.data.show_payment_method && (
                                                <div className="flex justify-between text-zinc-600 pt-0.5 border-t border-zinc-200">
                                                    <span>ប្រាក់ទទួល / Paid:</span>
                                                    <span>${amountReceived.toFixed(2)}</span>
                                                </div>
                                            )}
                                            {form.data.show_change && (
                                                <div className="flex justify-between font-bold text-zinc-900">
                                                    <span>ប្រាក់អាប់ / Change:</span>
                                                    <span>${changeAmount.toFixed(2)}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Signatures */}
                                    {form.data.show_signature_blocks && (
                                        <div className="grid grid-cols-2 gap-8 pt-4 border-t border-zinc-200 text-[10px]">
                                            <div className="text-center space-y-6">
                                                <div className="font-semibold text-zinc-800">
                                                    Authorized Cashier / អ្នកគិតលុយ
                                                </div>
                                                <div className="border-b border-zinc-400 w-32 mx-auto" />
                                                <div className="text-[9px] text-zinc-500 font-mono">
                                                    {auth.user?.name || 'Sok Dara'}
                                                </div>
                                            </div>

                                            <div className="text-center space-y-6">
                                                <div className="font-semibold text-zinc-800">
                                                    អតិថិជន / Customer
                                                </div>
                                                <div className="border-b border-zinc-400 w-32 mx-auto" />
                                                <div className="text-[9px] text-zinc-500 font-mono">
                                                    ហត្ថលេខា & កាលបរិច្ឆេទ
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
