# Agent Instructions & Guidelines

These instructions define the personalized workflow and rules for AI agents working on this project.

## 1. Git & Version Control
*   **Branching**: Always commit your progress to the `development` branch.
*   **Commits**: You can freely decide when to make a commit, but it must be done regularly as progress is made, Avoid "mega-commits".
*   **Commit Format**: Messages must be clear, concise, and informative following this structured format:
    *   `<type>: <description>`
    *   *Types*: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`.
    *   *Example*: `feat: add user authentication`
    *   *Example*: `chore: setup docker compose infrastructure`

## 2. Testing
*   **Test Before Commit**: Always test the code before making a commit. 
*   *Infrastructure*: Ensure `docker compose up` command is successful builds and all containers are running without errors if infrastructure are made.
*   *Code*: Ensure Python/TypeScript scripts execute without errors. Run the relevent test suit (e.g., `pytest` for Python, `vitest` for TypeScript) if exist. If not exist or not runable, create one for each relevant components.

## 3. Documentation
*   **Keep Documentation Updated**: Ensure all documentation is updated to reflect any changes made to the code.
*   **Update README**: Update `README.md` file to reflect any changes made to the project.

## 4. Workflow
*   **Plan Before Implementation**: Always plan the implementation before writing code. Draw diagrams, write pseudo-code, and plan the architecture.
