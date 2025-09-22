<script lang="ts">
// Simplified component without complex store dependencies
// Focus on demonstrating Base16 colors without lifecycle issues

// Base16 color classes using correct base16-tailwind naming
const base16Colors = [
	{
		class: "bg-800 text-100",
		name: "base00/800",
		description: "Default Background",
	},
	{
		class: "bg-700 text-100",
		name: "base01/700",
		description: "Lighter Background",
	},
	{
		class: "bg-600 text-200",
		name: "base02/600",
		description: "Selection Background",
	},
	{ class: "bg-500 text-300", name: "base03/500", description: "Comments" },
	{
		class: "bg-400 text-800",
		name: "base04/400",
		description: "Dark Foreground",
	},
	{
		class: "bg-300 text-800",
		name: "base05/300",
		description: "Default Foreground",
	},
	{
		class: "bg-200 text-800",
		name: "base06/200",
		description: "Light Foreground",
	},
	{
		class: "bg-100 text-800",
		name: "base07/100",
		description: "Light Background",
	},
];

const accentColors = [
	{ class: "bg-red text-100", name: "red", description: "Variables, XML Tags" },
	{
		class: "bg-orange text-100",
		name: "orange",
		description: "Integers, Booleans",
	},
	{
		class: "bg-yellow text-800",
		name: "yellow",
		description: "Classes, Markup Bold",
	},
	{ class: "bg-green text-100", name: "green", description: "Strings" },
	{ class: "bg-cyan text-800", name: "cyan", description: "Support, Regex" },
	{
		class: "bg-blue text-100",
		name: "blue",
		description: "Functions, Methods",
	},
	{
		class: "bg-purple text-100",
		name: "purple",
		description: "Keywords, Storage",
	},
	{ class: "bg-brown text-100", name: "brown", description: "Deprecated" },
];
</script>

<div class="space-y-6">
	<div class="text-center">
		<h2 class="text-2xl font-bold text-foreground mb-2">
			Base16 Color Demonstration
		</h2>
		<p class="text-muted-foreground">
			Showing Base16 color palette and usage examples
		</p>
	</div>

	<!-- Base Colors -->
	<div>
		<h3 class="text-lg font-semibold text-foreground mb-3">Base Colors</h3>
		<div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
			{#each base16Colors as color}
				<div class="rounded-lg border border-border overflow-hidden">
					<div class="{color.class} p-4 text-center">
						<div class="font-mono text-sm font-bold">{color.name}</div>
					</div>
					<div class="p-2 bg-card text-card-foreground">
						<div class="text-xs font-medium">{color.description}</div>
					</div>
				</div>
			{/each}
		</div>
	</div>

	<!-- Accent Colors -->
	<div>
		<h3 class="text-lg font-semibold text-foreground mb-3">Accent Colors</h3>
		<div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
			{#each accentColors as color}
				<div class="rounded-lg border border-border overflow-hidden">
					<div class="{color.class} p-4 text-center">
						<div class="font-mono text-sm font-bold">{color.name}</div>
					</div>
					<div class="p-2 bg-card text-card-foreground">
						<div class="text-xs font-medium">{color.description}</div>
					</div>
				</div>
			{/each}
		</div>
	</div>

	<!-- Usage Examples -->
	<div>
		<h3 class="text-lg font-semibold text-foreground mb-3">Usage Examples</h3>
		<div class="space-y-4">
			<!-- Code Block Example -->
			<div class="rounded-lg border border-border overflow-hidden">
				<div class="bg-700 text-300 p-3 font-mono text-sm">
					<div class="text-500">// Base16 themed code example</div>
					<div><span class="text-purple">function</span> <span class="text-blue">calculateSum</span>(<span class="text-orange">a</span><span class="text-300">:</span> <span class="text-yellow">number</span>, <span class="text-orange">b</span><span class="text-300">:</span> <span class="text-yellow">number</span>) {"{"}</div>
					<div class="ml-4"><span class="text-purple">return</span> <span class="text-orange">a</span> <span class="text-300">+</span> <span class="text-orange">b</span>;</div>
					<div>}</div>
					<div></div>
					<div><span class="text-purple">const</span> <span class="text-red">result</span> <span class="text-300">=</span> <span class="text-blue">calculateSum</span>(<span class="text-orange">10</span>, <span class="text-orange">20</span>);</div>
					<div><span class="text-cyan">console</span>.<span class="text-blue">log</span>(<span class="text-green">"Result:"</span>, <span class="text-red">result</span>);</div>
				</div>
			</div>

			<!-- Alert Examples -->
			<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
				<div class="rounded border-l-4 border-red bg-700 p-3">
					<div class="text-red font-medium text-sm">Error</div>
					<div class="text-400 text-xs">Something went wrong</div>
				</div>
				<div class="rounded border-l-4 border-yellow bg-700 p-3">
					<div class="text-yellow font-medium text-sm">Warning</div>
					<div class="text-400 text-xs">Please check your input</div>
				</div>
				<div class="rounded border-l-4 border-green bg-700 p-3">
					<div class="text-green font-medium text-sm">Success</div>
					<div class="text-400 text-xs">Operation completed</div>
				</div>
			</div>

			<!-- Button Examples -->
			<div class="flex flex-wrap gap-3">
				<button class="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-all">
					Primary Button
				</button>
				<button class="px-4 py-2 bg-green text-foreground rounded hover:opacity-80 transition-opacity">
					Success Button
				</button>
				<button class="px-4 py-2 bg-red text-foreground rounded hover:opacity-80 transition-opacity">
					Danger Button
				</button>
				<button class="px-4 py-2 bg-purple text-foreground rounded hover:opacity-80 transition-opacity">
					Purple Button
				</button>
			</div>
		</div>
	</div>
</div>