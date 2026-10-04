# Migrating from ClassicPress

The migration tool reads a MariaDB/MySQL dump directly and converts the
ClassicPress source into the repository's final Markdown and media layout. A
running MariaDB server, ClassicPress instance, PHP installation, and temporary
versioned import directory are not required.

## Source safety

Keep the database dump and complete ClassicPress installation outside the Git
repository. Files such as `wp-config.php`, database tables, plugin settings,
password hashes, salts, and user records can contain sensitive information.
The repository's `.gitignore` also excludes a root-level `migration-source/`
directory and root-level SQL dumps as a final safeguard.

Retain an independent backup after migration. The Git repository is a copy of
the published content, not a replacement for the original database backup.

## Audit and conversion

Run a read-only report first:

```bash
node scripts/import-classicpress.mjs \
  --database /safe/path/database.sql.gz \
  --uploads /safe/path/classicpress/wp-content/uploads \
  --report
```

The report detects the table prefix and inventories post types, publication
statuses, dates, taxonomies, HTML elements, featured media, and required upload
files. It does not print passwords or other user credentials.

To create the final Markdown files, add `--write`:

```bash
node scripts/import-classicpress.mjs \
  --database /safe/path/database.sql.gz \
  --uploads /safe/path/classicpress/wp-content/uploads \
  --write
```

`--write` deliberately replaces `content/posts/` and copies the supplied media
tree to `public/wp-content/uploads/`. The operation is idempotent for the same
database dump and media tree.

## Database mapping

Only ClassicPress posts with status `publish` or `future` are migrated. Trash,
drafts, auto-drafts, revisions, navigation items, attachments, and internal
customizer records are excluded as articles.

| ClassicPress source | Markdown destination |
| --- | --- |
| `post_title` | `title` |
| `post_date` | `date` and `YYYY/MM/DD` directory |
| `post_modified` | `updated` |
| `post_name` | filename and URL slug |
| `post_content` | converted Markdown body |
| categories | `categories` list |
| post tags | `tags` list |
| `_thumbnail_id` | featured-image fields |
| post ID | `classicpressId` |
| `publish` / `future` | `classicpressStatus` |

The generated `originalUrl` follows the ClassicPress permalink structure
`/%year%/%monthnum%/%day%/%postname%/`. The original publication and modified
timestamps are retained as ISO timestamps. A scheduled article can therefore
have an `updated` timestamp earlier than its future `date`; this correctly
means it was edited before it was published.

When `post_excerpt` is empty, the importer derives a short description from
the first prose paragraph. It converts headings, lists, links, images, inline
formatting, block quotes, tables, and code blocks to the supported Markdown
subset. Internal absolute URLs are changed to root-relative URLs.

## Media

ClassicPress uploads live at:

```text
public/wp-content/uploads/YYYY/MM/filename
```

This preserves existing `/wp-content/uploads/...` URLs. The importer validates
local image and attachment references against this tree and prefers an
available original image when article HTML references a generated
`-WIDTHxHEIGHT` variant.

Keep original images permanently. Keep generated size variants until article
HTML, `srcset`, featured media, external links, and historical URLs have been
audited. A filename suffix alone is not sufficient proof that a file is safe
to delete.

## Verification

Validate the currently published website:

```bash
npm test
```

Then include every scheduled article to verify the complete migrated corpus:

```bash
npm run test:future
```

Before switching the domain, compare the old URL inventory with
`dist/sitemap.xml`, inspect representative long articles, code blocks, tables,
and images, and verify the manually triggered GitHub Pages artifact.

## Article metadata

The generator accepts a small, predictable YAML subset.

| Field | Required | Meaning |
| --- | --- | --- |
| `title` | yes | Article title |
| `date` | yes | Original date or ISO timestamp |
| `updated` | no | Actual last-modified date or ISO timestamp |
| `description` | yes | Summary for listings, RSS, and metadata |
| `author` | no | Author; defaults to the site author |
| `slug` | no | Defaults to the Markdown filename |
| `permalink` | no | Custom primary output path |
| `categories` | no | YAML list of categories |
| `tags` | no | YAML list of tags |
| `aliases` | no | YAML list of historical redirect paths |
| `originalUrl` | no | Original full public URL |
| `classicpressId` | no | Original database post ID |
| `classicpressStatus` | no | Preserved migration status |
| `featuredImage` | no | Root-relative image path below `public/` |
| `featuredImageAlt` | with image | Accessible image description |
| `featuredImageCaption` | no | Optional caption |
| `draft` | no | `true` excludes the article from normal builds |

Query-only addresses such as `/?p=123` cannot be preserved with portable
static HTML redirects. Configure those redirects on the selected hosting
provider if they must remain available.
