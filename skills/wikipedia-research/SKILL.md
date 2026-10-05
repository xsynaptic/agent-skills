---
name: wikipedia-research
description: Read Wikipedia articles via the MediaWiki API instead of WebFetch. Use when the user shares a Wikipedia URL, asks to look something up on Wikipedia, or references Wikipedia content. Supports all 300+ language editions.
---

# Wikipedia research

Read Wikipedia with `curl` against its REST and MediaWiki APIs. WebFetch hands back a small model's summary of the page, and Wikipedia has blocked it with a 403; the APIs return the text itself, one section at a time.

`{lang}` is the language edition's subdomain, `en` unless the URL or the user says otherwise. `{title}` is URL-encoded. A URL of the form `https://{lang}.wikipedia.org/wiki/{title}` supplies both.

## Workflow

### 1. Summary and section list

Start here for any article, with both calls in parallel:

```bash
curl -s "https://{lang}.wikipedia.org/api/rest_v1/page/summary/{title}"
curl -s "https://{lang}.wikipedia.org/w/api.php?action=parse&format=json&redirects=1&page={title}&prop=sections"
```

Present the title, description, and summary extract, then the sections as a numbered list so the user can ask for one by number. End with the article's URL.

### 2. One section

`{index}` is the section's `index` from the list in step 1:

```bash
curl -s "https://{lang}.wikipedia.org/w/api.php?action=parse&format=json&redirects=1&page={title}&prop=text&section={index}" | python3 -c "
import sys, json, html, re
data = json.load(sys.stdin)
text = data['parse']['text']['*']
text = re.sub(r'<[^>]+>', '', text)
text = html.unescape(text)
print(text.strip())
"
```

### 3. Full article

Only when the user asks for the whole article. The plain text is at `.query.pages.<pageid>.extract`:

```bash
curl -s "https://{lang}.wikipedia.org/w/api.php?action=query&format=json&redirects=1&prop=extracts&explaintext=1&titles={title}"
```

### 4. Search

When there is no exact title:

```bash
curl -s "https://{lang}.wikipedia.org/w/api.php?action=opensearch&format=json&search={query}&limit=5"
```

The response is `[query, [titles], [descriptions], [urls]]`. Present the titles and let the user pick.

### 5. Language links

When the user asks whether an article exists in another language:

```bash
curl -s "https://{lang}.wikipedia.org/w/api.php?action=query&format=json&redirects=1&titles={title}&prop=langlinks&lllimit=500"
```

### 6. Linked articles

Follow a link out of an article only when the user asks about its subject, starting again at step 1.

## Errors

- A 404 from the summary endpoint, or `missing` in a query response, means no article has that title: say so and run a search
- Without `redirects=1`, a redirect title (`NYC`) returns an empty extract instead of the article it points to
