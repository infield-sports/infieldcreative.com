// ============================================
// INFIELD 共通スクリプト
// ============================================

// モバイルメニュー開閉
const menuToggle = document.querySelector('.menu-toggle');
const globalNav = document.querySelector('.global-nav');

const collapseNavDropdowns = () => {
  globalNav.querySelectorAll('.nav-item.is-expanded').forEach((item) => {
    item.classList.remove('is-expanded');
    const toggle = item.querySelector('.nav-dropdown-toggle');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
  });
};

if (menuToggle && globalNav) {
  menuToggle.addEventListener('click', () => {
    const isOpen = globalNav.classList.toggle('is-open');
    menuToggle.classList.toggle('is-open', isOpen);
    menuToggle.setAttribute('aria-expanded', String(isOpen));
    menuToggle.setAttribute('aria-label', isOpen ? 'メニューを閉じる' : 'メニューを開く');
    if (!isOpen) collapseNavDropdowns();
  });

  // ナビ内リンクをタップしたら閉じる
  globalNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      globalNav.classList.remove('is-open');
      menuToggle.classList.remove('is-open');
      menuToggle.setAttribute('aria-expanded', 'false');
      collapseNavDropdowns();
    });
  });

  // SERVICEのサブメニュー開閉（アコーディオン）
  globalNav.querySelectorAll('.nav-dropdown-toggle').forEach((toggle) => {
    toggle.addEventListener('click', () => {
      const navItem = toggle.closest('.nav-item');
      if (!navItem) return;
      const isExpanded = navItem.classList.toggle('is-expanded');
      toggle.setAttribute('aria-expanded', String(isExpanded));
    });
  });
}

// ヘッダー: スクロールで隠す/カーソルを合わせると出てくる
const siteHeader = document.querySelector('.site-header');

if (siteHeader) {
  let lastScrollY = window.scrollY;
  let hideTimer = null;

  const isMenuOpen = () => globalNav && globalNav.classList.contains('is-open');

  const showHeader = () => {
    clearTimeout(hideTimer);
    siteHeader.classList.remove('is-hidden');
  };

  const scheduleHide = () => {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      if (window.scrollY > siteHeader.offsetHeight && !isMenuOpen()) {
        siteHeader.classList.add('is-hidden');
      }
    }, 500);
  };

  window.addEventListener(
    'scroll',
    () => {
      const currentY = window.scrollY;
      if (isMenuOpen()) {
        lastScrollY = currentY;
        return;
      }
      if (currentY <= siteHeader.offsetHeight) {
        showHeader();
      } else if (currentY > lastScrollY) {
        clearTimeout(hideTimer);
        siteHeader.classList.add('is-hidden');
      } else {
        showHeader();
        scheduleHide();
      }
      lastScrollY = currentY;
    },
    { passive: true }
  );

  siteHeader.addEventListener('mouseenter', showHeader);
  siteHeader.addEventListener('mouseleave', () => {
    if (window.scrollY > siteHeader.offsetHeight && !isMenuOpen()) {
      scheduleHide();
    }
  });

  const headerHoverZone = document.createElement('div');
  headerHoverZone.className = 'header-hover-zone';
  document.body.appendChild(headerHoverZone);
  headerHoverZone.addEventListener('mouseenter', showHeader);
}

// スクロールで要素をふわっと表示
const revealTargets = document.querySelectorAll('.reveal');

if ('IntersectionObserver' in window && revealTargets.length > 0) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  revealTargets.forEach((el) => observer.observe(el));
} else {
  // フォールバック: 全て表示
  revealTargets.forEach((el) => el.classList.add('is-visible'));
}
