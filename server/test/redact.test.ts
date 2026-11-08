import { describe, expect, it } from 'vitest';
import { redactEnvironmentValues, redactJsonValue, environmentRedactionTokens, redactDiagnosticValue } from '../src/redact.js';

describe('environment-value redaction', () => {
  it('covers ordinary environment names, exact short values, and embedded short credentials', () => {
    const environment = {
      MAT_ORDINARY_MARKER: 'ordinary-value-71e6',
      MAT_SHORT_VALUE: 'q',
      MAT_API_TOKEN: 'xy',
    };
    expect(redactEnvironmentValues('ordinary-value-71e6 / xy / q', environment)).toBe('[REDACTED_ENV] / [REDACTED_ENV] / q');
    expect(redactEnvironmentValues('q', environment)).toBe('[REDACTED_ENV]');
    expect(redactJsonValue({ detail: 'ordinary-value-71e6', version: 'xy' }, environment)).toEqual({
      detail: '[REDACTED_ENV]', version: '[REDACTED_ENV]',
    });
  });

  it('redactJsonValue handles arrays and non-objects properly', () => {
    const environment = { MAT_API_KEY: 'secret' };
    const input = ['secret', 123, null, true, { nested: 'secret' }];
    expect(redactJsonValue(input, environment)).toEqual([
      '[REDACTED_ENV]',
      123,
      null,
      true,
      { nested: '[REDACTED_ENV]' }
    ]);
  });

  it('environmentRedactionTokens filters and sorts values correctly', () => {
      const environment = {
          MAT_LONG_VALUE: 'long-ordinary-value',
          MAT_SHORT_VALUE: 'short',
          MAT_API_KEY: 'secret',
      };

      const tokens = environmentRedactionTokens(environment);
      expect(tokens).toEqual([
          'long-ordinary-value',
          'secret'
      ]);
  });

  it('redactDiagnosticValue applies redactEnvironmentValues to string values', () => {
      const previous = process.env.MAT_TEST_API_TOKEN;
      process.env.MAT_TEST_API_TOKEN = 'secret-diag-token';
      try {
          expect(redactDiagnosticValue('key', 'test secret-diag-token value')).toBe('test [REDACTED_ENV] value');
          expect(redactDiagnosticValue('key', 123)).toBe(123);
      } finally {
          if (previous === undefined) delete process.env.MAT_TEST_API_TOKEN;
          else process.env.MAT_TEST_API_TOKEN = previous;
      }
  });
});
