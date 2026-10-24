// Заранее заготовленный список треков (Название + ID видео из YouTube)
const PRESET_TRACKS = [
  { name: "Эпичная боевая музыка", id: "5qap5aO4i9A" },
  { name: "Таверна: Шум и кружки", id: "fZw97_q7vOM" },
  { name: "Мрачное подземелье (Эмбиент)", id: "dQw4w9WgXcQ" }, // Замените на свои ID
  { name: "Лес ночью", id: "jfKfPfyJRdk" }
];

const SOCKET_NAME = "module.simple-youtube-player";

Hooks.once('init', () => {
  console.log("Simple YouTube Player | Инициализация модуля с поддержкой сокетов");

  // Слушаем сокеты на клиентах игроков
  game.socket.on(SOCKET_NAME, (data) => {
    if (data.action === "play") {
      playYouTubeAudio(data.videoId);
    } else if (data.action === "stop") {
      stopYouTubeAudio();
    }
  });
});

// Добавляем кнопку на левую панель инструментов (только для GM)
Hooks.on('getSceneControlButtons', (controls) => {
  if (!game.user.isGM) return; // Управлять может только Мастер

  const tokenControls = controls.find(c => c.name === "token");
  if (tokenControls) {
    tokenControls.tools.push({
      name: "youtube-player",
      title: "YouTube Плеер (GM)",
      icon: "fas fa-music",
      visible: true,
      onClick: () => toggleYouTubeWindow(),
      button: true
    });
  }
});

let youtubeWindow = null;

function toggleYouTubeWindow() {
  if (youtubeWindow) {
    youtubeWindow.close();
    youtubeWindow = null;
    return;
  }

  // Генерируем опции для выпадающего списка
  let optionsHtml = PRESET_TRACKS.map(track => 
    `<option value="${track.id}">${track.name}</option>`
  ).join('');

  youtubeWindow = new Dialog({
    title: "Панель музыки YouTube (Для всех)",
    content: `
      <div style="margin-bottom: 12px;">
        <label style="font-weight: bold;">Выберите трек из списка:</label><br>
        <select id="yt-track-select" style="width: 100%; margin-top: 5px; padding: 4px;">
          ${optionsHtml}
        </select>
      </div>
      <div style="text-align: center; margin-bottom: 10px;">
        <button id="yt-play-all" class="dialog-button" style="padding: 6px 12px; background: #2e7d32; color: white; border-radius: 4px; cursor: pointer;">
          <i class="fas fa-play"></i> Включить всем
        </button>
        <button id="yt-stop-all" class="dialog-button" style="padding: 6px 12px; margin-left: 5px; background: #c62828; color: white; border-radius: 4px; cursor: pointer;">
          <i class="fas fa-stop"></i> Выключить у всех
        </button>
      </div>
      <div id="yt-container" style="text-align: center; margin-top: 10px;"></div>
    `,
    buttons: {},
    render: (html) => {
      // Кнопка «Включить всем»
      html.find('#yt-play-all').click(() => {
        let videoId = html.find('#yt-track-select').val();
        
        // 1. Управляем у себя
        playYouTubeAudio(videoId);

        // 2. Рассылаем сигнал всем игрокам через сокет
        game.socket.emit(SOCKET_NAME, { action: "play", videoId: videoId });
        ui.notifications.info("Музыка отправлена всем игрокам!");
      });

      // Кнопка «Выключить у всех»
      html.find('#yt-stop-all').click(() => {
        stopYouTubeAudio();
        game.socket.emit(SOCKET_NAME, { action: "stop" });
        ui.notifications.info("Музыка остановлена у всех игроков.");
      });
    },
    close: () => {
      youtubeWindow = null;
    }
  }, {
    width: 380,
    height: 240,
    resizable: false
  });

  youtubeWindow.render(true);
}

// Функция вставки фрейма плеера (скрытого или миниатюрного)
function playYouTubeAudio(videoId) {
  let existingContainer = document.getElementById('global-yt-player-container');
  if (!existingContainer) {
    existingContainer = document.createElement('div');
    existingContainer.id = 'global-yt-player-container';
    // Прячем плеер в угол экрана, чтобы он не загораживал интерфейс, но музыка играла
    existingContainer.style.position = 'fixed';
    existingContainer.style.bottom = '10px';
    existingContainer.style.right = '10px';
    existingContainer.style.zIndex = '10000';
    existingContainer.style.opacity = '0.8'; // Можно сделать '0' для полной невидимости
    document.body.appendChild(existingContainer);
  }

  existingContainer.innerHTML = `
    <iframe width="200" height="113" 
      src="https://www.youtube.com/embed/${videoId}?autoplay=1" 
      title="YouTube player" frameborder="0" 
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
      allowfullscreen>
    </iframe>
  `;
}

// Функция остановки музыки
function stopYouTubeAudio() {
  let existingContainer = document.getElementById('global-yt-player-container');
  if (existingContainer) {
    existingContainer.innerHTML = '';
  }
}