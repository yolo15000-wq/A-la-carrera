$folders = @('f:\app contability\src\views', 'f:\app contability\src\context', 'f:\app contability\src\components')
$replacements = @(
    @('text-blue-600', 'text-brand-500'),
    @('text-blue-700', 'text-brand-600'),
    @('text-blue-500', 'text-brand-500'),
    @('text-blue-400', 'text-brand-400'),
    @('text-blue-300', 'text-brand-300'),
    @('bg-blue-600', 'bg-brand-500'),
    @('bg-blue-700', 'bg-brand-600'),
    @('bg-blue-50', 'bg-brand-50'),
    @('bg-blue-100', 'bg-brand-100'),
    @('hover:bg-blue-700', 'hover:bg-brand-600'),
    @('hover:bg-blue-600', 'hover:bg-brand-500'),
    @('hover:text-blue-600', 'hover:text-brand-500'),
    @('border-blue-600', 'border-brand-500'),
    @('border-blue-500', 'border-brand-500'),
    @('border-blue-300', 'border-brand-300'),
    @('border-blue-200', 'border-brand-200'),
    @('border-blue-100', 'border-brand-100'),
    @('shadow-blue-500', 'shadow-brand-500'),
    @('ring-blue-500', 'ring-brand-500'),
    @('focus:ring-blue-500', 'focus:ring-brand-500'),
    @('focus:ring-blue-600', 'focus:ring-brand-500'),
    @('dark:bg-blue-900', 'dark:bg-brand-950'),
    @('from-blue-600', 'from-brand-500'),
    @('to-blue-800', 'to-brand-700')
)

foreach ($folder in $folders) {
    Get-ChildItem $folder -Filter '*.tsx' -Recurse | ForEach-Object {
        $file = $_.FullName
        $content = Get-Content $file -Raw -Encoding UTF8
        foreach ($pair in $replacements) {
            $content = $content.Replace($pair[0], $pair[1])
        }
        Set-Content $file $content -Encoding UTF8
        Write-Host "OK: $($_.Name)"
    }
}
Write-Host "DONE"
