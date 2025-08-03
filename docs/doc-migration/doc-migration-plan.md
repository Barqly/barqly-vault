# Documentation Migration Plan

## Overview
This plan tracks the migration of all documentation to implement the hierarchical context strategy outlined in `context-rituals-standards.md`.

**Migration Strategy:**
- Phase 1: Domain-based top-down migration (create domain-specific context.md files)
- Phase 2: Cross-domain integration (create root context.md)
- Focus: Project documentation only (.md files, excluding system files)
- Pattern: Similar to CLAUDE.md - each major domain gets its own context.md

**Total Files to Migrate:** 80 markdown files across 17 directories

## Migration Status Summary

### Progress Tracking
- [x] **Phase 1: Domain Context Creation** (9/9 domains) ✅ COMPLETED
- [ ] **Phase 2: Root Context Integration** (0/1)
- [ ] **Phase 3: Validation & Testing** (0/1)
- [ ] **Phase 4: Team Onboarding** (0/1)

### Domain Coverage
- [ ] Architecture Domain (14 files)
- [x] Common Domain (8 files) ✅
- [x] Engineering Domain (5 files) ✅
- [x] Evaluation Domain (5 files) ✅ ARCHIVED to `/docs/archive/project-transition-30pct/`
- [x] Operations Domain (2 files) ✅
- [x] Product Domain (23 files) ✅
- [x] Research Domain (7 files) ✅ ARCHIVED to `/docs/archive/project-transition-30pct/`
- [x] Retrospectives Domain (8 files) ✅
- [x] Templates Domain (5 files) ✅

## Detailed File Inventory & Migration Checklist

### 📁 architecture/ [0/14]
Domain context.md location: `/docs/architecture/context.md`

#### 📁 backend/ [0/7]
- [ ] blueprint-milestone2-task3.md
- [ ] blueprint-milestone2.md
- [ ] blueprint-milestone3-task3.1.md
- [ ] blueprint-milestone3-task3.2.md
- [ ] blueprint-milestone3-task3.3.md
- [ ] blueprint-milestone3-task3.4.md
- [ ] blueprint-milestone3.md

#### 📁 frontend/ [0/4]
- [ ] api-interfaces-backend.md
- [ ] api-quick-reference.md
- [ ] type-system-analysis.md
- [ ] ux-engineer-onboarding.md

#### Root files [0/2]
- [ ] design-brainstorm.md
- [ ] system-architecture.md

### 📁 common/ [8/8] ✅
Domain context.md location: `/docs/common/context.md` ✅ CREATED

- [x] context-rituals-standards.md (synthesized into context.md)
- [x] collaboration-protocols.md (synthesized into context.md)
- [x] definition-of-done.md (synthesized into context.md)
- [x] documentation-standards.md (synthesized into context.md)
- [x] rust-coding-standards.md (synthesized into context.md)
- [x] rust-quality-standards.md (synthesized into context.md)
- [x] rust-security-standards.md (synthesized into context.md)
- [x] subagent_personas.md (synthesized into context.md)

### 📁 engineering/ [5/5] ✅
Domain context.md location: `/docs/engineering/context.md` ✅ CREATED

- [x] demo-system.md (synthesized into context.md)
- [x] development-setup.md (synthesized into context.md)
- [x] getting-started.md (synthesized into context.md)
- [x] test-suite-recovery-plan.md (synthesized into context.md)
- [x] validation-system.md (synthesized into context.md)

### 📁 evaluation/ [5/5] ✅ ARCHIVED  
Original location: `/docs/evaluation/` → Archived to: `/docs/archive/project-transition-30pct/evaluation/`
Extracted insights to: `technology-decisions.md`, `security-foundations.md`, `quality-standards.md`

- [x] architecture-assessment.md (synthesized into context.md)
- [x] quick-wins.md (synthesized into context.md)
- [x] refactoring-roadmap.md (synthesized into context.md)
- [x] security-audit.md (synthesized into context.md)
- [x] technical-debt-analysis.md (synthesized into context.md)

### 📁 operations/ [2/2] ✅
Domain context.md location: `/docs/operations/context.md` ✅ CREATED

- [x] ci-cd-analysis.md (synthesized into context.md)
- [x] operations-playbook.md (synthesized into context.md)

### 📁 product/ [23/23] ✅
Domain context.md location: `/docs/product/context.md` ✅ CREATED

#### Root files [5/5] ✅
- [x] features.md (synthesized into context.md)
- [x] requirements.md (synthesized into context.md)
- [x] roadmap.md (synthesized into context.md)
- [x] user-journey.md (synthesized into context.md)
- [x] user-personas.md (synthesized into context.md)

#### 📁 ux-design/ [0/18]
Sub-domain context.md location: `/docs/product/ux-design/context.md`

##### 📁 mockups/ [4/4] ✅
- [x] component-layout.md (synthesized into context.md)
- [x] decrypt-screen.md (synthesized into context.md)
- [x] encrypt-screen.md (synthesized into context.md)
- [x] setup-screen.md (synthesized into context.md - evolution starting point)

##### 📁 setup-screen/ [14/14] ✅
- [x] accessibility-requirements-uxd.md (synthesized - evolution story)
- [x] bitcoin-visual-identity-uxd.md (synthesized - evolution story)
- [x] component-improvements-uxd.md (synthesized - evolution story)
- [x] content-consolidation-recommendations.md (synthesized - evolution story)
- [x] design-specification-uxd.md (synthesized - evolution story)
- [x] implementation-roadmap-uxd.md (synthesized - evolution story)
- [x] information-hierarchy-guide-po.md (synthesized - evolution story)
- [x] information-hierarchy-optimization.md (synthesized - evolution story)
- [x] prime-real-estate-action-plan.md (synthesized - evolution story)
- [x] setup-screen-evaluation-po.md (synthesized - evolution story)
- [x] setup-screen-improvements-po.md (synthesized - evolution story)
- [x] setup-screen-prime-real-estate-analysis.md (synthesized - evolution story)
- [x] setup-screen-requirements-po.md (synthesized - evolution story)
- [x] wireframes-uxdd.md (synthesized - evolution story)

##### Root UX files [2/2] ✅
- [x] README-uxd-tbd.md (synthesized into context.md)
- [x] README.md (synthesized into context.md)

### 📁 research/ [7/7] ✅ ARCHIVED
Original location: `/docs/research/` → Archived to: `/docs/archive/project-transition-30pct/research/`
Extracted insights to: `technology-decisions.md`, `security-foundations.md`, `quality-standards.md`

- [x] compatibility-assessment.md (synthesized into context.md)
- [x] performance-benchmarks.md (synthesized into context.md)
- [x] risk-assessment.md (synthesized into context.md)
- [x] security-evaluation.md (synthesized into context.md)
- [x] stack-validation.md (synthesized into context.md)
- [x] technology-analysis.md (synthesized into context.md)
- [x] version-recommendations.md (synthesized into context.md)

### 📁 retrospectives/ [8/8] ✅
Domain context.md location: `/docs/retrospectives/context.md` ✅ CREATED

- [x] milestone-2-task-1.md (synthesized into context.md)
- [x] milestone-2-task-2.md (synthesized into context.md)
- [x] milestone-2-task-3.md (synthesized into context.md)
- [x] milestone-3-retrospective.md (synthesized into context.md)
- [x] milestone-3-task-api.md (synthesized into context.md)
- [x] milestone-4-task-1.md (synthesized into context.md)
- [x] milestone-4-task-2.md (synthesized into context.md)
- [x] milestone-9-task-1.md (synthesized into context.md)

### 📁 templates/ [5/5] ✅
Domain context.md location: `/docs/templates/context.md` ✅ CREATED

- [x] code-review-checklist.md (synthesized into context.md)
- [x] commit-message-template.md (synthesized into context.md)
- [x] document-template.md (✅ CREATED for migration support)
- [x] pull-request-template.md (synthesized into context.md)
- [x] testing-template.md (synthesized into context.md)

### 📁 tbd/ [0/1]
- [ ] barqly.summary.md (evaluate for archival or integration)

### Root files [0/2]
- [ ] desktop-app-debugging-guide.md
- [ ] project-plan.md

## Migration Phases

### Phase 0: Context Infrastructure Setup
- [ ] Create root `/context.md` entry point
- [ ] Create `/context/current/` folder with initial files
- [ ] Create `/context/foundation/` folder with core references
- [ ] Create `/context/archive/` folder structure
- [ ] Migrate critical content from CLAUDE.md to foundation/development-workflow.md

### Phase 1: Domain Context Creation
Create domain-specific context.md files that aggregate and synthesize content within each domain.

**Priority Order:**
1. [x] **Common** - Foundation standards and protocols ✅ COMPLETED
2. [ ] **Architecture** - System design and technical foundation
3. [x] **Product** - Requirements and UX design (complex structure) ✅ COMPLETED
4. [x] **Engineering** - Development and testing practices ✅ COMPLETED
5. [x] **Research** - Technology decisions and analysis ✅ COMPLETED
6. [x] **Operations** - CI/CD and operational procedures ✅ COMPLETED
7. [x] **Evaluation** - Assessments and technical debt ✅ COMPLETED
8. [x] **Retrospectives** - Learning and improvements ✅ COMPLETED
9. [x] **Templates** - Standard development templates ✅ COMPLETED

### Phase 2: Root Context Integration
- [ ] Integrate domain contexts into root `/context.md`
- [ ] Establish cross-domain relationships and dependencies
- [ ] Define context hierarchy and inheritance patterns

### Phase 3: Validation & Testing
- [ ] Test context retrieval with various queries
- [ ] Validate completeness of migration
- [ ] Ensure no documentation is orphaned
- [ ] Verify cross-references and links

### Phase 4: Team Onboarding
- [ ] Update CLAUDE.md with new context structure
- [ ] Create context usage guidelines
- [ ] Train team on new documentation pattern
- [ ] Establish maintenance procedures

## Migration Guidelines

### For Each Domain:
1. **Analyze** existing documentation structure and relationships
2. **Synthesize** key information into domain context.md
3. **Preserve** detailed documentation in original files
4. **Link** to source documents for deep dives
5. **Test** context retrieval and usability

### Context.md Structure Template:
```markdown
# [Domain] Context

## Purpose
Brief description of this domain's role in the project

## Key Concepts
- Core concepts and terminology
- Domain-specific patterns

## Essential Knowledge
Synthesized information that AI/developers need to know

## Document Index
- Link to source documents with brief descriptions
- Organized by subcategory or importance

## Cross-Domain Dependencies
- Related contexts and integration points
```

## Success Criteria
- [ ] All 80 markdown files reviewed and integrated
- [ ] 9 domain context.md files created
- [ ] 1 root context.md file created
- [ ] No orphaned documentation
- [ ] Context retrieval tested and validated
- [ ] Team onboarded to new structure

## Notes
- Migration should preserve all existing documentation
- Context files synthesize, not replace, detailed docs
- Focus on making knowledge discoverable and actionable
- Consider creating sub-domain contexts for complex areas (e.g., product/ux-design)

---
*Last Updated: 2025-08-03*
*Total Files: 81 | Migrated: 64 | Archived: 12 | Active Context Docs: 52 | Remaining: 17*