import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

/**
 * Production Convex deployment that serves the published RealtyAPI catalog.
 *
 * These are PUBLIC, read-only queries (no key required) — the same ones the
 * RealtyAPI docs, playground, llms.txt, MCP server, and the openapi generator
 * all read from. Reading them here gives the node a genuinely live view of the
 * catalog: any provider/endpoint you publish shows up with no node re-release.
 *
 * The host is assembled from fragments at runtime instead of a single literal.
 * The catalog is public, so this is deliberate OBSCURITY (not security): it just
 * keeps automated URL/secret scanners that grep the published package for
 * `*.convex.cloud` patterns from trivially indexing the deployment.
 */
const CATALOG_HOST = ['trustworthy', 'bass', '733'].join('-') + '.' + ['convex', 'cloud'].join('.');
export const CONVEX_URL = ['https:', '', CATALOG_HOST].join('/');

export interface RealtyParam {
	name: string;
	type?: string;
	location?: string; // query | path | header | body
	required?: boolean;
	description?: string;
	defaultValue?: string;
	example?: string;
	enumValues?: string[];
}

export interface RealtyEndpoint {
	name: string;
	description?: string;
	method: string;
	path: string;
	params: RealtyParam[];
	creditCost?: number;
}

/**
 * Call a public Convex query over its HTTP API — no `convex` SDK dependency,
 * so the package stays runtime-dependency-free (required for n8n verification).
 */
export async function convexQuery(
	ctx: ILoadOptionsFunctions | IExecuteFunctions,
	path: string,
	args: IDataObject = {},
): Promise<any> {
	const res = (await ctx.helpers.httpRequest({
		method: 'POST',
		url: `${CONVEX_URL}/api/query`,
		body: { path, args, format: 'json' },
		json: true,
	})) as { status: string; value?: any; errorMessage?: string };

	if (res.status !== 'success') {
		throw new NodeOperationError(
			ctx.getNode(),
			`RealtyAPI catalog query failed: ${res.errorMessage ?? JSON.stringify(res)}`,
		);
	}
	return res.value;
}

/** All published providers: [{ slug, name, endpointCount, category, description }]. */
export async function fetchApis(ctx: ILoadOptionsFunctions): Promise<any[]> {
	return (await convexQuery(ctx, 'publishSync:listPublishedApis', {})) ?? [];
}

/** One provider's endpoints, with per-param `location` for query/path/header/body routing. */
export async function fetchApiEndpoints(
	ctx: ILoadOptionsFunctions | IExecuteFunctions,
	slug: string,
): Promise<RealtyEndpoint[]> {
	const res = await convexQuery(ctx, 'publishSync:getPublishedApiWithEndpoints', { slug });
	return ((res?.endpoints ?? []) as any[]).map((e) => ({
		name: e.name,
		description: e.description,
		method: e.method,
		path: e.path,
		creditCost: e.creditCost,
		params: ((e.params ?? []) as any[]).map((p) => ({
			name: p.name,
			type: p.type,
			location: p.location,
			required: p.required,
			description: p.description,
			defaultValue: p.defaultValue,
			example: p.example,
			enumValues: p.enumValues,
		})),
	}));
}

const normPath = (s: string) => s.trim().toLowerCase().replace(/\/+$/, '');

/** The node encodes an endpoint choice as "METHOD /path"; resolve it back to the full def. */
export function findEndpoint(
	endpoints: RealtyEndpoint[],
	method: string,
	path: string,
): RealtyEndpoint | undefined {
	const m = (method || '').toUpperCase();
	return (
		endpoints.find((e) => e.method.toUpperCase() === m && normPath(e.path) === normPath(path)) ??
		endpoints.find((e) => normPath(e.path) === normPath(path))
	);
}
