<?php

namespace App\Providers;

use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // The shop (production) and development share this folder: never let a running dev Vite server
        // (public/hot) take over the shop's pages, always serve the built assets instead
        if ($this->app->isProduction()) {
            Vite::useHotFile(storage_path('framework/vite.hot.shop-disabled'));
        }
    }
}
