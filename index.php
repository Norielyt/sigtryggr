<?php
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

function getVisitorIP() {
    if (isset($_SERVER['HTTP_CF_CONNECTING_IP']) && !empty($_SERVER['HTTP_CF_CONNECTING_IP'])) {
        $ip = trim($_SERVER['HTTP_CF_CONNECTING_IP']);
        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) !== false) {
            return $ip;
        }
    }
    
    $ipKeys = ['HTTP_CLIENT_IP', 'HTTP_X_FORWARDED_FOR', 'HTTP_X_FORWARDED', 'HTTP_X_CLUSTER_CLIENT_IP', 'HTTP_FORWARDED_FOR', 'HTTP_FORWARDED'];
    
    foreach ($ipKeys as $key) {
        if (array_key_exists($key, $_SERVER) === true) {
            foreach (explode(',', $_SERVER[$key]) as $ip) {
                $ip = trim($ip);
                if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) !== false) {
                    return $ip;
                }
            }
        }
    }
    
    return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
}

function getUserCountry() {
    if (isset($_SERVER['HTTP_CF_IPCOUNTRY']) && !empty($_SERVER['HTTP_CF_IPCOUNTRY'])) {
        $country = strtoupper(trim($_SERVER['HTTP_CF_IPCOUNTRY']));
        if (strlen($country) === 2) {
            return $country;
        }
    }
    
    if (isset($_SERVER['HTTP_X_COUNTRY_CODE']) && !empty($_SERVER['HTTP_X_COUNTRY_CODE'])) {
        $country = strtoupper(trim($_SERVER['HTTP_X_COUNTRY_CODE']));
        if (strlen($country) === 2) {
            return $country;
        }
    }
    
    if (class_exists('GeoIp2\Database\Reader')) {
        $maxmindPath = __DIR__ . '/geolite2/GeoLite2-Country.mmdb';
        if (file_exists($maxmindPath)) {
            try {
                $reader = new GeoIp2\Database\Reader($maxmindPath);
                $ip = getVisitorIP();
                if ($ip && $ip !== '0.0.0.0' && $ip !== '127.0.0.1') {
                    $record = $reader->country($ip);
                    $country = strtoupper($record->country->isoCode);
                    if (strlen($country) === 2) {
                        return $country;
                    }
                }
            } catch (Exception $e) {
            }
        }
    }
    
    return 'XX';
}

$countryLinks = [
    'US' => 'https://ejemplo.com/us',
    'MX' => 'https://ejemplo.com/mx',
    'DO' => 'https://ejemplo.com/do',
    'DEFAULT' => 'https://ejemplo.com/default'
];

$userCountry = getUserCountry();
$redirectUrl = $countryLinks[$userCountry] ?? $countryLinks['DEFAULT'] ?? '#';

if (!empty($redirectUrl) && $redirectUrl !== '#') {
    header("Location: " . $redirectUrl);
    exit;
}

http_response_code(404);
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>404 - Página no encontrada</title>
</head>
<body>
    <h1>404 - Página no encontrada</h1>
</body>
</html>
