# 强了么 Day 1 技术规格文档

**版本:** v1.0  
**日期:** 2026-07-06  
**目标:** 用户能选日期+时间，看到该时段有哪些场馆有空位

---

## 一、数据库 Schema（D1）

### 1.1 表结构

```sql
-- 1. 场馆表（现有，补充字段）
CREATE TABLE venues (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  sport_type TEXT,  -- 网球、羽毛球等
  venue_type TEXT,  -- indoor / outdoor
  difficulty_level TEXT,  -- easy / medium / hard
  amenities TEXT,  -- JSON: ["停车位", "淋浴间", "餐厅"]
  week_pattern TEXT,  -- JSON: 排期模板
  booking_links TEXT,  -- JSON: 多平台预约链接
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. 场馆排期表（P0 新增 - 最关键）
CREATE TABLE venue_schedules (
  id INTEGER PRIMARY KEY,
  venue_id INTEGER NOT NULL,
  date TEXT NOT NULL,  -- YYYY-MM-DD
  time_slot TEXT NOT NULL,  -- HH:MM-HH:MM 格式，如 "08:00-09:00"
  capacity INTEGER DEFAULT 1,
  available_slots INTEGER NOT NULL,
  source TEXT DEFAULT 'system',  -- 'system' / 'manual' / 'feedback'
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (venue_id) REFERENCES venues(id),
  UNIQUE(venue_id, date, time_slot)
);

-- 3. 用户众包反馈表
CREATE TABLE user_feedbacks (
  id INTEGER PRIMARY KEY,
  user_id TEXT NOT NULL,
  venue_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  time_slot TEXT NOT NULL,
  has_availability BOOLEAN,
  quality_score INTEGER,  -- 1-5 星
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (venue_id) REFERENCES venues(id)
);

-- 4. 企业微信群映射表
CREATE TABLE venue_groups (
  id INTEGER PRIMARY KEY,
  venue_id INTEGER NOT NULL,
  wechat_group_id TEXT,
  member_count INTEGER DEFAULT 0,
  last_activity_at TIMESTAMP,
  FOREIGN KEY (venue_id) REFERENCES venues(id)
);

-- 5. 用户偏好表（个性化推荐用）
CREATE TABLE user_preferences (
  id INTEGER PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  favorite_venue_ids TEXT,  -- JSON array
  preferred_locations TEXT,  -- JSON array
  preferred_difficulty TEXT,
  preferred_time_slots TEXT,  -- JSON array
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 1.2 初始化脚本（Day 1 冷启动数据）

```sql
-- 插入 5 个示范场馆
INSERT INTO venues VALUES 
  (1, '浦东网球中心', 'Shanghai-Pudong', 'Tennis', 'outdoor', 'medium', 
   '["停车位", "淋浴间", "餐厅"]',
   '{"weekdays": {"open": "07:00", "close": "22:00"}, "weekends": {"open": "06:00", "close": "23:00"}}',
   '{"airbnb": "https://example.com/1", "didi": "https://example.com/2"}',
   CURRENT_TIMESTAMP);

-- 为每个场馆生成 28 天排期（4 周 × 7 天）
-- 脚本逻辑（伪代码）：
-- FOR each venue in venues:
--   FOR date in 2026-07-06 .. 2026-08-02:
--     FOR hour in [08, 09, 10, 11, 14, 16, 18]:  // 每天 7 个时段
--       INSERT INTO venue_schedules 
--         (venue_id, date, time_slot, capacity, available_slots, source)
--       VALUES 
--         (venue.id, date, hour||':00-'||(hour+1)||':00', 1, 1, 'system');
```

---

## 二、BFF 时间查询端点

### 2.1 接口规格

**端点:** `GET /api/v1/venues`

**请求参数:**
```json
{
  "date": "2026-07-10",           // 必填
  "time_slot": "08:00",           // 必填，HH:MM 格式
  "location": "Shanghai-Pudong",  // 可选
  "venue_type": "outdoor",        // 可选
  "difficulty": "medium",         // 可选
  "services": ["停车位", "淋浴间"],  // 可选
  "limit": 20,                    // 可选，默认 20
  "offset": 0                     // 可选，默认 0
}
```

**响应示例:**
```json
{
  "ok": true,
  "data": {
    "total": 12,
    "venues": [
      {
        "id": 1,
        "name": "浦东网球中心",
        "location": "Shanghai-Pudong",
        "venue_type": "outdoor",
        "difficulty": "medium",
        "amenities": ["停车位", "淋浴间", "餐厅"],
        "schedule_preview": {
          "date": "2026-07-10",
          "time_slot": "08:00-09:00",
          "available_slots": 1,
          "capacity": 1
        },
        "available_slots_this_week": [
          { "time_slot": "08:00-09:00", "available": true },
          { "time_slot": "09:00-10:00", "available": true },
          { "time_slot": "10:00-11:00", "available": false }
        ],
        "feedback": {
          "avg_quality": 4.2,
          "total_feedbacks": 12,
          "availability_accuracy": 0.92
        },
        "group_info": {
          "member_count": 25,
          "wechat_group_id": "xxx"
        },
        "booking_links": {
          "airbnb": "https://example.com/1",
          "didi": "https://example.com/2"
        },
        "user_tags": {
          "is_favorited": false,
          "is_group_member": false
        }
      }
    ]
  }
}
```

### 2.2 后端实现（Cloudflare Worker）

```javascript
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    if (url.pathname === '/api/v1/venues' && request.method === 'GET') {
      const params = new URLSearchParams(url.search);
      const date = params.get('date');
      const timeSlot = params.get('time_slot');
      
      if (!date || !timeSlot) {
        return new Response(JSON.stringify({ 
          ok: false, 
          error: 'date and time_slot required' 
        }), { status: 400 });
      }

      const db = env.DB;
      
      // (1) 查询基础场馆数据 + 筛选
      let sql = `
        SELECT id, name, location, venue_type, difficulty_level, amenities, booking_links
        FROM venues
        WHERE 1=1
      `;
      const sqlParams = [];
      
      if (params.get('location')) {
        sql += ` AND location = ?`;
        sqlParams.push(params.get('location'));
      }
      if (params.get('venue_type')) {
        sql += ` AND venue_type = ?`;
        sqlParams.push(params.get('venue_type'));
      }
      
      const venues = await db.prepare(sql).bind(...sqlParams).all();
      
      // (2) 为每个场馆查询排期 + 反馈 + 社群
      const result = await Promise.all(
        venues.results.map(async (venue) => {
          // 查该时段排期
          const schedule = await db.prepare(`
            SELECT time_slot, available_slots, capacity
            FROM venue_schedules
            WHERE venue_id = ? AND date = ? AND time_slot >= ?
            ORDER BY time_slot
            LIMIT 1
          `).bind(venue.id, date, timeSlot + ':00').first();
          
          // 查本周其他时段（辅助用户选择）
          const weekSlots = await db.prepare(`
            SELECT time_slot, available_slots
            FROM venue_schedules
            WHERE venue_id = ? AND date >= ? AND date < date(?, '+7 days')
            ORDER BY date, time_slot
          `).bind(venue.id, date, date).all();
          
          // 查众包反馈
          const feedback = await db.prepare(`
            SELECT 
              ROUND(AVG(quality_score), 1) as avg_quality,
              COUNT(*) as total_feedbacks
            FROM user_feedbacks
            WHERE venue_id = ? AND date = ?
          `).bind(venue.id, date).first();
          
          // 查社群信息
          const group = await db.prepare(`
            SELECT member_count, wechat_group_id FROM venue_groups 
            WHERE venue_id = ?
          `).bind(venue.id).first();
          
          return {
            ...venue,
            amenities: venue.amenities ? JSON.parse(venue.amenities) : [],
            booking_links: venue.booking_links ? JSON.parse(venue.booking_links) : {},
            schedule_preview: schedule || { available_slots: 0 },
            available_slots_this_week: weekSlots.results.map(s => ({
              time_slot: s.time_slot,
              available: s.available_slots > 0
            })),
            feedback: feedback || { avg_quality: 0, total_feedbacks: 0 },
            group_info: group || { member_count: 0 },
            user_tags: {
              is_favorited: false,
              is_group_member: false
            }
          };
        })
      );
      
      return new Response(JSON.stringify({ 
        ok: true, 
        data: { total: result.length, venues: result }
      }), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }
};
```

---

## 三、前端交互实现

### 3.1 HTML + CSS + JS（更新 demo.html）

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>强了么 - 找场馆</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #f5f5f5; }
    .container { max-width: 800px; margin: 0 auto; padding: 20px; }
    
    .search-section { background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
    .search-section h2 { font-size: 18px; margin-bottom: 15px; color: #333; }
    
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px; }
    .form-group { display: flex; flex-direction: column; }
    .form-group label { font-size: 12px; font-weight: 600; color: #666; margin-bottom: 8px; }
    .form-group input, .form-group select { padding: 10px; border: 1px solid #ddd; border-radius: 4px; }
    
    .time-picker { margin-bottom: 15px; }
    .time-picker label { font-size: 12px; font-weight: 600; color: #666; margin-bottom: 10px; display: block; }
    .time-slots { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
    .time-btn { 
      padding: 8px; border: 1px solid #ddd; border-radius: 4px; 
      background: white; cursor: pointer; font-size: 14px;
      transition: all 0.3s;
    }
    .time-btn.active { background: #1890ff; color: white; border-color: #1890ff; }
    .time-btn:hover { border-color: #1890ff; }
    
    .filters-panel { margin-bottom: 15px; }
    .filters-panel label { font-size: 12px; font-weight: 600; color: #666; margin-bottom: 10px; display: block; }
    .filter-group { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
    .filter-group label { display: flex; align-items: center; gap: 8px; font-weight: 400; }
    
    .btn-search { 
      width: 100%; padding: 12px; background: #1890ff; color: white; 
      border: none; border-radius: 4px; font-size: 16px; font-weight: 600; cursor: pointer;
    }
    .btn-search:hover { background: #1575d9; }
    
    .venues-list { display: grid; gap: 15px; }
    .venue-card { 
      background: white; border-radius: 8px; padding: 16px; 
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .venue-card h3 { font-size: 16px; margin-bottom: 10px; color: #333; }
    .venue-card p { font-size: 13px; color: #666; margin-bottom: 8px; }
    .venue-card .venue-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px; }
    .venue-card .actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .btn-action { 
      padding: 8px; border: none; border-radius: 4px; font-size: 13px; cursor: pointer;
      transition: all 0.3s;
    }
    .btn-group { background: #f0f0f0; color: #333; }
    .btn-book { background: #1890ff; color: white; }
    .btn-book:hover { background: #1575d9; }
  </style>
</head>
<body>
  <div class="container">
    <h1 style="text-align: center; margin-bottom: 30px;">⚾ 强了么 - 找场馆</h1>

    <div class="search-section">
      <h2>🔍 查询可用场馆</h2>
      
      <div class="form-row">
        <div class="form-group">
          <label>选择日期</label>
          <input type="date" id="dateInput" value="2026-07-10">
        </div>
      </div>

      <div class="time-picker">
        <label>选择时间（小时）</label>
        <div class="time-slots" id="timeSlots">
          <button class="time-btn active" data-hour="08">08:00</button>
          <button class="time-btn" data-hour="09">09:00</button>
          <button class="time-btn" data-hour="10">10:00</button>
          <button class="time-btn" data-hour="11">11:00</button>
          <button class="time-btn" data-hour="14">14:00</button>
          <button class="time-btn" data-hour="16">16:00</button>
          <button class="time-btn" data-hour="18">18:00</button>
          <button class="time-btn" data-hour="20">20:00</button>
        </div>
      </div>

      <div class="filters-panel">
        <label>进阶筛选</label>
        <div class="filter-group">
          <label><input type="checkbox" value="停车位" class="filter-checkbox"> 停车位</label>
          <label><input type="checkbox" value="淋浴间" class="filter-checkbox"> 淋浴间</label>
          <label><input type="checkbox" value="室内" class="filter-checkbox"> 室内</label>
          <label><input type="checkbox" value="室外" class="filter-checkbox"> 室外</label>
        </div>
      </div>

      <button class="btn-search" onclick="handleSearch()">搜索场馆</button>
    </div>

    <div class="venues-list" id="venuesList">
      <!-- 场馆卡片会动态插入这里 -->
    </div>
  </div>

  <script>
    // 时间按钮点击切换
    document.querySelectorAll('.time-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
      });
    });

    async function handleSearch() {
      const date = document.getElementById('dateInput').value;
      const timeSlot = document.querySelector('.time-btn.active').dataset.hour || '08';
      const services = Array.from(document.querySelectorAll('.filter-checkbox:checked'))
        .map(el => el.value);

      const params = new URLSearchParams({
        date,
        time_slot: timeSlot + ':00'
      });

      if (services.length > 0) {
        params.append('services', JSON.stringify(services));
      }

      try {
        const response = await fetch(`/api/v1/venues?${params}`);
        if (!response.ok) throw new Error('API 查询失败');
        
        const data = await response.json();
        renderVenues(data.data.venues);
      } catch (error) {
        console.error(error);
        alert('查询失败，请稍后重试');
      }
    }

    function renderVenues(venues) {
      const container = document.getElementById('venuesList');
      
      if (venues.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999;">该时段暂无可用场馆</p>';
        return;
      }

      container.innerHTML = venues.map(v => `
        <div class="venue-card">
          <h3>${v.name}</h3>
          <div class="venue-meta">
            <p>📍 ${v.location}</p>
            <p>🏆 ${v.difficulty || 'N/A'}</p>
          </div>
          <div class="venue-meta">
            <p>⏰ ${v.schedule_preview.time_slot}: ${v.schedule_preview.available_slots} 个空位</p>
            <p>⭐ ${(v.feedback.avg_quality || 0).toFixed(1)} 分 (${v.feedback.total_feedbacks || 0} 条评价)</p>
          </div>
          <p>👥 ${v.group_info?.member_count || 0} 人已加群</p>
          <div class="actions">
            <button class="btn-action btn-group" onclick="alert('企业微信群链接')">加入球友群</button>
            <button class="btn-action btn-book" onclick="alert('跳转预约页面')">立即预约</button>
          </div>
        </div>
      `).join('');
    }

    // 页面加载时默认查询一次
    window.addEventListener('load', () => {
      handleSearch();
    });
  </script>
</body>
</html>
```

---

## 四、成功验收标准

| 组件 | 验收标准 |
|------|--------|
| **D1 数据库** | ✅ 5 张表创建成功，5 个场馆 × 28 天排期 = 840+ 行数据 |
| **BFF 端点** | ✅ Postman 查询 `/api/v1/venues?date=2026-07-10&time_slot=08:00`，返回 JSON 响应 |
| **前端选择器** | ✅ 打开 demo.html，选择日期和时间，点搜索，看到场馆卡片列表 |
| **场馆卡片** | ✅ 卡片显示「⏰ 时段信息」、「⭐ 评分」、「👥 群成员数」、「加群+预约」按钮 |

---

## 五、常见问题 & 应对方案

### Q1: 查询太慢（API 响应 5 秒+）
**解决:**
- 给 venue_schedules 加复合索引: `CREATE INDEX idx_vs ON venue_schedules(venue_id, date, time_slot);`
- API 层做缓存（按日期维度，24h TTL）
- 降级方案：如果查询 > 2s，返回缓存数据

### Q2: 众包反馈为空
**解决:**
- 第一天手工插入 20 条示范反馈到 user_feedbacks 表
- 标签改为「系统推荐」而非「用户评分」

### Q3: 跨域请求失败 (CORS)
**解决:**
- Worker 响应头加 `Access-Control-Allow-Origin: *`

### Q4: 日期输入超出范围
**解决:**
- 前端 input 加 `min="2026-07-06"` 和 `max="2026-08-02"`（4 周范围）

---

**下一步:** 拿这份规格开始编码，Day 1 目标是「链路通」，不追求完美。
