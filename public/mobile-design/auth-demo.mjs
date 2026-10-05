import { brandLogo, icon } from './components.mjs';

// Interaction demo only. No authentication requests, tokens or phone persistence.
export const DEMO_CODE = '246810';
const SESSION_KEY = 'wufang.demo-profile.v1';
export const validPhone = phone => /^1\d{10}$/.test(phone);
export const maskedPhone = phone => `${phone.slice(0, 3)} ${'•'.repeat(4)} ${phone.slice(-4)}`;
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function readDemoProfile() {
  try {
    const profile = JSON.parse(sessionStorage.getItem(SESSION_KEY));
    return profile?.demo === true && typeof profile.nickname === 'string' && profile.nickname.trim() && profile.nickname.length <= 20 ? { nickname: profile.nickname, demo: true } : null;
  } catch { return null; }
}
export function clearDemoProfile() { try { sessionStorage.removeItem(SESSION_KEY); } catch { /* In-memory mode still works. */ } }
export function validateDemoCode(phone, code, requested) {
  if (!validPhone(phone)) return '请填写正确的 11 位手机号。';
  if (!requested) return '请先获取演示验证码。';
  return code === DEMO_CODE ? '' : `验证码不正确。本地体验请填写 ${DEMO_CODE}。`;
}

export function accountHeader(profile) {
  if (!profile) return `<div class="account-welcome"><p>你的下一程，从这里开始。</p><h1>把想走的路，<br>留在这里。</h1><button class="account-login" data-action="login">登录 / 注册 ${icon('arrow')}</button><span>也可以先看看路线，不必急着登录。</span></div>`;
  return `<div class="account-profile"><span class="account-avatar" aria-hidden="true">${escape([...profile.nickname][0])}</span><div><h1>${escape(profile.nickname)}</h1><p>演示账号 · 仅当前浏览器会话</p></div></div><button class="account-logout" data-action="logout">退出登录</button>`;
}

export function mountAuth(container, { onComplete, onBack }) {
  let mode = 'login', step = 'phone', phone = '', requested = false;
  function finish(nickname) {
    const profile = { nickname, demo: true };
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(profile)); } catch { /* Session remains in memory when storage is unavailable. */ }
    onComplete(profile, mode);
  }
  function render() {
    const register = mode === 'register';
    const heading = step === 'code' ? '输入验证码。' : step === 'profile' ? '怎么称呼你？' : register ? '从此，一起出发。' : '欢迎回到无方。';
    const description = step === 'code' ? `验证手机号 ${maskedPhone(phone)}` : step === 'profile' ? '留下一个昵称，让下一次相遇更亲切。' : register ? '用手机号，开启你的无方旅程。' : '登录后，继续计划你的下一程。';
    const field = step === 'phone' ? `<label for="auth-phone">手机号</label><div class="auth-phone-field"><span>+86</span><input id="auth-phone" name="phone" type="tel" inputmode="numeric" autocomplete="tel-national" maxlength="11" placeholder="输入 11 位手机号" value="${phone}" aria-describedby="auth-error auth-demo-note" /></div>` : step === 'code' ? `<label for="auth-code">6 位验证码</label><input class="auth-code" id="auth-code" name="code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="输入验证码" aria-describedby="auth-error auth-demo-note" /><p class="auth-code-hint">本地演示验证码：<strong>${DEMO_CODE}</strong><br>没有发送短信，请直接输入上方号码。</p><button type="button" class="auth-text-button" data-auth="change-phone">更换手机号</button>` : `<label for="auth-nickname">昵称</label><input id="auth-nickname" name="nickname" autocomplete="nickname" maxlength="20" placeholder="希望同行者怎么称呼你" aria-describedby="auth-error" />`;
    container.innerHTML = `<section class="screen is-active auth-screen"><header class="auth-topbar"><button class="icon-btn" data-auth="back" aria-label="返回">${icon('back')}</button><span>${register ? '注册' : '登录'}</span><button class="auth-browse" data-auth="browse">先逛逛</button></header>
      <div class="auth-content">${brandLogo()}<h1>${heading}</h1><p class="auth-intro">${description}</p><form id="auth-form" novalidate>${field}<p class="auth-error" id="auth-error" role="alert"></p><button class="auth-submit" type="submit">${step === 'phone' ? '获取验证码' : step === 'profile' ? '完成注册' : register ? '下一步' : '登录'} ${icon('arrow')}</button></form>
      ${step === 'phone' ? `<button class="auth-text-button auth-fill" data-auth="demo-phone">使用演示号码</button><p class="auth-switch">${register ? '已有账号？' : '第一次来无方？'}<button data-auth="switch">${register ? '去登录' : '注册账号'}</button></p>` : ''}
      <p class="auth-demo-note" id="auth-demo-note">当前为本地交互体验。<br>不发送短信，不创建真实账号，不保存手机号。</p></div></section>`;
    const form = container.querySelector('#auth-form');
    const error = container.querySelector('#auth-error');
    function showError(message) { error.textContent = message; const input = form.querySelector('input'); input.setAttribute('aria-invalid', 'true'); input.focus(); }
    form.addEventListener('input', () => { error.textContent = ''; form.querySelector('input').removeAttribute('aria-invalid'); });
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (step === 'phone') {
        phone = form.elements.phone.value.trim();
        if (!validPhone(phone)) return showError('请填写正确的 11 位手机号。');
        requested = true; step = 'code'; render();
      } else if (step === 'code') {
        const message = validateDemoCode(phone, form.elements.code.value.trim(), requested);
        if (message) return showError(message);
        if (register) { step = 'profile'; render(); } else finish(readDemoProfile()?.nickname || '无方旅人');
      } else {
        const nickname = form.elements.nickname.value.trim();
        if (!nickname || nickname.length > 20) return showError('请填写 1–20 个字的昵称。');
        finish(nickname);
      }
    });
    container.querySelectorAll('[data-auth]').forEach(button => button.addEventListener('click', () => {
      const action = button.dataset.auth;
      if (action === 'browse' || (action === 'back' && step === 'phone')) return onBack();
      if (action === 'demo-phone') { form.elements.phone.value = '13800000000'; error.textContent = ''; form.elements.phone.removeAttribute('aria-invalid'); return; }
      if (action === 'switch') { mode = register ? 'login' : 'register'; phone = ''; requested = false; }
      if (action === 'back') step = step === 'profile' ? 'code' : 'phone';
      if (action === 'change-phone') { step = 'phone'; requested = false; }
      render();
    }));
    const title = container.querySelector('h1'); title.tabIndex = -1; title.focus({ preventScroll: true });
  }
  render();
}
