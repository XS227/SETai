# Heimslig — SETAEI KSH v4

Isolated enhancements for the existing /ksh/heimslig/ prototype. The existing inventory, brand name, favicon, checkout, and payment settings are not changed.

## Features

- Functional room budget calculator on product categories and product detail pages. The visitor inputs estimated unit prices, quantities and delivery, and gets a total; this is NOT an official price list.
- Breadcrumbs hidden and spacing compacted; the original top-level disclosure stays visible.
- A new responsive social/inspiration magazine at /ksh/heimslig/social/.
- The social gallery preferentially reuses images from the relevant existing Heimslig pages. Public Unsplash illustration imagery is fallback only, and is never mislabelled as Heimslig social content.
- Future Instagram embeds exclusively from confirmed post URLs in social/posts.json. Empty by default; no unverified social-media links.
- Existing HEIMSLIG wordmark preserved because no verified official logo source was found.

## Deploy

One VPS command, with automatic GitHub source download and no manual uploads:

curl -fsSL https://raw.githubusercontent.com/XS227/SETai/main/deploy/heimslig-v4/install.sh -o /tmp/heimslig-v4-install.sh && sudo bash /tmp/heimslig-v4-install.sh

The script defaults to /var/www/setai/ksh/heimslig and accepts a different document root as its first argument. It is safe to rerun and never overwrites a populated social/posts.json. Every changed original index.html receives a one-time index.html.before-heimslig-v4.bak copy.

Test the category calculator at https://setai.no/ksh/heimslig/produkter/stoler/#heimslig-kalkulator and the new social page at https://setai.no/ksh/heimslig/social/.

## Verified Instagram integration

Edit /var/www/setai/ksh/heimslig/social/posts.json on the VPS only after validating an official account and permissions. JSON list of objects with fields "url" (public Instagram post or reel permalink) and "caption". The initial default is []. No account access token is necessary; Instagram's public embed endpoint is used. A missing account or embeddable post results in a clear placeholder, not fabricated media.

## Rollback

Restore affected HTML pages from their .before-heimslig-v4.bak copies and remove the injected /assets/v4/ files if necessary. No database or webserver configuration is touched.
