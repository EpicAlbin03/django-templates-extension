# Prettier Plugin for Django HTML Templates

A formatter plugin for Prettier that understands Django template syntax embedded in HTML files. It exists to preserve template meaning while normalizing the presentation of Django HTML templates.

## Language

### Documents and syntax

**Django HTML template**:
A mixed-syntax document that combines HTML with Django template syntax such as expressions, comments, and tags. It is the primary document this plugin parses and formats.
_Avoid_: Django template, template, HTML file

**Formatted Django HTML template**:
A Django HTML template after the plugin has applied its formatting rules. It preserves template meaning while normalizing layout, spacing, and line breaking.
_Avoid_: formatted HTML, prettified HTML

**Mixed-syntax document**:
A document whose meaning depends on more than one interacting syntax, such as HTML plus Django template syntax.
_Avoid_: hybrid file, special HTML

**Host syntax**:
The outer syntax that provides the main document structure of a mixed-syntax document. In a Django HTML template, the host syntax is HTML.
_Avoid_: base language, outer parser

**Embedded template syntax**:
Django template syntax embedded within the host syntax of a Django HTML template.
_Avoid_: inner syntax, inline syntax

### Template constructs

**Template construct**:
Any Django template syntax embedded in a Django HTML template. Template constructs are distinct from ordinary HTML, CSS, and JavaScript syntax.
_Avoid_: tag, token

**Template expression**:
A template construct written as `{{ ... }}` that inserts or derives a value within the template.
_Avoid_: variable, interpolation

**Template tag**:
A template construct written as `{% ... %}` that expresses template logic, structure, or directives. A template tag may be a Django built-in tag or a supported custom tag.
_Avoid_: statement

**Template comment**:
A template construct written as `{# ... #}` for comments in Django template syntax. It is distinct from template tags that represent comment blocks and from ordinary HTML comments.
_Avoid_: comment

**Comment block tag**:
A template tag pair such as `{% comment %} ... {% endcomment %}` that marks a comment block in Django template syntax.
_Avoid_: template comment, comment

**Raw block tag**:
A template tag pair whose body is preserved as literal text rather than parsed as nested template constructs.
_Avoid_: raw tag, literal block

**Template block**:
A region of a Django HTML template delimited by related template tags, such as a start tag, optional branch tags, and an end tag.
_Avoid_: block, statement block

**Well-formed template block**:
A template block whose start tag, branch tags, and end tag relate validly to one another.
_Avoid_: valid block, balanced block

**Template branch tag**:
A template tag such as `{% else %}`, `{% elif %}`, `{% empty %}`, or `{% plural %}` that introduces a branch within a template block.
_Avoid_: branch, else tag

**Standalone template tag**:
A template tag that stands on its own rather than delimiting a template block.
_Avoid_: standalone, single tag

### HTML-relative contexts

**Document flow**:
The ordinary content flow of a Django HTML template outside HTML start tags, attribute values, and preserved regions.
_Avoid_: top level, body text

**Start-tag template construct**:
A template construct that appears within an HTML start tag but not within an attribute value.
_Avoid_: attribute-level template construct, inline tag

**Attribute-value template construct**:
A template construct that appears within the value of an HTML attribute.
_Avoid_: attribute-level template construct, inline tag

**Embedded content**:
Content nested inside an HTML element such as `<script>` or `<style>` within a Django HTML template.
_Avoid_: embedded language, inner file

**HTML comment**:
A comment written with HTML comment syntax inside a Django HTML template. It is not a Django template construct, even though it appears in the same document.
_Avoid_: template comment

### Formatting behavior

**Template meaning**:
The behavior and interpretation a Django HTML template conveys to Django and the browser, independent of formatting choices such as spacing, indentation, and line breaking.
_Avoid_: output, appearance

**Template parsing**:
The act of recognizing the structure and boundaries of template constructs and HTML within a Django HTML template.
_Avoid_: tokenization, formatting

**Template formatting**:
The act of rewriting the presentation of a Django HTML template while preserving template meaning.
_Avoid_: parsing, transformation

**Structural formatting**:
Formatting that changes layout across lines, indentation levels, or template block boundaries while preserving template meaning.
_Avoid_: block formatting, pretty printing

**Inline normalization**:
Formatting that normalizes spacing within a single template construct or within a single line-level context while preserving template meaning.
_Avoid_: inline formatting, whitespace cleanup

**Protected construct**:
A template construct temporarily treated as an opaque unit so surrounding content can be formatted without changing its meaning.
_Avoid_: placeholder, token

**Formatting boundary**:
A point in a mixed-syntax document where formatting responsibility must shift to preserve template meaning.
_Avoid_: parser boundary, edge case

**Conservative preservation**:
The practice of preserving uncertain or ambiguous template content without aggressive structural rewriting.
_Avoid_: best-effort formatting, inference

**Ignore region**:
A region of a Django HTML template explicitly marked so the formatter leaves its contents unchanged.
_Avoid_: ignored block, raw block

**Whitespace-sensitive context**:
A context in which changing whitespace or line breaking may change template meaning or rendered output in a materially important way.
_Avoid_: tricky whitespace, spacing issue

**Idempotent formatting**:
Formatting whose result remains unchanged when formatted again with the same rules.
_Avoid_: stable output, deterministic formatting

### Support and errors

**Supported template construct**:
A template construct whose role the formatter knows how to interpret well enough to format while preserving template meaning.
_Avoid_: recognized construct, handled construct

**Supported template tag**:
A supported template construct written as `{% ... %}` whose structural role the formatter knows how to interpret.
_Avoid_: recognized tag, handled tag

**Supported custom tag**:
A supported template tag that is not part of Django's built-in tag set.
_Avoid_: plugin tag, external tag

**Template support**:
The degree to which the formatter can parse and format a Django HTML template while preserving template meaning.
_Avoid_: compatibility, coverage

**Template structure error**:
An invalid structural relationship between template tags, such as a missing matching tag or a branch tag without a valid enclosing template block.
_Avoid_: parse error, syntax error
