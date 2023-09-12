import { launch } from 'puppeteer';
import * as fs from 'fs';
import sleep from 'sleep-promise';
import { lowerCase, toLower } from 'lodash';

const BASE_URL = 'https://ne' + 'xus' + 'hub.co/' + 'wow-classic/items/';
const urls: Map<number, any> = new Map();

// Used to hold the sql statements that are then created for updates to ACore database. 
const sqlInsert: string[] = [];
const sqlDelete: number[] = [];

// Used to parse currency string XXg YYx ZZc
function convertToCopper(text: string): number {
  // const parts = text.trim();

  const regex = /(\d*g)?\s*(\d*s)?\s*(\d*c)?/;
  const match = text.trim().match(regex);
  
  let gold, silver, copper, total; 
  if (match) {
    const [, gValue, sValue, cValue] = match;

    gold = (gValue) ? gValue.slice(0,-1) : 0;
    silver = (sValue) ? sValue.slice(0,-1) : 0;
    copper = (cValue) ? cValue.slice(0,-1) : 0;        
    total = (+gold * 10000) + (+silver * 100) + (+copper); 
  } else {
    console.log('failed to match: ', text);
    return 0;
  }
  
  console.log('ValueText:', text, 'Gold:', gold+ 'g Silver:', silver+ 's Copper:',copper+'c ConvertedValue:', total);
  return total;
}

/**
 * Scrapes a site that seems to have the best data for legacy WotLK data. 
 * This looks up nexus data. 
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
    let itemName = item.name.replace(/\s+/g, '-')
                            .replace(/\'/g, '');
    itemName = itemName.replace(/:/g,'');                             
    itemName = toLower(itemName);

    urls.set(item.entry, {
      url: `${BASE_URL}${itemName}`,
      itemName
    });
  }

  // create a new file; 
  try {
    fs.writeFileSync(file, '');
  } catch (err: any) {
    console.error(err.message);      
  }

  const page = await browser.newPage();
  for (const [entry, url] of urls) {

    let error = false;

    await page.goto(url.url, { timeout: 8000, waitUntil: 'domcontentloaded' })
      .catch( () => {
        console.log(`failed to load ${url.url} skipp...`); 
        error = true; 
      });

    // do a sleep to keep from killing the server or getting blocked by DDoS detection :) 
    if (error) {
      continue;   
    }
    // await sleep(100);

    await page.waitForSelector('.data-price', { timeout: 250})
      .catch(() => {
        error = true;
        console.log('Could not find the element with class: .data-price, likely a bad item: ', url.url);
      });

    // If we failed to find a selector that has the data we need to continue on to the next item. 
    if (error) {
      continue;
    }
    
    const dataPrice = await page.$$('.data-price');
    let usCost,total;


    if (dataPrice) {
      const row = dataPrice[2];   
      
      if(!row) {
        console.log('Missing US Price...');
        continue; 
      }

      usCost = await row.evaluate((element) => element.textContent); 

      if(usCost) {
        usCost = usCost.trim();
        total = convertToCopper(usCost); 
      }
    } else {
      console.error('Failed to find .data-price selector on item');
    }

    const deleteStmt = `DELETE FROM market_pricing WHERE entry = ${entry};`;
    let sql = 'INSERT INTO market_pricing (entry,cost,human_cost) VALUES ';
    sql += `('${entry}', '${total}', '${usCost}'); -- ${url.itemName}`;
        
    try {
      fs.appendFileSync(file, `${deleteStmt}\n${sql}\n`);            
    } catch (err: any) {
      console.error(err.message);      
    }

  }
  browser.close();
}