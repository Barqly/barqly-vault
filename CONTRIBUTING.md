# Contributing to Barqly Vault

👋 Thanks for your interest in contributing!  
Barqly Vault is in **alpha stage**, and we welcome feedback, testing, and pull requests.

## How to contribute

- **Bugs / Issues**: Please use [GitHub Issues](../../issues) to report bugs or request features.  
  - For security vulnerabilities, **do not open a public issue**. Instead, see [SECURITY.md](SECURITY.md).

- **Pull Requests**:  
  1. Fork the repo and create a branch from `main`.  
  2. Make your changes (keep commits focused).  
  3. Ensure the app builds locally (`cargo build` or `npm build`, depending on component).  
  4. Open a Pull Request using the provided template.

- **Code style**: Keep code simple and readable. Add comments where helpful.  
- **Documentation**: Update the README or docs if your change affects usage.

## Development Approach

This project uses AI Driven Development (ADD) while remaining fully accessible to all contributors:

### With AI Tools (Enhanced ADD Experience)
- **Context-rich documentation** enables AI agents to understand project state instantly
- **Structured decision tracking** allows AI to maintain context across development sessions
- **Domain organization** helps AI focus on specific areas of expertise
- **Definition of Done** framework ensures AI agents maintain documentation standards

### Without AI Tools (Traditional Development)
- **Clear documentation** provides excellent onboarding for human developers
- **Comprehensive guides** in `docs/engineering/` cover all setup and development processes
- **Standard workflows** - all commands work with traditional tools (make, npm, cargo)
- **Well-organized codebase** follows conventional patterns and best practices

### Documentation Structure (Benefits Everyone)
- `docs/context/` - Project state and decisions (useful for both humans and AI)
- `docs/engineering/` - Development setup, standards, and workflows
- `docs/architecture/` - System design and technical decisions
- `docs/common/` - Quality standards and development protocols

**Whether you use AI Driven Development or traditional approaches, you'll find comprehensive guidance for contributing effectively.**

## Getting started

For development setup instructions, see [docs/engineering/getting-started.md](docs/engineering/getting-started.md).

- macOS build is currently the most tested.  
- Windows & Linux builds are in-progress — testing and feedback here are especially valuable!  

## License
By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
