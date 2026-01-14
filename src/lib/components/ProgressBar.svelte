<script>
  import { formatBytes, formatTime } from "../utils/format";
  export let progress = 0; // 0 to 100
  export let speed = 0; // bytes per sec
  export let timeLeft = 0; // seconds
</script>

<div class="progress-container">
  <div class="bar-bg">
    <div class="bar-fill" style="width: {progress}%"></div>
  </div>
  <div class="stats">
    <span>{progress.toFixed(1)}%</span>
    {#if speed > 0}
      <span>{formatBytes(speed)}/s</span>
      <span>ETA: {formatTime(timeLeft)}</span>
    {/if}
  </div>
</div>

<style>
  .progress-container {
    width: 100%;
    margin-top: 1.5rem;
  }

  .bar-bg {
    width: 100%;
    height: 12px;
    background: var(--surface-color-2);
    border-radius: 50px;
    overflow: hidden;
    margin-bottom: 0.5rem;
  }

  .bar-fill {
    height: 100%;
    background: linear-gradient(
      90deg,
      var(--primary-color),
      var(--accent-color)
    );
    transition: width 0.2s ease;
    box-shadow: 0 0 10px rgba(99, 102, 241, 0.5);
  }

  .stats {
    display: flex;
    justify-content: space-between;
    font-size: 0.875rem;
    color: var(--text-secondary);
  }
</style>
