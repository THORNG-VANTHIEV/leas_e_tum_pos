<?php

namespace App\Enums;

enum ApprovalType: string
{
    case EditFinalized = 'edit_finalized';
    case PriceOverride = 'price_override';
    case Void = 'void';
    case ReopenPeriod = 'reopen_period';

    public function label(): string
    {
        return match ($this) {
            self::EditFinalized => 'Edit Finalized Document',
            self::PriceOverride => 'Item Price Override',
            self::Void => 'Void Finalized Document',
            self::ReopenPeriod => 'Re-open Closed Accounting Period',
        };
    }
}
