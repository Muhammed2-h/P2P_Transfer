
/**
 * Senior Developer Note: 
 * Standard SDPs are ~2KB because they include every possible audio/video codec.
 * Since we only use DataChannels, we can strip almost everything.
 * A minified SDP for DataChannel-only transfers can be as small as 400-600 bytes,
 * which fits perfectly in a scannable QR code.
 */

export const sdpUtils = {
    /** 
     * Structural Minifier: Keeps the core WebRTC lines but strips 80% of the 'junk'.
     * This is far more reliable than binary reconstruction.
     */
    minify(sdp) {
        if (!sdp) return "";
        const lines = sdp.split(/\r?\n/);
        const filtered = lines.filter(line => {
            const l = line.trim();
            // Core WebRTC protocol lines
            if (l.startsWith('v=') || l.startsWith('o=') || l.startsWith('s=') || l.startsWith('t=') || l.startsWith('m=') || l.startsWith('c=')) return true;
            // Essential attributes
            if (l.startsWith('a=fingerprint:') || l.startsWith('a=ice-ufrag:') || l.startsWith('a=ice-pwd:') || l.startsWith('a=setup:')) return true;
            if (l.startsWith('a=mid:') || l.startsWith('a=sctp-port:')) return true;
            if (l.startsWith('a=group:BUNDLE')) return true;
            // Only host candidates (Local WiFi)
            if (l.startsWith('a=candidate:') && l.includes('typ host')) return true;
            return false;
        });

        // Use a single character delimiter to save space
        return filtered.join('§');
    },

    expand(minified) {
        if (!minified) return "";
        
        // Handle both new (V3) and old formats gracefully
        const lines = minified.includes('§') ? minified.split('§') : minified.split(/\r?\n/);
        
        // Ensure proper line endings for the browser
        return lines.map(line => line.trim()).filter(l => l).join('\r\n') + '\r\n';
    }
};
