// Sekmeyi kapatma kararı burada verilir. Sayfa scripti kapansa, yenilense ya da
// yönlendirilse bile bu servis çalışmaya devam eder.
//
// Akış:
//  1. Sayfa resme tıklamadan önce ARMED mesajı yollar.
//  2. WAIT_FOR_DOWNLOAD_MS içinde tarayıcı bir indirme başlatırsa o sekme "izlenir".
//  3. İndirme "complete" olunca sekme kapatılır.
//  4. İndirme başlamazsa ya da yarıda kesilirse sekme KAPATILMAZ, panele haber verilir.

var WAIT_FOR_DOWNLOAD_MS = 10000;
var CLOSE_DELAY_MS = 300;

// storage.session üzerinde okuma-yazma çakışmasın diye işleri sıraya diziyoruz.
var chain = Promise.resolve();
function serial(fn) {
  chain = chain.then(fn, fn);
  return chain;
}

function load() {
  return chrome.storage.session.get(['pending', 'watching']).then(function (s) {
    return { pending: s.pending || {}, watching: s.watching || {} };
  });
}

function save(st) {
  return chrome.storage.session.set({ pending: st.pending, watching: st.watching });
}

function notify(tabId, type) {
  chrome.tabs.sendMessage(tabId, { type: type }).catch(function () {});
}

chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  if (!msg || msg.type !== 'ARMED' || !sender.tab) return;
  var tabId = sender.tab.id;
  var armedAt = Date.now();

  serial(async function () {
    var st = await load();
    st.pending[tabId] = { armedAt: armedAt, pageUrl: msg.pageUrl || sender.tab.url || '', imgSrc: msg.imgSrc || '' };
    await save(st);
    sendResponse({ ok: true });
  });

  setTimeout(function () {
    serial(async function () {
      var st = await load();
      var p = st.pending[tabId];
      if (p && p.armedAt === armedAt) {
        delete st.pending[tabId];
        await save(st);
        notify(tabId, 'NO_DOWNLOAD');
      }
    });
  }, WAIT_FOR_DOWNLOAD_MS + 500);

  return true; // sendResponse asenkron
});

chrome.downloads.onCreated.addListener(function (item) {
  serial(async function () {
    var st = await load();
    var now = Date.now();
    var ids = Object.keys(st.pending);
    var alive = [];
    ids.forEach(function (id) {
      if (now - st.pending[id].armedAt > WAIT_FOR_DOWNLOAD_MS) {
        delete st.pending[id];
      } else {
        alive.push(id);
      }
    });
    if (!alive.length) { await save(st); return; }

    var match = null;
    // 1) indirmenin geldiği sayfa adresi
    if (item.referrer) {
      match = alive.find(function (id) { return st.pending[id].pageUrl === item.referrer; });
    }
    // 2) indirme adresi tıklanan resmin adresi
    if (!match) {
      match = alive.find(function (id) {
        var s = st.pending[id].imgSrc;
        return s && (s === item.url || s === item.finalUrl);
      });
    }
    // 3) en eski bekleyen sekme
    if (!match) {
      match = alive.sort(function (a, b) { return st.pending[a].armedAt - st.pending[b].armedAt; })[0];
    }

    delete st.pending[match];
    st.watching[item.id] = Number(match);
    await save(st);

    if (item.state === 'complete') {
      await closeFor(item.id);
    }
  });
});

async function closeFor(downloadId) {
  var st = await load();
  var tabId = st.watching[downloadId];
  if (tabId === undefined) return;
  delete st.watching[downloadId];
  await save(st);
  setTimeout(function () { chrome.tabs.remove(tabId).catch(function () {}); }, CLOSE_DELAY_MS);
}

chrome.downloads.onChanged.addListener(function (delta) {
  if (!delta.state) return;
  serial(async function () {
    var st = await load();
    var tabId = st.watching[delta.id];
    if (tabId === undefined) return;
    if (delta.state.current === 'complete') {
      await closeFor(delta.id);
    } else if (delta.state.current === 'interrupted') {
      delete st.watching[delta.id];
      await save(st);
      notify(tabId, 'DOWNLOAD_FAILED');
    }
  });
});

chrome.tabs.onRemoved.addListener(function (tabId) {
  serial(async function () {
    var st = await load();
    delete st.pending[tabId];
    Object.keys(st.watching).forEach(function (d) {
      if (st.watching[d] === tabId) delete st.watching[d];
    });
    await save(st);
  });
});
