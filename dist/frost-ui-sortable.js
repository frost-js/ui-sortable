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
	var Sortable = class extends _fr0st_ui.BaseComponent {
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
			if (this.options.handle) this.#selector += ` ${this.options.handle}`;
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
			_fr0st_query.default.removeEventDelegate(this.node, "mousedown.ui.sortable touchstart.ui.sortable");
			_fr0st_query.default.removeEvent(this.node, "receive.ui.sortable");
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
			return _fr0st_query.default.find(this.options.items, this.node);
		}
		/**
		* Checks whether the window should scroll while sorting.
		*/
		#checkScroll() {
			_fr0st_query.default.hide(this.#target);
			const originalX = _fr0st_query.default.getScrollX(window);
			const originalY = _fr0st_query.default.getScrollY(window);
			let offsetX = originalX;
			let offsetY = originalY;
			if (this.#pos.y < originalY + this.options.scrollSensitivity) offsetY = Math.max(0, originalY - this.options.scrollSpeed);
			else if (this.#pos.y > originalY + _fr0st_query.default.height(window) - this.options.scrollSensitivity) {
				const docHeight = _fr0st_query.default.height(document, { boxSize: _fr0st_query.default.SCROLL_BOX });
				offsetY = Math.min(docHeight, originalY + this.options.scrollSpeed);
			}
			if (this.#pos.x < originalX + this.options.scrollSensitivity) offsetX = Math.max(0, originalX - this.options.scrollSpeed);
			else if (this.#pos.x > originalX + _fr0st_query.default.width(window) - this.options.scrollSensitivity) {
				const docWidth = _fr0st_query.default.width(document, { boxSize: _fr0st_query.default.SCROLL_BOX });
				offsetX = Math.min(docWidth, originalX + this.options.scrollSpeed);
			}
			if (offsetX !== originalX || offsetY !== originalY) {
				_fr0st_query.default.setStyle(":root", { scrollBehavior: "initial" });
				_fr0st_query.default.setScroll(document, offsetX, offsetY);
				_fr0st_query.default.setStyle(":root", { scrollBehavior: "" });
				this.#pos.x += offsetX - originalX;
				this.#pos.y += offsetY - originalY;
			}
			_fr0st_query.default.show(this.#target);
			this.#checkScrollTimer = setTimeout((_) => {
				this.#checkScroll();
			}, 0);
		}
		/**
		* Attaches events for the Sortable.
		*/
		#events() {
			const downEvent = (e) => {
				if (e.button || !this.#enabled || _fr0st_query.default.is(e.currentTarget, this.options.cancel) || _fr0st_query.default.getDataset(this.node, "uiDragging")) return false;
				this.#target = this.options.handle ? this.items().find((node) => _fr0st_query.default.hasDescendent(node, e.currentTarget)) : e.currentTarget;
			};
			const moveEvent = (e) => {
				this.#pos = (0, _fr0st_ui.getPosition)(e);
				if (!_fr0st_query.default.getDataset(this.node, "uiDragging")) {
					_fr0st_query.default.setDataset(this.node, { uiDragging: true });
					this.#startIndex = _fr0st_query.default.index(this.#target);
					this.#currentIndex = this.#startIndex;
					_fr0st_query.default.triggerEvent(this.node, "sort.ui.sortable", { detail: { target: this.#target } });
					if (this.options.helperClass) _fr0st_query.default.addClass(this.#target, this.options.helperClass);
					this.#currentSortable = this.node;
					if (this.options.scroll) this.#checkScroll();
				}
				let nearestSortable = this.node;
				if (this.options.connectWith) {
					const connected = _fr0st_query.default.find(this.options.connectWith).filter((node) => {
						const sortable = this.constructor.init(node);
						return sortable.options.dropOnEmpty || sortable.items().length;
					});
					if (connected.length) nearestSortable = _fr0st_query.default.nearestTo([this.node, ...connected], this.#pos.x, this.#pos.y, { offset: true });
				}
				const nearestItems = _fr0st_query.default.isSame(this.node, nearestSortable) ? this.items() : this.constructor.init(nearestSortable).items();
				const nearestItem = _fr0st_query.default.nearestTo(nearestItems, this.#pos.x, this.#pos.y, { offset: true });
				if (!nearestItem) return;
				this.#updateTarget(nearestItem, this.#pos.x, this.#pos.y);
				const newIndex = _fr0st_query.default.index(this.#target);
				if (!_fr0st_query.default.isSame(nearestSortable, this.#currentSortable)) {
					_fr0st_query.default.triggerEvent(this.#currentSortable, "send.ui.sortable", { detail: { target: this.#target } });
					_fr0st_query.default.triggerEvent(nearestSortable, "receive.ui.sortable", { detail: { target: this.#target } });
				} else if (this.#currentIndex !== newIndex) _fr0st_query.default.triggerEvent(nearestSortable, "sorting.ui.sortable", { detail: { target: this.#target } });
				this.#currentIndex = newIndex;
				this.#currentSortable = nearestSortable;
			};
			const upEvent = (e) => {
				if (!_fr0st_query.default.getDataset(this.node, "uiDragging")) {
					this.#target = null;
					return;
				}
				if (e.type === "mouseup") e.preventDefault();
				_fr0st_query.default.triggerEvent(this.#currentSortable, "sorted.ui.sortable", { detail: { target: this.#target } });
				if (this.options.helperClass) _fr0st_query.default.removeClass(this.#target, this.options.helperClass);
				if (this.#currentIndex !== this.#startIndex || !_fr0st_query.default.isSame(this.#currentSortable, this.node)) _fr0st_query.default.triggerEvent(this.#currentSortable, "update.ui.sortable", { detail: { target: this.#target } });
				_fr0st_query.default.removeDataset(this.node, "uiDragging");
				clearTimeout(this.#checkScrollTimer);
				this.#checkScrollTimer = null;
				this.#target = null;
				this.#currentSortable = null;
				this.#currentIndex = null;
				this.#startIndex = null;
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
		* Moves the target relative to the nearest item.
		* @param {HTMLElement} nearestItem The nearest item.
		* @param {number} x The mouse X position.
		* @param {number} y The mouse Y position.
		*/
		#updateTarget(nearestItem, x, y) {
			const nearestCenter = _fr0st_query.default.center(nearestItem, { offset: true });
			const targetCenter = _fr0st_query.default.center(this.#target, { offset: true });
			let method;
			if (this.options.axis === "y" || nearestCenter.x === targetCenter.x) method = y < nearestCenter.y ? "before" : "after";
			else if (this.options.axis === "x" || nearestCenter.y === targetCenter.y) method = x < nearestCenter.x ? "before" : "after";
			else method = x < nearestCenter.x && y < nearestCenter.y ? "before" : "after";
			_fr0st_query.default[method](nearestItem, this.#target);
		}
	};

//#endregion
//#region src/index.js
/** @import { SortableOptions } from './sortable.js'; */
	/** @type {SortableOptions} */
	Sortable.defaults = {
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
		scrollSpeed: 5
	};
	(0, _fr0st_ui.initComponent)("sortable", Sortable);
	var src_default = Sortable;

//#endregion
exports.Sortable = src_default;
});
//# sourceMappingURL=frost-ui-sortable.js.map