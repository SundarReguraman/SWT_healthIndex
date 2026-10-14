const express = require('express');
const cors = require('cors');
const os = require('os');
const readingsRouter = require('./routes/readings');
const { startDemo } = require('./services/demo');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', readingsRouter);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
	console.log(`Tank health backend running on port ${PORT}`);
	console.log('Network interfaces:', os.networkInterfaces());
	// `--demo` or `--demo=attention|critical` streams demo readings when no device is posting.
	const demoArg = process.argv.find((a) => a.startsWith('--demo'));
	if (demoArg) startDemo(demoArg.split('=')[1] || 'good');
});
