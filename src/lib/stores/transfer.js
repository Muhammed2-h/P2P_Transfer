import { writable } from 'svelte/store';

export const TRANSFER_STATES = {
    IDLE: 'idle',
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
    TRANSFERRING: 'transferring',
    WAITING_ACCEPTANCE: 'waiting_acceptance',
    COMPLETED: 'completed',
    ERROR: 'error',
    PAUSED: 'paused'
};

function createTransferStore() {
    const { subscribe, set, update } = writable({
        state: TRANSFER_STATES.IDLE,
        role: null, // 'sender' | 'receiver'
        progress: 0,
        speed: 0, // bytes per second
        bytesTransferred: 0,
        totalSize: 0,
        fileName: '',
        timeLeft: null,
        error: null,
        sessionId: null,
        currentFileId: null,
        fileQueue: [],
        sharedText: '', // Shared text between peers
        messages: [] // Chat history
    });

    return {
        subscribe,
        set,
        update,
        reset: () => set({
            state: TRANSFER_STATES.IDLE,
            role: null,
            progress: 0,
            speed: 0,
            bytesTransferred: 0,
            totalSize: 0,
            fileName: '',
            timeLeft: null,
            error: null,
            sessionId: null,
            currentFileId: null,
            fileQueue: [],
            sharedText: '',
            messages: []
        })
    };
}

export const transfer = createTransferStore();
