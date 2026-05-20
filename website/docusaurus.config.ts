import type * as Preset from '@docusaurus/preset-classic'
import type { Config } from '@docusaurus/types'
import { themes as prismThemes } from 'prism-react-renderer'

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
    title: 'Twist SDK TypeScript',
    tagline: 'The TypeScript SDK for the Twist REST API.',
    favicon: 'img/favicon.ico',

    url: 'https://doist.github.io/',
    // Set the /<baseUrl>/ pathname under which your site is served
    // For GitHub pages deployment, it is often '/<projectName>/'
    baseUrl: '/twist-sdk-typescript/',

    organizationName: 'Doist',
    projectName: 'twist-sdk-typescript',

    onBrokenLinks: 'throw',
    onBrokenMarkdownLinks: 'warn',

    // Even if you don't use internationalization, you can use this field to set
    // useful metadata like html lang. For example, if your site is Chinese, you
    // may want to replace "en" with "zh-Hans".
    i18n: {
        defaultLocale: 'en',
        locales: ['en'],
    },

    presets: [
        [
            'classic',
            {
                docs: { sidebarPath: './sidebars.ts', routeBasePath: '/' },
                theme: {
                    customCss: './src/css/custom.css',
                },
                blog: false,
            } satisfies Preset.Options,
        ],
    ],

    themeConfig: {
        image: 'img/twist-social-card.png',
        navbar: {
            title: 'Twist SDK TypeScript',
            logo: {
                alt: 'Twist Logo',
                src: 'img/twist-logo.png',
            },
            items: [
                {
                    position: 'left',
                    label: 'Docs',
                    to: '/',
                },
                {
                    href: 'https://github.com/Doist/twist-sdk-typescript',
                    label: 'GitHub',
                    position: 'right',
                },
            ],
        },
        footer: {
            style: 'dark',
            links: [
                {
                    title: 'Docs',
                    items: [
                        {
                            label: 'Getting Started',
                            to: '/',
                        },
                        {
                            label: 'Authorization',
                            to: '/authorization',
                        },
                        {
                            label: 'API Reference',
                            to: '/api/classes/TwistApi',
                        },
                    ],
                },
                {
                    title: 'More',
                    items: [
                        {
                            label: 'Engineering at Doist',
                            href: 'https://doist.dev',
                        },
                        {
                            label: 'GitHub',
                            href: 'https://github.com/Doist/twist-sdk-typescript',
                        },
                    ],
                },
            ],
        },
        prism: {
            theme: prismThemes.github,
            darkTheme: prismThemes.dracula,
        },
    } satisfies Preset.ThemeConfig,

    plugins: [
        [
            'docusaurus-plugin-typedoc',
            {
                plugin: ['typedoc-plugin-zod'],
                out: './docs/api',
                entryPoints: ['../src/index.ts'],
                entryFileName: '',
                outputFileStrategy: 'members',
                readme: 'none',
                tsconfig: '../tsconfig.json',
                useCodeBlocks: true,
                sidebar: { autoConfiguration: true },
                disableSources: true,
                expandObjects: true,
                expandParameters: true,
                excludeNotDocumented: true,
                excludeNotDocumentedKinds: ['Variable'],
                excludeInternal: true,
                sanitizeComments: true,
                pageTitleTemplates: { member: '{name}' },

                /**
                 * Table formatting
                 */
                parametersFormat: 'table',
                interfacePropertiesFormat: 'table',
                classPropertiesFormat: 'table',
                typeDeclarationFormat: 'table',
                propertyMembersFormat: 'table',
                enumMembersFormat: 'table',
                indexFormat: 'table',
                tableColumnSettings: { hideInherited: true },
            },
        ],
    ],
}

export default config
