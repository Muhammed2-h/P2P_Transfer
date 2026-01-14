<script>
  import { ShieldCheck, Zap, LogOut } from "lucide-svelte";
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
  </div>
</header>

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
</style>
