<script>
  import {
    ShieldCheck,
    Zap,
    LogOut,
    Settings,
    Volume2,
    VolumeX,
    Clock,
    Trash2,
    X,
  } from "lucide-svelte";
  import { settings } from "../stores/settings";
  import { p2p } from "../services/p2p";
  import { transfer, TRANSFER_STATES } from "../stores/transfer";
  import { currentView, VIEWS } from "../stores/nav";

  $: isConnected =
    $transfer.state !== TRANSFER_STATES.IDLE &&
    $transfer.state !== TRANSFER_STATES.ERROR;

  let showConfirm = false;
  $: if (!isConnected) showConfirm = false;

  function disconnect() {
    p2p.disconnect(); // Disconnects and resets
    showConfirm = false;
  }

  let showSettings = false;

  function useRecentPeer(peer) {
    const url = new URL(window.location.href);
    url.searchParams.set("code", peer);
    window.location.href = url.toString();
  }
</script>

<header>
  <div class="container h-full flex items-center justify-between">
    <div
      class="logo"
      role="button"
      tabindex="0"
      on:click={() => currentView.set(VIEWS.HOME)}
      on:keydown={(e) => e.key === "Enter" && currentView.set(VIEWS.HOME)}
      style="cursor: pointer;"
    >
      <Zap color="var(--primary-color)" size={28} />
      <span class="logo-text">Warp<span class="highlight">Share</span></span>
    </div>

    <div class="status">
      {#if isConnected}
        {#if !showConfirm}
          <button class="btn-sm" on:click={() => (showConfirm = true)}>
            <LogOut size={16} />
            Disconnect
          </button>
        {:else}
          <div class="confirm-group">
            <span>End Session?</span>
            <button class="btn-confirm" on:click={disconnect}>Yes</button>
            <button class="btn-cancel" on:click={() => (showConfirm = false)}>
              No
            </button>
          </div>
        {/if}
      {:else}
        <div class="secure-badge">
          <ShieldCheck size={16} />
          <span>End-to-End Encrypted</span>
        </div>
      {/if}
    </div>

    <button
      class="nav-btn settings-btn"
      on:click={() => (showSettings = true)}
      title="Settings"
    >
      <Settings size={20} />
    </button>
  </div>
</header>

{#if showSettings}
  <div
    class="modal-overlay"
    on:click|self={() => (showSettings = false)}
    on:keydown={(e) => e.key === "Escape" && (showSettings = false)}
    role="button"
    tabindex="-1"
  >
    <div class="settings-modal glass-panel fade-in">
      <div class="modal-header">
        <div class="header-title">
          <Settings size={20} class="text-primary" />
          <h3>Settings</h3>
        </div>
        <button
          class="close-btn"
          on:click={() => (showSettings = false)}
          aria-label="Close Settings"
        >
          <X size={20} />
        </button>
      </div>

      <div class="modal-body">
        <!-- Sound Settings -->
        <div class="settings-section">
          <div class="section-info">
            <div class="icon-wrap">
              {#if $settings.soundsEnabled}
                <Volume2 size={20} class="text-primary" />
              {:else}
                <VolumeX size={20} class="text-secondary" />
              {/if}
            </div>
            <div class="text-wrap">
              <h4>Sound Notifications</h4>
              <p>Audible pings for transfer events</p>
            </div>
          </div>
          <button
            class="toggle-switch"
            class:active={$settings.soundsEnabled}
            on:click={settings.toggleSounds}
            aria-label="Toggle Sound Notifications"
          >
            <div class="switch-knob"></div>
          </button>
        </div>

        <!-- Recent Peers -->
        <div class="settings-section column">
          <div class="section-header">
            <div class="icon-wrap">
              <Clock size={20} class="text-primary" />
            </div>
            <div class="text-wrap">
              <h4>Recent Devices</h4>
              <p>Quickly reconnect to your past sessions</p>
            </div>
          </div>

          <div class="recent-list">
            {#if $settings.recentPeers.length > 0}
              {#each $settings.recentPeers as peer}
                <div class="peer-item glass-panel">
                  <span class="peer-code">{peer}</span>
                  <div class="item-actions">
                    <button
                      class="btn-connect"
                      on:click={() => useRecentPeer(peer)}
                    >
                      Connect
                    </button>
                    <button
                      class="btn-delete"
                      on:click={() => settings.removeRecentPeer(peer)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              {/each}
            {:else}
              <div class="empty-recent">
                <p>No recent devices found</p>
              </div>
            {/if}
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  header {
    height: 80px;
    width: 100%;
    z-index: 100;
    position: sticky;
    top: 0;

    /* Extreme Glassmorphism */
    background: var(--glass-bg);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border-bottom: 1px solid var(--glass-border);
    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
  }

  .h-full {
    height: 100%;
  }

  .flex {
    display: flex;
  }

  .items-center {
    align-items: center;
  }

  .justify-between {
    justify-content: space-between;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 1.5rem;
    font-weight: 700;
  }

  .logo-text {
    letter-spacing: -0.04em;
    color: white;
    font-weight: 800;
  }

  .highlight {
    background: linear-gradient(
      135deg,
      var(--primary-color),
      var(--accent-color)
    );
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .secure-badge {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: var(--success);
    background: rgba(16, 185, 129, 0.1);
    padding: 0.5rem 1rem;
    border-radius: 50px;
    border: 1px solid rgba(16, 185, 129, 0.2);
  }

  .btn-sm {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: rgba(239, 68, 68, 0.1);
    color: var(--error);
    border: 1px solid rgba(239, 68, 68, 0.2);
    border-radius: var(--radius-sm);
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  @media (max-width: 640px) {
    header {
      height: 70px;
    }

    .logo-text {
      display: none;
    }

    .secure-badge span {
      display: none;
    }

    .secure-badge {
      padding: 0.5rem;
    }
  }

  .btn-sm:hover {
    background: rgba(239, 68, 68, 0.2);
  }

  .confirm-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8125rem;
    color: white;
    background: rgba(255, 255, 255, 0.05);
    padding: 0.35rem 0.6rem;
    border-radius: var(--radius-sm);
    border: 1px solid var(--glass-border);
  }

  @media (min-width: 640px) {
    .confirm-group {
      gap: 0.75rem;
      font-size: 0.875rem;
      padding: 0.35rem 0.75rem;
    }
  }

  .btn-confirm {
    background: var(--error);
    color: white;
    border: none;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.75rem;
    font-weight: 600;
  }

  @media (min-width: 640px) {
    .btn-confirm {
      padding: 0.25rem 0.75rem;
    }
  }

  .btn-cancel {
    background: rgba(255, 255, 255, 0.1);
    color: white;
    border: none;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.75rem;
  }

  @media (min-width: 640px) {
    .btn-cancel {
      padding: 0.25rem 0.75rem;
    }
  }
  .nav-btn {
    background: transparent;
    color: var(--text-secondary);
    border: 1px solid transparent;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .settings-btn {
    padding: 0.6rem;
    border-radius: 50%;
  }

  .settings-btn:hover {
    background: rgba(255, 255, 255, 0.05);
    color: var(--primary-color);
  }

  /* Modal Styles */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
  }

  .settings-modal {
    width: 90%;
    max-width: 450px;
    background: #0f0f14;
    border: 1px solid var(--glass-border);
    padding: 0;
    overflow: hidden;
  }

  .modal-header {
    padding: 1.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--glass-border);
  }

  .header-title {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .header-title h3 {
    font-size: 1.25rem;
    color: white;
    margin: 0;
  }

  .close-btn {
    background: transparent;
    color: var(--text-secondary);
    padding: 0.5rem;
    border-radius: 50%;
    transition: all 0.2s;
  }

  .close-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
  }

  .modal-body {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .settings-section {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .settings-section.column {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .section-info,
  .section-header {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
  }

  .text-wrap h4 {
    margin: 0;
    color: white;
    font-size: 1rem;
  }

  .text-wrap p {
    margin: 0.25rem 0 0;
    font-size: 0.85rem;
    color: var(--text-secondary);
  }

  .toggle-switch {
    width: 44px;
    height: 24px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.1);
    position: relative;
    cursor: pointer;
    transition: all 0.3s;
    border: none;
    padding: 0;
  }

  .toggle-switch.active {
    background: var(--primary-color);
  }

  .switch-knob {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    transition: transform 0.3s;
  }

  .toggle-switch.active .switch-knob {
    transform: translateX(20px);
  }

  .recent-list {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .peer-item {
    padding: 0.75rem 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(255, 255, 255, 0.03);
  }

  .peer-code {
    font-family: monospace;
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--primary-color);
    letter-spacing: 1px;
  }

  .item-actions {
    display: flex;
    gap: 0.5rem;
  }

  .btn-connect {
    padding: 0.4rem 0.75rem;
    background: rgba(99, 102, 241, 0.1);
    color: var(--primary-color);
    border: 1px solid var(--primary-color);
    border-radius: var(--radius-sm);
    font-size: 0.8rem;
    font-weight: 600;
  }

  .btn-connect:hover {
    background: var(--primary-color);
    color: white;
  }

  .btn-delete {
    padding: 0.4rem;
    background: transparent;
    color: var(--text-secondary);
    border: 1px solid transparent;
    border-radius: var(--radius-sm);
  }

  .btn-delete:hover {
    color: var(--danger);
    background: rgba(239, 68, 68, 0.1);
  }

  .empty-recent {
    text-align: center;
    padding: 1.5rem;
    color: var(--text-secondary);
    font-size: 0.9rem;
    border: 1px dashed var(--glass-border);
    border-radius: var(--radius-md);
  }
</style>
