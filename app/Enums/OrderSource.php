<?php

namespace App\Enums;

enum OrderSource: string
{
    case WalkIn = 'walk_in';
    case Foodpanda = 'foodpanda';
    case Grab = 'grab';
    case Nham24 = 'nham24';
    case Wownow = 'wownow';
    case Other = 'other';

    public function label(): string
    {
        return match ($this) {
            self::WalkIn => 'Walk-in',
            self::Foodpanda => 'foodpanda',
            self::Grab => 'Grab',
            self::Nham24 => 'Nham24',
            self::Wownow => 'WOWNOW',
            self::Other => 'Other',
        };
    }

    /**
     * Whether the order arrived through a third-party delivery platform.
     */
    public function isDeliveryPlatform(): bool
    {
        return $this !== self::WalkIn;
    }
}
