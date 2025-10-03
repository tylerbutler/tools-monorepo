<script>
import { Badge } from "$lib/components/ui/badge";
import { Button } from "$lib/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "$lib/components/ui/card";

const colors = [
	{
		name: "Success",
		class: "bg-success text-success-foreground",
		description: "Positive actions and successful states",
	},
	{
		name: "Warning",
		class: "bg-warning text-warning-foreground",
		description: "Cautionary messages and pending states",
	},
	{
		name: "Info",
		class: "bg-info text-info-foreground",
		description: "Informational content and primary accents",
	},
	{
		name: "Purple",
		class: "bg-purple text-purple-foreground",
		description: "Creative elements and function tags",
	},
	{
		name: "Teal",
		class: "bg-teal text-teal-foreground",
		description: "Calm content and feature highlights",
	},
	{
		name: "Pink",
		class: "bg-pink text-pink-foreground",
		description: "Destructive actions and error states",
	},
];

const examples = [
	{ type: "success", message: "Test passed successfully!", icon: "✅" },
	{ type: "warning", message: "Some tests are pending", icon: "⚠️" },
	{ type: "info", message: "Loading test data...", icon: "ℹ️" },
	{ type: "purple", message: "Advanced feature enabled", icon: "🔮" },
	{ type: "teal", message: "Processing complete", icon: "🌊" },
	{ type: "pink", message: "New feature available", icon: "✨" },
];
</script>

<Card class="w-full">
	<CardHeader>
		<CardTitle class="flex items-center gap-2">
			<span class="text-2xl">🎨</span>
			Color Palette
		</CardTitle>
		<CardDescription>
			Application color scheme with semantic colors for status, notifications, and UI elements
		</CardDescription>
	</CardHeader>
	<CardContent class="space-y-6">
		<!-- Color Swatches -->
		<div class="space-y-4">
			<h3 class="text-lg font-semibold">Available Colors</h3>
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{#each colors as color}
					<div class="space-y-2">
						<div class="{color.class} p-4 rounded-lg text-center font-medium">
							{color.name}
						</div>
						<p class="text-sm text-muted-foreground">{color.description}</p>
					</div>
				{/each}
			</div>
		</div>

		<!-- Interactive Examples -->
		<div class="space-y-4">
			<h3 class="text-lg font-semibold">Interactive Examples</h3>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				{#each examples as example}
					<Button
						variant="outline"
						class="h-auto p-4 justify-start bg-{example.type}/10 border-{example.type} hover:bg-{example.type}/20"
					>
						<span class="text-xl mr-3">{example.icon}</span>
						<div class="text-left">
							<div class="font-medium text-{example.type}">{example.message}</div>
							<div class="text-xs text-muted-foreground capitalize">{example.type} notification</div>
						</div>
					</Button>
				{/each}
			</div>
		</div>

		<!-- Badge Examples -->
		<div class="space-y-4">
			<h3 class="text-lg font-semibold">Status Badges</h3>
			<div class="flex flex-wrap gap-2">
				<Badge class="bg-success text-success-foreground">Passed</Badge>
				<Badge class="bg-warning text-warning-foreground">Pending</Badge>
				<Badge class="bg-info text-info-foreground">Info</Badge>
				<Badge class="bg-purple text-purple-foreground">Feature</Badge>
				<Badge class="bg-teal text-teal-foreground">Processing</Badge>
				<Badge class="bg-pink text-pink-foreground">New</Badge>
			</div>
		</div>

		<!-- Usage Examples -->
		<div class="space-y-4">
			<h3 class="text-lg font-semibold">Usage Examples</h3>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<Card class="border-success/20">
					<CardContent class="p-4">
						<div class="flex items-center gap-2 text-success">
							<span class="text-xl">✅</span>
							<span class="font-medium">All Tests Passing</span>
						</div>
						<p class="text-sm text-muted-foreground mt-1">
							452 assertions completed successfully
						</p>
					</CardContent>
				</Card>

				<Card class="border-info/20">
					<CardContent class="p-4">
						<div class="flex items-center gap-2 text-info">
							<span class="text-xl">📊</span>
							<span class="font-medium">Test Statistics</span>
						</div>
						<p class="text-sm text-muted-foreground mt-1">
							View detailed analytics and reports
						</p>
					</CardContent>
				</Card>

				<Card class="border-warning/20">
					<CardContent class="p-4">
						<div class="flex items-center gap-2 text-warning">
							<span class="text-xl">⚠️</span>
							<span class="font-medium">Attention Required</span>
						</div>
						<p class="text-sm text-muted-foreground mt-1">
							Some tests need manual review
						</p>
					</CardContent>
				</Card>

				<Card class="border-purple/20">
					<CardContent class="p-4">
						<div class="flex items-center gap-2 text-purple">
							<span class="text-xl">🔮</span>
							<span class="font-medium">Advanced Features</span>
						</div>
						<p class="text-sm text-muted-foreground mt-1">
							Explore enhanced functionality
						</p>
					</CardContent>
				</Card>
			</div>
		</div>
	</CardContent>
</Card>