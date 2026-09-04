(function(global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ?  factory(exports, require('@fr0st/ui'), require('@fr0st/query')) :
  typeof define === 'function' && define.amd ? define(['exports', '@fr0st/ui', '@fr0st/query'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory((global.UI = global.UI || {}), global.UI,global.fQuery));
})(this, function(exports, _fr0st_ui, _fr0st_query) {
Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
//#region \0rolldown/runtime.js
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

//#endregion
_fr0st_query = __toESM(_fr0st_query, 1);

//#region src/sortable.js
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
			this.#selector = this.options.items;
			if (this.options.handle) this.#selector += ` ${this.options.handle}`;
			this.#dragging = false;
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
			if (!this.node) return;
			_fr0st_query.default.removeEventDelegate(this.node, "mousedown.ui.sortable touchstart.ui.sortable");
			_fr0st_query.default.removeEvent(this.node, "receive.ui.sortable");
			if (this.#target && this.options.helperClass) _fr0st_query.default.removeClass(this.#target, this.options.helperClass);
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
			const scrollElement = document.scrollingElement;
			const scrollBehavior = scrollElement.style.getPropertyValue("scroll-behavior");
			const scrollBehaviorPriority = scrollElement.style.getPropertyPriority("scroll-behavior");
			scrollElement.style.setProperty("scroll-behavior", "auto", "important");
			_fr0st_query.default.setScroll(document, offsetX, offsetY);
			scrollElement.style.setProperty("scroll-behavior", scrollBehavior, scrollBehaviorPriority);
			this.#pos.x += offsetX - originalX;
			this.#pos.y += offsetY - originalY;
			this.#scheduleScroll();
		}
		/**
		* Attaches events for the Sortable.
		*/
		#events() {
			const downEvent = (e) => {
				const cancelled = this.options.cancel && (_fr0st_query.default.is(e.target, this.options.cancel) || _fr0st_query.default.is(e.currentTarget, this.options.cancel) || _fr0st_query.default.closest(e.target, this.options.cancel, e.currentTarget).length);
				if (e.button || !this.#enabled || cancelled || _fr0st_query.default.getDataset(this.node, "uiDragging")) return false;
				this.#target = this.options.handle ? this.items().find((node) => _fr0st_query.default.hasDescendent(node, e.currentTarget)) : e.currentTarget;
				if (!this.#target) return false;
			};
			const moveEvent = (e) => {
				if (!this.node || !this.#target) return;
				const previousPos = this.#pos;
				this.#pos = (0, _fr0st_ui.getPosition)(e);
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
					_fr0st_query.default.triggerEvent(this.node, "sort.ui.sortable", {
						data: eventData,
						detail: {
							target: this.#target,
							...eventData
						}
					});
					if (!this.node) return;
					if (this.options.helperClass) _fr0st_query.default.addClass(this.#target, this.options.helperClass);
				}
				let nearestSortable = this.node;
				if (this.options.connectWith) {
					const connected = _fr0st_query.default.find(this.options.connectWith).filter((node) => !_fr0st_query.default.isSame(node, this.node)).filter((node) => {
						const sortable = this.constructor.init(node);
						return sortable.#enabled && (sortable.options.dropOnEmpty || sortable.items().length);
					});
					if (connected.length) nearestSortable = _fr0st_query.default.nearestTo([this.node, ...connected], this.#pos.x, this.#pos.y, { offset: true });
				}
				const nearestInstance = this.constructor.init(nearestSortable);
				const nearestItems = nearestInstance.items().filter((node) => !_fr0st_query.default.isSame(node, this.#target));
				const nearestItem = _fr0st_query.default.nearestTo(nearestItems, this.#pos.x, this.#pos.y, { offset: true });
				if (nearestItem) this.#updateTarget(nearestItem, this.#pos.x, this.#pos.y, deltaX, deltaY);
				else if (!_fr0st_query.default.isSame(nearestSortable, this.#currentSortable)) _fr0st_query.default.append(nearestSortable, this.#target);
				else {
					this.#scheduleScroll();
					return;
				}
				const newIndex = nearestInstance.items().indexOf(this.#target);
				if (!_fr0st_query.default.isSame(nearestSortable, this.#currentSortable)) {
					const previousSortable = this.#currentSortable;
					/** @type {SortableEventData} */
					const eventData = {
						item: this.#target,
						from: previousSortable,
						to: nearestSortable,
						oldIndex: this.#currentIndex,
						newIndex
					};
					_fr0st_query.default.triggerEvent(previousSortable, "send.ui.sortable", {
						data: eventData,
						detail: {
							target: this.#target,
							...eventData
						}
					});
					if (!this.node) return;
					_fr0st_query.default.triggerEvent(nearestSortable, "receive.ui.sortable", {
						data: eventData,
						detail: {
							target: this.#target,
							...eventData
						}
					});
				} else if (this.#currentIndex !== newIndex) {
					/** @type {SortableEventData} */
					const eventData = {
						item: this.#target,
						from: nearestSortable,
						to: nearestSortable,
						oldIndex: this.#currentIndex,
						newIndex
					};
					_fr0st_query.default.triggerEvent(nearestSortable, "sorting.ui.sortable", {
						data: eventData,
						detail: {
							target: this.#target,
							...eventData
						}
					});
				}
				if (!this.node) return;
				this.#currentIndex = newIndex;
				this.#currentSortable = nearestSortable;
				this.#scheduleScroll();
			};
			const upEvent = (e) => {
				if (!this.node) return;
				if (!this.#dragging) {
					this.#target = null;
					return;
				}
				if (e.type === "mouseup") e.preventDefault();
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
				_fr0st_query.default.triggerEvent(destination, "sorted.ui.sortable", {
					data: eventData,
					detail: {
						target: this.#target,
						...eventData
					}
				});
				if (!this.node) return;
				if (this.options.helperClass) _fr0st_query.default.removeClass(this.#target, this.options.helperClass);
				if (!_fr0st_query.default.isSame(source, destination)) {
					_fr0st_query.default.triggerEvent(source, "update.ui.sortable", {
						data: eventData,
						detail: {
							target: this.#target,
							...eventData
						}
					});
					if (this.node) _fr0st_query.default.triggerEvent(destination, "update.ui.sortable", {
						data: eventData,
						detail: {
							target: this.#target,
							...eventData
						}
					});
				} else if (this.#currentIndex !== this.#startIndex) _fr0st_query.default.triggerEvent(destination, "update.ui.sortable", {
					data: eventData,
					detail: {
						target: this.#target,
						...eventData
					}
				});
				if (this.node) this.#resetDrag();
			};
			const dragEvent = _fr0st_query.default.mouseDragFactory(downEvent, moveEvent, upEvent);
			_fr0st_query.default.addEventDelegate(this.node, "mousedown.ui.sortable touchstart.ui.sortable", this.#selector, dragEvent);
			_fr0st_query.default.addEvent(this.node, "receive.ui.sortable", (_) => {
				this.#refreshCursors();
			});
		}
		/**
		* Refreshes Sortable item cursors.
		*/
		#refreshCursors() {
			const elements = _fr0st_query.default.find(this.#selector, this.node);
			_fr0st_query.default.setStyle(elements, { cursor: this.options.cursor });
		}
		/**
		* Resets the active drag state.
		*/
		#resetDrag() {
			if (this.#scrollFrame !== null && this.#scrollFrame !== void 0) window.cancelAnimationFrame(this.#scrollFrame);
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
			if (!this.options.scroll || !this.#dragging || this.#scrollFrame !== null && this.#scrollFrame !== void 0) return;
			this.#scrollFrame = window.requestAnimationFrame((_) => {
				this.#checkScroll();
			});
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

//#endregion
//#region src/index.js
	(0, _fr0st_ui.initComponent)("sortable", Sortable);
	var src_default = Sortable;

//#endregion
exports.Sortable = src_default;
});
//# sourceMappingURL=frost-ui-sortable.js.map