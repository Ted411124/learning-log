(() => {
  const setupNotice = document.querySelector('#setup-notice');
  const authPanel = document.querySelector('#auth-panel');
  const appPanel = document.querySelector('#app-panel');
  const authForm = document.querySelector('#auth-form');
  const authMessage = document.querySelector('#auth-message');
  const authSubmit = document.querySelector('#auth-submit');
  const loginTab = document.querySelector('#login-tab');
  const signupTab = document.querySelector('#signup-tab');
  const authTitle = document.querySelector('#auth-title');
  const authDescription = document.querySelector('#auth-description');
  const passwordInput = document.querySelector('#auth-password');
  const logForm = document.querySelector('#log-form');
  const logMessage = document.querySelector('#log-message');
  const saveButton = document.querySelector('#save-button');
  const recordsList = document.querySelector('#records-list');
  const recordsStatus = document.querySelector('#records-status');
  const recordCount = document.querySelector('#record-count');
  const userEmail = document.querySelector('#user-email');
  let supabaseClient;
  let authMode = 'login';
  let currentUser = null;

  function setMessage(element, message, isError = false) {
    element.textContent = message;
    element.classList.toggle('error', isError);
  }

  function isConfigured() {
    return typeof SUPABASE_URL === 'string' && typeof SUPABASE_PUBLISHABLE_KEY === 'string' &&
      SUPABASE_URL.startsWith('https://') && !SUPABASE_URL.includes('貼上') &&
      SUPABASE_PUBLISHABLE_KEY.length > 20 && !SUPABASE_PUBLISHABLE_KEY.includes('貼上');
  }

  function setAuthMode(mode) {
    authMode = mode;
    const isLogin = mode === 'login';
    loginTab.classList.toggle('active', isLogin);
    signupTab.classList.toggle('active', !isLogin);
    loginTab.setAttribute('aria-selected', String(isLogin));
    signupTab.setAttribute('aria-selected', String(!isLogin));
    authTitle.textContent = isLogin ? '歡迎回來' : '建立你的帳戶';
    authDescription.textContent = isLogin ? '登入後繼續你的學習旅程。' : '開始收藏每一天的學習進度。';
    authSubmit.textContent = isLogin ? '登入' : '註冊帳戶';
    passwordInput.autocomplete = isLogin ? 'current-password' : 'new-password';
    setMessage(authMessage, '');
  }

  function showSignedIn(user) {
    currentUser = user;
    authPanel.hidden = Boolean(user);
    appPanel.hidden = !user;
    if (user) {
      userEmail.textContent = user.email || '';
      document.querySelector('#log-date').value = localDateString();
      loadRecords();
    } else {
      recordsList.replaceChildren();
      recordCount.textContent = '0 筆';
    }
  }

  function localDateString() {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 10);
  }

  function formatDate(dateString) {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Intl.DateTimeFormat('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(year, month - 1, day));
  }

  function createRecordCard(record) {
    const card = document.createElement('article');
    card.className = 'record-card';

    const top = document.createElement('div');
    top.className = 'record-top';
    const date = document.createElement('time');
    date.className = 'record-date';
    date.dateTime = record.log_date;
    date.textContent = formatDate(record.log_date);
    const duration = document.createElement('span');
    duration.className = 'record-duration';
    duration.textContent = `${record.minutes} 分鐘`;
    top.append(date, duration);

    const learningLabel = document.createElement('p');
    learningLabel.className = 'record-label';
    learningLabel.textContent = '今天學了什麼';
    const learning = document.createElement('p');
    learning.className = 'record-text';
    learning.textContent = record.learning;
    card.append(top, learningLabel, learning);

    if (record.stuck) {
      const stuckLabel = document.createElement('p');
      stuckLabel.className = 'record-label';
      stuckLabel.textContent = '卡在哪裡';
      const stuck = document.createElement('p');
      stuck.className = 'record-text record-stuck';
      stuck.textContent = record.stuck;
      card.append(stuckLabel, stuck);
    }

    const deleteButton = document.createElement('button');
    deleteButton.className = 'delete-button';
    deleteButton.type = 'button';
    deleteButton.textContent = '刪除這筆紀錄';
    deleteButton.addEventListener('click', () => deleteRecord(record.id, deleteButton));
    card.append(deleteButton);
    return card;
  }

  async function loadRecords() {
    if (!currentUser) return;
    recordsStatus.hidden = false;
    recordsStatus.textContent = '正在載入紀錄…';
    recordsList.replaceChildren();
    const { data, error } = await supabaseClient
      .from('learning_logs')
      .select('id, log_date, learning, minutes, stuck, created_at')
      .order('log_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (!currentUser) return;
    if (error) {
      recordsStatus.hidden = false;
      recordsStatus.textContent = `無法載入紀錄：${error.message}`;
      return;
    }

    recordCount.textContent = `${data.length} 筆`;
    recordsStatus.hidden = data.length > 0;
    recordsStatus.textContent = data.length ? '' : '還沒有學習紀錄，寫下第一筆吧！';
    recordsList.replaceChildren(...data.map(createRecordCard));
  }

  async function deleteRecord(id, button) {
    if (!window.confirm('確定要刪除這筆學習紀錄嗎？')) return;
    button.disabled = true;
    const { error } = await supabaseClient.from('learning_logs').delete().eq('id', id);
    if (error) {
      button.disabled = false;
      setMessage(logMessage, `刪除失敗：${error.message}`, true);
      return;
    }
    setMessage(logMessage, '紀錄已刪除。');
    await loadRecords();
  }

  loginTab.addEventListener('click', () => setAuthMode('login'));
  signupTab.addEventListener('click', () => setAuthMode('signup'));

  authForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    authSubmit.disabled = true;
    setMessage(authMessage, authMode === 'login' ? '正在登入…' : '正在建立帳戶…');
    const formData = new FormData(authForm);
    const credentials = { email: formData.get('email').trim(), password: formData.get('password') };
    const result = authMode === 'login'
      ? await supabaseClient.auth.signInWithPassword(credentials)
      : await supabaseClient.auth.signUp(credentials);

    authSubmit.disabled = false;
    if (result.error) {
      setMessage(authMessage, result.error.message, true);
      return;
    }
    if (authMode === 'signup' && !result.data.session) {
      setMessage(authMessage, '註冊成功！請到信箱點選確認連結，再回來登入。');
      authForm.reset();
      return;
    }
    setMessage(authMessage, '登入成功！');
  });

  logForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!currentUser) return;
    saveButton.disabled = true;
    setMessage(logMessage, '正在儲存…');
    const formData = new FormData(logForm);
    const entry = {
      user_id: currentUser.id,
      log_date: formData.get('date'),
      learning: formData.get('learning').trim(),
      minutes: Number(formData.get('minutes')),
      stuck: formData.get('stuck').trim() || null
    };
    const { error } = await supabaseClient.from('learning_logs').insert(entry);
    saveButton.disabled = false;
    if (error) {
      setMessage(logMessage, `儲存失敗：${error.message}`, true);
      return;
    }
    const selectedDate = entry.log_date;
    logForm.reset();
    document.querySelector('#log-date').value = selectedDate;
    setMessage(logMessage, '已儲存，做得好！');
    await loadRecords();
  });

  document.querySelector('#logout-button').addEventListener('click', async (event) => {
    event.currentTarget.disabled = true;
    const { error } = await supabaseClient.auth.signOut();
    event.currentTarget.disabled = false;
    if (error) setMessage(logMessage, `登出失敗：${error.message}`, true);
  });

  if (!isConfigured() || !window.supabase?.createClient) {
    setupNotice.hidden = false;
    return;
  }

  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  authPanel.hidden = false;
  setAuthMode('login');
  supabaseClient.auth.onAuthStateChange((_event, session) => showSignedIn(session?.user || null));
  supabaseClient.auth.getSession().then(({ data, error }) => {
    if (error) setMessage(authMessage, `無法確認登入狀態：${error.message}`, true);
    showSignedIn(data.session?.user || null);
  });
})();
