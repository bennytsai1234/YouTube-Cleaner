# 在 Tampermonkey 的安裝／更新確認頁按下確認按鈕。
# 確認頁是擴充功能頁面，Playwright 接不到（Page.navigate 回 Not allowed），所以改用 Windows UI Automation。
# 先印出頁面上的腳本名稱、版本與按鈕，確認是預期的腳本才按。
param(
    [string]$ScriptName = 'YouTube Cleaner',
    [int]$TimeoutSeconds = 15
)

Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes
$A = [System.Windows.Automation.AutomationElement]
$Scope = [System.Windows.Automation.TreeScope]
$walker = [System.Windows.Automation.TreeWalker]::RawViewWalker
$confirmNames = @('安裝', '更新', '重新安裝', 'Install', 'Update', 'Reinstall')

function Get-Texts($el, $depth, $list) {
    if ($depth -gt 25 -or $list.Count -gt 200) { return }
    $name = $el.Current.Name
    if ($name) { $list.Add($name.Trim()) }
    $child = $walker.GetFirstChild($el)
    while ($child) { Get-Texts $child ($depth + 1) $list; $child = $walker.GetNextSibling($child) }
}

function Find-ConfirmPage {
    $chromeCond = New-Object System.Windows.Automation.PropertyCondition($A::ClassNameProperty, 'Chrome_WidgetWin_1')
    $docCond = New-Object System.Windows.Automation.PropertyCondition($A::ControlTypeProperty, [System.Windows.Automation.ControlType]::Document)
    foreach ($win in $A::RootElement.FindAll($Scope::Children, $chromeCond)) {
        if ($win.Current.Name -notlike '*Google Chrome') { continue }
        # 第一次查詢會讓 Chrome 開啟網頁內容的無障礙樹，之前 Document 可能還不存在，由外層重試
        $doc = $win.FindFirst($Scope::Descendants, $docCond)
        if (-not $doc) { continue }
        $texts = New-Object System.Collections.Generic.List[string]
        Get-Texts $doc 0 $texts
        if (($texts -join "`n") -match 'Tampermonkey' -and ($texts -join "`n") -match [regex]::Escape($ScriptName)) {
            return @{ Window = $win; Doc = $doc; Texts = $texts }
        }
    }
    return $null
}

$deadline = (Get-Date).AddSeconds($TimeoutSeconds)
$page = $null
while (-not $page -and (Get-Date) -lt $deadline) {
    $page = Find-ConfirmPage
    if (-not $page) { Start-Sleep -Milliseconds 700 }
}
if (-not $page) {
    Write-Output "找不到 $ScriptName 的 Tampermonkey 確認頁（確認頁要是 Chrome 視窗目前的分頁）"
    exit 1
}

Write-Output '--- 確認頁內容 ---'
$page.Texts | Where-Object { $_ } | Select-Object -Unique | Select-Object -First 40 | ForEach-Object { Write-Output $_ }

$btnCond = New-Object System.Windows.Automation.PropertyCondition($A::ControlTypeProperty, [System.Windows.Automation.ControlType]::Button)
$button = $page.Doc.FindAll($Scope::Descendants, $btnCond) | Where-Object { $confirmNames -contains $_.Current.Name } | Select-Object -First 1
if (-not $button) {
    Write-Output '確認頁上沒有安裝／更新按鈕'
    exit 1
}

$label = $button.Current.Name
$button.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern).Invoke()
Start-Sleep -Seconds 2
if (Find-ConfirmPage) {
    Write-Output "已按「$label」，但確認頁還在"
    exit 1
}
Write-Output "已按「$label」，確認頁已關閉"
