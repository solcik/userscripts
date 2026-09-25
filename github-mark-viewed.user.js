// ==UserScript==
// @name         GitHub — mark file as Viewed with "v"
// @namespace    https://github.com/solcik/userscripts
// @version      0.6.0
// @description  In a GitHub pull request diff view: "v" marks the focused file viewed and moves on, "j"/"k" go to the next/previous file, "u" un-marks the last file "v" marked, and "V" shows or hides viewed files. The first "v" on a pull request only hides viewed files.
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
  // "diff-<sha>" id; the wrapper element around it differs between them. The sha
  // hashes the file path, so the id also survives a reload.
  const FILE_ID = /^diff-[0-9a-f]{16,}$/;

  // GitHub has no "next file" shortcut of its own, so we scroll. The page header
  // is sticky and GitHub sets no scroll-padding, so measure whatever is currently
  // pinned to the top edge rather than hard-coding its height.
  const EDGE = 4;
  const SETTLE_MS = 400;

  // The file filter is a Primer ActionMenu. Its items render only while it is
  // open, and its trigger carries no stable id, so find it by its filter icon.
  const FILTER_TRIGGER = 'button[aria-haspopup="true"]:has(svg.octicon-filter)';
  const VIEWED_FILTER_LABEL = 'Viewed files';
  const WAIT_MS = 1500;

  const UNDO_KEY = 'github-mark-viewed:undo:';

  // ---- Page model: files, focus, scrolling -------------------------------

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

  function isViewed(file) {
    const button = file.querySelector(VIEWED_BUTTON);
    return !!button && button.getAttribute('aria-pressed') === 'true';
  }

  // Marking a file viewed collapses it — or drops it from the list entirely when
  // "Viewed files" is unchecked — so the layout keeps moving for a few frames
  // after the click. Re-pin the file to the top until it settles. A newer pin
  // cancels an older one, so fast key presses do not fight over the scroll.
  let pinToken = 0;

  function scrollToFile(id) {
    const token = ++pinToken;
    const started = performance.now();

    (function pin() {
      if (token !== pinToken) return;
      const file = document.getElementById(id);
      if (file) {
        const top = window.scrollY + file.getBoundingClientRect().top - topChrome();
        if (Math.abs(top - window.scrollY) > 1) window.scrollTo({ top, left: window.scrollX });
      }
      if (performance.now() - started < SETTLE_MS) requestAnimationFrame(pin);
    })();
  }

  // Poll once per frame until check() returns something truthy, then hand it to
  // done(). After WAIT_MS, done() gets null.
  function waitFor(check, done) {
    const started = performance.now();

    (function poll() {
      const value = check();
      if (value) done(value);
      else if (performance.now() - started < WAIT_MS) requestAnimationFrame(poll);
      else done(null);
    })();
  }

  // ---- "Viewed files" filter ---------------------------------------------

  function viewedFilterItem() {
    return [...document.querySelectorAll('[role="menuitemcheckbox"]')].find(
      (item) => item.textContent.trim() === VIEWED_FILTER_LABEL,
    );
  }

  function closeMenu() {
    if (!viewedFilterItem()) return;
    const target = document.activeElement || document.body;
    target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  }

  // Open the file filter and set "Viewed files" to `show`, or flip it when `show`
  // is undefined. Calls done(changed) once the menu is closed again. Returns
  // false when this diff view has no such filter.
  function setViewedFilter(show, done) {
    const trigger = document.querySelector(FILTER_TRIGGER);
    if (!trigger) return false;

    trigger.click();
    waitFor(viewedFilterItem, function (item) {
      let changed = false;
      if (item) {
        const shown = item.getAttribute('aria-checked') === 'true';
        const wanted = show === undefined ? !shown : show;
        changed = wanted !== shown;
        if (changed) item.click();
      }
      requestAnimationFrame(function () {
        closeMenu();
        done(changed);
      });
    });

    return true;
  }

  // ---- Per pull request state --------------------------------------------

  // "/files" and "/changes" are the same pull request, so key state by its base.
  function pullKey() {
    const match = location.pathname.match(/^\/[^/]+\/[^/]+\/pull\/\d+/);
    return match ? match[0] : location.pathname;
  }

  // Undo stack of file ids that "v" marked viewed, kept per pull request in
  // sessionStorage so that it survives a reload of the tab.
  function loadUndo() {
    try {
      return JSON.parse(sessionStorage.getItem(UNDO_KEY + pullKey())) || [];
    } catch {
      return [];
    }
  }

  function saveUndo(ids) {
    try {
      sessionStorage.setItem(UNDO_KEY + pullKey(), JSON.stringify(ids));
    } catch {
      // Storage can be blocked; undo then lasts only until the next press.
    }
  }

  // GitHub navigates between pull requests without a page load, so remember
  // which one already had its viewed files hidden.
  let filteredPull = null;

  // ---- Commands ------------------------------------------------------------

  function toggleFocusedFile() {
    const files = diffFiles();
    const index = focusedIndex(files);
    if (index < 0) return;

    const file = files[index];
    const button = file.querySelector(VIEWED_BUTTON);
    if (!button) return;

    // Un-viewing expands the file again, which is the whole point of pressing
    // "v" on an already-viewed file — stay put so it can actually be read.
    const marking = !isViewed(file);

    button.click();
    if (!marking) return;

    saveUndo([...loadUndo().filter((id) => id !== file.id), file.id]);

    const next = files[index + 1];
    if (next) scrollToFile(next.id);
  }

  function markViewed() {
    if (filteredPull === pullKey()) {
      toggleFocusedFile();
      return;
    }

    // In a long pull request the viewed files above the viewport confuse the
    // focus lookup, so the first press only hides them. It toggles nothing,
    // because the layout is still moving and the focused file is not known yet.
    // If they were hidden already, the press toggles as usual.
    const found = setViewedFilter(false, function (changed) {
      if (!changed) toggleFocusedFile();
    });

    if (found) filteredPull = pullKey();
    else toggleFocusedFile();
  }

  function goToNextFile() {
    const files = diffFiles();
    const next = files[focusedIndex(files) + 1];
    if (next) scrollToFile(next.id);
  }

  // Like "k" in an editor: from the middle of a file, go to its start first.
  function goToPreviousFile() {
    const files = diffFiles();
    const index = focusedIndex(files);
    if (index < 0) return;

    const scrolledInto = files[index].getBoundingClientRect().top < topChrome() - EDGE;
    const target = scrolledInto ? files[index] : files[index - 1];
    if (target) scrollToFile(target.id);
  }

  function unmark(file) {
    if (isViewed(file)) file.querySelector(VIEWED_BUTTON).click();
  }

  // Un-mark the last file "v" marked and jump to it. With viewed files hidden
  // that file is not in the page, so show them for a moment, un-mark it, wait
  // until GitHub reflects that, and hide them again.
  function undoLastMark() {
    const ids = loadUndo();
    const id = ids.pop();
    if (!id) return;
    saveUndo(ids);

    const present = document.getElementById(id);
    if (present) {
      unmark(present);
      scrollToFile(id);
      return;
    }

    const found = setViewedFilter(true, function (shown) {
      waitFor(
        () => document.getElementById(id),
        function (file) {
          if (!file) {
            if (shown) setViewedFilter(false, () => {});
            return;
          }

          unmark(file);
          waitFor(
            () => !isViewed(file),
            function () {
              if (shown) setViewedFilter(false, () => scrollToFile(id));
              else scrollToFile(id);
            },
          );
        },
      );
    });

    if (!found) saveUndo([...ids, id]);
  }

  // Show or hide viewed files without changing any review state, and keep the
  // focused file in place. A viewed file that gets hidden cannot stay in place,
  // so then the view lands on the file that follows it.
  function togglePeek() {
    const files = diffFiles();
    const index = focusedIndex(files);
    const keep = files.slice(Math.max(index, 0)).map((file) => file.id);

    const found = setViewedFilter(undefined, function () {
      const id = keep.find((candidate) => document.getElementById(candidate));
      if (id) scrollToFile(id);
    });

    if (found) filteredPull = pullKey();
  }

  Mousetrap.bind('v', markViewed);
  Mousetrap.bind('j', goToNextFile);
  Mousetrap.bind('k', goToPreviousFile);
  Mousetrap.bind('u', undoLastMark);
  Mousetrap.bind('shift+v', togglePeek);
})();
