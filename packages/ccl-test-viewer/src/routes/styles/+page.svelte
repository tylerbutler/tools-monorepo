<script lang="ts">
import Base16ColorDemo from "$lib/components/Base16ColorDemo.svelte";
import ColorPalette from "$lib/components/ColorPalette.svelte";
import ShadcnDemo from "$lib/components/ShadcnDemo.svelte";
</script>

<svelte:head>
  <title>Style Testing - CCL Test Suite Viewer</title>
  <meta
    name="description"
    content="Color theme and component style testing page"
  />
</svelte:head>

<div class="container mx-auto px-4 py-8 space-y-8">
  <div class="text-center space-y-4">
    <h1 class="text-4xl font-bold tracking-tight">Style Testing</h1>
    <p class="text-lg text-muted-foreground">
      Test Base16 themes and shadcn-svelte component styles
    </p>
  </div>

  <div class="grid gap-8 lg:grid-cols-1">
    <!-- Color Palette Demo -->
    <section class="space-y-4">
      <div class="border-b pb-4">
        <h2 class="text-2xl font-semibold">Application Color Scheme</h2>
        <p class="text-muted-foreground">
          Semantic color palette for consistent UI and status indication
        </p>
      </div>
      <ColorPalette />
    </section>

    <!-- shadcn-svelte Component Demo -->
    <section class="space-y-4">
      <div class="border-b pb-4">
        <h2 class="text-2xl font-semibold">shadcn-svelte Component Styles</h2>
        <p class="text-muted-foreground">
          Test shadcn-svelte components and Tailwind utility classes
        </p>
      </div>
      <ShadcnDemo />
    </section>

    <!-- Base16 Theme Demo -->
    <section class="space-y-4">
      <Base16ColorDemo />
    </section>
  </div>
</div>
