# About

This scrapes the Windows Evaluation ISO addresses into a JSON data file.

## Scraped Windows Editions

* [Windows 11](https://www.microsoft.com/en-us/evalcenter/evaluate-windows-11-enterprise)
* [Windows 2022](https://www.microsoft.com/en-us/evalcenter/evaluate-windows-server-2022)

## Data Files

The code in this repository creates a `data/windows-*.json` file for each Windows Edition, for example, the `data/windows-2022.json` file will be alike:

```json
{
  "name": "windows-2022",
  "url": "https://software-static.download.prss.microsoft.com/sg/download/888969d5-f34g-4e03-ac9d-1f9786c66749/SERVER_EVAL_x64FRE_en-us.iso",
  "checksum": "3e4fa6d8507b554856fc9ca6079cc402df11a8b79344871669f0251535255325",
  "size": 5044094976,
  "createdAt": "2022-03-04T00:00:00+00:00",
  "images": [
    {
      "index": 1,
      "name": "Windows Server 2022 Standard Evaluation",
      "version": "10.0.20348.587"
    },
    {
      "index": 2,
      "name": "Windows Server 2022 Standard Evaluation (Desktop Experience)",
      "version": "10.0.20348.587"
    },
    {
      "index": 3,
      "name": "Windows Server 2022 Datacenter Evaluation",
      "version": "10.0.20348.587"
    },
    {
      "index": 4,
      "name": "Windows Server 2022 Datacenter Evaluation (Desktop Experience)",
      "version": "10.0.20348.587"
    }
  ]
}
```
