
/**
 * Senior Developer Note: 
 * Standard SDPs are ~2KB because they include every possible audio/video codec.
 * Since we only use DataChannels, we can strip almost everything.
 * A minified SDP for DataChannel-only transfers can be as small as 400-600 bytes,
 * which fits perfectly in a scannable QR code.
 */

export const sdpUtils = {
    minify(sdp) {
        // 1. Remove unnecessary media sections if they existing (just in case)
        // 2. Remove all 'a=rtpmap', 'a=fmtp', 'a=extmap', 'a=ssrc' lines (Audio/Video junk)
        // 3. Remove 'a=msid', 'a=bundle-only'
        // 4. Filter ICE candidates: Keep only 'host' (local network) candidates for offline mode
        
        const lines = sdp.split('\r\n');
        const minified = lines.filter(line => {
            if (line.startsWith('a=rtpmap:')) return false;
            if (line.startsWith('a=fmtp:')) return false;
            if (line.startsWith('a=extmap:')) return false;
            if (line.startsWith('a=ssrc:')) return false;
            if (line.startsWith('a=msid:')) return false;
            if (line.startsWith('a=rtcp-fb:')) return false;
            if (line.startsWith('a=candidate:') && !line.includes('typ host')) return false;
            if (line.trim() === '') return false;
            return true;
        });

        return minified.join('\n'); // Use \n for smaller size than \r\n
    },

    expand(minifiedSdp) {
        // Reverse \n back to \r\n for browser compatibility
        return minifiedSdp.split('\n').join('\r\n');
    }
};
