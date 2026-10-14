<?php

namespace App\Features\Documents\Services;

use App\Support\Money\Money;
use DomainException;

final class DocumentCalculator
{
    /**
     * Authoritative calculation contract.
     *
     * @param array<int, array{quantity: int, unit_price: string, is_primary_package?: bool}> $items
     * @param string|null $sourceTotal
     * @param string $amountReceived
     * @param string $taxAmount
     * @param string $discountAmount
     * @param string $paymentMethod
     * @return array<string, mixed>
     */
    public function calculate(
        array $items,
        ?string $sourceTotal,
        string $amountReceived,
        string $taxAmount = '0.00',
        string $discountAmount = '0.00',
        string $paymentMethod = 'cash',
    ): array {
        if ($items === []) {
            throw new DomainException('A document requires at least one line item.');
        }

        $subtotal = 0;
        $unitCount = 0;
        $lineTotals = [];

        foreach ($items as $index => $item) {
            $quantity = $item['quantity'] ?? null;
            if (! is_int($quantity) || $quantity < 1 || $quantity > 9999) {
                throw new DomainException('Quantity must be an integer from 1 to 9999.');
            }

            $unitPrice = Money::toCents($item['unit_price']);
            if ($unitPrice < 0) {
                throw new DomainException('Unit price cannot be negative.');
            }
            if ($unitPrice > intdiv(Money::MAX_CENTS, $quantity)) {
                throw new DomainException('Line total exceeds the supported monetary range.');
            }

            $lineTotal = $quantity * $unitPrice;
            $subtotal += $lineTotal;
            if ($subtotal > Money::MAX_CENTS) {
                throw new DomainException('Subtotal exceeds the supported monetary range.');
            }

            $lineTotals[$index] = Money::fromCents($lineTotal);
            if (($item['is_primary_package'] ?? false) === true) {
                $unitCount += $quantity;
            }
        }

        $tax = Money::toCents($taxAmount);
        $discount = Money::toCents($discountAmount);
        $received = Money::toCents($amountReceived);

        if ($tax < 0 || $discount < 0 || $received < 0) {
            throw new DomainException('Tax, discount, and received amount cannot be negative.');
        }
        if ($discount > $subtotal) {
            throw new DomainException('Discount cannot exceed subtotal in the current policy.');
        }

        $grandTotal = $subtotal + $tax - $discount;
        if ($grandTotal < 0 || $grandTotal > Money::MAX_CENTS) {
            throw new DomainException('Grand total is outside the supported monetary range.');
        }
        if ($paymentMethod === 'cash' && $received < $grandTotal) {
            throw new DomainException('Cash received must cover the grand total.');
        }
        if ($paymentMethod !== 'cash' && $received !== $grandTotal) {
            throw new DomainException('Non-cash payment must equal the grand total under the current policy.');
        }

        $sourceCents = $sourceTotal === null ? null : Money::toCents($sourceTotal);
        if ($sourceCents !== null && $sourceCents < 0) {
            throw new DomainException('Source total cannot be negative.');
        }
        $effectiveSource = $sourceCents ?? $grandTotal;
        $variance = $grandTotal - $effectiveSource;

        return [
            'subtotal' => Money::fromCents($subtotal),
            'tax_amount' => Money::fromCents($tax),
            'discount_amount' => Money::fromCents($discount),
            'grand_total' => Money::fromCents($grandTotal),
            'source_total' => Money::fromCents($effectiveSource),
            'source_total_verified' => $sourceCents !== null && $variance === 0,
            'variance' => Money::fromCents($variance),
            'amount_received' => Money::fromCents($received),
            'payment_method' => $paymentMethod,
            'change_amount' => Money::fromCents($paymentMethod === 'cash' ? $received - $grandTotal : 0),
            'unit_count' => $unitCount,
            'line_totals' => $lineTotals,
        ];
    }
}
