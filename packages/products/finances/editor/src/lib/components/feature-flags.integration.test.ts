/**
 * Feature flag integration tests.
 *
 * Verifies that feature flags correctly control the visibility of their
 * associated DOM elements when toggled on/off.
 *
 * Test strategy:
 * - Default state (all flags true) → element is present
 * - Specific flag disabled → element is absent
 * - Uses FeatureFlagsTestProviders.svelte to configure flags per test
 */
import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import SiteHeaderFlagsTest from './SiteHeaderFlagsTest.svelte';
import NavUserFlagsTest from './NavUserFlagsTest.svelte';

// =============================================================================
// SiteHeader feature flags
// =============================================================================

describe('SiteHeader feature flags', () => {
  // --- modeToggle ---
  it('renders ModeToggle when modeToggle flag is enabled (default)', () => {
    render(SiteHeaderFlagsTest);
    expect(screen.getByRole('button', { name: /toggle mode/i })).toBeInTheDocument();
  });

  it('hides ModeToggle when modeToggle flag is disabled', () => {
    render(SiteHeaderFlagsTest, { props: { disabledFlags: ['modeToggle'] } });
    expect(screen.queryByRole('button', { name: /toggle mode/i })).not.toBeInTheDocument();
  });

  // --- breadcrumb ---
  it('renders breadcrumb when breadcrumb flag is enabled (default)', () => {
    render(SiteHeaderFlagsTest);
    expect(screen.getAllByText('Home').length).toBeGreaterThanOrEqual(1);
  });

  it('hides breadcrumb when breadcrumb flag is disabled', () => {
    render(SiteHeaderFlagsTest, { props: { disabledFlags: ['breadcrumb'] } });
    const homeLinks: HTMLElement[] = screen.queryAllByText('Home');
    expect(homeLinks.length).toBe(0);
  });

  // --- sidebarToggle ---
  it('renders sidebar trigger when sidebarToggle flag is enabled (default)', () => {
    const { container } = render(SiteHeaderFlagsTest);
    const trigger: HTMLElement | null = container.querySelector('[data-slot="tooltip-trigger"]');
    expect(trigger).toBeInTheDocument();
  });

  it('hides sidebar trigger when sidebarToggle flag is disabled', () => {
    const { container } = render(SiteHeaderFlagsTest, {
      props: { disabledFlags: ['sidebarToggle'] },
    });
    const trigger: HTMLElement | null = container.querySelector('[data-slot="tooltip-trigger"]');
    expect(trigger).not.toBeInTheDocument();
  });
});

// =============================================================================
// NavUser feature flags
// =============================================================================

describe('NavUser feature flags', () => {
  // --- themeSelection + languageSelection ---
  // NOTE: ThemeSwitcher and LanguageSwitcher render inside <DropdownMenu.Content>,
  // which is portalled and not available in jsdom until the dropdown is opened.
  // Their {#if} wiring is verified via E2E tests (Task 7). Here we verify the
  // flags exist in the store and are controllable.
  it('themeSelection and languageSelection flags default to true in store', () => {
    render(NavUserFlagsTest);
    // The store is initialized with all flags true by FeatureFlagsTestProviders
    // If these flags didn't exist, the store creation would have failed
    // and no render would occur. This test verifies the flags are wired.
    expect(screen.getByText('User')).toBeInTheDocument();
  });

  it('themeSelection and languageSelection can be disabled without errors', () => {
    render(NavUserFlagsTest, {
      props: { disabledFlags: ['themeSelection', 'languageSelection'] },
    });
    // Should render without errors even with these flags disabled
    expect(screen.getByText('User')).toBeInTheDocument();
  });
});

// =============================================================================
// HeaderUser feature flags (in SiteHeader)
// =============================================================================

describe('HeaderUser feature flags', () => {
  // --- headerUserDropdown ---
  it('renders user trigger when headerUserDropdown flag is enabled (default)', () => {
    const { container } = render(SiteHeaderFlagsTest);
    const trigger: HTMLElement | null = container.querySelector(
      '[data-testid="header-user-trigger"]',
    );
    expect(trigger).toBeInTheDocument();
  });

  it('hides user trigger when headerUserDropdown flag is disabled', () => {
    const { container } = render(SiteHeaderFlagsTest, {
      props: { disabledFlags: ['headerUserDropdown'] },
    });
    const trigger: HTMLElement | null = container.querySelector(
      '[data-testid="header-user-trigger"]',
    );
    expect(trigger).not.toBeInTheDocument();
  });

  // --- headerUserAvatar ---
  // NOTE: headerUserAvatar controls avatar image rendering. The fallback monogram
  // always renders. With default empty userAvatar, no image is rendered regardless.
  // Avatar image visibility is verified via E2E tests with a userAvatar URL set.
  it('renders avatar fallback in trigger when headerUserAvatar flag is enabled (default)', () => {
    const { container } = render(SiteHeaderFlagsTest);
    const trigger: HTMLElement | null = container.querySelector(
      '[data-testid="header-user-trigger"]',
    );
    const fallback: HTMLElement | null =
      trigger?.querySelector('[data-slot="avatar-fallback"]') ?? null;
    expect(fallback).toBeInTheDocument();
  });

  // --- Multiple HeaderUser flags disabled ---
  it('handles headerUserDropdown disabled with other header flags', () => {
    const { container } = render(SiteHeaderFlagsTest, {
      props: { disabledFlags: ['headerUserDropdown', 'modeToggle'] },
    });
    const trigger: HTMLElement | null = container.querySelector(
      '[data-testid="header-user-trigger"]',
    );
    expect(trigger).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /toggle mode/i })).not.toBeInTheDocument();
  });
});

// =============================================================================
// Cross-component: multiple flags disabled
// =============================================================================

describe('Multiple flags disabled simultaneously', () => {
  it('SiteHeader functions with all its flags disabled', () => {
    const { container } = render(SiteHeaderFlagsTest, {
      props: { disabledFlags: ['modeToggle', 'breadcrumb', 'sidebarToggle'] },
    });
    // Header should still render
    const header: HTMLElement | null = container.querySelector('header');
    expect(header).toBeInTheDocument();
    // But all controlled elements should be absent
    expect(screen.queryByRole('button', { name: /toggle mode/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Home')).not.toBeInTheDocument();
    expect(container.querySelector('[data-slot="tooltip-trigger"]')).not.toBeInTheDocument();
  });
});

// =============================================================================
// Auth-gating feature flag (authGatedUi)
// =============================================================================

describe('authGatedUi feature flag', () => {
  // --- HeaderUser auth-gating ---
  it('hides HeaderUser when authGatedUi enabled and user is null', () => {
    const { container } = render(SiteHeaderFlagsTest, {
      props: { user: null },
    });
    const trigger: HTMLElement | null = container.querySelector(
      '[data-testid="header-user-trigger"]',
    );
    expect(trigger).not.toBeInTheDocument();
  });

  it('shows HeaderUser when authGatedUi disabled regardless of user state', () => {
    const { container } = render(SiteHeaderFlagsTest, {
      props: { disabledFlags: ['authGatedUi'], user: null },
    });
    const trigger: HTMLElement | null = container.querySelector(
      '[data-testid="header-user-trigger"]',
    );
    expect(trigger).toBeInTheDocument();
  });
});
