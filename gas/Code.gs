/**
 * プリズナートレーニング — 記録の受け口（Google Apps Script ウェブアプリ）
 *
 * アプリが記録するたびに全件を送ってくるので、シートを毎回書き直す。
 * 差分ではなく全置換にしてあるので、端末側で直した記録・消した記録もそのまま揃う。
 *
 * 置き方は gas/README.md を参照。
 */

/**
 * 合い言葉は、このファイルではなくスクリプト プロパティに置く。
 * リポジトリは公開なので、ここに直接書くと GitHub に載ってしまう。
 *
 * Apps Script の プロジェクトの設定 → スクリプト プロパティ に
 * TOKEN という名前で登録する（アプリの設定画面に入れる文字列と同じもの）。
 */
function token() {
  return PropertiesService.getScriptProperties().getProperty('TOKEN') || '';
}

/** 書き込み先。スプレッドシートに紐づけたスクリプトなら空文字でよい */
var SPREADSHEET_ID = '1cnBcA1wtw6PdPg5aeIdtsUOVTObXJyBMrwJJ1ps8igM';

/** 復元用の生データを置くシート。ふだん見る必要はない */
var BACKUP_SHEET = 'バックアップ';

/** 1セルに入れられる上限は5万字。余裕を見て分割する */
var CHUNK = 40000;

function book() {
  return SPREADSHEET_ID ? SpreadsheetApp.openById(SPREADSHEET_ID) : SpreadsheetApp.getActive();
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

/** ブラウザで開いたときの生存確認。URL が正しいかの確認に使う */
function doGet() {
  return json({ ok: true, app: 'prisoner-training', at: new Date().toISOString() });
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var expected = token();

    if (!expected) {
      return json({ ok: false, error: 'スクリプト プロパティに TOKEN が登録されていません' });
    }
    if (expected !== String(body.token || '')) {
      return json({ ok: false, error: '合い言葉が違います' });
    }

    if (body.action === 'pull') {
      return json({ ok: true, backup: readBackup() });
    }

    if (body.action !== 'sync') {
      return json({ ok: false, error: '不明な action です: ' + body.action });
    }

    // 同じ瞬間に二重に走ると行が混ざるので、書き込みは1本に絞る
    var lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      var ss = book();
      var tables = body.tables || [];
      var rows = 0;
      for (var i = 0; i < tables.length; i++) {
        rows += writeTable(ss, tables[i]);
      }
      writeBackup(ss, body.backup || '');
      return json({ ok: true, rows: rows, at: new Date().toISOString() });
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

/** 1枚ぶんの表を書き直す。見出しは固定して太字にしておく */
function writeTable(ss, table) {
  var name = String(table.name || '無題');
  var header = table.header || [];
  var rows = table.rows || [];

  var sheet = ss.getSheetByName(name);
  var created = false;
  if (!sheet) {
    sheet = ss.insertSheet(name);
    created = true;
  }

  sheet.clear();

  if (header.length) {
    sheet.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  if (rows.length) {
    sheet.getRange(2, 1, rows.length, header.length).setValues(rows);
  }
  if (created && header.length) {
    sheet.autoResizeColumns(1, header.length);
  }
  return rows.length;
}

/**
 * 端末の記録をそのまま置いておく。
 * 表からは ID や進捗までは戻せないので、復元はこちらを使う。
 */
function writeBackup(ss, text) {
  var sheet = ss.getSheetByName(BACKUP_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(BACKUP_SHEET);
    sheet.hideSheet();
  }
  sheet.clear();
  sheet
    .getRange(1, 1, 1, 2)
    .setValues([['更新', new Date().toISOString()]])
    .setFontWeight('bold');

  if (!text) return;
  var chunks = [];
  for (var i = 0; i < text.length; i += CHUNK) {
    chunks.push([text.substring(i, i + CHUNK)]);
  }
  sheet.getRange(2, 1, chunks.length, 1).setValues(chunks);
}

function readBackup() {
  var sheet = book().getSheetByName(BACKUP_SHEET);
  if (!sheet) return '';
  var last = sheet.getLastRow();
  if (last < 2) return '';
  var values = sheet.getRange(2, 1, last - 1, 1).getValues();
  var out = '';
  for (var i = 0; i < values.length; i++) out += values[i][0];
  return out;
}
