<script setup>
import { ref, onMounted } from "vue";
import Chart from "chart.js/auto";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;
const distanceHistory = ref([3.0, 3.0, 3.0, 3.0, 3.0]); // 초기값을 3m로 설정
const timeLabels = ref(["1s", "2s", "3s", "4s", "5s"]); 
const chartRef = ref(null);
let chartInstance = null;

const socket = new WebSocket(SOCKET_URL);

socket.onmessage = async (event) => {
  try {
    const text = typeof event.data === "string" ? event.data : await event.data.text();
    const data = JSON.parse(text);

    if (data.distance !== undefined && !isNaN(data.distance)) {
      const newDistance = Math.min(Math.max(parseFloat(data.distance), 0), 5); //
      const currentTime = new Date().toLocaleTimeString().slice(3, 8); // HH:MM 형식 시간

      // 최신 5개 데이터 유지
      const updatedHistory = [...distanceHistory.value, newDistance].slice(-5);
      const updatedTime = [...timeLabels.value, currentTime].slice(-5);

      distanceHistory.value = updatedHistory;
      timeLabels.value = updatedTime;

      updateChart();
    } else {
      console.warn("🚨 비정상적인 distance 데이터 수신:", data.distance);
    }
  } catch (error) {
    console.error("❌ 데이터 파싱 오류:", error);
  }
};

function createChart() {
  const ctx = chartRef.value.getContext("2d");
  chartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: timeLabels.value,
      datasets: [
        {
          label: "Actual Distance",
          data: distanceHistory.value,
          borderWidth: 2,
          borderColor: "blue",
          backgroundColor: "rgba(0, 0, 255, 0.2)",
          fill: false,
          pointRadius: 5,
          pointHoverRadius: 7,
        },
        {
          label: "Goal Distance",
          data: new Array(5).fill(3.0), // 목표 거리(3m) 고정
          borderWidth: 2,
          borderColor: "red",
          borderDash: [5, 5],
          pointRadius: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          title: {
            display: true,
            text: "Time",
          },
        },
        y: {
          title: {
            display: true,
            text: "Distance (m)",
          },
          min: 0,
          max: 5, 
          ticks: {
            stepSize: 0.5,
          },
        },
      },
      plugins: {
        legend: {
          labels: {
            font: {
              size: 14,
            },
          },
        },
      },
    },
  });
}

function updateChart() {
  if (chartInstance) {
    console.log("차트 업데이트: ", distanceHistory.value);

    chartInstance.data.labels = timeLabels.value; // X축 업데이트
    chartInstance.data.datasets[0].data = distanceHistory.value; // 실제 거리
    chartInstance.data.datasets[1].data = new Array(5).fill(3.0); // 목표 거리 3m 유지

    chartInstance.update();
  }
}

onMounted(() => {
  if (chartRef.value) {
    createChart();
  }
});
</script>

<template>
  <div class="distanceChartBox">
    <canvas ref="chartRef"></canvas>
  </div>
</template>

<style scoped>
.distanceChartBox {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 320px;
  height: 300px;
}
</style>
