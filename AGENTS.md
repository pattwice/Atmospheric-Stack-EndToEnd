# Agent Instructions & Guidelines

These instructions define the personalized workflow and rules for AI agents working on this project.

## 1. Git & Version Control
*   **Branching**: Always commit your progress to the `development` branch.
*   **Commits**: You can freely decide when to make a commit, but it must be done regularly as progress is made.
*   **Commit Format**: Messages must be clear, concise, and informative following this structured format:
    *   `<type>: <description>`
    *   *Types*: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`.
    *   *Example*: `feat: add user authentication`
    *   *Example*: `chore: setup docker compose infrastructure`

## 2. Testing
*   **Test Before Commit**: Always test the code before making a commit. 
*   *Infrastructure*: Verify Docker containers run successfully.
*   *Code*: Ensure Python/TypeScript scripts execute without errors.
