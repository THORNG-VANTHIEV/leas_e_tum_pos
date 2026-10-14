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
     *
     * @param string ...$roles
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = Auth::user();

        if (! $user) {
            return redirect()->route('login');
        }

        $userRole = is_string($user->role) ? $user->role : $user->role->value;

        if (! in_array($userRole, $roles, true)) {
            abort(403, 'Unauthorized. Your role does not have permission to access this resource.');
        }

        return $next($request);
    }
}
