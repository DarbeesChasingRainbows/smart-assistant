---
auto_execution_mode: 1
---
description: Stages changes and commits with a Conventional Commit message
variables:
  - name: message
    description: (Optional) Context for the commit
    default: ""

---

1. Run `git diff --cached`. If empty, run `git add .` and `git diff --cached`.

2. Analyze the changes. Generate a specific "Conventional Commit" message (e.g., `feat(garage): add battery indicator`).
   - Rule: Use standard prefixes (feat, fix, chore, style, refactor).
   - Rule: Keep the first line under 50 chars.

3. Ask the user: "I propose this commit message. Shall I proceed?"
   - Proposed Message: `[Generated Message]`

4. If confirmed, run: `git commit -m "[Generated Message]"`