<script>
  import { currentView, VIEWS } from "../stores/nav";
  import { Send, Download, ArrowRight } from "lucide-svelte";
  import History from "./History.svelte";
</script>

<div class="hero-wrapper fade-in">
  <div class="hero glass-panel">
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

  <History />
</div>

<style>
  .hero {
    max-width: 800px;
    margin: 2rem auto;
    padding: 3rem 1.5rem;
    text-align: center;
  }

  @media (min-width: 768px) {
    .hero {
      margin: 4rem auto;
      padding: 4rem 2rem;
    }
  }

  h1 {
    font-size: 2.25rem;
    font-weight: 800;
    line-height: 1.1;
    margin-bottom: 1.25rem;
  }

  @media (min-width: 768px) {
    h1 {
      font-size: 3.5rem;
    }
  }

  .subtitle {
    font-size: 1.1rem;
    color: var(--text-secondary);
    margin-bottom: 2.5rem;
  }

  @media (min-width: 768px) {
    .subtitle {
      font-size: 1.25rem;
    }
  }

  .actions {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    width: 100%;
    max-width: 400px;
    margin: 0 auto;
  }

  @media (min-width: 768px) {
    .actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
      max-width: none;
    }
  }

  .action-btn {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.5rem;
    text-align: left;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    border: 1px solid var(--border-color);
    background: rgba(255, 255, 255, 0.02);
    border-radius: var(--radius-md);
    cursor: pointer;
  }

  @media (min-width: 768px) {
    .action-btn {
      gap: 1.5rem;
    }
  }

  .action-btn:hover {
    transform: translateY(-5px) scale(1.02);
    border-color: var(--primary-color);
    background: rgba(99, 102, 241, 0.05);
    box-shadow:
      0 20px 40px -10px rgba(0, 0, 0, 0.5),
      0 0 20px rgba(99, 102, 241, 0.1);
  }

  .icon-circle {
    width: 54px;
    height: 54px;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: all 0.3s ease;
  }

  @media (min-width: 768px) {
    .icon-circle {
      width: 64px;
      height: 64px;
    }
  }

  .action-btn:hover .icon-circle {
    transform: rotate(-5deg) scale(1.1);
  }

  .icon-circle.send {
    background: linear-gradient(
      135deg,
      rgba(99, 102, 241, 0.2),
      rgba(99, 102, 241, 0.1)
    );
    color: var(--primary-color);
    border: 1px solid rgba(99, 102, 241, 0.2);
  }

  .icon-circle.receive {
    background: linear-gradient(
      135deg,
      rgba(244, 63, 94, 0.2),
      rgba(244, 63, 94, 0.1)
    );
    color: var(--accent-color);
    border: 1px solid rgba(244, 63, 94, 0.2);
  }

  h2 {
    font-size: 1.25rem;
    margin-bottom: 0.25rem;
    color: white;
    font-weight: 700;
  }

  @media (min-width: 768px) {
    h2 {
      font-size: 1.5rem;
    }
  }

  .text p {
    color: var(--text-secondary);
    font-size: 0.875rem;
    line-height: 1.4;
  }

  .arrow {
    margin-left: auto;
    opacity: 0.2;
    transform: translateX(0);
    transition: all 0.3s ease;
    color: var(--text-secondary);
  }

  .action-btn:hover .arrow {
    opacity: 1;
    transform: translateX(5px);
    color: var(--primary-color);
  }

  @media (max-width: 768px) {
    h1 br {
      display: none;
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
