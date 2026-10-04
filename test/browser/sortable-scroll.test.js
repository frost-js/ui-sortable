import { expect, test } from '#test';

test.describe('Sortable scrolling', () => {
    test.beforeEach(async ({ page }) => {
        await page.clock.install({ time: 0 });
        await page.clock.pauseAt(60000);

        await page.evaluate(() => {
            $.setStyle(document.body, 'width', '1600px');
            $.setStyle(document.body, 'height', '2600px');
            const list = $.create('ul');
            $.setProperty(list, 'id', 'list');
            $.setAttribute(list, 'class', 'list-group');
            $.setStyle(list, 'width', '240px');

            for (let index = 0; index < 40; index++) {
                const item = $.create('li');
                $.setProperty(item, 'id', 'item-' + index);
                $.setAttribute(item, 'class', 'list-group-item');
                $.setStyle(item, 'height', '50px');
                $.setText(item, 'Item ' + index);
                $.append(list, item);
            }

            $.append(document.body, list);
        });
    });

    for (const behavior of ['', 'smooth']) {
        test(`scrolls instantly without changing ${behavior || 'unset'} scroll-behavior`, async ({ page }) => {
            await page.evaluate((behavior) => {
                $.setStyle(document.documentElement, 'scrollBehavior', behavior);
                UI.Sortable.init($.findOne('#list'), {
                    scrollSensitivity: 60,
                    scrollSpeed: 30,
                });
            }, behavior);

            await page.mouse.move(120, 25);
            await page.mouse.down();
            await page.mouse.move(790, 590, { steps: 8 });
            await page.clock.runFor(32);

            const position = await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }));
            expect(position.x).toBeGreaterThan(0);
            expect(position.y).toBeGreaterThan(0);
            expect(position.x % 30).toBe(0);
            expect(position.y % 30).toBe(0);
            expect(await page.evaluate(() => $.getStyle(document.documentElement, 'scrollBehavior'))).toBe(behavior);

            await page.mouse.up();
            await page.clock.runFor(100);

            expect(await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }))).toEqual(position);
            expect(await page.evaluate(() => $.getStyle(document.documentElement, 'scrollBehavior'))).toBe(behavior);
        });
    }

    test('does not scroll when disabled', async ({ page }) => {
        await page.evaluate(() => {
            UI.Sortable.init($.findOne('#list'), { scroll: false });
        });

        await page.mouse.move(120, 25);
        await page.mouse.down();
        await page.mouse.move(400, 590, { steps: 8 });
        await page.clock.runFor(320);

        expect(await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }))).toEqual({ x: 0, y: 0 });
        await page.mouse.up();
    });

    test('updates placement and events while the pointer stays at the edge', async ({ page }) => {
        await page.evaluate(() => {
            window.sortableEvents = [];
            $.addEvent('#list', 'sorting.ui.sortable sorted.ui.sortable update.ui.sortable', (event) => {
                window.sortableEvents.push({
                    type: event.type,
                    item: $.getProperty(event.item, 'id'),
                    from: $.getProperty(event.from, 'id'),
                    to: $.getProperty(event.to, 'id'),
                    oldIndex: event.oldIndex,
                    newIndex: event.newIndex,
                });
            });
            UI.Sortable.init($.findOne('#list'), {
                scrollSensitivity: 60,
                scrollSpeed: 30,
            });
        });

        await page.mouse.move(120, 25);
        await page.mouse.down();
        await page.mouse.move(120, 590, { steps: 8 });

        const initial = await page.evaluate(() => ({
            index: $.children('#list').indexOf($.findOne('#item-0')),
            events: window.sortableEvents.length,
        }));

        await page.clock.runFor(320);

        const scrolled = await page.evaluate(() => ({
            index: $.children('#list').indexOf($.findOne('#item-0')),
            events: window.sortableEvents,
            y: window.scrollY,
        }));
        expect(scrolled.y).toBeGreaterThan(0);
        expect(scrolled.index).toBeGreaterThan(initial.index);
        expect(scrolled.events.length).toBeGreaterThan(initial.events);
        expect(scrolled.events.at(-1)).toMatchObject({
            type: 'sorting',
            item: 'item-0',
            from: 'list',
            to: 'list',
            newIndex: scrolled.index,
        });

        await page.mouse.up();

        expect(await page.evaluate(() => window.sortableEvents.slice(-2))).toEqual([
            {
                type: 'sorted',
                item: 'item-0',
                from: 'list',
                to: 'list',
                oldIndex: 0,
                newIndex: scrolled.index,
            },
            {
                type: 'update',
                item: 'item-0',
                from: 'list',
                to: 'list',
                oldIndex: 0,
                newIndex: scrolled.index,
            },
        ]);
        await expect(page.locator('#list')).not.toHaveAttribute('data-ui-dragging');
        await expect(page.locator('#item-0')).not.toHaveClass(/bg-body-tertiary/);

        await page.clock.runFor(100);

        expect(await page.evaluate(() => window.scrollY)).toBe(scrolled.y);
        expect(await page.locator('#list').evaluate((list) =>
            $.children(list).indexOf($.findOne('#item-0')),
        )).toBe(scrolled.index);
    });

    test('stops scrolling and clears drag state when disposed during a drag', async ({ page }) => {
        const errors = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await page.evaluate(() => {
            UI.Sortable.init($.findOne('#list'), {
                scrollSensitivity: 60,
                scrollSpeed: 30,
                cursor: 'grab',
            });
        });

        await page.mouse.move(120, 25);
        await page.mouse.down();
        await page.mouse.move(120, 590, { steps: 8 });
        await page.clock.runFor(64);

        const position = await page.evaluate(() => {
            $.getData('#list', 'sortable').dispose();
            return window.scrollY;
        });
        expect(position).toBeGreaterThan(0);

        await page.clock.runFor(160);

        expect(await page.evaluate(() => window.scrollY)).toBe(position);
        await expect(page.locator('#list')).not.toHaveAttribute('data-ui-dragging');
        await expect(page.locator('#item-0')).not.toHaveClass(/bg-body-tertiary/);
        expect(await page.locator('#item-0').evaluate((node) => $.getStyle(node, 'cursor'))).toBe('');
        await page.mouse.up();
        expect(errors).toEqual([]);
    });
});
