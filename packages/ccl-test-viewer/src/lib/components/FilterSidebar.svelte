<script lang="ts">
import {
	Badge,
	Button,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	Checkbox,
	Input,
} from "$lib/components/ui/index.js";
import {
	AVAILABLE_BEHAVIORS,
	AVAILABLE_FEATURES,
	AVAILABLE_FUNCTIONS,
} from "$lib/data/types.js";
import { appState, type FilterState } from "$lib/stores.svelte.js";
import { ChevronDown, ChevronRight, Filter, Search, X } from "lucide-svelte";

// Local state for collapsible sections
let functionsExpanded = $state(true);
let featuresExpanded = $state(true);
let behaviorsExpanded = $state(true);
let categoriesExpanded = $state(true);

// Derived stats for badges
const functionCounts = $derived.by(() => {
	if (!appState.testStats) return {};
	return appState.testStats.functions;
});

const featureCounts = $derived.by(() => {
	if (!appState.testStats) return {};
	return appState.testStats.features;
});

const behaviorCounts = $derived.by(() => {
	if (!appState.testStats) return {};
	return appState.testStats.behaviors;
});

const categoryCounts = $derived.by(() => {
	if (!appState.testStats) return {};
	return appState.testStats.categories;
});

// Helper functions
function handleSearchInput(event: Event) {
	const target = event.target as HTMLInputElement;
	appState.setSearchQuery(target.value);
}

function toggleFilter(type: keyof FilterState, key: string) {
	appState.toggleFilter(type, key);
}

function clearSearch() {
	appState.setSearchQuery("");
}

function getActiveFilterCount(type: keyof FilterState): number {
	return Object.values(appState.activeFilters[type]).filter(Boolean).length;
}
</script>

<aside
	class="w-80 h-full border-r bg-background overflow-y-auto"
	aria-label="Test filters and search"
>
	<!-- Header -->
	<div class="p-4 border-b">
		<div class="flex items-center gap-2 mb-3">
			<Filter class="h-5 w-5" aria-hidden="true" />
			<h2 class="font-semibold" id="filters-heading">Filters</h2>
			{#if appState.hasActiveFilters}
				<Badge variant="secondary" class="ml-auto" aria-label={`${appState.totalFilteredTests} tests match current filters`}>
					{appState.totalFilteredTests} tests
				</Badge>
			{/if}
		</div>

		<!-- Search -->
		<div class="relative" role="search">
			<Search class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
			<Input
				type="search"
				placeholder="Search tests..."
				value={appState.searchQuery}
				oninput={handleSearchInput}
				class="pl-9 pr-9"
				aria-label="Search through test cases"
				aria-describedby="search-description"
			/>
			<div id="search-description" class="sr-only">
				Search will filter tests by name, function, or content
			</div>
			{#if appState.searchQuery}
				<button
					onclick={clearSearch}
					class="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground focus-visible"
					aria-label="Clear search query"
				>
					<X class="h-4 w-4" aria-hidden="true" />
				</button>
			{/if}
		</div>

		<!-- Clear All Filters -->
		{#if appState.hasActiveFilters}
			<Button
				variant="outline"
				size="sm"
				onclick={() => appState.clearAllFilters()}
				class="w-full mt-3"
				aria-label="Remove all active filters and show all tests"
			>
				Clear All Filters
			</Button>
		{/if}
	</div>

	<!-- Filter Sections -->
	<div class="p-4 space-y-4" role="group" aria-labelledby="filters-heading">
		<!-- Categories -->
		<Card>
			<CardHeader class="pb-3">
				<button
					onclick={() => categoriesExpanded = !categoriesExpanded}
					class="flex items-center justify-between w-full text-left focus-visible"
					aria-expanded={categoriesExpanded}
					aria-controls="categories-content"
					aria-label={`Toggle categories filter section. ${getActiveFilterCount('categories')} categories currently selected.`}
				>
					<CardTitle class="text-sm" id="categories-title">
						Categories
						{#if getActiveFilterCount('categories') > 0}
							<Badge variant="secondary" class="ml-2" aria-label={`${getActiveFilterCount('categories')} selected`}>
								{getActiveFilterCount('categories')}
							</Badge>
						{/if}
					</CardTitle>
					{#if categoriesExpanded}
						<ChevronDown class="h-4 w-4" aria-hidden="true" />
					{:else}
						<ChevronRight class="h-4 w-4" aria-hidden="true" />
					{/if}
				</button>
			</CardHeader>
			{#if categoriesExpanded}
				<CardContent class="pt-0" id="categories-content" aria-labelledby="categories-title">
					<fieldset class="space-y-2">
						<legend class="sr-only">Filter by test categories</legend>
						{#each Object.entries(categoryCounts) as [category, count]}
							<label class="flex items-center space-x-2 cursor-pointer hover:bg-accent hover:text-accent-foreground rounded p-1 focus-within:bg-accent focus-within:text-accent-foreground">
								<Checkbox
									checked={appState.activeFilters.categories[category] || false}
									onCheckedChange={() => toggleFilter('categories', category)}
									aria-describedby={`category-${category}-count`}
								/>
								<span class="text-sm flex-1">{category}</span>
								<Badge variant="outline" class="text-xs" id={`category-${category}-count`} aria-label={`${count} tests in this category`}>
									{count}
								</Badge>
							</label>
						{/each}
					</fieldset>
				</CardContent>
			{/if}
		</Card>

		<!-- Functions -->
		<Card>
			<CardHeader class="pb-3">
				<button
					onclick={() => functionsExpanded = !functionsExpanded}
					class="flex items-center justify-between w-full text-left"
				>
					<CardTitle class="text-sm">
						Functions
						{#if getActiveFilterCount('functions') > 0}
							<Badge variant="secondary" class="ml-2">
								{getActiveFilterCount('functions')}
							</Badge>
						{/if}
					</CardTitle>
					{#if functionsExpanded}
						<ChevronDown class="h-4 w-4" />
					{:else}
						<ChevronRight class="h-4 w-4" />
					{/if}
				</button>
			</CardHeader>
			{#if functionsExpanded}
				<CardContent class="pt-0">
					<div class="space-y-2">
						{#each AVAILABLE_FUNCTIONS as func}
							{@const count = functionCounts[func] || 0}
							{#if count > 0}
								<label class="flex items-center space-x-2 cursor-pointer">
									<Checkbox
										checked={appState.activeFilters.functions[func] || false}
										onCheckedChange={() => toggleFilter('functions', func)}
									/>
									<span class="text-sm flex-1 font-mono">{func}</span>
									<Badge variant="function" class="text-xs">
										{count}
									</Badge>
								</label>
							{/if}
						{/each}
					</div>
				</CardContent>
			{/if}
		</Card>

		<!-- Features -->
		<Card>
			<CardHeader class="pb-3">
				<button
					onclick={() => featuresExpanded = !featuresExpanded}
					class="flex items-center justify-between w-full text-left"
				>
					<CardTitle class="text-sm">
						Features
						{#if getActiveFilterCount('features') > 0}
							<Badge variant="secondary" class="ml-2">
								{getActiveFilterCount('features')}
							</Badge>
						{/if}
					</CardTitle>
					{#if featuresExpanded}
						<ChevronDown class="h-4 w-4" />
					{:else}
						<ChevronRight class="h-4 w-4" />
					{/if}
				</button>
			</CardHeader>
			{#if featuresExpanded}
				<CardContent class="pt-0">
					<div class="space-y-2">
						{#each AVAILABLE_FEATURES as feature}
							{@const count = featureCounts[feature] || 0}
							{#if count > 0}
								<label class="flex items-center space-x-2 cursor-pointer">
									<Checkbox
										checked={appState.activeFilters.features[feature] || false}
										onCheckedChange={() => toggleFilter('features', feature)}
									/>
									<span class="text-sm flex-1">{feature}</span>
									<Badge variant="feature" class="text-xs">
										{count}
									</Badge>
								</label>
							{/if}
						{/each}
					</div>
				</CardContent>
			{/if}
		</Card>

		<!-- Behaviors -->
		<Card>
			<CardHeader class="pb-3">
				<button
					onclick={() => behaviorsExpanded = !behaviorsExpanded}
					class="flex items-center justify-between w-full text-left"
				>
					<CardTitle class="text-sm">
						Behaviors
						{#if getActiveFilterCount('behaviors') > 0}
							<Badge variant="secondary" class="ml-2">
								{getActiveFilterCount('behaviors')}
							</Badge>
						{/if}
					</CardTitle>
					{#if behaviorsExpanded}
						<ChevronDown class="h-4 w-4" />
					{:else}
						<ChevronRight class="h-4 w-4" />
					{/if}
				</button>
			</CardHeader>
			{#if behaviorsExpanded}
				<CardContent class="pt-0">
					<div class="space-y-2">
						{#each AVAILABLE_BEHAVIORS as behavior}
							{@const count = behaviorCounts[behavior] || 0}
							{#if count > 0}
								<label class="flex items-center space-x-2 cursor-pointer">
									<Checkbox
										checked={appState.activeFilters.behaviors[behavior] || false}
										onCheckedChange={() => toggleFilter('behaviors', behavior)}
									/>
									<span class="text-sm flex-1">{behavior}</span>
									<Badge variant="behavior" class="text-xs">
										{count}
									</Badge>
								</label>
							{/if}
						{/each}
					</div>
				</CardContent>
			{/if}
		</Card>
	</div>
</aside>