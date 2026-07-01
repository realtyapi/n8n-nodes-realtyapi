# n8n-nodes-realtyapi

An [n8n](https://n8n.io) community node for **[RealtyAPI](https://realtyapi.io)** — call any of
RealtyAPI's 33 real-estate providers (Zillow, Redfin, Realtor, Zoopla, Rightmove, Bayut, and more)
and 400+ endpoints directly from your workflows.

## How it works

The node is **dynamic**. It reads RealtyAPI's live catalog at edit time, so:

- **API** dropdown lists every published provider.
- **Endpoint** dropdown lists that provider's endpoints.
- **Parameters** are generated from the selected endpoint's schema (required/optional, enums, and
  correct query / path / header / body placement).

New providers and endpoints appear automatically — no node update required. Requests are proxied
to `https://<provider>.realtyapi.io` with your key sent as the `x-realtyapi-key` header.

## Installation

**n8n Cloud / self-hosted (GUI):** Settings → Community Nodes → Install → `n8n-nodes-realtyapi`.

**Manual (self-hosted):**

```bash
npm install n8n-nodes-realtyapi
```

## Credentials

1. Get your API key (starts with `rt_`) from the [RealtyAPI dashboard](https://realtyapi.io).
2. In n8n, create a **RealtyAPI API** credential and paste the key.

The key is stored encrypted by n8n and sent only as the `x-realtyapi-key` header. It is never part
of this open-source package.

## Local development

```bash
npm install
npm run build          # tsc + copy icons to dist/
npm link               # then `npm link n8n-nodes-realtyapi` in your ~/.n8n/custom folder
```

See the [n8n community node docs](https://docs.n8n.io/integrations/community-nodes/) for linking
into a local n8n instance.

## License

[MIT](LICENSE)
