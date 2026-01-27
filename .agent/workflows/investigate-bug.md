---
description: Systematically investigate a reported bug or issue
---

This workflow guides the agent through a structured debugging process to identify root causes effectively.

# Workflow Steps

1. **Context Gathering**
   - Understand the reported issue. Ask the user for specific error messages, reproduction steps, or the specific behavior loop (e.g., "Menu not showing").
   - Create a temporary investigation note: `docs/investigation_log.md`.

2. **Codebase Search**
   - specific keywords related to the bug in `src/` using `grep_search`.
   - Example: if "filter" is broken, search for `filter`, `hide`, `display`.
   - Example: if "menu" is missing, search for `registerMenuCommand`, `GM_register`.

3. **Change History Analysis**
   - Identify when the bug likely started.
   - Run `git log -p -n 10 src/` on relevant files to see recent changes.
   - Check if any "refactoring" or "optimization" commits touched the suspect logic.

4. **Hypothesis Generation**
   - Based on code and history, formulate a hypothesis.
   - Write this hypothesis into `docs/investigation_log.md`.

5. **Verification (Manual or Automated)**
   - If possible, create a minimal reproduction script or identify which function is failing.
   - Suggest console logs to inject for debugging if the issue is reproducible locally or requires user testing.

6. **Action Plan**
   - Propose a fix based on the findings.
   - Transition to `Step 2` of the `openspec-apply` workflow or simply apply the fix if trivial (using `fix:` commit).
