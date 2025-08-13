# ZenAI SubAgent Personas - Quick Reference

This document provides a quick overview of all personas in the ZenAI framework. Each persona represents a specialized role in the distributed AI development team, with detailed I/O contracts defined in `documentation-standards.md`.

---

## 🧑‍💻 Human Persona

**1. Manager**  
_Oversees the overall system, coordinates ZenAI agents, sets priorities, and provides human-in-the-loop judgment at approval gates._

---

## 🤖 AI Personas (SubAgents)

### Core Orchestration

**2. ZenMaster**  
_Orchestrates team collaboration, routes tasks between specialists, manages project lifecycle, and enforces quality gates._

### Business & Strategy Layer

**3. Customer Advocate**  
_Represents end-user perspective, validates solutions against real-world needs, and ensures customer-centric decision making._

**4. Product Owner**  
_Translates customer needs into actionable requirements, creates user stories, maintains product roadmap, and defines acceptance criteria._

### Design & User Experience

**5. UX Designer**  
_Designs end-to-end user experiences, creates wireframes and mockups, defines interaction patterns, and ensures accessibility compliance._

**6. Frontend Engineer**  
_Implements user-facing experiences, converts designs into responsive code, handles state management, and creates reusable components._

### Architecture & Foundation

**7. System Architect**  
_Designs system structure and scalability strategies, creates technical specifications, sets up project foundations, and evaluates existing architectures._

**8. Research Engineer**  
_Investigates latest technologies and industry trends, validates technology choices, conducts stack assessments, and provides upgrade recommendations._

### Development & Implementation

**9. Backend Engineer**  
_Develops server-side services and APIs, implements business logic, handles database interactions, and ensures scalable backend architecture._

**10. DevOps Engineer**  
_Manages infrastructure-as-code, development automation, CI/CD pipelines, deployment strategies, release management, and production operations from code commit to system maintenance._

### Quality & Security

**11. QA Engineer**  
_Designs comprehensive testing strategies, performs quality assurance validation, creates test cases, conducts load testing and performance profiling, identifies bottlenecks, and ensures acceptance criteria and SLA requirements are met._

**12. Security Engineer**  
_Performs threat modeling and security audits, implements secure-by-design principles, conducts vulnerability assessments, and ensures compliance._

### Documentation & Communication

**13. Technical Writer**  
_Creates comprehensive internal documentation, API references, architectural decision records, manages external technical content, handles developer relations, and builds community engagement._

---

## Usage Notes

- **Total Personas:** 13 (1 human + 12 AI SubAgents)
- **I/O Contracts:** Detailed input/output specifications for each persona are maintained in `docs/common/documentation-standards.md`
- **Coordination:** All AI personas are orchestrated through ZenMaster, with human Manager providing approval gates
- **Scalability:** This persona structure supports projects from small teams to enterprise-scale development
- **Flexibility:** Personas can be activated as needed - not all personas are required for every project

## Getting Started

1. **Review** `docs/common/documentation-standards.md` for detailed I/O contracts
2. **Start with core team:** Manager + ZenMaster + System Architect + Research Engineer
3. **Add specialists** as project needs evolve and complexity grows
4. **Customize** persona activation based on project requirements and team capacity

---

_This reference guide is maintained as part of the ZenAI framework. For detailed implementation guidance, see individual persona documentation and the master documentation standards._
