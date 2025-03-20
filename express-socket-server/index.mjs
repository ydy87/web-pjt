import express from "express";
import morgan from "morgan";
import http from "http";
import { WebSocketServer } from "ws";
import net from "net";
import cors from "cors";
import pool from "./db/index.mjs"; // ✅ MySQL 연결 불러오기
import dotenv from "dotenv";

dotenv.config(); // .env 환경 변수 로드

const app = express();
const WEB_PORT = 8000;
const TCP_SOCKET_PORT = 9000;

const server = http.createServer(app);
const ws = new WebSocketServer({ server });

let tcpSocketClients = [];
let webSocketClients = [];

app.use(cors());
app.use(morgan("dev"));
app.use(express.json()); // JSON 요청 바디 처리

// ✅ Vue에서 보낸 데이터 저장 API
app.post("/api/robot-data", async (req, res) => {
  const { mode, speed, stability, time } = req.body;

  if (!mode || !speed || !stability || !time) {
    return res.status(400).json({ error: "모든 필드를 입력하세요." });
  }

  try {
    const query = `INSERT INTO robot_logs (mode, speed, stability, timestamp) VALUES (?, ?, ?, ?)`;
    await pool.execute(query, [mode, speed, stability, time]);
    res.status(201).json({ message: "로봇 데이터가 저장되었습니다." });
  } catch (error) {
    console.error("❌ 데이터 저장 오류:", error);
    res.status(500).json({ error: "서버 오류 발생" });
  }
});

// ✅ MySQL 데이터 조회 API
app.get("/api/robot-data", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM robot_logs ORDER BY timestamp DESC");
    res.json(rows);
  } catch (error) {
    console.error("❌ 데이터 조회 오류:", error);
    res.status(500).json({ error: "서버 오류 발생" });
  }
});

// ✅ TCP Socket 서버 설정
const tcpSocketServer = net.createServer((socket) => {
  console.log("✅ TCP Socket client connected");

  tcpSocketClients.push(socket);

  socket.on("data", async (data) => {
    try {
      const text = data.toString().trim();
      let parsedData;
      try {
        parsedData = JSON.parse(text);
      } catch (err) {
        console.error("❌ 잘못된 JSON 데이터:", text);
        return;
      }
  
      webSocketClients.forEach((webSocketClient) => {
        try {
          webSocketClient.send(JSON.stringify(parsedData));
        } catch (err) {
          console.error("❌ WebSocket 전송 오류:", err.message);
        }
      });
  
    } catch (error) {
      console.error("❌ TCP 데이터 처리 오류:", error);
    }
  });

  socket.on("error", (err) => {
    console.error("❌ TCP socket error:", err.message);
  });

  socket.on("end", () => {
    console.log("⚠️ TCP client disconnected");
    tcpSocketClients = tcpSocketClients.filter(
      (tcpSocketClient) => tcpSocketClient !== socket
    );
  });
});

// ✅ WebSocket 서버 설정
ws.on("connection", (ws) => {
  console.log("✅ WebSocket client connected");

  webSocketClients.push(ws);

  ws.on("message", (message) => {
    webSocketClients.forEach((webSocketClient) => {
      try {
        if (webSocketClient !== ws) {
          webSocketClient.send(message);
        }
      } catch (err) {
        console.error("❌ WebSocket 메시지 전송 오류:", err.message);
      }
    });
  });

  ws.on("close", () => {
    console.log("⚠️ WebSocket client disconnected");
    webSocketClients = webSocketClients.filter(
      (webSocketClient) => webSocketClient !== ws
    );
  });
});

// ✅ TCP Socket 서버 시작
tcpSocketServer.listen(TCP_SOCKET_PORT, () => {
  console.log(`🚀 TCP Socket server listening on port ${TCP_SOCKET_PORT}`);
});

// ✅ Web 서버 시작 (REST + WebSocket)
server.listen(WEB_PORT, () => {
  console.log(`🚀 Web server listening on port ${WEB_PORT}`);
});
