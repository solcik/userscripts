// ==UserScript==
// @name         GitHub — mark file as Viewed with "v"
// @namespace    https://github.com/solcik/userscripts
// @version      0.3.0
// @description  In a GitHub pull request diff view, press "v" to toggle the focused file's "Viewed" button and advance to the next file.
// @author       David Solc
// @match        https://github.com/*/*/pull/*
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

  const VIEWED_BUTTON = 'button[class*="MarkAsViewedButton-module"]';

  // Both the React diff view and the older server-rendered one give every file a
  // "diff-<sha>" id; the wrapper element around it differs between them.
  const FILE_ID = /^diff-[0-9a-f]{16,}$/;

  // GitHub has no "next file" shortcut of its own, so we scroll. The page header
  // is sticky and GitHub sets no scroll-padding, so measure whatever is currently
  // pinned to the top edge rather than hard-coding its height.
  const EDGE = 4;
  const SETTLE_MS = 400;

  function diffFiles() {
    return [...document.querySelectorAll('div[id^="diff-"]')].filter((el) => FILE_ID.test(el.id));
  }

  function topChrome() {
    const padding = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop);
    let bottom = Number.isFinite(padding) ? padding : 0;

    for (const el of document.elementsFromPoint(Math.round(window.innerWidth / 2), 1)) {
      const position = getComputedStyle(el).position;
      if (position === 'fixed' || position === 'sticky') {
        bottom = Math.max(bottom, el.getBoundingClientRect().bottom);
      }
    }

    return bottom;
  }

  // The file being read is the topmost one still visible below the page header.
  function focusedIndex(files) {
    if (files.length < 2) return files.length - 1;

    const edge = topChrome() + EDGE;
    const index = files.findIndex((file) => file.getBoundingClientRect().bottom > edge);
    return index === -1 ? files.length - 1 : index;
  }

  // Marking a file viewed collapses it — or drops it from the list entirely when
  // "Viewed files" is unchecked — so the layout keeps moving for a few frames
  // after the click. Re-pin the next file to the top until it settles.
  function scrollToFile(id) {
    const started = performance.now();

    (function pin() {
      const file = document.getElementById(id);
      if (file) {
        const top = window.scrollY + file.getBoundingClientRect().top - topChrome();
        if (Math.abs(top - window.scrollY) > 1) window.scrollTo({ top, left: window.scrollX });
      }
      if (performance.now() - started < SETTLE_MS) requestAnimationFrame(pin);
    })();
  }

  Mousetrap.bind('v', function () {
    const files = diffFiles();
    const index = focusedIndex(files);
    if (index < 0) return;

    const button = files[index].querySelector(VIEWED_BUTTON);
    if (!button) return;

    button.click();

    const next = files[index + 1];
    if (next) scrollToFile(next.id);
  });
})();
