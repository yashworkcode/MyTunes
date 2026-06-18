/* ╔══════════════════════════════════════════╗
   ║   MyTunes — Auth Page Logic              ║
   ╚══════════════════════════════════════════╝ */

// Redirect to app if already logged in
if (Auth.isLoggedIn()) {
  window.location.href = 'pages/home.html';
}

function switchTab(tab) {
  qs('#tab-login').classList.toggle('active', tab === 'login');
  qs('#tab-register').classList.toggle('active', tab === 'register');
  qs('#login-fields').classList.toggle('hidden', tab !== 'login');
  qs('#register-fields').classList.toggle('hidden', tab !== 'register');
  qs('#auth-err').textContent = '';
}

function setLoading(btn, loading, label) {
  btn.disabled = loading;
  btn.innerHTML = loading ? `<span class="spinner"></span> ${label}…` : label;
}

async function doLogin() {
  const email = qs('#login-email').value.trim();
  const pass  = qs('#login-pass').value;
  const errEl = qs('#auth-err');
  errEl.textContent = '';

  if (!email || !pass) { errEl.textContent = 'Please fill in all fields.'; return; }

  const btn = qs('#login-btn');
  setLoading(btn, true, 'Signing in');
  try {
    const res = await api.auth.login({ email, password: pass });
    Auth.setToken(res.token);
    Auth.setUser(res.user);
    window.location.href = 'pages/home.html';
  } catch (err) {
    errEl.textContent = err.message;
  } finally {
    setLoading(btn, false, 'Sign In');
  }
}

async function doRegister() {
  const username = qs('#reg-user').value.trim();
  const email    = qs('#reg-email').value.trim();
  const pass     = qs('#reg-pass').value;
  const pass2    = qs('#reg-pass2').value;
  const errEl    = qs('#auth-err');
  errEl.textContent = '';

  if (!username || !email || !pass) { errEl.textContent = 'Please fill in all fields.'; return; }
  if (pass !== pass2) { errEl.textContent = "Passwords don't match."; return; }
  if (pass.length < 6) { errEl.textContent = 'Password must be at least 6 characters.'; return; }

  const btn = qs('#register-btn');
  setLoading(btn, true, 'Creating account');
  try {
    const res = await api.auth.register({ username, email, password: pass });
    Auth.setToken(res.token);
    Auth.setUser(res.user);
    window.location.href = 'pages/home.html';
  } catch (err) {
    errEl.textContent = err.message;
  } finally {
    setLoading(btn, false, 'Create Account');
  }
}
