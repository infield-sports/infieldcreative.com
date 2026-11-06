/**
 * INFIELD お問い合わせフォーム → Googleスプレッドシート連携用スクリプト
 *
 * このファイルはサイトからは読み込まれません。Googleスプレッドシート側に
 * 貼り付けて、フォームの送信データを自動でシートに記録するためのものです。
 *
 * ▼ セットアップ手順 ▼
 * 1. Googleドライブで新しいスプレッドシートを作成する
 *    (例: 「INFIELD お問い合わせ管理」)
 * 2. メニューの「拡張機能」→「Apps Script」を開く
 * 3. デフォルトで開かれる Code.gs の中身を全て削除し、
 *    このファイルの内容(下のコード全体)を貼り付けて保存する
 * 4. 右上の「デプロイ」→「新しいデプロイ」をクリック
 *    - 種類の選択: 歯車アイコン →「ウェブアプリ」を選択
 *    - 説明: 任意(例: contact form)
 *    - 実行するユーザー: 自分
 *    - アクセスできるユーザー: 全員
 *    →「デプロイ」をクリックし、Googleアカウントでのアクセス許可を承認する
 * 5. 発行された「ウェブアプリのURL」(https://script.google.com/macros/s/.../exec)
 *    をコピーする
 * 6. contact.html 内の GOOGLE_SCRIPT_URL = 'PASTE_YOUR_WEB_APP_URL_HERE';
 *    の部分を、コピーしたURLに差し替える
 *
 * ※ スクリプトやフォームの項目を変更した場合は、
 *    「デプロイ」→「デプロイを管理」→ 鉛筆アイコンから「新しいバージョン」で
 *    再デプロイしないと変更が反映されません(URLは変わりません)。
 */

var NOTIFY_EMAIL = 'infielddesign2024@gmail.com';

function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var p = e.parameter;

  // 初回のみヘッダー行を追加
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      '送信日時',
      'お名前',
      '会社名・チーム名',
      'メールアドレス',
      '電話番号',
      'お問い合わせ種別',
      'お問い合わせ内容'
    ]);
  }

  sheet.appendRow([
    new Date(),
    p['お名前'] || '',
    p['会社名・チーム名'] || '',
    p['email'] || '',
    p['電話番号'] || '',
    p['お問い合わせ種別'] || '',
    p['お問い合わせ内容'] || ''
  ]);

  try {
    sendNotificationEmail(p);
  } catch (err) {
    // メール送信に失敗してもシートへの記録は成功させる
    console.error('sendNotificationEmail failed: ' + err);
  }

  return ContentService
    .createTextOutput(JSON.stringify({ result: 'success' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function sendNotificationEmail(p) {
  var subject = '【INFIELD】ウェブサイトからお問い合わせがありました';
  var body =
    'INFIELDのウェブサイトのお問い合わせフォームより送信がありました。\n\n' +
    'お名前: ' + (p['お名前'] || '') + '\n' +
    '会社名・チーム名: ' + (p['会社名・チーム名'] || '') + '\n' +
    'メールアドレス: ' + (p['email'] || '') + '\n' +
    '電話番号: ' + (p['電話番号'] || '') + '\n' +
    'お問い合わせ種別: ' + (p['お問い合わせ種別'] || '') + '\n' +
    'お問い合わせ内容:\n' + (p['お問い合わせ内容'] || '');

  var options = {};
  if (p['email']) {
    options.replyTo = p['email'];
  }

  MailApp.sendEmail(NOTIFY_EMAIL, subject, body, options);
}
