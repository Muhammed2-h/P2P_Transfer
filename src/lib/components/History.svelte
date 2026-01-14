<script>
    import { history } from "../stores/history";
    import {
        File,
        Clock,
        Shield,
        Trash2,
        DownloadCloud,
        UploadCloud,
    } from "lucide-svelte";

    import { formatBytes, formatDate } from "../utils/format";
</script>

<section class="history-section fade-in">
    <div class="header">
        <div class="title-group">
            <Clock size={20} class="text-primary" />
            <h2>Transfer History</h2>
        </div>
        {#if $history.length > 0}
            <button class="btn-clear" on:click={() => history.clear()}>
                Clear All
            </button>
        {/if}
    </div>

    {#if $history.length === 0}
        <div class="empty-state glass-panel">
            <Clock size={48} />
            <p>No recent transfers yet.</p>
        </div>
    {:else}
        <div class="history-list">
            {#each $history as item (item.id)}
                <div class="history-item glass-panel">
                    <div
                        class="type-icon"
                        class:sent={item.type === "Sent"}
                        class:received={item.type === "Received"}
                    >
                        {#if item.type === "Sent"}
                            <UploadCloud size={18} />
                        {:else}
                            <DownloadCloud size={18} />
                        {/if}
                    </div>

                    <div class="file-info">
                        <div class="name-row">
                            <span class="name">{item.name}</span>
                            <span class="size">{formatBytes(item.size)}</span>
                        </div>
                        <div class="meta-row">
                            <span class="date">{formatDate(item.date)}</span>
                            {#if item.encrypted}
                                <div class="encryption-tag">
                                    <Shield size={12} />
                                    <span>E2EE</span>
                                </div>
                            {/if}
                        </div>
                    </div>

                    <button
                        class="btn-remove"
                        on:click={() => history.remove(item.id)}
                        title="Remove from history"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            {/each}
        </div>
    {/if}
</section>

<style>
    .history-section {
        max-width: 800px;
        margin: 4rem auto;
        padding: 0 1.5rem;
    }

    .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
    }

    .title-group {
        display: flex;
        align-items: center;
        gap: 0.75rem;
    }

    .btn-clear {
        background: transparent;
        color: var(--text-secondary);
        font-size: 0.875rem;
        padding: 0.5rem 1rem;
        border-radius: var(--radius-sm);
        border: 1px solid var(--border-color);
    }

    .btn-clear:hover {
        color: var(--error);
        border-color: var(--error);
        background: rgba(239, 68, 68, 0.05);
    }

    .history-list {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .history-item {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1rem;
        transition: all 0.2s;
        border: 1px solid var(--glass-border);
    }

    .history-item:hover {
        border-color: var(--primary-color);
        background: rgba(255, 255, 255, 0.08);
    }

    .type-icon {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }

    .type-icon.sent {
        background: rgba(99, 102, 241, 0.1);
        color: var(--primary-color);
    }

    .type-icon.received {
        background: rgba(236, 72, 153, 0.1);
        color: var(--accent-color);
    }

    .file-info {
        flex: 1;
        min-width: 0;
    }

    .name-row {
        display: flex;
        align-items: baseline;
        gap: 0.75rem;
        margin-bottom: 0.25rem;
    }

    .name {
        font-weight: 600;
        color: white;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .size {
        font-size: 0.75rem;
        color: var(--text-secondary);
        white-space: nowrap;
    }

    .meta-row {
        display: flex;
        align-items: center;
        gap: 1rem;
        font-size: 0.75rem;
        color: var(--text-secondary);
    }

    .encryption-tag {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        color: var(--success);
        background: rgba(16, 185, 129, 0.1);
        padding: 0.1rem 0.4rem;
        border-radius: 4px;
        font-weight: 500;
    }

    .empty-state {
        padding: 3rem;
        text-align: center;
        color: var(--text-secondary);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
    }

    .btn-remove {
        opacity: 0;
        background: transparent;
        color: var(--text-secondary);
        padding: 0.5rem;
        transition: all 0.2s;
    }

    .history-item:hover .btn-remove {
        opacity: 1;
    }

    .btn-remove:hover {
        color: var(--error);
    }

    @media (max-width: 640px) {
        .name-row {
            flex-direction: column;
            gap: 0;
        }
    }
</style>
