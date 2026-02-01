
/**
 * Senior Developer Note: 
 * Standard SDPs are ~2KB because they include every possible audio/video codec.
 * Since we only use DataChannels, we can strip almost everything.
 * A minified SDP for DataChannel-only transfers can be as small as 400-600 bytes,
 * which fits perfectly in a scannable QR code.
 */

export const sdpUtils = {
    /** 
     * V3: Universal JSON Handshake.
     * Most robust method: Extracts only the dict of keys and encodes as Base64.
     */
    minify(sdp) {
        if (!sdp) return "";
        try {
            const data = {
                f: sdp.match(/a=fingerprint:sha-256\s+([^\r\n]+)/)?.[1],
                u: sdp.match(/a=ice-ufrag:([^\r\n]+)/)?.[1],
                p: sdp.match(/a=ice-pwd:([^\r\n]+)/)?.[1],
                s: sdp.match(/a=setup:([^\r\n]+)/)?.[1],
                i: sdp.match(/a=candidate:\d+\s+\d+\s+udp\s+\d+\s+([\d\.]+)\s+(\d+)\s+typ\s+host/)?.[1],
                port: sdp.match(/a=candidate:\d+\s+\d+\s+udp\s+\d+\s+([\d\.]+)\s+(\d+)\s+typ\s+host/)?.[2]
            };
            
            // Short labels, stringify, and Base64
            const json = JSON.stringify(data);
            return 'v3:' + btoa(json);
        } catch (e) {
            console.error("SDP Minify Error:", e);
            return sdp;
        }
    },

    expand(minified) {
        if (!minified) return "";
        if (!minified.startsWith('v3:')) {
            // Fallback for older formats
            return minified.includes('§') ? minified.split('§').join('\r\n') + '\r\n' : minified;
        }

        try {
            const json = atob(minified.substring(3));
            const d = JSON.parse(json);

            const sdpLines = [
                'v=0',
                'o=- 0 0 IN IP4 127.0.0.1',
                's=-',
                't=0 0',
                'a=msid-semantic: WMS',
                'm=application 9 DTLS/SCTP webrtc-datachannel',
                'c=IN IP4 0.0.0.0',
                `a=setup:${d.s || 'actpass'}`,
                `a=ice-ufrag:${d.u}`,
                `a=ice-pwd:${d.p}`,
                `a=fingerprint:sha-256 ${d.f}`,
                'a=mid:0',
                'a=sctp-port:5000',
                'a=sctpmap:5000 webrtc-datachannel 1024'
            ];

            if (d.i && d.port) {
                sdpLines.push(`a=candidate:1 1 udp 2122260223 ${d.i} ${d.port} typ host`);
            }

            return sdpLines.join('\r\n') + '\r\n';
        } catch (e) {
            console.error("SDP Expand Error:", e);
            return minified;
        }
    }
};
