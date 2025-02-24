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
import path from "path";

async function getEvaluationIsos(page, name, filterRegExp, url) {
    console.log("scraping", name, "from", url);

    await page.goto(url);

    return await page.evaluate(async (name, filterRegExp) => {
        var data = [];
        const els = document.querySelectorAll("a[aria-label*=' ISO '][aria-label*='(en-US)'][aria-label*=' 64-bit '],a[aria-label*=' ISO '][aria-label*='(en-US)'][aria-label*=' AMD64 ']")
        for (const el of els) {
            const ariaLabel = el.getAttribute("aria-label");
            if (filterRegExp && !label.match(filterRegExp)) {
                continue;
            }
            const label = ariaLabel
                .toLowerCase()
                .replace(/\s*(edition|preview|download|server|iso|ltsc|enterprise|64-bit|amd64|\(en-US\))\s*/ig, " ")
                .replace(/[^a-z0-9]+/ig, " ")
                .trim()
                .replace(/ +/ig, "-");
            const url = el.getAttribute("href");
            data.push({
                name: /windows/i.test(label) ? label : name,
                url: url,
            });
        }
        return data;
    }, name, filterRegExp);
}

async function main(name) {
    console.log("launching");
    const browser = await puppeteer.launch({
        headless: true,
        dumpio: false,
        headless: "new",
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

        var targets = {
            "windows-11":       [null,  "https://www.microsoft.com/en-us/evalcenter/download-windows-11-enterprise"],
            "windows-11-iot":   [null,  "https://www.microsoft.com/en-us/evalcenter/download-windows-11-iot-enterprise-ltsc-eval"],
            "windows-2022":     [null,  "https://www.microsoft.com/en-us/evalcenter/download-windows-server-2022"],
            "windows-2025":     [null,  "https://www.microsoft.com/en-us/evalcenter/download-windows-server-2025"],
        };
        const target = targets[name];
        if (!target) {
            throw `unknown target ${name}`;
        }
        const data = {};
        const isos = await getEvaluationIsos(page, name, ...target);
        for (const iso of isos) {
            const response = await fetch(iso.url, {method: 'HEAD'});
            data[iso.name] = response.url;
        }

        const scrapePath = `data/${name}-scrape.json`;
        console.log(`saving to ${scrapePath}`);
        fs.mkdirSync(path.dirname(scrapePath), {recursive: true});
        fs.writeFileSync(scrapePath, JSON.stringify(data, null, 4));
    } finally {
        await browser.close();
    }
}

await main(...process.argv.slice(2));
