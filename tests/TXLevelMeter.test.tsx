import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import TXLevelMeter from '../components/ui/TXLevelMeter';

function countLitSegments(container: HTMLElement): number {
    // Lit segments use one of the colour classes (green/amber/red).
    return container.querySelectorAll('[class*="bg-green-500"], [class*="bg-amber-400"], [class*="bg-red-500"]').length;
}

describe('TXLevelMeter', () => {
    it('renders the requested number of segments', () => {
        const { container } = render(<TXLevelMeter level={0} active={false} segments={8} />);
        const meter = container.querySelector('[role="meter"]');
        expect(meter).not.toBeNull();
        expect(meter!.children.length).toBe(8);
    });

    it('lights zero segments when inactive regardless of level', () => {
        const { container } = render(<TXLevelMeter level={0.95} active={false} segments={10} />);
        expect(countLitSegments(container)).toBe(0);
    });

    it('lights zero segments at level 0 even when active', () => {
        const { container } = render(<TXLevelMeter level={0} active={true} segments={10} />);
        expect(countLitSegments(container)).toBe(0);
    });

    it('lights all segments at level 1 when active', () => {
        const { container } = render(<TXLevelMeter level={1} active={true} segments={10} />);
        expect(countLitSegments(container)).toBe(10);
    });

    it('lights about half the segments at level 0.5', () => {
        const { container } = render(<TXLevelMeter level={0.5} active={true} segments={10} />);
        expect(countLitSegments(container)).toBe(5);
    });

    it('clamps level above 1 to all-lit', () => {
        const { container } = render(<TXLevelMeter level={5} active={true} segments={6} />);
        expect(countLitSegments(container)).toBe(6);
    });

    it('renders the label when provided', () => {
        const { getByText } = render(<TXLevelMeter level={0} active={true} label="TX" />);
        expect(getByText('TX')).toBeTruthy();
    });

    it('exposes ARIA meter semantics with current level', () => {
        const { container } = render(<TXLevelMeter level={0.42} active={true} />);
        const meter = container.querySelector('[role="meter"]');
        expect(meter?.getAttribute('aria-valuenow')).toBe('0.42');
        expect(meter?.getAttribute('aria-valuemin')).toBe('0');
        expect(meter?.getAttribute('aria-valuemax')).toBe('1');
    });
});
