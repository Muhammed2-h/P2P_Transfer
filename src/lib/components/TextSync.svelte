<script>
    import { transfer } from "../stores/transfer";
    import { p2p } from "../services/p2p";
    import {
        Copy,
        Type,
        Eraser,
        ChevronDown,
        ChevronUp,
        MessageSquareText,
    } from "lucide-svelte";

    let isCopied = false;
    let isExpanded = false;

    function handleInput(e) {
        p2p.sendSharedText(e.target.value);
    }

    async function copyToClipboard() {
        try {
            await navigator.clipboard.writeText($transfer.sharedText);
            isCopied = true;
            setTimeout(() => (isCopied = false), 2000);
        } catch (err) {
            console.error("Failed to copy text", err);
        }
    }

    function clearText() {
        p2p.sendSharedText("");
    }
</script>

<div class="text-sync-container fade-in">
    <button
        class="expand-toggle glass-panel"
        on:click={() => (isExpanded = !isExpanded)}
        class:active={isExpanded}
    >
        <div class="toggle-content">
            <div class="icon-label">
                <MessageSquareText size={20} class="text-primary" />
                <span>Shared Clipboard</span>
                {#if $transfer.sharedText && !isExpanded}
                    <div class="indicator-dot"></div>
                {/if}
            </div>
            {#if isExpanded}
                <ChevronUp size={20} />
            {:else}
                <ChevronDown size={20} />
            {/if}
        </div>
    </button>

    {#if isExpanded}
        <div class="text-sync glass-panel" class:expanded={isExpanded}>
            <div class="text-header">
                <div class="header-title">
                    <Type size={18} class="text-primary" />
                    <h3>Instant Text Sync</h3>
                </div>
                <div class="header-actions">
                    <button
                        class="icon-btn"
                        on:click={clearText}
                        title="Clear Text"
                    >
                        <Eraser size={18} />
                    </button>
                    <button
                        class="copy-btn-sync"
                        on:click={copyToClipboard}
                        class:success={isCopied}
                    >
                        {#if isCopied}
                            <span class="copied-label">Copied!</span>
                        {:else}
                            <Copy size={16} />
                            <span>Copy</span>
                        {/if}
                    </button>
                </div>
            </div>

            <div class="textarea-wrapper">
                <textarea
                    placeholder="Type or paste text here to share instantly with the other side..."
                    value={$transfer.sharedText}
                    on:input={handleInput}
                ></textarea>
            </div>
        </div>
    {/if}
</div>

<style>
    .text-sync-container {
        margin: 1.5rem 0;
        width: 100%;
    }

    .expand-toggle {
        width: 100%;
        padding: 1rem 1.25rem;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid var(--glass-border);
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-radius: var(--radius-md);
    }

    .expand-toggle:hover {
        background: rgba(99, 102, 241, 0.05);
        border-color: var(--primary-color);
    }

    .expand-toggle.active {
        border-bottom-left-radius: 0;
        border-bottom-right-radius: 0;
        background: rgba(99, 102, 241, 0.03);
        border-color: var(--primary-color);
    }

    .toggle-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
    }

    .icon-label {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        font-weight: 600;
        color: white;
        position: relative;
    }

    .indicator-dot {
        width: 8px;
        height: 8px;
        background: var(--accent-color);
        border-radius: 50%;
        position: absolute;
        top: -2px;
        right: -10px;
        box-shadow: 0 0 8px var(--accent-color);
        animation: pulse 2s infinite;
    }

    @keyframes pulse {
        0% {
            transform: scale(1);
            opacity: 1;
        }
        50% {
            transform: scale(1.3);
            opacity: 0.7;
        }
        100% {
            transform: scale(1);
            opacity: 1;
        }
    }

    .text-sync {
        padding: 1.25rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        border: 1px solid var(--primary-color);
        border-top: none;
        border-top-left-radius: 0;
        border-top-right-radius: 0;
        background: rgba(15, 15, 20, 0.8);
        animation: slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        border-bottom-left-radius: var(--radius-md);
        border-bottom-right-radius: var(--radius-md);
    }

    @keyframes slideDown {
        from {
            opacity: 0;
            transform: translateY(-10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .text-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .header-title {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .header-title h3 {
        font-size: 1rem;
        font-weight: 600;
        color: white;
    }

    .header-actions {
        display: flex;
        align-items: center;
        gap: 0.75rem;
    }

    .icon-btn {
        background: transparent;
        color: var(--text-secondary);
        padding: 0.5rem;
        border-radius: 50%;
        transition: all 0.2s;
    }

    .icon-btn:hover {
        background: rgba(255, 255, 255, 0.05);
        color: var(--accent-color);
    }

    .copy-btn-sync {
        padding: 0.4rem 0.875rem;
        background: var(--surface-color-2);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-sm);
        color: var(--text-primary);
        font-size: 0.85rem;
        font-weight: 500;
        min-width: 80px;
    }

    .copy-btn-sync:hover {
        border-color: var(--primary-color);
        background: rgba(99, 102, 241, 0.05);
    }

    .copy-btn-sync.success {
        background: var(--success);
        border-color: var(--success);
        color: white;
    }

    .textarea-wrapper {
        position: relative;
        width: 100%;
    }

    textarea {
        width: 100%;
        max-width: 100%;
        min-height: 120px;
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-sm);
        color: white;
        padding: 1rem;
        font-family: inherit;
        font-size: 0.95rem;
        line-height: 1.5;
        resize: vertical;
        transition: all 0.2s;
    }

    textarea:focus {
        outline: none;
        border-color: var(--primary-color);
        background: rgba(99, 102, 241, 0.03);
        box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
    }

    textarea::placeholder {
        color: var(--text-secondary);
        opacity: 0.5;
    }

    .copied-label {
        animation: fadeIn 0.2s ease-out;
    }

    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: translateY(2px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
</style>
