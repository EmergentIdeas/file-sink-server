require('mocha')
var expect = require('chai').expect
var assert = require('chai').assert
const FileSinkServer = require('../lib/file-sink-server')

let fss = new FileSinkServer(null, {
	errorHandler: (status = 404, e, req, res, next, msg = "Not Found") => {
		let err = new Error(msg)
		err.status = status
		err.originalError = e
		return next(err)
	}
})
let disallowed = require('../lib/disallowed-stat-attributes')



let res = {
	end: () => {

	}
	, set: () => {

	}
	, json: () => {

	}
}

describe("tests the pure(ish) functions", function () {

	it("clean info", function () {

		let info = {
			parent: 'theparent',
			relPath: 'relpath',
			stat: {}
		}
		for (let attr of disallowed) {
			info.stat[attr] = true
		}
		info = fss.cleanInfo(info)
		for (let attr of disallowed) {
			assert.isNotTrue(info.stat[attr])
		}
		assert.isFalse(!!info.parent)
		assert.isFalse(!!info.relPath)
	})

	it("determine root name", function () {
		let req = {
			baseUrl: '/abc/def/root-path'
		}
		assert.equal(fss.determineRootName(req), 'root-path')
	})

})


describe("header attributes", function () {
	it("directories", function () {
		let info = {
			parent: 'theparent',
			relPath: 'relpath',
			stat: {},
			directory: true
		}

		let attrs = fss.genHTTPHeaderAttributes(info)
		assert.equal(attrs['File-Type'], 'directory')
		assert.isUndefined(attrs['Child-Count'])

		info.children = [{}, {}, {}]
		attrs = fss.genHTTPHeaderAttributes(info)
		assert.equal(attrs['File-Type'], 'directory')
		assert.equal(attrs['Child-Count'], 3)
	})

	it("files", function () {
		let info = {
			name: 'something.html',
			parent: 'theparent',
			relPath: 'relpath',
			stat: {
				size: 1234
			},
			directory: false
		}

		let attrs = fss.genHTTPHeaderAttributes(info, true)
		assert.equal(attrs['File-Type'], 'file')
		assert.equal(attrs['Content-Length'], 1234)
		assert.equal(attrs['Content-Type'], 'text/html')
		assert.isUndefined(attrs['Child-Count'])

	})
})



describe("security", function () {
	let req = {
		params: {
			"0": 'test'
		}
	}
	let oldAuth = fss.authorizationProvider

	fss.authorizationProvider = async (path, req) => {
		return false
	}

	it("infoGET", function (done) {
		fss.infoGET(req, res, (err) => {
			if (err && err.status == 401) {
				done()
			}
			else {
				done(new Error('Access was not allowed but was granted'))
			}
		})
	})

	it("contentGET", function (done) {
		fss.contentGET(req, res, (err) => {
			if (err && err.status == 401) {
				done()
			}
			else {
				done(new Error('Access was not allowed but was granted'))
			}
		})
	})

	it("contentHEAD", function (done) {
		fss.contentHEAD(req, res, (err) => {
			if (err && err.status == 401) {
				done()
			}
			else {
				done(new Error('Access was not allowed but was granted'))
			}
		})
	})

	it("revert", function () {
		fss.authorizationProvider = oldAuth
	})
})

describe("error functions", function () {
	it("file not found", function (done) {
		fss.getInfo = async (path) => {
			throw new Error("Could not find the file. Freak out.")
		}

		let req = {
			params: {
				"0": 'test'
			}
		}
		fss.infoGET(req, res, (err) => {
			if (err != null) {
				done()
			}
			else {
				done(new Error('File was not found but no error was created.'))
			}
		})
	})

	it("file found", function (done) {
		fss.getInfo = async (path) => {
			return {
				name: 'name',
				stat: {}
			}
		}

		let req = {
			params: {
				"0": 'test'
			}
		}
		let handled = false
		fss.infoGET(req, res, (err) => {
			if (err) {
				handled = true
				done(new Error('File should have been found but error was created.'))
			}
		})
		setTimeout(() => {
			if (!handled) {
				done()
			}
		}, 10)

	})

})