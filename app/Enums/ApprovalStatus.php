<?php

namespace App\Enums;

enum ApprovalStatus: string
{
    case Pending = 'pending';
    case Approved = 'approved';
    case Rejected = 'rejected';
    case Expired = 'expired';
    case Used = 'used';

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'Pending Review',
            self::Approved => 'Approved (Ready to Use)',
            self::Rejected => 'Rejected',
            self::Expired => 'Expired',
            self::Used => 'Used (Consumed)',
        };
    }
}
