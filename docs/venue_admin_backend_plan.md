# 涨了么场馆主后台方案

**版本:** v1.0  
**目标:** 30 秒内完成排期设置，激励场馆主持续更新

---

## 一、场馆主后台 H5 完整代码

**URL:** `https://admin.zhang.me/venue-schedule`

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>涨了么 - 场馆主排期管理</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }

    .container { max-width: 600px; margin: 0 auto; }

    /* 顶部激励展示 */
    .header {
      background: white;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 20px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      text-align: center;
    }

    .header h1 { font-size: 24px; color: #333; margin-bottom: 10px; }
    .header p { color: #999; font-size: 13px; margin-bottom: 20px; }

    .incentive-card {
      background: linear-gradient(135deg, #ffd89b 0%, #19547b 100%);
      border-radius: 8px;
      padding: 16px;
      color: white;
      margin-bottom: 10px;
    }

    .incentive-card .label { font-size: 12px; opacity: 0.9; margin-bottom: 6px; }
    .incentive-card .value { font-size: 24px; font-weight: 700; }

    /* 表单区域 */
    .section {
      background: white;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 15px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }

    .section h2 {
      font-size: 16px;
      color: #333;
      margin-bottom: 15px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .form-group { margin-bottom: 16px; }
    .form-group label {
      display: block;
      font-size: 12px;
      color: #666;
      margin-bottom: 8px;
      font-weight: 600;
    }

    .form-group input,
    .form-group select {
      width: 100%;
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
      transition: all 0.3s;
    }

    .form-group input:focus,
    .form-group select:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 8px rgba(102, 126, 234, 0.2);
    }

    /* 周日期选择 */
    .week-pattern {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 16px;
    }

    .week-day {
      aspect-ratio: 1;
      border: 2px solid #ddd;
      border-radius: 8px;
      padding: 8px;
      text-align: center;
      cursor: pointer;
      transition: all 0.3s;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: 600;
      color: #666;
      background: white;
    }

    .week-day:hover { border-color: #667eea; }
    .week-day.active {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-color: #667eea;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }

    /* 时间设置 */
    .time-inputs {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 16px;
    }

    /* 时段时长选择 */
    .slot-duration { margin-bottom: 16px; }
    .slot-duration label { display: block; font-size: 12px; color: #666; margin-bottom: 8px; font-weight: 600; }
    .slot-duration select { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; }

    /* 黑名单日期 */
    .blackout-dates { margin-bottom: 16px; }
    .blackout-dates label { display: block; font-size: 12px; color: #666; margin-bottom: 8px; font-weight: 600; }
    .blackout-dates input { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; }
    .blackout-dates .hint { font-size: 11px; color: #999; margin-top: 6px; }

    /* 按钮组 */
    .btn-group {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 20px;
    }

    .btn {
      padding: 14px;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
    }

    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
    }

    .btn-secondary {
      background: #f0f0f0;
      color: #333;
    }

    .btn-secondary:hover { background: #e0e0e0; }

    /* 预览框 */
    .preview-box {
      background: #f9f9f9;
      border: 1px solid #eee;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 20px;
      display: none;
    }

    .preview-box.active { display: block; }
    .preview-box h3 { font-size: 14px; color: #333; margin-bottom: 12px; }
    .preview-content { font-size: 13px; color: #666; line-height: 1.6; }
    .preview-content p { margin-bottom: 6px; }

    /* 成功提示 */
    .success-message {
      background: #d4edda;
      border: 1px solid #c3e6cb;
      color: #155724;
      padding: 12px;
      border-radius: 6px;
      margin-bottom: 16px;
      display: none;
    }

    .success-message.show { display: block; }

    /* 加载状态 */
    .loading { opacity: 0.6; pointer-events: none; }
  </style>
</head>
<body>
  <div class="container">
    <!-- 顶部激励展示 -->
    <div class="header">
      <h1>📅 排期管理</h1>
      <p>设置你的场地排期规律，系统每周自动生成排期</p>

      <div class="incentive-card">
        <div class="label">✅ 本周活跃度</div>
        <div class="value">3 / 5 ⭐</div>
      </div>
      <div class="incentive-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
        <div class="label">🏆 预约次数</div>
        <div class="value" id="bookingCount">5 次</div>
      </div>
    </div>

    <!-- 成功提示 -->
    <div class="success-message" id="successMessage">
      ✅ 排期已保存！系统会在周日夜晚自动为你生成下周排期。
    </div>

    <!-- 基本信息 -->
    <div class="section">
      <h2>🏟️ 场地信息</h2>
      <div class="form-group">
        <label>场地名称</label>
        <input type="text" id="venueName" value="浦东网球中心" disabled style="background: #f5f5f5; cursor: not-allowed;">
      </div>
      <div class="form-group">
        <label>运动类型</label>
        <select id="sportType" disabled style="background: #f5f5f5; cursor: not-allowed;">
          <option>网球</option>
        </select>
      </div>
    </div>

    <!-- 周排期模板 -->
    <div class="section">
      <h2>⏰ 我的排期规律</h2>
      <p style="font-size: 12px; color: #999; margin-bottom: 16px;">
        选择有排期的日期，系统每周按此规律自动生成排期
      </p>

      <div class="week-pattern" id="weekPattern">
        <div class="week-day active" data-day="0" data-name="Mon">周一</div>
        <div class="week-day active" data-day="1" data-name="Tue">周二</div>
        <div class="week-day active" data-day="2" data-name="Wed">周三</div>
        <div class="week-day active" data-day="3" data-name="Thu">周四</div>
        <div class="week-day active" data-day="4" data-name="Fri">周五</div>
        <div class="week-day" data-day="5" data-name="Sat">周六</div>
        <div class="week-day" data-day="6" data-name="Sun">周日</div>
      </div>

      <div class="time-inputs">
        <div class="form-group">
          <label>开场时间</label>
          <input type="time" id="openTime" value="07:00">
        </div>
        <div class="form-group">
          <label>闭场时间</label>
          <input type="time" id="closeTime" value="22:00">
        </div>
      </div>

      <div class="slot-duration">
        <label>时段时长</label>
        <select id="slotDuration">
          <option value="30">30 分钟 / 时段</option>
          <option value="60" selected>1 小时 / 时段</option>
          <option value="90">1.5 小时 / 时段</option>
        </select>
      </div>
    </div>

    <!-- 黑名单日期 -->
    <div class="section">
      <h2>⛔ 休馆日期</h2>
      <div class="blackout-dates">
        <label>输入休馆日期（用逗号分隔）</label>
        <input type="text" id="blackoutDates" placeholder="例: 2026-07-04, 2026-07-05">
        <div class="hint">提示：系统会跳过这些日期，不生成排期</div>
      </div>
    </div>

    <!-- 保存和预览按钮 -->
    <div class="btn-group">
      <button class="btn btn-primary" id="saveBtn" onclick="saveSchedule()">✅ 保存排期</button>
      <button class="btn btn-secondary" onclick="togglePreview()">👁️ 预览</button>
    </div>

    <!-- 预览框 -->
    <div class="preview-box" id="previewBox">
      <h3>📋 下周排期预览</h3>
      <div class="preview-content" id="previewContent"></div>
    </div>
  </div>

  <script>
    // 初始化事件监听
    document.querySelectorAll('.week-day').forEach(el => {
      el.addEventListener('click', function() {
        this.classList.toggle('active');
      });
    });

    function saveSchedule() {
      const btn = document.getElementById('saveBtn');
      btn.classList.add('loading');
      btn.disabled = true;

      const openTime = document.getElementById('openTime').value;
      const closeTime = document.getElementById('closeTime').value;
      const slotDuration = document.getElementById('slotDuration').value;
      const blackoutDates = document.getElementById('blackoutDates').value
        .split(',')
        .map(d => d.trim())
        .filter(d => d);

      const activeDays = Array.from(document.querySelectorAll('.week-day.active'))
        .map(el => el.dataset.name);

      if (activeDays.length === 0) {
        alert('⚠️ 请至少选择一个有排期的日期');
        btn.classList.remove('loading');
        btn.disabled = false;
        return;
      }

      const payload = {
        week_pattern: {
          active_days: activeDays,
          open_time: openTime,
          close_time: closeTime,
          slot_duration_minutes: parseInt(slotDuration)
        },
        blackout_dates: blackoutDates
      };

      // 模拟 API 请求
      fetch('/api/v1/venue-schedule/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(r => r.json())
      .then(data => {
        btn.classList.remove('loading');
        btn.disabled = false;

        if (data.ok) {
          document.getElementById('successMessage').classList.add('show');
          setTimeout(() => {
            document.getElementById('successMessage').classList.remove('show');
          }, 5000);
        }
      })
      .catch(err => {
        console.error(err);
        alert('❌ 保存失败，请稍后重试');
        btn.classList.remove('loading');
        btn.disabled = false;
      });
    }

    function togglePreview() {
      const previewBox = document.getElementById('previewBox');
      const openTime = document.getElementById('openTime').value;
      const closeTime = document.getElementById('closeTime').value;

      if (!previewBox.classList.contains('active')) {
        // 生成预览
        const activeDays = Array.from(document.querySelectorAll('.week-day.active'))
          .map(el => el.textContent);

        const preview = activeDays.map(day => {
          return `${day}: ${openTime}, ${String(parseInt(openTime) + 1).padStart(2, '0')}:00, ${String(parseInt(openTime) + 2).padStart(2, '0')}:00, ...`;
        }).join('<br/>');

        document.getElementById('previewContent').innerHTML = preview;
        previewBox.classList.add('active');
      } else {
        previewBox.classList.remove('active');
      }
    }
  </script>
</body>
</html>
```

---

## 二、后端 API（排期保存 + 自动生成）

### 2.1 排期保存接口

```javascript
// POST /api/v1/venue-schedule/update

export async function updateVenueSchedule(request, env) {
  const payload = await request.json();
  const venueId = 1;  // 从认证信息获取
  
  const db = env.DB;

  // (1) 保存 week_pattern 到 venues 表
  const weekPattern = JSON.stringify(payload.week_pattern);
  await db.prepare(`
    UPDATE venues
    SET week_pattern = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(weekPattern, venueId).run();

  // (2) 生成下周排期
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const schedules = generateSchedulesForWeek(
    venueId,
    tomorrow,
    payload.week_pattern,
    payload.blackout_dates
  );

  // (3) 批量插入排期（先删除旧排期）
  await db.prepare(`
    DELETE FROM venue_schedules
    WHERE venue_id = ? AND date >= ?
  `).bind(venueId, formatDate(tomorrow)).run();

  for (const schedule of schedules) {
    await db.prepare(`
      INSERT INTO venue_schedules 
        (venue_id, date, time_slot, capacity, available_slots, source)
      VALUES (?, ?, ?, 1, 1, 'system')
    `).bind(schedule.venue_id, schedule.date, schedule.time_slot).run();
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

function generateSchedulesForWeek(venueId, startDate, weekPattern, blackoutDates) {
  const schedules = [];
  const activeDays = new Set(weekPattern.active_days);
  const blackoutSet = new Set(blackoutDates);

  // 生成未来 4 周的排期
  for (let i = 0; i < 28; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = formatDate(date);

    // 检查黑名单
    if (blackoutSet.has(dateStr)) continue;

    const dayOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
    if (!activeDays.has(dayOfWeek)) continue;

    // 生成该天的时段
    const openHour = parseInt(weekPattern.open_time.split(':')[0]);
    const closeHour = parseInt(weekPattern.close_time.split(':')[0]);
    const duration = weekPattern.slot_duration_minutes;

    for (let hour = openHour; hour < closeHour; hour++) {
      const timeSlot = `${String(hour).padStart(2, '0')}:00-${String(hour + 1).padStart(2, '0')}:00`;
      schedules.push({
        venue_id: venueId,
        date: dateStr,
        time_slot: timeSlot
      });
    }
  }

  return schedules;
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
```

---

## 三、企业微信 Webhook 推送方案

### 3.1 日报推送脚本

```javascript
// scheduled-webhook-reminder.js
// 定时任务：每日 21:00 运行

export async function scheduledDailyReminder(event, env, ctx) {
  const db = env.DB;
  const WECHAT_WEBHOOK_URL = env.WECHAT_WEBHOOK_URL;
  const venueId = 1;

  // 获取明天的日期
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = formatDate(tomorrow);

  // 查询该场馆明天的排期数量
  const schedules = await db.prepare(`
    SELECT COUNT(*) as slot_count
    FROM venue_schedules
    WHERE venue_id = ? AND date = ? AND available_slots > 0
  `).bind(venueId, dateStr).first();

  if (!schedules || schedules.slot_count === 0) {
    console.log('明天无排期');
    return;
  }

  // 查询场馆主的企业微信 ID
  const owner = await db.prepare(`
    SELECT wechat_user_id FROM venue_owners WHERE venue_id = ?
  `).bind(venueId).first();

  if (!owner) return;

  // 发送消息
  const message = {
    msgtype: 'text',
    text: {
      content: `📢 排期提醒\n\n浦东网球中心，明天 (${dateStr}) 有 ${schedules.slot_count} 个时段有空位！\n\n赶紧打开后台更新排期吧 🚀\n\nhttps://admin.zhang.me/venue-schedule`,
      mentioned_user_list: [owner.wechat_user_id]
    }
  };

  await fetch(WECHAT_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message)
  });

  console.log('✅ 已推送排期提醒');
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
```

### 3.2 Cloudflare Cron Trigger 配置

在 `wrangler.toml` 中配置：

```toml
[triggers]
crons = ["0 21 * * *"]  # 每日 21:00 UTC（北京时间 +8 = 凌晨 5:00，需调整为 21:00 CET）
```

如果用北京时间，应改为 `1 13 * * *`（即北京时间 21:00）。

---

## 四、激励展示逻辑

场馆主后台顶部显示的激励卡片数据来源：

```sql
-- 查询本周活跃度
SELECT 
  COUNT(DISTINCT date) as active_days,  -- 更新了排期的日期数
  SUM(CASE WHEN available_slots > 0 THEN 1 ELSE 0 END) as slot_count,  -- 可用时段总数
  (SELECT COUNT(*) FROM user_feedbacks WHERE venue_id = ? AND date >= DATE('now', '-7 days')) as feedback_count
FROM venue_schedules
WHERE venue_id = ? AND date >= DATE('now', '-7 days');

-- 查询本周预约次数（聚合所有预约平台）
SELECT COUNT(*) as booking_count
FROM bookings  -- 假设有这个表，聚合多平台数据
WHERE venue_id = ? AND date >= DATE('now', '-7 days');
```

**激励规则：**
- 🟢 活跃度 5/5：每天都更新排期
- 🟡 活跃度 3/5：至少 3 天更新排期
- 🔴 活跃度 1/5：少于 3 天更新排期

---

## 五、冷启动策略

**Week 1 目标：** 至少 5 个场馆主注册并设置排期

1. **手工邀请** — 联系你认识的 5 个网球馆老板，演示后台，帮他们填表
2. **激励补贴** — 前 10 个注册的场馆主，免费获得 1 周「首页置顶展位」
3. **客服支持** — 提供电话/微信支持，解答排期设置问题

---

**关键成功因素：**
- ✅ 排期输入流程 ≤ 2 分钟（用户体验)
- ✅ 激励卡片实时反馈（驱动动力）
- ✅ 企业微信自动提醒（提高复购）
- ✅ 手工冷启动（第一批种子用户）
