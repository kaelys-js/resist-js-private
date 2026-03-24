import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import DevToolbarDebugTest from './DevToolbarDebugTest.svelte';
import DevToolbarDebugOverridesTest from './DevToolbarDebugOverridesTest.svelte';
import { discoverDebugFields } from '@/utils/devtools/dev-toolbar-registry';
import { DebugStateSchema } from '@/utils/devtools/debug-state-schema';

const debugFields = discoverDebugFields(
  DebugStateSchema.entries as unknown as Record<string, Record<string, unknown>>,
);

describe('DevToolbarDebug', () => {
  it('renders the panel with correct testid', () => {
    const { container } = render(DevToolbarDebugTest);
    const panel: HTMLElement | null = container.querySelector('[data-testid="dev-toolbar-debug"]');
    expect(panel).toBeInTheDocument();
  });

  it('renders "Debug Settings" heading', () => {
    render(DevToolbarDebugTest);
    expect(screen.getByText('Debug Settings')).toBeInTheDocument();
  });

  it('renders debug enabled Switch', () => {
    const { container } = render(DevToolbarDebugTest);
    const toggle: HTMLElement | null = container.querySelector('#debug-enabled');
    expect(toggle).toBeInTheDocument();
    expect(toggle?.getAttribute('role')).toBe('switch');
  });

  it('renders a combobox trigger for logLevel picklist', () => {
    const { container } = render(DevToolbarDebugTest);
    const combobox: HTMLElement | null = container.querySelector('button[role="combobox"]');
    expect(combobox).toBeInTheDocument();
  });

  it('renders accessible labels for boolean debug fields', () => {
    render(DevToolbarDebugTest);
    const booleanFields = debugFields.filter((f) => f.type === 'boolean');
    for (const field of booleanFields) {
      const label: HTMLElement | null = document.querySelector(`label[for="debug-${field.key}"]`);
      expect(label).toBeInTheDocument();
    }
  });

  it('renders "Log State" button', () => {
    render(DevToolbarDebugTest);
    expect(screen.getByText('Log State')).toBeInTheDocument();
  });

  it('renders "Log Features" button', () => {
    render(DevToolbarDebugTest);
    expect(screen.getByText('Log Features')).toBeInTheDocument();
  });

  it('renders "Copy Debug URL" button', () => {
    render(DevToolbarDebugTest);
    expect(screen.getByText('Copy Debug URL')).toBeInTheDocument();
  });

  it('renders "Quick Actions" section header', () => {
    render(DevToolbarDebugTest);
    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
  });

  it('debug enabled switch defaults to unchecked', () => {
    const { container } = render(DevToolbarDebugTest);
    const toggle: HTMLElement | null = container.querySelector('#debug-enabled');
    expect(toggle?.dataset.state).toBe('unchecked');
  });

  it('discovers correct number of debug fields', () => {
    expect(debugFields.length).toBe(2);
  });

  it('does not render URL overrides section when no overrides', () => {
    const { container } = render(DevToolbarDebugTest);
    const overrides: HTMLElement | null = container.querySelector('[data-testid="url-overrides"]');
    expect(overrides).not.toBeInTheDocument();
  });

  it('renders URL overrides section when overrides are present', () => {
    const { container } = render(DevToolbarDebugOverridesTest);
    const overrides: HTMLElement | null = container.querySelector('[data-testid="url-overrides"]');
    expect(overrides).toBeInTheDocument();
  });

  it('renders URL overrides heading when overrides are present', () => {
    render(DevToolbarDebugOverridesTest);
    expect(screen.getByText('URL Overrides')).toBeInTheDocument();
  });

  describe('Build Info section', () => {
    it('renders "Build Info" section header', () => {
      render(DevToolbarDebugTest);
      expect(screen.getByText('Build Info')).toBeInTheDocument();
    });

    it('renders build-info section with data-testid', () => {
      const { container } = render(DevToolbarDebugTest);
      const section: HTMLElement | null = container.querySelector('[data-testid="build-info"]');
      expect(section).toBeInTheDocument();
    });

    it('renders version value', () => {
      const { container } = render(DevToolbarDebugTest);
      const section: HTMLElement | null = container.querySelector('[data-testid="build-info"]');
      expect(section).toBeInTheDocument();
      expect(section?.textContent).toContain('Version');
    });

    it('renders commit value', () => {
      const { container } = render(DevToolbarDebugTest);
      const section: HTMLElement | null = container.querySelector('[data-testid="build-info"]');
      expect(section).toBeInTheDocument();
      expect(section?.textContent).toContain('Commit');
    });

    it('renders branch value', () => {
      const { container } = render(DevToolbarDebugTest);
      const section: HTMLElement | null = container.querySelector('[data-testid="build-info"]');
      expect(section).toBeInTheDocument();
      expect(section?.textContent).toContain('Branch');
    });

    it('renders dirty value', () => {
      const { container } = render(DevToolbarDebugTest);
      const section: HTMLElement | null = container.querySelector('[data-testid="build-info"]');
      expect(section).toBeInTheDocument();
      expect(section?.textContent).toContain('Dirty');
    });

    it('renders built timestamp', () => {
      const { container } = render(DevToolbarDebugTest);
      const section: HTMLElement | null = container.querySelector('[data-testid="build-info"]');
      expect(section).toBeInTheDocument();
      expect(section?.textContent).toContain('Built');
    });

    it('renders "Copy Build Info" button', () => {
      render(DevToolbarDebugTest);
      expect(screen.getByText('Copy Build Info')).toBeInTheDocument();
    });
  });
});
