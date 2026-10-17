<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class RoleGuard
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = Auth::user();

        if (! $user) {
            return redirect()->route('login');
        }

        $userRole = is_string($user->role) ? $user->role : $user->role->value;

        if (! in_array($userRole, $roles, true)) {
            abort(403, 'តួនាទីរបស់អ្នកមិនមានសិទ្ធិចូលទំព័រនេះទេ។');
        }

        return $next($request);
    }
}
