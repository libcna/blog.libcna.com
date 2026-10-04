# ClassicPress import staging

This directory stores the versioned source material used to migrate the
ClassicPress blog. Import files remain in Git after conversion so the original
HTML, metadata, and media can be audited later.

## Directory layout

Each article has exactly two files under a dated `slug_id` directory:

```text
import/
  2026/
    10/
      05/
        article-slug_123/
          index.html
          metadata.txt
  media/
    architecture.webp
    compatibility-report.pdf
  _templates/
    article/
      index.html
      metadata.txt
```

Rules:

- Use four-digit years and zero-padded months and days.
- Use a lowercase, hyphenated slug followed by `_` and the numeric
  ClassicPress post ID, for example `what-is-cna_123`.
- The dated path is the publication date. During conversion it also becomes
  the initial last-modified date.
- A future path date represents a scheduled article.
- Keep article directories limited to `index.html` and `metadata.txt`.
- Keep all original media in the single flat `import/media/` directory.
- `_templates/` is never treated as imported content.

## Creating an article entry

Create the destination and copy both template files:

```bash
mkdir -p import/2026/10/05/article-slug_123
cp import/_templates/article/index.html import/2026/10/05/article-slug_123/
cp import/_templates/article/metadata.txt import/2026/10/05/article-slug_123/
```

Replace the sample HTML with the article body and fill in every required
metadata value. UTF-8 is required.

## HTML format

`index.html` should preferably contain only the article body rather than a
complete page with `<html>`, `<head>`, navigation, sidebar, and footer markup.
Normal ClassicPress article HTML is accepted: paragraphs, headings, lists,
links, images, tables, block quotes, and code blocks.

Reference flat import media using its final root-relative URL:

```html
<img src="/media/architecture.webp" alt="CNA architecture">
```

The referenced source file must be stored at
`import/media/architecture.webp`. The conversion step will copy it to
`public/media/architecture.webp`.

## Metadata format

`metadata.txt` uses one `key=value` pair per line. Blank lines and lines
starting with `#` are ignored. Everything after the first `=` belongs to the
value.

| Key | Required | Format |
| --- | --- | --- |
| `title` | yes | Article title |
| `description` | yes | Plain-text summary used in listings and metadata |
| `categories` | yes | JSON array of strings, including an empty array |
| `tags` | yes | JSON array of strings, including an empty array |
| `featured_media` | no | Filename from the flat `import/media/` directory |
| `featured_media_alt` | with media | Accessible description of the featured image |
| `featured_media_caption` | no | Optional image caption |
| `author` | no | Author name; defaults to the site author |
| `draft` | no | `true` or `false`; defaults to `false` |
| `original_url` | no | Original absolute ClassicPress URL |
| `permalink` | no | Primary path beginning with `/` when the default differs |
| `aliases` | no | JSON array of old paths that should redirect |

JSON arrays avoid ambiguity when a category or tag contains punctuation:

```text
categories=["Development","Projects"]
tags=["CNA","C++23","C API"]
aliases=["/old-article-address/"]
```

Do not add `date`, `updated`, `slug`, or `classicpress_id`; those values are
derived from the directory path and name.

## Featured media

`featured_media` contains only a filename, not a directory or URL:

```text
featured_media=architecture.webp
featured_media_alt=Diagram of CNA platform and renderer separation
```

Leave both values empty when an article has no featured image. Media filenames
must be unique because the staging directory is flat. Prefer lowercase names
without spaces and do not rename a file after articles reference it.

## Validation

After filling the import tree, run:

```bash
npm run check:import
```

The validator checks directory naming, real calendar dates, required article
files, metadata syntax, JSON lists, duplicate keys, draft values, permalinks,
and featured-media existence. It does not modify or convert the source files.
