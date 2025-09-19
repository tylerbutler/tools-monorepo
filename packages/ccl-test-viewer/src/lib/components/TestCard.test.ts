import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import TestCard from './TestCard.svelte';
import type { GeneratedTest } from '$lib/data/types.js';

const mockTest: GeneratedTest = {
	name: 'test-basic-parsing',
	input: 'key = value\nother = data',
	expected: {
		entries: true,
		count: 2
	},
	functions: ['parse'],
	features: [],
	behaviors: [],
	validation: 'standard'
};

describe('TestCard', () => {
	it('renders test information correctly', () => {
		const { getByText, getByRole } = render(TestCard, {
			props: { test: mockTest }
		});

		expect(getByText('test-basic-parsing')).toBeInTheDocument();
		expect(getByText('parse')).toBeInTheDocument();
		expect(getByText('2 entries')).toBeInTheDocument();
		expect(getByRole('button')).toBeInTheDocument();
	});

	it('calls onClick when clicked', async () => {
		const onClick = vi.fn();
		const { getByRole } = render(TestCard, {
			props: { test: mockTest, onClick }
		});

		const card = getByRole('button');
		await fireEvent.click(card);

		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it('handles keyboard navigation', async () => {
		const onClick = vi.fn();
		const { getByRole } = render(TestCard, {
			props: { test: mockTest, onClick }
		});

		const card = getByRole('button');

		// Test Enter key
		await fireEvent.keyDown(card, { key: 'Enter' });
		expect(onClick).toHaveBeenCalledTimes(1);

		// Test Space key
		await fireEvent.keyDown(card, { key: ' ' });
		expect(onClick).toHaveBeenCalledTimes(2);

		// Test other keys (should not trigger)
		await fireEvent.keyDown(card, { key: 'Tab' });
		expect(onClick).toHaveBeenCalledTimes(2);
	});

	it('displays function badges correctly', () => {
		const testWithMultipleFunctions: GeneratedTest = {
			...mockTest,
			functions: ['parse', 'get_string', 'build_hierarchy']
		};

		const { getByText } = render(TestCard, {
			props: { test: testWithMultipleFunctions }
		});

		expect(getByText('parse')).toBeInTheDocument();
		expect(getByText('get_string')).toBeInTheDocument();
		expect(getByText('build_hierarchy')).toBeInTheDocument();
	});

	it('displays feature badges when present', () => {
		const testWithFeatures: GeneratedTest = {
			...mockTest,
			features: ['comments', 'unicode']
		};

		const { getByText } = render(TestCard, {
			props: { test: testWithFeatures }
		});

		expect(getByText('comments')).toBeInTheDocument();
		expect(getByText('unicode')).toBeInTheDocument();
	});

	it('formats expected output correctly for different types', () => {
		// Test error expected
		const errorTest: GeneratedTest = {
			...mockTest,
			expected: { error: true, count: 0 }
		};
		const { getByText: getByTextError } = render(TestCard, {
			props: { test: errorTest }
		});
		expect(getByTextError('Error expected')).toBeInTheDocument();

		// Test object result
		const objectTest: GeneratedTest = {
			...mockTest,
			expected: { object: {}, count: 1 }
		};
		const { getByText: getByTextObject } = render(TestCard, {
			props: { test: objectTest }
		});
		expect(getByTextObject('Object result')).toBeInTheDocument();

		// Test list result
		const listTest: GeneratedTest = {
			...mockTest,
			expected: { list: ['item1', 'item2'], count: 2 }
		};
		const { getByText: getByTextList } = render(TestCard, {
			props: { test: listTest }
		});
		expect(getByTextList('List (2 items)')).toBeInTheDocument();

		// Test value result
		const valueTest: GeneratedTest = {
			...mockTest,
			expected: { value: 'test-value', count: 1 }
		};
		const { getByText: getByTextValue } = render(TestCard, {
			props: { test: valueTest }
		});
		expect(getByTextValue('Value: test-value')).toBeInTheDocument();
	});

	it('has proper accessibility attributes', () => {
		const { getByRole } = render(TestCard, {
			props: { test: mockTest }
		});

		const card = getByRole('button');
		expect(card).toHaveAttribute('aria-label');
		expect(card).toHaveAttribute('tabindex', '0');
		expect(card.getAttribute('aria-label')).toContain('test-basic-parsing');
		expect(card.getAttribute('aria-label')).toContain('parse');
	});

	it('truncates long input correctly', () => {
		const longInputTest: GeneratedTest = {
			...mockTest,
			input: 'a'.repeat(150) // Input longer than 100 characters
		};

		const { container } = render(TestCard, {
			props: { test: longInputTest }
		});

		const inputDisplay = container.querySelector('[role="code"]');
		expect(inputDisplay?.textContent).toMatch(/\.\.\.$/); // Should end with ellipsis
	});
});