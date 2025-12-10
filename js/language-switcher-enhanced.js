// Enhanced Language Switcher with additional features
class LanguageSwitcher {
  constructor() {
    this.currentLang = this.getCurrentLanguage();
    this.currentPath = window.location.pathname;
    this.init();
  }

  init() {
    this.createLanguageSwitcher();
    this.setupEventListeners();
    this.setupLanguagePersistence();
    this.setupAutoLanguageDetection();
  }

  getCurrentLanguage() {
    const path = window.location.pathname;

    // Check if path starts with /en/ for English
    if (path.startsWith('/en/') || path === '/en') {
      return 'en';
    }

    // Default to Chinese
    return 'zh-CN';
  }

  createLanguageSwitcher() {
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
    langText.textContent = ' ' + (this.currentLang === 'en' ? '中文' : 'English');

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

    // Add tooltip
    this.addTooltip(langLink, this.currentLang === 'en' ? '切换到中文' : 'Switch to English');
  }

  addTooltip(element, text) {
    element.title = text;
    element.setAttribute('data-tooltip', text);
  }

  setupEventListeners() {
    const switcher = document.getElementById('language-switcher');
    if (switcher) {
      switcher.addEventListener('click', (e) => {
        e.preventDefault();
        this.switchLanguage();
      });

      // Add hover effects
      switcher.addEventListener('mouseenter', () => {
        switcher.style.transform = 'scale(1.05)';
      });

      switcher.addEventListener('mouseleave', () => {
        switcher.style.transform = 'scale(1)';
      });
    }
  }

  switchLanguage() {
    const targetLang = this.currentLang === 'en' ? 'zh-CN' : 'en';
    const newPath = this.generateNewPath(targetLang);

    // Save language preference
    localStorage.setItem('preferred-language', targetLang);

    // Navigate to new language version
    window.location.href = newPath;
  }

  generateNewPath(targetLang) {
    const currentPath = window.location.pathname;

    if (targetLang === 'en') {
      // Switch to English
      if (currentPath === '/' || currentPath === '') {
        return '/en/';
      } else {
        return '/en' + currentPath;
      }
    } else {
      // Switch to Chinese
      if (currentPath === '/en' || currentPath === '/en/') {
        return '/';
      } else {
        return currentPath.replace(/^\/en\//, '/');
      }
    }
  }

  setupLanguagePersistence() {
    // Check if user has a preferred language
    const preferredLang = localStorage.getItem('preferred-language');

    if (preferredLang && preferredLang !== this.currentLang) {
      // Auto-switch to preferred language after a short delay
      setTimeout(() => {
        if (confirm(`检测到您偏好使用${preferredLang === 'en' ? 'English' : '中文'}，是否切换？`)) {
          this.currentLang = preferredLang;
          this.switchLanguage();
        }
      }, 1000);
    }
  }

  setupAutoLanguageDetection() {
    // Detect browser language on first visit
    if (!localStorage.getItem('language-detected')) {
      const browserLang = navigator.language || navigator.userLanguage;

      // If browser language is English and current site is Chinese, suggest switching
      if (browserLang.startsWith('en') && this.currentLang === 'zh-CN') {
        setTimeout(() => {
          if (confirm('Your browser language is English. Would you like to switch to the English version of this site?')) {
            this.currentLang = 'en';
            this.switchLanguage();
          }
        }, 2000);
      }

      localStorage.setItem('language-detected', 'true');
    }
  }

  // Utility method to create language-specific URLs
  static createLanguageUrl(path, lang) {
    if (lang === 'en') {
      return path === '/' ? '/en/' : `/en${path}`;
    } else {
      return path.replace(/^\/en\//, '/') || '/';
    }
  }

  // Utility method to check if a path is in English
  static isEnglishPath(path) {
    return path.startsWith('/en/') || path === '/en';
  }
}

// Initialize the language switcher when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  // Prevent multiple initializations
  if (!window.languageSwitcher) {
    window.languageSwitcher = new LanguageSwitcher();
  }
});

// Add enhanced styles
const enhancedStyles = `
  #language-switcher {
    cursor: pointer;
    transition: all 0.3s ease;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white !important;
    padding: 0.5rem 1rem;
    border-radius: 20px;
    font-weight: 500;
    position: relative;
    overflow: hidden;
  }

  #language-switcher::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
    transition: left 0.5s;
  }

  #language-switcher:hover::before {
    left: 100%;
  }

  #language-switcher:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
    color: white !important;
  }

  #language-switcher:active {
    transform: translateY(0);
  }

  #language-switcher i {
    margin-right: 0.5rem;
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); }
  }

  @media (max-width: 768px) {
    #language-switcher span {
      display: inline;
    }

    #language-switcher {
      padding: 0.4rem 0.8rem;
      font-size: 0.9rem;
    }
  }

  /* Dark mode support */
  [data-theme="dark"] #language-switcher {
    background: linear-gradient(135deg, #4a5568 0%, #2d3748 100%);
  }
`;

// Inject enhanced styles
const styleSheet = document.createElement('style');
styleSheet.textContent = enhancedStyles;
document.head.appendChild(styleSheet);

// Export for potential use by other scripts
window.LanguageSwitcher = LanguageSwitcher;