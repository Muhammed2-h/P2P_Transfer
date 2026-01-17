<script>
    import { transfer, TRANSFER_STATES } from "../stores/transfer";
    import { p2p } from "../services/p2p";
    import { Send, MessageCircle, X, Minimize2, Maximize2 } from "lucide-svelte";
    import { afterUpdate, onMount } from "svelte";

    let input = "";
    let chatContainer;
    let isOpen = false;
    let isMinimized = true;
    let hasUnread = false;

    // Auto-scroll to bottom
    afterUpdate(() => {
        if (chatContainer && isOpen && !isMinimized) {
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
    });

    $: if ($transfer.messages.length > 0) {
        const lastMsg = $transfer.messages[$transfer.messages.length - 1];
        if (lastMsg.sender === 'peer' && (isMinimized || !isOpen)) {
            hasUnread = true;
        }
    }

    function toggleChat() {
        if (isMinimized) {
            isMinimized = false;
            isOpen = true;
            hasUnread = false;
        } else {
            isMinimized = true;
        }
    }

    function closeChat() {
        isOpen = false;
        isMinimized = true;
    }

    function sendMessage() {
        if (!input.trim()) return;
        p2p.sendChatMessage(input);
        input = "";
    }

    function handleKeydown(e) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    }

    function formatTime(ts) {
        return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
</script>

{#if $transfer.state === TRANSFER_STATES.CONNECTED || $transfer.state === TRANSFER_STATES.TRANSFERRING || $transfer.state === TRANSFER_STATES.WAITING_ACCEPTANCE || $transfer.state === TRANSFER_STATES.PAUSED || $transfer.state === TRANSFER_STATES.COMPLETED}
    <!-- Floating Button -->
    {#if isMinimized}
        <button class="chat-fab glass-panel fade-in" on:click={toggleChat}>
            <div class="icon-badge">
                <MessageCircle size={24} color="white"/>
                {#if hasUnread}
                    <div class="unread-dot"></div>
                {/if}
            </div>
            <span class="label">Chat</span>
        </button>
    {/if}

    <!-- Chat Window -->
    {#if !isMinimized}
        <div class="chat-window glass-panel fade-in">
            <div class="chat-header">
                <div class="header-info">
                    <MessageCircle size={18} class="text-primary" />
                    <h3>Chat</h3>
                </div>
                <div class="header-controls">
                    <button class="icon-btn" on:click={() => isMinimized = true}>
                        <Minimize2 size={16} />
                    </button>
                    <!-- <button class="icon-btn" on:click={closeChat}>
                        <X size={16} />
                    </button> -->
                </div>
            </div>

            <div class="messages" bind:this={chatContainer}>
                {#if $transfer.messages.length === 0}
                    <div class="empty-state">
                        <p>No messages yet.</p>
                        <p class="sub">Say hi!</p>
                    </div>
                {/if}
                {#each $transfer.messages as msg}
                    <div class="msg-row" class:me={msg.sender === 'me'}>
                        <div class="bubble">
                            <p>{msg.text}</p>
                            <span class="time">{formatTime(msg.time)}</span>
                        </div>
                    </div>
                {/each}
            </div>

            <div class="input-area">
                <input
                    type="text"
                    placeholder="Type a message..."
                    bind:value={input}
                    on:keydown={handleKeydown}
                />
                <button class="send-btn" on:click={sendMessage} disabled={!input.trim()}>
                    <Send size={18} />
                </button>
            </div>
        </div>
    {/if}
{/if}

<style>
    .chat-fab {
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        z-index: 100;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.875rem 1.5rem;
        border-radius: 50px;
        background: rgba(15, 15, 20, 0.9);
        border: 1px solid var(--primary-color);
        cursor: pointer;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        transition: all 0.2s;
    }

    .chat-fab:hover {
        transform: translateY(-2px);
        background: rgba(30, 30, 40, 0.95);
    }

    .icon-badge {
        position: relative;
        display: flex;
        align-items: center;
    }

    .unread-dot {
        position: absolute;
        top: -2px;
        right: -2px;
        width: 10px;
        height: 10px;
        background: var(--accent-color);
        border-radius: 50%;
        border: 2px solid #1a1a20;
    }

    .label {
        font-weight: 600;
        color: white;
    }

    .chat-window {
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        width: 320px;
        height: 450px;
        z-index: 100;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        border-radius: var(--radius-md);
        background: rgba(10, 10, 14, 0.95);
        border: 1px solid var(--border-color);
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
    }

    .chat-header {
        padding: 1rem;
        border-bottom: 1px solid var(--border-color);
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: rgba(255, 255, 255, 0.02);
    }

    .header-info {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .header-info h3 {
        font-size: 1rem;
        font-weight: 600;
        margin: 0;
    }

    .header-controls {
        display: flex;
        gap: 0.25rem;
    }

    .icon-btn {
        background: transparent;
        color: var(--text-secondary);
        padding: 0.4rem;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .icon-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        color: white;
    }

    .messages {
        flex: 1;
        overflow-y: auto;
        padding: 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .empty-state {
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: var(--text-secondary);
        opacity: 0.5;
    }

    .empty-state .sub {
        font-size: 0.85rem;
    }

    .msg-row {
        display: flex;
        margin-bottom: 0.25rem;
    }

    .msg-row.me {
        justify-content: flex-end;
    }

    .bubble {
        max-width: 80%;
        padding: 0.6rem 0.875rem;
        border-radius: 12px;
        font-size: 0.9rem;
        line-height: 1.4;
        position: relative;
        word-wrap: break-word;
    }

    .me .bubble {
        background: var(--primary-color);
        color: white;
        border-bottom-right-radius: 2px;
    }

    .msg-row:not(.me) .bubble {
        background: var(--surface-color-2);
        color: var(--text-primary);
        border: 1px solid var(--border-color);
        border-bottom-left-radius: 2px;
    }

    .time {
        font-size: 0.65rem;
        opacity: 0.6;
        margin-top: 0.25rem;
        display: block;
        text-align: right;
    }

    .input-area {
        padding: 0.75rem;
        border-top: 1px solid var(--border-color);
        display: flex;
        gap: 0.5rem;
        background: rgba(0, 0, 0, 0.2);
    }

    input {
        flex: 1;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid var(--border-color);
        border-radius: 20px;
        padding: 0.5rem 1rem;
        color: white;
        font-size: 0.9rem;
    }

    input:focus {
        outline: none;
        border-color: var(--primary-color);
        background: rgba(255, 255, 255, 0.1);
    }

    .send-btn {
        background: var(--primary-color);
        color: white;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
    }

    .send-btn:disabled {
        opacity: 0.5;
        background: var(--surface-color-2);
        cursor: default;
    }

    .send-btn:not(:disabled):hover {
        transform: scale(1.05);
        background: var(--primary-hover);
    }

    @media (max-width: 480px) {
        .chat-window {
            width: 100%;
            height: 100%;
            bottom: 0;
            right: 0;
            border-radius: 0;
        }

        .chat-fab {
            bottom: 1.5rem;
            right: 1.5rem;
        }
    }
</style>
