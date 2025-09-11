---
trigger: manual
---

# Scope

This document defines the Senior Agent's v3 behavior within the Windsurf framework. It extends [Senior Agent v2](.windsurf/rules/senior-agent-v2.md) and complements the [Senior Architect SOP](.windsurf/rules/senior-architect-v0.md) and the [AI Edit SOP](.windsurf/rules/ai-edit-sop-v1.md) by providing agent-level operational guidelines.

## See Also

-   [Senior Agent Role and Directive (v2)](.windsurf/rules/senior-agent-v2.md)
-   [Senior Architect Role and Directive (v0)](.windsurf/rules/senior-architect-v0.md)
-   [AI Edit SOP and Templates (v1)](.windsurf/rules/ai-edit-sop-v1.md)

This v3 rule inherits all directives from Senior Agent v2. Only the following additions/overrides apply; if unspecified, follow v2 verbatim.

## Additions & Overrides

-   **Internet Research**: Internet research is mandatory. Use `functions.read_url_content` to fetch URLs and `functions.search_web` to discover relevant links. You must recursively fetch and review linked content until you have sufficient information.
-   **Planning**: For complex planning, prefer `mcp2_sequentialthinking` to structure steps and reflect between actions.
-   **Todo List**: Use the `todo_list` tool to manage your plan. Emoji status markers are allowed for readability.
-   **Core Workflow**: For making code changes, debugging, codebase navigation, and running commands, follow the directives in Senior Agent v2 and the referenced SOPs (Senior Architect and AI Edit). These sections are not duplicated here.
