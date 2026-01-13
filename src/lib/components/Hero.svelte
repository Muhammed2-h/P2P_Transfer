<script>
  import { currentView, VIEWS } from "../stores/nav";
  import { Send, Download, ArrowRight } from "lucide-svelte";
</script>

<div class="hero glass-panel fade-in">
  <div class="content">
    <h1>
      Share Massive Files <br />
      <span class="text-gradient">Unlimited & Direct</span>
    </h1>
    <div class="subtitle-wrapper">
      <p class="subtitle">Bypass the cloud. Share without limits.</p>
    </div>

    <div class="actions">
      <button
        class="card action-btn"
        on:click={() => currentView.set(VIEWS.SENDER)}
      >
        <div class="icon-circle send">
          <Send size={32} />
        </div>
        <div class="text">
          <h2>Send</h2>
          <p>Share a file of any size</p>
        </div>
        <div class="arrow">
          <ArrowRight size={24} />
        </div>
      </button>

      <button
        class="card action-btn"
        on:click={() => currentView.set(VIEWS.RECEIVER)}
      >
        <div class="icon-circle receive">
          <Download size={32} />
        </div>
        <div class="text">
          <h2>Receive</h2>
          <p>Enter code to download</p>
        </div>
        <div class="arrow">
          <ArrowRight size={24} />
        </div>
      </button>
    </div>
  </div>
</div>

<style>
  .hero {
    max-width: 800px;
    margin: 4rem auto;
    padding: 4rem 2rem;
    text-align: center;
  }

  h1 {
    font-size: 3.5rem;
    font-weight: 800;
    line-height: 1.1;
    margin-bottom: 1.5rem;
  }

  .subtitle {
    font-size: 1.25rem;
    color: var(--text-secondary);
    margin-bottom: 3rem;
  }

  .actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
  }

  .action-btn {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    text-align: left;
    transition: all 0.3s ease;
    border: 1px solid var(--border-color);
  }

  .action-btn:hover {
    transform: translateY(-5px);
    border-color: var(--primary-color);
    background: var(--surface-color-2);
  }

  .icon-circle {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .icon-circle.send {
    background: rgba(99, 102, 241, 0.1);
    color: var(--primary-color);
  }

  .icon-circle.receive {
    background: rgba(236, 72, 153, 0.1);
    color: var(--accent-color);
  }

  h2 {
    font-size: 1.5rem;
    margin-bottom: 0.25rem;
    color: white;
  }

  .text p {
    color: var(--text-secondary);
    font-size: 0.9rem;
  }

  .arrow {
    margin-left: auto;
    opacity: 0;
    transform: translateX(-10px);
    transition: all 0.3s ease;
  }

  .action-btn:hover .arrow {
    opacity: 1;
    transform: translateX(0);
  }

  @media (max-width: 768px) {
    .actions {
      grid-template-columns: 1fr;
    }

    h1 {
      font-size: 2.5rem;
    }
  }

  .subtitle-wrapper {
    margin-bottom: 3rem;
    position: relative;
    display: inline-block;
  }

  .subtitle-wrapper::after {
    content: "";
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 120%;
    height: 120%;
    background: radial-gradient(
      circle,
      rgba(99, 102, 241, 0.15) 0%,
      rgba(0, 0, 0, 0) 70%
    );
    z-index: -1;
    filter: blur(20px);
    border-radius: 50%;
  }
</style>
