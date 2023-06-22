const axios = require('axios')
const FileSink = require('file-sink')

let fsPublic = new FileSink('public')
let fsTestData = new FileSink('test-data')
let fsDownloads = new FileSink('/home/kolz/Downloads')

console.log('sending')

async function run() {
	// let data = fsTestData.readSync('beer-cat.jpg')
	let datastream = fsTestData.readStream('beer-cat.jpg')
	let result = await axios(
		{
			method: 'put',
			url: 'http://localhost:3000/public/css/test3.jpg',
			data: datastream,
			headers: {
				'Content-Type': 'image/jpg'
			}
		}
	)
	console.log(result.response)

}

// async function run() {
	// data = fsDownloads.readSync('Schoeppner Inc and ImageBridge Design.zip')
	// let datastream = fsDownloads.readStream('Schoeppner Inc and ImageBridge Design.zip')
// 	let result = await axios(
// 		{
// 			method: 'put',
// 			url: 'http://localhost:3000/public/css/big.zip',
// 			data: datastream,
// 			headers: {
// 				'Content-Type': 'foo/bar'
// 			}
// 		}
// 	)
// 	console.log(result)

// }

run()



