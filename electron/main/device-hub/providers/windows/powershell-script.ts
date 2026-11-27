// Uzun ömürlü, hafif PowerShell yardımcı betiği.
// - Yönetici izni gerektirmez, yalnızca okuma yapar (Get-PnpDevice / Get-PnpDeviceProperty).
// - Kullanıcı girdisi betiğe ASLA eklenmez: betik sabittir, -EncodedCommand ile verilir.
// - stdin'den yalnızca "scan <n>", "battery <n>", "ping <n>" komutlarını kabul eder (regex ile).
// - Win32_DeviceChangeEvent aboneliği ile donanım değişikliğinde "change" satırı yazar.
// - stdin kapanınca (ana süreç kapanınca) kendiliğinden sonlanır.

export const DEVICE_HUB_PS_SCRIPT = String.raw`
$ErrorActionPreference = 'SilentlyContinue'
$ProgressPreference = 'SilentlyContinue'
$utf8 = New-Object System.Text.UTF8Encoding($false)
[Console]::OutputEncoding = $utf8
$out = [Console]::Out
function Send-Line($obj) {
  $json = ConvertTo-Json -InputObject $obj -Compress -Depth 6
  $out.WriteLine($json)
  $out.Flush()
}
$KeyContainer = 'DEVPKEY_Device_ContainerId'
$KeyBusDesc = 'DEVPKEY_Device_BusReportedDeviceDesc'
$KeyBtBattery = '{104EA319-6EE2-4701-BD47-8DDBF425BBE5} 2'
$KeyBtConnected = '{83DA6326-97A6-4088-9453-A1923F573B29} 15'
$Pattern = '^(USB|HID|BTHENUM|BTHLE|BTHLEDEVICE)\\|^SWD\\MMDEVAPI\\'
function Get-PropMap([string[]]$ids, [string[]]$keys) {
  $map = @{}
  if ($null -eq $ids -or $ids.Count -eq 0) { return $map }
  $props = Get-PnpDeviceProperty -InstanceId $ids -KeyName $keys -ErrorAction SilentlyContinue
  foreach ($p in $props) {
    if ($null -eq $p.Data) { continue }
    if (-not $map.ContainsKey($p.InstanceId)) { $map[$p.InstanceId] = @{} }
    $map[$p.InstanceId][$p.KeyName] = $p.Data
  }
  return $map
}
function Invoke-Scan {
  $devs = @(Get-PnpDevice -PresentOnly -ErrorAction SilentlyContinue | Where-Object { $_.InstanceId -match $Pattern })
  $ids = [string[]]@($devs | ForEach-Object { $_.InstanceId })
  $btIds = [string[]]@($ids | Where-Object { $_ -match '^BTH' })
  $pm = Get-PropMap $ids @($KeyContainer, $KeyBusDesc)
  $bm = Get-PropMap $btIds @($KeyBtConnected)
  $list = New-Object System.Collections.ArrayList
  foreach ($d in $devs) {
    $p = $pm[$d.InstanceId]
    $b = $bm[$d.InstanceId]
    $ct = $null; $bd = $null; $bc = $null
    if ($p) {
      if ($null -ne $p[$KeyContainer]) { $ct = $p[$KeyContainer].ToString() }
      if ($null -ne $p[$KeyBusDesc]) { $bd = [string]$p[$KeyBusDesc] }
    }
    if ($b -and $null -ne $b[$KeyBtConnected]) { $bc = [bool]$b[$KeyBtConnected] }
    [void]$list.Add([ordered]@{ i = [string]$d.InstanceId; n = [string]$d.FriendlyName; c = [string]$d.Class; m = [string]$d.Manufacturer; s = [string]$d.Status; ct = $ct; bd = $bd; bc = $bc })
  }
  return ,$list
}
function Invoke-Battery {
  $devs = @(Get-PnpDevice -PresentOnly -ErrorAction SilentlyContinue | Where-Object { $_.InstanceId -match '^(BTHENUM|BTHLE|BTHLEDEVICE)\\' })
  $ids = [string[]]@($devs | ForEach-Object { $_.InstanceId })
  $m = Get-PropMap $ids @($KeyBtBattery, $KeyBtConnected, $KeyContainer)
  $list = New-Object System.Collections.ArrayList
  foreach ($id in $ids) {
    $p = $m[$id]
    if (-not $p) { continue }
    $bb = $null; $bc = $null; $ct = $null
    if ($null -ne $p[$KeyBtBattery]) { $bb = [int]$p[$KeyBtBattery] }
    if ($null -ne $p[$KeyBtConnected]) { $bc = [bool]$p[$KeyBtConnected] }
    if ($null -ne $p[$KeyContainer]) { $ct = $p[$KeyContainer].ToString() }
    if ($null -eq $bb -and $null -eq $bc) { continue }
    [void]$list.Add([ordered]@{ i = [string]$id; ct = $ct; bb = $bb; bc = $bc })
  }
  return ,$list
}
$watch = $false
try {
  Register-CimIndicationEvent -ClassName Win32_DeviceChangeEvent -SourceIdentifier 'DeviceHubChange' -ErrorAction Stop | Out-Null
  $watch = $true
} catch { $watch = $false }
Send-Line ([ordered]@{ type = 'ready'; watcher = $watch; ps = $PSVersionTable.PSVersion.ToString() })
$stdin = New-Object System.IO.StreamReader([Console]::OpenStandardInput(), $utf8)
$task = $stdin.ReadLineAsync()
while ($true) {
  if ($watch) {
    $ev = Wait-Event -SourceIdentifier 'DeviceHubChange' -Timeout 1
    if ($ev) {
      Get-Event -SourceIdentifier 'DeviceHubChange' -ErrorAction SilentlyContinue | Remove-Event -ErrorAction SilentlyContinue
      Send-Line ([ordered]@{ type = 'change' })
    }
  } else {
    [void]$task.Wait(1000)
  }
  if ($task.IsCompleted) {
    $line = $null
    if (-not $task.IsFaulted) { $line = $task.Result }
    if ($null -eq $line) { break }
    $mt = [regex]::Match($line.Trim(), '^(scan|battery|ping) ([0-9]{1,9})$')
    if ($mt.Success) {
      $cmd = $mt.Groups[1].Value
      $id = [int]$mt.Groups[2].Value
      try {
        if ($cmd -eq 'scan') { $r = Invoke-Scan; Send-Line ([ordered]@{ type = 'scan'; id = $id; ok = $true; data = $r }) }
        elseif ($cmd -eq 'battery') { $r = Invoke-Battery; Send-Line ([ordered]@{ type = 'battery'; id = $id; ok = $true; data = $r }) }
        else { Send-Line ([ordered]@{ type = 'pong'; id = $id; ok = $true }) }
      } catch {
        Send-Line ([ordered]@{ type = $cmd; id = $id; ok = $false; error = [string]$_.Exception.Message })
      }
    }
    $task = $stdin.ReadLineAsync()
  }
}
Unregister-Event -SourceIdentifier 'DeviceHubChange' -ErrorAction SilentlyContinue
`;
