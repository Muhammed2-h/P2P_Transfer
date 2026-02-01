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

  function tick() {
    if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.height = video.videoHeight;
      canvas.width = video.videoWidth;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
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
</script>

<div class="scanner-overlay fade-in">
  <div class="scanner-container glass-panel">
    <div class="scanner-header">
      <h3>{title}</h3>
      <button class="close-btn" on:click={() => dispatch("close")}>
        <X size={24} />
      </button>
    </div>

    <div class="viewport">
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

    <p class="hint">Point your camera at the QR code</p>
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
