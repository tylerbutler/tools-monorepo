<script lang="ts">
import { Badge } from "$lib/components/ui/badge/index.js";
import { Button } from "$lib/components/ui/button/index.js";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "$lib/components/ui/card/index.js";
import { Input } from "$lib/components/ui/input/index.js";
import SimpleCheckbox from "$lib/components/ui/simple-checkbox.svelte";

// State for interactive components
let checkboxValue = $state(false);
let inputValue = $state("Sample text");

const buttonVariants = [
	"default",
	"destructive",
	"outline",
	"secondary",
	"ghost",
	"link",
] as const;
const badgeVariants = [
	"default",
	"secondary",
	"destructive",
	"outline",
] as const;

// Sample data for demonstrations
const sampleCards = [
	{
		title: "Card Example 1",
		description: "This demonstrates the card component with default styling",
		content: "Sample content with standard text formatting and layout.",
	},
	{
		title: "Card Example 2",
		description: "Another card showing consistent styling patterns",
		content: "More sample content to show how cards work in a grid layout.",
	},
];
</script>

<div class="space-y-8">
	<!-- Typography -->
	<section class="space-y-4">
		<h4 class="text-lg font-semibold">Typography</h4>
		<div class="space-y-2">
			<h1 class="text-4xl font-bold">Heading 1</h1>
			<h2 class="text-3xl font-semibold">Heading 2</h2>
			<h3 class="text-2xl font-medium">Heading 3</h3>
			<h4 class="text-xl">Heading 4</h4>
			<p class="text-base">Regular paragraph text with normal weight and spacing.</p>
			<p class="text-sm text-muted-foreground">Small muted text for secondary information.</p>
			<p class="text-xs text-muted-foreground">Extra small text for captions and fine print.</p>
			<code class="font-mono bg-muted px-2 py-1 rounded text-sm">inline code</code>
		</div>
	</section>

	<!-- Buttons -->
	<section class="space-y-4">
		<h4 class="text-lg font-semibold">Buttons</h4>
		<div class="flex flex-wrap gap-3">
			{#each buttonVariants as variant}
				<Button variant={variant}>
					{variant.charAt(0).toUpperCase() + variant.slice(1)}
				</Button>
			{/each}
		</div>

		<div class="flex flex-wrap gap-3">
			<Button size="sm">Small</Button>
			<Button size="default">Default</Button>
			<Button size="lg">Large</Button>
		</div>
	</section>

	<!-- Badges - TESTING ENABLED -->
	<section class="space-y-4">
		<h4 class="text-lg font-semibold">Badges</h4>
		<div class="flex flex-wrap gap-3">
			{#each badgeVariants as variant}
				<Badge variant={variant}>
					{variant.charAt(0).toUpperCase() + variant.slice(1)}
				</Badge>
			{/each}
		</div>
	</section>

	<!-- Form Elements - TESTING INPUT ONLY -->
	<section class="space-y-4">
		<h4 class="text-lg font-semibold">Form Elements</h4>
		<div class="space-y-4 max-w-md">
			<div class="space-y-2">
				<label for="sample-input" class="text-sm font-medium">Input Field</label>
				<Input
					id="sample-input"
					bind:value={inputValue}
					placeholder="Enter some text..."
				/>
				<p class="text-xs text-muted-foreground">Current value: {inputValue}</p>
			</div>

			<div class="flex items-center space-x-2">
				<SimpleCheckbox
					id="sample-checkbox"
					bind:checked={checkboxValue}
				/>
				<label for="sample-checkbox" class="text-sm font-medium">
					Sample checkbox ({checkboxValue ? 'checked' : 'unchecked'})
				</label>
			</div>
		</div>
	</section>

	<!-- Cards - TESTING ENABLED -->
	<section class="space-y-4">
		<h4 class="text-lg font-semibold">Cards</h4>
		<div class="grid gap-4 md:grid-cols-2">
			{#each sampleCards as card}
				<Card>
					<CardHeader>
						<CardTitle>{card.title}</CardTitle>
						<CardDescription>{card.description}</CardDescription>
					</CardHeader>
					<CardContent>
						<p class="text-sm">{card.content}</p>
					</CardContent>
					<CardFooter class="flex justify-between">
						<Button variant="outline" size="sm">Cancel</Button>
						<Button size="sm">Action</Button>
					</CardFooter>
				</Card>
			{/each}
		</div>
	</section>

	<!-- Colors and States -->
	<section class="space-y-4">
		<h4 class="text-lg font-semibold">Color System</h4>
		<div class="grid gap-4 md:grid-cols-2">
			<!-- Semantic Colors -->
			<div class="space-y-2">
				<h5 class="font-medium">Semantic Colors</h5>
				<div class="space-y-2">
					<div class="flex items-center gap-3">
						<div class="w-8 h-8 rounded bg-primary"></div>
						<span class="text-sm">Primary</span>
					</div>
					<div class="flex items-center gap-3">
						<div class="w-8 h-8 rounded bg-secondary"></div>
						<span class="text-sm">Secondary</span>
					</div>
					<div class="flex items-center gap-3">
						<div class="w-8 h-8 rounded bg-muted"></div>
						<span class="text-sm">Muted</span>
					</div>
					<div class="flex items-center gap-3">
						<div class="w-8 h-8 rounded bg-accent"></div>
						<span class="text-sm">Accent</span>
					</div>
					<div class="flex items-center gap-3">
						<div class="w-8 h-8 rounded bg-destructive"></div>
						<span class="text-sm">Destructive</span>
					</div>
				</div>
			</div>

			<!-- Text Colors -->
			<div class="space-y-2">
				<h5 class="font-medium">Text Colors</h5>
				<div class="space-y-1">
					<p class="text-foreground">Primary text (foreground)</p>
					<p class="text-muted-foreground">Muted text</p>
					<p class="text-primary">Primary text</p>
					<p class="text-secondary-foreground">Secondary text</p>
					<p class="text-destructive">Destructive text</p>
				</div>
			</div>
		</div>
	</section>

	<!-- Borders and Surfaces -->
	<section class="space-y-4">
		<h4 class="text-lg font-semibold">Borders & Surfaces</h4>
		<div class="grid gap-4 md:grid-cols-3">
			<div class="p-4 border border-border rounded-lg bg-background">
				<p class="text-sm font-medium">Background</p>
				<p class="text-xs text-muted-foreground">Default background with border</p>
			</div>
			<div class="p-4 border border-border rounded-lg bg-card">
				<p class="text-sm font-medium">Card</p>
				<p class="text-xs text-muted-foreground">Card background surface</p>
			</div>
			<div class="p-4 border border-border rounded-lg bg-muted">
				<p class="text-sm font-medium">Muted</p>
				<p class="text-xs text-muted-foreground">Muted background surface</p>
			</div>
		</div>
	</section>

	<!-- Interactive States -->
	<section class="space-y-4">
		<h4 class="text-lg font-semibold">Interactive States</h4>
		<div class="space-y-3">
			<div class="p-3 border border-border rounded hover:bg-muted/50 transition-colors cursor-pointer">
				<p class="text-sm font-medium">Hover State</p>
				<p class="text-xs text-muted-foreground">Hover over this to see the effect</p>
			</div>
			<div class="p-3 border-2 border-primary rounded focus-within:ring-2 focus-within:ring-ring">
				<p class="text-sm font-medium">Focus State</p>
				<Input placeholder="Focus this input to see the ring" class="mt-2" />
				<p class="text-xs text-muted-foreground">Input component enabled for testing</p>
			</div>
		</div>
	</section>

	<!-- Layout Examples -->
	<section class="space-y-4">
		<h4 class="text-lg font-semibold">Layout Patterns</h4>
		<div class="space-y-4">
			<!-- Flexbox Layout -->
			<div class="p-4 border border-border rounded-lg">
				<h5 class="font-medium mb-3">Flexbox Layout</h5>
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<Badge>Status</Badge>
						<span class="text-sm">Item title</span>
					</div>
					<Button size="sm" variant="outline">Action</Button>
				</div>
			</div>

			<!-- Grid Layout -->
			<div class="p-4 border border-border rounded-lg">
				<h5 class="font-medium mb-3">Grid Layout</h5>
				<div class="grid grid-cols-3 gap-3">
					<div class="p-3 bg-muted rounded text-center text-sm">Grid 1</div>
					<div class="p-3 bg-muted rounded text-center text-sm">Grid 2</div>
					<div class="p-3 bg-muted rounded text-center text-sm">Grid 3</div>
				</div>
			</div>
		</div>
	</section>
</div>