/**
 * Desktop GitHub Authentication Service
 * Placeholder for future OAuth implementation in Tauri desktop app
 */

import { isTauriEnvironment } from "./tauriFileService.js";

export interface AuthConfig {
	clientId: string;
	clientSecret?: string; // Not recommended for public clients
	redirectUri: string;
	scopes: string[];
}

export interface AuthToken {
	accessToken: string;
	tokenType: string;
	scope: string[];
	expiresAt?: Date;
}

export interface AuthUser {
	id: number;
	login: string;
	name: string;
	email: string;
	avatarUrl: string;
}

/**
 * Desktop-specific GitHub authentication service
 * This is a placeholder for future implementation
 */
class DesktopAuthService {
	private _isAuthenticated = $state(false);
	private _currentUser = $state<AuthUser | null>(null);
	private _authToken = $state<AuthToken | null>(null);

	public constructor() {
		// Initialize authentication state from local storage
		void this.loadAuthState();
	}

	// Getters
	public get isAuthenticated() {
		return this._isAuthenticated;
	}

	public get currentUser() {
		return this._currentUser;
	}

	public get authToken() {
		return this._authToken;
	}

	public get isAvailable() {
		return isTauriEnvironment();
	}

	/**
	 * Initialize OAuth flow (placeholder)
	 * In a real implementation, this would:
	 * 1. Open OAuth URL in system browser
	 * 2. Listen for callback via deep link
	 * 3. Exchange code for access token
	 */
	public async initiateOAuth(_config: AuthConfig): Promise<AuthToken> {
		if (!this.isAvailable) {
			throw new Error("Desktop OAuth only available in Tauri app");
		}

		// Simulate OAuth flow for development
		throw new Error(
			"OAuth implementation not yet available - requires Tauri deep linking setup",
		);

		// Future implementation would look like:
		/*
		const authUrl = `https://github.com/login/oauth/authorize?` +
			`client_id=${config.clientId}&` +
			`redirect_uri=${encodeURIComponent(config.redirectUri)}&` +
			`scope=${config.scopes.join(' ')}`;

		// Open in system browser
		await invoke('open_url', { url: authUrl });

		// Listen for deep link callback
		const code = await this.listenForCallback();

		// Exchange code for token
		const token = await this.exchangeCodeForToken(code, config);

		// Store token and user info
		await this.storeAuthToken(token);
		await this.fetchUserInfo();

		return token;
		*/
	}

	/**
	 * Sign out and clear authentication
	 */
	public async signOut(): Promise<void> {
		this._isAuthenticated = false;
		this._currentUser = null;
		this._authToken = null;

		// Clear from local storage
		if (this.isAvailable) {
			await this.clearAuthState();
		}
	}

	/**
	 * Check if current token is valid
	 */
	public isTokenValid(): boolean {
		if (!this._authToken) {
			return false;
		}

		if (this._authToken.expiresAt && this._authToken.expiresAt < new Date()) {
			return false;
		}

		return true;
	}

	/**
	 * Get authenticated GitHub API client
	 */
	public getAuthenticatedClient(): { headers: Record<string, string> } | null {
		if (!this.isTokenValid()) {
			return null;
		}

		return {
			headers: {
				Authorization: `${this._authToken?.tokenType} ${this._authToken?.accessToken}`,
				Accept: "application/vnd.github.v3+json",
				"User-Agent": "CCL-Test-Viewer-Desktop/1.0",
			},
		};
	}

	/**
	 * Load authentication state from local storage
	 */
	private async loadAuthState(): Promise<void> {
		if (!this.isAvailable) {
			return;
		}

		// TODO: Implement auth state persistence when storage API is available
	}

	/**
	 * Store authentication state to local storage
	 */
	// biome-ignore lint/correctness/noUnusedPrivateClassMembers: future OAuth implementation
	private async storeAuthToken(token: AuthToken): Promise<void> {
		this._authToken = token;
		this._isAuthenticated = true;

		if (this.isAvailable) {
			// TODO: Implement auth token persistence when storage API is available
		}
	}

	/**
	 * Clear authentication state from local storage
	 */
	private async clearAuthState(): Promise<void> {
		// TODO: Implement auth state clearing when storage API is available
	}

	/**
	 * Fetch user information from GitHub API
	 */
	// biome-ignore lint/correctness/noUnusedPrivateClassMembers: future OAuth implementation
	private async fetchUserInfo(): Promise<void> {
		const client = this.getAuthenticatedClient();
		if (!client) {
			throw new Error("No valid authentication token");
		}
		const response = await fetch("https://api.github.com/user", client);
		if (!response.ok) {
			throw new Error(`GitHub API error: ${response.status}`);
		}

		const userData = await response.json();
		this._currentUser = {
			id: userData.id,
			login: userData.login,
			name: userData.name || userData.login,
			email: userData.email || "",
			avatarUrl: userData.avatar_url,
		};
	}
}

// Create singleton instance
export const desktopAuthService = new DesktopAuthService();

/**
 * Configuration for GitHub OAuth in desktop app
 * Uses environment variables for security - configure via VITE_GITHUB_CLIENT_ID
 */
export const GITHUB_OAUTH_CONFIG: AuthConfig = {
	clientId: import.meta.env.VITE_GITHUB_CLIENT_ID || "", // Configure via environment variable
	redirectUri: "ccl-test-viewer://oauth/callback", // Deep link for Tauri
	scopes: ["repo", "user:email"], // Permissions needed for GitHub repositories
};

/**
 * Validates OAuth configuration before use
 */
function validateOAuthConfig(config: AuthConfig): void {
	if (!config.clientId) {
		throw new Error(
			"GitHub OAuth client ID not configured. Set VITE_GITHUB_CLIENT_ID environment variable.",
		);
	}
}

/**
 * Helper function to initiate GitHub OAuth
 */
export async function authenticateWithGitHub(): Promise<void> {
	if (!desktopAuthService.isAvailable) {
		throw new Error("GitHub authentication only available in desktop app");
	}
	validateOAuthConfig(GITHUB_OAUTH_CONFIG);
	await desktopAuthService.initiateOAuth(GITHUB_OAUTH_CONFIG);
}

/**
 * Helper function to sign out
 */
export async function signOutGitHub(): Promise<void> {
	await desktopAuthService.signOut();
}
