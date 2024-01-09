const express = require('express');
const path = require('path');
const app = express();

app.use(express.static(path.join(process.cwd(), "public"), {
  extensions: ['html', 'htm']
}));

app.listen(4030, () => console.log('Frontend server is running'));
