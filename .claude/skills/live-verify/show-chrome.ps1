# 把 Playwright 連著的分頁所在的 Chrome 視窗拉到前景。
# 視窗被其他視窗蓋住時，Chrome 把頁面當成在背景，YouTube 只載入三、四張卡片。
Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class LiveVerifyWin {
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int cmd);
    [DllImport("user32.dll")] public static extern void keybd_event(byte vk, byte scan, uint flags, UIntPtr extra);
}
"@

$A = [System.Windows.Automation.AutomationElement]
$Scope = [System.Windows.Automation.TreeScope]
$chromeCond = New-Object System.Windows.Automation.PropertyCondition($A::ClassNameProperty, 'Chrome_WidgetWin_1')
$tabCond = New-Object System.Windows.Automation.PropertyCondition($A::ControlTypeProperty, [System.Windows.Automation.ControlType]::TabItem)

foreach ($win in $A::RootElement.FindAll($Scope::Children, $chromeCond)) {
    if ($win.Current.Name -notlike '*Google Chrome') { continue }
    # Playwright 連著的分頁會被放進名稱含 Playwright 的分頁群組
    $tab = $win.FindAll($Scope::Descendants, $tabCond) | Where-Object { $_.Current.Name -like '*Playwright*' } | Select-Object -First 1
    if (-not $tab) { continue }

    $tab.GetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern).Select()
    $handle = [IntPtr]$win.Current.NativeWindowHandle
    # Windows 只讓前景程序切換前景視窗，先送一次 Alt 解除限制
    [LiveVerifyWin]::keybd_event(0x12, 0, 0, [UIntPtr]::Zero)
    [LiveVerifyWin]::keybd_event(0x12, 0, 2, [UIntPtr]::Zero)
    [LiveVerifyWin]::ShowWindow($handle, 9) | Out-Null
    if ([LiveVerifyWin]::SetForegroundWindow($handle)) {
        Write-Output "已把 Chrome 拉到前景：$($tab.Current.Name)"
        exit 0
    }
    Write-Output '找到分頁，但 Windows 拒絕切換前景視窗'
    exit 1
}

Write-Output '找不到 Playwright 連著的 Chrome 分頁'
exit 1
