<div class="background">
  <div class="blob blob-1"></div>
  <div class="blob blob-2"></div>
</div>

<style>
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
    0% { transform: translate(0, 0) scale(1); }
    100% { transform: translate(50px, 50px) scale(1.1); }
  }
</style>
