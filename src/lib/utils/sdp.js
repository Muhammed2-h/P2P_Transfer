
/**
 * Senior Developer Note: 
 * Standard SDPs are ~2KB because they include every possible audio/video codec.
 * Since we only use DataChannels, we can strip almost everything.
 * A minified SDP for DataChannel-only transfers can be as small as 400-600 bytes,
 * which fits perfectly in a scannable QR code.
 */

export const sdpUtils = {
    /** 
     * Converts a full SDP into a tiny string.
     * Strips colons from fingerprints to save ~31 chars.
     */
    toBinaryHandshake(sdp) {
        try {
            const fingerprint = sdp.match(/a=fingerprint:sha-256\s+([^\r\n]+)/)?.[1]?.replace(/:/g, '');
            const ufrag = sdp.match(/a=ice-ufrag:([^\r\n]+)/)?.[1];
            const pwd = sdp.match(/a=ice-pwd:([^\r\n]+)/)?.[1];
            const setup = sdp.match(/a=setup:([^\r\n]+)/)?.[1];
            
            // Get the first Host candidate (Local IP)
            const candMatch = sdp.match(/a=candidate:\d+\s+\d+\s+udp\s+\d+\s+([\d\.]+)\s+(\d+)\s+typ\s+host/);
            const ip = candMatch?.[1];
            const port = candMatch?.[2];

            if (!fingerprint || !ufrag || !pwd) throw new Error("Incomplete SDP");

            // Format: Version|Setup|Ufrag|Pwd|Fingerprint|IP|Port
            let s = 'actpass';
            if (setup === 'active') s = 'a';
            if (setup === 'passive') s = 'p';
            if (setup === 'actpass') s = 'ap';

            return `v2|${s}|${ufrag}|${pwd}|${fingerprint}|${ip || ''}|${port || ''}`;
        } catch (e) {
            console.error("Binary Handshake Export Failed", e);
            return sdp;
        }
    },

    /**
     * Reconstructs a valid WebRTC SDP.
     */
    fromBinaryHandshake(binary) {
        if (!binary.startsWith('v2|')) return binary;

        const [v, s, ufrag, pwd, fingerprintRaw, ip, port] = binary.split('|');
        
        // Restore fingerprint colons
        const fingerprint = fingerprintRaw.match(/.{1,2}/g).join(':').toUpperCase();
        
        let setup = 'actpass';
        if (s === 'a') setup = 'active';
        if (s === 'p') setup = 'passive';
        if (s === 'ap') setup = 'actpass';

        const sdpLines = [
            'v=0',
            'o=- 0 0 IN IP4 127.0.0.1',
            's=-',
            't=0 0',
            'a=msid-semantic: WMS',
            'm=application 9 DTLS/SCTP webrtc-datachannel',
            'c=IN IP4 0.0.0.0',
            `a=setup:${setup}`,
            `a=ice-ufrag:${ufrag}`,
            `a=ice-pwd:${pwd}`,
            `a=fingerprint:sha-256 ${fingerprint}`,
            'a=mid:0',
            'a=sctp-port:5000',
            'a=sctpmap:5000 webrtc-datachannel 1024'
        ];

        if (ip && port) {
            sdpLines.push(`a=candidate:1 1 udp 2122260223 ${ip} ${port} typ host`);
        }

        return sdpLines.join('\r\n') + '\r\n';
    },

    minify(sdp) {
        return this.toBinaryHandshake(sdp);
    },

    expand(minified) {
        if (minified.startsWith('v2|')) {
            return this.fromBinaryHandshake(minified);
        }
        if (minified.startsWith('v1|')) {
            // Legacy v1 support (just in case)
            return minified.trim().split('\n').join('\r\n') + '\r\n';
        }
        return minified ? (minified.trim().split('\n').join('\r\n') + '\r\n') : '';
    }
};
