// Language switcher functionality
document.addEventListener('DOMContentLoaded', function() {
  const currentPath = window.location.pathname;
  const currentLang = getCurrentLanguage();

  // Create language switcher
  createLanguageSwitcher(currentLang, currentPath);

  // Handle language switcher clicks
  document.getElementById('language-switcher')?.addEventListener('click', function(e) {
    e.preventDefault();
    switchLanguage();
  });
});

function getCurrentLanguage() {
  const path = window.location.pathname;

  // Check if path starts with /en/ for English
  if (path.startsWith('/en/') || path === '/en' || path.startsWith('/en/') === 0) {
    return 'en';
  }

  // Default to Chinese
  return 'zh-CN';
}

function createLanguageSwitcher(currentLang, currentPath) {
  const menusItems = document.querySelector('.menus_items');
  if (!menusItems) return;

  // Create language switcher menu item
  const langItem = document.createElement('div');
  langItem.className = 'menus_item';

  const langLink = document.createElement('a');
  langLink.href = '#';
  langLink.className = 'site-page';
  langLink.id = 'language-switcher';

  const langIcon = document.createElement('i');
  langIcon.className = 'fas fa-language fa-fw';

  const langText = document.createElement('span');
  langText.textContent = ' ' + (currentLang === 'en' ? '中文' : 'English');

  langLink.appendChild(langIcon);
  langLink.appendChild(langText);
  langItem.appendChild(langLink);

  // Insert before the last menu item
  const lastItem = menusItems.lastElementChild;
  if (lastItem) {
    menusItems.insertBefore(langItem, lastItem);
  } else {
    menusItems.appendChild(langItem);
  }
}

function switchLanguage() {
  const currentLang = getCurrentLanguage();
  const currentPath = window.location.pathname;
  let newPath;

  if (currentLang === 'en') {
    // Switch from English to Chinese
    if (currentPath === '/en' || currentPath === '/en/') {
      newPath = '/';
    } else {
      newPath = currentPath.replace(/^\/en\//, '/');
    }
  } else {
    // Switch from Chinese to English
    if (currentPath === '/' || currentPath === '') {
      newPath = '/en/';
    } else {
      newPath = '/en' + currentPath;
    }
  }

  // Navigate to the new language version
  window.location.href = newPath;
}

// Add language switcher styles
const style = document.createElement('style');
style.textContent = `
  #language-switcher {
    cursor: pointer;
    transition: color 0.3s ease;
  }

  #language-switcher:hover {
    color: var(--theme-color) !important;
  }

  @media (max-width: 768px) {
    #language-switcher span {
      display: inline;
    }
  }
`;
document.head.appendChild(style);