<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" class="dark">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0">
        <meta name="csrf-token" content="{{ csrf_token() }}">
        <link rel="icon" type="image/png" href="/images/brand/logo-192.png">
        <link rel="apple-touch-icon" href="/images/brand/logo-192.png">
        <title inertia>{{ config('app.name', 'លៀសហាល អ៉ីទុម POS') }}</title>

        <!-- Inter, Kantumruy Pro and Khmer Fonts for POS Typography Engine -->
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Battambang:wght@400;700&family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&family=Kantumruy+Pro:ital,wght@0,300..700;1,300..700&family=Siemreap&display=swap" rel="stylesheet">

        <!-- Immediate Theme Initialization Script (Prevents flash of dark/light theme) -->
        <script>
            (function() {
                try {
                    var storedTheme = localStorage.getItem('pos_theme');
                    if (storedTheme === 'light') {
                        document.documentElement.classList.remove('dark');
                        document.documentElement.classList.add('light');
                    } else {
                        document.documentElement.classList.add('dark');
                        document.documentElement.classList.remove('light');
                    }
                } catch (e) {}
            })();
        </script>

        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.tsx'])
        @inertiaHead
    </head>
    <body class="bg-zinc-950 text-zinc-100 antialiased font-sans min-h-screen">
        @inertia
    </body>
</html>
