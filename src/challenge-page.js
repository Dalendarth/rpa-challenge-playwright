const path = require('node:path');

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Page Object for rpachallenge.com.
 * All selectors live here, so if the website changes, only this file needs updates.
 */
class ChallengePage {
  constructor(page) {
    this.page = page;
    this.downloadLink = page.locator('a[href*="challenge.xlsx"]');
    this.startButton = page.getByRole('button', { name: 'Start' });
    this.submitButton = page.locator('input[type="submit"]');
    this.resultMessage = page.locator('.message2');
  }

  async open(url) {
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
    await this.startButton.waitFor({ state: 'visible' });
  }

  /** Downloads the Excel file from the site and returns the saved path */
  async downloadExcel(outputDir) {
    const [download] = await Promise.all([
      this.page.waitForEvent('download'),
      this.downloadLink.click(),
    ]);
    const filePath = path.join(outputDir, 'challenge.xlsx');
    await download.saveAs(filePath);
    return filePath;
  }

  async start() {
    await this.startButton.click();
  }

  /**
   * The challenge moves the fields to a different position every round,
   * so we never use fixed positions. Each input is found by its label text.
   * If that fails, we fall back to the Angular attribute.
   */
  async findInput(field) {
    const byLabel = this.page
      .locator('label')
      .filter({ hasText: new RegExp(`^\\s*${escapeRegex(field.label)}\\s*$`) })
      .locator('xpath=following-sibling::input[1]');
    if ((await byLabel.count()) === 1) return byLabel;

    const byAttribute = this.page.locator(`input[ng-reflect-name="${field.reflect}"]`);
    if ((await byAttribute.count()) === 1) return byAttribute;

    throw new Error(`Could not find input for field "${field.label}"`);
  }

  /** Fills one field and checks that the value was really written */
  async fillField(field, value) {
    const input = await this.findInput(field);
    await input.fill(value);
    const written = await input.inputValue();
    if (written !== value) {
      throw new Error(`Field "${field.label}" expected "${value}" but has "${written}"`);
    }
  }

  async submit() {
    await this.submitButton.click();
  }

  async getResultText() {
    await this.resultMessage.waitFor({ state: 'visible' });
    return (await this.resultMessage.textContent()) || '';
  }

  async screenshot(filePath) {
    await this.page.screenshot({ path: filePath, fullPage: true });
  }
}

module.exports = { ChallengePage };
