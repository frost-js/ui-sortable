const $ = globalThis.fQuery;
const { Sortable } = globalThis.UI;
const themeKey = 'frostui-sortable-demo-theme';

const setTheme = (theme) => {
    if (theme === 'system') {
        $(document.documentElement).removeAttribute('data-ui-theme');
    } else {
        $(document.documentElement).setAttribute('data-ui-theme', theme);
    }

    $('[data-demo-theme]').setValue(theme);
};

const logEvent = (message, className = 'text-body-secondary') => {
    const log = $.findOne('#event-log');
    const entry = $.create('div', {
        class: ['small', 'font-monospace', 'py-2', 'border-bottom', className],
        text: message,
    });

    $.append(log, entry);

    while ($.children(log).length > 50) {
        $.remove($.child(log)[0]);
    }

    $.setScrollY(log, $.height(log, { boxSize: $.SCROLL_BOX }));
};

$.ready(() => {
    let storedTheme;

    try {
        storedTheme = localStorage.getItem(themeKey);
    } catch {
        // The demo remains usable when browser storage is unavailable.
    }

    const requestedTheme = new URLSearchParams(location.search).get('theme');
    const initialTheme = requestedTheme || storedTheme;
    setTheme(['light', 'dark'].includes(initialTheme) ? initialTheme : 'system');

    $('[data-demo-theme]').addEvent('change', (event) => {
        const theme = $.getValue(event.currentTarget);
        setTheme(theme);

        try {
            if (theme === 'system') {
                localStorage.removeItem(themeKey);
            } else {
                localStorage.setItem(themeKey, theme);
            }
        } catch {
            // Theme selection still applies for the current page.
        }
    });

    $('#clear-log').addEvent('click', () => {
        $('#event-log').empty();
    });

    $('[data-ui-toggle="sortable"]').sortable();

    $.addEvent(
        '#methods-list',
        'sort.ui.sortable sorting.ui.sortable sorted.ui.sortable update.ui.sortable',
        (event) => {
            const item = $.getText(event.item).trim();
            logEvent(`${event.type}.ui.sortable — ${item}: ${event.oldIndex} → ${event.newIndex}`);
        },
    );

    $('[data-demo-method]').addEvent('click', (event) => {
        const method = $.getDataset(event.currentTarget, 'demoMethod');
        const current = $.getData('#methods-list', 'sortable');

        switch (method) {
            case 'init':
                Sortable.init($.findOne('#methods-list'));
                $.setText('#method-output', current ? 'Already initialized.' : 'Initialized.');
                break;
            case 'dispose':
                if (current) {
                    current.dispose();
                    $.setText('#method-output', 'Disposed. Drag events are detached.');
                } else {
                    $.setText('#method-output', 'Already disposed.');
                }
                break;
            case 'enable':
                Sortable.init($.findOne('#methods-list')).enable();
                $.setText('#method-output', 'Enabled.');
                break;
            case 'disable':
                Sortable.init($.findOne('#methods-list')).disable();
                $.setText('#method-output', 'Disabled.');
                break;
        }
    });
});
