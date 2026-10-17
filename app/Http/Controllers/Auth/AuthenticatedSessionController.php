<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\Audit\AuditService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class AuthenticatedSessionController extends Controller
{
    public function __construct(
        protected AuditService $audit,
    ) {}

    /**
     * Display the login view.
     */
    public function create(): Response
    {
        return Inertia::render('auth/login');
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'username' => ['required', 'string', 'max:80'],
            'password' => ['required', 'string'],
        ]);

        $username = trim((string) $request->input('username'));
        $password = (string) $request->input('password');

        $throttleKey = Str::lower($username).'|'.$request->ip();

        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            $seconds = RateLimiter::availableIn($throttleKey);
            throw ValidationException::withMessages([
                'username' => "ព្យាយាម login ច្រើនដងពេក។ សូមរង់ចាំ {$seconds} វិនាទី។",
            ]);
        }

        $credentials = ['username' => $username, 'password' => $password];
        $user = User::where('username', $username)->first();

        if (! $user || ! Auth::validate($credentials)) {
            RateLimiter::hit($throttleKey, 60);

            $this->audit->record(
                'auth.login_failed',
                'App\Models\User',
                null,
                ['attempted_username' => $username],
                null,
                null,
                'Invalid credentials'
            );

            throw ValidationException::withMessages([
                'username' => 'ឈ្មោះអ្នកប្រើ ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវ។',
            ]);
        }

        if (! $user->is_active) {
            RateLimiter::hit($throttleKey, 60);

            $this->audit->record(
                'auth.login_blocked_inactive',
                $user,
                null,
                ['username' => $user->username],
                null,
                $user->id,
                'Inactive user attempted login'
            );

            throw ValidationException::withMessages([
                'username' => 'គណនីរបស់អ្នកត្រូវបានបិទ។ សូមទាក់ទង Admin។',
            ]);
        }

        RateLimiter::clear($throttleKey);
        Auth::login($user, $request->boolean('remember'));
        $request->session()->regenerate();

        $user->forceFill([
            'last_login_at' => now(),
        ])->save();

        $roleValue = is_string($user->role) ? $user->role : ($user->role?->value ?? 'cashier');

        $this->audit->record(
            'auth.login_success',
            $user,
            null,
            ['username' => $user->username, 'role' => $roleValue],
            null,
            $user->id,
            'Successful login'
        );

        return redirect()->intended('/dashboard');
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $user = $request->user();

        if ($user) {
            $this->audit->record(
                'auth.logout',
                $user,
                null,
                null,
                null,
                $user->id,
                'User logged out'
            );
        }

        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/login');
    }
}
