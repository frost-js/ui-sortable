import $ from '@fr0st/query';

/**
 * Resets the cursor style for a collection of elements.
 * @param {Iterable<HTMLElement>} nodes The elements to restore.
 */
export function resetCursor(nodes) {
    for (const node of nodes) {
        if (!$.hasDataset(node, 'uiOriginalCursor')) {
            continue;
        }

        $.setStyle(node, {
            cursor: $.getDataset(node, 'uiOriginalCursor'),
        });
        $.removeDataset(node, 'uiOriginalCursor');
    }
};

/**
 * Sets the cursor style for a collection of elements.
 * @param {Iterable<HTMLElement>} nodes The elements to update.
 * @param {string} cursor The cursor style.
 */
export function setCursor(nodes, cursor) {
    for (const node of nodes) {
        if (!$.hasDataset(node, 'uiOriginalCursor')) {
            $.setDataset(node, {
                uiOriginalCursor: $.getStyle(node, 'cursor'),
            });
        }

        $.setStyle(node, { cursor });
    }
};
