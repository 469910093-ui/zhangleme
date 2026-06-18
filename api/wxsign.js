// Vercel Serverless Function — 微信 JS-SDK 签名接口
const https = require('https');
const crypto = require('crypto');

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { reject(e); }
      });
    }).on('error', reject);
  });
}

// 内存缓存 access_token（有效期7200s，提前5分钟刷新）
let tokenCache = { value: '', expireAt: 0 };
let ticketCache = { value: '', expireAt: 0 };

async function getAccessToken() {
  const now = Date.now();
  if (tokenCache.value && now < tokenCache.expireAt) return tokenCache.value;
  const appId = process.env.WX_APPID;
  const secret = process.env.WX_APPSECRET;
  const res = await httpsGet(`https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${secret}`);
  if (!res.access_token) throw new Error('获取 access_token 失败: ' + JSON.stringify(res));
  tokenCache = { value: res.access_token, expireAt: now + (res.expires_in - 300) * 1000 };
  return tokenCache.value;
}

async function getJsTicket() {
  const now = Date.now();
  if (ticketCache.value && now < ticketCache.expireAt) return ticketCache.value;
  const token = await getAccessToken();
  const res = await httpsGet(`https://api.weixin.qq.com/cgi-bin/ticket/getticket?access_token=${token}&type=jsapi`);
  if (!res.ticket) throw new Error('获取 jsticket 失败: ' + JSON.stringify(res));
  ticketCache = { value: res.ticket, expireAt: now + (res.expires_in - 300) * 1000 };
  return ticketCache.value;
}

function sign(ticket, nonceStr, timestamp, url) {
  const str = `jsapi_ticket=${ticket}&noncestr=${nonceStr}&timestamp=${timestamp}&url=${url}`;
  return crypto.createHash('sha1').update(str).digest('hex');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = req.query.url;
  if (!url) return res.status(400).json({ error: 'url 参数缺失' });

  try {
    const ticket = await getJsTicket();
    const nonceStr = Math.random().toString(36).slice(2, 18);
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = sign(ticket, nonceStr, timestamp, url);
    res.status(200).json({
      appId: process.env.WX_APPID,
      timestamp,
      nonceStr,
      signature,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
