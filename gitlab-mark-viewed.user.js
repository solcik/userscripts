// ==UserScript==
// @name         GitLab — mark file as Viewed with "v"
// @namespace    https://github.com/solcik/userscripts
// @version      0.2.0
// @description  In a GitLab merge request diff, press "v" to toggle the focused file's "Viewed" checkbox.
// @author       David Solc
// @match        *://*/-/merge_requests/*/diffs
// @icon         https://www.google.com/s2/favicons?sz=64&domain=gitlab.com
// @homepageURL  https://github.com/solcik/userscripts
// @supportURL   https://github.com/solcik/userscripts/issues
// @updateURL    https://raw.githubusercontent.com/solcik/userscripts/main/gitlab-mark-viewed.user.js
// @downloadURL  https://raw.githubusercontent.com/solcik/userscripts/main/gitlab-mark-viewed.user.js
// @require      https://cdn.jsdelivr.net/npm/mousetrap@1.6.5/mousetrap.min.js
// @grant        none
// @license      MIT
// ==/UserScript==

// Original idea: https://gist.github.com/CodeBrauer/2d5814262e53fafb4228ebcda08154d9

(function () {
  'use strict';
  Mousetrap.bind('v', function () {
    const cb = document.querySelector("[data-testid='fileReviewCheckbox']");
    if (cb) cb.click();
  });
})();
