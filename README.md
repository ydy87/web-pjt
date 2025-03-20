# SEBAR 프로젝트 명세서

## 1. 프로젝트 개요

**프로젝트명**: SEBAR - 로봇 균형 유지 및 원격 제어 시스템  
**기한**: 2025년 3월 25일 (화)  
**기술 스택**: Vue.js, Express.js, WebSocket, Raspberry Pi, Chart.js  

본 프로젝트는 로봇의 균형을 유지하고 원격으로 제어할 수 있는 대시보드를 개발하는 것을 목표로 합니다. 사용자는 웹 인터페이스를 통해 로봇의 동작 모드를 변경하고, 센서 데이터를 시각화하여 실시간으로 로봇의 상태를 모니터링할 수 있습니다.

## 2. 기대 효과

- 로봇의 균형 유지 및 제어 알고리즘을 UI와 연계하여 시각적으로 확인 가능
- 실시간 데이터 스트리밍을 통한 로봇 상태 모니터링 시스템 구현
- 웹 기반 인터페이스를 통한 원격 제어 기능 제공

## 3. 주요 기능

### 3.1 로봇 균형 유지 모드
- **기능 설명**: 로봇의 균형을 유지하는 모드 활성화
- **기능 상세**:
  - 사용자가 UI에서 `Balancing Mode`를 선택하면 로봇이 균형을 유지하도록 동작
  - WebSocket을 통해 실시간으로 모드 변경 신호를 로봇에 전송

### 3.2 원격 주행 모드
- **기능 설명**: 사용자가 UI에서 로봇을 원격으로 조작
- **기능 상세**:
  - `Creeping Mode` 선택 시, 사용자가 속도를 조절하여 로봇을 이동 가능
  - 실시간 WebSocket 통신을 이용하여 조작 명령 전달
  
### 3.3 실시간 센서 데이터 시각화
- **기능 설명**: 로봇의 센서 데이터를 실시간으로 UI에 표시
- **기능 상세**:
  - IMU 센서 데이터를 가져와 Roll, Pitch, Yaw 값을 Chart.js를 이용하여 Radar Chart로 시각화
  - WebSocket을 활용하여 실시간 데이터 스트리밍
  
### 3.4 시스템 로그 기록
- **기능 설명**: 로봇의 동작 로그를 UI에서 확인 가능
- **기능 상세**:
  - ROS2 기반 로그 데이터를 웹 UI에서 출력
  - 특정 이벤트 발생 시(예: 균형 유지 실패, 속도 변경 등) 로그를 저장

## 4. 데이터 모델

### 4.1 로봇 상태 데이터 구조
```json
{
  "mode": "balancing", 
  "speed": 15,
  "imu": {
    "roll": 30,
    "pitch": 60,
    "yaw": 45
  },
  "battery": 85,
  "network_status": "connected"
}
```

### 4.2 로그 데이터 테이블
| id  | timestamp           | event         | details         |
| --- | ------------------- | ------------- | --------------- |
| 1   | 2025-03-15 12:00:00 | mode_change   | Balancing Mode 활성화 |
| 2   | 2025-03-15 12:01:00 | speed_change  | Speed: 15 |

## 5. API 명세

### 5.1 로봇 상태 조회 API
- **Endpoint**: `GET /api/robot/status`
- **Response**:
```json
{
  "mode": "balancing",
  "speed": 15,
  "battery": 85,
  "network_status": "connected"
}
```

### 5.2 모드 변경 API
- **Endpoint**: `POST /api/robot/mode`
- **Request**:
```json
{
  "mode": "creeping"
}
```
- **Response**:
```json
{
  "message": "Mode updated successfully",
  "status": "success"
}
```

## 6. 시스템 아키텍처

- **프론트엔드**: Vue.js 기반 대시보드 UI (로봇 상태 모니터링 및 제어 기능 포함)
- **백엔드**: Express.js 기반 API 서버 + WebSocket을 이용한 실시간 통신
- **데이터베이스**: 실시간 로그 및 상태 저장 (파일 기반 로그 시스템 활용 가능)
- **하드웨어**: Raspberry Pi (로봇 제어 및 센서 데이터 처리)

---

위 명세서는 SEBAR 프로젝트의 구조를 기반으로 작성되었으며, 필요에 따라 추가적인 기능을 정의하거나 보완할 수 있습니다.
