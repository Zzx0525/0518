let capture;
let camError = false; // 紀錄是否沒有鏡頭或權限被拒絕

function setup() {
  // 建立全螢幕畫布
  createCanvas(windowWidth, windowHeight);
  
  // 取得攝影機影像 (要求瀏覽器開啟攝影機權限)
  capture = createCapture(VIDEO);
  
  // 隱藏預設的 HTML <video> 元素，這樣影像就只會顯示在我們的畫布 (Canvas) 上
  capture.hide();
  
  // 檢查攝影機狀態，若偵測不到鏡頭或拒絕授權則標記錯誤
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ video: true }).catch(() => {
      camError = true;
    });
  } else {
    camError = true; // 環境不支援
  }

  // 將影像的繪製模式設定為中心點，這樣在定位時會更方便置中
  imageMode(CENTER);
}

function draw() {
  // 設定畫布背景為淺灰色 (數值範圍 0-255，220 為淺灰)
  background(220);
  
  // 計算顯示影像的寬高，設定為全螢幕畫面寬高的 60%
  let imgWidth = windowWidth * 0.6;
  let imgHeight = windowHeight * 0.6;
  
  // 為了防止未取得影像前報錯，確認攝影機已經準備好且有影像內容
  if (camError) {
    // 偵測不到鏡頭，呈現黑色區塊與文字
    rectMode(CENTER);
    fill(0); // 黑色
    rect(windowWidth / 2, windowHeight / 2, imgWidth, imgHeight);
    
    fill(255); // 白色文字
    textAlign(CENTER, CENTER);
    textSize(32);
    text("未偵測到鏡頭", windowWidth / 2, windowHeight / 2);
  } else if (capture.loadedmetadata) {
    // 將攝影機影像畫在視窗正中間
    image(capture, windowWidth / 2, windowHeight / 2, imgWidth, imgHeight);
  }
}

// 當瀏覽器視窗大小改變時，動態調整畫布大小以維持全螢幕
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
