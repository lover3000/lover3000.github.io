gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);

// ===============================================
// 1. CẤU HÌNH
// ===============================================
const icons = [
  "🐨",
  "🐯",
  "🦁",
  "🐮",
  "🐰",
  "🐻",
  "🐻‍❄️",
  "🐼",
  "🦝",
  "🐶",
  "🐱",
  "🐭",
  "🐹",
  "🐷",
  "🐺",
  "🦊",
  "🐸",
];

const defaultConfig = {
  driver: { name: "Anh", face: 0 },
  passenger: { name: "Em", face: 1 },

  header: "Cuộn xuống để đi chơi nè!",
  footer: "Đi chơi thôi!",

  places: [
    { name: "Nhà", description: "Đón đi chơi nè" },
    { name: "Ăn uống", description: "Đi ăn bún bò" },
    { name: "Công viên", description: "Đi dạo mát" },
    { name: "Nhà", description: "Về ngủ" },
  ],

  segmentHeight: 500,
  paddingTop: 300,
  paddingBottom: 200,
  svgWidth: 500,
};

// Hàm nén object thành chuỗi Base64 an toàn
function encodeConfig(obj) {
  const jsonStr = JSON.stringify(obj);
  // Mẹo xử lý UTF-8 (Tiếng Việt + Emoji) trước khi btoa
  return btoa(unescape(encodeURIComponent(jsonStr)));
}

// Hàm giải nén chuỗi Base64 thành object
function decodeConfig(str) {
  try {
    // BƯỚC 1: Khôi phục ký tự Base64 chuẩn
    // Trang Create đã đổi '+' thành '-' và '/' thành '_' để không lỗi URL
    // Giờ ta phải đổi ngược lại để hàm atob hiểu được.
    let base64 = str.replace(/-/g, "+").replace(/_/g, "/");

    // BƯỚC 2: Bù lại dấu bằng (=) còn thiếu (Padding)
    // Chuỗi Base64 bắt buộc độ dài phải chia hết cho 4
    while (base64.length % 4) {
      base64 += "=";
    }

    // BƯỚC 3: Giải mã UTF-8 (Cho tiếng Việt và Emoji)
    const jsonStr = decodeURIComponent(escape(atob(base64)));

    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("URL không hợp lệ hoặc lỗi giải mã:", e);
    // alert("Link hành trình bị lỗi rồi! Hãy kiểm tra lại nhé."); // Bật lên nếu muốn báo người dùng
    return null;
  }
}

let config = defaultConfig; // Mặc định dùng config gốc

// Kiểm tra xem trên URL có tham số ?data=... không
const params = new URLSearchParams(window.location.search);
const urlData = params.get("data");

if (urlData) {
  const decodedData = decodeConfig(urlData);
  if (decodedData) {
    // Nếu giải mã thành công, ghi đè cấu hình
    config = decodedData;
  }
}

// ===============================================
// 2. KHỞI TẠO TEXT
// ===============================================
document.getElementById("header-text").innerHTML = config.header;
document.getElementById("footer-text").innerHTML = config.footer;
document.getElementById("driver-name").textContent = config.driver.name;
document.getElementById("driver-face").textContent = icons[config.driver.face];
document.getElementById("passenger-name").textContent = config.passenger.name;
document.getElementById("passenger-face").textContent =
  icons[config.passenger.face];

// ===============================================
// 3. RENDER BẢN ĐỒ & HIỆU ỨNG SÁNG ĐÈN
// ===============================================
function setupMapAndRenderPlaces() {
  // 1. TÍNH TOÁN SỐ KHÚC CUA & CHIỀU CAO
  // (Dựa trên tổng số địa điểm trừ đi điểm đầu và điểm cuối)
  // Ví dụ: 6 địa điểm -> còn 4 điểm giữa -> cần khoảng 5 khúc cua nối
  config.numCurves = Math.max(1, config.places.length - 2);

  const totalHeight =
    config.paddingTop +
    config.numCurves * config.segmentHeight +
    config.paddingBottom;

  // Cập nhật chiều cao DOM & SVG
  document.getElementById("map-container").style.height = totalHeight + "px";
  document
    .getElementById("main-svg")
    .setAttribute("viewBox", `0 0 ${config.svgWidth} ${totalHeight}`);

  const placesGroup = document.getElementById("places-group");
  placesGroup.innerHTML = ""; // Xóa sạch cũ

  // 2. TÁCH DỮ LIỆU (Dùng bản copy để không làm hỏng config gốc khi chạy lại)
  let tempPlaces = [...config.places]; // Copy mảng config.places ra mảng tạm

  const startPlace = tempPlaces.shift(); // Lấy thằng đầu tiên
  const endPlace = tempPlaces.pop(); // Lấy thằng cuối cùng
  const middlePlaces = tempPlaces; // Còn lại là khúc giữa

  // --- HÀM CON ĐỂ VẼ 1 ĐỊA ĐIỂM (Tránh lặp code) ---
  function renderSinglePlace(place, x, y) {
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.setAttribute("class", "place-group");

    // Text Tên
    const nameText = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "text"
    );
    nameText.setAttribute("x", x);
    nameText.setAttribute("y", y);
    nameText.setAttribute("class", "landmark");
    nameText.textContent = place.name;
    group.appendChild(nameText);

    // Text Mô tả
    if (place.description) {
      const descText = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "text"
      );
      descText.setAttribute("x", x);
      descText.setAttribute("y", y + 25);
      descText.setAttribute("class", "description");
      descText.textContent = place.description;
      group.appendChild(descText);
    }

    placesGroup.appendChild(group);

    // ScrollTrigger cho địa điểm này
    ScrollTrigger.create({
      trigger: group,
      start: "top 60%",
      end: "top 40%",
      onEnter: () => group.classList.add("active"),
      onLeaveBack: () => group.classList.remove("active"),
    });
  }

  // 3. VẼ ĐIỂM ĐẦU (START)
  // Nằm ngay vị trí bắt đầu vẽ đường (paddingTop)
  if (startPlace) {
    renderSinglePlace(startPlace, config.svgWidth / 2, config.paddingTop / 2);
  }

  // 4. VẼ CÁC ĐIỂM GIỮA (MIDDLE)
  // Các điểm này nằm ở các khớp nối của đường cong
  middlePlaces.forEach((place, index) => {
    // Tính vị trí Y: Bắt đầu từ sau khúc cua thứ nhất
    const posY =
      config.paddingTop +
      (index * config.segmentHeight + config.segmentHeight / 2);
    renderSinglePlace(place, config.svgWidth / 2, posY);
  });

  // 5. VẼ ĐIỂM CUỐI (END)
  // Nằm ở cuối con đường
  if (endPlace) {
    const endY = config.paddingTop + config.numCurves * config.segmentHeight;
    renderSinglePlace(
      endPlace,
      config.svgWidth / 2,
      endY + config.paddingBottom / 2
    );
  }

  return { totalHeight };
}

// ===============================================
// 4. VẼ ĐƯỜNG
// ===============================================
function generatePath() {
  const startX = config.svgWidth / 2;
  const startY = config.paddingTop;

  let d = `M ${startX}, ${startY}`;
  let currentY = startY;

  for (let i = 0; i < config.numCurves; i++) {
    const direction = i % 2 === 1 ? -1 : 1;
    const amplitude = 180 + Math.random() * 40;
    const randomXShift = (Math.random() - 0.5) * 30;

    const endX = config.svgWidth / 2 + randomXShift;
    const endY = currentY + config.segmentHeight;

    const cp1x = config.svgWidth / 2 + direction * amplitude;
    const cp1y = currentY + config.segmentHeight * 0.25;
    const cp2x = config.svgWidth / 2 + direction * amplitude;
    const cp2y = currentY + config.segmentHeight * 0.75;

    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${endX},${endY}`;
    currentY = endY;
  }
  return d;
}

// --- CHẠY ---
setupMapAndRenderPlaces();
const pathData = generatePath();
document.getElementById("path-road").setAttribute("d", pathData);

// Xe chạy
gsap.to("#bike-group", {
  scrollTrigger: {
    trigger: "#path-road",
    start: "top center",
    end: "bottom center",
    scrub: 1,
  },
  motionPath: {
    path: "#path-road",
    align: "#path-road",
    autoRotate: true,
    alignOrigin: [0.5, 0.8],
  },
  ease: "none",
});

// ===============================================
// XỬ LÝ ÂM THANH YOUTUBE
// ===============================================
const musicBtn = document.getElementById("music-btn");
const playerDiv = document.getElementById("youtube-player");
let isPlaying = false;

// Kiểm tra xem config có nhạc không
if (config.musicId) {
  musicBtn.style.display = "flex"; // Hiện nút nếu có nhạc

  musicBtn.addEventListener("click", () => {
    if (isPlaying) {
      // Tắt nhạc: Xóa iframe đi cho nhanh gọn
      playerDiv.innerHTML = "";
      musicBtn.classList.remove("playing");
      musicBtn.innerHTML = "🎵"; // Icon nốt nhạc tĩnh
      isPlaying = false;
    } else {
      // Bật nhạc: Chèn Iframe YouTube vào
      // autoplay=1: Tự chạy
      // loop=1: Tự lặp lại
      // playlist=...: Cần thiết để loop hoạt động
      const iframeHtml = `
                    <iframe width="1" height="1" 
                        src="https://www.youtube.com/embed/${config.musicId}?autoplay=1&loop=1&playlist=${config.musicId}" 
                        title="YouTube audio" frameborder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowfullscreen>
                    </iframe>`;

      playerDiv.innerHTML = iframeHtml;
      musicBtn.classList.add("playing");
      musicBtn.innerHTML = "💿"; // Icon đĩa than xoay
      isPlaying = true;
    }
  });
} else {
  musicBtn.style.display = "none"; // Ẩn nút nếu không có link nhạc
}
