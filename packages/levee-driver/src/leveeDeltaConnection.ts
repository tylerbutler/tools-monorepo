/**
 * Phoenix Channel-based delta connection for real-time ops.
 */

import type { IDisposable } from "@fluidframework/core-interfaces";
import type {
	ConnectionMode,
	IAnyDriverError,
	IClient,
	IClientConfiguration,
	IConnect,
	IDocumentDeltaConnection,
	IDocumentDeltaConnectionEvents,
	IDocumentMessage,
	INack,
	ISequencedDocumentMessage,
	ISignalClient,
	ISignalMessage,
	ITokenClaims,
} from "@fluidframework/driver-definitions/internal";
import { EventEmitterWithErrorHandling } from "@fluidframework/telemetry-utils/internal";
import { type Channel, Socket } from "phoenix";

import {
	type ConnectedResponse,
	type DisconnectReason,
	LeveeDebugLogger,
	normalizeConnectedResponse,
	normalizeOpPayload,
} from "./contracts.js";

/**
 * Timeout for channel join operations in milliseconds.
 */
const CHANNEL_JOIN_TIMEOUT_MS = 30000;

/**
 * Timeout for socket connection in milliseconds.
 */
const SOCKET_CONNECT_TIMEOUT_MS = 10000;

/**
 * Phoenix Channel-based implementation of IDocumentDeltaConnection.
 *
 * @remarks
 * This is the core real-time communication component that uses Phoenix Channels
 * instead of Socket.IO. It handles bidirectional message flow between the client
 * and the Levee server for operations and signals.
 *
 * @public
 */
export class LeveeDeltaConnection
	extends EventEmitterWithErrorHandling<IDocumentDeltaConnectionEvents>
	implements IDocumentDeltaConnection, IDisposable
{
	/**
	 * Creates a new delta connection to the specified document.
	 *
	 * @param socketUrl - WebSocket URL for Phoenix socket
	 * @param tenantId - Tenant ID
	 * @param documentId - Document ID
	 * @param token - Authentication token
	 * @param client - Client information
	 * @param mode - Connection mode (read or write)
	 * @param debug - Whether to enable debug logging
	 * @returns Promise resolving to the established connection
	 */
	public static async create(
		socketUrl: string,
		tenantId: string,
		documentId: string,
		token: string,
		client: IClient,
		mode: ConnectionMode = "write",
		debug?: boolean,
	): Promise<LeveeDeltaConnection> {
		const connection = new LeveeDeltaConnection(
			socketUrl,
			tenantId,
			documentId,
			token,
			client,
			mode,
			debug,
		);

		await connection.connect();
		return connection;
	}

	// IDocumentDeltaConnection properties
	public clientId = "";
	public claims: ITokenClaims = {} as ITokenClaims;
	public mode: ConnectionMode = "write";
	public existing = false;
	public maxMessageSize: number = 16 * 1024; // 16KB default
	public version = "0.1";
	public initialMessages: ISequencedDocumentMessage[] = [];
	public initialSignals: ISignalMessage[] = [];
	public initialClients: ISignalClient[] = [];
	public serviceConfiguration: IClientConfiguration = {
		blockSize: 64 * 1024, // 64KB
		maxMessageSize: 16 * 1024, // 16KB
	};
	public readonly checkpointSequenceNumber: number | undefined = undefined;

	// Internal state
	private socket: Socket | null = null;
	private channel: Channel | null = null;
	private _disposed = false;
	private earlyOpHandler: ((ops: ISequencedDocumentMessage[]) => void) | null =
		null;
	private earlySignalHandler: ((signal: ISignalMessage) => void) | null = null;
	private readonly queuedMessages: IDocumentMessage[] = [];
	private submitEnabled = false;

	private readonly socketUrl: string;
	private readonly tenantId: string;
	private readonly documentId: string;
	private readonly token: string;
	private readonly clientInfo: IClient;
	private readonly requestedMode: ConnectionMode;
	private readonly logger: LeveeDebugLogger;

	private constructor(
		socketUrl: string,
		tenantId: string,
		documentId: string,
		token: string,
		client: IClient,
		mode: ConnectionMode,
		debug?: boolean,
	) {
		super((eventName, error) =>
			// biome-ignore lint/suspicious/noConsole: error handler for event emitter
			console.error(`Error in event ${String(eventName)}:`, error),
		);

		this.socketUrl = socketUrl;
		this.tenantId = tenantId;
		this.documentId = documentId;
		this.token = token;
		this.clientInfo = client;
		this.requestedMode = mode;
		this.logger = new LeveeDebugLogger("DeltaConnection", debug);

		// Set up early handlers for messages that arrive before full setup
		this.earlyOpHandler = (ops: ISequencedDocumentMessage[]) => {
			this.initialMessages.push(...ops);
		};
		this.earlySignalHandler = (signal: ISignalMessage) => {
			this.initialSignals.push(signal);
		};
	}

	/**
	 * Whether this connection has been disposed.
	 */
	public get disposed(): boolean {
		return this._disposed;
	}

	/**
	 * Submits document operations to the server.
	 *
	 * @param messages - Array of document messages to submit
	 */
	public submit(messages: IDocumentMessage[]): void {
		if (this._disposed) {
			throw new Error("Connection has been disposed");
		}

		if (!this.submitEnabled) {
			// Queue messages until connection is fully established
			this.queuedMessages.push(...messages);
			return;
		}

		this.submitCore(messages);
	}

	/**
	 * Submits a signal to other clients.
	 *
	 * @param content - Signal content (JSON string)
	 * @param targetClientId - Optional target client ID for directed signals
	 */
	public submitSignal(content: string, targetClientId?: string): void {
		if (this._disposed) {
			throw new Error("Connection has been disposed");
		}

		if (!this.channel) {
			return;
		}

		const signalPayload = {
			clientId: this.clientId,
			content,
			targetClientId,
		};

		this.channel.push("submitSignal", signalPayload);
	}

	/**
	 * Disposes the connection and releases resources.
	 */
	public dispose(): void {
		if (this._disposed) {
			return;
		}

		this._disposed = true;

		// Leave channel gracefully
		if (this.channel) {
			this.channel.leave();
			this.channel = null;
		}

		// Disconnect socket
		if (this.socket) {
			this.socket.disconnect();
			this.socket = null;
		}

		this.removeAllListeners();
	}

	/**
	 * Establishes the WebSocket connection and joins the document channel.
	 */
	private async connect(): Promise<void> {
		this.logger.log(`Connecting to ${this.socketUrl}`);

		// Create Phoenix socket with auth token
		this.socket = new Socket(this.socketUrl, {
			params: { token: this.token },
			timeout: SOCKET_CONNECT_TIMEOUT_MS,
		});

		// Set up socket error handling
		this.socket.onError((error) => {
			this.handleError("Socket error", error);
		});

		this.socket.onClose(() => {
			this.handleDisconnect("server");
		});

		// Connect socket
		const socket = this.socket;
		await new Promise<void>((resolve, reject) => {
			const timeout = setTimeout(() => {
				reject(new Error("Socket connection timeout"));
			}, SOCKET_CONNECT_TIMEOUT_MS);

			socket.onOpen(() => {
				clearTimeout(timeout);
				this.logger.log("Socket connected");
				resolve();
			});

			socket.onError(() => {
				clearTimeout(timeout);
				reject(new Error("Socket connection failed"));
			});

			socket.connect();
		});

		// Create and join channel for this document
		const channelTopic = `document:${this.tenantId}:${this.documentId}`;
		this.logger.log(`Joining channel: ${channelTopic}`);
		this.channel = this.socket.channel(channelTopic, {
			token: this.token,
		});

		// Set up message handlers before joining
		this.setupChannelHandlers();

		// Join channel and wait for response
		const channel = this.channel;
		await new Promise<void>((resolve, reject) => {
			const timeout = setTimeout(() => {
				reject(new Error("Channel join timeout"));
			}, CHANNEL_JOIN_TIMEOUT_MS);

			channel
				.join()
				.receive("ok", () => {
					clearTimeout(timeout);
					this.logger.log("Channel joined successfully");
					resolve();
				})
				.receive("error", (error: unknown) => {
					clearTimeout(timeout);
					this.logger.log("Channel join error:", error);
					reject(new Error(`Channel join failed: ${JSON.stringify(error)}`));
				})
				.receive("timeout", () => {
					clearTimeout(timeout);
					reject(new Error("Channel join timeout"));
				});
		});

		// Send connect_document message
		// Per spec: Server responds via connect_document_success/connect_document_error events
		// (not via Phoenix reply pattern)
		const connectMessage: IConnect = {
			tenantId: this.tenantId,
			id: this.documentId,
			token: this.token,
			client: this.clientInfo,
			mode: this.requestedMode,
			versions: ["^0.4.0", "^0.3.0", "^0.2.0", "^0.1.0"],
		};

		this.logger.log("Sending connect_document:", connectMessage);

		const connectedResponse = await new Promise<ConnectedResponse>(
			(resolve, reject) => {
				const timeout = setTimeout(() => {
					// Clean up listeners on timeout
					channel.off("connect_document_success");
					channel.off("connect_document_error");
					reject(new Error("connect_document timeout"));
				}, CHANNEL_JOIN_TIMEOUT_MS);

				// Listen for success event (per spec)
				channel.on("connect_document_success", (rawResponse: unknown) => {
					clearTimeout(timeout);
					channel.off("connect_document_success");
					channel.off("connect_document_error");
					this.logger.log(
						"connect_document_success raw response:",
						rawResponse,
					);
					try {
						const normalized = normalizeConnectedResponse(rawResponse);
						this.logger.log("connect_document_success normalized:", normalized);
						resolve(normalized);
					} catch (err) {
						reject(
							new Error(
								`connect_document parse error: ${err instanceof Error ? err.message : String(err)}`,
							),
						);
					}
				});

				// Listen for error event (per spec)
				channel.on(
					"connect_document_error",
					(error: { code?: number; message?: string }) => {
						clearTimeout(timeout);
						channel.off("connect_document_success");
						channel.off("connect_document_error");
						this.logger.log("connect_document_error:", error);
						reject(
							new Error(
								`connect_document failed: ${error.message ?? JSON.stringify(error)}`,
							),
						);
					},
				);

				// Send the connect_document message
				channel.push("connect_document", connectMessage);
			},
		);

		// Store connection info
		this.clientId = connectedResponse.clientId;
		this.claims = connectedResponse.claims;
		this.mode = connectedResponse.mode;
		this.existing = connectedResponse.existing;
		this.maxMessageSize = connectedResponse.maxMessageSize;
		this.version = connectedResponse.version;
		this.serviceConfiguration = {
			...this.serviceConfiguration,
			...connectedResponse.serviceConfiguration,
		};

		// Merge any early messages with initial messages from response
		this.initialMessages = [
			...connectedResponse.initialMessages,
			...this.initialMessages,
		];
		this.initialSignals = [
			...connectedResponse.initialSignals,
			...this.initialSignals,
		];
		this.initialClients = connectedResponse.initialClients;

		// Ensure the self client is in initialClients.
		// The Fluid Framework's ConnectionManager synthesizes ClientJoin signals from
		// initialClients to populate the signal audience. If the self client is missing,
		// the presence system's clientToSessionId mapping won't be initialized, causing
		// assertion failures in sendQueuedMessage.
		const selfInClients = this.initialClients.some(
			(c) => c.clientId === this.clientId,
		);
		if (!selfInClients) {
			this.initialClients.push({
				clientId: this.clientId,
				client: this.clientInfo,
			});
		}

		this.logger.log(
			`Connected as client: ${this.clientId}, mode: ${this.mode}, existing: ${this.existing}`,
		);

		// Clear early handlers and enable normal message flow
		this.earlyOpHandler = null;
		this.earlySignalHandler = null;

		// Enable submit and flush queued messages
		this.submitEnabled = true;
		if (this.queuedMessages.length > 0) {
			this.logger.log(`Flushing ${this.queuedMessages.length} queued messages`);
			this.submitCore(this.queuedMessages);
			this.queuedMessages.length = 0;
		}
	}

	/**
	 * Sets up channel event handlers.
	 */
	private setupChannelHandlers(): void {
		if (!this.channel) {
			return;
		}

		// Handle incoming operations
		this.channel.on("op", (rawPayload: unknown) => {
			if (this._disposed) {
				return;
			}

			this.logger.log("Received op event (raw):", rawPayload);
			const { documentId, ops } = normalizeOpPayload(
				rawPayload,
				this.documentId,
			);
			this.logger.log("Received op event (normalized):", { documentId, ops });

			if (this.earlyOpHandler) {
				this.earlyOpHandler(ops);
			} else {
				this.emit("op", documentId, ops);
			}
		});

		// Handle incoming signals
		this.channel.on("signal", (payload: ISignalMessage | ISignalMessage[]) => {
			if (this._disposed) {
				return;
			}

			this.logger.log("Received signal:", payload);

			if (this.earlySignalHandler) {
				const signals = Array.isArray(payload) ? payload : [payload];
				for (const signal of signals) {
					this.earlySignalHandler(signal);
				}
			} else {
				this.emit("signal", payload);
			}
		});

		// Handle nacks (negative acknowledgments)
		this.channel.on("nack", (payload: INack) => {
			if (this._disposed) {
				return;
			}

			this.logger.log("Received nack:", payload);
			this.emit("nack", this.documentId, [payload]);
		});

		// Handle pong (keepalive response)
		this.channel.on("pong", (payload: { latency: number }) => {
			if (this._disposed) {
				return;
			}
			this.emit("pong", payload.latency);
		});

		// Handle channel close
		this.channel.onClose(() => {
			this.logger.log("Channel closed");
			this.handleDisconnect("server");
		});

		// Handle channel errors
		this.channel.onError((error: unknown) => {
			this.logger.log("Channel error:", error);
			this.handleError("Channel error", error);
		});
	}

	/**
	 * Submits operations to the channel.
	 */
	private submitCore(messages: IDocumentMessage[]): void {
		if (!this.channel || this._disposed) {
			return;
		}

		// Convert to the format expected by the server
		const opMessages = messages.map((msg) => ({
			type: msg.type,
			contents: msg.contents,
			clientSequenceNumber: msg.clientSequenceNumber,
			referenceSequenceNumber: msg.referenceSequenceNumber,
			metadata: msg.metadata as Record<string, unknown> | undefined,
			compression: msg.compression,
		}));

		const payload = {
			clientId: this.clientId,
			messages: opMessages,
		};

		this.logger.log("Submitting ops:", payload);
		this.channel.push("submitOp", payload);
	}

	/**
	 * Handles connection errors.
	 */
	private handleError(context: string, error: unknown): void {
		if (this._disposed) {
			return;
		}

		// biome-ignore lint/suspicious/noConsole: intentional error logging
		console.error(`${context}:`, error);

		const errorObj =
			error instanceof Error
				? error
				: new Error(error ? String(error) : "Unknown error");

		this.emit("error", errorObj);
	}

	/**
	 * Handles disconnection.
	 */
	private handleDisconnect(_reason: DisconnectReason): void {
		if (this._disposed) {
			return;
		}

		// Create a driver error for disconnect
		const disconnectError: IAnyDriverError = {
			errorType: "genericNetworkError",
			canRetry: true,
			message: `Disconnected: ${_reason}`,
		};

		this.emit("disconnect", disconnectError);
	}
}
