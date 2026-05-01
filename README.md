# userscripts

Personal collection of [Violentmonkey](https://violentmonkey.github.io/) userscripts.

Each script declares `@updateURL` pointing back at this repo, so once installed
Violentmonkey auto-updates from `main` on its own.

## Install

Open a script's raw URL in Firefox with Violentmonkey installed — it detects
the `==UserScript==` header and prompts to install.

| Script                       | Install                                                                                         | Description                                                                                                               |
| ---------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `gitlab-mark-viewed.user.js` | [install](https://raw.githubusercontent.com/solcik/userscripts/main/gitlab-mark-viewed.user.js) | Press `v` on a GitLab MR diff to toggle the focused file's "Viewed" checkbox. Matches `gitlab.com` and `git.vs-point.cz`. |

## Authoring

- Bump `@version` on every change (Violentmonkey only updates when the version increases).
- Keep `@match` patterns narrow enough to avoid running on unrelated pages.
- Prefer `@require` (loaded once, cached) over inlining vendored libraries.
- `@grant none` whenever possible — the script then runs in the page's own
  context and can't escalate privileges.

## License

MIT — see header in each `.user.js` file.
