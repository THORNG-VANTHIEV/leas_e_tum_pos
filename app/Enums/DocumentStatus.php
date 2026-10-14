<?php

namespace App\Enums;

enum DocumentStatus: string
{
    case Draft = 'draft';
    case Review = 'review';
    case Finalized = 'finalized';
    case Void = 'void';

    public function label(): string
    {
        return match ($this) {
            self::Draft => 'Draft',
            self::Review => 'Review',
            self::Finalized => 'Finalized',
            self::Void => 'Voided',
        };
    }
}
