const cloud = require('wx-server-sdk');
const { createHandler } = require('./handler');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const repository = {
  async get(collection, id) {
    const { data } = await db.collection(collection).where({ _id: id }).limit(1).get();
    return data[0] || null;
  },
  async listRoutes() {
    const { data } = await db.collection('routes').where({ published: true, approved: true }).limit(50).get();
    return data;
  },
  async create(collection, document) {
    try {
      await db.collection(collection).add({ data: document });
      return document;
    } catch (error) {
      // 唯一 _id 冲突时返回已存记录；网络故障且未写入则继续抛错。
      const existing = await this.get(collection, document._id);
      if (existing) return existing;
      throw error;
    }
  },
};

const handle = createHandler(repository, {
  appId: process.env.WUFANG_APP_ID,
  privacyVersion: process.env.WUFANG_PRIVACY_VERSION,
});

exports.main = async event => {
  try { return await handle(event, cloud.getWXContext()); }
  catch (_) {
    // 不记录客户姓名、手机号、OPENID、表单原文或密钥。
    console.error('wufangApi request failed');
    return { ok: false, code: 'SERVICE_UNAVAILABLE' };
  }
};
