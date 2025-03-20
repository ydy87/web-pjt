<script setup>
import { ref, watch } from "vue";
import DistanceChart from "@/components/DistanceChart.vue";
import EulerChart from "@/components/EulerChart.vue";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;
const socket = ref(null);
const connectionStatus = ref("Disconnected");
const isConnected = ref(false);

// ✅ 상태 변수들
const selectedMode = ref("None");
const robotSpeed = ref(15);
const isFixedSpeed = ref(false);
const stability = ref(50);
const sensitivity = ref("Medium Sensitivity"); // 기본 Medium
const isCustomSensitivity = ref(false); // Custom 여부 확인

const obj = ref({
  goal: { pitch: 90, roll: 90, yaw: 90 },
  current: { pitch: 0, roll: 0, yaw: 0 },
  distance: 3.0,
});

// ✅ Mode 선택 함수
function selectMode(mode) {
  selectedMode.value = mode;
}

// ✅ Sensitivity 변경 감지
watch(sensitivity, (newVal) => {
  if (newVal === "Low Sensitivity") {
    stability.value = 25;
    isCustomSensitivity.value = false;
  } else if (newVal === "Medium Sensitivity") {
    stability.value = 50;
    isCustomSensitivity.value = false;
  } else if (newVal === "High Sensitivity") {
    stability.value = 75;
    isCustomSensitivity.value = false;
  } else {
    isCustomSensitivity.value = true;
  }
});

// ✅ Reset 버튼 기능 추가
function resetSettings() {
  console.log("🔄 Reset: 설정 초기화 및 WebSocket 강제 종료");

  // ✅ 1. UI 상태 초기화
  connectionStatus.value = "Disconnected";
  isConnected.value = false;
  selectedMode.value = "None";
  robotSpeed.value = 15;
  isFixedSpeed.value = false;
  stability.value = 50;
  sensitivity.value = "Medium Sensitivity";
  isCustomSensitivity.value = false;

  // ✅ 2. WebSocket 강제 종료
  if (socket.value !== null) {
    console.log("🔄 Reset: WebSocket 강제 종료");
    socket.value.onopen = null;
    socket.value.onmessage = null;
    socket.value.onerror = null;
    socket.value.onclose = null;

    socket.value.close();
    socket.value = null;
  }

  // ✅ 3. 차트 데이터 초기화 (완전 비우기)
  obj.value = {
    goal: { pitch: 0, roll: 0, yaw: 0 },
    current: { pitch: 0, roll: 0, yaw: 0 },
    distance: 0.0
  };
}

// ✅ WebSocket 연결 함수
function startConnection() {
  if (socket.value !== null) {
    console.warn("🔗 이미 WebSocket이 실행 중입니다.");
    return;
  }

  socket.value = new WebSocket(SOCKET_URL);

  socket.value.onopen = () => {
    console.log("✅ WebSocket 연결됨");
    connectionStatus.value = "Connected";
    isConnected.value = true;
  };

  socket.value.onmessage = async (event) => {
    try {
      const text = typeof event.data === "string" ? event.data : await event.data.text();
      obj.value = JSON.parse(text);
    } catch (error) {
      console.error("❌ 데이터 파싱 오류:", error);
    }
  };

  socket.value.onerror = (error) => {
    console.error("❌ WebSocket 오류:", error);
  };

  socket.value.onclose = () => {
    console.log("⚠️ WebSocket 연결 종료됨");
    connectionStatus.value = "Disconnected";
    isConnected.value = false;
    socket.value = null;
  };
}

// ✅ WebSocket 종료 함수
function stopConnection() {
  if (socket.value !== null) {
    console.log("⚠️ WebSocket 강제 종료 요청");

    if (socket.value.readyState === WebSocket.OPEN) {
      socket.value.send(JSON.stringify({ type: "CLOSE", message: "Client closed connection" }));
    }

    // ✅ WebSocket 이벤트 핸들러 제거
    socket.value.onopen = null;
    socket.value.onmessage = null;
    socket.value.onerror = null;
    socket.value.onclose = null;

    socket.value.close();
    socket.value = null;
  }

  connectionStatus.value = "Disconnected";
  isConnected.value = false;
}

function getCurrentTime() {
  const date = new Date();
  return date.toISOString().slice(0, 19).replace("T", " "); // "YYYY-MM-DD HH:MM:SS"
}

async function saveLog() {
  if (selectedMode.value === "None") {
    alert("먼저 모드를 선택하세요.");
    return;
  }

  const logData = {
    mode: selectedMode.value,
    speed: parseInt(robotSpeed.value), // ✅ 숫자로 변환
    stability: parseInt(stability.value), // ✅ 숫자로 변환
    time: getCurrentTime(), // ✅ MySQL `DATETIME` 형식으로 변환된 시간
  };

  console.log("🚀 저장할 데이터:", logData);

  try {
    const response = await fetch("http://localhost:8000/api/robot-data", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(logData),
    });

    if (!response.ok) {
      throw new Error("데이터 저장 실패");
    }

    const result = await response.json();
    console.log("✅ 서버 응답:", result);
    alert("데이터가 성공적으로 저장되었습니다.");
  } catch (error) {
    console.error("❌ 저장 오류:", error);
    alert("데이터 저장 중 오류 발생");
  }
}
</script>

<template>
  <div class="container">
    <!-- 상단 상태 표시 -->
    <header class="status-bar">
      <h1 class="fancy-text">Balance Robot Control</h1>
      <div class="current-mode fancy-text" >Mode: {{ selectedMode }}</div>
      <div class="network" :class="{ connected: connectionStatus === 'Connected' }">
        {{ connectionStatus }}
      </div>
    </header>

    <!-- 메인 레이아웃 -->
    <div class="main-layout">
      <!-- 좌측 컨트롤 패널 -->
      <aside class="control-panel">
        <h3>Select Mode</h3>
        <button class="btncss" @click="selectMode('Balancing')">Balancing Mode</button>
        <button class="btncss" @click="selectMode('Creeping')">Creeping Mode</button>

        <!-- ✅ Fixed speed 체크박스 -->
        <label>
          Fixed speed
          <input type="checkbox" v-model="isFixedSpeed" />
        </label>

        <!-- ✅ Robot Speed -->
        <div class="range-container">
          <label>Robot speed: {{ robotSpeed }}</label>
          <input type="range" min="1" max="30" v-model="robotSpeed" :disabled="isFixedSpeed" />
        </div>

        <!-- ✅ Stability -->
        <div class="range-container">
          <label>Stability: {{ stability }}</label>
          <input
            type="range"
            min="1"
            max="100"
            v-model="stability"
            :disabled="!isCustomSensitivity"
          />
        </div>

        <!-- ✅ Sensitivity 옵션 -->
        <div class="select-container">
          <select v-model="sensitivity" class="selectcss">
            <option>Low Sensitivity</option>
            <option>Medium Sensitivity</option>
            <option>High Sensitivity</option>
            <option>Custom</option>
          </select>
        </div>

        <div class="sensor-data">IMU: Stable | Temperature: 45°C</div>
      </aside>

      <!-- 차트 영역 -->
      <section class="chart-container">
        <div class="chart-box">
          <h3>PID 제어 - Euler Angle</h3>
          <EulerChart v-if="isConnected" />
        </div>
        <div class="chart-box">
          <h3>주행 성능 - Distance</h3>
          <DistanceChart v-if="isConnected" />
        </div>
      </section>
    </div>

    <!-- 데이터 모니터링 -->
    <section class="data-monitor">
      <h3>System Log</h3>
      <div class="log">[INFO] System Initialized...</div>
    </section>

    <!-- 하단 제어 버튼 -->
    <footer class="action-bar">
      <button class="start" @click="startConnection">START</button>
      <button class="stop" @click="stopConnection">STOP</button>
      <button class="reset" @click="resetSettings">RESET</button>
      <button class="save" @click="saveLog">SAVE LOG</button>
      <button class="show">Show data</button>
    </footer>
  </div>
</template>

<style scoped>
/* 전체 컨테이너 */
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  background: #1e1e1e;
  color: white;
  min-height: 100vh;
  width: 100%;
}

/* 상단 상태 표시 바 */
.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 90%;
  max-width: 1200px;
  background: #333;
  padding: 10px 20px;
  font-size: 16px;
  margin: 0 auto;
  border-radius: 8px;
  flex-wrap: wrap;
}

/* 현재 선택된 모드 스타일 */
.current-mode {
  font-size: 30px;
  font-weight: bold;
  color: #ffffff;
  text-align: center;
  flex-grow: 1;
}

/* 연결 상태 스타일 */
.network {
  font-size: 30px;
  font-weight: bold;
  background-image: linear-gradient(45deg, #ff416c, #ff4b2b);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  text-shadow: 0 3px 10px rgba(255, 65, 108, 0.6);
  transition: transform 0.3s ease, text-shadow 0.3s ease;
}

.network.connected {
  background-image: linear-gradient(45deg, #00b09b, #96c93d);
  text-shadow: 0 3px 10px rgba(0, 176, 155, 0.6);
}

.network:hover {
  transform: scale(1.05);
  text-shadow: 0 5px 15px rgba(255, 75, 43, 0.8);
}

.network.connected:hover {
  text-shadow: 0 5px 15px rgba(0, 176, 155, 0.8);
}


/* 🔹 메인 레이아웃 */
.main-layout {
  display: flex;
  flex-wrap: nowrap; /* 항상 한 줄 유지 */
  width: 90%;
  max-width: 1200px;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
}

/* 좌측 컨트롤 패널 */
.control-panel {
  width: 280px;
  min-width: 250px;
  max-width: 300px;
  background: #222;
  padding: 15px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 15px;
  align-items: center;
  flex-shrink: 0; /* 크기가 줄어들지 않도록 설정 */
}

/* 슬라이더 비활성화 스타일 */
input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 🔹 차트 컨테이너 */
.chart-container {
  display: flex;
  justify-content: center;
  gap: 20px;
  flex-grow: 1;
  min-width: 600px; /* 최소 너비 설정 */
  flex-shrink: 1;
}

/* 개별 차트 */
.chart-box {
  width: 380px;
  min-width: 280px;
  height: 400px;
  background: #111;
  padding: 15px;
  border-radius: 8px;
  text-align: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

/* 데이터 로그 */
.data-monitor {
  width: 90%;
  max-width: 1200px;
  background: #222;
  padding: 15px;
  margin-top: 20px;
  border-radius: 8px;
}

/* 하단 버튼 */
.action-bar {
  width: 90%;
  max-width: 1200px;
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin: 30px auto;
  padding: 15px;
  background-color: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(8px);
  border-radius: 15px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.2);
  flex-wrap: wrap;
}

.action-bar button {
  padding: 12px 0;
  font-size: 16px;
  font-weight: bold;
  border: none;
  border-radius: 25px;
  cursor: pointer;
  flex-grow: 1;
  flex-basis: 120px;
  color: #ffffff;
  box-shadow: 0 4px 10px rgba(0,0,0,0.3);
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}

/* 버튼별 색상 개선 (선명도 강화) */
button.start {
  background-image: linear-gradient(45deg, #3cd500, #81d742);
}

button.stop {
  background-image: linear-gradient(45deg, #ff0844, #ff5f6d);
}

button.reset {
  background-image: linear-gradient(45deg, #645cff, #a573ff);
}

button.save {
  background-image: linear-gradient(45deg, #ffaf00, #ffc700);
}

/* Show data 버튼 특별 개선 (시인성 향상) */
button.show {
  background-image: linear-gradient(45deg, #26b1d4, #3a7bd5);
}

/* hover 공통 효과 */
.action-bar button:hover {
  transform: translateY(-4px);
  box-shadow: 0 6px 15px rgba(0,0,0,0.5);
  opacity: 1;
}

/* 클릭 공통 효과 */
.action-bar button:active {
  transform: translateY(-2px);
  box-shadow: 0 3px 8px rgba(0,0,0,0.3);
}

/* 비활성화 버튼 스타일 추가 (필요 시 사용 가능) */
.action-bar button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}


/*여기 부터 range input */
.range-container {
  width: 300px;
  padding: 15px;
  background-color: transparent;
  border-radius: 10px;
  text-align: center;
}

.range-container input[type="range"] {
  -webkit-appearance: none;
  width: 80%;
  height: 8px;
  border-radius: 10px;
  background: linear-gradient(
    to right,
    #00e0ff var(--value),
    rgba(255, 255, 255, 0.2) var(--value)
  );
  cursor: pointer;
  outline: none;
  box-shadow: 0 0 10px rgba(0, 224, 255, 0.6);
}

.range-container input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: #fff;
  border: 3px solid #00e0ff;
  box-shadow: 0 0 12px rgba(0, 224, 255, 0.8);
  transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
}

.range-container input[type="range"]::-webkit-slider-thumb:hover {
  transform: scale(1.3);
  box-shadow: 0 0 15px rgba(0, 224, 255, 1);
}

.range-container input[type="range"]::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: #fff;
  border: 3px solid #00e0ff;
  box-shadow: 0 0 12px rgba(0, 224, 255, 0.8);
  transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
}

.range-container input[type="range"]::-moz-range-thumb:hover {
  transform: scale(1.3);
  box-shadow: 0 0 15px rgba(0, 224, 255, 1);
}

.value-display {
  color: #ffffff;
  font-size: 1.2em;
  margin-top: 10px;
  text-shadow: 0 0 8px rgba(0, 224, 255, 0.7);
}
/* 여기까지 range-input */

/*여기부터 버튼 꾸미기 css*/
.btn-container {
  display: flex;
  gap: 20px;
  justify-content: center;
  margin-top: 20px;
}

.btncss {
  padding: 12px 24px;
  font-size: 16px;
  font-weight: bold;
  color: #ffffff;
  background-image: linear-gradient(45deg, #6a11cb, #2575fc);
  border: none;
  border-radius: 30px;
  cursor: pointer;
  transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
  box-shadow: 0 4px 15px rgba(37, 117, 252, 0.4);
}

.btncss:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 20px rgba(106, 17, 203, 0.6);
}

.btncss:active {
  transform: translateY(0);
  box-shadow: 0 3px 10px rgba(106, 17, 203, 0.3);
}
/*여기까지 버튼 꾸미기 css*/

/*여기부터 옵션 꾸미기 css*/
.select-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.selectcss {
  appearance: none;
  padding: 12px 40px 12px 20px;
  font-size: 16px;
  color: #ffffff;
  font-weight: bold;
  background: linear-gradient(135deg, #ff6ec4, #7873f5);
  border: none;
  border-radius: 30px;
  cursor: pointer;
  outline: none;
  box-shadow: 0 4px 15px rgba(120, 115, 245, 0.4);
  transition: box-shadow 0.2s ease-in-out, transform 0.2s ease-in-out;
  background-image:
    linear-gradient(135deg, #ff6ec4, #7873f5),
    url('data:image/svg+xml;charset=US-ASCII,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"20\" height=\"20\" fill=\"white\"><polygon points=\"0,0 20,0 10,10\"/></svg>');
  background-repeat: no-repeat;
  background-position: right 15px top 50%;
  background-size: 12px;
}

.selectcss:hover {
  box-shadow: 0 8px 20px rgba(255, 110, 196, 0.6);
  transform: translateY(-3px);
}

.selectcss:active {
  transform: translateY(0);
  box-shadow: 0 3px 10px rgba(120, 115, 245, 0.3);
}

option {
  color: #333333;
  background-color: #ffffff;
}

/*여기까지 옵션 꾸미기 css*/

.fancy-text {
  font-size: 32px;
  font-weight: bold;
  color: #fff;
  text-align: center;
  background-image: linear-gradient(120deg, #89f7fe, #66a6ff);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 4px 10px rgba(102, 166, 255, 0.6);
  transition: transform 0.3s ease, text-shadow 0.3s ease;
  cursor: default;
  margin: 20px auto;
}

.fancy-text:hover {
  transform: scale(1.05);
  text-shadow: 0 6px 20px rgba(137, 247, 254, 0.9);
}

/* 🔹 반응형 스타일 (화면이 360px 이하일 경우) */
@media (max-width: 360px) {
  .main-layout {
    flex-direction: column;
    align-items: center;
  }

  .chart-container {
    flex-direction: column;
    align-items: center;
    min-width: auto;
  }

  .chart-box {
    width: 90%;
    min-width: 280px;
  }

  .status-bar {
    flex-direction: column;
    text-align: center;
  }

  .action-bar {
    flex-direction: column;
  }

  .action-bar button {
    width: 100%;
    margin-bottom: 10px;
  }
}
</style>