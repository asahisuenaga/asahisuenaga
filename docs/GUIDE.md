# How to Make Your Own README.md

**This repository is [Asahi](https://github.com/asahisuenaga)'s README designed to generate an automated, terminal-styled GitHub Profile README.**

## Installation

Use the following guide to set up your repository, configure your access tokens, and trigger the initial build.

1. Click [here](https://github.com/asahisuenaga/asahisuenaga/fork) to copy it directly into your own GitHub account. Make sure your new repository is named exactly after your GitHub username (e.g., `yourusername/yourusername`).

2. Because the README tracks real-time metrics (like year-to-date commits, combined issue counts, and private contributions), the default `GITHUB_TOKEN` isn't enough. Generate a Classic PAT or Fine-Grained PAT with the `repo` and `read:user` scopes enabled.

3. Navigate to 'Settings → Secrets and variables → Actions'. Click 'New repository secret', name it exactly `ACCESS_TOKEN`, and paste your generated PAT as the value.

4. Go to 'Settings → Actions → General'. Under *Workflow permissions*, ensure that 'Read and write permissions' is selected so the automated script can update your `README.md` file.

5. Go to the 'Actions' tab of your repo, select the 'Update Profile README Stats' workflow on the left, click the 'Run workflow' dropdown, and trigger it manually. The script will now run automatically every midnight UTC.

---

## Template

The framework uses `template.md` file in the root directory, which the build script populates by updating (`{{ ... }}`) tags on every run. To customize it, follow these steps:

1. Replace all instances of `asahi` with `your-name` and `asahisuenaga` with `your-full-name`.

2. Generate a custom title with [README Typing SVG](https://readme-typing-svg.herokuapp.com).

3. Use the [Text-Image ASCII Converter](https://www.text-image.com/convert/ascii.html) to build a retro-terminal logo. For the best look, apply the extra contrast filter and manually swap all periods with spaces.
