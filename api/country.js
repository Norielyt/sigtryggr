/**
 * ============================================
 * API ENDPOINT: Detección de País
 * ============================================
 * Este endpoint detecta el país del visitante usando
 * los headers proporcionados por Vercel.
 * 
 * Headers soportados:
 * - x-vercel-ip-country (formato estándar)
 * - X-Vercel-Ip-Country (variante)
 * - X-VERCEL-IP-COUNTRY (variante)
 * 
 * Retorna código de país ISO 3166-1 alpha-2 (2 letras)
 * o 'XX' si no se puede detectar.
 */

/**
 * Sistema de logging para el servidor
 */
const Logger = {
    enabled: process.env.NODE_ENV !== 'production' || process.env.ENABLE_LOGGING === 'true',
    
    log: function(level, message, data = null) {
        if (!this.enabled) return;
        
        const timestamp = new Date().toISOString();
        const logMessage = `[GEOIP-API] [${timestamp}] [${level}] ${message}`;
        
        if (data) {
            console[level === 'ERROR' ? 'error' : 'log'](logMessage, JSON.stringify(data, null, 2));
        } else {
            console[level === 'ERROR' ? 'error' : 'log'](logMessage);
        }
    },
    
    info: function(message, data) { this.log('INFO', message, data); },
    warn: function(message, data) { this.log('WARN', message, data); },
    error: function(message, data) { this.log('ERROR', message, data); },
    debug: function(message, data) { this.log('DEBUG', message, data); }
};

/**
 * Valida si un código de país es válido (ISO 3166-1 alpha-2)
 * @param {string} code - Código de país a validar
 * @returns {boolean} - true si es válido
 */
function isValidCountryCode(code) {
    if (!code || typeof code !== 'string') {
        return false;
    }
    
    // Debe tener exactamente 2 caracteres y ser alfabético
    if (code.length !== 2 || !/^[A-Z]{2}$/.test(code)) {
        return false;
    }
    
    return true;
}

/**
 * Obtiene la IP del cliente desde los headers
 * @param {object} headers - Headers de la petición
 * @returns {string} - IP del cliente o 'unknown'
 */
function getClientIP(headers) {
    // Intentar obtener IP de headers comunes
    const ipHeaders = [
        'x-forwarded-for',
        'x-real-ip',
        'cf-connecting-ip',
        'x-client-ip',
        'x-forwarded',
        'forwarded-for',
        'forwarded'
    ];
    
    for (const header of ipHeaders) {
        const value = headers[header] || headers[header.toLowerCase()];
        if (value) {
            // x-forwarded-for puede tener múltiples IPs, tomar la primera
            const ip = Array.isArray(value) ? value[0] : value.split(',')[0].trim();
            if (ip) {
                return ip;
            }
        }
    }
    
    return 'unknown';
}

/**
 * Detecta el país desde los headers de Vercel
 * @param {object} headers - Headers de la petición
 * @returns {string} - Código de país o 'XX'
 */
function detectCountry(headers) {
    let country = 'XX';
    
    // Headers estándar de Vercel (en orden de prioridad)
    const vercelHeaders = [
        'x-vercel-ip-country',
        'X-Vercel-Ip-Country',
        'X-VERCEL-IP-COUNTRY',
        'x-vercel-ipcountry',
        'X-Vercel-IPCountry'
    ];
    
    // Intentar con headers estándar
    for (const header of vercelHeaders) {
        const value = headers[header];
        if (value) {
            const code = String(value).toUpperCase().trim();
            if (isValidCountryCode(code)) {
                country = code;
                Logger.debug('País detectado desde header estándar', { 
                    header: header, 
                    country: country 
                });
                break;
            }
        }
    }
    
    // Si no se encontró, buscar en todos los headers
    if (country === 'XX') {
        for (const key in headers) {
            const lowerKey = key.toLowerCase();
            if (lowerKey.includes('vercel') && lowerKey.includes('country')) {
                const value = headers[key];
                if (value) {
                    const code = String(value).toUpperCase().trim();
                    if (isValidCountryCode(code)) {
                        country = code;
                        Logger.debug('País detectado desde header alternativo', { 
                            header: key, 
                            country: country 
                        });
                        break;
                    }
                }
            }
        }
    }
    
    // Intentar con headers de Cloudflare (fallback)
    if (country === 'XX' && headers['cf-ipcountry']) {
        const code = String(headers['cf-ipcountry']).toUpperCase().trim();
        if (isValidCountryCode(code)) {
            country = code;
            Logger.debug('País detectado desde Cloudflare header', { country: country });
        }
    }
    
    return country;
}

/**
 * Handler principal del endpoint
 */
export default function handler(req, res) {
    const startTime = Date.now();
    const clientIP = getClientIP(req.headers);
    
    Logger.info('Petición recibida', {
        method: req.method,
        url: req.url,
        ip: clientIP,
        userAgent: req.headers['user-agent'] || 'unknown'
    });
    
    // Solo permitir métodos GET y POST
    if (req.method !== 'GET' && req.method !== 'POST') {
        Logger.warn('Método no permitido', { method: req.method });
        res.setHeader('Allow', 'GET, POST');
        res.status(405).json({ 
            error: 'Method not allowed',
            country: 'XX'
        });
        return;
    }
    
    try {
        // Detectar país
        const country = detectCountry(req.headers);
        
        // Headers de respuesta
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        
        // Preparar respuesta
        const response = {
            country: country,
            timestamp: new Date().toISOString()
        };
        
        // Agregar información de debug solo en desarrollo o si se solicita
        const isDebugMode = process.env.NODE_ENV === 'development' || 
                           req.query.debug === 'true' ||
                           req.headers['x-debug'] === 'true';
        
        if (isDebugMode) {
            response.debug = {
                headers: Object.keys(req.headers)
                    .filter(k => {
                        const lowerKey = k.toLowerCase();
                        return lowerKey.includes('vercel') || 
                               lowerKey.includes('country') ||
                               lowerKey.includes('ip') ||
                               lowerKey.includes('forwarded');
                    })
                    .reduce((acc, key) => {
                        acc[key] = req.headers[key];
                        return acc;
                    }, {}),
                detected: country,
                clientIP: clientIP,
                processingTime: Date.now() - startTime + 'ms'
            };
        }
        
        // Log del resultado
        const processingTime = Date.now() - startTime;
        if (country === 'XX') {
            Logger.warn('No se pudo detectar país', {
                ip: clientIP,
                processingTime: processingTime + 'ms',
                availableHeaders: Object.keys(req.headers).filter(k => 
                    k.toLowerCase().includes('vercel') || k.toLowerCase().includes('country')
                )
            });
        } else {
            Logger.info('País detectado exitosamente', {
                country: country,
                ip: clientIP,
                processingTime: processingTime + 'ms'
            });
        }
        
        // Enviar respuesta
        res.status(200).json(response);
        
    } catch (error) {
        Logger.error('Error al procesar petición', {
            error: error.message,
            stack: error.stack,
            ip: clientIP
        });
        
        res.setHeader('Content-Type', 'application/json');
        res.status(500).json({
            error: 'Internal server error',
            country: 'XX',
            message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred'
        });
    }
}

