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
            <button class="btn-primary" on:click={joinSession} disabled={!code}>
                {#if state === TRANSFER_STATES.CONNECTING}
                    Connecting...
                {:else}
                    Connect
                {/if}
            </button>
        </div>
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
        margin: 2rem auto;
        padding: 2rem;
    }

    .input-group {
        display: flex;
        gap: 1rem;
        margin: 2rem 0;
    }

    input {
        flex: 1;
        padding: 1rem;
        background: var(--surface-color-2);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-md);
        color: var(--text-primary);
        font-size: 1.2rem;
        letter-spacing: 0.1em;
        text-align: center;
        text-transform: uppercase;
    }

    .status-box {
        margin-bottom: 2rem;
        text-align: center;
    }

    .dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: var(--text-secondary);
        display: inline-block;
        margin-right: 0.5rem;
    }

    .dot.active {
        background: var(--success);
        box-shadow: 0 0 10px var(--success);
    }

    .queue-list-receiver {
        margin-bottom: 2rem;
    }

    .queue-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
        gap: 1rem;
    }

    .queue-card {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-md);
        padding: 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .file-details {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }

    .fname {
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .fsize {
        font-size: 0.8rem;
        color: var(--text-secondary);
    }

    .btn-download {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 0.5rem;
        background: var(--surface-color-2);
        border: 1px solid var(--primary-color);
        color: var(--primary-color);
        border-radius: var(--radius-sm);
        cursor: pointer;
        transition: all 0.2s;
    }

    .btn-download:hover {
        background: var(--primary-color);
        color: white;
    }

    .btn-xs {
        width: 100%;
        padding: 0.5rem;
        background: var(--primary-color);
        color: white;
        border: none;
        border-radius: var(--radius-sm);
        cursor: pointer;
        font-weight: 500;
        transition: 0.2s;
    }

    .btn-xs:hover {
        background: var(--primary-hover);
    }

    .status-text {
        display: block;
        text-align: center;
        font-size: 0.85rem;
        color: var(--text-secondary);
    }

    .text-success {
        color: var(--success);
    }

    .accept-modal {
        background: rgba(0, 0, 0, 0.5);
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 100;
    }

    .modal-content {
        background: var(--surface-color);
        padding: 2rem;
        border-radius: var(--radius-md);
        border: 1px solid var(--primary-color);
        text-align: center;
        max-width: 400px;
        width: 90%;
        position: relative;
    }

    .drop-zone-mini {
        border: 2px dashed var(--border-color);
        border-radius: var(--radius-md);
        padding: 1.5rem;
        text-align: center;
        margin-bottom: 2rem;
        cursor: pointer;
        transition: all 0.2s;
        background: rgba(255, 255, 255, 0.02);
    }

    .drop-zone-mini:hover {
        border-color: var(--primary-color);
        background: rgba(255, 255, 255, 0.05);
    }

    .icon-small {
        color: var(--primary-color);
        margin-bottom: 0.5rem;
        display: flex;
        justify-content: center;
    }

    .close-btn {
        position: absolute;
        top: 0.5rem;
        right: 0.5rem;
        background: transparent;
        border: none;
        color: var(--text-secondary);
        cursor: pointer;
        padding: 0.25rem;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: all 0.2s;
    }

    .close-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        color: white;
    }

    .error-msg {
        color: var(--error);
        margin-top: 1rem;
        text-align: center;
        background: rgba(239, 68, 68, 0.1);
        padding: 0.75rem;
        border-radius: var(--radius-sm);
        border: 1px solid var(--error);
    }

    .btn-refresh-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        background: transparent;
        border: none;
        color: var(--text-secondary);
        cursor: pointer;
        margin-left: 0.5rem;
        padding: 0.25rem;
        border-radius: 50%;
        transition: all 0.2s;
    }

    .btn-refresh-icon:hover {
        background: rgba(255, 255, 255, 0.1);
        color: var(--warning);
    }

    .status-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
    }

    .btn-icon {
        background: transparent;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0.5rem;
        border-radius: 50%;
        transition: all 0.2s;
    }

    .btn-icon:hover {
        background: rgba(255, 255, 255, 0.1);
    }

    .transfer-controls {
        display: flex;
        gap: 0.5rem;
        align-items: center;
    }

    .btn-icon-danger {
        background: transparent;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0.5rem;
        border-radius: 50%;
        transition: all 0.2s;
    }

    .btn-icon-danger:hover {
        background: rgba(239, 68, 68, 0.1);
    }
</style>
