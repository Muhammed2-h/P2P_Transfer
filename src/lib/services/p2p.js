import { v4 as generateUUID } from 'uuid';
import { io } from 'socket.io-client';
import { transfer, TRANSFER_STATES } from '../stores/transfer';
import { get } from 'svelte/store';
import { history } from '../stores/history';
import { playSound } from '../utils/sounds';
import { settings } from '../stores/settings';

// Configurations
// Configurations
// Configurations
const CHUNK_SIZE = 16 * 1024; // 16KB (Best for WiFi stability and low jitter)
const BUFFER_THRESHOLD = 256 * 1024; // 256KB (Keeps the network responsive)
const UI_UPDATE_INTERVAL = 100; // ms
const SIGNALING_SERVER = import.meta.env.VITE_SIGNALING_SERVER || 'http://localhost:3000';

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' }
    ],
    iceCandidatePoolSize: 10, // Pre-gather candidates for instant LAN connection
    iceTransportPolicy: 'all',
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require'
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
        this.lastUiUpdate = 0;
        this.transferredBytes = 0; // Local counter for speed

        // Batch Writing Optimization
        this.receiveBuffer = [];
        this.receiveBufferSize = 0;
        this.writeThreshold = 4 * 1024 * 1024; // 4MB Write Batch (Smoother progression)
    }

    // --- Signaling ---

    init(sessionId, isSender) {
        const role = isSender ? 'sender' : 'receiver';
        transfer.update(s => ({ ...s, sessionId, role, state: TRANSFER_STATES.CONNECTING }));

        this.socket = io(SIGNALING_SERVER);

        this.socket.on('connect', () => {
            this.socket.emit('join-room', { roomId: sessionId, role });
        });

        this.socket.on('error-room-not-found', () => {
            transfer.update(s => ({ ...s, state: TRANSFER_STATES.ERROR, error: 'Session code not found. Check code.' }));
            this.socket.disconnect();
        });
        this.socket.on('peer-joined', () => {
            if (isSender) {
                // Security: Don't auto-connect. Ask for approval.
                if (this.onConnectionRequestCallback) {
                    this.onConnectionRequestCallback(); 
                } else {
                    // Fallback if no listener (shouldn't happen in new UI)
                    this.startConnection();
                }
            }
        });
        
        this.socket.on('kicked', () => {
             transfer.update(s => ({ ...s, state: TRANSFER_STATES.ERROR, error: 'Connection rejected by host.' }));
             this.cleanup();
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

    // --- Connection Approval ---
    setConnectionRequestListener(callback) {
        this.onConnectionRequestCallback = callback;
    }

    approveConnection() {
        this.startConnection();
    }

    rejectConnection() {
        if (this.socket) {
            this.socket.emit('kick-peer', { roomId: get(transfer).sessionId });
        }
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
        
        // Optimize for continuous flow without stalls
        channel.bufferedAmountLowThreshold = BUFFER_THRESHOLD / 2;

        channel.onopen = () => {
            transfer.update(s => ({ ...s, state: TRANSFER_STATES.CONNECTED }));

            // Audible Ping
            if (get(settings).soundsEnabled) {
                playSound('connect');
            }
            
            this.startStatsMonitoring();
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
        channel.bufferedAmountLowThreshold = BUFFER_THRESHOLD / 4;
    }

    // --- Sending Logic ---


    addToQueue(file) {
        const fileId = generateUUID();
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

        if (get(settings).soundsEnabled) {
            playSound('start');
        }

        this.startTime = Date.now();
        this.lastUiUpdate = this.startTime;
        this.transferredBytes = 0;
        let offset = 0;

        const readSlice = async (o) => {
            const slice = file.slice(o, o + CHUNK_SIZE);
            return await slice.arrayBuffer();
        };

        const flush = async () => {
            // Pipeline: Start reading the first chunk immediately
            let nextChunkPromise = readSlice(offset);

            while (offset < file.size) {
                // Check backpressure
                if (this.dataChannel.bufferedAmount > BUFFER_THRESHOLD) {
                    await new Promise(resolve => {
                        this.dataChannel.onbufferedamountlow = () => {
                            this.dataChannel.onbufferedamountlow = null;
                            resolve();
                        };
                    });
                }

                // Wait for the chunk that was being read
                const chunk = await nextChunkPromise;

                // Move offset forward
                offset += chunk.byteLength;
                this.transferredBytes = offset;

                // Start reading the NEXT chunk while we send the current one
                if (offset < file.size) {
                    nextChunkPromise = readSlice(offset);
                }

                this.dataChannel.send(chunk);

                // Throttle UI
                this.updateProgress(offset, false);

                // Pause logic
                if (this.isPaused) {
                    await new Promise(resolve => {
                        const check = setInterval(() => {
                            if (!this.isPaused) {
                                clearInterval(check);
                                resolve();
                            }
                        }, 50);
                    });
                }
            }

            this.updateProgress(file.size, true);
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
                this.recordHistory(msg.fileId, 'sender');
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

            case 'TEXT_UPDATE':
                transfer.update(s => ({ ...s, sharedText: msg.text }));
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
                this.cleanup();
                transfer.update(s => ({ ...s, error: 'Peer left session', state: TRANSFER_STATES.IDLE }));
                break;

            case 'CHAT': {
                // Determine sender type (image or text)
                const newMsg = {
                    id: msg.id, // now sending IDs
                    text: msg.text,
                    image: msg.image, // base64 string
                    cloudEntry: msg.cloudEntry,
                    replyTo: msg.replyTo,
                    sender: 'peer',
                    time: Date.now()
                };
                transfer.update(s => ({
                    ...s,
                    messages: [...s.messages, newMsg]
                }));
                if (get(settings).soundsEnabled) {
                    playSound('connect');
                }
                break;
            }

            case 'CHAT_EDIT': {
                transfer.update(s => ({
                    ...s,
                    messages: s.messages.map(m =>
                        m.id === msg.id ? { ...m, text: msg.text, edited: true } : m
                    )
                }));
                break;
            }
        }
    }

    async acceptFile() {
        const s = get(transfer);
        this.transferredBytes = 0; // Reset for receiver

        // Reset Buffer
        this.receiveBuffer = [];
        this.receiveBufferSize = 0;

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
        if (!this.fileWriter) return;

        // Push to memory buffer
        this.receiveBuffer.push(buffer);
        this.receiveBufferSize += buffer.byteLength;
        this.transferredBytes += buffer.byteLength;

        // Update UI (Throttled inside the method)
        this.updateProgress(this.transferredBytes);

        // Flush to disk if threshold reached
        if (this.receiveBufferSize >= this.writeThreshold) {
            await this.flushBuffer();
        }
    }

    async flushBuffer() {
        if (!this.fileWriter || this.receiveBufferSize === 0) return;

        // CRITICAL FIX: Atomic Swap
        // Capture the current buffer and reset the instance storage immediately.
        // This prevents incoming chunks (arriving during the async write) from being deleted.
        const chunksToWrite = this.receiveBuffer;
        this.receiveBuffer = [];
        this.receiveBufferSize = 0;

        try {
            const blob = new Blob(chunksToWrite);
            await this.fileWriter.write(blob);
        } catch (err) {
            console.error("Disk Write Error:", err);
            transfer.update(s => ({ ...s, error: 'Disk write failed', state: TRANSFER_STATES.ERROR }));
        }
    }

    async finalizeFile() {
        if (this.fileWriter) {
            // Write remaining data
            await this.flushBuffer();
            await this.fileWriter.close();
            this.fileWriter = null;
        }

        if (get(settings).soundsEnabled) {
            playSound('complete');
        }

        // Notify completion
        const s = get(transfer);
        if (s.currentFileId) {
            this.sendTransferSuccess(s.currentFileId);
            this.updateQueueStatus(s.currentFileId, 'completed');
            this.recordHistory(s.currentFileId, 'receiver');

            transfer.update(st => ({
                ...st,
                state: TRANSFER_STATES.COMPLETED,
                progress: 100,
                timeLeft: 0
            }));
        }
    }

    recordHistory(fileId, role) {
        const s = get(transfer);
        const fileItem = s.fileQueue.find(i => i.id === fileId);
        if (fileItem) {
            history.add({
                name: fileItem.name,
                size: fileItem.size,
                role: role
            });
        }
    }

    sendSharedText(text) {
        if (this.dataChannel && this.dataChannel.readyState === 'open') {
            this.dataChannel.send(JSON.stringify({
                type: 'TEXT_UPDATE',
                text: text
            }));
            transfer.update(s => ({ ...s, sharedText: text }));
        }
    }

    sendChatMessage(payload) {
        // payload: { text, image, replyTo }
        if (!payload.text && !payload.image) return;

        const id = generateUUID();
        const msgData = {
            type: 'CHAT',
            id: id,
            text: payload.text,
            image: payload.image,
            cloudEntry: payload.cloudEntry, // { name, size, url, key, iv }
            replyTo: payload.replyTo
        };

        if (this.dataChannel && this.dataChannel.readyState === 'open') {
            this.dataChannel.send(JSON.stringify(msgData));

            // Add to local state
            transfer.update(s => ({
                ...s,
                messages: [...s.messages, { ...msgData, sender: 'me', time: Date.now() }]
            }));
        }
    }

    sendChatEdit(id, newText) {
        if (!id || !newText.trim()) return;

        if (this.dataChannel && this.dataChannel.readyState === 'open') {
            this.dataChannel.send(JSON.stringify({
                type: 'CHAT_EDIT',
                id: id,
                text: newText
            }));

            // Update local
            transfer.update(s => ({
                ...s,
                messages: s.messages.map(m =>
                    m.id === id ? { ...m, text: newText, edited: true } : m
                )
            }));
        }
    }

    // --- Utils ---

    updateProgress(bytes, force = false) {
        const now = Date.now();
        if (!force && now - this.lastUiUpdate < UI_UPDATE_INTERVAL) return;

        this.lastUiUpdate = now;
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

        // Clear buffer on stop
        this.receiveBuffer = [];
        this.receiveBufferSize = 0;

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

    // --- Stats & Monitoring ---

    // --- Discovery (Real-time) ---

    subscribeToNearby(callback) {
        // Use existing socket or create a dedicated one if we are just browsing
        if (!this.discoverySocket) {
             this.discoverySocket = io(SIGNALING_SERVER);
        }

        // Handle updates
        this.discoverySocket.on('nearby-found', (nearby) => {
            callback(nearby);
        });
        
        // Trigger initial fetch
        this.discoverySocket.emit('find-nearby');

        // Return cleanup function
        return () => this.stopDiscovery();
    }

    stopDiscovery() {
        if (this.discoverySocket) {
            this.discoverySocket.disconnect();
            this.discoverySocket = null;
        }
    }

    startStatsMonitoring() {
        if (this.statsInterval) clearInterval(this.statsInterval);

        this.statsInterval = setInterval(async () => {
            if (!this.peerConnection || this.peerConnection.connectionState !== 'connected') return;

            try {
                const stats = await this.peerConnection.getStats();
                let activePair = null;
                const candidates = new Map();

                // 1. Index all candidates
                stats.forEach(report => {
                    if (report.type === 'remote-candidate' || report.type === 'local-candidate') {
                        candidates.set(report.id, report);
                    }
                });

                // 2. Find the Active Candidate Pair
                stats.forEach(report => {
                    // Modern Browsers: 'nominated' pair is the one doing the work
                    // Fallback: 'succeeded' state
                    if (report.type === 'candidate-pair' && (report.nominated || report.state === 'succeeded')) {
                        // If we already found one, only replace if this one has higher bytesSent/Received (more active)
                        if (!activePair || (report.bytesSent + report.bytesReceived > activePair.bytesSent + activePair.bytesReceived)) {
                            activePair = report;
                        }
                    }
                });

                if (activePair) {
                    const latency = (activePair.currentRoundTripTime || 0) * 1000;
                    
                    // Resolve connection type from the remote candidate
                    const remoteCand = candidates.get(activePair.remoteCandidateId);
                    const connectionType = remoteCand ? remoteCand.candidateType : 'unknown';

                    // Map types
                    const typeMap = {
                        'host': 'Local LAN (Fastest)',
                        'srflx': 'P2P (STUN)',
                        'prflx': 'P2P (Nat)',
                        'relay': 'Relay (TURN/Slow)'
                    };
                    const friendlyType = typeMap[connectionType] || connectionType;

                    // Buffer Health
                    const buffer = this.dataChannel ? this.dataChannel.bufferedAmount : 0;
                    const bufferHealth = buffer < BUFFER_THRESHOLD ? 'Healthy' : 'Congested';

                    transfer.update(s => ({
                        ...s,
                        networkStats: {
                            latency: Math.round(latency),
                            connectionType: friendlyType,
                            bufferHealth: bufferHealth,
                            bufferSize: buffer
                        }
                    }));
                }
            } catch (e) {
                console.warn("Stats error", e);
            }
        }, 1000);
    }

    stopStatsMonitoring() {
        if (this.statsInterval) {
            clearInterval(this.statsInterval);
            this.statsInterval = null;
        }
    }

    // --- Cleanup ---

    cleanup() {
        this.stopStatsMonitoring();
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
