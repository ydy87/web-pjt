import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host: "3.34.182.5",
  user: "ssafy",
  password: "ssafy_1234",
  database: "robot_data",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export default pool;
