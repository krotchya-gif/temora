<?php
require __DIR__ . '/config.php';
require_secret();
$payload = json_decode(file_get_contents('php://input'), true) ?: $_POST;
if (isset($payload['key'])) {
    [, $key, $target] = media_key((string) $payload['key']);
    if (is_file($target)) @unlink($target);
    json_response(['ok' => true, 'key' => $key]);
}
if (isset($payload['prefix'])) {
    $prefix = trim((string) $payload['prefix'], " /");
    if (!preg_match('#^(photos|thumbs|frames|covers|sponsors|showcase|zips)(/[A-Za-z0-9._-]+)*$#', $prefix) || str_contains($prefix, '..')) json_response(['ok' => false, 'error' => 'Invalid prefix'], 400);
    [$area] = explode('/', $prefix, 2);
    $root = __DIR__ . '/' . MEDIA_AREAS[$area][0] . '/' . $prefix;
    if (is_dir($root)) {
        $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root, FilesystemIterator::SKIP_DOTS), RecursiveIteratorIterator::CHILD_FIRST);
        foreach ($it as $item) $item->isDir() ? @rmdir($item->getPathname()) : @unlink($item->getPathname());
        @rmdir($root);
    }
    json_response(['ok' => true, 'prefix' => $prefix]);
}
json_response(['ok' => false, 'error' => 'Missing key or prefix'], 400);
