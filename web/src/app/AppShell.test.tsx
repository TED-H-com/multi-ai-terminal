/**
 * @vitest-environment jsdom
 */
import { render, fireEvent, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { loadShellLayout, fitShellLayout, AppShell } from './AppShell.js';
import * as UiPreferences from '../i18n/UiPreferences.js';
import * as AppStore from './store.js';

// Polyfill setPointerCapture and releasePointerCapture for jsdom
if (!window.HTMLElement.prototype.setPointerCapture) {
  window.HTMLElement.prototype.setPointerCapture = vi.fn();
}
if (!window.HTMLElement.prototype.releasePointerCapture) {
  window.HTMLElement.prototype.releasePointerCapture = vi.fn();
}

vi.mock('../panels/workspace/WorkspacePanel.js', () => ({
    WorkspacePanel: () => <div data-testid="workspace-panel">WorkspacePanel</div>
}));
vi.mock('../panels/workflow/WorkflowPanel.js', () => ({
    WorkflowPanel: () => <div data-testid="workflow-panel">WorkflowPanel</div>
}));
vi.mock('../panels/run/RunPanel.js', () => ({
    RunPanel: () => <div data-testid="run-panel">RunPanel</div>
}));
vi.mock('./RunWorkspace.js', () => ({
    RunWorkspace: () => <div data-testid="run-workspace">RunWorkspace</div>
}));
vi.mock('./store.js', async (importOriginal) => {
    const actual = await importOriginal<typeof import('./store.js')>();
    return {
    ...actual,
    useMatStore: vi.fn().mockImplementation((selector) => {
        const state = {
            workspaces: [], runs: {}, events: {}, filters: { roles: [] },
            runtimes: [], providers: [], workflows: [], ui: {},
            setFollow: vi.fn(), setNodeFilter: vi.fn()
        };
        return selector(state);
    })
    }
});


describe('AppShell', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('loadShellLayout falls back to default on corrupted storage', () => {
    localStorage.setItem('mat-shell-layout', 'invalid JSON');
    const layout = loadShellLayout();
    expect(layout.launchpadWidth).toBeGreaterThan(0);
    localStorage.removeItem('mat-shell-layout');
  });

  it('fitShellLayout shrinks launchpad and inspector evenly when constrained', () => {
    const layout = fitShellLayout({ launchpadWidth: 500, inspectorWidth: 500 }, 800, true, true);
    expect(layout.launchpadWidth).toBeLessThan(500);
    expect(layout.inspectorWidth).toBeLessThan(500);
  });

  it('fitShellLayout works with only launchpad open', () => {
      const layout = fitShellLayout({ launchpadWidth: 9999, inspectorWidth: 500 }, 800, true, false);
      expect(layout.launchpadWidth).toBeLessThan(9999);
  });

  it('fitShellLayout works with only inspector open', () => {
      const layout = fitShellLayout({ launchpadWidth: 500, inspectorWidth: 9999 }, 800, false, true);
      expect(layout.inspectorWidth).toBeLessThan(9999);
  });

  it('renders AppShell without crashing and allows interactions', () => {
    vi.spyOn(UiPreferences, 'useUiPreferences').mockReturnValue({ locale: 'en-US', t: (k: string) => k } as any);
    const { container, getAllByLabelText, getAllByRole } = render(
        <AppShell />
    );
    expect(container.firstChild).not.toBeNull();

    act(() => {
        vi.runAllTimers();
    });

    // Toggle launchpad
    const settingsBtn = getAllByLabelText('shell.hideSettings')[0];
    if (settingsBtn) fireEvent.click(settingsBtn);

    // Toggle inspector
    const inspectorBtn = getAllByLabelText('shell.hideActivity')[0];
    if (inspectorBtn) fireEvent.click(inspectorBtn);

    // Switch views
    const launchBtn = getAllByLabelText('shell.launch')[0];
    if (launchBtn) fireEvent.click(launchBtn);
    const projectsBtn = getAllByLabelText('shell.projects')[0];
    if (projectsBtn) fireEvent.click(projectsBtn);

    // Test resize behavior via keyboard
    const dividers = getAllByRole('separator');
    if (dividers.length > 0) {
        const resizeHandle = dividers[0];
        if (resizeHandle) {
          fireEvent.keyDown(resizeHandle, { key: 'ArrowLeft' });
          fireEvent.keyDown(resizeHandle, { key: 'ArrowRight' });
          fireEvent.keyDown(resizeHandle, { key: 'Enter' });
        }
    }
  });

  it('tests resize behavior via mouse', () => {
      vi.spyOn(UiPreferences, 'useUiPreferences').mockReturnValue({ locale: 'en-US', t: (k: string) => k } as any);
      const { container, getAllByRole } = render(
          <AppShell />
      );

      const dividers = getAllByRole('separator');
      if (dividers.length > 0) {
        const resizeHandle = dividers[0];
        if (resizeHandle) {
            fireEvent.pointerDown(resizeHandle, { clientX: 100, pointerId: 1 });
            act(() => {
              fireEvent.pointerMove(window, { clientX: 150 });
            });
            act(() => {
              vi.advanceTimersByTime(100);
            });
            act(() => {
              fireEvent.pointerCancel(window);
            });
        }
      }

      act(() => {
          vi.runAllTimers();
      });
  });

  it('toggles launchpad and inspector panels via NavigationRail', () => {
    vi.spyOn(UiPreferences, 'useUiPreferences').mockReturnValue({ locale: 'en-US', t: (k: string) => k } as any);
    const { container, getAllByLabelText } = render(<AppShell />);

    const settingsBtn = getAllByLabelText('shell.hideSettings')[0];
    const inspectorBtn = getAllByLabelText('shell.hideActivity')[0];

    expect(settingsBtn).toBeTruthy();
    expect(inspectorBtn).toBeTruthy();

    act(() => {
        if (settingsBtn) fireEvent.click(settingsBtn);
        if (inspectorBtn) fireEvent.click(inspectorBtn);
    });

    expect(getAllByLabelText('shell.showSettings')[0]).toBeTruthy();
    expect(getAllByLabelText('shell.showActivity')[0]).toBeTruthy();

    act(() => {
        fireEvent.click(getAllByLabelText('shell.showSettings')[0] as HTMLElement);
        fireEvent.click(getAllByLabelText('shell.showActivity')[0] as HTMLElement);
    });

    expect(getAllByLabelText('shell.hideSettings')[0]).toBeTruthy();
    expect(getAllByLabelText('shell.hideActivity')[0]).toBeTruthy();
  });

});
