import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class RealtyApiApi implements ICredentialType {
	name = 'realtyApiApi';

	displayName = 'RealtyAPI API';

	documentationUrl = 'https://realtyapi.io/docs';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				'Your RealtyAPI key (starts with rt_). Sent to the gateway as the x-realtyapi-key header. Find it in your RealtyAPI dashboard.',
		},
	];

	// Injects the key as a header on every request the node makes to the gateway.
	// Set here (not in the node) so the key is never part of the open-source node code.
	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'x-realtyapi-key': '={{$credentials.apiKey}}',
			},
		},
	};

	// n8n's "Test" button hits the gateway root with the key applied. A valid key
	// returns HTTP 200 ({"message":"API is running"}); a missing key returns 401 and
	// an invalid/inactive key returns 402 — both surfaced by n8n as invalid. The root
	// is not a metered endpoint, so testing a credential costs no API credits.
	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://zillow.realtyapi.io',
			url: '/',
		},
	};
}
