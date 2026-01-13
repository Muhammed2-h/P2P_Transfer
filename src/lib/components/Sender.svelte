<script>
  import { onMount } from "svelte";
  import { v4 as uuidv4 } from "uuid";
  import { p2p } from "../services/p2p";
  import { transfer, TRANSFER_STATES } from "../stores/transfer";
  import ProgressBar from "./ProgressBar.svelte";
  import RefreshTimer from "./RefreshTimer.svelte";
  import {
    Copy,
    X,
    RefreshCw,
    XCircle,
    File,
    Pause,
    Play,
  } from "lucide-svelte";

  let sessionId = "";
  let fileInput;

  function initSession() {
    // Clean up old if exists
    p2p.cleanup();
    sessionId = uuidv4().slice(0, 6).toUpperCase();
    p2p.init(sessionId, true);
  }

  onMount(() => {
    initSession();
  });

  let isCopied = false;

  function copyCode() {
    navigator.clipboard.writeText(sessionId);
    isCopied = true;
    setTimeout(() => (isCopied = false), 2000);
  }

  function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    files.forEach((file) => {
      p2p.addToQueue(file);
    });
    // Reset input
    e.target.value = "";
  }

  function cancel() {
    p2p.cancelFileTransfer();
  }

  function acceptFile() {
    // Sender accepts the *current* pending file from Receiver
    p2p.acceptFile();
  }

  function closeModal() {
    // Dismiss modal and reject file
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

  $: state = $transfer.state;
  $: isConnected =
    state === TRANSFER_STATES.CONNECTED ||
    state === TRANSFER_STATES.TRANSFERRING ||
    state === TRANSFER_STATES.WAITING_ACCEPTANCE ||
    state === TRANSFER_STATES.PAUSED ||
    state === TRANSFER_STATES.COMPLETED;
  $: isTransferring =
    state === TRANSFER_STATES.TRANSFERRING ||
    state === TRANSFER_STATES.WAITING_ACCEPTANCE ||
    state === TRANSFER_STATES.PAUSED;

  // Auto-restart session if disconnected after being connected
  let wasConnected = false;
  $: if (state === TRANSFER_STATES.CONNECTED) {
    wasConnected = true;
  }
  $: if (wasConnected && state === TRANSFER_STATES.IDLE) {
    wasConnected = false;
    initSession();
  }

  $: outgoing = $transfer.fileQueue.filter((i) => i.file);
  $: incoming = $transfer.fileQueue.filter((i) => !i.file);
</script>

<div class="sender-container glass-panel fade-in">
  <h2>Send Files</h2>

  <div class="session-info">
    <p class="label">Share this code with the receiver:</p>
    <div class="code-wrapper">
      <div class="code-box">
        <span class="code">{sessionId}</span>
        <button class="copy-btn" on:click={copyCode} title="Copy Code">
          {#if isCopied}
            <span class="copied-text">Copied!</span>
          {:else}
            <Copy size={20} />
          {/if}
        </button>
      </div>

      {#if !isConnected}
        <div class="refresh-wrapper">
          <RefreshTimer onRefresh={initSession} />
        </div>
      {/if}
    </div>
  </div>

  <div class="status-indicator">
    <span class="dot" class:active={isConnected}></span>
    <span>{isConnected ? "Peer Connected" : "Waiting for Receiver..."}</span>
    <button
      class="btn-refresh-icon"
      on:click={() => window.location.reload()}
      title="Reload App"
    >
      <RefreshCw size={16} />
    </button>
  </div>

  {#if !isTransferring && state !== TRANSFER_STATES.COMPLETED}
    <div
      class="drop-zone"
      role="button"
      tabindex="0"
      class:disabled={!isConnected}
      on:click={() => fileInput.click()}
      on:keydown={(e) => e.key === "Enter" && fileInput.click()}
    >
      <input
        type="file"
        multiple
        bind:this={fileInput}
        on:change={handleFileSelect}
        disabled={!isConnected}
        style="display: none;"
      />
      <div class="icon">
        <File size={48} />
      </div>
      {#if !isConnected}
        <p>Wait for connection...</p>
      {:else}
        <p>Click to add files to queue (Unlimited Size)</p>
      {/if}
    </div>
  {/if}

  {#if outgoing.length > 0}
    <div class="queue-list glass-panel">
      <h3>Outgoing Files (To Receiver)</h3>
      {#each outgoing as item}
        <div class="queue-item">
          <div class="file-info">
            <span class="file-name">{item.name}</span>
            <span class="file-size"
              >({(item.size / 1024 / 1024).toFixed(2)} MB)</span
            >
          </div>
          <div class="file-actions">
            <span class={`status-badge status-${item.status}`}
              >{item.status}</span
            >
            {#if item.status === "queued"}
              <button
                class="btn-xs"
                on:click={() => p2p.startFileTransfer(item.id)}>Send</button
              >
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}

  {#if incoming.length > 0}
    <div class="queue-list glass-panel">
      <h3>Incoming Files (From Receiver)</h3>
      {#each incoming as item}
        <div class="queue-item">
          <div class="file-info">
            <span class="file-name">{item.name}</span>
            <span class="file-size"
              >({(item.size / 1024 / 1024).toFixed(2)} MB)</span
            >
          </div>
          <div class="file-actions">
            {#if item.status === "completed"}
              <button
                class="btn-xs btn-download"
                on:click={() => p2p.requestFileDownload(item.id)}
                >Download Again</button
              >
            {:else if item.status === "queued"}
              <button
                class="btn-xs btn-download"
                on:click={() => p2p.requestFileDownload(item.id)}
                >Download</button
              >
            {:else}
              <span class={`status-badge status-${item.status}`}
                >{item.status}</span
              >
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}

  {#if state === TRANSFER_STATES.WAITING_ACCEPTANCE}
    <div class="accept-modal fade-in">
      <div class="modal-content glass-panel">
        <button class="close-modal-btn" on:click={closeModal} title="Reject">
          <X size={24} />
        </button>
        <h3>Incoming File: {$transfer.fileName}</h3>
        <p>{($transfer.totalSize / 1024 / 1024).toFixed(2)} MB</p>
        <button class="btn-primary" on:click={acceptFile}>Save</button>
      </div>
    </div>
  {/if}

  {#if isTransferring}
    <div class="transfer-status">
      <div class="status-header">
        <h3>Sending: {$transfer.fileName}</h3>
        <div class="transfer-controls">
          <button
            class="btn-icon"
            on:click={() => p2p.togglePause()}
            title={state === TRANSFER_STATES.PAUSED ? "Resume" : "Pause"}
          >
            {#if state === TRANSFER_STATES.PAUSED}
              <Play size={24} color="var(--success)" />
            {:else}
              <Pause size={24} color="var(--warning)" />
            {/if}
          </button>
          <button
            class="btn-icon-danger"
            on:click={cancel}
            title="Cancel Transfer"
          >
            <XCircle size={24} color="var(--error)" />
          </button>
        </div>
      </div>
      <ProgressBar
        progress={$transfer.progress}
        speed={$transfer.speed}
        timeLeft={$transfer.timeLeft}
      />
    </div>
  {/if}

  {#if state === TRANSFER_STATES.COMPLETED}
    <div class="completion-box">
      <h3>Sent Successfully!</h3>
      <button class="btn-secondary" on:click={initSession}>Send Another</button>
    </div>
  {/if}
</div>

<style>
  .sender-container {
    max-width: 600px;
    margin: 2rem auto;
    padding: 2rem;
  }

  .session-info {
    margin: 2rem 0;
    text-align: center;
  }

  .label {
    color: var(--text-secondary);
    margin-bottom: 0.5rem;
  }

  .code-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
  }

  .code-box {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    background: var(--surface-color-2);
    padding: 1rem;
    border-radius: var(--radius-md);
    border: 1px solid var(--border-color);
  }

  .code {
    font-size: 2rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    font-family: monospace;
    color: var(--primary-color);
  }

  .copy-btn {
    background: transparent;
    color: var(--text-secondary);
    padding: 0.5rem;
  }

  .copy-btn:hover {
    color: var(--primary-color);
  }

  .copied-text {
    font-size: 0.8rem;
    color: var(--success);
    font-weight: bold;
    animation: fade-in 0.2s ease;
  }

  .status-indicator {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    margin-bottom: 2rem;
    color: var(--text-secondary);
  }

  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--text-secondary);
  }

  .dot.active {
    background: var(--success);
    box-shadow: 0 0 10px var(--success);
  }

  .drop-zone {
    border: 2px dashed var(--border-color);
    border-radius: var(--radius-md);
    padding: 3rem;
    text-align: center;
    position: relative;
    transition: all 0.3s ease;
    cursor: pointer;
  }

  .drop-zone:hover:not(.disabled) {
    border-color: var(--primary-color);
    background: rgba(99, 102, 241, 0.05);
  }

  .drop-zone.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .drop-zone input {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: inherit;
  }

  .icon {
    margin-bottom: 1rem;
    color: var(--text-secondary);
  }

  .drop-zone:hover:not(.disabled) .icon {
    color: var(--primary-color);
  }

  .transfer-status {
    margin-top: 2rem;
  }

  .status-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .btn-icon-danger {
    background: transparent;
    padding: 0.5rem;
    border-radius: 50%;
    transition: background 0.2s;
  }

  .btn-icon-danger:hover {
    background: rgba(239, 68, 68, 0.1);
  }

  .completion-box {
    text-align: center;
    margin-top: 2rem;
  }

  .queue-list {
    margin: 2rem 0;
    padding: 1.5rem;
    border: 1px solid var(--border-color);
  }

  .queue-list h3 {
    margin-bottom: 1rem;
    font-size: 1.25rem;
  }

  .queue-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    background: rgba(255, 255, 255, 0.03);
    border-radius: var(--radius-sm);
    margin-bottom: 0.5rem;
    border: 1px solid var(--border-color);
  }

  .file-info {
    display: flex;
    flex-direction: column;
  }

  .file-name {
    font-weight: 500;
  }

  .file-size {
    font-size: 0.8rem;
    color: var(--text-secondary);
  }

  .file-actions {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .status-badge {
    text-transform: capitalize;
    font-size: 0.8rem;
    padding: 0.2rem 0.6rem;
    border-radius: 50px;
    background: rgba(255, 255, 255, 0.1);
  }

  .status-transferring {
    color: var(--warning);
    background: rgba(234, 179, 8, 0.1);
  }

  .status-completed {
    color: var(--success);
    background: rgba(16, 185, 129, 0.1);
  }

  .btn-xs {
    padding: 0.25rem 0.75rem;
    font-size: 0.8rem;
    background: var(--primary-color);
    color: white;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: 0.2s;
  }

  .btn-xs:hover {
    background: var(--primary-hover);
  }

  .btn-download {
    background: var(--surface-color);
    border: 1px solid var(--primary-color);
    color: var(--primary-color);
  }

  .btn-download:hover {
    background: var(--primary-color);
    color: white;
  }

  .accept-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(5px);
  }

  .modal-content {
    padding: 2rem;
    max-width: 400px;
    width: 90%;
    text-align: center;
    position: relative;
    border: 1px solid var(--primary-color);
  }

  .close-modal-btn {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    background: transparent;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.2s;
    border-radius: 50%;
    padding: 0.25rem;
  }

  .close-modal-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
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
    margin-bottom: 1.5rem;
  }

  .transfer-controls {
    display: flex;
    gap: 0.5rem;
    align-items: center;
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
