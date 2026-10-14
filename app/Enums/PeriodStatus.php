<?php

namespace App\Enums;

enum PeriodStatus: string
{
    case Draft = 'draft';
    case Active = 'active';
    case Review = 'review';
    case Closed = 'closed';

    public function label(): string
    {
        return match ($this) {
            self::Draft => 'Draft',
            self::Active => 'Active (Entry Open)',
            self::Review => 'Review (Entry Locked)',
            self::Closed => 'Closed (Finalized)',
        };
    }
}
