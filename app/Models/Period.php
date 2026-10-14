<?php

namespace App\Models;

use App\Enums\PeriodStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Period extends Model
{
    use HasFactory;

    protected $fillable = [
        'location_id',
        'code',
        'name',
        'start_date',
        'end_date',
        'document_prefix',
        'starting_sequence',
        'last_sequence_no',
        'status',
        'revision',
        'entry_settings_snapshot',
        'print_settings_snapshot',
        'created_by',
        'activated_by',
        'activated_at',
        'closed_by',
        'closed_at',
        'reopen_reason',
        'lock_version',
    ];

    protected $casts = [
        'status' => PeriodStatus::class,
        'entry_settings_snapshot' => 'array',
        'print_settings_snapshot' => 'array',
        'start_date' => 'date:Y-m-d',
        'end_date' => 'date:Y-m-d',
        'activated_at' => 'datetime',
        'closed_at' => 'datetime',
        'starting_sequence' => 'integer',
        'last_sequence_no' => 'integer',
        'revision' => 'integer',
        'lock_version' => 'integer',
    ];

    public function location(): BelongsTo
    {
        return $this->belongsTo(Location::class);
    }

    public function documents(): HasMany
    {
        return $this->hasMany(Document::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function activator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'activated_by');
    }

    public function closer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'closed_by');
    }

    /**
     * Resolve the currently active shift/period or automatically provision a live daily shift.
     */
    public static function resolveActive(int $locationId = 1, ?int $userId = null): self
    {
        $active = self::where('status', PeriodStatus::Active)
            ->where('location_id', $locationId)
            ->latest('id')
            ->first();

        if ($active) {
            return $active;
        }

        $userId = $userId ?? User::first()?->id ?? 1;
        $monthCode = now()->format('ym');
        $count = self::where('code', 'like', "P-{$monthCode}-%")->count() + 1;
        $code = sprintf('P-%s-%02d', $monthCode, $count);

        return self::create([
            'location_id' => $locationId,
            'code' => $code,
            'name' => 'វេនលក់ប្រចាំថ្ងៃ ' . now()->format('d/m/Y'),
            'start_date' => now()->startOfMonth()->toDateString(),
            'end_date' => now()->endOfMonth()->toDateString(),
            'document_prefix' => 'INV',
            'starting_sequence' => 1,
            'last_sequence_no' => 0,
            'status' => PeriodStatus::Active,
            'revision' => 1,
            'entry_settings_snapshot' => [
                'show_event_time' => true,
                'require_source_total' => false,
            ],
            'print_settings_snapshot' => [
                'format' => '80mm',
                'show_item_quantity' => true,
            ],
            'created_by' => $userId,
            'activated_by' => $userId,
            'activated_at' => now(),
            'lock_version' => 0,
        ]);
    }
}
