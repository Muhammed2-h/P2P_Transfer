import { io } from 'socket.io-client';
import { transfer, TRANSFER_STATES } from '../stores/transfer';
import { get } from 'svelte/store';

// Configurations
const CHUNK_SIZE = 64 * 1024; // 64KB
const BUFFER_THRESHOLD = 1024 * 1024; // 1MB (Wait if buffer exceeds this)
const SIGNALING_SERVER = import.meta.env.VITE_SIGNALING_SERVER || 'http://localhost:3000'; // Dynamic URL for production

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' }
    ]
};

class P2PService {
    constructor() {
        this.socket = null;
        this.peerConnection = null;
        this.dataChannel = null;
        this.fileHandle = null;
        this.fileWriter = null;
        this.currentFile = null;
        this.startTime = null;
        this.isPaused = false;
    }

    // --- Signaling ---

    init(sessionId, isSender) {
        const role = isSender ? 'sender' : 'receiver';
        transfer.update(s => ({ ...s, sessionId, role, state: TRANSFER_STATES.CONNECTING }));

        this.socket = io(SIGNALING_SERVER);

        this.socket.on('connect', () => {
            console.log('Connected to signaling server');
            this.socket.emit('join-room', { roomId: sessionId, role });
        });

        this.socket.on('error-room-not-found', () => {
            transfer.update(s => ({ ...s, state: TRANSFER_STATES.ERROR, error: 'Session code not found. Check code.' }));
            this.socket.disconnect();
        });
        this.socket.on('peer-joined', () => {
            if (isSender) this.startConnection();
        });

        this.socket.on('offer', async (offer) => {
            if (!isSender) await this.handleOffer(offer);
        });

        this.socket.on('answer', async (answer) => {
            if (isSender) await this.handleAnswer(answer);
        });

        this.socket.on('ice-candidate', async (candidate) => {
            try {
                if (this.peerConnection) {
                    await this.peerConnection.addIceCandidate(candidate);
                }
            } catch (e) {
                console.error('Error adding received ice candidate', e);
            }
        });

        this.socket.on('room-full', () => {
            transfer.update(s => ({ ...s, state: TRANSFER_STATES.ERROR, error: 'Session is full. Try a different code.' }));
            this.cleanup();
        });
    }

    // --- WebRTC Setup ---

    createPeerConnection() {
        this.peerConnection = new RTCPeerConnection(ICE_SERVERS);

        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.socket.emit('ice-candidate', {
                    roomId: get(transfer).sessionId,
                    candidate: event.candidate
                });
            }
        };

        this.peerConnection.onconnectionstatechange = () => {
            console.log('Connection state:', this.peerConnection.connectionState);
            if (this.peerConnection.connectionState === 'disconnected' || this.peerConnection.connectionState === 'failed') {
                this.cleanup();
                transfer.update(s => ({ ...s, error: 'Peer disconnected', state: TRANSFER_STATES.IDLE }));
            }
        };
    }

    async startConnection() {
        this.createPeerConnection();

        // Create Data Channel (Sender side)
        this.dataChannel = this.peerConnection.createDataChannel('file-transfer', { ordered: true });
        this.setupDataChannel(this.dataChannel);

        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);

        this.socket.emit('offer', {
            roomId: get(transfer).sessionId,
            offer
        });
    }

    async handleOffer(offer) {
        this.createPeerConnection();

        // Receive Data Channel (Receiver side)
        this.peerConnection.ondatachannel = (event) => {
            this.dataChannel = event.channel;
            this.setupDataChannel(this.dataChannel);
        };

        await this.peerConnection.setRemoteDescription(offer);
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);

        this.socket.emit('answer', {
            roomId: get(transfer).sessionId,
            answer
        });
    }

    async handleAnswer(answer) {
        await this.peerConnection.setRemoteDescription(answer);
    }

    // --- Data Channel Logic ---

    setupDataChannel(channel) {
        channel.binaryType = 'arraybuffer';

        channel.onopen = () => {
            console.log('Data Channel OPEN');
            transfer.update(s => ({ ...s, state: TRANSFER_STATES.CONNECTED }));
        };

        channel.onmessage = async (event) => {
            const data = event.data;
            if (typeof data === 'string') {
                const msg = JSON.parse(data);
                this.handleControlMessage(msg);
            } else {
                await this.handleChunk(data);
            }
        };

        // For backpressure
        channel.bufferedAmountLowThreshold = CHUNK_SIZE;
    }

    // --- Sending Logic ---


    addToQueue(file) {
        const fileId = crypto.randomUUID();
        const item = {
            id: fileId,
            file: file,
            name: file.name,
            size: file.size,
            status: 'queued' // queued, transferring, completed
        };

        transfer.update(s => {
            const newQueue = [...s.fileQueue, item];
            // Send update to peer immediately
            setTimeout(() => this.sendQueueUpdate(newQueue), 0);
            return { ...s, fileQueue: newQueue };
        });
    }

    updateQueueStatus(fileId, status) {
        transfer.update(s => {
            const newQueue = s.fileQueue.map(item =>
                item.id === fileId ? { ...item, status } : item
            );
            setTimeout(() => this.sendQueueUpdate(newQueue), 0);
            return { ...s, fileQueue: newQueue };
        });
    }

    // --- File Queue Logic ---

    // Sender methods
    sendQueueUpdate(queue) {
        if (!this.dataChannel || this.dataChannel.readyState !== 'open') return;
        // Strip the actual file object before sending JSON
        const safeQueue = queue.map(f => ({ id: f.id, name: f.name, size: f.size, status: f.status }));

        this.dataChannel.send(JSON.stringify({
            type: 'QUEUE_UPDATE',
            queue: safeQueue
        }));
    }

    startFileTransfer(fileId) {
        const state = get(transfer);
        const item = state.fileQueue.find(i => i.id === fileId);
        if (!item || !item.file) return; // Receiver doesn't have 'file' obj, only sender

        this.currentFile = item.file;

        this.updateQueueStatus(fileId, 'transferring');

        transfer.update(s => ({
            ...s,
            fileName: item.name,
            totalSize: item.size,
            currentFileId: fileId,
            state: TRANSFER_STATES.TRANSFERRING
        }));

        // Send Metadata
        this.dataChannel.send(JSON.stringify({
            type: 'METADATA',
            fileId: fileId,
            name: item.name,
            size: item.size,
            mime: item.file.type
        }));
    }

    // Receiver methods
    requestFileDownload(fileId) {
        this.dataChannel.send(JSON.stringify({
            type: 'REQUEST_FILE',
            fileId: fileId
        }));
    }

    sendTransferSuccess(fileId) {
        this.dataChannel.send(JSON.stringify({
            type: 'FILE_COMPLETE',
            fileId: fileId
        }));
    }

    rejectFile(fileId) {
        if (!fileId) return;
        this.dataChannel.send(JSON.stringify({
            type: 'FILE_REJECTED',
            fileId: fileId
        }));
    }

    async startStreaming() {
        const file = this.currentFile;
        if (!file) return;

        this.startTime = Date.now();
        let offset = 0;

        const readSlice = async (o) => {
            const slice = file.slice(offset, offset + CHUNK_SIZE);
            return await slice.arrayBuffer();
        };

        const flush = async () => {
            while (offset < file.size) {
                if (this.dataChannel.bufferedAmount > BUFFER_THRESHOLD) {
                    // Wait for buffer to drain
                    await new Promise(resolve => {
                        this.dataChannel.onbufferedamountlow = () => {
                            this.dataChannel.onbufferedamountlow = null;
                            resolve();
                        };
                    });
                }

                if (this.isPaused) {
                    await new Promise(resolve => {
                        const check = setInterval(() => {
                            if (!this.isPaused) {
                                clearInterval(check);
                                resolve();
                            }
                        }, 100);
                    });
                }

                const chunk = await readSlice(offset);
                this.dataChannel.send(chunk);

                offset += chunk.byteLength;
                this.updateProgress(offset);
            }

            // Done
            this.dataChannel.send(JSON.stringify({ type: 'EOF' }));
        };

        await flush();
    }

    // --- Receiving Logic ---

    async handleControlMessage(msg) {
        switch (msg.type) {
            case 'QUEUE_UPDATE':
                transfer.update(s => {
                    const currentQueue = s.fileQueue;
                    const mergedQueue = msg.queue.map(remoteItem => {
                        const localItem = currentQueue.find(i => i.id === remoteItem.id);
                        // If we have the file object locally, preserve it (we are the owner)
                        if (localItem && localItem.file) {
                            return { ...remoteItem, file: localItem.file };
                        }
                        return remoteItem;
                    });
                    return { ...s, fileQueue: mergedQueue };
                });
                break;

            case 'REQUEST_FILE':
                // Sender receives request
                this.startFileTransfer(msg.fileId);
                break;

            case 'METADATA':
                transfer.update(s => ({
                    ...s,
                    fileName: msg.name,
                    totalSize: msg.size,
                    currentFileId: msg.fileId,
                    state: TRANSFER_STATES.WAITING_ACCEPTANCE
                }));
                break;

            case 'FILE_COMPLETE':
                this.updateQueueStatus(msg.fileId, 'completed');
                break;

            case 'FILE_REJECTED':
                // Sender side: Receiver rejected download, reset to queued
                this.updateQueueStatus(msg.fileId, 'queued');
                // If this was the current file being "prepared" to send, stop
                const current = get(transfer);
                if (current.state === TRANSFER_STATES.TRANSFERRING && this.currentFile && msg.fileId) {
                    // We check if it matches the current file logic, though we track by ID
                    // Simply resetting state is safest
                    transfer.update(s => ({
                        ...s,
                        state: TRANSFER_STATES.CONNECTED,
                        fileName: '',
                        currentFileId: null
                    }));
                    this.currentFile = null;
                }
                break;

            case 'READY':
                // Receiver is ready, sender starts streaming
                this.startStreaming();
                break;

            case 'EOF':
                await this.finalizeFile();
                break;

            case 'CANCEL':
                await this.stopCurrentTransfer();
                console.log('Transfer cancelled by peer');
                break;

            case 'PAUSE':
                this.isPaused = true;
                transfer.update(s => ({ ...s, state: TRANSFER_STATES.PAUSED }));
                break;

            case 'RESUME':
                this.isPaused = false;
                transfer.update(s => ({ ...s, state: TRANSFER_STATES.TRANSFERRING }));
                break;

            case 'DISCONNECT':
                console.log('Peer disconnected cleanly');
                this.cleanup();
                transfer.update(s => ({ ...s, error: 'Peer left session', state: TRANSFER_STATES.IDLE }));
                break;
        }
    }

    async acceptFile() {
        const s = get(transfer);
        await this.initFileSystem(s.fileName, s.totalSize);

        // Check if initFileSystem succeeded (state might be ERROR if cancelled)
        if (get(transfer).state === TRANSFER_STATES.ERROR) return;

        transfer.update(st => ({ ...st, state: TRANSFER_STATES.TRANSFERRING }));
        this.startTime = Date.now();
        this.dataChannel.send(JSON.stringify({ type: 'READY' }));
    }

    async initFileSystem(name, size) {
        try {
            // Show Save File Picker
            if (window['showSaveFilePicker']) {
                const handle = await window['showSaveFilePicker']({
                    suggestedName: name,
                });
                this.fileWriter = await handle.createWritable();
            } else {
                transfer.update(s => ({ ...s, error: 'Browser not supported. Use Chrome/Edge.', state: TRANSFER_STATES.ERROR }));
            }
        } catch (err) {
            console.error("File Save Cancelled or Error", err);
            transfer.update(s => ({ ...s, error: 'File save cancelled', state: TRANSFER_STATES.ERROR }));
        }
    }

    async handleChunk(buffer) {
        if (this.fileWriter) {
            await this.fileWriter.write(buffer);

            const current = get(transfer).bytesTransferred + buffer.byteLength;
            this.updateProgress(current);
        }
    }

    async finalizeFile() {
        if (this.fileWriter) {
            await this.fileWriter.close();
            this.fileWriter = null;
        }

        // Use the ID we stored in METADATA handler
        const currentId = get(transfer).currentFileId;

        transfer.update(s => ({ ...s, state: TRANSFER_STATES.COMPLETED }));

        if (currentId) { // Receiver sends success back
            this.sendTransferSuccess(currentId);
        }

        alert('Transfer Complete!');
    }

    // --- Utils ---

    updateProgress(bytes) {
        const state = get(transfer);
        const now = Date.now();
        const elapsed = (now - this.startTime) / 1000; // seconds
        const speed = bytes / elapsed; // bytes/sec

        transfer.update(s => ({
            ...s,
            bytesTransferred: bytes,
            progress: (bytes / s.totalSize) * 100,
            speed,
            timeLeft: (s.totalSize - bytes) / speed
        }));
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        const type = this.isPaused ? 'PAUSE' : 'RESUME';
        const state = this.isPaused ? TRANSFER_STATES.PAUSED : TRANSFER_STATES.TRANSFERRING;

        if (this.dataChannel && this.dataChannel.readyState === 'open') {
            this.dataChannel.send(JSON.stringify({ type }));
        }

        transfer.update(s => ({ ...s, state }));
    }

    async stopCurrentTransfer() {
        const state = get(transfer);
        const fileId = state.currentFileId;

        this.currentFile = null;
        this.isPaused = false;
        if (this.fileWriter) {
            await this.fileWriter.close().catch(e => console.error(e));
            this.fileWriter = null;
        }

        // Reset the file status in the queue if it was transferring
        if (fileId) {
            this.updateQueueStatus(fileId, 'queued');
        }

        // Do NOT close peerConnection or socket
        // Just reset the UI state related to the transfer
        transfer.update(s => ({
            ...s,
            state: TRANSFER_STATES.CONNECTED,
            progress: 0,
            fileName: '',
            currentFileId: null
        }));
    }

    cancelFileTransfer() {
        if (this.dataChannel && this.dataChannel.readyState === 'open') {
            try {
                this.dataChannel.send(JSON.stringify({ type: 'CANCEL' }));
            } catch (e) {
                console.warn("Could not send CANCEL message", e);
            }
        }
        // Stop locally but don't kill session
        this.stopCurrentTransfer();
    }

    disconnect() {
        // Explicitly tell peer via Signaling AND DataChannel
        if (this.socket) {
            const { sessionId, role } = get(transfer);
            if (sessionId) {
                this.socket.emit('leave-room', { roomId: sessionId, role });
            }
        }

        // Also try DataChannel if open (faster if connected)
        if (this.dataChannel && this.dataChannel.readyState === 'open') {
            try {
                this.dataChannel.send(JSON.stringify({ type: 'DISCONNECT' }));
            } catch (e) {
                console.warn("Could not send DISCONNECT message", e);
            }
        }

        // Full cleanup locally
        this.cleanup();
    }

    cleanup() {
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        if (this.fileWriter) {
            this.fileWriter.close().catch(e => console.error(e));
            this.fileWriter = null;
        }
        this.isPaused = false;
        transfer.reset();
    }
}

export const p2p = new P2PService();
