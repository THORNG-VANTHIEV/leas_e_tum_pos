<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Models\AuditLog;
use App\Models\BusinessSetting;
use App\Models\Location;
use App\Models\User;
use App\Support\Audit\AuditService;
use DomainException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class SettingsController extends Controller
{
    public function __construct(
        protected AuditService $audit,
    ) {}

    /**
     * Display the settings hub.
     */
    public function index(Request $request): Response
    {
        $setting = BusinessSetting::current();
        $users = User::with('locations')->orderBy('name')->get();
        $locations = Location::withCount('users')->orderBy('code')->get();
        $recentAudits = AuditLog::with('actor:id,name,username')
            ->latest()
            ->take(25)
            ->get();

        return Inertia::render('settings/index', [
            'settings' => $setting,
            'users' => $users,
            'locations' => $locations,
            'audits' => $recentAudits,
        ]);
    }

    /**
     * Update business profile.
     */
    public function updateBusiness(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'business_name_primary' => ['required', 'string', 'max:180'],
            'business_name_secondary' => ['nullable', 'string', 'max:180'],
            'address_primary' => ['nullable', 'string'],
            'address_secondary' => ['nullable', 'string'],
            'phone' => ['nullable', 'string', 'max:40'],
            'tax_identifier' => ['nullable', 'string', 'max:40'],
            'currency_code' => ['required', 'string', 'size:3'],
            'currency_symbol' => ['required', 'string', 'max:5'],
            'timezone' => ['required', 'string', 'timezone'],
            'document_footer' => ['nullable', 'string'],
        ]);

        $setting = BusinessSetting::current();
        $oldValues = $setting->only(array_keys($validated));

        $setting->update($validated);

        $this->audit->record(
            'settings.business_updated',
            $setting,
            $oldValues,
            $validated,
            null,
            $request->user()->id,
            'Updated business profile'
        );

        return back()->with('success', 'Business profile updated successfully.');
    }

    /**
     * Update data entry controls.
     */
    public function updateEntryControls(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'require_source_total' => ['required', 'boolean'],
            'show_event_time' => ['required', 'boolean'],
        ]);

        $setting = BusinessSetting::current();
        $oldEntry = $setting->entry_settings;

        $setting->update([
            'entry_settings' => $validated,
        ]);

        $this->audit->record(
            'settings.entry_controls_updated',
            $setting,
            $oldEntry,
            $validated,
            null,
            $request->user()->id,
            'Toggled source reconciliation or entry controls'
        );

        return back()->with('success', 'Entry controls updated successfully.');
    }

    /**
     * Create a new location.
     */
    public function storeLocation(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:20', 'unique:locations,code'],
            'name_primary' => ['required', 'string', 'max:150'],
            'name_secondary' => ['nullable', 'string', 'max:150'],
            'address' => ['nullable', 'string'],
        ]);

        $location = Location::create([
            ...$validated,
            'is_active' => true,
            'created_by' => $request->user()->id,
        ]);

        $this->audit->record(
            'location.created',
            $location,
            null,
            $validated,
            null,
            $request->user()->id,
            'Created location branch'
        );

        return back()->with('success', "Location '{$location->name_primary}' created.");
    }

    /**
     * Update a location.
     */
    public function updateLocation(Request $request, Location $location): RedirectResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:20', Rule::unique('locations', 'code')->ignore($location->id)],
            'name_primary' => ['required', 'string', 'max:150'],
            'name_secondary' => ['nullable', 'string', 'max:150'],
            'address' => ['nullable', 'string'],
            'is_active' => ['required', 'boolean'],
        ]);

        $old = $location->only(array_keys($validated));
        $location->update($validated);

        $this->audit->record(
            'location.updated',
            $location,
            $old,
            $validated,
            null,
            $request->user()->id,
            'Updated location branch'
        );

        return back()->with('success', 'Location updated.');
    }

    /**
     * Create a new staff account.
     */
    public function storeUser(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:180'],
            'username' => ['required', 'string', 'max:80', 'unique:users,username'],
            'password' => ['required', 'string', 'min:6'],
            'role' => ['required', Rule::enum(UserRole::class)],
            'location_ids' => ['nullable', 'array'],
            'location_ids.*' => ['integer', 'exists:locations,id'],
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'username' => $validated['username'],
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'],
            'is_active' => true,
        ]);

        if (! empty($validated['location_ids'])) {
            $user->locations()->sync($validated['location_ids']);
        }

        $this->audit->record(
            'user.created',
            $user,
            null,
            ['username' => $user->username, 'role' => $user->role->value],
            null,
            $request->user()->id,
            'Created user account'
        );

        return back()->with('success', "User '{$user->username}' created.");
    }

    /**
     * Update staff account.
     */
    public function updateUser(Request $request, User $user): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:180'],
            'username' => ['required', 'string', 'max:80', Rule::unique('users', 'username')->ignore($user->id)],
            'password' => ['nullable', 'string', 'min:6'],
            'role' => ['required', Rule::enum(UserRole::class)],
            'is_active' => ['required', 'boolean'],
            'location_ids' => ['nullable', 'array'],
            'location_ids.*' => ['integer', 'exists:locations,id'],
        ]);

        // Self-protection: Admin cannot deactivate themselves
        if ($request->user()->id === $user->id && ! $validated['is_active']) {
            throw ValidationException::withMessages([
                'is_active' => 'Self-protection guard: You cannot deactivate your own logged-in account.',
            ]);
        }

        // Last-admin protection: Cannot remove/deactivate the last active admin
        if ($user->isAdmin() && (! $validated['is_active'] || $validated['role'] !== UserRole::Admin->value)) {
            $activeAdminCount = User::where('role', UserRole::Admin->value)
                ->where('is_active', true)
                ->where('id', '!=', $user->id)
                ->count();

            if ($activeAdminCount === 0) {
                throw ValidationException::withMessages([
                    'is_active' => 'Last-admin guard: Cannot deactivate or demote the only remaining active administrator.',
                ]);
            }
        }

        $old = [
            'name' => $user->name,
            'username' => $user->username,
            'role' => $user->role->value,
            'is_active' => $user->is_active,
        ];

        $payload = [
            'name' => $validated['name'],
            'username' => $validated['username'],
            'role' => $validated['role'],
            'is_active' => $validated['is_active'],
        ];

        if (! empty($validated['password'])) {
            $payload['password'] = Hash::make($validated['password']);
        }

        $user->update($payload);

        if (isset($validated['location_ids'])) {
            $user->locations()->sync($validated['location_ids']);
        }

        $this->audit->record(
            'user.updated',
            $user,
            $old,
            $payload,
            null,
            $request->user()->id,
            'Updated user account'
        );

        return back()->with('success', "User '{$user->username}' updated.");
    }

    /**
     * Archive resigned staff (never hard-deletes).
     */
    public function archiveUser(Request $request, User $user): RedirectResponse
    {
        $validated = $request->validate([
            'reason' => ['required', 'string', 'min:3', 'max:500'],
        ]);

        // Self-protection
        if ($request->user()->id === $user->id) {
            throw ValidationException::withMessages([
                'reason' => 'Self-protection guard: You cannot archive your own logged-in account.',
            ]);
        }

        // Last-admin protection
        if ($user->isAdmin()) {
            $otherAdmins = User::where('role', UserRole::Admin->value)
                ->where('is_active', true)
                ->whereNull('archived_at')
                ->where('id', '!=', $user->id)
                ->count();

            if ($otherAdmins === 0) {
                throw ValidationException::withMessages([
                    'reason' => 'Last-admin guard: Cannot archive the last active administrator.',
                ]);
            }
        }

        $user->update([
            'is_active' => false,
            'archived_at' => now(),
            'archived_reason' => $validated['reason'],
        ]);

        $this->audit->record(
            'user.archived',
            $user,
            ['is_active' => true, 'archived_at' => null],
            ['is_active' => false, 'archived_at' => now(), 'reason' => $validated['reason']],
            null,
            $request->user()->id,
            $validated['reason']
        );

        return back()->with('success', "User '{$user->username}' has been archived.");
    }

    /**
     * Restore archived staff as inactive.
     */
    public function restoreUser(Request $request, User $user): RedirectResponse
    {
        $user->update([
            'archived_at' => null,
            'archived_reason' => null,
            'is_active' => false, // Restored as inactive until admin deliberately activates
        ]);

        $this->audit->record(
            'user.restored',
            $user,
            ['archived_at' => $user->archived_at],
            ['archived_at' => null, 'is_active' => false],
            null,
            $request->user()->id,
            'Restored archived user (set as inactive)'
        );

        return back()->with('success', "User '{$user->username}' restored as inactive.");
    }
}
