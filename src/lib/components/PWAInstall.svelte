<script>
    import { onMount } from "svelte";
    import { Download, X } from "lucide-svelte";

    let deferredPrompt;
    let showBanner = false;

    onMount(() => {
        window.addEventListener("beforeinstallprompt", (e) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            // Stash the event so it can be triggered later.
            deferredPrompt = e;
            // Update UI notify the user they can install the PWA
            showBanner = true;
        });

        window.addEventListener("appinstalled", () => {
            // Log install to analytics
            console.log("INSTALL: Success");
            showBanner = false;
            deferredPrompt = null;
        });
    });

    async function handleInstall() {
        if (!deferredPrompt) return;

        // Show the install prompt
        deferredPrompt.prompt();

        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);

        // We've used the prompt, and can't use it again, throw it away
        deferredPrompt = null;
        showBanner = false;
    }
</script>

{#if showBanner}
    <div class="pwa-banner-overlay fade-in">
        <div class="pwa-banner glass-panel">
            <div class="pwa-content">
                <div class="icon-container">
                    <div class="pwa-icon">
                        <img src="/icon.png" alt="WarpShare Icon" />
                    </div>
                </div>
                <div class="text-content">
                    <h3>Install WarpShare</h3>
                    <p>Add to your home screen for the best experience.</p>
                </div>
            </div>

            <div class="actions">
                <button
                    class="btn-primary btn-install"
                    on:click={handleInstall}
                >
                    <Download size={18} />
                    Install
                </button>
                <button
                    class="btn-close"
                    on:click={() => (showBanner = false)}
                    aria-label="Close"
                >
                    <X size={20} />
                </button>
            </div>
        </div>
    </div>
{/if}

<style>
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
        padding: 1.25rem;
        background: rgba(15, 15, 20, 0.95);
        border: 1px solid var(--glass-border);
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
        border-radius: var(--radius-md);
    }

    .pwa-content {
        display: flex;
        align-items: center;
        gap: 1.25rem;
    }

    .pwa-icon {
        width: 64px;
        height: 64px;
        border-radius: 16px;
        overflow: hidden;
        background: var(--surface-color-2);
        border: 1px solid var(--glass-border);
        padding: 2px;
    }

    .pwa-icon img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 14px;
    }

    .text-content h3 {
        font-size: 1.1rem;
        color: white;
        margin: 0;
    }

    .text-content p {
        font-size: 0.85rem;
        color: var(--text-secondary);
        margin: 0.25rem 0 0;
    }

    .actions {
        display: flex;
        align-items: center;
        gap: 1rem;
    }

    .btn-install {
        padding: 0.75rem 1.25rem;
        font-size: 0.9rem;
        white-space: nowrap;
    }

    .btn-close {
        background: transparent;
        color: var(--text-secondary);
        padding: 0.6rem;
        border-radius: 50%;
    }

    .btn-close:hover {
        background: rgba(255, 255, 255, 0.1);
        color: white;
    }

    @media (max-width: 480px) {
        .pwa-banner {
            flex-direction: column;
            gap: 1.25rem;
            text-align: center;
        }

        .pwa-content {
            flex-direction: column;
            gap: 0.75rem;
        }

        .actions {
            width: 100%;
            justify-content: center;
        }

        .btn-install {
            width: 100%;
        }
    }
</style>
