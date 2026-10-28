import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NodeOutcome, ResolvedNodeSpec, SpawnedNode } from '../../src/adapters/base.js';
import { CliSessionManager, type CliTransport } from '../../src/providers/cli/manager.js';
import { resetAgySessionRuntimeForTest } from '../../src/providers/agy/runtime.js';
import { resetGrokSessionRuntimeForTest } from '../../src/providers/grok/runtime.js';

const spec = (
  provider: 'grok' | 'agy',
  promptText: string,
  resumeSessionRef?: string,
): ResolvedNodeSpec => ({
  binding: { provider, permission: 'auto' },
  promptText,
  cwd: '/repo',
  ...(resumeSessionRef ? { resumeSessionRef } : {}),
});

interface ControlledSpawn {
  spec: ResolvedNodeSpec;
  io: Parameters<CliTransport>[1];
  pid: number;
  kill: ReturnType<typeof vi.fn<(signal?: NodeJS.Signals) => void>>;
  resolve(outcome: NodeOutcome): void;
  reject(error: unknown): void;
}

function controlledTransport(): { spawn: CliTransport; calls: ControlledSpawn[] } {
  const calls: ControlledSpawn[] = [];
  const spawn: CliTransport = (nodeSpec, spawnIo): SpawnedNode => {
    let resolve!: (outcome: NodeOutcome) => void;
    let reject!: (error: unknown) => void;
    const completion = new Promise<NodeOutcome>((done, fail) => { resolve = done; reject = fail; });
    const call: ControlledSpawn = {
      spec: nodeSpec,
      io: spawnIo,
      pid: 10_000 + calls.length,
      kill: vi.fn(),
      resolve,
      reject,
    };
    calls.push(call);
    return { pid: call.pid, kill: call.kill, completion };
  };
  return { spawn, calls };
}

afterEach(() => {
  resetGrokSessionRuntimeForTest();
  resetAgySessionRuntimeForTest();
  delete process.env.MAT_CLI_MANAGER_TEST_SECRET;
});

describe('CLI Session Switching E2E', () => {
  it('switches between agents, buffers stdout streams, and persists command history', async () => {
    const grokTransport = controlledTransport();
    const agyTransport = controlledTransport();

    const grokManager = new CliSessionManager({
      provider: 'grok',
      resumable: true,
      spawn: grokTransport.spawn,
      createSessionId: () => 'fresh-grok',
    });

    const agyManager = new CliSessionManager({
      provider: 'agy',
      resumable: true,
      spawn: agyTransport.spawn,
      createSessionId: () => 'fresh-agy',
    });

    const outputBuffer: { type: string; data: string }[] = [];
    const bufferedIo = {
      onEvent: (event: any) => outputBuffer.push({ type: 'event', data: JSON.stringify(event) }),
      onRaw: (line: string, stream: string) => outputBuffer.push({ type: 'raw', data: `[${stream}] ${line}` }),
    };

    // Agent switching and history
    const first = grokManager.startRun(spec('grok', 'command 1', 'shared-session'), bufferedIo);
    grokTransport.calls[0]!.io.onRaw('output 1', 'stdout');
    grokTransport.calls[0]!.resolve({ exitCode: 0, sessionRef: 'shared-session', resultText: 'done 1' });
    await first.completion;

    const second = agyManager.startRun(spec('agy', 'command 2', 'shared-session'), bufferedIo);
    agyTransport.calls[0]!.io.onRaw('output 2', 'stdout');
    agyTransport.calls[0]!.resolve({ exitCode: 0, sessionRef: 'shared-session', resultText: 'done 2' });
    await second.completion;

    const third = grokManager.startRun(spec('grok', 'command 3', 'shared-session'), bufferedIo);
    grokTransport.calls[1]!.io.onRaw('output 3', 'stdout');
    grokTransport.calls[1]!.resolve({ exitCode: 0, sessionRef: 'shared-session', resultText: 'done 3' });
    await third.completion;

    expect(grokTransport.calls.length).toBe(2);
    expect(agyTransport.calls.length).toBe(1);

    expect(grokTransport.calls.map(c => c.spec.promptText)).toEqual(['command 1', 'command 3']);
    expect(agyTransport.calls.map(c => c.spec.promptText)).toEqual(['command 2']);

    // Validate stream buffering
    expect(outputBuffer).toEqual([
      { type: 'raw', data: '[stdout] output 1' },
      { type: 'raw', data: '[stdout] output 2' },
      { type: 'raw', data: '[stdout] output 3' }
    ]);
  }, 30_000);
});
