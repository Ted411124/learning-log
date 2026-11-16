# 我的學習紀錄

以原生 HTML、CSS、JavaScript 製作，透過 CDN 載入 supabase-js 第 2 版，無需 npm 或建置工具。網站支援 Email／密碼註冊、登入、登出，以及新增、瀏覽、刪除個人學習紀錄。資料隔離由資料庫 RLS 政策強制執行。

## 設定 Supabase

1. 到 [Supabase](https://supabase.com/) 建立一個 project，記下資料庫密碼並等待專案完成建立。
2. 在專案左側選單打開 **SQL Editor**，建立新查詢，將本資料夾的 `schema.sql` 全文貼上並按 **Run**。執行成功後可在 **Table Editor** 確認 `learning_logs` 資料表。
3. 打開 **Project Settings → API**（或專案的 API Keys 頁面），複製 **Project URL** 與 **publishable key**（舊版介面可能稱為 `anon`／public key）。只使用 publishable／anon 公開金鑰；絕不可將 `secret` 或 `service_role` 金鑰放進瀏覽器程式碼。
4. 編輯最外層的 `config.js`，將兩個「貼上…」分別替換成 Project URL 與 publishable key，保留引號，例如：

   ```js
   const SUPABASE_URL = "https://你的專案代碼.supabase.co";
   const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_你的公開金鑰";
   ```

5. 在 Supabase 左側打開 **Authentication → Sign In / Providers → Email**，確認 Email provider 已啟用。若要採用 Email 確認流程，保持確認功能開啟；新使用者註冊後需從信箱點擊確認連結，再回網站登入。測試環境也可在 **Authentication → URL Configuration** 設定允許的網站 URL。

## 開啟網站

直接用瀏覽器開啟 `index.html` 即可。若瀏覽器因本機檔案限制而無法正常使用 Supabase 驗證回跳，請以任何靜態檔案伺服器提供這個資料夾，並把相同網址加入 Supabase 的 **Authentication → URL Configuration → Redirect URLs**。本專案不需要安裝套件或編譯。

## 資料安全

`schema.sql` 對 `learning_logs` 啟用 Row Level Security，將 select、insert、update、delete 權限授予 `authenticated`，並為四種操作分別設定 `auth.uid() = user_id` 的政策。新增資料時由前端附上目前登入者 ID，資料庫仍會驗證該 ID；讀取及刪除也會再次受 RLS 限制。因此修改網頁或直接呼叫 API 也不能讀取或刪除別人的紀錄。瀏覽器設定只能使用 publishable／anon key，資料保護依賴 RLS 政策。

使用者輸入的紀錄內容會以文字節點顯示，不會當成 HTML 解讀。
