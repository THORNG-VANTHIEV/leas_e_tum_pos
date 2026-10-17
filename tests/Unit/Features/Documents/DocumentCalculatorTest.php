<?php

namespace Tests\Unit\Features\Documents;

use App\Features\Documents\Services\DocumentCalculator;
use DomainException;
use PHPUnit\Framework\TestCase;

class DocumentCalculatorTest extends TestCase
{
    protected DocumentCalculator $calculator;

    protected function setUp(): void
    {
        parent::setUp();
        $this->calculator = new DocumentCalculator;
    }

    public function test_rejects_empty_items(): void
    {
        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('វិក្កយបត្រត្រូវមានមុខទំនិញយ៉ាងហោចណាស់មួយ។');

        $this->calculator->calculate([], '10.00', '10.00');
    }

    public function test_rejects_invalid_quantity(): void
    {
        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('ចំនួនត្រូវជាចំនួនគត់ពី 1 ដល់ 9999។');

        $this->calculator->calculate([
            ['quantity' => 0, 'unit_price' => '10.00'],
        ], '10.00', '10.00');
    }

    public function test_authoritative_calculation_with_cash_and_verified_source(): void
    {
        $items = [
            ['quantity' => 2, 'unit_price' => '15.00', 'is_primary_package' => true],  // 30.00
            ['quantity' => 3, 'unit_price' => '2.00', 'is_primary_package' => false],   // 6.00
        ];

        $result = $this->calculator->calculate(
            items: $items,
            sourceTotal: '36.00',
            amountReceived: '50.00',
            taxAmount: '0.00',
            discountAmount: '0.00',
            paymentMethod: 'cash'
        );

        $this->assertSame('36.00', $result['subtotal']);
        $this->assertSame('0.00', $result['tax_amount']);
        $this->assertSame('0.00', $result['discount_amount']);
        $this->assertSame('36.00', $result['grand_total']);
        $this->assertSame('36.00', $result['source_total']);
        $this->assertTrue($result['source_total_verified']);
        $this->assertSame('0.00', $result['variance']);
        $this->assertSame('50.00', $result['amount_received']);
        $this->assertSame('14.00', $result['change_amount']);
        $this->assertSame(2, $result['unit_count']); // Only the primary package quantity
        $this->assertSame(['30.00', '6.00'], $result['line_totals']);
    }

    public function test_reconciliation_detects_variance_correctly(): void
    {
        $items = [
            ['quantity' => 1, 'unit_price' => '20.00'],
        ];

        // Physical slip says 25.00 (variance of -5.00)
        $result = $this->calculator->calculate(
            items: $items,
            sourceTotal: '25.00',
            amountReceived: '20.00',
        );

        $this->assertSame('20.00', $result['grand_total']);
        $this->assertSame('25.00', $result['source_total']);
        $this->assertFalse($result['source_total_verified']);
        $this->assertSame('-5.00', $result['variance']);
    }

    public function test_disabled_reconciliation_marks_source_unverified(): void
    {
        $items = [
            ['quantity' => 1, 'unit_price' => '15.00'],
        ];

        // Pass null for sourceTotal when disabled
        $result = $this->calculator->calculate(
            items: $items,
            sourceTotal: null,
            amountReceived: '20.00',
        );

        $this->assertSame('15.00', $result['grand_total']);
        $this->assertSame('15.00', $result['source_total']);
        $this->assertFalse($result['source_total_verified']);
        $this->assertSame('0.00', $result['variance']);
        $this->assertSame('5.00', $result['change_amount']);
    }

    public function test_cash_received_insufficient_throws_domain_exception(): void
    {
        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('ប្រាក់ទទួលមិនគ្រប់ចំនួនសរុបទេ។');

        $this->calculator->calculate(
            items: [['quantity' => 1, 'unit_price' => '20.00']],
            sourceTotal: '20.00',
            amountReceived: '15.00' // Insufficient!
        );
    }

    public function test_discount_exceeding_subtotal_throws_domain_exception(): void
    {
        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('បញ្ចុះតម្លៃមិនអាចលើសសរុបរងទេ។');

        $this->calculator->calculate(
            items: [['quantity' => 1, 'unit_price' => '10.00']],
            sourceTotal: '10.00',
            amountReceived: '10.00',
            discountAmount: '15.00'
        );
    }
}
