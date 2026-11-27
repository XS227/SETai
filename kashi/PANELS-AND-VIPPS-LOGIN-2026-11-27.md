# KASHI v2 — Role-based panels and Vipps Login
Date: 2026-11-27 | Agent handoff | Priority: P0 before real seller recruitment

## Owner direction
- Build dedicated administrator panel and separate panels for all relevant types of users.
- Start with Norway/Scandinavia as the primary market, using the existing Norwegian Vipps Login integration as the preferred identity solution.
- Reuse the established integration pattern where technically and contractually permitted; do not assume an existing SETAEI/TrustAI or other site's credentials, client ID, redirect URIs, merchant agreement or permissions are automatically valid for KASHI.IS.
- Keep international expansion possible; do not hardcode Norwegian identity, currency, addresses or organisation numbers into the data model.
- Related: FOUNDING-PARTNERS-2026.md and REVIEW-QA-2026-11-27.md. Existing v2 QA describes a local static review prototype; real backend/authentication is not yet verified. Do not represent mock login as working production authentication.

## Proposed information architecture (route names can be adapted to the existing stack)
| User type | Panel | Access and functions |
|---|---|---|
| Platform owner / superadmin | /v2/admin/ | Global KPIs, countries/cities, sellers, buyers, approvals, catalogue moderation, orders, commission ledger, membership plans, invoices, marketing/SEO, AI search analytics, audit logs, roles and system configuration |
| Platform administrator | /v2/admin/ | Operational management within granted permissions; no automatic access to secrets, owner-only settings or role escalation |
| KASHI sales / support / marketing staff | /v2/admin/ | Restricted modules: prospect CRM, sales follow-up, support tickets, SEO and campaign analytics according to assigned role |
| Seller organisation owner | /v2/seller/ | Company/store profile, showroom locations, catalogue, imports, prices, stock, quote requests, orders, shipping, returns, team invitations, sales/commission reports, membership and invoice status |
| Seller employee | /v2/seller/ | Only assigned organisation and modules; role examples catalogue editor, order handler, finance viewer |
| Private buyer | /v2/account/ | Personal profile, saved products, favourites, room projects, quotes, order tracking, payment documents, addresses, support |
| Professional buyer (architect, designer, contractor, developer) | /v2/pro/ | Company/team profile, project folders, material specifications, quantities, quotation requests, multi-seller comparisons, purchase history and permitted team sharing |
| Manufacturer / wholesaler | /v2/seller/ | Supplier-specific tools layered onto the same seller organisation model; wholesale catalogue, distribution markets, MOQ, lead times and B2B enquiries |
| Guest | Public /v2/ | AI-assisted discovery, catalogue, seller pages, comparison; login when required for saved projects/orders or protected data |

Use one identity per person with optional memberships in multiple organisations and a server-validated context switcher. A buyer can apply to become a seller; do not create duplicate identities. Seller applicant status is not seller approval. Separate future expansion (e.g. logistics partner or affiliate panels) from phase 1 unless owner requests it.

## Vipps Login implementation
1. Audit current KASHI v2 files, deployment and server-side authentication architecture. Locate existing authorized Vipps integration or reusable code via the owner/approved repositories; never copy secrets into Git. Record existing status and missing dependencies without secret values.
2. Use Vipps MobilePay Login using the provider-supported OpenID Connect flow; check current official integration documentation at https://developer.vippsmobilepay.com/ before implementing. Register KASHI-specific allowed HTTPS callbacks and approved domain/environment; exact path to be chosen after architecture inspection (example /v2/auth/vipps/callback). Separate test and production settings. Credentials in server-side secret storage only.
3. Implement server-side authorization code exchange and validation of issuer, audience, signature, expiration, state and nonce; use PKCE where supported/required. Request only necessary scopes. Use verified issuer + subject as identity key; do not grant permissions from phone number or display name. Protect account linking with reauthentication and explicit confirmation.
4. First successful login creates a minimal buyer identity by default. Display a role/application chooser for new users: private buyer, professional buyer, seller applicant. Seller legal entity and authority must be verified by administrator before activation. Administrator invitations require a pre-authorized, audited role assignment; never let a self-selected role, public registration or Vipps login itself grant admin privileges.
5. Secure session cookies (Secure, HttpOnly, appropriate SameSite), CSRF protection, rotation on login/privilege changes, logout, rate limits and reauthentication for sensitive operations. For administrator roles require strong MFA or equivalent assurance beyond any unverified assumption about Login. Implement revocation, account deletion and audit.
6. Show Vipps as primary sign-in in Norway; verify current Vipps/MobilePay Login coverage, merchant eligibility and supported identity flows in Denmark/Sweden/other markets. Offer approved country-appropriate login options later, including a fallback for users without compatible accounts. No claim that Norwegian Vipps alone covers all Scandinavia.
7. Login is authentication, not payment. Keep checkout, membership billing, seller settlement and refunds separate from Login; enable live transactions only after appropriate payment integration and legal/commercial approval.

## Data and security boundaries
- Suggested entities: users, external_identities, organisations, organisation_memberships, roles, permissions, seller_applications, seller_profiles, locations, products, membership_subscriptions, quote_requests, orders, commission_ledger, audit_events.
- Enforce role permissions and organisation/tenant isolation on every protected server endpoint and object access. Never depend on hiding menu items or browser localStorage. Default deny; buyers see own data, sellers see their own company records, staff see assigned scopes.
- Public catalogues must include only approved and active sellers/products. Prospect CRM stays private. Do not use real user data in public repository, fixtures, local mock or review environments.
- Log security-sensitive changes (approval, roles, price, commission, billing) with actor/time and relevant before/after, without tokens or unnecessary personal data.
- Privacy by design: data minimisation, retention and deletion workflows, secure exports, consent where needed; legal review before live onboarding.

## Implementation order and acceptance tests
- P0: inspect repo, plan backend/database migrations, auth integration, secure sessions and role enforcement; build responsive shared panel shell and navigation.
- P0: admin seller/prospect CRM and application review; seed previous 46 leads as unverified prospects; founding-partner price NOK 6,000 vs standard NOK 12,000, cutoff 2026-12-31. Do not hardcode renewal discount/commission or live billing until approved.
- P0: seller portal and buyer account, basic professional buyer role, country/city and organisation support.
- P1: catalogue imports, AI search, quotation/order workflows, reporting, commission ledger and SEO dashboard; progressively enable real integrations after testing.
- Test: successful/cancelled Vipps login, invalid/replayed state or nonce, expired code/token, duplicate login, identity linking, role approval, denied public admin assignment, cross-tenant IDOR, logout/revocation, mobile/desktop, country fallback, test/live separation. Demonstrate actual sandbox sign-in before describing it as integrated.
- Test role matrix at UI and API; record commands, results, changed paths, blockers, commit SHA, and review URL. Preserve current site and existing review branch; no live deployment or credentials in Git from this handoff alone.

## Decisions pending
Exact Vipps application/merchant access for KASHI, country-specific sign-in availability, backend choice after audit, admin bootstrap/approval process, fallback identity method, payment provider and settlement terms, renewal discount duration and commission rate. The panel routes and extended roles above are proposed defaults, not verified implemented features.
