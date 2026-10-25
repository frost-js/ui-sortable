(function(global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ?  factory(exports, require("@fr0st/ui"), require("@fr0st/query")) :
  typeof define === 'function' && define.amd ? define(['exports', "@fr0st/ui", "@fr0st/query"], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory((global.UI = global.UI || {}), global.UI,global.fQuery));
})(this, function(exports, _fr0st_ui, _fr0st_query) {
Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
// \0rolldown/runtime.js
	var __create = Object.create;
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __getProtoOf = Object.getPrototypeOf;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
				key = keys[i];
				if (!__hasOwnProp.call(to, key) && key !== except) {
					__defProp(to, key, {
						get: ((k) => from[k]).bind(null, key),
						enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
					});
				}
			}
		}
		return to;
	};
	var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
		value: mod,
		enumerable: true
	}) : target, mod));

_fr0st_query = __toESM(_fr0st_query, 1);

// src/helpers.js
/** @import { SortableEventData } from './sortable.js'; */
	var cursorLocks = /* @__PURE__ */ new WeakMap();
	/**
	* Resets the cursor style for a collection of elements.
	* @param {Iterable<HTMLElement>} nodes The elements to restore.
	*/
	function resetCursor(nodes) {
		for (const node of nodes) {
			const release = cursorLocks.get(node);
			if (!release) continue;
			release();
			cursorLocks.delete(node);
		}
	}
	/**
	* Sets the cursor style for a collection of elements.
	* @param {Iterable<HTMLElement>} nodes The elements to update.
	* @param {string} cursor The cursor style.
	*/
	function setCursor(nodes, cursor) {
		for (const node of nodes) if (cursorLocks.has(node)) _fr0st_query.default.setStyle(node, { cursor });
		else cursorLocks.set(node, _fr0st_query.default.setStyleLock(node, "cursor", cursor));
	}
	/**
	* Triggers a Sortable event with its data and detail payloads.
	* @param {HTMLElement} node The event target.
	* @param {string} name The event name without its namespace.
	* @param {SortableEventData} data The sorting event data.
	*/
	function triggerSortableEvent(node, name, data) {
		_fr0st_query.default.triggerEvent(node, `${name}.ui.sortable`, {
			data,
			detail: {
				target: data.item,
				...data
			}
		});
	}

// src/sortable.js
	var document = _fr0st_query.default.getContext();
	var window = _fr0st_query.default.getWindow();
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
	var Sortable = class extends _fr0st_ui.BaseComponent {
		/** @type {SortableOptions} */
		static defaults = {
			axis: null,
			cancel: "input, textarea, button, select, option",
			connectWith: null,
			cursor: "auto",
			disabled: false,
			dropOnEmpty: true,
			handle: null,
			helperClass: "bg-body-tertiary",
			items: ":scope > li",
			scroll: true,
			scrollSensitivity: 20,
			scrollSpeed: 5,
			swapThreshold: .25
		};
		#currentIndex;
		#currentSortable = null;
		#dragging;
		#enabled;
		#initialCursorNodes = [];
		#pos = null;
		#scrollFrame = null;
		#selector;
		#startIndex;
		#target = null;
		/**
		* Creates a Sortable.
		* @param {HTMLElement} node The sortable container.
		* @param {SortableOptions} [options] The Sortable options.
		*/
		constructor(node, options) {
			super(node, options);
			try {
				this.#selector = this.options.handle ? `:is(${this.options.items}) :is(${this.options.handle})` : this.options.items;
				this.#dragging = false;
				this.#enabled = !this.options.disabled;
				this.#initialCursorNodes = _fr0st_query.default.find(this.#selector, this.node);
				setCursor(this.#initialCursorNodes, this.options.cursor);
				this.#events();
				this.#initialCursorNodes = null;
			} catch (error) {
				this.dispose();
				throw error;
			}
		}
		/**
		* Disables the Sortable.
		*/
		disable() {
			this.#enabled = false;
		}
		/** @inheritdoc */
		dispose() {
			if (!this.node) return;
			resetCursor(this.#initialCursorNodes ?? _fr0st_query.default.find(this.#selector, this.node));
			if (this.#target && this.options.helperClass) _fr0st_query.default.removeClass(this.#target, this.options.helperClass);
			this.#resetDrag();
			this.#initialCursorNodes = null;
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
			return _fr0st_query.default.find(this.options.items, this.node);
		}
		/**
		* Checks whether the window should scroll while sorting.
		*/
		#checkScroll() {
			this.#scrollFrame = null;
			if (!this.node || !this.#dragging || !this.#target || !this.#pos) return;
			const originalX = _fr0st_query.default.getScrollX(window);
			const originalY = _fr0st_query.default.getScrollY(window);
			const windowHeight = _fr0st_query.default.height(window);
			const windowWidth = _fr0st_query.default.width(window);
			let offsetX = originalX;
			let offsetY = originalY;
			if (this.#pos.y < originalY + this.options.scrollSensitivity) offsetY = Math.max(0, originalY - this.options.scrollSpeed);
			else if (this.#pos.y > originalY + windowHeight - this.options.scrollSensitivity) {
				const docHeight = _fr0st_query.default.height(document, { boxSize: _fr0st_query.default.SCROLL_BOX });
				const maxY = Math.max(0, docHeight - windowHeight);
				offsetY = Math.min(maxY, originalY + this.options.scrollSpeed);
			}
			if (this.#pos.x < originalX + this.options.scrollSensitivity) offsetX = Math.max(0, originalX - this.options.scrollSpeed);
			else if (this.#pos.x > originalX + windowWidth - this.options.scrollSensitivity) {
				const docWidth = _fr0st_query.default.width(document, { boxSize: _fr0st_query.default.SCROLL_BOX });
				const maxX = Math.max(0, docWidth - windowWidth);
				offsetX = Math.min(maxX, originalX + this.options.scrollSpeed);
			}
			if (offsetX === originalX && offsetY === originalY) return;
			window.scrollTo({
				left: offsetX,
				top: offsetY,
				behavior: "instant"
			});
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
			const downHandler = (event) => {
				const cancelled = this.options.cancel && (_fr0st_query.default.is(event.target, this.options.cancel) || _fr0st_query.default.is(event.currentTarget, this.options.cancel) || _fr0st_query.default.closest(event.target, this.options.cancel, this.node).length);
				if (event.button || !this.#enabled || cancelled || _fr0st_query.default.getDataset(this.node, "uiDragging")) return false;
				this.#target = this.options.handle ? this.items().find((node) => _fr0st_query.default.hasDescendent(node, event.currentTarget)) : event.currentTarget;
				if (!this.#target) return false;
			};
			const moveHandler = (event) => {
				if (!this.node || !this.#target) return;
				const previousPos = this.#pos;
				this.#pos = (0, _fr0st_ui.getPosition)(event);
				const deltaX = previousPos ? this.#pos.x - previousPos.x : 0;
				const deltaY = previousPos ? this.#pos.y - previousPos.y : 0;
				if (!this.#dragging) {
					this.#dragging = true;
					this.#currentSortable = this.node;
					this.#startIndex = this.items().indexOf(this.#target);
					this.#currentIndex = this.#startIndex;
					_fr0st_query.default.setDataset(this.node, { uiDragging: true });
					/** @type {SortableEventData} */
					const eventData = {
						item: this.#target,
						from: this.node,
						to: this.node,
						oldIndex: this.#startIndex,
						newIndex: this.#startIndex
					};
					triggerSortableEvent(this.node, "sort", eventData);
					if (!this.node) return;
					if (this.options.helperClass) _fr0st_query.default.addClass(this.#target, this.options.helperClass);
				}
				this.#updatePlacement(deltaX, deltaY);
				this.#scheduleScroll();
			};
			const upHandler = (event) => {
				if (!this.node) return;
				if (!this.#dragging) {
					this.#target = null;
					return;
				}
				if (event.type === "mouseup") event.preventDefault();
				const source = this.node;
				const destination = this.#currentSortable;
				/** @type {SortableEventData} */
				const eventData = {
					item: this.#target,
					from: source,
					to: destination,
					oldIndex: this.#startIndex,
					newIndex: this.#currentIndex
				};
				triggerSortableEvent(destination, "sorted", eventData);
				if (!this.node) return;
				if (this.options.helperClass) _fr0st_query.default.removeClass(this.#target, this.options.helperClass);
				if (source !== destination) {
					triggerSortableEvent(source, "update", eventData);
					if (this.node) triggerSortableEvent(destination, "update", eventData);
				} else if (this.#currentIndex !== this.#startIndex) triggerSortableEvent(destination, "update", eventData);
				if (this.node) this.#resetDrag();
			};
			const dragHandler = _fr0st_query.default.mouseDragFactory(downHandler, moveHandler, upHandler);
			this.listen(this.node, "mousedown.ui.sortable touchstart.ui.sortable", dragHandler, { delegate: this.#selector });
			this.listen(this.node, "receive.ui.sortable", () => {
				setCursor(_fr0st_query.default.find(this.#selector, this.node), this.options.cursor);
			});
		}
		/**
		* Resets the active drag state.
		*/
		#resetDrag() {
			if (this.#scrollFrame !== null) window.cancelAnimationFrame(this.#scrollFrame);
			if (this.#dragging && this.node) _fr0st_query.default.removeDataset(this.node, "uiDragging");
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
			if (!this.node || !this.options.scroll || !this.#dragging || this.#scrollFrame !== null) return;
			this.#scrollFrame = window.requestAnimationFrame(() => {
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
				const connected = _fr0st_query.default.find(this.options.connectWith).filter((node) => node !== this.node).filter((node) => {
					const sortable = this.constructor.init(node);
					return sortable.#enabled && (sortable.options.dropOnEmpty || sortable.items().length);
				});
				if (connected.length) nearestSortable = _fr0st_query.default.nearestTo([this.node, ...connected], this.#pos.x, this.#pos.y, { offset: true });
			}
			const nearestInstance = this.constructor.init(nearestSortable);
			const nearestItems = nearestInstance.items().filter((node) => node !== this.#target);
			const nearestItem = _fr0st_query.default.nearestTo(nearestItems, this.#pos.x, this.#pos.y, { offset: true });
			if (nearestItem) this.#updateTarget(nearestItem, this.#pos.x, this.#pos.y, deltaX, deltaY);
			else if (nearestSortable !== this.#currentSortable) _fr0st_query.default.append(nearestSortable, this.#target);
			else return;
			const newIndex = nearestInstance.items().indexOf(this.#target);
			if (nearestSortable !== this.#currentSortable) {
				const previousSortable = this.#currentSortable;
				const { handle } = this.constructor.init(previousSortable).options;
				resetCursor(handle ? _fr0st_query.default.find(handle, this.#target) : [this.#target]);
				/** @type {SortableEventData} */
				const eventData = {
					item: this.#target,
					from: previousSortable,
					to: nearestSortable,
					oldIndex: this.#currentIndex,
					newIndex
				};
				triggerSortableEvent(previousSortable, "send", eventData);
				if (!this.node) return;
				triggerSortableEvent(nearestSortable, "receive", eventData);
			} else if (this.#currentIndex !== newIndex) {
				/** @type {SortableEventData} */
				const eventData = {
					item: this.#target,
					from: nearestSortable,
					to: nearestSortable,
					oldIndex: this.#currentIndex,
					newIndex
				};
				triggerSortableEvent(nearestSortable, "sorting", eventData);
			}
			if (!this.node) return;
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
			const nearestCenter = _fr0st_query.default.center(nearestItem, { offset: true });
			const nearestRect = _fr0st_query.default.rect(nearestItem, { offset: true });
			const targetCenter = _fr0st_query.default.center(this.#target, { offset: true });
			const threshold = Math.min(1, Math.max(0, this.options.swapThreshold));
			let thresholdX = .5;
			let thresholdY = .5;
			if (deltaX) thresholdX = deltaX > 0 ? threshold : 1 - threshold;
			if (deltaY) thresholdY = deltaY > 0 ? threshold : 1 - threshold;
			let method;
			if (this.options.axis === "y" || nearestCenter.x === targetCenter.x) method = y < nearestRect.top + nearestRect.height * thresholdY ? "before" : "after";
			else if (this.options.axis === "x" || nearestCenter.y === targetCenter.y) method = x < nearestRect.left + nearestRect.width * thresholdX ? "before" : "after";
			else {
				const swapX = nearestRect.left + nearestRect.width * thresholdX;
				const swapY = nearestRect.top + nearestRect.height * thresholdY;
				method = x < swapX && y < swapY ? "before" : "after";
			}
			_fr0st_query.default[method](nearestItem, this.#target);
		}
	};

// src/index.js
	(0, _fr0st_ui.initComponent)("sortable", Sortable);
	var src_default = Sortable;

exports.Sortable = src_default;
});
//# sourceMappingURL=frost-ui-sortable.js.map