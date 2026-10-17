<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Twice a day so a backup still happens if the shop computer is switched off at night (~30 days kept)
Schedule::command('backup:daily --keep=60')->twiceDaily(14, 22)->withoutOverlapping();
