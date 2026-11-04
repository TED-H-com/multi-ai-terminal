# Core Modules Documentation

This document provides a brief overview of the core modules in the Multi-AI Terminal (MAT) server.

## Adapters (`server/src/adapters`)
The adapters module provides the integration layer between MAT and different headless AI agent runtimes (e.g., Claude, Codex, Grok, Agy, OpenRouter).
- Standardizes diverse provider outputs (JSON-RPC, CLI streams) into the canonical MAT event schema (`AgentEvent`).
- Exposes a unified API (`Adapter`) for spawning agent processes and capturing generated content, thinking, and tool use.

## Engine (`server/src/engine`)
The engine module is the core workflow execution coordinator.
- **Run Management** (`runManager.ts`): Orchestrates run creation, status transitions, and shutdown/cleanup, managing concurrent execution queues.
- **Stage & Node Execution** (`stageRunner.ts`, `nodeRunner.ts`): Controls agent lifecycle per node, managing process spawning, aborts, timeouts, and stalls.
- **Artifact Handoff & Isolation** (`worktree.ts`): Implements per-node git worktree isolation, branching, and binary patch generation to safely capture agent edits.
- **Steering** (`steer.ts`): Processes live user instructions, supporting 'interrupt' (terminating current work and branching) or 'queue' modes.

## Orchestrator (`server/src/orchestrator`)
The orchestrator acts as the "manager" LLM within the pipeline.
- Evaluates the results (digests) of a completed workflow stage against the original task.
- Makes deterministic, JSON-parseable gate decisions: `advance` to the next stage, `retry` specific nodes with feedback (addendum), or `abort` the run.