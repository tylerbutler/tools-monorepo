/* This file is auto-generated from Gleam protocol types. Do not edit manually. */

export interface ProtocolSchema {
  Client?: Client;
  ClientCapabilities?: ClientCapabilities;
  ClientDetails?: ClientDetails;
  ConnectionMode?: ConnectionMode;
  DocumentMessage?: DocumentMessage;
  MessageOrigin?: MessageOrigin;
  Scope?: Scope;
  SequencedClient?: SequencedClient;
  SequencedDocumentMessage?: SequencedDocumentMessage;
  ServiceConfiguration?: ServiceConfiguration;
  SignalClient?: SignalClient;
  TokenClaims?: TokenClaims;
  Trace?: Trace;
  User?: User;
}
export interface Client {
  details: ClientDetails;
  mode: {
    enum: "write" | "read";
  };
  permission: string[];
  scopes: string[];
  timestamp?: number;
  user: User;
}
export interface ClientDetails {
  capabilities: ClientCapabilities;
  client_type?: string;
  device?: string;
  environment?: string;
}
export interface ClientCapabilities {
  interactive: boolean;
}
export interface User {
  id: string;
  properties: {
    [k: string]: {
      [k: string]: unknown;
    };
  };
}
export interface ConnectionMode {
  enum: "write" | "read";
}
export interface DocumentMessage {
  client_sequence_number: number;
  compression?: string;
  contents: {
    [k: string]: unknown;
  };
  message_type: string;
  metadata?: {
    [k: string]: unknown;
  };
  reference_sequence_number: number;
  server_metadata?: {
    [k: string]: unknown;
  };
  traces?: Trace[];
}
export interface Trace {
  action: string;
  service: string;
  timestamp: number;
}
export interface MessageOrigin {
  id: string;
  minimum_sequence_number: number;
  sequence_number: number;
}
export interface Scope {
  enum: "doc:read" | "doc:write" | "summary:write";
}
export interface SequencedClient {
  client: Client;
  sequence_number: number;
}
export interface SequencedDocumentMessage {
  client_id?: string | null;
  client_sequence_number: number;
  contents: {
    [k: string]: unknown;
  };
  data?: string;
  message_type: string;
  metadata?: {
    [k: string]: unknown;
  };
  minimum_sequence_number: number;
  origin?: MessageOrigin;
  reference_sequence_number: number;
  sequence_number: number;
  server_metadata?: {
    [k: string]: unknown;
  };
  timestamp: number;
  traces?: Trace[];
}
export interface ServiceConfiguration {
  block_size: number;
  max_message_size: number;
  noop_count_frequency?: number;
  noop_time_frequency?: number;
}
export interface SignalClient {
  client: Client;
  client_connection_number?: number;
  client_id: string;
  reference_sequence_number?: number;
}
export interface TokenClaims {
  document_id: string;
  expiration: number;
  issued_at: number;
  jti?: string;
  scopes: string[];
  tenant_id: string;
  user: User;
  version: string;
}
