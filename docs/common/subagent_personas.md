# ZenAI SubAgent Personas - Quick Reference

This document provides a quick overview of all personas in the ZenAI framework. Each persona represents a specialized role in the distributed AI development team, with detailed I/O contracts defined in `documentation-standards.md`.

---

## 🧑‍💻 Human Persona

**1. Manager**  
*Oversees the overall system, coordinates ZenAI agents, sets priorities, and provides human-in-the-loop judgment at approval gates.*

---

## 🤖 AI Personas (SubAgents)

### Core Orchestration
**2. ZenMaster**  
*Orchestrates team collaboration, routes tasks between specialists, manages project lifecycle, and enforces quality gates.*

### Business & Strategy Layer
**3. Customer Advocate**  
*Represents end-user perspective, validates solutions against real-world needs, and ensures customer-centric decision making.*

**4. Product Owner**  
*Translates customer needs into actionable requirements, creates user stories, maintains product roadmap, and defines acceptance criteria.*

### Design & User Experience
**5. UX Designer**  
*Designs end-to-end user experiences, creates wireframes and mockups, defines interaction patterns, and ensures accessibility compliance.*

**6. Frontend Engineer**  
*Implements user-facing experiences, converts designs into responsive code, handles state management, and creates reusable components.*

### Architecture & Foundation
**7. System Architect**  
*Designs system structure and scalability strategies, creates technical specifications, sets up project foundations, and evaluates existing architectures.*

**8. Research Engineer**  
*Investigates latest technologies and industry trends, validates technology choices, conducts stack assessments, and provides upgrade recommendations.*

### Development & Implementation
**9. Backend Engineer**  
*Develops server-side services and APIs, implements business logic, handles database interactions, and ensures scalable backend architecture.*

**10. DevOps Engineer**  
*Manages infrastructure-as-code, handles container orchestration, provisions cloud resources, and implements deployment automation.*

### Quality & Security
**11. QA Engineer**  
*Designs comprehensive testing strategies, performs quality assurance validation, creates test cases, and ensures acceptance criteria are met.*

**12. Security Engineer**  
*Performs threat modeling and security audits, implements secure-by-design principles, conducts vulnerability assessments, and ensures compliance.*

**13. Performance Engineer**  
*Specializes in application optimization, conducts load testing and profiling, identifies bottlenecks, and ensures systems meet SLA requirements.*

### Operations & Release
**14. Release Engineer**  
*Manages CI/CD pipelines and deployment strategies, handles version tagging, orchestrates releases, and implements rollback procedures.*

**15. Site Reliability Engineer**  
*Monitors system health and incident response, implements observability solutions, maintains uptime, and handles production issue resolution.*

### Documentation & Communication
**16. Technical Writer**  
*Creates comprehensive documentation, maintains API references and user guides, writes architectural decision records, and manages knowledge transfer.*

**17. Content Strategist**  
*Manages external communication and social media, creates technical content, handles developer relations, and builds community engagement.*

---

## Usage Notes

- **Total Personas:** 17 (1 human + 16 AI SubAgents)
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

*This reference guide is maintained as part of the ZenAI framework. For detailed implementation guidance, see individual persona documentation and the master documentation standards.*