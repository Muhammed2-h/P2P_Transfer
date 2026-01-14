<script>
    import { p2p } from "../services/p2p";
    import { transfer, TRANSFER_STATES } from "../stores/transfer";
    import ProgressBar from "./ProgressBar.svelte";
    import {
        Download,
        FileQuestion,
        UploadCloud,
        X,
        RefreshCw,
        Pause,
        Play,
        XCircle,
    } from "lucide-svelte";

    let code = "";
    let fileInput;

    function handleFileSelect(e) {
        const files = Array.from(e.target.files);
        files.forEach((file) => {
            p2p.addToQueue(file);
        });
        // Reset input
        e.target.value = "";
    }

    function joinSession() {
        if (code.length === 6) {
            p2p.init(code.toUpperCase(), false);
        }
    }

    function acceptFile() {
        // Receiver accepts the *current* pending file
        p2p.acceptFile(); // This triggers showSaveFilePicker
    }

    function closeModal() {
        // Dismiss header and return to connected state
        const s = $transfer;
        if (s.currentFileId) {
            p2p.rejectFile(s.currentFileId);
        }
        transfer.update((s) => ({
            ...s,
            state: TRANSFER_STATES.CONNECTED,
            currentFileId: null,
        }));
    }

    function requestDownload(fileId) {
        p2p.requestFileDownload(fileId);
    }

    $: state = $transfer.state;
    $: isConnected =
        state === TRANSFER_STATES.CONNECTED ||
        state === TRANSFER_STATES.TRANSFERRING ||
        state === TRANSFER_STATES.WAITING_ACCEPTANCE ||
        state === TRANSFER_STATES.PAUSED ||
        state === TRANSFER_STATES.COMPLETED;
    $: queue = $transfer.fileQueue || [];
</script>

<div class="receiver-container glass-panel fade-in">
    <h2>Receive Files</h2>

    {#if state === TRANSFER_STATES.IDLE || state === TRANSFER_STATES.ERROR || state === TRANSFER_STATES.CONNECTING}
        <div class="input-group">
            <input
                type="text"
                placeholder="Enter 6-digit code"
                bind:value={code}
                maxlength="6"
                on:keydown={(e) => e.key === "Enter" && joinSession()}
            />
            <button
                class="btn-primary"
                on:click={joinSession}
                disabled={!code || state === TRANSFER_STATES.CONNECTING}
            >
                {#if state === TRANSFER_STATES.CONNECTING}
                    <RefreshCw size={18} class="spin" />
                    Connecting...
                {:else}
                    Connect
                {/if}
            </button>
        </div>
        {#if state === TRANSFER_STATES.CONNECTING}
            <button class="btn-link" on:click={() => p2p.cleanup()}
                >Cancel & Try Again</button
            >
        {/if}
        {#if $transfer.error}
            <p class="error-msg">{$transfer.error}</p>
        {/if}
    {/if}

    {#if isConnected}
        <div class="status-box">
            <div class="status-indicator">
                <span class="dot active"></span>
                <span>Connected to Sender</span>
                <button
                    class="btn-refresh-icon"
                    on:click={() => window.location.reload()}
                    title="Reload App"
                >
                    <RefreshCw size={16} />
                </button>
            </div>
        </div>

        <!-- Receiver Upload Area -->
        <div
            class="drop-zone-mini"
            role="button"
            tabindex="0"
            on:click={() => fileInput.click()}
            on:keydown={(e) => e.key === "Enter" && fileInput.click()}
        >
            <input
                type="file"
                multiple
                bind:this={fileInput}
                on:change={handleFileSelect}
                style="display: none;"
            />
            <div class="icon-small">
                <UploadCloud size={24} />
            </div>
            <p>Share a file with Sender</p>
        </div>

        {@const incoming = queue.filter((i) => !i.file)}
        {@const outgoing = queue.filter((i) => i.file)}

        {#if incoming.length > 0}
            <div class="queue-list-receiver">
                <h3>Incoming Files (From Sender)</h3>
                <div class="queue-grid">
                    {#each incoming as item}
                        <div class="queue-card incoming-card">
                            <div class="file-icon">
                                <Download size={32} />
                            </div>
                            <div class="file-details">
                                <span class="fname" title={item.name}
                                    >{item.name}</span
                                >
                                <span class="fsize"
                                    >{(item.size / 1024 / 1024).toFixed(2)} MB</span
                                >
                            </div>
                            <div class="action-area">
                                {#if item.status === "queued"}
                                    <button
                                        class="btn-download"
                                        on:click={() =>
                                            requestDownload(item.id)}
                                    >
                                        <Download size={16} /> Download
                                    </button>
                                {:else if item.status === "transferring"}
                                    <span class="status-text"
                                        >Transferring...</span
                                    >
                                {:else if item.status === "completed"}
                                    <button
                                        class="btn-download"
                                        on:click={() =>
                                            requestDownload(item.id)}
                                        >Download Again</button
                                    >
                                {/if}
                            </div>
                        </div>
                    {/each}
                </div>
            </div>
        {/if}

        {#if outgoing.length > 0}
            <div class="queue-list-receiver">
                <h3>Outgoing Files (To Sender)</h3>
                <div class="queue-grid">
                    {#each outgoing as item}
                        <div class="queue-card outgoing-card">
                            <div class="file-icon">
                                <UploadCloud size={32} />
                            </div>
                            <div class="file-details">
                                <span class="fname" title={item.name}
                                    >{item.name}</span
                                >
                                <span class="fsize"
                                    >{(item.size / 1024 / 1024).toFixed(2)} MB</span
                                >
                            </div>
                            <div class="action-area">
                                {#if item.status === "queued"}
                                    <button
                                        class="btn-xs"
                                        on:click={() =>
                                            p2p.startFileTransfer(item.id)}
                                        >Send</button
                                    >
                                {:else if item.status === "transferring"}
                                    <span class="status-text">Sending...</span>
                                {:else if item.status === "completed"}
                                    <span class="status-text text-success"
                                        >Sent</span
                                    >
                                {/if}
                            </div>
                        </div>
                    {/each}
                </div>
            </div>
        {/if}
    {/if}

    {#if state === TRANSFER_STATES.WAITING_ACCEPTANCE}
        <div class="accept-modal">
            <div class="modal-content">
                <button class="close-btn" on:click={closeModal} title="Close">
                    <X size={24} />
                </button>
                <h3>Incoming File: {$transfer.fileName}</h3>
                <p>{($transfer.totalSize / 1024 / 1024).toFixed(2)} MB</p>
                <button class="btn-primary" on:click={acceptFile}>Save</button>
            </div>
        </div>
    {/if}

    {#if state === TRANSFER_STATES.TRANSFERRING || state === TRANSFER_STATES.PAUSED || state === TRANSFER_STATES.COMPLETED}
        <div class="transfer-status">
            <div class="status-header">
                <h3>Receiving: {$transfer.fileName}</h3>
                {#if state !== TRANSFER_STATES.COMPLETED}
                    <div class="transfer-controls">
                        <button
                            class="btn-icon"
                            on:click={() => p2p.togglePause()}
                            title={state === TRANSFER_STATES.PAUSED
                                ? "Resume"
                                : "Pause"}
                        >
                            {#if state === TRANSFER_STATES.PAUSED}
                                <Play size={24} color="var(--success)" />
                            {:else}
                                <Pause size={24} color="var(--warning)" />
                            {/if}
                        </button>
                        <button
                            class="btn-icon-danger"
                            on:click={() => p2p.cancelFileTransfer()}
                            title="Cancel Transfer"
                        >
                            <XCircle size={24} color="var(--error)" />
                        </button>
                    </div>
                {/if}
            </div>
            <ProgressBar
                progress={$transfer.progress}
                speed={$transfer.speed}
                timeLeft={$transfer.timeLeft}
            />
        </div>
    {/if}
</div>

<style>
    .receiver-container {
        max-width: 600px;
        margin: 1rem auto;
        padding: 1.5rem;
        width: calc(100% - 2rem);
    }

    @media (min-width: 640px) {
        .receiver-container {
            margin: 2rem auto;
            padding: 2rem;
            width: 100%;
        }
    }

    .input-group {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        margin: 1.5rem 0;
    }

    @media (min-width: 480px) {
        .input-group {
            flex-direction: row;
        }
    }

    input {
        flex: 1;
        padding: 0.75rem 1rem;
        background: var(--surface-color-2);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-md);
        color: var(--text-primary);
        font-size: 1.1rem;
        letter-spacing: 0.1em;
        text-align: center;
        text-transform: uppercase;
        width: 100%;
    }

    @media (min-width: 640px) {
        input {
            padding: 1rem;
            font-size: 1.25rem;
        }
    }

    .status-box {
        margin-bottom: 2rem;
        text-align: center;
    }

    .status-indicator {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        font-size: 0.9rem;
        color: var(--text-secondary);
    }

    .btn-link {
        background: transparent;
        color: var(--text-secondary);
        border: none;
        font-size: 0.9rem;
        text-decoration: underline;
        cursor: pointer;
        margin: 0 auto 1.5rem;
        display: block;
        transition: color 0.2s;
    }

    .btn-link:hover {
        color: var(--primary-color);
    }

    :global(.spin) {
        animation: spin 1.5s linear infinite;
    }

    @keyframes spin {
        from {
            transform: rotate(0deg);
        }
        to {
            transform: rotate(360deg);
        }
    }

    .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--text-secondary);
        display: inline-block;
    }

    .dot.active {
        background: var(--success);
        box-shadow: 0 0 10px var(--success);
    }

    .queue-list-receiver {
        margin-bottom: 2rem;
    }

    .queue-list-receiver h3 {
        font-size: 1.1rem;
        margin-bottom: 1rem;
    }

    .queue-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 0.75rem;
    }

    @media (min-width: 540px) {
        .queue-grid {
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
        }
    }

    .queue-card {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-md);
        padding: 1rem;
        display: flex;
        align-items: center;
        gap: 1rem;
    }

    @media (min-width: 540px) {
        .queue-card {
            flex-direction: column;
            text-align: center;
            gap: 0.75rem;
        }
    }

    .file-icon {
        width: 40px;
        height: 40px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.05);
        border-radius: var(--radius-sm);
        color: var(--primary-color);
    }

    @media (min-width: 540px) {
        .file-icon {
            width: 48px;
            height: 48px;
        }
    }

    .file-details {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        text-align: left;
    }

    @media (min-width: 540px) {
        .file-details {
            text-align: center;
            width: 100%;
        }
    }

    .fname {
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-size: 0.95rem;
    }

    .fsize {
        font-size: 0.8rem;
        color: var(--text-secondary);
    }

    .action-area {
        flex-shrink: 0;
    }

    @media (min-width: 540px) {
        .action-area {
            width: 100%;
        }
    }

    .btn-download,
    .btn-xs {
        width: auto;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        background: var(--surface-color-2);
        border: 1px solid var(--primary-color);
        color: var(--primary-color);
        border-radius: var(--radius-sm);
        cursor: pointer;
        transition: all 0.2s;
        font-size: 0.85rem;
    }

    @media (min-width: 540px) {
        .btn-download,
        .btn-xs {
            width: 100%;
        }
    }

    .btn-download:hover,
    .btn-xs:hover {
        background: var(--primary-color);
        color: white;
    }

    .btn-xs {
        background: var(--primary-color);
        color: white;
    }

    .status-text {
        font-size: 0.85rem;
        color: var(--text-secondary);
    }

    .drop-zone-mini {
        border: 2px dashed var(--border-color);
        border-radius: var(--radius-md);
        padding: 1.25rem;
        text-align: center;
        margin-bottom: 2rem;
        cursor: pointer;
        transition: all 0.2s;
        background: rgba(255, 255, 255, 0.02);
    }

    .drop-zone-mini p {
        font-size: 0.95rem;
        color: var(--text-secondary);
    }

    .drop-zone-mini:hover {
        border-color: var(--primary-color);
        background: rgba(99, 102, 241, 0.05);
    }

    .drop-zone-mini:hover p {
        color: var(--text-primary);
    }

    .modal-content {
        padding: 2rem 1.5rem;
        width: calc(100% - 2rem);
        max-width: 400px;
    }

    .transfer-status {
        margin-top: 1.5rem;
    }

    .status-header {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        margin-bottom: 1rem;
    }

    @media (min-width: 480px) {
        .status-header {
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
        }
    }

    .status-header h3 {
        font-size: 1.1rem;
        text-overflow: ellipsis;
        overflow: hidden;
        white-space: nowrap;
    }

    .transfer-controls {
        display: flex;
        gap: 0.5rem;
        align-items: center;
        justify-content: flex-end;
    }
</style>
