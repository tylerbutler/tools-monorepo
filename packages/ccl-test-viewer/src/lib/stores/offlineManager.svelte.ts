/**
 * Offline mode manager for Tauri desktop application
 * Handles caching, offline detection, and data synchronization
 */

import { isTauriEnvironment } from "@/services/tauriFileService";
import { dataSourceManager } from "./dataSourceManager.svelte.js";

interface CachedData {
	id: string;
	type: "static" | "uploaded" | "github";
	data: any;
	cachedAt: Date;
	expiresAt: Date;
	size: number;
}

interface OfflineStats {
	isOnline: boolean;
	cachedDataSources: number;
	totalCacheSize: number;
	lastSync: Date | null;
	offlineCapable: boolean;
}

/**
 * Offline mode manager for desktop application
 */
class OfflineManager {
	// State
	private _isOnline = $state(navigator.onLine);
	private _isOfflineMode = $state(false);
	private readonly _cachedData = $state<Map<string, CachedData>>(new Map());
	private _lastSync = $state<Date | null>(null);
	private _autoCache = $state(true);
	private _cacheLimit = $state(100 * 1024 * 1024); // 100MB cache limit

	constructor() {
		// Initialize offline detection
		this.initializeOfflineDetection();

		// Load cached data if in Tauri environment
		if (isTauriEnvironment()) {
			this.loadCachedData();
		}
	}

	// Getters
	get isOnline() {
		return this._isOnline;
	}

	get isOfflineMode() {
		return this._isOfflineMode;
	}

	get offlineCapable() {
		return isTauriEnvironment();
	}

	get cachedDataSources() {
		return Array.from(this._cachedData.values());
	}

	get autoCache() {
		return this._autoCache;
	}

	get lastSync() {
		return this._lastSync;
	}

	get stats(): OfflineStats {
		const totalCacheSize = Array.from(this._cachedData.values()).reduce(
			(sum, cached) => sum + cached.size,
			0,
		);

		return {
			isOnline: this._isOnline,
			cachedDataSources: this._cachedData.size,
			totalCacheSize,
			lastSync: this._lastSync,
			offlineCapable: this.offlineCapable,
		};
	}

	/**
	 * Initialize offline detection and event handlers
	 */
	private initializeOfflineDetection(): void {
		if (typeof window === "undefined") {
			return;
		}

		// Listen for online/offline events
		window.addEventListener("online", () => {
			this._isOnline = true;
			this.handleOnlineStateChange();
		});

		window.addEventListener("offline", () => {
			this._isOnline = false;
			this.handleOnlineStateChange();
		});
	}

	/**
	 * Handle online state changes
	 */
	private async handleOnlineStateChange(): Promise<void> {
		if (this._isOnline && this.offlineCapable) {
			// Back online - sync cached data
			await this.syncCachedData();
		} else if (!this._isOnline) {
			// Gone offline - ensure we have cached data
			await this.cacheCurrentData();
		}
	}

	/**
	 * Enable/disable offline mode
	 */
	setOfflineMode(enabled: boolean): void {
		if (!this.offlineCapable) {
			throw new Error("Offline mode only available in desktop app");
		}

		this._isOfflineMode = enabled;

		if (enabled) {
			// Cache current data when entering offline mode
			this.cacheCurrentData();
		}
	}

	/**
	 * Cache current data sources for offline use
	 */
	async cacheCurrentData(): Promise<void> {
		if (!this.offlineCapable) {
			return;
		}

		try {
			const currentSources = dataSourceManager.dataSources;

			for (const source of currentSources) {
				if (source.active) {
					await this.cacheDataSource(source);
				}
			}

			this._lastSync = new Date();

			// Clean up expired cache entries
			await this.cleanupExpiredCache();
		} catch (_error) {}
	}

	/**
	 * Cache a specific data source
	 */
	private async cacheDataSource(source: any): Promise<void> {
		const cacheKey = `source-${source.id}`;
		const expiresAt = new Date();
		expiresAt.setDate(expiresAt.getDate() + 7); // Cache for 7 days

		const cachedData: CachedData = {
			id: source.id,
			type: source.type,
			data: {
				source,
				categories: source.categories,
				stats: source.stats,
			},
			cachedAt: new Date(),
			expiresAt,
			size: JSON.stringify(source).length,
		};

		// Check cache size limit
		const currentCacheSize = Array.from(this._cachedData.values()).reduce(
			(sum, cached) => sum + cached.size,
			0,
		);

		if (currentCacheSize + cachedData.size > this._cacheLimit) {
			// Remove oldest cached data to make room
			await this.evictOldestCache();
		}

		this._cachedData.set(cacheKey, cachedData);

		// Persist to local storage in Tauri
		if (isTauriEnvironment()) {
			await this.persistCacheToFile();
		}
	}

	/**
	 * Load cached data from persistent storage
	 */
	private async loadCachedData(): Promise<void> {
		if (!isTauriEnvironment()) {
			return;
		}

		try {
			// Clean up expired entries after loading
			await this.cleanupExpiredCache();
		} catch (_error) {}
	}

	/**
	 * Persist cache to file system (Tauri-specific)
	 */
	private async persistCacheToFile(): Promise<void> {
		if (!isTauriEnvironment()) {
			return;
		}

		try {
			// TODO: Implement cache persistence when storage API is available
		} catch (_error) {}
	}

	/**
	 * Sync cached data with remote sources when online
	 */
	private async syncCachedData(): Promise<void> {
		if (!(this._isOnline && this.offlineCapable)) {
			return;
		}

		try {
			// TODO: Implement cache sync when remote update detection is available
			this._lastSync = new Date();
		} catch (_error) {}
	}

	/**
	 * Clean up expired cache entries
	 */
	private async cleanupExpiredCache(): Promise<void> {
		const now = new Date();
		const expiredKeys: string[] = [];

		for (const [key, cached] of this._cachedData.entries()) {
			if (cached.expiresAt < now) {
				expiredKeys.push(key);
			}
		}

		for (const key of expiredKeys) {
			this._cachedData.delete(key);
		}

		if (expiredKeys.length > 0 && isTauriEnvironment()) {
			// Update persistent storage
			await this.persistCacheToFile();
		}
	}

	/**
	 * Evict oldest cache entries to make room for new data
	 */
	private async evictOldestCache(): Promise<void> {
		const entries = Array.from(this._cachedData.entries());

		// Sort by cache date (oldest first)
		entries.sort(([, a], [, b]) => a.cachedAt.getTime() - b.cachedAt.getTime());

		// Remove oldest entry
		if (entries.length > 0) {
			const [oldestKey] = entries[0];
			this._cachedData.delete(oldestKey);
		}
	}

	/**
	 * Clear all cached data
	 */
	async clearCache(): Promise<void> {
		this._cachedData.clear();
		this._lastSync = null;

		if (isTauriEnvironment()) {
			await this.persistCacheToFile();
		}
	}

	/**
	 * Set cache configuration
	 */
	setCacheConfig(options: { autoCache?: boolean; cacheLimit?: number }): void {
		if (options.autoCache !== undefined) {
			this._autoCache = options.autoCache;
		}

		if (options.cacheLimit !== undefined) {
			this._cacheLimit = options.cacheLimit;
		}
	}

	/**
	 * Get offline data sources for use when offline
	 */
	getOfflineDataSources(): any[] {
		return Array.from(this._cachedData.values())
			.map((cached) => cached.data.source)
			.filter((source) => source !== null);
	}

	/**
	 * Check if a specific data source is available offline
	 */
	isSourceAvailableOffline(sourceId: string): boolean {
		const cacheKey = `source-${sourceId}`;
		const cached = this._cachedData.get(cacheKey);

		if (!cached) {
			return false;
		}

		// Check if not expired
		return cached.expiresAt > new Date();
	}

	/**
	 * Force refresh of cached data
	 */
	async refreshCache(): Promise<void> {
		if (!this.offlineCapable) {
			throw new Error("Cache refresh only available in desktop app");
		}

		await this.clearCache();
		await this.cacheCurrentData();
	}

	/**
	 * Get cache usage statistics
	 */
	getCacheStats(): {
		totalSize: number;
		entryCount: number;
		oldestEntry: Date | null;
		newestEntry: Date | null;
		expiredCount: number;
	} {
		const entries = Array.from(this._cachedData.values());
		const now = new Date();

		return {
			totalSize: entries.reduce((sum, entry) => sum + entry.size, 0),
			entryCount: entries.length,
			oldestEntry:
				entries.length > 0
					? new Date(Math.min(...entries.map((e) => e.cachedAt.getTime())))
					: null,
			newestEntry:
				entries.length > 0
					? new Date(Math.max(...entries.map((e) => e.cachedAt.getTime())))
					: null,
			expiredCount: entries.filter((e) => e.expiresAt < now).length,
		};
	}
}

// Create singleton instance
export const offlineManager = new OfflineManager();
