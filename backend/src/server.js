const express = require('express');
const cors = require('cors');
const readingsRouter = require('./routes/readings');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', readingsRouter);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Tank health backend running on port ${PORT}`));
