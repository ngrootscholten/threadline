# How Threadline Works

## Overview

Threadline is an AI-powered code quality and convention tool that runs focused, parallel code reviews based on your team's documented standards.

Think of it as a **system of expert AI reviewers**—like an AI-powered linter, but smarter, more customizable, and fully auditable.

## The Flow

### 1. Define Your Experts

Create an `/experts` folder in your repository. Each markdown file defines a single code quality concern or convention.

**Example: `experts/error-handling.md`**
```markdown
# Error Handling Standards

All API routes must:
- Return consistent error response formats
- Include proper HTTP status codes
- Log errors before returning responses
```

Your experts live with your code, get version-controlled, and evolve with your standards.

### 2. Run the Check

When you're ready to review your changes, run:

```bash
npx threadline check
```

That's it. One command.

### 3. What Happens Behind the Scenes

1. **Validation**  
   Threadline validates your expert definitions to ensure they're well-formed.

2. **Change Detection**  
   Collects all local changes (git diffs) and identifies modified files.

3. **Parallel Expert Review**  
   For each expert, Threadline makes a parallel API call to our service with:
   - The code diffs
   - The files that were changed
   - The expert's markdown content

4. **AI Analysis**  
   Each expert runs independently using GPT-4o-mini (or similar cost-effective model with good context). Each returns a strict JSON response:

   ```json
   {
     "status": "compliant" | "attention" | "not_relevant",
     "reasoning": "Brief explanation",
     "line_references": [123, 456]
   }
   ```

5. **Results**  
   Threadline filters and presents **only the experts that require attention**. No noise, just actionable feedback.

### 4. Review & Fix

You see a clean, focused report:

```
⚠️  Error Handling Expert
   Line 45: Missing error logging before return
   Line 89: Inconsistent error response format

✅ API Design Expert: Compliant
✅ Security Expert: Compliant
```

Fix the issues, run `threadline check` again, and iterate until everything passes.

## Key Features

### 🎯 Focused Reviews
Each expert checks one thing. No AI trying to be everything to everyone.

### ⚡ Parallel Execution
All experts run simultaneously. Fast feedback, even with many rules.

### 🔍 Full Auditability
Every check is logged. You can trace exactly what was reviewed and why.

### 📦 Zero Configuration
Works out of the box. Just add your experts and run.

### 🆓 Free to Try
Run locally, test with your codebase, see if it works for your team.

## Getting Started

1. **Try it locally** (coming soon)
   ```bash
   npx threadline check
   ```

2. **Add your first expert**
   Create `experts/my-first-rule.md` with your coding standard.

3. **See it in action**
   Make a change, run the check, see the results.

4. **Iterate**
   Add more experts, refine your standards, build your quality system.

---

**Want to learn more?** [Read the vision →](./VISION.md)

