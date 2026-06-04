import { renderHook, act } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { useBulkSelection } from '../hooks/useBulkSelection';

describe('useBulkSelection', () => {
    test('count is 0 and isSelected is false on a fresh mount', () => {
        const { result } = renderHook(() => useBulkSelection<number>());
        expect(result.current.count).toBe(0);
        expect(result.current.isSelected(1)).toBe(false);
    });

    test('setMany([]) leaves count at 0 — locks the empty-state header-checkbox contract', () => {
        const { result } = renderHook(() => useBulkSelection<number>());

        act(() => result.current.setMany([1, 2, 3]));
        expect(result.current.count).toBe(3);

        act(() => result.current.setMany([]));
        expect(result.current.count).toBe(0);
        expect(result.current.isSelected(1)).toBe(false);
    });

    test('selection survives unrelated rerenders — locks the mode-toggle preservation contract', () => {
        const { result, rerender } = renderHook(() => useBulkSelection<number>());

        act(() => result.current.setMany([10, 20, 30]));
        rerender();
        rerender();

        expect(result.current.count).toBe(3);
        expect(result.current.isSelected(10)).toBe(true);
        expect(result.current.isSelected(20)).toBe(true);
        expect(result.current.isSelected(30)).toBe(true);
    });

    test('toggle adds and removes ids while preserving others', () => {
        const { result } = renderHook(() => useBulkSelection<number>());

        act(() => result.current.setMany([1, 2, 3]));
        act(() => result.current.toggle(2));   // remove
        expect(result.current.count).toBe(2);
        expect(result.current.isSelected(2)).toBe(false);
        expect(result.current.isSelected(1)).toBe(true);
        expect(result.current.isSelected(3)).toBe(true);

        act(() => result.current.toggle(4));   // add
        expect(result.current.count).toBe(3);
        expect(result.current.isSelected(4)).toBe(true);
    });

    test('clear empties the selection', () => {
        const { result } = renderHook(() => useBulkSelection<number>());

        act(() => result.current.setMany([1, 2, 3]));
        act(() => result.current.clear());
        expect(result.current.count).toBe(0);
        expect(result.current.isSelected(1)).toBe(false);
    });
});
