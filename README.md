# blog.libcna.com

Markdown source and a dependency-free static site generator for
`blog.libcna.com`. Node.js 20 or newer is the only build requirement.

The presentation follows the current **CNA Light 1.0.2** ClassicPress theme:
the same light palette, typography, content width, article cards, sidebar,
navigation, and responsive behavior. The generated site also uses the same CNA
favicon as the current ClassicPress blog.

## Technology

- Node.js 20+ with native ECMAScript modules
- A dependency-free static site generator in `scripts/build.mjs`
- Markdown files with a small YAML-compatible metadata block
- Semantic HTML5 and a responsive CSS theme without a client-side framework
- Generated category, tag, year, month, and day archives
- Generated RSS, sitemap, canonical URLs, redirects, and a 404 page
- A small Node.js preview server and an internal-link validator
- GitHub Actions for clean-build validation on pushes and pull requests

## Quick start

```bash
npm run build
npm run serve
```

The generated website is written to `dist/` and committed together with its
source so the exact release artifact can be reviewed. The local preview is
available at `http://localhost:8080`. Run the complete validation with:

```bash
npm test
```

## Adding an article

Create a directory matching the publication date, then copy the article
template into it:

```bash
mkdir -p content/posts/2026/10/05
cp content/_templates/post.md.example content/posts/2026/10/05/article-slug.md
```

Every article path follows this format:

```text
content/posts/YYYY/MM/DD/article-slug.md
```

For example:

```text
content/posts/2012/07/16/first-game-with-cna.md
```

generates:

```text
/2012/07/16/first-game-with-cna/
```

Copy [`content/_templates/post.md.example`](content/_templates/post.md.example)
when starting an article. The `title`, `date`, and `description` fields are
required. The date must agree with the source directory. `categories` and
`tags` are lists; their archive pages are generated automatically.

```yaml
---
title: Article title
date: 2026-10-05
updated: 2026-10-05
description: Short article description.
categories:
  - Development
tags:
  - CNA
  - XNA
draft: false
---
```

After creating the article, build and validate the entire site:

```bash
npm test
```

## Images and attachments

Store images and downloads under `public/media/`. Reference them from the site
root. For example, an article can use this layout:

```text
public/media/2026/what-is-cna/
  architecture.webp
  compatibility-report.pdf
```

Embed an image with standard Markdown:

```markdown
![CNA architecture](/media/2026/what-is-cna/architecture.webp)
```

Link a downloadable attachment in the same way:

```markdown
[Download the compatibility report](/media/2026/what-is-cna/compatibility-report.pdf)
```

Use descriptive lowercase filenames without spaces. Images and attachments are
copied to `dist/media/` without modification and are intentionally tracked by
Git. Optimize large images before committing them; use external object storage
or Git LFS for unusually large downloads.

The `.gitignore` excludes dependencies, caches, logs, local environment files,
and workspace metadata. It deliberately does not ignore `dist/` or
`public/media/`, so both the generated website and article assets are included
in commits. The CNA favicon is stored in `public/favicon.svg` and contains the
same 32×32 logo used by the current `blog.libcna.com` site.

## Updating an existing article

Edit its existing Markdown file and run `npm test`. Keep the original `date`
and dated directory unchanged so the public URL remains stable. Set the
optional `updated` field after a substantial revision. Article cards, archive
lists, and full article pages display the last-update date; when `updated` is
omitted, they use the original publication date.

```yaml
date: 2026-10-05
updated: 2026-10-12
```

If a slug or permalink must change, place the old path in `aliases` so the
generator creates a redirect:

```yaml
permalink: /2026/10/04/new-article-address/
aliases:
  - /2026/10/04/old-article-address/
```

Do not edit anything under `dist/`; it is generated from `content/` and
`public/` and is replaced by every build. After changing content, run
`npm test` and commit the updated source and generated `dist/` files together.

## Scheduling an article

The `date` field is also the publication date. A normal build includes only
articles dated today or earlier in the `Europe/Prague` timezone. A future-dated
Markdown file can therefore be committed without appearing in HTML, RSS, the
sitemap, or any archive until its date arrives. Its directory must still match
that date:

```text
content/posts/2026/11/15/planned-article.md
```

```yaml
date: 2026-11-15
```

Preview scheduled articles locally with:

```bash
BUILD_FUTURE=1 npm run build
```

`BUILD_DATE=YYYY-MM-DD npm run build` overrides today's date for reproducible
testing. The hosting service must run a new build on or after the publication
date; date filtering does not itself trigger a deployment.

## ClassicPress import staging

Unconverted ClassicPress exports belong under the versioned `import/`
directory. Each article uses a dated `year/month/day/slug_id` directory with
an HTML body and a `key=value` metadata file. Source media retains its
ClassicPress hierarchy under `import/media/wp-content/uploads/YYYY/MM/`,
including original images and generated size variants.

Copy `import/_templates/article/` when preparing an article, and validate a
completed import batch with:

```bash
npm run check:import
```

The import date becomes both the publication date and initial last-modified
date. Future dates remain scheduled and are excluded from a normal static
build after conversion. See [`import/README.md`](import/README.md) for the
complete directory layout, field definitions, media-retention rules, and
examples. The supplied media is preserved losslessly until the real article
HTML reveals which generated variants and historical URLs are referenced.

## Preserving old URLs

- The default article permalink is `/year/month/day/slug/`.
- Set `permalink` when the original article used a different primary path.
- Add old paths to `aliases`; the generator creates redirect pages there.
  An alias must be a path, not a full URL or a URL containing a query string.
- Record the original public URL in `originalUrl`.
- Record the original ClassicPress post ID in `classicpressId` when useful.
- Every article appears in year, month, day, category, and tag archives.

See [`docs/MIGRATION.md`](docs/MIGRATION.md) for the complete migration process
and content format.

## Project structure

```text
content/
  posts/             articles arranged by year/month/day
  pages/             standalone pages
  _templates/        authoring templates, never generated
import/               versioned ClassicPress HTML, metadata, and source media
public/               static files copied without modification
scripts/build.mjs     static site generator
scripts/check.mjs     generated-site validation
scripts/check-import.mjs  import layout and metadata validation
scripts/serve.mjs     local preview server
dist/                 generated website, committed as the release artifact
```

## GitHub Pages publishing

`dist/` is a complete static website suitable for GitHub Pages, Cloudflare
Pages, Netlify, nginx, or ordinary static hosting. It contains a `CNAME` file
with `blog.libcna.com`; the source copy is maintained at `public/CNAME` and is
copied into every build.

`.github/workflows/check.yml` verifies every push and pull request.
`.github/workflows/pages.yml` builds the site, validates it, uploads only the
generated `dist/` directory, and deploys that artifact through GitHub Pages.

The Pages workflow is deliberately **manual-only** while the existing
ClassicPress blog remains online. Merely pushing this repository does not
publish or replace the current website. After the content migration and final
review are complete:

1. In the repository settings, select **GitHub Actions** as the Pages source.
2. Review the committed `dist/` output and DNS configuration.
3. Run **Deploy GitHub Pages** manually from the Actions tab.
4. Add `push` and daily `schedule` triggers to `pages.yml` only when automatic
   deployments and scheduled articles should go live.

The workflow runs `npm test` before deployment, so the uploaded artifact is a
fresh build rather than an unchecked copy. A scheduled article still requires
a workflow run on or after its publication date.

## License

The project source is available under the MIT License; see [LICENSE](LICENSE).
Migrated articles must retain their actual authorship and licensing terms. The
repository license does not automatically replace the license of existing
content.
