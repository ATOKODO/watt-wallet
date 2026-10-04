import path from 'node:path';
import { defineConfig, type DefaultTheme } from 'vitepress';
import { fileURLToPath } from 'node:url';

const docsRoot = fileURLToPath(new URL('../', import.meta.url));
const repository = 'https://github.com/ATOKODO/watt-wallet';
const base = '/' + (process.env.DOCS_BASE_PATH ?? '').replace(/^\/+|\/+$/g, '') + '/';
const siteBase = base === '//' ? '/' : base;
const features = {
  en: [
    ['Devices and quantities', 'add-edit-and-remove-devices'],
    ['Profiles and JSON', 'create-a-reusable-profile'],
    ['3D board and grid', 'organize-and-explore-the-board'],
    ['Electricity tariff', 'enter-your-tariff'],
    ['Scenarios and savings', 'compare-a-scenario'],
    ['Simulated power', 'simulate-devices-running-now'],
    ['Bill benchmark', 'compare-with-your-bills'],
    ['Theme and language', 'personalize-the-interface'],
    ['Sharing and backups', 'share-and-back-up'],
    ['Saving and recovery', 'saving-and-recovery'],
    ['Troubleshooting', 'troubleshooting'],
  ],
  fr: [
    ['Appareils et quantités', 'ajouter-modifier-et-retirer-des-appareils'],
    ['Fiches et JSON', 'créer-une-fiche-réutilisable'],
    ['Plateau 3D et grille', 'organiser-et-explorer-le-plateau'],
    ['Tarif électrique', 'renseigner-votre-tarif'],
    ['Scénarios et économies', 'comparer-un-scénario'],
    ['Puissance simulée', 'simuler-les-appareils-allumés-maintenant'],
    ['Repère de facture', 'comparer-avec-vos-factures'],
    ['Thème et langue', 'personnaliser-linterface'],
    ['Partage et sauvegardes', 'partager-et-sauvegarder'],
    ['Enregistrement et récupération', 'enregistrement-et-récupération'],
    ['Dépannage', 'dépannage'],
  ],
};
function sidebar(lang: 'en' | 'fr'): DefaultTheme.SidebarItem[] {
  const fr = lang === 'fr';
  const prefix = '/' + lang + '/';
  return [
    {
      text: fr ? 'Commencer' : 'Getting started',
      items: [
        { text: 'Introduction', link: prefix },
        { text: fr ? 'Guide utilisateur' : 'User guide', link: prefix + 'user-guide' },
        {
          text: fr ? 'Premier logement' : 'Your first home',
          link: prefix + 'user-guide#' + (fr ? 'votre-premier-logement' : 'your-first-home'),
        },
      ],
    },
    {
      text: fr ? 'Fonctionnalités' : 'Features',
      collapsed: false,
      items: features[lang].map(([text, anchor]) => ({ text, link: prefix + 'user-guide#' + anchor })),
    },
    {
      text: fr ? 'Comprendre et développer' : 'Understand and build',
      collapsed: false,
      items: [
        { text: fr ? 'Calculs et estimations' : 'Calculations and estimates', link: prefix + 'calculations' },
        { text: fr ? 'Format .wattpack' : '.wattpack format', link: prefix + 'wattpack' },
        { text: fr ? 'Exemples et captures' : 'Examples and screenshots', link: prefix + 'examples' },
        { text: fr ? 'Guide développeur' : 'Developer guide', link: prefix + 'development' },
        { text: 'Design system & Storybook', link: prefix + 'design-system' },
        { text: fr ? 'Vérifications et limites' : 'Verification and limits', link: prefix + 'verification' },
      ],
    },
  ];
}
function locale(lang: 'en' | 'fr') {
  const fr = lang === 'fr';
  return {
    label: fr ? 'Français' : 'English',
    lang,
    title: 'Watt Wallet',
    description: fr
      ? 'Composez votre logement, comprenez votre consommation et comparez des scénarios.'
      : 'Build your home, understand electricity use and compare scenarios.',
    markdown: fr
      ? {
          codeCopyButton: { tooltipText: 'Copier le code', copiedText: 'Copié' },
          container: {
            tipLabel: 'CONSEIL',
            warningLabel: 'ATTENTION',
            dangerLabel: 'DANGER',
            infoLabel: 'INFO',
            detailsLabel: 'Détails',
          },
        }
      : {},
    themeConfig: {
      logoLink: siteBase + lang + '/',
      nav: [
        { text: 'Introduction', link: '/' + lang + '/' },
        { text: fr ? 'Guide utilisateur' : 'User guide', link: '/' + lang + '/user-guide' },
        { text: fr ? 'Développeurs' : 'Developers', link: '/' + lang + '/development' },
      ],
      sidebar: { ['/' + lang + '/']: sidebar(lang) },
      outline: { level: [2, 3] as [number, number], label: fr ? 'Sur cette page' : 'On this page' },
      docFooter: { prev: fr ? 'Précédent' : 'Previous', next: fr ? 'Suivant' : 'Next' },
      darkModeSwitchLabel: fr ? 'Apparence' : 'Appearance',
      darkModeSwitchTitle: fr ? 'Activer le mode sombre' : 'Switch to dark theme',
      lightModeSwitchTitle: fr ? 'Activer le mode clair' : 'Switch to light theme',
      sidebarMenuLabel: fr ? 'Menu' : 'Menu',
      returnToTopLabel: fr ? 'Retour en haut' : 'Return to top',
      langMenuLabel: fr ? 'Choisir la langue' : 'Change language',
      skipToContentLabel: fr ? 'Aller au contenu' : 'Skip to content',
      editLink: {
        pattern: repository + '/edit/master/docs/:path',
        text: fr ? 'Modifier cette page sur GitHub' : 'Edit this page on GitHub',
      },
    },
  };
}

export default defineConfig({
  title: 'Watt Wallet',
  description: 'Watt Wallet documentation · Documentation Watt Wallet',
  base: siteBase,
  cleanUrls: false,
  srcExclude: ['.vitepress/public/**'],
  head: [['link', { rel: 'icon', href: siteBase + 'favicon.svg', type: 'image/svg+xml' }]],
  locales: { en: locale('en'), fr: locale('fr') },
  themeConfig: {
    logo: '/favicon.svg',
    siteTitle: 'Watt Wallet · Docs',
    socialLinks: [{ icon: 'github', link: repository }],
    search: {
      provider: 'local',
      options: {
        locales: {
          fr: {
            translations: {
              button: { buttonText: 'Rechercher', buttonAriaLabel: 'Rechercher dans la documentation' },
              modal: {
                displayDetails: 'Afficher les détails',
                resetButtonTitle: 'Effacer la recherche',
                backButtonTitle: 'Fermer la recherche',
                noResultsText: 'Aucun résultat pour',
                footer: { selectText: 'sélectionner', navigateText: 'naviguer', closeText: 'fermer' },
              },
            },
          },
        },
      },
    },
  },
  vite: { publicDir: path.join(docsRoot, '.vitepress/public') },
  markdown: {
    anchor: {
      // Match GitHub heading anchors, including French accents.
      slugify: (heading) =>
        heading
          .toLowerCase()
          .trim()
          .replace(/[^\p{L}\p{N}\p{M}\s_-]/gu, '')
          .replace(/\s/g, '-'),
    },
    image: { lazyLoad: true },
    config(md) {
      const renderLink = md.renderer.rules.link_open!;
      md.renderer.rules.link_open = (tokens, index, options, env, renderer) => {
        // Custom file extensions are downloads, never documentation routes.
        if (/\.(?:wattpack|glb)(?:[?#]|$)/.test(tokens[index].attrGet('href') ?? ''))
          tokens[index].attrSet('download', '');
        // Standalone screenshot galleries are HTML documents outside the Vue router.
        if (/\/screenshots\/.*\.html(?:[?#]|$)/.test(tokens[index].attrGet('href') ?? ''))
          tokens[index].attrSet('target', '_self');
        return renderLink(tokens, index, options, env, renderer);
      };
      // Keep repository Markdown links portable; normalize them only in the site renderer.
      md.core.ruler.before('normalize', 'watt-wallet-site-links', (state) => {
        if (!state.env.path) return;
        const source = state.env.path;
        const lang = state.env.relativePath?.startsWith('fr/') ? 'fr' : 'en';
        const sourceParts = state.src.split(/(^```[^\n]*\n[\s\S]*?^```[^\n]*$)/gm);
        state.src = sourceParts
          .map((part, index) => {
            if (index % 2) return part;
            return part.replace(/(!?\[[^\]]*\]\()([^\s)]+)(\))/g, (_, start, href, end) => {
              if (/^(?:[a-z]+:|#|\/)/i.test(href)) return start + href + end;
              const [target, hash] = href.split('#');
              const absolute = path.resolve(path.dirname(source), target);
              let normalized = href;
              if (absolute === path.resolve(docsRoot, '../README.md')) normalized = '/en/';
              else if (absolute === path.resolve(docsRoot, '../README.fr.md')) normalized = '/fr/';
              else if (absolute === path.resolve(docsRoot, '../examples'))
                normalized = '/' + lang + '/examples.md';
              else if (absolute.startsWith(path.resolve(docsRoot, '../examples') + path.sep))
                normalized = '/examples/' + path.basename(absolute);
              else if (absolute === path.join(docsRoot, 'wattpack.schema.json'))
                normalized = '/wattpack.schema.json';
              else if (
                absolute.startsWith(path.join(docsRoot, 'screenshots') + path.sep) &&
                !target.endsWith('.md')
              )
                normalized = '/' + path.relative(docsRoot, absolute).split(path.sep).join('/');
              if (normalized !== href && hash) normalized += '#' + hash;
              return start + normalized + end;
            });
          })
          .join('')
          .replace(/^\[English\][^\n]*\n\s*\n/, '');
      });
    },
  },
});
