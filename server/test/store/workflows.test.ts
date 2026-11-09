import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  WorkflowStoreError,
  listWorkflows,
  getWorkflow,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  duplicateWorkflow,
  configureWorkflowStore
} from '../../src/store/workflows.js';
import { type WorkflowDef } from '@mat/shared';

describe('workflows store', () => {
  let testDataDir: string;

  beforeEach(async () => {
    testDataDir = await mkdtemp(join(tmpdir(), 'mat-workflows-test-'));
    configureWorkflowStore(testDataDir);
  });

  afterEach(async () => {
    await rm(testDataDir, { recursive: true, force: true });
  });

  describe('listWorkflows', () => {
    it('returns builtin workflows', async () => {
      const workflows = await listWorkflows();
      expect(workflows.length).toBeGreaterThan(0);
      expect(workflows.every(w => w.builtin)).toBe(true);
    });
  });

  describe('getWorkflow', () => {
    it('returns a builtin workflow by id', async () => {
      const workflows = await listWorkflows();
      const workflow = await getWorkflow(workflows[0].id);
      expect(workflow).toBeDefined();
      expect(workflow.id).toBe(workflows[0].id);
    });

    it('throws NOT_FOUND for non-existent id', async () => {
      await expect(getWorkflow('does-not-exist')).rejects.toThrowError(WorkflowStoreError);
    });
  });

  describe('createWorkflow', () => {
    const validWorkflow = {
      schemaVersion: 1,
      id: 'custom-wf',
      name: 'Custom Workflow',
      description: 'A custom workflow',
      orchestrator: { enabled: true, agent: { provider: 'claude', model: 'sonnet', permission: 'auto' }, gateTimeoutSec: 300 },
      stages: [{ id: 'stage-1', name: 'stage', isolation: 'none', join: 'all', timeoutSec: 1800, stallSec: 240, gate: true, requireVerified: false, slots: [{ id: 'slot-1', label: 'Slot 1', promptTemplate: 'Template', agent: { provider: 'claude', model: 'sonnet', permission: 'auto' }, count: 1 }] }],
      maxParallel: 4,
      maxRetriesPerStage: 2
    } as unknown as WorkflowDef;

    it('creates a custom workflow successfully', async () => {
      const created = await createWorkflow(validWorkflow);
      expect(created.id).toBe('custom-wf');
      expect(created.builtin).toBeUndefined();

      const retrieved = await getWorkflow('custom-wf');
      expect(retrieved.name).toBe('Custom Workflow');
    });

    it('throws CONFLICT if id already exists', async () => {
      await createWorkflow(validWorkflow);
      await expect(createWorkflow(validWorkflow)).rejects.toThrow(WorkflowStoreError);
    });

    it('throws CONFLICT if id is a builtin id', async () => {
      const workflows = await listWorkflows();
      const builtinId = workflows[0].id;
      await expect(createWorkflow({ ...validWorkflow, id: builtinId })).rejects.toThrow(WorkflowStoreError);
    });

    it('throws INVALID_DATA for invalid id characters', async () => {
      await expect(createWorkflow({ ...validWorkflow, id: 'invalid id!' })).rejects.toThrow(WorkflowStoreError);
    });

    it('throws INVALID_DATA for invalid schema', async () => {
      await expect(createWorkflow({ id: 'bad-wf' } as unknown as WorkflowDef)).rejects.toThrow(WorkflowStoreError);
    });
  });

  describe('updateWorkflow', () => {
    const validWorkflow = {
      schemaVersion: 1,
      id: 'custom-wf',
      name: 'Custom Workflow',
      description: 'A custom workflow',
      orchestrator: { enabled: true, agent: { provider: 'claude', model: 'sonnet', permission: 'auto' }, gateTimeoutSec: 300 },
      stages: [{ id: 'stage-1', name: 'stage', isolation: 'none', join: 'all', timeoutSec: 1800, stallSec: 240, gate: true, requireVerified: false, slots: [{ id: 'slot-1', label: 'Slot 1', promptTemplate: 'Template', agent: { provider: 'claude', model: 'sonnet', permission: 'auto' }, count: 1 }] }],
      maxParallel: 4,
      maxRetriesPerStage: 2
    } as unknown as WorkflowDef;

    beforeEach(async () => {
      await createWorkflow(validWorkflow);
    });

    it('updates a custom workflow successfully', async () => {
      const updated = await updateWorkflow('custom-wf', { name: 'Updated Name' });
      expect(updated.name).toBe('Updated Name');

      const retrieved = await getWorkflow('custom-wf');
      expect(retrieved.name).toBe('Updated Name');
    });

    it('throws CONFLICT if attempting to change id', async () => {
      await expect(updateWorkflow('custom-wf', { id: 'new-id' })).rejects.toThrow(WorkflowStoreError);
    });

    it('throws CONFLICT if attempting to update builtin workflow', async () => {
      const workflows = await listWorkflows();
      const builtinId = workflows[0].id;
      await expect(updateWorkflow(builtinId, { name: 'New Name' })).rejects.toThrow(WorkflowStoreError);
    });
  });

  describe('deleteWorkflow', () => {
    const validWorkflow = {
      schemaVersion: 1,
      id: 'custom-wf',
      name: 'Custom Workflow',
      description: 'A custom workflow',
      orchestrator: { enabled: true, agent: { provider: 'claude', model: 'sonnet', permission: 'auto' }, gateTimeoutSec: 300 },
      stages: [{ id: 'stage-1', name: 'stage', isolation: 'none', join: 'all', timeoutSec: 1800, stallSec: 240, gate: true, requireVerified: false, slots: [{ id: 'slot-1', label: 'Slot 1', promptTemplate: 'Template', agent: { provider: 'claude', model: 'sonnet', permission: 'auto' }, count: 1 }] }],
      maxParallel: 4,
      maxRetriesPerStage: 2
    } as unknown as WorkflowDef;

    beforeEach(async () => {
      await createWorkflow(validWorkflow);
    });

    it('deletes a custom workflow successfully', async () => {
      await deleteWorkflow('custom-wf');
      await expect(getWorkflow('custom-wf')).rejects.toThrow(WorkflowStoreError);
    });

    it('throws CONFLICT if attempting to delete builtin workflow', async () => {
      const workflows = await listWorkflows();
      const builtinId = workflows[0].id;
      await expect(deleteWorkflow(builtinId)).rejects.toThrow(WorkflowStoreError);
    });

    it('throws NOT_FOUND if workflow does not exist', async () => {
      await expect(deleteWorkflow('does-not-exist')).rejects.toThrow(WorkflowStoreError);
    });
  });

  describe('duplicateWorkflow', () => {
    const validWorkflow = {
      schemaVersion: 1,
      id: 'custom-wf',
      name: 'Custom Workflow',
      description: 'A custom workflow',
      orchestrator: { enabled: true, agent: { provider: 'claude', model: 'sonnet', permission: 'auto' }, gateTimeoutSec: 300 },
      stages: [{ id: 'stage-1', name: 'stage', isolation: 'none', join: 'all', timeoutSec: 1800, stallSec: 240, gate: true, requireVerified: false, slots: [{ id: 'slot-1', label: 'Slot 1', promptTemplate: 'Template', agent: { provider: 'claude', model: 'sonnet', permission: 'auto' }, count: 1 }] }],
      maxParallel: 4,
      maxRetriesPerStage: 2
    } as unknown as WorkflowDef;

    beforeEach(async () => {
      await createWorkflow(validWorkflow);
    });

    it('creates a copy with -copy suffix', async () => {
      const copy = await duplicateWorkflow('custom-wf');
      expect(copy.id).toBe('custom-wf-copy');
      expect(copy.name).toBe('Custom Workflow Copy');
    });

    it('creates a copy with -copy-2 suffix when -copy exists', async () => {
      await duplicateWorkflow('custom-wf'); // creates custom-wf-copy
      const copy2 = await duplicateWorkflow('custom-wf'); // should create custom-wf-copy-2
      expect(copy2.id).toBe('custom-wf-copy-2');
    });
  });
});
