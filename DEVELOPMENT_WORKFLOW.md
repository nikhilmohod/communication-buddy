# Development Workflow

This document is a global, repository-independent workflow. It is mandatory for every developer and AI coding agent working in this repository, and it can be reused unchanged in other projects.

Every piece of development work follows this lifecycle, in order:

```text
Understand
→ Architecture
→ Design
→ Developer Approval (when required)
→ Implementation
→ Validation
→ Regression Review
→ Manual Source Control Review
→ Explicit Commit/Push
```

Do not skip or reorder steps. Small, isolated changes may use a lightweight version of steps 2–4, but never skip Understand, Validation, or Source Control Review.

---

## 1. Understand

Before changing anything:

1. Restate the requirement and confirm it is clear. Ask if it is ambiguous.
2. Inspect the existing implementation. Never implement based on assumptions.
3. Identify everything the change could touch:
   - frontend
   - backend
   - APIs
   - database
   - external services
   - authentication and authorization
   - caching
   - deployment and configuration
   - tests
4. Read existing documentation and existing tests.
5. Identify existing business logic and behavior that could be affected.
6. Check the current Source Control state (see section 11).

If existing behavior is unclear, stop and ask. Do not guess.

## 2. Architecture

For any non-trivial feature (anything beyond a small isolated change), inspect the existing architecture first, then define the proposed one. Document:

- Current architecture
- Proposed architecture
- Data flow
- Component and service boundaries
- API flow
- Database impact
- External service impact
- Authentication/authorization impact
- Caching impact
- Error-handling flow
- Deployment impact

Reuse the existing architecture where appropriate. Introduce new layers, patterns or dependencies only when the requirement cannot reasonably be met without them.

Generic example (do not assume it applies to every project):

```text
User
→ UI
→ API
→ Application Service
→ Domain/Business Logic
→ Database / External Provider
→ Response
→ UI
```

Describe the real flow of this project, which may have fewer, more, or different layers than the example.

## 3. Design

Turn the architecture into a concrete plan:

- List the files and modules to add or change.
- Define interfaces, request/response shapes, schemas and contracts.
- Define error cases, edge cases and failure behavior.
- Define the tests that will prove the change works.
- Prefer the smallest design that satisfies the requirement.
- Avoid unnecessary refactoring. Do not restructure, rename or reformat code unrelated to the requirement.
- Protect existing business logic and behavior. Changes must be backward compatible unless the requirement says otherwise.

## 4. Developer Approval

Stop and ask for explicit developer approval before implementation when the change is significant, including:

- Architecture changes
- Changes to existing business logic or behavior
- Database schema changes or data migrations
- Breaking API or contract changes
- New external services or major dependencies
- Authentication/authorization changes
- Anything destructive or hard to reverse
- Anything where existing behavior is uncertain

Present the architecture and design, the impact, the risks and any alternatives. Wait for a clear answer. Approval for one change does not extend to other changes.

For small, low-risk changes, state the plan briefly and proceed.

## 5. Implementation

- Implement the smallest change that satisfies the approved design.
- Follow the existing code style, naming, structure and patterns.
- Do not modify unrelated code, files or formatting.
- Do not add speculative features, abstractions or configuration.
- Never hard-code secrets or credentials.
- If the work turns out to need something beyond the approved design, stop and return to section 4.

## 6. Validation

Run the relevant checks for what was changed:

- Existing and new automated tests
- Linting, type checking and build
- Manual verification of the changed behavior where practical

Report exactly what was run and what the results were. If a check fails, report the failure with its output. If a check could not be run, say so and why. Never claim success that was not verified.

## 7. Regression Review

Review the change against existing behavior:

- Re-read the diff for unintended changes.
- Confirm existing business logic and behavior are preserved.
- Check callers, consumers, contracts and configuration affected by the change.
- Check error handling, edge cases, security and performance impact.
- Confirm tests cover the change and that existing tests still pass.

Fix problems found, then re-validate.

## 8. Source Control Review

After implementation, validation and regression review:

1. Show the exact files changed (added, modified, deleted).
2. Summarize the change for each file.
3. **STOP** and wait for the developer to manually review Source Control.

Do not stage, commit, push or otherwise finalize anything during this step.

## 9. Git Commit and Push

Git write operations happen only after explicit developer instruction, and only the operation that was requested.

- NEVER automatically commit.
- NEVER automatically push.
- NEVER automatically merge, rebase, reset or force-push.
- A request to commit is not a request to push. A request to push is not a request to merge.
- Commit only the files the developer names or approves. Do not include unrelated changes.
- Use a clear commit message that describes what changed and why.
- Never bypass hooks or checks unless the developer explicitly instructs it.

## 10. Deployment

- NEVER automatically deploy.
- Deploy only after explicit developer instruction for that specific deployment and environment.
- Before a deployment is requested, list its impact: configuration, environment variables, migrations, and rollback approach.

## 11. Handling Existing/Uncommitted Changes

- At the start of work, check the Source Control state and note any existing uncommitted changes.
- Never discard, overwrite, stash, reset or revert unrelated uncommitted work.
- Do not mix unrelated existing changes into your work, and keep your changes distinguishable from them.
- If existing uncommitted changes overlap with the files you need to edit, stop and ask how to proceed.
- If a destructive action seems necessary, stop and ask.

## 12. Database/API/External-Service Changes

Treat these as high-risk and handle them with extra care:

- **Database:** Schema changes and migrations require developer approval. Migrations must be reversible or have a documented rollback. Never run migrations or modify data in shared or production environments without explicit instruction.
- **APIs:** Preserve backward compatibility for existing consumers. Document any request/response, versioning or contract change and get approval for breaking changes.
- **External services:** Identify rate limits, failure modes, timeouts, retries, cost and data-privacy implications. Use test or sandbox environments for validation. Never call production external services with side effects during development without explicit instruction.
- **Authentication/authorization and caching:** Confirm the change does not weaken access control or serve stale or cross-user data.

## 13. Final Development Report

When work is complete, report:

- What was requested
- What was implemented and how it maps to the design
- Exact files changed
- Validation performed and its results, including anything failing or not run
- Regression review findings
- Risks, assumptions and open questions
- Confirmation that nothing was committed, pushed, merged or deployed
- That the work is ready for manual Source Control review

## 14. Absolute Rules

1. Understand the existing code before making changes.
2. Never implement based on assumptions.
3. For non-trivial features, inspect the existing architecture first and define the proposed architecture and data flow before implementation.
4. Reuse existing architecture where appropriate and avoid unnecessary refactoring.
5. Protect existing business logic and behavior.
6. For significant architecture or business-logic changes, stop and ask for developer approval before implementation.
7. Implement the smallest required change.
8. Run relevant tests and validation, then perform a regression review.
9. Show the exact files changed.
10. NEVER automatically commit.
11. NEVER automatically push.
12. NEVER automatically merge, rebase, reset or force-push.
13. NEVER automatically deploy.
14. Git operations happen only after explicit developer instruction.
15. Never discard unrelated uncommitted work.
16. If uncertain about existing behavior or a potentially destructive change, stop and ask.

**After implementation and validation, the AI/developer must STOP and wait for the developer to manually review Source Control. Commit/push/deployment must happen only after explicit developer instruction.**
