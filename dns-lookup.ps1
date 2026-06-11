<#
.SYNOPSIS
    Good DNS lookup tool for debugging custom domain / CNAME conflicts (especially HostGator + Vercel).

.DESCRIPTION
    Queries multiple record types from multiple DNS servers (public + your HostGator nameservers).
    Clearly highlights when A + CNAME exist at the same label (the classic "CNAME and other data" cause).
    Use this while editing your zone in cPanel.

.EXAMPLE
    pwsh .\dns-lookup.ps1
    pwsh .\dns-lookup.ps1 -Domain "memetorrent.futuret3ch.com.au"
    pwsh .\dns-lookup.ps1 -Domain "memetorrent.futuret3ch.com.au" -Servers "8.8.8.8","1.1.1.1"
#>

param(
    [string]$Domain = "memetorrent.futuret3ch.com.au",

    # Public resolvers + HostGator nameservers (these often disagree during migration)
    [string[]]$Servers = @(
        "8.8.8.8",           # Google
        "1.1.1.1",           # Cloudflare
        "hgns1.hostgator.com",
        "hgns2.hostgator.com"
    )
)

$RecordTypes = @("A", "CNAME", "TXT", "MX", "NS", "SOA")

function Get-RecordData {
    param($Record)
    switch ($Record.Type) {
        "A"      { $Record.IPAddress }
        "CNAME"  { $Record.NameHost }
        "TXT"    { ($Record.Strings -join " ") }
        "MX"     { "$($Record.Preference) $($Record.NameExchange)" }
        "NS"     { $Record.NameHost }
        "SOA"    { $Record.PrimaryServer }
        default  { $Record | Out-String }
    }
}

Write-Host ""
Write-Host "==============================================================" -ForegroundColor DarkCyan
Write-Host " DNS LOOKUP TOOL  |  $Domain" -ForegroundColor Cyan
Write-Host "==============================================================" -ForegroundColor DarkCyan
Write-Host "Querying servers: $($Servers -join ', ')" -ForegroundColor Gray
Write-Host ""

$allResults = @{}

foreach ($server in $Servers) {
    Write-Host "`n--- $server ---" -ForegroundColor Yellow

    foreach ($type in $RecordTypes) {
        try {
            $records = Resolve-DnsName -Name $Domain -Type $type -Server $server -ErrorAction Stop

            $records | ForEach-Object {
                $data = Get-RecordData -Record $_
                Write-Host ("  {0,-8} {1}" -f $type, $data) -ForegroundColor White

                # Collect for conflict detection
                if (-not $allResults.ContainsKey($server)) { $allResults[$server] = @{} }
                if (-not $allResults[$server].ContainsKey($type)) { $allResults[$server][$type] = @() }
                $allResults[$server][$type] += $data
            }
        }
        catch {
            # Silent for missing records (normal)
        }
    }
}

# Conflict detection - the exact problem you're hitting
Write-Host ""
Write-Host "==============================================================" -ForegroundColor DarkCyan
Write-Host " CONFLICT ANALYSIS (cause of 'CNAME and other data' errors)" -ForegroundColor Cyan
Write-Host "==============================================================" -ForegroundColor DarkCyan

$hasConflict = $false

foreach ($server in $Servers) {
    $hasA     = $allResults[$server] -and $allResults[$server].ContainsKey("A")
    $hasCNAME = $allResults[$server] -and $allResults[$server].ContainsKey("CNAME")

    if ($hasA -and $hasCNAME) {
        Write-Host "[$server]  CONFLICT: Both A record and CNAME exist at this name" -ForegroundColor Red
        Write-Host "           A     : $($allResults[$server]['A'] -join ', ')" -ForegroundColor Red
        Write-Host "           CNAME : $($allResults[$server]['CNAME'] -join ', ')" -ForegroundColor Red
        $hasConflict = $true
    }
}

if (-not $hasConflict) {
    Write-Host "No A + CNAME conflict detected on the queried servers." -ForegroundColor Green
    Write-Host "If cPanel still says the zone is invalid, the conflicting record (usually A or TXT)" -ForegroundColor Green
    Write-Host "is still present in the zone file you are editing, even if some public resolvers don't see it yet." -ForegroundColor Green
}

Write-Host ""
Write-Host "TIPS:" -ForegroundColor DarkGray
Write-Host "  - In cPanel Zone Editor, DELETE any A or TXT line where the host is exactly 'memetorrent' before adding the CNAME." -ForegroundColor DarkGray
Write-Host "  - Also try removing the subdomain via cPanel > Subdomains (this often clears stubborn A records)." -ForegroundColor DarkGray
Write-Host "  - After changes, wait for TTL (old A records were 4h). Use this script to watch propagation." -ForegroundColor DarkGray
Write-Host "  - Vercel wants the CNAME to point to their target (e.g. xxxxx.vercel-dns-017.com.)" -ForegroundColor DarkGray
Write-Host ""

# Bonus: Show what Vercel is probably expecting you to use
Write-Host "Quick Vercel-style target (from previous lookup):" -ForegroundColor DarkGray
Write-Host "  58e4e33d4e9780e2.vercel-dns-017.com." -ForegroundColor Magenta
Write-Host ""
