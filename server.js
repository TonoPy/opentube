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

function isWithinShutdownHours() {
  const now = new Date();
  const day = now.getDay();
  let hour = now.getUTCHours() + 7;

  if (hour >= 24) hour -= 24; // แก้กรณีเกิน 23:59 ให้วนกลับมา 0

  const shutdownConfig = {
    1: { from: 0, to: 6 },   // Monday: 00:00 - 06:00
    2: { from: 1, to: 6 },   // Tuesday: 01:00 - 06:00
    3: { from: 1, to: 6 },   // Wednesday: 01:00 - 06:00
    4: { from: 1, to: 5 },   // Thursday: 01:00 - 05:00
    5: { from: 1, to: 5 },   // Friday: 01:00 - 05:00
    6: { from: 1, to: 5 },   // Saturday: 01:00 - 05:00
    0: { from: 1, to: 5 },   // Sunday: 01:00 - 05:00
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

const upload = multer({ storage });

app.get('/', (req, res) => {
  const data = JSON.parse(fs.readFileSync(dataPath));
  res.render('index', { videos: data.reverse() });
});

app.get('/upload', (req, res) => {
  res.render('upload');
});

app.get('/search', (req, res) => {
    const query = req.query.q || '';  // รับค่าจาก query string (หรือเป็นค่าว่างถ้าไม่มี q)
    res.render('search', { q: query });  // ส่งค่าของ q ไปให้กับ ejs
});;

app.get('/search', (req, res) => {
  res.render('search');
});

app.post('/upload', upload.single('video'), (req, res) => {
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

app.get('/video/:id', (req, res) => {
  const data = JSON.parse(fs.readFileSync(dataPath));
  const video = data.find(v => v.id == req.params.id);
  if (!video) return res.status(404).send('Not found');
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
