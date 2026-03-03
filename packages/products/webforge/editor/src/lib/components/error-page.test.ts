import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import ErrorPageTest from './ErrorPageTest.svelte';

describe('ErrorPage', () => {
	it('renders 400 with "Bad request" title', () => {
		render(ErrorPageTest, { props: { status: 400, message: 'Bad Request' } });
		expect(screen.getByText('Bad request')).toBeInTheDocument();
	});

	it('renders 400 description', () => {
		render(ErrorPageTest, { props: { status: 400, message: 'Bad Request' } });
		expect(screen.getByText(/something in that request didn't look right/i)).toBeInTheDocument();
	});

	it('renders 404 with "Page not found" title', () => {
		render(ErrorPageTest, { props: { status: 404, message: 'Not found' } });
		expect(screen.getByText('Page not found')).toBeInTheDocument();
	});

	it('renders 404 description', () => {
		render(ErrorPageTest, { props: { status: 404, message: 'Not found' } });
		expect(
			screen.getByText(/we looked everywhere, but this page seems to have wandered off/i),
		).toBeInTheDocument();
	});

	it('renders 403 with "Access denied" title', () => {
		render(ErrorPageTest, { props: { status: 403, message: 'Forbidden' } });
		expect(screen.getByText('Access denied')).toBeInTheDocument();
	});

	it('renders 403 description', () => {
		render(ErrorPageTest, { props: { status: 403, message: 'Forbidden' } });
		expect(screen.getByText(/you don't have permission to access this page/i)).toBeInTheDocument();
	});

	it('renders 500 with "Something went wrong" title', () => {
		render(ErrorPageTest, { props: { status: 500, message: 'Internal server error' } });
		expect(screen.getByText('Something went wrong')).toBeInTheDocument();
	});

	it('renders 500 description', () => {
		render(ErrorPageTest, { props: { status: 500, message: 'Internal server error' } });
		expect(screen.getByText(/something broke on our end/i)).toBeInTheDocument();
	});

	it('renders unknown status (418) with generic title', () => {
		render(ErrorPageTest, { props: { status: 418, message: "I'm a teapot" } });
		expect(screen.getByText('Error')).toBeInTheDocument();
	});

	it('renders unknown status with generic description', () => {
		render(ErrorPageTest, { props: { status: 418, message: "I'm a teapot" } });
		expect(
			screen.getByText(/something unexpected happened while loading this page/i),
		).toBeInTheDocument();
	});

	it('shows "Go to homepage" link', () => {
		render(ErrorPageTest, { props: { status: 404, message: 'Not found' } });
		const link: HTMLElement = screen.getByRole('link', { name: /go to homepage/i });
		expect(link).toBeInTheDocument();
		expect(link.getAttribute('href')).toBe('/');
	});

	it('shows "Try again" button for 500+ status codes', () => {
		render(ErrorPageTest, { props: { status: 500, message: 'Server error' } });
		expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
	});

	it('does not show "Try again" button for 404', () => {
		render(ErrorPageTest, { props: { status: 404, message: 'Not found' } });
		expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
	});

	it('does not show "Try again" button for 400', () => {
		render(ErrorPageTest, { props: { status: 400, message: 'Bad Request' } });
		expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
	});

	it('does not show "Try again" button for 403', () => {
		render(ErrorPageTest, { props: { status: 403, message: 'Forbidden' } });
		expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
	});

	it('shows error ID when provided', () => {
		render(ErrorPageTest, {
			props: { status: 500, message: 'Error', errorId: 'abc-123' },
		});
		expect(screen.getByText(/error id.*abc-123/i)).toBeInTheDocument();
	});

	it('does not show error ID when not provided', () => {
		render(ErrorPageTest, { props: { status: 500, message: 'Error' } });
		expect(screen.queryByText(/error id/i)).not.toBeInTheDocument();
	});

	it('has proper heading hierarchy', () => {
		render(ErrorPageTest, { props: { status: 404, message: 'Not found' } });
		const heading: HTMLElement = screen.getByRole('heading', { level: 1 });
		expect(heading).toHaveTextContent('Page not found');
	});

	it('includes role="alert" on the container for accessibility', () => {
		const { container } = render(ErrorPageTest, {
			props: { status: 500, message: 'Error' },
		});
		expect(container.querySelector('[role="alert"]')).toBeInTheDocument();
	});
});
