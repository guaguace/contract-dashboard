const express = require("express");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3456;
const DATA_FILE = path.join(__dirname, "data.json");
const BACKUP_DIR = path.join(__dirname, "backups");

const app = express();
app.use(express.json({ limit: "10mb" }));

// ── 请求日志 ──────────────────────────────────
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const ms = Date.now() - start;
    const time = new Date().toISOString().slice(0, 19).replace("T", " ");
    console.log(`${time}  ${req.method} ${req.url} → ${res.statusCode} (${ms}ms)`);
  });
  next();
});

// ── 静态文件（前端） ──────────────────────────
app.use(express.static(__dirname));

// ── 数据文件读写 ──────────────────────────────
function ensureDataFile() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, "[]", "utf-8");
    console.log("📄 已创建空的 data.json（首次启动）");
  }
}

function readData() {
  try {
    ensureDataFile();
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (e) {
    console.error("❌ 读取 data.json 失败:", e.message);
    return [];
  }
}

function backupData() {
  if (!fs.existsSync(DATA_FILE)) return;
  try {
    if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const backupFile = path.join(BACKUP_DIR, `data-${ts}.json`);
    fs.copyFileSync(DATA_FILE, backupFile);
    // 只保留最近 50 份备份
    const backups = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith(".json"))
      .sort();
    while (backups.length > 50) {
      fs.unlinkSync(path.join(BACKUP_DIR, backups.shift()));
    }
  } catch (e) {
    console.error("⚠️ 备份失败:", e.message);
  }
}

function writeData(data) {
  backupData();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

// ── API ───────────────────────────────────────

// 获取所有合同
app.get("/api/contracts", (_req, res) => {
  try {
    const data = readData();
    res.json({ ok: true, data, count: data.length });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 保存所有合同（全量替换）
app.post("/api/contracts", (req, res) => {
  try {
    const { data } = req.body;
    if (!Array.isArray(data)) {
      return res.status(400).json({ ok: false, error: "data 必须是数组" });
    }
    writeData(data);
    console.log(`💾 已保存 ${data.length} 条合同记录`);
    res.json({ ok: true, count: data.length });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 健康检查接口
app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    uptime: Math.floor(process.uptime()),
    file: fs.existsSync(DATA_FILE),
    count: readData().length,
  });
});

// ── 启动 ──────────────────────────────────────
app.listen(PORT, "0.0.0.0", () => {
  console.log("");
  console.log("══════════════════════════════════════════");
  console.log("   📋 合同生命周期看板 — 内网服务器");
  console.log("══════════════════════════════════════════");
  console.log("");
  console.log(`   📡 服务端口 : ${PORT}`);
  console.log(`   📁 数据文件 : ${DATA_FILE}`);
  console.log(`   📦 自动备份 : ${BACKUP_DIR}`);
  console.log("");

  // 列出所有内网 IP
  try {
    const { networkInterfaces } = require("os");
    const nets = networkInterfaces();
    const ips = [];
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (net.family === "IPv4" && !net.internal) {
          ips.push(net.address);
        }
      }
    }
    if (ips.length > 0) {
      console.log("   👥 同事访问地址：");
      ips.forEach(ip => console.log(`      http://${ip}:${PORT}`));
    }
  } catch (_) {}

  console.log("");
  console.log("   按 Ctrl+C 停止服务");
  console.log("══════════════════════════════════════════");
  console.log("");
});
