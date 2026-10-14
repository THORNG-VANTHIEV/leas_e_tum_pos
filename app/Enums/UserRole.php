<?php

namespace App\Enums;

enum UserRole: string
{
    case Admin = 'admin';
    case Cashier = 'cashier';
    case Supervisor = 'supervisor';

    public function label(): string
    {
        return match ($this) {
            self::Admin => 'Administrator',
            self::Cashier => 'Cashier / Operator',
            self::Supervisor => 'Supervisor',
        };
    }
}
