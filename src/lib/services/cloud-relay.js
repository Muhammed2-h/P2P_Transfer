
// Optimized Cloud Relay Service with Multi-Provider Fallback
// Prioritizes speed and reliability.

const PROVIDERS = [
    {
        name: 'file.io',
        url: 'https://file.io',
        method: 'POST',
        paramName: 'file',
        parse: (response) => {
            const res = JSON.parse(response);
            if (!res.success) throw new Error('Upload failed');
            return { link: res.link, expiry: '1 download / 14 days' };
        }
    },
    {
        name: 'temp.sh',
        url: 'https://temp.sh/upload',
        method: 'POST',
        paramName: 'file',
        parse: (response) => {
            // temp.sh returns the raw URL string
            if (!response.startsWith('http')) throw new Error('Invalid response');
            return { link: response.trim(), expiry: '3 days' };
        }
    },
    {
        name: 'tmpfiles.org',
        url: 'https://tmpfiles.org/api/v1/upload',
        method: 'POST',
        paramName: 'file',
        parse: (response) => {
            const res = JSON.parse(response);
            if (res.status !== 'success') throw new Error('Upload failed');
            // Convert to direct download link: https://tmpfiles.org/123/file -> https://tmpfiles.org/dl/123/file
            let url = res.data.url;
            if (url.includes('tmpfiles.org/')) {
                url = url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
            }
            return { link: url, expiry: '60 minutes' };
        }
    }
];

export const cloudRelay = {
    async upload(file, onProgress) {
        let lastError = null;

        for (const provider of PROVIDERS) {
            try {
                console.log(`Trying upload via ${provider.name}...`);
                return await this.uploadToProvider(provider, file, onProgress);
            } catch (err) {
                console.warn(`${provider.name} failed:`, err);
                lastError = err;
                // Continue to next provider
            }
        }
        throw lastError || new Error('All providers failed');
    },

    uploadToProvider(provider, file, onProgress) {
        return new Promise((resolve, reject) => {
            const formData = new FormData();
            formData.append(provider.paramName, file);
            if (provider.name === 'file.io') {
                formData.append('expires', '1w'); // Try to request 1 week
            }

            const xhr = new XMLHttpRequest();
            xhr.open(provider.method, provider.url, true);

            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable && onProgress) {
                    onProgress((e.loaded / e.total) * 100);
                }
            };

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const result = provider.parse(xhr.responseText);
                        resolve(result);
                    } catch (e) {
                        reject('Parse Error: ' + e.message);
                    }
                } else {
                    reject(`Server Error ${xhr.status}`);
                }
            };

            xhr.onerror = () => reject('Network Error');
            xhr.timeout = 60000; // 60s timeout per provider
            xhr.ontimeout = () => reject('Timeout');

            xhr.send(formData);
        });
    }
};
