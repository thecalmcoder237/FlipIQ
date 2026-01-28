# Git Repository Setup Instructions for FlipIQ

## Initial Repository Setup

Follow these steps to initialize and push your FlipIQ project to a Git repository.

### Step 1: Initialize Git Repository

```bash
cd "c:\Users\Jesse - Joel\Downloads\horizons-export-539b6f76-d474-4bf3-8847-2bf38fc4f1d6"
git init
```

### Step 2: Add All Files

```bash
git add .
```

### Step 3: Create Initial Commit

```bash
git commit -m "Initial commit: FlipIQ rebranding and light theme conversion

- Rebranded from Pro House Flip to FlipIQ powered by PAVEL REI
- Updated all branding, logos, and page titles
- Converted entire application to light theme
- Redesigned login page with value propositions
- Updated all components for light theme compatibility
- Added comprehensive .gitignore and README"
```

### Step 4: Create Repository on GitHub/GitLab

1. Go to GitHub (github.com) or GitLab (gitlab.com)
2. Click "New repository"
3. Name it: `FlipIQ`
4. **Do NOT** initialize with README, .gitignore, or license (we already have these)
5. Copy the repository URL (e.g., `https://github.com/username/FlipIQ.git`)

### Step 5: Add Remote and Push

```bash
# Add remote (replace with your actual repository URL)
git remote add origin https://github.com/your-username/FlipIQ.git

# Rename default branch to main (if needed)
git branch -M main

# Push to remote
git push -u origin main
```

## Alternative: Using GitHub CLI

If you have GitHub CLI installed:

```bash
gh repo create FlipIQ --public --source=. --remote=origin --push
```

## Verification

After pushing, verify your repository:

1. Visit your repository URL
2. Check that all files are present
3. Verify README.md displays correctly
4. Confirm .gitignore is working (node_modules should not be tracked)

## Branch Strategy (Optional)

For future development, consider:

```bash
# Create and switch to development branch
git checkout -b develop

# Make changes, then merge to main
git checkout main
git merge develop
git push origin main
```

## Important Notes

- **Never commit** `.env` files or API keys
- The `.gitignore` file should prevent sensitive files from being tracked
- Edge Functions in separate directories (outside workspace) should be committed separately if needed
- Large files (images, PDFs) should use Git LFS if needed

## Troubleshooting

### If you get "remote origin already exists":
```bash
git remote remove origin
git remote add origin <your-repo-url>
```

### If you need to force push (use with caution):
```bash
git push -u origin main --force
```

### If files are too large:
Consider using Git LFS for large assets:
```bash
git lfs install
git lfs track "*.png"
git lfs track "*.jpg"
git add .gitattributes
```

---

Your FlipIQ repository is now ready for version control and collaboration!
