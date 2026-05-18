let capture;
let camError = false; // 紀錄是否沒有鏡頭或權限被拒絕
let handpose;
let predictions = [];
let playerGesture = "未偵測到手";
let computerGesture = "等待中";
let gameResult = "模型載入中...";
let gestures = ["石頭", "布", "剪刀"];
let lastPlayTime = 0;

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

  // 初始化 ml5.js Handpose 模型
  handpose = ml5.handpose(capture, () => {
    console.log("Handpose 模型載入成功！");
    gameResult = "請伸出手勢";
  });
  handpose.on("predict", results => { predictions = results; });

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
    
    // 繪製手部節點與遊戲邏輯
    drawKeypoints(imgWidth, imgHeight);
    playGame();
    drawGameUI();
  }
}

// 當瀏覽器視窗大小改變時，動態調整畫布大小以維持全螢幕
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function drawKeypoints(imgWidth, imgHeight) {
  // 處理縮放與位移，讓骨架座標可以準確貼合在置中且縮放過 60% 的畫面上
  let startX = windowWidth / 2 - imgWidth / 2;
  let startY = windowHeight / 2 - imgHeight / 2;
  let scaleX = imgWidth / capture.width;
  let scaleY = imgHeight / capture.height;

  for (let i = 0; i < predictions.length; i++) {
    let prediction = predictions[i];
    playerGesture = detectGesture(prediction);

    for (let j = 0; j < prediction.landmarks.length; j++) {
      let keypoint = prediction.landmarks[j];
      fill(0, 255, 0);
      noStroke();
      // keypoint[0] 是 x 座標，keypoint[1] 是 y 座標
      ellipse(startX + keypoint[0] * scaleX, startY + keypoint[1] * scaleY, 10, 10);
    }
  }
  
  if (predictions.length === 0) {
    playerGesture = "未偵測到手";
  }
}

function detectGesture(prediction) {
  // 簡單判斷手勢：檢查四指是否伸直
  // [8]食指指尖, [12]中指指尖, [16]無名指指尖, [20]小指指尖
  let tips = [8, 12, 16, 20]; 
  // 對應的第二關節
  let pips = [6, 10, 14, 18]; 
  let extendedFingers = 0;

  for (let i = 0; i < 4; i++) {
    // p5.js 中 Y 軸越往下數值越大，所以指尖 Y 小於關節 Y 代表手指是往上伸直的
    if (prediction.landmarks[tips[i]][1] < prediction.landmarks[pips[i]][1]) {
      extendedFingers++;
    }
  }

  if (extendedFingers === 0) return "石頭";
  if (extendedFingers === 2) return "剪刀"; // 通常是食指和中指伸直
  if (extendedFingers >= 3) return "布";    // 3 根或 4 根都當作布
  return "未知";
}

function playGame() {
  // 每 3 秒結算一次電腦猜拳結果
  if (millis() - lastPlayTime > 3000) {
    if (playerGesture === "石頭" || playerGesture === "剪刀" || playerGesture === "布") {
      computerGesture = random(gestures);
      
      if (playerGesture === computerGesture) {
        gameResult = "平手！";
      } else if (
        (playerGesture === "石頭" && computerGesture === "剪刀") ||
        (playerGesture === "剪刀" && computerGesture === "布") ||
        (playerGesture === "布" && computerGesture === "石頭")
      ) {
        gameResult = "你贏了！🎉";
      } else {
        gameResult = "電腦贏了！💀";
      }
    } else {
      gameResult = "請對著鏡頭比出手勢";
    }
    lastPlayTime = millis();
  }
}

function drawGameUI() {
  // 繪製半透明的資訊面板
  rectMode(CORNER);
  fill(0, 150);
  rect(20, 20, 300, 180, 10);
  
  // 繪製文字狀態
  fill(255);
  textAlign(LEFT, TOP);
  textSize(24);
  text(`你的手勢: ${playerGesture}`, 40, 40);
  text(`電腦手勢: ${computerGesture}`, 40, 80);
  
  textSize(32);
  fill(255, 255, 0);
  text(`結果: ${gameResult}`, 40, 130);
  
  // 畫面中央顯示 3 秒倒數計時
  let countdown = Math.ceil(3 - (millis() - lastPlayTime) / 1000);
  if (countdown > 0 && countdown <= 3) {
    fill(255, 150);
    textAlign(CENTER, CENTER);
    textSize(150);
    text(countdown, windowWidth / 2, windowHeight / 2);
  }
}
