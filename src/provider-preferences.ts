import { compareModelsByLatestDateDesc } from "./format.js";
import type { Model } from "./types.js";

interface PreferredProviderRule {
	readonly matchers: readonly string[];
	readonly providers: readonly string[];
}

interface ProviderModelMatch {
	readonly providerId: string;
	readonly model: Model;
}

const NON_ALNUM_RE = /[^a-z0-9]+/g;

const PREFERRED_PROVIDER_RULES: readonly PreferredProviderRule[] = [
	{ matchers: ["claude"], providers: ["dropik", "anthropic"] },
	{ matchers: ["gpt"], providers: ["openai"] },
	{ matchers: ["gemini"], providers: ["google"] },
	{ matchers: ["llama", "codellama"], providers: ["meta", "llama"] },
];

function normalize(value: string): string {
	return value.toLowerCase().replace(NON_ALNUM_RE, "");
}

function getModelSearchText(model: Model): string {
	return [
		model.id,
		model.name,
		model.family ?? "",
	]
		.map(normalize)
		.join(" ");
}

export function getPreferredProvidersForModel(model: Model): readonly string[] {
	const haystack = getModelSearchText(model);

	for (const rule of PREFERRED_PROVIDER_RULES) {
		if (rule.matchers.some((matcher) => haystack.includes(normalize(matcher)))) {
			return rule.providers;
		}
	}

	return [];
}

export function getPreferredProviderRank(
	model: Model,
	providerId: string,
): number {
	const normalizedProviderId = normalize(providerId);
	const preferredProviders = getPreferredProvidersForModel(model);
	const matchIndex = preferredProviders.findIndex((preferredProvider) =>
		normalize(preferredProvider) === normalizedProviderId,
	);

	if (matchIndex === -1) return 0;
	return preferredProviders.length - matchIndex;
}

export function comparePreferredProviders(
	a: ProviderModelMatch,
	b: ProviderModelMatch,
): number {
	const aRank = getPreferredProviderRank(a.model, a.providerId);
	const bRank = getPreferredProviderRank(b.model, b.providerId);
	if (aRank !== bRank) return bRank - aRank;

	const byDate = compareModelsByLatestDateDesc(a.model, b.model);
	if (byDate !== 0) return byDate;

	return a.providerId.localeCompare(b.providerId);
}

export function pickPreferredProviderMatch<T extends ProviderModelMatch>(
	matches: readonly T[],
): T | undefined {
	return [...matches].sort(comparePreferredProviders)[0];
}
