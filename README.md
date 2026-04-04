# Fill & Haul — Lead Gen Website

Arizona junk removal & hauling lead generation site built with **Astro 5**, **Tailwind CSS v4**, and ready for **Cloudflare Pages**.

## Tech Stack

- **Astro 5** — Static site generator (zero JS shipped by default)
- **Tailwind CSS v4** — Utility-first styling via Vite plugin
- **TypeScript** — Strict mode
- **Cloudflare Pages Functions** — Serverless form handler at `/api/contact`

## Project Structure

```
fill-and-haul/
├── src/
│   ├── components/      # Astro components (Navbar, Hero, Services, etc.)
│   ├── layouts/         # Base HTML layout with SEO meta
│   ├── pages/           # index.astro (single landing page)
│   └── styles/          # global.css (Tailwind + custom styles)
├── functions/
│   └── api/
│       └── contact.ts   # Cloudflare Pages Function for form submissions
├── public/              # Static assets (favicon)
├── dist/                # Build output → deploy this folder
└── astro.config.mjs     # Astro + Tailwind + Sitemap config
```

## Local Development

```bash
# Install dependencies
bun install

# Start dev server
bun run dev

# Build for production
bun run build

# Preview production build
bun run preview
```

## Deploy to Cloudflare Pages

### Option A: Git Integration (Recommended)

1. Push this repo to GitHub/GitLab
2. Go to **Cloudflare Dashboard → Pages → Create a project**
3. Connect your repo
4. Set build settings:
   - **Build command:** `bun run build`
   - **Build output directory:** `dist`
   - **Node.js version:** `22` (set via environment variable `NODE_VERSION=22`)
5. Deploy!

### Option B: Direct Upload

```bash
# Install Wrangler CLI
bun add -g wrangler

# Login to Cloudflare
wrangler login

# Build the site
bun run build

# Deploy
wrangler pages deploy dist --project-name=fill-and-haul
```

### Connect Your Domain

1. In Cloudflare Pages project settings → **Custom domains**
2. Add your domain (e.g., `fillandhaul.com`)
3. Cloudflare handles SSL automatically

## Form Submissions

The contact form POSTs to `/api/contact` (Cloudflare Pages Function in `functions/api/contact.ts`).

### Current Behavior
- Validates required fields (name, email, location, job size)
- Stores leads in **Cloudflare KV** (if bound)
- Logs submissions to **Functions logs** (visible in Cloudflare dashboard)
- Falls back to `mailto:` if the API is unavailable

### Set Up KV Storage (Optional but Recommended)

1. Create a KV namespace in Cloudflare dashboard:
   - Go to **Workers & Pages → KV**
   - Create namespace called `fill-and-haul-leads`
2. Bind it to your Pages project:
   - Go to **Pages → fill-and-haul → Settings → Functions**
   - Add KV binding: Variable name = `LEADS`, Namespace = `fill-and-haul-leads`
3. Redeploy

### View Stored Leads

In Cloudflare dashboard → **KV → fill-and-haul-leads** → browse keys.
Each key is `lead_<timestamp>_<id>` with JSON value containing all form fields.

## Customization

### Update Phone Number
Search for `(602) 555-0123` across all component files and replace with the real number.

### Update Email
Search for `info@fillandhaul.com` and replace.

### Add/Remove Service Areas
Edit `src/components/ServiceAreas.astro` — just update the `areas` array.

### Add/Remove Services
Edit `src/components/Services.astro` — update the `services` array.

### Update Testimonials
Edit `src/components/Testimonials.astro` — update the `reviews` array.

## SEO

- ✅ Semantic HTML with proper heading hierarchy
- ✅ Meta title, description, keywords
- ✅ Open Graph tags
- ✅ Local Business schema (JSON-LD)
- ✅ Auto-generated sitemap (`/sitemap-index.xml`)
- ✅ Mobile responsive
- ✅ Fast — static HTML, minimal JS
