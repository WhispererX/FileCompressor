const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  nativeImage,
  ipcMain,
  dialog,
  shell,
} = require("electron");
const path = require("node:path");
const fs = require("fs");
const sharp = require("sharp");
const ffmpeg = require("fluent-ffmpeg");

// Initialize a variable to hold the instance of our main window
let window;
let tray;

let openCompressedFile = false;

// Context menu which will be used when right clicking on the tray icon
const trayContextMenu = Menu.buildFromTemplate([
  {
    label: "Compress Files...",
    type: "normal",
    click: () => {
      let window;
      if (BrowserWindow.getAllWindows().length === 0) {
        window = createWindow("index.html");
        setTimeout(() => {
          if (BrowserWindow.getAllWindows().length > 0) {
            BrowserWindow.getAllWindows()[0].webContents.send(
              "tray-button-pressed"
            );
          }
        }, 300);
      } else {
        window = BrowserWindow.getAllWindows()[0];
        if (window.isMinimized()) {
          window.restore();
          window.focus();
        }
        window.webContents.send("tray-button-pressed");
      }
    },
  },
  { type: "separator" },
  {
    label: "Always On Top",
    type: "checkbox",
    checked:
      BrowserWindow.getAllWindows().length > 0 &&
      BrowserWindow.getAllWindows()[0].isAlwaysOnTop(),
    click: () => {
      const windows = BrowserWindow.getAllWindows();
      if (windows.length > 0) {
        const currentWindow = windows[0];
        const newState = !currentWindow.isAlwaysOnTop();
        currentWindow.setAlwaysOnTop(newState);

        const trayMenuItem = trayContextMenu.getMenuItemById("always-on-top");
        if (trayMenuItem) {
          trayMenuItem.checked = newState;
        }
      }
    },
  },
  {
    label: "Show Output File",
    type: "checkbox",
    checked: openCompressedFile,
    click: () => {
      openCompressedFile = !openCompressedFile;
    },
  },
  { type: "separator" },
  { label: "Quit File Compressor", role: "quit" },
]);

// A function to help us create new windows
const createWindow = (page, width = 800, height = 600) => {
  Menu.setApplicationMenu(null);
  return new BrowserWindow({
    width: width,
    height: height,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: false,
    },
  }).loadFile(page);
};

// Create windows once the app initializes
app.whenReady().then(() => {
  window = createWindow("index.html");

  // Tray
  const icon = nativeImage.createFromPath(path.join(__dirname, "icon.png"));
  tray = new Tray(icon);
  tray.setContextMenu(trayContextMenu);
  tray.setToolTip("File Compressor");
  tray.setTitle("File Compressor");

  tray.on("click", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      window = createWindow("index.html");
    } else if (BrowserWindow.getAllWindows()[0].isMinimized()) {
      BrowserWindow.getAllWindows()[0].restore();
      BrowserWindow.getAllWindows()[0].focus();
    } else BrowserWindow.getAllWindows()[0].minimize();
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow("index.html");
  });
});

// Close the app once all windows are closed
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
  }
});

// Open File Dialog
ipcMain.handle("open-file-dialog", async () => {
  let result = await dialog.showOpenDialog({
    properties: ["openFile", "multiSelections"],
    filters: [
      { name: "Images", extensions: ["jpg", "jpeg", "png", "gif"] },
      { name: "Videos", extensions: ["mov", "avi", "mp4"] },
    ],
  });
  return result.filePaths;
});

// Compression Logic
ipcMain.handle("compress-file", async (_, filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  const compressedFilePath = path.join(
    app.getPath("temp"),
    "compressed_" + path.basename(filePath)
  );
  const maxFileSize = 50 * 1024 * 1024;
  const originalSize = fs.statSync(filePath).size;

  async function compressImage() {
    const { width: originalWidth } = await sharp(filePath).metadata();
    let width = originalWidth;
    const qualityIncrement = 10;
    let quality = 100;

    while (true) {
      await sharp(filePath)
        .resize({ width })
        .png({ quality })
        .toFile(compressedFilePath);

      const { size } = fs.statSync(compressedFilePath);

      // Check if compressed file size is acceptable
      if (size <= maxFileSize || width <= 200) {
        break;
      }

      // Decrease width and quality
      width = Math.max(width - 100, 0);
      quality = Math.max(quality - qualityIncrement, 0);
    }
  }

  async function compressVideo() {
    const originalMetadata = await new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) reject(err);
        else resolve(metadata);
      });
    });

    const { width: originalWidth, height: originalHeight } =
      originalMetadata.streams[0];

    let width = originalWidth; //Math.min(originalWidth, 640);
    let crf = 1;

    while (true) {
      await new Promise((resolve, reject) => {
        ffmpeg(filePath)
          .output(compressedFilePath)
          .videoCodec("libx264")
          .audioCodec("aac")
          .outputOptions([
            "-preset fast",
            `-crf ${crf}`,
            "-movflags +faststart",
            `-vf scale=${width}:-1`,
          ])
          .on("end", resolve)
          .on("error", reject)
          .run();
      });

      const { size } = fs.statSync(compressedFilePath);

      if (size <= maxFileSize || width <= 320) {
        break;
      }

      //width = Math.max(width - 100, 320);
      crf++; //= Math.min(crf + 1, 30);
    }
  }

  if ([".jpg", ".jpeg", ".png", "gif"].includes(ext)) {
    await compressImage();
  } else if ([".mp4", ".mov", ".avi"].includes(ext)) {
    await compressVideo();
  } else {
    throw new Error("Unsupported file type");
  }

  if (openCompressedFile) shell.openPath(compressedFilePath);

  const stats = fs.statSync(compressedFilePath);
  return {
    filePath: compressedFilePath,
    size: (stats.size / (1024 * 1024)).toFixed(2) + " MB",
  };
});
