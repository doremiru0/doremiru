/* ======================================== */
/* ▼▼▼ PDF処理用スクリプト (pdfHandler.js) 更新版 ▼▼▼ */
/* ======================================== */

(function () {
  const pdfModal = document.getElementById('pdfModal');
  const pdfGrid = document.getElementById('pdfGrid');
  const pdfLoading = document.getElementById('pdfLoading');
  const closePdfModal = document.getElementById('closePdfModal');
  const scoreImg = document.getElementById('scoreImg');

  let currentPDF = null;

  window.handlePdfFile = async function (file) {
    pdfModal.style.display = 'block';
    pdfGrid.innerHTML = '';
    pdfLoading.style.display = 'block';
    pdfLoading.textContent = 'PDFを読み込み中...';

    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
        cMapPacked: true,
        // PDF標準フォント（埋め込みがない場合の代替）の取得先を指定
        standardFontDataUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/standard_fonts/',
        // ブラウザのフォント読み込み制限を回避し、PDF.js側で描画する設定
        disableFontFace: true,
      });

      currentPDF = await loadingTask.promise;
      pdfLoading.style.display = 'none';

      for (let i = 1; i <= currentPDF.numPages; i++) {
        const page = await currentPDF.getPage(i);
        const viewport = page.getViewport({ scale: 0.4 });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        // 背景を白で塗りつぶす（透明なPDFの場合、JPEG変換時に黒くなるのを防ぐため）
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);

        await page.render({
          canvasContext: context,
          viewport: viewport,
          intent: 'print' // 印刷用パスでレンダリング（精度が上がることがあります）
        }).promise;

        const item = document.createElement('div');
        item.className = 'pdf-page-item';
        item.innerHTML = `<div class="pdf-page-label">${i}ページ</div>`;
        item.prepend(canvas);

        item.onclick = () => selectPage(i);
        pdfGrid.appendChild(item);
      }
    } catch (err) {
      console.error('PDF Load Error:', err);
      alert('PDFの読み込みに失敗しました。');
      pdfModal.style.display = 'none';
    }
  };

  async function selectPage(pageNum) {
    pdfLoading.style.display = 'block';
    pdfLoading.textContent = `${pageNum} ページをレンダリング中...`;

    const page = await currentPDF.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2.5 });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // メイン画像生成時も背景を白で塗りつぶす
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvasContext: context,
      viewport: viewport,
      intent: 'print'
    }).promise;

    // JPEGとして出力（背景が白でないと文字が見えなくなるのを防ぐ）
    scoreImg.src = canvas.toDataURL('image/jpeg', 0.9);
    pdfModal.style.display = 'none';
  }

  closePdfModal.onclick = () => {
    pdfModal.style.display = 'none';
  };
})();