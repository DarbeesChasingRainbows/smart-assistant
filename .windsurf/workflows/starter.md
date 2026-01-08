---
auto_execution_mode: 1
---
description: Starts a new task with standard Trunk-Based naming
variables:
  - name: type
    description: Is this a feature or a bug?
    default: AskUser
    options:
      - feature
      - bug
  - name: name
    description: Short name (kebab-case) like 'inventory-grid'
    default: AskUser

---

1. Ask user for `type` and `name` if not provided.

2. Construct the branch name:
   - If `type` is "feature", use `feat/{{name}}`.
   - If `type` is "bug", use `fix/{{name}}`.

3. Execute Terminal Command:
   - `git checkout main`
   - `git pull origin main`
   - `git checkout -b [BranchName]`

4. Confirmation:
   - "Switched to branch [BranchName]. Ready to build."