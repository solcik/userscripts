// ==UserScript==
// @name         GitLab — commit navigation with "x" / "c"
// @namespace    https://github.com/solcik/userscripts
// @version      0.1.0
// @description  Restore the broken GitLab MR commit-by-commit shortcuts: "x" = previous commit, "c" = next commit (works around gitlab-org/gitlab#499143 on versions < 17.10).
// @author       David Solc
// @match        https://gitlab.com/*/-/merge_requests/*
// @match        https://git.vs-point.cz/*/-/merge_requests/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=gitlab.com
// @homepageURL  https://github.com/solcik/userscripts
// @supportURL   https://github.com/solcik/userscripts/issues
// @updateURL    https://raw.githubusercontent.com/solcik/userscripts/main/gitlab-commit-nav.user.js
// @downloadURL  https://raw.githubusercontent.com/solcik/userscripts/main/gitlab-commit-nav.user.js
// @require      https://cdn.jsdelivr.net/npm/mousetrap@1.6.5/mousetrap.min.js
// @grant        none
// @license      MIT
// ==/UserScript==

// On GitLab < 17.10 the built-in "x"/"c" commit-navigation shortcuts stopped
// firing (gitlab-org/gitlab#499143), but the Prev/Next buttons GitLab renders in
// single-commit MR diff view still work. Those are plain <a href> links carrying
// aria-keyshortcuts="x" / "c". This script just clicks the right one.

(function () {
  'use strict';

  // Find the Prev/Next commit link for a direction. Tries the most stable hook
  // (aria-keyshortcuts), then aria-label, then the chevron icon, so it keeps
  // working if one of them is renamed across GitLab versions.
  function navLink(direction) {
    const key = direction === 'next' ? 'c' : 'x';
    const label = direction === 'next' ? 'Next commit' : 'Previous commit';
    const icon = direction === 'next' ? 'chevron-right-icon' : 'chevron-left-icon';
    const scope = document.querySelector('.commit-nav-buttons') || document;

    let link =
      scope.querySelector(`a[aria-keyshortcuts="${key}"]`) ||
      scope.querySelector(`a[aria-label="${label}"]`);

    if (!link) {
      const svg = scope.querySelector(`[data-testid="${icon}"]`);
      link = svg && svg.closest('a');
    }

    return link;
  }

  function go(direction) {
    const link = navLink(direction);
    if (!link) return; // not in single-commit view, or no neighbour that way
    if (link.classList.contains('disabled') || link.getAttribute('aria-disabled') === 'true')
      return;
    link.click();
  }

  Mousetrap.bind('x', () => go('previous'));
  Mousetrap.bind('c', () => go('next'));
})();
