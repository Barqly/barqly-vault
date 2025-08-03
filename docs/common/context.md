# Common Context

## Purpose
The Common domain establishes the foundational standards, processes, and coordination protocols that enable effective Agent-Driven Development (ADD) across the entire project. It serves as the operating system for team collaboration, quality assurance, and knowledge management.

## Key Concepts

### Agent-Driven Development (ADD)
A paradigm shift where specialized AI agents handle domain-specific tasks under human orchestration, with documents serving as "executable intent" for consistent decision-making across handoffs.

### Context Management Strategy
A systematic solution to the "Context Reconstruction Problem" - transforming static documentation into an intelligent, evolving system that reduces context reconstruction time from 25-35 minutes to under 2 minutes.

### ZenAI Framework
Our implementation of ADD featuring 13 specialized personas (1 human Manager + 12 AI SubAgents) orchestrated through ZenMaster, with clear I/O contracts and quality gates.

### Living Documentation
Documents treated with the same rigor as source code - version controlled, quality-gated, tested, and actively maintained to prevent documentation rot.

## Essential Knowledge

### Core Team Structure
- **Manager (Human)**: Strategic oversight and approval gates
- **ZenMaster (AI)**: Primary orchestrator routing tasks and enforcing quality
- **11 Specialist SubAgents**: Domain experts from architecture to documentation

### Quality Standards Hierarchy
1. **Rust Backend Standards**
   - Idiomatic patterns with ownership/borrowing best practices
   - Security-first with `zeroize` for sensitive data
   - >80% test coverage for security-critical code
   - Performance targets: >10MB/s encryption, <200MB memory
   - Validation: `make validate-rust` before commits

2. **Definition of Done**
   - Code review completed and approved
   - All tests passing with appropriate coverage
   - Documentation updated (API, user guides)
   - Security validation passed
   - Performance benchmarks met

3. **Documentation as Code**
   - Clear I/O contracts for each agent
   - Hierarchical organization (max 2-3 levels)
   - Hybrid content+references approach
   - Evolution chains preserving decision rationale

### Agent Coordination Protocol
Each agent declares specific inputs/outputs:
- **Reads From**: Source documents and dependencies
- **Writes To**: Deliverables and status updates
- **Quality Gates**: Review checkpoints before handoffs
- **Handoff Pattern**: ZenMaster orchestrates all transitions

### Context Management Architecture
```
context.md (2-3 min read entry point)
docs/
    |-context/
        ├── current/ (active work)
        ├── foundation/ (stable patterns)  
        ├── archive/ (decision history)
        └── references/ (detailed specs)
```

## Document Index

### Foundational Documents
- **[context-rituals-standards.md](context-rituals-standards.md)** - Comprehensive context management strategy and ADD framework design (498 lines)
- **[documentation-standards.md](documentation-standards.md)** - Complete agent I/O registry with detailed input/output contracts for all 13 personas (263 lines)
- **[subagent_personas.md](subagent_personas.md)** - Quick reference guide to all ZenAI team members and their responsibilities (78 lines)

### Rust Development Standards
- **[rust-coding-standards.md](rust-coding-standards.md)** - Idiomatic Rust patterns, error handling, async patterns, and project organization (476 lines)
- **[rust-quality-standards.md](rust-quality-standards.md)** - Testing strategy, CI/CD requirements, performance monitoring, and quality metrics (368 lines)
- **[rust-security-standards.md](rust-security-standards.md)** - Security patterns and vulnerability prevention (currently empty - to be populated)

### Process Documents (To Be Created)
- **collaboration-protocols.md** - Team collaboration and communication patterns (currently empty)
- **definition-of-done.md** - Completion criteria and quality checkpoints (currently empty)

## Cross-Domain Dependencies

### Architecture Domain
- System Architect creates specifications that all engineers consume
- Architecture decisions flow into coding standards and quality requirements
- API contracts define integration points between frontend/backend

### Engineering Domain  
- Implementation feedback influences architecture refinements
- Test results inform quality standard adjustments
- Performance data drives optimization priorities

### Product Domain
- User stories and acceptance criteria guide all development
- Product roadmap influences architecture and technology choices
- Customer feedback loops through multiple agent workflows

### Operations Domain
- Infrastructure requirements constrain architecture decisions
- CI/CD pipelines enforce quality standards automatically
- Monitoring data informs performance and security standards

## Migration Status
This context.md represents Phase 1 of our bottom-up migration strategy, synthesizing 8 documents from the Common domain into a unified, discoverable knowledge base while preserving detailed references for deep dives.

## Usage Guidelines

### For New Team Members
1. Start with this context.md for 2-minute overview
2. Review subagent_personas.md to understand team structure
3. Check documentation-standards.md for your role's I/O contract
4. Dive into specific standards as needed for your tasks

### For Active Development
1. Reference rust-coding-standards.md during implementation
2. Validate against rust-quality-standards.md before commits
3. Update relevant sections through ZenMaster coordination
4. Preserve decision rationale in evolution chains

### For Quality Assurance
1. Use definition-of-done criteria for acceptance
2. Run `make validate` for comprehensive checks
3. Document findings in appropriate agent outputs
4. Escalate blockers through ZenMaster

---

*Context last updated: 2025-01-03 | Domain: Common | Migration Phase: 1*