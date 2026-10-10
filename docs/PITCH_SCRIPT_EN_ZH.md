# Pitch script · 簡報講稿 (EN / 中文)

CokeZerope Marketing: about 3 minutes spoken, plus Q&A. Demo cues are in **[brackets]**. If the live demo stalls, play the video from the matching timestamp (https://youtu.be/HPQ6d0eSJB8).

CokeZerope Marketing：口說約 3 分鐘，另附問答。**[括號]** 內是操作提示。如果現場 demo 卡住，就從影片的對應時間點播放。

**Storyline / 故事線:** one person, one Monday, three questions, each one answered on screen.

**故事線：**一個人、一個星期一、三個問題，每個問題都在畫面上得到解答。

1. Are we really down? → Ace checks the numbers. / 我們真的在下滑嗎？→ Ace 查證數字。
2. What is the market saying? → Ace listens to social media. / 市場在說什麼？→ Ace 聆聽社群。
3. What do we do this week? → Ace proposes, the human approves. / 這週該做什麼？→ Ace 提案，人來核准。

---

## 0:00 · Hook / 開場 (20 s)

**[Screen: dashboard showing −55 %]** · 影片 0:00

**EN:** Every Monday, a brand manager in Taipei opens the dashboard and sees this: sales crashed fifty-five percent. Panic, meetings, discount plans. But the number is wrong.

**中文：** 每個星期一，台北的品牌經理打開 dashboard，看到的是：業績暴跌 55%。接著就是恐慌、開會、急著砍價。但這個數字是錯的。

## 0:20 · Problem / 痛點 (20 s)

**EN:** Her Monday has three questions. Are we really down? What is the market saying? What do we do this week? Today, answering them takes hours: spreadsheets, ten tabs of momo and Dcard, screenshots in LINE groups. And the sales data is confidential, so she can't even screen-share it.

**中文：** 她的星期一有三個問題：我們真的在下滑嗎？市場在說什麼？這週該做什麼？現在要回答這三題得花好幾個小時：Excel、十幾個 momo 和 Dcard 分頁、LINE 群組裡傳來傳去的截圖。而且銷售資料是機密，連分享畫面都不行。

## 0:40 · Solution / 解方 (10 s)

**EN:** Meet Ace, inside CokeZerope Marketing. Ace answers all three, and it checks, cites, and asks before it acts.

**中文：** 這是 CokeZerope Marketing 裡的 Ace。三個問題它都能回答，而且會先查證、附上來源，行動前一定先問你。

## 0:50 · Question 1: are we really down? / 問題一：真的在下滑嗎？ (30 s)

**[Ask Ace → "Why is COLA GOLD down vs 2025?"]** · 影片 0:14

**EN:** This is synthetic data with our demo mask on, which is why the brand reads COLA GOLD. Real client data never leaves the room. I ask: why is COLA GOLD down versus 2025? Ace plans, runs a Gemini tool loop and compares like-for-like. The verdict: 2026 only has six months of data. Like-for-like, sales are up 5.1 percent. Every number is cited, and one click shows the source row. Answer one: we're not down.

**中文：** 這是合成資料，而且開了 demo 遮罩，所以品牌名顯示成 COLA GOLD，真實的客戶資料不會外流。我問：COLA GOLD 為什麼比 2025 年差？Ace 擬好計畫，跑 Gemini 工具迴圈，做同期比較。結論是：2026 年只有六個月的資料，同期比較其實是成長 5.1%。每個數字都附來源，點一下就看到原始那一列。第一個答案：我們沒有在下滑。

## 1:20 · Question 2: what is the market saying? / 問題二：市場在說什麼？ (25 s)

**[Pulse → Scan: Coke Zero vs Pepsi Zero vs Sprite Zero]** · 影片 0:37

**EN:** So where should we push? We scan Coke Zero against Pepsi Zero and Sprite Zero. Gemini with Google Search grounding reads live public posts on Dcard, PTT, YouTube and Facebook. The insight: Coke Zero has the weakest net sentiment of the three, +50 against +71 for Pepsi Zero, and Pepsi is winning the food-pairing conversation. Answer two.

**中文：** 那該往哪裡使力？我們掃描可口可樂零卡，對比百事零卡和雪碧零卡。Gemini 結合 Google 搜尋，即時讀取 Dcard、PTT、YouTube、Facebook 上的公開貼文。洞察是：三個品牌中，可口可樂零卡的淨好感度最低，只有 +50，百事零卡是 +71，而且「配餐」這個話題正被百事拿走。這是第二個答案。

## 1:45 · Question 3: what do we do this week? / 問題三：這週該做什麼？ (35 s)

**[Run demo → brief → Read aloud → Approve → promo visual → Approve]** · 影片 0:54

**EN:** Ace combines that buzz, live momo prices and our sales into one cited brief, and Gradium reads it out loud. You can ask by voice too. Its proposal: take food pairing back with a Coke Zero food bundle on momo. But Ace never acts alone. Nothing happens until I click Approve. Only then does Nano Banana draft the banner, and every decision is logged. Answer three.

**中文：** Ace 把社群聲量、momo 即時價格和我們的銷售數據整合成一份附來源的簡報，再由 Gradium 唸出來，也可以直接用說的問它。它的提案是：在 momo 推出可口可樂零卡配餐組合，把配餐話題搶回來。但 Ace 從不自作主張，我沒按「核准」，什麼都不會發生。按下之後，Nano Banana 才會產出 banner 草稿，每個決定都有紀錄。這是第三個答案。

## 2:20 · How it's built / 技術架構 (20 s)

**[README diagram or video 1:32]** · 影片 1:32

**EN:** Gemini does all the reasoning: a 3.8 Flash agent loop on the Interactions API, Google Search grounding, Deep Research and Nano Banana. Gradium does voice in and out. Entire captured our agent sessions next to every commit. Citations are validated on the server, and web content is treated as untrusted.

**中文：** 所有推理都交給 Gemini：在 Interactions API 上跑 3.8 Flash 代理人迴圈，搭配 Google 搜尋、Deep Research 和 Nano Banana。語音輸入、輸出由 Gradium 負責。Entire 把每次 AI 協作的過程和 commit 一起記錄。引用在伺服器端驗證，網路內容一律視為不可信。

## 2:40 · Close / 結尾 (20 s)

**EN:** So: it acts, planning and using tools to finish the job. It helps a real person on a real Monday. People stay in control, because nothing happens without Approve. And everything you saw ran live. CokeZerope Marketing: agents that check, cite, and ask before they act. Thank you.

**中文：** 總結：它會行動，自己規劃、用工具把事情做完；它幫助的是真實的人、真實的星期一；人始終做主，沒有核准就不會執行；剛剛看到的一切都是即時運作。CokeZerope Marketing：先查證、附來源、行動前先問你的 AI 代理人。謝謝大家。

---

## 30-second elevator pitch / 30 秒電梯簡報

**EN:** Every Monday a brand manager asks three questions: are we really down, what is the market saying, and what do we do this week? Ace, a Gemini agent, answers all three. It checks whether the numbers are comparable, scans Dcard, PTT, YouTube and Facebook for Coke Zero and its rivals, and proposes a cited action plan. Gradium reads it aloud, and nothing happens without your Approve click.

**中文：** 品牌經理每個星期一都要回答三個問題：真的在下滑嗎？市場在說什麼？這週該做什麼？Ace 是一個 Gemini 代理人，三題都能回答：先確認數字能不能比，再掃描 Dcard、PTT、YouTube、Facebook 上可口可樂零卡和競品的聲量，最後提出附來源的行動方案，由 Gradium 唸給你聽。沒有你按下「核准」，它什麼都不會做。

---

## Q&A / 問答

**Why is the sales data COLA GOLD with cushion foundation, but the scan is about cola? / 為什麼銷售資料是 COLA GOLD 配粉底，掃描卻是可樂？**

- **EN:** The sales demo is a synthetic dataset from another category, masked because the real client data is confidential. Ace doesn't depend on the category: the same agent reads any sales table, and the market scan works for any brand you type in.
- **中文：** 銷售 demo 用的是另一個品類的合成資料，因為真實客戶資料是機密，所以加了遮罩。Ace 不綁定品類：同一個代理人可以讀任何銷售表，市場掃描也可以換成任何你輸入的品牌。

**Hallucinations? / 會不會亂編？**

- **EN:** Numbers come only from tools, and every citation is checked on the server against what the tools returned. Social posts are labelled search-grounded or unverified.
- **中文：** 數字只來自工具查詢，每個引用都會在伺服器端比對工具的回傳結果。社群貼文會標示「有搜尋佐證」或「未驗證」。

**Is the scan really live on YouTube, Facebook, Threads? / 社群掃描是真的即時嗎？**

- **EN:** Yes, via Gemini with Google Search grounding over public, indexed posts. In our Coke Zero scan that meant Facebook 8, Dcard 6, PTT 6, YouTube 3, Instagram 1. Threads is barely indexed, so official platform APIs are next.
- **中文：** 是即時的，透過 Gemini 結合 Google 搜尋，抓取已被索引的公開貼文。可口可樂零卡那次掃描的結果是：Facebook 8 則、Dcard 6 則、PTT 6 則、YouTube 3 則、Instagram 1 則。Threads 幾乎沒被索引，所以下一步會接各平台的官方 API。

**Why not let it act automatically? / 為什麼不讓它自動執行？**

- **EN:** Anything with consequences needs a human. Ace drafts and proposes, a person approves, and every decision is logged.
- **中文：** 有後果的動作就該由人決定。Ace 負責草擬和建議，由人核准，每個決定都留有紀錄。

**What's next? / 下一步？**

- **EN:** Scheduled scans with alerts when negative sentiment spikes, official platform APIs, team-shared watchlists, and more categories and markets.
- **中文：** 定時自動掃描，負面聲量飆升時發出警示；串接各平台官方 API；團隊共享追蹤清單；擴展到更多品類和市場。
