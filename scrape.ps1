param(
    [string]$name
)

Set-StrictMode -Version Latest
$ProgressPreference = 'SilentlyContinue'
$ErrorActionPreference = 'Stop'
trap {
    Write-Output "ERROR: $_"
    Write-Output (($_.ScriptStackTrace -split '\r?\n') -replace '^(.*)$','ERROR: $1')
    Write-Output (($_.Exception.ToString() -split '\r?\n') -replace '^(.*)$','ERROR EXCEPTION: $1')
    Exit 1
}

function Get-Iso($isoUrl, $isoPath) {
    Write-Host "Downloading $isoUrl to $isoPath"
    Start-BitsTransfer `
        -Source $isoUrl `
        -Destination $isoPath `
        -RetryInterval 60
}

function Get-IsoWindowsImages($isoPath) {
    $isoPath = Resolve-Path $isoPath
    Write-Host "Mounting $isoPath"
    $isoImage = Mount-DiskImage $isoPath -PassThru
    try {
        $isoVolume = $isoImage | Get-Volume
        $installPath = "$($isoVolume.DriveLetter):\sources\install.wim"
        Write-Host "Getting Windows images from $installPath"
        Get-WindowsImage -ImagePath $installPath `
            | ForEach-Object {
                $image = Get-WindowsImage `
                    -ImagePath $installPath `
                    -Index $_.ImageIndex
                $imageVersion = $image.Version
                # workaround the known windows 10 wim version mismatch, by copying it from the filename.
                # e.g. 19044.1288.211006-0501.21h2_release_svc_refresh_CLIENTENTERPRISEEVAL_OEMRET_x64FRE_en-us.iso
                #      ^^^^^^^^^^
                #      last two version numbers of the windows version.
                if ($imageVersion -like '10.0.*' -and $isoPath -match '[/\\](?<version>\d+\.\d+)[^/]+\.iso$') {
                    $isoVersion = "10.0.$($Matches.version)"
                    if ([version]$isoVersion -gt [version]$imageVersion) {
                        $imageVersion = $isoVersion
                    }
                }
                [PSCustomObject]@{
                    index = $image.ImageIndex
                    name = $image.ImageName
                    version = $imageVersion
                }
            }
    } finally {
        Write-Host "Dismounting $isoPath"
        Dismount-DiskImage $isoPath | Out-Null
    }
}

function Run([string]$name) {
    node scrape.js $name
    if ($LASTEXITCODE) {
        throw "failed to scrape image with exit code $LASTEXITCODE"
    }
    $scrapePath = "data/$name-scrape.json"
    $scrape = Get-Content -Raw $scrapePath | ConvertFrom-Json
    $data = $scrape.PSObject.Properties | ForEach-Object {
        $isoUrl = $_.Value
        $isoPath = Split-Path -Leaf (([uri]$isoUrl).AbsolutePath)
        if (!(Test-Path $isoPath)) {
            Get-Iso $isoUrl $isoPath
        }
        $images = Get-IsoWindowsImages $isoPath
        Write-Host "Getting the $isoPath checksum"
        $checksum = (Get-FileHash -Algorithm SHA256 -Path $isoPath).Hash.ToLowerInvariant()
        $size = (Get-Item $isoPath).Length
        # in CI we remove the iso file because there is limited disk space.
        # see https://docs.github.com/en/actions/using-github-hosted-runners/about-github-hosted-runners#supported-runners-and-hardware-resources
        # see https://docs.github.com/en/actions/learn-github-actions/environment-variables#default-environment-variables
        if ($env:CI) {
            Remove-Item $isoPath | Out-Null
        }
        [PSCustomObject]@{
            name = $_.Name
            url = $isoUrl
            checksum = $checksum
            size = $size
            images = $images
        }
    }
    if (!$data -or !$data.Count) {
        throw 'Could not find any valid data in scrape.json'
    }
    Set-Content `
        -Path "data/$name.json" `
        -Value ($data | ConvertTo-Json -Depth 100)
}

Run $name
