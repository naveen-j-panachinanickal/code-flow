# Contributing to Quality Code

First off, thank you for considering contributing to Quality Code! It's people like you that make this tool great. 

## Code of Conduct

By participating in this project, you are expected to uphold our [Code of Conduct](./CODE_OF_CONDUCT.md).

## How Can I Contribute?

### Reporting Bugs
This section guides you through submitting a bug report. Following these guidelines helps maintainers and the community understand your report, reproduce the behavior, and find related reports.

* Use the GitHub Issue search to see if the bug has already been reported.
* Provide a clear and descriptive title for the issue.
* Describe the exact steps guaranteed to reproduce the behavior.
* Provide the repository URL or the code snippet you were analyzing when the bug occurred.

### Suggesting Enhancements
Enhangement suggestions are tracked as GitHub issues. When creating an enhancement request, please:

* Use a clear and descriptive title.
* Provide a step-by-step description of the suggested enhancement in as many details as possible.
* Explain why this enhancement would be useful to most users.

### Pull Requests
The process described here has several goals:
* Maintain Quality Code's quality
* Fix problems that are important to users
* Engage the community in working toward the best possible code visualizer

1. **Fork the repo** and create your branch from `dev`.
2. **Read `docs/LOCAL_DEVELOPMENT.md`** to set up your environment and obtain GitHub tokens.
3. **If you've added code**, you must add new AST tests or verify existing functionality doesn't break.
4. **Ensure the test suite passes** (if applicable) and the code builds via `npm run build`.
5. **Issue that pull request!**

## Styleguides

### Git Commit Messages
* Use the present tense ("Add feature" not "Added feature")
* Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
* Limit the first line to 72 characters or less
* Reference issues and pull requests liberally after the first line (e.g. `Fixes #34`)

### TypeScript Styleguide
* Please use `interface` over `type` when possible.
* Ensure all functions and variables are strongly typed (avoid using `any` unless absolutely necessary).
* No unused variables (`npm run lint` will catch these).

Thank you for contributing!
