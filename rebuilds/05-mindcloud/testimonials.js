/* Seven fictional customer stories, paired with the approved backgrounds */
(() => {
  const feature = document.querySelector('.story-feature');
  const copy = feature.querySelector('.story-feature-copy');
  const backgrounds = [...feature.querySelectorAll('.story-background')];
  const stories = [
    {
      company: 'Cinder House',
      quote: 'Threadline helped our wholesale store work smoothly with the systems behind it. Orders and returns now move between Shopify and NetSuite reliably, giving our operations team a clearer picture and much less manual work to manage each day.',
      person: 'Morgan Hale',
      role: 'Director of Operations'
    },
    {
      company: 'Nexaform',
      quote: 'The team turned a difficult connection into a dependable workflow. Threadline replaced our fragile custom connector with a solution that fits our process, gives us clearer reporting, and helps us understand what is happening without chasing updates across several systems.',
      person: 'Casey Arden',
      role: 'Business Systems Solution Engineer'
    },
    {
      company: 'Elmstead Works',
      quote: 'We needed our orders and inventory to agree across the business. Threadline took the time to understand the details, connected our tools, and made the daily handoffs easier. Our team can now spend more time serving customers and less time checking spreadsheets.',
      person: 'Taylor Finch',
      role: 'Chief Operating Officer'
    },
    {
      company: 'Bramble Coffee',
      quote: 'As our wholesale business grew, the work between systems grew with it. Threadline helped connect our storefront and operations tools, so information reaches the right place and our team can focus on the next order instead of another round of data entry.',
      person: 'Jordan Vale',
      role: 'Head of Operations'
    },
    {
      company: 'Northfield Build',
      quote: 'Our teams were spending too much time moving information between disconnected tools. Threadline brought those processes together with a workflow that reflects how we actually work. We have a clearer view of each job and fewer manual handoffs slowing the team down.',
      person: 'Avery Stone',
      role: 'Director of Technology'
    },
    {
      company: 'Cedarwell',
      quote: 'The team understood that dependable integrations matter to the people doing the work every day. They helped us connect the right systems, simplify routine updates, and make our operations easier to follow. When we have questions, there is someone who knows our setup.',
      person: 'Riley Brook',
      role: 'Director of Operations'
    },
    {
      company: 'Greyhaven Logistics',
      quote: 'Threadline helped bring our distribution workflows together as one connected process. Information now moves between our business tools without the same repeated checks and updates. The team understands our operations and keeps the connections working as our requirements continue to change.',
      person: 'Parker Lane',
      role: 'VP of Information Technology'
    }
  ];

  // Reuse the section clock so opening the planning dialog pauses pending work.
  const clock = new ServiceTimeline();
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let current = 0;
  let started = false;

  function setCopy(index) {
    const story = stories[index];
    copy.querySelector('.story-feature-wordmark').textContent = story.company;
    copy.querySelector('blockquote').textContent = `“${story.quote}”`;
    copy.querySelector('.story-feature-name').textContent = story.person;
    copy.querySelector('.story-feature-role').textContent = story.role;
  }

  function syncPause() {
    clock.setPaused(document.hidden || !planningBackdrop.hidden || motion.matches);
  }

  async function rotateStories() {
    while (await clock.wait(5000)) {
      const next = (current + 1) % stories.length;
      const photo = backgrounds[next].querySelector('img');
      if (photo) {
        try {
          await photo.decode();
        } catch {
          continue;
        }
      }
      feature.classList.add('is-exiting');
      backgrounds[current].classList.remove('is-current');
      backgrounds[next].classList.add('is-current');
      if (!await clock.wait(300)) return;
      setCopy(next);
      feature.classList.remove('is-exiting');
      feature.classList.add('is-entering');
      if (!await clock.wait(300)) return;
      feature.classList.remove('is-entering');
      current = next;
    }
  }

  /* Start once enough of the featured story enters view; hover never pauses it. */
  const observer = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting || started) return;
    started = true;
    syncPause();
    rotateStories();
    observer.disconnect();
  }, { threshold: .35 });

  setCopy(0);
  syncPause();
  observer.observe(feature);
  document.addEventListener('visibilitychange', syncPause);
  motion.addEventListener('change', syncPause);
  new MutationObserver(syncPause).observe(planningBackdrop, {
    attributes: true,
    attributeFilter: ['hidden']
  });
})();
