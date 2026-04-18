const express = require('express');
const path = require('path');
const app = express();

app.use(express.static(path.join(__dirname, '../app/dist')));

app.get(/(.*)/, (req, res) => {
  res.sendFile(path.join(__dirname, '../app/dist/index.html'));
});

app.listen(5173, '0.0.0.0', () => {
  console.log('Static server running on port 5173');
});
