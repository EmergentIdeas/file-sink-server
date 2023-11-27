function cleanInfo(info) {
	delete info.parent
	
	if(info.stat) {
		for(let attr of this.disallowedStatAttributes) {
			delete info.stat[attr]
		}
	}
	if(info.directory && info.stat) {
		delete info.stat.size
	}
	
	if(info.children) {
		for(let child of info.children) {
			this.cleanInfo(child)
		}
	}
	
	return info
}

module.exports = cleanInfo
