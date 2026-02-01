export const cryptoUtils = {
    // Generate a random AES-GCM key
    async generateKey() {
        return await window.crypto.subtle.generateKey(
            {
                name: "AES-GCM",
                length: 256
            },
            true,
            ["encrypt", "decrypt"]
        );
    },

    // Export key to base64 string
    async exportKey(key) {
        const exported = await window.crypto.subtle.exportKey("raw", key);
        return this.arrayBufferToBase64(exported);
    },

    // Import key from base64 string
    async importKey(base64Key) {
        const raw = this.base64ToArrayBuffer(base64Key);
        return await window.crypto.subtle.importKey(
            "raw",
            raw,
            "AES-GCM",
            true,
            ["encrypt", "decrypt"]
        );
    },

    // Generate random IV
    generateIV() {
        return window.crypto.getRandomValues(new Uint8Array(12));
    },

    // Encrypt file (Blob) -> Returns { blob: EncryptedBlob, iv: Uint8Array }
    async encryptBlob(blob, key) {
        const iv = this.generateIV();
        const arrayBuffer = await blob.arrayBuffer();

        const encryptedBuffer = await window.crypto.subtle.encrypt(
            {
                name: "AES-GCM",
                iv: iv
            },
            key,
            arrayBuffer
        );

        return {
            blob: new Blob([encryptedBuffer]),
            iv: iv
        };
    },

    // Decrypt file (Blob) -> Returns DecryptedBlob
    async decryptBlob(encryptedBlob, key, iv) {
        const arrayBuffer = await encryptedBlob.arrayBuffer();

        const decryptedBuffer = await window.crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: iv
            },
            key,
            arrayBuffer
        );

        return new Blob([decryptedBuffer]);
    },

    // Utils
    arrayBufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    },

    base64ToArrayBuffer(base64) {
        const binary_string = window.atob(base64);
        const len = binary_string.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binary_string.charCodeAt(i);
        }
        return bytes.buffer;
    }
};
