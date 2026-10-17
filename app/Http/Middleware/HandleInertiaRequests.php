<?php

namespace App\Http\Middleware;

use App\Models\BusinessSetting;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $user ? [
                    'id' => $user->id,
                    'name' => $user->name,
                    'username' => $user->username,
                    'role' => is_string($user->role) ? $user->role : $user->role->value,
                    'is_active' => $user->is_active,
                    'last_login_at' => $user->last_login_at?->toIso8601String(),
                    'locations' => $user->relationLoaded('locations')
                        ? $user->locations->map(fn ($loc) => [
                            'id' => $loc->id,
                            'code' => $loc->code,
                            'name_primary' => $loc->name_primary,
                            'is_default' => (bool) $loc->pivot?->is_default,
                        ])
                        : [],
                ] : null,
            ],
            'business' => function () {
                $setting = BusinessSetting::current();

                return [
                    'business_name_primary' => $setting->business_name_primary,
                    'business_name_secondary' => $setting->business_name_secondary,
                    'address_primary' => $setting->address_primary,
                    'phone' => $setting->phone,
                    'tax_identifier' => $setting->tax_identifier,
                    'currency_code' => $setting->currency_code,
                    'currency_symbol' => $setting->currency_symbol,
                    'decimal_places' => $setting->decimal_places,
                    'timezone' => $setting->timezone,
                    'document_language' => $setting->document_language,
                    'document_footer' => $setting->document_footer,
                    'print_settings' => $setting->print_settings,
                    'entry_settings' => $setting->entry_settings,
                    'font_settings' => $setting->font_settings,
                ];
            },
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
                'warning' => fn () => $request->session()->get('warning'),
                'info' => fn () => $request->session()->get('info'),
                'print_jobs' => fn () => $request->session()->get('print_jobs'),
            ],
            'csrf_token' => fn () => csrf_token(),
        ];
    }
}
