/** @import { SortableEventData } from './sortable.js'; */

import $ from '@fr0st/query';

const cursorLocks = new WeakMap();

/**
 * Resets the cursor style for a collection of elements.
 * @param {Iterable<HTMLElement>} nodes The elements to restore.
 */
export function resetCursor(nodes) {
    for (const node of nodes) {
        const release = cursorLocks.get(node);

        if (!release) {
            continue;
        }

        release();
        cursorLocks.delete(node);
    }
};

/**
 * Sets the cursor style for a collection of elements.
 * @param {Iterable<HTMLElement>} nodes The elements to update.
 * @param {string} cursor The cursor style.
 */
export function setCursor(nodes, cursor) {
    for (const node of nodes) {
        if (cursorLocks.has(node)) {
            $.setStyle(node, { cursor });
        } else {
            cursorLocks.set(node, $.setStyleLock(node, 'cursor', cursor));
        }
    }
};

/**
 * Triggers a Sortable event with its data and detail payloads.
 * @param {HTMLElement} node The event target.
 * @param {string} name The event name without its namespace.
 * @param {SortableEventData} data The sorting event data.
 */
export function triggerSortableEvent(node, name, data) {
    $.triggerEvent(node, `${name}.ui.sortable`, {
        data,
        detail: {
            target: data.item,
            ...data,
        },
    });
};
