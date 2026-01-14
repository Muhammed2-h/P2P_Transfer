import { writable } from 'svelte/store';

const STORAGE_KEY = 'warpshare_settings';

function createSettingsStore() {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    const initial = saved ? JSON.parse(saved) : {
        soundsEnabled: true,
        recentPeers: [] // Max 3
    };

    const { subscribe, update, set } = writable(initial);

    if (typeof window !== 'undefined') {
        subscribe(val => {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(val));
        });
    }

    return {
        subscribe,
        toggleSounds: () => update(s => ({ ...s, soundsEnabled: !s.soundsEnabled })),
        addRecentPeer: (peerCode) => update(s => {
            const trimmed = peerCode.trim().toUpperCase();
            if (!trimmed) return s;

            const filtered = s.recentPeers.filter(p => p !== trimmed);
            const newList = [trimmed, ...filtered].slice(0, 3);
            return { ...s, recentPeers: newList };
        }),
        removeRecentPeer: (peerCode) => update(s => ({
            ...s,
            recentPeers: s.recentPeers.filter(p => p !== peerCode)
        }))
    };
}

export const settings = createSettingsStore();
