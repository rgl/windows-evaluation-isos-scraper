"use strict";

// install dependencies:
//
//      npm install
//
// execute:
//
// NB to troubleshoot uncomment $env:DEBUG and set {headless:false,dumpio:true} in main.js.
//
//      $env:DEBUG = 'puppeteer:*'
//      node main.js

import puppeteer from "puppeteer";
import fs from "fs";
import fetch from "node-fetch";

async function getEvaluationIsos(page, url, filterRegExp) {
    console.log("scraping", url);

    await page.goto(url);

    return await page.evaluate(async (filterRegExp) => {
        var data = [];
        const els = document.querySelectorAll("a[aria-label*=' ISO '][aria-label*=' 64-bit '][aria-label*='(en-US)']")
        for (const el of els) {
            const label = el.getAttribute("aria-label");
            if (filterRegExp && !label.match(filterRegExp)) {
                continue;
            }
            const name = label
                .toLowerCase()
                .replace(/\s*(download|server|iso|ltsc|enterprise|64-bit|\(en-US\))\s*/ig, " ")
                .replace(/[^a-z0-9]+/ig, " ")
                .trim()
                .replace(" ", "-");
            const url = el.getAttribute("href");
            data.push({
                name: name,
                url: url,
            });
        }
        return data;
    }, filterRegExp);
}

async function main() {
    console.log("launching");
    const browser = await puppeteer.launch({
        headless: true,
        dumpio: false,
    });
    try {
        console.log("getting the browser version");
        console.log("running under", await browser.version());

        console.log("creating a new browser page");
        const page = await browser.newPage();

        console.log("lowering the needed bandwidth to scrape the site");
        await page.setRequestInterception(true);
        page.on(
            "request",
            request => {
                if (request.resourceType() === "document") {
                    //console.log("downloading", request.url());
                    request.continue();
                } else {
                    request.abort();
                }
            }
        );

        const data = {};
        var targets = [
            ["windows-10",   /ltsc/i, "https://www.microsoft.com/en-us/evalcenter/download-windows-10-enterprise"],
            ["windows-11",   null,   "https://www.microsoft.com/en-us/evalcenter/download-windows-11-enterprise"],
            ["windows-2016", null,   "https://www.microsoft.com/en-us/evalcenter/download-windows-server-2016"],
            ["windows-2019", null,   "https://www.microsoft.com/en-us/evalcenter/download-windows-server-2019"],
            ["windows-2022", null,   "https://www.microsoft.com/en-us/evalcenter/download-windows-server-2022"],
        ];
        for (const [name, filterRegExp, url] of targets) {
            const isos = await getEvaluationIsos(page, url, filterRegExp);
            for (const iso of isos) {
                const response = await fetch(iso.url, {method: 'HEAD'});
                data[iso.name] = response.url;
            }
        }

        console.log("saving to scrape.json");
        fs.writeFileSync("scrape.json", JSON.stringify(data, null, 4));
    } finally {
        await browser.close();
    }
}

main();