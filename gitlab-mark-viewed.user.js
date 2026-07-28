// ==UserScript==
// @name         GitLab — mark file as Viewed with "v"
// @namespace    https://github.com/solcik/userscripts
// @version      0.3.0
// @description  In a GitLab merge request diff, press "v" to toggle the focused file's "Viewed" checkbox and advance to the next file.
// @author       David Solc
// @match        https://gitlab.com/*/-/merge_requests/*
// @match        https://git.vs-point.cz/*/-/merge_requests/*
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

  const FILE = '.diff-file.file-holder';
  const REVIEW_CHECKBOX = "[data-testid='fileReviewCheckbox']";
  const NEXT_FILE_KEY = 'j';
  const EDGE = 4;

  function topChrome() {
    let bottom = 0;

    for (const el of document.elementsFromPoint(Math.round(window.innerWidth / 2), 1)) {
      const position = getComputedStyle(el).position;
      if (position === 'fixed' || position === 'sticky') {
        bottom = Math.max(bottom, el.getBoundingClientRect().bottom);
      }
    }

    return bottom;
  }

  // In "show one file at a time" mode there is only ever one file in the DOM;
  // otherwise the file being read is the topmost one still visible below the
  // sticky merge request header.
  function focusedFile() {
    const files = [...document.querySelectorAll(FILE)];
    if (files.length < 2) return files[0] || null;

    const edge = topChrome() + EDGE;
    return files.find((file) => file.getBoundingClientRect().bottom > edge) || files.at(-1);
  }

  // GitLab's own "next file" shortcut already knows about lazily rendered files,
  // the sticky header offset and the file tree selection, so trigger it instead
  // of scrolling ourselves. Its Mousetrap handler reads the legacy `which`, and
  // its stopCallback expects an element target — dispatching on `document` is
  // silently dropped.
  function goToNextFile() {
    const event = new KeyboardEvent('keypress', {
      key: NEXT_FILE_KEY,
      bubbles: true,
      cancelable: true,
    });
    const code = NEXT_FILE_KEY.charCodeAt(0);
    Object.defineProperty(event, 'which', { get: () => code });
    Object.defineProperty(event, 'keyCode', { get: () => code });

    document.body.dispatchEvent(event);
  }

  Mousetrap.bind('v', function () {
    const file = focusedFile();
    const checkbox = file && file.querySelector(REVIEW_CHECKBOX);
    if (!checkbox) return;

    checkbox.click();
    requestAnimationFrame(goToNextFile);
  });
})();
