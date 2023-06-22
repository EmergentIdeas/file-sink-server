require('mocha')
var expect = require('chai').expect
var assert = require('chai').assert
const FileSinkServer = require('../server-js/file-sink-server')
const FileSink = require('file-sink')
const fs = require('fs')
const axios = require('axios')
let disallowed = require('../server-js/disallowed-stat-attributes')

let dirName = fs.mkdtempSync('/tmp/filesinkservertest')
console.log(`temporary directory: ${dirName}`)

let sink = new FileSink(dirName)
let fss = new FileSinkServer(sink)

let testSink = new FileSink('./test-data')

const port = 3001
const express = require('express')


let app = express()
app.set('port', port)
let http = require('http');
let server = http.createServer(app)
server.listen(port)

let router = express.Router()
fss.addToRouter(router)

app.use('/store1', router)

app.use((err, req, res, next) => {
	res.status(err.status)
	res.end()
})

let testData = 'abcdefg'

async function addTests() {
	
	await sink.write('test1.txt', testData) 



	describe("requested data", function() {
		it('read file', async function() {
			let response = await axios.get(`http://localhost:${port}/store1/test1.txt`)
			assert.equal(response.data, testData)
		})
		it('read file, trailing slash', async function() {
			let response = await axios.get(`http://localhost:${port}/store1/test1.txt/`)
			assert.equal(response.data, testData)
		})
		it('read info', async function() {
			let response = await axios.get(`http://localhost:${port}/store1/$info`)
			assert.equal(response.data.children.length, 1)
		})
		it('read hash', async function() {
			let response = await axios.get(`http://localhost:${port}/store1/$hash/test1.txt`)
			assert.equal(response.data, await sink.createHash('test1.txt'))
		})
		it('read hash, missing file', async function() {
			try {
				let response = await axios.get(`http://localhost:${port}/store1/$hash/text1.txt`)
			}
			catch(e) {
				let status = e.response.status
				assert.isTrue(status == 404)
				return
			}
			throw new Error()	
		})
		it('read non-existant file', async function() {
			try {
				let response = await axios.get(`http://localhost:${port}/store1/test2.txt`)
			}
			catch(e) {
				assert.equal(e.response.status, 404)
				return
			}
			throw new Error()	
		})
		it('write info', async function() {
			let filename = 'campfire.jpg'

			let response = await axios({
				method: 'put',
				url: `http://localhost:${port}/store1/${filename}`,
				data: testSink.readStream(filename),
				headers: {
					'Content-Type': 'application/octet-stream'
				}
			})

			assert.equal(response.status, 200)
			assert.equal(await sink.createHash(filename), await testSink.createHash(filename))
		})
		it('test shorter rewrite', async function() {
			let filename = 'campfire.jpg'

			let response = await axios({
				method: 'put',
				url: `http://localhost:${port}/store1/${filename}`,
				data: testData,
				headers: {
					'Content-Type': 'application/octet-stream'
				}
			})

			assert.equal(response.status, 200)
			assert.equal((await sink.getFullFileInfo(filename)).stat.size, testData.length)
		})
		it('test file info', async function() {
			let filename = 'campfire.jpg'

			let response = await axios({
				method: 'get',
				url: `http://localhost:${port}/store1/\$info/${filename}`
			})

			assert.equal(response.status, 200)
			assert.equal(response.data.stat.size, testData.length)
		})
		it('test file info, trailing slash', async function() {
			let filename = 'campfire.jpg'

			let response = await axios({
				method: 'get',
				url: `http://localhost:${port}/store1/\$info/${filename}/`,
				headers: {
					'Content-Type': 'application/octet-stream'
				}
			})

			assert.equal(response.status, 200)
			assert.equal(response.data.stat.size, testData.length)
		})
		it('mkdir', async function() {
			let filename = 'dir2'

			let response = await axios({
				method: 'put',
				url: `http://localhost:${port}/store1/${filename}`,
				headers: {
					'File-Type': 'directory'
				}
			})

			assert.equal(response.status, 200)
			let name = (await sink.getFullFileInfo(filename)).name
			assert.equal(name, filename)
		})
		it('read hash directory', async function() {
			try {
				let response = await axios.get(`http://localhost:${port}/store1/$hash/dir2`)
			}
			catch(e) {
				let status = e.response.status
				assert.isTrue(status == 405)
				return
			}
			throw new Error()	
		})
		it('mkdir for existing directory', async function() {
			let filename = 'dir2'

			let response = await axios({
				method: 'put',
				url: `http://localhost:${port}/store1/${filename}`,
				headers: {
					'File-Type': 'directory'
				}
			})

			assert.equal(response.status, 200)
			let name = (await sink.getFullFileInfo(filename)).name
			assert.equal(name, filename)
		})
		it('write file to directory', async function() {
			let filename = 'campfire.jpg'
			try {
				let response = await axios({
					method: 'put',
					url: `http://localhost:${port}/store1/dir2`,
					data: testSink.readStream(filename),
					headers: {
						'Content-Type': 'application/octet-stream'
					}
				})
			}
			catch(e) {
				if(!e.response) {
					// This is okay too. What can happen here is that axios is
					// still attempting to send data when the server closes the connection
					// with a status code.
					// That causes axios to ignore the response (seems like a bug) and surface
					// the error is if it were a broken pipe, which means no response body.
				}
				else {
					let status = e.response.status
					assert.isTrue(status == 409)
				}
				return
			}
			throw new Error()	

		})
		it('mkdir for existing file', async function() {
			try {
				let response = await axios({
					method: 'put',
					url: `http://localhost:${port}/store1/campfire.jpg`,
					headers: {
						'File-Type': 'directory'
					}
				})
			}
			catch(e) {
				let status = e.response.status
				assert.isTrue(status == 409)
				return
			}
			throw new Error()	

		})
		it('shutdown', async function() {
			try {
				await sink.rm('', {recursive: true})
			}
			catch(e) {
				console.log(e)
			}
			server.close()
		})
		/*
		it("directories", function() {
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

		it("files", function() {
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
		*/
	})
	/*

	describe("error functions", function() {
		it("file not found", function(done) {
			fss.getInfo = async (path) => {
				throw new Error("Could not find the file. Freak out.")
			}
		
			let req = {
				params: {
					"0": 'test'
				}
			}
			fss.infoGET(req, res, (err) => {
				if(err != null) {
					done()
				}	
				else {
					done(new Error('File was not found but no error was created.'))
				}
			})
		})

		it("file found", function(done) {
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
				if(err) {
					handled = true
					done(new Error('File should have been found but error was created.'))
				}	
			})
			setTimeout(() => {
				if(!handled) {
					done()
				}
			}, 10)

		})
		
	})

	*/

}

addTests()