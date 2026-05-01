// ==UserScript==
// @name         GitHub — mark file as Viewed with "v"
// @namespace    https://github.com/solcik/userscripts
// @version      0.1.0
// @description  In a GitHub pull request "Files changed" view, press "v" to toggle the focused file's "Viewed" button.
// @author       David Solc
// @match        https://github.com/*/*/pull/*/files*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=github.com
// @homepageURL  https://github.com/solcik/userscripts
// @supportURL   https://github.com/solcik/userscripts/issues
// @updateURL    https://raw.githubusercontent.com/solcik/userscripts/main/github-mark-viewed.user.js
// @downloadURL  https://raw.githubusercontent.com/solcik/userscripts/main/github-mark-viewed.user.js
// @require      https://cdn.jsdelivr.net/npm/mousetrap@1.6.5/mousetrap.min.js
// @grant        none
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';

  // Pick the "Mark as Viewed" button whose file is closest to the top of the viewport.
  function findFocusedViewedButton() {
    const buttons = document.querySelectorAll('button[class*="MarkAsViewedButton-module"]');
    if (!buttons.length) return null;

    const focusLine = window.innerHeight * 0.25;
    let best = null;
    let bestDist = Infinity;

    for (const btn of buttons) {
      const file =
        btn.closest('[data-testid="diff-file"]') ||
        btn.closest('copilot-diff-entry') ||
        btn.closest('.file') ||
        btn.closest('[id^="diff-"]') ||
        btn.parentElement;
      if (!file) continue;

      const rect = file.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) continue;

      const dist =
        rect.top <= focusLine && rect.bottom >= focusLine
          ? 0
          : Math.min(Math.abs(rect.top - focusLine), Math.abs(rect.bottom - focusLine));

      if (dist < bestDist) {
        bestDist = dist;
        best = btn;
      }
    }

    return best;
  }

  Mousetrap.bind('v', function () {
    const btn = findFocusedViewedButton();
    if (btn) btn.click();
  });
})();
