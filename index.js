const express = require('express');
const app = express();
const port = 6767;

app.use(express.json());
app.get('/', (req, res) => {
  res.send('ta rolando!');
});
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});