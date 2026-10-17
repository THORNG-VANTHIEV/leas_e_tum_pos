<?php

namespace Tests\Feature\Auth;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ServerLanguageTest extends TestCase
{
    use RefreshDatabase;

    public function test_messages_are_in_khmer_without_a_language_cookie(): void
    {
        $this->post('/login', ['username' => 'nobody', 'password' => 'wrong-password'])
            ->assertSessionHasErrors(['username' => 'ឈ្មោះអ្នកប្រើ ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវ។']);
    }

    public function test_english_cookie_translates_flash_and_validation_messages(): void
    {
        $this->withUnencryptedCookie('pos_language', 'en');

        $this->post('/login', ['username' => 'nobody', 'password' => 'wrong-password'])
            ->assertSessionHasErrors(['username' => 'Wrong username or password.']);

        $this->post('/login', ['username' => '', 'password' => 'secret'])
            ->assertSessionHasErrors(['username' => 'The username field is required.']);
    }

    public function test_unsupported_language_cookie_keeps_khmer(): void
    {
        $this->withUnencryptedCookie('pos_language', 'fr');

        $this->post('/login', ['username' => 'nobody', 'password' => 'wrong-password'])
            ->assertSessionHasErrors(['username' => 'ឈ្មោះអ្នកប្រើ ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវ។']);
    }
}
