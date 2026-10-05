// AppID、环境 ID 不是密钥。支付私钥、APIv3 密钥只配置在服务端。
module.exports = {
  mode: 'preview', // 联调后改为 cloud；正式版禁止使用 preview 数据。
  environments: { develop: '', trial: '', release: '' },
  functionName: 'wufangApi',
  privacyVersion: '', // 甲方确认并在平台登记后的版本号。
  privacyText: '', // 与平台隐私保护指引一致的确认正文。
  supportPhone: '',
};
