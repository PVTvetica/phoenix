import { log as baseLog } from './log.js';

const log = baseLog.child({ module: 'lib.rsi' });

export async function verifyRsiHandle(rsiHandle: string, verificationCode: string): Promise<boolean> {
    try {
        const url = `https://robertsspaceindustries.com/citizens/${encodeURIComponent(rsiHandle)}`;
        const response = await fetch(url, {
            headers: {
                // Setting a user-agent is good practice and can avoid some blocks
                'User-Agent': 'MyRSI-Dashboard-Verification/1.0'
            }
        });

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error(`RSI Handle "${rsiHandle}" not found. Please check for typos.`);
            }
            throw new Error(`Failed to fetch RSI profile to verify. Status: ${response.status}`);
        }

        const html = await response.text();
        
        // This is a simple but robust check. It doesn't rely on specific HTML tags or structure,
        // which can change. It just checks if the code exists anywhere in the page content.
        return html.includes(verificationCode);

    } catch (error: any) {
        log.error('rsi handle verification failed', { rsiHandle, err: error });
        // Re-throw specific, user-friendly errors
        if (error.message.includes('RSI Handle')) {
            throw error;
        }
        // Generic error for network issues, etc.
        throw new Error('Could not connect to RobertsSpaceIndustries.com to verify your handle. Please try again later.');
    }
}
