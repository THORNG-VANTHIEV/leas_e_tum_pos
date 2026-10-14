<?php

namespace Tests\Unit\Support;

use App\Support\Money\Money;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;

class MoneyTest extends TestCase
{
    public function test_to_cents_parses_valid_decimal_strings(): void
    {
        $this->assertSame(1250, Money::toCents('12.50'));
        $this->assertSame(100, Money::toCents('1.00'));
        $this->assertSame(100, Money::toCents('1'));
        $this->assertSame(5, Money::toCents('0.05'));
        $this->assertSame(0, Money::toCents('0.00'));
        $this->assertSame(0, Money::toCents('0'));
    }

    public function test_to_cents_handles_negative_values(): void
    {
        $this->assertSame(-525, Money::toCents('-5.25'));
        $this->assertSame(-100, Money::toCents('-1'));
    }

    public function test_to_cents_rejects_malformed_input(): void
    {
        $this->expectException(InvalidArgumentException::class);
        Money::toCents('12,50'); // Comma not allowed
    }

    public function test_to_cents_rejects_exponent_notation(): void
    {
        $this->expectException(InvalidArgumentException::class);
        Money::toCents('1e3');
    }

    public function test_to_cents_rejects_more_than_two_decimals(): void
    {
        $this->expectException(InvalidArgumentException::class);
        Money::toCents('10.999');
    }

    public function test_to_cents_rejects_exceeding_max_cents(): void
    {
        $this->expectException(InvalidArgumentException::class);
        Money::toCents('10000000000.00'); // > 9,999,999,999.99
    }

    public function test_from_cents_formats_properly(): void
    {
        $this->assertSame('12.50', Money::fromCents(1250));
        $this->assertSame('1.00', Money::fromCents(100));
        $this->assertSame('0.05', Money::fromCents(5));
        $this->assertSame('0.00', Money::fromCents(0));
        $this->assertSame('-5.25', Money::fromCents(-525));
    }
}
