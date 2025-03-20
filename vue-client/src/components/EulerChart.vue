<script setup>
import { ref, onMounted } from "vue";
import Chart from "chart.js/auto";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;
const obj = ref({
  goal: { pitch: 90, roll: 90, yaw: 90 },
  current: { pitch: 0, roll: 0, yaw: 0 },
});

const chartRef = ref(null);
let chartInstance = null;

const socket = new WebSocket(SOCKET_URL);

socket.onmessage = async (event) => {
  try {
    const text = typeof event.data === "string" ? event.data : await event.data.text();
    const data = JSON.parse(text);

    // 기존 데이터와 비교하여 변동이 있을 때만 업데이트
    if (
      data.current.pitch !== obj.value.current.pitch ||
      data.current.roll !== obj.value.current.roll ||
      data.current.yaw !== obj.value.current.yaw
    ) {
      obj.value.current = structuredClone(data.current); // 깊은 복사하여 반응형 무한 루프 방지
      updateChart();
    }
  } catch (error) {
    console.error("❌ 데이터 파싱 오류:", error);
  }
};

function createChart() {
  const ctx = chartRef.value.getContext("2d");
  chartInstance = new Chart(ctx, {
    type: "radar",
    data: {
      labels: ["Pitch", "Roll", "Yaw"],
      datasets: [
        {
          label: "Goal Euler",
          data: [90, 90, 90],
          borderWidth: 2,
          borderColor: "red",
          backgroundColor: "rgba(255, 0, 0, 0.2)",
          pointRadius: 4,
        },
        {
          label: "Current Euler",
          data: [0, 0, 0],
          borderWidth: 2,
          borderColor: "blue",
          backgroundColor: "rgba(0, 0, 255, 0.2)",
          pointRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: 20,
      },
      scales: {
        r: {
          beginAtZero: true,
          min: 0,
          max: 180,
          pointLabels: {
            font: {
              size: 14,
            },
          },
          ticks: {
            stepSize: 30,
            display: false,
          },
          grid: {
            color: "rgba(255, 255, 255, 0.2)",
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
    console.log("📊 차트 업데이트: ", obj.value.current); // 디버깅 로그 추가

    chartInstance.data.datasets[1].data = [
      obj.value.current.pitch,
      obj.value.current.roll,
      obj.value.current.yaw,
    ];
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
  <div class="eulerChartBox">
    <canvas ref="chartRef"></canvas>
  </div>
</template>

<style scoped>
.eulerChartBox {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 400px;
  height: 400px;
}
</style>
