import { describe, it, expect } from 'vitest';
import { EngineConflictError, EngineNotFoundError } from '../../src/engine/errors';

describe('Engine Errors', () => {
  it('EngineConflictError sets code and name correctly', () => {
    const error = new EngineConflictError('Conflict message');
    expect(error.message).toBe('Conflict message');
    expect(error.name).toBe('EngineConflictError');
    expect(error.code).toBe('CONFLICT');
    expect(error).toBeInstanceOf(Error);
  });

  it('EngineNotFoundError sets code and name correctly', () => {
    const error = new EngineNotFoundError('Not found message');
    expect(error.message).toBe('Not found message');
    expect(error.name).toBe('EngineNotFoundError');
    expect(error.code).toBe('NOT_FOUND');
    expect(error).toBeInstanceOf(Error);
  });
});
