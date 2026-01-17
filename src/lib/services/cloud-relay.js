
// Simple Cloud Relay Service using File.io (Ephemeral Storage)
// This allows high-speed transfer via a neutral cloud server when P2P is slow.

export const cloudRelay = {
    async upload(file, onProgress) {
        const formData = new FormData();
        formData.append('file', file);

        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', 'https://file.io', true);

            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable && onProgress) {
                    onProgress((e.loaded / e.total) * 100);
                }
            };

            xhr.onload = () => {
                if (xhr.status === 200) {
                    const response = JSON.parse(xhr.responseText);
                    if (response.success) {
                        resolve({
                            link: response.link,
                            expiry: response.expiry
                        });
                    } else {
                        reject('Upload failed');
                    }
                } else {
                    reject('Server Error: ' + xhr.status);
                }
            };

            xhr.onerror = () => reject('Network Error');
            xhr.send(formData);
        });
    }
};
