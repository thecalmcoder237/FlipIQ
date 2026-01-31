
/**
 * apiService.js
 * Centralized service for handling API requests with retries, caching, and error management.
 */

const CACHE_TTL = 1000 * 60 * 60; // 1 hour default TTL
const MAX_RETRIES = 3;
const INITIAL_BACKOFF = 1000;

class ApiService {
  constructor() {
    this.cache = new Map();
    this.requestLog = [];
  }

  /**
   * Generates a cache key based on URL and options
   */
  _getCacheKey(url, options) {
    return `${url}:${JSON.stringify(options)}`;
  }

  /**
   * Checks if cached data is valid
   */
  _isValidCache(cacheEntry) {
    if (!cacheEntry) return false;
    const now = Date.now();
    return (now - cacheEntry.timestamp) < CACHE_TTL;
  }

  /**
   * Logs API requests for debugging and monitoring
   */
  _logRequest(url, status, duration, error = null) {
    this.requestLog.push({
      url,
      timestamp: new Date().toISOString(),
      status,
      duration,
      error
    });
    // Keep log size manageable
    if (this.requestLog.length > 100) {
      this.requestLog.shift();
    }
  }

  /**
   * Performs the fetch with retry logic
   */
  async _fetchWithRetry(url, options, retries = MAX_RETRIES, backoff = INITIAL_BACKOFF) {
    try {
      const response = await fetch(url, options);
      
      // Handle rate limiting (429) specifically if needed
      if (response.status === 429 && retries > 0) {
        console.warn(`Rate limited on ${url}. Retrying in ${backoff}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoff));
        return this._fetchWithRetry(url, options, retries - 1, backoff * 2);
      }

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (retries > 0) {
        console.warn(`Request failed for ${url}. Retrying in ${backoff}ms... Error: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, backoff));
        return this._fetchWithRetry(url, options, retries - 1, backoff * 2);
      }
      throw error;
    }
  }

  /**
   * Public method to make API requests
   */
  async get(url, options = {}, useCache = true) {
    const startTime = Date.now();
    const cacheKey = this._getCacheKey(url, options);

    // Check Cache
    if (useCache && this._isValidCache(this.cache.get(cacheKey))) {
      console.log(`[API] Serving from cache: ${url}`);
      return this.cache.get(cacheKey).data;
    }

    try {
      // GET requests: do not set Content-Type so cross-origin GETs remain "simple" and avoid CORS preflight.
      const data = await this._fetchWithRetry(url, {
        ...options,
        method: 'GET',
        headers: {
          ...options.headers
        }
      });

      // Update Cache
      if (useCache) {
        this.cache.set(cacheKey, {
          data,
          timestamp: Date.now()
        });
      }

      this._logRequest(url, 'SUCCESS', Date.now() - startTime);
      return data;
    } catch (error) {
      this._logRequest(url, 'ERROR', Date.now() - startTime, error.message);
      console.error(`[API] Request failed: ${url}`, error);
      throw error;
    }
  }

  async post(url, body, options = {}) {
    const startTime = Date.now();
    try {
      const data = await this._fetchWithRetry(url, {
        ...options,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        body: JSON.stringify(body)
      });

      this._logRequest(url, 'SUCCESS', Date.now() - startTime);
      return data;
    } catch (error) {
      this._logRequest(url, 'ERROR', Date.now() - startTime, error.message);
      throw error;
    }
  }
}

export const apiService = new ApiService();
