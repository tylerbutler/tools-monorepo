<script lang="ts">
interface Props {
	icon: any;
	size?: number;
	class?: string;
}

let { icon, size = 24, class: className = "" }: Props = $props();

// Extract the SVG path data from the HugeIcons icon format
const paths = Array.isArray(icon) ? icon : [];

// Add some debugging for problematic icons
if (!Array.isArray(icon)) {
	console.warn('Icon data is not an array:', icon);
}
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 24 24"
	fill="none"
	width={size}
	height={size}
	class={className}
>
	{#each paths as pathData}
		{#if Array.isArray(pathData) && pathData.length >= 2}
			{#if pathData[0] === 'path'}
				<path {...pathData[1]} />
			{:else if pathData[0] === 'circle'}
				<circle {...pathData[1]} />
			{:else if pathData[0] === 'rect'}
				<rect {...pathData[1]} />
			{:else if pathData[0] === 'line'}
				<line {...pathData[1]} />
			{:else if pathData[0] === 'polyline'}
				<polyline {...pathData[1]} />
			{:else if pathData[0] === 'polygon'}
				<polygon {...pathData[1]} />
			{/if}
		{/if}
	{/each}
</svg>