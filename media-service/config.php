<?php
declare(strict_types=1);

$local = __DIR__ . '/config.local.php';
if (is_file($local)) {
    require $local;
}

const MEDIA_AREAS = [
    'photos' => ['private', 15 * 1024 * 1024],
    'thumbs' => ['public', 512 * 1024],
    'frames' => ['public', 5 * 1024 * 1024],
    'sponsors' => ['public', 2 * 1024 * 1024],
    'showcase' => ['public', 10 * 1024 * 1024],
    'zips' => ['private', 1024 * 1024 * 1024],
];

function storage_secret(): string {
    return defined('TEMORA_STORAGE_SECRET') ? TEMORA_STORAGE_SECRET : (getenv('TEMORA_STORAGE_SECRET') ?: '');
}

function json_response(array $body, int $status = 200): never {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($body, JSON_UNESCAPED_SLASHES);
    exit;
}

function require_secret(): void {
    $provided = $_SERVER['HTTP_X_STORAGE_SECRET'] ?? '';
    $expected = storage_secret();
    if ($expected === '' || !hash_equals($expected, $provided)) json_response(['ok' => false, 'error' => 'Unauthorized'], 401);
}

function media_key(string $key): array {
    $key = trim($key, " /");
    if (!preg_match('#^(photos|thumbs|frames|sponsors|showcase|zips)/[A-Za-z0-9._/-]+$#', $key) || str_contains($key, '..')) json_response(['ok' => false, 'error' => 'Invalid key'], 400);
    [$area] = explode('/', $key, 2);
    return [$area, $key, __DIR__ . '/' . MEDIA_AREAS[$area][0] . '/' . $key];
}

function extension_mime(string $path): string {
    return match (strtolower(pathinfo($path, PATHINFO_EXTENSION))) {
        'jpg', 'jpeg' => 'image/jpeg', 'png' => 'image/png', 'json' => 'application/json', 'zip' => 'application/zip', default => 'application/octet-stream'
    };
}
