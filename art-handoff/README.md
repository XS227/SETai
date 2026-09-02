# Setai Art — deployment handoff

Target URL: `https://setai.no/art/`

## Contents

- Premium Persian–Scandinavian art storefront
- Sina Soleimani artist profile and six selected works
- Frame and wall-colour preview
- EUR pricing and collector enquiry flow

## Run and verify

```bash
npm run install:ci
npm run build
```

The app routes are `/art/` and `/art/artists/sina-soleimani/`.

## Production integration

Deploy behind the existing `setai.no` Nginx host. Preserve the current root website and route only `/art/` to this application. Forward `/art/*` to the app without stripping the path. Confirm that static assets under `/art/` load, and keep HTTPS/HSTS on the existing host.

The current purchase buttons create a non-binding collector enquiry. Before commercial launch, confirm each work's availability, dimensions, materials and final price with Sina Soleimani, and connect the enquiry action to the approved email or checkout backend.
