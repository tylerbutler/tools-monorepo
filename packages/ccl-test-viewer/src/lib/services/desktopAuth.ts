/**
 * Desktop GitHub Authentication Service
 * Placeholder for future OAuth implementation in Tauri desktop app
 */

import { isTauriEnvironment } from "./tauriFileService";

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

	constructor() {
		// Initialize authentication state from local storage
		this.loadAuthState();
	}

	// Getters
	get isAuthenticated() {
		return this._isAuthenticated;
	}

	get currentUser() {
		return this._currentUser;
	}

	get authToken() {
		return this._authToken;
	}

	get isAvailable() {
		return isTauriEnvironment();
	}

	/**
	 * Initialize OAuth flow (placeholder)
	 * In a real implementation, this would:
	 * 1. Open OAuth URL in system browser
	 * 2. Listen for callback via deep link
	 * 3. Exchange code for access token
	 */
	async initiateOAuth(config: AuthConfig): Promise<AuthToken> {
		if (!this.isAvailable) {
			throw new Error("Desktop OAuth only available in Tauri app");
		}

		// Placeholder implementation
		console.log("OAuth flow would be initiated here with config:", config);

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
	async signOut(): Promise<void> {
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
	isTokenValid(): boolean {
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
	getAuthenticatedClient(): { headers: Record<string, string> } | null {
		if (!this.isTokenValid()) {
			return null;
		}

		return {
			headers: {
				Authorization: `${this._authToken!.tokenType} ${this._authToken!.accessToken}`,
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

		try {
			// In real implementation, would load from Tauri local storage
			// const stored = await readTextFile('auth-state.json', { baseDir: BaseDirectory.AppLocalData });
			// const authData = JSON.parse(stored);

			// For now, just placeholder
			console.log("Loading auth state from local storage...");
		} catch (error) {
			console.log("No previous auth state found");
		}
	}

	/**
	 * Store authentication state to local storage
	 */
	private async storeAuthToken(token: AuthToken): Promise<void> {
		this._authToken = token;
		this._isAuthenticated = true;

		if (this.isAvailable) {
			try {
				// In real implementation, would save to Tauri local storage
				// const authData = { token, user: this._currentUser };
				// await writeTextFile('auth-state.json', JSON.stringify(authData), {
				//   baseDir: BaseDirectory.AppLocalData
				// });

				console.log("Storing auth token to local storage...");
			} catch (error) {
				console.error("Failed to store auth token:", error);
			}
		}
	}

	/**
	 * Clear authentication state from local storage
	 */
	private async clearAuthState(): Promise<void> {
		try {
			// In real implementation, would remove from Tauri local storage
			// await removeFile('auth-state.json', { baseDir: BaseDirectory.AppLocalData });

			console.log("Clearing auth state from local storage...");
		} catch (error) {
			console.error("Failed to clear auth state:", error);
		}
	}

	/**
	 * Fetch user information from GitHub API
	 */
	private async fetchUserInfo(): Promise<void> {
		const client = this.getAuthenticatedClient();
		if (!client) {
			throw new Error("No valid authentication token");
		}

		try {
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
		} catch (error) {
			console.error("Failed to fetch user info:", error);
			throw error;
		}
	}
}

// Create singleton instance
export const desktopAuthService = new DesktopAuthService();

/**
 * Configuration for GitHub OAuth in desktop app
 */
export const GITHUB_OAUTH_CONFIG: AuthConfig = {
	clientId: "your-github-app-client-id", // Would be configured for production
	redirectUri: "ccl-test-viewer://oauth/callback", // Deep link for Tauri
	scopes: ["repo", "user:email"], // Permissions needed for GitHub repositories
};

/**
 * Helper function to initiate GitHub OAuth
 */
export async function authenticateWithGitHub(): Promise<void> {
	if (!desktopAuthService.isAvailable) {
		throw new Error("GitHub authentication only available in desktop app");
	}

	try {
		await desktopAuthService.initiateOAuth(GITHUB_OAUTH_CONFIG);
	} catch (error) {
		console.error("GitHub authentication failed:", error);
		throw error;
	}
}

/**
 * Helper function to sign out
 */
export async function signOutGitHub(): Promise<void> {
	await desktopAuthService.signOut();
}
