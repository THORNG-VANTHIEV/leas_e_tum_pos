<?php

namespace App\Features\Documents\Services;

use App\Support\Money\Money;
use DomainException;

final class DocumentCalculator
{
    /**
     * Authoritative calculation contract.
     *
     * @param  array<int, array{quantity: int, unit_price: string, is_primary_package?: bool}>  $items
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
            throw new DomainException('វិក្កយបត្រត្រូវមានមុខទំនិញយ៉ាងហោចណាស់មួយ។');
        }

        $subtotal = 0;
        $unitCount = 0;
        $lineTotals = [];

        foreach ($items as $index => $item) {
            $quantity = $item['quantity'] ?? null;
            if (! is_int($quantity) || $quantity < 1 || $quantity > 9999) {
                throw new DomainException('ចំនួនត្រូវជាចំនួនគត់ពី 1 ដល់ 9999។');
            }

            $unitPrice = Money::toCents($item['unit_price']);
            if ($unitPrice < 0) {
                throw new DomainException('តម្លៃមិនអាចតិចជាងសូន្យទេ។');
            }
            if ($unitPrice > intdiv(Money::MAX_CENTS, $quantity)) {
                throw new DomainException('តម្លៃសរុបនៃមុខទំនិញធំពេក។');
            }

            $lineTotal = $quantity * $unitPrice;
            $subtotal += $lineTotal;
            if ($subtotal > Money::MAX_CENTS) {
                throw new DomainException('សរុបរងធំពេក។');
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
            throw new DomainException('ពន្ធ បញ្ចុះតម្លៃ និងប្រាក់ទទួល មិនអាចតិចជាងសូន្យទេ។');
        }
        if ($discount > $subtotal) {
            throw new DomainException('បញ្ចុះតម្លៃមិនអាចលើសសរុបរងទេ។');
        }

        $grandTotal = $subtotal + $tax - $discount;
        if ($grandTotal < 0 || $grandTotal > Money::MAX_CENTS) {
            throw new DomainException('សរុបរួមធំពេក ឬមិនត្រឹមត្រូវ។');
        }
        if ($paymentMethod === 'cash' && $received < $grandTotal) {
            throw new DomainException('ប្រាក់ទទួលមិនគ្រប់ចំនួនសរុបទេ។');
        }
        if ($paymentMethod !== 'cash' && $received !== $grandTotal) {
            throw new DomainException('ការបង់មិនមែនសាច់ប្រាក់ ត្រូវតែស្មើនឹងសរុបរួម។');
        }

        $sourceCents = $sourceTotal === null ? null : Money::toCents($sourceTotal);
        if ($sourceCents !== null && $sourceCents < 0) {
            throw new DomainException('សរុបតាមក្រដាសមិនអាចតិចជាងសូន្យទេ។');
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
