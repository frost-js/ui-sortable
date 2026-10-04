import { expect, test } from '#test';
import { drag } from '../support/input/drag.js';

test.describe('Sortable connected containers', () => {
    test.beforeEach(async ({ page }) => {
        await page.evaluate(() => {
            $.setHtml(document.body,
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

    test.describe('transfers', () => {
        test('moves items between connected containers and applies the receiving cursor', async ({ page }) => {
            await page.evaluate(() => {
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
    });

    test.describe('events', () => {
        test('triggers transfer events in order', async ({ page }) => {
            await page.evaluate(() => {
                window.transferEvents = [];
                $('.connected').addEvent(
                    'sort.ui.sortable send.ui.sortable receive.ui.sortable ' +
                    'sorted.ui.sortable update.ui.sortable',
                    (event) => {
                        window.transferEvents.push({
                            currentTarget: $.getProperty(event.currentTarget, 'id'),
                            from: $.getProperty(event.from, 'id'),
                            item: $.getProperty(event.item, 'id'),
                            newIndex: event.newIndex,
                            oldIndex: event.oldIndex,
                            to: $.getProperty(event.to, 'id'),
                            type: event.type,
                        });
                    },
                );
                $('.connected').sortable({ connectWith: '.connected' });
            });

            await drag(page, '#one', '#destination', { y: 0.95 });

            expect(await page.evaluate(() => window.transferEvents)).toEqual([
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
    });

    test.describe('destination options', () => {
        for (const { name, empty, options, expectedSource, expectedDestination } of [
            {
                name: 'empty destination',
                empty: true,
                options: {},
                expectedSource: ['two'],
                expectedDestination: ['One'],
            },
            {
                name: 'empty drops disabled',
                empty: true,
                options: { dropOnEmpty: false },
                expectedSource: ['one', 'two'],
                expectedDestination: [],
            },
            {
                name: 'populated destination with empty drops disabled',
                empty: false,
                options: { dropOnEmpty: false },
                expectedSource: ['two'],
                expectedDestination: ['Three', 'One'],
            },
            {
                name: 'disabled empty destination',
                empty: true,
                options: { disabled: true },
                expectedSource: ['one', 'two'],
                expectedDestination: [],
            },
            {
                name: 'disabled populated destination',
                empty: false,
                options: { disabled: true },
                expectedSource: ['one', 'two'],
                expectedDestination: ['Three'],
            },
        ]) {
            test(`respects destination options (${name})`, async ({ page }) => {
                await page.evaluate(({ empty, options }) => {
                    if (empty) {
                        $.empty('#destination');
                    }

                    UI.Sortable.init($.findOne('#source'), { connectWith: '.connected' });
                    UI.Sortable.init($.findOne('#destination'), {
                        connectWith: '.connected',
                        ...options,
                    });
                }, { empty, options });

                await drag(page, '#one', '#destination', { y: 0.95 });

                // A rejected transfer may still reorder items within the source.
                expect(await page.locator('#source > li').evaluateAll((nodes) =>
                    nodes.map((node) => $.getProperty(node, 'id')).sort(),
                )).toEqual(expectedSource);
                await expect(page.locator('#destination > li')).toHaveText(expectedDestination);
            });
        }
    });

    test.describe('cursor handoff', () => {
        for (const { name, sourceHandle, destinationHandle } of [
            { name: 'handle to item', sourceHandle: '.handle', destinationHandle: null },
            { name: 'item to handle', sourceHandle: null, destinationHandle: '.grip' },
            { name: 'different handles', sourceHandle: '.handle', destinationHandle: '.grip' },
            { name: 'same handle', sourceHandle: '.handle', destinationHandle: '.handle' },
        ]) {
            test(`restores cursor declarations and releases transferred locks (${name})`, async ({ page }) => {
                const original = [
                    { value: 'crosshair', priority: 'important' },
                    { value: 'help', priority: 'important' },
                    { value: 'move', priority: '' },
                ];
                await page.evaluate(({ sourceHandle, destinationHandle, original }) => {
                    const one = $.findOne('#one');
                    $.setHtml(one, '<span class="handle">One</span><span class="grip float-end">Grip</span>');
                    const nodes = [one, ...$.children(one)];
                    nodes.forEach((node, index) => {
                        $.setStyle(node, 'cursor', original[index].value, {
                            important: original[index].priority === 'important',
                        });
                    });

                    UI.Sortable.init($.findOne('#source'), {
                        connectWith: '.connected',
                        cursor: 'grab',
                        handle: sourceHandle,
                    });
                    UI.Sortable.init($.findOne('#destination'), {
                        connectWith: '.connected',
                        cursor: 'copy',
                        handle: destinationHandle,
                    });

                    $.addEvent('#source', 'send.ui.sortable', () => {
                        window.sentCursors = nodes.map((node) => ({
                            value: $.getStyle(node, 'cursor'),
                            priority: node.style.getPropertyPriority('cursor'),
                        }));
                    });
                }, { sourceHandle, destinationHandle, original });

                const sourceTarget = sourceHandle ? '#one ' + sourceHandle : '#one';
                const destinationTarget = page.locator(destinationHandle ? '#one ' + destinationHandle : '#one');
                await drag(page, sourceTarget, '#destination', { y: 0.95 });

                await expect(page.locator('#destination > #one')).toHaveCount(1);
                expect(await page.evaluate(() => window.sentCursors)).toEqual(original);
                await expect(destinationTarget).toHaveCSS('cursor', 'copy');

                await page.evaluate(() => {
                    $.getData('#source', 'sortable').dispose();
                    $.getData('#destination', 'sortable').dispose();
                });

                expect(await page.locator('#one').evaluate((one) =>
                    [one, ...$.children(one)].map((node) => ({
                        value: $.getStyle(node, 'cursor'),
                        priority: node.style.getPropertyPriority('cursor'),
                    })),
                )).toEqual(original);

                await page.locator('#one').evaluate((one) => {
                    for (const node of [one, ...$.children(one)]) {
                        const release = $.setStyleLock(node, 'cursor', 'wait');
                        release();
                    }
                });
                await page.evaluate((handle) => {
                    UI.Sortable.init($.findOne('#destination'), { handle, cursor: 'grab' });
                }, destinationHandle);

                await expect(destinationTarget).toHaveCSS('cursor', 'grab');
                await page.evaluate(() => $.getData('#destination', 'sortable').dispose());

                expect(await page.locator('#one').evaluate((one) =>
                    [one, ...$.children(one)].map((node) => ({
                        value: $.getStyle(node, 'cursor'),
                        priority: node.style.getPropertyPriority('cursor'),
                    })),
                )).toEqual(original);
            });
        }
    });
});
