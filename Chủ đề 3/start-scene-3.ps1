$ErrorActionPreference = "Stop"

$sceneRoot = $PSScriptRoot
$projectRoot = Split-Path -Parent $sceneRoot
$port = 5173

while (Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue) {
    $port++
}

$url = "http://127.0.0.1:$port/Chủ%20đề%203/cd3_1.html"
Write-Host "Chủ đề 3 đang chạy tại:"
Write-Host $url
Write-Host ""
Write-Host "Giữ cửa sổ này mở trong khi xem. Nhấn Ctrl+C để dừng."

Start-Process $url
# Phục vụ từ gốc dự án để scene có thể tải các tài nguyên dùng chung, như GLB
# trong thư mục "Đồ 3D decord", mà không cần tạo bản sao lớn trong Chủ đề 3.
python -m http.server $port --bind 127.0.0.1 --directory $projectRoot
