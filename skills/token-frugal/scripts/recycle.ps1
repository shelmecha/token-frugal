# Moves one file or folder to the Windows Recycle Bin. Called by files-apply.js with arguments only.
param([Parameter(Mandatory)][string]$Path, [Parameter(Mandatory)][ValidateSet('file','dir')][string]$Kind)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName Microsoft.VisualBasic
if ($Kind -eq 'dir') {
  [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteDirectory($Path, 'OnlyErrorDialogs', 'SendToRecycleBin')
} else {
  [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile($Path, 'OnlyErrorDialogs', 'SendToRecycleBin')
}
