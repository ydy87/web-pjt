import net from 'net';
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const client = new net.Socket();
const PORT = process.env.PORT;
const HOST = process.env.HOST;

let messageId = 1;
let interval = null; // 데이터를 주기적으로 보내는 setInterval을 관리

client.connect(PORT, HOST, () => {
  console.log(`Connected to TCP server at ${HOST}:${PORT}`);

  interval = setInterval(() => {
    const pitch = (Math.random() * 180).toFixed(2);
    const roll = (Math.random() * 180).toFixed(2);
    const yaw = (Math.random() * 180).toFixed(2);
    const distance = (Math.random() * 5).toFixed(2);

    const message = {
      id: messageId++,
      goal: { pitch: 90, roll: 90, yaw: 90 },
      current: { pitch, roll, yaw },
      distance,
      date_time: new Date().toISOString()
    };

    client.write(JSON.stringify(message));
    console.log("Sent:", message);
  }, 1000);
});

// ✅ STOP 요청을 받으면 TCP 연결 종료
process.on("message", (msg) => {
  if (msg === "STOP") {
    console.log("⚠️ STOP 요청 받음, TCP 연결 종료");
    clearInterval(interval); // 데이터 전송 중단
    client.end(); // 정상 종료
    client.destroy(); // 강제 종료
  }
});

client.on('error', (err) => {
  console.error('Error:', err);
});
