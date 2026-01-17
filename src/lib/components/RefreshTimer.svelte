<script>
    import { onMount, onDestroy } from "svelte";

    export let duration = 60; // seconds
    export let onRefresh = () => {};

    let timeLeft = duration;
    let interval;

    onMount(() => {
        interval = setInterval(() => {
            timeLeft -= 1;
            if (timeLeft <= 0) {
                onRefresh();
                timeLeft = duration;
            }
        }, 1000);
    });

    onDestroy(() => {
        if (interval) clearInterval(interval);
    });

    // Calculate stroke-dashoffset for SVG circle
    // Circumference = 2 * PI * r
    const r = 18;
    const c = 2 * Math.PI * r;
    $: offset = c - (timeLeft / duration) * c;
</script>

<div class="timer-container" title="Session auto-refresh">
    <svg width="44" height="44" viewBox="0 0 44 44">
        <circle
            cx="22"
            cy="22"
            {r}
            fill="none"
            stroke="var(--surface-color-2)"
            stroke-width="4"
        />
        <circle
            cx="22"
            cy="22"
            {r}
            fill="none"
            stroke="var(--primary-color)"
            stroke-width="4"
            stroke-dasharray={c}
            stroke-dashoffset={offset}
            transform="rotate(-90 22 22)"
            style="transition: stroke-dashoffset 1s linear;"
        />
        <text
            x="50%"
            y="54%"
            text-anchor="middle"
            dy=".3em"
            font-size="0.8rem"
            fill="var(--text-secondary)">{timeLeft}</text
        >
    </svg>
</div>

<style>
    .timer-container {
        display: flex;
        align-items: center;
        justify-content: center;
    }

    text {
        font-weight: 600;
    }
</style>
