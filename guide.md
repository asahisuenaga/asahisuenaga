# How-To Guide: Personalize the README.md

**This repository is [Asahi](https://github.com/asahisuenaga)'s README designed to generate an automated, terminal-styled GitHub Profile README.**

## Installation

1. Click [here](https://github.com/login?return_to=%2Fasahisuenaga%2Fasahisuenaga) to copy it directly into your own GitHub account. Make sure your new repository is named exactly after your GitHub username (e.g., `yourusername/yourusername`).

2. Because the README tracks real-time metrics (like year-to-date commits, combined issue counts, and private contributions), the default `GITHUB_TOKEN` isn't enough. Generate a Classic PAT or Fine-Grained PAT with the `repo` and `read:user` scopes enabled.

3. Navigate to 'Settings → Secrets and variables → Actions'. Click 'New repository secret', name it exactly `ACCESS_TOKEN`, and paste your generated PAT as the value.

4. Go to 'Settings → Actions → General'. Under *Workflow permissions*, ensure that 'Read and write permissions' is selected so the automated script can update your `README.md` file.

5. Go to the 'Actions' tab of your repo, select the 'Update Profile README Stats' workflow on the left, click the 'Run workflow' dropdown, and trigger it manually. The script will now run automatically every midnight UTC.

---

## Tools and Inspirations

* **Data:** Initial inspiration for gathering live platform statistics and arranging them in padded grid blocks came from [rahul-jha98/github-stats-transparent](https://github.com/rahul-jha98/github-stats-transparent).

* **Inspiration:** Interface and layout elements were heavily inspired by [Andrew6rant's Profile Layout](https://github.com/Andrew6rant) (*Note: Roughly half of this layout's primary framework was independently built before incorporating ideas from this repository*).

* **ASCII:** The retro-terminal logo on the left block was generated using the [Text-Image ASCII Converter](https://www.text-image.com/convert/ascii.html). The extra contrast filter was used and all `.` from the output were manually replaced with ` `.

* **Persistent Profile Counter:** Dynamic lifetime profile traffic metrics are pulled live using the [Anton Komarev Profile Views Counter](https://github.com/antonkomarev/github-profile-views-counter). The Python backend scrapes the numbers from this SVG badge directly to keep the count continuous over a rolling 14-day limit.

---

## Layout Template Blueprint

The framework relies on a backend template file named `template.md` located in the root directory. The build script updates the placeholders wrapped in double curly braces (`{{ ... }}`) on every execution pass. 

If you wish to alter your text alignment frames, modify the blueprint grid directly within your `template.md`:

```text
 ╭────── Icon ────────────────────────────────╮  ╭────── Github Statistics ──────────╮
 │                                            │  │                                   │
 │    [Your Custom ASCII Art Goes Here]       │  │{{STAT_ROW_VIEWS}}│
 │                                            │  │{{STAT_ROW_REPO_VIEWS}}│
 │                                            │  │{{STAT_ROW_STARS}}│
 │                                            │  │{{STAT_ROW_COMMITS}}│
 │                                            │  │{{STAT_ROW_COMMITS_YTD}}│
 │                                            │  │{{STAT_ROW_ISSUES_PRS}}│
 │                                            │  │{{STAT_ROW_RELEASES}}│
 ╰────────────────────────────────────────────╯  ╰───────────────────────────────────╯
                                                 ╭────── Top Languages ──────────────╮
                                                 │                                   │
                                                 │{{LANG_ROW_1}}│
                                                 │{{LANG_ROW_2}}│
                                                 │{{LANG_ROW_3}}│
                                                 │{{LANG_ROW_4}}│
                                                 │{{LANG_ROW_5}}│
                                                 ╰───────────────────────────────────╯
                                                 ╭────── Recent Activity ────────────╮
                                                 │                                   │
                                                 │{{REC_ACT_1}}│
                                                 │{{REC_ACT_2}}│
                                                 │{{REC_ACT_3}}│
                                                 │{{REC_ACT_4}}│
                                                 │{{REC_ACT_5}}│
                                                 ╰───────────────────────────────────╯
