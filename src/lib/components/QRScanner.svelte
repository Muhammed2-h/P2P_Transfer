<script>
  import { onMount, onDestroy, createEventDispatcher } from "svelte";
  import jsQR from "jsqr";
  import { X, Camera } from "lucide-svelte";

  export let title = "Scan QR Code";

  const dispatch = createEventDispatcher();
  let video;
  let canvas;
  let stream;
  let animationId;
  let error = "";

  onMount(async () => {
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      if (video) {
        video.srcObject = stream;
        video.setAttribute("playsinline", true); // required to tell iOS safari we don't want fullscreen
        video.play();
        requestAnimationFrame(tick);
      }
    } catch (err) {
      console.error(err);
      error = "Camera access denied or not available.";
    }
  });

  onDestroy(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    cancelAnimationFrame(animationId);
  });

  let zoom = 1;
  let manualInput = "";
  let showManual = false;

  function tick() {
    if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.height = video.videoHeight;
      canvas.width = video.videoWidth;
      const ctx = canvas.getContext("2d");

      // Clear
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Calculate Zoomed Bounds
      const w = canvas.width / zoom;
      const h = canvas.height / zoom;
      const x = (canvas.width - w) / 2;
      const y = (canvas.height - h) / 2;

      ctx.drawImage(video, x, y, w, h, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });

      if (code) {
        dispatch("scan", code.data);
      }
    }
    animationId = requestAnimationFrame(tick);
  }

  function handleManual() {
    if (manualInput.trim()) {
      dispatch("scan", manualInput.trim());
    }
  }
</script>

<div class="scanner-overlay fade-in">
  <div class="scanner-container glass-panel">
    <div class="scanner-header">
      <h3>{title}</h3>
      <button class="close-btn" on:click={() => dispatch("close")}>
        <X size={24} />
      </button>
    </div>

    {#if !showManual}
      <div
        class="viewport"
        style="transform: scale({zoom}); transform-origin: center;"
      >
        {#if error}
          <div class="error-state">
            <p>{error}</p>
          </div>
        {:else}
          <video bind:this={video}></video>
          <canvas bind:this={canvas} style="display: none;"></canvas>
          <div class="scanners-frame"></div>
        {/if}
      </div>

      <div class="controls-row">
        <span>Zoom</span>
        <input type="range" min="1" max="3" step="0.1" bind:value={zoom} />
      </div>

      <p class="hint">Point camera at QR code</p>
      <button class="text-btn" on:click={() => (showManual = true)}
        >Type code manually</button
      >
    {:else}
      <div class="manual-box">
        <p>Paste the handshake code from the other device:</p>
        <textarea bind:value={manualInput} placeholder="v1|a|..."></textarea>
        <div class="btn-group">
          <button class="btn-secondary" on:click={() => (showManual = false)}
            >Back to Camera</button
          >
          <button class="btn-primary" on:click={handleManual}>Connect</button>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .scanner-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.9);
    backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  }

  .scanner-container {
    width: 90%;
    max-width: 400px;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .scanner-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .viewport {
    position: relative;
    width: 100%;
    aspect-ratio: 1;
    background: #000;
    border-radius: var(--radius-md);
    overflow: hidden;
    border: 1px solid var(--glass-border);
    transition: transform 0.1s ease-out;
  }

  video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .scanners-frame {
    position: absolute;
    top: 15%;
    left: 15%;
    right: 15%;
    bottom: 15%;
    border: 2px solid var(--primary-color);
    border-radius: 12px;
    box-shadow: 0 0 0 1000px rgba(0, 0, 0, 0.5);
    pointer-events: none;
  }

  .controls-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    color: var(--text-secondary);
    font-size: 0.8rem;
  }

  .controls-row input {
    flex: 1;
  }

  .manual-box {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  textarea {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--border-color);
    color: white;
    padding: 0.75rem;
    border-radius: 8px;
    min-height: 120px;
    font-family: monospace;
    font-size: 0.8rem;
  }

  .btn-group {
    display: flex;
    gap: 0.5rem;
  }

  .btn-group button {
    flex: 1;
    padding: 0.6rem;
    font-size: 0.9rem;
  }

  .text-btn {
    background: none;
    color: var(--primary-color);
    font-size: 0.9rem;
    text-decoration: underline;
  }

  .hint {
    text-align: center;
    color: var(--text-secondary);
    font-size: 0.9rem;
  }

  .error-state {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    text-align: center;
    color: var(--error);
  }

  .close-btn {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 0.5rem;
  }
</style>
