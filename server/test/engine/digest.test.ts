import { mkdtempSync, writeFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { NodeRun } from '@mat/shared';
import { assembleArtifacts, buildDigest, digestResultBudget, recordToolUse, resetToolCount, patchStat } from '../../src/engine/digest.js';

const dirs: string[] = [];
const node = (id: string, resultText = 'answer', provider: NodeRun['agent']['provider'] = 'mock'): NodeRun => ({
  nodeRunId: id, stageId: 's', slotId: id, instanceIndex: 0, agent: { provider, permission: 'safe' }, label: id,
  status: 'done', attempt: 1, cwd: '/', startedAt: 10, endedAt: 20, resultText,
});

afterEach(async () => Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true }))));

describe('fan-in digest', () => {
  it('clamps deterministic per-candidate budgets at every edge', () => {
    expect(digestResultBudget(0)).toBe(6000);
    expect(digestResultBudget(-1)).toBe(6000);
    expect(digestResultBudget(1)).toBe(6000);
    expect(digestResultBudget(4)).toBe(6000);
    expect(digestResultBudget(5)).toBe(4800);
    expect(digestResultBudget(12)).toBe(2000);
    expect(digestResultBudget(100)).toBe(800);
  });

  it('preserves supplied slot/instance order, tail-truncates, and marks grok tools n/a', () => {
    const digest = buildDigest([node('z', 'a'.repeat(7000)), node('a', 'grok', 'grok')]);
    expect(digest.indexOf('## z')).toBeLessThan(digest.indexOf('## a'));
    expect(digest).toContain('…[truncated]');
    expect(digest).toContain('tool-calls: n/a');
  });

  it('resets tool-call counts between attempts', () => {
    const candidate = node('candidate');
    recordToolUse(candidate);
    expect(buildDigest([candidate])).toContain('tool-calls: 1');
    resetToolCount(candidate);
    expect(buildDigest([candidate])).toContain('tool-calls: 0');
  });

  it.each([
    [{ status: 'passed', command: 'npm test', durationMs: 1500 }, 'verification: passed (npm test, 1.5s)'],
    [{ status: 'failed', exitCode: 1, durationMs: 200, outputTail: 'assertion failed' }, 'verification: failed (exit 1, 0.2s)'],
    [{ status: 'error', reason: 'timeout', outputTail: 'hung' }, 'verification: error (timeout)'],
    [{ status: 'skipped', reason: 'no-changes' }, 'verification: skipped (no-changes)'],
  ] as const)('includes normalized verification evidence for %s', (verification, expected) => {
    const candidate = { ...node('verified'), verification } as NodeRun;
    const digest = buildDigest([candidate]);
    expect(digest).toContain(expected);
    if (verification.status === 'failed' || verification.status === 'error') expect(digest).toContain('verification-output:');
  });

  it('marks absent verification as n/a', () => expect(buildDigest([node('plain')])).toContain('verification: n/a'));

  it('assembles patch headers and paths under the 30k cap', () => {
    const dir = mkdtempSync(join(tmpdir(), 'mat-digest-')); dirs.push(dir);
    const first = join(dir, 'one.patch');
    const second = join(dir, 'two.patch');
    writeFileSync(first, 'x'.repeat(20_000));
    writeFileSync(second, 'y'.repeat(20_000));
    const one = { ...node('one'), patchFile: first };
    const two = { ...node('two'), patchFile: second };
    const artifacts = assembleArtifacts([one, two]);
    expect(artifacts.patches).toContain('--- patch one (one) ---');
    expect(artifacts.patches).toContain('…[patches truncated]');
    expect(artifacts.patches.length).toBeLessThanOrEqual(30_000);
    expect(artifacts.artifactPaths).toBe(`${first}\n${second}`);
  });

  it('formats usage correctly', () => {
      const nodeUsage = { ...node('usage-node') };
      nodeUsage.usage = { inputTokens: 10, outputTokens: 20, costUsd: 0.001 };
      const digest = buildDigest([nodeUsage]);
      expect(digest).toContain('usage: in=10 out=20 cost=$0.0010');

      const emptyUsage = { ...node('empty-usage') };
      expect(buildDigest([emptyUsage])).toContain('usage: n/a');
  });

  it('patchStat handles undefined/missing path and correctly parses a patch', () => {
      expect(patchStat(undefined)).toBe('n/a');
      expect(patchStat('nonexistent-path')).toBe('n/a');

      const dir = mkdtempSync(join(tmpdir(), 'mat-patch-stat-')); dirs.push(dir);
      const patchPath = join(dir, 'test.patch');
      writeFileSync(patchPath, 'diff --git a/file1 b/file1\n--- a/file1\n+++ b/file1\n+added line\n-deleted line\n+another added line\ndiff --git a/file2 b/file2\n--- a/file2\n+++ b/file2\n-deleted from file2');

      expect(patchStat(patchPath)).toBe('2 files, +2/-2');
  });

  it('lastError handles different node statuses correctly', () => {
      const failedWithResult = { ...node('failed-result') };
      failedWithResult.status = 'failed';
      failedWithResult.resultText = 'specific error message';
      expect(buildDigest([failedWithResult])).toContain('last-error: specific error message');

      const failedWithExitCode = { ...node('failed-exitcode') };
      failedWithExitCode.status = 'failed';
      failedWithExitCode.resultText = undefined;
      failedWithExitCode.exitCode = 127;
      expect(buildDigest([failedWithExitCode])).toContain('last-error: exit 127');

      const failedNoDetails = { ...node('failed-nodetails') };
      failedNoDetails.status = 'failed';
      failedNoDetails.resultText = undefined;
      expect(buildDigest([failedNoDetails])).toContain('last-error: failed');

      const killedNode = { ...node('killed-node') };
      killedNode.status = 'killed';
      expect(buildDigest([killedNode])).toContain('last-error: killed');
  });

  it('buildDigest handles interruptedPartial option correctly', () => {
      const killedNode = { ...node('killed-partial') };
      killedNode.status = 'killed';
      expect(buildDigest([killedNode], { interruptedPartial: true })).toContain('[interrupted partial]');
  });
});
