import $ from '@fr0st/query';
import { BaseComponent, getPosition } from '@fr0st/ui';
import { resetCursor, setCursor } from './helpers.js';

const document = $.getContext();
const window = $.getWindow();

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
 * @property {number} [scrollSpeed=5] The scroll distance applied per animation frame, in pixels.
 * @property {number} [swapThreshold=0.25] The fraction of an item crossed before swapping, from `0` to `1`.
 */

/**
 * @typedef {object} SortableEventData
 * @property {HTMLElement} item The item being sorted.
 * @property {HTMLElement} from The previous or original Sortable container.
 * @property {HTMLElement} to The next or final Sortable container.
 * @property {number} oldIndex The previous or original item index.
 * @property {number} newIndex The next or final item index.
 */

/**
 * Controls a sortable collection of elements.
 * @augments {BaseComponent<SortableOptions>}
 */
export default class Sortable extends BaseComponent {
    /** @type {SortableOptions} */
    static defaults = {
        axis: null,
        cancel: 'input, textarea, button, select, option',
        connectWith: null,
        cursor: 'auto',
        disabled: false,
        dropOnEmpty: true,
        handle: null,
        helperClass: 'bg-body-tertiary',
        items: ':scope > li',
        scroll: true,
        scrollSensitivity: 20,
        scrollSpeed: 5,
        swapThreshold: 0.25,
    };

    #currentIndex;
    #currentSortable;
    #dragging;
    #enabled;
    #pos;
    #scrollFrame;
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

        this.#selector = this.options.handle ?
            `:is(${this.options.items}) :is(${this.options.handle})` :
            this.options.items;

        this.#dragging = false;
        this.#enabled = !this.options.disabled;

        setCursor($.find(this.#selector, this.node), this.options.cursor);
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
        if (!this.node) {
            return;
        }

        $.removeEventDelegate(this.node, 'mousedown.ui.sortable touchstart.ui.sortable');
        $.removeEvent(this.node, 'receive.ui.sortable');
        resetCursor($.find(this.#selector, this.node));

        if (this.#target && this.options.helperClass) {
            $.removeClass(this.#target, this.options.helperClass);
        }

        this.#resetDrag();

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
        this.#scrollFrame = null;

        if (!this.node || !this.#dragging || !this.#target || !this.#pos) {
            return;
        }

        const originalX = $.getScrollX(window);
        const originalY = $.getScrollY(window);
        const windowHeight = $.height(window);
        const windowWidth = $.width(window);

        let offsetX = originalX;
        let offsetY = originalY;

        if (this.#pos.y < originalY + this.options.scrollSensitivity) {
            offsetY = Math.max(0, originalY - this.options.scrollSpeed);
        } else if (this.#pos.y > originalY + windowHeight - this.options.scrollSensitivity) {
            const docHeight = $.height(document, { boxSize: $.SCROLL_BOX });
            const maxY = Math.max(0, docHeight - windowHeight);
            offsetY = Math.min(maxY, originalY + this.options.scrollSpeed);
        }

        if (this.#pos.x < originalX + this.options.scrollSensitivity) {
            offsetX = Math.max(0, originalX - this.options.scrollSpeed);
        } else if (this.#pos.x > originalX + windowWidth - this.options.scrollSensitivity) {
            const docWidth = $.width(document, { boxSize: $.SCROLL_BOX });
            const maxX = Math.max(0, docWidth - windowWidth);
            offsetX = Math.min(maxX, originalX + this.options.scrollSpeed);
        }

        if (offsetX === originalX && offsetY === originalY) {
            return;
        }

        const scrollElement = document.scrollingElement;
        const scrollBehavior = scrollElement.style.getPropertyValue('scroll-behavior');
        const scrollBehaviorPriority = scrollElement.style.getPropertyPriority('scroll-behavior');

        scrollElement.style.setProperty('scroll-behavior', 'auto', 'important');
        $.setScroll(document, offsetX, offsetY);
        scrollElement.style.setProperty(
            'scroll-behavior',
            scrollBehavior,
            scrollBehaviorPriority,
        );

        const deltaX = offsetX - originalX;
        const deltaY = offsetY - originalY;

        this.#pos.x += deltaX;
        this.#pos.y += deltaY;

        this.#updatePlacement(deltaX, deltaY);
        this.#scheduleScroll();
    }

    /**
     * Attaches events for the Sortable.
     */
    #events() {
        const downEvent = (e) => {
            const cancelled = this.options.cancel &&
                (
                    $.is(e.target, this.options.cancel) ||
                    $.is(e.currentTarget, this.options.cancel) ||
                    $.closest(e.target, this.options.cancel, e.currentTarget).length
                );

            if (
                e.button ||
                !this.#enabled ||
                cancelled ||
                $.getDataset(this.node, 'uiDragging')
            ) {
                return false;
            }

            this.#target = this.options.handle ?
                this.items().find((node) => $.hasDescendent(node, e.currentTarget)) :
                e.currentTarget;

            if (!this.#target) {
                return false;
            }
        };

        const moveEvent = (e) => {
            if (!this.node || !this.#target) {
                return;
            }

            const previousPos = this.#pos;
            this.#pos = getPosition(e);
            const deltaX = previousPos ?
                this.#pos.x - previousPos.x :
                0;
            const deltaY = previousPos ?
                this.#pos.y - previousPos.y :
                0;

            if (!this.#dragging) {
                this.#dragging = true;
                this.#currentSortable = this.node;
                this.#startIndex = this.items().indexOf(this.#target);
                this.#currentIndex = this.#startIndex;

                $.setDataset(this.node, { uiDragging: true });

                /** @type {SortableEventData} */
                const eventData = {
                    item: this.#target,
                    from: this.node,
                    to: this.node,
                    oldIndex: this.#startIndex,
                    newIndex: this.#startIndex,
                };

                $.triggerEvent(this.node, 'sort.ui.sortable', {
                    data: eventData,
                    detail: {
                        target: this.#target,
                        ...eventData,
                    },
                });

                if (!this.node) {
                    return;
                }

                if (this.options.helperClass) {
                    $.addClass(this.#target, this.options.helperClass);
                }
            }

            this.#updatePlacement(deltaX, deltaY);
            this.#scheduleScroll();
        };

        const upEvent = (e) => {
            if (!this.node) {
                return;
            }

            if (!this.#dragging) {
                this.#target = null;
                return;
            }

            if (e.type === 'mouseup') {
                e.preventDefault();
            }

            const source = this.node;
            const destination = this.#currentSortable;
            /** @type {SortableEventData} */
            const eventData = {
                item: this.#target,
                from: source,
                to: destination,
                oldIndex: this.#startIndex,
                newIndex: this.#currentIndex,
            };

            $.triggerEvent(destination, 'sorted.ui.sortable', {
                data: eventData,
                detail: {
                    target: this.#target,
                    ...eventData,
                },
            });

            if (!this.node) {
                return;
            }

            if (this.options.helperClass) {
                $.removeClass(this.#target, this.options.helperClass);
            }

            if (!$.isSame(source, destination)) {
                $.triggerEvent(source, 'update.ui.sortable', {
                    data: eventData,
                    detail: {
                        target: this.#target,
                        ...eventData,
                    },
                });

                if (this.node) {
                    $.triggerEvent(destination, 'update.ui.sortable', {
                        data: eventData,
                        detail: {
                            target: this.#target,
                            ...eventData,
                        },
                    });
                }
            } else if (this.#currentIndex !== this.#startIndex) {
                $.triggerEvent(destination, 'update.ui.sortable', {
                    data: eventData,
                    detail: {
                        target: this.#target,
                        ...eventData,
                    },
                });
            }

            if (this.node) {
                this.#resetDrag();
            }
        };

        const dragEvent = $.mouseDragFactory(downEvent, moveEvent, upEvent);

        $.addEventDelegate(
            this.node,
            'mousedown.ui.sortable touchstart.ui.sortable',
            this.#selector,
            dragEvent,
        );

        $.addEvent(this.node, 'receive.ui.sortable', (_) => {
            setCursor($.find(this.#selector, this.node), this.options.cursor);
        });
    }

    /**
     * Resets the active drag state.
     */
    #resetDrag() {
        if (this.#scrollFrame !== null && this.#scrollFrame !== undefined) {
            window.cancelAnimationFrame(this.#scrollFrame);
        }

        if (this.#dragging && this.node) {
            $.removeDataset(this.node, 'uiDragging');
        }

        this.#currentIndex = null;
        this.#currentSortable = null;
        this.#dragging = false;
        this.#pos = null;
        this.#scrollFrame = null;
        this.#startIndex = null;
        this.#target = null;
    }

    /**
     * Schedules the next auto-scroll update.
     */
    #scheduleScroll() {
        if (
            !this.node ||
            !this.options.scroll ||
            !this.#dragging ||
            this.#scrollFrame !== null && this.#scrollFrame !== undefined
        ) {
            return;
        }

        this.#scrollFrame = window.requestAnimationFrame((_) => {
            this.#checkScroll();
        });
    }

    /**
     * Updates item placement and sorting events for the current pointer position.
     * @param {number} deltaX The horizontal pointer movement.
     * @param {number} deltaY The vertical pointer movement.
     */
    #updatePlacement(deltaX, deltaY) {
        let nearestSortable = this.node;

        if (this.options.connectWith) {
            const connected = $.find(this.options.connectWith)
                .filter((node) => !$.isSame(node, this.node))
                .filter((node) => {
                    const sortable = this.constructor.init(node);

                    return sortable.#enabled &&
                        (sortable.options.dropOnEmpty || sortable.items().length);
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

        const nearestInstance = this.constructor.init(nearestSortable);
        const nearestItems = nearestInstance.items()
            .filter((node) => !$.isSame(node, this.#target));
        const nearestItem = $.nearestTo(
            nearestItems,
            this.#pos.x,
            this.#pos.y,
            { offset: true },
        );

        if (nearestItem) {
            this.#updateTarget(
                nearestItem,
                this.#pos.x,
                this.#pos.y,
                deltaX,
                deltaY,
            );
        } else if (!$.isSame(nearestSortable, this.#currentSortable)) {
            $.append(nearestSortable, this.#target);
        } else {
            return;
        }

        const newIndex = nearestInstance.items().indexOf(this.#target);

        if (!$.isSame(nearestSortable, this.#currentSortable)) {
            const previousSortable = this.#currentSortable;
            /** @type {SortableEventData} */
            const eventData = {
                item: this.#target,
                from: previousSortable,
                to: nearestSortable,
                oldIndex: this.#currentIndex,
                newIndex,
            };

            $.triggerEvent(previousSortable, 'send.ui.sortable', {
                data: eventData,
                detail: {
                    target: this.#target,
                    ...eventData,
                },
            });

            if (!this.node) {
                return;
            }

            $.triggerEvent(nearestSortable, 'receive.ui.sortable', {
                data: eventData,
                detail: {
                    target: this.#target,
                    ...eventData,
                },
            });
        } else if (this.#currentIndex !== newIndex) {
            /** @type {SortableEventData} */
            const eventData = {
                item: this.#target,
                from: nearestSortable,
                to: nearestSortable,
                oldIndex: this.#currentIndex,
                newIndex,
            };

            $.triggerEvent(nearestSortable, 'sorting.ui.sortable', {
                data: eventData,
                detail: {
                    target: this.#target,
                    ...eventData,
                },
            });
        }

        if (!this.node) {
            return;
        }

        this.#currentIndex = newIndex;
        this.#currentSortable = nearestSortable;
    }

    /**
     * Moves the target relative to the nearest item.
     * @param {HTMLElement} nearestItem The nearest item.
     * @param {number} x The mouse X position.
     * @param {number} y The mouse Y position.
     * @param {number} deltaX The horizontal pointer movement.
     * @param {number} deltaY The vertical pointer movement.
     */
    #updateTarget(nearestItem, x, y, deltaX, deltaY) {
        const nearestCenter = $.center(nearestItem, { offset: true });
        const nearestRect = $.rect(nearestItem, { offset: true });
        const targetCenter = $.center(this.#target, { offset: true });
        const threshold = Math.min(1, Math.max(0, this.options.swapThreshold));
        let thresholdX = 0.5;
        let thresholdY = 0.5;

        if (deltaX) {
            thresholdX = deltaX > 0 ?
                threshold :
                1 - threshold;
        }

        if (deltaY) {
            thresholdY = deltaY > 0 ?
                threshold :
                1 - threshold;
        }

        let method;
        if (this.options.axis === 'y' || nearestCenter.x === targetCenter.x) {
            const swapY = nearestRect.top + nearestRect.height * thresholdY;
            method = y < swapY ?
                'before' :
                'after';
        } else if (this.options.axis === 'x' || nearestCenter.y === targetCenter.y) {
            const swapX = nearestRect.left + nearestRect.width * thresholdX;
            method = x < swapX ?
                'before' :
                'after';
        } else {
            const swapX = nearestRect.left + nearestRect.width * thresholdX;
            const swapY = nearestRect.top + nearestRect.height * thresholdY;
            method = x < swapX && y < swapY ?
                'before' :
                'after';
        }

        $[method](nearestItem, this.#target);
    }
}
