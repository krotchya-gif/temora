<?php
require __DIR__ . '/config.php';
require_secret();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_response(['ok' => false, 'error' => 'Method not allowed'], 405);

$key = $_POST['key'] ?? '';
[$area, $key, $target] = media_key((string) $key);
$file = $_FILES['file'] ?? null;
if (!$file || $file['error'] !== UPLOAD_ERR_OK || $file['size'] > MEDIA_AREAS[$area][1]) json_response(['ok' => false, 'error' => 'Invalid upload'], 400);

$tmp = $file['tmp_name'];
$mime = (new finfo(FILEINFO_MIME_TYPE))->file($tmp);
$allowed = ['image/jpeg' => ['jpg', 'jpeg'], 'image/png' => ['png'], 'application/zip' => ['zip'], 'application/json' => ['json']];
$extension = strtolower(pathinfo($key, PATHINFO_EXTENSION));
if (!isset($allowed[$mime]) || !in_array($extension, $allowed[$mime], true)) json_response(['ok' => false, 'error' => 'Invalid file type'], 415);
if ($mime === 'image/jpeg' && @getimagesize($tmp) === false) json_response(['ok' => false, 'error' => 'Invalid image'], 415);
if ($mime === 'image/png' && @getimagesize($tmp) === false) json_response(['ok' => false, 'error' => 'Invalid image'], 415);

$dir = dirname($target);
// 0755 agar static handler (user berbeda) bisa traversal tiap level folder
// (photos/{event}/{table}/); area private tetap aman via private/.htaccess.
if (!is_dir($dir) && !mkdir($dir, 0755, true)) json_response(['ok' => false, 'error' => 'Cannot create directory'], 500);
if (!move_uploaded_file($tmp, $target)) json_response(['ok' => false, 'error' => 'Cannot save file'], 500);
// File upload PHP default 0600 milik user proses PHP — static handler (user
// berbeda) melempar 404 untuk file publik. Samakan 0644 agar dapat di-serve;
// area private tetap aman via private/.htaccess + media-get.php.
@chmod($target, 0644);
json_response(['ok' => true, 'key' => $key]);
