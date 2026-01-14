import { writable } from 'svelte/store';

const STORAGE_KEY = 'warpshare_history';

function createHistoryStore() {
    // Load from local storage
    const saved = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    const initial = saved ? JSON.parse(saved) : [];

    const { subscribe, update, set } = writable(initial);

    // Auto-save to local storage on changes
    if (typeof window !== 'undefined') {
        subscribe(val => {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(val));
        });
    }

    return {
        subscribe,
        add: (file) => update(history => {
            const newItem = {
                id: crypto.randomUUID(),
                name: file.name,
                size: file.size,
                date: new Date().toISOString(),
                type: file.role === 'sender' ? 'Sent' : 'Received',
                encrypted: true // All WebRTC transfers are DTLS encrypted
            };
            return [newItem, ...history].slice(0, 50); // Keep last 50
        }),
        clear: () => set([]),
        remove: (id) => update(history => history.filter(item => item.id !== id))
    };
}

export const history = createHistoryStore();
