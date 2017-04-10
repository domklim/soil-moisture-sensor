var express = require('express')
    , bodyParser = require('body-parser')
    , logger = require('morgan')
    , errorHandler = require('errorhandler')
    , mongoose = require('mongoose')
    , url = require('url')
    , cors = require('cors')
    , methodOverride = require('method-override')
    , path = require('path')
    , cfg = require('./cfg')
    , chartdata = require('./chartdata');

var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);

app.set('port', process.env.PORT || 3000);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cors());
app.use(logger('dev'));
app.use(methodOverride());

app.use((req, res, next)=>{
	req.io = io;
	next();
});

app.use(express.static(__dirname + '/public'));

if('development' == app.get('env')){
	app.use(errorHandler());
};

let chartDB = mongoose.createConnection(cfg.uri);

chartDB.on('open', () => {
	console.log('Connected to ChartDB');
});

chartDB.on('error', (err) => {
	console.log('ChartDB error', err);
});

let valueSchema = new mongoose.Schema({
	id: {
		type: String,
		index: {
			unique: true
		}
	},
	value: String
});

let valueModel = chartDB.model('Value', valueSchema);

app.get('/', (req, res) => {
	res.end('Success')
	res.sendFile(path.join(__dirname + '/public/index.html'));
});


app.post('/value', (req, res) => {
	let bodyId = req.body.id;
	let bodyValue = req.body.value;
	if(!bodyId || !bodyValue){
		res.writeHead(400, {
			'content-type': 'text/plain'
		});
		res.end('Bad request');
	} else {
		valueModel.findOne({id: bodyId}, (err, data) => {
			if(err) {
				console.log('error in modelFind', err);
				if(res != null){
					res.writeHead(500, {
						'content-type': 'text/plain'
					});
					res.end('Internal server error');
				}
			} else {
				let val = new valueModel({
					value: req.body.value,
					id: req.body.id
				});
				if(!data) {
					val.save((err) => {
						if(!err){
							io.emit('value', JSON.stringify(val));
							val.save();
						} else {
							console.log('error in saving value', err);
						}
					});
					if(res != null) {
						res.writeHead(201, {
							'content-type': 'text/plain'
						});
						res.end('Created');
					}
				} else {
				
				data.value = val.value;
				data.id = val.id;
				data.save((err) => {
					if(!err) {
						io.emit('value', JSON.stringify(data));
						data.save();
					} else {
						console.log('error in updating', err);
					}
				});

				if(res != null) {
					res.writeHead(200, {
						'content-type': 'text/plain'
					});
					res.end('Success');
				}
				}
			}
		});
	}
});

app.get('/all', (req, res) => {
	chartdata.list(valueModel, res);
});

app.delete('/all', (req, res) => {
	chartdata.deleteAll(valueModel, res);
})

io.on('connection', (socket) => {
	console.log('Socket connection ');
	valueModel.find({}, {value: 1, id: 1, _id: 0}, (err, result) => {
		if(err) {
			console.log('list error', err);
			return null;
		} 
		io.emit('dataSet', JSON.stringify(result));
	});
});

server.listen(app.get('port'));
console.log('Server is up on localhost: ', app.get('port'));
