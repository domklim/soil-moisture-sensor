exports.list = (model, res) => {
	model.find({}, (err, result) => {
		if(err) {
			console.log('list error', err);
			return null;
		} 
		if(res != null) {
			res.writeHead(200, {
				'content-type': 'text/plain'
			});
			res.end(JSON.stringify(result));
		}
		return JSON.stringify(result);
	})
}

exports.deleteAll = (model, res) => {
	model.remove({}, (err) => {
		if(err) {
			console.log('deletion error', err);
			return null;
		} else {
			if(res != null){
				res.writeHead(200, {
					'content-type': 'text/plain'
				});
				res.end('Success')
			}
		}
	})
}
