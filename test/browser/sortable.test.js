import { expect, test } from '#test';
import { drag } from '../support/drag.js';

test.describe('Sortable', () => {
    test.beforeEach(async ({ page }) => {
        await page.evaluate((_) => {
            document.body.innerHTML =
                '<ul class="list-group" id="list" style="width: 240px">' +
                '<li class="list-group-item" id="one">One</li>' +
                '<li class="list-group-item" id="two">Two</li>' +
                '<li class="list-group-item" id="three">Three</li>' +
                '</ul>';
        });
    });

    test.describe('#init', () => {
        for (const { name, init } of [
            { name: 'class', init: () => UI.Sortable.init(document.querySelector('#list')) },
            { name: 'QuerySet', init: () => $('#list').sortable() },
        ]) {
            test(`creates and registers a Sortable (${name})`, async ({ page }) => {
                const instance = await page.evaluateHandle(init);

                expect(await instance.evaluate((value) => value instanceof UI.Sortable)).toBe(true);
                expect(await instance.evaluate((value) => $.getData('#list', 'sortable') === value)).toBe(true);
            });
        }

        test('creates multiple Sortables (QuerySet)', async ({ page }) => {
            expect(await page.evaluate((_) => {
                document.body.innerHTML =
                    '<ul class="sortable" id="one-list"><li>One</li></ul>' +
                    '<ul class="sortable" id="two-list"><li>Two</li></ul>';
                $('.sortable').sortable();

                return ['#one-list', '#two-list'].map((selector) =>
                    $.getData(selector, 'sortable') instanceof UI.Sortable);
            })).toEqual([true, true]);
        });

        test('returns the first Sortable (QuerySet)', async ({ page }) => {
            expect(await page.evaluate((_) => {
                document.body.innerHTML =
                    '<ul class="sortable" id="one-list"><li>One</li></ul>' +
                    '<ul class="sortable" id="two-list"><li>Two</li></ul>';
                const instance = $('.sortable').sortable();

                return instance === $.getData('#one-list', 'sortable');
            })).toBe(true);
        });

        test('reuses an existing Sortable without changing options', async ({ page }) => {
            expect(await page.evaluate((_) => {
                const list = document.querySelector('#list');
                const first = UI.Sortable.init(list, { cursor: 'grab' });
                const second = UI.Sortable.init(list, { cursor: 'copy' });

                return { cursor: second.options.cursor, same: first === second };
            })).toEqual({ cursor: 'grab', same: true });
        });

        test('exposes frozen default options', async ({ page }) => {
            expect(await page.evaluate((_) => {
                const sortable = UI.Sortable.init(document.querySelector('#list'));

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
                const list = document.querySelector('#list');
                list.dataset.uiAxis = 'x';
                list.dataset.uiScrollSpeed = '12';
                const sortable = UI.Sortable.init(list);

                return {
                    axis: sortable.options.axis,
                    scrollSpeed: sortable.options.scrollSpeed,
                };
            })).toEqual({ axis: 'x', scrollSpeed: 12 });
        });
    });

    test.describe('#dispose', () => {
        for (const { name, dispose } of [
            { name: 'class', dispose: (instance) => instance.dispose() },
            { name: 'QuerySet', dispose: () => $('#list').sortable('dispose') },
        ]) {
            test(`removes the Sortable (${name})`, async ({ page }) => {
                const instance = await page.evaluateHandle(() =>
                    UI.Sortable.init(document.querySelector('#list')),
                );
                await page.evaluate(dispose, instance);

                expect(await instance.evaluate((value) => ({
                    registered: $.hasData('#list', 'sortable'),
                    node: value.node,
                    options: value.options,
                }))).toEqual({ registered: false, node: null, options: null });
            });
        }

        test('can be called multiple times', async ({ page }) => {
            await page.evaluate((_) => {
                const sortable = UI.Sortable.init(document.querySelector('#list'));

                sortable.dispose();
                sortable.dispose();
                sortable.dispose();
            });

            expect(await page.evaluate(() => $.hasData('#list', 'sortable'))).toBe(false);
        });

        test('removes the Sortable when its node is removed', async ({ page }) => {
            expect(await page.evaluate((_) => {
                const list = document.querySelector('#list');
                const sortable = UI.Sortable.init(list);
                $.remove(list);

                return {
                    node: sortable.node,
                    options: sortable.options,
                    connected: list.isConnected,
                };
            })).toEqual({ node: null, options: null, connected: false });

            await expect(page.locator('#list')).toHaveCount(0);
        });
    });

    for (const method of ['disable', 'enable']) {
        test.describe(`#${method}`, () => {
            for (const { name, update } of [
                { name: 'class', update: (method) => $.getData('#list', 'sortable')[method]() },
                { name: 'QuerySet', update: (method) => $('#list').sortable(method) },
            ]) {
                test(`${method}s sorting (${name})`, async ({ page }) => {
                    await page.evaluate((method) => {
                        UI.Sortable.init(document.querySelector('#list'), {
                            disabled: method === 'enable',
                        });
                    }, method);
                    await page.evaluate(update, method);

                    await drag(page, '#one', '#three', { y: 0.8 });

                    await expect(page.locator('#list > li')).toHaveText(
                        method === 'enable' ? ['Two', 'Three', 'One'] : ['One', 'Two', 'Three'],
                    );
                });
            }
        });
    }

    test.describe('#items', () => {
        for (const { name, items } of [
            { name: 'class', items: () => $.getData('#list', 'sortable').items() },
            { name: 'QuerySet', items: () => $('#list').sortable('items') },
        ]) {
            test(`gets the Sortable items (${name})`, async ({ page }) => {
                await page.evaluate(() => UI.Sortable.init(document.querySelector('#list')));
                const result = await page.evaluateHandle(items);

                expect(await result.evaluate((nodes) => nodes.map((node) => node.id))).toEqual([
                    'one', 'two', 'three',
                ]);
            });
        }

        test('gets custom Sortable items', async ({ page }) => {
            expect(await page.evaluate((_) => {
                document.body.innerHTML =
                    '<div id="list">' +
                    '<div class="item" id="one">One</div>' +
                    '<div id="ignored">Ignored</div>' +
                    '<div class="item" id="two">Two</div>' +
                    '</div>';
                const sortable = UI.Sortable.init(document.querySelector('#list'), {
                    items: ':scope > .item',
                });

                return sortable.items().map((node) => node.id);
            })).toEqual(['one', 'two']);
        });
    });

    test.describe('sorting', () => {
        test('sorts items', async ({ page }) => {
            await page.evaluate((_) => {
                UI.Sortable.init(document.querySelector('#list'));
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
                UI.Sortable.init(document.querySelector('#list'));
            });

            await page.locator('#one').click();

            await expect(page.locator('#list > li')).toHaveText(['One', 'Two', 'Three']);
            expect(await page.evaluate((_) => window.sortCount)).toBe(0);
        });

        test('does not start a sort with the right mouse button', async ({ page }) => {
            await page.evaluate((_) => {
                window.sortCount = 0;
                $.addEvent('#list', 'sort.ui.sortable', (_) => window.sortCount++);
                UI.Sortable.init(document.querySelector('#list'));
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
        for (const { name, markup, options, allowed } of [
            {
                name: 'nested button content',
                markup: '<button><span id="start">One</span></button>',
                options: {},
                allowed: false,
            },
            {
                name: 'handle inside a button',
                markup: '<button><span id="start" class="handle">One</span></button>',
                options: { handle: '.handle' },
                allowed: false,
            },
            {
                name: 'button used as a handle',
                markup: '<button id="start" class="handle">One</button>',
                options: { handle: '.handle' },
                allowed: false,
            },
            {
                name: 'custom cancel ancestor',
                markup: '<div class="cancel"><span id="start" class="handle">One</span></div>',
                options: { handle: '.handle', cancel: '.cancel' },
                allowed: false,
            },
            {
                name: 'cancel disabled',
                markup: '<button><span id="start" class="handle">One</span></button>',
                options: { handle: '.handle', cancel: null },
                allowed: true,
            },
            {
                name: 'container matches cancel',
                markup: '<span id="start" class="handle">One</span>',
                options: { handle: '.handle', cancel: '#list' },
                allowed: true,
            },
        ]) {
            test(`${allowed ? 'sorts' : 'does not sort'} from ${name}`, async ({ page }) => {
                await page.evaluate(({ markup, options }) => {
                    document.querySelector('#one').innerHTML = markup;
                    window.sortCount = 0;
                    $.addEvent('#list', 'sort.ui.sortable', () => window.sortCount++);
                    UI.Sortable.init(document.querySelector('#list'), options);
                }, { markup, options });

                await drag(page, '#start', '#three', { y: 0.8 });

                await expect(page.locator('#list > li')).toHaveText(
                    allowed ? ['Two', 'Three', 'One'] : ['One', 'Two', 'Three'],
                );
                expect(await page.evaluate(() => window.sortCount)).toBe(allowed ? 1 : 0);
            });
        }
    });

    test.describe('cursor option', () => {
        test('styles the Sortable items', async ({ page }) => {
            await page.evaluate((_) => {
                UI.Sortable.init(document.querySelector('#list'), { cursor: 'grab' });
            });

            const items = page.locator('#list > li');
            await expect(items).toHaveCount(3);
            for (const item of await items.all()) {
                await expect(item).toHaveCSS('cursor', 'grab');
            }
        });

        for (const { name, value, priority } of [
            { name: 'absent', value: '', priority: '' },
            { name: 'inline', value: 'crosshair', priority: '' },
            { name: 'important', value: 'crosshair', priority: 'important' },
        ]) {
            test(`restores ${name} cursors and releases locks on disposal`, async ({ page }) => {
                const original = { value, priority };
                const instance = await page.evaluateHandle(({ value, priority }) => {
                    document.querySelector('#one').style.setProperty('cursor', value, priority);

                    return UI.Sortable.init(document.querySelector('#list'), { cursor: 'grab' });
                }, original);

                await expect(page.locator('#one')).toHaveCSS('cursor', 'grab');
                await instance.evaluate((sortable) => sortable.dispose());

                expect(await page.locator('#one').evaluate((node) => ({
                    value: node.style.getPropertyValue('cursor'),
                    priority: node.style.getPropertyPriority('cursor'),
                }))).toEqual(original);

                // Acquiring a new lock fails if disposal left the previous lock active.
                await page.locator('#one').evaluate((node) => {
                    const release = $.setStyleLock(node, 'cursor', 'help');
                    release();
                });
                await page.evaluate((_) => {
                    UI.Sortable.init(document.querySelector('#list'), { cursor: 'copy' });
                });

                await expect(page.locator('#one')).toHaveCSS('cursor', 'copy');
                await page.evaluate(() => $.getData('#list', 'sortable').dispose());

                expect(await page.locator('#one').evaluate((node) => ({
                    value: node.style.getPropertyValue('cursor'),
                    priority: node.style.getPropertyPriority('cursor'),
                }))).toEqual(original);
            });
        }
    });

    test.describe('handle option', () => {
        test('sorts only from the configured handle', async ({ page }) => {
            await page.evaluate((_) => {
                for (const node of document.querySelectorAll('#list > li')) {
                    const handle = document.createElement('span');
                    handle.className = 'handle float-end';
                    handle.textContent = 'Handle';
                    node.append(handle);
                }
                UI.Sortable.init(document.querySelector('#list'), {
                    cursor: 'grab',
                    handle: '.handle',
                });
            });

            await drag(page, '#one', '#three', { y: 0.8 });
            await expect(page.locator('#list > li')).toHaveText(['OneHandle', 'TwoHandle', 'ThreeHandle']);

            await drag(page, '#one .handle', '#three', { y: 0.8 });
            await expect(page.locator('#list > li')).toHaveText(['TwoHandle', 'ThreeHandle', 'OneHandle']);
        });

        for (const itemClass of ['a', 'b']) {
            for (const handleClass of ['handle', 'grip']) {
                test(`supports grouped selectors (${itemClass}, ${handleClass})`, async ({ page }) => {
                    await page.evaluate(({ itemClass, handleClass }) => {
                        const one = document.querySelector('#one');
                        one.classList.add(itemClass);
                        one.innerHTML = '<span id="start" class="' + handleClass + '">One</span>';
                        document.querySelector('#two').classList.add('a');
                        document.querySelector('#three').classList.add('b');

                        UI.Sortable.init(document.querySelector('#list'), {
                            items: ':scope > .a, :scope > .b',
                            handle: '.handle, .grip',
                            cursor: 'grab',
                        });
                    }, { itemClass, handleClass });

                    await expect(page.locator('#start')).toHaveCSS('cursor', 'grab');
                    await drag(page, '#start', '#three', { y: 0.8 });

                    await expect(page.locator('#list > li')).toHaveText(['Two', 'Three', 'One']);
                });
            }
        }
    });

    test.describe('helperClass option', () => {
        test('adds helper classes while sorting', async ({ page }) => {
            await page.evaluate((_) => {
                document.querySelector('#one').classList.add('existing');
                UI.Sortable.init(document.querySelector('#list'), {
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
                document.querySelector('#list').classList.add('list-group-horizontal');
                UI.Sortable.init(document.querySelector('#list'), { axis: 'x' });
            });

            await drag(page, '#one', '#three', { x: 0.8 });

            await expect(page.locator('#list > li')).toHaveText(['Two', 'Three', 'One']);
        });
    });

    test.describe('swapThreshold option', () => {
        for (const { name, threshold, before, after } of [
            { name: 'default', threshold: undefined, before: 0.2, after: 0.3 },
            { name: 'custom', threshold: 0.75, before: 0.5, after: 0.8 },
        ]) {
            for (const reverse of [false, true]) {
                test(`uses the ${name} threshold moving ${reverse ? 'backward' : 'forward'}`, async ({ page }) => {
                    await page.evaluate(({ threshold, reverse }) => {
                        if (reverse) {
                            document.querySelector('#one').before(document.querySelector('#two'));
                        }

                        UI.Sortable.init(
                            document.querySelector('#list'),
                            threshold === undefined ? {} : { swapThreshold: threshold },
                        );
                    }, { threshold, reverse });

                    const oneBox = await page.locator('#one').boundingBox();
                    const twoBox = await page.locator('#two').boundingBox();
                    if (!oneBox || !twoBox) {
                        throw new Error('Could not measure threshold drag elements.');
                    }

                    const x = oneBox.x + oneBox.width / 2;
                    const y = oneBox.y + oneBox.height / 2;
                    await page.mouse.move(x, y);
                    await page.mouse.down();
                    await page.mouse.move(x, y + (reverse ? -1 : 1));
                    await page.mouse.move(x, twoBox.y + twoBox.height * (reverse ? 1 - before : before));

                    await expect(page.locator('#list > li')).toHaveText(
                        reverse ? ['Two', 'One', 'Three'] : ['One', 'Two', 'Three'],
                    );

                    await page.mouse.move(x, twoBox.y + twoBox.height * (reverse ? 1 - after : after));

                    await expect(page.locator('#list > li')).toHaveText(
                        reverse ? ['One', 'Two', 'Three'] : ['Two', 'One', 'Three'],
                    );
                    await page.mouse.up();
                });
            }
        }
    });

    test.describe('events', () => {
        test('triggers sorting lifecycle events in order', async ({ page }) => {
            await page.evaluate((_) => {
                window.sortableEvents = [];
                const list = document.querySelector('#list');

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
                const list = document.querySelector('#list');
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
});
