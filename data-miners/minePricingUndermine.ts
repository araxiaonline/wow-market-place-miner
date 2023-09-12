import { launch } from 'puppeteer';
import * as fs from 'fs';

const BASE_URL = 'https://under' + 'mine' + '.exchange/#us-' + 'area-52/';
const urls: Map<number, string> = new Map();

// Used to hold the sql statements that are then created for updates to ACore database. 
const sqlInsert: string[] = [];
const sqlDelete: number[] = [];

/**
 * Scrapes a site that seems to have the best data for legacy WotLK data. 
 * The data is not available from the source unfortunately any other way that I could find. :(
 * == This has to be run from a system with access to Chromium browser as that is what Puppeteer relies on!
 * 
 * @param itemList list of items to scan for. object must have entry and name;  
 * @param file - where to create the market sql statements; 
 * @returns Promise<string>
 */
export async function minePricing(items: any, file: string): Promise<void> {
  const browser = await launch({ headless: "new" });

  // build a list of deep links into the page we need to scrape for median price. 
  for (const item of items) {
    urls.set(item.entry, `${BASE_URL}${item.entry}`);
  }

  const page = await browser.newPage();
  for (const [entry, url] of urls) {  
    await page.goto(url, { timeout: 5000, waitUntil: 'domcontentloaded' })
      .catch(() => {
        error = true;
        console.log('Could not load page in allowed timoeout: ', url);
      });


    let error = false;

    await page.waitForSelector('.hidden-region-details', {timeout: 1500})
      .catch(() => {
        error = true;
        console.log('Could not find the element with class: .hidden-region-details, likely a bad item: ', url);
      });

    // If we failed to find a selector that has the data we need to continue on to the next item. 
    if (error) {
      continue;
    }
    
    const hiddenRegionDetails = await page.$('.hidden-region-details');

    if (hiddenRegionDetails) {
      const rows = await hiddenRegionDetails.$$('tr');

      // Process and use the extracted elements as needed
      for (const row of rows) {
        const tdElements = await row.$$('td');

        // Only select the row where we have a "Mean" label to get the Mean average type. 
        let isMean = false;
        for (const td of tdElements) {

          const tdText = await td.evaluate((element) => element.textContent);
          if (tdText === 'Mean') isMean = true;  // we have a Mean row, then we need to mark it so we can process the gold and silver elements. 

          if (isMean) {
            const goldSpan = await td.$('.gold');
            const silverSpan = await td.$('.silver');

            // Gold and Silver are not always guaranteed so we look for both elements and set empty to missing element
            if (goldSpan || silverSpan) {
              let goldText = goldSpan ? await goldSpan.evaluate((element) => element.textContent) : '';
              let silverText = silverSpan ? await silverSpan.evaluate((element) => element.textContent) : '';

              // Remove comma formatting to get to raw value of the cost. 
              if (goldText) {
                goldText = goldText?.replace(/,/g, "");
              }
              if (silverText) {
                silverText = silverText?.replace(/,/g, "");
              }

              // convert gold to copper since all prices in acore_world.item_template are in copper. 
              let total = 0;
              if (goldText) {
                total += +goldText * 10000;
              }
              if (silverText) {
                total += +silverText * 100;
              }

              console.log('Item:', entry, ' Gold: ', goldText, 'g Silver: ', silverText, 's =CopperValue: ', total, 'c');


              let sql = 'INSERT INTO market_pricing (entry,cost,human_cost) VALUES ';
              sql += `('${entry}', '${total}', '${(goldText) ? goldText : 0}g ${(silverText) ? silverText : 0}s');`;

              sqlInsert.push(sql);
              sqlDelete.push(entry);
// break;
            }
          }

        }
      }
    } else {
      console.log('Failed to find hidden details on page: ', url);
    }
  }
  // Write the delete statement then the insert statement directly after 
  const deleteStmt = `DELETE FROM market_pricing WHERE entry IN (${sqlDelete.join(',')};`;
  const insertStmt = sqlInsert.join("\n");

  try {
    fs.writeFileSync(file, `${deleteStmt}\n${insertStmt}`);
    browser.close();
    return;
  } catch (err: any) {
    console.error(err.message);
    return;
  }
}
