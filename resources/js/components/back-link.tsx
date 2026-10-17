import React from 'react';
import { router } from '@inertiajs/react';

/**
 * Pages visited inside the app since the last full page load. Inertia fires "navigate" for the
 * first page too, so more than one means the browser history holds an earlier page of this POS.
 */
let appVisits = 0;
if (typeof window !== 'undefined') {
    router.on('navigate', () => {
        appVisits += 1;
    });
}

/**
 * Go back to the page the user came from (e.g. Reports → invoice → back to Reports).
 * When the page was opened directly (new tab, reload, printed link) fall back to a sensible parent page.
 */
export function goBack(fallbackHref: string): void {
    if (appVisits > 1 && window.history.length > 1) {
        window.history.back();
        return;
    }

    router.visit(fallbackHref);
}

interface BackLinkProps {
    fallbackHref: string;
    className?: string;
    title?: string;
    children: React.ReactNode;
}

/**
 * Back button that returns to the previous page instead of a fixed list page.
 * Rendered as a real link so it still works with a middle-click or when JavaScript history is empty.
 */
export function BackLink({ fallbackHref, className = '', title, children }: BackLinkProps) {
    return (
        <a
            href={fallbackHref}
            title={title}
            onClick={(event) => {
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) {
                    return;
                }
                event.preventDefault();
                goBack(fallbackHref);
            }}
            className={className}
        >
            {children}
        </a>
    );
}
