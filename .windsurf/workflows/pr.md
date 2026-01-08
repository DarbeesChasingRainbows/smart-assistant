---
auto_execution_mode: 1
---
description: Pushes code and opens a PR using the GitHub MCP
variables:
  - name: title
    description: PR Title
    default: Auto-Generate

---

1. Push the current branch: `git push -u origin HEAD`

2. Use the **Git MCP** to create a Pull Request:
   - Tool: `create_pull_request` (or `create_issue` if tracking first).
   - Title: `{{title}}` (or generate one from the commit history if "Auto-Generate").
   - Body: Summarize the changes in the `feat` or `fix` format. Link to any related issues.
   - Draft: False.

3. Output the link to the new PR.