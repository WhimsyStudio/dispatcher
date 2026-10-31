import { defineConfig } from 'vitepress';

export default defineConfig({
  base: '/dispatcher/docs/',
  head: [['link', { rel: 'icon', href: '/dispatcher/docs/api/assets/favicon.png' }]],
  locales: {
    root: {
      label: 'English',
      lang: 'en-US',
      title: 'Dispatcher',
      description: 'Typed request/response messaging for Web Workers',
      themeConfig: {
        nav: [
          { text: 'Guide', link: '/guide/quick-start' },
          { text: 'Examples', link: '/examples/' },
          { text: 'API Reference', link: '/api/', target: '_blank' },
        ],
        sidebar: {
          '/guide/': [
            {
              text: 'Guide',
              items: [
                { text: 'Quick start', link: '/guide/quick-start' },
                { text: 'Requests and cancellation', link: '/guide/requests' },
                { text: 'Events and errors', link: '/guide/events-errors' },
              ],
            },
          ],
        },
      },
    },
    '/zh-CN/': {
      label: '简体中文',
      link: '/zh-CN/',
      lang: 'zh-CN',
      title: 'Dispatcher',
      description: '用于 Web Worker 的类型安全请求与响应通信',
      themeConfig: {
        nav: [
          { text: '使用指南', link: '/zh-CN/guide/quick-start' },
          { text: '示例', link: '/zh-CN/examples/' },
          { text: 'API 参考', link: '/api/', target: '_blank' },
        ],
        sidebar: {
          '/zh-CN/guide/': [
            {
              text: '使用指南',
              items: [
                { text: '快速开始', link: '/zh-CN/guide/quick-start' },
                { text: '请求与取消', link: '/zh-CN/guide/requests' },
                { text: '事件与错误', link: '/zh-CN/guide/events-errors' },
              ],
            },
          ],
        },
      },
    },
  },
  vite: {
    plugins: [
      {
        name: 'typedoc-directory-index',
        configureServer(server) {
          server.middlewares.use((request, _response, next) => {
            const requestUrl = request.url;
            if (requestUrl) {
              const url = new URL(requestUrl, 'http://localhost');
              if (url.pathname === '/dispatcher/docs/api/') {
                request.url = `/dispatcher/docs/api/index.html${url.search}`;
              }
            }
            next();
          });
        },
      },
    ],
  },
});
