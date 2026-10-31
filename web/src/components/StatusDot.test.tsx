/**
 * @vitest-environment jsdom
 */
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StatusDot } from './StatusDot.js';
import * as UiPreferences from '../i18n/UiPreferences.js';

describe('StatusDot', () => {
  it('renders correctly', () => {
    vi.spyOn(UiPreferences, 'useUiPreferences').mockReturnValue({ locale: 'en-US' } as any);
    const { container, rerender } = render(<StatusDot status="running" />);
    expect(container.firstChild).not.toBeNull();
    rerender(<StatusDot status="queued" label={false} />);
    vi.spyOn(UiPreferences, 'useUiPreferences').mockReturnValue({ locale: 'zh-TW' } as any);
    rerender(<StatusDot status="done" />);
  });
});
