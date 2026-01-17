<script>
  import { onMount } from "svelte";
  import { currentView, VIEWS } from "./lib/stores/nav";
  import Header from "./lib/components/Header.svelte";
  import Hero from "./lib/components/Hero.svelte";
  import Sender from "./lib/components/Sender.svelte";
  import Receiver from "./lib/components/Receiver.svelte";
  import Chat from "./lib/components/Chat.svelte";
  import { Download, X } from "lucide-svelte";

  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("code")) {
      currentView.set(VIEWS.RECEIVER);
    }
  });

  // Dynamic component Loading
  $: ViewComponent = {
    [VIEWS.HOME]: Hero,
    [VIEWS.SENDER]: Sender,
    [VIEWS.RECEIVER]: Receiver,
  }[$currentView];

  // PWA Install Logic
  let deferredPrompt;
  let showPwaBanner = false;

  onMount(() => {
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredPrompt = e;
      showPwaBanner = true;
    });

    window.addEventListener("appinstalled", () => {
      console.log("INSTALL: Success");
      showPwaBanner = false;
      deferredPrompt = null;
    });
  });

  async function handleInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response: ${outcome}`);
    deferredPrompt = null;
    showPwaBanner = false;
  }
</script>

<!-- Ambient Background -->
<div class="background">
  <div class="blob blob-1"></div>
  <div class="blob blob-2"></div>
</div>

<Header />

<main class="container">
  <svelte:component this={ViewComponent} />
</main>

<!-- PWA Banner -->
{#if showPwaBanner}
  <div class="pwa-banner-overlay fade-in">
    <div class="pwa-banner glass-panel">
      <div class="pwa-content">
        <div class="pwa-icon">
          <img src="/icon.png" alt="Icon" />
        </div>
        <div class="text-content">
          <h3>Install WarpShare</h3>
          <p>Add to home screen for best speed.</p>
        </div>
      </div>
      <div class="actions">
        <button class="btn-primary btn-install" on:click={handleInstall}>
          <Download size={18} /> Install
        </button>
        <button class="btn-close" on:click={() => (showPwaBanner = false)}>
          <X size={20} />
        </button>
      </div>
    </div>
  </div>
{/if}

<Chat />

<style>
  main {
    position: relative;
    z-index: 1;
    min-height: calc(100vh - 80px);
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  /* Background Styles */
  .background {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: -1;
    overflow: hidden;
    background: var(--bg-color);
  }
  .blob {
    position: absolute;
    border-radius: 50%;
    filter: blur(80px);
    opacity: 0.4;
    animation: drift 20s infinite alternate ease-in-out;
  }
  .blob-1 {
    top: -10%;
    left: -10%;
    width: 50vw;
    height: 50vw;
    background: var(--primary-color);
  }
  .blob-2 {
    bottom: -10%;
    right: -10%;
    width: 60vw;
    height: 60vw;
    background: var(--accent-color);
    animation-delay: -10s;
  }
  @keyframes drift {
    0% {
      transform: translate(0, 0) scale(1);
    }
    100% {
      transform: translate(50px, 50px) scale(1.1);
    }
  }

  /* PWA Styles */
  .pwa-banner-overlay {
    position: fixed;
    bottom: 2rem;
    left: 1rem;
    right: 1rem;
    z-index: 9999;
    display: flex;
    justify-content: center;
    pointer-events: none;
  }
  .pwa-banner {
    pointer-events: auto;
    width: 100%;
    max-width: 450px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: rgba(15, 15, 20, 0.95);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  }
  .pwa-content {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  .pwa-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    overflow: hidden;
    background: #333;
  }
  .pwa-icon img {
    width: 100%;
    height: 100%;
  }
  .text-content h3 {
    font-size: 1rem;
    color: white;
    margin: 0;
  }
  .text-content p {
    font-size: 0.8rem;
    color: #ccc;
    margin: 0;
  }
  .actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }
  .btn-install {
    padding: 0.5rem 1rem;
    font-size: 0.85rem;
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }
  .btn-close {
    background: none;
    color: #aaa;
    padding: 0.5rem;
    border-radius: 50%;
    cursor: pointer;
  }
  .btn-close:hover {
    color: white;
    background: rgba(255, 255, 255, 0.1);
  }

  @media (max-width: 480px) {
    .pwa-banner {
      flex-direction: column;
      gap: 1rem;
      text-align: center;
    }
    .pwa-content {
      flex-direction: column;
    }
    .actions {
      width: 100%;
      justify-content: center;
    }
  }
</style>
