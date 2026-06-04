import { describe, it, expect } from 'vitest';
import { stripSecrets } from '../api/query';

// Guards the secret-stripping on the client-facing state payload — including the
// admin_setup_code leak (org-Admin takeover) found in the warrant-data audit.
describe('stripSecrets', () => {
    it('removes the one-time admin_setup_code from the settings blob', () => {
        const out = stripSecrets({ admin_setup_code: { code: 'SETUP-DEADBEEF', created_at: 'now' }, foo: 1 });
        expect(out.admin_setup_code).toBeUndefined();
        expect(out.foo).toBe(1); // benign fields preserved
    });

    it('strips integration secrets but keeps the public bits', () => {
        const out = stripSecrets({
            geminiKey: 'raw-gemini',
            discordConfig: { botToken: 'secret-bot', clientId: 'cid', newRequestChannelId: 'ch' },
            aiConfig: { apiKey: 'secret-ai', model: 'gemini' },
            radioConfig: { apiKey: 'lk-key', apiSecret: 'lk-secret', url: 'wss://x', someFlag: true },
        });
        expect(out.geminiKey).toBeUndefined();
        expect(out.discordConfig.botToken).toBeUndefined();
        expect(out.discordConfig.clientId).toBe('cid');
        expect(out.aiConfig.apiKey).toBeUndefined();
        expect(out.aiConfig.model).toBe('gemini');
        expect(out.radioConfig.apiKey).toBeUndefined();
        expect(out.radioConfig.apiSecret).toBeUndefined();
        expect(out.radioConfig.url).toBeUndefined();
        expect(out.radioConfig.configured).toBe(true);
    });
});
