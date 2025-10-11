<script lang="ts">
import { BarChart3, Code, File, Hash } from "@lucide/svelte";
import { Chart, registerables } from "chart.js";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "$lib/components/ui/index.js";
import type { TestStats } from "$lib/data/types.js";

interface Props {
	stats: TestStats;
}

let { stats }: Props = $props();

let categoryChartCanvas: HTMLCanvasElement;
let functionChartCanvas: HTMLCanvasElement;
let categoryChart: Chart;
let functionChart: Chart;

// Register Chart.js components
$effect(() => {
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
const leastTestedCategory = $derived(categoryEntries.at(-1));
</script>

<div class="space-y-6">
	<!-- Overview Cards -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
		<Card>
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">
					Total Tests
				</CardTitle>
				<File size={16} class="text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{stats.totalTests}</div>
				<p class="text-xs text-muted-foreground">
					Across {totalCategories} categories
				</p>
			</CardContent>
		</Card>

		<Card>
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">
					Total Assertions
				</CardTitle>
				<Hash size={16} class="text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{stats.totalAssertions}</div>
				<p class="text-xs text-muted-foreground">
					{avgAssertionsPerTest} per test average
				</p>
			</CardContent>
		</Card>

		<Card>
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">
					Functions Tested
				</CardTitle>
				<Code size={16} class="text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{totalFunctions}</div>
				<p class="text-xs text-muted-foreground">
					CCL API functions
				</p>
			</CardContent>
		</Card>

		<Card>
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">
					Coverage
				</CardTitle>
				<BarChart3 size={16} class="text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{avgTestsPerCategory}</div>
				<p class="text-xs text-muted-foreground">
					Tests per category average
				</p>
			</CardContent>
		</Card>
	</div>

	<!-- Charts Row -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<!-- Category Distribution Chart -->
		<Card>
			<CardHeader>
				<CardTitle>
					Test Distribution by Category
				</CardTitle>
				<CardDescription>
					Distribution of {stats.totalTests} tests across {totalCategories} categories
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div class="h-80 relative">
					<canvas bind:this={categoryChartCanvas}></canvas>
				</div>
			</CardContent>
		</Card>

		<!-- Function Usage Chart -->
		<Card>
			<CardHeader>
				<CardTitle>
					Top Functions by Test Count
				</CardTitle>
				<CardDescription>
					Most frequently tested CCL functions
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div class="h-80 relative">
					<canvas bind:this={functionChartCanvas}></canvas>
				</div>
			</CardContent>
		</Card>
	</div>

	<!-- Insights Row -->
	<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
		<Card>
			<CardHeader>
				<CardTitle>
					Category Insights
				</CardTitle>
			</CardHeader>
			<CardContent class="space-y-4">
				<div>
					<h4 class="font-medium text-sm text-green-600 dark:text-green-400">Most Tested Category</h4>
					<p class="text-2xl font-bold text-green-600 dark:text-green-400">{mostTestedCategory[0]}</p>
					<p class="text-sm text-muted-foreground">{mostTestedCategory[1]} tests</p>
				</div>
				<div>
					<h4 class="font-medium text-sm text-info">Least Tested Category</h4>
					<p class="text-2xl font-bold text-info">{leastTestedCategory[0]}</p>
					<p class="text-sm text-muted-foreground">{leastTestedCategory[1]} tests</p>
				</div>
			</CardContent>
		</Card>

		<Card>
			<CardHeader>
				<CardTitle>
					Quality Metrics
				</CardTitle>
			</CardHeader>
			<CardContent class="space-y-4">
				<div>
					<h4 class="font-medium text-sm text-purple">Test Density</h4>
					<p class="text-2xl font-bold text-purple">{avgAssertionsPerTest}</p>
					<p class="text-sm text-muted-foreground">Assertions per test</p>
				</div>
				<div>
					<h4 class="font-medium text-sm text-amber-600 dark:text-amber-400">API Coverage</h4>
					<p class="text-2xl font-bold text-amber-600 dark:text-amber-400">{totalFunctions}</p>
					<p class="text-sm text-muted-foreground">Functions tested</p>
				</div>
			</CardContent>
		</Card>
	</div>
</div>