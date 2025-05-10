document.getElementById('video-upload').addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (!file) return;

    let uploadStartTime = Date.now();
    let loaded = 0;

    const progressBar = document.querySelector('.progress-bar');
    const speedElement = document.querySelector('.speed');
    const timeElement = document.querySelector('.time');
    const percentageElement = document.querySelector('.percentage');

    const formData = new FormData();
    formData.append('video', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/upload', true);

    xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
            const percentage = ((e.loaded / e.total) * 100).toFixed(1);
            const elapsed = (Date.now() - uploadStartTime) / 1000;
            const speed = (e.loaded / 1024 / 1024 / elapsed).toFixed(1); // MB/s
            const remaining = (e.total - e.loaded) / (e.loaded / elapsed);

            progressBar.style.width = `${percentage}%`;
            speedElement.textContent = `${speed} MB/s`;
            timeElement.textContent = `剩余时间: ${formatTime(remaining)}`;
            percentageElement.textContent = `${percentage}%`;
        }
    });

    xhr.onload = function() {
        if (xhr.status === 200) {
            const response = JSON.parse(xhr.responseText);
            const videoPlayer = document.getElementById('video-player');
            videoPlayer.innerHTML = `
                <video id="uploaded-video" class="video-js vjs-default-skin" controls preload="auto" width="100%" height="100%">
                    <source src="${response.video_url}" type="video/mp4">
                </video>
            `;
            videojs('uploaded-video');
        } else {
            const response = JSON.parse(xhr.responseText);
            alert('上传失败: ' + response.error);
        }
    };

    xhr.onerror = function() {
        alert('上传失败: 网络错误');
    };

    xhr.send(formData);
});

function formatTime(seconds) {
    if (isNaN(seconds) || !isFinite(seconds)) return '--';
    const minutes = Math.floor(seconds / 60);
    seconds = Math.floor(seconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

async function startPrediction() {
    const videoPath = document.querySelector('video source')?.src;
    if (!videoPath) return alert('请先上传视频');

    try {
        const response = await fetch('/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ video_path: videoPath })
        });
        const results = await response.json();

        const grid = document.getElementById('results-grid');
        grid.innerHTML = results.images.map((img, i) => `
            <div class="result-card">
                <img src="/static/images/${img}" alt="预测结果">
                <div class="meta">
                    <span class="timestamp">${results.timestamps[i]}</span>
                    <span class="type-tag">${results.types[i]}</span>
                </div>
            </div>
        `).join('');

    } catch (error) {
        alert('预测失败: ' + error.message);
    }
}

async function generateReport() {
    const btn = document.querySelector('.ins-btn.warning');
    const originalHTML = btn.innerHTML;

    // 获取上传视频的文件名
    const videoElement = document.querySelector('video source');
    if (!videoElement) {
        alert('请先上传视频');
        return;
    }
    const videoPath = videoElement.src;
    const filename = videoPath.substring(videoPath.lastIndexOf('/') + 1);

    try {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 生成中...';
        btn.disabled = true;
        const response = await fetch(`/generate-report?filename=${filename}`);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'analysis-report.pdf';
        a.click();
    } catch (error) {
        alert('生成报告失败: ' + error.message);
    } finally {
        btn.innerHTML = originalHTML;
        btn.disabled = false;
    }
}

function resetAll() {
    
    document.getElementById('video-upload').value = '';
    document.getElementById('video-player').innerHTML = '';
    document.getElementById('results-grid').innerHTML = '';
    // 重置上传状态
    const progressBar = document.querySelector('.progress-bar');
    const speedElement = document.querySelector('.speed');
    const timeElement = document.querySelector('.time');
    const percentageElement = document.querySelector('.percentage');        progressBar.style.width = '0%';
    speedElement.textContent = '0 MB/s';
    timeElement.textContent = '剩余时间: --';
    percentageElement.textContent = '0%';
}