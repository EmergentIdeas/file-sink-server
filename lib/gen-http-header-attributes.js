const mime = require('mime')
function genHTTPHeaderAttributes(info, headRequest) {
	let result = {
		'File-Type': info.directory ? 'directory' : 'file'
	}
	if(info.children) {
		result['Child-Count'] = info.children.length
	}

	if(!info.directory) {
		let type = mime.getType(info.name)
		if(type) {
			result['Content-Type'] = type
		}
	}
	if(headRequest) {
		if(info.stat && info.stat.size) {
			result['Content-Length'] = info.stat.size
		}
	}
	return result
}

module.exports = genHTTPHeaderAttributes