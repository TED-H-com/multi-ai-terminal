import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ApiClient, ApiError } from './client.js';

describe('ApiClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('handles token configuration', () => {
    const client = new ApiClient({ token: 'test-token' });
    expect(client.token).toBe('test-token');

    const clientFn = new ApiClient({ token: () => 'dynamic-token' });
    expect(clientFn.token).toBe('dynamic-token');
  });

  it('handles success response', async () => {
    const mockFetch = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, version: '1.0' })
    } as any);

    const client = new ApiClient();
    const res = await client.health();
    expect(res).toEqual({ ok: true, version: '1.0' });
    expect(mockFetch).toHaveBeenCalledWith('/api/health', expect.any(Object));
  });

  it('handles 204 no content', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 204
    } as any);

    const client = new ApiClient();
    const res = await client.request('/empty');
    expect(res).toBeUndefined();
  });

  it('handles text response', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => 'hello'
    } as any);

    const client = new ApiClient();
    const res = await client.request('/text', { response: 'text' });
    expect(res).toBe('hello');
  });

  it('handles blob response', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      blob: async () => new Blob(['hello'])
    } as any);

    const client = new ApiClient();
    const res = await client.request('/blob', { response: 'blob' });
    expect(res).toBeInstanceOf(Blob);
  });

  it('handles JSON error response', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: async () => ({ error: { message: 'Invalid data', code: 'INVALID_DATA' } })
    } as any);

    const client = new ApiClient();
    let err: ApiError | undefined;
    try {
      await client.request('/error');
    } catch (e: any) {
      err = e;
    }

    expect(err).toBeInstanceOf(ApiError);
    expect(err?.status).toBe(400);
    expect(err?.message).toBe('Invalid data');
    expect(err?.code).toBe('INVALID_DATA');
  });

  it('handles non-JSON error response', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => { throw new Error('Not JSON'); }
    } as any);

    const client = new ApiClient();
    let err: ApiError | undefined;
    try {
      await client.request('/error');
    } catch (e: any) {
      err = e;
    }

    expect(err).toBeInstanceOf(ApiError);
    expect(err?.status).toBe(500);
    expect(err?.message).toBe('500 Internal Server Error');
    expect(err?.code).toBe('HTTP_ERROR');
  });

  it('sends POST requests with body', async () => {
      const mockFetch = vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({})
      } as any);

      const client = new ApiClient({ token: 'test-token' });
      await client.createWorkspace({ name: 'test', path: '/test' });

      expect(mockFetch).toHaveBeenCalledWith('/api/workspaces', expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'test', path: '/test' }),
          headers: expect.any(Headers)
      }));

      const lastCall = mockFetch.mock.lastCall?.[1];
      const headers = lastCall?.headers as Headers;
      expect(headers.get('content-type')).toBe('application/json');
      expect(headers.get('authorization')).toBe('Bearer test-token');
  });

  it('builds query strings properly', async () => {
      const mockFetch = vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({})
      } as any);

      const client = new ApiClient();
      await client.getRuns({ workspaceId: 'ws-1', limit: 10 });

      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/runs?workspaceId=ws-1&limit=10'), expect.any(Object));
  });

  it('covers all generated endpoints', async () => {
    const mockFetch = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
      text: async () => 'text',
      blob: async () => new Blob()
    } as any);

    const client = new ApiClient();
    await client.getProviders();
    await client.getOpenRouterModels();
    await client.getRuntimes();
    await client.installRuntime('claude');
    await client.clearRuntime('codex');
    await client.refreshProviders();
    await client.installProvider('test');
    await client.updateProvider('test');
    await client.startSignIn('test');
    await client.signInStatus('test', '123');
    await client.submitSignInCode('test', '123', 'code');
    await client.cancelSignIn('test', '123');
    await client.getClaudeAccounts();
    await client.getCodexAccounts();
    await client.captureCodexAccount();
    await client.switchCodexAccount('acc1');
    await client.removeCodexAccount('acc1');
    await client.getCodexApiKey();
    await client.setCodexApiKey('key');
    await client.clearCodexApiKey();
    await client.getWorkspaces();
    await client.getWorkspace('ws1');
    await client.updateWorkspace('ws1', {});
    await client.deleteWorkspace('ws1');
    await client.getWorkflows();
    await client.createWorkflow({} as any);
    await client.updateWorkflow('wf1', {});
    await client.deleteWorkflow('wf1');
    await client.duplicateWorkflow('wf1');
    await client.createRun({} as any);
    await client.getRun('r1');
    await client.getEvents('r1');
    await client.getReport('r1');
    await client.getDebugBundle('r1');
    await client.getPatch('r1', 'nr1');
    await client.abortRun('r1');
    await client.killNode('r1', 'nr1');
    await client.retryStage('r1', 's1');
    await client.steerRun('r1', {} as any);
    await client.clientLog({ level: 'error', message: 'test' });
    await client.getServerLog();
    await client.applyPatch('r1', 'nr1');
    await client.deleteRun('r1');

    expect(mockFetch).toHaveBeenCalled();
  });
});
