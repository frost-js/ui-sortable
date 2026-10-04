# Frost UI Sortable

[![CI](https://github.com/frost-js/ui-sortable/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/frost-js/ui-sortable/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/frost-js/ui-sortable/branch/main/graph/badge.svg)](https://codecov.io/gh/frost-js/ui-sortable)
[![npm version](https://img.shields.io/npm/v/%40fr0st%2Fui-sortable?style=flat-square)](https://www.npmjs.com/package/@fr0st/ui-sortable)
[![npm downloads](https://img.shields.io/npm/dm/%40fr0st%2Fui-sortable?style=flat-square)](https://www.npmjs.com/package/@fr0st/ui-sortable)
[![JS gzip size](https://img.badgesize.io/frost-js/ui-sortable/main/dist/frost-ui-sortable.min.js?compression=gzip&label=JS%20gzip%20size&style=flat-square)](https://github.com/frost-js/ui-sortable/blob/main/dist/frost-ui-sortable.min.js)
[![license](https://img.shields.io/github/license/frost-js/ui-sortable?style=flat-square)](./LICENSE)

Drag-and-drop sorting for Frost UI with handles, connected containers, axis control, lifecycle events, and automatic window scrolling.

## Highlights

- Reorder vertical, horizontal, and free-form collections
- Restrict dragging to a handle and exclude interactive controls
- Move items between connected containers, including empty lists
- Disable individual source or destination instances
- Automatic window scrolling near viewport edges
- Configurable, direction-aware item swap threshold
- Normalized item, container, and index data on lifecycle events
- Native `Sortable` class and `sortable` fQuery plugin
- Existing-instance reuse with frozen resolved options
- Prebuilt ESM and UMD bundles with source maps
- No component-specific CSS or Sass
- JSDoc-powered IntelliSense

Explore [the demo](./demo/index.html) for interactive examples.

## Installation

### Browser projects / bundlers

```bash
npm i @fr0st/ui-sortable
```

Frost UI Sortable's package entry point is ESM-only and requires a browser DOM. Import the default `Sortable` export and the stylesheets in browser projects and bundlers.

```js
import '@fr0st/ui/dist/frost-ui.min.css';
import Sortable from '@fr0st/ui-sortable';
```

`@fr0st/ui` and `@fr0st/query` are peer dependencies so the component shares the application's instances.

### Browser (ESM)

The ESM bundle imports `@fr0st/ui` and `@fr0st/query`. fQuery also imports `@fr0st/core`, so map all three dependencies when loading the bundle directly in a browser:

```html
<link
    rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/@fr0st/ui@latest/dist/frost-ui.min.css">
<script type="importmap">
{
    "imports": {
        "@fr0st/core": "https://cdn.jsdelivr.net/npm/@fr0st/core@latest/dist/frost-core.esm.min.js",
        "@fr0st/query": "https://cdn.jsdelivr.net/npm/@fr0st/query@latest/dist/fquery.esm.min.js",
        "@fr0st/ui": "https://cdn.jsdelivr.net/npm/@fr0st/ui@latest/dist/frost-ui.esm.min.js"
    }
}
</script>
<script type="module">
    import Sortable from 'https://cdn.jsdelivr.net/npm/@fr0st/ui-sortable@latest/dist/frost-ui-sortable.esm.min.js';
</script>
```

### Browser (UMD)

Load the bundles from your own copy or a CDN:

```html
<link
    rel="stylesheet"
    href="/path/to/dist/frost-ui.min.css">
<script src="/path/to/dist/frost-ui-bundle.min.js"></script>
<script src="/path/to/dist/frost-ui-sortable.min.js"></script>
<!-- or -->
<link
    rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/@fr0st/ui@latest/dist/frost-ui.min.css">
<script src="https://cdn.jsdelivr.net/npm/@fr0st/ui@latest/dist/frost-ui-bundle.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@fr0st/ui-sortable@latest/dist/frost-ui-sortable.min.js"></script>
<script>
    const { Sortable } = globalThis.UI;
</script>
```

The UMD bundle adds `Sortable` to the existing `globalThis.UI` object. Load Frost UI's all-in-one bundle first; it supplies the `UI` and `fQuery` globals.

The package root resolves to the prebuilt ESM bundle. Published files under `dist/` and `src/` are also available through matching package subpaths.

## Usage

Sortable targets direct `<li>` children by default:

```html
<ul class="list-group" id="tasks">
    <li class="list-group-item">Research</li>
    <li class="list-group-item">Design</li>
    <li class="list-group-item">Build</li>
</ul>
```

```js
import $ from '@fr0st/query';
import Sortable from '@fr0st/ui-sortable';

const sortable = Sortable.init(
    $.findOne('#tasks'),
    { cursor: 'grab' },
);
```

Calling `Sortable.init()` again for the same container returns its existing instance. Dispose the current instance before reinitializing the container with different options.

### Handles and cancel controls

Use `handle` when only part of an item should begin a drag. Inputs, text areas, buttons, selects, and options are excluded by the default `cancel` selector, including nested content inside those controls.

Cancel checks include ancestors of the handle up to, but not including, the sortable container. A handle inside a button is therefore excluded too. Use `cancel: null` to disable these exclusions, or supply a custom selector.

```html
<ul class="list-group" id="tasks">
    <li class="list-group-item d-flex align-items-center gap-3">
        <span class="drag-handle badge bg-secondary">Drag</span>
        <span class="flex-grow-1">Review pull request</span>
        <button class="btn btn-sm btn-outline-danger" type="button">Delete</button>
    </li>
</ul>
```

```js
Sortable.init($.findOne('#tasks'), {
    cursor: 'grab',
    handle: '.drag-handle',
});
```

Both `items` and `handle` accept comma-separated selectors. For example, `items: ':scope > .task, :scope > .note'` with `handle: '.drag-handle, .grip'` allows either handle inside either item type.

### Connected containers

Initialize each container with a shared `connectWith` selector. Give empty containers a visible size so pointer proximity can select them.

```html
<div class="row">
    <div class="col">
        <ul class="connected list-group" id="available">
            <li class="list-group-item">Alpha</li>
            <li class="list-group-item">Bravo</li>
        </ul>
    </div>
    <div class="col">
        <ul class="connected list-group" id="selected" style="min-height: 3rem"></ul>
    </div>
</div>
```

```js
$.find('.connected').forEach((node) => {
    Sortable.init(node, {
        connectWith: '.connected',
        cursor: 'grab',
    });
});
```

The receiving instance controls `dropOnEmpty` and `disabled`. Moving between containers triggers `send` on the previous container and `receive` on the new container.

Containers can use different `cursor` and `handle` settings. On transfer, Sortable restores the previous container's cursor targets before `send`, then applies the receiving container's cursor to its items or handles during `receive`.

## Options

Options are resolved in this order:

1. Component defaults
2. The element's `data-ui-*` attributes
3. Options passed to `Sortable.init()`

Resolved `instance.options` are shallow-frozen.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `axis` | `'x' \| 'y' \| null` | `null` | Constrain item placement decisions to one axis. |
| `cancel` | `string \| null` | `'input, textarea, button, select, option'` | Prevent matching controls or their nested content from starting a sort. |
| `connectWith` | `string \| null` | `null` | Select other Sortable containers that can exchange items. |
| `cursor` | `string` | `'auto'` | Set the cursor on sortable items or configured handles. |
| `disabled` | `boolean` | `false` | Disable sorting and connected-list receiving initially. |
| `dropOnEmpty` | `boolean` | `true` | Allow this container to receive items while empty. |
| `handle` | `string \| null` | `null` | Select the drag handle inside each sortable item. |
| `helperClass` | `string \| null` | `'bg-body-tertiary'` | Add one or more classes to the active item during a drag. |
| `items` | `string` | `':scope > li'` | Select sortable items relative to the container. |
| `scroll` | `boolean` | `true` | Scroll the window while dragging near a viewport edge. |
| `scrollSensitivity` | `number` | `20` | Start auto-scrolling within this distance of an edge, in pixels. |
| `scrollSpeed` | `number` | `5` | Scroll this many pixels per animation frame. |
| `swapThreshold` | `number` | `0.25` | Swap after crossing this fraction of the next item, from `0` to `1`. The threshold is mirrored when reversing direction. |

```js
const sortable = Sortable.init(node, {
    axis: 'y',
    cancel: 'input, textarea, button, select, option, [data-no-sort]',
    connectWith: '.task-list',
    cursor: 'grab',
    disabled: false,
    dropOnEmpty: true,
    handle: '.drag-handle',
    helperClass: 'bg-primary-subtle shadow-sm',
    items: ':scope > .task',
    scroll: true,
    scrollSensitivity: 32,
    scrollSpeed: 8,
    swapThreshold: 0.25,
});
```

Auto-scrolling updates item placement and sorting events even while the pointer remains stationary near an edge. Scroll steps are instant regardless of the page's CSS `scroll-behavior`; Sortable does not modify that style.

## Data attributes

Use kebab-case `data-ui-*` attributes for serializable options. fQuery normalizes boolean, numeric, array, object, and `null` values.

```html
<ul
    id="tasks"
    data-ui-toggle="sortable"
    data-ui-axis="y"
    data-ui-connect-with=".task-list"
    data-ui-cursor="grab"
    data-ui-drop-on-empty="true"
    data-ui-handle=".drag-handle"
    data-ui-helper-class="bg-primary-subtle shadow-sm"
    data-ui-items=":scope > .task"
    data-ui-scroll="true"
    data-ui-scroll-sensitivity="32"
    data-ui-scroll-speed="8"
    data-ui-swap-threshold="0.25">
</ul>
```

```js
import $ from '@fr0st/query';
import '@fr0st/ui-sortable';

$('[data-ui-toggle="sortable"]').sortable();
```

Data attributes configure options; they do not initialize Sortable by themselves. Initialize the component through the class or fQuery plugin. Changing an option's data attribute after initialization does not reconfigure the existing instance.

## Methods

| Method | Returns | Description |
| --- | --- | --- |
| `Sortable.init(node, options?)` | `Sortable` | Return the existing instance for an element or create one. |
| `disable()` | `void` | Stop the instance from starting sorts or receiving connected items. |
| `dispose()` | `void` | Remove owned events and registered state, release cursor locks, and cancel scrolling and active drag state. |
| `enable()` | `void` | Allow the instance to start and receive sorts. |
| `items()` | `HTMLElement[]` | Return a fresh array of elements matching the configured `items` selector. |

```js
const items = sortable.items();
sortable.disable();
sortable.enable();
sortable.dispose();
```

Disposal restores original inline cursor declarations, including `!important` priority, and releases cursor style locks.

## Lifecycle

Calling `Sortable.init()` again for the same element returns its existing instance. Dispose the current instance before reinitializing with different options.

An instance exposes its original element as `instance.node` and its shallow-frozen resolved configuration as `instance.options`. Both become `null` after disposal.

`dispose()` releases resources owned by the component and removes its registered instance. Repeated disposal is safe and does not affect a new instance initialized on the same element. Use a new instance before calling other methods after disposal.

If initialization fails, the component releases resources it created and removes its registered instance before rethrowing the error. The element can then be initialized again.

## Events

Listen with fQuery's namespaced event API:

```js
import $ from '@fr0st/query';

$.addEvent(
    '#tasks',
    'sort.ui.sortable sorting.ui.sortable sorted.ui.sortable update.ui.sortable',
    (event) => {
        console.log({
            item: event.item,
            from: event.from,
            to: event.to,
            oldIndex: event.oldIndex,
            newIndex: event.newIndex,
        });
    },
);
```

| Event | Description |
| --- | --- |
| `sort.ui.sortable` | The first movement begins an active sort. Emitted on the source container. |
| `sorting.ui.sortable` | The item changes index within the same container. Emitted on the current container. |
| `send.ui.sortable` | The item moves out to a connected container. Emitted on the previous container. |
| `receive.ui.sortable` | The item enters from a connected container. Emitted on the new container. |
| `sorted.ui.sortable` | The pointer or touch is released, or the touch sequence is cancelled, after an active sort. Emitted on the final container. |
| `update.ui.sortable` | The final order changes. Cross-container moves update both source and destination. Emitted on each container whose order changed. |

Every event exposes the same normalized fields directly and through `event.detail`:

| Field | Type | Description |
| --- | --- | --- |
| `item` | `HTMLElement` | Item being sorted. |
| `from` | `HTMLElement` | Source for `sort`, current container for `sorting`, previous container for `send`/`receive`, and original source for `sorted`/`update`. |
| `to` | `HTMLElement` | Source for `sort`, current container for `sorting`, new container for `send`/`receive`, and final destination for `sorted`/`update`. |
| `oldIndex` | `number` | Previous index for movement events, otherwise the original index. |
| `newIndex` | `number` | New index for movement events, otherwise the final index. |
| `detail.target` | `HTMLElement` | Alias of the active `item` retained for Frost UI event compatibility. |

Indices are calculated among elements matching the container's configured `items` selector; unrelated child elements are not counted.

## fQuery API

Importing Sortable registers `sortable` on `fQuery.QuerySet`:

```js
import $ from '@fr0st/query';
import '@fr0st/ui-sortable';

const sortable = $('#tasks').sortable({ cursor: 'grab' });

$('#tasks').sortable('disable');
$('#tasks').sortable('enable');
const items = $('#tasks').sortable('items');
$('#tasks').sortable('dispose');
```

Pass an options object to initialize every matched element, or pass a public method name followed by its arguments. The first component or method result is returned.

## Accessibility

Pointer sorting does not replace keyboard-accessible ordering controls. For workflows where order is essential, provide buttons or another keyboard mechanism that performs the same move and communicates the updated position to assistive technology. A visible drag handle should have an accessible label that describes its purpose.

## Customization

Sortable does not ship component-specific CSS or Sass. It composes existing Frost UI classes and leaves collection layout to the application. The default helper class, `bg-body-tertiary`, comes from Frost UI and can be replaced or disabled with `helperClass: null`.

For touch interfaces, applying `touch-action: none` to sortable items or handles prevents browser gestures from competing with dragging:

```css
.drag-handle {
    touch-action: none;
    user-select: none;
}
```

## Themes and RTL

Frost UI follows the user's preferred color scheme by default. Set `data-ui-theme="light"` or `data-ui-theme="dark"` on the document or an ancestor to select a theme explicitly.

Sortable uses Frost UI utilities for helper styling. The application's CSS controls list layout and item presentation; sorting follows the rendered item geometry.

## Browser support

Bundles are built with Vite's `baseline-widely-available` target. The automated browser suite is configured for the Chromium, Firefox, and WebKit versions supplied by the installed Playwright release.

## Development

Install dependencies with `npm ci`, then install Playwright browsers with `npx playwright install --with-deps`.

```bash
npm test
npm run lint
npm run build
```

`npm test` rebuilds the bundles, then runs the Playwright suite in Chromium, Firefox, and WebKit. `npm run test:browser` runs the suite against the existing bundles, so rebuild after changing source files.

After building, `npm run test:coverage` runs Chromium tests and writes coverage reports to `coverage/`.

`npm run test:headed` and `npm run test:ui` also use the existing bundles and open headed browsers or the Playwright UI.

To view the demo, open `demo/index.html` in your browser after building.

## License

Frost UI Sortable is released under the [MIT License](./LICENSE).
