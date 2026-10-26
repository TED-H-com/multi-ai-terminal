# IPC Protocol Message Schemas

The Multi-AI Terminal uses structured message schemas for communication between the server, provider runtimes, and the web client.

## WebSocket API (Client-Server IPC)

The WebSocket connection streams normalized real-time evidence to the browser UI.

### Client Messages (`WsClientMsg`)
- **`sub`**: Subscribe to live events for a specific run (`{ type: 'sub', runId: string }`).
- **`unsub`**: Unsubscribe from a run's events (`{ type: 'unsub', runId: string }`).

### Server Messages (`WsServerMsg`)
- **`event`**: A new normalized agent or lifecycle event (`{ type: 'event', event: AgentEvent }`). Broadcast strictly after durable append to the run's event log.
- **`run`**: A snapshot of the current run state (`{ type: 'run', run: RunSnapshot }`).
- **`workspaces`**: Invalidation ping to refresh workspace lists (`{ type: 'workspaces' }`).

## Provider Runtime Events

The server communicates with provider runtimes (e.g., Claude Agent SDK, Codex app-server) using a canonical 19-event contract defined in `shared/src/providerEvents.ts`. These events are bridged to the engine and transformed into normalized `AgentEvent` records before client broadcast.

### Core Content Events
- **`claude:message`**: Agent text generation (`role`, `content`, `thinking`).
- **`claude:tool-use`**: Tool invocation requests (`toolName`, `input`, `status: 'running'`).
- **`claude:tool-result`**: Results from executed tools (`status: 'completed' | 'error'`, `result`).
- **`claude:stream`**: Incremental generation chunks containing `text` or `thinking`.

### Lifecycle and State Events
- **`claude:status`**: Full `ProviderSessionMeta` metadata snapshots.
- **`claude:turn-end`**: Terminal marker for a provider turn (`reason: 'completed' | 'error' | 'interrupted' | 'aborted'`, `usage`).
- **`claude:error`**: Fatal provider or transport errors.
- **`claude:rate-limit`**: Rate limit utilization and backoff resets.
- **`claude:worktree-info`**: Git worktree branch and path isolation context.

## Codex App-Server JSON-RPC

For the Codex app-server integration, IPC occurs over standard I/O (stdin/stdout) using a JSON-RPC-like structure managed by `CodexConnection`:
- **Requests/Notifications**: Sent to the app-server as JSON objects with `method` and `params`.
- **Responses**: Received as JSON objects resolving pending requests, mapped to session threads, or emitting runtime state changes.
