// @ts-check

/* 키워드로 검색해서 나온 이미지를 원하는 사이즈로 리사이징해서 돌려주는 서버. */
require('dotenv').config()

const fs = require('fs')
const path = require('path')
const http = require('http')
const { createApi } = require('unsplash-js')
const { default: fetch } = require('node-fetch')
const { pipeline } = require('stream')
const { promisify } = require('util')
const sharp = require('sharp')
const { default: imageSize } = require('image-size')

const unsplash = createApi({
  accessKey: process.env.UNSPLASH_API_ACCESS_KEY,
  // @ts-ignore
  fetch,
})

/**
 * @param {string} query
 */
async function searchImage(query) {
  const result = await unsplash.search.getPhotos({ query })

  if (!result.response) {
    throw new Error('Failed to seaarch image.')
  }

  const image = result.response.results[0]

  if (!image) {
    throw new Error('No image found.')
  }

  return {
    description: image.description || image.alt_description,
    url: image.urls.regular,
  }
}

/**
 * 
 * 이미지를 Unsplash에서 검색하거나, 이미 있다면 캐시된 이미지를 리턴합니다.
 * @param {string} query
 */
async function getCachedImageOrSearchedImage(query){
    const imageFilePath = path.resolve(__dirname,`../images/${query}`)

    
    if(fs.existsSync(imageFilePath)){
        return{
            message: `Returning cached image: ${query}`,
            stream: fs.createReadStream(imageFilePath)
    }
        
    }


    const result = await searchImage(query)
    const resp = await fetch(result.url)

    
    resp.body.pipe(fs.createWriteStream(imageFilePath))

    await promisify(pipeline)(
        resp.body, 
        fs.createWriteStream(imageFilePath)
    )

    const size = imageSize(imageFilePath)
    
    return {
        message: `Returning new image: ${query}, ${size.width}, ${size.height}`,
        stream: fs.createReadStream(imageFilePath)
    }
}

/**
 * 
 * @param {string} url
 */
function convertURLToImageInfo(url){
    const urlObj = new URL(url, 'http://localhost:5000')

    /**
     * 
     * @param {string} name 
     * @param {number} defaultValue
     * @returns 
     */
    function getSearchParam(name, defaultValue){
        const str = urlObj.searchParams.get(name)
        return str ? parseInt(str, 10) : defaultValue
    }

    const width = getSearchParam('width', 400)
    const height = getSearchParam('height', 400)

  

    return {
        query: urlObj.pathname.slice(1),
        width,
        height
    }
}

const server = http.createServer((req, res) => {
  async function main() {
    if(!req.url){
        res.statusCode = 400
        res.end('Needs URL.')
        return
    }
    
    const { query, width, height } = convertURLToImageInfo(req.url)

    try{
        const { message, stream } = await getCachedImageOrSearchedImage(query)
        
        console.log(message)

        await promisify(pipeline)(
            stream,
            sharp().resize(width, height, {
                fit: 'cover',

            }).png(),
            res,
        )

        
        stream.pipe(res)
    } catch {
        res.statusCode = 400
        res.end()
    }
    
  }

  main()
})

const PORT = 5000

server.listen(5000, () => {
  console.log('The server is listening at port', PORT)
})