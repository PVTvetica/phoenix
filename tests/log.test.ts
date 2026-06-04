import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { log, refreshLogLevel } from '../lib/log';

describe('lib/log', () => {
    let stdoutSpy: ReturnType<typeof vi.spyOn>;
    let stderrSpy: ReturnType<typeof vi.spyOn>;
    let savedLevel: string | undefined;

    beforeEach(() => {
        savedLevel = process.env.LOG_LEVEL;
        process.env.LOG_LEVEL = 'debug';
        refreshLogLevel();
        stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
        stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    });

    afterEach(() => {
        stdoutSpy.mockRestore();
        stderrSpy.mockRestore();
        if (savedLevel === undefined) delete process.env.LOG_LEVEL;
        else process.env.LOG_LEVEL = savedLevel;
        refreshLogLevel();
    });

    function lastLine(spy: ReturnType<typeof vi.spyOn>): Record<string, unknown> {
        const calls = spy.mock.calls;
        const last = calls[calls.length - 1]?.[0] as string;
        return JSON.parse(last.trim());
    }

    it('emits JSON with ts/level/msg', () => {
        log.info('hello');
        const rec = lastLine(stdoutSpy);
        expect(rec.level).toBe('info');
        expect(rec.msg).toBe('hello');
        expect(typeof rec.ts).toBe('string');
        // ts is a valid ISO 8601 timestamp
        expect(new Date(rec.ts as string).toISOString()).toBe(rec.ts);
    });

    it('routes warn/error to stderr, info/debug to stdout', () => {
        log.debug('d');
        log.info('i');
        expect(stdoutSpy).toHaveBeenCalledTimes(2);
        expect(stderrSpy).toHaveBeenCalledTimes(0);

        log.warn('w');
        log.error('e');
        expect(stdoutSpy).toHaveBeenCalledTimes(2);
        expect(stderrSpy).toHaveBeenCalledTimes(2);
    });

    it('merges fields into the JSON record', () => {
        log.info('hi', { userId: 42, action: 'foo' });
        const rec = lastLine(stdoutSpy);
        expect(rec.userId).toBe(42);
        expect(rec.action).toBe('foo');
    });

    it('serializes Error under `err` to {name,message,stack}', () => {
        const e = new Error('boom');
        log.error('failed', { err: e });
        const rec = lastLine(stderrSpy);
        const err = rec.err as { name: string; message: string; stack: string };
        expect(err.name).toBe('Error');
        expect(err.message).toBe('boom');
        expect(typeof err.stack).toBe('string');
    });

    it('child() adds context to every record', () => {
        const reqLog = log.child({ requestId: 'r1' });
        reqLog.info('x', { extra: true });
        const rec = lastLine(stdoutSpy);
        expect(rec.requestId).toBe('r1');
        expect(rec.extra).toBe(true);
    });

    it('respects LOG_LEVEL=warn — suppresses debug/info, passes warn/error', () => {
        process.env.LOG_LEVEL = 'warn';
        refreshLogLevel();
        log.debug('d');
        log.info('i');
        log.warn('w');
        log.error('e');
        expect(stdoutSpy).toHaveBeenCalledTimes(0);
        expect(stderrSpy).toHaveBeenCalledTimes(2);
    });

    it('respects LOG_LEVEL=silent — suppresses every level', () => {
        process.env.LOG_LEVEL = 'silent';
        refreshLogLevel();
        log.debug('d');
        log.info('i');
        log.warn('w');
        log.error('e');
        expect(stdoutSpy).toHaveBeenCalledTimes(0);
        expect(stderrSpy).toHaveBeenCalledTimes(0);
    });
});
