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
    QrCode as QrIcon,
  } from "lucide-svelte";
  import QRCode from "qrcode";

  import TextSync from "./TextSync.svelte";
  import { cloudRelay } from "../services/cloud-relay";
  import { CloudUpload } from "lucide-svelte";

  let sessionId = "";
  let qrCodeUrl = "";
  let showQr = false;
  let fileInput;

  function initSession() {
    // Clean up old if exists
    p2p.cleanup();
    sessionId = uuidv4().slice(0, 6).toUpperCase();
    p2p.init(sessionId, true);
    generateQrCode();
  }

  async function generateQrCode() {
    try {
      const url = `${window.location.origin}/?code=${sessionId}`;
      qrCodeUrl = await QRCode.toDataURL(url, {
        margin: 2,
        scale: 8,
        color: {
          dark: "#ffffff",
          light: "#00000000",
        },
      });
    } catch (err) {
      console.error(err);
    }
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

  // Cloud Transfer Logic
  let isCloudUploading = false;
  let cloudProgress = 0;

  async function uploadViaCloud(file) {
    if (!file) return;
    isCloudUploading = true;
    cloudProgress = 0;

    try {
      const result = await cloudRelay.upload(file, (progress) => {
        cloudProgress = progress;
      });

      // Send link via chat
      p2p.sendChatMessage({
        text: `🚀 **Fast Cloud Transfer**\nDownload ${file.name} here (expires in 14 days):\n${result.link}`,
      });

      // Also add to history as completed
      const id = uuidv4();
      // Just a dummy entry to show it was handled
      // You might want to remove it from the P2P queue if it was there
    } catch (err) {
      console.error("Cloud Upload Failed", err);
      // Fallback or alert
      alert("Cloud upload failed. Try P2P.");
    } finally {
      isCloudUploading = false;
    }
  }

  function startCloudTransfer(itemId) {
    const item = $transfer.fileQueue.find((i) => i.id === itemId);
    if (item && item.file) {
      // Mark as transferring visually (optional)
      uploadViaCloud(item.file);
      // Remove from P2P Queue to avoid confusion?
      // Or just let user decide.
      // Let's remove from P2P queue to show it's handled
      p2p.updateQueueStatus(itemId, "completed-cloud");
    }
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
        <button
          class="copy-btn qr-toggle-btn"
          class:active={showQr}
          on:click={() => (showQr = !showQr)}
          title="Show QR Code"
        >
          <QrIcon size={20} />
        </button>
      </div>

      {#if showQr && qrCodeUrl}
        <div class="qr-container fade-in">
          <div class="qr-box glass-panel">
            <img src={qrCodeUrl} alt="QR Code" />
            <p>Scan to connect instantly</p>
          </div>
        </div>
      {/if}

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

  {#if isConnected}
    <TextSync />
  {/if}

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
            {#if item.status === "queued" || item.status === "completed-cloud"}
              {#if isCloudUploading}
                <span class="status-badge"
                  >Uploading {cloudProgress.toFixed(0)}%...</span
                >
              {:else}
                <button
                  class="btn-xs"
                  on:click={() => p2p.startFileTransfer(item.id)}
                  >P2P Send</button
                >
                <button
                  class="btn-xs btn-secondary"
                  style="background: #2563eb; border-color: #2563eb;"
                  title="Use Cloud Relay (Faster)"
                  on:click={() => startCloudTransfer(item.id)}
                >
                  <CloudUpload size={14} style="margin-right:4px" /> Cloud
                </button>
              {/if}
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

  {#if state === TRANSFER_STATES.TRANSFERRING || state === TRANSFER_STATES.PAUSED || state === TRANSFER_STATES.COMPLETED}
    <div class="transfer-status">
      <div class="status-header">
        <h3>
          {state === TRANSFER_STATES.COMPLETED ? "Sent" : "Sending"}: {$transfer.fileName}
        </h3>

        {#if state !== TRANSFER_STATES.COMPLETED}
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
        {/if}
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
    margin: 1rem auto;
    padding: 1.5rem;
    width: calc(100% - 2rem);
  }

  @media (min-width: 640px) {
    .sender-container {
      margin: 2rem auto;
      padding: 2rem;
      width: 100%;
    }
  }

  .session-info {
    margin: 1.5rem 0;
    text-align: center;
  }

  .label {
    color: var(--text-secondary);
    margin-bottom: 0.75rem;
    font-size: 0.9rem;
  }

  .code-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
  }

  @media (min-width: 480px) {
    .code-wrapper {
      flex-direction: row;
    }
  }

  .code-box {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    background: var(--surface-color-2);
    padding: 0.75rem 1.25rem;
    border-radius: var(--radius-md);
    border: 1px solid var(--border-color);
    width: 100%;
    max-width: 300px;
  }

  .code {
    font-size: 1.75rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    font-family: monospace;
    color: var(--primary-color);
  }

  @media (min-width: 640px) {
    .code {
      font-size: 2rem;
    }
  }

  .copy-btn {
    background: transparent;
    color: var(--text-secondary);
    padding: 0.5rem;
    display: flex;
    align-items: center;
  }

  .drop-zone {
    border: 2px dashed var(--border-color);
    border-radius: var(--radius-md);
    padding: 2rem 1rem;
    text-align: center;
    position: relative;
    transition: all 0.3s ease;
    cursor: pointer;
  }

  @media (min-width: 640px) {
    .drop-zone {
      padding: 3rem;
    }
  }

  .drop-zone p {
    font-size: 0.95rem;
  }

  .drop-zone:hover:not(.disabled) {
    border-color: var(--primary-color);
    background: rgba(99, 102, 241, 0.05);
  }

  .drop-zone.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .icon {
    margin-bottom: 1rem;
    color: var(--text-secondary);
  }

  .queue-list {
    margin: 1.5rem 0;
    padding: 1.25rem;
    border: 1px solid var(--border-color);
  }

  .queue-list h3 {
    margin-bottom: 1rem;
    font-size: 1.1rem;
  }

  .queue-item {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.03);
    border-radius: var(--radius-sm);
    margin-bottom: 0.75rem;
    border: 1px solid var(--border-color);
  }

  @media (min-width: 480px) {
    .queue-item {
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
    }
  }

  .file-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    gap: 1rem;
  }

  @media (min-width: 480px) {
    .file-actions {
      width: auto;
    }
  }

  .btn-xs {
    padding: 0.5rem 1rem;
    font-size: 0.85rem;
    background: var(--primary-color);
    color: white;
    border-radius: var(--radius-sm);
    flex: 1;
    text-align: center;
  }

  @media (min-width: 480px) {
    .btn-xs {
      flex: none;
      padding: 0.25rem 0.75rem;
    }
  }

  .btn-download {
    background: transparent;
    border: 1px solid var(--primary-color);
    color: var(--primary-color);
  }

  /* ... rest of the styles ... */
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

  .btn-icon,
  .btn-icon-danger {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--border-color);
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    color: var(--text-primary);
  }

  .btn-icon:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: var(--text-secondary);
  }

  .btn-icon-danger:hover {
    background: rgba(239, 68, 68, 0.1);
    border-color: var(--error);
  }

  .accept-modal {
    padding: 1rem;
  }

  .modal-content {
    width: 100%;
    max-width: 400px;
    padding: 2rem 1.5rem;
  }

  .qr-container {
    margin-top: 1.5rem;
    display: flex;
    justify-content: center;
    width: 100%;
  }

  .qr-box {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--glass-border);
  }

  .qr-box img {
    width: 200px;
    height: 200px;
    border-radius: var(--radius-sm);
    filter: drop-shadow(0 0 10px rgba(99, 102, 241, 0.3));
  }

  .qr-box p {
    font-size: 0.85rem;
    color: var(--text-secondary);
    font-weight: 500;
  }

  .code-actions {
    display: flex;
    gap: 0.5rem;
  }

  .qr-toggle-btn.active {
    color: var(--primary-color);
    background: rgba(99, 102, 241, 0.1);
    border-color: var(--primary-color);
  }
</style>
