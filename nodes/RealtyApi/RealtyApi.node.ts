import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	ResourceMapperField,
	ResourceMapperFields,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { fetchApiEndpoints, fetchApis, findEndpoint } from './GenericFunctions';

function mapFieldType(t?: string): 'string' | 'number' | 'boolean' {
	switch ((t ?? 'string').toLowerCase()) {
		case 'number':
		case 'integer':
		case 'float':
			return 'number';
		case 'boolean':
		case 'bool':
			return 'boolean';
		default:
			return 'string';
	}
}

export class RealtyApi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'RealtyAPI',
		name: 'realtyApi',
		icon: 'file:realtyapi.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["endpoint"]}}',
		description: 'Call any RealtyAPI real-estate provider and endpoint',
		defaults: { name: 'RealtyAPI' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		// Also exposes the node as a tool inside AI Agent nodes.
		usableAsTool: true,
		credentials: [{ name: 'realtyApiApi', required: true }],
		properties: [
			{
				displayName: 'API (Provider) Name or ID',
				name: 'api',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getApis' },
				default: '',
				required: true,
				description:
					'Which RealtyAPI provider to call. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Endpoint Name or ID',
				name: 'endpoint',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getEndpoints',
					loadOptionsDependsOn: ['api'],
				},
				default: '',
				required: true,
				description:
					'Which endpoint to call. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Parameters',
				name: 'parameters',
				type: 'resourceMapper',
				noDataExpression: true,
				default: { mappingMode: 'defineBelow', value: null },
				required: true,
				typeOptions: {
					loadOptionsDependsOn: ['api', 'endpoint'],
					resourceMapper: {
						resourceMapperMethod: 'getEndpointFields',
						mode: 'add',
						fieldWords: { singular: 'parameter', plural: 'parameters' },
						addAllFields: true,
						multiKeyMatch: false,
						supportAutoMap: false,
					},
				},
			},
		],
	};

	methods = {
		loadOptions: {
			async getApis(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const apis = await fetchApis(this);
				return apis
					.map((a: any) => ({
						name: `${a.name}${a.endpointCount ? ` (${a.endpointCount})` : ''}`,
						value: a.slug as string,
						description: a.description as string | undefined,
					}))
					.sort((a, b) => a.name.localeCompare(b.name));
			},

			async getEndpoints(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const slug = this.getNodeParameter('api', '') as string;
				if (!slug) return [];
				const endpoints = await fetchApiEndpoints(this, slug);
				return endpoints.map((e) => ({
					// Playground names sometimes carry a leading slash ("/By Property Address").
					name: `[${e.method.toUpperCase()}] ${e.name.replace(/^\/+/, '').trim()}`,
					// Encode method + path so execute() can resolve the full definition.
					value: `${e.method.toUpperCase()} ${e.path}`,
					description: e.path,
				}));
			},
		},

		resourceMapping: {
			async getEndpointFields(this: ILoadOptionsFunctions): Promise<ResourceMapperFields> {
				const slug = this.getNodeParameter('api', '') as string;
				const endpointValue = this.getNodeParameter('endpoint', '') as string;
				if (!slug || !endpointValue) return { fields: [] };

				const [method, ...rest] = endpointValue.split(' ');
				const path = rest.join(' ');
				const endpoints = await fetchApiEndpoints(this, slug);
				const ep = findEndpoint(endpoints, method, path);
				if (!ep) return { fields: [] };

				const fields: ResourceMapperField[] = ep.params.map((p) => {
					const hasEnum = !!(p.enumValues && p.enumValues.length);
					return {
						id: p.name,
						displayName:
							p.name + (p.location && p.location !== 'query' ? ` (${p.location})` : ''),
						required: !!p.required,
						defaultMatch: false,
						display: true,
						type: (hasEnum ? 'options' : mapFieldType(p.type)) as ResourceMapperField['type'],
						options: hasEnum ? p.enumValues!.map((v) => ({ name: v, value: v })) : undefined,
					};
				});
				return { fields };
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const out: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const slug = this.getNodeParameter('api', i) as string;
				const endpointValue = this.getNodeParameter('endpoint', i) as string;
				const mapped = this.getNodeParameter('parameters.value', i, {}) as IDataObject;

				// Hardening: slug must be a known provider shape (host is built from it).
				if (!/^[a-z0-9-]+$/.test(slug)) {
					throw new NodeOperationError(this.getNode(), `Invalid provider "${slug}".`, {
						itemIndex: i,
					});
				}

				const [methodRaw, ...rest] = (endpointValue || '').split(' ');
				const rawPath = rest.join(' ');
				const endpoints = await fetchApiEndpoints(this, slug);
				const ep = findEndpoint(endpoints, methodRaw, rawPath);
				if (!ep) {
					throw new NodeOperationError(
						this.getNode(),
						`Unknown endpoint "${endpointValue}" for provider "${slug}".`,
						{ itemIndex: i },
					);
				}

				const method = (ep.method || methodRaw || 'GET').toUpperCase();
				const defByName = new Map(ep.params.map((p) => [p.name, p]));

				let urlPath = ep.path;
				const qs: IDataObject = {};
				const headers: IDataObject = {};
				const body: IDataObject = {};
				let hasBody = false;

				for (const [k, v] of Object.entries(mapped ?? {})) {
					if (v === undefined || v === null || v === '') continue;
					const loc = (defByName.get(k)?.location || 'query').toLowerCase();
					if (loc === 'path') {
						urlPath = urlPath
							.replace(`{${k}}`, encodeURIComponent(String(v)))
							.replace(`:${k}`, encodeURIComponent(String(v)));
					} else if (loc === 'header') {
						// Never let a param spoof auth/host headers.
						if (!/^(x-realtyapi-key|host|authorization)$/i.test(k)) headers[k] = String(v);
					} else if (loc === 'body') {
						body[k] = v;
						hasBody = true;
					} else {
						qs[k] = v;
					}
				}

				const options: IHttpRequestOptions = {
					method: method as IHttpRequestOptions['method'],
					url: `https://${slug}.realtyapi.io${urlPath}`,
					qs,
					headers,
					json: true,
					returnFullResponse: true,
				};
				if (hasBody && method !== 'GET' && method !== 'HEAD') {
					options.body = body;
				}

				// httpRequestWithAuthentication injects x-realtyapi-key from the credential.
				const response = (await this.helpers.httpRequestWithAuthentication.call(
					this,
					'realtyApiApi',
					options,
				)) as { body?: unknown; headers?: Record<string, string> };

				const creditsRemaining = response.headers?.['x-credits-remaining'];
				const json = (response.body ?? response) as IDataObject;
				if (creditsRemaining !== undefined) json._creditsRemaining = creditsRemaining;
				out.push({ json, pairedItem: { item: i } });
			} catch (error) {
				if (this.continueOnFail()) {
					out.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
					continue;
				}
				throw error;
			}
		}

		return [out];
	}
}
