import '../css/app.css';
import { createInertiaApp } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';

import { LanguageProvider } from './context/language-context';

const appName = window.document.getElementsByTagName('title')[0]?.innerText || 'លៀសហាល អ៉ីទុម POS';

createInertiaApp({
    title: (title) => (title ? `${title} — ${appName}` : appName),
    resolve: (name) => {
        const pages = import.meta.glob<{ default: React.ComponentType<any> }>('./pages/**/*.tsx', {
            eager: true,
        });
        const page = pages[`./pages/${name}.tsx`];
        if (!page) {
            throw new Error(`Page ./pages/${name}.tsx not found.`);
        }
        return page;
    },
    setup({ el, App, props }) {
        if (!el) return;
        const root = createRoot(el);
        root.render(
            <LanguageProvider>
                <App {...props} />
            </LanguageProvider>
        );
    },
    progress: {
        color: '#f59e0b',
        showSpinner: false,
    },
});
