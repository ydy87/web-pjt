import asyncio
import websockets
import json
import smbus
import time
import math

# MPU6050 I2C 주소
MPU6050_ADDR = 0x68
PWR_MGMT_1 = 0x6B
ACCEL_XOUT_H = 0x3B
GYRO_ZOUT_H = 0x47

# I2C 버스 초기화
bus = smbus.SMBus(1)

# Yaw 값 적분을 위한 초기값
yaw_angle = 0.0
prev_time = time.time()
reset_timer = time.time()
yaw_offset = 0.0

def read_word(adr):
    """MPU6050의 지정된 주소에서 16비트 데이터를 읽어옴"""
    try:
        high = bus.read_byte_data(MPU6050_ADDR, adr)
        low = bus.read_byte_data(MPU6050_ADDR, adr + 1)
        val = (high << 8) + low
        return val if val < 32768 else val - 65536
    except OSError:
        print("⚠️ I2C 오류 발생! 센서를 다시 초기화합니다.")
        initialize_mpu6050()
        return 0

def get_accel_data():
    """가속도 데이터를 읽어 G 단위로 변환"""
    accel_x = read_word(ACCEL_XOUT_H) / 16384.0
    accel_y = read_word(ACCEL_XOUT_H + 2) / 16384.0
    accel_z = read_word(ACCEL_XOUT_H + 4) / 16384.0
    return {"x": accel_x, "y": accel_y, "z": accel_z}

def get_gyro_data():
    """자이로스코프 데이터를 읽고 °/s 단위로 변환"""
    gyro_z = read_word(GYRO_ZOUT_H) / 131.0
    return gyro_z

def get_euler_angles():
    """가속도 데이터를 기반으로 Roll 및 Pitch 각도 계산"""
    accel = get_accel_data()
    roll = math.atan2(accel["y"], math.sqrt(accel["x"] ** 2 + accel["z"] ** 2)) * (180 / math.pi)
    pitch = math.atan2(-accel["x"], math.sqrt(accel["y"] ** 2 + accel["z"] ** 2)) * (180 / math.pi)
    return {"roll": roll, "pitch": pitch}

def update_yaw():
    """자이로스코프 Z축 데이터를 적분하여 Yaw 값 계산"""
    global yaw_angle, prev_time, reset_timer, yaw_offset

    gyro_z = get_gyro_data()
    curr_time = time.time()
    dt = curr_time - prev_time

    yaw_angle += gyro_z * dt

    if abs(gyro_z) < 0.1:
        reset_timer = time.time()

    if time.time() - reset_timer > 5:
        yaw_offset = yaw_angle
        print(f"🔄 Yaw 자동 보정: {yaw_offset:.2f}")
        reset_timer = time.time()

    prev_time = curr_time
    return yaw_angle - yaw_offset

def initialize_mpu6050():
    """MPU6050을 다시 초기화하는 함수"""
    global yaw_angle, yaw_offset
    try:
        bus.write_byte_data(MPU6050_ADDR, PWR_MGMT_1, 0)
        time.sleep(0.1)
        yaw_angle = 0.0
        yaw_offset = 0.0
        print("✅ MPU6050이 다시 초기화되었습니다.")
    except Exception as e:
        print(f"❌ MPU6050 초기화 실패: {e}")

async def send_mpu6050_data(websocket, path):
    """MPU6050 센서 데이터를 WebSocket을 통해 클라이언트에 전송"""
    while True:
        angles = get_euler_angles()
        yaw = update_yaw()
        
        data = {
            "roll": round(angles["roll"], 2),
            "pitch": round(angles["pitch"], 2),
            "yaw": round(yaw, 2)
        }

        await websocket.send(json.dumps(data))
        await asyncio.sleep(0.1)  # 100ms 간격으로 데이터 전송

# WebSocket 서버 시작
start_server = websockets.serve(send_mpu6050_data, "0.0.0.0", 8765)

print("✅ WebSocket 서버가 시작되었습니다. (포트: 8765)")
initialize_mpu6050()

asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()
