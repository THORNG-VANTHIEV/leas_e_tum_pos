import { useEffect, useRef } from 'react';
import { usePage } from '@inertiajs/react';
import { PageProps, PrintJobBatch } from '@/types';

export const PRINT_DONE_MESSAGE = 'leashal:print-done';

// A job that never reports back (e.g. the print dialog was left open) must not block the next slip forever
const JOB_TIMEOUT_MS = 60_000;
const PROCESSED_KEY = 'leashal_printed_batches';

/**
 * Inside a print page opened by the queue: print once, then tell the parent window we are done.
 */
export function useAutoPrint(onPrint: () => void = () => window.print()) {
    useEffect(() => {
        if (new URLSearchParams(window.location.search).get('autoprint') !== '1') return;

        const notifyParent = () => window.parent?.postMessage({ type: PRINT_DONE_MESSAGE }, window.location.origin);
        window.addEventListener('afterprint', notifyParent, { once: true });

        // Let fonts and layout settle so Khmer glyphs render before the print snapshot
        const timer = window.setTimeout(onPrint, 300);

        return () => {
            window.clearTimeout(timer);
            window.removeEventListener('afterprint', notifyParent);
        };
    }, []);
}

function wasProcessed(token: string): boolean {
    try {
        return JSON.parse(sessionStorage.getItem(PROCESSED_KEY) || '[]').includes(token);
    } catch {
        return false;
    }
}

function markProcessed(token: string) {
    try {
        const tokens: string[] = JSON.parse(sessionStorage.getItem(PROCESSED_KEY) || '[]');
        sessionStorage.setItem(PROCESSED_KEY, JSON.stringify([...tokens.slice(-19), token]));
    } catch {
        // Storage unavailable: worst case a slip may print twice after a reload
    }
}

function printInHiddenFrame(url: string): Promise<void> {
    return new Promise((resolve) => {
        const frame = document.createElement('iframe');
        frame.setAttribute('aria-hidden', 'true');
        frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';

        const finish = () => {
            window.removeEventListener('message', onMessage);
            window.clearTimeout(timeout);
            // Give the spooler a moment before tearing the frame down
            window.setTimeout(() => frame.remove(), 1000);
            resolve();
        };
        const onMessage = (event: MessageEvent) => {
            if (event.origin === window.location.origin && event.source === frame.contentWindow && event.data?.type === PRINT_DONE_MESSAGE) {
                finish();
            }
        };
        const timeout = window.setTimeout(finish, JOB_TIMEOUT_MS);

        window.addEventListener('message', onMessage);
        frame.src = url;
        document.body.appendChild(frame);
    });
}

/**
 * Prints the kitchen ticket / receipt batch flashed by the server after hold-table or checkout,
 * one slip after another on the cashier's printer.
 */
export function PrintQueue() {
    const { flash } = usePage<PageProps>().props;
    const batch: PrintJobBatch | null | undefined = flash?.print_jobs;
    const runningToken = useRef<string | null>(null);

    useEffect(() => {
        if (!batch || batch.jobs.length === 0 || wasProcessed(batch.token) || runningToken.current === batch.token) return;

        runningToken.current = batch.token;
        markProcessed(batch.token);

        (async () => {
            for (const job of batch.jobs) {
                await printInHiddenFrame(job.url);
            }
        })();
    }, [batch?.token]);

    return null;
}
