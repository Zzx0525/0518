let capture;
let camError = false; // 紀錄是否沒有鏡頭或權限被拒絕
let handpose;
let predictions = [];
let playerGesture = "未偵測到手";
let computerGesture = "等待中";
let gameResult = "模型載入中...";
let gestures = ["石頭", "布", "剪刀"];
let lastPlayTime = 0;
let gameState = "WAITING"; // 狀態：WAITING (等待開始), PLAYING (遊戲進行中), RESULT (顯示結果)
let playerScore = 0; // 玩家得分
let computerScore = 0; // 電腦得分
let currentGesture = ""; // 紀錄當前手勢，用來判斷是否維持
let gestureStartTime = 0; // 紀錄當前手勢開始維持的時間

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
    gameResult = "請比出 OK 手勢開始";
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
    
    // 檢查手勢是否改變，若改變則重置計時器
    if (playerGesture !== currentGesture) {
      currentGesture = playerGesture;
      gestureStartTime = millis();
    }

    if (gameState === "WAITING") {
      checkStartGame();
    } else if (gameState === "PLAYING") {
      playGame();
    } else if (gameState === "RESULT") {
      // 顯示結果 2 秒後重置為 PLAYING 狀態
      if (millis() - lastPlayTime > 2000) {
        gameState = "PLAYING";
        gameResult = "請對著鏡頭比出 剪刀、石頭 或 布";
        gestureStartTime = millis();
      }
    }
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

  // 定義手部骨架的連接關係
  let connections = [
    // 大拇指
    [0, 1], [1, 2], [2, 3], [3, 4],
    // 食指
    [0, 5], [5, 6], [6, 7], [7, 8],
    // 中指
    [0, 9], [9, 10], [10, 11], [11, 12],
    // 無名指
    [0, 13], [13, 14], [14, 15], [15, 16],
    // 小指
    [0, 17], [17, 18], [18, 19], [19, 20]
  ];

  for (let i = 0; i < predictions.length; i++) {
    let prediction = predictions[i];
    playerGesture = detectGesture(prediction);

    // 繪製骨架線條
    stroke(0, 255, 0); // 綠色線條
    strokeWeight(2);
    for (let k = 0; k < connections.length; k++) {
      let ptA = prediction.landmarks[connections[k][0]];
      let ptB = prediction.landmarks[connections[k][1]];
      line(
        startX + ptA[0] * scaleX, startY + ptA[1] * scaleY,
        startX + ptB[0] * scaleX, startY + ptB[1] * scaleY
      );
    }

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

  // 判斷 OK 手勢：大拇指(節點4)和食指(節點8)指尖距離小於 50，且另外幾指有伸直
  let thumbTip = prediction.landmarks[4];
  let indexTip = prediction.landmarks[8];
  let d = dist(thumbTip[0], thumbTip[1], indexTip[0], indexTip[1]);
  if (d < 50 && extendedFingers >= 2) {
    return "OK";
  }

  if (extendedFingers === 0) return "石頭";
  if (extendedFingers === 2) return "剪刀"; // 通常是食指和中指伸直
  if (extendedFingers >= 3) return "布";    // 3 根或 4 根都當作布
  return "未知";
}

function checkStartGame() {
  if (currentGesture === "OK") {
    if (millis() - gestureStartTime > 3000) {
      gameState = "PLAYING";
      gestureStartTime = millis();
      gameResult = "遊戲開始！";
    } else {
      gameResult = "請維持 OK 手勢";
    }
  } else {
    gameResult = "請比出 OK 手勢開始";
  }
}

function playGame() {
  // 當手勢是剪刀、石頭或布時，維持 3 秒才結算
  if (currentGesture === "石頭" || currentGesture === "剪刀" || currentGesture === "布") {
    if (millis() - gestureStartTime > 3000) {
      computerGesture = random(gestures);
      gameState = "RESULT";
      lastPlayTime = millis();
      
      if (currentGesture === computerGesture) {
        gameResult = "平手！";
      } else if (
        (currentGesture === "石頭" && computerGesture === "剪刀") ||
        (currentGesture === "剪刀" && computerGesture === "布") ||
        (currentGesture === "布" && computerGesture === "石頭")
      ) {
        gameResult = "你贏了！🎉";
        playerScore++;
      } else {
        gameResult = "電腦贏了！💀";
        computerScore++;
      }
    } else {
      gameResult = "維持手勢...";
    }
  } else {
    gameResult = "請對著鏡頭比出 剪刀、石頭 或 布";
  }
}

function drawGameUI() {
  // 繪製半透明的資訊面板
  rectMode(CORNER);
  fill(0, 150);
  rect(20, 20, 350, 230, 10); // 加大面板的高度與寬度以容納計分板
  
  // 繪製文字狀態
  fill(255);
  textAlign(LEFT, TOP);
  textSize(24);
  text(`你的手勢: ${playerGesture}`, 40, 40);
  
  if (gameState === "WAITING") {
    text(`狀態: 等待開始`, 40, 80);
    textSize(32);
    fill(255, 255, 0);
    text(gameResult, 40, 130);

    // 畫面倒數
    if (currentGesture === "OK") {
      let countdown = Math.ceil(3 - (millis() - gestureStartTime) / 1000);
      if (countdown > 0 && countdown <= 3) {
        fill(255, 150);
        textAlign(CENTER, CENTER);
        textSize(150);
        text(countdown, windowWidth / 2, windowHeight / 2);
      }
    }
  } else {
    text(`電腦手勢: ${gameState === "RESULT" ? computerGesture : "等待出拳..."}`, 40, 80);
    
    textSize(32);
    fill(255, 255, 0);
    text(`結果: ${gameResult}`, 40, 130);
  
    // 畫面中央顯示倒數計時
    if (gameState === "PLAYING" && (currentGesture === "石頭" || currentGesture === "剪刀" || currentGesture === "布")) {
      let countdown = Math.ceil(3 - (millis() - gestureStartTime) / 1000);
      if (countdown > 0 && countdown <= 3) {
        fill(255, 150);
        textAlign(CENTER, CENTER);
        textSize(150);
        text(countdown, windowWidth / 2, windowHeight / 2);
      }
    }
  }

  // 顯示計分板
  textAlign(LEFT, TOP);
  textSize(24);
  fill(255);
  text(`得分 - 玩家: ${playerScore} / 電腦: ${computerScore}`, 40, 180);
}
