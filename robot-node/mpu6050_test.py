import smbus
import time
import math

# MPU6050 I2C 주소
MPU6050_ADDR = 0x68
PWR_MGMT_1 = 0x6B
ACCEL_XOUT_H = 0x3B
GYRO_ZOUT_H = 0x47  # 자이로스코프 Z축 데이터 주소

# I2C 버스 초기화
bus = smbus.SMBus(1)

# Yaw 값 적분을 위한 초기값
yaw_angle = 0.0
prev_time = time.time()
reset_timer = time.time()  # Yaw 자동 초기화를 위한 타이머
yaw_offset = 0.0  # 초기화 시 Yaw 값을 보정하는 변수

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
    dt = curr_time - prev_time  # 시간 차이 계산

    # ✅ 1️⃣ Yaw 값 적분 (Yaw = ∫자이로 데이터 * dt)
    yaw_angle += gyro_z * dt

    # ✅ 2️⃣ 작은 값(Noise) 필터링 (각속도가 ±0.1°/s 이하 → 변화 없음)
    if abs(gyro_z) < 0.1:
        reset_timer = time.time()  # 움직이지 않으면 타이머 초기화
    
    # ✅ 3️⃣ 5초 동안 움직임이 없으면 Yaw 자동 초기화
    if time.time() - reset_timer > 5:
        yaw_offset = yaw_angle  # 현재 Yaw 값을 기준점으로 설정
        print(f"🔄 Yaw 자동 보정: {yaw_offset:.2f}")
        reset_timer = time.time()  # 타이머 초기화

    prev_time = curr_time  # 이전 시간 업데이트
    return yaw_angle - yaw_offset  # 보정된 Yaw 값 반환

def initialize_mpu6050():
    """MPU6050을 다시 초기화하는 함수"""
    global yaw_angle, yaw_offset
    try:
        bus.write_byte_data(MPU6050_ADDR, PWR_MGMT_1, 0)  # Sleep 모드 해제
        time.sleep(0.1)  # 안정화를 위해 대기
        yaw_angle = 0.0
        yaw_offset = 0.0
        print("✅ MPU6050이 다시 초기화되었습니다.")
    except Exception as e:
        print(f"❌ MPU6050 초기화 실패: {e}")

# ✅ MPU6050 초기화
initialize_mpu6050()

# ✅ 실시간 데이터 출력
while True:
    angles = get_euler_angles()
    yaw = update_yaw()
    
    print(f"Roll: {angles['roll']:.2f}, Pitch: {angles['pitch']:.2f}, Yaw: {yaw:.2f}")
    time.sleep(1)
