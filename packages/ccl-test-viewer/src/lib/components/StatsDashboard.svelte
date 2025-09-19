<script lang="ts">
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "$lib/components/ui/index.js";
import type { TestStats } from "$lib/data/types.js";
import { Chart, registerables } from "chart.js";
import { BarChart3, Code, FileText, Hash } from "lucide-svelte";
import { onMount } from "svelte";

interface Props {
	stats: TestStats;
}

let { stats }: Props = $props();

let categoryChartCanvas: HTMLCanvasElement;
let functionChartCanvas: HTMLCanvasElement;
let categoryChart: Chart;
let functionChart: Chart;

// Register Chart.js components
onMount(() => {
	Chart.register(...registerables);

	// Create category distribution chart
	const categoryLabels = Object.keys(stats.categories);
	const categoryData = Object.values(stats.categories);

	categoryChart = new Chart(categoryChartCanvas, {
		type: "doughnut",
		data: {
			labels: categoryLabels,
			datasets: [
				{
					label: "Tests by Category",
					data: categoryData,
					backgroundColor: [
						"#3B82F6",
						"#10B981",
						"#F59E0B",
						"#EF4444",
						"#8B5CF6",
						"#06B6D4",
						"#84CC16",
						"#F97316",
						"#EC4899",
						"#6366F1",
						"#14B8A6",
						"#F43F5E",
					],
					borderWidth: 2,
					borderColor: "#ffffff",
				},
			],
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			plugins: {
				legend: {
					position: "bottom",
					labels: {
						usePointStyle: true,
						padding: 15,
						font: {
							size: 12,
						},
					},
				},
				tooltip: {
					callbacks: {
						label: (context) => {
							const percentage = Math.round(
								(context.parsed / stats.totalTests) * 100,
							);
							return `${context.label}: ${context.parsed} tests (${percentage}%)`;
						},
					},
				},
			},
		},
	});

	// Create function usage chart
	const functionEntries = Object.entries(stats.functions)
		.sort((a, b) => b[1] - a[1])
		.slice(0, 10); // Top 10 functions

	const functionLabels = functionEntries.map(([name]) => name);
	const functionData = functionEntries.map(([, count]) => count);

	functionChart = new Chart(functionChartCanvas, {
		type: "bar",
		data: {
			labels: functionLabels,
			datasets: [
				{
					label: "Function Usage",
					data: functionData,
					backgroundColor: "#3B82F6",
					borderColor: "#1D4ED8",
					borderWidth: 1,
					borderRadius: 4,
				},
			],
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			plugins: {
				legend: {
					display: false,
				},
				tooltip: {
					callbacks: {
						label: (context) => {
							return `${context.label}: ${context.parsed.y} tests`;
						},
					},
				},
			},
			scales: {
				y: {
					beginAtZero: true,
					ticks: {
						precision: 0,
					},
				},
				x: {
					ticks: {
						maxRotation: 45,
						minRotation: 45,
					},
				},
			},
		},
	});

	// Cleanup function
	return () => {
		categoryChart?.destroy();
		functionChart?.destroy();
	};
});

// Calculate some derived statistics
const totalCategories = $derived(Object.keys(stats.categories).length);
const totalFunctions = $derived(Object.keys(stats.functions).length);
const avgTestsPerCategory = $derived(
	Math.round(stats.totalTests / totalCategories),
);
const avgAssertionsPerTest = $derived(
	(stats.totalAssertions / stats.totalTests).toFixed(1),
);

// Find most/least tested categories
const categoryEntries = $derived(
	Object.entries(stats.categories).sort((a, b) => b[1] - a[1]),
);
const mostTestedCategory = $derived(categoryEntries[0]);
const leastTestedCategory = $derived(
	categoryEntries[categoryEntries.length - 1],
);
</script>

<div class="space-y-6">
	<!-- Overview Cards -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
		<Card>
			{#snippet children()}
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					{#snippet children()}
						<CardTitle class="text-sm font-medium">
							{#snippet children()}Total Tests{/snippet}
						</CardTitle>
						<FileText class="h-4 w-4 text-muted-foreground" />
					{/snippet}
				</CardHeader>
				<CardContent>
					{#snippet children()}
						<div class="text-2xl font-bold">{stats.totalTests}</div>
						<p class="text-xs text-muted-foreground">
							Across {totalCategories} categories
						</p>
					{/snippet}
				</CardContent>
			{/snippet}
		</Card>

		<Card>
			{#snippet children()}
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					{#snippet children()}
						<CardTitle class="text-sm font-medium">
							{#snippet children()}Total Assertions{/snippet}
						</CardTitle>
						<Hash class="h-4 w-4 text-muted-foreground" />
					{/snippet}
				</CardHeader>
				<CardContent>
					{#snippet children()}
						<div class="text-2xl font-bold">{stats.totalAssertions}</div>
						<p class="text-xs text-muted-foreground">
							{avgAssertionsPerTest} per test average
						</p>
					{/snippet}
				</CardContent>
			{/snippet}
		</Card>

		<Card>
			{#snippet children()}
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					{#snippet children()}
						<CardTitle class="text-sm font-medium">
							{#snippet children()}Functions Tested{/snippet}
						</CardTitle>
						<Code class="h-4 w-4 text-muted-foreground" />
					{/snippet}
				</CardHeader>
				<CardContent>
					{#snippet children()}
						<div class="text-2xl font-bold">{totalFunctions}</div>
						<p class="text-xs text-muted-foreground">
							CCL API functions
						</p>
					{/snippet}
				</CardContent>
			{/snippet}
		</Card>

		<Card>
			{#snippet children()}
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					{#snippet children()}
						<CardTitle class="text-sm font-medium">
							{#snippet children()}Coverage{/snippet}
						</CardTitle>
						<BarChart3 class="h-4 w-4 text-muted-foreground" />
					{/snippet}
				</CardHeader>
				<CardContent>
					{#snippet children()}
						<div class="text-2xl font-bold">{avgTestsPerCategory}</div>
						<p class="text-xs text-muted-foreground">
							Tests per category average
						</p>
					{/snippet}
				</CardContent>
			{/snippet}
		</Card>
	</div>

	<!-- Charts Row -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<!-- Category Distribution Chart -->
		<Card>
			{#snippet children()}
				<CardHeader>
					{#snippet children()}
						<CardTitle>
							{#snippet children()}Test Distribution by Category{/snippet}
						</CardTitle>
						<CardDescription>
							{#snippet children()}Distribution of {stats.totalTests} tests across {totalCategories} categories{/snippet}
						</CardDescription>
					{/snippet}
				</CardHeader>
				<CardContent>
					{#snippet children()}
						<div class="h-80 relative">
							<canvas bind:this={categoryChartCanvas}></canvas>
						</div>
					{/snippet}
				</CardContent>
			{/snippet}
		</Card>

		<!-- Function Usage Chart -->
		<Card>
			{#snippet children()}
				<CardHeader>
					{#snippet children()}
						<CardTitle>
							{#snippet children()}Top Functions by Test Count{/snippet}
						</CardTitle>
						<CardDescription>
							{#snippet children()}Most frequently tested CCL functions{/snippet}
						</CardDescription>
					{/snippet}
				</CardHeader>
				<CardContent>
					{#snippet children()}
						<div class="h-80 relative">
							<canvas bind:this={functionChartCanvas}></canvas>
						</div>
					{/snippet}
				</CardContent>
			{/snippet}
		</Card>
	</div>

	<!-- Insights Row -->
	<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
		<Card>
			{#snippet children()}
				<CardHeader>
					{#snippet children()}
						<CardTitle>
							{#snippet children()}Category Insights{/snippet}
						</CardTitle>
					{/snippet}
				</CardHeader>
				<CardContent class="space-y-4">
					{#snippet children()}
						<div>
							<h4 class="font-medium text-sm text-green-700">Most Tested Category</h4>
							<p class="text-2xl font-bold text-green-800">{mostTestedCategory[0]}</p>
							<p class="text-sm text-muted-foreground">{mostTestedCategory[1]} tests</p>
						</div>
						<div>
							<h4 class="font-medium text-sm text-blue-700">Least Tested Category</h4>
							<p class="text-2xl font-bold text-blue-800">{leastTestedCategory[0]}</p>
							<p class="text-sm text-muted-foreground">{leastTestedCategory[1]} tests</p>
						</div>
					{/snippet}
				</CardContent>
			{/snippet}
		</Card>

		<Card>
			{#snippet children()}
				<CardHeader>
					{#snippet children()}
						<CardTitle>
							{#snippet children()}Quality Metrics{/snippet}
						</CardTitle>
					{/snippet}
				</CardHeader>
				<CardContent class="space-y-4">
					{#snippet children()}
						<div>
							<h4 class="font-medium text-sm text-purple-700">Test Density</h4>
							<p class="text-2xl font-bold text-purple-800">{avgAssertionsPerTest}</p>
							<p class="text-sm text-muted-foreground">Assertions per test</p>
						</div>
						<div>
							<h4 class="font-medium text-sm text-orange-700">API Coverage</h4>
							<p class="text-2xl font-bold text-orange-800">{totalFunctions}</p>
							<p class="text-sm text-muted-foreground">Functions tested</p>
						</div>
					{/snippet}
				</CardContent>
			{/snippet}
		</Card>
	</div>
</div>