# Error Pages Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

All file paths relative to `packages/products/webforge/editor/`.

## Task 1: Extend App.Error Interface and Locale Schema

### 1a. Extend `App.Error` in `src/app.d.ts`

Add `errorId` optional field:

```typescript
declare global {
	namespace App {
		interface Error {
			message: string;
			errorId?: string;
		}
		interface Locals {
			locale: string;
		}
	}
}

export {};
```

### 1b. Add `errors` namespace to `src/lib/locales/schema.ts`

Add after the `scenes` namespace:

```typescript
errors: v.strictObject({
	notFound: messageTemplate(),
	notFoundDescription: messageTemplate(),
	forbidden: messageTemplate(),
	forbiddenDescription: messageTemplate(),
	serverError: messageTemplate(),
	serverErrorDescription: messageTemplate(),
	genericTitle: messageTemplate(),
	genericDescription: messageTemplate(),
	goHome: messageTemplate(),
	tryAgain: messageTemplate(),
	errorId: messageTemplate({ id: v.string() }),
}),
```

Update the JSDoc namespace list to include `errors`.

### 1c. Add error strings to all 7 locale files

**`en.ts`:**
```typescript
errors: {
	notFound: 'Page not found',
	notFoundDescription: "The page you're looking for doesn't exist or has been moved.",
	forbidden: 'Access denied',
	forbiddenDescription: "You don't have permission to view this page.",
	serverError: 'Something went wrong',
	serverErrorDescription: 'An unexpected error occurred. Please try again later.',
	genericTitle: 'Error',
	genericDescription: 'An error occurred while loading this page.',
	goHome: 'Go to homepage',
	tryAgain: 'Try again',
	errorId: 'Error ID: {id}',
},
```

**`ja.ts`:**
```typescript
errors: {
	notFound: 'ページが見つかりません',
	notFoundDescription: 'お探しのページは存在しないか、移動された可能性があります。',
	forbidden: 'アクセスが拒否されました',
	forbiddenDescription: 'このページを表示する権限がありません。',
	serverError: '問題が発生しました',
	serverErrorDescription: '予期しないエラーが発生しました。後でもう一度お試しください。',
	genericTitle: 'エラー',
	genericDescription: 'ページの読み込み中にエラーが発生しました。',
	goHome: 'ホームページへ',
	tryAgain: 'もう一度試す',
	errorId: 'エラーID: {id}',
},
```

**`zh.ts`:**
```typescript
errors: {
	notFound: '页面未找到',
	notFoundDescription: '您查找的页面不存在或已被移动。',
	forbidden: '访问被拒绝',
	forbiddenDescription: '您没有权限查看此页面。',
	serverError: '出错了',
	serverErrorDescription: '发生了意外错误。请稍后重试。',
	genericTitle: '错误',
	genericDescription: '加载此页面时发生错误。',
	goHome: '返回首页',
	tryAgain: '重试',
	errorId: '错误ID: {id}',
},
```

**`ko.ts`:**
```typescript
errors: {
	notFound: '페이지를 찾을 수 없습니다',
	notFoundDescription: '찾고 있는 페이지가 존재하지 않거나 이동되었습니다.',
	forbidden: '접근이 거부되었습니다',
	forbiddenDescription: '이 페이지를 볼 권한이 없습니다.',
	serverError: '문제가 발생했습니다',
	serverErrorDescription: '예기치 않은 오류가 발생했습니다. 나중에 다시 시도해 주세요.',
	genericTitle: '오류',
	genericDescription: '이 페이지를 로드하는 중 오류가 발생했습니다.',
	goHome: '홈페이지로 이동',
	tryAgain: '다시 시도',
	errorId: '오류 ID: {id}',
},
```

**`fr.ts`:**
```typescript
errors: {
	notFound: 'Page introuvable',
	notFoundDescription: "La page que vous recherchez n'existe pas ou a été déplacée.",
	forbidden: 'Accès refusé',
	forbiddenDescription: "Vous n'avez pas la permission de voir cette page.",
	serverError: "Une erreur s'est produite",
	serverErrorDescription: "Une erreur inattendue s'est produite. Veuillez réessayer plus tard.",
	genericTitle: 'Erreur',
	genericDescription: "Une erreur s'est produite lors du chargement de cette page.",
	goHome: "Retour à l'accueil",
	tryAgain: 'Réessayer',
	errorId: "Identifiant d'erreur : {id}",
},
```

**`de.ts`:**
```typescript
errors: {
	notFound: 'Seite nicht gefunden',
	notFoundDescription: 'Die gesuchte Seite existiert nicht oder wurde verschoben.',
	forbidden: 'Zugriff verweigert',
	forbiddenDescription: 'Sie haben keine Berechtigung, diese Seite anzuzeigen.',
	serverError: 'Etwas ist schiefgelaufen',
	serverErrorDescription: 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.',
	genericTitle: 'Fehler',
	genericDescription: 'Beim Laden dieser Seite ist ein Fehler aufgetreten.',
	goHome: 'Zur Startseite',
	tryAgain: 'Erneut versuchen',
	errorId: 'Fehler-ID: {id}',
},
```

**`es.ts`:**
```typescript
errors: {
	notFound: 'Página no encontrada',
	notFoundDescription: 'La página que buscas no existe o ha sido movida.',
	forbidden: 'Acceso denegado',
	forbiddenDescription: 'No tienes permiso para ver esta página.',
	serverError: 'Algo salió mal',
	serverErrorDescription: 'Ocurrió un error inesperado. Por favor, inténtalo de nuevo más tarde.',
	genericTitle: 'Error',
	genericDescription: 'Ocurrió un error al cargar esta página.',
	goHome: 'Ir al inicio',
	tryAgain: 'Intentar de nuevo',
	errorId: 'ID de error: {id}',
},
```

### 1d. Verify locale tests still pass

The existing `locales.test.ts` validates all locale files against the schema. Adding the new namespace to both the schema and all locale files should make them pass automatically.

**QA:** `pnpm -w run qa:lint --tools && pnpm -w run qa:lint && pnpm -w run qa:format:check && pnpm qa:test`

---

## Task 2: handleError Hooks

### 2a. Write tests for server handleError — extend `src/hooks.server.test.ts`

Add a new `describe('handleError')` block:

```typescript
describe('handleError', () => {
	it('returns App.Error with message and errorId', () => {
		const result = handleError({
			error: new Error('test crash'),
			event: {} as any,
			status: 500,
			message: 'Internal Error',
		});
		expect(result).toHaveProperty('message', 'Internal Error');
		expect(result).toHaveProperty('errorId');
		expect(typeof result.errorId).toBe('string');
	});

	it('errorId is a valid UUID', () => {
		const result = handleError({
			error: new Error('test'),
			event: {} as any,
			status: 500,
			message: 'Error',
		});
		expect(result.errorId).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
		);
	});

	it('logs the error with errorId', () => {
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const result = handleError({
			error: new Error('crash'),
			event: {} as any,
			status: 500,
			message: 'Internal Error',
		});
		expect(spy).toHaveBeenCalledWith(
			expect.stringContaining(result.errorId!),
			expect.any(Error),
		);
		spy.mockRestore();
	});
});
```

### 2b. Implement server handleError in `src/hooks.server.ts`

Add alongside existing `handle` export:

```typescript
import type { Handle, HandleServerError } from '@sveltejs/kit';

export const handleError: HandleServerError = ({ error, status, message }) => {
	const errorId: string = crypto.randomUUID();
	console.error(`[${errorId}] Unexpected server error (${status}):`, error);
	return { message, errorId };
};
```

### 2c. Write tests for client handleError — create `src/hooks.client.test.ts`

```typescript
import { describe, expect, it, vi } from 'vitest';
import { handleError } from './hooks.client';

describe('handleError', () => {
	it('returns App.Error with message and errorId', () => {
		const result = handleError({
			error: new Error('test crash'),
			event: {} as any,
			status: 500,
			message: 'Internal Error',
		});
		expect(result).toHaveProperty('message', 'Internal Error');
		expect(result).toHaveProperty('errorId');
		expect(typeof result.errorId).toBe('string');
	});

	it('errorId is a valid UUID', () => {
		const result = handleError({
			error: new Error('test'),
			event: {} as any,
			status: 500,
			message: 'Error',
		});
		expect(result.errorId).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
		);
	});

	it('logs the error with errorId', () => {
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const result = handleError({
			error: new Error('crash'),
			event: {} as any,
			status: 500,
			message: 'Internal Error',
		});
		expect(spy).toHaveBeenCalledWith(
			expect.stringContaining(result.errorId!),
			expect.any(Error),
		);
		spy.mockRestore();
	});
});
```

### 2d. Implement client handleError — create `src/hooks.client.ts`

```typescript
import type { HandleClientError } from '@sveltejs/kit';

export const handleError: HandleClientError = ({ error, status, message }) => {
	const errorId: string = crypto.randomUUID();
	console.error(`[${errorId}] Unexpected client error (${status}):`, error);
	return { message, errorId };
};
```

**QA:** `pnpm -w run qa:lint --tools && pnpm -w run qa:lint && pnpm -w run qa:format:check && pnpm qa:test`

---

## Task 3: ErrorPage Component

### 3a. Write unit tests — create `src/lib/components/ErrorPage.test.ts`

Tests:

1. Renders 404 with "Page not found" title and description
2. Renders 403 with "Access denied" title and description
3. Renders 500 with "Something went wrong" title, description, and error ID
4. Renders unknown status (418) with generic title and description
5. Shows "Go to homepage" link on all error types
6. Shows "Try again" button only for 500+ status codes
7. Does not show error ID when errorId prop is undefined
8. Does not show "Try again" button for 404
9. Status code is rendered with aria-hidden

### 3b. Create test wrapper — `src/lib/components/ErrorPageTest.svelte`

Wraps `ErrorPage` with the necessary context providers (initEditorStore for locale).

### 3c. Implement `src/lib/components/ErrorPage.svelte`

Component structure:
- Accept props: `status`, `message`, `errorId`
- Map status → locale keys using a lookup function
- Render centered layout with status code, title, description, actions
- Use `$derived` for localized strings
- Use `Button` from shadcn-svelte for actions
- "Go to homepage" is an `<a href="/">` styled as a Button
- "Try again" calls `() => window.location.reload()` — only shown for status >= 500
- Error ID shown only when `errorId` is truthy

**QA:** `pnpm -w run qa:lint --tools && pnpm -w run qa:lint && pnpm -w run qa:format:check && pnpm qa:test`

---

## Task 4: Error Boundary and Static Fallback

### 4a. Write integration tests — create `src/routes/error-page.test.ts`

Tests using `@testing-library/svelte` that mock `$app/state`'s `page` object:

1. `+error.svelte` renders ErrorPage with mocked 404 status
2. `+error.svelte` renders ErrorPage with mocked 500 status + errorId
3. Meta title is set (via `<svelte:head>`)

### 4b. Create `src/routes/+error.svelte`

Bridge between SvelteKit `page` state and `ErrorPage` component:

```svelte
<script lang="ts">
	import { page } from '$app/state';
	import ErrorPage from '$lib/components/ErrorPage.svelte';
</script>

<svelte:head>
	<title>{page.status} | WebForge</title>
</svelte:head>

<ErrorPage
	status={page.status}
	message={page.error?.message ?? ''}
	errorId={page.error?.errorId}
/>
```

### 4c. Create `src/error.html`

Static fallback for when the layout itself crashes. Minimal dark-themed HTML with `%sveltekit.status%` and `%sveltekit.error.message%` placeholders. See design doc for full HTML.

**QA:** `pnpm -w run qa:lint --tools && pnpm -w run qa:lint && pnpm -w run qa:format:check && pnpm qa:test`

---

## Task 5: Test Routes for Manual Visual Testing

### 5a. Create test error routes

Four `+page.server.ts` files under `src/routes/(testing)/test-error/`:

**`404/+page.server.ts`:**
```typescript
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	error(404, { message: 'Not found' });
};
```

**`403/+page.server.ts`:**
```typescript
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	error(403, { message: 'Forbidden' });
};
```

**`500/+page.server.ts`:**
```typescript
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	error(500, { message: 'Internal server error' });
};
```

**`unexpected/+page.server.ts`:**
```typescript
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	throw new Error('Unexpected test error — this simulates a server crash');
};
```

**QA:** `pnpm -w run qa:lint --tools && pnpm -w run qa:lint && pnpm -w run qa:format:check`

---

## Task 6: E2E Tests

### 6a. Create `e2e/error-pages.test.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Error pages', () => {
	test('404 test route shows not found page', async ({ page }) => {
		await page.goto('/test-error/404');
		await expect(page.getByText('404')).toBeVisible();
		await expect(page.getByText(/page not found/i)).toBeVisible();
		await expect(page.getByRole('link', { name: /go to homepage/i })).toBeVisible();
	});

	test('403 test route shows access denied page', async ({ page }) => {
		await page.goto('/test-error/403');
		await expect(page.getByText('403')).toBeVisible();
		await expect(page.getByText(/access denied/i)).toBeVisible();
	});

	test('500 test route shows server error page', async ({ page }) => {
		await page.goto('/test-error/500');
		await expect(page.getByText('500')).toBeVisible();
		await expect(page.getByText(/something went wrong/i)).toBeVisible();
	});

	test('unexpected error shows 500 page with error ID', async ({ page }) => {
		await page.goto('/test-error/unexpected');
		await expect(page.getByText('500')).toBeVisible();
		await expect(page.getByText(/error id/i)).toBeVisible();
	});

	test('nonexistent route shows 404 page', async ({ page }) => {
		await page.goto('/this-route-does-not-exist');
		await expect(page.getByText('404')).toBeVisible();
		await expect(page.getByText(/page not found/i)).toBeVisible();
	});

	test('homepage link navigates home', async ({ page }) => {
		await page.goto('/test-error/404');
		await page.getByRole('link', { name: /go to homepage/i }).click();
		await expect(page).toHaveURL('/');
	});
});
```

**QA:** `pnpm -w run qa:lint --tools && pnpm -w run qa:lint && pnpm -w run qa:format:check && pnpm qa:test && pnpm qa:test:e2e`
