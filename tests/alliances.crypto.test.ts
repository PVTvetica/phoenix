import { describe, it, expect } from 'vitest';
import { randomBytes } from 'node:crypto';
import {
    canonicalPair, deriveSharedSecret, genEphemeral, ecdhShared, deriveMaster,
    deriveDirectionalKeys, codeProofMac, responderMac, safeEqual,
} from '../lib/db/alliances';

// Simulate one full code-authenticated ECDH handshake between two servers,
// given the two one-time pairing codes each side holds. Returns what each side
// would persist (its outbound key + the inbound key it expects from the peer).
function runHandshake(codeA: string, codeB: string) {
    // --- Initiator A holds its own code (codeA) + the code it entered (codeB) ---
    const S_a = deriveSharedSecret(codeA, codeB);
    const ephA = genEphemeral();
    const nonceA = randomBytes(16).toString('base64');
    const codeProof = codeProofMac(S_a, ephA.publicKeyB64, nonceA);

    // --- Responder B holds its own code (codeB) + the code it entered (codeA) ---
    const S_b = deriveSharedSecret(codeB, codeA);
    // B verifies the initiator's proof.
    const proofOk = safeEqual(codeProofMac(S_b, ephA.publicKeyB64, nonceA), codeProof);
    const ephB = genEphemeral();
    const nonceB = randomBytes(16).toString('base64');
    const respMac = responderMac(S_b, ephA.publicKeyB64, nonceA, ephB.publicKeyB64, nonceB);
    const masterB = deriveMaster(ecdhShared(ephB.privateKey, ephA.publicKeyB64), S_b);
    const keysB = deriveDirectionalKeys(masterB);
    const bOutbound = keysB.respToInit; // B calls A with resp->init
    const bInbound = keysB.initToResp;  // B expects A to call with init->resp

    // --- A verifies the responder MAC and derives the same material ---
    const respOk = safeEqual(responderMac(S_a, ephA.publicKeyB64, nonceA, ephB.publicKeyB64, nonceB), respMac);
    const masterA = deriveMaster(ecdhShared(ephA.privateKey, ephB.publicKeyB64), S_a);
    const keysA = deriveDirectionalKeys(masterA);
    const aOutbound = keysA.initToResp; // A calls B with init->resp
    const aInbound = keysA.respToInit;  // A expects B to call with resp->init

    return { S_a, S_b, proofOk, respOk, masterA, masterB, aOutbound, aInbound, bOutbound, bInbound };
}

describe('alliance handshake crypto', () => {
    it('both sides derive byte-identical shared secret and master (order-independent codes)', () => {
        const codeA = randomBytes(20).toString('base64url');
        const codeB = randomBytes(20).toString('base64url');
        const h = runHandshake(codeA, codeB);
        expect(h.proofOk).toBe(true);
        expect(h.respOk).toBe(true);
        expect(h.S_a.equals(h.S_b)).toBe(true);
        expect(h.masterA.equals(h.masterB)).toBe(true);
    });

    it('directional keys match across sides: each side\'s outbound == the peer\'s expected inbound', () => {
        const h = runHandshake(randomBytes(20).toString('base64url'), randomBytes(20).toString('base64url'));
        // A calls B: A's outbound must equal what B expects inbound.
        expect(h.aOutbound).toBe(h.bInbound);
        // B calls A: B's outbound must equal what A expects inbound.
        expect(h.bOutbound).toBe(h.aInbound);
        // The two directions are distinct keys.
        expect(h.aOutbound).not.toBe(h.bOutbound);
    });

    it('result is identical regardless of which code is labelled "local" (initiator symmetry)', () => {
        const c1 = 'code-one';
        const c2 = 'code-two';
        // canonicalPair makes the shared secret independent of argument order.
        expect(deriveSharedSecret(c1, c2).equals(deriveSharedSecret(c2, c1))).toBe(true);
        expect(canonicalPair(c1, c2)).toEqual(canonicalPair(c2, c1));
    });

    it('a wrong entered peer code breaks proof verification (no key agreement)', () => {
        const codeA = randomBytes(20).toString('base64url');
        const codeB = randomBytes(20).toString('base64url');
        const wrong = randomBytes(20).toString('base64url');
        const S_a = deriveSharedSecret(codeA, codeB);
        const ephA = genEphemeral();
        const nonceA = randomBytes(16).toString('base64');
        const proof = codeProofMac(S_a, ephA.publicKeyB64, nonceA);
        // Responder reconstructs S from its own code + the WRONG entered code.
        const S_b = deriveSharedSecret(codeB, wrong);
        expect(safeEqual(codeProofMac(S_b, ephA.publicKeyB64, nonceA), proof)).toBe(false);
    });

    it('tampering any transcript field fails the responder MAC', () => {
        const S = deriveSharedSecret('a', 'b');
        const ephA = genEphemeral();
        const ephB = genEphemeral();
        const nonceA = randomBytes(16).toString('base64');
        const nonceB = randomBytes(16).toString('base64');
        const good = responderMac(S, ephA.publicKeyB64, nonceA, ephB.publicKeyB64, nonceB);
        // Substitute the responder's ephemeral pub (a MITM swap).
        const evil = genEphemeral();
        expect(safeEqual(responderMac(S, ephA.publicKeyB64, nonceA, evil.publicKeyB64, nonceB), good)).toBe(false);
        // Substitute the initiator nonce.
        const otherNonce = randomBytes(16).toString('base64');
        expect(safeEqual(responderMac(S, ephA.publicKeyB64, otherNonce, ephB.publicKeyB64, nonceB), good)).toBe(false);
    });

    it('safeEqual rejects length-mismatched buffers without throwing', () => {
        expect(safeEqual(Buffer.from('abc'), Buffer.from('abcd'))).toBe(false);
        expect(safeEqual(Buffer.alloc(0), Buffer.from('x'))).toBe(false);
        expect(safeEqual(Buffer.from('same'), Buffer.from('same'))).toBe(true);
    });
});
