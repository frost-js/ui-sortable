/** @import { Page } from '@playwright/test'; */

/**
 * Drag one element to a position within another element.
 * @param {Page} page The Playwright page.
 * @param {string} sourceSelector The source selector.
 * @param {string} destinationSelector The destination selector.
 * @param {{x?: number, y?: number}} [position] The destination ratios.
 * @returns {Promise<void>} The promise.
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
    await page.waitForTimeout(32);
    await page.mouse.up();
    await page.waitForTimeout(32);
}
