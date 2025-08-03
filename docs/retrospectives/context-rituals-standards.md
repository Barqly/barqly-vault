# Context Rituals & Standards - Retrospective

## Documentation as Coordination Protocol
In ADD, documents become "executable intent" that agents use for consistent decision-making across handoffs, not just knowledge transfer.

## Context Rot Pattern
Follows accumulation → dilution → confusion cascade, with second-order human impacts when trust in AI outputs degrades.

## Three-Tier Governance Framework
- **Tier 1**: Living documents (high velocity, auto-expire)
- **Tier 2**: Interface contracts (medium velocity, version controlled)  
- **Tier 3**: Foundational knowledge (low velocity, immutable)

## Grooming Rituals
Daily cleanup, sprint boundary archiving, monthly contract reviews, quarterly foundational audits.

## ZenAI Integration
Context curation becomes core orchestration work with documentation hygiene as engineering rigor - versioning, testing coordination effectiveness, and technical debt management.

Context management IS orchestration work, not overhead, requiring the same engineering discipline we apply to code quality.

Just like we have a claude.md at the root of a project, we should also have a context.md at the root! This context root will be one of the most active document. It will have brief description, but it will be more like the directory, or table of contents or index.html! So, in a project:
- we have distrobuted team of agents and they all perform different kind of work and they produce lots of text (just like you jumped ahead and created a big file a bit earlier)
- the context is more like a living organism with the emergent property. It is constantly evolving after EVERT interaction or after every bit of work.
- but in the current system, one of my constant ritual (which is a source of grief and frustration is) we can't have an infinitely large chat otherwise the ai agents get overwhelmed and they start hgallucinating due to context rot. So, we have to keep chat smaller. Now when i start a new chat, all the ai agents start fresh with no memory of the old convesation. So, in every new chat, as a human (manage role), i have to now remember to provide the right context, pull various directory or files, and also remember what were the last changes done in the last (or last few commits). So, for me as a human manager with slow speed, keeping up with ai agents with blazing fast pace, is very challenging. 
- Also in situation where an agent goes off the track and I want to go back to the previous conversation to reset our fresh starting point, it becomes challenging as I need to go back again to the previous version and document or the source code might have evovled but I (human) may not remember all the right details
- The sheer volumes of the documents may be large and lots of those documents maybe just 1 time as a way to communicate from 1 agent to another agent (so with your 3 tier system this issue can be addressed hopefully) but as a human or ai agent we dont have a strategy for document retaintation vs purging.