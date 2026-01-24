const path = require('path');
const fs = require('fs');

/**
 * CacheStore - Centralized caching for applets
 * Prevents redundant network requests by sharing cached resources
 */
class CacheStore {
    constructor() {
        this.memoryCache = new Map();
        this.cacheDir = path.join(require('electron').app.getPath('userData'), 'cache');

        // Ensure cache directory exists
        if (!fs.existsSync(this.cacheDir)) {
            fs.mkdirSync(this.cacheDir, { recursive: true });
        }

        // Load persistent cache metadata
        this.metadataPath = path.join(this.cacheDir, 'metadata.json');
        this.loadMetadata();
    }

    /**
     * Load cache metadata from disk
     */
    loadMetadata() {
        try {
            if (fs.existsSync(this.metadataPath)) {
                const data = fs.readFileSync(this.metadataPath, 'utf-8');
                const metadata = JSON.parse(data);

                // Clean up expired entries
                const now = Date.now();
                for (const [key, value] of Object.entries(metadata)) {
                    if (value.expiresAt && value.expiresAt < now) {
                        this.deleteFromDisk(key);
                    } else {
                        this.memoryCache.set(key, value);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to load cache metadata:', error);
        }
    }

    /**
     * Save cache metadata to disk
     */
    saveMetadata() {
        try {
            const metadata = Object.fromEntries(this.memoryCache);
            fs.writeFileSync(this.metadataPath, JSON.stringify(metadata, null, 2));
        } catch (error) {
            console.error('Failed to save cache metadata:', error);
        }
    }

    /**
     * Get a cached value
     * @param {string} key - Cache key
     * @returns {any} Cached value or null
     */
    get(key) {
        const entry = this.memoryCache.get(key);

        if (!entry) {
            return null;
        }

        // Check expiration
        if (entry.expiresAt && entry.expiresAt < Date.now()) {
            this.delete(key);
            return null;
        }

        // If value is stored on disk, read it
        if (entry.storedOnDisk) {
            try {
                const filePath = path.join(this.cacheDir, entry.filename);
                if (entry.isBinary) {
                    return fs.readFileSync(filePath);
                } else {
                    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                }
            } catch (error) {
                console.error(`Failed to read cache file for ${key}:`, error);
                return null;
            }
        }

        return entry.value;
    }

    /**
     * Set a cached value
     * @param {string} key - Cache key
     * @param {any} value - Value to cache
     * @param {number} ttl - Time to live in milliseconds (optional)
     */
    set(key, value, ttl = null) {
        const entry = {
            key,
            createdAt: Date.now(),
            expiresAt: ttl ? Date.now() + ttl : null,
            accessCount: 0
        };

        // Determine if we should store on disk
        const valueSize = this.estimateSize(value);
        const DISK_THRESHOLD = 100 * 1024; // 100KB

        if (valueSize > DISK_THRESHOLD) {
            // Store large values on disk
            const isBinary = Buffer.isBuffer(value);
            const filename = `${this.hashKey(key)}${isBinary ? '.bin' : '.json'}`;
            const filePath = path.join(this.cacheDir, filename);

            try {
                if (isBinary) {
                    fs.writeFileSync(filePath, value);
                } else {
                    fs.writeFileSync(filePath, JSON.stringify(value));
                }

                entry.storedOnDisk = true;
                entry.filename = filename;
                entry.isBinary = isBinary;
                entry.size = valueSize;
            } catch (error) {
                console.error(`Failed to write cache file for ${key}:`, error);
                entry.value = value;
            }
        } else {
            entry.value = value;
        }

        this.memoryCache.set(key, entry);
        this.saveMetadata();

        return { success: true, key };
    }

    /**
     * Delete a cached value
     */
    delete(key) {
        const entry = this.memoryCache.get(key);

        if (entry && entry.storedOnDisk) {
            this.deleteFromDisk(key);
        }

        this.memoryCache.delete(key);
        this.saveMetadata();

        return { success: true };
    }

    /**
     * Delete file from disk
     */
    deleteFromDisk(key) {
        const entry = this.memoryCache.get(key);
        if (entry && entry.filename) {
            try {
                fs.unlinkSync(path.join(this.cacheDir, entry.filename));
            } catch (error) {
                // File might not exist
            }
        }
    }

    /**
     * Clear all cache
     */
    clear() {
        // Delete all disk files
        for (const [key, entry] of this.memoryCache) {
            if (entry.storedOnDisk) {
                this.deleteFromDisk(key);
            }
        }

        this.memoryCache.clear();
        this.saveMetadata();

        return { success: true };
    }

    /**
     * Get cache statistics
     */
    getStats() {
        let totalSize = 0;
        let diskSize = 0;
        let memorySize = 0;

        for (const [, entry] of this.memoryCache) {
            const size = entry.size || this.estimateSize(entry.value);
            totalSize += size;

            if (entry.storedOnDisk) {
                diskSize += size;
            } else {
                memorySize += size;
            }
        }

        return {
            entries: this.memoryCache.size,
            totalSize,
            diskSize,
            memorySize
        };
    }

    /**
     * Estimate the size of a value in bytes
     */
    estimateSize(value) {
        if (Buffer.isBuffer(value)) {
            return value.length;
        }
        if (typeof value === 'string') {
            return value.length * 2;
        }
        return JSON.stringify(value).length * 2;
    }

    /**
     * Create a hash of the key for filename
     */
    hashKey(key) {
        let hash = 0;
        for (let i = 0; i < key.length; i++) {
            const char = key.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16);
    }
}

module.exports = CacheStore;
