
/**
 * Senior Developer Note: 
 * Standard SDPs are ~2KB because they include every possible audio/video codec.
 * Since we only use DataChannels, we can strip almost everything.
 * A minified SDP for DataChannel-only transfers can be as small as 400-600 bytes,
 * which fits perfectly in a scannable QR code.
 */

export const sdpUtils = {
    minify(sdp) {
        // Normalize line endings and filter
        const lines = sdp.split(/\r?\n/);
        const minified = lines.filter(line => {
            const l = line.trim();
            if (l === '') return false;
            if (l.startsWith('a=rtpmap:')) return false;
            if (l.startsWith('a=fmtp:')) return false;
            if (l.startsWith('a=extmap:')) return false;
            if (l.startsWith('a=ssrc:')) return false;
            if (l.startsWith('a=msid:')) return false;
            if (l.startsWith('a=rtcp-fb:')) return false;
            if (l.startsWith('a=rtcp:')) return false;
            if (l.startsWith('a=mid:')) return false; // Usually redundant for data-only
            
            // Keep only host candidates to save space
            if (l.startsWith('a=candidate:') && !l.includes('typ host')) return false;
            
            return true;
        });

        return minified.join('\n');
    },

    expand(minifiedSdp) {
        if (!minifiedSdp) return '';
        // Restore CRLF for browser compatibility
        let lines = minifiedSdp.trim().split('\n');
        
        // Ensure some critical lines are preserved (v=0, o=, s=, t=, c=, m=)
        // These are kept by the minify filter, but we ensure proper formatting here
        return lines.join('\r\n') + '\r\n';
    }
};
