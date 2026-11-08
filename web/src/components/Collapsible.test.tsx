/** @vitest-environment jsdom */
import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { Collapsible } from './Collapsible.js';

describe('Collapsible', () => {
  afterEach(cleanup);
  it('renders correctly with default closed state', () => {
    render(<Collapsible summary="Summary Content"><div>Hidden Children</div></Collapsible>);
    const details = screen.getByRole('group');
    expect(details.hasAttribute('open')).toBe(false);
    expect(screen.getByText('Summary Content')).toBeDefined();
    expect(screen.getByText('Hidden Children')).toBeDefined();
  });

  it('renders correctly with defaultOpen=true', () => {
    render(<Collapsible summary="Summary Content" defaultOpen={true}><div>Visible Children</div></Collapsible>);
    const details = screen.getByRole('group');
    expect(details.hasAttribute('open')).toBe(true);
    expect(screen.getByText('Visible Children')).toBeDefined();
  });
});
