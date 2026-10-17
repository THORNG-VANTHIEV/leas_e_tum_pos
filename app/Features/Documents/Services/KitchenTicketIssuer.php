<?php

namespace App\Features\Documents\Services;

use App\Models\Document;
use App\Models\KitchenTicket;

/**
 * Builds kitchen tickets containing only what changed since the kitchen last saw the order,
 * so add-on rounds for a table never reprint dishes that are already cooking.
 */
final class KitchenTicketIssuer
{
    /**
     * Capture the current line items, keyed by product, before they are replaced.
     *
     * @return array<int, array{quantity: int, name: string, name_secondary: string|null, unit: string}>
     */
    public function snapshot(Document $document): array
    {
        $snapshot = [];

        foreach ($document->items()->get() as $item) {
            $productId = (int) $item->product_id;
            $snapshot[$productId] ??= [
                'quantity' => 0,
                'name' => $item->product_name_primary_snapshot,
                'name_secondary' => $item->product_name_secondary_snapshot,
                'unit' => $item->unit_snapshot,
            ];
            $snapshot[$productId]['quantity'] += (int) $item->quantity;
        }

        return $snapshot;
    }

    /**
     * Issue a ticket for the difference between the previous snapshot and the document's current items.
     *
     * @param  array<int, array{quantity: int, name: string, name_secondary: string|null, unit: string}>  $previous
     */
    public function issue(Document $document, array $previous, int $actorId): ?KitchenTicket
    {
        $current = $this->snapshot($document);
        $lines = [];

        foreach ($current as $productId => $item) {
            $added = $item['quantity'] - ($previous[$productId]['quantity'] ?? 0);
            if ($added > 0) {
                $lines[] = $this->line($productId, $item, $added, 'add');
            }
        }

        foreach ($previous as $productId => $item) {
            $removed = $item['quantity'] - ($current[$productId]['quantity'] ?? 0);
            if ($removed > 0) {
                $lines[] = $this->line($productId, $item, $removed, 'cancel');
            }
        }

        if ($lines === []) {
            return null;
        }

        return $document->kitchenTickets()->create([
            'ticket_no' => (int) $document->kitchenTickets()->max('ticket_no') + 1,
            'lines' => $lines,
            'created_by' => $actorId,
        ]);
    }

    /**
     * @param  array{quantity: int, name: string, name_secondary: string|null, unit: string}  $item
     * @return array{product_id: int, name: string, name_secondary: string|null, unit: string, quantity: int, type: string}
     */
    private function line(int $productId, array $item, int $quantity, string $type): array
    {
        return [
            'product_id' => $productId,
            'name' => $item['name'],
            'name_secondary' => $item['name_secondary'],
            'unit' => $item['unit'],
            'quantity' => $quantity,
            'type' => $type,
        ];
    }
}
