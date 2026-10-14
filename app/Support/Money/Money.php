<?php

namespace App\Support\Money;

use InvalidArgumentException;

final class Money
{
    public const MAX_CENTS = 999_999_999_999;
    private const PATTERN = '/^-?\\d{1,10}(?:\\.\\d{1,2})?$/D';

    public static function toCents(string $amount): int
    {
        $amount = trim($amount);
        if (! preg_match(self::PATTERN, $amount)) {
            throw new InvalidArgumentException('Invalid monetary amount.');
        }

        $negative = str_starts_with($amount, '-');
        $unsigned = $negative ? substr($amount, 1) : $amount;
        [$whole, $fraction] = array_pad(explode('.', $unsigned, 2), 2, '');
        $cents = ((int) $whole * 100) + (int) str_pad($fraction, 2, '0');

        if ($cents > self::MAX_CENTS) {
            throw new InvalidArgumentException('Monetary amount exceeds DECIMAL(12,2) range.');
        }

        return $negative ? -$cents : $cents;
    }

    public static function fromCents(int $cents): string
    {
        if (abs($cents) > self::MAX_CENTS) {
            throw new InvalidArgumentException('Monetary result exceeds DECIMAL(12,2) range.');
        }

        $sign = $cents < 0 ? '-' : '';
        $absolute = abs($cents);

        return sprintf('%s%d.%02d', $sign, intdiv($absolute, 100), $absolute % 100);
    }
}
