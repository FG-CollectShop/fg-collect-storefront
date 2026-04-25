# fg-collect-storefront

The public-facing storefront for **FutureGadgetLabs**, the retail brand of the `FG-CollectShop` org.

## Mission

Be the cheapest, fastest, and most controllable way to list the cards I own for sale online. A static site that customers land on, browse, and buy from — with zero hosting cost and zero runtime cost beyond the backend I already run.

## What this repo is

- A **static website** that builds to plain HTML/CSS/JS and is served from GitHub Pages on a custom domain.
- The **public read-only surface** of the inventory: browse, filter, search, and check out.
- Deliberately **thin**. No database, no admin logic, no secrets, no server-side rendering. Anything sensitive lives in `fg-collect-core`.

## What this repo is *not*

- Not the inventory system. That lives in [`fg-collect-core`](https://github.com/FG-CollectShop/fg-collect-core) (private).
- Not the admin panel. That lives in [`fg-collect-admin`](https://github.com/FG-CollectShop/fg-collect-admin) (private).
- Not a price tracker or market-research tool. Historical pricing and market analysis live in a separate pre-existing repo outside this org.
- Not a place to store card data. Data comes from the core API at build time or runtime.

## How it fits in

```
                  ┌──────────────────────────┐
                  │  fg-collect-storefront    │  ← this repo (public, GH Pages)
                  │  static site, GH Pages   │
                  └────────────┬─────────────┘
                               │ fetch (build-time or client-side)
                               ▼
                  ┌──────────────────────────┐
                  │  fg-collect-core (API)   │  ← private
                  │  inventory, orders, auth │
                  └────────────┬─────────────┘
                               │
                  ┌────────────┴─────────────┐
                  │  fg-collect-infra        │  ← private
                  │  host, tunnel, backups   │
                  └──────────────────────────┘
```

## Constraints

- **Static only.** Must build to static assets. No Node server, no SSR runtime, no `.env` secrets baked into the bundle.
- **Public repo.** Every commit is visible to the world. Never commit keys, order data, or customer info.
- **GitHub Pages hosted.** Default branch contains a `CNAME` file pointing at the FutureGadgetLabs custom domain.
- **Rebuilds on inventory change.** The core API fires a `repository_dispatch` webhook that triggers the Pages build when stock changes materially.

## Planned integrations (surfaced through the core API, not called directly)

- ManaPool listings — cross-posted from the same inventory source of truth
- TCGPlayer listings — same
- Home setup — physical intake, labels, pick/pack (all server-side)
