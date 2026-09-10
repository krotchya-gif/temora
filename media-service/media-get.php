<?php
require __DIR__ . '/config.php';
require_secret();
[$area, $key, $target] = media_key((string) ($_GET['key'] ?? ''));
if (MEDIA_AREAS[$area][0] !== 'private' || !is_file($target)) json_response(['ok' => false, 'error' => 'Not found'], 404);
header('Content-Type: ' . extension_mime($target));
header('Content-Length: ' . filesize($target));
header('X-Content-Type-Options: nosniff');
readfile($target);
