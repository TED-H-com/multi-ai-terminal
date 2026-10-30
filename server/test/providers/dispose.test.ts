import { describe, expect, it, vi } from 'vitest';
import * as agyRuntime from '../../src/providers/agy/runtime.js';
import * as claudeRuntime from '../../src/providers/claude/runtime.js';
import * as codexRuntime from '../../src/providers/codex/runtime.js';
import * as grokRuntime from '../../src/providers/grok/runtime.js';
import * as openRouterRuntime from '../../src/providers/openrouter/runtime.js';
import { disposeProviderRuntimes } from '../../src/providers/dispose.js';

describe('disposeProviderRuntimes', () => {
  it('calls all dispose functions', async () => {
    const disposeAgySessionRuntimeSpy = vi.spyOn(agyRuntime, 'disposeAgySessionRuntime').mockImplementation(() => {});
    const disposeGrokSessionRuntimeSpy = vi.spyOn(grokRuntime, 'disposeGrokSessionRuntime').mockImplementation(() => {});
    const disposeClaudeSessionRuntimeSpy = vi.spyOn(claudeRuntime, 'disposeClaudeSessionRuntime').mockResolvedValue(undefined);
    const disposeCodexSessionRuntimeSpy = vi.spyOn(codexRuntime, 'disposeCodexSessionRuntime').mockResolvedValue(undefined);
    const disposeOpenRouterSessionRuntimeSpy = vi.spyOn(openRouterRuntime, 'disposeOpenRouterSessionRuntime').mockResolvedValue(undefined);

    await disposeProviderRuntimes();

    expect(disposeAgySessionRuntimeSpy).toHaveBeenCalledOnce();
    expect(disposeGrokSessionRuntimeSpy).toHaveBeenCalledOnce();
    expect(disposeClaudeSessionRuntimeSpy).toHaveBeenCalledOnce();
    expect(disposeCodexSessionRuntimeSpy).toHaveBeenCalledOnce();
    expect(disposeOpenRouterSessionRuntimeSpy).toHaveBeenCalledOnce();
  });
});
