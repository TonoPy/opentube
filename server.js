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

if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
if (!fs.existsSync('data.json')) fs.writeFileSync('data.json', '[]');

// รับเฉพาะวิดีโอ
const videoFilter = (req, file, cb) => {
  const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('เฉพาะไฟล์วิดีโอเท่านั้น'));
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});

const upload = multer({ storage, fileFilter: videoFilter });

app.get('/', (req, res) => {
  const data = JSON.parse(fs.readFileSync('data.json'));
  res.render('index', { videos: data.reverse() });
});

app.get('/upload', (req, res) => {
  res.render('upload');
});

app.post('/upload', upload.single('video'), (req, res) => {
  const data = JSON.parse(fs.readFileSync('data.json'));
  const newVideo = {
    id: Date.now(),
    title: req.body.title,
    description: req.body.description,
    filename: req.file.filename
  };
  data.push(newVideo);
  fs.writeFileSync('data.json', JSON.stringify(data, null, 2));
  res.redirect('/');
});

app.get('/video/:id', (req, res) => {
  const data = JSON.parse(fs.readFileSync('data.json'));
  const video = data.find(v => v.id == req.params.id);
  if (!video) return res.status(404).send('ไม่พบวิดีโอ');
  res.render('video', { video });
});

app.post('/delete/:id', (req, res) => {
  let data = JSON.parse(fs.readFileSync('data.json'));
  const video = data.find(v => v.id == req.params.id);
  if (video) {
    fs.unlinkSync(path.join('uploads', video.filename));
    data = data.filter(v => v.id != req.params.id);
    fs.writeFileSync('data.json', JSON.stringify(data, null, 2));
  }
  res.redirect('/');
});

app.listen(PORT, () => {
  console.log(`เซิร์ฟเวอร์ทำงานบนพอร์ต ${PORT}`);
});