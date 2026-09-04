import { expect, test } from '#test';
import { resetPage } from '../setup/browser.js';
import { drag } from '../support/drag.js';

test.beforeEach(async ({ page }) => {
    await resetPage(page);
});

test.describe('Sortable', () => {
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

    test.describe('#init', () => {
        test('creates a Sortable', async ({ page }) => {
            expect(await page.evaluate((_) =>
                UI.Sortable.init($.findOne('#list')) instanceof UI.Sortable,
            )).toBe(true);
        });

        test('creates a Sortable (query)', async ({ page }) => {
            expect(await page.evaluate((_) =>
                $('#list').sortable() instanceof UI.Sortable,
            )).toBe(true);
        });

        test('creates multiple Sortables (query)', async ({ page }) => {
            expect(await page.evaluate((_) => {
                $.setHTML(
                    document.body,
                    '<ul class="sortable" id="one-list"><li>One</li></ul>' +
                    '<ul class="sortable" id="two-list"><li>Two</li></ul>',
                );
                $('.sortable').sortable();

                return ['#one-list', '#two-list'].every((selector) =>
                    $.getData(selector, 'sortable') instanceof UI.Sortable,
                );
            })).toBe(true);
        });

        test('returns the first Sortable (query)', async ({ page }) => {
            expect(await page.evaluate((_) => {
                $.setHTML(
                    document.body,
                    '<ul class="sortable" id="one-list"><li>One</li></ul>' +
                    '<ul class="sortable" id="two-list"><li>Two</li></ul>',
                );
                const sortable = $('.sortable').sortable();

                return sortable === $.getData('#one-list', 'sortable');
            })).toBe(true);
        });

        test('reuses an existing Sortable', async ({ page }) => {
            expect(await page.evaluate((_) => {
                const list = $.findOne('#list');
                const first = UI.Sortable.init(list, { cursor: 'grab' });
                const second = UI.Sortable.init(list, { cursor: 'copy' });

                return {
                    cursor: second.options.cursor,
                    same: first === second,
                };
            })).toEqual({
                cursor: 'grab',
                same: true,
            });
        });

        test('exposes frozen default options', async ({ page }) => {
            expect(await page.evaluate((_) => {
                const sortable = UI.Sortable.init($.findOne('#list'));

                return {
                    ...sortable.options,
                    frozen: Object.isFrozen(sortable.options),
                };
            })).toEqual({
                axis: null,
                cancel: 'input, textarea, button, select, option',
                connectWith: null,
                cursor: 'auto',
                disabled: false,
                dropOnEmpty: true,
                frozen: true,
                handle: null,
                helperClass: 'bg-body-tertiary',
                items: ':scope > li',
                scroll: true,
                scrollSensitivity: 20,
                scrollSpeed: 5,
                swapThreshold: 0.25,
            });
        });

        test('uses data options', async ({ page }) => {
            expect(await page.evaluate((_) => {
                $.setDataset('#list', {
                    uiAxis: 'x',
                    uiScrollSpeed: 12,
                });
                const sortable = UI.Sortable.init($.findOne('#list'));

                return {
                    axis: sortable.options.axis,
                    scrollSpeed: sortable.options.scrollSpeed,
                };
            })).toEqual({
                axis: 'x',
                scrollSpeed: 12,
            });
        });
    });

    test.describe('#dispose', () => {
        test('removes the Sortable', async ({ page }) => {
            expect(await page.evaluate((_) => {
                const list = $.findOne('#list');
                const sortable = UI.Sortable.init(list);

                sortable.dispose();

                return !$.hasData(list, 'sortable') &&
                    sortable.node === null &&
                    sortable.options === null;
            })).toBe(true);
        });

        test('can be called multiple times', async ({ page }) => {
            expect(await page.evaluate((_) => {
                const sortable = UI.Sortable.init($.findOne('#list'));

                try {
                    sortable.dispose();
                    sortable.dispose();
                    sortable.dispose();
                    return true;
                } catch {
                    return false;
                }
            })).toBe(true);
        });

        test('removes the Sortable (query)', async ({ page }) => {
            expect(await page.evaluate((_) => {
                $('#list').sortable();
                $('#list').sortable('dispose');

                return $.hasData('#list', 'sortable');
            })).toBe(false);
        });

        test('removes the Sortable when its node is removed', async ({ page }) => {
            expect(await page.evaluate((_) => {
                const list = $.findOne('#list');
                const sortable = UI.Sortable.init(list);
                $.remove(list);

                return sortable.node === null &&
                    sortable.options === null &&
                    !$.isConnected(list);
            })).toBe(true);

            await expect(page.locator('#list')).toHaveCount(0);
        });
    });

    test.describe('#disable', () => {
        test('disables the Sortable', async ({ page }) => {
            await page.evaluate((_) => {
                const sortable = UI.Sortable.init($.findOne('#list'));
                sortable.disable();
            });

            await drag(page, '#one', '#three', { y: 0.8 });

            await expect(page.locator('#list > li')).toHaveText(['One', 'Two', 'Three']);
        });

        test('disables the Sortable (query)', async ({ page }) => {
            await page.evaluate((_) => {
                $('#list').sortable();
                $('#list').sortable('disable');
            });

            await drag(page, '#one', '#three', { y: 0.8 });

            await expect(page.locator('#list > li')).toHaveText(['One', 'Two', 'Three']);
        });
    });

    test.describe('#enable', () => {
        test('enables the Sortable', async ({ page }) => {
            await page.evaluate((_) => {
                const sortable = UI.Sortable.init(
                    $.findOne('#list'),
                    { disabled: true },
                );
                sortable.enable();
            });

            await drag(page, '#one', '#three', { y: 0.8 });

            await expect(page.locator('#list > li')).toHaveText(['Two', 'Three', 'One']);
        });

        test('enables the Sortable (query)', async ({ page }) => {
            await page.evaluate((_) => {
                $('#list').sortable({ disabled: true });
                $('#list').sortable('enable');
            });

            await drag(page, '#one', '#three', { y: 0.8 });

            await expect(page.locator('#list > li')).toHaveText(['Two', 'Three', 'One']);
        });
    });

    test.describe('#items', () => {
        test('gets the Sortable items', async ({ page }) => {
            expect(await page.evaluate((_) => {
                const sortable = UI.Sortable.init($.findOne('#list'));
                return sortable.items().map((node) => node.id);
            })).toEqual(['one', 'two', 'three']);
        });

        test('gets custom Sortable items', async ({ page }) => {
            expect(await page.evaluate((_) => {
                $.setHTML(
                    document.body,
                    '<div id="list">' +
                        '<div class="item" id="one">One</div>' +
                        '<div id="ignored">Ignored</div>' +
                        '<div class="item" id="two">Two</div>' +
                    '</div>',
                );
                const sortable = UI.Sortable.init(
                    $.findOne('#list'),
                    { items: ':scope > .item' },
                );

                return sortable.items().map((node) => node.id);
            })).toEqual(['one', 'two']);
        });

        test('gets the Sortable items (query)', async ({ page }) => {
            expect(await page.evaluate((_) => {
                $('#list').sortable();
                return $('#list').sortable('items').map((node) => node.id);
            })).toEqual(['one', 'two', 'three']);
        });
    });

    test.describe('sorting', () => {
        test('sorts items', async ({ page }) => {
            await page.evaluate((_) => {
                UI.Sortable.init($.findOne('#list'));
            });

            await drag(page, '#one', '#three', { y: 0.8 });

            await expect(page.locator('#list > li')).toHaveText(['Two', 'Three', 'One']);
            await expect(page.locator('#list')).not.toHaveAttribute('data-ui-dragging');
            await expect(page.locator('#one')).not.toHaveClass(/bg-body-tertiary/);
        });

        test('does not start a sort for a click', async ({ page }) => {
            await page.evaluate((_) => {
                window.sortCount = 0;
                $.addEvent('#list', 'sort.ui.sortable', (_) => window.sortCount++);
                UI.Sortable.init($.findOne('#list'));
            });

            await page.locator('#one').click();

            await expect(page.locator('#list > li')).toHaveText(['One', 'Two', 'Three']);
            expect(await page.evaluate((_) => window.sortCount)).toBe(0);
        });

        test('does not start a sort with the right mouse button', async ({ page }) => {
            await page.evaluate((_) => {
                window.sortCount = 0;
                $.addEvent('#list', 'sort.ui.sortable', (_) => window.sortCount++);
                UI.Sortable.init($.findOne('#list'));
            });

            const oneBox = await page.locator('#one').boundingBox();
            const threeBox = await page.locator('#three').boundingBox();
            if (!oneBox || !threeBox) {
                throw new Error('Could not measure right-button drag elements.');
            }

            await page.mouse.move(oneBox.x + 10, oneBox.y + 10);
            await page.mouse.down({ button: 'right' });
            await page.mouse.move(threeBox.x + 10, threeBox.y + 10);
            await page.mouse.up({ button: 'right' });

            await expect(page.locator('#list > li')).toHaveText(['One', 'Two', 'Three']);
            expect(await page.evaluate((_) => window.sortCount)).toBe(0);
        });
    });

    test.describe('cancel option', () => {
        test('does not sort from a nested cancel control', async ({ page }) => {
            await page.evaluate((_) => {
                $.setHTML(
                    '#one',
                    '<span>One</span>' +
                    '<button id="cancel" type="button">' +
                        '<span id="cancel-icon">Cancel</span>' +
                    '</button>',
                );
                window.sortCount = 0;
                $.addEvent('#list', 'sort.ui.sortable', (_) => window.sortCount++);
                UI.Sortable.init($.findOne('#list'));
            });

            await drag(page, '#cancel-icon', '#three', { y: 0.8 });

            await expect(page.locator('#list > li')).toHaveText([
                'OneCancel',
                'Two',
                'Three',
            ]);
            expect(await page.evaluate((_) => window.sortCount)).toBe(0);
        });
    });

    test.describe('cursor option', () => {
        test('styles the Sortable items', async ({ page }) => {
            await page.evaluate((_) => {
                UI.Sortable.init($.findOne('#list'), { cursor: 'grab' });
            });

            const items = page.locator('#list > li');
            await expect(items).toHaveCount(3);
            for (let index = 0; index < 3; index++) {
                await expect(items.nth(index)).toHaveCSS('cursor', 'grab');
            }
        });
    });

    test.describe('handle option', () => {
        test('sorts only from the configured handle', async ({ page }) => {
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
    });

    test.describe('helperClass option', () => {
        test('adds helper classes while sorting', async ({ page }) => {
            await page.evaluate((_) => {
                $.addClass('#one', 'existing');
                UI.Sortable.init($.findOne('#list'), {
                    helperClass: 'active extra',
                });
            });

            const sourceBox = await page.locator('#one').boundingBox();
            const destinationBox = await page.locator('#three').boundingBox();
            if (!sourceBox || !destinationBox) {
                throw new Error('Could not measure helper drag elements.');
            }

            await page.mouse.move(sourceBox.x + 10, sourceBox.y + 10);
            await page.mouse.down();
            await page.mouse.move(
                destinationBox.x + 10,
                destinationBox.y + 10,
                { steps: 8 },
            );

            await expect(page.locator('#one')).toHaveClass(
                'list-group-item existing active extra',
            );

            await page.mouse.up();

            await expect(page.locator('#one')).toHaveClass('list-group-item existing');
        });
    });

    test.describe('axis option', () => {
        test('sorts horizontally', async ({ page }) => {
            await page.evaluate((_) => {
                $.addClass('#list', 'list-group-horizontal');
                UI.Sortable.init($.findOne('#list'), { axis: 'x' });
            });

            await drag(page, '#one', '#three', { x: 0.8 });

            await expect(page.locator('#list > li')).toHaveText(['Two', 'Three', 'One']);
        });
    });

    test.describe('swapThreshold option', () => {
        test('swaps after crossing one quarter of an item', async ({ page }) => {
            await page.evaluate((_) => {
                UI.Sortable.init($.findOne('#list'));
            });

            const oneBox = await page.locator('#one').boundingBox();
            const twoBox = await page.locator('#two').boundingBox();
            if (!oneBox || !twoBox) {
                throw new Error('Could not measure threshold drag elements.');
            }

            await page.mouse.move(
                oneBox.x + oneBox.width / 2,
                oneBox.y + oneBox.height / 2,
            );
            await page.mouse.down();
            await page.mouse.move(
                oneBox.x + oneBox.width / 2,
                oneBox.y + oneBox.height / 2 + 1,
            );
            await page.mouse.move(
                twoBox.x + twoBox.width / 2,
                twoBox.y + twoBox.height * 0.2,
            );
            await expect(page.locator('#list > li')).toHaveText(['One', 'Two', 'Three']);

            await page.mouse.move(
                twoBox.x + twoBox.width / 2,
                twoBox.y + twoBox.height * 0.3,
            );
            await expect(page.locator('#list > li')).toHaveText(['Two', 'One', 'Three']);
            await page.mouse.up();
        });

        test('swaps in reverse after crossing one quarter of an item', async ({ page }) => {
            await page.evaluate((_) => {
                $.before('#one', '#two');
                UI.Sortable.init($.findOne('#list'));
            });

            const oneBox = await page.locator('#one').boundingBox();
            const twoBox = await page.locator('#two').boundingBox();
            if (!oneBox || !twoBox) {
                throw new Error('Could not measure reverse threshold drag elements.');
            }

            await page.mouse.move(
                oneBox.x + oneBox.width / 2,
                oneBox.y + oneBox.height / 2,
            );
            await page.mouse.down();
            await page.mouse.move(
                oneBox.x + oneBox.width / 2,
                oneBox.y + oneBox.height / 2 - 1,
            );
            await page.mouse.move(
                twoBox.x + twoBox.width / 2,
                twoBox.y + twoBox.height * 0.8,
            );
            await expect(page.locator('#list > li')).toHaveText(['Two', 'One', 'Three']);

            await page.mouse.move(
                twoBox.x + twoBox.width / 2,
                twoBox.y + twoBox.height * 0.7,
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

            await page.mouse.move(
                oneBox.x + oneBox.width / 2,
                oneBox.y + oneBox.height / 2,
            );
            await page.mouse.down();
            await page.mouse.move(
                oneBox.x + oneBox.width / 2,
                oneBox.y + oneBox.height / 2 + 1,
            );
            await page.mouse.move(
                twoBox.x + twoBox.width / 2,
                twoBox.y + twoBox.height * 0.5,
            );
            await expect(page.locator('#list > li')).toHaveText(['One', 'Two', 'Three']);

            await page.mouse.move(
                twoBox.x + twoBox.width / 2,
                twoBox.y + twoBox.height * 0.8,
            );
            await expect(page.locator('#list > li')).toHaveText(['Two', 'One', 'Three']);
            await page.mouse.up();
        });
    });

    test.describe('events', () => {
        test('triggers sorting lifecycle events in order', async ({ page }) => {
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

            expect(await page.evaluate((_) => window.sortableEvents)).toEqual([
                {
                    detailItem: 'one',
                    detailTarget: 'one',
                    from: 'list',
                    item: 'one',
                    namespace: 'ui.sortable',
                    newIndex: 0,
                    oldIndex: 0,
                    to: 'list',
                    type: 'sort',
                },
                {
                    detailItem: 'one',
                    detailTarget: 'one',
                    from: 'list',
                    item: 'one',
                    namespace: 'ui.sortable',
                    newIndex: 1,
                    oldIndex: 0,
                    to: 'list',
                    type: 'sorting',
                },
                {
                    detailItem: 'one',
                    detailTarget: 'one',
                    from: 'list',
                    item: 'one',
                    namespace: 'ui.sortable',
                    newIndex: 2,
                    oldIndex: 1,
                    to: 'list',
                    type: 'sorting',
                },
                {
                    detailItem: 'one',
                    detailTarget: 'one',
                    from: 'list',
                    item: 'one',
                    namespace: 'ui.sortable',
                    newIndex: 2,
                    oldIndex: 0,
                    to: 'list',
                    type: 'sorted',
                },
                {
                    detailItem: 'one',
                    detailTarget: 'one',
                    from: 'list',
                    item: 'one',
                    namespace: 'ui.sortable',
                    newIndex: 2,
                    oldIndex: 0,
                    to: 'list',
                    type: 'update',
                },
            ]);
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

    test.describe('connectWith option', () => {
        test.beforeEach(async ({ page }) => {
            await page.evaluate((_) => {
                $.setHTML(
                    document.body,
                    '<div class="d-flex gap-5">' +
                        '<ul class="connected list-group" id="source" ' +
                            'style="min-height: 80px; width: 240px">' +
                            '<li class="list-group-item" id="one">One</li>' +
                            '<li class="list-group-item" id="two">Two</li>' +
                        '</ul>' +
                        '<ul class="connected list-group" id="destination" ' +
                            'style="min-height: 80px; width: 240px">' +
                            '<li class="list-group-item" id="three">Three</li>' +
                        '</ul>' +
                    '</div>',
                );
            });
        });

        test('moves items between connected containers', async ({ page }) => {
            await page.evaluate((_) => {
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
        });

        test('triggers transfer events in order', async ({ page }) => {
            await page.evaluate((_) => {
                window.transferEvents = [];
                $('.connected').addEvent(
                    'sort.ui.sortable send.ui.sortable receive.ui.sortable ' +
                    'sorted.ui.sortable update.ui.sortable',
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
                $('.connected').sortable({ connectWith: '.connected' });
            });

            await drag(page, '#one', '#destination', { y: 0.95 });

            expect(await page.evaluate((_) => window.transferEvents)).toEqual([
                {
                    currentTarget: 'source',
                    from: 'source',
                    item: 'one',
                    newIndex: 0,
                    oldIndex: 0,
                    to: 'source',
                    type: 'sort',
                },
                {
                    currentTarget: 'source',
                    from: 'source',
                    item: 'one',
                    newIndex: 0,
                    oldIndex: 0,
                    to: 'destination',
                    type: 'send',
                },
                {
                    currentTarget: 'destination',
                    from: 'source',
                    item: 'one',
                    newIndex: 0,
                    oldIndex: 0,
                    to: 'destination',
                    type: 'receive',
                },
                {
                    currentTarget: 'destination',
                    from: 'source',
                    item: 'one',
                    newIndex: 1,
                    oldIndex: 0,
                    to: 'destination',
                    type: 'sorted',
                },
                {
                    currentTarget: 'source',
                    from: 'source',
                    item: 'one',
                    newIndex: 1,
                    oldIndex: 0,
                    to: 'destination',
                    type: 'update',
                },
                {
                    currentTarget: 'destination',
                    from: 'source',
                    item: 'one',
                    newIndex: 1,
                    oldIndex: 0,
                    to: 'destination',
                    type: 'update',
                },
            ]);
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

        test('does not drop into an empty container when disabled', async ({ page }) => {
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

    test.describe('scroll option', () => {
        test('scrolls the window near the bottom-right edge', async ({ page }) => {
            await page.evaluate((_) => {
                $.setStyle(document.body, {
                    height: '1600px',
                    width: '1600px',
                });
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

            await expect.poll(async () =>
                page.evaluate((_) => window.scrollX),
            ).toBeGreaterThan(0);
            await expect.poll(async () =>
                page.evaluate((_) => window.scrollY),
            ).toBeGreaterThan(0);
            expect(await page.evaluate((_) =>
                document.documentElement.style.scrollBehavior,
            )).toBe('');

            await page.mouse.up();
        });

        test('does not scroll the window when disabled', async ({ page }) => {
            await page.evaluate((_) => {
                $.setStyle(document.body, { height: '1600px' });
                UI.Sortable.init($.findOne('#list'), { scroll: false });
            });

            const sourceBox = await page.locator('#one').boundingBox();
            if (!sourceBox) {
                throw new Error('Could not measure non-scrolling drag element.');
            }

            await page.mouse.move(sourceBox.x + 10, sourceBox.y + 10);
            await page.mouse.down();
            await page.mouse.move(400, 590, { steps: 8 });
            await page.evaluate((_) => new Promise((resolve) => {
                requestAnimationFrame((_) => requestAnimationFrame(resolve));
            }));

            expect(await page.evaluate((_) => window.scrollY)).toBe(0);

            await page.mouse.up();
        });
    });
});
