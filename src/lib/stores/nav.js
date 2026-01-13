import { writable } from 'svelte/store';

export const VIEWS = {
    HOME: 'home',
    SENDER: 'sender',
    RECEIVER: 'receiver'
};

export const currentView = writable(VIEWS.HOME);
