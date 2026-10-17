<?php

namespace App\Models;

use App\Enums\UserRole;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'username',
        'password',
        'role',
        'is_active',
        'archived_at',
        'archived_reason',
        'last_login_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'role' => UserRole::class,
            'is_active' => 'boolean',
            'archived_at' => 'datetime',
            'last_login_at' => 'datetime',
        ];
    }

    public function isAdmin(): bool
    {
        return $this->role === UserRole::Admin;
    }

    public function isCashier(): bool
    {
        return $this->role === UserRole::Cashier;
    }

    public function isSupervisor(): bool
    {
        return $this->role === UserRole::Supervisor;
    }

    /**
     * Managers can open any invoice (e.g. to reprint or void it); cashiers only orders they opened or settled.
     */
    public function canViewInvoice(Document $document): bool
    {
        return $this->isAdmin()
            || $this->isSupervisor()
            || $document->created_by === $this->id
            || $document->finalized_by === $this->id;
    }

    public function locations(): BelongsToMany
    {
        return $this->belongsToMany(Location::class, 'user_locations')
            ->withPivot('is_default', 'created_at');
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }
}
