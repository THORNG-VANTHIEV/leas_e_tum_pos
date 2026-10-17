<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Symfony\Component\HttpFoundation\Response;

class SetLocaleFromCookie
{
    /**
     * The cookie written by the language switch in the browser (khmer / english).
     */
    public const COOKIE = 'pos_language';

    /**
     * @var list<string>
     */
    private const SUPPORTED = ['km', 'en'];

    /**
     * Answer validation and flash messages in the language the user picked in the UI.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $language = $request->cookie(self::COOKIE);

        if (is_string($language) && in_array($language, self::SUPPORTED, true)) {
            App::setLocale($language);
        }

        return $next($request);
    }
}
