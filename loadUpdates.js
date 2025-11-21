/* ======================================== */
/* ▼▼▼ 更新履歴 読み込みスクリプト ▼▼▼ */
/* ======================================== */

(function () {
  // 1. 挿入先のコンテナを取得
  const container = document.getElementById('update-list-container');
  if (!container) {
    console.error('Error: #update-list-container not found.');
    return;
  }

  // 2. updates.json ファイルを非同期で読み込む
  fetch('./updates.json')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json(); // JSONとして解析
    })
    .then(updatesData => {
      // 3. データが0件の場合のメッセージ
      if (!updatesData || updatesData.length === 0) {
        const p = document.createElement('p');
        p.textContent = '更新履歴はまだありません。';
        container.appendChild(p);
        return;
      }

      // 4. データ（配列）を一つずつ処理してHTMLを組み立てる
      updatesData.forEach(item => {
        // <article class="update-item"> ... </article> を作成
        const article = document.createElement('article');
        article.className = 'update-item';

        // 記事の中身 (バージョン + 日付 + タイトル + 本文)
        article.innerHTML = `
          <div class="update-header">
            <span class="update-version">${item.version || ''}</span>
            <span class="update-date">${item.date || ''}</span>
          </div>
          <h2 class="update-title">${item.title || '(タイトルなし)'}</h2>
          <p class="update-body">${item.body || ''}</p>
        `;

        // 5. 組み立てた記事をコンテナに挿入
        container.appendChild(article);
      });
    })
    .catch(error => {
      // 6. エラー処理
      console.error('Failed to load updates:', error);
      container.innerHTML = '<p>更新履歴の読み込みに失敗しました。時間をおいて再度お試しください。</p>';
    });

})();