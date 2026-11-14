/* =========================================================
   REVEAL — fade blocks up as they scroll into view.
   Adds .is-in once; the CSS does the motion.
   ========================================================= */

(function () {
  const blocks = document.querySelectorAll('.reveal');

  const watcher = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-in');
        watcher.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -12% 0px' });

  blocks.forEach(function (block) {
    watcher.observe(block);
  });
})();
