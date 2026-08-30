/** @import { SortableOptions } from './sortable.js'; */

import { initComponent } from '@fr0st/ui';
import Sortable from './sortable.js';

/** @type {SortableOptions} */
Sortable.defaults = {
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
};

initComponent('sortable', Sortable);

export default Sortable;
