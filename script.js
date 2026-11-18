(() => {
  'use strict';

  const root = document.documentElement;
  const themeToggle = document.querySelector('.theme-toggle');
  const themeColor = document.querySelector('meta[name="theme-color"]');
  const themeKey = 'andrew-workbench-theme-v1';
  const searchInput = document.querySelector('#project-search');
  const searchResults = document.querySelector('#search-results');
  const projectCount = document.querySelector('#project-count');
  const projectCards = [...document.querySelectorAll('.project-card')];
  const collections = [...document.querySelectorAll('[data-collection-section]')];
  const projectDialog = document.querySelector('#project-dialog');
  const dialogImage = document.querySelector('#dialog-image');
  const dialogTitle = document.querySelector('#dialog-title');
  const dialogCategory = document.querySelector('#dialog-category');
  const dialogDescription = document.querySelector('#dialog-description');
  const dialogTags = document.querySelector('#dialog-tags');
  const menuButton = document.querySelector('#menu-button');
  const sidebar = document.querySelector('#site-sidebar');
  const mobileNavigation = window.matchMedia('(max-width: 850px)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let activeProjectButton;
  let selectedSearchResult = -1;

  function setTheme(theme, persist) {
    root.dataset.theme = theme;
    themeToggle.setAttribute('aria-label', theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
    themeToggle.title = theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme';
    themeToggle.setAttribute('aria-pressed', String(theme === 'light'));
    if (themeColor) themeColor.content = theme === 'light' ? '#f5f8fc' : '#080d14';
    if (persist) {
      try {
        window.localStorage.setItem(themeKey, theme);
      } catch (error) {
        // The selected theme remains active until this page is closed.
      }
    }
  }

  let savedTheme = 'dark';
  try {
    savedTheme = window.localStorage.getItem(themeKey) === 'light' ? 'light' : 'dark';
  } catch (error) {
    // Theme switching remains available for this visit when storage is disabled.
  }
  setTheme(savedTheme, false);
  themeToggle.addEventListener('click', () => {
    setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark', true);
  });

  function syncMobileNavigation() {
    const closedOnMobile = mobileNavigation.matches && !document.body.classList.contains('nav-open');
    sidebar.inert = closedOnMobile;
    sidebar.setAttribute('aria-hidden', String(closedOnMobile));
  }

  function closeMenu() {
    document.body.classList.remove('nav-open');
    syncMobileNavigation();
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Open project navigation');
  }

  menuButton.addEventListener('click', () => {
    const isOpen = document.body.classList.toggle('nav-open');
    syncMobileNavigation();
    menuButton.setAttribute('aria-expanded', String(isOpen));
    menuButton.setAttribute('aria-label', isOpen ? 'Close project navigation' : 'Open project navigation');
    if (isOpen) sidebar.querySelector('.nav-link').focus();
  });
  document.querySelectorAll('[data-menu-close], .sidebar-nav a').forEach((item) => {
    item.addEventListener('click', closeMenu);
  });
  mobileNavigation.addEventListener('change', syncMobileNavigation);
  syncMobileNavigation();

  function projectInfo(card) {
    const button = card.querySelector('.project-card-button');
    const title = card.querySelector('.project-title').textContent.trim();
    const description = card.querySelector('.project-description').textContent.trim();
    const category = card.querySelector('.project-category').textContent.trim();
    const image = card.querySelector('.project-preview img');
    const tags = [...card.querySelectorAll('.project-tags i')].map((tag) => tag.textContent.trim());
    const collection = card.dataset.collection;
    return { button, title, description, category, image, tags, collection };
  }

  function closeSearch() {
    searchResults.classList.remove('is-open');
    searchInput.setAttribute('aria-expanded', 'false');
    searchInput.removeAttribute('aria-activedescendant');
    selectedSearchResult = -1;
    searchResults.querySelectorAll('.search-result').forEach((result) => {
      result.setAttribute('aria-selected', 'false');
    });
  }

  function updateSearchResults(query) {
    searchResults.replaceChildren();
    selectedSearchResult = -1;
    if (!query) {
      closeSearch();
      return;
    }

    const matches = projectCards.filter((card) => {
      const info = projectInfo(card);
      const searchableText = `${info.title} ${info.description} ${info.category} ${info.tags.join(' ')}`.toLocaleLowerCase();
      return searchableText.includes(query);
    }).slice(0, 7);

    if (matches.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'search-empty';
      empty.textContent = 'No projects match that search.';
      searchResults.append(empty);
    } else {
      matches.forEach((card, index) => {
        const info = projectInfo(card);
        const result = document.createElement('button');
        result.className = 'search-result';
        result.type = 'button';
        result.role = 'option';
        result.id = `search-result-${index}`;
        result.setAttribute('aria-selected', 'false');
        result.dataset.project = card.dataset.project;
        const title = document.createElement('strong');
        title.textContent = info.title;
        const group = document.createElement('small');
        group.textContent = info.category;
        result.append(title, group);
        searchResults.append(result);
      });
    }

    searchResults.classList.add('is-open');
    searchInput.setAttribute('aria-expanded', 'true');
  }

  function applySearch() {
    const query = searchInput.value.trim().toLocaleLowerCase();
    let visibleCount = 0;
    projectCards.forEach((card) => {
      const info = projectInfo(card);
      const searchableText = `${info.title} ${info.description} ${info.category} ${info.tags.join(' ')}`.toLocaleLowerCase();
      const visible = !query || searchableText.includes(query);
      card.hidden = !visible;
      if (visible) visibleCount += 1;
    });
    collections.forEach((collection) => {
      collection.hidden = !collection.querySelector('.project-card:not([hidden])');
    });
    projectCount.textContent = query ? `Showing ${visibleCount} of ${projectCards.length} projects` : `${projectCards.length} projects`;
    updateSearchResults(query);
  }

  searchInput.addEventListener('input', applySearch);
  searchInput.addEventListener('focus', () => {
    if (searchInput.value.trim()) updateSearchResults(searchInput.value.trim().toLocaleLowerCase());
  });
  searchResults.addEventListener('click', (event) => {
    const result = event.target.closest('.search-result');
    if (!result) return;
    const card = projectCards.find((item) => item.dataset.project === result.dataset.project);
    closeSearch();
    if (card) openProject(card);
  });
  searchInput.addEventListener('keydown', (event) => {
    const results = [...searchResults.querySelectorAll('.search-result')];
    if (event.key === 'ArrowDown' && results.length) {
      event.preventDefault();
      selectedSearchResult = (selectedSearchResult + 1) % results.length;
      searchInput.setAttribute('aria-activedescendant', results[selectedSearchResult].id);
      results.forEach((result, index) => result.setAttribute('aria-selected', String(index === selectedSearchResult)));
    } else if (event.key === 'ArrowUp' && results.length) {
      event.preventDefault();
      selectedSearchResult = (selectedSearchResult - 1 + results.length) % results.length;
      searchInput.setAttribute('aria-activedescendant', results[selectedSearchResult].id);
      results.forEach((result, index) => result.setAttribute('aria-selected', String(index === selectedSearchResult)));
    } else if (event.key === 'Enter' && selectedSearchResult >= 0 && results[selectedSearchResult]) {
      event.preventDefault();
      results[selectedSearchResult].click();
    } else if (event.key === 'Escape') {
      closeSearch();
      searchInput.blur();
    }
  });
  document.addEventListener('keydown', (event) => {
    const target = event.target;
    const typing = target instanceof HTMLElement && (target.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(target.tagName));
    if (event.key === '/' && !typing) {
      event.preventDefault();
      searchInput.focus();
    } else if (event.key === 'Escape' && searchResults.classList.contains('is-open')) {
      closeSearch();
    }
  });

  function openProject(card) {
    const info = projectInfo(card);
    activeProjectButton = info.button;
    dialogImage.src = info.image.getAttribute('src');
    dialogImage.alt = info.image.alt;
    dialogTitle.textContent = info.title;
    dialogCategory.textContent = info.category;
    dialogDescription.textContent = info.description;
    dialogTags.replaceChildren(...info.tags.map((tag) => {
      const chip = document.createElement('span');
      chip.textContent = tag;
      return chip;
    }));
    projectDialog.showModal();
  }

  projectCards.forEach((card) => {
    card.querySelector('.project-card-button').addEventListener('click', () => openProject(card));
  });
  projectDialog.querySelector('.dialog-close').addEventListener('click', () => projectDialog.close());
  projectDialog.addEventListener('click', (event) => {
    if (event.target === projectDialog) projectDialog.close();
  });
  projectDialog.addEventListener('close', () => {
    if (activeProjectButton) activeProjectButton.focus({ preventScroll: true });
  });

  const backToTop = document.querySelector('.back-to-top');
  const progressBar = document.querySelector('.reading-progress span');
  function updateScrollControls() {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollable > 0 ? Math.min(100, (window.scrollY / scrollable) * 100) : 0;
    progressBar.style.width = `${progress}%`;
    backToTop.classList.toggle('is-visible', window.scrollY > 420);
  }
  window.addEventListener('scroll', updateScrollControls, { passive: true });
  window.addEventListener('resize', updateScrollControls);
  updateScrollControls();
  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
  });

  document.documentElement.dataset.app = 'ready';
})();
