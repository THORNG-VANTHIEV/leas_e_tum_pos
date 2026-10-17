<?php

namespace Tests\Feature\Catalog;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ImageUploadTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
        Storage::fake('public');
    }

    public function test_svg_menu_image_is_rejected(): void
    {
        $admin = User::where('username', 'admin')->firstOrFail();
        $svg = UploadedFile::fake()->createWithContent('logo.svg', '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');

        $this->actingAs($admin)
            ->post(route('catalog.upload-image'), ['image' => $svg])
            ->assertSessionHasErrors('image');

        $this->assertSame([], Storage::disk('public')->allFiles('products'));
    }

    public function test_jpeg_menu_image_is_accepted(): void
    {
        $admin = User::where('username', 'admin')->firstOrFail();

        $this->actingAs($admin)
            ->post(route('catalog.upload-image'), ['image' => UploadedFile::fake()->image('dish.jpg')])
            ->assertSessionHasNoErrors();

        $this->assertCount(1, Storage::disk('public')->allFiles('products'));
    }
}
