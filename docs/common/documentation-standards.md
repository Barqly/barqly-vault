# ZenAI Documentation Standards - Agent I/O Registry

## Agent Input/Output Declarations

### zenmaster  
**Inputs (Reads From):**
- `docs/architecture/` - System Architect deliverables for review
- `docs/research/` - Research Engineer deliverables for review
- `docs/evaluation/` - All agent assessments for coordination
- `docs/engineering/*/` - Implementation progress from all engineering agents
- `docs/retrospectives/` - Learning and process improvements

**Outputs (Writes To):**
**Always Create:**
- `docs/project-plan.md` - Master project plan with milestones and task tracking
- `docs/zenmaster/quality-reviews.md` - Deliverable assessments and approval status
- `docs/zenmaster/team-coordination.md` - Subagent handoffs and dependencies
- `docs/zenmaster/progress-dashboard.md` - Current status and upcoming deadlines
- `docs/zenmaster/decision-log.md` - Key decisions with rationale

**Create When Needed:**
- `docs/zenmaster/existing-project-baseline.md` - For existing project engagement
- `docs/zenmaster/integration-roadmap.md` - ZenAI adoption plan
- `docs/zenmaster/risk-register.md` - Risk identification and mitigation
- `docs/zenmaster/retrospective-sessions/` - Learning capture and improvements
- `docs/common/` - Updates to shared standards and processes
- `docs/retrospectives/` - Retrospective facilitation and learning capture

### system-architect
**Inputs (Reads From):**
- `docs/research/` - Technology recommendations and stack validation
- `docs/product/` - Business requirements and user personas  
- `docs/zenmaster/` - Project coordination and quality standards
- `docs/evaluation/` - Existing project assessments (when available)

**Outputs (Writes To):**
**Always Create:**
- `docs/architecture/system-architecture.md` - High-level design, diagrams, component responsibilities
- `docs/architecture/api-contracts.md` - Interface definitions between modules
- `docs/architecture/data-architecture.md` - Database schemas, data flow, storage strategies
- `docs/architecture/deployment-architecture.md` - Infrastructure and deployment topology
- `docs/architecture/adr/` - Architectural Decision Records folder with decision history
- `CONTRIBUTING.md` - Development setup, standards, and workflow guidelines
- `README.md` - Project overview, setup instructions, architecture summary

**Create When Needed:**
- `docs/architecture/specs/backend/{module|feature}-tech-spec.md` - Detailed backend implementation specifications
- `docs/architecture/specs/frontend/{component|feature}-spec.md` - Detailed frontend implementation specifications
- `configs/` - Development tooling configurations
- `templates/` - Code templates and boilerplate generators
- `scripts/` - Development automation and utility scripts
- `docs/architecture/coding-standards.md` - Language-specific conventions
- `docs/architecture/testing-strategy.md` - Testing approach and frameworks
- `docs/architecture/security-guidelines.md` - Security standards and checklists

**For Existing Project Evaluation:**
- `docs/evaluation/architecture-assessment.md` - Current state analysis and architectural review
- `docs/evaluation/refactoring-roadmap.md` - Prioritized improvement plan with effort estimates
- `docs/evaluation/technical-debt-analysis.md` - Issues inventory and remediation strategies
- `docs/evaluation/quick-wins.md` - Low-effort, high-impact improvements for immediate implementation
- `docs/evaluation/technology-stack-review.md` - Current stack assessment and upgrade recommendations
- `docs/evaluation/security-audit.md` - Security vulnerabilities and improvement recommendations
- `docs/evaluation/performance-analysis.md` - Performance bottlenecks and optimization opportunities

### research-engineer
**Inputs (Reads From):**
- `docs/architecture/` - System requirements for technology validation
- `docs/zenmaster/` - Research assignments and coordination
- Existing codebase - For technology stack audits

**Outputs (Writes To):**
**Always Create:**
- `docs/research/technology-analysis.md` - Comprehensive technology evaluation with recommendations
- `docs/research/stack-validation.md` - Validation results for proposed or existing technology choices
- `docs/research/version-recommendations.md` - Specific version recommendations with rationale
- `docs/research/compatibility-assessment.md` - Integration and compatibility analysis
- `docs/research/security-evaluation.md` - Security implications and vulnerability assessment

**Create When Needed:**
- `docs/research/existing-stack-audit.md` - Complete audit of existing project technology
- `docs/research/upgrade-roadmap.md` - Prioritized upgrade plan with timelines and effort estimates
- `docs/research/alternative-analysis.md` - Comparison of alternative technology options
- `docs/research/proof-of-concept/` - Working examples and integration tests
- `docs/research/performance-benchmarks.md` - Performance testing results and analysis
- `docs/research/migration-guide.md` - Step-by-step migration instructions
- `docs/research/risk-assessment.md` - Risk analysis for technology adoption decisions
- `docs/evaluation/` - Technology stack assessments and upgrade roadmaps (when evaluating existing projects)

### backend-engineer
**Inputs (Reads From):**
- `docs/architecture/specs/backend/` - Implementation specifications to follow
- `docs/architecture/api-contracts.md` - API interfaces to implement
- `docs/research/` - Technology recommendations and best practices
- `docs/zenmaster/` - Task assignments and project coordination
- `docs/common/rust-coding-standards.md` - Language-specific coding patterns and conventions
- `docs/common/rust-quality-standards.md` - Testing, CI/CD, and quality gate requirements
- `docs/evaluation/security-audit.md` - Security requirements and vulnerability assessments (when available)
- `docs/product/` - Business requirements and user story acceptance criteria

**Outputs (Writes To):**
- `docs/engineering/backend/` - Implementation notes, technical decisions, progress updates
- `docs/engineering/backend/api-documentation.md` - API endpoint documentation and usage examples
- `docs/engineering/backend/performance-benchmarks.md` - Performance testing results and optimization notes
- `docs/engineering/backend/integration-notes.md` - Cross-service integration documentation and troubleshooting
- `docs/architecture/` - Implementation feedback and architectural improvement suggestions (when appropriate)
- Source code, tests, and technical documentation in project codebase

### frontend-engineer
**Inputs (Reads From):**
- `docs/architecture/specs/frontend/` - Implementation specifications to follow
- `docs/architecture/api-contracts.md` - API interfaces to implement
- `docs/research/` - Technology recommendations and best practices

**Outputs (Writes To):**
- `docs/engineering/frontend/` - Implementation notes, technical decisions, progress updates