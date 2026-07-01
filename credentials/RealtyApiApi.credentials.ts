import type {
	IAuthenticateGeneric,
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
}
