/** @import { Page } from '@playwright/test'; */
/**
 * Drags an item to a position within the destination element.
 * @param {Page} page The test page.
 * @param {string} sourceSelector The source item selector.
 * @param {string} destinationSelector The destination element selector.
 * @param {object} [options] The destination position options.
 * @param {number} [options.x=.5] The horizontal position as a fraction of the destination.
 * @param {number} [options.y=.5] The vertical position as a fraction of the destination.
 */
export async function drag(page, sourceSelector, destinationSelector, { x = 0.5, y = 0.5 } = {}) {
    const sourceBox = await page.locator(sourceSelector).boundingBox();
    const destinationBox = await page.locator(destinationSelector).boundingBox();

    if (!sourceBox || !destinationBox) {
        throw new Error('Could not measure drag elements.');
    }

    await page.mouse.move(
        sourceBox.x + sourceBox.width / 2,
        sourceBox.y + sourceBox.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
        destinationBox.x + destinationBox.width * x,
        destinationBox.y + destinationBox.height * y,
        { steps: 8 },
    );
    await page.mouse.up();
}
