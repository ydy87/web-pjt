<script setup>
import { ref, watch } from "vue";
import DistanceChart from "@/components/DistanceChart.vue";
import EulerChart from "@/components/EulerChart.vue";
import "@/assets/styles/homeview.css";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;
const socket = ref(null);
const connectionStatus = ref("Disconnected");
const isConnected = ref(false);

// 상태 변수들
const selectedMode = ref("None");
const robotSpeed = ref(15);
const isFixedSpeed = ref(false);
const stability = ref(50);
const sensitivity = ref("Medium Sensitivity"); // 기본 Medium
const isCustomSensitivity = ref(false); // Custom 여부 확인
const latestLog = ref(null);

const obj = ref({
  goal: { pitch: 0, roll: 0, yaw: 0 },
  current: { pitch: 0, roll: 0, yaw: 0 },
  distance: 3.0,
});

// Mode 선택 함수
function selectMode(mode) {
  selectedMode.value = mode;
}

// Sensitivity 변경 감지
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

// 최신 데이터 가져오기 함수
async function fetchLatestLog() {
  try {
    const response = await fetch("http://121.147.32.90:8000/api/robot-data");
    if (!response.ok) {
      throw new Error("데이터 가져오기 실패");
    }

    const data = await response.json();
    if (data.length > 0) {
      const log = data[0]; // 가장 최신 데이터 저장

      // 날짜 포맷 변환 (UTC → KST 변환)
      const utcDate = new Date(log.timestamp);
      const kstDate = new Date(utcDate.getTime() + 9 * 60 * 60 * 1000); // UTC+9 적용

      // KST 시간 포맷을 YYYY-MM-DD HH:MM:SS로 변환
      const year = kstDate.getFullYear();
      const month = String(kstDate.getMonth() + 1).padStart(2, "0");
      const day = String(kstDate.getDate()).padStart(2, "0");
      const hours = String(kstDate.getHours()).padStart(2, "0");
      const minutes = String(kstDate.getMinutes()).padStart(2, "0");
      const seconds = String(kstDate.getSeconds()).padStart(2, "0");

      log.timestamp = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`; // YYYY-MM-DD HH:MM:SS 포맷 적용
      latestLog.value = log;
    } else {
      latestLog.value = null;
    }
  } catch (error) {
    console.error("❌ 최신 데이터 가져오기 오류:", error);
    alert("최신 데이터를 가져오는 중 오류 발생");
  }
}

// Reset 버튼 기능 추가
function resetSettings() {
  console.log("🔄 Reset: 설정 초기화 및 WebSocket 강제 종료");

  // 1. UI 상태 초기화
  connectionStatus.value = "Disconnected";
  isConnected.value = false;
  selectedMode.value = "None";
  robotSpeed.value = 15;
  isFixedSpeed.value = false;
  stability.value = 50;
  sensitivity.value = "Medium Sensitivity";
  isCustomSensitivity.value = false;
  latestLog.value = null;

  // 2. WebSocket 강제 종료
  if (socket.value !== null) {
    console.log("🔄 Reset: WebSocket 강제 종료");
    socket.value.onopen = null;
    socket.value.onmessage = null;
    socket.value.onerror = null;
    socket.value.onclose = null;

    socket.value.close();
    socket.value = null;
  }

  // 3. 차트 데이터 초기화 (완전 비우기)
  obj.value = {
    goal: { pitch: 0, roll: 0, yaw: 0 },
    current: { pitch: 0, roll: 0, yaw: 0 },
    distance: 0.0,
  };
}

// WebSocket 연결 함수
function startConnection() {
  if (socket.value !== null) {
    console.warn("이미 WebSocket이 실행 중입니다.");
    return;
  }

  socket.value = new WebSocket(SOCKET_URL);

  socket.value.onopen = () => {
    console.log("WebSocket 연결됨");
    connectionStatus.value = "Connected";
    isConnected.value = true;
  };

  socket.value.onmessage = async (event) => {
    try {
      const text = typeof event.data === "string" ? event.data : await event.data.text();
      obj.value = JSON.parse(text);
    } catch (error) {
      console.error("데이터 파싱 오류:", error);
    }
  };

  socket.value.onerror = (error) => {
    console.error("WebSocket 오류:", error);
  };

  socket.value.onclose = () => {
    console.log("WebSocket 연결 종료됨");
    connectionStatus.value = "Disconnected";
    isConnected.value = false;
    socket.value = null;
  };
}

// WebSocket 종료 함수
function stopConnection() {
  if (socket.value !== null) {
    console.log("WebSocket 강제 종료 요청");

    if (socket.value.readyState === WebSocket.OPEN) {
      socket.value.send(JSON.stringify({ type: "CLOSE", message: "Client closed connection" }));
    }

    // WebSocket 이벤트 핸들러 제거
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
    speed: parseInt(robotSpeed.value), // 숫자로 변환
    stability: parseInt(stability.value), // 숫자로 변환
    time: getCurrentTime(), // MySQL `DATETIME` 형식으로 변환된 시간
  };

  console.log("🚀 저장할 데이터:", logData);

  try {
    const response = await fetch("http://121.147.32.90:8000/api/robot-data", {
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
    console.log("서버 응답:", result);
    alert("데이터가 성공적으로 저장되었습니다.");
  } catch (error) {
    console.error("저장 오류:", error);
    alert("데이터 저장 중 오류 발생");
  }
}
</script>

<template>
  <div class="container">
    <!-- 상단 상태 표시 -->
    <header class="status-bar">
      <h1 class="fancy-text">Balance Robot Control</h1>
      <div class="current-mode fancy-text">Mode: {{ selectedMode }}</div>
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

        <!-- Fixed speed 체크박스 -->
        <label>
          Fixed speed
          <input type="checkbox" v-model="isFixedSpeed" />
        </label>

        <!-- Robot Speed -->
        <div class="range-container">
          <label>Robot speed: {{ robotSpeed }}</label>
          <input type="range" min="0" max="30" v-model="robotSpeed" :disabled="isFixedSpeed" />
        </div>

        <!-- Stability -->
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

        <!-- Sensitivity 옵션 -->
        <div class="select-container">
          <select v-model="sensitivity" class="selectcss">
            <option>Low Sensitivity</option>
            <option>Medium Sensitivity</option>
            <option>High Sensitivity</option>
            <option>Custom</option>
          </select>
        </div>
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
      <h3>Latest Setting Data</h3>
      <div class="log-box">
        <div v-if="latestLog" class="log">
          <p><strong>Mode:</strong> {{ latestLog.mode }}</p>
          <p><strong>Speed:</strong> {{ latestLog.speed }}</p>
          <p><strong>Stability:</strong> {{ latestLog.stability }}</p>
          <p><strong>Timestamp:</strong> {{ latestLog.timestamp }}</p>
        </div>
        <div v-else class="log">No data available</div>
      </div>
    </section>

    <!-- 하단 제어 버튼 -->
    <footer class="action-bar">
      <button class="start" @click="startConnection">START</button>
      <button class="stop" @click="stopConnection">STOP</button>
      <button class="reset" @click="resetSettings">RESET</button>
      <button class="save" @click="saveLog">SETTING APPLY</button>
      <button class="show" @click="fetchLatestLog">SHOW DATA</button>
    </footer>
  </div>
</template>

<style scoped></style>
