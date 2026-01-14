import { writable } from 'svelte/store';

const STORAGE_KEY = 'warpshare_settings';

function createSettingsStore() {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    const initial = saved ? JSON.parse(saved) : {
        soundsEnabled: true
    };

    const { subscribe, update, set } = writable(initial);

    if (typeof window !== 'undefined') {
        subscribe(val => {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(val));
        });
    }

    return {
        subscribe,
        toggleSounds: () => update(s => ({ ...s, soundsEnabled: !s.soundsEnabled }))
    };
}

export const settings = createSettingsStore();
