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
- Prebuilt ESM and UMD bundles with source maps
- No component-specific CSS or Sass
- JSDoc-powered IntelliSense

## Installation

### Browser projects / bundlers

Install Sortable with its Frost UI and fQuery peers:

```bash
npm i @fr0st/ui-sortable @fr0st/ui @fr0st/query
```

The package root resolves to the compiled ESM bundle. Import the Frost UI stylesheet and the default component export:

```js
import '@fr0st/ui/dist/frost-ui.min.css';
import Sortable from '@fr0st/ui-sortable';

const sortable = Sortable.init(
    document.querySelector('#tasks'),
    {
        cursor: 'grab',
        handle: '.drag-handle',
    },
);
```

Frost UI 4 (`@fr0st/ui@^4.0.0`) and fQuery 5 (`@fr0st/query@^5.0.0`) are peer dependencies so the component shares the application's UI and fQuery instances. The package root, `dist/*`, and `src/*` are available through package exports.

Sortable requires a browser DOM or a compatible DOM environment configured through fQuery. Server-rendered applications should load the component on the client.

### Browser (ESM)

The ESM bundle imports `@fr0st/ui` and `@fr0st/query`. Frost UI and fQuery also require `@fr0st/core`, so map all three dependencies when loading the bundle directly in a browser:

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

    Sortable.init(document.querySelector('#tasks'));
</script>
```

### Browser (UMD)

Load Frost UI's all-in-one bundle before Sortable. The UI bundle supplies both the `UI` and `fQuery` globals expected by the component:

```html
<link
    rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/@fr0st/ui@latest/dist/frost-ui.min.css">

<script src="https://cdn.jsdelivr.net/npm/@fr0st/ui@latest/dist/frost-ui-bundle.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@fr0st/ui-sortable@latest/dist/frost-ui-sortable.min.js"></script>
<script>
    const sortable = UI.Sortable.init(
        document.querySelector('#tasks'),
    );
</script>
```

The UMD bundle adds `Sortable` to the existing `globalThis.UI` object. It expects `globalThis.UI` and `globalThis.fQuery` to exist before it loads. If the non-bundled Frost UI build is used instead, load fQuery, Frost UI, and Sortable in that order.

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
import Sortable from '@fr0st/ui-sortable';

const sortable = Sortable.init(
    document.querySelector('#tasks'),
    { cursor: 'grab' },
);
```

Calling `Sortable.init()` again for the same container returns its existing instance. Dispose the current instance before reinitializing the container with different options.

### Handles and cancel controls

Use `handle` when only part of an item should begin a drag. Inputs, text areas, buttons, selects, and options are excluded by the default `cancel` selector, including nested content inside those controls.

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
Sortable.init(document.querySelector('#tasks'), {
    cursor: 'grab',
    handle: '.drag-handle',
});
```

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
document.querySelectorAll('.connected').forEach((node) => {
    Sortable.init(node, {
        connectWith: '.connected',
        cursor: 'grab',
    });
});
```

The receiving instance controls `dropOnEmpty` and `disabled`. Moving between containers triggers `send` on the previous container and `receive` on the new container.

## Options

Options are resolved in this order:

1. Component defaults
2. The container's `data-ui-*` attributes
3. Options passed to `Sortable.init()`

Resolved `instance.options` are frozen.

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

## Data attributes

Every option can be supplied through a `data-ui-*` attribute. fQuery normalizes boolean, numeric, array, object, and `null` values.

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

Data attributes do not initialize the component automatically. Initialize matching elements directly or through the fQuery plugin:

```js
$('[data-ui-toggle="sortable"]').sortable();
```

## Methods

### `Sortable.init(node, options?)`

Return the existing instance for `node`, or create one with the supplied options.

### `items()`

Return a fresh array of elements matching the configured `items` selector.

```js
const items = sortable.items();
```

### `disable()`

Stop the instance from starting sorts or receiving connected items.

### `enable()`

Allow the instance to start and receive sorts.

### `dispose()`

Detach Sortable events, restore original cursor styles, cancel active auto-scrolling, clear active drag state, remove stored component data, and set `node` and `options` to `null`.

## fQuery plugin

Registration adds `sortable` to `fQuery.QuerySet.prototype`:

```js
const sortable = $('#tasks').sortable({ cursor: 'grab' });

$('#tasks').sortable('disable');
$('#tasks').sortable('enable');
const items = $('#tasks').sortable('items');
$('#tasks').sortable('dispose');
```

Calling the plugin on multiple elements initializes every valid element and returns the first result.

## Events

Listen with fQuery's namespaced event API:

```js
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

| Event | Target | Description |
| --- | --- | --- |
| `sort.ui.sortable` | Source | The first movement begins an active sort. |
| `sorting.ui.sortable` | Current container | The item changes index within the same container. |
| `send.ui.sortable` | Previous container | The item moves out to a connected container. |
| `receive.ui.sortable` | New container | The item enters from a connected container. |
| `sorted.ui.sortable` | Final container | The pointer or touch is released after an active sort. |
| `update.ui.sortable` | Changed container(s) | The final order changes. Cross-container moves update both source and destination. |

Every event exposes the same normalized fields directly and through `event.detail`:

| Field | Type | Description |
| --- | --- | --- |
| `item` | `HTMLElement` | Item being sorted. |
| `from` | `HTMLElement` | Previous container for transfer events, otherwise the original container. |
| `to` | `HTMLElement` | New container for transfer events, otherwise the final container. |
| `oldIndex` | `number` | Previous index for movement events, otherwise the original index. |
| `newIndex` | `number` | New index for movement events, otherwise the final index. |
| `detail.target` | `HTMLElement` | Alias of the active `item` retained for Frost UI event compatibility. |

Indices are calculated among elements matching the container's configured `items` selector; unrelated child elements are not counted.

## Styling and accessibility

Sortable does not ship component-specific CSS or Sass. It composes existing Frost UI classes and leaves collection layout to the application. The default helper class, `bg-body-tertiary`, comes from Frost UI and can be replaced or disabled with `helperClass: null`.

Pointer sorting does not replace keyboard-accessible ordering controls. For workflows where order is essential, provide buttons or another keyboard mechanism that performs the same move and communicates the updated position to assistive technology. A visible drag handle should have an accessible label that describes its purpose.

For touch interfaces, applying `touch-action: none` to sortable items or handles prevents browser gestures from competing with dragging:

```css
.drag-handle {
    touch-action: none;
    user-select: none;
}
```

## Browser support

Source and bundles target the Baseline Widely Available feature set. The automated browser suite runs against current Chromium, Firefox, and WebKit releases.

## Development

```bash
npm test
npm run lint
npm run build
```

`npm test` builds the bundles and runs the Playwright suite in Chromium, Firefox, and WebKit.

## License

Frost UI Sortable is released under the [MIT License](./LICENSE).
