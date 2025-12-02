export default function handler(req, res) {
    let country = 'XX';
    
    const vercelHeaders = [
        'x-vercel-ip-country',
        'X-Vercel-Ip-Country',
        'X-VERCEL-IP-COUNTRY'
    ];
    
    for (const header of vercelHeaders) {
        if (req.headers[header]) {
            country = req.headers[header].toUpperCase().trim();
            if (country.length === 2) {
                break;
            }
        }
    }
    
    if (country === 'XX') {
        for (const key in req.headers) {
            if (key.toLowerCase().includes('vercel') && key.toLowerCase().includes('country')) {
                country = req.headers[key].toUpperCase().trim();
                if (country.length === 2) {
                    break;
                }
            }
        }
    }
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    res.status(200).json({ 
        country: country,
        debug: {
            headers: Object.keys(req.headers).filter(k => k.toLowerCase().includes('vercel') || k.toLowerCase().includes('country')),
            detected: country
        }
    });
}

