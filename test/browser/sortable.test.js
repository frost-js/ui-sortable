import { expect, test } from '#test';
import { resetPage } from '../setup/browser.js';
import { drag } from '../support/drag.js';

test.beforeEach(async ({ page }) => {
    await resetPage(page);
});

test.describe('Sortable', () => {
    test.describe('#init', () => {
        test('creates and reuses Sortable instances', async ({ page }) => {
            expect(await page.evaluate((_) => {
                $.setHTML(
                    document.body,
                    '<ul class="sortable" id="one"><li>One</li></ul>' +
                    '<ul class="sortable" id="two"><li>Two</li></ul>',
                );

                const one = $.findOne('#one');
                const first = UI.Sortable.init(one, { cursor: 'grab' });
                const second = UI.Sortable.init(one, { cursor: 'copy' });
                const queryResult = $('.sortable').sortable();

                return {
                    dataKey: UI.Sortable.DATA_KEY,
                    firstQueryResult: queryResult === first,
                    instance: first instanceof UI.Sortable,
                    queryInitializedSecond: $.getData('#two', 'sortable') instanceof UI.Sortable,
                    removeEvent: UI.Sortable.REMOVE_EVENT,
                    reused: first === second,
                };
            })).toEqual({
                dataKey: 'sortable',
                firstQueryResult: true,
                instance: true,
                queryInitializedSecond: true,
                removeEvent: 'remove.ui.sortable',
                reused: true,
            });
        });

        test('uses frozen defaults, data options, and custom items', async ({ page }) => {
            expect(await page.evaluate((_) => {
                $.setHTML(
                    document.body,
                    '<div id="list" data-ui-axis="x" data-ui-scroll-speed="12">' +
                        '<div class="item" id="one">One</div>' +
                        '<div id="ignored">Ignored</div>' +
                        '<div class="item" id="two">Two</div>' +
                    '</div>',
                );
                const sortable = UI.Sortable.init($.findOne('#list'), {
                    items: ':scope > .item',
                });

                return {
                    axis: sortable.options.axis,
                    defaults: { ...UI.Sortable.defaults },
                    frozen: Object.isFrozen(sortable.options),
                    itemIds: sortable.items().map((node) => node.id),
                    scrollSpeed: sortable.options.scrollSpeed,
                    swapThreshold: sortable.options.swapThreshold,
                };
            })).toEqual({
                axis: 'x',
                defaults: {
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
                },
                frozen: true,
                itemIds: ['one', 'two'],
                scrollSpeed: 12,
                swapThreshold: 0.25,
            });
        });
    });

    test.describe('#dispose', () => {
        test('removes the instance and restores existing cursor styles', async ({ page }) => {
            expect(await page.evaluate((_) => {
                $.setHTML(
                    document.body,
                    '<ul id="list"><li id="one" style="cursor: crosshair !important">One</li></ul>',
                );
                const list = $.findOne('#list');
                const item = $.findOne('#one');
                const sortable = UI.Sortable.init(list, { cursor: 'grab' });
                const activeCursor = item.style.cursor;

                sortable.dispose();
                sortable.dispose();

                return {
                    activeCursor,
                    dataRemoved: !$.hasData(list, 'sortable'),
                    node: sortable.node,
                    options: sortable.options,
                    priority: item.style.getPropertyPriority('cursor'),
                    restoredCursor: item.style.cursor,
                };
            })).toEqual({
                activeCursor: 'grab',
                dataRemoved: true,
                node: null,
                options: null,
                priority: 'important',
                restoredCursor: 'crosshair',
            });
        });

        test('disposes through the query API and when its node is removed', async ({ page }) => {
            expect(await page.evaluate((_) => {
                $.setHTML(
                    document.body,
                    '<ul id="one"><li>One</li></ul><ul id="two"><li>Two</li></ul>',
                );
                $('#one').sortable();
                $('#one').sortable('dispose');

                const two = $.findOne('#two');
                const sortable = UI.Sortable.init(two);
                $.remove(two);

                return {
                    queryDisposed: !$.hasData('#one', 'sortable'),
                    removedNodeDisposed: sortable.node === null && sortable.options === null,
                };
            })).toEqual({
                queryDisposed: true,
                removedNodeDisposed: true,
            });
        });
    });

    test.describe('sorting', () => {
        test.beforeEach(async ({ page }) => {
            await page.evaluate((_) => {
                $.setHTML(
                    document.body,
                    '<ul class="list-group" id="list" style="width: 240px">' +
                        '<li class="list-group-item" id="one">One</li>' +
                        '<li class="list-group-item" id="two">Two</li>' +
                        '<li class="list-group-item" id="three">Three</li>' +
                    '</ul>',
                );
            });
        });

        test('sorts items and emits normalized lifecycle events', async ({ page }) => {
            await page.evaluate((_) => {
                window.sortableEvents = [];
                const list = $.findOne('#list');

                $.addEvent(
                    list,
                    'sort.ui.sortable sorting.ui.sortable sorted.ui.sortable update.ui.sortable',
                    (event) => {
                        window.sortableEvents.push({
                            detailItem: event.detail.item.id,
                            detailTarget: event.detail.target.id,
                            from: event.from.id,
                            item: event.item.id,
                            namespace: event.namespace,
                            newIndex: event.newIndex,
                            oldIndex: event.oldIndex,
                            to: event.to.id,
                            type: event.type,
                        });
                    },
                );

                UI.Sortable.init(list, { cursor: 'grab' });
            });

            await drag(page, '#one', '#three', { y: 0.8 });

            await expect(page.locator('#list > li')).toHaveText(['Two', 'Three', 'One']);

            const events = await page.evaluate((_) => window.sortableEvents);
            expect(events[0]).toEqual({
                detailItem: 'one',
                detailTarget: 'one',
                from: 'list',
                item: 'one',
                namespace: 'ui.sortable',
                newIndex: 0,
                oldIndex: 0,
                to: 'list',
                type: 'sort',
            });
            expect(events.some((event) => event.type === 'sorting')).toBe(true);
            expect(events.at(-2)).toMatchObject({
                item: 'one',
                newIndex: 2,
                oldIndex: 0,
                type: 'sorted',
            });
            expect(events.at(-1)).toMatchObject({
                item: 'one',
                newIndex: 2,
                oldIndex: 0,
                type: 'update',
            });
            await expect(page.locator('#list')).not.toHaveAttribute('data-ui-dragging');
            await expect(page.locator('#one')).not.toHaveClass(/bg-body-tertiary/);
        });

        test('does not start a sort for a click, right button, or nested cancel control', async ({ page }) => {
            await page.evaluate((_) => {
                $.setHTML(
                    '#one',
                    '<span>One</span><button id="cancel" type="button"><span id="cancel-icon">Cancel</span></button>',
                );
                window.sortCount = 0;
                $.addEvent('#list', 'sort.ui.sortable', (_) => window.sortCount++);
                UI.Sortable.init($.findOne('#list'));
            });

            await page.locator('#one').click();
            await drag(page, '#cancel-icon', '#three', { y: 0.8 });

            const oneBox = await page.locator('#one').boundingBox();
            const threeBox = await page.locator('#three').boundingBox();
            if (!oneBox || !threeBox) {
                throw new Error('Could not measure right-button drag elements.');
            }
            await page.mouse.move(oneBox.x + 10, oneBox.y + 10);
            await page.mouse.down({ button: 'right' });
            await page.mouse.move(threeBox.x + 10, threeBox.y + 10);
            await page.mouse.up({ button: 'right' });

            await expect(page.locator('#list > li')).toHaveText(['OneCancel', 'Two', 'Three']);
            expect(await page.evaluate((_) => window.sortCount)).toBe(0);
        });

        test('sorts only from a configured handle', async ({ page }) => {
            await page.evaluate((_) => {
                $('#list > li').each((node) => {
                    $.append(node, $.create('span', {
                        class: 'handle float-end',
                        text: 'Handle',
                    }));
                });
                UI.Sortable.init($.findOne('#list'), {
                    cursor: 'grab',
                    handle: '.handle',
                });
            });

            await drag(page, '#one', '#three', { y: 0.8 });
            await expect(page.locator('#list > li')).toHaveText([
                'OneHandle',
                'TwoHandle',
                'ThreeHandle',
            ]);

            await drag(page, '#one .handle', '#three', { y: 0.8 });
            await expect(page.locator('#list > li')).toHaveText([
                'TwoHandle',
                'ThreeHandle',
                'OneHandle',
            ]);
        });

        test('supports disable and enable methods', async ({ page }) => {
            await page.evaluate((_) => {
                const sortable = UI.Sortable.init($.findOne('#list'));
                sortable.disable();
            });

            await drag(page, '#one', '#three', { y: 0.8 });
            await expect(page.locator('#list > li')).toHaveText(['One', 'Two', 'Three']);

            await page.evaluate((_) => $('#list').sortable('enable'));
            await drag(page, '#one', '#three', { y: 0.8 });
            await expect(page.locator('#list > li')).toHaveText(['Two', 'Three', 'One']);
        });

        test('preserves existing helper classes', async ({ page }) => {
            await page.evaluate((_) => {
                $.addClass('#one', 'existing');
                UI.Sortable.init($.findOne('#list'), {
                    helperClass: 'existing active extra',
                });
            });

            const sourceBox = await page.locator('#one').boundingBox();
            const destinationBox = await page.locator('#three').boundingBox();
            if (!sourceBox || !destinationBox) {
                throw new Error('Could not measure helper drag elements.');
            }

            await page.mouse.move(sourceBox.x + 10, sourceBox.y + 10);
            await page.mouse.down();
            await page.mouse.move(destinationBox.x + 10, destinationBox.y + 10, { steps: 8 });
            await page.waitForTimeout(32);
            await expect(page.locator('#one')).toHaveClass(/active/);
            await expect(page.locator('#one')).toHaveClass(/extra/);
            await page.mouse.up();
            await page.waitForTimeout(32);

            await expect(page.locator('#one')).toHaveClass('list-group-item existing');
        });

        test('sorts horizontally when constrained to the x axis', async ({ page }) => {
            await page.evaluate((_) => {
                $.addClass('#list', 'list-group-horizontal');
                UI.Sortable.init($.findOne('#list'), { axis: 'x' });
            });

            await drag(page, '#one', '#three', { x: 0.8 });
            await expect(page.locator('#list > li')).toHaveText(['Two', 'Three', 'One']);
        });

        test('swaps after crossing one quarter of an item in either direction', async ({ page }) => {
            await page.evaluate((_) => {
                UI.Sortable.init($.findOne('#list'));
            });

            const oneBox = await page.locator('#one').boundingBox();
            const twoBox = await page.locator('#two').boundingBox();
            if (!oneBox || !twoBox) {
                throw new Error('Could not measure threshold drag elements.');
            }

            await page.mouse.move(oneBox.x + oneBox.width / 2, oneBox.y + oneBox.height / 2);
            await page.mouse.down();
            await page.mouse.move(oneBox.x + oneBox.width / 2, oneBox.y + oneBox.height / 2 + 1);
            await page.mouse.move(twoBox.x + twoBox.width / 2, twoBox.y + twoBox.height * 0.2);
            await expect(page.locator('#list > li')).toHaveText(['One', 'Two', 'Three']);
            await page.mouse.move(twoBox.x + twoBox.width / 2, twoBox.y + twoBox.height * 0.3);
            await expect(page.locator('#list > li')).toHaveText(['Two', 'One', 'Three']);
            await page.mouse.up();

            const updatedOneBox = await page.locator('#one').boundingBox();
            const updatedTwoBox = await page.locator('#two').boundingBox();
            if (!updatedOneBox || !updatedTwoBox) {
                throw new Error('Could not measure reverse threshold drag elements.');
            }

            await page.mouse.move(
                updatedOneBox.x + updatedOneBox.width / 2,
                updatedOneBox.y + updatedOneBox.height / 2,
            );
            await page.mouse.down();
            await page.mouse.move(
                updatedOneBox.x + updatedOneBox.width / 2,
                updatedOneBox.y + updatedOneBox.height / 2 - 1,
            );
            await page.mouse.move(
                updatedTwoBox.x + updatedTwoBox.width / 2,
                updatedTwoBox.y + updatedTwoBox.height * 0.8,
            );
            await expect(page.locator('#list > li')).toHaveText(['Two', 'One', 'Three']);
            await page.mouse.move(
                updatedTwoBox.x + updatedTwoBox.width / 2,
                updatedTwoBox.y + updatedTwoBox.height * 0.7,
            );
            await expect(page.locator('#list > li')).toHaveText(['One', 'Two', 'Three']);
            await page.mouse.up();
        });

        test('supports a custom swap threshold', async ({ page }) => {
            await page.evaluate((_) => {
                UI.Sortable.init($.findOne('#list'), { swapThreshold: 0.75 });
            });

            const oneBox = await page.locator('#one').boundingBox();
            const twoBox = await page.locator('#two').boundingBox();
            if (!oneBox || !twoBox) {
                throw new Error('Could not measure custom threshold drag elements.');
            }

            await page.mouse.move(oneBox.x + oneBox.width / 2, oneBox.y + oneBox.height / 2);
            await page.mouse.down();
            await page.mouse.move(oneBox.x + oneBox.width / 2, oneBox.y + oneBox.height / 2 + 1);
            await page.mouse.move(twoBox.x + twoBox.width / 2, twoBox.y + twoBox.height * 0.5);
            await expect(page.locator('#list > li')).toHaveText(['One', 'Two', 'Three']);
            await page.mouse.move(twoBox.x + twoBox.width / 2, twoBox.y + twoBox.height * 0.8);
            await expect(page.locator('#list > li')).toHaveText(['Two', 'One', 'Three']);
            await page.mouse.up();
        });

        test('survives disposal from a sort listener', async ({ page }) => {
            const errors = [];
            page.on('pageerror', (error) => errors.push(error.message));

            await page.evaluate((_) => {
                const list = $.findOne('#list');
                const sortable = UI.Sortable.init(list);
                $.addEvent(list, 'sort.ui.sortable', (_) => sortable.dispose());
            });

            await drag(page, '#one', '#three', { y: 0.8 });

            expect(errors).toEqual([]);
            expect(await page.evaluate((_) => $.hasData('#list', 'sortable'))).toBe(false);
            await expect(page.locator('#list')).not.toHaveAttribute('data-ui-dragging');
            await expect(page.locator('#one')).not.toHaveClass(/bg-body-tertiary/);
        });
    });

    test.describe('connected containers', () => {
        test.beforeEach(async ({ page }) => {
            await page.evaluate((_) => {
                $.setHTML(
                    document.body,
                    '<div class="d-flex gap-5">' +
                        '<ul class="connected list-group" id="source" style="min-height: 80px; width: 240px">' +
                            '<li class="list-group-item" id="one">One</li>' +
                            '<li class="list-group-item" id="two">Two</li>' +
                        '</ul>' +
                        '<ul class="connected list-group" id="destination" style="min-height: 80px; width: 240px">' +
                            '<li class="list-group-item" id="three">Three</li>' +
                        '</ul>' +
                    '</div>',
                );
            });
        });

        test('moves items between containers and emits transfer events', async ({ page }) => {
            await page.evaluate((_) => {
                window.transferEvents = [];
                $('.connected').addEvent(
                    'sort.ui.sortable send.ui.sortable receive.ui.sortable sorted.ui.sortable update.ui.sortable',
                    (event) => {
                        window.transferEvents.push({
                            currentTarget: event.currentTarget.id,
                            from: event.from.id,
                            item: event.item.id,
                            newIndex: event.newIndex,
                            oldIndex: event.oldIndex,
                            to: event.to.id,
                            type: event.type,
                        });
                    },
                );
                UI.Sortable.init($.findOne('#source'), {
                    connectWith: '.connected',
                    cursor: 'grab',
                });
                UI.Sortable.init($.findOne('#destination'), {
                    connectWith: '.connected',
                    cursor: 'copy',
                });
            });

            await drag(page, '#one', '#destination', { y: 0.95 });

            await expect(page.locator('#source > li')).toHaveText(['Two']);
            await expect(page.locator('#destination > li')).toHaveText(['Three', 'One']);
            await expect(page.locator('#one')).toHaveCSS('cursor', 'copy');

            const events = await page.evaluate((_) => window.transferEvents);
            expect(events.map((event) => `${event.currentTarget}:${event.type}`)).toEqual([
                'source:sort',
                'source:send',
                'destination:receive',
                'destination:sorted',
                'source:update',
                'destination:update',
            ]);
            expect(events.at(-1)).toMatchObject({
                from: 'source',
                item: 'one',
                newIndex: 1,
                oldIndex: 0,
                to: 'destination',
            });
        });

        test('drops into an empty connected container', async ({ page }) => {
            await page.evaluate((_) => {
                $.empty('#destination');
                $('.connected').sortable({ connectWith: '.connected' });
            });

            await drag(page, '#one', '#destination');

            await expect(page.locator('#source > li')).toHaveText(['Two']);
            await expect(page.locator('#destination > li')).toHaveText(['One']);
        });

        test('does not drop into an empty container when dropOnEmpty is false', async ({ page }) => {
            await page.evaluate((_) => {
                $.empty('#destination');
                UI.Sortable.init($.findOne('#source'), { connectWith: '.connected' });
                UI.Sortable.init($.findOne('#destination'), {
                    connectWith: '.connected',
                    dropOnEmpty: false,
                });
            });

            await drag(page, '#one', '#destination');

            await expect(page.locator('#source > li')).toHaveCount(2);
            await expect(page.locator('#destination > li')).toHaveCount(0);
        });

        test('does not drop into a disabled connected container', async ({ page }) => {
            await page.evaluate((_) => {
                UI.Sortable.init($.findOne('#source'), { connectWith: '.connected' });
                UI.Sortable.init($.findOne('#destination'), {
                    connectWith: '.connected',
                    disabled: true,
                });
            });

            await drag(page, '#one', '#three');

            await expect(page.locator('#source > li')).toHaveCount(2);
            await expect(page.locator('#destination > li')).toHaveText(['Three']);
        });
    });

    test.describe('automatic scrolling', () => {
        test('scrolls the window near the bottom-right edge', async ({ page }) => {
            await page.evaluate((_) => {
                $.setStyle(document.body, {
                    height: '1600px',
                    width: '1600px',
                });
                $.setHTML(
                    document.body,
                    '<ul class="list-group" id="list" style="width: 240px">' +
                        '<li class="list-group-item" id="one">One</li>' +
                        '<li class="list-group-item" id="two">Two</li>' +
                    '</ul>',
                );
                UI.Sortable.init($.findOne('#list'), {
                    scrollSensitivity: 60,
                    scrollSpeed: 30,
                });
            });

            const sourceBox = await page.locator('#one').boundingBox();
            if (!sourceBox) {
                throw new Error('Could not measure scroll drag element.');
            }
            await page.mouse.move(sourceBox.x + 10, sourceBox.y + 10);
            await page.mouse.down();
            await page.mouse.move(790, 590, { steps: 8 });
            await page.waitForTimeout(100);

            const scroll = await page.evaluate((_) => ({
                x: window.scrollX,
                y: window.scrollY,
            }));
            expect(scroll.x).toBeGreaterThan(0);
            expect(scroll.y).toBeGreaterThan(0);
            expect(await page.evaluate((_) =>
                document.documentElement.style.scrollBehavior)).toBe('');

            await page.mouse.up();
        });

        test('can disable automatic scrolling', async ({ page }) => {
            await page.evaluate((_) => {
                $.setStyle(document.body, { height: '1600px' });
                $.setHTML(
                    document.body,
                    '<ul class="list-group" id="list"><li class="list-group-item" id="one">One</li></ul>',
                );
                UI.Sortable.init($.findOne('#list'), { scroll: false });
            });

            const sourceBox = await page.locator('#one').boundingBox();
            if (!sourceBox) {
                throw new Error('Could not measure non-scrolling drag element.');
            }
            await page.mouse.move(sourceBox.x + 10, sourceBox.y + 10);
            await page.mouse.down();
            await page.mouse.move(400, 590, { steps: 8 });
            await page.waitForTimeout(64);

            expect(await page.evaluate((_) => window.scrollY)).toBe(0);
            await page.mouse.up();
        });
    });
});
