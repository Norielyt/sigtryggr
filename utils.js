/**
 * Utilidades para el sistema de redirección geográfica
 */

/**
 * Valida si una URL es válida y segura para redirección
 * @param {string} url - URL a validar
 * @returns {boolean} - true si la URL es válida
 */
function isValidUrl(url) {
    if (!url || typeof url !== 'string' || url === '#') {
        return false;
    }
    
    try {
        const urlObj = new URL(url);
        
        // Validar protocolo (solo http y https)
        if (!['http:', 'https:'].includes(urlObj.protocol)) {
            return false;
        }
        
        // Validar que tenga hostname
        if (!urlObj.hostname || urlObj.hostname.length === 0) {
            return false;
        }
        
        // Bloquear localhost y IPs privadas (solo en producción)
        if (process.env.NODE_ENV === 'production') {
            const hostname = urlObj.hostname.toLowerCase();
            if (hostname === 'localhost' || 
                hostname === '127.0.0.1' || 
                hostname.startsWith('192.168.') ||
                hostname.startsWith('10.') ||
                hostname.startsWith('172.')) {
                return false;
            }
        }
        
        return true;
    } catch (e) {
        // Si no se puede parsear como URL, no es válida
        return false;
    }
}

/**
 * Sistema de logging para debugging
 */
const Logger = {
    enabled: true,
    prefix: '[GEOIP]',
    
    log: function(level, message, data = null) {
        if (!this.enabled) return;
        
        const timestamp = new Date().toISOString();
        const logMessage = `${this.prefix} [${timestamp}] [${level}] ${message}`;
        
        if (data) {
            console[level === 'ERROR' ? 'error' : 'log'](logMessage, data);
        } else {
            console[level === 'ERROR' ? 'error' : 'log'](logMessage);
        }
        
        // En producción, podrías enviar logs a un servicio externo
        if (typeof window !== 'undefined' && window.loggerService) {
            window.loggerService.log(level, message, data);
        }
    },
    
    info: function(message, data) {
        this.log('INFO', message, data);
    },
    
    warn: function(message, data) {
        this.log('WARN', message, data);
    },
    
    error: function(message, data) {
        this.log('ERROR', message, data);
    },
    
    debug: function(message, data) {
        if (process.env.NODE_ENV === 'development') {
            this.log('DEBUG', message, data);
        }
    }
};

/**
 * Carga configuración desde archivo JSON
 * @param {string} configPath - Ruta al archivo de configuración
 * @returns {Promise<Object>} - Objeto de configuración
 */
async function loadConfig(configPath = '/config.json') {
    try {
        const response = await fetch(configPath);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const config = await response.json();
        Logger.info('Configuración cargada exitosamente');
        return config;
    } catch (error) {
        Logger.error('Error al cargar configuración', error);
        // Retornar configuración por defecto
        return getDefaultConfig();
    }
}

/**
 * Configuración por defecto si falla la carga
 */
function getDefaultConfig() {
    return {
        redirects: {
            DEFAULT: 'https://t.co/y5IrJWOLzN'
        },
        counter: {
            key: 'norieldev',
            titles: {
                DEFAULT: 'NORIEL DEV NULL'
            }
        },
        flags: {
            DEFAULT: 'https://flagcdn.com/w320/un.png'
        },
        settings: {
            instantRedirectMode: false,
            minWaitTime: 1500,
            maxWaitTime: 3000,
            enableLogging: true,
            enableVPNDetection: true,
            vpnDetectionThreshold: 60
        },
        adScripts: [],
        adultDomains: [],
        allowedUrlParams: ['id', 'page', 'view']
    };
}

// Exportar para uso en módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { isValidUrl, Logger, loadConfig, getDefaultConfig };
}
