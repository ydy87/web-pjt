<script setup>
import { ref, onMounted } from "vue";
import Chart from "chart.js/auto";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;
const obj = ref({
  goal: { pitch: 0, roll: 0, yaw: 0 },
  current: { pitch: 0, roll: 0, yaw: 0 },
});

const chartRef = ref(null);
let chartInstance = null;

const socket = new WebSocket(SOCKET_URL);

socket.onmessage = async (event) => {
  try {
    const text = typeof event.data === "string" ? event.data : await event.data.text();
    const data = JSON.parse(text);

    if (
      data.current.pitch !== obj.value.current.pitch ||
      data.current.roll !== obj.value.current.roll ||
      data.current.yaw !== obj.value.current.yaw
    ) {
      obj.value.current = structuredClone(data.current);
      updateChart();
    }
  } catch (error) {
    console.error("데이터 파싱 오류:", error);
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
          data: [0, 0, 0],
          borderWidth: 2,
          borderColor: "red", // 빨강
          backgroundColor: "rgba(255, 99, 132, 0.2)",
          pointRadius: 5,
        },
        {
          label: "Current Euler",
          data: [0, 0, 0],
          borderWidth: 2,
          borderColor: "blue", // 파랑
          backgroundColor: "rgba(54, 162, 235, 0.2)",
          pointRadius: 5,
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
          beginAtZero: false,
          min: -90,
          max: 90,
          pointLabels: {
            font: {
              size: 14,
              weight: "bold",
            },
          },
          ticks: {
            stepSize: 15, // 
            display: false, //  숫자 제거
          },
          grid: {
            color: "rgba(255, 255, 255, 0.3)", // 대비 강화
            lineWidth: 1.5,
          },
          angleLines: {
            color: "rgba(255, 255, 255, 0.3)", // 기준선 색 강조
          },
        },
      },
      plugins: {
        legend: {
          labels: {
            font: {
              size: 14,
              weight: "bold",
            },
            color: "#ffffff",
          },
        },
      },
    },
  });
}

function updateChart() {
  if (chartInstance) {
    console.log("차트 업데이트: ", obj.value.current);
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
  width: 340px;
  height: 300px;
}
</style>
