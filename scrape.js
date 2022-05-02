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

const puppeteer = require("puppeteer");
const fs = require("fs");

async function getEvaluationIsos(page, url) {
    console.log("scraping", url);

    await page.goto(url);

    return await page.evaluate(() => {
        var data = [];
        for (const el of document.querySelectorAll("input[routingForm]")) {
            const fileTypeName = el.getAttribute("filetypename");
            const routingForm = JSON.parse(el.getAttribute("routingForm"));
            const downloads = routingForm.downloadURLs;
            const download = downloads.find(d => (d.bits == "64" || d.bits == "") && d.lang == "EN-US");
            if (!download) {
                continue;
            }
            const name = fileTypeName
                .toLowerCase()
                .replace(/\s*(download|the|iso|enterprise)\s*/g, "")
                .replace(/[^a-z0-9]+/g, " ")
                .trim();
            const url = download.url;
            data.push({
                name: name,
                url: url,
            });
        }
        return data;
    });
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
            ["windows-10",   "https://www.microsoft.com/en-us/evalcenter/evaluate-windows-10-enterprise"],
            ["windows-11",   "https://www.microsoft.com/en-us/evalcenter/evaluate-windows-11-enterprise"],
            ["windows-2016", "https://www.microsoft.com/en-us/evalcenter/evaluate-windows-server-2016"],
            ["windows-2019", "https://www.microsoft.com/en-us/evalcenter/evaluate-windows-server-2019"],
            ["windows-2022", "https://www.microsoft.com/en-us/evalcenter/evaluate-windows-server-2022"],
        ];
        for (const [name, url] of targets) {
            const isos = await getEvaluationIsos(page, url);
            for (const iso of isos) {
                if (iso.name) {
                    data[`${name}-${iso.name}`] = iso.url;
                } else {
                    data[name] = iso.url;
                }
            }
        }

        console.log("saving to scrape.json");
        fs.writeFileSync("scrape.json", JSON.stringify(data, null, 4));
    } finally {
        await browser.close();
    }
}

main();