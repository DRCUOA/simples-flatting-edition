/**
 * ETag Middleware for Conditional GET Support
 * Generates weak ETags from response bodies for efficient caching
 */

const crypto = require('crypto');

/**
 * Generate weak ETag from data
 * Weak ETags are sufficient for JSON responses (semantic equivalence)
 */
function generateETag(data) {
  const hash = crypto
    .createHash('md5')
    .update(JSON.stringify(data))
    .digest('hex');
  
  return `W/"${hash}"`;
}

/**
 * ETag middleware
 * Automatically adds ETag header and handles If-None-Match
 * 
 * Usage: router.get('/api/resource', etag(), handler)
 */
function etag() {
  return (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);
    
    // Override json method to add ETag
    res.json = function(data) {
      // Generate ETag from response data
      const etagValue = generateETag(data);
      
      // Set ETag header
      res.setHeader('ETag', etagValue);
      
      // Set Cache-Control header
      // private = only browser cache, not shared caches
      // max-age=0 = revalidate on every use
      // must-revalidate = must check with server when stale
      res.setHeader('Cache-Control', 'private, max-age=0, must-revalidate');
      
      // Check If-None-Match header (client's cached ETag)
      const clientETag = req.headers['if-none-match'];
      
      if (clientETag && clientETag === etagValue) {
        // Content hasn't changed, send 304 Not Modified
        res.status(304).end();
        return res;
      }
      
      // Content changed or no cache, send full response
      return originalJson(data);
    };
    
    next();
  };
}

module.exports = etag;

