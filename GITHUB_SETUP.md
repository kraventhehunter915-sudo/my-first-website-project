# 🚀 GitHub Setup Instructions for Devin

Since Git is not currently installed on your system, follow these steps to set up Git and push Devin to your GitHub repository.

## Step 1: Install Git

### Windows:
1. Download Git from https://git-scm.com/download/win
2. Run the installer and follow the installation wizard
3. Use the default settings (recommended)
4. After installation, restart your terminal/command prompt

### Verify Git Installation:
```bash
git --version
```

## Step 2: Configure Git

Open a terminal/command prompt and configure your Git identity:

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

*Use the same email you use for your GitHub account*

## Step 3: Create GitHub Repository

1. Go to https://github.com and log in to your account
2. Click the "+" icon in the top-right corner
3. Select "New repository"
4. Repository name: `My-First-APP` (GitHub will convert to lowercase automatically)
5. Description: `Devin - Your AI Assistant for BTech Students`
6. Make it **Public** (recommended) or Private
7. **DO NOT** initialize with README, .gitignore, or license (we already have these)
8. Click "Create repository"

## Step 4: Initialize Local Git Repository

Navigate to your project directory and initialize Git:

```bash
cd c:\Users\Satyadev\Documents\Coding\C
git init
```

## Step 5: Stage and Commit Files

```bash
git add .
git commit -m "Initial commit: Devin - AI Assistant for BTech Students"
```

## Step 6: Link to GitHub Repository

Copy the repository URL from GitHub (it will look like: `https://github.com/YOUR_USERNAME/My-First-APP.git`)

Then run:

```bash
git remote add origin https://github.com/YOUR_USERNAME/My-First-APP.git
git branch -M main
git push -u origin main
```

*Replace `YOUR_USERNAME` with your actual GitHub username*

## Step 7: Authenticate with GitHub

If you're prompted for credentials:
- GitHub now requires Personal Access Tokens (PAT) instead of passwords
- Create a PAT at: https://github.com/settings/tokens
- Select "repo" permissions
- Use the token as your password when prompted

## Alternative: Using GitHub CLI (Recommended)

If you prefer a simpler method, install GitHub CLI:

### Install GitHub CLI:
```bash
winget install --id GitHub.cli
```

### Then use these commands:
```bash
cd c:\Users\Satyadev\Documents\Coding\C
gh auth login
git init
git add .
git commit -m "Initial commit: Devin - AI Assistant for BTech Students"
gh repo create My-First-APP --public --source=. --remote=origin --push
```

## Troubleshooting

### "git is not recognized":
- Make sure Git is installed and added to your PATH
- Restart your terminal after installation

### Authentication Issues:
- Create a Personal Access Token at GitHub Settings
- Use the token instead of your password

### Push Rejected:
- Make sure you have the correct repository URL
- Check that you have write permissions to the repository

### Branch Name Issues:
- GitHub now uses "main" instead of "master"
- Use `git branch -M main` to rename your branch

## After Successful Push

Once pushed, you can:
1. Visit your repository at: `https://github.com/YOUR_USERNAME/My-First-APP`
2. Share the URL with others
3. Continue making changes and use `git push` to upload updates

## Future Updates

After making changes to Devin:

```bash
git add .
git commit -m "Your commit message"
git push
```

---

**Need Help?**
- GitHub Documentation: https://docs.github.com
- Git Documentation: https://git-scm.com/doc
