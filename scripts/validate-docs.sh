#!/bin/bash

# validate-docs.sh - Verify documentation updates before task completion

echo "🔍 Checking documentation updates..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track failures
FAILED=0

# Check 1: Project plan has changes
echo -n "Checking project-plan.md... "
if git diff --name-only docs/project-plan.md | grep -q "project-plan.md" || \
   git diff --cached --name-only docs/project-plan.md | grep -q "project-plan.md"; then
    echo -e "${GREEN}✓ Updated${NC}"
else
    echo -e "${YELLOW}⚠ No changes detected${NC}"
    echo "  Verify if task tracking update is needed"
fi

# Check 2: Current context has changes
echo -n "Checking current context... "
if git diff --name-only docs/context/current/ | grep -q ".md" || \
   git diff --cached --name-only docs/context/current/ | grep -q ".md"; then
    echo -e "${GREEN}✓ Updated${NC}"
    UPDATED_FILES=$(git diff --name-only docs/context/current/ | xargs basename)
    echo "  Updated: $UPDATED_FILES"
else
    echo -e "${RED}✗ No updates found${NC}"
    echo "  Required: active-sprint.md, recent-decisions.md, or known-issues.md"
    FAILED=1
fi

# Check 3: Domain context has changes (at least one)
echo -n "Checking domain contexts... "
if git diff --name-only docs/*/context.md | grep -q "context.md" || \
   git diff --cached --name-only docs/*/context.md | grep -q "context.md"; then
    echo -e "${GREEN}✓ Updated${NC}"
    UPDATED_CONTEXTS=$(git diff --name-only docs/*/context.md | xargs -I {} dirname {} | xargs basename)
    echo "  Domains updated: $UPDATED_CONTEXTS"
else
    echo -e "${YELLOW}⚠ No domain context updates${NC}"
    echo "  Consider updating: architecture, engineering, or product context"
fi

# Check 4: Commit message will reference updates
echo -n "Checking staged files... "
STAGED_DOCS=$(git diff --cached --name-only | grep -c "\.md$")
if [ "$STAGED_DOCS" -gt 0 ]; then
    echo -e "${GREEN}✓ $STAGED_DOCS documentation files staged${NC}"
else
    echo -e "${YELLOW}⚠ No documentation staged yet${NC}"
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ Documentation checks passed!${NC}"
    echo ""
    echo "Remember to commit with a message that mentions doc updates:"
    echo "  git commit -m \"feat(scope): description"
    echo ""
    echo "  - Updated project-plan.md: marked X.Y.Z complete"
    echo "  - Updated active-sprint.md: added completion notes\""
else
    echo -e "${RED}❌ Documentation updates required!${NC}"
    echo ""
    echo "Please update the following before marking task complete:"
    echo "  1. docs/project-plan.md - mark completed items"
    echo "  2. docs/context/current/* - document your changes"
    echo "  3. docs/{domain}/context.md - update relevant domain"
    echo ""
    echo "See docs/common/definition-of-done.md for details"
    exit 1
fi