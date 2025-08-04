# ZenAI Documentation Standards - Agent I/O Registry

## Overview
This document defines the Input/Output contracts for all ZenAI subagents. With our lean context management system, agents should:
1. **Start with context files** - Read domain-specific `context.md` files first
2. **Navigate to details** - Follow references from context files to detailed documentation
3. **Update contexts** - Maintain context files as work progresses

## Context Management Integration
- **Master Context**: `/context.md` - 2-minute project orientation
- **Domain Contexts**: `/docs/[domain]/context.md` - Domain-specific entry points
- **Context Usage**: See `/docs/common/context-usage-guide.md` for maintenance procedures

## Agent Input/Output Declarations

### zenmaster  
**Primary Context:**
- `/context.md` - Master project context for orientation
- `/docs/context/current/` - Current sprint status and priorities

**Inputs (Reads From):**
- `docs/architecture/context.md` → System architecture context and deliverables
- `docs/archive/*/research/` - Research Engineer deliverables (when archived)
- `docs/evaluation/` - Project assessments (typically in archives after completion)
- `docs/engineering/context.md` → Implementation progress tracking
- `docs/retrospectives/context.md` → Learning and process improvements

**Outputs (Writes To):**
**Always Create:**
- `docs/project-plan.md` - Master project plan with milestones and task tracking
- `docs/context/current/active-sprint.md` - Current sprint status updates
- `docs/context/current/recent-decisions.md` - Key decisions with rationale

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
- `docs/operations/infrastructure-setup.md` - Deployment and infrastructure requirements
- `docs/engineering/frontend/` - Frontend integration and API consumption patterns
- `docs/evaluation/performance-analysis.md` - Performance requirements and optimization targets

**Outputs (Writes To):**
- `docs/engineering/backend/` - Implementation notes, technical decisions, progress updates
- `docs/engineering/backend/api-documentation.md` - API endpoint documentation and usage examples
- `docs/engineering/backend/performance-benchmarks.md` - Performance testing results and optimization notes
- `docs/engineering/backend/integration-notes.md` - Cross-service integration documentation and troubleshooting
- `docs/architecture/` - Implementation feedback and architectural improvement suggestions (when appropriate)
- `docs/engineering/backend/database-documentation.md` - Schema design, migrations, and data access patterns
- `docs/engineering/backend/security-implementation.md` - Authentication, authorization, and security measures documentation
- `docs/engineering/backend/error-handling.md` - Error management, logging, and monitoring configuration
- Source code, tests, and technical documentation in project codebase

### frontend-engineer
**Inputs (Reads From):**
- `docs/architecture/frontend/` - Implementation specifications to follow
- `src-ui/src/lib/api-types.ts` - API interfaces to implement.Don't modify manually. Auto generated by sr-backend-engineer.
- `docs/research/` - Technology recommendations and best practices
- `docs/zenmaster/` - Task assignments and project coordination
- `docs/product/` - User stories, acceptance criteria, and business requirements
- `docs/evaluation/` - Existing project assessments and user experience audits (when available)
- Customer feedback and user research data from Customer Advocate coordination

**Outputs (Writes To):**
**Always Create:**
- `docs/engineering/frontend/implementation-notes.md` - Technical decisions, progress updates, and architecture feedback
- `docs/engineering/frontend/component-library.md` - Reusable component documentation and design system
- `docs/engineering/frontend/accessibility-compliance.md` - WCAG compliance documentation and testing results
- `docs/engineering/frontend/performance-optimization.md` - Frontend performance metrics and optimization strategies
- `docs/engineering/frontend/cross-platform-compatibility.md` - Multi-platform testing and compatibility documentation

**Create When Needed:**
- `docs/engineering/frontend/design-system.md` - Design tokens, style guides, and UI standards
- `docs/engineering/frontend/user-experience-testing.md` - Usability testing results and user feedback analysis
- `docs/engineering/frontend/platform-specific-guides/` - iOS, Android, web, and desktop implementation guides
- `docs/engineering/frontend/integration-testing.md` - Frontend-backend integration testing and API consumption
- `docs/evaluation/ux-audit.md` - User experience assessment and improvement recommendations
- Component library code, style guides, and design system assets

### devops-engineer
**Inputs (Reads From):**
- `docs/architecture/deployment-architecture.md` - Infrastructure and deployment topology specifications
- `docs/architecture/system-architecture.md` - System design requirements for infrastructure planning
- `docs/research/` - Technology recommendations and infrastructure tool validation
- `docs/zenmaster/` - Task assignments, project coordination, and deployment schedules
- `docs/engineering/backend/` - Backend service deployment requirements and API specifications
- `docs/engineering/frontend/` - Frontend hosting, CDN, and static site deployment needs
- `docs/evaluation/security-audit.md` - Security requirements and compliance specifications (when available)
- `docs/evaluation/performance-analysis.md` - Performance requirements and optimization targets (when available)
- `docs/common/` - Coding standards and quality requirements for automation scripts
- Existing infrastructure configurations and deployment pipelines

**Outputs (Writes To):**
**Always Create:**
- `docs/operations/infrastructure-setup.md` - Infrastructure-as-code implementation and configuration
- `docs/operations/deployment-pipeline.md` - CI/CD pipeline configuration and deployment procedures
- `docs/operations/environment-management.md` - Development, staging, and production environment setup
- `docs/operations/monitoring-configuration.md` - Observability, alerting, and logging system setup
- `docs/operations/incident-response.md` - Operational procedures and troubleshooting guides

**Create When Needed:**
- `docs/operations/infrastructure-audit.md` - Existing infrastructure assessment and optimization recommendations
- `docs/operations/migration-plan.md` - Infrastructure migration and modernization roadmap
- `docs/operations/automation-scripts/` - Development workflow automation, git hooks, and tooling
- `docs/operations/disaster-recovery.md` - Backup procedures, recovery plans, and business continuity
- `docs/operations/performance-optimization.md` - Infrastructure performance tuning and capacity planning
- `docs/operations/security-compliance.md` - Infrastructure security implementation and compliance documentation
- `docs/operations/cost-optimization.md` - Resource usage analysis and cost reduction strategies
- `scripts/` - Infrastructure automation, deployment scripts, and operational utilities
- Infrastructure configuration files (Terraform, Kubernetes manifests, Docker configurations)

### product-owner
**Inputs (Reads From):**
- `docs/zenmaster/` - Project coordination, task assignments, and strategic guidance
- Customer feedback, support tickets, and user behavior data from Customer Advocate coordination
- Market research, competitive analysis, and industry trend reports
- `docs/evaluation/` - Existing project assessments and user experience audits (when available)
- `docs/architecture/system-architecture.md` - Technical constraints and feasibility considerations
- `docs/research/` - Technology recommendations that impact product capabilities and timelines
- Business objectives, revenue targets, and strategic company goals from Manager coordination
- User research data, usability testing results, and accessibility requirements

**Outputs (Writes To):**
**Always Create:**
- `docs/product/product-vision.md` - Comprehensive product vision, strategy, and market positioning
- `docs/product/user-stories.md` - Detailed user stories with acceptance criteria and success metrics
- `docs/product/product-roadmap.md` - Strategic feature roadmap with priorities and release planning
- `docs/product/user-personas.md` - Target user profiles with motivations, behaviors, and needs
- `docs/product/requirements-specifications.md` - Detailed feature requirements and business rules

**Create When Needed:**
- `docs/product/market-analysis.md` - Competitive analysis, industry trends, and opportunity assessment
- `docs/product/customer-research.md` - User feedback analysis, pain point identification, and behavioral insights
- `docs/product/acceptance-criteria/` - Detailed acceptance criteria for complex features and user flows
- `docs/product/success-metrics.md` - Key performance indicators, measurement strategies, and success definitions
- `docs/product/stakeholder-communication.md` - Decision rationale, strategic updates, and alignment documentation
- `docs/product/release-planning.md` - Go-to-market coordination, feature launch planning, and customer communication
- `docs/evaluation/product-assessment.md` - Product performance evaluation and optimization recommendations
- `docs/product/backlog-prioritization.md` - Detailed backlog prioritization with rationale and impact analysis

### ux-designer
**Inputs (Reads From):**
- `docs/product/user-stories.md` - User requirements, acceptance criteria, and feature specifications
- `docs/product/user-personas.md` - Target user profiles, behaviors, and accessibility needs
- Customer feedback, user research data, and behavioral analytics from Customer Advocate coordination
- `docs/zenmaster/` - Task assignments, project coordination, and design priorities
- `docs/architecture/system-architecture.md` - Technical constraints and platform requirements for design planning
- `docs/engineering/frontend/` - Implementation capabilities and technical feasibility considerations
- `docs/research/` - Technology recommendations that impact design possibilities and platform choices
- Usability testing results, accessibility audit findings, and user behavior data
- Business objectives and brand guidelines from Manager coordination

**Outputs (Writes To):**
**Always Create:**
- `docs/design/user-experience-strategy.md` - Overall UX approach, design principles, and accessibility standards
- `docs/design/design-system.md` - Component library, design tokens, and cross-platform design standards  
- `docs/design/wireframes-mockups/` - Interface designs, user flows, and interaction specifications
- `docs/design/accessibility-compliance.md` - WCAG 2.2 implementation and inclusive design documentation
- `docs/design/user-research-findings.md` - Usability testing results, user feedback analysis, and design recommendations

**Create When Needed:**
- `docs/design/user-journey-maps.md` - End-to-end user experience documentation across all touchpoints
- `docs/design/usability-testing/` - Test plans, results, and iteration recommendations
- `docs/design/cross-platform-specifications/` - Platform-specific design guidelines for iOS, Android, web, desktop
- `docs/design/interaction-patterns.md` - Micro-interactions, animations, and feedback system specifications
- `docs/design/accessibility-testing-results.md` - Assistive technology testing and compliance validation
- `docs/design/design-specifications/` - Detailed component specs for developer handoff
- `docs/evaluation/ux-audit.md` - User experience assessment and improvement recommendations for existing products
- `docs/design/prototypes/` - Interactive prototypes and user flow demonstrations

### qa-engineer
**Inputs (Reads From):**
- `docs/product/user-stories.md` - User requirements and acceptance criteria for test case development
- `docs/product/acceptance-criteria/` - Detailed acceptance criteria for feature validation and test planning
- `docs/architecture/api-contracts.md` - API specifications for integration and contract testing
- `docs/architecture/system-architecture.md` - Technical specifications for performance testing strategy
- `docs/zenmaster/` - Task assignments, testing priorities, and quality coordination
- `docs/engineering/backend/` - Implementation details for backend service testing and API validation
- `docs/engineering/frontend/` - Frontend implementation for UI testing and user experience validation
- `docs/operations/infrastructure-setup.md` - Environment configurations for realistic performance testing
- `docs/research/` - Technology recommendations affecting testing tools and framework decisions
- Production monitoring data, user feedback, and performance metrics for quality assessment

**Outputs (Writes To):**
**Always Create:**
- `docs/testing/test-strategy.md` - Comprehensive testing approach covering functional and performance validation
- `docs/testing/test-cases.md` - Detailed test scenarios, acceptance criteria validation, and edge case coverage
- `docs/testing/automation-framework.md` - Test automation architecture, CI/CD integration, and maintenance procedures
- `docs/testing/performance-testing.md` - Load testing results, performance benchmarks, and SLA compliance validation
- `docs/testing/quality-reports.md` - Test execution results, defect analysis, and quality metrics dashboard

**Create When Needed:**
- `docs/testing/performance-benchmarks.md` - Baseline performance metrics, SLA definitions, and optimization targets
- `docs/testing/load-testing-results/` - Detailed load testing analysis, scalability validation, and bottleneck identification
- `docs/testing/defect-analysis.md` - Root cause analysis, defect trends, and quality improvement recommendations
- `docs/testing/test-data-management.md` - Test data strategies, data generation, and environment management
- `docs/testing/regression-testing.md` - Regression test suites, automated validation, and release readiness assessment
- `docs/testing/api-testing-results.md` - API validation results, integration testing, and contract compliance
- `docs/testing/cross-platform-validation.md` - Multi-platform testing results and compatibility analysis
- `docs/retrospectives/` - Testing learnings and improvements
- `.github/workflows/` - CI/CD test automation
- `Makefile` - Test automation commands

## Context Management Notes

### Document Lifecycle
1. **Active Documents** - Live in their domain directories
2. **Completed Work** - Moves to `/docs/archive/` with descriptive folder names
3. **Evolution Tracking** - Major decisions tracked in `/docs/context/evolution/`
4. **Retrospectives** - Learnings captured in `/docs/retrospectives/`

### Best Practices
- Start by reading relevant context files before detailed documents
- Update context files as work progresses
- Archive completed deliverables to maintain clarity
- Use evolution chains to track major decision changes
- Reference the context usage guide for maintenance procedures

### Key Context Files
- `/context.md` - Master project context (2-minute read)
- `/docs/[domain]/context.md` - Domain-specific entry points
- `/docs/context/current/` - Current sprint and priorities
- `/docs/context/foundation/` - Stable architecture patterns
- `/docs/context/evolution/` - Decision history and rationale

