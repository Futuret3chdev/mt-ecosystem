/**
 * Tester tab enhancements — does not touch Discord/Telegram tabs.
 */
(function () {
  const API = 'https://admin.futuret3ch.com.au/api';
  const BOT_LINK = 'https://t.me/Futuret3ch_memetorrent_bot';

  const QUICK_COMMANDS = [
    '/com', '/pet status', '/pet adopt TestPet', '/pet customize', '/pet video', '/pet evolution',
    '/soccer', '/puck', '/chicken', '/tap', '/games', '/petmarket browse', '/help', '/bugreport'
  ];

  const TEMPLATES = {
    '': 'Full checklist',
    pet_regression: 'Pet regression',
    games_smoke: 'Games smoke test',
    hub_p2e: 'Hub / P2E',
    admin_smoke: 'Admin smoke test',
  };

  window.TesterSuite = {
    init(adminKey) {
      window._testerAdminKey = adminKey;
      TesterSuite.renderQuickCommands();
      TesterSuite.refreshProgressDashboard();
      TesterSuite.setupKeyboardShortcuts();
    },

    headers() {
      return { 'X-Telegram-User-ID': window._testerAdminKey || '' };
    },

    url(path, params) {
      const p = new URLSearchParams({ key: window._testerAdminKey, ...params });
      return `${API}${path}?${p}`;
    },

    getLogDate() {
      return document.getElementById('testerLogDate')?.value || '';
    },

    getLogFilter() {
      return document.getElementById('testerLogFilter')?.value || 'all';
    },

    getTemplate() {
      return document.getElementById('testerTemplate')?.value || '';
    },

    activeTester() {
      const fn = window.getActiveTesterLogType;
      return fn ? fn() : 'penna';
    },

    renderQuickCommands() {
      const el = document.getElementById('testerQuickCommands');
      if (!el) return;
      el.innerHTML = QUICK_COMMANDS.map(cmd => `
        <button type="button" class="tester-quick-btn" data-cmd="${cmd.replace(/"/g, '&quot;')}" title="Copy command">${cmd}</button>
      `).join('');
      el.querySelectorAll('.tester-quick-btn').forEach(btn => {
        btn.addEventListener('click', () => TesterSuite.copyCommand(btn.dataset.cmd));
      });
    },

    copyCommand(cmd) {
      const text = cmd.startsWith('/') ? cmd : `/${cmd}`;
      navigator.clipboard.writeText(text).then(() => {
        TesterSuite.toast(`Copied: ${text}`);
        const item = document.getElementById('logItem');
        if (item) item.value = text;
      }).catch(() => alert(text));
    },

    toast(msg) {
      const t = document.getElementById('testerToast');
      if (!t) return;
      t.textContent = msg;
      t.style.display = 'block';
      setTimeout(() => { t.style.display = 'none'; }, 2200);
    },

    async refreshProgressDashboard() {
      if (!window.isAuthenticated) return;
      const date = document.getElementById('selectedDate')?.value || document.getElementById('testerLogDate')?.value || '';
      try {
        const r = await fetch(TesterSuite.url('/tester_progress', date ? { date } : {}), { headers: TesterSuite.headers() });
        const data = await r.json();
        ['penna', 'chan', 'tam'].forEach(t => {
          const card = document.getElementById(`progress-${t}`);
          if (!card || !data[t]) return;
          const p = data[t];
          card.innerHTML = `
            <div class="tester-progress-name">${t.charAt(0).toUpperCase() + t.slice(1)}</div>
            <div class="tester-progress-bar"><div class="tester-progress-fill" style="width:${p.percent}%"></div></div>
            <div class="tester-progress-label">${p.done}/${p.total} (${p.percent}%)</div>
          `;
        });
      } catch (e) {
        console.warn('progress dashboard', e);
      }
    },

    async loadSessions() {
      if (!window.isAuthenticated) return;
      const tester = TesterSuite.activeTester();
      const date = TesterSuite.getLogDate();
      const el = document.getElementById('testerSessionsPanel');
      if (!el) return;
      try {
        const r = await fetch(TesterSuite.url('/tester_sessions', { log: tester, ...(date ? { date } : {}) }), { headers: TesterSuite.headers() });
        const data = await r.json();
        if (!data.sessions?.length) {
          el.innerHTML = `<div class="text-sm text-gray-600">No clock sessions${date ? ' for ' + date : ''}. ${data.open_session ? '<strong>Open session running</strong>' : ''}</div>`;
          return;
        }
        let html = `<div class="text-sm font-semibold mb-1">Total: <span class="text-emerald-700">${data.total_hours}h</span> (${data.session_count} sessions)</div><ul class="tester-session-list">`;
        data.sessions.slice().reverse().forEach(s => {
          html += `<li>${new Date(s.clock_in).toLocaleString()} → ${new Date(s.clock_out).toLocaleString()} <strong>${s.duration_hours}h</strong></li>`;
        });
        html += '</ul>';
        if (data.open_session) html += `<div class="text-amber-600 text-sm mt-1">⏱ Open session since ${new Date(data.open_session).toLocaleString()}</div>`;
        el.innerHTML = html;
      } catch (e) {
        el.innerHTML = `<div class="text-red-600 text-sm">Session error: ${e}</div>`;
      }
    },

    async loadParity(tester) {
      if (!window.isAuthenticated) return;
      const el = document.getElementById('testerParityPanel');
      if (!el) return;
      const active = tester || document.getElementById('parityTester')?.value || 'penna';
      const dateVal = document.getElementById('selectedDate')?.value || '';
      el.innerHTML = `
        <div class="tester-parity-toolbar mb-3 flex flex-wrap gap-2 items-center">
          <label class="text-sm font-semibold">Tester:</label>
          <select id="parityTester" class="tester-toolbar-input" onchange="TesterSuite.loadParity(this.value)">
            <option value="penna" ${active === 'penna' ? 'selected' : ''}>Penna</option>
            <option value="chan" ${active === 'chan' ? 'selected' : ''}>Chan</option>
            <option value="tam" ${active === 'tam' ? 'selected' : ''}>Tam</option>
          </select>
          <a href="${BOT_LINK}" target="_blank" rel="noopener" class="text-sm text-blue-700 underline">Telegram bot</a>
          <span class="text-xs text-gray-500">Test same command on TG + Discord, then mark pass/fail/blocked.</span>
        </div>
        <div id="parityChecklist"><div class="text-gray-500">Loading parity checklist...</div></div>
      `;
      const checklistEl = document.getElementById('parityChecklist');
      try {
        const params = { log: active, template: 'parity' };
        if (dateVal) params.date = dateVal;
        const r = await fetch(TesterSuite.url('/check_commands', params), { headers: TesterSuite.headers() });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
        const checklist = data.checklist || {};
        const progress = data.progress;
        let html = '';
        if (progress) {
          html += `<div class="tester-check-progress mb-3 p-3 rounded border">
            <div class="font-semibold">Parity progress (${active}): ${progress.done}/${progress.total} (${progress.percent}%)</div>
            <div class="tester-progress-bar mt-1"><div class="tester-progress-fill" style="width:${progress.percent}%"></div></div>
          </div>`;
        }
        const categories = Object.keys(checklist);
        if (!categories.length) {
          checklistEl.innerHTML = html + '<div class="text-gray-600">No parity items in checklist.</div>';
          return;
        }
        for (const category of categories) {
          html += `<div class="check-entry"><h3>${category}</h3><ul>`;
          for (const item in checklist[category]) {
            const mark = checklist[category][item];
            const safe = item.replace(/'/g, "\\'").replace(/"/g, '&quot;');
            html += `<li class="tester-check-row">
              <span>${mark}</span> <span class="check-item-label">${item}</span>
              <button class="tester-status-btn pass" onclick="TesterSuite.setItemStatus('${active}','${safe}','pass')" title="Pass">✅</button>
              <button class="tester-status-btn fail" onclick="TesterSuite.setItemStatus('${active}','${safe}','fail')" title="Fail">❌</button>
              <button class="tester-status-btn blocked" onclick="TesterSuite.setItemStatus('${active}','${safe}','blocked')" title="Blocked">⚠️</button>
              <button class="tester-status-btn" onclick="TesterSuite.copyCommand('${safe.split(' — ')[0] || safe}')">📋</button>
              <button class="tester-status-btn" onclick="TesterSuite.bugReportPrefill('${safe}')">🐛</button>
            </li>`;
          }
          html += '</ul></div>';
        }
        checklistEl.innerHTML = html;
        TesterSuite.refreshProgressDashboard();
      } catch (e) {
        checklistEl.innerHTML = `<div class="text-red-600">Parity error: ${e}</div>`;
      }
    },

    async loadRollup() {
      const el = document.getElementById('testerRollupPanel');
      if (!el || !window.isAuthenticated) return;
      const year = document.getElementById('rollupYear')?.value || new Date().getFullYear();
      const month = document.getElementById('rollupMonth')?.value || (new Date().getMonth() + 1);
      try {
        const r = await fetch(TesterSuite.url('/tester_rollup', { year, month }), { headers: TesterSuite.headers() });
        const data = await r.json();
        let html = `<h3 class="font-bold mb-2">Monthly Rollup — ${data.month}/${data.year}</h3><div class="grid grid-cols-1 md:grid-cols-3 gap-3">`;
        for (const [name, stats] of Object.entries(data.testers || {})) {
          html += `<div class="tester-rollup-card">
            <div class="font-semibold capitalize">${name}</div>
            <div>Clock hours: <b>${stats.clock_hours}h</b></div>
            <div>Checklist: <b>${stats.checklist_percent}%</b></div>
            <div>Log entries: ${stats.log_entries}</div>
            <div>Bot cmds: ${stats.bot_commands} · Notes: ${stats.notes}</div>
          </div>`;
        }
        html += '</div>';
        el.innerHTML = html;
      } catch (e) {
        el.innerHTML = `<div class="text-red-600">Rollup error: ${e}</div>`;
      }
    },

    exportCsv() {
      const tester = TesterSuite.activeTester();
      const days = document.getElementById('exportDays')?.value || 7;
      window.open(TesterSuite.url('/tester_export', { log: tester, days }), '_blank');
    },

    async sendReminder() {
      const tester = TesterSuite.activeTester();
      const msg = `Reminder: ${tester} has open checklist items — please complete today.`;
      await fetch(TesterSuite.url('/tester_notify', {}), {
        method: 'POST',
        headers: { ...TesterSuite.headers(), 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ key: window._testerAdminKey, tester, message: msg }).toString(),
      });
      TesterSuite.toast(`Reminder logged for ${tester}`);
    },

    jumpLog(which) {
      const tester = TesterSuite.activeTester();
      if (which === 'latest') {
        window[`${tester}Page`] = 1;
        if (window.fetchTestersLogs) window.fetchTestersLogs(1, tester);
      } else {
        const total = window[`${tester}Total`] || 0;
        const perPage = window.getTesterPerPage ? window.getTesterPerPage() : 100;
        const last = Math.max(1, Math.ceil(total / perPage));
        window[`${tester}Page`] = last;
        if (window.fetchTestersLogs) window.fetchTestersLogs(last, tester);
      }
    },

    async setItemStatus(tester, item, status) {
      let reason = '';
      if (status === 'blocked' || status === 'fail') {
        reason = prompt(`Reason for ${status} on "${item}":`, '') || '';
      }
      const date = document.getElementById('selectedDate')?.value || '';
      await fetch(TesterSuite.url('/tester_status', {}), {
        method: 'POST',
        headers: { ...TesterSuite.headers(), 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          key: window._testerAdminKey,
          tester,
          item,
          status,
          reason,
          date,
        }).toString(),
      });
      if (window.fetchCheckCommands) window.fetchCheckCommands(tester);
      TesterSuite.refreshProgressDashboard();
    },

    bugReportPrefill(item) {
      const text = `/bugreport Tester issue on: ${item}`;
      TesterSuite.copyCommand(text);
      TesterSuite.toast('Bug report text copied — paste in Telegram bot');
    },

    setupKeyboardShortcuts() {
      document.addEventListener('keydown', (e) => {
        if (!window.isAuthenticated) return;
        const tab = document.getElementById('Testers');
        if (!tab || tab.style.display === 'none') return;
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
        if (e.key === 'n' || e.key === 'N') {
          const t = TesterSuite.activeTester();
          const page = (window[`${t}Page`] || 1) + 1;
          if (window.fetchTestersLogs) window.fetchTestersLogs(page, t);
        }
        if (e.key === 'p' || e.key === 'P') {
          const t = TesterSuite.activeTester();
          const page = Math.max(1, (window[`${t}Page`] || 1) - 1);
          if (window.fetchTestersLogs) window.fetchTestersLogs(page, t);
        }
      });
    },

    wrapFetchTestersLogs() {
      const orig = window.fetchTestersLogs;
      if (!orig || orig._wrapped) return;
      window.fetchTestersLogs = function (page, logType) {
        const logDate = TesterSuite.getLogDate();
        const logFilter = TesterSuite.getLogFilter();
        const search = document.getElementById('testersSearch')?.value || '';
        const perPage = window.getTesterPerPage ? window.getTesterPerPage() : 100;
        const url = TesterSuite.url('/tester_logs', {
          page,
          log: logType,
          per_page: perPage,
          ...(search ? { search } : {}),
          ...(logDate ? { log_date: logDate } : {}),
          ...(logFilter !== 'all' ? { log_filter: logFilter } : {}),
        });
        const logElement = logType === 'penna' ? document.getElementById('pennaLogs')
          : logType === 'chan' ? document.getElementById('chanLogs')
          : document.getElementById('tamLogs');
        if (!logElement || !window.isAuthenticated) return;
        logElement.innerHTML = '<div class="log-entry text-gray-500">Loading logs...</div>';
        fetch(url, { headers: TesterSuite.headers() })
          .then(r => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))
          .then(payload => {
            const data = Array.isArray(payload) ? payload : (payload.logs || []);
            const total = payload.total ?? data.length;
            const hasNext = Array.isArray(payload) ? data.length >= perPage : !!payload.has_next;
            const currentPage = payload.page || page;
            window[`${logType}Page`] = currentPage;
            window[`${logType}Total`] = total;
            logElement.innerHTML = data.length === 0 ? '<div class="log-entry">No logs found.</div>' : '';
            data.forEach(log => {
              const div = document.createElement('div');
              div.className = 'log-entry';
              const ts = log.timestamp && !log.timestamp.startsWith('0001') ? new Date(log.timestamp).toLocaleString() : '—';
              const typeBadge = log.log_type ? `<span class="log-type-badge log-type-${log.log_type}">${log.log_type}</span> ` : '';
              div.innerHTML = `<span class="timestamp">${ts}</span> ${typeBadge}<br><span class="platform">${log.log_file}</span>: ${window.formatLogEntryHtml ? window.formatLogEntryHtml(log.content) : log.content}`;
              logElement.appendChild(div);
            });
            logElement.scrollTop = 0;
            if (window.updatePagination) window.updatePagination(logType, currentPage, hasNext, total, perPage);
            if (window.updateTesterPageInfo) window.updateTesterPageInfo(logType, currentPage, total, perPage);
            TesterSuite.loadSessions();
          })
          .catch(err => { logElement.innerHTML = `<div class="log-entry">Error: ${err}</div>`; });
      };
      window.fetchTestersLogs._wrapped = true;
    },

    wrapFetchCheckCommands() {
      const orig = window.fetchCheckCommands;
      if (!orig || orig._wrapped) return;
      window.fetchCheckCommands = function (logType) {
        if (!window.isAuthenticated) return;
        let checkElement = logType === 'penna' ? document.getElementById('pennaChecks')
          : logType === 'chan' ? document.getElementById('chanChecks')
          : logType === 'tam' ? document.getElementById('tamChecks') : null;
        if (!checkElement) return;
        const dateVal = document.getElementById('selectedDate')?.value || '';
        const template = TesterSuite.getTemplate();
        const params = { log: logType };
        if (dateVal) params.date = dateVal;
        if (template) params.template = template;
        fetch(TesterSuite.url('/check_commands', params), { headers: TesterSuite.headers() })
          .then(r => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))
          .then(data => {
            const checklist = data.checklist || data;
            const progress = data.progress;
            checkElement.innerHTML = '';
            if (progress) {
              const prog = document.createElement('div');
              prog.className = 'tester-check-progress mb-3 p-3 rounded border';
              prog.innerHTML = `<div class="font-semibold">Progress: ${progress.done}/${progress.total} (${progress.percent}%)</div>
                <div class="tester-progress-bar mt-1"><div class="tester-progress-fill" style="width:${progress.percent}%"></div></div>`;
              checkElement.appendChild(prog);
            }
            for (const category in checklist) {
              const div = document.createElement('div');
              div.className = 'check-entry';
              let html = `<h3>${category}</h3><ul>`;
              for (const item in checklist[category]) {
                const mark = checklist[category][item];
                const safe = item.replace(/'/g, "\\'").replace(/"/g, '&quot;');
                html += `<li class="tester-check-row">
                  <span>${mark}</span> <span class="check-item-label">${item}</span>
                  <button class="tester-status-btn pass" onclick="TesterSuite.setItemStatus('${logType}','${safe}','pass')" title="Pass">✅</button>
                  <button class="tester-status-btn fail" onclick="TesterSuite.setItemStatus('${logType}','${safe}','fail')" title="Fail">❌</button>
                  <button class="tester-status-btn blocked" onclick="TesterSuite.setItemStatus('${logType}','${safe}','blocked')" title="Blocked">⚠️</button>
                  <button class="tester-status-btn" onclick="TesterSuite.copyCommand('${safe}')">📋</button>
                  <button class="tester-status-btn" onclick="TesterSuite.bugReportPrefill('${safe}')">🐛</button>
                  <button class="tester-status-btn" onclick="window.toggleCommandNote && window.toggleCommandNote(this,'${logType}','${safe}')">📝</button>
                </li>`;
              }
              html += '</ul>';
              div.innerHTML = html;
              checkElement.appendChild(div);
            }
            TesterSuite.refreshProgressDashboard();
          })
          .catch(err => { checkElement.innerHTML = `<div class="check-entry">Error: ${err}</div>`; });
      };
      window.fetchCheckCommands._wrapped = true;
    },

    hookAuth() {
      const tryWrap = () => {
        TesterSuite.wrapFetchTestersLogs();
        TesterSuite.wrapFetchCheckCommands();
      };
      tryWrap();
      const authBtn = document.getElementById('submitAuth');
      if (authBtn) {
        authBtn.addEventListener('click', () => setTimeout(tryWrap, 500));
      }
    },
  };

  document.addEventListener('DOMContentLoaded', () => {
    TesterSuite.hookAuth();
  });
})();