import { compareModelsByLatestDateDesc } from "./format.js";
import { comparePreferredProviders } from "./provider-preferences.js";
import type { Model } from "./types.js";

type ModelEntry = { id: string; model: Model; provider: string; providerName: string };

const VERSION_RE = /^\d[\d.]*$/;
const NON_ALNUM_RE = /[^a-z0-9]+/g;

function normalizeToken(value: string): string {
	return value.toLowerCase().replace(NON_ALNUM_RE, "");
}

function getProviderSearchTokens(item: ModelEntry): Set<string> {
	const tokens = new Set<string>();

	for (const value of [item.providerName, item.provider]) {
		const normalizedValue = normalizeToken(value);
		if (normalizedValue.length >= 3) {
			tokens.add(normalizedValue);
		}

		for (const part of value.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)) {
			const normalizedPart = normalizeToken(part);
			if (normalizedPart.length >= 4) {
				tokens.add(normalizedPart);
			}
		}
	}

	return tokens;
}

function matchesProviderToken(
	providerTokens: Set<string>,
	normalizedToken: string,
): boolean {
	if (!normalizedToken) return false;

	for (const providerToken of providerTokens) {
		if (providerToken === normalizedToken) return true;
		if (normalizedToken.length >= 4 && providerToken.startsWith(normalizedToken)) {
			return true;
		}
	}

	return false;
}

function scoreToken(
	item: ModelEntry,
	token: string,
	isProviderToken: boolean,
): number {
	const name = item.model.name.toLowerCase();
	const id = item.model.id.toLowerCase();
	const family = item.model.family?.toLowerCase() ?? "";
	const pName = item.providerName.toLowerCase();
	const pId = item.provider.toLowerCase();
	const normalizedToken = normalizeToken(token);
	const normalizedName = normalizeToken(name);
	const normalizedId = normalizeToken(id);
	const normalizedFamily = normalizeToken(family);
	const normalizedProviderName = normalizeToken(pName);
	const normalizedProviderId = normalizeToken(pId);
	const providerTokens = getProviderSearchTokens(item);

	// Version token: exact substring only — "4.6" must NOT match "4.5"
	if (VERSION_RE.test(token)) {
		return name.includes(token) || id.includes(token) ? 3 : 0;
	}

	// Provider-like tokens prefer provider matches, but still fall back to
	// model fields so queries like "gpt 5.4" keep working even if a provider
	// name happens to contain "gpt".
	if (isProviderToken) {
		if (
			matchesProviderToken(providerTokens, normalizedToken) ||
			pName.includes(token) ||
			pId === token ||
			normalizedProviderName === normalizedToken ||
			normalizedProviderId === normalizedToken
		) {
			return 8;
		}
	}

	// Regular token: match against model fields only.
	if (
		normalizedToken &&
		(normalizedName.includes(normalizedToken) ||
			normalizedFamily.includes(normalizedToken) ||
			normalizedId.includes(normalizedToken))
	) {
		return 7;
	}

	if (name.includes(token)) return 6;
	if (family && family.includes(token)) return 5;
	if (id.includes(token)) return 2;

	return 0;
}

export function fuzzySearchModels(models: ModelEntry[], query: string): ModelEntry[] {
	if (!query) return models;

	const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
	if (!tokens.length) return models;
	if (tokens.some((token) => token.length < 2 && !VERSION_RE.test(token))) {
		return [];
	}

	// Determine which tokens refer to a provider name
	const providerTokens = new Set(
		models.flatMap((item) => [...getProviderSearchTokens(item)]),
	);
	const tokenIsProvider: boolean[] = tokens.map((token) =>
		matchesProviderToken(providerTokens, normalizeToken(token)),
	);

	const scored = models
		.map((item) => {
			let total = 0;

			for (let i = 0; i < tokens.length; i++) {
				const s = scoreToken(item, tokens[i] ?? "", tokenIsProvider[i] ?? false);
				if (s === 0) return null; // AND logic: all tokens must match
				total += s;
			}

			return { item, total };
		})
		.filter((r): r is { item: ModelEntry; total: number } => r !== null)
		.sort((a, b) => {
			if (b.total !== a.total) return b.total - a.total;
			const byPreferredProvider = comparePreferredProviders(
				{ providerId: a.item.provider, model: a.item.model },
				{ providerId: b.item.provider, model: b.item.model },
			);
			if (byPreferredProvider !== 0) return byPreferredProvider;
			return compareModelsByLatestDateDesc(a.item.model, b.item.model);
		})
		.map((r) => r.item);

	return scored;
}
