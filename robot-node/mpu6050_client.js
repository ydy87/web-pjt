import net from "net";
import i2c from "i2c-bus";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

//환경 변수에서 TCP 서버 주소 로드
const PORT = process.env.PORT;
const HOST = process.env.HOST; // 라즈베리파이 TCP 서버 주소

//MPU6050 I2C 주소 및 레지스터 설정
const MPU6050_ADDR = 0x68;
const PWR_MGMT_1 = 0x6B;
const ACCEL_XOUT_H = 0x3B;
const GYRO_ZOUT_H = 0x47;

//I2C 버스 초기화
const i2cBus = i2c.openSync(1);
i2cBus.writeByteSync(MPU6050_ADDR, PWR_MGMT_1, 0); // Sleep 모드 해제

//Roll, Pitch, Yaw 계산용 변수
let yaw_angle = 0.0;
let prev_time = Date.now();
let yaw_offset = 0.0;
let reset_timer = Date.now(); // Yaw 자동 초기화를 위한 타이머

//16비트 데이터 읽기 함수
function readWord(adr) {
  const high = i2cBus.readByteSync(MPU6050_ADDR, adr);
  const low = i2cBus.readByteSync(MPU6050_ADDR, adr + 1);
  let val = (high << 8) + low;
  return val < 32768 ? val : val - 65536;
}

//가속도 데이터 읽기
function getAccelData() {
  const accel_x = readWord(ACCEL_XOUT_H) / 16384.0;
  const accel_y = readWord(ACCEL_XOUT_H + 2) / 16384.0;
  const accel_z = readWord(ACCEL_XOUT_H + 4) / 16384.0;
  return { x: accel_x, y: accel_y, z: accel_z };
}

//자이로 데이터 읽기
function getGyroData() {
  return readWord(GYRO_ZOUT_H) / 131.0;
}

//Euler 각도(Roll, Pitch) 계산
function getEulerAngles() {
  const accel = getAccelData();
  const roll = Math.atan2(accel.y, Math.sqrt(accel.x ** 2 + accel.z ** 2)) * (180 / Math.PI);
  const pitch = Math.atan2(-accel.x, Math.sqrt(accel.y ** 2 + accel.z ** 2)) * (180 / Math.PI);
  return { roll, pitch };
}

//Yaw 적분 계산
function updateYaw() {
  const gyro_z = getGyroData();
  const curr_time = Date.now();
  const dt = (curr_time - prev_time) / 1000.0; // 초 단위 변환

  yaw_angle += gyro_z * dt;

  //5초 동안 움직임 없으면 Yaw 자동 초기화
  if (Math.abs(gyro_z) < 0.1) {
    reset_timer = Date.now();
  }
  if (Date.now() - reset_timer > 5000) {
    yaw_offset = yaw_angle;
    console.log(`Yaw 자동 보정: ${yaw_offset.toFixed(2)}`);
    reset_timer = Date.now();
  }

  prev_time = curr_time;
  return yaw_angle - yaw_offset;
}

//TCP 클라이언트 생성
const client = new net.Socket();
let messageId = 1;
let interval = null;

//TCP 서버 연결
client.connect(PORT, HOST, () => {
  console.log(`Connected to TCP server at ${HOST}:${PORT}`);

  interval = setInterval(() => {
    const angles = getEulerAngles();
    const yaw = updateYaw();

    const message = {
      id: messageId++,
      goal: { pitch: 0, roll: 0, yaw: 0 },
      current: { pitch: angles.pitch.toFixed(2), roll: angles.roll.toFixed(2), yaw: yaw.toFixed(2) },
      distance: (Math.random() * 5).toFixed(2),
      date_time: new Date().toISOString(),
    };

    client.write(JSON.stringify(message));
    console.log("Sent:", message);
  }, 1000);
});

//STOP 요청을 받으면 TCP 연결 종료
process.on("message", (msg) => {
  if (msg === "STOP") {
    console.log("STOP 요청 받음, TCP 연결 종료");
    clearInterval(interval);
    client.end();
    client.destroy();
  }
});

client.on("error", (err) => {
  console.error("TCP 연결 오류:", err);
});
