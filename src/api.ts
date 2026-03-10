import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { ApiResponse } from "./types.js";

const API_URL = "https://models.dev/api.json";
const CACHE_DIR = join(tmpdir(), "mmmodels-cache");
const CACHE_PATH = join(CACHE_DIR, "models.json");
let cachedResponse: ApiResponse | null = null;

export interface FetchModelsOptions {
	readonly refresh?: boolean;
}

export interface CacheInfo {
	readonly path: string;
	readonly exists: boolean;
	readonly updated_at?: string;
}

function readDiskCache(): ApiResponse | null {
	if (!existsSync(CACHE_PATH)) return null;

	try {
		const raw = readFileSync(CACHE_PATH, "utf8");
		return JSON.parse(raw) as ApiResponse;
	} catch {
		return null;
	}
}

function writeDiskCache(data: ApiResponse): void {
	mkdirSync(CACHE_DIR, { recursive: true });
	writeFileSync(CACHE_PATH, JSON.stringify(data));
}

export async function fetchModels(
	options: FetchModelsOptions = {},
): Promise<ApiResponse> {
	if (cachedResponse && !options.refresh) return cachedResponse;

	if (!options.refresh) {
		const diskCache = readDiskCache();
		if (diskCache) {
			cachedResponse = diskCache;
			return diskCache;
		}
	}

	try {
		const res = await fetch(API_URL);
		if (!res.ok) {
			const diskCache = readDiskCache();
			if (diskCache && !options.refresh) {
				cachedResponse = diskCache;
				return diskCache;
			}
			throw new Error(`Failed to fetch models: ${res.status} ${res.statusText}`);
		}

		const data: unknown = await res.json();
		cachedResponse = data as ApiResponse;
		writeDiskCache(cachedResponse);
		return cachedResponse;
	} catch (err) {
		const diskCache = readDiskCache();
		if (diskCache && !options.refresh) {
			cachedResponse = diskCache;
			return diskCache;
		}
		throw err;
	}
}

export function clearCache(): void {
	cachedResponse = null;
	rmSync(CACHE_PATH, { force: true });
}

export function getCacheInfo(): CacheInfo {
	if (!existsSync(CACHE_PATH)) {
		return {
			path: CACHE_PATH,
			exists: false,
		};
	}

	const stat = statSync(CACHE_PATH);
	return {
		path: CACHE_PATH,
		exists: true,
		updated_at: stat.mtime.toISOString(),
	};
}
