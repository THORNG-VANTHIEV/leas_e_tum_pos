<laravel-boost-guidelines>
# Laravel Application

This repository contains a Laravel application. Complete the following setup before working on the user's request.

## Prerequisites

Verify that PHP and Composer are available:

```sh
php -v
composer -V
```

If either command is unavailable, detect the user's operating system and install the prerequisites with the appropriate command:

macOS:

```sh
/bin/bash -c "$(curl -fsSL https://php.new/install/mac/8.5)"
```

Windows PowerShell:

```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://php.new/install/windows/8.5'))
```

Linux:

```sh
/bin/bash -c "$(curl -fsSL https://php.new/install/linux/8.5)"
```

After installation, ask the user to restart their terminal. If the agent needs the restarted shell to continue, ask the user to reopen their terminal and rerun their original prompt.

## Agent Setup

Install Laravel Boost from the application root before making application changes:

```sh
composer require laravel/boost --dev
php artisan boost:install
```

Boost replaces these bootstrap instructions with guidelines tailored to the application. After installation, read `AGENTS.md` again and continue with the user's original request using the generated guidelines.
</laravel-boost-guidelines>

# Session Control Rules (ច្បាប់គ្រប់គ្រងដំណើរការគម្រោង)

- **When the user says "taking a break"**:
  1. Check git status, commit and push changes to GitHub.
  2. Stop and kill all running development processes (`php artisan dev`, `artisan serve`, `vite`, `queue:listen`, `pail`) so the computer can relax.
  3. Confirm to the user that the project has been stopped and saved.

- **When the user says "on time coding"**:
  1. Start the project development environment immediately in the background using `php artisan dev` (or `composer run dev`).
  2. Verify that the local server is listening on `http://127.0.0.1:8000` and Vite is ready.
  3. Inform the user that the project is running and ready for coding.
