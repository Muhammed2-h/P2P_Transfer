<script>
  import { onMount } from "svelte";
  import { currentView, VIEWS } from "./lib/stores/nav";
  import Header from "./lib/components/Header.svelte";
  import Background from "./lib/components/Background.svelte";
  import Hero from "./lib/components/Hero.svelte";
  import Sender from "./lib/components/Sender.svelte";
  import Receiver from "./lib/components/Receiver.svelte";
  import PWAInstall from "./lib/components/PWAInstall.svelte";

  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("code")) {
      currentView.set(VIEWS.RECEIVER);
    }
  });

  // Dynamic component Loading
  $: ViewComponent = {
    [VIEWS.HOME]: Hero,
    [VIEWS.SENDER]: Sender,
    [VIEWS.RECEIVER]: Receiver,
  }[$currentView];
</script>

<Background />
<Header />

<main class="container">
  <svelte:component this={ViewComponent} />
</main>

<PWAInstall />

<style>
  main {
    position: relative;
    z-index: 1;
    min-height: calc(100vh - 80px);
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
</style>
