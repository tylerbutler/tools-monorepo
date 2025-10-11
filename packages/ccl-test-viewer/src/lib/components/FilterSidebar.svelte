<script lang="ts">
import { ChevronDown, ChevronRight, Filter, Search, X } from "@lucide/svelte";
import {
	Badge,
	Button,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	Input,
	SimpleCheckbox,
} from "$lib/components/ui/index.js";
import {
	AVAILABLE_BEHAVIORS,
	AVAILABLE_FEATURES,
	AVAILABLE_FUNCTIONS,
} from "$lib/data/types.js";
import { appState, type FilterState } from "$lib/stores.svelte.js";

// Local state for collapsible sections
let functionsExpanded = $state(true);
let featuresExpanded = $state(true);
let behaviorsExpanded = $state(true);
let categoriesExpanded = $state(true);

// Derived stats for badges
const functionCounts = $derived.by(() => {
	if (!appState.testStats) {
		return {};
	}
	return appState.testStats.functions;
});

const featureCounts = $derived.by(() => {
	if (!appState.testStats) {
		return {};
	}
	return appState.testStats.features;
});

const behaviorCounts = $derived.by(() => {
	if (!appState.testStats) {
		return {};
	}
	return appState.testStats.behaviors;
});

const categoryCounts = $derived.by(() => {
	if (!appState.testStats) {
		return {};
	}
	return appState.testStats.categories;
});

// Helper functions
function handleSearchInput(event: Event) {
	const target = event.target as HTMLInputElement;
	appState.setSearchQuery(target.value);
}

function clearSearch() {
	appState.setSearchQuery("");
}

function handleFilterToggle(type: keyof FilterState, key: string) {
	appState.toggleFilter(type, key);
}

function clearFilterSection(type: keyof FilterState) {
	appState.clearFilterType(type);
}

// Count active filters per section
const activeFunctionFilters = $derived(
	Object.values(appState.activeFilters.functions).filter(Boolean).length,
);
const activeFeatureFilters = $derived(
	Object.values(appState.activeFilters.features).filter(Boolean).length,
);
const activeBehaviorFilters = $derived(
	Object.values(appState.activeFilters.behaviors).filter(Boolean).length,
);
const activeCategoryFilters = $derived(
	Object.values(appState.activeFilters.categories).filter(Boolean).length,
);

// Available categories from loaded data
const availableCategories = $derived.by(() => {
	return appState.testCategories.map((cat) => cat.name);
});
</script>

<aside class="w-80 border-r bg-background p-6 overflow-y-auto h-full">
	<div class="space-y-6">
		<!-- Header -->
		<div class="flex items-center justify-between">
			<h2 class="text-lg font-semibold flex items-center">
				<Filter size={20} class="mr-2" />
				Filters
			</h2>
			{#if appState.hasActiveFilters}
				<Button variant="outline" size="sm" onclick={() => appState.clearAllFilters()}>
					Clear All
				</Button>
			{/if}
		</div>

		<!-- Search -->
		<Card>
			<CardHeader class="pb-3">
				<CardTitle class="text-sm">Search Tests</CardTitle>
			</CardHeader>
			<CardContent>
				<div class="relative">
					<Search
						size={16}
						class="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
					/>
					<Input
						type="text"
						placeholder="Search test names, input, functions..."
						value={appState.searchQuery}
						oninput={handleSearchInput}
						class="pl-10 pr-10"
					/>
					{#if appState.searchQuery}
						<button
							onclick={clearSearch}
							class="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
							aria-label="Clear search"
						>
							<X size={16} />
						</button>
					{/if}
				</div>
			</CardContent>
		</Card>

		<!-- Results Summary -->
		<div class="text-sm text-muted-foreground">
			Showing {appState.totalFilteredTests} of {appState.testStats?.totalTests || 0} tests
		</div>

		<!-- Function Filters -->
		<Card>
			<CardHeader class="pb-3">
				<div class="flex items-center justify-between">
					<button
						onclick={() => (functionsExpanded = !functionsExpanded)}
						class="flex items-center hover:opacity-80 transition-opacity"
					>
						{#if functionsExpanded}
							<ChevronDown size={16} class="mr-1" />
						{:else}
							<ChevronRight size={16} class="mr-1" />
						{/if}
						<CardTitle class="text-sm">
							Functions
							{#if activeFunctionFilters > 0}
								<Badge variant="secondary" class="ml-2 text-xs">
									{activeFunctionFilters}
								</Badge>
							{/if}
						</CardTitle>
					</button>
					{#if activeFunctionFilters > 0}
						<Button
							variant="ghost"
							size="sm"
							onclick={() => clearFilterSection("functions")}
							class="text-xs"
						>
							Clear
						</Button>
					{/if}
				</div>
			</CardHeader>
			{#if functionsExpanded}
				<CardContent class="pt-0">
					<div class="space-y-2 max-h-60 overflow-y-auto">
						{#each AVAILABLE_FUNCTIONS as func}
							{@const count = functionCounts[func] || 0}
							{@const isActive = appState.activeFilters.functions[func] || false}
							<div class="flex items-center justify-between">
								<div class="flex items-center space-x-2 flex-1">
									<SimpleCheckbox
										id={`function-${func}`}
										checked={isActive}
										onCheckedChange={(checked) => handleFilterToggle("functions", func)}
									/>
									<label
										for={`function-${func}`}
										class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
									>
										{func}
									</label>
								</div>
								<Badge variant="outline" class="text-xs">
									{count}
								</Badge>
							</div>
						{/each}
					</div>
				</CardContent>
			{/if}
		</Card>

		<!-- Feature Filters -->
		<Card>
			<CardHeader class="pb-3">
				<div class="flex items-center justify-between">
					<button
						onclick={() => (featuresExpanded = !featuresExpanded)}
						class="flex items-center hover:opacity-80 transition-opacity"
					>
						{#if featuresExpanded}
							<ChevronDown size={16} class="mr-1" />
						{:else}
							<ChevronRight size={16} class="mr-1" />
						{/if}
						<CardTitle class="text-sm">
							Features
							{#if activeFeatureFilters > 0}
								<Badge variant="secondary" class="ml-2 text-xs">
									{activeFeatureFilters}
								</Badge>
							{/if}
						</CardTitle>
					</button>
					{#if activeFeatureFilters > 0}
						<Button
							variant="ghost"
							size="sm"
							onclick={() => clearFilterSection("features")}
							class="text-xs"
						>
							Clear
						</Button>
					{/if}
				</div>
			</CardHeader>
			{#if featuresExpanded}
				<CardContent class="pt-0">
					<div class="space-y-2 max-h-60 overflow-y-auto">
						{#each AVAILABLE_FEATURES as feature}
							{@const count = featureCounts[feature] || 0}
							{@const isActive = appState.activeFilters.features[feature] || false}
							<div class="flex items-center justify-between">
								<div class="flex items-center space-x-2 flex-1">
									<SimpleCheckbox
										id={`feature-${feature}`}
										checked={isActive}
										onCheckedChange={(checked) => handleFilterToggle("features", feature)}
									/>
									<label
										for={`feature-${feature}`}
										class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
									>
										{feature}
									</label>
								</div>
								<Badge variant="outline" class="text-xs">
									{count}
								</Badge>
							</div>
						{/each}
					</div>
				</CardContent>
			{/if}
		</Card>

		<!-- Behavior Filters -->
		<Card>
			<CardHeader class="pb-3">
				<div class="flex items-center justify-between">
					<button
						onclick={() => (behaviorsExpanded = !behaviorsExpanded)}
						class="flex items-center hover:opacity-80 transition-opacity"
					>
						{#if behaviorsExpanded}
							<ChevronDown size={16} class="mr-1" />
						{:else}
							<ChevronRight size={16} class="mr-1" />
						{/if}
						<CardTitle class="text-sm">
							Behaviors
							{#if activeBehaviorFilters > 0}
								<Badge variant="secondary" class="ml-2 text-xs">
									{activeBehaviorFilters}
								</Badge>
							{/if}
						</CardTitle>
					</button>
					{#if activeBehaviorFilters > 0}
						<Button
							variant="ghost"
							size="sm"
							onclick={() => clearFilterSection("behaviors")}
							class="text-xs"
						>
							Clear
						</Button>
					{/if}
				</div>
			</CardHeader>
			{#if behaviorsExpanded}
				<CardContent class="pt-0">
					<div class="space-y-2 max-h-60 overflow-y-auto">
						{#each AVAILABLE_BEHAVIORS as behavior}
							{@const count = behaviorCounts[behavior] || 0}
							{@const isActive = appState.activeFilters.behaviors[behavior] || false}
							<div class="flex items-center justify-between">
								<div class="flex items-center space-x-2 flex-1">
									<SimpleCheckbox
										id={`behavior-${behavior}`}
										checked={isActive}
										onCheckedChange={(checked) => handleFilterToggle("behaviors", behavior)}
									/>
									<label
										for={`behavior-${behavior}`}
										class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
									>
										{behavior}
									</label>
								</div>
								<Badge variant="outline" class="text-xs">
									{count}
								</Badge>
							</div>
						{/each}
					</div>
				</CardContent>
			{/if}
		</Card>

		<!-- Category Filters -->
		<Card>
			<CardHeader class="pb-3">
				<div class="flex items-center justify-between">
					<button
						onclick={() => (categoriesExpanded = !categoriesExpanded)}
						class="flex items-center hover:opacity-80 transition-opacity"
					>
						{#if categoriesExpanded}
							<ChevronDown size={16} class="mr-1" />
						{:else}
							<ChevronRight size={16} class="mr-1" />
						{/if}
						<CardTitle class="text-sm">
							Categories
							{#if activeCategoryFilters > 0}
								<Badge variant="secondary" class="ml-2 text-xs">
									{activeCategoryFilters}
								</Badge>
							{/if}
						</CardTitle>
					</button>
					{#if activeCategoryFilters > 0}
						<Button
							variant="ghost"
							size="sm"
							onclick={() => clearFilterSection("categories")}
							class="text-xs"
						>
							Clear
						</Button>
					{/if}
				</div>
			</CardHeader>
			{#if categoriesExpanded}
				<CardContent class="pt-0">
					<div class="space-y-2 max-h-60 overflow-y-auto">
						{#each availableCategories as category}
							{@const count = categoryCounts[category] || 0}
							{@const isActive = appState.activeFilters.categories[category] || false}
							<div class="flex items-center justify-between">
								<div class="flex items-center space-x-2 flex-1">
									<SimpleCheckbox
										id={`category-${category}`}
										checked={isActive}
										onCheckedChange={(checked) => handleFilterToggle("categories", category)}
									/>
									<label
										for={`category-${category}`}
										class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
									>
										{category}
									</label>
								</div>
								<Badge variant="outline" class="text-xs">
									{count}
								</Badge>
							</div>
						{/each}
					</div>
				</CardContent>
			{/if}
		</Card>
	</div>
</aside>