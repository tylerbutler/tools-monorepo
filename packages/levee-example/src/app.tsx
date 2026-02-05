/**
 * Main application entry point for the DiceRoller example.
 *
 * This module handles container lifecycle management:
 * - Creating new containers when no document ID is in the URL
 * - Loading existing containers from a document ID in the URL hash
 * - Rendering the React view when the container is ready
 */

import type { IContainer } from "@fluidframework/container-definitions/legacy";
import { Loader } from "@fluidframework/container-loader/legacy";
import type React from "react";
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

import {
	DiceRollerContainerCodeDetails,
	DiceRollerContainerFactory,
	getDiceRollerFromContainer,
} from "./containerCode.js";
import { DiceRollerView, type IDiceRoller } from "./diceRoller.js";
import { createLeveeDriver } from "./driver.js";

// Environment configuration from Vite
declare const __VITE_LEVEE_HTTP_URL__: string | undefined;
declare const __VITE_LEVEE_SOCKET_URL__: string | undefined;
declare const __VITE_LEVEE_TENANT_KEY__: string | undefined;

/**
 * Gets configuration from environment variables.
 */
function getConfig() {
	return {
		httpUrl:
			typeof __VITE_LEVEE_HTTP_URL__ !== "undefined"
				? __VITE_LEVEE_HTTP_URL__
				: undefined,
		socketUrl:
			typeof __VITE_LEVEE_SOCKET_URL__ !== "undefined"
				? __VITE_LEVEE_SOCKET_URL__
				: undefined,
		tenantKey:
			typeof __VITE_LEVEE_TENANT_KEY__ !== "undefined"
				? __VITE_LEVEE_TENANT_KEY__
				: undefined,
	};
}

/**
 * Gets the document ID from the URL hash.
 */
function getDocumentIdFromHash(): string | undefined {
	const hash = window.location.hash;
	if (hash.length > 1) {
		return hash.substring(1);
	}
	return undefined;
}

/**
 * Sets the document ID in the URL hash.
 */
function setDocumentIdInHash(documentId: string): void {
	window.location.hash = documentId;
}

/**
 * Generates a random document ID.
 */
function generateDocumentId(): string {
	const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
	let result = "";
	for (let i = 0; i < 12; i++) {
		result += chars[Math.floor(Math.random() * chars.length)];
	}
	return result;
}

/**
 * Application state.
 */
interface AppState {
	status: "loading" | "ready" | "error";
	diceRoller?: IDiceRoller;
	documentId?: string;
	error?: string;
}

/**
 * Main application component.
 */
function App(): React.ReactElement | null {
	const [state, setState] = useState<AppState>({ status: "loading" });

	useEffect(() => {
		async function initialize() {
			try {
				const config = getConfig();
				const driver = createLeveeDriver(config);

				const loader = new Loader({
					urlResolver: driver.urlResolver,
					documentServiceFactory: driver.documentServiceFactory,
					codeLoader: {
						load: async () => ({
							module: { fluidExport: DiceRollerContainerFactory },
							details: DiceRollerContainerCodeDetails,
						}),
					},
				});

				let documentId = getDocumentIdFromHash();
				let container: IContainer;

				if (documentId) {
					// Load existing container
					const request = driver.createLoadExistingRequest(documentId);
					container = await loader.resolve(request);
				} else {
					// Create new container
					documentId = generateDocumentId();
					const request = driver.createCreateNewRequest(documentId);
					container = await loader.createDetachedContainer(
						DiceRollerContainerCodeDetails,
					);
					await container.attach(request);
					setDocumentIdInHash(documentId);
				}

				const diceRoller = await getDiceRollerFromContainer(container);

				setState({
					status: "ready",
					diceRoller,
					documentId,
				});
			} catch (error) {
				setState({
					status: "error",
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}

		initialize().catch(() => {
			// Error handling is done inside initialize()
		});
	}, []);

	if (state.status === "loading") {
		return (
			<div style={styles.statusContainer}>
				<div style={styles.spinner} />
				<p>Connecting to Levee server...</p>
			</div>
		);
	}

	if (state.status === "error") {
		return (
			<div style={styles.statusContainer}>
				<h2 style={styles.errorTitle}>Connection Error</h2>
				<p style={styles.errorMessage}>{state.error}</p>
				<p style={styles.hint}>
					Make sure the Levee server is running:
					<br />
					<code>pnpm test:integration:up</code>
				</p>
				<button
					type="button"
					onClick={() => window.location.reload()}
					style={styles.retryButton}
				>
					Retry
				</button>
			</div>
		);
	}

	// At this point, state.status === "ready" so diceRoller is defined
	if (!state.diceRoller) {
		return null;
	}

	return (
		<div>
			<DiceRollerView diceRoller={state.diceRoller} />
			<div style={styles.footer}>
				<p>
					Document ID: <code>{state.documentId}</code>
				</p>
				<button
					type="button"
					onClick={() => {
						window.location.hash = "";
						window.location.reload();
					}}
					style={styles.newButton}
				>
					Create New Document
				</button>
			</div>
		</div>
	);
}

const styles: Record<string, React.CSSProperties> = {
	statusContainer: {
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		justifyContent: "center",
		padding: "40px",
		backgroundColor: "white",
		borderRadius: "12px",
		boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
		textAlign: "center",
	},
	spinner: {
		width: "40px",
		height: "40px",
		border: "4px solid #f3f3f3",
		borderTop: "4px solid #4CAF50",
		borderRadius: "50%",
		animation: "spin 1s linear infinite",
		marginBottom: "20px",
	},
	errorTitle: {
		color: "#d32f2f",
		margin: "0 0 10px 0",
	},
	errorMessage: {
		color: "#666",
		marginBottom: "20px",
	},
	hint: {
		fontSize: "14px",
		color: "#888",
		marginBottom: "20px",
	},
	retryButton: {
		padding: "10px 30px",
		fontSize: "16px",
		color: "white",
		backgroundColor: "#4CAF50",
		border: "none",
		borderRadius: "6px",
		cursor: "pointer",
	},
	footer: {
		marginTop: "20px",
		padding: "15px",
		backgroundColor: "white",
		borderRadius: "8px",
		boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
		textAlign: "center",
	},
	newButton: {
		padding: "8px 20px",
		fontSize: "14px",
		color: "#666",
		backgroundColor: "#f5f5f5",
		border: "1px solid #ddd",
		borderRadius: "6px",
		cursor: "pointer",
	},
};

// Add CSS animation for spinner
const styleElement = document.createElement("style");
styleElement.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleElement);

// Mount the application
const rootElement = document.getElementById("root");
if (!rootElement) {
	throw new Error("Root element not found");
}

const root = createRoot(rootElement);
root.render(<App />);
