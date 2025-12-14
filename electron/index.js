// Electron のアプリ本体と BrowserWindow を読み込む
const { app, BrowserWindow } = require('electron');
// Node の path モジュールを読み込む
const path = require('path');

// ウィンドウ作成関数の定義開始
function createWindow() {
  // 新しい BrowserWindow を作成
  const win = new BrowserWindow({
    // ウィンドウの幅を指定
    width: 400,
    // ウィンドウの高さを指定
    height: 200,
    // レンダラープロセス用設定
    webPreferences: {
      // レンダラーで Node.js を使えるようにする
      nodeIntegration: true,
      // コンテキスト分離を無効にする
      contextIsolation: false
    }
  });

  // ローカルの index.html を読み込む
  win.loadFile(path.join(__dirname, 'index.html'));
}

// アプリが準備できたらウィンドウを作成する
app.whenReady().then(createWindow);

// 全ウィンドウが閉じられたときの動作
app.on('window-all-closed', () => {
  // macOS 以外ならアプリを終了する
  if (process.platform !== 'darwin') app.quit();
});

// macOS で再アクティブ化されたときの動作
app.on('activate', () => {
  // ウィンドウが無ければ新しく作成する
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
