const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

const dataPath = 'data.json';
if (!fs.existsSync(dataPath)) fs.writeFileSync(dataPath, '[]');

// สร้างโฟลเดอร์ uploads หากยังไม่มี
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

function isWithinShutdownHours() {
  const now = new Date();
  const day = now.getDay();
  let hour = now.getUTCHours() + 7;
  if (hour >= 24) hour -= 24;

  const shutdownConfig = {
    1: { from: 0, to: 6 },
    2: { from: 1, to: 6 },
    3: { from: 1, to: 6 },
    4: { from: 1, to: 5 },
    5: { from: 1, to: 5 },
    6: { from: 1, to: 5 },
    0: { from: 1, to: 5 },
  };

  const config = shutdownConfig[day];
  return hour >= config.from && hour < config.to;
}

app.use((req, res, next) => {
  if (isWithinShutdownHours()) {
    return res.status(503).send('<h1 style="font-family:sans-serif;text-align:center;margin-top:20vh">เว็บไซต์ปิดให้บริการชั่วคราว<br>โปรดลองใหม่ภายหลัง</h1>');
  }
  next();
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-matroska'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('ไฟล์ที่อัปโหลดต้องเป็นวิดีโอเท่านั้น'));
    }
  }
});

app.get('/', (req, res) => {
  const data = JSON.parse(fs.readFileSync(dataPath));
  res.render('index', { videos: data.reverse() });
});

app.get('/upload', (req, res) => {
  res.render('upload');
});

app.get('/search', (req, res) => {
  const query = req.query.q || '';
  res.render('search', { q: query });
});

app.post('/upload', (req, res) => {
  upload.single('video')(req, res, (err) => {
    if (err) {
      return res.status(400).send(`
        <h1 style="font-family:sans-serif;text-align:center;margin-top:20vh;color:red;">
          ${err.message}<br><br>
          <a href="/upload">ย้อนกลับ</a>
        </h1>
      `);
    }

    if (!req.file) {
      return res.status(400).send(`
        <h1 style="font-family:sans-serif;text-align:center;margin-top:20vh;color:red;">
          ไม่พบไฟล์วิดีโอที่อัปโหลด<br><br>
          <a href="/upload">ย้อนกลับ</a>
        </h1>
      `);
    }

    const data = JSON.parse(fs.readFileSync(dataPath));
    const newVideo = {
      id: Date.now(),
      title: req.body.title,
      description: req.body.description,
      filename: req.file.filename
    };
    data.push(newVideo);
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
    res.redirect('/');
  });
});

app.get('/video/:id', (req, res) => {
  const data = JSON.parse(fs.readFileSync(dataPath));
  const video = data.find(v => v.id == req.params.id);
  if (!video) return res.status(404).send('ไม่พบวิดีโอ');
  res.render('video', { video });
});

app.post('/delete/:id', (req, res) => {
  let data = JSON.parse(fs.readFileSync(dataPath));
  const video = data.find(v => v.id == req.params.id);
  if (!video) return res.redirect('/');
  fs.unlinkSync(path.join('uploads', video.filename));
  data = data.filter(v => v.id != req.params.id);
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  res.redirect('/');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});