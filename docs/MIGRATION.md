# Migrating from ClassicPress

This document defines the expected target format. Real blog articles are not
part of the initial sample content.

## Recommended process

1. Export posts and media from ClassicPress and keep a safe copy of the export
   outside this repository.
2. Convert each published post to its own UTF-8 Markdown file.
3. Save it as `content/posts/YYYY/MM/DD/slug.md`, matching the original public
   date and slug.
4. Move media under `public/media/YYYY/` and update the Markdown references.
5. Transfer title, date, author, description, categories, and tags to the front
   matter.
6. Add alternative historical paths to `aliases`, and keep the original full
   URL in `originalUrl`.
7. Run `npm test` and fix every duplicate URL, missing field, or broken local
   link.
8. Before switching the domain, compare the old URL inventory with
   `dist/sitemap.xml` and manually inspect representative articles.

## Article metadata

The generator deliberately accepts a small, predictable YAML subset.

| Field | Required | Meaning |
| --- | --- | --- |
| `title` | yes | Article title |
| `date` | yes | Original `YYYY-MM-DD` date or an ISO date and time |
| `description` | yes | Concise summary for lists, RSS, and page metadata |
| `author` | no | Author; defaults to the site author |
| `slug` | no | Defaults to the Markdown filename without `.md` |
| `permalink` | no | Custom output path, for example `/old-path/` |
| `categories` | no | YAML list of categories |
| `tags` | no | YAML list of tags |
| `aliases` | no | YAML list of old paths that should redirect |
| `originalUrl` | no | Original full URL, retained for reference |
| `classicpressId` | no | Original post ID for matching the export |
| `updated` | no | Date of the last substantial update |
| `draft` | no | `true` excludes the article from a normal build |

Short lists such as `tags: [CNA, C++, Tutorial]` are also accepted. Write a
multiline description with `description: |`.

Additional historical fields may remain in the front matter. The generator
will not display unknown fields, but Git will continue to preserve them with
the article.

## Supported Markdown

The generator supports headings, paragraphs, links, images, bold and italic
text, inline code, strikethrough, block quotes, horizontal rules, ordered and
unordered lists, tables, and fenced code blocks. Trusted block-level HTML from
the original articles is passed through unchanged.

## Previewing drafts

An article with `draft: true` is excluded from the public build. Include all
drafts in a local build with:

```bash
BUILD_DRAFTS=1 npm run build
```

## URL compatibility

Static hosting must resolve a directory's `index.html` as a clean URL with a
trailing slash. A request for `/2012/07/16/first-game-with-cna/` must therefore
serve `dist/2012/07/16/first-game-with-cna/index.html`.

Query-only addresses such as `/?p=123` cannot be preserved with portable
static HTML redirects. Configure those redirects on the selected hosting
provider.
