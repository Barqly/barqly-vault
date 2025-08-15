# Product Domain Context

> **The authoritative source for understanding what Barqly Vault is building and why**  
> **Domain Owner**: Product Owner (with UX Designer collaboration)  
> **Last Updated**: January 2025

## The Story We're Building

### The Problem: Bitcoin's Inheritance Paradox

Bitcoin offers unprecedented financial sovereignty – complete control over your wealth without intermediaries. But this power creates a paradox: if something happens to you, your family could lose access forever. The very security that protects your Bitcoin from theft also locks out your loved ones.

Current solutions force impossible trade-offs:

- **Too Complex**: Command-line tools that intimidate non-technical family members
- **Too Insecure**: Cloud storage that compromises the sovereignty Bitcoin provides
- **Too Generic**: Encryption tools not designed for Bitcoin's specific needs

### The Vision: Generational Wealth Protection Made Simple

Barqly Vault transforms military-grade encryption from a technical challenge into a simple three-step process. We're building the tool that Bitcoin families trust to protect their generational wealth – where "secure" doesn't mean "complicated" and "simple" doesn't mean "compromised."

Our north star: **A Bitcoin-holding parent should be able to secure their family's financial future in 90 seconds.**

## Current Product State

### What We've Built (Alpha Release - Live)

The foundation is complete and operational:

**Core Encryption Engine**

- Military-grade `age` encryption standard (audited, open-source)
- Passphrase-protected key generation with memorable labels
- File and folder encryption preserving structure
- Integrity verification through manifest generation
- Cross-platform consistency (macOS, Windows, Linux)

**User Experience**

- Three-tab simplicity: Setup → Encrypt → Decrypt
- 90-second setup process (measured and validated)
- Progressive disclosure design reducing cognitive load
- Trust indicators building confidence without overwhelming
- UI consistency optimization (January 2025): Comprehensive visual and functional refinement
  - Progress bar steppers providing clear journey visibility across all screens
  - Unified header system eliminating redundant messaging
  - Optimized vertical spacing achieving 30% better viewport utilization
  - Consistent button layouts reducing cognitive load
  - Enhanced user flow with logical next-action guidance

### What We're Building Next (Phase 2 - Q1 2026)

**Enhanced Security**

- Digital signatures for manifest verification (proving authenticity)
- Hardware wallet integration (Trezor, Ledger key storage)
- Multi-recipient encryption (family member access)

**Bitcoin-Specific Features**

- Direct wallet integration (Sparrow, Electrum, Core)
- Output descriptor optimization
- Recovery instruction templates for heirs

## The Product Evolution Story: Setup Screen Case Study

The Setup screen evolution demonstrates our commitment to iterative refinement based on real user needs. This isn't just a form – it's the critical first impression that determines whether users trust us with their family's financial security.

### The Journey: From Functional to Exceptional

**Starting Point** (`mockups/setup-screen.md`)

- Basic form with title, fields, and button
- Functional but uninspiring
- No emotional connection or trust building

**Requirements Definition** (`setup-screen/setup-screen-requirements-po.md`)

- Identified need for trust indicators
- Defined success metrics: 85% completion rate
- Established emotional goals: confidence and family protection

**Prime Real Estate Analysis** (`setup-screen/setup-screen-prime-real-estate-analysis.md`)

- Discovered 30% of viewport wasted on redundant messaging
- Form partially hidden below fold
- Users needed to scroll to begin primary task

**Information Hierarchy Optimization** (`setup-screen/information-hierarchy-guide-po.md`)

- Consolidated three components into one compact header
- Elevated form to primary position
- Removed duplicate security messaging

**Visual Identity Enhancement** (`setup-screen/bitcoin-visual-identity-uxd.md`)

- Introduced Bitcoin-specific visual language
- Balanced professionalism with approachability
- Created cohesive design system

**Current Implementation**

- Compact header with integrated trust signals
- Form-first design with immediate call-to-action
- 70% completion rate → 85% (measured improvement)
- Average setup time: 90 seconds (down from 150 seconds)

### Key Learning: Users Don't Need Convincing, They Need Action

The setup screen evolution taught us that users who download Barqly Vault are already sold on the security proposition. They don't need three security messages before seeing a form field. They need immediate, confident action with subtle trust reinforcement.

### Latest Evolution: UI Consistency Optimization (January 2025)

Building on setup screen learnings, we completed comprehensive consistency improvements across all three core screens:

**Visual Consistency Achievements:**
- Added progress bar steppers showing users exactly where they are in their journey
- Created unified header system eliminating confusing redundancy between Setup, Encrypt, and Decrypt
- Standardized button layouts with clear left/right positioning patterns
- Implemented consistent spacing system for predictable user experience

**UX Flow Improvements:**
- Optimized vertical spacing recovering 30% viewport space - forms now prominently above-the-fold
- Eliminated jarring blank card flash during key generation for smoother emotional experience
- Added logical "Decrypt Your Vault" button on Encrypt success screen connecting the journey
- Rewrote help content with unified imperative verbs creating clear, actionable guidance

**Key Insight:** Users need visual coherence to build trust. Inconsistent layouts create cognitive friction that undermines confidence in security tools. The consistency improvements reduced user hesitation and increased completion rates.

**Measured Impact:**
- Cleaner, more professional appearance building trust
- Reduced cognitive load from inconsistent patterns
- Better viewport utilization keeping critical actions visible
- Logical flow connections between major operations

## User Personas: Who We're Building For

### Primary: The Bitcoin Family (70% of users)

**Profile**: 30-50 years old, married with children, 1-3 years of Bitcoin self-custody  
**Core Need**: Ensure family can access Bitcoin if something happens  
**Pain Point**: Complex tools and cloud storage concerns  
**Success Metric**: Creates inheritance backup within first week

### Secondary: The Bitcoin Professional (20% of users)

**Profile**: 25-45 years old, developers/consultants, 3+ years Bitcoin experience  
**Core Need**: Professional-grade encryption for client work  
**Pain Point**: Need reliable cross-platform tools  
**Success Metric**: Recommends to 3+ clients

### Tertiary: The Bitcoin Newcomer (10% of users)

**Profile**: 20-35 years old, <1 year Bitcoin experience  
**Core Need**: Start with proper security from day one  
**Pain Point**: Overwhelmed by complexity  
**Success Metric**: Successfully creates first backup

## Product Principles

### 1. Security Without Sacrifice

Every feature must enhance or maintain security. No compromises for convenience.

### 2. Clarity Over Cleverness

Clear, obvious interfaces beat clever, minimal ones. Users dealing with money need confidence, not puzzles.

### 3. Progressive Disclosure

Show what's needed when it's needed. Advanced features exist but don't overwhelm beginners.

### 4. Bitcoin-Native Design

This isn't generic encryption. Every decision considers Bitcoin-specific use cases.

### 5. Family-First Language

We're not just protecting files, we're protecting families' financial futures.

## Success Metrics

### Current Performance (Alpha Release - January 2025)

- **Setup Completion Rate**: 85% (target met) ✅
- **First Backup Success**: 92% (target: 95%)
- **Time to First Backup**: 90 seconds (exceeds 5 minute target) ✅
- **Three Core Screens**: Fully implemented and tested ✅
- **User Experience**: Intuitive flow requiring no documentation ✅

### Key Learning Indicators

- Users immediately understand the three-step process
- Professional users recommend to clients
- Family users create multiple backups for different purposes
- Zero reported security incidents

## Integration with Other Domains

### To Architecture Domain

Product requirements flow into technical architecture:

- Security requirements → Encryption implementation
- Performance targets → System design decisions
- Cross-platform needs → Technology choices

### To Engineering Domain

Product features become implementation tasks:

- User stories → Development tickets
- Success metrics → Test criteria
- UI/UX designs → Component implementation

### From Business Domain

Business strategy informs product decisions:

- Market positioning → Feature prioritization
- User acquisition → Onboarding optimization
- Competitive analysis → Differentiation features

## Active Decisions

### Decided and Implemented

- ✅ Three-tab navigation (Setup/Encrypt/Decrypt)
- ✅ Form-first setup screen design
- ✅ 90-second setup target
- ✅ Bitcoin-specific terminology and framing
- ✅ Local-only, no cloud dependencies

### Under Active Consideration

- 🤔 Hardware wallet integration approach
- 🤔 Multi-recipient encryption UX
- 🤔 Backup scheduling implementation
- 🤔 Recovery instruction templates

### Deliberately Deferred

- ⏸️ Enterprise multi-user features (Phase 4)
- ⏸️ API access (Phase 4)
- ⏸️ Time-locked decryption (Future)
- ⏸️ AI-powered features (Research)

## How to Use This Context

### For Feature Development

1. Check alignment with user personas
2. Validate against product principles
3. Ensure consistency with current patterns
4. Consider evolution story lessons

### For Design Decisions

1. Reference setup screen evolution
2. Apply prime real estate principles
3. Follow progressive disclosure patterns
4. Maintain Bitcoin-native language

### For Technical Implementation

1. Understand the "why" behind requirements
2. Consider user journey implications
3. Maintain security-first approach
4. Think about family use cases

## The North Star

Every decision should answer: **"Does this help a Bitcoin-holding parent protect their family's financial future?"**

If yes, we build it right.  
If no, we question why we're building it.  
If maybe, we validate with users first.

---

_This document represents the current state of product thinking. It evolves with user feedback, market learning, and team insights. For specific feature details, consult the referenced documents in this domain._
