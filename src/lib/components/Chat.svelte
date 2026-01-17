<script>
    import { transfer, TRANSFER_STATES } from "../stores/transfer";
    import { p2p } from "../services/p2p";
    import {
        Send,
        MessageCircle,
        X,
        Minimize2,
        Image as ImageIcon,
        Reply,
        Edit2,
        Camera,
        Plus,
        Video,
    } from "lucide-svelte";
    import { afterUpdate } from "svelte";

    let input = "";
    let chatContainer;
    let isOpen = false;
    let isMinimized = true;
    let hasUnread = false;

    // State for Reply/Edit
    let replyTo = null; // message object
    let editingId = null; // id of message being edited
    let fileInput;

    // Camera/Video State
    let isCameraOpen = false;
    let cameraMode = "photo"; // 'photo' or 'video'
    let isRecording = false;
    let mediaRecorder;
    let recordedChunks = [];
    let videoEl;
    let stream;
    let showAttachMenu = false;

    // Auto-scroll to bottom
    afterUpdate(() => {
        if (chatContainer && isOpen && !isMinimized && !editingId) {
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
    });

    $: if ($transfer.messages.length > 0) {
        const lastMsg = $transfer.messages[$transfer.messages.length - 1];
        if (lastMsg.sender === "peer" && (isMinimized || !isOpen)) {
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

    function sendMessage() {
        if (!input.trim() && !replyTo && !editingId) return;

        if (editingId) {
            p2p.sendChatEdit(editingId, input);
            editingId = null;
            input = "";
        } else {
            p2p.sendChatMessage({
                text: input,
                replyTo: replyTo ? replyTo.id : null,
            });
            input = "";
            replyTo = null;
        }
    }

    function handleKeydown(e) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
        if (e.key === "Escape") {
            cancelAction();
        }
    }

    function startReply(msg) {
        replyTo = msg;
        editingId = null;
        input = ""; // Clear input or keep it? varied UX. clearing for now.
        // Focus input
        const el = document.querySelector(".chat-input");
        if (el) el.focus();
    }

    function startEdit(msg) {
        if (msg.sender !== "me") return;
        editingId = msg.id;
        replyTo = null;
        input = msg.text;
        const el = document.querySelector(".chat-input");
        if (el) el.focus();
    }

    function cancelAction() {
        replyTo = null;
        editingId = null;
        input = "";
    }

    // Image Handling
    async function handleFileSelect(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Resize/Compress
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement("canvas");
                let width = img.width;
                let height = img.height;
                const MAX_SIZE = 800; // max width/height

                if (width > height) {
                    if (width > MAX_SIZE) {
                        height *= MAX_SIZE / width;
                        width = MAX_SIZE;
                    }
                } else {
                    if (height > MAX_SIZE) {
                        width *= MAX_SIZE / height;
                        height = MAX_SIZE;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, width, height);

                const dataUrl = canvas.toDataURL("image/jpeg", 0.7); // 70% quality

                // Send immediately
                p2p.sendChatMessage({
                    text: "",
                    image: dataUrl,
                    replyTo: replyTo ? replyTo.id : null,
                });
                replyTo = null;
                showAttachMenu = false;
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);

        // Reset
        e.target.value = "";
    }

    // Camera Functions
    async function openCamera(mode = "photo") {
        cameraMode = mode;
        isCameraOpen = true;
        showAttachMenu = false;
        try {
            // Request audio if video mode
            const constraints = {
                video: true,
                audio: mode === "video",
            };
            stream = await navigator.mediaDevices.getUserMedia(constraints);
            if (videoEl) {
                videoEl.srcObject = stream;
                videoEl.muted = true; // Mute local preview
            }
        } catch (err) {
            console.error("Camera access denied:", err);
            isCameraOpen = false;
            alert(
                "Could not access camera/microphone. Please allow permissions.",
            );
        }
    }

    function startRecording() {
        if (!stream) return;
        recordedChunks = [];
        mediaRecorder = new MediaRecorder(stream, {
            mimeType: "video/webm;codecs=vp8",
        });

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                recordedChunks.push(e.data);
            }
        };

        mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunks, { type: "video/webm" });
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = () => {
                const base64data = reader.result;
                // Check size!
                if (base64data.length > 5 * 1024 * 1024) {
                    alert(
                        "Video too large to send via Chat. Try sending a shorter clip.",
                    );
                    return;
                }

                p2p.sendChatMessage({
                    text: "",
                    video: base64data,
                    replyTo: replyTo ? replyTo.id : null,
                });
            };
        };

        mediaRecorder.start();
        isRecording = true;
    }

    function stopRecording() {
        if (mediaRecorder && isRecording) {
            mediaRecorder.stop();
            isRecording = false;
            closeCamera();
            replyTo = null;
        }
    }

    function closeCamera() {
        isCameraOpen = false;
        if (stream) {
            stream.getTracks().forEach((track) => track.stop());
            stream = null;
        }
    }

    function capturePhoto() {
        if (!videoEl) return;
        const canvas = document.createElement("canvas");
        canvas.width = videoEl.videoWidth;
        canvas.height = videoEl.videoHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(videoEl, 0, 0);

        // Convert to quality JPG
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);

        // Send
        p2p.sendChatMessage({
            text: "",
            image: dataUrl,
            replyTo: replyTo ? replyTo.id : null,
        });

        closeCamera();
        replyTo = null;
    }

    function formatTime(ts) {
        return new Date(ts).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    function getReplyMsg(id) {
        return $transfer.messages.find((m) => m.id === id);
    }

    function scrollToMsg(id) {
        const el = document.getElementById(`msg-${id}`);
        if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            el.classList.add("flash-highlight");
            setTimeout(() => el.classList.remove("flash-highlight"), 2000);
        }
    }
</script>

{#if $transfer.state === TRANSFER_STATES.CONNECTED || $transfer.state === TRANSFER_STATES.TRANSFERRING || $transfer.state === TRANSFER_STATES.WAITING_ACCEPTANCE || $transfer.state === TRANSFER_STATES.PAUSED || $transfer.state === TRANSFER_STATES.COMPLETED}
    <!-- Floating Button -->
    {#if isMinimized}
        <button class="chat-fab glass-panel fade-in" on:click={toggleChat}>
            <div class="icon-badge">
                <MessageCircle size={24} color="white" />
                {#if hasUnread}
                    <div class="unread-dot"></div>
                {/if}
            </div>
            <span class="label">Chat</span>
        </button>
    {/if}

    <!-- Camera Overlay -->
    {#if isCameraOpen}
        <div class="camera-overlay fade-in">
            <video bind:this={videoEl} autoplay playsinline muted></video>
            <div class="camera-controls">
                <button class="cam-btn close" on:click={closeCamera}>
                    <X size={24} />
                </button>
                <button class="cam-btn capture" on:click={capturePhoto}>
                    <div class="inner-circle"></div>
                </button>
                <div class="spacer"></div>
            </div>
        </div>
    {/if}

    <!-- Chat Window -->
    {#if !isMinimized && !isCameraOpen}
        <div class="chat-window glass-panel fade-in">
            <div class="chat-header">
                <div class="header-info">
                    <MessageCircle size={18} class="text-primary" />
                    <h3>Chat</h3>
                </div>
                <div class="header-controls">
                    <button
                        class="icon-btn"
                        on:click={() => (isMinimized = true)}
                    >
                        <Minimize2 size={16} />
                    </button>
                </div>
            </div>

            <div class="messages" bind:this={chatContainer}>
                {#if $transfer.messages.length === 0}
                    <div class="empty-state">
                        <p>No messages yet.</p>
                        <p class="sub">
                            Shared images & text will appear here.
                        </p>
                    </div>
                {/if}
                {#each $transfer.messages as msg}
                    <div
                        id="msg-{msg.id}"
                        class="msg-row"
                        class:me={msg.sender === "me"}
                    >
                        <div class="bubble-container">
                            {#if msg.replyTo}
                                {@const replied = getReplyMsg(msg.replyTo)}
                                {#if replied}
                                    <div
                                        class="reply-preview-bubble clickable"
                                        on:click={() =>
                                            scrollToMsg(msg.replyTo)}
                                    >
                                        <div class="reply-bar"></div>
                                        <span class="reply-sender"
                                            >{replied.sender === "me"
                                                ? "You"
                                                : "Peer"}</span
                                        >
                                        <p class="reply-text truncate">
                                            {replied.image
                                                ? "📷 Image"
                                                : replied.text}
                                        </p>
                                    </div>
                                {/if}
                            {/if}

                            <div class="bubble group">
                                {#if msg.image}
                                    <img
                                        src={msg.image}
                                        class="chat-image"
                                        alt="Shared attachment"
                                    />
                                {/if}
                                {#if msg.video}
                                    <!-- svelte-ignore a11y-media-has-caption -->
                                    <video
                                        src={msg.video}
                                        controls
                                        class="chat-image"
                                    ></video>
                                {/if}
                                {#if msg.text}
                                    <p>
                                        {msg.text}
                                        {#if msg.edited}<span class="edited-tag"
                                                >(edited)</span
                                            >{/if}
                                    </p>
                                {/if}
                                <span class="time">{formatTime(msg.time)}</span>

                                <!-- Hover Actions -->
                                <div class="msg-actions">
                                    <button
                                        class="action-btn"
                                        on:click={() => startReply(msg)}
                                        title="Reply"
                                    >
                                        <Reply size={12} />
                                    </button>
                                    {#if msg.sender === "me" && msg.text}
                                        <button
                                            class="action-btn"
                                            on:click={() => startEdit(msg)}
                                            title="Edit"
                                        >
                                            <Edit2 size={12} />
                                        </button>
                                    {/if}
                                </div>
                            </div>
                        </div>
                    </div>
                {/each}
            </div>

            <!-- Reply/Edit Context -->
            {#if replyTo || editingId}
                <div class="context-bar">
                    <div class="context-content">
                        {#if replyTo}
                            <Reply size={14} class="text-primary" />
                            <div class="context-text">
                                <span class="label"
                                    >Replying to {replyTo.sender === "me"
                                        ? "yourself"
                                        : "peer"}</span
                                >
                                <p class="truncate">
                                    {replyTo.image ? "📷 Image" : replyTo.text}
                                </p>
                            </div>
                        {:else if editingId}
                            <Edit2 size={14} class="text-warning" />
                            <div class="context-text">
                                <span class="label">Editing message</span>
                            </div>
                        {/if}
                    </div>
                    <button class="close-context" on:click={cancelAction}>
                        <X size={14} />
                    </button>
                </div>
            {/if}

            <div class="input-area relative">
                <!-- Attachments Menu -->
                {#if showAttachMenu}
                    <div class="attach-menu glass-panel fade-up">
                        <button
                            class="menu-item"
                            on:click={() => fileInput.click()}
                        >
                            <div class="icon-wrap color-1">
                                <ImageIcon size={20} />
                            </div>
                            <span>Gallery</span>
                        </button>
                        <button
                            class="menu-item"
                            on:click={() => openCamera("photo")}
                        >
                            <div class="icon-wrap color-2">
                                <Camera size={20} />
                            </div>
                            <span>Camera</span>
                        </button>
                        <button
                            class="menu-item"
                            on:click={() => openCamera("video")}
                        >
                            <div class="icon-wrap color-3">
                                <Video size={20} />
                            </div>
                            <span>Video</span>
                        </button>
                    </div>
                    <!-- Overlay to close menu -->
                    <div
                        class="menu-overlay"
                        on:click={() => (showAttachMenu = false)}
                    ></div>
                {/if}

                <button
                    class="icon-btn-sm"
                    on:click={() => (showAttachMenu = !showAttachMenu)}
                    title="Add Attachment"
                >
                    <Plus size={22} class={showAttachMenu ? "rotate-45" : ""} />
                </button>

                <input
                    type="file"
                    accept="image/*"
                    bind:this={fileInput}
                    on:change={handleFileSelect}
                    style="display:none"
                />

                <input
                    type="text"
                    class="chat-input"
                    placeholder="Type a message..."
                    bind:value={input}
                    on:keydown={handleKeydown}
                />
                <button
                    class="send-btn"
                    on:click={sendMessage}
                    disabled={!input.trim() && !editingId}
                >
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
        width: 340px;
        height: 500px;
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

    .icon-btn {
        background: transparent;
        color: var(--text-secondary);
        padding: 0.4rem;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .icon-btn-sm {
        background: transparent;
        color: var(--text-secondary);
        padding: 0.4rem;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
    }

    .icon-btn:hover,
    .icon-btn-sm:hover {
        background: rgba(255, 255, 255, 0.1);
        color: white;
    }

    .messages {
        flex: 1;
        overflow-y: auto;
        padding: 1rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .empty-state {
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: var(--text-secondary);
        opacity: 0.5;
        text-align: center;
        padding: 2rem;
    }

    .empty-state .sub {
        font-size: 0.85rem;
    }

    .msg-row {
        display: flex;
        width: 100%;
    }

    .msg-row.me {
        justify-content: flex-end;
    }

    .bubble-container {
        display: flex;
        flex-direction: column;
        max-width: 85%;
        align-items: flex-start;
    }

    .me .bubble-container {
        align-items: flex-end;
    }

    .bubble {
        padding: 0.6rem 0.875rem;
        border-radius: 12px;
        font-size: 0.9rem;
        line-height: 1.4;
        position: relative;
        word-wrap: break-word;
        border-top-left-radius: 2px;
    }

    .me .bubble {
        background: var(--primary-color);
        color: white;
        border-top-left-radius: 12px;
        border-top-right-radius: 2px;
    }

    .msg-row:not(.me) .bubble {
        background: var(--surface-color-2);
        color: var(--text-primary);
        border: 1px solid var(--border-color);
    }

    .chat-image {
        max-width: 100%;
        border-radius: 8px;
        margin-bottom: 0.5rem;
        display: block;
    }

    .time {
        font-size: 0.65rem;
        opacity: 0.6;
        margin-top: 0.25rem;
        display: block;
        text-align: right;
    }

    .edited-tag {
        font-size: 0.7em;
        opacity: 0.7;
        font-style: italic;
        margin-left: 4px;
    }

    /* Hover Actions */
    .msg-actions {
        position: absolute;
        top: -1.5rem;
        right: 0;
        background: var(--surface-color);
        border: 1px solid var(--border-color);
        border-radius: 20px;
        padding: 2px 6px;
        display: none;
        gap: 4px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    }

    .bubble:hover .msg-actions {
        display: flex;
    }

    .action-btn {
        background: none;
        border: none;
        padding: 4px;
        cursor: pointer;
        color: var(--text-secondary);
        display: flex;
    }

    .action-btn:hover {
        color: var(--primary-color);
    }

    /* Reply Preview */
    .reply-preview-bubble {
        background: rgba(255, 255, 255, 0.05);
        border-left: 3px solid var(--primary-color);
        padding: 4px 8px;
        border-radius: 4px;
        margin-bottom: 4px;
        font-size: 0.8rem;
        color: var(--text-secondary);
        cursor: pointer;
        width: 100%;
    }

    .reply-sender {
        font-weight: 600;
        font-size: 0.75rem;
        display: block;
        margin-bottom: 2px;
    }

    .context-bar {
        background: var(--surface-color-2);
        border-top: 1px solid var(--border-color);
        padding: 0.5rem 1rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .context-content {
        display: flex;
        gap: 0.5rem;
        align-items: center;
        overflow: hidden;
    }

    .context-text {
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }

    .context-text .label {
        font-size: 0.75rem;
        color: var(--primary-color);
    }

    .context-text p {
        font-size: 0.85rem;
        color: var(--text-secondary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .close-context {
        background: none;
        color: var(--text-secondary);
        padding: 4px;
    }

    .close-context:hover {
        color: white;
    }

    .clickable {
        cursor: pointer;
        opacity: 0.8;
    }

    .clickable:hover {
        opacity: 1;
        background: rgba(255, 255, 255, 0.1);
    }

    .flash-highlight .bubble {
        animation: highlight 2s ease;
    }

    @keyframes highlight {
        0%,
        100% {
            box-shadow: 0 0 0 0 transparent;
        }
        20% {
            box-shadow: 0 0 0 4px var(--primary-color);
        }
    }

    .truncate {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .input-area {
        padding: 0.75rem;
        border-top: 1px solid var(--border-color);
        display: flex;
        gap: 0.5rem;
        background: rgba(0, 0, 0, 0.2);
        align-items: center;
    }

    input[type="text"] {
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

    /* Camera Styles */
    .attach-menu {
        position: absolute;
        bottom: 100%;
        left: 0.5rem;
        margin-bottom: 0.75rem;
        background: rgba(30, 30, 35, 0.95);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border-radius: 16px;
        padding: 0.5rem;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
        border: 1px solid rgba(255, 255, 255, 0.1);
        z-index: 101;
        min-width: 160px;
        transform-origin: bottom left;
    }

    .menu-item {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 0.75rem 1rem;
        background: transparent !important; /* Force override */
        border: none !important;
        color: rgba(255, 255, 255, 0.9);
        cursor: pointer;
        border-radius: 12px;
        transition: all 0.2s;
        text-align: left;
        width: 100%;
        font-family: inherit;
        font-size: 0.95rem;
    }

    .menu-item:hover {
        background: rgba(255, 255, 255, 0.08) !important;
        transform: translateX(2px);
    }

    .menu-item span {
        font-weight: 500;
        letter-spacing: 0.02em;
    }

    .icon-wrap {
        width: 36px;
        height: 36px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s;
    }

    .menu-item:hover .icon-wrap {
        transform: scale(1.1);
    }

    .color-1 {
        background: rgba(59, 130, 246, 0.15);
        color: #60a5fa;
    }
    .color-2 {
        background: rgba(16, 185, 129, 0.15);
        color: #34d399;
    }
    .color-3 {
        background: rgba(244, 63, 94, 0.15);
        color: #fb7185;
    }
    .camera-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: black;
        z-index: 200;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
    }

    .camera-overlay video {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .camera-controls {
        position: absolute;
        bottom: 2rem;
        left: 0;
        width: 100%;
        display: flex;
        justify-content: space-around;
        align-items: center;
        padding: 0 2rem;
    }

    .cam-btn {
        background: rgba(0, 0, 0, 0.5);
        border: none;
        color: white;
        border-radius: 50%;
        width: 48px;
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        backdrop-filter: blur(4px);
    }

    .cam-btn.capture {
        width: 72px;
        height: 72px;
        border: 4px solid white;
        background: transparent;
        padding: 4px;
    }

    .inner-circle {
        width: 100%;
        height: 100%;
        background: white;
        border-radius: 50%;
        transition: transform 0.1s;
    }

    .cam-btn.capture:active .inner-circle {
        transform: scale(0.9);
    }

    .spacer {
        width: 48px;
    }
</style>
