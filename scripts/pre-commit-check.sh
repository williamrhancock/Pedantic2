#!/bin/bash
# Pre-commit hook to check for exposed API keys
# Install: ln -s ../../scripts/pre-commit-check.sh .git/hooks/pre-commit

# Common API key patterns
PATTERNS=(
    "sk-[a-zA-Z0-9]{32,}"
    "sk-or-v1-[a-zA-Z0-9]{64,}"
    "api[_-]?key[=:]\s*['\"]?[a-zA-Z0-9_-]{20,}['\"]?"
    "apikey[=:]\s*['\"]?[a-zA-Z0-9_-]{20,}['\"]?"
    "Bearer\s+[a-zA-Z0-9_-]{32,}"
)

# Files to check (exclude node_modules, .git, etc.)
FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -v node_modules | grep -v ".git" | grep -v ".next")

FOUND_SECRET=false

for file in $FILES; do
    if [ -f "$file" ]; then
        for pattern in "${PATTERNS[@]}"; do
            if grep -qE "$pattern" "$file" 2>/dev/null; then
                echo "⚠️  WARNING: Potential API key found in $file"
                echo "   Pattern: $pattern"
                echo "   Please remove API keys and use environment variables instead."
                echo "   See SECURITY.md for guidelines."
                FOUND_SECRET=true
            fi
        done
    fi
done

if [ "$FOUND_SECRET" = true ]; then
    echo ""
    echo "❌ Commit blocked: Potential secrets detected!"
    echo "   Remove API keys from files or use 'git commit --no-verify' to bypass (NOT RECOMMENDED)"
    exit 1
fi

exit 0

