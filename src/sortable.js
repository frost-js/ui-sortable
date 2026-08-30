import $ from '@fr0st/query';
import { BaseComponent, getPosition } from '@fr0st/ui';

/** @typedef {'x'|'y'} SortableAxis */

/**
 * @typedef {object} SortableOptions
 * @property {SortableAxis|null} [axis=null] The axis used to determine item placement.
 * @property {string} [cancel='input, textarea, button, select, option'] The selector for elements that cannot start a sort.
 * @property {string|null} [connectWith=null] The selector for connected Sortable containers.
 * @property {string} [cursor='auto'] The cursor applied to sortable items or handles.
 * @property {boolean} [disabled=false] Whether sorting is initially disabled.
 * @property {boolean} [dropOnEmpty=true] Whether connected empty containers accept items.
 * @property {string|null} [handle=null] The handle selector within each sortable item.
 * @property {string|null} [helperClass='bg-body-tertiary'] The class applied to an item while it is being sorted.
 * @property {string} [items=':scope > li'] The selector for sortable items.
 * @property {boolean} [scroll=true] Whether to scroll the window while sorting near an edge.
 * @property {number} [scrollSensitivity=20] The distance from a window edge that starts scrolling, in pixels.
 * @property {number} [scrollSpeed=5] The scroll distance applied on each update, in pixels.
 */

/**
 * Controls a sortable collection of elements.
 * @augments {BaseComponent<SortableOptions>}
 */
export default class Sortable extends BaseComponent {
    #checkScrollTimer;
    #currentIndex;
    #currentSortable;
    #enabled;
    #pos;
    #selector;
    #startIndex;
    #target;

    /**
     * Creates a Sortable.
     * @param {HTMLElement} node The sortable container.
     * @param {SortableOptions} [options] The Sortable options.
     */
    constructor(node, options) {
        super(node, options);

        this.#selector = this.options.items;
        if (this.options.handle) {
            this.#selector += ` ${this.options.handle}`;
        }

        this.#enabled = !this.options.disabled;

        this.#refreshCursors();
        this.#events();
    }

    /**
     * Disables the Sortable.
     */
    disable() {
        this.#enabled = false;
    }

    /** @inheritdoc */
    dispose() {
        $.removeEventDelegate(this.node, 'mousedown.ui.sortable touchstart.ui.sortable');
        $.removeEvent(this.node, 'receive.ui.sortable');

        clearTimeout(this.#checkScrollTimer);
        this.#checkScrollTimer = null;
        this.#target = null;
        this.#currentSortable = null;

        super.dispose();
    }

    /**
     * Enables the Sortable.
     */
    enable() {
        this.#enabled = true;
    }

    /**
     * Gets the Sortable item elements.
     * @returns {HTMLElement[]} The Sortable item elements.
     */
    items() {
        return $.find(this.options.items, this.node);
    }

    /**
     * Checks whether the window should scroll while sorting.
     */
    #checkScroll() {
        $.hide(this.#target);

        const originalX = $.getScrollX(window);
        const originalY = $.getScrollY(window);

        let offsetX = originalX;
        let offsetY = originalY;

        if (this.#pos.y < originalY + this.options.scrollSensitivity) {
            offsetY = Math.max(0, originalY - this.options.scrollSpeed);
        } else if (this.#pos.y > originalY + $.height(window) - this.options.scrollSensitivity) {
            const docHeight = $.height(document, { boxSize: $.SCROLL_BOX });
            offsetY = Math.min(docHeight, originalY + this.options.scrollSpeed);
        }

        if (this.#pos.x < originalX + this.options.scrollSensitivity) {
            offsetX = Math.max(0, originalX - this.options.scrollSpeed);
        } else if (this.#pos.x > originalX + $.width(window) - this.options.scrollSensitivity) {
            const docWidth = $.width(document, { boxSize: $.SCROLL_BOX });
            offsetX = Math.min(docWidth, originalX + this.options.scrollSpeed);
        }

        if (offsetX !== originalX || offsetY !== originalY) {
            $.setStyle(':root', { scrollBehavior: 'initial' });
            $.setScroll(document, offsetX, offsetY);
            $.setStyle(':root', { scrollBehavior: '' });

            this.#pos.x += offsetX - originalX;
            this.#pos.y += offsetY - originalY;
        }

        $.show(this.#target);

        this.#checkScrollTimer = setTimeout((_) => {
            this.#checkScroll();
        }, 0);
    }

    /**
     * Attaches events for the Sortable.
     */
    #events() {
        const downEvent = (e) => {
            if (
                e.button ||
                !this.#enabled ||
                $.is(e.currentTarget, this.options.cancel) ||
                $.getDataset(this.node, 'uiDragging')
            ) {
                return false;
            }

            this.#target = this.options.handle ?
                this.items().find((node) => $.hasDescendent(node, e.currentTarget)) :
                e.currentTarget;
        };

        const moveEvent = (e) => {
            this.#pos = getPosition(e);

            if (!$.getDataset(this.node, 'uiDragging')) {
                $.setDataset(this.node, { uiDragging: true });

                this.#startIndex = $.index(this.#target);
                this.#currentIndex = this.#startIndex;

                $.triggerEvent(this.node, 'sort.ui.sortable', {
                    detail: {
                        target: this.#target,
                    },
                });

                if (this.options.helperClass) {
                    $.addClass(this.#target, this.options.helperClass);
                }

                this.#currentSortable = this.node;

                if (this.options.scroll) {
                    this.#checkScroll();
                }
            }

            let nearestSortable = this.node;

            if (this.options.connectWith) {
                const connected = $.find(this.options.connectWith)
                    .filter((node) => {
                        const sortable = this.constructor.init(node);

                        return sortable.options.dropOnEmpty || sortable.items().length;
                    });

                if (connected.length) {
                    nearestSortable = $.nearestTo(
                        [this.node, ...connected],
                        this.#pos.x,
                        this.#pos.y,
                        { offset: true },
                    );
                }
            }

            const nearestItems = $.isSame(this.node, nearestSortable) ?
                this.items() :
                this.constructor.init(nearestSortable).items();

            const nearestItem = $.nearestTo(
                nearestItems,
                this.#pos.x,
                this.#pos.y,
                { offset: true },
            );

            if (!nearestItem) {
                return;
            }

            this.#updateTarget(nearestItem, this.#pos.x, this.#pos.y);

            const newIndex = $.index(this.#target);

            if (!$.isSame(nearestSortable, this.#currentSortable)) {
                $.triggerEvent(this.#currentSortable, 'send.ui.sortable', {
                    detail: {
                        target: this.#target,
                    },
                });

                $.triggerEvent(nearestSortable, 'receive.ui.sortable', {
                    detail: {
                        target: this.#target,
                    },
                });
            } else if (this.#currentIndex !== newIndex) {
                $.triggerEvent(nearestSortable, 'sorting.ui.sortable', {
                    detail: {
                        target: this.#target,
                    },
                });
            }

            this.#currentIndex = newIndex;
            this.#currentSortable = nearestSortable;
        };

        const upEvent = (e) => {
            if (!$.getDataset(this.node, 'uiDragging')) {
                this.#target = null;
                return;
            }

            if (e.type === 'mouseup') {
                e.preventDefault();
            }

            $.triggerEvent(this.#currentSortable, 'sorted.ui.sortable', {
                detail: {
                    target: this.#target,
                },
            });

            if (this.options.helperClass) {
                $.removeClass(this.#target, this.options.helperClass);
            }

            if (
                this.#currentIndex !== this.#startIndex ||
                !$.isSame(this.#currentSortable, this.node)
            ) {
                $.triggerEvent(this.#currentSortable, 'update.ui.sortable', {
                    detail: {
                        target: this.#target,
                    },
                });
            }

            $.removeDataset(this.node, 'uiDragging');

            clearTimeout(this.#checkScrollTimer);
            this.#checkScrollTimer = null;
            this.#target = null;
            this.#currentSortable = null;
            this.#currentIndex = null;
            this.#startIndex = null;
        };

        const dragEvent = $.mouseDragFactory(downEvent, moveEvent, upEvent);

        $.addEventDelegate(
            this.node,
            'mousedown.ui.sortable touchstart.ui.sortable',
            this.#selector,
            dragEvent,
        );

        $.addEvent(this.node, 'receive.ui.sortable', (_) => {
            this.#refreshCursors();
        });
    }

    /**
     * Refreshes Sortable item cursors.
     */
    #refreshCursors() {
        const elements = $.find(this.#selector, this.node);

        $.setStyle(elements, { cursor: this.options.cursor });
    }

    /**
     * Moves the target relative to the nearest item.
     * @param {HTMLElement} nearestItem The nearest item.
     * @param {number} x The mouse X position.
     * @param {number} y The mouse Y position.
     */
    #updateTarget(nearestItem, x, y) {
        const nearestCenter = $.center(nearestItem, { offset: true });
        const targetCenter = $.center(this.#target, { offset: true });

        let method;
        if (this.options.axis === 'y' || nearestCenter.x === targetCenter.x) {
            method = y < nearestCenter.y ?
                'before' :
                'after';
        } else if (this.options.axis === 'x' || nearestCenter.y === targetCenter.y) {
            method = x < nearestCenter.x ?
                'before' :
                'after';
        } else {
            method = x < nearestCenter.x && y < nearestCenter.y ?
                'before' :
                'after';
        }

        $[method](nearestItem, this.#target);
    }
}
