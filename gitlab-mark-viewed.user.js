// ==UserScript==
// @name         GitLab — mark file as Viewed with "v"
// @namespace    https://github.com/solcik/userscripts
// @version      0.5.3
// @description  Press "v" to toggle the current GitLab diff file as viewed. Marking a file viewed advances to the next file.
// @author       David Solc
// @match        https://gitlab.com/*/-/merge_requests/*
// @match        https://git.vs-point.cz/*/-/merge_requests/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=gitlab.com
// @homepageURL  https://github.com/solcik/userscripts
// @supportURL   https://github.com/solcik/userscripts/issues
// @updateURL    https://raw.githubusercontent.com/solcik/userscripts/main/gitlab-mark-viewed.user.js
// @downloadURL  https://raw.githubusercontent.com/solcik/userscripts/main/gitlab-mark-viewed.user.js
// @grant        none
// @license      MIT
// ==/UserScript==

// Original idea: https://gist.github.com/CodeBrauer/2d5814262e53fafb4228ebcda08154d9

(function () {
  'use strict';

  const FILE = 'diff-file, .diff-file.file-holder';
  const REVIEW_CHECKBOX = "[data-testid='fileReviewCheckbox'], input[data-viewed-checkbox]";
  const NEXT_FILE_KEY = 'j';
  const EDGE = 4;
  const SETTLE_MS = 400;

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

  // The file's own filename header is sticky too and sticks below the merge
  // request header, usually lower than the point topChrome() probes. Pin to
  // its real `top` so it does not cover the first rows of the diff.
  function fileStickyTop(file) {
    for (const el of file.querySelectorAll('*')) {
      const style = getComputedStyle(el);
      if (style.position === 'sticky') return parseFloat(style.top) || 0;
    }

    return 0;
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

  // Use the viewer's navigation button in single-file mode.
  // Select the next rapid diff directly in multi-file mode.
  // The legacy viewer still handles the "j" shortcut.
  function goToNextFile(file) {
    const navigation = document.querySelector('[data-testid="file-by-file-navigation"]');
    if (navigation) {
      const next = navigation.querySelector('[data-testid="nextButton"]');
      if (next && !next.disabled && next.getAttribute('aria-disabled') !== 'true') next.click();
      return;
    }

    if (file.matches('diff-file')) {
      const files = [...document.querySelectorAll('diff-file')];
      files[files.indexOf(file) + 1]?.selectFile();
      return;
    }

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

  function fileKey(file) {
    return file ? file.id || file.dataset.path || '' : '';
  }

  // In "show one file at a time" mode GitLab swaps the diff in place and leaves
  // the viewport where it was, so a long commit message sits above the file we
  // just moved to. The swap also takes a few frames, and the file grows as its
  // lines render, so re-pin the new file under the sticky header until the
  // layout settles. A key that never changes means there was no next file.
  function pinNextFile(previousKey) {
    const started = performance.now();

    (function pin() {
      const file = focusedFile();
      if (file && fileKey(file) !== previousKey) {
        const top =
          window.scrollY +
          file.getBoundingClientRect().top -
          Math.max(topChrome(), fileStickyTop(file));
        if (Math.abs(top - window.scrollY) > 1) {
          window.scrollTo({ top: Math.max(top, 0), left: window.scrollX });
        }
      }
      if (performance.now() - started < SETTLE_MS) requestAnimationFrame(pin);
    })();
  }

  // Capture "v" before GitLab handles it. One owner prevents duplicate toggles.
  document.addEventListener(
    'keydown',
    function (event) {
      if (
        event.key !== 'v' ||
        event.ctrlKey ||
        event.altKey ||
        event.metaKey ||
        event.shiftKey ||
        event.isComposing ||
        event.target.closest(
          'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"]',
        )
      )
        return;

      const file = focusedFile();
      const checkbox = file && file.querySelector(REVIEW_CHECKBOX);
      if (!checkbox || checkbox.disabled) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      if (event.repeat) return;

      const marking = !checkbox.checked;
      const key = fileKey(file);
      checkbox.click();
      if (!marking || !checkbox.checked) return;

      requestAnimationFrame(function () {
        goToNextFile(file);
        pinNextFile(key);
      });
    },
    true,
  );
})();
