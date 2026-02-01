<script>
  import { transfer } from "../stores/transfer";
  import { Activity, Wifi, Database } from "lucide-svelte";

  $: stats = $transfer.networkStats || {
    latency: 0,
    connectionType: "Waiting...",
    bufferHealth: "Healthy",
  };
  $: isGood = stats.latency < 150 && stats.bufferHealth === "Healthy";
</script>

<div class="stats-overlay glass-panel fade-in">
  <div class="stat-item" title="Network Latency">
    <Activity
      size={16}
      class={stats.latency < 100
        ? "text-success"
        : stats.latency < 300
          ? "text-warning"
          : "text-error"}
    />
    <div class="stat-text">
      <span class="label">Ping</span>
      <span class="value">{stats.latency}ms</span>
    </div>
  </div>

  <div class="stat-divider"></div>

  <div class="stat-item" title="Connection Type">
    <Wifi size={16} class="text-primary" />
    <div class="stat-text">
      <span class="label">Type</span>
      <span class="value">{stats.connectionType}</span>
    </div>
  </div>

  <div class="stat-divider"></div>

  <div class="stat-item" title="Buffer Health">
    <Database
      size={16}
      class={stats.bufferHealth === "Healthy" ? "text-success" : "text-error"}
    />
    <div class="stat-text">
      <span class="label">Buffer</span>
      <span class="value">{stats.bufferHealth}</span>
    </div>
  </div>
</div>

<style>
  .stats-overlay {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    border-radius: 12px;
    background: rgba(15, 23, 42, 0.6);
    backdrop-filter: blur(12px);
    margin: 1rem 0;
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .stat-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .stat-text {
    display: flex;
    flex-direction: column;
    line-height: 1.1;
  }

  .label {
    font-size: 0.65rem;
    text-transform: uppercase;
    color: var(--text-secondary);
    font-weight: 600;
    letter-spacing: 0.5px;
  }

  .value {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .stat-divider {
    width: 1px;
    height: 24px;
    background: rgba(255, 255, 255, 0.1);
  }

  .text-success {
    color: #10b981;
  }
  .text-warning {
    color: #f59e0b;
  }
  .text-error {
    color: #ef4444;
  }
  .text-primary {
    color: var(--primary-color);
  }
</style>
