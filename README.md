# n8n-nodes-realtyapi

An [n8n](https://n8n.io) community node for **[RealtyAPI](https://realtyapi.io)** — call any of
RealtyAPI's 33 real-estate providers (Zillow, Redfin, Realtor, Zoopla, Rightmove, Bayut, and more)
and 400+ endpoints directly from your workflows.

## Usage

Pull real-estate data — property listings, valuations, agent and owner details, market stats, and
more — from 33 providers (Zillow, Redfin, Realtor, Zoopla, Rightmove, Bayut, and more) without
writing a single HTTP request.

Add the **RealtyAPI** node to a workflow, then:

1. **Pick a provider** from the API dropdown (e.g. Zillow).
2. **Pick an endpoint** from the Endpoint dropdown (e.g. "By Property Address").
3. **Fill in the fields** the node shows for that endpoint — required and optional inputs appear
   automatically, with dropdowns for any preset choices.
4. **Run it.** The results flow straight into the next node in your workflow.

Every provider and endpoint RealtyAPI offers is available in the dropdowns, and new ones show up on
their own — so you always have the full, up-to-date catalog.

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
