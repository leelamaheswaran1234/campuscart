<?php

declare(strict_types=1);
require __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') json_out(['ok' => false, 'error' => 'Method not allowed.'], 405);
$query = trim((string)($_GET['q'] ?? ''));
if ($query === '' || strlen($query) < 2 || strlen($query) > 640) {
    json_out(['ok' => false, 'error' => 'Enter a research topic between 2 and 160 characters.'], 422);
}
if (preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F]/u', $query)) json_out(['ok' => false, 'error' => 'The query contains unsupported characters.'], 422);
$key = getenv('EASYBUY_BRAVE_API_KEY') ?: '';
$useWikipedia = ($key === '');

// Simple session-scoped cooldown to reduce accidental repeated requests.
$now = time();
if (!empty($_SESSION['eb_discover_last']) && $now - (int)$_SESSION['eb_discover_last'] < 2) {
    json_out(['ok' => false, 'error' => 'Please wait a moment before searching again.'], 429);
}
$_SESSION['eb_discover_last'] = $now;
// No paid/search API key is required for the fallback: query Wikipedia's public search API.
// This returns real, source-linked encyclopedia entries rather than fabricated web results.
if ($useWikipedia) {
    $wikiUrl = 'https://en.wikipedia.org/w/api.php?' . http_build_query([
        'action' => 'query',
        'list' => 'search',
        'srsearch' => $query,
        'format' => 'json',
        'utf8' => 1,
        'srlimit' => 8
    ]);
    $body = false;
    $status = 0;
    $fetchError = '';
    if (function_exists('curl_init')) {
        $ch = curl_init($wikiUrl);
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_FOLLOWLOCATION => false, CURLOPT_CONNECTTIMEOUT => 5, CURLOPT_TIMEOUT => 12, CURLOPT_USERAGENT => 'EasyBuy Student Discover/1.0 (educational project)', CURLOPT_HTTPHEADER => ['Accept: application/json']]);
        $body = curl_exec($ch);
        $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $fetchError = curl_error($ch);
        curl_close($ch);
    } else {
        // Stream-wrapper fallback keeps Discover usable on XAMPP installations without cURL.
        $context = stream_context_create(['http' => ['method' => 'GET', 'timeout' => 12, 'ignore_errors' => true, 'header' => "Accept: application/json\r\nUser-Agent: EasyBuy Student Discover/1.0 (educational project)\r\n"]]);
        $body = @file_get_contents($wikiUrl, false, $context);
        foreach (($http_response_header ?? []) as $header) if (preg_match('/^HTTP\/\S+\s+(\d{3})/', $header, $m)) $status = (int)$m[1];
        if ($body === false) $fetchError = 'HTTP stream request failed';
    }
    if ($body === false || $fetchError !== '' || $status < 200 || $status >= 300) {
        error_log('EasyBuy Wikipedia Discover failed: ' . ($fetchError ?: 'HTTP ' . $status));
        json_out(['ok' => false, 'error' => 'Could not reach the free research source. Check internet access and PHP HTTPS support, then retry.'], 502);
    }
    $data = json_decode($body, true);
    $hits = $data['query']['search'] ?? [];
    $results = [];
    foreach ($hits as $hit) {
        $title = trim((string)($hit['title'] ?? ''));
        if ($title === '') continue;
        $results[] = ['title' => $title, 'summary' => trim(strip_tags((string)($hit['snippet'] ?? ''))), 'url' => 'https://en.wikipedia.org/wiki/' . str_replace('%2F', '/', rawurlencode(str_replace(' ', '_', $title))), 'source' => 'en.wikipedia.org'];
    }
    json_out(['ok' => true, 'query' => $query, 'results' => $results, 'provider' => 'Wikipedia Search (free fallback)', 'searched_at' => date(DATE_ATOM), 'note' => 'Using Wikipedia because EASYBUY_BRAVE_API_KEY is not configured. Add a Brave key to enable broader web results.']);
}
$url = 'https://api.search.brave.com/res/v1/web/search?' . http_build_query([
    'q' => $query,
    'count' => 8,
    'safesearch' => 'moderate'
]);
$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => false,
    CURLOPT_CONNECTTIMEOUT => 5,
    CURLOPT_TIMEOUT => 12,
    CURLOPT_HTTPHEADER => ['Accept: application/json', 'X-Subscription-Token: ' . $key]
]);
$body = curl_exec($ch);
$status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);
if ($body === false || $curlError !== '') {
    error_log('EasyBuy Discover request failed: ' . $curlError);
    json_out(['ok' => false, 'error' => 'The research service could not be reached. Please retry.'], 502);
}
if ($status < 200 || $status >= 300) {
    error_log('EasyBuy Discover provider returned HTTP ' . $status);
    json_out(['ok' => false, 'error' => $status === 401 || $status === 403 ? 'The research API key was rejected. Check the server configuration.' : 'The research service is temporarily unavailable. Please retry.'], 502);
}
$data = json_decode($body, true);
$rows = $data['web']['results'] ?? [];
$results = [];
foreach ($rows as $row) {
    $title = trim((string)($row['title'] ?? ''));
    $description = trim((string)($row['description'] ?? ''));
    $source = trim((string)($row['url'] ?? ''));
    if ($title === '' || !filter_var($source, FILTER_VALIDATE_URL) || !in_array(strtolower((string)parse_url($source, PHP_URL_SCHEME)), ['http', 'https'], true)) continue;
    $results[] = ['title' => $title, 'summary' => $description, 'url' => $source, 'source' => (string)(parse_url($source, PHP_URL_HOST) ?? '')];
}
json_out(['ok' => true, 'query' => $query, 'results' => $results, 'provider' => 'Brave Search', 'searched_at' => date(DATE_ATOM)]);
