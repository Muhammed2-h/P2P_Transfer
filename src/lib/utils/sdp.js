
/**
 * Senior Developer Note: 
 * Standard SDPs are ~2KB because they include every possible audio/video codec.
 * Since we only use DataChannels, we can strip almost everything.
 * A minified SDP for DataChannel-only transfers can be as small as 400-600 bytes,
 * which fits perfectly in a scannable QR code.
 */

export const sdpUtils = {
    /** 
     * Converts a full SDP into a tiny, 'Potato-Webcam-Friendly' string.
     * Takes ~2000 chars down to ~120 chars.
     */
    toBinaryHandshake(sdp) {
        try {
            const fingerprint = sdp.match(/a=fingerprint:sha-256\s+([^\r\n]+)/)?.[1];
            const ufrag = sdp.match(/a=ice-ufrag:([^\r\n]+)/)?.[1];
            const pwd = sdp.match(/a=ice-pwd:([^\r\n]+)/)?.[1];
            const setup = sdp.match(/a=setup:([^\r\n]+)/)?.[1];
            
            // Get the first Host candidate (Local IP)
            const candMatch = sdp.match(/a=candidate:\d+\s+\d+\s+udp\s+\d+\s+([\d\.]+)\s+(\d+)\s+typ\s+host/);
            const ip = candMatch?.[1];
            const port = candMatch?.[2];

            if (!fingerprint || !ufrag || !pwd) throw new Error("Incomplete SDP");

            // Format: Version|Setup|Ufrag|Pwd|Fingerprint|IP|Port
            // Using '|' as a delimiter for minimal overhead
            return `v1|${setup === 'active' ? 'a' : 'p'}|${ufrag}|${pwd}|${fingerprint}|${ip || ''}|${port || ''}`;
        } catch (e) {
            console.error("Binary Handshake Export Failed", e);
            return sdp; // Fallback to raw (minified) if something goes wrong
        }
    },

    /**
     * Reconstructs a valid WebRTC SDP from the tiny binary string.
     */
    fromBinaryHandshake(binary, type = 'offer') {
        if (!binary.startsWith('v1|')) return binary; // It's likely already a minified SDP

        const [v, setup, ufrag, pwd, fingerprint, ip, port] = binary.split('|');
        
        const sdpLines = [
            'v=0',
            'o=- 0 0 IN IP4 127.0.0.1',
            's=-',
            't=0 0',
            'a=msid-semantic: WMS',
            'm=application 9 DTLS/SCTP webrtc-datachannel',
            'c=IN IP4 0.0.0.0',
            `a=setup:${setup === 'a' ? 'active' : 'passive'}`,
            `a=ice-ufrag:${ufrag}`,
            `a=ice-pwd:${pwd}`,
            `a=fingerprint:sha-256 ${fingerprint}`,
            'a=sctpmap:5000 webrtc-datachannel 1024'
        ];

        if (ip && port) {
            sdpLines.push(`a=candidate:1 1 udp 1 ${ip} ${port} typ host`);
        }

        return sdpLines.join('\r\n') + '\r\n';
    },

    minify(sdp) {
        // Fallback or legacy support
        return this.toBinaryHandshake(sdp);
    },

    expand(minified) {
        // Automatically detects if it's binary or old-style minified
        if (minified.startsWith('v1|')) {
            return this.fromBinaryHandshake(minified);
        }
        
        // Old-style expand logic as fallback
        if (!minified) return '';
        return minified.trim().split('\n').join('\r\n') + '\r\n';
    }
};
