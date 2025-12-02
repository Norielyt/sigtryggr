<?php
header('Content-Type: application/json');
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
    $headers = getallheaders();
    
    if ($headers) {
        foreach ($headers as $key => $value) {
            if (stripos($key, 'vercel') !== false && stripos($key, 'country') !== false) {
                $country = strtoupper(trim($value));
                if (strlen($country) === 2) {
                    return $country;
                }
            }
        }
    }
    
    if (isset($_SERVER['HTTP_X_VERCEL_IP_COUNTRY']) && !empty($_SERVER['HTTP_X_VERCEL_IP_COUNTRY'])) {
        $country = strtoupper(trim($_SERVER['HTTP_X_VERCEL_IP_COUNTRY']));
        if (strlen($country) === 2) {
            return $country;
        }
    }
    
    $vercelHeaders = [
        'x-vercel-ip-country',
        'X-Vercel-Ip-Country',
        'X-VERCEL-IP-COUNTRY'
    ];
    
    foreach ($vercelHeaders as $header) {
        if (isset($_SERVER['HTTP_' . str_replace('-', '_', strtoupper($header))])) {
            $country = strtoupper(trim($_SERVER['HTTP_' . str_replace('-', '_', strtoupper($header))]));
            if (strlen($country) === 2) {
                return $country;
            }
        }
    }
    
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

$country = getUserCountry();
echo json_encode(['country' => $country]);
?>

