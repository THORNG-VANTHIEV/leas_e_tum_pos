import React, { useState } from 'react';
import { useForm, usePage } from '@inertiajs/react';
import { PageProps } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Lock, User as UserIcon, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';
import { tr } from '@/locales/tr';

export default function Login({ show_demo_accounts = false }: { show_demo_accounts?: boolean }) {
    const { business } = usePage<PageProps>().props;

    const { data, setData, post, processing, errors, reset } = useForm({
        username: '',
        password: '',
        remember: false,
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/login', {
            onFinish: () => reset('password'),
        });
    };

    const fillCredentials = (username: string, pass: string) => {
        setData({
            username,
            password: pass,
            remember: data.remember,
        });
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4 relative overflow-hidden font-sans">
            {/* Ambient Background Glows */}
            <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="w-full max-w-md relative z-10 space-y-6 page-transition">
                {/* Logo & Header */}
                <div className="text-center space-y-2">
                    <img src={business?.logo_url ?? '/images/brand/logo-192.png'} alt="" className="w-28 h-28 mx-auto rounded-full object-cover shadow-2xl shadow-orange-500/25 mb-2" />
                    <h1 className="text-2xl font-bold tracking-tight text-white font-khmer">
                        {business?.business_name_primary || 'លៀសហាល អ៉ីទុម'}
                    </h1>
                    <p className="text-sm text-zinc-400 font-mono">
                        {business?.business_name_secondary || 'LEASHAL ETUM POS'}
                    </p>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 font-mono">
                        <Sparkles className="w-3 h-3 text-emerald-400" />
                        <span className="font-khmer">{tr('ប្រព័ន្ធលក់ & គ្រប់គ្រងហាង')}</span>
                    </div>
                </div>

                {/* Login Form Card */}
                <Card className="border border-zinc-800/80 bg-zinc-900/70 backdrop-blur-2xl shadow-2xl space-y-5 p-6">
                    {(errors.username || errors.password) && (
                        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5">
                            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                            <div>{errors.username || errors.password}</div>
                        </div>
                    )}

                    <form onSubmit={submit} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-zinc-300 font-khmer">
                                {tr('ឈ្មោះអ្នកប្រើ (Username)')}
                            </label>
                            <div className="relative">
                                <UserIcon className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                    type="text"
                                    id="username"
                                    name="username"
                                    autoFocus
                                    value={data.username}
                                    onChange={(e) => setData('username', e.target.value)}
                                    placeholder={tr("បញ្ចូលឈ្មោះអ្នកប្រើ...")}
                                    className="w-full pl-10 pr-3.5 py-2.5 text-sm text-zinc-100 bg-zinc-950/80 border border-zinc-800 rounded-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-zinc-300 font-khmer">
                                {tr('ពាក្យសម្ងាត់ (Password)')}
                            </label>
                            <div className="relative">
                                <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                    type="password"
                                    id="password"
                                    name="password"
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full pl-10 pr-3.5 py-2.5 text-sm text-zinc-100 bg-zinc-950/80 border border-zinc-800 rounded-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-mono"
                                />
                            </div>
                            {errors.password && (
                                <p className="text-xs text-rose-400 font-medium">{errors.password}</p>
                            )}
                        </div>

                        <div className="flex items-center justify-between text-xs text-zinc-400">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={data.remember}
                                    onChange={(e) => setData('remember', e.target.checked)}
                                    className="rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-emerald-500/30"
                                />
                                <span className="font-khmer">{tr('ចងចាំការ login')}</span>
                            </label>
                        </div>

                        <Button
                            type="submit"
                            disabled={processing}
                            className="w-full py-2.5 text-base font-semibold"
                        >
                            <span className="font-khmer">{processing ? tr('កំពុងចូល...') : tr('ចូលប្រព័ន្ធ')}</span>
                        </Button>
                    </form>

                    {/* Quick Demo Credentials Preset Pills (development only) */}
                    {show_demo_accounts && (
                    <div className="pt-4 border-t border-zinc-800/80 space-y-2">
                        <div className="text-[11px] text-zinc-500 flex items-center justify-between">
                            <span className="font-khmer">{tr('គណនីសាកល្បង (Development)')}</span>
                            <span className="text-emerald-400 font-khmer">{tr('ចុចដើម្បីបំពេញ')}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <button
                                type="button"
                                onClick={() => fillCredentials('admin', 'admin123')}
                                className="px-2.5 py-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/60 text-left transition-all group"
                            >
                                <div className="text-xs font-semibold text-emerald-400 group-hover:text-emerald-300">
                                    admin
                                </div>
                                <div className="text-[10px] text-zinc-400">Admin</div>
                            </button>

                            <button
                                type="button"
                                onClick={() => fillCredentials('cashier1', 'cashier123')}
                                className="px-2.5 py-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/60 text-left transition-all group"
                            >
                                <div className="text-xs font-semibold text-teal-400 group-hover:text-teal-300">
                                    cashier1
                                </div>
                                <div className="text-[10px] text-zinc-400">Cashier</div>
                            </button>

                            <button
                                type="button"
                                onClick={() => fillCredentials('supervisor1', 'supervisor123')}
                                className="px-2.5 py-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/60 text-left transition-all group"
                            >
                                <div className="text-xs font-semibold text-amber-400 group-hover:text-amber-300">
                                    supervisor1
                                </div>
                                <div className="text-[10px] text-zinc-400">Supervisor</div>
                            </button>
                        </div>
                    </div>
                    )}
                </Card>

                {/* Footer Note */}
                <div className="text-center text-[11px] text-zinc-500 font-khmer">
                    {tr('រាល់ការ login ត្រូវបានកត់ត្រា • ខុស 5 ដង ត្រូវរង់ចាំ 1 នាទី')}
                </div>
            </div>
        </div>
    );
}
