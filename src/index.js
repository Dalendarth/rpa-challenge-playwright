const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const config = require('./config');
const logger = require('./logger');
const { FIELDS } = require('./fields');
const { readRecords } = require('./excel');
const { withRetry } = require('./retry');
const { parseResultMessage } = require('./result-parser');
const { ChallengePage } = require('./challenge-page');

async function run() {
  logger.init(config.outputDir);
  const startedAt = Date.now();
  logger.info(`Starting RPA Challenge bot (headless: ${config.headless})`);

  const browser = await chromium.launch({
    headless: config.headless,
    slowMo: config.slowMo,
    executablePath: config.browserPath,
  });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  page.setDefaultTimeout(config.timeoutMs);
  const challenge = new ChallengePage(page);

  try {
    // 1. Open the website
    await withRetry(() => challenge.open(config.url), { retries: config.maxRetries, label: 'Open website' });
    logger.info(`Opened ${config.url}`);

    // 2. Get the Excel file (local file or download from the site)
    const excelPath = config.excelPath
      ? path.resolve(config.excelPath)
      : await withRetry(() => challenge.downloadExcel(config.outputDir), {
          retries: config.maxRetries,
          label: 'Download Excel',
        });
    logger.info(`Excel file: ${excelPath}`);

    // 3. Read and validate the data BEFORE touching the form (fail fast)
    const { records, errors } = await readRecords(excelPath);
    if (errors.length) {
      errors.forEach((e) => logger.error(`Row ${e.row}: ${e.problems.join('; ')}`));
      throw new Error(`${errors.length} invalid row(s) in Excel. Fix the data and run again.`);
    }
    logger.info(`Loaded ${records.length} valid records`);

    // 4. Start the challenge and fill one form per record
    await challenge.start();
    for (const [index, record] of records.entries()) {
      const label = `Record ${index + 1}/${records.length}`;
      await withRetry(
        async () => {
          for (const field of FIELDS) {
            await challenge.fillField(field, record[field.key]);
          }
        },
        { retries: config.maxRetries, label }
      );
      await challenge.submit();
      logger.info(`${label} submitted (${record.firstName} ${record.lastName})`);
    }

    // 5. Read the result and save evidence
    const result = parseResultMessage(await challenge.getResultText());
    await challenge.screenshot(path.join(config.outputDir, 'result.png'));
    logger.info(`Result: ${result.message}`);

    const report = {
      status: result.successRate === 100 ? 'success' : 'partial',
      recordsProcessed: records.length,
      ...result,
      totalRunTimeMs: Date.now() - startedAt,
      finishedAt: new Date().toISOString(),
    };
    fs.writeFileSync(path.join(config.outputDir, 'report.json'), JSON.stringify(report, null, 2));
    logger.info(`Report saved to output/report.json (total run time: ${report.totalRunTimeMs} ms)`);

    if (report.status !== 'success') process.exitCode = 1;
  } catch (err) {
    logger.error(err.message);
    await challenge.screenshot(path.join(config.outputDir, 'error.png')).catch(() => {});
    logger.error('Screenshot saved to output/error.png');
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

run();
